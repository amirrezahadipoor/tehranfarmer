import { FT } from '../strings/frontierText';

export type CropId = 'wheat' | 'carrot' | 'corn' | 'tomato' | 'strawberry' | 'watermelon' | 'pumpkin' | 'saffron' | 'potato' | 'onion' | 'rice' | 'grape' | 'olive' | 'pepper' | 'cucumber' | 'sunflower' | 'fig' | 'plum' | 'cherry' | 'peach' | 'orange' | 'pomegranate' | 'pistachio' | 'rose';
export type GemId = 'quartz' | 'turquoise' | 'amber' | 'amethyst' | 'garnet' | 'opal' | 'sapphire' | 'emerald' | 'ruby' | 'diamond';
export type GoodId = CropId | 'egg' | 'milk' | 'wool' | 'feed' | 'honey' | 'fish' | 'roe' | 'cheese' | 'fingerling' | 'herb' | 'mushroom' | 'truffle' | GemId;
export type AnimalKind = 'chicken' | 'duck' | 'sheep' | 'goat' | 'cow' | 'rabbit';
export type MachineId = 'tractor' | 'seeder' | 'sprinkler' | 'harvester' | 'drone' | 'feeder' | 'collector';
export type AutoKey = 'till' | 'plant' | 'water' | 'harvest' | 'fert' | 'feed' | 'collect';

export interface CropDef {
  id: CropId;
  fa: string;
  seasons: number[]; // 0 بهار 1 تابستان 2 پاییز 3 زمستان
  days: number;
  seed: number;
  price: number;
  yield: [number, number];
  thirst: number; // مصرف آب در روز
  regrow?: number;
  maxH?: number;
  art?: 'bush' | 'vine' | 'tall' | 'root' | 'flower';
  lv: number; // سطح لازم برای باز شدن بذر
}

