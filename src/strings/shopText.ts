import type { ShopId } from '../game/shops';

export const SHOP_UI = {
  fa: {
    eyebrow: 'داخل فروشگاه',
    choice: 'چه کار می‌خواهی بکنی؟',
    talk: 'گفت‌وگو با فروشنده',
    buy: 'خرید و معامله',
    leave: 'خروج به میدان',
    seller: 'فروشنده',
    backLobby: 'بازگشت به داخل فروشگاه',
    purchase: 'پیشخوان خرید',
    close: 'بستن فروشگاه',
  },
  en: {
    eyebrow: 'Shop interior',
    choice: 'What would you like to do?',
    talk: 'Talk to the shopkeeper',
    buy: 'Browse & buy',
    leave: 'Return to the square',
    seller: 'Shopkeeper',
    backLobby: 'Back to shop interior',
    purchase: 'Sales counter',
    close: 'Close shop',
  },
} as const;

interface ShopCopy { name: string; subtitle: string; greeting: string; detail: string }

export const SHOP_TEXT: Record<ShopId, Record<'fa' | 'en', ShopCopy>> = {
  seed: {
    fa: {
      name: 'بذر و نهال نصرت',
      subtitle: 'بذرهای فصل، کود، علوفه و بچه‌ماهی',
      greeting: 'بذرهای تازه روی طاقچه‌ها چیده شده؛ بگو برای کدام فصل و کدام زمین می‌خواهی.',
      detail: 'بسته‌ها بر اساس فصل و سطح مزرعه مرتب‌اند؛ از قفسهٔ سبز راست، بذر مناسب امروز را پیدا کن.',
    },
    en: {
      name: "Nosrat's Seeds & Saplings",
      subtitle: 'Seasonal seeds, fertiliser, feed and fingerlings',
      greeting: 'Fresh packets fill the shelves. Tell me which season and field you are planting for.',
      detail: 'Packets are sorted by season and farm level; the green shelf on the right holds today’s best choices.',
    },
  },
  market: {
    fa: {
      name: 'بازار و قراردادهای سارا',
      subtitle: 'خرید محصول مزرعه، نرخ روز و قراردادهای تحویل',
      greeting: 'جویبار محصول تازه پر شده؛ قبل از فروش، نرخ داغ امروز و ظرفیت قراردادها را ببین.',
      detail: 'ترازوی پیشخوان و تابلوی نرخ به‌روز است؛ محصول را از کوله، انبار یا هر دو عرضه کن.',
    },
    en: {
      name: "Sara's Market & Contracts",
      subtitle: 'Farm produce, daily prices and delivery contracts',
      greeting: 'The stalls are full of fresh produce. Check today’s hot prices and contract capacity before selling.',
      detail: 'The counter scale and price board are updated daily; sell from your backpack, barn, or both.',
    },
  },
  work: {
    fa: {
      name: 'کارگاه ماشین‌آلات کاوه',
      subtitle: 'تراکتور، برداشت خودکار، آبیاری و ارتقای انرژی',
      greeting: 'روی میز، نقشهٔ ماشین‌ها باز است؛ بگو کدام کار مزرعه را می‌خواهی خودکار کنی.',
      detail: 'ابزارها روی دیوار و قطعات روی کارگاه چیده شده‌اند؛ هر ماشین سه سطح ارتقا دارد.',
    },
    en: {
      name: "Kaveh's Machine Workshop",
      subtitle: 'Tractors, automated harvesting, irrigation and energy upgrades',
      greeting: 'Machine blueprints cover the bench. Tell me which farm chore you want to automate.',
      detail: 'Tools hang on the pegboard and parts line the workbench; every machine has three upgrade tiers.',
    },
  },
  animal: {
    fa: {
      name: 'دامداری و درمانگاه عمو مراد',
      subtitle: 'دام سالم، تخم‌گذار، خوراک، بهداشت و ارتقای حصار',
      greeting: 'بسترها تمیز و آخورها آماده است؛ برای هر دام، جنسیت و ظرفیت حصار را هم ببین.',
      detail: 'دام‌های نمایشی داخل حلبی‌آباد هستند؛ درمانگاه کنار قفسهٔ دارو برای دام‌های بیمار فعال است.',
    },
    en: {
      name: "Morad's Livestock & Veterinary Barn",
      subtitle: 'Healthy animals, laying stock, feed, care and pen upgrades',
      greeting: 'The bedding is clean and troughs are ready. Check sex and pen capacity for every animal.',
      detail: 'Display animals stay in clean stalls; the veterinary cabinet beside the medicine shelf treats sick stock.',
    },
  },
  carp: {
    fa: {
      name: 'نجاری استاد همایون',
      subtitle: 'ابزار، حصار، سیلو، گلخانه، استخر و مترسک',
      greeting: 'بوی چوب تازه و اره‌دانه همه‌جاست؛ سفارشت را روی نقشه بینداز تا دقیق ساخته شود.',
      detail: 'الوار روی داربست و الگوها روی میز است؛ سفارش‌ها در صف ساخت واقعی مزرعه ثبت می‌شوند.',
    },
    en: {
      name: 'Master Homayoun’s Carpentry',
      subtitle: 'Tools, pens, silos, greenhouses, ponds and scarecrows',
      greeting: 'Fresh timber and sawdust fill the workshop. Pin your order to the blueprint and we will build it precisely.',
      detail: 'Lumber rests on the rack and patterns cover the bench; orders enter the farm’s real construction queue.',
    },
  },
  estate: {
    fa: {
      name: 'دفتر اسناد و املاک رویا',
      subtitle: 'سند مزارع، منشور زمین و قرارداد نیروی کار',
      greeting: 'نقشهٔ مزارع روی دیوار و دفاتر سند روی میز است؛ هر خرید با مهر و سند روشن ثبت می‌شود.',
      detail: 'پروندهٔ دشت شمالی و باغ‌دره جدا است؛ آقا جهانگیر همچنان در میدان برای گفت‌وگوی سند و قسط حاضر است.',
    },
    en: {
      name: "Roya's Deeds & Estate Office",
      subtitle: 'Farm deeds, land charters and crew contracts',
      greeting: 'Farm maps hang above the deed ledgers. Every purchase is recorded with a clear seal and document.',
      detail: 'Northern Meadow and Sunlit Valley have separate files; Jahangir remains outside for debt and ledger talks.',
    },
  },
};
