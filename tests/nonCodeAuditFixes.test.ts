import { describe, expect, it } from 'vitest';
import { S, UI, resetGame } from '../src/game/state';
import { CROPS, GOOD, ANIMALS, MACHINES, SEASONS } from '../src/game/data';
import { ARTISAN_RECIPES } from '../src/game/core/artisan';
import { triggerEvent } from '../src/game/core/events';
import { interestOf, startDebt } from '../src/game/core/debt';
import { CFG, updateSetting } from '../src/game/settings';
import { UT } from '../src/strings/uiText';
import { GT } from '../src/strings/gameText';
import { CHANGELOG } from '../src/strings/version';
import { fa, faDec, faPct } from '../src/strings/fa';
import { NOTES } from '../src/story/debtData';
import { QUESTS, chapterChecklist } from '../src/story/quests';
import { ensureQuests } from '../src/story/dailyQuests';
import { SECRETS, checkSecretTriggers } from '../src/story/secrets';
import { ensurePrologueInitialized, skipActiveCutscene, triggerCutscene } from '../src/story/engine';
import { compileSceneScript } from '../src/story/sceneScripts';
import { FIELD_X, FIELD_Y, HIVE_SLOTS, PLOT_DX, PLOT_DY, RIVER_SPOTS } from '../src/game/scenes';
import { RANCH_PEN_SLOTS } from '../src/game/farmZones';
import { ESTATE_LV_REQ } from '../src/game/estates';
import { ESTATE_AND_NPC_STORY_NODES, NPC_QUEST_SPECS } from '../src/story/npcQuests';
import { ESTATE_EN_LINES, NPC_ROLES } from '../src/strings/estateStoryText';
import { TOWN_ACTORS, npcTargetAt } from '../src/story/townNpc';

