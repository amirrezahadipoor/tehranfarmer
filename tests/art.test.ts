import fs from 'node:fs';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { installDom } from './helpers/dom';
import { drawIcon, iconPart, iconURL } from '../src/game/art';
import { ACHS, ANIMALS, CROPS, GOODS, MACHINE_LIST } from '../src/game/data';

beforeAll(() => { installDom(); });

function countDrawOps(id: string): number {
  let ops = 0;
  const ctx = new Proxy({}, {
    get(_t, prop) {
      if (['fill', 'stroke', 'fillRect', 'strokeRect', 'arc', 'ellipse'].includes(String(prop))) {
        return () => { ops++; };
      }
      if (prop === 'measureText') return () => ({ width: 10 });
      if (prop === 'createLinearGradient' || prop === 'createRadialGradient') {
        return () => ({ addColorStop() {} });
      }
      return () => {};
    },
  }) as unknown as CanvasRenderingContext2D;
  drawIcon(ctx, id);
  return ops;
}

describe('آیکون‌های دست‌کش بدهی، موجودی و دستاورد (P8-01..P8-07)', () => {
  it('همهٔ آیکون‌های بدهی، چاه، طومار، قرارداد، لانه و جام بدون خطا رسم می‌شوند', () => {
    for (const id of ['stash', 'club', 'scarecrow', 'note', 'ledger', 'stamp', 'history', 'nest', 'scroll', 'contract', 'well', 'trophy']) {
      const part = iconPart(id);
      expect(part.w).toBe(64);
      expect(part.h).toBe(64);
      expect(iconURL(id).startsWith('data:image/')).toBe(true);
      expect(countDrawOps(id)).toBeGreaterThanOrEqual(5);
    }
  });

  it('صحنهٔ شهر با کلبهٔ جهانگیر برای هر ۴ فصل ساخته می‌شود (P8-02)', async () => {
    const { townBG } = await import('../src/game/scenes');
    const { JAHANGIR_HUT } = await import('../src/game/engine');
    expect(JAHANGIR_HUT.cx).toBeGreaterThan(900);
    for (let sn = 0; sn < 4; sn++) {
      const cv = townBG(sn);
      expect(cv.width).toBeGreaterThan(1000);
    }
  });

  it('هیچ دو NPC در شهر پالت، کلید ریگ، سرعت یا مسیر یکسان ندارند (P8-06)', async () => {
    const { PAL_NPC } = await import('../src/game/rig');
    const { TOWN_ACTORS } = await import('../src/story/townNpc');
    expect(PAL_NPC.length).toBe(TOWN_ACTORS.length);
    for (let i = 0; i < PAL_NPC.length; i++) {
      for (let j = i + 1; j < PAL_NPC.length; j++) {
        expect(PAL_NPC[i].key).not.toBe(PAL_NPC[j].key);
        expect(PAL_NPC[i].shirt).not.toBe(PAL_NPC[j].shirt);
        expect(PAL_NPC[i].hat).not.toBe(PAL_NPC[j].hat);
        expect(TOWN_ACTORS[i].speed).not.toBe(TOWN_ACTORS[j].speed);
        expect(TOWN_ACTORS[i].morning).not.toEqual(TOWN_ACTORS[j].morning);
        expect(TOWN_ACTORS[i].noon).not.toEqual(TOWN_ACTORS[j].noon);
      }
    }
  });

  it('تک‌تک آیکون‌های کاتالوگ، بذرها، دام‌ها، ماشین‌ها، دستاوردها و UI با ضربات واقعی رسم می‌شوند و هر ۱۸ دستاورد یکتا هستند (P8-07)', () => {
    const ids = new Set<string>();
    for (const c of CROPS) { ids.add(c.id); ids.add(`seed:${c.id}`); }
    for (const [k, a] of Object.entries(ANIMALS)) { ids.add(k); ids.add(a.prod); }
    for (const g of GOODS) ids.add(g.id);
    for (const m of MACHINE_LIST) ids.add(m);
    for (const a of ACHS) ids.add(a.icon);

    const walk = (dir: string, out: string[] = []): string[] => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p, out);
        else if (/\.(ts|tsx)$/.test(p)) out.push(p);
      }
      return out;
    };
    for (const f of walk('src')) {
      const txt = fs.readFileSync(f, 'utf8');
      for (const m of txt.matchAll(/(?:<Ic\s+n=|iconURL\(|iconPart\(|toast\(|icon:\s*)['"]([a-zA-Z0-9:_-]+)['"]/g)) ids.add(m[1]);
    }

    expect(ids.size).toBeGreaterThanOrEqual(88);
    for (const id of ids) {
      expect(countDrawOps(id), `آیکون «${id}» خالی رسم شد`).toBeGreaterThan(0);
      expect(iconURL(id).startsWith('data:image/')).toBe(true);
    }

    // هر ۱۸ دستاورد آیکون اختصاصی متمایز دارند
    const achIcons = new Set(ACHS.map((a) => a.icon));
    expect(achIcons.size).toBe(ACHS.length);
  });
});
