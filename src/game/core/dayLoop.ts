import {
  ANIMALS, CROP, CROPS, DAY_RATE, GH_SPEED, GOODS, LIVE_DAY_STRETCH, MK_BREED, MK_COLLECT, MK_EAT, MK_GROW, MK_THIRST,
  HONEY_SEASON_MULT, NIGHT_END_H, WAGE_WARN_HOUR, NIGHT_START_H, PEN_KINDS, STAM_REGEN, WORKER_WAGE, WORKER_SHIFT_START, WORKER_SHIFT_END, XP, type CropId,
} from '../data';
import { estateGrowthRate, estateSpecialtyMult, estateWaterRetention, isFarmScene } from '../estates';
import { flowerSynergyMult, hasDecor, hasSkill, processMorningCompanionAndReport } from './rpgSystems';
import { rnd } from '../rng';
import { GT } from '../../strings/gameText';
import { S, UI, ghCoversFarm, mkOf, notify, notifyFarmMilestoneMail, notifyMarketBoomMail, ownedFarms, plotsForFarm, runAuto, saveGame, season, syncMailboxState, toast, troughCap } from '../state';
import { invCount, penCap, stamCap } from './economy';
import { addStat, addXp, checkAch } from './progress';
import { processDebtDay } from './debt';
import { tickQuests } from '../../story/dailyQuests';
import { notePlayerAction, triggerSeasonDawn } from '../../story/engine';
import { checkSecretTriggers } from '../../story/secrets';
import { harvestHoney, harvestPond, honeyCap } from './ponds';
import { processSeasonalEvent } from './events';
import { animalQualityMult, processAnimalHealth, tickContract, wellRetentionMult } from './farmDeep';
import { charterMorningWaterBonus, ensureFrontier } from './frontier';
import { tickWorkersSim } from './workers';

/** نرخ واقعی پیشرفت روزانهٔ یک کرت کاشته‌شده (منبع واحد حقیقت برای شبیه‌ساز و کارت زمان باقی‌ماندهٔ HUD) */
export function effectivePlotDailyRate(farm: ReturnType<typeof ownedFarms>[number], plotIdx: number): number {
  const arr = plotsForFarm(farm);
  const p = arr[plotIdx];
  if (!p || !p.crop) return 0.01;
  const def = CROP[p.crop];
  if (!def) return 0.01;
  const dedicatedMode = S.crewRole === 'crops' || hasSkill('crop-1');
  const sprinklerGrow = dedicatedMode ? MK_GROW[mkOf('sprinkler')] : 1;
  const skillGrow = (hasSkill('crop-1') ? 1.1 : 1) * ((S.affinity?.grandma ?? 0) >= 100 ? 1.1 : 1) * ((S.affinity?.engineer ?? 0) >= 100 ? 1.06 : 1);
  const inGh = S.gh > 0 && ghCoversFarm(farm, plotIdx);
  const ghMult = inGh ? GH_SPEED[S.gh] : 1;
  const humanOrDedicated = Boolean(p.hand || (S.farmSeeds?.[farm] && S.farmSeeds[farm] !== 'auto'));
  const effectiveGrow = humanOrDedicated && farm !== 'farm'
    ? (DAY_RATE * 0.36 * estateSpecialtyMult(farm, p.crop) * MK_GROW[mkOf('sprinkler')] * (1 + mkOf('drone') * 0.03) * skillGrow)
    : (DAY_RATE * estateGrowthRate(farm, S.lv.land) * sprinklerGrow * skillGrow);
  return (effectiveGrow / def.days) * ghMult * (0.83 + 0.44 * p.fert);
}

