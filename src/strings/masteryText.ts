import { CFG } from '../game/settings';
import { faDigits } from './fa';

const MILESTONES: Record<string, { fa: string; en: string }> = {
  harvest: { fa: 'برداشت سه‌مزرعه', en: 'Three-Estate Harvest' },
  water: { fa: 'نگهبان آب و ماهی', en: 'Water & Fish Steward' },
  ranch: { fa: 'نظم دامستان و کندو', en: 'Ranch & Apiary Rhythm' },
  artisan: { fa: 'کاروان فرآوری و بازار', en: 'Artisan Market Caravan' },
  frontier: { fa: 'معدن و آبادانی', en: 'Mine & Homestead Works' },
  community: { fa: 'پیوند با دهکده', en: 'Village Community' },
  legacy: { fa: 'میراث استاد مزرعه', en: 'Master Farmer’s Legacy' },
};

const GOALS: Record<string, { fa: string; en: string }> = {
  'metric:cropHarv': { fa: 'برداشت محصول تازه', en: 'Harvest fresh crops' },
  'metric:quests': { fa: 'ماموریت روزانه/هفتگی', en: 'Daily or weekly quests' },
  'metric:fish': { fa: 'صید از رودخانه', en: 'Catch river fish' },
  'metric:pondH': { fa: 'برداشت حوض ماهی', en: 'Harvest stocked ponds' },
  'metric:collect': { fa: 'جمع‌آوری محصول دام', en: 'Gather animal produce' },
  'metric:honey': { fa: 'برداشت عسل', en: 'Harvest honey' },
  'metric:babies': { fa: 'به‌دنیا آمدن نوزاد دام', en: 'Breed animal newborns' },
  'metric:artisan': { fa: 'فرآوری در دیگ کارگاه', en: 'Craft artisan recipes' },
  'metric:contracts': { fa: 'تحویل قرارداد بازار', en: 'Deliver market contracts' },
  'metric:mineGems': { fa: 'استخراج گوهر از معدن', en: 'Extract mine gems' },
  'metric:builds': { fa: 'تکمیل ساخت یا ارتقا', en: 'Complete builds or upgrades' },
  secrets: { fa: 'رازهای کشف‌شدهٔ دره (کل)', en: 'Discovered valley secrets (total)' },
  claimed: { fa: 'هدف‌های قبلی مسیر استادی', en: 'Earlier Mastery milestones' },
};

export function masteryMilestoneText(id: string): string {
  const item = MILESTONES[id] ?? MILESTONES.harvest;
  return CFG.locale === 'en' ? item.en : item.fa;
}

export function masteryGoalText(id: string): string {
  const item = GOALS[id] ?? { fa: id, en: id };
  return CFG.locale === 'en' ? item.en : item.fa;
}

export function masteryCopy() {
  const en = CFG.locale === 'en';
  const num = (value: number) => en
    ? Math.round(value).toLocaleString('en-US')
    : faDigits(Math.round(value).toLocaleString('en-US')).replace(/,/g, '٬');
  return {
    title: en ? 'Farm Mastery Path' : 'مسیر استادی مزرعه',
    subtitle: en
      ? 'Seven varied goals connect farming, ranching, ponds, mining, crafting, contracts and secrets. Their XP rewards make the road to Level 30 a journey rather than a repetition loop.'
      : 'هفت هدف متنوع، کشاورزی، دامداری، حوض، معدن، فرآوری، قرارداد و رازها را به هم وصل می‌کند. پاداش‌های تجربه، مسیر سطح ۳۰ را به جای تکرار بی‌هدف به یک سفر تازه تبدیل می‌کنند.',
    startNote: en
      ? 'Progress starts when the farm becomes free. For an older postgame save, it starts the first time this journal opens.'
      : 'پیشرفت از لحظهٔ آزادی مزرعه شمارش می‌شود؛ در سیوهای قدیمیِ پس از پایان داستان، از نخستین بازکردن همین دفتر.',
    level: en ? 'Level' : 'سطح',
    claim: en ? 'Claim reward' : 'دریافت پاداش',
    claimed: en ? 'Completed' : 'روایت‌شده',
    ready: en ? 'Ready to claim' : 'آمادهٔ دریافت',
    inProgress: en ? 'In progress' : 'در حال انجام',
    locked: en ? 'Keep playing; progress is still recorded' : 'به بازی ادامه بده؛ پیشرفت ثبت می‌شود',
    xp: en ? 'XP' : 'تجربه',
    pathDone: en ? 'Mastery path complete — the valley recognizes its master farmer.' : 'مسیر استادی کامل شد — دهکده تو را استاد مزرعه می‌شناسد.',
    rewardToast: (title: string, coins: number, xp: number) => en
      ? `${title}: +${num(coins)} coins, +${num(xp)} XP`
      : `${title}: +${num(coins)} سکه، +${num(xp)} تجربه`,
  };
}