// ===== جدول محصولات — بالانس: سود خالص تقریبی هر بوته در روز به‌صورت تصاعدی بالا می‌رود =====
export const CROPS: CropDef[] = [
  { id: 'wheat', fa: GT.g62, seasons: [0, 2, 3], days: 1.8, seed: 10, price: 7, yield: [3, 4], thirst: 0.5, lv: 1 },
  { id: 'carrot', fa: GT.g63, seasons: [0, 2, 3], days: 1.8, seed: 13, price: 8, yield: [3, 4], thirst: 0.55, lv: 1 },
  { id: 'potato', fa: GT.g64, seasons: [0, 2], days: 2.5, seed: 18, price: 10, yield: [4, 6], thirst: 0.6, art: 'root', lv: 2 },
  { id: 'onion', fa: GT.g65, seasons: [0, 2, 3], days: 2.5, seed: 16, price: 9, yield: [3, 5], thirst: 0.5, art: 'root', lv: 2 },
  { id: 'corn', fa: GT.g66, seasons: [0, 1], days: 2.5, seed: 20, price: 11, yield: [3, 4], thirst: 0.7, lv: 1 },
  { id: 'cucumber', fa: GT.g67, seasons: [0, 1], days: 2.5, seed: 24, price: 12, yield: [4, 6], thirst: 0.8, regrow: 1, maxH: 3, art: 'vine', lv: 3 },
  { id: 'tomato', fa: GT.g68, seasons: [0, 1], days: 3, seed: 32, price: 9, yield: [4, 5], thirst: 0.8, regrow: 1, maxH: 3, lv: 4 },
  { id: 'strawberry', fa: GT.g69, seasons: [0], days: 2.5, seed: 45, price: 14, yield: [3, 4], thirst: 0.8, regrow: 1, maxH: 3, lv: 5 },
  { id: 'pepper', fa: GT.g70, seasons: [1], days: 3, seed: 38, price: 19, yield: [3, 5], thirst: 0.75, regrow: 1, maxH: 3, lv: 5 },
  { id: 'rice', fa: GT.g71, seasons: [1], days: 3.2, seed: 40, price: 26, yield: [3, 5], thirst: 1.1, art: 'tall', lv: 6 },
  { id: 'sunflower', fa: GT.g72, seasons: [0, 1], days: 3.7, seed: 50, price: 38, yield: [2, 4], thirst: 0.6, art: 'flower', lv: 6 },
  { id: 'watermelon', fa: GT.g73, seasons: [1], days: 3.7, seed: 55, price: 41, yield: [2, 3], thirst: 0.9, lv: 7 },
  { id: 'pumpkin', fa: GT.g74, seasons: [1, 2], days: 3.7, seed: 42, price: 32, yield: [2, 3], thirst: 0.6, lv: 7 },
  { id: 'grape', fa: GT.g75, seasons: [1, 2], days: 3.9, seed: 70, price: 38, yield: [3, 5], thirst: 0.7, regrow: 1.7, maxH: 3, art: 'vine', lv: 8 },
  { id: 'olive', fa: GT.g76, seasons: [2, 3], days: 4.6, seed: 90, price: 53, yield: [2, 4], thirst: 0.4, regrow: 1.7, maxH: 3, art: 'vine', lv: 10 },
  { id: 'saffron', fa: GT.g77, seasons: [2], days: 4.6, seed: 130, price: 229, yield: [1, 1], thirst: 0.5, lv: 12 },
  { id: 'fig', fa: GT.g78, seasons: [1, 2], days: 5.2, seed: 260, price: 81, yield: [3, 5], thirst: 0.55, regrow: 1.7, maxH: 4, art: 'vine', lv: 14 },
  { id: 'plum', fa: GT.g79, seasons: [1, 2], days: 5.2, seed: 300, price: 101, yield: [3, 4], thirst: 0.5, regrow: 1.7, maxH: 4, art: 'bush', lv: 16 },
  { id: 'cherry', fa: GT.g80, seasons: [0, 1], days: 5.8, seed: 380, price: 140, yield: [3, 4], thirst: 0.55, regrow: 1.7, maxH: 4, art: 'bush', lv: 18 },
  { id: 'peach', fa: GT.g81, seasons: [0, 1], days: 6.4, seed: 460, price: 176, yield: [2, 4], thirst: 0.6, regrow: 1.7, maxH: 5, art: 'bush', lv: 20 },
  { id: 'orange', fa: GT.g82, seasons: [1, 2], days: 6.9, seed: 560, price: 247, yield: [3, 5], thirst: 0.65, regrow: 1.7, maxH: 5, art: 'bush', lv: 22 },
  { id: 'pomegranate', fa: GT.g83, seasons: [1, 2], days: 7.5, seed: 720, price: 332, yield: [2, 4], thirst: 0.6, regrow: 2.3, maxH: 5, art: 'bush', lv: 24 },
  { id: 'pistachio', fa: GT.g84, seasons: [1, 2], days: 8.6, seed: 1150, price: 639, yield: [2, 3], thirst: 0.45, regrow: 2.3, maxH: 6, art: 'tall', lv: 27 },
  { id: 'rose', fa: GT.g85, seasons: [0, 1], days: 4.1, seed: 900, price: 498, yield: [2, 3], thirst: 0.7, regrow: 1, maxH: 4, art: 'flower', lv: 30 },
];

export const CROP: Record<string, CropDef> = Object.fromEntries(CROPS.map((c) => [c.id, c]));

export const GOODS: { id: GoodId; fa: string; base: number }[] = [
  ...CROPS.map((c) => ({ id: c.id as GoodId, fa: c.fa, base: c.price })),
  { id: 'egg', fa: GT.g86, base: 9 },
  { id: 'milk', fa: GT.g87, base: 40 },
  { id: 'wool', fa: GT.g88, base: 60 },
  { id: 'cheese', fa: GT.g89, base: 85 },
  { id: 'fish', fa: GT.g90, base: 55 },
  { id: 'roe', fa: GT.g91, base: 160 },
  { id: 'honey', fa: GT.g92, base: 120 },
  { id: 'fingerling', fa: GT.g93, base: 30 },
  { id: 'feed', fa: GT.g94, base: 6 },
  { id: 'herb', get fa() { return FT.goodHerb; }, base: 48 },
  { id: 'mushroom', get fa() { return FT.goodMushroom; }, base: 95 },
  { id: 'truffle', get fa() { return FT.goodTruffle; }, base: 290 },
  { id: 'quartz', get fa() { return FT.goodQuartz; }, base: 80 },
  { id: 'turquoise', get fa() { return FT.goodTurquoise; }, base: 215 },
  { id: 'amber', get fa() { return FT.goodAmber; }, base: 460 },
  { id: 'amethyst', get fa() { return FT.goodAmethyst; }, base: 650 },
  { id: 'garnet', get fa() { return FT.goodGarnet; }, base: 900 },
  { id: 'opal', get fa() { return FT.goodOpal; }, base: 1400 },
  { id: 'sapphire', get fa() { return FT.goodSapphire; }, base: 2400 },
  { id: 'emerald', get fa() { return FT.goodEmerald; }, base: 3800 },
  { id: 'ruby', get fa() { return FT.goodRuby; }, base: 6500 },
  { id: 'diamond', get fa() { return FT.goodDiamond; }, base: 12000 },
];
export const GOOD: Record<string, { id: GoodId; fa: string; base: number }> = Object.fromEntries(GOODS.map((g) => [g.id, g]));