// ===== شبیه‌سازی زمان در همهٔ مزارع تحت مالکیت =====
function stepSim(h: number) {
  const rain = S.weather === 2;
  const sn = season();
  const baseThirst = MK_THIRST[mkOf('sprinkler')] * wellRetentionMult();
  for (const farm of ownedFarms()) {
    const arr = plotsForFarm(farm);
    const thirstMult = baseThirst * estateWaterRetention(farm, S.lv.land);
    const hasGh = S.gh > 0;
    for (let pi = 0; pi < arr.length; pi++) {
      const p = arr[pi];
      if (p.st === 0) continue;
      if (p.st === 1) { p.water = rain ? 1 : Math.max(0, p.water - 0.3 * thirstMult * h / 24); continue; }
      if (p.dead || !p.crop) continue;
      const def = CROP[p.crop];
      if (!def) { p.crop = null; p.st = 1; p.ripe = false; continue; }
      const inGh = hasGh && ghCoversFarm(farm, pi);
      if (!inGh && !def.regrow && !def.seasons.includes(sn)) {
        p.water = rain ? 1 : Math.max(0, p.water - 0.2 * h / 24);
        p.dry = 0;
        continue;
      }
      p.water = rain ? 1 : Math.max(0, p.water - def.thirst * thirstMult * 0.6 * h / 24);
      if (p.water <= 0) p.dry += h; else p.dry = Math.max(0, p.dry - h);
      if (p.dry > 36) { p.dead = true; continue; }
      if (!p.ripe && p.water > 0) {
        p.prog += (h / 24) * effectivePlotDailyRate(farm, pi);
        if (p.prog >= 1) { p.prog = 1; p.ripe = true; }
      }
    }
  }
}

function rollWeather(sn: number) {
  const r = rnd();
  const t = [[0.45, 0.7, 1], [0.7, 0.9, 1], [0.4, 0.7, 1], [0.3, 0.65, 1]][sn];
  S.weather = sn === 3 ? (r < t[0] ? 0 : r < t[1] ? 1 : 3) : r < t[0] ? 0 : r < t[1] ? 1 : 2;
}

export const onNewDay: { cb: (() => void) | null } = { cb: null };

import { tickBuilds } from './build';

