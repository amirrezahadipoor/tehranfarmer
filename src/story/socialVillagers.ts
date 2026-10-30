// Villager Social Affinity (0..5 Hearts), Daily Gifts, Dialogue Choices & 3-Tier Market Contracts Board
// Compliance: Inside src/story/, zero emojis, zero raw ASCII digits inside Persian strings.
import { CROPS, GOOD, CONTRACT_DAYS, CONTRACT_DEPOSIT_MIN, CONTRACT_DEPOSIT_RATE, type GoodId } from '../game/data';
import { S, UI, addStat, addXp, farmLevel, holdCount, notify, pay, saveGame, season, stamCap, takeHold, toast, type MarketContract } from '../game/state';
import { addStanding } from '../game/core/debt';
import { CFG } from '../game/settings';
import { GT } from '../strings/gameText';
import { WX } from '../strings/worldExpansionText';
import { NPC_ROLES } from '../strings/estateStoryText';
import { sfx } from '../game/sound';
import type { CharId, StoryNode } from './types';

export type SocialNpcId = Exclude<CharId, 'narrator' | 'player' | 'carpenter' | 'estateAgent'>;
export const SOCIAL_NPC_IDS: readonly SocialNpcId[] = ['grandma', 'sara', 'rancher', 'engineer', 'jahangir'];
export const isVillagerId = (id: string): id is SocialNpcId => (SOCIAL_NPC_IDS as readonly string[]).includes(id);

export interface VillagerProfile {
  who: SocialNpcId;
  favorites: readonly GoodId[];
  readonly perk2: string;
  readonly perk5: string;
}

export const VILLAGER_PROFILES: readonly VillagerProfile[] = [
  { who: 'grandma', favorites: ['saffron', 'rose', 'honey', 'pomegranate', 'wheat'], get perk2() { return WX.perkGrandma2; }, get perk5() { return WX.perkGrandma5; } },
  { who: 'sara', favorites: ['strawberry', 'cherry', 'orange', 'grape', 'tomato'], get perk2() { return WX.perkSara2; }, get perk5() { return WX.perkSara5; } },
  { who: 'engineer', favorites: ['olive', 'pistachio', 'sunflower', 'cheese', 'potato'], get perk2() { return WX.perkEng2; }, get perk5() { return WX.perkEng5; } },
  { who: 'rancher', favorites: ['milk', 'wool', 'corn', 'fig', 'egg'], get perk2() { return WX.perkRanch2; }, get perk5() { return WX.perkRanch5; } },
  { who: 'jahangir', favorites: ['peach', 'roe', 'honey', 'pistachio', 'watermelon'], get perk2() { return WX.perkJahangir2; }, get perk5() { return WX.perkJahangir5; } },
];

export const villagerPoints = (who: SocialNpcId): number => Math.min(100, Math.max(0, S.affinity?.[who] ?? 0));
export const villagerHearts = (who: SocialNpcId): number => Math.floor(villagerPoints(who) / 20);
export const canGiftVillagerToday = (who: SocialNpcId): boolean => (S.giftedDay?.[who] ?? -1) !== S.day;

export function addAffinity(who: SocialNpcId, delta: number) {
  S.affinity ??= {};
  S.affinity[who] = Math.min(100, Math.max(0, (S.affinity[who] ?? 0) + delta));
}

export function findBestGiftInBag(who: SocialNpcId): GoodId | null {
  const prof = VILLAGER_PROFILES.find((v) => v.who === who);
  if (!prof) return null;
  // هدیه از چیزی است که همراه خودت داری: اول کولهٔ پشتی، بعد انبار
  const has = (g: GoodId) => holdCount(g) > 0;
  const usable = (k: string): k is GoodId => k !== 'feed' && k !== 'fingerling' && has(k as GoodId);
  for (const g of prof.favorites) if (has(g)) return g;
  const keys = [...Object.keys(S.pack), ...Object.keys(S.inv)];
  for (const k of keys) if (usable(k)) return k;
  return null;
}

