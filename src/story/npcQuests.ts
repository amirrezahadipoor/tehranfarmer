// Dedicated Estate Storylines (Northern Meadow + Sunlit Valley) & Real Progression-Gated NPC Quest System
// Note: Zero ASCII digits inside Persian lines (enforced by audit-playthrough).
import { S, addStat, addXp, farmLevel, notify, saveGame, toast } from '../game/state';
import { CFG } from '../game/settings';
import { debt } from '../game/core/debt';
import { isQuestDone } from './quests';
import { fa } from '../strings/fa';
import { sfx } from '../game/sound';
import type { CharId, StoryNode } from './types';

export type QuestNpcId = Exclude<CharId, 'narrator' | 'player'>;

export interface NpcQuestSpec {
  id: string;
  who: Exclude<QuestNpcId, 'jahangir'>;
  icon: string;
  titleFa: string;
  titleEn: string;
  descFa: string;
  descEn: string;
  rewardCoins: number;
  rewardXp: number;
  canActivate: () => boolean;
  progress: () => [number, number];
}

const mkNode = (id: string, lines: StoryNode['lines']): StoryNode => ({ id, lines, next: null });

export const NPC_QUEST_SPECS: NpcQuestSpec[] = [
  {
    id: 'npc-q-grandma-1',
    who: 'grandma',
    icon: 'wheat',
    titleFa: 'نوبرانهٔ مزرعهٔ اصلی',
    titleEn: 'First Homestead Bundles',
    descFa: '۱۲ محصول تازه از کرت‌های مزرعه برداشت کن و به مادربزرگ خبر بده.',
    descEn: 'Harvest 12 fresh crops on the Main Homestead and report back to Grandma.',
    rewardCoins: 450,
    rewardXp: 35,
    canActivate: () => !!S.story?.prologueSeen,
    progress: () => [Math.min(12, S.stats.harv ?? 0), 12],
  },
  {
    id: 'npc-q-rancher-1',
    who: 'rancher',
    icon: 'egg',
    titleFa: 'تخم‌های طلایی روی کاه',
    titleEn: 'Golden Eggs on Straw',
    descFa: '۶ محصول دامی یا تخم تازه از روی کاه جمع کن و پیش عمو مراد ببر.',
    descEn: 'Gather 6 eggs or ranch products from your pens and speak with Uncle Morad.',
    rewardCoins: 750,
    rewardXp: 60,
    canActivate: () => !!S.story?.prologueSeen && farmLevel() >= 2,
    progress: () => [Math.min(6, S.stats.collect ?? 0), 6],
  },
  {
    id: 'npc-q-sara-1',
    who: 'sara',
    icon: 'coin',
    titleFa: 'تأمین‌کنندهٔ خوش‌حساب بازار',
    titleEn: 'Trusted Market Supplier',
    descFa: 'مجموع فروش محصولاتت در بازار را به ۲٬۵۰۰ سکه برسان و با سارا گفتگو کن.',
    descEn: 'Reach 2,500 total coins earned from Market sales and speak with Sara.',
    rewardCoins: 1100,
    rewardXp: 85,
    canActivate: () => !!S.story?.prologueSeen && farmLevel() >= 3,
    progress: () => [Math.min(2500, Math.floor(S.earned ?? 0)), 2500],
  },
  {
    id: 'npc-q-engineer-1',
    who: 'engineer',
    icon: 'well',
    titleFa: 'آبرسانی هوشمند مزرعه',
    titleEn: 'Smart Farm Hydraulics',
    descFa: 'چاه قطره‌ای را ارتقا بده یا یک آب‌پاش در کارگاه بساز و به مهندس کاوه نشان بده.',
    descEn: 'Upgrade the Drip Well or build a Workshop Sprinkler and tell Eng. Kaveh.',
    rewardCoins: 1800,
    rewardXp: 120,
    canActivate: () => !!S.story?.prologueSeen && farmLevel() >= 4 && (S.story.chapter ?? 1) >= 2,
    progress: () => [(S.wellLv > 0 || (S.machines.sprinkler ?? 0) > 0) ? 1 : 0, 1],
  },
  {
    id: 'npc-q-grandma-2',
    who: 'grandma',
    icon: 'land',
    titleFa: 'بازپس‌گیری مزرعهٔ دشت شمالی',
    titleEn: 'Reclaiming Northern Meadow',
    descFa: 'سند «مزرعهٔ بزرگ دشت شمالی» (۵۴ کرت) را از املاکی بخر و به مادربزرگ مژده بده.',
    descEn: 'Buy the Northern Meadow deed (54 plots) at the Estate Office and tell Grandma.',
    rewardCoins: 2800,
    rewardXp: 180,
    canActivate: () => !!S.story?.prologueSeen && farmLevel() >= 4 && (S.story.chapter ?? 1) >= 2 && !!S.story.seen['npc-q-grandma-1-done'],
    progress: () => [S.lv.land >= 1 ? 1 : 0, 1],
  },
  {
    id: 'npc-q-rancher-2',
    who: 'rancher',
    icon: 'milk',
    titleFa: 'رونق دامستان بزرگ دره',
    titleEn: 'Thriving Valley Ranch',
    descFa: 'مجموع برداشت محصولات دامستان را به ۲۵ واحد برسان و نزد عمو مراد برگرد.',
    descEn: 'Gather 25 total ranch goods across your animal sections and visit Uncle Morad.',
    rewardCoins: 4500,
    rewardXp: 250,
    canActivate: () => !!S.story?.prologueSeen && farmLevel() >= 7 && (S.story.chapter ?? 1) >= 2 && !!S.story.seen['npc-q-rancher-1-done'],
    progress: () => [Math.min(25, S.stats.collect ?? 0), 25],
  },
  {
    id: 'npc-q-engineer-2',
    who: 'engineer',
    icon: 'greenhouse',
    titleFa: 'قنات دشت شمالی و گلخانه',
    titleEn: 'Northern Qanat & Greenhouse',
    descFa: 'قنات دشت شمالی را در املاکی احیا کن یا گلخانه بساز و به مهندس کاوه اطلاع بده.',
    descEn: 'Restore the Northern Qanat at the Estate Office or build a Greenhouse.',
    rewardCoins: 9000,
    rewardXp: 400,
    canActivate: () => !!S.story?.prologueSeen && S.lv.land >= 1 && farmLevel() >= 10 && !!S.story.seen['npc-q-engineer-1-done'],
    progress: () => [(S.lv.land >= 2 || S.gh >= 1) ? 1 : 0, 1],
  },
  {
    id: 'npc-q-sara-2',
    who: 'sara',
    icon: 'sun',
    titleFa: 'گشایش باغ‌درهٔ آفتاب',
    titleEn: 'Opening Sunlit Valley',
    descFa: 'سند «باغ‌درهٔ آفتاب» (۶۰ کرت) را در املاکی ثبت کن و خبرش را به سارا بده.',
    descEn: 'Acquire the 60-plot Sunlit Valley deed at the Estate Office and tell Sara.',
    rewardCoins: 18000,
    rewardXp: 700,
    canActivate: () => !!S.story?.prologueSeen && S.lv.land >= 2 && farmLevel() >= 14 && !!S.story.seen['npc-q-sara-1-done'],
    progress: () => [S.lv.land >= 3 ? 1 : 0, 1],
  },
  {
    id: 'npc-q-grandma-3',
    who: 'grandma',
    icon: 'honey',
    titleFa: 'شهد طلایی گلستان',
    titleEn: 'Golden Apiary Nectar',
    descFa: 'در گلستان دست‌کم ۶ شیشه عسل خالص برداشت کن و خبرش را برای مادربزرگ ببر.',
    descEn: 'Harvest at least 6 jars of pure honey at the Apiary and tell Grandma.',
    rewardCoins: 7500,
    rewardXp: 340,
    canActivate: () => !!S.story?.prologueSeen && farmLevel() >= 9 && !!S.story.seen['npc-q-grandma-2-done'],
    progress: () => [Math.min(6, S.stats.honey ?? 0), 6],
  },
  {
    id: 'npc-q-rancher-3',
    who: 'rancher',
    icon: 'fish',
    titleFa: 'صیاد زبردست رودخانه و حوضچه',
    titleEn: 'Master of River & Pond',
    descFa: 'مجموع صید ماهی رودخانه یا برداشت حوضچه را به ۱۲ برسان و نزد عمو مراد برو.',
    descEn: 'Reach 12 total river catches or pond harvests and report to Uncle Morad.',
    rewardCoins: 12000,
    rewardXp: 480,
    canActivate: () => !!S.story?.prologueSeen && farmLevel() >= 11 && !!S.story.seen['npc-q-rancher-2-done'],
    progress: () => [Math.min(12, (S.stats.fish ?? 0) + (S.stats.pondH ?? 0)), 12],
  },
  {
    id: 'npc-q-sara-3',
    who: 'sara',
    icon: 'saffron',
    titleFa: 'عطر پاتیل سنتی دهکده',
    titleEn: 'Artisan Cauldron Mastery',
    descFa: 'در پاتیل انبار دست‌کم ۸ نوبت فرآوردهٔ سنتی بپز و به سارا در بازار بگو.',
    descEn: 'Craft at least 8 batches of traditional goods in the Barn Cauldron and tell Sara.',
    rewardCoins: 15000,
    rewardXp: 600,
    canActivate: () => !!S.story?.prologueSeen && farmLevel() >= 12 && !!S.story.seen['npc-q-sara-1-done'],
    progress: () => [Math.min(8, S.stats.artisan ?? 0), 8],
  },
  {
    id: 'npc-q-engineer-3',
    who: 'engineer',
    icon: 'tractor',
    titleFa: 'انقلاب مکانیزهٔ مزارع',
    titleEn: 'Mechanized Estate Revolution',
    descFa: 'دست‌کم ۳ دستگاه مختلف کارگاه را راه‌اندازی کن و گزارشش را به مهندس کاوه بده.',
    descEn: 'Build at least 3 distinct Workshop machines and report back to Eng. Kaveh.',
    rewardCoins: 26000,
    rewardXp: 900,
    canActivate: () => !!S.story?.prologueSeen && farmLevel() >= 15 && !!S.story.seen['npc-q-engineer-2-done'],
    progress: () => [Math.min(3, Object.values(S.machines).filter((m) => (m ?? 0) > 0).length), 3],
  },
  {
    id: 'npc-q-grandma-4',
    who: 'grandma',
    icon: 'pomegranate',
    titleFa: 'سفرهٔ بزرگ برداشت خاندان',
    titleEn: 'Grand Family Harvest Feast',
    descFa: 'مجموع کل محصولات برداشت‌شدهٔ مزارع را به ۴۰۰ واحد برسان و پیش مادربزرگ برو.',
    descEn: 'Reach 400 total harvested crops across your estates and celebrate with Grandma.',
    rewardCoins: 34000,
    rewardXp: 1100,
    canActivate: () => !!S.story?.prologueSeen && farmLevel() >= 18 && !!S.story.seen['npc-q-grandma-3-done'],
    progress: () => [Math.min(400, S.stats.harv ?? 0), 400],
  },
  {
    id: 'npc-q-rancher-4',
    who: 'rancher',
    icon: 'cow',
    titleFa: 'امپراتوری دامداری دره',
    titleEn: 'Valley Livestock Empire',
    descFa: 'مجموع محصولات جمع‌آوری‌شدهٔ دام‌ها را به ۱۲۰ واحد برسان و نزد عمو مراد برگرد.',
    descEn: 'Gather 120 total livestock goods across your pens and visit Uncle Morad.',
    rewardCoins: 42000,
    rewardXp: 1350,
    canActivate: () => !!S.story?.prologueSeen && farmLevel() >= 20 && !!S.story.seen['npc-q-rancher-3-done'],
    progress: () => [Math.min(120, S.stats.collect ?? 0), 120],
  },
  {
    id: 'npc-q-sara-4',
    who: 'sara',
    icon: 'pistachio',
    titleFa: 'ملکهٔ صادرات هر سه مزرعه',
    titleEn: 'Export Crown of Three Estates',
    descFa: 'هر سه مزرعه را تا سقف نهایی توسعه بده و مژدهٔ بزرگ را به سارا برسان.',
    descEn: 'Complete every estate deed upgrade across all three farms and tell Sara.',
    rewardCoins: 65000,
    rewardXp: 2000,
    canActivate: () => !!S.story?.prologueSeen && S.lv.land >= 3 && farmLevel() >= 22 && !!S.story.seen['npc-q-sara-2-done'],
    progress: () => [S.lv.land >= 4 ? 1 : 0, 1],
  },
];