export const SEASONS = [GT.g95, GT.g96, GT.g97, GT.g98];

export interface AnimalDef { fa: string; price: number; eat: number; prod: GoodId; qty: number; cap: number; every: number; grow: number; baby: string; lv: number }
export const ANIMALS: Record<AnimalKind, AnimalDef> = {
  chicken: { fa: GT.g99, price: 150, eat: 0, prod: 'egg', qty: 2, cap: 8, every: 1, grow: 3, baby: GT.g100, lv: 1 },
  rabbit: { fa: GT.g101, price: 260, eat: 0.35, prod: 'wool', qty: 1, cap: 12, every: 1, grow: 2, baby: GT.g102, lv: 4 },
  duck: { fa: GT.g103, price: 220, eat: 0, prod: 'egg', qty: 3, cap: 10, every: 1, grow: 3, baby: GT.g104, lv: 5 },
  sheep: { fa: GT.g105, price: 450, eat: 1, prod: 'wool', qty: 1, cap: 4, every: 2, grow: 4, baby: GT.g106, lv: 7 },
  goat: { fa: GT.g107, price: 520, eat: 1, prod: 'cheese', qty: 1, cap: 4, every: 2, grow: 4, baby: GT.g108, lv: 9 },
  cow: { fa: GT.g109, price: 800, eat: 1.5, prod: 'milk', qty: 1, cap: 6, every: 1, grow: 5, baby: GT.g110, lv: 11 },
};

// ===== دستگاه‌ها: هر دستگاه ۳ مدل (MK) — مدل‌های بالاتر گران‌تر و قوی‌تر =====
export interface MachineDef { fa: string; price: number; auto: AutoKey; icon: string; desc: string; lv: number }
export const MACHINES: Record<MachineId, MachineDef> = {
  feeder: { fa: GT.g111, price: 1900, auto: 'feed', icon: 'feeder', desc: GT.g112, lv: 3 },
  sprinkler: { fa: GT.g113, price: 2400, auto: 'water', icon: 'sprinkler', desc: GT.g114, lv: 4 },
  tractor: { fa: GT.g115, price: 3200, auto: 'till', icon: 'tractor', desc: GT.g116, lv: 5 },
  seeder: { fa: GT.g117, price: 2800, auto: 'plant', icon: 'seeder', desc: GT.g118, lv: 6 },
  harvester: { fa: GT.g119, price: 5200, auto: 'harvest', icon: 'harvester', desc: GT.g120, lv: 7 },
  collector: { fa: GT.g121, price: 3600, auto: 'collect', icon: 'collector', desc: GT.g122, lv: 8 },
  drone: { fa: GT.g123, price: 4200, auto: 'fert', icon: 'drone', desc: GT.g124, lv: 9 },
};
export const MACHINE_LIST = ['feeder', 'sprinkler', 'tractor', 'seeder', 'harvester', 'collector', 'drone'] as MachineId[];

/** ضرایب قیمت مدل‌ها: MK1 ×۱، MK2 ×۱۲، MK3 ×۶۰ */
export const MK_PRICE_MULT = [1, 12, 60];
/** MK2 به ۶ سطح و MK3 به ۱۲ سطح بالاتر از سطح پایه‌ی دستگاه نیاز دارد */
export const MK_LV_STEP = [0, 6, 12];
export const machineMkPrice = (id: MachineId, mk: number) => MACHINES[id].price * MK_PRICE_MULT[mk - 1];
export const machineMkLv = (id: MachineId, mk: number) => MACHINES[id].lv + MK_LV_STEP[mk - 1];

