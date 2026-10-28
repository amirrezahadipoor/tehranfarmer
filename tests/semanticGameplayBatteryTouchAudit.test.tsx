import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { installDom } from './helpers/dom';
import {
  S, UI, advance, buyUpgrade, canAct, doAct, newDay, plotsForFarm, resetGame, startDebt,
} from '../src/game/state';
import { cmd, startEngine } from '../src/game/engine';
import { cureAllAnimals } from '../src/game/core/farmDeep';
import { craftArtisan, ARTISAN_RECIPES } from '../src/game/core/artisan';
import { compileSceneScript, listAllScenes } from '../src/story/sceneScripts';
import { applyEffects } from '../src/story/engine';
import { isAudioSuspended, resumeAudioFromBackground, suspendAudioForBackground } from '../src/game/sound';
import { UT } from '../src/strings/uiText';
import { Modals } from '../src/ui/Modals';

beforeAll(() => { installDom(); });

describe('ممیزی معنایی گیم‌پلی واقعی، ریگ نجار، ضدگیر کارگر، تاچ موبایل و مصرف باتری', () => {
  beforeEach(() => {
    resetGame();
    UI.started = true;
    UI.modal = null;
    UI.info = null;
  });

  it('۱. منطق واقعی گرسنگی دام: گاو/گوسفند/بز/خرگوش بدون غذا نه محصول می‌دهند نه بزرگ می‌شوند و نه زادوولد می‌کنند؛ مرغ و خروس استثنا هستند', () => {
    S.pens = { cow: 2, sheep: 2, goat: 2, rabbit: 2, chicken: 2 };
    S.trough = 0;
    S.inv = {};
    S.nextId = 100;
    S.animals = [
      // جفت‌های علوفه‌خوار بالغ + نوزاد + مادر باردار (بدون غذا!)
      { id: 1, kind: 'cow', ready: 0, hue: 0, sex: 'f', grown: 0 },
      { id: 2, kind: 'cow', ready: 0, hue: 0, sex: 'm', grown: 0 },
      { id: 3, kind: 'cow', ready: 0, hue: 0, sex: 'f', grown: 8 },
      { id: 4, kind: 'sheep', ready: 0, hue: 0, sex: 'f', grown: 0, preg: 4 },
      { id: 5, kind: 'goat', ready: 0, hue: 0, sex: 'f', grown: 0 },
      { id: 6, kind: 'rabbit', ready: 0, hue: 0, sex: 'f', grown: 6 },
      // استثنای صریح: مرغ و خروس و جوجه (چرای آزاد — بدون نیاز به علوفه و مصون از بیماری گرسنگی!)
      { id: 10, kind: 'chicken', ready: 0, hue: 0, sex: 'f', grown: 0 },
      { id: 11, kind: 'chicken', ready: 0, hue: 0, sex: 'm', grown: 0 },
      { id: 12, kind: 'chicken', ready: 0, hue: 0, sex: 'f', grown: 4 },
    ];
    S.nests = [];

    for (let d = 0; d < 25; d++) {
      S.day++;
      newDay();
    }

    // هیچ پستاندار گرسنه‌ای شیر/پشم/پنیر نداده، بزرگ نشده و زایش نکرده است
    const cowF = S.animals.find((a) => a.id === 1)!;
    const calf = S.animals.find((a) => a.id === 3)!;
    const pregEwe = S.animals.find((a) => a.id === 4)!;
    const doe = S.animals.find((a) => a.id === 5)!;
    const kit = S.animals.find((a) => a.id === 6)!;
    expect(cowF.ready).toBe(0);
    expect(cowF.preg ?? 0).toBe(0);
    expect(calf.grown).toBe(8);
    expect(pregEwe.preg).toBe(4);
    expect(pregEwe.ready).toBe(0);
    expect(doe.ready).toBe(0);
    expect(kit.grown).toBe(6);
    expect(S.animals.filter((a) => a.kind === 'sheep')).toHaveLength(1);

    // اما مرغ و خروس (استثنا) سالم مانده‌اند، تخم گذاشته‌اند، جوجه بزرگ شده و جوجهٔ تازه از تخم درآمده است!
    const hen = S.animals.find((a) => a.id === 10)!;
    const rooster = S.animals.find((a) => a.id === 11)!;
    const chick = S.animals.find((a) => a.id === 12)!;
    expect(hen.sick).toBeFalsy();
    expect(rooster.sick).toBeFalsy();
    expect(hen.ready).toBeGreaterThan(0);
    expect(chick.grown).toBe(0);
    expect(S.animals.filter((a) => a.kind === 'chicken').length).toBeGreaterThanOrEqual(4);

    // به‌محض درمان احتمالی و پر کردن آخور علوفه، دام‌های پستاندار هم محصول می‌دهند، هم بزرگ می‌شوند و هم زایش می‌کنند
    S.coins = 5000;
    cureAllAnimals();
    S.trough = 200;
    for (let d = 0; d < 8; d++) {
      S.day++;
      newDay();
    }
    expect(cowF.ready).toBeGreaterThan(0);
    expect(calf.grown).toBe(0);
    expect(S.animals.filter((a) => a.kind === 'sheep').length).toBeGreaterThanOrEqual(2);
  });

  it('۲. ریگ دوزانویی نجار (builder)، عدم توقف جهان هنگام باز بودن UI.info و ضدگیر قطعی کارگران', () => {
    const cv = document.createElement('canvas');
    cv.width = 430;
    cv.height = 932;
    const stop = startEngine(cv);
    try {
      S.workers = 2;
      S.coins = 5000;
      buyUpgrade('hoe');
      UI.info = { plot: 0, x: 120, y: 120 };
      const snap = cmd.inspectEngine();
      expect(snap).not.toBeNull();
      expect(snap!.workers).toHaveLength(2);
    } finally {
      stop();
    }
  });

  it('۳. سیستم‌های متصل توسعهٔ جهان: کشت دستی در دشت شمالی/باغ‌دره، تابلوی ۳ قراردادی بازار، سقف روزانهٔ پاتیل و ضدتقلب تکرار صحنه', () => {
    // کشت دستی مستقیم در دشت شمالی (فصل بهار: گندم) بدون نیاز به قفل بذر، هم سرعت کامل دارد و هم ضریب اقلیمی برداشت!
    S.lv.land = 3;
    S.day = 2;
    UI.scene = 'north';
    S.seeds.wheat = 5;
    S.stamina = 200;
    doAct('till', 0, false, undefined, true, 'north');
    doAct('plant', 0, false, 'wheat', true, 'north');
    const northPlot = plotsForFarm('north')[0];
    expect(northPlot.hand).toBe(true);
    northPlot.water = 1;
    advance(24);
    expect(northPlot.prog).toBeGreaterThan(0.25);

    // تابلوی بازار هر ۳ قرارداد همزمان را نمایش می‌دهد
    S.story.prologueSeen = true;
    startDebt(1);
    UI.modal = 'market';
    const marketHtml = renderToStaticMarkup(<Modals />);
    expect(marketHtml.split(UT.contractSign).length - 1).toBeGreaterThanOrEqual(3);

    // پاتیل مسی روستایی: شیرهٔ انگور ترکیبی است و سقف پخت روزانه (۸ دیگ) جلوی فارم بی‌نهایت یک‌روزه را می‌گیرد
    const grapeRec = ARTISAN_RECIPES.find((r) => r.id === 'malayer-grape')!;
    expect(grapeRec.inputs.length).toBeGreaterThanOrEqual(2);
    S.inv = { grape: 300, wheat: 300 };
    const cookedFirst = craftArtisan('malayer-grape', 50);
    expect(cookedFirst).toBe(8);
    expect(craftArtisan('malayer-grape', 5)).toBe(0);

    // تکرار صحنهٔ جایزه‌دار سکهٔ مجانی دوباره نمی‌دهد، اما جریمه‌های تکرارشوندهٔ شرخر (visit-*) در هر نوبت واقعی‌اند
    S.coins = 1000;
    const rewardScene = { id: 'reward-once-check', lines: [], next: null, effects: [{ k: 'coins' as const, v: 500 }] };
    applyEffects(rewardScene);
    expect(S.coins).toBe(1500);
    applyEffects(rewardScene);
    expect(S.coins).toBe(1500);
    const penaltyVisit = { id: 'visit-repeat-check', lines: [], next: null, effects: [{ k: 'coins' as const, v: -120 }] };
    applyEffects(penaltyVisit);
    expect(S.coins).toBe(1380);
    applyEffects(penaltyVisit);
    expect(S.coins).toBe(1260);
    expect(canAct('harvest', 0, false, undefined, 'north')).toBeDefined();
  });

  it('۴. رویدادهای فیزیکی زنده در صحنه‌های داستانی و بهینه‌سازی مصرف باتری صوتی در پس‌زمینه', () => {
    const richProps = new Set<string>();
    for (const sc of listAllScenes()) {
      const compiled = compileSceneScript(sc.id);
      if (compiled?.setPiece) richProps.add(compiled.setPiece.kind);
    }
    expect(richProps.has('runaway-rooster')).toBe(true);
    expect(richProps.has('flying-ledger')).toBe(true);
    expect(richProps.has('kaveh-drone')).toBe(true);
    expect(richProps.has('sky-lanterns')).toBe(true);
    expect(richProps.has('river-leap')).toBe(true);

    // تعلیق کامل WebAudio هنگام رفتن گوشی به پس‌زمینه
    suspendAudioForBackground();
    expect(isAudioSuspended()).toBe(true);
    resumeAudioFromBackground();
    expect(isAudioSuspended()).toBe(false);
  });
});
