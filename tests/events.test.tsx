import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { installDom } from './helpers/dom';
import { S, UI, advance, resetGame } from './helpers/game';
import { EVENT_IDS, triggerEvent } from '../src/game/core/events';
import { startDebt } from '../src/game/core/debt';
import { migrateSave, SAVE_VERSION } from '../src/game/core/saveMigrations';
import { Hud } from '../src/ui/Hud';

beforeAll(() => { installDom(); });
beforeEach(() => { localStorage.clear(); resetGame(); UI.started = true; });

describe('۶ رویداد فصلی و نمایش در HUD (P6-01)', () => {
  it('هر ۶ رویداد فصلی اثر واقعی و نمایش HUD دارند', () => {
    startDebt(0);
    S.plots[0].st = 1;
    S.plots[0].water = 0.8;
    S.plots[0].fert = 0.8;

    const c0 = S.coins;
    S.stamina = 10;
    triggerEvent('festival');
    expect(S.coins).toBeGreaterThan(c0);
    expect(S.stamina).toBeGreaterThan(10);
    expect(renderToString(<Hud />)).toContain('data-event-id="festival"');

    triggerEvent('drought');
    expect(S.plots[0].water).toBeLessThan(0.8);
    expect(renderToString(<Hud />)).toContain('data-event-id="drought"');

    triggerEvent('flood');
    expect(S.plots[0].water).toBe(1);
    expect(S.inv.fingerling).toBeGreaterThanOrEqual(1);

    const demBefore = S.dem.wheat;
    triggerEvent('guest');
    expect(S.dem.wheat).toBeGreaterThan(demBefore);

    S.dem.wheat = 1;
    triggerEvent('hotmarket');
    expect(S.dem.wheat).toBeGreaterThan(1.2);

    const stBefore = S.debt!.standing;
    triggerEvent('yalda');
    expect(S.debt!.standing).toBeGreaterThan(stBefore);
    expect(S.inv.pomegranate).toBeGreaterThanOrEqual(2);
    expect(EVENT_IDS).toHaveLength(6);
  });

  it('شب ۲۸ (پایان زمستان) به‌طور خودکار شب یلدا برگزار می‌کند و سِیو v4 مهاجرت می‌کند', () => {
    S.day = 27;
    advance(24);
    expect(S.event?.id).toBe('yalda');
    const migrated = migrateSave({ v: 4, coins: 100, day: 5, xp: 0 })!;
    expect(migrated.v).toBe(SAVE_VERSION);
    expect(migrated.event).toBeNull();
  });
});
