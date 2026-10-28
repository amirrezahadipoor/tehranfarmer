// ===== ۸ رویداد و صحنهٔ مخفی عمیق مزرعه با شرایط روشن، طبیعی و پاداش‌های واقعی (دوزبانه FA/EN) =====
import { S, UI, addXp, farmLevel, grantGoodWithMailOverflow, honeyCap, season, stamCap, toast } from '../game/state';
import { isFarmScene } from '../game/estates';
import { CFG } from '../game/settings';
import { addStanding } from '../game/core/debt';
import { triggerCutscene } from './engine';
import type { StoryNode } from './types';

export interface SecretDef {
  id: string;
  icon: string;
  titleFa: string;
  clueFa: string;
  rewardTextFa: string;
}

interface RawSecret {
  id: string;
  icon: string;
  titleFa: string;
  titleEn: string;
  clueFa: string;
  clueEn: string;
  rewardFa: string;
  rewardEn: string;
}

const RAW_SECRETS: RawSecret[] = [
  {
    id: 'secret-midnight-well',
    icon: 'drop',
    titleFa: 'راز چاه نقره‌ای نیمه‌شب',
    titleEn: 'Midnight Silver Well',
    clueFa: 'چاه مزرعه را در نجاری به سطح ۲ برسان و در شبِ صاف (ساعت ۲۳ تا ۲ بامداد) از چاه آب بکش.',
    clueEn: 'Upgrade the Farm Well to Level 2 at Carpentry, then draw water on a clear night (23:00–02:30).',
    rewardFa: '+۱۵٬۰۰۰ سکه و سیراب شدن کامل زمین‌ها',
    rewardEn: '+15,000 coins & full irrigation across all plots',
  },
  {
    id: 'secret-golden-kingfish',
    icon: 'fish',
    titleFa: 'افسانهٔ شاه‌ماهی طلایی باران',
    titleEn: 'Rainstorm Golden Kingfish',
    clueFa: 'پس از صید ۲۵ ماهی، هنگام باران در سپیده‌دم یا غروب (۵:۳۰ تا ۸:۳۰ یا ۱۷ تا ۱۹:۳۰) در رودخانه ماهی بگیر.',
    clueEn: 'After catching 25 fish, cast your rod at the River in rainy dawn (05:30–08:30) or dusk (17:00–19:30).',
    rewardFa: '+۳۰٬۰۰۰ سکه، ۳ خاویار و +۵۰۰ تجربه',
    rewardEn: '+30,000 coins, 3 Caviar & +500 XP',
  },
  {
    id: 'secret-queen-bee-bloom',
    icon: 'honey',
    titleFa: 'تاج‌گذاری ملکهٔ زنبورستان',
    titleEn: 'Golden Queen Bee Bloom',
    clueFa: 'حداقل ۵ کندو بساز، ۱۵ شیشه عسل برداشت کن و در بهار یا تابستان وارد زنبورستان شو.',
    clueEn: 'Build at least 5 beehives, harvest 15 honey jars, and visit the Apiary in Spring or Summer.',
    rewardFa: '+۲۰٬۰۰۰ سکه و پر شدن کامل کندوها',
    rewardEn: '+20,000 coins & all beehives filled to capacity',
  },
  {
    id: 'secret-scarecrow-duel',
    icon: 'scarecrow',
    titleFa: 'دوئل شبانهٔ مترسک و جهانگیر',
    titleEn: 'Scarecrow vs. Jahangir Showdown',
    clueFa: 'پیش از پایان داستان، مترسک ضدشرخر را تا سطح ۳ کامل کن و در مزرعه قدم بزن.',
    clueEn: 'Upgrade the Guard Scarecrow to Level 3 before finishing the story and walk on your farm.',
    rewardFa: '+۱۲٬۰۰۰ سکه و +۱۰ اعتبار خوش‌حسابی',
    rewardEn: '+12,000 coins & +10 Credit Standing',
  },
  {
    id: 'secret-yalda-lanterns',
    icon: 'pomegranate',
    titleFa: 'مهمانی پنهان شب چله',
    titleEn: 'Winter Solstice Lantern Feast',
    clueFa: 'در شب‌های زمستان (پس از ساعت ۱۹:۳۰) با داشتن انار یا هندوانه در انبار به مزرعه سر بزن.',
    clueEn: 'On a Winter night after 19:30, keep Pomegranate or Watermelon in your barn storage.',
    rewardFa: '+۲۵٬۰۰۰ سکه، نیروی کامل و +۱۵ اعتبار',
    rewardEn: '+25,000 coins, full stamina & +15 Credit Standing',
  },
  {
    id: 'secret-grandpa-tree',
    icon: 'star',
    titleFa: 'گنجینهٔ زیر درخت کهنسال',
    titleEn: 'Treasure Under Grandpa’s Old Tree',
    clueFa: 'پس از تکمیل هر ۳ مزرعه (۱۵۴ کرت — پلهٔ ۴ املاکی) و خرید خاک طلایی، روی درخت پیر پشت خانه کلیک کن.',
    clueEn: 'Complete all 3 estates (154 plots, Land Tier 4), buy Golden Soil, then tap the old tree behind your house.',
    rewardFa: '+۷۵٬۰۰۰ سکه، ۵ بذر گل محمدی و +۱٬۰۰۰ تجربه',
    rewardEn: '+75,000 coins, 5 Damask Rose seeds & +1,000 XP',
  },
  {
    id: 'secret-silk-merchant',
    icon: 'contract',
    titleFa: 'کاروان ابریشم بازار',
    titleEn: 'Silk Road Caravan',
    clueFa: '۵ قرارداد بازار را تحویل بده و همزمان عسل و زعفران در انبار داشته باش، سپس وارد بازار شهر شو.',
    clueEn: 'Complete 5 Market contracts, carry both Honey and Saffron in storage, and open Town Market.',
    rewardFa: '+۶۰٬۰۰۰ سکه و جهش تقاضای بازار',
    rewardEn: '+60,000 coins & citywide market demand surge',
  },
  {
    id: 'secret-true-epilogue',
    icon: 'trophy',
    titleFa: 'پایان مخفی واقعی: نگهبان جاویدان دره',
    titleEn: 'True Secret Ending: Eternal Guardian',
    clueFa: 'پس از تسویهٔ هر ۶ سند، رسیدن به سطح ۳۰ و کشف ۵ راز دیگر، وارد موزهٔ میراث در شهر شو.',
    clueEn: 'Clear all 6 deeds, reach Level 30, discover at least 5 secrets, then enter the Heritage Museum.',
    rewardFa: '+۱۵۰٬۰۰۰ سکه و نشان جاویدان مزرعه',
    rewardEn: '+150,000 coins & Eternal Valley Guardian honor',
  },
];