// افکت‌های مدل‌ها (اندیس = مدل دستگاه ۱..۳) — تفاوت صنعتی واقعی نسبت به کارگر دستی
export const MK_SPEED = [1, 0.55, 0.42, 0.32];              // ضرب زمان انجام کار (بازیکن/کارگر)
export const MK_HARVEST = [0, 0, 0.18, 0.38];               // کمباین: +۱۸٪ / +۳۸٪ افزایش محصول (مدل ۱: درو ردیفی خودکار)
export const MK_FERTSOIL = [0, 0, 0.06, 0.12];              // تراکتور: تقویت خودکار خاک با شخم عمیق مدل ۲ و ۳
export const MK_FERTADD = [0, 0.5, 0.7, 1];                 // پهپاد: کوددهی قوی‌تر (۰٫۵ / ۰٫۷ / ۱٫۰ کامل)
export const MK_FERTSAVE = [0, 0.2, 0.5, 0.75];             // پهپاد: شانس مصرف نشدن کیسهٔ کود
export const MK_SEEDSAVE = [0, 0, 0.25, 0.5];               // کاشت‌کار: ۲۵٪ / ۵۰٪ بذر رایگان در مدل ۲ و ۳
export const MK_THIRST = [1, 1, 0.85, 0.7];                 // آب‌پاش: ۱۵٪ / ۳۰٪ کاهش مصرف آب
export const MK_GROW = [1, 1, 1.08, 1.18];                  // آب‌پاش: شتاب رشد گیاه با نقش زراعت یا مهارت آبیاری
export const MK_EAT = [1, 1, 0.85, 0.7];                    // آخور هوشمند: ۱۵٪ / ۳۰٪ کاهش مصرف علوفه
export const MK_BREED = [1, 1, 1.12, 1.24];                 // آخور هوشمند: شتاب زادوولد دام با نقش دامداری
export const MK_COLLECT = [1, 1, 1.1, 1.22];                // ربات جمع‌آور: بازده بیشتر دام با نقش دامداری یا مهارت دامپروری
export const MK_BATCH = [0, 84, 114, 999];                 // ظرفیت پردازش مزارع اقماری در هر چرخه (مدل ۱: ۸۴، مدل ۲: ۱۱۴، مدل ۳: تمام کرت‌ها)
export const MK_FA = ['', GT.g125, GT.g126, GT.g127];

// ثابت‌های مهارت‌های RPG، صمیمیت اهالی و دکوراسیون حیاط
export const HEART_BOND_2 = 40;
export const HEART_BOND_5 = 100;
export const SKILL_TRADE1_MULT = 1.1;
export const SKILL_RANCH3_MULT = 1.25;
export const SKILL_NAT3_ROE_MULT = 1.5;
export const ROE_RATE_CAP = 0.85;
export const SARA5_DEMAND_DECAY = 0.99;
export const SARA2_CONTRACT_MULT = 1.12;
export const MORAD2_QUALITY_MULT = 1.12;
export const KAVEH2_PRICE_MULT = 0.9;
export const JAHANGIR2_INT_MULT = 0.85;
export const JAHANGIR5_RAID_MULT = 0.8;
export const SHEEPDOG_RAID_MULT = 0.7;
export const TILEPOOL_BONUS_CAN = 12;

export const AUTO_FA: Record<AutoKey, string> = {
  till: GT.g128, plant: GT.g129, water: GT.g130, harvest: GT.g131, fert: GT.g132, feed: GT.g133, collect: GT.g134,
};

// ===== حصارهای اختصاصی هر گونهٔ دام (به‌جای محوطهٔ مشترک) =====
export const PEN_KINDS = ['chicken', 'rabbit', 'duck', 'sheep', 'goat', 'cow'] as AnimalKind[];
export const PEN_CAP_LV = [0, 3, 5, 8];                       // ظرفیت بر اساس سطح حصار (۱ تا ۳)
export const ANIMAL_RESALE_RATE = 0.65;
export const ANIMAL_SELL_XP = 6;
export const PEN_BUILD: Record<AnimalKind, number> = { chicken: 450, rabbit: 1100, duck: 1500, sheep: 2800, goat: 3800, cow: 6000 };
export const PEN_UP = [0, 1800, 7500];                         // هزینهٔ ارتقا به سطح ۲ و ۳ (اندیس سطح فعلی)
// ===== گلخانه: کشت خارج‌فصل و رشد سریع‌تر روی زمین‌های شیشه‌ای =====
export const GH_PRICE = [42000, 140000];                       // سطح ۱ و ۲
export const GH_LV = [12, 20];
export const GH_SPEED = [1, 1.25, 1.5];                        // ضرایب رشد روی زمین گلخانه‌ای
const ghCoversRaw = (gh: number, i: number, COLS: number, ROWS: number): boolean => {
  if (gh <= 0) return false;
  const c = i % COLS, r = Math.floor(i / COLS);
  return c >= COLS - 2 && r < (gh >= 2 ? ROWS : 2);            // دو ستون سمت راست
};
// ===== سیلوی خوراک: ظرفیت آخور = TROUGH_CAP × این ضرایب =====
export const SILO_PRICE = [36000, 115000];
export const SILO_LV = [10, 18];
export const SILO_MULT = [1, 2, 3];