export function giftVillager(who: SocialNpcId, preferredGood?: GoodId): boolean {
  if (!canGiftVillagerToday(who)) { sfx.err(); return false; }
  const prof = VILLAGER_PROFILES.find((v) => v.who === who);
  if (!prof) return false;
  const item = preferredGood && holdCount(preferredGood) > 0 ? preferredGood : findBestGiftInBag(who);
  if (!item) {
    sfx.err();
    toast('heart', WX.giftNoneInBag);
    return false;
  }
  const loved = prof.favorites.includes(item);
  takeHold(item, 1);
  S.affinity ??= {};
  S.giftedDay ??= {};
  S.giftedDay[who] = S.day;
  const gain = loved ? 22 : 10;
  S.affinity[who] = Math.min(100, (S.affinity[who] ?? 0) + gain);
  if (who === 'jahangir') addStanding(loved ? 6 : 3);
  addXp(loved ? 35 : 16);
  const loc = CFG.locale === 'en' ? 'en' : 'fa';
  sfx.fanfare();
  toast('heart', `${NPC_ROLES[loc][who].name}${WX.giftSuccess}`);
  saveGame();
  notify();
  return true;
}

import { chooseVillageCharter } from '../game/core/frontier';
import type { CharterKey, CharterValue } from '../strings/frontierText';

// ===== انتخاب دیالوگ تعاملی بازیکن در صحنه‌های کلیدی + منشورهای انشعابی ماندگار دهکده =====
export interface SceneChoiceOption {
  labelFa: string;
  labelEn: string;
  standing: number;
  xp: number;
  stamina: number;
  heartWho?: SocialNpcId;
  heartGain?: number;
  charterKey?: CharterKey;
  charterVal?: CharterValue;
}