export const SECRETS: SecretDef[] = RAW_SECRETS.map((r) => ({
  id: r.id,
  icon: r.icon,
  get titleFa() { return CFG.locale === 'en' ? r.titleEn : r.titleFa; },
  get clueFa() { return CFG.locale === 'en' ? r.clueEn : r.clueFa; },
  get rewardTextFa() { return CFG.locale === 'en' ? r.rewardEn : r.rewardFa; },
}));

export const SECRET_NODES: StoryNode[] = [
  {
    id: 'secret-midnight-well',
    lines: [
      { who: 'narrator', text: 'نیمه‌شبِ صاف و پرستاره است؛ ناگهان از دل چاه سنگی نوری نقره‌ای بیرون می‌جهد!' },
      { who: 'grandma', text: 'آفرین پسرم! چشمهٔ زیرزمینی بابابزرگت را پیدا کردی؛ کیسهٔ یادگاری‌اش هم کنار سنگ چاه بود!' },
      { who: 'player', text: 'باورم نمی‌شود! آب زلالش تمام کرت‌های مزرعه را هم یک‌شبه سیراب و حاصلخیز کرد!' },
    ],
    next: null,
  },
  {
    id: 'secret-golden-kingfish',
    lines: [
      { who: 'narrator', text: 'قلاب در زیر باران محکم کشیده می‌شود و شاه‌ماهی طلایی افسانه‌ای از دل رودخانه به هوا می‌جهد!' },
      { who: 'rancher', text: 'چشم‌هایم آلبالو گیلاس می‌چیند یا واقعاً شاه‌ماهی طلایی دره را گرفتی پسر؟!' },
      { who: 'engineer', text: 'طبق کتاب‌های قدیمی چهل سال کسی ندیده‌اش! کلکسیونرهای شهر سی هزار سکه نقد بابتش می‌دهند!' },
    ],
    next: null,
  },
  {
    id: 'secret-queen-bee-bloom',
    lines: [
      { who: 'narrator', text: 'صدها زنبور طلایی در هوا حلقه می‌زنند و ملکهٔ کمیاب دره روی کندوی اصلی می‌نشیند!' },
      { who: 'grandma', text: 'هزار ماشاءالله! بوی گل‌های مزرعه‌ات ملکهٔ طلایی را برگرداند؛ همهٔ کندوها لبریز عسل ناب شدند!' },
      { who: 'player', text: 'عجب عطر عجیبی کل زنبورستان را پر کرده مادرجون!' },
    ],
    next: null,
  },
  {
    id: 'secret-scarecrow-duel',
    lines: [
      { who: 'narrator', text: 'جهانگیر پاورچین‌پاورچین برای بازرسی نزدیک پرچین می‌آید که ناگهان فنر مترسک سطح سه درمی‌رود!' },
      { who: 'jahangir', text: 'یا ابوالفضل!! این دیگر چه جانوری بود وسط تاریکی؟! قلبم ریخت توی کفشم!' },
      { who: 'player', text: 'هاهاها! مترسک ضدشرخر کار خودش را کرد آقا جهانگیر! کیسهٔ سکه‌ات هم از دستت افتاد!' },
    ],
    next: null,
  },
  {
    id: 'secret-yalda-lanterns',
    lines: [
      { who: 'narrator', text: 'فانوس‌های گرم شب زمستانی روشن می‌شوند و همسایه‌ها با سینی انار و چای دور هم جمع می‌شوند.' },
      { who: 'sara', text: 'چه خوب که دست پر آمدی! شب چله بدون انار و هندوانهٔ مزرعهٔ تو صفا نداشت!' },
      { who: 'jahangir', text: '... اهم! برای سرکشی نیامده‌ام؛ فقط یک فلاکس چای دارچین آوردم و می‌روم!' },
    ],
    next: null,
  },
  {
    id: 'secret-grandpa-tree',
    lines: [
      { who: 'narrator', text: 'پای ریشهٔ درخت کهنسال پشت خانه صدای فلز می‌آید؛ صندوقچهٔ برنجی پدربزرگ از دل خاک بیرون می‌آید!' },
      { who: 'player', text: 'پنج بسته بذر کمیاب گل محمدی و یک کیسه سکهٔ قدیمی با دست‌خط بابابزرگ!' },
      { who: 'grandma', text: 'بابابزرگت گفته بود هر وقت نوه‌ام کل زمین‌ها را آزاد و طلایی کرد، این گنج حلالش باشد!' },
    ],
    next: null,
  },
  {
    id: 'secret-silk-merchant',
    lines: [
      { who: 'sara', text: 'مژده بده وارث! تاجر بزرگ کاروان ابریشم تمام زعفران و عسل مزرعه‌ات را یک‌جا به قیمت طلا خرید!' },
      { who: 'player', text: 'خوش‌قولی در قراردادهای بازار بالاخره نتیجهٔ بزرگش را نشان داد!' },
    ],
    next: null,
  },
  {
    id: 'secret-true-epilogue',
    lines: [
      { who: 'narrator', text: 'ناقوس جشن بزرگ دره به صدا درمی‌آید؛ تمام اهالی شهر کنار تندیس طلایی گرد هم آمده‌اند!' },
      { who: 'jahangir', text: 'تو نه‌فقط بدهی مزرعه را صاف کردی، بلکه تمام رازهای کهن پدربزرگت را هم زنده کردی پسر!' },
      { who: 'engineer', text: 'از امروز نام تو به‌عنوان نگهبان بزرگ و استاد جاویدان کل این دره ثبت شد!' },
      { who: 'grandma', text: 'بزنید به افتخار بهترین مزرعه‌دار تاریخ این روستا!' },
    ],
    next: null,
  },
];