export const isNpcQuestActive = (q: NpcQuestSpec) => !!S.story?.seen?.[q.id + '-active'] && !S.story?.seen?.[q.id + '-done'];
export const isNpcQuestDone = (q: NpcQuestSpec) => !!S.story?.seen?.[q.id + '-done'];
export const isNpcQuestReadyToTurnIn = (q: NpcQuestSpec) => {
  if (!isNpcQuestActive(q)) return false;
  const [cur, max] = q.progress();
  return cur >= max;
};
export const isNpcQuestReadyToStart = (q: NpcQuestSpec) => !isNpcQuestDone(q) && !S.story?.seen?.[q.id + '-active'] && q.canActivate();

/** Returns true ONLY when this specific NPC currently has a real quest the player can activate or turn in right now! */
export function npcHasQuestMarker(who: QuestNpcId): boolean {
  if (!S.story?.prologueSeen) return false;
  if (who === 'jahangir') {
    if (S.story.postgame || !S.debt) return false;
    const rem = debt()?.remaining ?? 0;
    return rem > 0 && S.coins >= rem && isQuestDone(S.story.chapter);
  }
  return NPC_QUEST_SPECS.some((q) => q.who === who && (isNpcQuestReadyToTurnIn(q) || isNpcQuestReadyToStart(q)));
}