/** خواب تا صبحِ فردا (ساعت ۶) — شب را رد می‌کند؛ ماشین‌ها، ساخت‌وساز و سیم طبیعی طی مسیر اجرا می‌شوند */
export function sleepToMorning() {
  const target = S.hour >= 6 ? 30 - S.hour : 6 - S.hour;
  advance(target);
  tickBuilds(target * 4 * DAY_RATE);
  notify();
}
export const isNight = () => S.hour >= NIGHT_START_H || S.hour < NIGHT_END_H;
export function newDay() {
  const old = season();
  S.day++;
  const sn = season();
  rollWeather(sn);
  if (sn !== old) {
    toast(['spring', 'summer', 'autumn', 'winter'][sn], [GT.g95, GT.g96, GT.g97, GT.g98][sn]);
    // گیاهان خارج‌فصل فقط به خواب می‌روند (در state.stepSim مدیریت می‌شود)
  }
  const eatMult = MK_EAT[mkOf('feeder')] * (hasSkill('ranch-1') ? 0.82 : 1);
  const breedBoost = ((S.crewRole === 'ranch' ? MK_BREED[mkOf('feeder')] : 1) * (hasSkill('ranch-2') ? 1.22 : 1) * ((S.affinity?.rancher ?? 0) >= 100 ? 1.25 : 1));
  const colMult = (S.crewRole === 'ranch' || hasSkill('ranch-3')) ? MK_COLLECT[mkOf('collector')] : 1;
  // اگر آخور خودکار روشن است، فقط آخور دام‌ها را از علوفهٔ انبار پر کن (بدون اجرای دوبارهٔ برداشت/کاشت مزارع!)
  if (S.auto.feed && mkOf('feeder') > 0) {
    const cap = troughCap();
    const have = S.inv.feed ?? 0;
    if (have > 0 && S.trough < cap) {
      // آخور پیوسته می‌ماند (رفتار خوراندن دست‌نخورده)؛ فقط پسماندِ کسری نباید وارد کالای انبار شود
      const put = Math.min(have, cap - S.trough);
      S.trough += put;
      const left = Math.floor(have - put);
      if (left > 0) S.inv.feed = left;
      else delete S.inv.feed;
    }
  }
  let hungry = false;
  const fedIds = new Set<number>();
  const fedKinds = new Set<string>();
  S.animals = S.animals.filter((a) => Boolean(a && ANIMALS[a.kind]));
  // اول حیوانات بالغ علوفه می‌خورند؛ نوزادان شیرخوار فقط اگر گلهٔ مادرشان امروز تغذیه شده باشد رشد می‌کنند (پستانداران بی‌غذا مطلقاً رشد/تولیدمثل ندارند، اما مرغ و خروس استثنا هستند!)
  for (const a of S.animals) {
    if (a.grown > 0) continue;
    const d = ANIMALS[a.kind];
    if (d.eat <= 0) {
      fedKinds.add(a.kind);
      if (!a.sick) {
        fedIds.add(a.id);
        if (a.sex === 'f' && S.day % d.every === 0) {
          a.ready = Math.min(d.cap, a.ready + Math.round(d.qty * DAY_RATE * animalQualityMult(a.kind) * colMult));
        }
      }
      continue;
    }
    const needFeed = d.eat * eatMult * DAY_RATE;
    if (S.trough >= needFeed) {
      S.trough -= needFeed;
      fedKinds.add(a.kind);
      if (!a.sick) {
        fedIds.add(a.id);
        if (a.sex === 'f' && S.day % d.every === 0) {
          a.ready = Math.min(d.cap, a.ready + Math.round(d.qty * DAY_RATE * animalQualityMult(a.kind) * colMult));
        }
      }
    } else {
      hungry = true;
    }
  }
  for (const a of S.animals) {
    if (a.grown <= 0 || a.sick) continue;
    const d = ANIMALS[a.kind];
    let canGrow = d.eat <= 0 || fedKinds.has(a.kind);
    if (!canGrow && S.trough >= d.eat * 0.5 * eatMult * DAY_RATE) {
      S.trough -= d.eat * 0.5 * eatMult * DAY_RATE;
      canGrow = true;
    }
    if (canGrow) {
      fedIds.add(a.id);
      a.grown = Math.max(0, a.grown - DAY_RATE * (hasSkill('ranch-2') ? 1.25 : 1));
    } else {
      hungry = true;
    }
  }
  if (hungry) toast('feed', GT.g157);
  if (!hasDecor('sheepdog') && !(S.crewRole === 'ranch' && mkOf('feeder') >= 3)) processAnimalHealth(hungry);
  // تولیدمثل چرخه‌ای: فقط و فقط برای جفت‌های سالم که امروز تغذیه شده‌اند (پرندگان چرای آزاد دارند)
  for (const kind of PEN_KINDS) {
    const group = S.animals.filter((a) => a.kind === kind && a.grown <= 0 && !a.sick && fedIds.has(a.id));
    if (!group.some((a) => a.sex === 'm')) continue;
    const females = group.filter((a) => a.sex === 'f');
    if (!females.length) continue;
    const bird = kind === 'chicken' || kind === 'duck';
    const cap = penCap(kind);
    const room = () => S.animals.filter((a) => a.kind === kind).length
      + S.nests.filter((n) => n.kind === kind).length * +bird
      + S.animals.filter((a) => a.kind === kind && (a.preg ?? 0) > 0).length * +!bird < cap;
    if (bird) {
      if (rnd() < Math.min(0.85, 0.45 * breedBoost) && room() && S.nests.filter((n) => n.kind === kind).length < 2) {
        S.nests.push({ id: S.nextId++, kind, hatch: 2 * DAY_RATE });
        toast(kind, ANIMALS[kind].fa + GT.g158);
      }
    } else {
      const mama = females.find((a) => !(a.preg ?? 0));
      if (mama && rnd() < Math.min(0.8, 0.4 * breedBoost) && room()) {
        mama.preg = 3 * DAY_RATE;
        toast(kind, ANIMALS[kind].fa + GT.g159);
      }
    }
  }
  // جوجه‌شدن تخم‌های پرندگان چرای آزاد
  for (let i = S.nests.length - 1; i >= 0; i--) {
    const n = S.nests[i];
    n.hatch -= DAY_RATE;
    if (n.hatch <= 0) {
      S.nests.splice(i, 1);
      if (S.animals.filter((q) => q.kind === n.kind).length < penCap(n.kind)) {
        S.animals.push({ id: S.nextId++, kind: n.kind, ready: 0, hue: Math.floor(rnd() * 4), sex: rnd() < 0.5 ? 'm' : 'f', grown: ANIMALS[n.kind].grow });
        toast(n.kind, ANIMALS[n.kind].baby + GT.g160);
        notifyFarmMilestoneMail('baby');
        addStat('babies', 1); addXp(XP.baby);
      }
    }
  }
  // زایش پستانداران: فقط در روزهایی که مادر تغذیه شده و بیمار نیست بارداری جلو می‌رود (حذف کامل اکسپلویت دام رایگان بدون علوفه!)
  for (const a of S.animals) {
    if ((a.preg ?? 0) > 0) {
      if (!fedIds.has(a.id) || a.sick) continue;
      a.preg = (a.preg ?? 0) - DAY_RATE;
      if (a.preg <= 0) {
        delete a.preg;
        if (S.animals.filter((q) => q.kind === a.kind).length < penCap(a.kind)) {
          S.animals.push({ id: S.nextId++, kind: a.kind, ready: 0, hue: Math.floor(rnd() * 4), sex: rnd() < 0.5 ? 'm' : 'f', grown: ANIMALS[a.kind].grow });
        toast(a.kind, ANIMALS[a.kind].baby + GT.g161);
        notifyFarmMilestoneMail('baby');
        addStat('babies', 1); addXp(XP.baby);
        }
      }
    }
  }
  for (const farm of ownedFarms()) {
    for (const p of plotsForFarm(farm)) if (p.st < 2) p.fert = Math.min(1, p.fert + 0.04 * DAY_RATE);
  }
  for (const p of S.ponds) {
    if (!p.stocked) continue;
    if (p.feed > 0) {
      const ate = Math.min(p.feed, DAY_RATE);
      p.feed -= ate; p.grow += ate;
    }
    else if (S.auto.feed && (S.inv.feed ?? 0) >= DAY_RATE) { S.inv.feed -= DAY_RATE; if (S.inv.feed <= 0) delete S.inv.feed; p.grow += DAY_RATE; }
  }
  const stocked = S.ponds.filter((p) => p.stocked).length;
  if (stocked > 0 && S.ponds.some((p) => p.stocked && p.feed <= 0 && !S.auto.feed)) toast('fish', GT.g162);
  // زنبورداری + هم‌افزایی گل‌ها و شکوفه‌های کاشته‌شده در مزارع
  if (S.hives > 0) {
    const per = HONEY_SEASON_MULT[sn];
    S.honeyAcc = Math.min(honeyCap(), S.honeyAcc + S.hives * per * DAY_RATE * flowerSynergyMult());
  }
  // جمع‌کن مدل ۳: روزانه عسل و ماهی را خودکار جمع می‌کند
  if (mkOf('collector') >= 3) {
    harvestHoney(true);
    for (let i = 0; i < S.ponds.length; i++) harvestPond(i, true);
  }
  if (S.workers > 0) {
    const wageMult = hasSkill('trade-3') ? 0.7 : 1;
    const unit = Math.round(WORKER_WAGE * wageMult);
    const wage = unit * S.workers;
    if (S.coins >= wage) S.coins -= wage;
    else {
      // اخراج نرم: فقط به اندازهٔ کسری — سهمِ پرداخت‌شده می‌ماند، بقیه می‌روند (نردبان قیمت حفظ است)
      const keep = Math.min(S.workers, Math.floor(S.coins / unit));
      S.coins -= unit * keep;
      S.workers = keep;
      toast('worker', GT.g163);
    }
  }
  for (const g of GOODS) {
    const d = S.dem[g.id] ?? 1;
    S.dem[g.id] = Math.max(0.6, Math.min(1.5, d + (1 - d) * 0.22 + (rnd() - 0.5) * 0.1));
  }
  for (const c of CROPS) { const d = S.sdem[c.id] ?? 1; S.sdem[c.id] = Math.max(0.8, Math.min(1.3, d + (1 - d) * 0.2 + (rnd() - 0.5) * 0.08)); }
  if (rnd() < 0.14) {
    const g = GOODS[Math.floor(rnd() * GOODS.length)];
    if (g.id !== 'feed') {
      const up = rnd() < 0.6;
      S.dem[g.id] = up ? 1.45 : 0.65;
      toast(g.id, up ? GT.g164 : GT.g165);
      if (up) notifyMarketBoomMail(g.id);
    }
  }
  checkAch();
  processDebtDay();
  notePlayerAction(1);
  if (sn !== old && !S.debt?.pendingVisit) triggerSeasonDawn(sn);
  // سپر ضد قفل نرم: اگر بازیکن مطلقاً بدون سکه، بذر، محصول و کشت زنده بماند، مادربزرگ نصرت ۳ بذر فصل جاری هدیه می‌دهد
  if (
  S.coins < CROP.corn.seed &&
    invCount() === 0 &&
    Object.values(S.seeds).every((v) => (v ?? 0) <= 0) &&
    ownedFarms().every((f) => plotsForFarm(f).every((p) => p.st < 2 || p.dead))
  ) {
    const giftCrop: CropId = sn === 1 ? 'corn' : 'wheat';
    S.seeds[giftCrop] = (S.seeds[giftCrop] ?? 0) + 3;
    toast('seedbag', GT.grandmaSeedsPrefix + CROP[giftCrop].fa + GT.grandmaSeedsSuffix);
  }
  processSeasonalEvent(sn);
  ensureFrontier();
  const mWater = charterMorningWaterBonus();
  if (mWater > 0) {
    for (const farm of ownedFarms()) {
      for (const p of plotsForFarm(farm)) if (p.st > 0) p.water = Math.min(1, p.water + mWater);
    }
  }
  tickContract();
  tickQuests();
  syncMailboxState();
  processMorningCompanionAndReport();
  onNewDay.cb?.();
  saveGame();
}


