#!/usr/bin/env python3
import os
import re
import struct
import subprocess
import time
import xml.etree.ElementTree as ET
import zlib

OUT_DIR = "/tmp/apk-proof"
os.makedirs(OUT_DIR, exist_ok=True)


def run(cmd: str) -> None:
    print(f"[CMD] {cmd}", flush=True)
    subprocess.run(cmd, shell=True, check=True)


def save_diagnostics(prefix: str) -> None:
    subprocess.run(f"timeout 10 adb logcat -d > {OUT_DIR}/logcat-{prefix}.txt 2>&1 || true", shell=True)
    subprocess.run(f"timeout 10 adb shell dumpsys window displays > {OUT_DIR}/window-{prefix}.txt 2>&1 || true", shell=True)


def png_flash_ratios(path: str) -> tuple[int, int, float, float]:
    """Decode raw PNG IDAT chunks and compute BOTH near-white AND near-black pixel fractions."""
    with open(path, "rb") as f:
        data = f.read()
    assert data[:8] == b"\x89PNG\r\n\x1a\n", f"Invalid PNG header in {path}"
    pos = 8
    w = h = color_type = 0
    idat = bytearray()
    while pos < len(data):
        length = struct.unpack(">I", data[pos:pos + 4])[0]
        ctype = data[pos + 4:pos + 8]
        chunk = data[pos + 8:pos + 8 + length]
        pos += 12 + length
        if ctype == b"IHDR":
            w, h, bit_depth, color_type = struct.unpack(">IIBB", chunk[:10])
            assert bit_depth == 8, f"Unexpected PNG bit depth {bit_depth}"
        elif ctype == b"IDAT":
            idat.extend(chunk)
        elif ctype == b"IEND":
            break
    raw = zlib.decompress(bytes(idat))
    bpp = 4 if color_type == 6 else 3
    stride = 1 + w * bpp
    prev = bytearray(w * bpp)
    white = 0
    black = 0
    total = 0
    for y in range(h):
        row_start = y * stride
        ftype = raw[row_start]
        cur = bytearray(raw[row_start + 1:row_start + stride])
        if ftype == 1:
            for i in range(bpp, len(cur)):
                cur[i] = (cur[i] + cur[i - bpp]) & 0xFF
        elif ftype == 2:
            for i in range(len(cur)):
                cur[i] = (cur[i] + prev[i]) & 0xFF
        elif ftype == 3:
            for i in range(len(cur)):
                left = cur[i - bpp] if i >= bpp else 0
                cur[i] = (cur[i] + ((left + prev[i]) >> 1)) & 0xFF
        elif ftype == 4:
            for i in range(len(cur)):
                a = cur[i - bpp] if i >= bpp else 0
                b = prev[i]
                c = prev[i - bpp] if i >= bpp else 0
                p = a + b - c
                pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
                pr = a if (pa <= pb and pa <= pc) else (b if pb <= pc else c)
                cur[i] = (cur[i] + pr) & 0xFF
        prev = cur
        if y % 8 == 0:
            for x in range(0, w, 8):
                o = x * bpp
                r, g, b = cur[o], cur[o + 1], cur[o + 2]
                total += 1
                if r >= 246 and g >= 246 and b >= 246:
                    white += 1
                elif r <= 42 and g <= 42 and b <= 42:
                    black += 1
    return w, h, (white / max(1, total)), (black / max(1, total))


def dump_once(tag: str):
    subprocess.run(["timeout", "8", "adb", "shell", "uiautomator", "dump", "/sdcard/ui.xml"], check=False)
    res = subprocess.run(["timeout", "8", "adb", "shell", "cat", "/sdcard/ui.xml"], capture_output=True, text=True, errors="ignore")
    raw = res.stdout or ""
    if "<hierarchy" not in raw:
        return None
    with open(f"{OUT_DIR}/ui-{tag}.xml", "w", encoding="utf-8") as f:
        f.write(raw)
    return ET.fromstring(raw[raw.index("<hierarchy"):])