export const SCENE_CHOICES: Record<string, readonly [SceneChoiceOption, SceneChoiceOption]> = {
  p7: [
    {
      labelFa: 'با عزم آهنین هر سه مزرعهٔ بابابزرگ را آباد می‌کنم!',
      labelEn: 'I will rebuild all three family farms with pride!',
      standing: 4, xp: 25, stamina: 30, heartWho: 'grandma', heartGain: 12,
    },
    {
      labelFa: 'حساب‌وکتاب دقیق می‌چینم تا جهانگیر انگشت‌به‌دهان بماند!',
      labelEn: 'I will outsmart Jahangir with sharp farm economics!',
      standing: 6, xp: 35, stamina: 15, heartWho: 'jahangir', heartGain: 10,
    },
  ],
  'note-open-1': [
    {
      labelFa: 'منشور بازار الف: تأسیس تعاونی منصفانهٔ کشاورزان با سارا (+۱۰٪ قیمت مزرعه و دام)',
      labelEn: 'Town Charter A: Sara’s Farmers’ Co-op (+10% crop & ranch market price)',
      standing: 6, xp: 55, stamina: 25, heartWho: 'sara', heartGain: 18, charterKey: 'bazaar', charterVal: 'coop',
    },
    {
      labelFa: 'منشور بازار ب: کاروان‌سرای جادهٔ ابریشم (+۱۸٪ کالاهای لوکس، گوهر غار و فرمان شاهی)',
      labelEn: 'Town Charter B: Silk-Road Caravan Guild (+18% luxury, gem & decree payouts)',
      standing: 5, xp: 65, stamina: 25, heartWho: 'jahangir', heartGain: 16, charterKey: 'bazaar', charterVal: 'caravan',
    },
  ],
  'note-open-2': [
    {
      labelFa: 'پیمان مرز الف: حریم سبز جنگل کهنسال با بی‌بی (+۳۵٪ گیاهان جنگلی و عسل)',
      labelEn: 'Frontier Pact A: Grandma’s Sacred Grove (+35% forest botanicals & honey)',
      standing: 6, xp: 70, stamina: 35, heartWho: 'grandma', heartGain: 20, charterKey: 'frontier', charterVal: 'sanctuary',
    },
    {
      labelFa: 'پیمان مرز ب: کاوشگاه معدنی صنف عمو مراد (+۳۵٪ بلور غار و ۱۲٪ سرعت ساخت)',
      labelEn: 'Frontier Pact B: Morad’s Guild Crystal Quarry (+35% cave gems & faster builds)',
      standing: 5, xp: 75, stamina: 25, heartWho: 'rancher', heartGain: 20, charterKey: 'frontier', charterVal: 'quarry',
    },
  ],
  'note-open-3': [
    {
      labelFa: 'منشور قنات الف: احیای چرخ‌آب قنات عمومی دهکده (+۱۸٪ رطوبت صبحگاهی + ۱۰ اعتبار)',
      labelEn: 'Qanat Charter A: Commons Waterwheel (+18% morning moisture & +10 Standing)',
      standing: 8, xp: 90, stamina: 40, heartWho: 'grandma', heartGain: 20, charterKey: 'qanat', charterVal: 'commons',
    },
    {
      labelFa: 'منشور قنات ب: توربین فشردهٔ مهندس کاوه (-۱۲٪ قیمت ماشین‌آلات و سرعت بیشتر)',
      labelEn: 'Qanat Charter B: Kaveh’s Hydro-Turbine (-12% machine cost & higher efficiency)',
      standing: 5, xp: 95, stamina: 30, heartWho: 'engineer', heartGain: 22, charterKey: 'qanat', charterVal: 'turbine',
    },
  ],
  'note-open-4': [
    {
      labelFa: 'سرنوشت صراف‌خانه الف: آشتی و صندوق همیاری دهکده (-۳۰٪ سود وام و +۴۰٪ قلک)',
      labelEn: 'Counting-House A: Village Credit House (-30% loan interest & +40% safe stash)',
      standing: 10, xp: 110, stamina: 40, heartWho: 'jahangir', heartGain: 25, charterKey: 'bank', charterVal: 'credit',
    },
    {
      labelFa: 'سرنوشت صراف‌خانه ب: ستون نظارت قانونی شورا (-۵۰٪ شبیخون و +۱۵٪ فرمان‌های شاهی)',
      labelEn: 'Counting-House B: Civic Law Pillar (-50% raid risk & +15% Royal Decree gold)',
      standing: 6, xp: 115, stamina: 35, heartWho: 'engineer', heartGain: 20, charterKey: 'bank', charterVal: 'council',
    },
  ],
  'estate-north-bought': [
    {
      labelFa: 'آسیاب بادی دشت شمالی را به قلب غلات دهکده تبدیل می‌کنم!',
      labelEn: 'Northern Meadow Windmill will feed the whole valley!',
      standing: 4, xp: 45, stamina: 25, heartWho: 'engineer', heartGain: 15,
    },
    {
      labelFa: 'این دشت سبز پیشکش لبخند مادربزرگ نصرت!',
      labelEn: 'This green meadow is dedicated to Grandma Nosrat!',
      standing: 3, xp: 40, stamina: 40, heartWho: 'grandma', heartGain: 18,
    },
  ],
  'estate-valley-bought': [
    {
      labelFa: 'باغ‌های پسته و گل محمدی باغ‌دره بازار شهر را تکان می‌دهد!',
      labelEn: 'Sunlit Valley orchards will dazzle the Town Market!',
      standing: 5, xp: 75, stamina: 30, heartWho: 'sara', heartGain: 18,
    },
    {
      labelFa: 'سهم اهالی دهکده از میوه‌های نوبرانه محفوظ است!',
      labelEn: 'Every villager gets a basket of our first harvest!',
      standing: 6, xp: 65, stamina: 45, heartWho: 'rancher', heartGain: 18,
    },
  ],
};

export function applyDialogueChoice(nodeId: string, optionIdx: 0 | 1) {
  if (UI.directorReplay) return;
  const pair = SCENE_CHOICES[nodeId];
  if (!pair) return;
  const opt = pair[optionIdx];
  if (opt.standing) addStanding(opt.standing);
  if (opt.xp) addXp(opt.xp);
  if (opt.stamina) S.stamina = Math.min(stamCap(), S.stamina + opt.stamina);
  if (opt.heartWho && opt.heartGain) {
    S.affinity ??= {};
    S.affinity[opt.heartWho] = Math.min(100, (S.affinity[opt.heartWho] ?? 0) + opt.heartGain);
  }
  if (opt.charterKey && opt.charterVal) {
    chooseVillageCharter(opt.charterKey, opt.charterVal);
  }
  S.story.seen[`choice:${nodeId}`] = true;
  sfx.coin();
  saveGame();
  notify();
}