export const TROUGH_CAP = 24;
/** مقیاس زمانی جهانی: هر «روزِ بازی» ۲ برابر بلندتر از پایه است؛ همهٔ جریان‌های روزانه با همین ضریب جبران می‌شوند تا سرعت پیشرفتِ واقعی (به وقت واقعی) حفظ شود */
export const DAY_RATE = 2;
/** ضریب کشش روز خورشیدی زنده: روزهای زنده ۲٫۵ برابر بلندترند (۸ دقیقه به‌جای ۳ دقیقه و ۱۲ ثانیه) بدون کند شدن رسیدگی محصولات یا برهم‌خوردن اقتصاد روزانه */
export const LIVE_DAY_STRETCH = 2.5;
/** طول واقعی یک شبانه‌روز زنده بر بوم بازی (ثانیهٔ واقعی = ۴۸۰ ثانیه = ۸ دقیقه) */
export const LIVE_DAY_SECONDS = 96 * DAY_RATE * LIVE_DAY_STRETCH;
/** هزینهٔ زمانی عبور از دروازه‌های بین ۸ ناحیه (۱۵ دقیقه به‌جای ۱٫۵ ساعت تا گشت‌وگذار آزاد روز را نسوزاند) */
export const PORTAL_TRAVEL_HOURS = 0.25;
export const FERT_PRICE = 40;
export const FEED_PRICE = 9;

// ===== کارگران مزرعه — تا ۵ نفر برای پوشش هر ۳ مزرعه =====
export const WORKER_PRICES = [900, 6000, 25000, 75000, 175000];
export const WORKER_LV = [2, 6, 12, 20, 25];
export const WORKER_MAX = 5;
export const WORKER_WAGE = 60;
/** ضریب تولید عسل در هر فصل (بهار، تابستان، پاییز، زمستان) — منبع واحد برای شبیه‌ساز روزانه و زنده */
export const HONEY_SEASON_MULT = [1.5, 2, 1, 1] as const;
/** بازهٔ شب: از ساعت ۱۹٫۵ تا ۵٫۵ (منبع واحد برای نور، بازیابی نیرو، زنبور و صدا) */
export const NIGHT_START_H = 19.5;
export const NIGHT_END_H = 5.5;
/** ساعتی که هشدار کسری دستمزد کارگران داده می‌شود (پیش از سررسید شبانه) */
export const WAGE_WARN_HOUR = 20;

export const COLS = 8;
export const ROWS = 5;
/** اسناد توسعهٔ مزارع بزرگ (دشت شمالی ۵۴ کرت، قنات شمالی، باغ‌دره ۶۰ کرت، منشور سه‌مزرعه) */
export const LAND_PRICES = [3500, 18000, 90000, 426000];

// ===== ارتقاهای ابزار — هرکدام ۵ مرحله =====
export const HOE_PRICES = [300, 800, 2400, 9000, 40000];
export const CAN_PRICES = [250, 700, 2200, 8000, 35000];
export const BAG_PRICES = [300, 800, 2000, 6000, 22000, 90000];
export const STAM_PRICES = [400, 1200, 3600, 14000, 60000];
export const HOE_SPEED = [1, 1.4, 1.9, 2.5, 3.2, 4];
export const HOE_COST = [1, 0.7, 0.5, 0.35, 0.22, 0.15];
export const CAN_CAP = [16, 32, 60, 110, 180, 300];
export const BAG_CAP = [40, 80, 160, 320, 640, 1100, 1800];
// ===== کولهٔ پشتی (حملِ بازیکن) و انبار مزرعه (ذخیرهٔ جدا) — دو سیستم مستقل =====
export const PACK_CAP = [80, 160, 320, 640, 1000, 1600, 2400];  // ظرفیت کولهٔ پشتی بازیکن (بزرگ برای کم کردن رفت‌وبرگشت به انبار)
export const BARN_CAP = [40, 80, 160, 320, 640, 1100, 1800]; // ظرفیت انبار (منحنی قدیمی کیف — ثبات اقتصاد بات/شبیه‌ساز)
export const BARN_PRICES = [300, 800, 2000, 6000, 22000, 90000]; // قیمت ارتقای انبار (برابر منحنی قدیمی)
export const STAM_CAP = [200, 280, 400, 560, 760, 1040];
export const STAM_REGEN = [7, 7, 8, 9, 10.4, 12];
/** حداقل سطح لازم برای هر مرحله‌ی ارتقا (اندیس = سطح فعلی) */
export const UP_LV: Record<'hoe' | 'can' | 'bag' | 'stam' | 'barn', number[]> = {
  hoe: [0, 2, 5, 9, 14], can: [0, 3, 6, 10, 15], bag: [0, 2, 4, 8, 12, 16], stam: [0, 2, 5, 9, 14],
  barn: [0, 2, 4, 8, 12, 16],
};

