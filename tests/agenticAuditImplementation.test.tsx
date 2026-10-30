import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { createRequire } from 'node:module';
import { installDom } from './helpers/dom';
import { S, UI, resetGame, setPlayerOutfit } from '../src/game/state';
import { BACKPACK_TIERS, backpackTier, drawBackpack, drawBackpackFront } from '../src/game/backpackArt';
import { ensureQuests, questRotationStep } from '../src/story/dailyQuests';
import { mineAccuracyAt, mineTargetOpenAt, mineWeakPointAt } from '../src/game/core/mining';
import { InventoryModal } from '../src/ui/InventoryModal';
import { FarmhouseModal } from '../src/ui/FarmhouseModal';
import { inventoryJoke } from '../src/strings/inventoryText';
import { DAY_RATE, POND_GROW_DAYS } from '../src/game/data';

const { JSDOM } = createRequire(import.meta.url)('jsdom') as {
  JSDOM: new (html: string) => { window: { document: Document; close(): void } };
};

beforeAll(() => { installDom(); });
beforeEach(() => {
  localStorage.clear();
  resetGame();
  UI.started = true;
  UI.scene = 'farm';
  UI.modal = null;
});

describe('Agentic audit implementation regressions', () => {
  it('draws a visible backpack at level zero and six increasingly distinct upgrades', () => {
    expect(BACKPACK_TIERS).toHaveLength(7);
    expect(new Set(BACKPACK_TIERS.map((t) => t.body)).size).toBe(7);
    for (let lv = 0; lv <= 6; lv++) {
      expect(backpackTier(lv).w).toBeGreaterThan(0);
      expect(backpackTier(lv).h).toBeGreaterThan(0);
      if (lv > 0) {
        expect(backpackTier(lv).w).toBeGreaterThan(backpackTier(lv - 1).w);
        expect(backpackTier(lv).h).toBeGreaterThan(backpackTier(lv - 1).h);
      }
      S.lv.bag = lv;
      const ctx = document.createElement('canvas').getContext('2d')!;
      let saves = 0;
      ctx.save = () => { saves++; };
      drawBackpack(ctx, 400, 500, 1, 0.75);
      const afterBack = saves;
      drawBackpackFront(ctx, 400, 500, 1, 0.75);
      expect(afterBack, `backpack level ${lv} must draw a back layer`).toBeGreaterThan(0);
      expect(saves, `backpack level ${lv} must draw a front layer`).toBeGreaterThan(afterBack);
    }
  });

  it('opens comedic item details from a touch/click selection without breaking crafting or pack transfer', async () => {
    S.inv = { wheat: 3 };
    S.pack = { wheat: 2 };
    S.seeds = { wheat: 1 };
    S.fert = 1;
    UI.modal = 'inv';
    const dom = new JSDOM('<!doctype html><html><body><div id="inventory-root"></div></body></html>');
    const host = dom.window.document.getElementById('inventory-root') as unknown as HTMLDivElement;
    const root = createRoot(host);
    const actScope = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean };
    const previousActSetting = actScope.IS_REACT_ACT_ENVIRONMENT;
    actScope.IS_REACT_ACT_ENVIRONMENT = true;
    try {
      await act(async () => { root.render(<InventoryModal />); });
      expect(host.querySelector('[data-inventory-details="empty"]')).not.toBeNull();
      expect(host.querySelector('[data-modal-actions] [data-pack-to-barn]')).not.toBeNull();
      expect(host.querySelector('[data-artisan-kitchen]')).not.toBeNull();
      const item = host.querySelector<HTMLButtonElement>('[data-inventory-item="barn|good|wheat"]')!;
      await act(async () => { item.click(); });
      expect(item.getAttribute('aria-pressed')).toBe('true');
      expect(host.querySelector('[data-inventory-details="good"]')?.textContent).toContain(inventoryJoke('wheat'));
      const seed = host.querySelector<HTMLButtonElement>('[data-inventory-item="barn|seed|wheat"]')!;
      await act(async () => { seed.click(); });
      expect(host.querySelector('[data-inventory-details="seed"]')?.textContent).toContain(inventoryJoke('seed'));
      await act(async () => { seed.click(); });
      expect(host.querySelector('[data-inventory-details="empty"]')).not.toBeNull();
    } finally {
      await act(async () => { root.unmount(); });
      host.remove();
      dom.window.close();
      if (previousActSetting === undefined) delete actScope.IS_REACT_ACT_ENVIRONMENT;
      else actScope.IS_REACT_ACT_ENVIRONMENT = previousActSetting;
    }
  });

  it('keeps farmhouse sleep outside the scrollport', () => {
    UI.modal = 'home';
    const html = renderToString(<FarmhouseModal />);
    const actions = html.indexOf('data-modal-actions');
    const sleep = html.indexOf('data-home-sleep');
    const scroll = html.indexOf('data-modal-scroll');
    expect(actions).toBeGreaterThanOrEqual(0);
    expect(sleep).toBeGreaterThan(actions);
    expect(scroll).toBeGreaterThan(sleep);
  });

  it('visits all 35 three-quest combinations when seven kinds are unlocked', () => {
    S.hives = 1;
    S.rod = 1;
    S.animals = [{ id: 1, kind: 'chicken', sex: 'f', grown: 0, health: 100, fed: 1, age: 1 } as never];
    S.inv.wheat = 1000;
    const seen = new Set<string>();
    for (let day = 1; day <= 35; day++) {
      S.day = day;
      ensureQuests(false, false, true);
      const signature = S.quests.daily.map((q) => q.kind).sort().join('|');
      expect(seen.has(signature), `repeated daily combination on day ${day}`).toBe(false);
      seen.add(signature);
    }
    expect(seen.size).toBe(35);
    expect(S.quests.weekly!.reward).toBeGreaterThan(Math.max(...S.quests.daily.map((q) => q.reward)));
  });

  it('uses a full-cycle coprime rotation for every pool from four through nine kinds', () => {
    for (const size of [4, 10, 20, 35, 56, 84]) {
      const step = questRotationStep(size);
      const visited = new Set<number>();
      for (let day = 0; day < size; day++) visited.add((day * step) % size);
      expect(visited.size, `pool size ${size}, stride ${step}`).toBe(size);
    }
  });

  it('keeps every weekly coin and XP reward above its corresponding daily reward', () => {
    S.hives = 1;
    S.rod = 1;
    S.ponds = [{ id: 1, stocked: true, grow: POND_GROW_DAYS, feed: 0 }];
    S.nests = [{ id: 9, kind: 'chicken', hatch: DAY_RATE }];
    S.inv.wheat = 1000;
    S.animals = [
      { id: 1, kind: 'chicken', sex: 'f', grown: 0, health: 100, fed: 1, age: 1 } as never,
      { id: 2, kind: 'chicken', sex: 'm', grown: 0, health: 100, fed: 1, age: 1 } as never,
    ];
    const daily = new Map<string, { reward: number; xp: number }>();
    const weekly = new Map<string, { reward: number; xp: number }>();
    for (let day = 1; day <= 63; day++) {
      S.day = day;
      ensureQuests(false, false, true);
      for (const q of S.quests.daily) {
        const old = daily.get(q.kind);
        daily.set(q.kind, { reward: Math.max(old?.reward ?? 0, q.reward), xp: Math.max(old?.xp ?? 0, q.xp) });
      }
      const w = S.quests.weekly!;
      weekly.set(w.kind, { reward: w.reward, xp: w.xp });
    }
    expect(weekly.size).toBe(9);
    for (const [kind, w] of weekly) {
      expect(w.reward, `${kind} weekly coins`).toBeGreaterThan(daily.get(kind)!.reward);
      expect(w.xp, `${kind} weekly XP`).toBeGreaterThan(daily.get(kind)!.xp);
    }
  });

  it('gives mine floors different timing rules and rejects shielded pulse strikes', () => {
    const a = mineWeakPointAt(2, 1, 0, 0);
    const b = mineWeakPointAt(2, 1, 0, 1);
    expect(b.center).not.toBe(a.center);
    expect(mineTargetOpenAt(3, 0)).toBe(true);
    expect(mineTargetOpenAt(3, 2.1)).toBe(false);
    expect(mineAccuracyAt(3, 1, 0, a.center, { center: a.center, width: a.width, open: false })).toBe(0);
    expect(mineAccuracyAt(3, 1, 0, a.center, { center: a.center, width: a.width, open: true })).toBe(1);
  });

  it('locks cosmetic outfits to real achievement milestones and keeps original outfits open', () => {
    expect(setPlayerOutfit(2)).toBe(true);
    expect(setPlayerOutfit(4)).toBe(false);
    expect(S.custom?.outfit).toBe(2);
    S.ach.plants = 1;
    expect(setPlayerOutfit(4)).toBe(true);
    expect(S.custom?.outfit).toBe(4);
  });
});