export function maybeGrantVillagerFriendTreat(who: SocialNpcId): boolean {
  if (villagerHearts(who) < 3) return false;
  S.friendTreatDay ??= {};
  if (S.day - (S.friendTreatDay[who] ?? -99) < 7) return false;
  S.friendTreatDay[who] = S.day;
  S.stamina = Math.min(stamCap(), S.stamina + 12);
  const sn = season();
  const inSn = CROPS.filter((c) => c.lv <= farmLevel() && c.seasons.includes(sn));
  const pick = inSn[(S.day + who.length) % Math.max(1, inSn.length)] ?? CROPS[0];
  S.seeds[pick.id] = (S.seeds[pick.id] ?? 0) + 2;
  const loc = CFG.locale === 'en' ? 'en' : 'fa';
  toast('heart', `${NPC_ROLES[loc][who].name}${WX.friendTreatPrefix}`);
  sfx.fanfare();
  return true;
}

// ===== دیالوگ‌های غنی چهارفصل، بارانی و صمیمیت اهالی شهر (Item 14 — تنوع بالا بر اساس فصل، باران، املاک و صمیمیت) =====
const mkSeasonLine = (id: string, who: Exclude<SocialNpcId, 'jahangir'>, text: string, reply?: string): StoryNode => ({
  id,
  lines: reply ? [{ who, text }, { who: 'player', text: reply }] : [{ who, text }],
  next: null,
});

export const SEASONAL_NPC_NODES: StoryNode[] = [
  mkSeasonLine('town-grandma-3', 'grandma', 'بهار که می‌شود عطر شکوفهٔ توت‌فرنگی حیاط خانه‌مان هوش از سر آدم می‌برد پسرم!', 'امسال پرمحصول‌ترین بهار دره را می‌سازیم مادرجون.'),
  mkSeasonLine('town-grandma-4', 'grandma', 'تابستان گرم است مادر؛ سری به چشمهٔ آبشار باغ‌دره بزن تا خستگی از تنت درآید.'),
  mkSeasonLine('town-grandma-5', 'grandma', 'پاییز فصل طلای سرخ دشت شمالی است؛ زعفران این خاک در کل کشور لنگه ندارد!'),
  mkSeasonLine('town-grandma-6', 'grandma', 'باران که می‌بارد زمین خودش سیراب می‌شود؛ روز بارانی بهترین وقت سرزدن به معدن رودخانه و دوستانت است!', 'چای دارچین شما زیر صدای باران یک چیز دیگر است مادرجون!'),
  mkSeasonLine('town-grandma-7', 'grandma', 'پدربزرگت اگر امروز این مزارع سرسبز و آزاد را می‌دید، چشمانش از شوق پر از اشک می‌شد.', 'همهٔ این برکت از دعای خیر شماست مادرجون.'),

  mkSeasonLine('town-sara-3', 'sara', 'مشتری‌های کاروان دنبال روغن زیتون، رب انار و مربای خانگی هستند؛ کارگاهت را روشن نگه دار!', 'بهترین شیشه‌های دست‌ساز توی راه بازارند!'),
  mkSeasonLine('town-sara-4', 'sara', 'امروز روی تابلوی بازار سه قرارداد مختلف زدم؛ هر کدام به کشت امروزت می‌خورد امضا کن.'),
  mkSeasonLine('town-sara-5', 'sara', 'هر وقت گل محمدی و عسل کنار هم داری، عطرفروش‌های شهر سر و دست می‌شکنند!'),
  mkSeasonLine('town-sara-6', 'sara', 'تو دیگر فقط یک کشاورز تازه‌کار نیستی؛ اسم محصولات مزرعه‌ات سر زبان همهٔ حجره‌دارهای شهر افتاده!', 'با هم بازار دهکده را پررونق‌ترین بازار منطقه کردیم سارا!'),
  mkSeasonLine('town-sara-7', 'sara', 'هوای بارانی مشتری‌های آش رشته و مربای داغ را دو برابر می‌کند؛ دیگ کارگاهت را پر کن!'),

  mkSeasonLine('town-engineer-3', 'engineer', 'کمباین مدل سه و کاشت‌کار دقیق در کنار کارگرها یک معجزهٔ صنعتی واقعی می‌سازند!', 'ترکیب ماشین و کارگر واقعاً غوغا کرده مهندس!'),
  mkSeasonLine('town-engineer-4', 'engineer', 'آسیاب بادی دشت شمالی بدون یک سکه هزینه، گندم و ذرت را با بازده عالی به خوراک تبدیل می‌کند.'),
  mkSeasonLine('town-engineer-5', 'engineer', 'داده‌های کندوها نشان می‌دهد کاشت آفتابگردان و گل محمدی تولید عسل را جهش می‌دهد!'),
  mkSeasonLine('town-engineer-6', 'engineer', 'پنجشیر آب قنات دشت شمالی و آبشار باغ‌دره حالا مثل ساعت سوئیسی کار می‌کند؛ افتخار مهندسی ماست!', 'دست مریزاد مهندس کاوه، ذره‌ای آب هدر نمی‌رود.'),
  mkSeasonLine('town-engineer-7', 'engineer', 'در هوای بارانی مصرف آب کرت‌ها صفر است؛ بهترین فرصت برای چیدمان خط تولید پاتیل است.'),

  mkSeasonLine('town-rancher-3', 'rancher', 'سگ گله که کنار آغل باشد، هم دام‌ها آرام‌ترند و هم جهانگیر جرأت نزدیک‌شدن ندارد!', 'بهترین همراه مزرعه است عمو مراد.'),
  mkSeasonLine('town-rancher-4', 'rancher', 'آخور هوشمند کارگاه نه فقط علوفه را کم‌مصرف می‌کند، بلکه سرعت زادوولد گله را هم بالا می‌برد.'),
  mkSeasonLine('town-rancher-5', 'rancher', 'ماهی‌های رودخانه در باران و سپیده‌دم درشت‌ترند؛ قلابت را دقیق وسط نوار طلایی بکش!'),
  mkSeasonLine('town-rancher-6', 'rancher', 'ماشاالله به این گلهٔ سرحال! شیر و پشم دامستانت عیار کل ولایت را جابه‌جا کرده پسر!', 'شاگردی دست شما را کرده‌ام عمو مراد!'),
  mkSeasonLine('town-rancher-7', 'rancher', 'وقتی باران می‌گیرد قزل‌آلاهای خال‌قرمز می‌آیند لب آب؛ چوب ماهیگیری‌ات را بردار و معطل نکن!'),
];