// ===== خاک طلایی — سینک پایان‌بازی =====
export const SOIL_PRICES = [250000, 850000, 3800000];
export const SOIL_LV = [15, 20, 25];
export const SOIL_BONUS = 0.12; // +۱۲٪ محصول به‌ازای هر مرحله

// ===== ماهیگیری و پرورش ماهی =====
export const FISH_STAM = 4;
export const ROD_PRICE = 1400;
export const ROD_LV = 3;
export const POND_MAX = 5;
export const POND_LV = [2, 5, 9, 13, 17];
export const pondPrice = (n: number) => Math.round(2500 * Math.pow(4.3, n)); // ۲۵۰۰، ۱۰هزار، ۴۰هزار، ...
export const FINGER_PRICE = 45;
export const POND_GROW_DAYS = 3;
export const POND_YIELD: [number, number] = [6, 12];
export const POND_FEED = 1;
export const POND_FEED_BATCH = 8;
export const POND_FEED_CAP = 12;
export const POND_ROE_CHANCE = 0.3;

// ===== ضرایب بازار و قیمت زمین =====
export const SEASON_IN_MULT = 0.95;
export const SEASON_OUT_MULT = 1.4;
export const CITY_VISIT_MULT_CAP = 1.2;
export const CITY_VISIT_STEP = 0.04;
export const WEALTH_MULT_CAP = 2.4;
export const WEALTH_DIVISOR = 60000;
export const DEMAND_FLOOR = 0.66;
export const DEMAND_DECAY = 0.972;
export const SEED_DEMAND_CAP = 1.35;
export const SEED_DEMAND_GROW = 1.01;

// ===== ثابت‌های رویدادهای فصلی، دام‌پزشکی، چاه و قرارداد بازار (فاز ۶) =====
export const EVENT_MIN_DAY = 14;
export const EVENT_CHANCE = 0.08;
export const EVENT_FESTIVAL_COINS = 180;
export const EVENT_DROUGHT_WATER = 0.25;
export const EVENT_FLOOD_FERT_LOSS = 0.06;
export const EVENT_GUEST_DEMAND = 1.12;
export const EVENT_HOT_DEMAND = 1.22;
export const EVENT_YALDA_STANDING = 6;
export const MEDICINE_PRICE = 95;
export const ANIMAL_SICK_MIN_DAY = 21;
export const ANIMAL_SICK_MOD = 8;
export const ANIMAL_QUALITY_BONUS = 0.15;
export const CONTRACT_DEPOSIT_MIN = 10;
export type BuildKind = 'upgrade' | 'machine' | 'pond' | 'hive' | 'worker' | 'soil' | 'pen' | 'penup' | 'gh' | 'silo' | 'scarecrow' | 'well';
export const WELL_PRICES = [1200, 5400, 19000];
export const WELL_LV_REQ = [2, 7, 13];
export const WELL_WATER_RETENTION = [1, 0.94, 0.88, 0.82];
export const WELL_BONUS_CAN = [0, 8, 18, 34];
export const ROTATION_FERT_BONUS = 0.05;
export const CONTRACT_REWARD_MULT = 1.45;
export const CONTRACT_DEPOSIT_RATE = 0.25;
export const CONTRACT_DAYS = 5;
export const CONTRACT_MIN_QTY = 6;
export const CONTRACT_MAX_QTY = 18;
export const MUSEUM_GIFT_COINS = 25000;

// ===== زنبورداری =====
export const HIVE_MAX = 12;
export const HIVE_LV = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24];
export const hivePrice = (n: number) => Math.round(1600 * Math.pow(2.08, n));
export const HONEY_CAP_PER_HIVE = 28;