let lastAutoH = -1;
/** بازنشانی ساعت اتوماسیون پس از لود یا ریست (جلوگیری از جا افتادن یک چرخه) */
export function resetAutoClock() { lastAutoH = -1; }
/** بدون سیستم خواب — زمان پیوسته جلو می‌رود و نیرو با گذشت زمان پر می‌شود */
let wageWarnDay = -1;
/** هشدار پیش از سررسید دستمزد: اگر شب سکه کافی نباشد، بازیکن یک بار پیام می‌گیرد (اقتصاد تغییر نمی‌کند) */
function warnWageShortfall() {
  if (S.workers <= 0 || S.hour < WAGE_WARN_HOUR || wageWarnDay === S.day) return;
  const wage = Math.round(WORKER_WAGE * S.workers * (hasSkill('trade-3') ? 0.7 : 1));
  if (S.coins < wage) {
    wageWarnDay = S.day;
    toast('worker', GT.gWageWarn);
  }
}

export function advance(h: number): boolean {
  let left = h;
  let passed = false;
  const hourBefore = S.hour;
  const grandmaBoost = (S.affinity?.grandma ?? 0) >= 40 ? 1.15 : 1;
  const regenBase = STAM_REGEN[S.lv.stam] * grandmaBoost;
  while (left > 0) {
    const d = Math.min(0.5, left);
    left -= d;
    stepSim(d);
    // فقط بخش واقعاً داخل شیفتِ همین گام حساب شود؛ نه ساعت قبل از نیمه‌شب گم می‌شود
    // و نه عبور از شب، کلِ بازه را کارِ روزانه جلوه می‌دهد. خواب و غیبت بازیکن اثری بر این حساب ندارد.
    const worked = Math.max(0, Math.min(S.hour + d, WORKER_SHIFT_END) - Math.max(S.hour, WORKER_SHIFT_START));
    if (worked > 0) tickWorkersSim(worked);
    S.hour += d;
    warnWageShortfall();
    // بازیابی نیرو در طول روز + اثر فانوس‌های باغی و آلاچیق حیاط
    const night = isNight();
    const decMult = night ? (hasDecor('lanterns') ? 2.2 : 2) : (hasDecor('pergola') ? 1.1 : 1);
    S.stamina = Math.min(stamCap(), S.stamina + d * regenBase * decMult);
    if (S.hour >= 24) {
      S.hour -= 24; newDay(); passed = true;
    }
  }
  const fh = Math.floor(S.hour * DAY_RATE);
  if (fh !== lastAutoH && Math.floor(hourBefore * DAY_RATE) !== fh) {
    lastAutoH = fh;
    runAuto();
    checkSecretTriggers('farm-step');
  }
  return passed;
}

