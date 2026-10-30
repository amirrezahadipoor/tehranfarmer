// Bilingual (FA + EN) Strings & Letter Templates for the Hand-Drawn Village Postbox System
// Strictly inside src/strings/ so `npm run lint:fa` stays 100% clean; zero emojis anywhere; Persian digits via fa().
import { CFG } from '../game/settings';
import { GT } from './gameText';
import { buildJobLabel } from '../game/core/build';
import type { BuildJob } from '../game/data';
import { fa } from './fa';

export type MailSenderId = 'grandma' | 'sara' | 'rancher' | 'engineer' | 'jahangir' | 'herald';
export type MailCategory = 'story' | 'world' | 'trade' | 'quest';

export interface MailItemGrant {
  kind: 'coin' | 'seed' | 'good' | 'fert' | 'stamina';
  id?: string;
  qty: number;
}

export interface MailTradeOffer {
  good: string;
  qty: number;
  reward: number;
  xp: number;
  standing: number;
  dueDay: number;
  fulfilled?: boolean;
}

export interface MailEntry {
  id: string;
  day: number;
  season: number;
  category: MailCategory;
  sender: MailSenderId;
  template: string;
  params?: Record<string, string | number>;
  read: boolean;
  pinned?: boolean;
  parcel?: MailItemGrant[];
  claimed?: boolean;
  trade?: MailTradeOffer;
  questNpc?: Exclude<MailSenderId, 'herald'>;
  questTitleFa?: string;
  questTitleEn?: string;
}

export interface MailState {
  inbox: MailEntry[];
  sentKeys: Record<string, boolean>;
  lastDealDay: number;
}

const isEn = () => CFG.locale === 'en';
const num = (v: number | string) => (isEn() ? String(v) : fa(Number(v)));

export const SENDER_META: Record<MailSenderId, {
  icon: string;
  sealColor: string;
  sealRing: string;
  nameFa: string;
  nameEn: string;
  roleFa: string;
  roleEn: string;
  stampFa: string;
  stampEn: string;
}> = {
  grandma: {
    icon: 'heart',
    sealColor: '#c94a5a',
    sealRing: '#f6d0d6',
    nameFa: 'مادربزرگ نصرت',
    nameEn: 'Grandma Nosrat',
    roleFa: 'بزرگ خاندان مزرعه',
    roleEn: 'Matriarch of the Homestead',
    stampFa: 'پست ایوان خانه',
    stampEn: 'Cottage Porch Post',
  },
  sara: {
    icon: 'market',
    sealColor: '#d4881e',
    sealRing: '#fde7b6',
    nameFa: 'سارا بازرگان',
    nameEn: 'Sara the Merchant',
    roleFa: 'امین حجره و بازار دهکده',
    roleEn: 'Village Market Guildmaster',
    stampFa: 'مهر حجرهٔ بازار',
    stampEn: 'Market Guild Seal',
  },
  rancher: {
    icon: 'cow',
    sealColor: '#3d8b46',
    sealRing: '#cdeccd',
    nameFa: 'عمو مراد دامدار',
    nameEn: 'Uncle Morad',
    roleFa: 'استاد دامستان و شیلات رودخانه',
    roleEn: 'Master Rancher & River Angler',
    stampFa: 'پست مرتع و رود',
    stampEn: 'Pasture & River Post',
  },
  engineer: {
    icon: 'gear',
    sealColor: '#2f6da8',
    sealRing: '#cbe3fb',
    nameFa: 'مهندس کاوه',
    nameEn: 'Engineer Kaveh',
    roleFa: 'طراح ماشین‌آلات و قنات دره',
    roleEn: 'Chief Agronomist & Machinist',
    stampFa: 'دفتر فنی کارگاه',
    stampEn: 'Workshop Bureau',
  },
  jahangir: {
    icon: 'ledger',
    sealColor: '#8c2828',
    sealRing: '#f2c2c2',
    nameFa: 'جهانگیرخان',
    nameEn: 'Jahangir Khan',
    roleFa: 'صراف و دارندهٔ اسناد دهکده',
    roleEn: 'Note Holder & Ledger Keeper',
    stampFa: 'ثبت رسمی دفتر کل',
    stampEn: 'Official Ledger Notice',
  },
  herald: {
    icon: 'scroll',
    sealColor: '#7a52a8',
    sealRing: '#e4d4f7',
    nameFa: 'پیک دهکدهٔ رنگین',
    nameEn: 'Valley Courier Gazette',
    roleFa: 'خبرنامهٔ چهارفصل و رویدادها',
    roleEn: 'Chronicle of Seasons & World News',
    stampFa: 'پیک رسمی دهکده',
    stampEn: 'Valley Royal Post',
  },
};