export const EN_SEASONAL_NPC_LINES: Record<string, string[]> = {
  'town-grandma-3': ['When Spring arrives, the scent of fresh strawberries around our porch fills my heart with joy!', 'We will make this the finest Spring harvest the valley has ever seen, Grandma.'],
  'town-grandma-4': ['Summer sun runs hot, dear — splash some cool water from the Sunlit Valley waterfall to restore your strength.'],
  'town-grandma-5': ['Autumn belongs to Northern Meadow saffron; its crimson threads have no rival anywhere!'],
  'town-grandma-6': ['Rain waters every single plot for free — rainy days are made for river angling and warm tea with friends!', 'Nothing beats your cinnamon tea when the rain falls, Grandma!'],
  'town-grandma-7': ['If your Grandfather could see how brightly our homestead shines today, his eyes would fill with proud tears.', 'Your warmth and wisdom guided every step, Grandma.'],
  'town-sara-3': ['Caravan buyers are asking for olive oil, pomegranate paste, and homemade jams — keep your cauldron busy!', 'Fresh artisan jars are heading straight to your stalls!'],
  'town-sara-4': ['I posted three distinct contracts on the Market board today — pick whichever fits your harvest best!'],
  'town-sara-5': ['Whenever Damask Rose and pure honey arrive together, town merchants bid top coin!'],
  'town-sara-6': ['Every merchant in the bazaar asks for your farm label first now — you have built a true legend!', 'We turned the village market into the pride of the region together, Sara!'],
  'town-sara-7': ['Rainy weather makes everyone crave warm preserves and fresh bread — great day to run your cauldron!'],
  'town-engineer-3': ['Combine Model 3 paired with a Precision Seeder turns human crew effort into true industrial output!', 'The machine and worker synergy has completely transformed our farms!'],
  'town-engineer-4': ['The Northern Windmill grinds wheat and corn into rich livestock feed completely free of charge.'],
  'town-engineer-5': ['Apiary telemetry confirms that blooming sunflowers, roses, and fruit trees supercharge honey output!'],
  'town-engineer-6': ['Seeing the Northern Qanat and Sunlit Waterfall run in harmony is the proudest moment of my career!', 'Zero water wasted across all three estates — thank you, Kaveh!'],
  'town-engineer-7': ['Field evaporation drops to zero in the rain — prime time to tune your machines and artisan recipes.'],
  'town-rancher-3': ['With a loyal sheepdog watching the pens, your herd thrives and Jahangir keeps his distance!', 'Best companion a homestead could ask for, Uncle Morad.'],
  'town-rancher-4': ['A smart Workshop Feeder cuts hay waste and noticeably boosts breeding across your pens.'],
  'town-rancher-5': ['River trout and sturgeon run heavier in rain — strike right inside the golden sweet spot!'],
  'town-rancher-6': ['Look at the shine on your livestock! Your ranch produces the finest milk and wool in the province!', 'Learned from the best master rancher in the valley, Uncle Morad!'],
  'town-rancher-7': ['Rain brings trophy trout right up to the surface — grab your rod and cast into the ripples!'],
};

