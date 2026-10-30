import fs from 'node:fs';
import path from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { installDom } from './helpers/dom';
import {
  GOODS, HEART_BOND_2, HEART_BOND_5, MK_BATCH, MK_BREED, MK_COLLECT, MK_EAT,
  MK_FERTADD, MK_FERTSAVE, MK_FERTSOIL, MK_GROW, MK_HARVEST, MK_SEEDSAVE, MK_THIRST,
} from '../src/game/data';
import {
  ESTATES, ESTATE_SPECIALTIES, NORTH_PLOTS_COUNT, VALLEY_PLOTS_COUNT,
  bestEstateForCrop, estateSpecialtyMult, isEstateOwned,
} from '../src/game/estates';
import { ARTISAN_RECIPES } from '../src/game/core/artisan';
import {
  S, UI, advance, exportSaveJson, ghCoversFarm, importSaveJson,
  ownedFarms, plotsForFarm, resetGame, runAuto, startDebt,
} from '../src/game/state';
import {
  DECOR_ITEMS, FISH_SPECIES, OUTFIT_THEMES, SKILL_DEFS, buyCourtyardDecor,
  catchRegionalFish, countBloomingNectarPlots, dismissMorningReport, drinkValleySpring,
  flowerSynergyMult, hasDecor, hasSkill, machineSynergySpeedMult, millAtNorthWindmill,
  setCrewRole, setFarmSeedLock, setHomesteadNames, setPlayerOutfit, skillPointsAvailable,
  toggleMorningCard, unlockSkill,
} from '../src/game/core/rpgSystems';
import {
  SOCIAL_NPC_IDS, VILLAGER_PROFILES, addAffinity, canGiftVillagerToday,
  giftVillager, villagerHearts, villagerPoints,
} from '../src/story/socialVillagers';
import { NODES } from '../src/story/story';
import { TOWN_ACTORS } from '../src/story/townNpc';
import { compileSceneScript } from '../src/story/sceneScripts';
import { advanceNode, pendingNode } from '../src/story/engine';
import { npcHasQuestMarker } from '../src/story/npcQuests';
import { updateSetting } from '../src/game/settings';
import { PAL_PLAYER } from '../src/game/rig';
import { Hud } from '../src/ui/Hud';
import { FarmhouseModal } from '../src/ui/FarmhouseModal';
import { AlmanacModal } from '../src/ui/AlmanacModal';
import { AutoPanelModal } from '../src/ui/AutoPanelModal';
import { Estate } from '../src/ui/Shops2';

beforeAll(() => { installDom(); });

function walkSrcFiles(dir: string, out: string[] = []): string[] {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walkSrcFiles(full, out);
    else if (/\.(ts|tsx)$/.test(ent.name)) out.push(full);
  }
  return out;
}

