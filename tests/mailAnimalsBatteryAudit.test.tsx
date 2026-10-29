import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { act } from 'react';
import { renderToString } from 'react-dom/server';
import { createRoot } from 'react-dom/client';
import { createRequire } from 'node:module';
import { installDom } from './helpers/dom';
import { S, UI, resetGame, newDay, addGood, exportSaveJson, importSaveJson } from '../src/game/state';
import { CFG } from '../src/game/settings';
import { PEN_KINDS, MACHINES, type MachineId } from '../src/game/data';
import { iconPart, put } from '../src/game/art';
import { makeAnimal, drawBone } from '../src/game/rig';
import { POSTBOX_GEOM, drawWorldPostbox, drawWorldMachines } from '../src/game/postboxArt';
import {
  claimMailParcel, fulfillMailDeal, mailItemLabel, markMailRead,
  syncMailboxState, togglePinMail, unreadMailCount,
} from '../src/game/core/mailbox';
import { renderMailTemplate } from '../src/strings/mailText';
import { triggerEvent } from '../src/game/core/events';
import { tickWorkersSim } from '../src/game/core/workers';
import { setSeed, rnd } from '../src/game/rng';
import { MailboxModal } from '../src/ui/MailboxModal';
import { Hud } from '../src/ui/Hud';

const EMOJI_RE = /\p{Extended_Pictographic}/u;
// jsdom is already a test dependency; this narrow structural type avoids adding
// a second @types package solely for one interaction fixture.
const { JSDOM } = createRequire(import.meta.url)('jsdom') as {
  JSDOM: new (html: string) => { window: { document: Document; close(): void } };
};

beforeAll(() => {
  installDom();
});