export const MAIL_UI = {
  get title() { return isEn() ? 'Village Postbox' : 'صندوق پست دهکده'; },
  get subtitle() { return isEn() ? 'Letters, contracts, quests & parcels' : 'نامه، قرارداد، کوئست و بستهٔ هدیه'; },
  get tabAll() { return isEn() ? 'All' : 'همه'; },
  get tabStory() { return isEn() ? 'Story' : 'داستان'; },
  get tabWorld() { return isEn() ? 'Events' : 'رویداد'; },
  get tabTrade() { return isEn() ? 'Trade' : 'معامله'; },
  get tabQuest() { return isEn() ? 'Gifts' : 'هدیه'; },
  get markAllRead() { return isEn() ? 'Mark All Read' : 'خواندن همه'; },
  get unreadTag() { return isEn() ? 'New' : 'جدید'; },
  get readTag() { return isEn() ? 'Read' : 'خوانده‌شده'; },
  get chooseLetter() { return isEn() ? 'Choose a letter to unseal it' : 'یک نامه را برای گشودن انتخاب کن'; },
  get sealedUntilOpened() { return isEn() ? 'New letters stay sealed and unread until you explicitly open them.' : 'نامه‌های جدید تا زمانی که خودت آن‌ها را باز کنی، مهروموم و خوانده‌نشده می‌مانند.'; },
  get backToLetters() { return isEn() ? 'Back to Letters' : 'بازگشت به فهرست نامه‌ها'; },
  get parcelReady() { return isEn() ? 'Enclosed Parcel' : 'بستهٔ پیوست'; },
  get claimParcelBtn() { return isEn() ? 'Claim Parcel' : 'دریافت بسته'; },
  get parcelClaimed() { return isEn() ? 'Parcel Added to Homestead' : 'بستهٔ پیوست دریافت شد'; },
  get dealBoxTitle() { return isEn() ? 'Courier Wholesale Order' : 'سفارش عمدهٔ پستی'; },
  get fulfillDealBtn() { return isEn() ? 'Send & Collect' : 'ارسال و دریافت وجه'; },
  get dealFulfilled() { return isEn() ? 'Order Delivered & Settled' : 'سفارش تحویل و تسویه شد'; },
  get dealExpired() { return isEn() ? 'Courier Window Closed' : 'مهلت کاروان به پایان رسید'; },
  get bagProgress() { return isEn() ? 'In Barn:' : 'موجودی انبار:'; },
  get dueByDay() { return isEn() ? 'Valid until Day' : 'مهلت تا روز'; },
  get rewardLabel() { return isEn() ? 'Courier Payout:' : 'پاداش تسویه:'; },
  get visitSenderBtn() { return isEn() ? 'Visit Sender' : 'گفتگو با فرستنده'; },
  get openMarketBtn() { return isEn() ? 'Open Market' : 'باز کردن بازار'; },
  get openLedgerBtn() { return isEn() ? 'Open Ledger' : 'باز کردن دفتر'; },
  get pinBtn() { return isEn() ? 'Keep Letter' : 'نگهداری در آرشیو'; },
  get pinnedBtn() { return isEn() ? 'Kept in Archive' : 'محفوظ در آرشیو'; },
  get emptyBox() { return isEn() ? 'No letters in this tab yet — new dispatches arrive with each dawn and milestone.' : 'هنوز نامه‌ای در این بخش نیست؛ با طلوع روزها و پیشرفت مزرعه نامه‌های تازه می‌رسند.'; },
  get newMailToast() { return isEn() ? 'New sealed letter arrived in your postbox!' : 'نامهٔ مهروموم‌شدهٔ تازه‌ای به صندوق پست مزرعه رسید!'; },
  get dealDoneToast() { return isEn() ? 'Courier order shipped! Gold coins added.' : 'سفارش پستی ارسال شد و سکه‌ها به کیسه اضافه گشت!'; },
  get parcelToast() { return isEn() ? 'Enclosed parcel claimed!' : 'هدیهٔ پیوست نامه دریافت شد!'; },
  get bagFullToast() { return isEn() ? 'Barn bag is full — free a few slots first!' : 'کیسهٔ انبار پر است؛ ابتدا کمی جا باز کن!'; },
  postmarkDay: (d: number, snName: string) => (isEn() ? `Day ${d} · ${snName}` : `روز ${fa(d)} · ${snName}`),
  stamUnit: (n: number) => (isEn() ? `+${n} Stamina` : `+${fa(n)} نیرو`),
  fertUnit: (n: number) => (isEn() ? `${n} Fertilizer` : `${fa(n)} کود غنی`),
  seedUnit: (cropName: string, n: number) => (isEn() ? `${n}× ${cropName} Seed` : `${fa(n)} بذر ${cropName}`),
};