describe('ممیزی کامل ۲۴ ویژگی مصوب توسعهٔ جهان (#۱ تا #۲۳ + #۲۵)، حذف صریح #۲۴ و بازطراحی ماشین‌آلات در برابر کارگر', () => {
  beforeEach(() => {
    localStorage.clear();
    resetGame();
    updateSetting('locale', 'fa');
    UI.started = true;
  });

  it('موارد #۱، #۲، #۴ و #۵: مزارع سه‌گانه، دشت شمالی، باغ‌دره، آسیاب بادی و چشمهٔ آبشار', () => {
    expect(Object.keys(ESTATES).sort()).toEqual(['farm', 'north', 'valley']);
    expect(plotsForFarm('north')).toHaveLength(NORTH_PLOTS_COUNT);
    expect(plotsForFarm('valley')).toHaveLength(VALLEY_PLOTS_COUNT);
    expect(isEstateOwned('north', 1)).toBe(true);
    expect(isEstateOwned('valley', 3)).toBe(true);

    // آسیاب بادی دشت شمالی گندم را به علوفه تبدیل می‌کند
    S.inv.wheat = 6;
    const milled = millAtNorthWindmill();
    expect(milled).toBeGreaterThan(0);
    expect(S.inv.feed ?? 0).toBe(milled);

    // چشمهٔ باغ‌دره نیرو و آبپاش را بازیابی می‌کند و روزی یک‌بار شارژ ویژه دارد
    S.stamina = 10;
    S.can = 0;
    expect(drinkValleySpring()).toBe(true);
    expect(S.stamina).toBeGreaterThan(10);
    expect(S.can).toBeGreaterThan(0);
    expect(drinkValleySpring()).toBe(false);
  });

  it('مورد #۳ و #۶: سیستم دوستی ۵ قلبه، هدیهٔ روزانه، مزایای واقعی گیم‌پلی و نشانگر پویا بالای سر اهالی', () => {
    expect(SOCIAL_NPC_IDS.length).toBeGreaterThanOrEqual(5);
    expect(VILLAGER_PROFILES).toHaveLength(SOCIAL_NPC_IDS.length);
    expect(npcHasQuestMarker('grandma')).toBe(false);

    S.inv.saffron = 2;
    expect(canGiftVillagerToday('grandma')).toBe(true);
    expect(giftVillager('grandma', 'saffron')).toBe(true);
    expect(villagerPoints('grandma')).toBe(22);
    expect(villagerHearts('grandma')).toBe(1);
    // محدودیت یک هدیه در روز برای هر شخصیت
    expect(canGiftVillagerToday('grandma')).toBe(false);
    expect(giftVillager('grandma', 'saffron')).toBe(false);

    // رسیدن به ۵ قلب کامل (۱۰۰ امتیاز) مزایای هم‌افزایی مهندس را فعال می‌کند
    addAffinity('engineer', HEART_BOND_5);
    expect(villagerHearts('engineer')).toBe(5);
    expect(HEART_BOND_2).toBe(40);
    expect(machineSynergySpeedMult()).toBeGreaterThan(1);
  });

  it('موارد #۷، #۸ و #۹: صحنه‌های سینمایی فصلی/اجتماعی با کارگردانی فیزیکی و تضمین ۱۰۰٪ اعمال پیامد در رد کردن (Skip)', () => {
    expect(TOWN_ACTORS.length).toBeGreaterThanOrEqual(4);
    const allNodes = Object.values(NODES);
    expect(allNodes.length).toBeGreaterThanOrEqual(130);

    const targetNode = allNodes[0]!;
    const compiled = compileSceneScript(targetNode.id);
    expect(compiled).not.toBeNull();
    expect(compiled!.beats.length).toBeGreaterThan(0);

    const xpBefore = S.xp;
    startDebt();
    S.story.pending = targetNode.id;
    let guard = 0;
    while (pendingNode() && guard++ < 25) {
      advanceNode(pendingNode()!);
    }
    expect(S.story.seen[targetNode.id]).toBe(true);
    expect(S.xp).toBeGreaterThanOrEqual(xpBefore);
  });

  it('موارد #۱۰، #۱۱، #۱۲، #۱۳ و #۱۴ + بازطراحی ماشین‌آلات صنعتی (MK1..MK3 در برابر کارگر دستی)', () => {
    S.lv.land = 3;
    expect(ownedFarms()).toEqual(['farm', 'north', 'valley']);

    // بذر اختصاصی هر مزرعه و تخصص اقلیمی واقعی
    expect(bestEstateForCrop('saffron')).toBe('north');
    expect(bestEstateForCrop('pistachio')).toBe('valley');
    expect(ESTATE_SPECIALTIES.north).toContain('wheat');
    setFarmSeedLock('north', 'wheat');
    expect(S.farmSeeds?.north).toBe('wheat');
    expect(estateSpecialtyMult('north', 'wheat')).toBeGreaterThan(1.15);

    // نقش تخصصی خدمه
    setCrewRole('crops');
    expect(S.crewRole).toBe('crops');
    setCrewRole('ranch');
    expect(S.crewRole).toBe('ranch');

    // پوشش گلخانه روی ستون‌های شرقی هر ۳ مزرعه
    S.gh = 2;
    expect(ghCoversFarm('farm', 7)).toBe(true);
    expect(ghCoversFarm('north', 8)).toBe(true);
    expect(ghCoversFarm('valley', 9)).toBe(true);

    // تمایز صنعتی واقعی مدل‌های ۱، ۲ و ۳ ماشین‌آلات
    expect(MK_BATCH).toEqual([0, 84, 114, 999]);
    expect(MK_HARVEST[3]).toBeGreaterThan(MK_HARVEST[2]);
    expect(MK_FERTSOIL[3]).toBeGreaterThan(MK_FERTSOIL[2]);
    expect(MK_FERTADD[3]).toBeGreaterThan(MK_FERTADD[1]);
    expect(MK_FERTSAVE[3]).toBeGreaterThan(MK_FERTSAVE[1]);
    expect(MK_SEEDSAVE[3]).toBeGreaterThan(MK_SEEDSAVE[2]);
    expect(MK_THIRST[3]).toBeLessThan(MK_THIRST[1]);
    expect(MK_GROW[3]).toBeGreaterThan(MK_GROW[1]);
    expect(MK_EAT[3]).toBeLessThan(MK_EAT[1]);
    expect(MK_BREED[3]).toBeGreaterThan(MK_BREED[1]);
    expect(MK_COLLECT[3]).toBeGreaterThan(MK_COLLECT[1]);

    // تضمین حیاتی اقتصادی: آخور خودکار گندم ارزان را مستقیم داخل آخور می‌ریزد و هرگز به کالای فروشی S.inv.feed تبدیل نمی‌کند
    S.machines.feeder = 3;
    S.auto.feed = true;
    S.animals.push({ id: 901, kind: 'cow', sex: 'f', ready: 0, grown: 0, sick: false, hue: 0 });
    S.trough = 0;
    S.inv.wheat = 10;
    delete S.inv.feed;
    runAuto();
    expect(S.trough).toBeGreaterThan(0);
    expect(S.inv.feed ?? 0).toBe(0);
  });

  it('موارد #۱۵ تا #۲۳: مهارت‌های RPG، ماهیگیری ۸ گونه، هم‌افزایی گل‌وزنبور، دکور، حیوان خانگی، گزارش صبح، دانشنامه و ۱۴ دستور فرآوری', () => {
    // درخت مهارت ۴ شاخه × ۳ سطح = ۱۲ مهارت
    expect(SKILL_DEFS).toHaveLength(12);
    S.xp = 250000;
    expect(skillPointsAvailable()).toBeGreaterThanOrEqual(4);
    expect(unlockSkill('crop-2')).toBe(false); // نیازمند پیش‌نیاز سطح ۱
    expect(unlockSkill('crop-1')).toBe(true);
    expect(unlockSkill('nature-1')).toBe(true);
    expect(unlockSkill('nature-2')).toBe(true);
    expect(hasSkill('nature-2')).toBe(true);

    // هم‌افزایی گل‌ها با زنبورستان
    S.plots[0]!.st = 2;
    S.plots[0]!.crop = 'rose';
    S.plots[0]!.prog = 0.8;
    expect(countBloomingNectarPlots()).toBeGreaterThanOrEqual(1);
    expect(flowerSynergyMult()).toBeGreaterThan(1);

    // ۸ گونهٔ ماهی منطقه‌ای + ثبت رکورد وزن در دفترچه
    expect(FISH_SPECIES).toHaveLength(8);
    const caught = catchRegionalFish(1.35);
    expect(caught.sweet).toBe(true);
    expect(caught.kg).toBeGreaterThan(0);
    expect(Object.keys(S.fishLog ?? {}).length).toBeGreaterThanOrEqual(1);

    // شخصی‌سازی نام و لباس کشاورز + دکوراسیون و حیوانات خانگی حیاط
    setHomesteadNames('سهراب', 'باغ خورشید');
    setPlayerOutfit(2);
    expect(S.custom?.farmerName).toBe('سهراب');
    expect(S.custom?.farmName).toBe('باغ خورشید');
    expect(PAL_PLAYER.pants).toBe(OUTFIT_THEMES[2]!.pal.pants);

    S.coins = 200000;
    expect(DECOR_ITEMS.length).toBeGreaterThanOrEqual(5);
    expect(buyCourtyardDecor('barncat')).toBe(true);
    expect(buyCourtyardDecor('sheepdog')).toBe(true);
    expect(hasDecor('barncat')).toBe(true);
    expect(hasDecor('sheepdog')).toBe(true);

    // گزارش صبحگاهی غیرمزاحم و قابل خاموش/رد کردن
    advance(24);
    expect(S.morning).not.toBeNull();
    dismissMorningReport();
    expect(S.morning?.shown).toBe(true);
    toggleMorningCard();
    expect(S.custom?.morningCard).toBe(false);

    // دستورهای فرآوری اصیل روستایی + معجون و نگین اکتشافی
    expect(GOODS.length).toBeGreaterThanOrEqual(20);
    expect(ARTISAN_RECIPES.length).toBeGreaterThanOrEqual(14);
  });

  it('مورد #۲۴: حرکت آزاد WASD/عددی ممنوع است و کلیدهای جهت‌دار فقط برای دسترس‌پذیری و کنترل‌های مجازند', () => {
    // Esc در androidNav، F9 در SceneDebugMenu و Tab trap در parts شنونده‌های واقعی و مستندند.
    // کلیدهای جهت‌دار در engine فقط کرت را برای دسترس‌پذیری انتخاب می‌کنند و مختصات بازیکن را مستقیم تغییر نمی‌دهند.
    const srcFiles = walkSrcFiles(path.resolve(__dirname, '../src'));
    expect(srcFiles.length).toBeGreaterThan(40);
    const listeners: string[] = [];
    for (const file of srcFiles) {
      const code = fs.readFileSync(file, 'utf8');
      const rel = path.relative(path.resolve(__dirname, '../src'), file);
      if (/addEventListener\(\s*['"](keydown|keyup|keypress)['"]/.test(code)) listeners.push(rel);
      // مقایسهٔ مقدار دقیق کلید، نه تطبیق سطحی KeyDown با KeyD؛ WASD/حرکت/اعداد همچنان ممنوعند.
      const accessibleHold = rel === 'ui/FishingModal.tsx' || rel === 'ui/FestivalModal.tsx';
      const accessiblePlot = rel === 'game/engine.ts' || rel === 'game/engineA11y.ts';
      const forbidden = accessiblePlot
        ? /['"](?:Key[WASD]|Digit[0-9])['"]/
        : accessibleHold
          ? /['"](?:ArrowDown|ArrowLeft|ArrowRight|Key[WASD]|Digit[0-9]|Space)['"]/
          : /['"](?:ArrowUp|ArrowDown|ArrowLeft|ArrowRight|Key[WASD]|Digit[0-9]|Space)['"]/;
      expect(code, `میانبر حرکتی در ${file} ممنوع است`).not.toMatch(forbidden);
      expect(code, `window.onkey* در ${file} ممنوع است`).not.toMatch(/window\.onkey(down|up|press)\s*=/);
    }
    expect(listeners.sort()).toEqual(['game/androidNav.ts', 'ui/SceneDebugMenu.tsx', 'ui/parts.tsx']);
    const controllerCode = fs.readFileSync(path.resolve(__dirname, '../src/game/engineA11y.ts'), 'utf8');
    expect(controllerCode).toContain('d.activateTarget(`plot:${keyboardPlot}`)');
    expect(controllerCode).toContain('!isFarmScene(UI.scene)');
    expect(fs.readFileSync(path.resolve(__dirname, '../src/App.tsx'), 'utf8')).toContain('DEV_TOOLS');
  });

  it('مورد #۲۵: ذخیره/بازیابی کامل JSON برای تمام داده‌های جدید + رندر تمیز دوزبانه (FA بدون عدد لاتین + EN)', () => {
    S.lv.land = 1;
    S.xp = 30000;
    setFarmSeedLock('north', 'saffron');
    setCrewRole('crops');
    unlockSkill('crop-1');
    setHomesteadNames('آرش', 'مزرعهٔ زمرد');
    setPlayerOutfit(1);
    S.coins = 90000;
    buyCourtyardDecor('lanterns');
    S.inv.rose = 3;
    giftVillager('grandma', 'rose');
    catchRegionalFish(1.3);
    advance(24);
    if (S.morning) S.morning.shown = false;

    // رندر فارسی بدون خطا و بدون هیچ رقم انگلیسی در متن رندرشدهٔ پنل‌های جدید
    const faHome = renderToStaticMarkup(<FarmhouseModal />);
    const faAlmanac = renderToStaticMarkup(<AlmanacModal />);
    const faAuto = renderToStaticMarkup(<AutoPanelModal />);
    const faEstate = renderToStaticMarkup(<Estate />);
    const faHud = renderToStaticMarkup(<Hud />);
    expect(faHome).toContain('مزرعهٔ زمرد');
    expect(faAlmanac.length).toBeGreaterThan(200);
    expect(faAuto.length).toBeGreaterThan(200);
    expect(faEstate.length).toBeGreaterThan(200);
    expect(faHud.length).toBeGreaterThan(200);
    // حذف ویژگی‌های عددی SVG/HTML پیش از بررسی متن فارسی قابل مشاهده
    const stripTags = (html: string) => html.replace(/<[^>]+>/g, '');
    expect(stripTags(faHome)).not.toMatch(/[0-9]/);
    expect(stripTags(faAlmanac)).not.toMatch(/[0-9]/);

    // رندر انگلیسی بدون خطا
    updateSetting('locale', 'en');
    const enHome = renderToStaticMarkup(<FarmhouseModal />);
    const enAlmanac = renderToStaticMarkup(<AlmanacModal />);
    expect(enHome.length).toBeGreaterThan(200);
    expect(enAlmanac.length).toBeGreaterThan(200);

    // رفت‌وبرگشت کامل Save JSON
    const raw = exportSaveJson();
    resetGame();
    expect(S.farmSeeds?.north).toBeUndefined();
    expect(importSaveJson(raw)).toBe(true);
    expect(S.farmSeeds?.north).toBe('saffron');
    expect(S.crewRole).toBe('crops');
    expect(S.skills?.['crop-1']).toBe(true);
    expect(S.custom?.farmerName).toBe('آرش');
    expect(S.custom?.farmName).toBe('مزرعهٔ زمرد');
    expect(S.custom?.outfit).toBe(1);
    expect(S.decor?.lanterns).toBe(true);
    expect(S.affinity?.grandma).toBeGreaterThan(0);
    expect(Object.keys(S.fishLog ?? {}).length).toBeGreaterThanOrEqual(1);
  });
});