/** Resolves the right quest start/completion scene if available when talking to a Town NPC */
export function pickNpcQuestScene(who: Exclude<QuestNpcId, 'jahangir'>): string | null {
  const turnIn = NPC_QUEST_SPECS.find((q) => q.who === who && isNpcQuestReadyToTurnIn(q));
  if (turnIn) {
    S.story.seen[turnIn.id + '-done'] = true;
    S.coins += turnIn.rewardCoins;
    addXp(turnIn.rewardXp);
    addStat('quests', 1);
    const en = CFG.locale === 'en';
    toast('star', en ? `Quest complete: +${fa(turnIn.rewardCoins)} coins` : `پاداش مأموریت: +${fa(turnIn.rewardCoins)} سکه`);
    sfx.coin();
    saveGame();
    notify();
    return `${turnIn.id}-done`;
  }
  const startable = NPC_QUEST_SPECS.find((q) => q.who === who && isNpcQuestReadyToStart(q));
  if (startable) {
    S.story.seen[startable.id + '-active'] = true;
    saveGame();
    notify();
    return `${startable.id}-start`;
  }
  return null;
}

export const ESTATE_AND_NPC_STORY_NODES: StoryNode[] = [
  // ===== خط داستانی اختصاصی مزرعهٔ بزرگ اول: دشت شمالی (۵۴ کرت) =====
  mkNode('area-intro-north', [
    { who: 'engineer', text: 'این پهنهٔ وسیع را ببین! پنجاه‌وچهار کرت حاصلخیز درست پای آسیاب بادی قدیمی پدربزرگت خوابیده است.' },
    { who: 'grandma', text: 'جهانگیر سال‌ها پیش سندش را قفل کرد، اما جادهٔ خاکی مزرعهٔ اصلی هنوز یک‌راست به همین دشت می‌رسد.' },
    { who: 'player', text: 'وقتی به سطح چهار برسیم، از دفتر املاک شهر سند «دشت شمالی» را می‌خرم تا دوباره پر از گندم و زعفران شود!' },
  ]),
  mkNode('estate-north-bought', [
    { who: 'grandma', text: 'مبارک باشد پسرم! سند «مزرعهٔ بزرگ دشت شمالی» به نامت ثبت شد؛ پنجاه‌وچهار کرت تازه آمادهٔ کشت است!' },
    { who: 'jahangir', text: 'صبر کن ببینم... واقعاً کل دشت شمالی را خریدی؟! یک نفر چطور می‌خواهد نودوچهار کرت را هم‌زمان بچرخاند؟!' },
    { who: 'player', text: 'با کارگرهای پرتلاش و چاه سنگی دشت، این مزرعهٔ دوم خیلی زود پررونق‌تر از روز اولش می‌شود!' },
  ]),
  mkNode('estate-north-qanat', [
    { who: 'engineer', text: 'عقب بایستید؛ آخرین سنگ گرفتگی باز شد و آب زلال کوهستان دوباره توی قنات دشت شمالی جاری شد!' },
    { who: 'grandma', text: 'صدای شرشر آبش جان دوباره به آدم می‌دهد؛ پدربزرگت پنجاه سال پیش این قنات سنگی را با دست خودش چید.' },
    { who: 'sara', text: 'حالا هر پنجاه‌وچهار کرت دشت شمالی رطوبت را بسیار بهتر نگه می‌دارند و باردهی بی‌نظیری دارند!' },
  ]),

  mkNode('estate-north-harvest', [
    { who: 'grandma', text: 'عطر خوشهٔ تازهٔ دشت شمالی کل دهکده را پر کرد پسرم! آسیاب قدیمی انگار دوباره لبخند می‌زند.' },
    { who: 'player', text: 'اولین برداشت مزرعهٔ بزرگ دشت شمالی به بار نشست؛ تازه اول راه آبادانی است!' },
  ]),

  // ===== خط داستانی اختصاصی مزرعهٔ بزرگ دوم: باغ‌درهٔ آفتاب (۶۰ کرت) =====
  mkNode('area-intro-valley', [
    { who: 'rancher', text: 'به «باغ‌درهٔ آفتاب» خوش آمدی! شصت کرت پلکانیِ آفتاب‌گیر کنار آبشار کوهستانی و سروهای بلند.' },
    { who: 'sara', text: 'پناه صخره‌های گرم این دره باعث می‌شود باغ‌های میوه، انار، پسته و گل محمدی مثل جواهر بار بدهند.' },
    { who: 'player', text: 'در سطح چهارده سراغ دفتر املاک شهر می‌روم و بزرگ‌ترین مزرعهٔ یادگار پدربزرگ را آزاد می‌کنم!' },
  ]),
  mkNode('estate-valley-bought', [
    { who: 'sara', text: 'شصت کرت دیگر یک‌جا باز شد! مزرعهٔ اصلی، دشت شمالی و باغ‌درهٔ آفتاب حالا با جاده‌های باز به هم وصل‌اند!' },
    { who: 'jahangir', text: 'باورم نمی‌شود... صدوپنجاه‌وچهار کرت زیر یک پرچم! دفتر کل من دیگر جا برای نوشتن برداشت‌هایت ندارد!' },
    { who: 'player', text: 'راه‌های هر سه مزرعه باز است و کارگرها همین حالا در حال حرکت به سمت تراس‌های باغ‌دره‌اند!' },
  ]),
  mkNode('estate-valley-legacy', [
    { who: 'grandma', text: 'زیر این سرو کهنسال را نگاه کن پسرم؛ سنگ‌نگارهٔ پدربزرگت که هر سه مزرعهٔ خاندان را به نام هم پیوند زده!' },
    { who: 'rancher', text: 'مزرعهٔ اصلی، دشت شمالی و باغ‌درهٔ آفتاب... آرزویی که یک عمر برایش زحمت کشید به دست تو کامل شد.' },
    { who: 'player', text: 'حالا با پشتوانهٔ هر سه مزرعهٔ آباد، تسویهٔ آخرین سند و آزادی همیشگی نزدیک‌تر از همیشه است!' },
  ]),

  mkNode('estate-valley-harvest', [
    { who: 'sara', text: 'طعم میوه و محصول تراس‌های آفتاب‌گیر باغ‌دره بی‌نظیر است؛ کل بازار شهر منتظر بار بعدی توست!' },
    { who: 'player', text: 'برداشت هر سه مزرعه با هم مثل ساعت کار می‌کند!' },
  ]),

  // ===== دیالوگ‌های واقعی فعال‌سازی و تحویل کوئست‌های اهالی دهکده =====
  mkNode('npc-q-grandma-1-start', [
    { who: 'grandma', text: 'پسرم، پدربزرگت همیشه اولِ کار دوازده بغل محصول تازه از مزرعهٔ اصلی برداشت می‌کرد تا برکت به خانه بیاید.' },
    { who: 'player', text: 'چشم مادرجون! همین حالا دوازده محصول تازه برداشت می‌کنم و خبر خوشش را برایت می‌آورم.' },
  ]),
  mkNode('npc-q-grandma-1-done', [
    { who: 'grandma', text: 'دستت درد نکند نور چشمم! عطر این برداشت تازه جانم را تازه کرد؛ این سکه‌های یادگاری نوش جانت!' },
  ]),
  mkNode('npc-q-rancher-1-start', [
    { who: 'rancher', text: 'خدا قوت همسایه! مرغ‌های چرای آزاد روی کاه تخم‌های درشت می‌گذارند؛ شش محصول دامی جمع کن ببینم دستت چقدر برکت دارد!' },
    { who: 'player', text: 'روی چشمم عمو مراد! شش محصول تازه جمع می‌کنم و برمی‌گردم.' },
  ]),
  mkNode('npc-q-rancher-1-done', [
    { who: 'rancher', text: 'ایول پسر! کاه تمیز و رسیدگی درست یعنی همین؛ این کیسه سکه جایزهٔ دامدار نمونه‌ات!' },
  ]),
  mkNode('npc-q-sara-1-start', [
    { who: 'sara', text: 'حجره‌های بازار حسابی مشتری محصول تازه دارند! مجموع فروشت را به دوهزاروپانصد سکه برسان تا نامت را در فهرست ویژه ثبت کنم.' },
    { who: 'player', text: 'قبول است سارا؛ سبدهای محصول تازه یکی‌یکی راهی بازار می‌شوند!' },
  ]),
  mkNode('npc-q-sara-1-done', [
    { who: 'sara', text: 'همهٔ سبدهایت پیش از ظهر فروش رفت! بفرما، این هم پاداش ویژهٔ خوش‌حساب‌ترین تولیدکنندهٔ بازار!' },
  ]),
  mkNode('npc-q-engineer-1-start', [
    { who: 'engineer', text: 'حساب مهندسی روشن است: آبیاری دستی نصف توانت را می‌گیرد. چاه قطره‌ای را ارتقا بده یا در کارگاه آب‌پاش بساز!' },
    { who: 'player', text: 'پیشنهاد دقیقی است مهندس کاوه؛ سراغ تقویت سیستم آبرسانی مزرعه می‌روم!' },
  ]),
  mkNode('npc-q-engineer-1-done', [
    { who: 'engineer', text: 'آفرین به این اجرای دقیق! فشار آب مزرعه‌ات عالی شده؛ این هم پاداش انجمن مهندسان!' },
  ]),
  mkNode('npc-q-grandma-2-start', [
    { who: 'grandma', text: 'حالا که مزرعهٔ اصلی روی غلتک افتاده، دلم می‌خواهد سند «دشت شمالی» هم در دفتر املاک دوباره به نام خاندان برگردد.' },
    { who: 'player', text: 'حتماً مادرجون! می‌روم سراغ دفتر املاک تا پنجاه‌وچهار کرت دشت شمالی را آزاد کنم.' },
  ]),
  mkNode('npc-q-grandma-2-done', [
    { who: 'grandma', text: 'پره‌های آسیاب بادی دشت شمالی دوباره به نام ما می‌چرخند! آفرین به همتت پسرم، این هدیه مال توست!' },
  ]),
  mkNode('npc-q-rancher-2-start', [
    { who: 'rancher', text: 'وقت گسترش دامستان است! مجموع محصولات جمع‌آوری‌شدهٔ دام‌هایت را به بیست‌وپنج واحد برسان تا نشانت بدهم دامداری حرفه‌ای یعنی چه!' },
    { who: 'player', text: 'بخش‌های جداگانهٔ دام‌ها آماده‌اند؛ با دست پر برمی‌گردم عمو مراد!' },
  ]),
  mkNode('npc-q-rancher-2-done', [
    { who: 'rancher', text: 'بهترین شیر و پشم و تخم کل دره! دست‌مریزاد مرد، این هم جایزهٔ سنگین دامدار نمونه!' },
  ]),
  mkNode('npc-q-engineer-2-start', [
    { who: 'engineer', text: 'زیر دشت شمالی یک قنات کهن خوابیده است! قنات دشت شمالی را در املاکی احیا کن یا یک گلخانهٔ شیشه‌ای بساز!' },
    { who: 'player', text: 'فوق‌العاده است مهندس کاوه؛ همین حالا پیگیرش می‌شوم!' },
  ]),
  mkNode('npc-q-engineer-2-done', [
    { who: 'engineer', text: 'شاهکار مهندسی! حالا مزارع تو چهارفصل نفس می‌کشند؛ این پاداش ویژه تقدیم به تو!' },
  ]),
  mkNode('npc-q-sara-2-start', [
    { who: 'sara', text: 'تاجرهای بزرگ برای محصولات «باغ‌درهٔ آفتاب» سرودست می‌شکنند! سند شصت کرتی باغ‌دره را از املاکی بخر!' },
    { who: 'player', text: 'شصت کرت باغ‌درهٔ آفتاب همه‌چیز را متحول می‌کند؛ به زودی خبر ثبتش را می‌آورم سارا!' },
  ]),
  mkNode('npc-q-sara-2-done', [
    { who: 'sara', text: 'سه مزرعهٔ بزرگ زیر نظر یک نفر! این هم کمیسیون طلایی بزرگ‌ترین کشاورز کل منطقه!' },
  ]),
  mkNode('npc-q-grandma-3-start', [
    { who: 'grandma', text: 'پسرم، صدای زنبورهای گلستانت مرا یاد کندوهای قدیمی پدربزرگت انداخت؛ شش شیشه عسل خالص جمع کن تا حلوای گردو بپزم!' },
    { who: 'player', text: 'با کمال میل مادرجون! عسل‌های تازهٔ گلستان را برایت کنار می‌گذارم.' },
  ]),
  mkNode('npc-q-grandma-3-done', [
    { who: 'grandma', text: 'عجب عسل کهربایی و خوش‌عطری! دستت طلا پسرم؛ این هم هدیهٔ شیرین مادربزرگ!' },
  ]),
  mkNode('npc-q-rancher-3-start', [
    { who: 'rancher', text: 'آب سرد رودخانه پر از قزل‌آلا و ماهی‌های درشت شده است! دوازده بار صید موفق یا برداشت حوضچه ثبت کن تا قلاب طلایی را نشانت بدهم!' },
    { who: 'player', text: 'همین الان قلابم را برمی‌دارم و راهی اسکلهٔ رودخانه می‌شوم عمو مراد!' },
  ]),
  mkNode('npc-q-rancher-3-done', [
    { who: 'rancher', text: 'ماشاءالله به این دست‌وپنجه! حالا دیگر هیچ شاه‌ماهی‌ای از قلابت قسر درنمی‌رود!' },
  ]),
  mkNode('npc-q-sara-3-start', [
    { who: 'sara', text: 'مشتری‌های شهری عاشق فرآورده‌های پاتیل سنتی‌اند! هشت نوبت در پاتیل انبار محصول فرآوری کن تا غرفهٔ ویژه برایت باز کنم.' },
    { who: 'player', text: 'آتش پاتیل انبار همیشه روشن است سارا؛ بهترین مربا و پنیر و شربت را آماده می‌کنم!' },
  ]),
  mkNode('npc-q-sara-3-done', [
    { who: 'sara', text: 'شیشه‌های دست‌پختت در یک چشم‌به‌هم‌زدن تمام شد! این هم سود ویژهٔ کارگاه خانگی تو!' },
  ]),
  mkNode('npc-q-engineer-3-start', [
    { who: 'engineer', text: 'وقتش رسیده مزارعت واقعاً صنعتی شوند! دست‌کم سه دستگاه متفاوت در کارگاه بساز تا ببینی بهره‌وری چطور پرواز می‌کند.' },
    { who: 'player', text: 'برنامهٔ فوق‌العاده‌ای است مهندس کاوه؛ خط کامل ماشین‌آلات را راه می‌اندازم!' },
  ]),
  mkNode('npc-q-engineer-3-done', [
    { who: 'engineer', text: 'صدای هماهنگ موتورهای مزرعه‌ات مثل موسیقی است! این هم جایزهٔ بزرگ نوآوری کشاورزی!' },
  ]),
  mkNode('npc-q-grandma-4-start', [
    { who: 'grandma', text: 'امسال می‌خواهیم سفرهٔ شکرگزاری کل دهکده را پهن کنیم پسرم؛ مجموع برداشت مزارعت را به چهارصد برسان!' },
    { who: 'player', text: 'چشم مادرجون! انبارها را پر از برکت هر سه مزرعه می‌کنم.' },
  ]),
  mkNode('npc-q-grandma-4-done', [
    { who: 'grandma', text: 'پدربزرگت اگر امروز اینجا بود از شوق اشک می‌ریخت؛ خدا به دست‌وپایت برکت بدهد عزیزم!' },
  ]),
  mkNode('npc-q-rancher-4-start', [
    { who: 'rancher', text: 'بگذار رک بگویم: اگر مجموع برداشت دام‌هایت از صدوبیست بگذرد، رسماً استادت می‌شوی نه شاگردم!' },
    { who: 'player', text: 'قبول است عمو مراد؛ رکورد کل دره را با هم می‌شکنیم!' },
  ]),
  mkNode('npc-q-rancher-4-done', [
    { who: 'rancher', text: 'کلاهم را به احترامت برمی‌دارم مرد! تو حالا بزرگ‌ترین دامدار کل این دیاری!' },
  ]),
  mkNode('npc-q-sara-4-start', [
    { who: 'sara', text: 'تنها یک گام تا اوج باقی مانده: سنگ‌نگارهٔ میراث در باغ‌دره را هم آزاد کن تا هر سه مزرعه به کمال برسند!' },
    { who: 'player', text: 'میراث پدربزرگ را کامل می‌کنم سارا؛ به زودی جشن بزرگ را می‌گیریم!' },
  ]),
  mkNode('npc-q-sara-4-done', [
    { who: 'sara', text: 'افسانهٔ هر سه مزرعه کامل شد! تمام کاروان‌های تجاری منطقه به احترام نام تو می‌ایستند!' },
  ]),
];