// ===== سطح و تجربه =====
export const LEVEL_CAP = 30;
export const XP_A = 75;
export const XP_B = 82;
/** تجربه‌ی لازم برای رفتن از سطح n به n+1 — تابع توان‌دار: اوایل نرم، انتها پرشیب */
export const xpNeed = (n: number) => Math.round(XP_A * Math.pow(n, 2.33) + XP_B * n);
/** پاداش سکه‌ای هر سطح */
export const lvReward = (n: number) => Math.round(60 * Math.pow(n, 1.6));
/** مقادیر تجربه برای رویدادها */
export const XP = {
  plant: 1, harvestBase: 3, harvestPerPrice: 13, sellPer: 29, collect: 2, fish: 10,
  pond: 40, roe: 20, honey: 3, baby: 40, buildBase: 25, buildPer: 250,
};

// ===== کارگر ساختمان (کارگر شهر برای ارتقاها) =====
export function buildDur(price: number): number { return Math.min(32, 7 + price / 2200); }

// ===== دستاوردها =====
export interface AchTier { n: number; reward: number }
export interface AchDef { id: string; icon: string; fa: string; stat: string; tiers: AchTier[] }
export const ACHS: AchDef[] = [
  { id: 'plants', icon: 'plant', fa: GT.g135, stat: 'plants', tiers: [{ n: 40, reward: 120 }, { n: 250, reward: 500 }, { n: 1000, reward: 2200 }, { n: 5000, reward: 9000 }, { n: 20000, reward: 40000 }] },
  { id: 'harv', icon: 'sickle', fa: GT.g136, stat: 'harv', tiers: [{ n: 50, reward: 150 }, { n: 300, reward: 650 }, { n: 1200, reward: 3000 }, { n: 5000, reward: 12000 }, { n: 20000, reward: 55000 }] },
  { id: 'earned', icon: 'coin', fa: GT.g137, stat: 'earned', tiers: [{ n: 5000, reward: 250 }, { n: 50000, reward: 1500 }, { n: 300000, reward: 8000 }, { n: 2000000, reward: 40000 }, { n: 12000000, reward: 200000 }] },
  { id: 'fish', icon: 'fish', fa: GT.g138, stat: 'fish', tiers: [{ n: 10, reward: 200 }, { n: 60, reward: 900 }, { n: 250, reward: 4000 }, { n: 1000, reward: 18000 }] },
  { id: 'pond', icon: 'pond', fa: GT.g139, stat: 'pondH', tiers: [{ n: 3, reward: 300 }, { n: 15, reward: 1400 }, { n: 60, reward: 6500 }, { n: 200, reward: 28000 }] },
  { id: 'honey', icon: 'honey', fa: GT.g140, stat: 'honey', tiers: [{ n: 15, reward: 250 }, { n: 100, reward: 1200 }, { n: 500, reward: 6000 }, { n: 2500, reward: 26000 }, { n: 10000, reward: 120000 }] },
  { id: 'babies', icon: 'nest', fa: GT.g141, stat: 'babies', tiers: [{ n: 2, reward: 250 }, { n: 10, reward: 1200 }, { n: 40, reward: 5500 }, { n: 150, reward: 26000 }] },
  { id: 'collect', icon: 'egg', fa: GT.g142, stat: 'collect', tiers: [{ n: 30, reward: 150 }, { n: 200, reward: 800 }, { n: 800, reward: 3800 }, { n: 3200, reward: 17000 }] },
  { id: 'builds', icon: 'hammer', fa: GT.g143, stat: 'builds', tiers: [{ n: 2, reward: 300 }, { n: 8, reward: 1500 }, { n: 20, reward: 7000 }, { n: 40, reward: 32000 }] },
  { id: 'level', icon: 'medal', fa: GT.g144, stat: 'level', tiers: [{ n: 5, reward: 500 }, { n: 10, reward: 2500 }, { n: 15, reward: 9000 }, { n: 20, reward: 30000 }, { n: 25, reward: 90000 }, { n: 30, reward: 250000 }] },
  { id: 'animals', icon: 'cow', fa: GT.g145, stat: 'animals', tiers: [{ n: 4, reward: 250 }, { n: 8, reward: 1200 }, { n: 12, reward: 5000 }, { n: 16, reward: 18000 }] },
  { id: 'day', icon: 'sun', fa: GT.g146, stat: 'day', tiers: [{ n: 30, reward: 400 }, { n: 90, reward: 2000 }, { n: 200, reward: 8000 }, { n: 500, reward: 30000 }, { n: 1200, reward: 120000 }] },
  { id: 'debtPaid', icon: 'ledger', fa: GT.achDebtPaid, stat: 'debtPaid', tiers: [{ n: 15000, reward: 250 }, { n: 250000, reward: 1200 }, { n: 1500000, reward: 5000 }, { n: 6000000, reward: 25000 }] },
  { id: 'chapter', icon: 'note', fa: GT.achChapter, stat: 'chapter', tiers: [{ n: 2, reward: 200 }, { n: 4, reward: 900 }, { n: 6, reward: 3500 }, { n: 7, reward: 15000 }] },
  { id: 'scarecrow', icon: 'scarecrow', fa: GT.achScarecrow, stat: 'scarecrow', tiers: [{ n: 1, reward: 180 }, { n: 2, reward: 600 }, { n: 3, reward: 1800 }] },
  { id: 'stash', icon: 'stash', fa: GT.achStash, stat: 'stash', tiers: [{ n: 2000, reward: 150 }, { n: 25000, reward: 700 }, { n: 150000, reward: 2800 }] },
  { id: 'quests', icon: 'scroll', fa: GT.achQuests, stat: 'quests', tiers: [{ n: 3, reward: 180 }, { n: 15, reward: 750 }, { n: 50, reward: 2600 }, { n: 120, reward: 8000 }] },
  { id: 'contracts', icon: 'contract', fa: GT.achContracts, stat: 'contracts', tiers: [{ n: 1, reward: 220 }, { n: 5, reward: 900 }, { n: 15, reward: 3200 }, { n: 40, reward: 10000 }] },
  { id: 'artisan', icon: 'saffron', fa: GT.achArtisan, stat: 'artisan', tiers: [{ n: 3, reward: 300 }, { n: 15, reward: 1600 }, { n: 60, reward: 7500 }, { n: 200, reward: 32000 }] },
  { id: 'secrets', icon: 'star', fa: GT.achSecrets, stat: 'secrets', tiers: [{ n: 1, reward: 1500 }, { n: 3, reward: 8000 }, { n: 5, reward: 30000 }, { n: 8, reward: 120000 }] },
];

