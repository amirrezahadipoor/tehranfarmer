// ===== تنظیمات دسته‌بندی‌شده: صدا، نمایش، بازی/سیو و پشتیبانی =====
import { useRef, useState, type ReactNode } from 'react';
import { S, UI, exportSaveJson, importSaveJson, listBackupSlots, notify, restoreBackupSlot, toast } from '../game/state';
import { CFG, resetSettings, updateSetting } from '../game/settings';
import { fa, faDec } from '../strings/fa';
import { sfx, snd, syncAudioSettings } from '../game/sound';
import { GT } from '../strings/gameText';
import { UT } from '../strings/uiText';
import { CINEMA_UI } from '../strings/cinemaLocales';
import { DEV_TOOLS } from '../strings/version';
import { clearErrorLog, exportErrorLogJson, getErrorLog } from '../game/errorLog';
import { prepareOfflineMusic } from '../game/offline';
// گالری کارگردان صحنه فقط در بیلد توسعه‌دهنده لود می‌شود.
const openSceneDirector = DEV_TOOLS
  ? () => { void import('./SceneDebugMenu').then((m) => m.openSceneDirector()); }
  : null;

function SettingsGroup({ id, title, initialOpen = false, children }: { id: string; title: string; initialOpen?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(initialOpen);
  return (
    <details
      data-settings-group={id}
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
      className="rounded-xl border-2 border-[#b89668] bg-[#fff9eb] text-[#3d251a]"
    >
      <summary className="flex min-h-[48px] cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-sm font-black leading-5">
        <span>{title}</span><span aria-hidden="true" className="ft text-lg">{open ? '−' : '+'}</span>
      </summary>
      <div className="min-w-0 border-t border-[#d8c498] p-2">{children}</div>
    </details>
  );
}

export function SettingsPanel() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [offlinePreparing, setOfflinePreparing] = useState(false);

  const toggle = (k: 'sound' | 'music' | 'haptics' | 'reduceMotion' | 'colorblind' | 'shortBeat' | 'lowPower', label: string) => {
    const on = CFG[k];
    return (
      <button
        key={k}
        type="button"
        aria-label={label}
        aria-pressed={on}
        className={'btn press max-w-full !min-h-[48px] whitespace-normal break-words !px-2.5 !py-1 text-center text-xs font-black leading-4 ' + (on ? 'g' : 'r opacity-85')}
        onClick={() => {
          const next = !on;
          updateSetting(k, next);
          if (k === 'sound') { UI.sound = next; snd.on = next; }
          syncAudioSettings();
          sfx.tap();
          notify();
        }}
      >
        <span>{label}: {on ? UT.stateOn : UT.stateOff}</span>
      </button>
    );
  };

  const handleExport = () => {
    try {
      const json = exportSaveJson();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mazrae-rangi-day-${S.day}.json`;
      a.click();
      URL.revokeObjectURL(url);
      sfx.buy();
      toast('save', GT.saveExported);
    } catch { /* ذخیرهٔ دستی توسط کاربر لغو یا مسدود شده است */ }
  };

  const scales: Array<1 | 1.1 | 1.2> = [1, 1.1, 1.2];
  const actionSpeeds: Array<1 | 1.5 | 2> = [1, 1.5, 2];
  return (
    <div className="mx-auto mt-2 flex w-full max-w-lg min-w-0 flex-col gap-2" data-settings-panel="1">
      <SettingsGroup id="audio" title={UT.setGroupAudio} initialOpen>
        <div className="flex flex-wrap justify-center gap-1.5">
          {toggle('sound', UT.u136)}
          {toggle('music', UT.setMusic)}
          {toggle('haptics', UT.setHaptics)}
          {toggle('lowPower', UT.setLowPower)}
        </div>
        <div className="mt-2 grid min-w-0 gap-2" data-audio-sliders="1">
          {([
            ['musicVolume', UT.setMusicVolume],
            ['sfxVolume', UT.setSfxVolume],
          ] as const).map(([key, label]) => (
            <label key={key} className="min-w-0 rounded-lg border border-[#b89668] bg-[#fff6df] px-2 py-1 text-xs font-black">
              <span className="flex flex-wrap items-center justify-between gap-2"><span>{label}</span><span dir="ltr">{fa(CFG[key])}{UT.u46}</span></span>
              <input
                type="range" min="0" max="100" step="5" value={CFG[key]} aria-label={label}
                data-audio-volume={key}
                className="mt-1 h-[48px] w-full min-w-0 accent-[#6f9d45]"
                onInput={(e) => { updateSetting(key, Number(e.currentTarget.value)); syncAudioSettings(); notify(); }}
              />
            </label>
          ))}
        </div>
        <p className="mt-1 text-center text-[.72rem] font-bold leading-5 text-[#67513d]">{UT.setLowPowerHint}</p>
        <div className="mt-2 rounded-lg border border-[#b89668] bg-[#fff6df] px-2 py-1.5 text-center">
          <button
            type="button"
            data-prepare-offline="1"
            disabled={offlinePreparing}
            className="btn b press max-w-full !min-h-[48px] whitespace-normal !px-3 !py-1 text-xs font-black"
            onClick={async () => {
              if (offlinePreparing) return;
              setOfflinePreparing(true);
              const ok = await prepareOfflineMusic();
              setOfflinePreparing(false);
              if (ok) { sfx.fanfare(); toast('save', UT.offlineReady); }
              else { sfx.err(); toast('close', UT.offlineFailed); }
              notify();
            }}
          >
            <span>{offlinePreparing ? UT.preparingOffline : UT.prepareOffline}</span>
          </button>
          <p className="mt-1 text-[.72rem] font-bold leading-5 text-[#67513d]">{UT.offlineMusicHint}</p>
        </div>
      </SettingsGroup>

      <SettingsGroup id="display" title={UT.setGroupDisplay}>
        <div className="flex flex-wrap justify-center gap-1.5">
          {toggle('reduceMotion', UT.setMotion)}
          {toggle('colorblind', UT.setColorblind)}
        </div>
        <div data-action-speed-control="1" className="mt-2 rounded-lg border border-[#b89668] bg-[#fff6df] px-2 py-1.5 text-center">
          <div className="flex flex-wrap items-center justify-center gap-1.5 text-xs font-black">
            <span>{UT.setActionSpeed}:</span>
            {actionSpeeds.map((speed) => (
              <button key={speed} type="button" data-action-speed={speed} aria-pressed={CFG.actionSpeed === speed} aria-label={`${UT.setActionSpeed} ${faDec(speed)}×`} className={'btn press !min-h-[48px] !px-3 !py-0.5 text-xs ' + (CFG.actionSpeed === speed ? 'y' : 'b')} onClick={() => { updateSetting('actionSpeed', speed); sfx.tap(); notify(); }}><span dir="ltr">{faDec(speed)}×</span></button>
            ))}
          </div>
          <p className="mt-1 text-[.72rem] font-bold leading-5 text-[#67513d]">{UT.setActionSpeedHint}</p>
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5 text-xs font-black">
          <span>{UT.setFont}:</span>
          {scales.map((sc) => (
            <button
              key={sc}
              type="button"
              aria-label={`${UT.setFont} ${fa(Math.round(sc * 100))}${UT.u46}`}
              className={'btn press !min-h-[48px] !px-2.5 !py-0.5 text-xs ' + (CFG.fontScale === sc ? 'y' : 'b')}
              onClick={() => { updateSetting('fontScale', sc); sfx.tap(); notify(); }}
            >
              <span dir="ltr">{fa(Math.round(sc * 100))}{UT.u46}</span>
            </button>
          ))}
          <button
            type="button"
            data-lang-toggle="1"
            aria-label={CINEMA_UI[CFG.locale === 'en' ? 'en' : 'fa'].langToggle}
            className="btn y press !min-h-[48px] !px-2.5 !py-0.5 text-xs font-black"
            onClick={() => { updateSetting('locale', CFG.locale === 'en' ? 'fa' : 'en'); sfx.tap(); notify(); }}
          >
            <span>{CINEMA_UI[CFG.locale === 'en' ? 'en' : 'fa'].langToggle}</span>
          </button>
        </div>
      </SettingsGroup>

      <SettingsGroup id="save" title={UT.setGroupSave}>
        <div className="flex flex-wrap justify-center gap-1.5">{toggle('shortBeat', UT.alwaysShort)}</div>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2 text-xs font-black">
          <button type="button" aria-label={UT.exportSave} className="btn g press !min-h-[48px] !px-3 !py-1 text-xs font-black" onClick={handleExport}>
            <span>{UT.exportSave}</span>
          </button>
          <button type="button" aria-label={UT.importSave} className="btn y press !min-h-[48px] !px-3 !py-1 text-xs font-black" onClick={() => fileRef.current?.click()}>
            <span>{UT.importSave}</span>
          </button>
          {listBackupSlots().map((b) => (
            <button
              key={b.slot}
              type="button"
              aria-label={`${UT.restoreSlot}${fa(b.slot)}`}
              className="btn b press !min-h-[48px] !px-2.5 !py-1 text-xs font-black"
              onClick={() => {
                if (restoreBackupSlot(b.slot)) {
                  sfx.fanfare();
                  toast('history', GT.saveRecovered);
                }
              }}
            >
              <span>{UT.restoreSlot}{fa(b.slot)}{UT.dayShort}{fa(b.day)}{UT.parenEnd}</span>
            </button>
          ))}
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (!file) return;
              const txt = await file.text();
              if (importSaveJson(txt)) {
                sfx.fanfare();
                toast('check', GT.saveImported);
              } else {
                sfx.err();
                toast('close', GT.saveImportBad);
              }
            }}
          />
        </div>
      </SettingsGroup>

      <SettingsGroup id="support" title={UT.setGroupSupport}>
        <div className="rounded-lg border border-[#b89668] bg-[#fff6df] p-2 text-xs font-black" data-error-log="1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>{UT.errLogTitle}</span>
            <span className="ft">{fa(getErrorLog().length)}</span>
          </div>
          <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              className="btn b press !min-h-[48px] !px-2.5 !py-0.5 text-xs font-black"
              onClick={() => {
                try {
                  const blob = new Blob([exportErrorLogJson()], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'mazrae-rangi-errors.json';
                  a.click();
                  URL.revokeObjectURL(url);
                } catch { /* دانلود در این محیط پشتیبانی نمی‌شود */ }
                sfx.tap();
              }}
            >
              <span>{UT.errLogExport}</span>
            </button>
            <button type="button" className="btn r press !min-h-[48px] !px-2.5 !py-0.5 text-xs font-black" onClick={() => { clearErrorLog(); sfx.tap(); notify(); }}>
              <span>{UT.errLogClear}</span>
            </button>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
          <button
            type="button"
            aria-label={UT.setReset}
            className="btn b press !min-h-[48px] !px-2.5 !py-0.5 text-xs font-black"
            onClick={() => { resetSettings(); UI.sound = CFG.sound; snd.on = CFG.sound; syncAudioSettings(); sfx.tap(); notify(); }}
          >
            <span>{UT.setReset}</span>
          </button>
          {openSceneDirector && (
            <button type="button" className="btn p press !min-h-[48px] !px-2.5 !py-0.5 text-xs font-black" onClick={() => { sfx.tap(); openSceneDirector(); }}>
              <span>{CINEMA_UI[CFG.locale].directorBtn}</span>
            </button>
          )}
        </div>
      </SettingsGroup>
    </div>
  );
}
