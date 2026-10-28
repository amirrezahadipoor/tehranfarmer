import { renderToStaticMarkup } from 'react-dom/server';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { installDom } from './helpers/dom';
import { ACHS, CROP, DAY_RATE } from '../src/game/data';
import {
  S, UI, buyWorker, effectivePlotDailyRate, isNight, newDay, resetGame,
} from '../src/game/state';
import { estateGrowthRate } from '../src/game/estates';
import { setFarmSeedLock } from '../src/game/core/rpgSystems';
import { AutoPanelModal, liveMachineStat } from '../src/ui/AutoPanelModal';
import { seedDurationDays } from '../src/ui/Modals';
import { WX } from '../src/strings/worldExpansionText';
import { faPct } from '../src/strings/fa';

beforeAll(() => {
  installDom();
});

beforeEach(() => {
  resetGame();
  UI.started = true;
});

describe('بازبینی ریزبینانهٔ ۲۸ اکتبر — رفع باگ‌های گزارش', () => {
  it('مرز شب: از ۱۹٫۵ شروع می‌شود نه ۱۹:۰۰ (HUD اکنون از همان isNight موتور استفاده می‌کند)', () => {
    S.hour = 19;
    expect(isNight()).toBe(false);
    S.hour = 19.5;
    expect(isNight()).toBe(true);
    S.hour = 5.4;
    expect(isNight()).toBe(true);
    S.hour = 5.5;
    expect(isNight()).toBe(false);
  });

  it('چیپ مدت بذر: گندم ≈ ۳ روز پایه نشان داده می‌شود، نه ۰٫۹ روز غلط قدیم', () => {
    const days = seedDurationDays(CROP.wheat);
    const expected = Math.round((CROP.wheat.days / (DAY_RATE * estateGrowthRate('farm', 0) * 0.83)) * 10) / 10;
    expect(days).toBe(expected);
    expect(days).toBeGreaterThan(2.5);
    expect(days).toBeLessThan(3.5);
    // مقدار قدیم (c.days / DAY_RATE = ۰٫۹) دیگر هرگز برنمی‌گردد
    expect(days).not.toBe(Math.round((CROP.wheat.days * 10) / DAY_RATE) / 10);
  });

  it('قطب‌های رشد ماهواره‌ای: قفل بذر چند برابر خودکار سریع است و با مزرعهٔ اصلی هم‌تراز می‌ماند', () => {
    S.lv.land = 14; // مالکیت دشت و دره
    S.northPlots[0].crop = 'wheat';
    S.northPlots[0].fert = 0.5;
    S.plots[0].crop = 'wheat';
    S.plots[0].fert = 0.5;

    setFarmSeedLock('north', 'auto');
    const autoRate = effectivePlotDailyRate('north', 0);
    setFarmSeedLock('north', 'wheat');
    const lockRate = effectivePlotDailyRate('north', 0);
    const farmRate = effectivePlotDailyRate('farm', 0);

    expect(lockRate / autoRate).toBeGreaterThan(5); // شکاف طراحی‌شده همچنان سالم و پوشیده‌شده است
    expect(lockRate / farmRate).toBeGreaterThan(0.5);
    expect(lockRate / farmRate).toBeLessThan(2.5);
  });

  it('کسری حقوق: نردبان خرید نمی‌سوزد — باز استخدام رایگان و ارتقای جدید همچنان پولی', () => {
    S.xp = 5_000_000; // سطح ۳۰ — عبور از دروازه‌های WORKER_LV
    S.workers = 2;
    S.workersHired = 2;
    S.coins = 0;
    newDay();
    expect(S.workers).toBe(0); // اخراج همچنان انجام می‌شود (رفتار اقتصادی حفظ شد)
    expect(S.workersHired).toBe(2); // اما مالکیت اشتراک‌ها می‌ماند

    // خنثی‌سازی جوایز دستاورد تا فقط هزینهٔ استخدام سنجیده شود
    for (const a of ACHS) S.ach[a.id] = a.tiers.length;
    S.coins = 1_000_000;
    buyWorker();
    expect(S.workers).toBe(1);
    expect(S.coins).toBe(1_000_000); // باز استخدام رایگان
    buyWorker();
    expect(S.workers).toBe(2);
    expect(S.coins).toBe(1_000_000); // باز استخدام رایگان
    buyWorker(); // فراتر از بیشینهٔ قبلی = شکاف جدید، پولی
    expect(S.workers).toBe(3);
    expect(S.coins).toBe(1_000_000 - 25_000);
  });

  it('UI کود پهپاد: بدون مهارت crop-2 همان ۰٪ واقعی، با مهارت درصد دقیق جدول', () => {
    S.skills = {};
    expect(liveMachineStat('drone', 1)).toBe(`${faPct(0)} ${WX.statFertSave}`);
    S.skills = { 'crop-2': true };
    expect(liveMachineStat('drone', 1)).toBe(`${faPct(20)} ${WX.statFertSave}`);
    expect(liveMachineStat('drone', 2)).toBe(`${faPct(50)} ${WX.statFertSave}`);
    expect(liveMachineStat('drone', 3)).toBe(`${faPct(75)} ${WX.statFertSave}`);
  });

  it('پنل هوشمند: هشدار کُندی خودکار فقط وقتی دشت/دره روی «هوشمند» است نمایان می‌شود', () => {
    S.lv.land = 14;
    let html = renderToStaticMarkup(<AutoPanelModal />);
    expect(html).toContain('هشدار هوشمند'); // FA — رشته از WX می‌آید
    expect(html).toContain('یادآور');

    setFarmSeedLock('north', 'wheat');
    setFarmSeedLock('valley', 'wheat');
    html = renderToStaticMarkup(<AutoPanelModal />);
    expect(html).not.toContain('هشدار هوشمند');

    resetGame(); // فقط مزرعهٔ اصلی — بدون هشدار
    html = renderToStaticMarkup(<AutoPanelModal />);
    expect(html).not.toContain('هشدار هوشمند');
  });
});