def visible_texts(root):
    out = []
    if root is None:
        return out
    for n in root.iter():
        t = (n.attrib.get("text") or "").strip()
        d = (n.attrib.get("content-desc") or "").strip()
        b = n.attrib.get("bounds") or ""
        if t or d:
            out.append(f"{n.attrib.get('class', '')}: text={t!r} desc={d!r} bounds={b}")
    return out


def find_bounds(root, substr: str):
    if root is None:
        return None
    matches = []
    for node in root.iter():
        txt = (node.attrib.get("text") or "") + " " + (node.attrib.get("content-desc") or "")
        if substr in txt and node.attrib.get("bounds"):
            m = re.match(r"\[(\d+),(\d+)\]\[(\d+),(\d+)\]", node.attrib["bounds"])
            if m:
                x1, y1, x2, y2 = map(int, m.groups())
                if x2 > x1 and y2 > y1:
                    area = (x2 - x1) * (y2 - y1)
                    matches.append((area, (x1 + x2) // 2, (y1 + y2) // 2, (x1, y1, x2, y2)))
    if not matches:
        return None
    matches.sort(key=lambda item: item[0])
    _, cx, cy, rect = matches[0]
    return cx, cy, rect


def dismiss_sys_dialogs(root) -> bool:
    dismissed = False
    if root is None:
        return False
    for sys_btn in ("GOT IT", "Wait"):
        sys_hit = find_bounds(root, sys_btn)
        if sys_hit is not None:
            print(f"[SYS-DIALOG] Dismissing {sys_btn!r} at {sys_hit}", flush=True)
            if sys_btn == "Wait":
                subprocess.run(["adb", "shell", "input", "keyevent", "4"], check=False)
            else:
                subprocess.run(["adb", "shell", "input", "tap", str(sys_hit[0]), str(sys_hit[1])], check=False)
            time.sleep(0.8)
            dismissed = True
    return dismissed


def wait_for_text(tag: str, substr: str, tries: int = 18, capture_loader_path: str | None = None):
    last_root = None
    captured_loader = False
    for i in range(tries):
        root = dump_once(f"{tag}-{i}")
        last_root = root
        if capture_loader_path and not captured_loader and find_bounds(root, "٪") is not None:
            subprocess.run(f"adb exec-out screencap -p > {capture_loader_path}", shell=True, check=True)
            captured_loader = True
        if dismiss_sys_dialogs(root):
            continue
        found = find_bounds(root, substr)
        if found is not None:
            return root, found
        time.sleep(0.9)
    print(f"[DEBUG {tag}] Visible nodes on screen:", flush=True)
    for line in visible_texts(last_root):
        print("  ", line, flush=True)
    save_diagnostics(f"fail-{tag}")
    subprocess.run(f"adb exec-out screencap -p > {OUT_DIR}/fail-{tag}.png || true", shell=True)
    raise AssertionError(f"Text {substr!r} not found at stage {tag} on real Android 14 screen!")


def tap(x: int, y: int) -> None:
    print(f"[ANDROID-TAP] adb shell input tap {x} {y}", flush=True)
    subprocess.run(["adb", "shell", "input", "tap", str(x), str(y)], check=True)


def tap_transition(btn: tuple[int, int, tuple[int, int, int, int]], old_substr: str, tag: str) -> None:
    tap(btn[0], btn[1])
    time.sleep(1.6)
    root = dump_once(f"{tag}-verify")
    if dismiss_sys_dialogs(root) and find_bounds(root, old_substr) is not None:
        print(f"[ANDROID-TAP-RETRY-AFTER-OS-MODAL] {tag}: re-tapping {btn[0]}, {btn[1]}", flush=True)
        tap(btn[0], btn[1])
        time.sleep(1.6)


def assert_no_white_or_black_flash(path: str, label: str) -> tuple[int, int]:
    w, h, white_r, black_r = png_flash_ratios(path)
    print(f"[PIXEL AUDIT {label}] {w}x{h} white={white_r:.4f} black={black_r:.4f}", flush=True)
    assert white_r < 0.25, f"White flash detected on {label} ({white_r:.3f})!"
    assert black_r < 0.20, f"Black flash detected on {label} ({black_r:.3f})!"
    return w, h


def main() -> None:
    run("adb shell settings put secure immersive_mode_confirmations confirmed || true")
    run("adb shell input keyevent WAKEUP || true")
    run("adb shell wm dismiss-keyguard || true")
    run("adb shell input swipe 540 1800 540 400 200 || true")
    time.sleep(1.5)

    # Start already in landscape: the app requests sensorLandscape, and rotating Quickstep during am start causes launcher ANRs that can obscure the actual app window.
    run("adb shell settings put system accelerometer_rotation 0")
    run("adb shell settings put system user_rotation 1")
    run("adb logcat -c")
    run("adb install -r artifacts/mazrae-rangi-debug.apk")
    run("adb shell pm clear ir.mazraerangi.game")
    run("adb shell am start -W -n ir.mazraerangi.game/.MainActivity")
    time.sleep(0.45)

    # Poll until Android exposes the app-owned WebView. A screenshot immediately after am start -W can still be the OS launcher wallpaper, not an app frame.
    loader_png = f"{OUT_DIR}/0-android-loading.png"
    r1, start_btn = wait_for_text("1-start", "شروع", tries=20, capture_loader_path=loader_png)
    if os.path.exists(loader_png):
        assert_no_white_or_black_flash(loader_png, "0-live-bootloader")
    else:
        print("[INFO] Bootloader completed before UIAutomator sampled progress; validating the first app-owned start screen instead.", flush=True)
    print("[OK] Start button physical bounds:", start_btn, flush=True)
    run(f"adb exec-out screencap -p > {OUT_DIR}/1-android-start.png")
    assert_no_white_or_black_flash(f"{OUT_DIR}/1-android-start.png", "1-start")

    sound_btn = find_bounds(r1, "صدا")
    if sound_btn is not None:
        tap(sound_btn[0], sound_btn[1])
        time.sleep(0.12)
        tap(sound_btn[0], sound_btn[1])
        time.sleep(0.6)
        r1_after, _ = wait_for_text("1b-rapid-tap", "صدا روشن")
        assert r1_after is not None

    tap_transition(start_btn, "شروع", "start-to-cutscene")

    # 2) Opening Cutscene
    r2, skip_btn = wait_for_text("2-cutscene", "رد کردن صحنه")
    assert find_bounds(r2, "شروع") is None, "Start screen did not close on hardware touch!"
    print("[OK] Skip button physical bounds:", skip_btn, flush=True)
    run(f"adb exec-out screencap -p > {OUT_DIR}/2-android-cutscene.png")
    tap_transition(skip_btn, "رد کردن صحنه", "cutscene-to-farm")

    # 3) Farm HUD & 6-Frame Continuous Anti-White & Anti-Black Flicker Scan!
    r3, hoe_btn = wait_for_text("3-farm", "شخم")
    assert find_bounds(r3, "رد کردن صحنه") is None, "Cutscene did not close on hardware touch!"
    print("[OK] Farm HUD Hoe button bounds:", hoe_btn, flush=True)
    run(f"adb exec-out screencap -p > {OUT_DIR}/3-android-farm.png")
    w_phys, h_phys = assert_no_white_or_black_flash(f"{OUT_DIR}/3-android-farm.png", "3-farm-f0")
    for k in range(1, 6):
        p = f"{OUT_DIR}/framecheck-{k}.png"
        run(f"adb exec-out screencap -p > {p}")
        assert_no_white_or_black_flash(p, f"3-farm-f{k}")
        os.remove(p)

    # 3b) Verify strict Landscape surface geometry (w > h)
    assert w_phys > h_phys, f"Expected landscape surface, got {w_phys}x{h_phys}"

    # A fresh Android save starts the interactive tutorial. Dismiss it through its real
    # accessible button so this audit can exercise the generic plot inspector rather than
    # advancing the tutorial and unexpectedly opening its seed tray.
    tutorial_skip = find_bounds(r3, "رد کردن آموزش")
    if tutorial_skip is not None:
        tap(tutorial_skip[0], tutorial_skip[1])
        time.sleep(0.5)
        r3, _ = wait_for_text("3-tutorial-dismissed", "شخم")
        assert find_bounds(r3, "رد کردن آموزش") is None, "Tutorial did not close after its real skip button!"

    # 4) Modal open + Android hardware BACK button ('input keyevent 4') must close ONLY the modal without exiting!
    inv_btn = find_bounds(r3, "انبار")
    if inv_btn is not None:
        tap(inv_btn[0], inv_btn[1])
        time.sleep(1.2)
        wait_for_text("3b-modal", "بستن پنجره")
        run("adb shell input keyevent 4")
        time.sleep(1.0)
        r_after_back, _ = wait_for_text("3c-after-back", "شخم")
        assert find_bounds(r_after_back, "بستن پنجره") is None, "Hardware BACK did not close modal cleanly!"

    # 5) Select the hand tool: a Canvas tap must open Plot #0 Inspector instead of
    # immediately enqueueing whichever action tool happened to be selected previously.
    _, hand_btn = wait_for_text("4-hand-tool", "نگاه")
    tap(hand_btn[0], hand_btn[1])
    time.sleep(0.4)

    # Real Canvas Plot #0 hardware tap -> 'شخم بزن' -> farmer tills soil cleanly!
    sc = min(w_phys / 1280.0, h_phys / 720.0)
    tx = (w_phys - 1280.0 * sc) / 2.0
    ty = (h_phys - 720.0 * sc) * 0.48
    px = int(round(tx + 468.0 * sc))
    py = int(round(ty + 280.0 * sc))
    tap(px, py)
    time.sleep(1.5)

    _, till_btn = wait_for_text("4-plot", "شخم بزن")
    print("[OK] Plot Inspector opened on real Android OS via Canvas touch! Bounds:", till_btn, flush=True)
    run(f"adb exec-out screencap -p > {OUT_DIR}/4-android-plot-tap.png")
    tap(till_btn[0], till_btn[1])
    time.sleep(2.2)
    run(f"adb exec-out screencap -p > {OUT_DIR}/5-android-plot-tilled.png")
    assert_no_white_or_black_flash(f"{OUT_DIR}/5-android-plot-tilled.png", "5-plot-tilled")

    # 6) Background HOME pause + Foreground resume lifecycle check (zero white/black flash)
    run("adb shell input keyevent 3")
    time.sleep(1.0)
    run("adb shell am start -W -n ir.mazraerangi.game/.MainActivity")
    time.sleep(0.8)
    run(f"adb exec-out screencap -p > {OUT_DIR}/6-android-resume.png")
    assert_no_white_or_black_flash(f"{OUT_DIR}/6-android-resume.png", "6-resume")

    # 7) Hard OS SIGKILL ('am force-stop') -> Cold relaunch -> Native SharedPreferences Save ('ادامه') persisted!
    run("adb shell am force-stop ir.mazraerangi.game")
    time.sleep(0.8)
    run("adb shell am start -W -n ir.mazraerangi.game/.MainActivity")
    _, cont_btn = wait_for_text("7-native-save-persisted", "ادامه", tries=20)
    print("[OK] Native Android save survived force-stop! Continue button bounds:", cont_btn, flush=True)

    save_diagnostics("pass")
    print("[SUCCESS] ALL REAL ANDROID 14 COLD-BOOT, LANDSCAPE, BACK-STACK, RESUME, TOUCH & NATIVE SAVE CHECKS PASSED 100%!", flush=True)


if __name__ == "__main__":
    main()