// ===== تابلوی ۳ قرارداد هم‌زمان متنوع بازار (Item 18) =====
export interface BoardContractOffer {
  slot: 0 | 1 | 2;
  tierLabel: string;
  good: GoodId;
  fa: string;
  qty: number;
  deposit: number;
  reward: number;
  days: number;
}

export function offerContractBoard(): BoardContractOffer[] {
  const lv = farmLevel();
  const sn = season();
  const saraMult = villagerHearts('sara') >= 2 ? 1.1 : 1;
  const inSeason = CROPS.filter((c) => c.lv <= lv && c.seasons.includes(sn));
  const c0 = inSeason[(Math.max(1, S.day) - 1) % Math.max(1, inSeason.length)] ?? CROPS[0];
  const c1 = inSeason[(Math.max(1, S.day) + 2) % Math.max(1, inSeason.length)] ?? c0;
  const ranchPool: GoodId[] = ['egg'];
  if (lv >= 4) ranchPool.push('wool');
  if (lv >= 3 && S.rod > 0) ranchPool.push('fish');
  if (S.hives > 0) ranchPool.push('honey');
  if (lv >= 6) ranchPool.push('herb', 'quartz');
  if (lv >= 9) ranchPool.push('cheese', 'mushroom');
  if (lv >= 11) ranchPool.push('milk', 'turquoise');
  const ranchPick = ranchPool[(S.day * 5) % ranchPool.length] ?? 'egg';

  const mkOffer = (slot: 0 | 1 | 2, tierLabel: string, gid: GoodId, qty: number, mult: number, days: number): BoardContractOffer => {
    const baseVal = (GOOD[gid]?.base ?? 12) * qty;
    const deposit = Math.max(CONTRACT_DEPOSIT_MIN, Math.round(baseVal * CONTRACT_DEPOSIT_RATE));
    const reward = Math.round(baseVal * mult * saraMult) + deposit;
    return { slot, tierLabel, good: gid, fa: GOOD[gid]?.fa ?? gid, qty, deposit, reward, days };
  };

  const q0 = 6 + ((S.day * 3) % 13);
  const q1 = 16 + ((S.day * 5) % 18);
  const q2 = 5 + ((S.day * 2) % 8);
  return [
    mkOffer(0, WX.tierQuick, c0.id, q0, 1.45, CONTRACT_DAYS),
    mkOffer(1, WX.tierBulk, c1.id, q1, 1.62, CONTRACT_DAYS + 2),
    mkOffer(2, WX.tierArtisan, ranchPick, q2, 1.75, CONTRACT_DAYS + 1),
  ];
}

export function signBoardContract(slot: 0 | 1 | 2): boolean {
  if (S.contract) return false;
  const board = offerContractBoard();
  const offer = board[slot] ?? board[0];
  if (!pay(offer.deposit)) return false;
  const contract: MarketContract = {
    good: offer.good,
    qty: offer.qty,
    deposit: offer.deposit,
    reward: offer.reward,
    dueDay: S.day + offer.days,
  };
  S.contract = contract;
  toast('contract', GT.contractSigned);
  addStat('contractsSigned', 1);
  saveGame();
  notify();
  return true;
}