describe('Animal Art Overhaul, Illustrated Village Postbox System & Lossless Battery Optimizations', () => {
  beforeEach(() => {
    CFG.locale = 'fa';
    localStorage.clear();
    resetGame();
    UI.started = true;
    UI.modal = null;
    UI.scene = 'farm';
  });

  it('renders all 6 animal species across male & female rigs plus all upgraded animal/machine/postal icons cleanly without touching RNG', () => {
    setSeed(987654);
    const rngExpected = (() => {
      setSeed(987654);
      const v = rnd();
      setSeed(987654);
      return v;
    })();

    const canvas = document.createElement('canvas');
    canvas.width = 240;
    canvas.height = 200;
    const ctx = canvas.getContext('2d')!;

    for (const kind of PEN_KINDS) {
      for (const sex of ['f', 'm'] as const) {
        const rig = makeAnimal(kind, 1, sex);
        expect(rig.legs.length).toBeGreaterThanOrEqual(2);
        let spriteDraws = 0;
        const originalDrawImage = ctx.drawImage;
        ctx.drawImage = ((..._args: unknown[]) => { spriteDraws++; }) as typeof ctx.drawImage;
        expect(() => drawBone(ctx, rig.root)).not.toThrow();
        ctx.drawImage = originalDrawImage;
        // ریشه باید بدن، سر و پاها را واقعاً رسم کند؛ یک ریشهٔ خالی بدون خطا کافی نیست.
        expect(spriteDraws).toBeGreaterThanOrEqual(kind === 'chicken' || kind === 'duck' ? 5 : 6);
        expect(rig.body.kids?.length ?? 0).toBeGreaterThan(0);
      }
      const sp = iconPart(kind);
      expect(sp.c.width).toBeGreaterThan(0);
      expect(() => put(ctx, sp, 80, 80, 1)).not.toThrow();
    }

    const allMachinesOn: Record<string, number> = {};
    const allAutoOn: Record<string, boolean> = {};
    for (const mid of Object.keys(MACHINES) as MachineId[]) {
      const sp = iconPart(mid);
      expect(sp.c.width).toBeGreaterThan(0);
      allMachinesOn[mid] = 3;
      if (MACHINES[mid].auto) allAutoOn[MACHINES[mid].auto!] = true;
    }
    expect(() => drawWorldMachines(ctx, allMachinesOn, allAutoOn, 1.5)).not.toThrow();

    for (const mailIcon of ['mail', 'mailopen', 'parcel', 'postbox'] as const) {
      const sp = iconPart(mailIcon);
      expect(sp.c.width).toBeGreaterThan(0);
      expect(() => put(ctx, sp, 60, 60, 1)).not.toThrow();
    }

    expect(() => drawWorldPostbox(ctx, 3, 1.25)).not.toThrow();
    expect(() => drawWorldPostbox(ctx, 0, 1.25)).not.toThrow();
    expect(POSTBOX_GEOM.x).toBeGreaterThan(290);
    expect(rnd()).toBe(rngExpected);
  });

  it('delivers Day 1 illustrated welcome letter + gift parcel, supports FA & EN with 0 emoji, claims parcel into inventory, fulfills trade contracts, and survives save/load', () => {
    expect(S.mail).toBeTruthy();
    expect(S.mail!.inbox.length).toBeGreaterThanOrEqual(1);
    expect(unreadMailCount()).toBeGreaterThanOrEqual(1);

    const welcome = S.mail!.inbox.find((m) => m.id === 'story:welcome')!;
    expect(welcome).toBeTruthy();
    expect(welcome.parcel?.length).toBeGreaterThan(0);

    // Verify both Persian & English rendering with strictly 0 emoji characters
    for (const loc of ['fa', 'en'] as const) {
      CFG.locale = loc;
      const copy = renderMailTemplate(welcome, mailItemLabel);
      expect(copy.subject.length).toBeGreaterThan(4);
      expect(copy.greeting.length).toBeGreaterThan(3);
      expect(copy.body.length).toBeGreaterThan(12);
      expect(copy.ps.length).toBeGreaterThan(4);
      expect(EMOJI_RE.test(copy.subject + copy.greeting + copy.body + copy.ps)).toBe(false);
    }
    CFG.locale = 'fa';

    // Claim welcome parcel -> seeds/fertilizer/coins increase directly
    const wheatSeedsBefore = S.seeds.wheat ?? 0;
    const fertBefore = S.fert;
    expect(claimMailParcel(welcome.id)).toBe(true);
    expect((S.seeds.wheat ?? 0) + S.fert).toBeGreaterThan(wheatSeedsBefore + fertBefore);
    // Idempotent: cannot double-claim parcel!
    expect(claimMailParcel(welcome.id)).toBe(false);

    // Advance days so wholesale trade deals & seasonal events arrive deterministically
    triggerEvent('hotmarket');
    for (let i = 0; i < 6; i++) newDay();
    syncMailboxState(false);

    const tradeLetter = S.mail!.inbox.find((m) => m.trade && !m.trade.fulfilled);
    expect(tradeLetter).toBeTruthy();
    if (tradeLetter?.trade) {
      const { good, qty, reward } = tradeLetter.trade;
      addGood(good, qty);
      const coinsBefore = S.coins;
      expect(fulfillMailDeal(tradeLetter.id)).toBe(true);
      expect(S.coins).toBeGreaterThanOrEqual(coinsBefore + reward);
      expect(fulfillMailDeal(tradeLetter.id)).toBe(false);
    }

    // Save export/import preserves exact mailbox history, pin state & claimed state
    togglePinMail(welcome.id);
    markMailRead(welcome.id);
    const json = exportSaveJson();
    resetGame();
    expect(importSaveJson(json)).toBe(true);
    const reloaded = S.mail!.inbox.find((m) => m.id === 'story:welcome')!;
    expect(reloaded.claimed).toBe(true);
    expect(reloaded.pinned).toBe(true);
    expect(reloaded.read).toBe(true);
  });

  it('renders HUD unread mail badge and MailboxModal cleanly in both FA and EN with 0 emoji', () => {
    const hudHtml = renderToString(<Hud />);
    expect(hudHtml).toContain('data-open-mail="1"');
    expect(hudHtml).toContain('data-mail-badge="1"');
    expect(hudHtml).toContain('data-mail-icon="mail"');
    expect(EMOJI_RE.test(hudHtml)).toBe(false);

    for (let i = 0; i < 5; i++) newDay();
    for (const loc of ['fa', 'en'] as const) {
      CFG.locale = loc;
      const modalHtml = renderToString(<MailboxModal />);
      expect(modalHtml).toContain('data-mailbox-modal="1"');
      expect(modalHtml).toContain('data-mail-tab=');
      expect(EMOJI_RE.test(modalHtml)).toBe(false);
    }
    CFG.locale = 'fa';
  });

  it('keeps every new letter sealed until explicit selection, including parcel mail and tab changes', async () => {
    const dom = new JSDOM('<!doctype html><html><body><div id="mail-root"></div></body></html>');
    const host = dom.window.document.getElementById('mail-root') as unknown as HTMLDivElement;
    const root = createRoot(host);
    const actScope = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean };
    const previousActSetting = actScope.IS_REACT_ACT_ENVIRONMENT;
    actScope.IS_REACT_ACT_ENVIRONMENT = true;
    try {
      await act(async () => { root.render(<MailboxModal />); });
      const welcome = S.mail!.inbox.find((m) => m.id === 'story:welcome')!;
      const rowSelector = '[data-mail-row="story:welcome"]';
      expect(welcome.read).toBe(false);
      expect(host.querySelector('[data-mail-letter]')).toBeNull();
      const initialRow = host.querySelector<HTMLButtonElement>(rowSelector)!;
      expect(initialRow.dataset.mailRead).toBe('0');
      expect(initialRow.dataset.mailIcon).toBe('mail');
      expect(initialRow.querySelector('[data-mail-unread-tag="1"]')).not.toBeNull();
      expect(initialRow.querySelector('[data-mail-parcel-indicator="1"]')).not.toBeNull();

      await act(async () => { host.querySelector<HTMLButtonElement>('[data-mail-tab="story"]')!.click(); });
      expect(welcome.read).toBe(false);
      expect(host.querySelector('[data-mail-letter]')).toBeNull();
      expect(host.querySelector<HTMLButtonElement>(rowSelector)!.dataset.mailIcon).toBe('mail');

      await act(async () => { host.querySelector<HTMLButtonElement>(rowSelector)!.click(); });
      expect(welcome.read).toBe(true);
      expect(host.querySelector('[data-mail-letter="story:welcome"]')).not.toBeNull();
      expect(host.querySelector<HTMLButtonElement>(rowSelector)!.dataset.mailIcon).toBe('mailopen');
      expect(host.querySelector<HTMLButtonElement>(rowSelector)!.dataset.mailRead).toBe('1');

      await act(async () => { host.querySelector<HTMLButtonElement>('[data-mail-back="1"]')!.click(); });
      expect(host.querySelector('[data-mail-letter]')).toBeNull();
      expect(host.querySelector<HTMLButtonElement>(rowSelector)!.dataset.mailRead).toBe('1');
    } finally {
      await act(async () => { root.unmount(); });
      host.remove();
      dom.window.close();
      if (previousActSetting === undefined) delete actScope.IS_REACT_ACT_ENVIRONMENT;
      else actScope.IS_REACT_ACT_ENVIRONMENT = previousActSetting;
    }
  });

  it('keeps crops crew productive by collecting ripe ranch animal products when no field crop task is actionable', () => {
    S.workers = 2;
    S.crewRole = 'crops';
    for (const p of S.plots) {
      p.st = 2;
      p.crop = 'wheat';
      p.prog = 0.5;
      p.ripe = false;
      p.dead = false;
      p.water = 1;
      p.fert = 1;
    }
    S.animals = [{ id: 1, kind: 'chicken', ready: 3, hue: 0, sex: 'f', grown: 0 }];
    const eggsBefore = S.inv.egg ?? 0;
    tickWorkersSim(8);
    expect((S.inv.egg ?? 0)).toBeGreaterThan(eggsBefore);
  });
});
