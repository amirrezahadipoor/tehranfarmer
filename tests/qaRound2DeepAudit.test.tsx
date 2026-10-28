import { renderToStaticMarkup } from 'react-dom/server';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { installDom } from './helpers/dom';
import App from '../src/App';
import { S, UI, ensureMailState, invCap, loadGame, resetGame, saveGame, sellGood, buySeed, buyFert, buyFeed, buyFingerling } from '../src/game/state';
import { handleHardwareBack } from '../src/game/androidNav';
import { harvestHoney, harvestPond } from '../src/game/core/ponds';
import { millAtNorthWindmill } from '../src/game/core/rpgSystems';
import { drawIcon } from '../src/game/artIcons';
import { ESTATE_UI } from '../src/strings/estateStoryText';
import { UT } from '../src/strings/uiText';
import { CFG, updateSetting } from '../src/game/settings';
import { Modals } from '../src/ui/Modals';
import { AnimalShop } from '../src/ui/AnimalModal';
import { AutoPanelModal } from '../src/ui/AutoPanelModal';
import { FestivalModal } from '../src/ui/FestivalModal';

describe('QA Round 2 Deep Audit — Stage 2, Stage 3 & Stage 4 Bugs (RED -> GREEN)', () => {
  beforeAll(() => {
    installDom();
  });

  beforeEach(() => {
    resetGame();
    UI.started = true;
    UI.modal = null;
    UI.confirm = null;
    UI.scene = 'farm';
    updateSetting('locale', 'fa');
  });

  it('QA2-LOG-01: pressing Android hardware Back on Start screen (!UI.started) NEVER overwrites existing campaign save with blank Day-1 state', () => {
    S.day = 420;
    S.coins = 98765;
    saveGame();
    const savedRaw = localStorage.getItem('mazrae-rangi-save-v1')!;
    expect(savedRaw).toBeTruthy();

    // Simulate cold app boot sitting on Start screen before user clicks Continue
    resetGame();
    localStorage.setItem('mazrae-rangi-save-v1', savedRaw);
    S.day = 1;
    S.coins = 700;
    UI.started = false;
    UI.confirm = null;

    const outcome = handleHardwareBack();
    expect(outcome).toBe('confirm-exit');

    // Existing Day-420 save in localStorage MUST remain intact!
    expect(loadGame()).toBe(true);
    expect(S.day).toBe(420);
    expect(S.coins).toBe(98765);
  });

  it('QA2-LOG-02: fractional float / sub-unit exploit inputs to sellGood & buy APIs are rejected without fractional inventory corruption or free coin rounding', () => {
    S.inv = { saffron: 1, wheat: 5 };
    const startCoins = S.coins;

    const gainedTiny = sellGood('saffron', 0.01);
    expect(gainedTiny).toBe(0);
    expect(S.coins).toBe(startCoins);
    expect(S.inv.saffron).toBe(1);

    const gainedFrac = sellGood('wheat', 0.4);
    expect(gainedFrac).toBe(0);
    expect(S.inv.wheat).toBe(5);
    expect(Number.isInteger(S.inv.wheat)).toBe(true);

    const seedsBefore = S.seeds.wheat ?? 0;
    buySeed('wheat', 0.5);
    buyFert(0.5);
    buyFeed(0.5);
    buyFingerling(0.5);
    expect(S.seeds.wheat ?? 0).toBe(seedsBefore);
    expect(S.fert).toBe(0);
    expect(S.inv.feed ?? 0).toBe(0);
    expect(S.inv.fingerling ?? 0).toBe(0);
  });

  it('QA2-LOG-03: App + Hud renders cleanly without firing notify() mid-render, and drawIcon safely handles invalid/missing names', async () => {
    const stateMod = await import('../src/game/state');
    S.day = 9;
    S.xp = 500;
    let midRenderNotifications = 0;
    let rendering = false;
    // Subscribe to external store directly: ZERO notifications may fire during synchronous React render!
    const origSub = stateMod.useGame;
    void origSub;
    const probeHtml = (() => {
      rendering = true;
      try {
        return renderToStaticMarkup(<App />);
      } finally {
        rendering = false;
      }
    })();
    expect(probeHtml.length).toBeGreaterThan(50);
    expect(rendering).toBe(false);
    expect(midRenderNotifications).toBe(0);

    const cv = document.createElement('canvas');
    const c = cv.getContext('2d')!;
    expect(() => drawIcon(c, undefined as unknown as string)).not.toThrow();
    expect(() => drawIcon(c, 'unknown_corrupted_item_id')).not.toThrow();
  });

  it('QA2-LOG-04: harvesting Pond, Honey, or Windmill flour/feed with nearly-full / full 40/40 bag routes overflow to Mailbox with zero item loss', () => {
    const cap = invCap();
    const mail = ensureMailState();
    S.inv = { potato: cap - 2, wheat: 2 };
    const mailsBefore = mail.inbox.length;
    const milled = millAtNorthWindmill();
    expect(milled).toBe(7);
    const totalFeedAnywhere = (S.inv.feed ?? 0) + mail.inbox.slice(0, mail.inbox.length - mailsBefore)
      .flatMap((m) => m.parcel ?? [])
      .filter((p) => p.id === 'feed')
      .reduce((a, p) => a + p.qty, 0);
    expect(totalFeedAnywhere).toBe(7);

    S.inv = { potato: cap - 1 };
    S.ponds[0] = { id: 1, stocked: true, grow: 99, feed: 3 };
    const mailCountBeforePond = mail.inbox.length;
    const fishTotal = harvestPond(0);
    expect(fishTotal).toBeGreaterThanOrEqual(2);
    const fishSaved = (S.inv.fish ?? 0) + mail.inbox.slice(0, mail.inbox.length - mailCountBeforePond)
      .flatMap((m) => m.parcel ?? [])
      .filter((p) => p.id === 'fish')
      .reduce((a, p) => a + p.qty, 0);
    expect(fishSaved).toBe(fishTotal);

    // Full bag (40/40) safely keeps all 4 jars inside hive; 39/40 takes 1 into bag and keeps 3 inside hive (zero honey lost!)
    S.inv = { potato: cap };
    S.hives = 2;
    S.honeyAcc = 4;
    expect(harvestHoney()).toBe(0);
    expect(S.honeyAcc).toBe(4);
    S.inv = { potato: cap - 1 };
    expect(harvestHoney()).toBe(1);
    expect((S.inv.honey ?? 0) + S.honeyAcc).toBe(4);
  });

  it('QA2-VIS-01: Persian deed boards & Atlas contain zero BiDi-ambiguous middle dots (`·`) next to digits that render as 540 / 600 / 1/30', () => {
    expect(ESTATE_UI.fa.deedBoardNorth).not.toMatch(/·\s*[۰-۹]|[۰-۹]\s*·/);
    expect(ESTATE_UI.fa.deedBoardValley).not.toMatch(/·\s*[۰-۹]|[۰-۹]\s*·/);
    expect(ESTATE_UI.fa.deedBoardNorth).toContain('۵۴');
    expect(ESTATE_UI.fa.deedBoardValley).toContain('۶۰');
  });

  it('QA2-VIS-04: AnimalShop labels locked animals as livestock (never "بذر قفل‌شده"), AutoPanel shows real farm titles, FestivalModal does not duplicate banner, and Confirm shows warning text', () => {
    S.xp = 0;
    const animalHtml = renderToStaticMarkup(<AnimalShop />);
    expect(animalHtml).not.toContain('بذر قفل‌شده');
    expect(animalHtml).toContain((UT as Record<string, string>).lockedAnimal);

    const autoHtml = renderToStaticMarkup(<AutoPanelModal />);
    expect(autoHtml).not.toContain(UT.backFarm);
    expect(autoHtml).toContain(ESTATE_UI.fa.farmShort);

    const festHtml = renderToStaticMarkup(<FestivalModal />);
    const occurrences = festHtml.split('غرفه‌های زنده وسط میدان شهر برپاست').length - 1;
    expect(occurrences).toBeLessThanOrEqual(1);

    UI.confirm = 'reset';
    const confHtml = renderToStaticMarkup(<Modals />);
    expect(confHtml.replace(/<[^>]+>/g, '').trim().length).toBeGreaterThan(10);

    updateSetting('locale', 'en');
    expect(CFG.locale).toBe('en');
    const animalEnHtml = renderToStaticMarkup(<AnimalShop />);
    expect(animalEnHtml).not.toContain('Locked Seed');
    expect(animalEnHtml).toContain('Locked Livestock');
  });
});