export function discoveredSecretCount(): number {
  return Object.values(S.secrets ?? {}).filter(Boolean).length;
}

function grantSecret(id: string, rewardFn: () => void, faMsg: string, enMsg: string): boolean {
  if (!S.story?.prologueSeen || S.story.pending) return false;
  S.secrets ??= {};
  if (S.secrets[id]) return false;
  S.secrets[id] = true;
  rewardFn();
  toast('star', CFG.locale === 'en' ? enMsg : faMsg);
  triggerCutscene(id, { forceReplay: true });
  return true;
}

export type SecretCheckTrigger = 'well' | 'fish' | 'apiary' | 'farm-step' | 'tree-tap' | 'market-open' | 'museum-open';

export function checkSecretTriggers(kind: SecretCheckTrigger): boolean {
  if (!UI.started || !S.story?.prologueSeen || S.story.pending) return false;
  S.secrets ??= {};
  const sn = season();

  if (!S.secrets['secret-midnight-well'] && kind === 'well' && isFarmScene(UI.scene) && S.wellLv >= 2 && S.weather === 0 && (S.hour >= 23 || S.hour <= 2.5)) {
    return grantSecret('secret-midnight-well', () => {
      S.coins += 15000;
      S.stamina = stamCap();
      for (const p of [...S.plots, ...S.northPlots, ...S.valleyPlots]) if (p.st > 0) { p.water = 1; p.fert = 1; }
    }, 'راز مخفی کشف شد: چاه نقره‌ای نیمه‌شب! (+۱۵٬۰۰۰ سکه)', 'Secret Discovered: Midnight Silver Well! (+15,000 coins)');
  }

  if (!S.secrets['secret-golden-kingfish'] && kind === 'fish' && UI.scene === 'river' && S.weather === 2 && ((S.hour >= 5.5 && S.hour <= 8.5) || (S.hour >= 17 && S.hour <= 19.5)) && (S.stats.fish ?? 0) >= 25) {
    return grantSecret('secret-golden-kingfish', () => {
      S.coins += 30000;
      grantGoodWithMailOverflow('roe', 3, 'rancher', 'secret-kingfish');
      addXp(500);
    }, 'راز مخفی کشف شد: شاه‌ماهی طلایی باران! (+۳۰٬۰۰۰ سکه)', 'Secret Discovered: Golden Kingfish! (+30,000 coins)');
  }

  if (!S.secrets['secret-queen-bee-bloom'] && kind === 'apiary' && UI.scene === 'apiary' && (sn === 0 || sn === 1) && S.hives >= 5 && (S.stats.honey ?? 0) >= 15) {
    return grantSecret('secret-queen-bee-bloom', () => {
      S.coins += 20000;
      S.honeyAcc = honeyCap();
      addXp(400);
    }, 'راز مخفی کشف شد: ملکهٔ زنبورستان! (+۲۰٬۰۰۰ سکه)', 'Secret Discovered: Golden Queen Bee! (+20,000 coins)');
  }

  if (!S.secrets['secret-scarecrow-duel'] && kind === 'farm-step' && UI.scene === 'farm' && (S.debt?.scarecrow ?? 0) >= 3 && !S.story.postgame) {
    return grantSecret('secret-scarecrow-duel', () => {
      S.coins += 12000;
      addStanding(10);
    }, 'راز مخفی کشف شد: دوئل مترسک و جهانگیر! (+۱۲٬۰۰۰ سکه)', 'Secret Discovered: Scarecrow Showdown! (+12,000 coins)');
  }

  if (!S.secrets['secret-yalda-lanterns'] && kind === 'farm-step' && sn === 3 && S.hour >= 19.5 && ((S.inv.pomegranate ?? 0) > 0 || (S.inv.watermelon ?? 0) > 0)) {
    return grantSecret('secret-yalda-lanterns', () => {
      S.coins += 25000;
      S.stamina = stamCap();
      addStanding(15);
    }, 'راز مخفی کشف شد: مهمانی پنهان شب چله! (+۲۵٬۰۰۰ سکه)', 'Secret Discovered: Solstice Feast! (+25,000 coins)');
  }

  if (!S.secrets['secret-grandpa-tree'] && kind === 'tree-tap' && UI.scene === 'farm' && S.lv.land >= 4 && S.lv.soil >= 1) {
    return grantSecret('secret-grandpa-tree', () => {
      S.coins += 75000;
      S.seeds.rose = (S.seeds.rose ?? 0) + 5;
      addXp(1000);
    }, 'راز مخفی کشف شد: گنجینهٔ زیر درخت کهنسال! (+۷۵٬۰۰۰ سکه و ۵ بذر گل محمدی)', 'Secret Discovered: Grandpa’s Tree Chest! (+75,000 coins & 5 Rose seeds)');
  }

  if (!S.secrets['secret-silk-merchant'] && kind === 'market-open' && UI.scene === 'town' && (S.stats.contracts ?? 0) >= 5 && (S.inv.saffron ?? 0) > 0 && (S.inv.honey ?? 0) > 0) {
    return grantSecret('secret-silk-merchant', () => {
      S.coins += 60000;
      for (const k of Object.keys(S.dem)) S.dem[k] = Math.max(S.dem[k] ?? 1, 1.35);
    }, 'راز مخفی کشف شد: کاروان ابریشم! (+۶۰٬۰۰۰ سکه)', 'Secret Discovered: Silk Road Caravan! (+60,000 coins)');
  }

  if (!S.secrets['secret-true-epilogue'] && kind === 'museum-open' && S.story.postgame && farmLevel() >= 30 && discoveredSecretCount() >= 5) {
    return grantSecret('secret-true-epilogue', () => {
      S.coins += 150000;
    }, 'پایان مخفی واقعی باز شد: نگهبان جاویدان دره! (+۱۵۰٬۰۰۰ سکه)', 'True Secret Ending Unlocked: Eternal Valley Guardian! (+150,000 coins)');
  }

  return false;
}