export const EXTRA_NPC_QUEST_EN_LINES: Record<string, string[]> = {
  'npc-q-grandma-3-start': [
    'The hum of your Apiary reminds me of your grandfather’s hives, dear! Gather six jars of pure honey so I can bake walnut halva!',
    'Gladly, Grandma! I will set aside the freshest Apiary honey for you.',
  ],
  'npc-q-grandma-3-done': [
    'What fragrant amber honey! Bless your hands, dear — take this sweet gift from Grandma!',
  ],
  'npc-q-rancher-3-start': [
    'Cold mountain water has filled the river with trout! Log twelve river catches or pond harvests and prove your angler instincts!',
    'Grabbing my rod right now and heading down to the river dock, Uncle Morad!',
  ],
  'npc-q-rancher-3-done': [
    'Now that is a true angler’s wrist! Not a single prize fish in the valley can escape you now!',
  ],
  'npc-q-sara-3-start': [
    'Town buyers adore traditional cauldron delicacies! Craft eight batches in your Barn Cauldron and I will open a showcase stall for you.',
    'The cauldron fire stays lit, Sara — finest jams, cheeses, and syrups coming right up!',
  ],
  'npc-q-sara-3-done': [
    'Every single jar sold out in minutes! Here is your artisan showcase bonus!',
  ],
  'npc-q-engineer-3-start': [
    'Time to industrialize across your estates! Commission at least three different Workshop machines and watch output soar.',
    'Count me in, Engineer Kaveh — full mechanization starts now!',
  ],
  'npc-q-engineer-3-done': [
    'Those synchronized engines sound like music! Accept the Guild Innovation Prize!',
  ],
  'npc-q-grandma-4-start': [
    'We are hosting a thanksgiving feast for the whole village, dear! Bring your lifetime crop harvests up to four hundred!',
    'You got it, Grandma — all three estates will overflow with fresh produce!',
  ],
  'npc-q-grandma-4-done': [
    'Your grandfather would weep with pride if he saw these fields today — bless you, my child!',
  ],
  'npc-q-rancher-4-start': [
    'Tell you what: push your lifetime ranch collections past one hundred and twenty, and I will call YOU master rancher!',
    'Deal, Uncle Morad — let us shatter the valley record together!',
  ],
  'npc-q-rancher-4-done': [
    'Hats off to you, partner! You officially run the finest ranch in the entire region!',
  ],
  'npc-q-sara-4-start': [
    'One final milestone remains: unlock the Heritage Crest in Sunlit Valley so all three estates reach perfection!',
    'I will complete Grandfather’s legacy, Sara — get the grand celebration ready!',
  ],
  'npc-q-sara-4-done': [
    'The legend of the Three Estates is complete! Every merchant caravan in the province salutes your name!',
  ],
};