export interface RenderedMailText {
  subject: string;
  greeting: string;
  body: string;
  ps: string;
}

const SEASON_FA = ['بهار', 'تابستان', 'پاییز', 'زمستان'];
const SEASON_EN = ['Spring', 'Summer', 'Autumn', 'Winter'];

export function seasonLabel(sn: number): string {
  return isEn() ? (SEASON_EN[sn] ?? 'Spring') : (SEASON_FA[sn] ?? 'بهار');
}

export function renderMailTemplate(entry: MailEntry, itemLabel: (id: string) => string): RenderedMailText {
  const p = entry.params ?? {};
  const en = isEn();
  const goodName = p.good ? itemLabel(String(p.good)) : '';
  const ch = Number(p.chapter ?? 1);
  const amt = num(p.amount ?? 0);
  const qty = num(p.qty ?? 1);

  switch (entry.template) {
    case 'welcome-homestead':
      return en ? {
        subject: 'Welcome Home to Grandfather’s Green Homestead',
        greeting: 'My dearest grandchild,',
        body: 'Seeing smoke rise again from your grandfather’s cottage chimney brought tears of joy to my eyes. I tucked a small parcel of heirloom seeds, fresh feed for the chickens, and pocket coins beside your postbox so your very first morning starts with blessing.',
        ps: 'P.S. Check this wooden postbox whenever the red flag stands tall — villagers, merchants, and town couriers all send word here!',
      } : {
        subject: 'خوش‌آمدی به خانهٔ پدربزرگ و مزرعهٔ رنگین',
        greeting: 'نوهٔ دلبند و عزیزم، سلام!',
        body: 'دیدن دوبارهٔ چراغ روشن ایوان پدربزرگت جان تازه‌ای به تنم انداخت. یک بستهٔ کوچک از بذرهای برکت‌دار، علوفهٔ تازه و چند سکهٔ یادگاری توی همین پاکت برایت گذاشتم تا اولین صبح کشت‌وکار را با دست پر شروع کنی.',
        ps: 'پی‌نوشت: هر وقت پرچم سرخ صندوق پست کنار ایوان بالا رفت سری به آن بزن؛ نامه‌های اهالی، سفارش‌های پرمنفعت بازار و خبرهای مهم دره همین‌جا می‌رسند!',
      };

    case 'chapter-milestone':
      return en ? {
        subject: `Chapter ${ch} Chronicle: A New Page for the Valley`,
        greeting: 'Dear Keeper of the Three Estates,',
        body: `Word of your perseverance has spread across the village square as Chapter ${ch} begins. Every furrow you till and every honest coin you earn brings your family’s heritage closer to complete freedom.`,
        ps: 'P.S. Visit the townsfolk whenever yellow exclamation badges shine above their names — new personal favors await.',
      } : {
        subject: `آغاز فصل ${fa(ch)} داستان: برگ تازه‌ای در تاریخ مزرعه`,
        greeting: 'کشاورز پرتلاش و امین دهکده، درود!',
        body: `با ورود به فصل ${fa(ch)}، صدای آبادانی مزرعه‌ات در تمام راسته‌های شهر پیچیده است. هر شیار سبزی که شخم می‌زنی و هر سندی که آزاد می‌کنی، میراث خانوادگی پدربزرگ را یک گام بلند به رهایی کامل نزدیک‌تر می‌سازد.`,
        ps: 'پی‌نوشت: سری به اهالی شهر بزن؛ با آغاز هر فصل داستانی، دغدغه‌ها و مأموریت‌های تازه‌ای در انتظار توست.',
      };

    case 'debt-due-soon':
      return en ? {
        subject: `Formal Ledger Reminder — Note #${ch} Due Soon`,
        greeting: 'To the Homestead Proprietor,',
        body: `My ledger shows only ${num(p.daysLeft ?? 2)} day(s) left before your current promissory note deadline (${amt} coins remaining). Settle in time at the Ledger Desk to preserve your standing and avoid collection penalties.`,
        ps: 'Signed & sealed at the East Counting House — Jahangir Khan.',
      } : {
        subject: `اخطاریهٔ رسمی سررسید سند شمارهٔ ${fa(ch)}`,
        greeting: 'خطاب به متصدی مزرعه،',
        body: `طبق ثبت دفتر کل، تنها ${num(p.daysLeft ?? 2)} روز تا سررسید سند جاری شما (مانده: ${amt} سکه) باقی مانده است. پرداخت به‌موقع در دفتر اسناد، خوش‌حسابی شما را حفظ کرده و مانع جریمهٔ دیرکرد خواهد شد.`,
        ps: 'مهر و امضای حجرهٔ صرافی شرق شهر — جهانگیرخان.',
      };

    case 'debt-note-cleared':
      return en ? {
        subject: `Official Settlement Receipt — Note #${ch} Cancelled`,
        greeting: 'Honored Homestead Owner,',
        body: `This stamped receipt confirms full settlement of Promissory Note #${ch}. Even I must admit your discipline in running these fields is remarkable. Keep an enclosed token of respect from the counting house.`,
        ps: 'Official Red Wax Clearance — Zero balance carried on this note.',
      } : {
        subject: `رسید رسمی تسویه و ابطال سند شمارهٔ ${fa(ch)}`,
        greeting: 'کشاورز خوش‌حساب، سلام،',
        body: `بدین‌وسیله تسویهٔ کامل سند شمارهٔ ${fa(ch)} با مهر سرخ دفتر کل گواهی می‌شود. انصافاً نظم و همت تو در ادارهٔ این مزارع تحسین‌برانگیز است؛ یک هدیهٔ کوچک هم به رسم احترام پیوست شد.`,
        ps: 'مهر ابطال قطعی خورد — این سند برای همیشه آزاد شد.',
      };

    case 'postgame-freedom':
      return en ? {
        subject: 'Golden Charter of Full Homestead Freedom!',
        greeting: 'Hero of Sunlit Valley & Northern Meadow,',
        body: 'Every single debt note is cleared forever! The entire village has erected a tribute statue in the Town Square to celebrate your triumph. Unseal our collective gift basket inside!',
        ps: 'With endless pride — Grandma Nosrat, Sara, Uncle Morad, Engineer Kaveh & Jahangir.',
      } : {
        subject: 'منشور زرین آزادی کامل مزرعهٔ پدربزرگ!',
        greeting: 'افتخار تمام اهالی دهکده، سلام بر تو!',
        body: 'تمام اسناد بدهی برای همیشه تسویه شد و نام تو به نیکی بر تندیس میدان شهر نقش بست. این سبد هدیهٔ ویژه پیشکش همهٔ اهالی دهکده به پاس همت بی‌نظیر توست!',
        ps: 'با عشق و افتخار — مادربزرگ نصرت، سارا، عمو مراد، مهندس کاوه و جهانگیر.',
      };

    case 'estate-deed':
      return en ? {
        subject: `Official Land Deed Registered: ${p.estate === 'north' ? 'Northern Meadow' : 'Sunlit Valley'}`,
        greeting: 'Congratulations, Landholder!',
        body: p.estate === 'north'
          ? 'The fertile terraces and stone windmill of Northern Meadow are now legally yours! Grain, tubers, and crimson saffron thrive dramatically faster on that soil.'
          : 'The sunlit orchard terraces and crystal waterfall of Sunlit Valley now belong to your homestead! Fruit trees, roses, and pistachios yield bountiful harvests there.',
        ps: 'P.S. Specialty starter seeds have been sealed inside this deed envelope for your first planting.',
      } : {
        subject: `سند رسمی مالکیت ثبت شد: ${p.estate === 'north' ? 'دشت شمالی' : 'باغ‌دره'}`,
        greeting: 'مبارک باشد صاحب‌ملک پرتلاش!',
        body: p.estate === 'north'
          ? 'کرت‌های پهناور و آسیاب سنگی «دشت شمالی» رسماً به نام تو ثبت شد! غلات، صیفی‌جات ریشه‌ای و زعفران در خاک خنک آن دشت بازده فوق‌العاده‌ای دارند.'
          : 'تراس‌های آفتاب‌گیر و چشمهٔ زلال «باغ‌دره» رسماً به ملک تو پیوست! میوه‌های باغی، پسته و گل محمدی در آن اقلیم معطر غوغا می‌کنند.',
        ps: 'پی‌نوشت: چند بذر تخصصی متناسب با اقلیم ملک جدیدت درون پاکت گذاشته شد.',
      };

    case 'season-gazette':
      return en ? {
        subject: `Valley Seasonal Gazette — Dawn of ${seasonLabel(entry.season)}`,
        greeting: 'Good morning, Neighbour!',
        body: [
          'Spring breezes warm the valley! Plant strawberries, potatoes, onions, and spring blossoms while blossoms boost your beehives.',
          'Summer sunshine has arrived! Stock tomatoes, corn, peppers, watermelons, and sunflowers — and watch plot moisture under warm skies.',
          ' Crisp Autumn leaves paint the hills! Saffron, pumpkins, grapes, pomegranates, and figs command top prices at market.',
          'Quiet Winter blankets the meadow! Greenhouse beds, winter orchards, artisan cauldrons, livestock care, and river angling shine brightest now.',
        ][entry.season] ?? '',
        ps: 'P.S. Check the Seed Shop seasonal filter to pick the highest-profit crops for this week!',
      } : {
        subject: `خبرنامهٔ چهارفصل دهکده — حلول فصل ${seasonLabel(entry.season)}`,
        greeting: 'صبح بخیر همسایهٔ خوش‌ذوق!',
        body: [
          'نسیم دل‌انگیز بهار به دره رسید! بهترین فصل کاشت توت‌فرنگی، سیب‌زمینی، هویج، پیاز و شکوفه‌های بهاری است و کندوها عسل بیشتری می‌سازند.',
          'آفتاب گرم تابستان از راه رسید! ذرت، گوجه‌فرنگی، فلفل، هندوانه و آفتابگردان سود عالی دارند؛ آبیاری منظم کرت‌ها فراموش نشود.',
          'پاییز هزاررنگ از راه رسید! فصل طلایی زعفران، کدو حلوایی، انگور، انار و انجیر است و حجره‌دارهای شهر خریدار دست‌به‌نقدند.',
          'زمستان سپیدپوش در راه است! کشت گلخانه‌ای، فرآوری مربا و پنیر در کارگاه، رسیدگی به دامستان گرم و ماهیگیری رودخانه بهترین درآمد زمستانی‌اند.',
        ][entry.season] ?? '',
        ps: 'پی‌نوشت: فیلتر «مناسب فصل» در بذرفروشی شهر سریع‌ترین راه انتخاب بذر پرسود امروز است!',
      };

    case 'world-event': {
      const evMap: Record<string, [string, string]> = {
        festival: [GT.evFestivalTitle, GT.evFestivalDesc],
        drought: [GT.evDroughtTitle, GT.evDroughtDesc],
        flood: [GT.evFloodTitle, GT.evFloodDesc],
        guest: [GT.evGuestTitle, GT.evGuestDesc],
        hotmarket: [GT.evHotTitle, GT.evHotDesc],
        yalda: [GT.evYaldaTitle, GT.evYaldaDesc],
      };
      const live = p.eventId ? evMap[String(p.eventId)] : undefined;
      const evTitle = live ? live[0] : String(en ? (p.titleEn ?? p.titleFa ?? '') : (p.titleFa ?? ''));
      const evDesc = live ? live[1] : String(en ? (p.descEn ?? p.descFa ?? '') : (p.descFa ?? ''));
      return en ? {
        subject: `Urgent Valley Dispatch: ${evTitle}`,
        greeting: 'Attention all homesteads!',
        body: `${evDesc} Make full use of today’s conditions before dusk settles over the hills.`,
        ps: 'Dispatched at dawn by the Valley Courier Watch.',
      } : {
        subject: `پیک ویژهٔ رویداد امروز: ${evTitle}`,
        greeting: 'همسایگان گرامی دره، آگاه باشید!',
        body: `${evDesc} پیش از غروب آفتاب از شرایط ویژهٔ امروز بیشترین بهره را ببرید.`,
        ps: 'ارسال‌شده در سپیده‌دم توسط دیده‌بان پیک دهکده.',
      };
    }

    case 'market-boom':
      return en ? {
        subject: `Hot Market Telegram: ${goodName} Surging at +45%!`,
        greeting: 'Quick word from my stall!',
        body: `Travelling merchants just arrived asking eagerly for ${goodName} — market demand jumped sharply today! If you have crates stored in your barn, sell while prices peak.`,
        ps: 'Tap “Open Village Market” below whenever you’re ready — Sara.',
      } : {
        subject: `تلگراف نرخ داغ بازار: تقاضای «${goodName}» جهش کرد!`,
        greeting: 'سلام گرم از حجرهٔ بازار!',
        body: `کاروان بازرگانان تازه به میدان شهر رسیده و به دنبال خرید فوری «${goodName}» با نرخ عالی است! اگر در انبار موجودی داری، امروز بهترین فرصت فروش است.`,
        ps: 'با دکمهٔ پایین همین نامه می‌توانی یک‌راست تابلوی بازار را باز کنی — سارا.',
      };

    case 'farm-milestone': {
      const bLabel = p.buildKind
        ? buildJobLabel({ kind: String(p.buildKind) as BuildJob['kind'], key: String(p.buildKey ?? ''), label: String(p.label ?? '') })
        : String(p.label ?? '');
      return en ? {
        subject: p.kind === 'baby'
          ? 'Joyful Barn Postcard: Healthy New Arrival!'
          : `Master Carpenter Certificate: ${bLabel || 'Homestead Structure'} Ready!`,
        greeting: 'Hearty congratulations, friend!',
        body: p.kind === 'baby'
          ? 'Your well-fed ranch herd has welcomed bright-eyed young stock! Keep the wooden trough stocked with feed so young mammals grow strong and productive.'
          : `Our carpentry crew has driven the final oak peg into your ${bLabel || 'homestead structure'}. May it multiply your farm’s prosperity for years to come!`,
        ps: 'Warmest regards from Uncle Morad & the Village Guild.',
      } : {
        subject: p.kind === 'baby'
          ? 'مژدهٔ شاد دامستان: تولد نوزاد تازه در آغل!'
          : `گواهی پایان ساخت‌وساز: «${bLabel}» تکمیل شد!`,
        greeting: 'خدا قوت کشاورز باسلیقه!',
        body: p.kind === 'baby'
          ? 'ماشاالله به این رسیدگی! در دامستان مزرعه‌ات نوزاد سرحال تازه‌ای چشم به جهان گشود. آخور چوبی را پرعلوفه نگه دار تا زود بالنده و پربرکت شود.'
          : `گروه نجاری آخرین میخ بلوطی پروژهٔ «${bLabel}» را کوبید و سازه با کیفیت عالی تحویل مزرعه شد. چرخش برایت پر از خیر و برکت بچرخد!`,
        ps: 'با دعای خیر — عمو مراد و صنف استادکاران دهکده.',
      };
    }

    case 'mail-trade':
      return en ? {
        subject: `Wholesale Courier Order: ${qty}× ${goodName}`,
        greeting: 'Greetings from the Regional Trade Guild,',
        body: `A regional caravan has placed a guaranteed wholesale mail order for ${qty} units of ${goodName}, paying ${amt} gold coins (32% above base value, zero deposit required!). Pack and dispatch right from this letter before Day ${num(p.dueDay ?? 1)}.`,
        ps: 'P.S. Unlike town board contracts, mail orders need zero upfront deposit — ship anytime before expiry!',
      } : {
        subject: `سفارش خرید عمدهٔ پستی: ${qty} واحد «${goodName}»`,
        greeting: 'درود از کاروان بازرگانان ولایت،',
        body: `یک خریدار عمده سفارش قطعی برای خرید ${qty} واحد «${goodName}» با پرداخت نقدی ${amt} سکهٔ طلا (۳۲٪ بالاتر از نرخ پایه و بدون هیچ بیعانه‌ای!) ثبت کرده است. تا پایان روز ${num(p.dueDay ?? 1)} می‌توانی محموله را مستقیم از همین نامه تحویل پیک بدهی.`,
        ps: 'پی‌نوشت: سفارش‌های پستی هیچ جریمه یا بیعانه‌ای ندارند؛ هر زمان موجودی‌ات کامل شد دکمهٔ ارسال را بزن!',
      };

    case 'npc-quest-invite':
      return en ? {
        subject: `Personal Request: ${String(entry.questTitleEn ?? 'A Favor in Town')}`,
        greeting: 'Dear friend on the farm,',
        body: `I have been hoping to speak with you about "${String(entry.questTitleEn ?? 'a special village task')}". Whenever you have a spare moment between harvests, come visit me on Town Main Street — I have prepared a generous reward for your help!`,
        ps: 'Use the shortcut button below to head straight to Town!',
      } : {
        subject: `درخواست صمیمانهٔ اهالی: «${String(entry.questTitleFa ?? 'کمک در دهکده')}»`,
        greeting: 'دوست عزیز و همسایهٔ مهربانم، سلام!',
        body: `مدتی است می‌خواستم دربارهٔ موضوع «${String(entry.questTitleFa ?? 'یک کار مهم دهکده')}» با تو مشورت کنم. هر زمان میان کارهای مزرعه فرصت کردی سری به من در خیابان اصلی شهر بزن؛ پاداش خوبی برایت کنار گذاشته‌ام!`,
        ps: 'با دکمهٔ زیر همین نامه می‌توانی مستقیم راهی شهر شوی و گفتگوی مأموریت را باز کنی.',
      };

    case 'overflow-parcel':
      return en ? {
        subject: `Safe Delivery: Overflow Reward Kept for You (${qty}× ${goodName})`,
        greeting: 'Greetings from the Village Courier,',
        body: `Your farm satchel was full when your special reward arrived, so we carefully sealed all ${qty}× ${goodName} inside this protected parcel so nothing would ever go to waste!`,
        ps: 'Free a little space in your Barn Bag, then unseal your parcel right below.',
      } : {
        subject: `امانت ویژهٔ پست دهکده: بستهٔ جایزهٔ شما (${qty} واحد ${goodName})`,
        greeting: 'کشاورز عزیز، خدا قوت!',
        body: `هنگام دریافت جایزهٔ ویژه، کیسهٔ انبارت پر بود؛ پستچی دهکده تمام ${qty} واحد «${goodName}» را صحیح و سالم درون این بسته مهروموم کرد تا حتی یک دانه از دست نرود!`,
        ps: 'کافی است کمی جا در انبارت باز کنی و دکمهٔ باز کردن بسته را در پایین همین نامه بزنی.',
      };

    case 'friendship-parcel':
    default:
      return en ? {
        subject: `Heartfelt Gift Parcel (${num(p.hearts ?? 2)} Hearts of Friendship!)`,
        greeting: 'My cherished friend,',
        body: 'Your kindness, thoughtful gifts, and constant care for everyone in this village mean the world to me. Please unseal this handwritten parcel — I picked these treats from my personal pantry just for you!',
        ps: 'May our friendship flourish through every season!',
      } : {
        subject: `بستهٔ محبت و دوستی صمیمانه (${num(p.hearts ?? 2)} قلب رفاقت!)`,
        greeting: 'رفیق باوفا و عزیزتر از جان، سلام!',
        body: 'محبت، معرفت و دست‌و‌دل‌بازی تو نسبت به اهالی دهکده همیشه مایهٔ دلگرمی من بوده است. این بستهٔ کوچک را با عشق برایت پیچیده‌ام؛ مهر مومش را باز کن و نوش جان کن!',
        ps: 'دوستی ما در هر چهار فصل سال برقرار و پایدار باد!',
      };
  }
}