let liveAutoAcc = 0;

/** جبران رشد زنده در طول روزهای کشیده: محصولات، نیرو، زنبورها، کارگران و اتوماسیون دقیقاً با همان سرعت ثانیهٔ واقعی می‌رسند */
export function tickLiveDaylightGrowth(bonusHours: number) {
  if (bonusHours <= 0) return;
  const sn = season();
  const hasGh = S.gh > 0;
  for (const farm of ownedFarms()) {
    const arr = plotsForFarm(farm);
    for (let pi = 0; pi < arr.length; pi++) {
      const p = arr[pi];
      if (p.st !== 2 || p.dead || !p.crop || p.ripe || p.water <= 0) continue;
      const def = CROP[p.crop];
      if (!def) continue;
      const inGh = hasGh && ghCoversFarm(farm, pi);
      if (!inGh && !def.regrow && !def.seasons.includes(sn)) continue;
      p.prog += (bonusHours / 24) * effectivePlotDailyRate(farm, pi);
      if (p.prog >= 1) { p.prog = 1; p.ripe = true; }
    }
  }
  const grandmaBoost = (S.affinity?.grandma ?? 0) >= 40 ? 1.15 : 1;
  const night = isNight();
  const decMult = night ? (hasDecor('lanterns') ? 2.2 : 2) : (hasDecor('pergola') ? 1.1 : 1);
  S.stamina = Math.min(stamCap(), S.stamina + bonusHours * STAM_REGEN[S.lv.stam] * grandmaBoost * decMult);
  if (S.hives > 0 && S.weather !== 2 && !isNight()) {
    const per = HONEY_SEASON_MULT[sn] * flowerSynergyMult() * (hasSkill('nature-2') ? 1.25 : 1);
    S.honeyAcc = Math.min(honeyCap(), S.honeyAcc + (bonusHours / 24) * S.hives * per * DAY_RATE);
  }
  liveAutoAcc += bonusHours * DAY_RATE;
  if (liveAutoAcc >= 1) {
    liveAutoAcc -= Math.floor(liveAutoAcc);
    runAuto();
  }
  tickWorkersSim(bonusHours);
}

/** تیک زندهٔ بوم: ساعت خورشیدی ۲٫۵ برابر آرام‌تر می‌گذرد اما رسیدگی محصول و نیروی بازیکن ۱۰۰٪ با همان ثانیهٔ واقعی حفظ می‌شود */
export function tickLiveClock(scaledDt: number): boolean {
  const fullHours = (scaledDt / 4) / DAY_RATE;
  const clockHours = fullHours / LIVE_DAY_STRETCH;
  const passed = advance(clockHours);
  tickLiveDaylightGrowth(fullHours - clockHours);
  return passed;
}

export function plotInfo(i: number) {
  const arr = plotsForFarm(isFarmScene(UI.scene) ? UI.scene : 'farm');
  const p = arr[i] ?? S.plots[0];
  return { p, def: p.crop ? CROP[p.crop] : null };
}