export interface PondS { id: number; stocked: boolean; grow: number; feed: number }
export interface BuildJob { id: number; kind: BuildKind; key: string; label: string; icon: string; prog: number; dur: number }

import { totalPlotsForLand } from './estates';

export function ghCovers(gh: number, i: number, cols: number, rows: number, _land: number): boolean {
  return ghCoversRaw(gh, i, cols, rows);
}
/** همهٔ ۴۰ کرت مزرعهٔ اصلی از روز اول بدون هیچ قفلی کاملاً باز هستند */
export function isUnlocked(i: number, _land: number): boolean {
  void _land;
  return i >= 0 && i < COLS * ROWS;
}
export function plotsOf(land: number): number {
  return totalPlotsForLand(land);
}

// نمایش اعداد فارسی از ماژول مشترک strings/fa می‌آید (قاعدهٔ AGENTS: متن فارسی بیرون از منطق)
export { fa, faClock, faDec, faPct, faDays } from '../strings/fa';
import { fa as faNum } from '../strings/fa';
/** سقف/نسبت عددی فارسی برای نمودارها و برچسب‌های کوتاه */
export const faShort = faNum;

import { GT, locText } from '../strings/gameText';

function bindLocProp<T extends object>(obj: T, prop: keyof T & string) {
  if (Object.getOwnPropertyDescriptor(obj, prop)?.get) return;
  const raw = String(obj[prop]);
  Object.defineProperty(obj, prop, { get: () => locText(raw), enumerable: true });
}
for (const c of CROPS) bindLocProp(c, 'fa');
for (const g of GOODS) bindLocProp(g, 'fa');
for (const d of Object.values(ANIMALS)) { bindLocProp(d, 'fa'); bindLocProp(d, 'baby'); }
for (const m of Object.values(MACHINES)) { bindLocProp(m, 'fa'); bindLocProp(m, 'desc'); }
for (const a of ACHS) bindLocProp(a, 'fa');
for (let i = 0; i < SEASONS.length; i++) bindLocProp(SEASONS, i as unknown as never);
for (let i = 1; i < MK_FA.length; i++) bindLocProp(MK_FA, i as unknown as never);
for (const k of Object.keys(AUTO_FA) as AutoKey[]) bindLocProp(AUTO_FA, k);