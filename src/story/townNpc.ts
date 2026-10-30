// ===== دادهٔ خالص شخصیت‌های شهر با برنامهٔ روزانه و دیالوگ‌های تصادفی داستانی (P6-08) =====
import type { CharId, StoryNode } from './types';

export interface TownActorSpec {
  who: 'grandma' | 'sara' | 'engineer' | 'rancher';
  speed: number;
  morning: [number, number];
  noon: [number, number];
  evening: [number, number];
}

export const TOWN_ACTORS: TownActorSpec[] = [
  { who: 'grandma', speed: 54, morning: [216, 628], noon: [228, 632], evening: [212, 630] },
  { who: 'sara', speed: 74, morning: [396, 630], noon: [408, 634], evening: [392, 632] },
  { who: 'engineer', speed: 86, morning: [612, 628], noon: [624, 632], evening: [608, 630] },
  { who: 'rancher', speed: 63, morning: [792, 630], noon: [804, 634], evening: [788, 632] },
];

const mk = (id: string, who: Exclude<CharId, 'narrator' | 'player' | 'jahangir'>, text: string, reply?: string): StoryNode => ({
  id,
  lines: reply ? [{ who, text }, { who: 'player', text: reply }] : [{ who, text }],
  next: null,
});

export const TOWN_NPC_NODES: StoryNode[] = [
  mk('town-grandma-0', 'grandma', 'خوش آمدی پسرم! خاک زنده همیشه بوی دست‌های پرمهر بابابزرگت را می‌دهد.', 'نفس گرم شما بالای سر مزرعه است مادرجون.'),
  mk('town-grandma-1', 'grandma', 'یادت نرود هر فصل محصولت را عوض کنی؛ زمین از تنوع جان می‌گیرد.'),
  mk('town-grandma-2', 'grandma', 'جهانگیر زیر آن چهرهٔ عبوس هر غروب از دور به مزرعه‌ات نگاه می‌کند!'),

  mk('town-sara-0', 'sara', 'سلام! اگر محصول نوبرانه داری یک‌جا نفروش؛ کم‌کم بیاور تا نرخ نشکند.', 'نکتهٔ طلایی بود، ممنون سارا.'),
  mk('town-sara-1', 'sara', 'قراردادهای پیش‌فروش بازار سود عالی دارند، فقط حواست به روز تحویل باشد!'),
  mk('town-sara-2', 'sara', 'عسل تابستان و انار شب یلدا همیشه مشتری دست‌به‌نقد دارند.'),

  mk('town-engineer-0', 'engineer', 'راندمان آبیاری با چاه قطره‌ای تا سی‌وشش درصد بهینه‌تر می‌شود؛ عدد دروغ نمی‌گوید.'),
  mk('town-engineer-1', 'engineer', 'گلخانهٔ شیشه‌ای یعنی چهار فصل تولید پیوسته. سرمایه‌گذاری منطقی همین است.', 'دقیقاً روی همین حساب باز کرده‌ام.'),
  mk('town-engineer-2', 'engineer', 'مترسک ضدشرخر شاهکار نجاری شهر است؛ ضریب برخورد را به‌شدت پایین می‌آورد!'),

  mk('town-rancher-0', 'rancher', 'آخور را برای گوسفند و بز و گاو همیشه پر نگه دار پسر؛ مرغ و اردک روی بستر کاه آزاد می‌چرخند.'),
  mk('town-rancher-1', 'rancher', 'حصار سطح سه که بسازی، کیفیت شیر و پشم دام‌هایت یک سر و گردن بالاتر می‌رود.', 'حتماً ارتقاش می‌دهم.'),
  mk('town-rancher-2', 'rancher', 'یک نر و یک ماده در حصار کافی است تا گله‌ات خودش زادوولد کند.'),

  mk('town-carpenter-0', 'carpenter', 'هر تیر و تخته را دوبار اندازه می‌گیرم و یک‌بار می‌برم؛ سفارش مزرعهٔ تو هم دقیق از آب درمی‌آید.', 'پس نقشهٔ ارتقای انبار را به دست شما می‌سپارم استاد.'),
  mk('town-carpenter-1', 'carpenter', 'برای گلخانه، تیرهای ترموود و درزگیر استفاده کن؛ برف و باران نباید محصولت را رنج بدهد.'),
  mk('town-carpenter-2', 'carpenter', 'حصار خوب فقط ظرفیت را زیاد نمی‌کند؛ تهویه و سایه هم سلامت دام را بیشتر می‌کند.', 'این نکته را در ساخت حصار بعدی حتماً حساب می‌کنم.'),
  mk('town-estateAgent-0', 'estateAgent', 'هر سند را با مساحت، محدوده و مبلغ نهایی روی یک برگه می‌بینی؛ هیچ هزینهٔ پنهانی وجود ندارد.', 'همین شفافیت برای خرید زمین خیلی ارزش دارد.'),
  mk('town-estateAgent-1', 'estateAgent', 'دشت شمالی برای چرخهٔ گندم و ذرت عالی است؛ باغ‌دره هم ظرفیت بیشتری برای تولید مداوم دارد.'),
  mk('town-estateAgent-2', 'estateAgent', 'قرارداد کارگرها را قبل از امضا بخوان؛ دستمزد روزانه و نقش هر نفر در دفتر ثبت شده است.', 'حتماً اول نقش و دستمزد را بررسی می‌کنم.'),
];

/** مقصد فعلی شخصیت شهر بر اساس ساعت روز */
export function npcTargetAt(idx: number, hour: number): [number, number] {
  const actor = TOWN_ACTORS[idx % TOWN_ACTORS.length];
  if (hour < 11) return actor.morning;
  if (hour < 16) return actor.noon;
  return actor.evening;
}