describe('ممیزی سخت‌گیرانهٔ باگ‌های غیرکدی، دوزبانگی زنده، صحنه و بالانس', () => {
  it('تغییر زندهٔ زبان FA <-> EN بلافاصله تمام متون UI، محصولات، ماشین‌ها، کوئست‌ها، رازها و رویدادها را تغییر می‌دهد', () => {
    resetGame();
    const ev = triggerEvent('festival');
    ensureQuests(true);

    updateSetting('locale', 'en');
    expect(UT.u1).toBe('Colorful');
    expect(GT.g62).toBe('Wheat');
    expect(CROPS[0].fa).toBe('Wheat');
    expect(GOOD.egg.fa).toBe('Egg');
    expect(ANIMALS.chicken.fa).toBe('Chicken');
    expect(MACHINES.tractor.fa).toContain('Tractor');
    expect(SEASONS[0]).toBe('Spring');
    expect(ARTISAN_RECIPES[0].name).toBe('Home Feed Mill');
    expect(NOTES[0].name).toContain('Deed');
    expect(QUESTS[0].title).toBe('First Farm Harvest');
    expect(chapterChecklist(2)[0].label).toContain('Carpentry');
    expect(SECRETS[0].titleFa).toContain('Midnight');
    expect(ev.title).toBe('Spring Village Festival');
    expect(fa(1500)).toBe('1,500');
    expect(faDec(1.5)).toBe('1.5');
    expect(faPct(45)).toBe('45%');

    updateSetting('locale', 'fa');
    expect(UT.u1).toBe('مزرعه');
    expect(CROPS[0].fa).toBe('گندم');
    expect(GOOD.egg.fa).toBe('تخم‌مرغ');
    expect(ANIMALS.chicken.fa).toBe('مرغ');
    expect(MACHINES.tractor.fa).toBe('تراکتور');
    expect(SEASONS[0]).toBe('بهار');
    expect(ARTISAN_RECIPES[0].name).toContain('علوفه');
    expect(ev.title).toContain('جشن بهاره');
    expect(faDec(1.5)).toBe('۱٫۵');
    expect(faPct(45)).toBe('۴۵٪');
    expect(CFG.locale).toBe('fa');
  });

  it('کوئست‌ها هرگز نام مغازه‌های ناموجود «ابزارفروشی» یا «ماشین‌سازی» را نشان نمی‌دهند', () => {
    for (let ch = 1; ch <= 6; ch++) {
      const q = QUESTS.find((it) => it.chapter === ch)!;
      expect(q.desc).not.toContain('ابزارفروشی');
      expect(q.desc).not.toContain('ماشین‌سازی');
      for (const item of chapterChecklist(ch)) {
        expect(item.label).not.toContain('ابزارفروشی');
        expect(item.label).not.toContain('ماشین‌سازی');
      }
    }
  });

  it('کوئست تولیدمثل دام بدون جفت نر و مادهٔ بالغ هم‌گونه هرگز به بازیکن داده نمی‌شود', () => {
    resetGame();
    S.animals = [{ id: 1, kind: 'chicken', sex: 'f', grown: 0, ready: 0, hue: 0, sick: false, preg: 0 }];
    for (let d = 1; d <= 30; d++) {
      S.day = d;
      ensureQuests(true);
      expect(S.quests.daily.some((q) => q.kind === 'babies')).toBe(false);
    }
  });

  it('بازپخش صحنهٔ گالری در حین پرولوگ هرگز بازی را بدون سند بدهی قفل نمی‌کند', () => {
    resetGame();
    expect(S.debt).toBeNull();
    triggerCutscene('p1', { forceReplay: true });
    triggerCutscene('town-grandma-0', { forceReplay: true, director: true });
    expect(UI.directorReplay).toBe(true);
    skipActiveCutscene();
    expect(S.story.pending).toBe('p1');
    skipActiveCutscene();
    ensurePrologueInitialized();
    expect(S.story.prologueSeen).toBe(true);
    expect(S.debt).not.toBeNull();
  });

  it('چیدمان صحنه‌ها در حیاط باز مزرعه، رودخانه و شهر بدون همپوشانی حصار، اسکله یا سیاهی‌لشکر زودرس است', () => {
    const p1 = compileSceneScript('p1')!;
    expect(p1.initialMarks.some((m) => m.actor === 'jahangir')).toBe(false);
    const ch6 = compileSceneScript('ch6-outro')!;
    expect(ch6.initialMarks.map((m) => m.actor).sort()).toEqual(['jahangir', 'player']);
    expect(ch6.beats[0].marks?.some((m) => m.actor === 'player' && m.x > 800)).toBe(true);
    const visit = compileSceneScript('visit-due-missed')!;
    for (const m of visit.initialMarks) {
      expect(m.y).toBeLessThan(306);
      expect(m.x).toBeLessThan(400);
    }
    expect(FIELD_X + 8 * PLOT_DX).toBeLessThanOrEqual(1145);
    expect(FIELD_Y + 5 * PLOT_DY).toBeLessThanOrEqual(575);
    for (const sp of RIVER_SPOTS) {
      expect(sp.y).toBeLessThanOrEqual(430);
      expect(sp.x).toBeLessThan(980);
    }
    for (const hv of HIVE_SLOTS) expect(hv.x).toBeLessThanOrEqual(1240);
  });

  it('کوئست فروش روزانه همیشه ارقام رُند انسانی دارد و تاریخچهٔ نسخه‌ها در انگلیسی صفر کاراکتر فارسی دارد', () => {
    resetGame();
    for (let d = 1; d <= 60; d++) {
      S.day = d;
      ensureQuests(true);
      for (const q of S.quests.daily) {
        if (q.kind === 'sell') expect(q.target % 100).toBe(0);
      }
    }
    updateSetting('locale', 'en');
    for (const row of CHANGELOG) {
      expect(/[\u0600-\u06FF]/.test(row.v)).toBe(false);
      expect(/[\u0600-\u06FF]/.test(row.note)).toBe(false);
    }
    updateSetting('locale', 'fa');
    expect(/[\u0600-\u06FF]/.test(CHANGELOG[0].note)).toBe(true);
  });

  it('اعتبار خوش‌حسابی سود ماهانهٔ سند را واقعاً کاهش می‌دهد و بدحسابی جریمه دارد', () => {
    resetGame();
    startDebt(3);
    S.debt!.standing = 60;
    const normalInt = interestOf();
    S.debt!.standing = 85;
    const goodInt = interestOf();
    S.debt!.standing = 15;
    const badInt = interestOf();
    expect(goodInt).toBeLessThan(normalInt);
    expect(badInt).toBeGreaterThan(normalInt);
  });

  it('هویت شخصیت‌ها (عمو مراد / مادربزرگ نصرت)، سطح واقعی سندها و تعداد واقعی آیتم‌های کوئست در هر دو زبان ۱۰۰٪ یکدست است', () => {
    expect(NPC_ROLES.fa.rancher.name).toBe('عمو مراد');
    expect(NPC_ROLES.en.rancher.name).toBe('Uncle Morad');
    expect(NPC_ROLES.fa.grandma.name).toBe('مادربزرگ نصرت');
    expect(NPC_ROLES.en.grandma.name).toBe('Grandma Nosrat');

    const dump = JSON.stringify({ NPC_ROLES, NPC_QUEST_SPECS, ESTATE_AND_NPC_STORY_NODES, ESTATE_EN_LINES });
    expect(dump).not.toContain('حبیب');
    expect(dump).not.toContain('Habib');
    expect(dump).not.toContain('منصور');

    expect(ESTATE_LV_REQ[0]).toBe(4);
    const introNorthFa = ESTATE_AND_NPC_STORY_NODES.find((n) => n.id === 'area-intro-north')!;
    expect(introNorthFa.lines.some((l) => l.text.includes('سطح چهار'))).toBe(true);
    expect(ESTATE_EN_LINES['area-intro-north'].some((l) => l.includes('Level Four'))).toBe(true);

    const r2 = NPC_QUEST_SPECS.find((q) => q.id === 'npc-q-rancher-2')!;
    expect(r2.progress()[1]).toBe(25);
    expect(ESTATE_EN_LINES['npc-q-rancher-2-start'][0]).toContain('twenty-five');

    const treeSecret = SECRETS.find((s) => s.id === 'secret-grandpa-tree')!;
    updateSetting('locale', 'en');
    expect(treeSecret.clueFa).toContain('154');
    updateSetting('locale', 'fa');
    expect(treeSecret.clueFa).toContain('۱۵۴');

    resetGame();
    UI.started = true;
    UI.scene = 'north';
    S.story.prologueSeen = true;
    S.wellLv = 2;
    S.weather = 0;
    S.hour = 23.5;
    UI.scene = 'farm';
    S.northPlots[10].st = 2;
    S.northPlots[10].water = 0.1;
    S.valleyPlots[20].st = 2;
    S.valleyPlots[20].water = 0.1;
    expect(checkSecretTriggers('well')).toBe(true);
    expect(S.northPlots[10].water).toBe(1);
    expect(S.valleyPlots[20].water).toBe(1);
  });

  it('هیچ‌یک از ۶ بخش دام با جاده‌ها، تابلوها، خانه، انبار یا کرت‌ها برخورد ندارد و اهالی شهر در صبح/ظهر/عصر روی هم نمی‌افتند', () => {
    const forbidden = [
      { name: 'plots', x0: FIELD_X, x1: FIELD_X + 8 * PLOT_DX, y0: FIELD_Y, y1: FIELD_Y + 5 * PLOT_DY },
      { name: 'house', x0: 80, x1: 315, y0: 60, y1: 268 },
      { name: 'barn', x0: 920, x1: 1205, y0: 30, y1: 218 },
      { name: 'northRoadSign', x0: 794, x1: 922, y0: 80, y1: 204 },
      { name: 'valleyRoadSign', x0: 1138, x1: 1275, y0: 368, y1: 508 },
      { name: 'townRoadSign', x0: 1152, x1: 1280, y0: 218, y1: 362 },
    ];
    for (const pen of RANCH_PEN_SLOTS) {
      for (const z of forbidden) {
        const hit = pen.x0 < z.x1 && pen.x1 > z.x0 && pen.y0 < z.y1 && pen.y1 > z.y0;
        expect(hit, `pen overlapped ${z.name}`).toBe(false);
      }
    }
    for (const hr of [8, 13, 19]) {
      const xs = [...TOWN_ACTORS.map((_, i) => npcTargetAt(i, hr)[0]), 992].sort((a, b) => a - b);
      for (let i = 1; i < xs.length; i++) {
        expect(xs[i] - xs[i - 1]).toBeGreaterThanOrEqual(160);
      }
    }
  });
});
