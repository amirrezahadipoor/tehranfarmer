// Bilingual (FA + EN) Strings for Multi-Layer Cavern, Misty Forest, Seamless World Atlas,
// Skill Fishing Minigame, Interactive Town Square Festivals, Branching Village Charters & Late-Game Shocks.
import { CFG } from '../game/settings';
import { fa } from './fa';

const en = () => CFG.locale === 'en';

export type CharterKey = 'qanat' | 'bazaar' | 'frontier' | 'bank';
export type CharterValue = 'commons' | 'turbine' | 'coop' | 'caravan' | 'sanctuary' | 'quarry' | 'credit' | 'council';

export interface CharterBranchMeta {
  key: CharterKey;
  titleFa: string;
  titleEn: string;
  aVal: CharterValue;
  aTitleFa: string;
  aTitleEn: string;
  aEffectFa: string;
  aEffectEn: string;
  aPlaqueFa: string;
  aPlaqueEn: string;
  bVal: CharterValue;
  bTitleFa: string;
  bTitleEn: string;
  bEffectFa: string;
  bEffectEn: string;
  bPlaqueFa: string;
  bPlaqueEn: string;
}

export const CHARTER_DEFS: readonly CharterBranchMeta[] = [
  {
    key: 'qanat',
    titleFa: 'منشور آب و قنات دهکده',
    titleEn: 'Village Qanat & Water Charter',
    aVal: 'commons',
    aTitleFa: 'قنات عمومی سنتی دهکده',
    aTitleEn: 'Traditional Commons Qanat',
    aEffectFa: 'چرخ‌آب سنگی در مزرعه و شهر + ۱۸٪ رطوبت صبحگاهی کرت‌ها + ۱۰ اعتبار نزد اهالی',
    aEffectEn: 'Stone waterwheel monument + 18% morning soil moisture + +10 Standing',
    aPlaqueFa: 'چرخ‌آب قنات عمومی',
    aPlaqueEn: 'Commons Waterwheel',
    bVal: 'turbine',
    bTitleFa: 'توربین فشردهٔ مهندس کاوه',
    bTitleEn: 'Engineer Kaveh Hydro-Turbine',
    bEffectFa: 'توربین برنجی در شهر و مزرعه + ۱۲٪ تخفیف ماشین‌آلات + ۱۵٪ سرعت کارگاه',
    bEffectEn: 'Brass hydro-turbine + 12% machine discount + 15% machine speed',
    bPlaqueFa: 'توربین آبی کاوه',
    bPlaqueEn: 'Kaveh Hydro-Turbine',
  },
  {
    key: 'bazaar',
    titleFa: 'منشور تجارت میدان شهر',
    titleEn: 'Town Square Trade Charter',
    aVal: 'coop',
    aTitleFa: 'تعاونی منصفانهٔ کشاورزان با سارا',
    aTitleEn: 'Sara Farmers’ Cooperative',
    aEffectFa: 'سایبان سبز تعاونی در میدان شهر + ۱۰٪ قیمت پایهٔ محصولات مزرعه و دام',
    aEffectEn: 'Emerald co-op awnings in Town + +10% crop & ranch market value',
    aPlaqueFa: 'تعاونی کشاورزان',
    aPlaqueEn: 'Farmers’ Co-op',
    bVal: 'caravan',
    bTitleFa: 'کاروان‌سرای جادهٔ ابریشم',
    bTitleEn: 'Silk-Road Caravan Guild',
    bEffectFa: 'خیمهٔ زرشکی بازرگانان در شهر + ۱۸٪ قیمت کالاهای آرتیزان، گوهر غار و فرمان‌های شاهی',
    bEffectEn: 'Crimson silk pavilion in Town + +18% artisan, cave gem & decree value',
    bPlaqueFa: 'کاروان‌سرای ابریشم',
    bPlaqueEn: 'Silk Caravan Guild',
  },
  {
    key: 'frontier',
    titleFa: 'پیمان مرز جنگل و غار بلورین',
    titleEn: 'Forest & Crystal Cavern Pact',
    aVal: 'sanctuary',
    aTitleFa: 'حریم سبز درختان کهنسال با بی‌بی',
    aTitleEn: 'Grandma’s Sacred Grove Sanctuary',
    aEffectFa: 'فانوس و نیایشگاه سبز در جنگل و مزرعه + ۳۵٪ برداشت گیاهان جنگلی و عسل',
    aEffectEn: 'Sacred shrine totems + +35% forest botanicals & honey yield',
    aPlaqueFa: 'نیایشگاه جنگل کهن',
    aPlaqueEn: 'Sacred Grove Shrine',
    bVal: 'quarry',
    bTitleFa: 'کاوشگاه معدنی صنف عمو مراد',
    bTitleEn: 'Uncle Morad’s Guild Crystal Quarry',
    bEffectFa: 'طاق چوبی معدن و واگن سنگ در غار و شهر + ۳۵٪ استخراج بلور و ۱۲٪ سرعت ساخت نجاری',
    bEffectEn: 'Guild mine arch & ore cart + +35% cave gems & 12% faster builds',
    bPlaqueFa: 'طاق معدن صنف نجار',
    bPlaqueEn: 'Guild Quarry Arch',
  },
  {
    key: 'bank',
    titleFa: 'سرنوشت صراف‌خانهٔ جهانگیرخان',
    titleEn: 'Fate of Jahangir’s Counting House',
    aVal: 'credit',
    aTitleFa: 'آشتی و صندوق قرض‌الحسنهٔ دهکده',
    aTitleEn: 'Reconciliation & Village Credit House',
    aEffectFa: 'ایوان چای و سماور آشتی در شهر + ۳۰٪ کاهش سود وام + ۴۰٪ ظرفیت قلک امن',
    aEffectEn: 'Samovar tea-porch in Town + -30% loan interest + +40% safe stash cap',
    aPlaqueFa: 'صندوق همیاری دهکده',
    aPlaqueEn: 'Village Credit House',
    bVal: 'council',
    bTitleFa: 'منشور نظارت قانونی شورای دهکده',
    bTitleEn: 'Civic Audit & Council Law Pillar',
    bEffectFa: 'ستون سنگی میزان قانون در شهر + ۵۰٪ سپر ضد شبیخون + ۱۵٪ پاداش فرمان‌های بزرگ',
    bEffectEn: 'Marble law pillar in Town + -50% raid risk + +15% Royal Decree gold',
    bPlaqueFa: 'ستون قانون شورا',
    bPlaqueEn: 'Civic Law Pillar',
  },
];

export const FT = {
  // 6 Frontier Goods + 2 New Artisan Crafts
  get goodHerb() { return en() ? 'Mountain Herb' : 'گیاه دارویی کوهی'; },
  get goodMushroom() { return en() ? 'Misty Forest Mushroom' : 'قارچ مه جنگلی'; },
  get goodTruffle() { return en() ? 'Golden Ancient Truffle' : 'دنبلان طلایی کهنسال'; },
  get goodQuartz() { return en() ? 'Qanat Crystal Quartz' : 'بلور کوارتز قنات'; },
  get goodTurquoise() { return en() ? 'Vein Turquoise' : 'فیروزهٔ رگه‌دار'; },
  get goodAmber() { return en() ? 'Abyssal Sun-Amber' : 'کهربای آفتابی اعماق'; },
  get goodAmethyst() { return en() ? 'Violet Amethyst' : 'آمتیست بنفش'; },
  get goodGarnet() { return en() ? 'Crimson Garnet' : 'گارنت سرخ'; },
  get goodOpal() { return en() ? 'Rainbow Opal' : 'اوپال رنگین‌کمانی'; },
  get goodSapphire() { return en() ? 'Deep Sapphire' : 'یاقوت کبود اعماق'; },
  get goodEmerald() { return en() ? 'Verdant Emerald' : 'زمرد سبز'; },
  get goodRuby() { return en() ? 'Royal Ruby' : 'یاقوت سرخ سلطنتی'; },
  get goodDiamond() { return en() ? 'Eternal Diamond' : 'الماس جاودان'; },
  get mineFloor() { return en() ? 'Mine level' : 'طبقهٔ معدن'; },
  get mineHint() { return en() ? 'Tap a rock to walk over and open its timed extraction. Every completed vein gives a guaranteed base gem.' : 'روی سنگ بزن تا نزدیک شوی و استخراج زمان‌دار باز شود. هر رگهٔ کامل یک گوهر پایهٔ تضمینی می‌دهد.'; },
  get recElixirName() { return en() ? 'Mountain Stamina Elixir' : 'معجون گیاهی کوهستان'; },
  get recElixirDesc() { return en() ? 'Restores deep caving stamina & sells at high herbalist value' : 'ترکیب گیاه دارویی، قارچ مه و عسل ناب با ارزش دارویی بالا'; },
  get recAmuletName() { return en() ? 'Gilded Turquoise Talisman' : 'نگین فیروزه و کهربا'; },
  get recAmuletDesc() { return en() ? 'Master late-game jewel crafted from cave gems & saffron' : 'زیور اشرافی اواخر بازی از فیروزه، کهربا و زعفران ناب'; },

  // Regions, Layers & Seamless Gates
  get navCave() { return en() ? 'Cavern' : 'غار بلورین'; },
  get navForest() { return en() ? 'Forest' : 'جنگل مه'; },
  get navAtlas() { return en() ? 'World Map' : 'نقشهٔ جهان'; },
  get navFair() { return en() ? 'Town Fair!' : 'جشنوارهٔ شهر!'; },
  get gateCave() { return en() ? 'To Crystal Cavern' : 'دهانهٔ غار بلورین'; },
  get gateForest() { return en() ? 'To Misty Forest' : 'گذرگاه جنگل مه'; },
  get gateRiverBack() { return en() ? 'Exit to Riverbank' : 'خروج به ساحل رودخانه'; },
  get gateApiaryBack() { return en() ? 'Trail to Apiary' : 'کوره‌راه زنبورستان'; },
  get caveFloorLabel() { return en() ? 'Cavern Strata' : 'طبقهٔ غار'; },
  get forestLayerLabel() { return en() ? 'Forest Glade' : 'لایهٔ جنگل'; },
  get stairsDown() { return en() ? 'Deeper Strata' : 'پلهٔ عمق بعد'; },
  get stairsUp() { return en() ? 'Upper Strata' : 'طبقهٔ بالاتر'; },
  get deeperPath() { return en() ? 'Deeper Woods' : 'عمق جنگل مه'; },
  get outerPath() { return en() ? 'Outer Glade' : 'حاشیهٔ جنگل'; },
  get caveSpring() { return en() ? 'Thermal Qanat Spring (+Stamina)' : 'چشمهٔ گرم قنات (+انرژی)'; },
  get forestShrine() { return en() ? 'Ancient Heartwood Shrine' : 'درخت نیایش کهنسال'; },
  get stairsLocked() { return en() ? 'Mine at least 2 crystal veins on this floor first!' : 'اول دست‌کم ۲ رگهٔ بلور این طبقه را استخراج کن تا راه پله باز شود!'; },
  get gladeLocked() { return en() ? 'Gather at least 2 forest plants in this glade first!' : 'اول دست‌کم ۲ گیاه این بخش جنگل را جمع کن تا گذرگاه مه باز شود!'; },
  get springHealed() { return en() ? 'Warm mineral spring restored +38 Stamina!' : 'آب گرم چشمهٔ زیرزمینی قنات +۳۸ انرژی تازه بخشید!'; },
  get shrineBlessed() { return en() ? 'The ancient tree gifted rare seasonal seeds & +25 Stamina!' : 'درخت کهنسال جنگل ۲ بذر فصل و +۲۵ انرژی برکت داد!'; },
  get springUsed() { return en() ? 'Spring already visited today — come back tomorrow' : 'امروز از برکت چشمه بهره برده‌ای؛ فردا دوباره سر بزن'; },
  get seamlessArrived() { return en() ? 'Entered region:' : 'ورود پیوسته به:'; },

  // Rebuilt Mine Expedition — deterministic veins, skill strikes and lift progress
  get mineHudTitle() { return en() ? 'Mine expedition' : 'عملیات معدن'; },
  get mineFloorShort() { return en() ? 'Level' : 'طبقه'; },
  get mineVeinsShort() { return en() ? 'veins' : 'رگه'; },
  get mineLiftShort() { return en() ? 'Lift' : 'آسانسور'; },
  get mineOpenMap() { return en() ? 'Open mine map and field guide' : 'باز کردن نقشه و راهنمای معدن'; },
  get mineMapTitle() { return en() ? 'Mine Map & Field Guide' : 'نقشه و دفترچهٔ معدن'; },
  get mineMapIntro() { return en() ? 'Every visible vein guarantees its shown gem. Clear two veins to power the lift; precise weak-point strikes earn bonus ore.' : 'هر رگه‌ای که می‌بینی، گوهر مشخص‌شده‌اش را تضمین می‌کند. با استخراج دو رگه آسانسور روشن می‌شود و ضربهٔ دقیق به نقطهٔ شکست جایزهٔ اضافه دارد.'; },
  get mineFloor1Name() { return en() ? 'Qanat Entrance' : 'دهانهٔ قنات'; },
  get mineFloor2Name() { return en() ? 'Turquoise Gallery' : 'تالار فیروزه'; },
  get mineFloor3Name() { return en() ? 'Amber Heart' : 'قلب کهربا'; },
  get mineFloor1Lore() { return en() ? 'Old cedar supports still carry the marks of the first farmers. Quartz and turquoise are safest to learn on.' : 'تیرهای کهن هنوز جای دست نخستین کشاورزان را دارند. کوارتز و فیروزه این‌جا برای یادگیری امن‌ترند.'; },
  get mineFloor2Lore() { return en() ? 'A dry watercourse crosses blue stone. Follow the bright seams instead of wasting strength on blank rock.' : 'بستر خشک آب از دل سنگ‌های آبی می‌گذرد. خطوط روشن را دنبال کن تا نیرویت صرف سنگ‌های پوچ نشود.'; },
  get mineFloor3Lore() { return en() ? 'The oldest geodes sleep below the qanat. The royal ruby vein hides a diamond only for a flawless extraction.' : 'کهن‌ترین ژئودها زیر قنات خوابیده‌اند. رگهٔ سلطنتی یاقوتی فقط در استخراج بی‌نقص راز الماس را نشان می‌دهد.'; },
  get mineCurrentFloor() { return en() ? 'You are here' : 'اینجا هستی'; },
  get mineTravelFloor() { return en() ? 'Take lift to this level' : 'رفتن با آسانسور به این طبقه'; },
  get mineLockedFloor() { return en() ? 'Clear two veins on the previous level to unlock.' : 'با استخراج دو رگه در طبقهٔ قبل باز می‌شود.'; },
  get mineProgressLabel() { return en() ? 'Veins cleared' : 'رگه‌های استخراج‌شده'; },
  get mineLifetimeLabel() { return en() ? 'Lifetime veins' : 'کل رگه‌ها'; },
  get minePerfectLabel() { return en() ? 'Flawless extractions' : 'استخراج‌های بی‌نقص'; },
  get mineGameTitle() { return en() ? 'Break the Vein' : 'شکستن رگه'; },
  get mineWeakPointHint() { return en() ? 'Strike when the pick marker crosses the bright fracture. Each stage gets narrower; every completed strike still advances the vein.' : 'وقتی نشانگر کلنگ روی شکاف روشن رسید ضربه بزن. هر مرحله باریک‌تر می‌شود؛ حتی ضربهٔ غیردقیق هم رگه را جلو می‌برد.'; },
  get mineDriftHint() { return en() ? 'Floor 2: the bright seam drifts sideways. Track it with your eyes, then strike.' : 'طبقهٔ ۲: شکاف روشن کنار می‌رود؛ مسیرش را دنبال کن و بعد ضربه بزن.'; },
  get minePulseHint() { return en() ? 'Floor 3: strike only while the royal seam is bright; a dim shielded seam deflects the hit.' : 'طبقهٔ ۳: فقط وقتی رگهٔ سلطنتی روشن است ضربه بزن؛ رگهٔ کم‌نور و محافظه‌دار ضربه را دفع می‌کند.'; },
  get mineStrikeBtn() { return en() ? 'STRIKE THE WEAK POINT' : 'ضربه به نقطهٔ شکست'; },
  get mineQuickBtn() { return en() ? 'Quick extraction' : 'استخراج سریع'; },
  get mineQuickHint() { return en() ? 'No timing: guaranteed base gem, no accuracy bonus.' : 'بدون timing: گوهر پایهٔ تضمینی، بدون جایزهٔ دقت.'; },
  get minePerfectHit() { return en() ? 'Perfect fracture!' : 'شکست بی‌نقص!'; },
  get mineGoodHit() { return en() ? 'Clean strike' : 'ضربهٔ خوب'; },
  get mineMissHit() { return en() ? 'Glancing blow — keep going' : 'ضربهٔ کناری — ادامه بده'; },
  get mineStageLabel() { return en() ? 'Strike' : 'ضربه'; },
  get mineLiftOpened() { return en() ? 'Two veins cleared! The lift to the next level is now powered.' : 'دو رگه استخراج شد! آسانسور طبقهٔ بعد روشن شد.'; },
  mineLoot(name: string, qty: number) { return en() ? `+${qty} ${name} secured` : `${fa(qty)} ${name} به کوله رفت`; },
  get mineBestAccuracy() { return en() ? 'Best precision' : 'بهترین دقت'; },
  get mineRoyalHint() { return en() ? 'Royal vein: flawless extraction reveals diamond' : 'رگهٔ سلطنتی: استخراج بی‌نقص الماس می‌دهد'; },

  // Skill Fishing Minigame UI
  get fishModalTitle() { return en() ? 'River Tension Reel — Skill Angling' : 'مینی‌گیم مهارتی کشش قلاب رودخانه'; },
  get fishHoldHint() { return en() ? 'Hold touch, mouse, Space or Up Arrow to lift the green bar — keep the swimming fish inside!' : 'لمس، کلیک یا نگه‌داشتن Space / کلید بالا شناور سبز را بالا می‌برد؛ ماهی را داخل کادر نگه دار!'; },
  get fishCatchProgress() { return en() ? 'Catch progress' : 'پیشرفت صید'; },
  get fishHoldBtn() { return en() ? 'HOLD TO REEL UP' : 'نگه دار: کشیدن قلاب بالا'; },
  get fishQuickBtn() { return en() ? 'Quick Cast (Instant)' : 'پرتاب سریع تک‌ضربه‌ای'; },
  get fishPerfect() { return en() ? 'PERFECT ANGLING! Double Catch!' : 'صید بی‌نقص مهارتی! ۲ برابر محصول!'; },
  get fishChestGot() { return en() ? '+ Sunken Gem Chest!' : '+ صندوقچهٔ گوهر غرق‌شده!'; },
  get fishEscaped() { return en() ? 'The fish slipped off the hook!' : 'ماهی از قلاب گریخت! دوباره امتحان کن'; },
  get fishSpeciesTrout() { return en() ? 'Silver River Trout' : 'قزل‌آلای نقره‌ای رودخانه'; },
  get fishSpeciesCarp() { return en() ? 'Golden Reed Carp' : 'کپور طلایی تالاب'; },
  get fishSpeciesSalmon() { return en() ? 'Caspian Salmon' : 'آزادماهی خزری'; },
  get fishSpeciesPearl() { return en() ? 'Qanat Blind Pearl-Fish' : 'مرواریدماهی قنات کهن'; },
  get fishSpeciesSturgeon() { return en() ? 'Royal Golden Sturgeon' : 'تاس‌ماهی طلایی شاهانه'; },

  // Town Square Interactive Festivals
  get fairTitle() { return en() ? 'Town Square Seasonal Festival Fairgrounds' : 'جشنوارهٔ تعاملی چهارفصل میدان شهر'; },
  get fairSub() { return en() ? 'Walk up to any booth in Town Square or compete right here for Gold, Standing & Festival Tokens!' : 'غرفه‌های زنده وسط میدان شهر برپاست! در ۳ مسابقهٔ مهارتی و استراتژیک شرکت کن و سکه، اعتبار و ژتون جشن ببر!'; },
  get fairBoothJudge() { return en() ? 'Harvest Judging' : 'داوری محصول برتر'; },
  get fairBoothCauldron() { return en() ? 'Cauldron Stir' : 'دیگ سمنو و حلوا'; },
  get fairBoothArchery() { return en() ? 'Target Toss' : 'کمان‌گیری سیب'; },
  get fairBoothPrizes() { return en() ? 'Prize Stall' : 'غرفهٔ جوایز'; },
  get fairOpenBell() { return en() ? 'Ring Town Festival Bell (Start Fair!)' : 'نواختن زنگ جشن میدان شهر (برپایی غرفه‌ها!)'; },
  get fairTokens() { return en() ? 'Festival Tokens' : 'ژتون جشنواره'; },
  get judgeHint() { return en() ? 'Pick up to 3 different items from your backpack & barn (1 of each is handed to the judges)! High base price + distinct categories (Crop / Artisan / Ranch / Forest & Cave) score huge bonus points!' : 'تا ۳ کالای متفاوت از کوله و انبارت بچین (هر قلم به داوران تحویل داده می‌شود)! تنوع رده‌ها (زراعی / کارگاهی / دام / جنگل و غار) + ارزش بالا امتیاز داوران را منفجر می‌کند!'; },
  get judgeSubmit() { return en() ? 'Present Basket to Village Judges' : 'داوری سبد در حضور بزرگان دهکده'; },
  get stirHint() { return en() ? 'Hold the button, Space or Up Arrow to stoke the copper cauldron — keep the heat marker inside the moving gold zone!' : 'دکمه، Space یا کلید بالا را نگه دار و رها کن تا نشانگر دما داخل محدودهٔ طلایی متحرک بماند!'; },
  get stirStart() { return en() ? 'Light Copper Cauldron!' : 'روشن کردن دیگ جشنواره!'; },
  get stirHold() { return en() ? 'HOLD: STOKE FLAME!' : 'نگه دار: دمیدن به شعله!'; },
  get archeryHint() { return en() ? 'Watch the wind pennant & release 3 arrows right as the sight crosses the golden bullseye!' : 'حرکت نشانه را دنبال کن و دقیقاً وسط خال طلایی ۳ تیر رها کن!'; },
  get archeryFire() { return en() ? 'RELEASE ARROW!' : 'رها کردن تیر کمان!'; },
  get fairDoneToday() { return en() ? 'Competed today — come back next fair!' : 'امروز جایزهٔ این غرفه را برده‌ای!'; },

  // World Atlas, Charters & Late-Game Shocks / Decrees
  get atlasTitle() { return en() ? 'Connected Valley Atlas, Village Charters & Royal Decrees' : 'اطلس پیوستهٔ دره، منشورهای دهکده و فرمان‌های بزرگ'; },
  get atlasSub() { return en() ? 'Walk across any region border seamlessly OR travel directly — monitor live economic shocks & multi-pillar contracts' : 'از مرز جاده‌های هر ناحیه پیوسته عبور کن یا مستقیم سفر کن — شوک اقتصادی هفته و فرمان‌های سه‌ستونهٔ بازار را رصد کن'; },
  get tabMap() { return en() ? '8-Region World Map' : 'نقشهٔ پیوستهٔ ۸ ناحیه'; },
  get tabDecrees() { return en() ? 'Royal Decrees & Market Shocks' : 'شوک‌های بازار و فرمان‌های شاهی'; },
  get tabCharters() { return en() ? 'Village Charters (Story Choices)' : 'منشورهای دهکده (انتخاب‌های ماندگار)'; },
  get shockBannerPrefix() { return en() ? 'Weekly Market Shift:' : 'تحول اقتصادی این هفته:'; },
  get monoWarn() { return en() ? 'Monoculture Saturation Active — Diversify crops, artisan & cavern goods for +18% Counter-Boom!' : 'اشباع تک‌کشتی فعال شد — با تنوع محصولات، کارگاه و غار/جنگل ۱۸٪ پاداش ضد-اشباع بگیر!'; },
  get decreeDeliver() { return en() ? 'Dispatch Royal Convoy' : 'تحویل کاروان فرمان شاهی'; },
  get decreeDone() { return en() ? 'Fulfilled This Week' : 'در این هفته تسویه شد'; },
  get charterEnactBtn() { return en() ? 'Ratify in Village Council' : 'تصویب در شورای دهکده'; },
  get charterLockedHint() { return en() ? 'Unlocks at Chapter' : 'باز شدن در فصل'; },
  get placeFarm() { return en() ? 'Main Farm' : 'مزرعهٔ اصلی'; },
  get placeNorth() { return en() ? 'North Meadow' : 'دشت شمالی'; },
  get placeValley() { return en() ? 'Sunlit Valley' : 'باغ‌درهٔ آفتاب'; },
  get placeTown() { return en() ? 'Town Square' : 'میدان شهر'; },
  get placeRiver() { return en() ? 'Riverbank' : 'رودخانه'; },
  get placeApiary() { return en() ? 'Apiary' : 'زنبورستان'; },
};

export const SHOCK_LOCALE = {
  'royal-banquet': {
    faTitle: 'ضیافت بزرگ فصل دربار',
    faDesc: '+۲۸٪ تقاضای باغ میوه، زعفران، عسل و دنبلان جنگلی',
    enTitle: 'Grand Seasonal Court Banquet',
    enDesc: '+28% demand for Orchard fruits, Saffron, Honey & Forest Truffles',
  },
  'pass-snow': {
    faTitle: 'انسداد گردنه و رونق کالای فرآوری و گوهر',
    faDesc: '+۳۰٪ ارزش فیروزه، کهربا، پنیر و نگین دست‌ساز در بازار شهر',
    enTitle: 'Mountain Pass Blockade — Artisan & Gem Boom',
    enDesc: '+30% value on Turquoise, Amber, Cheese & Crafted Talismans',
  },
  'silk-caravan': {
    faTitle: 'ورود کاروان ابریشم به میدان شهر',
    faDesc: '+۲۶٪ خرید پشم، شیر، انگور، زیتون و فیروزهٔ رگه‌دار',
    enTitle: 'Silk-Road Merchant Caravan Arrival',
    enDesc: '+26% payout on Wool, Milk, Grape, Olive & Vein Turquoise',
  },
  'herbal-guild': {
    faTitle: 'فراخوان داروسازان و حکیمان ولایت',
    faDesc: '+۳۲٪ قیمت گیاه دارویی کوهی، قارچ مه، انار و عسل طبیعی',
    enTitle: 'Apothecary & Healers Guild Surge',
    enDesc: '+32% payout on Mountain Herbs, Forest Mushrooms, Pomegranate & Honey',
  },
} as const;

export const DECREE_LOCALE = {
  'decree-1': {
    fa: 'تدارکات کاروان کوهستان (زراعت + دام + غار/جنگل)',
    en: 'Mountain Caravan Provision (Crop + Ranch + Frontier)',
  },
  'decree-2': {
    fa: 'سفارش حکیم‌باشی و معمار قنات',
    en: 'Grand Apothecary & Qanat Guild Order',
  },
  'decree-3': {
    fa: 'فرمان طلایی سه‌اقلیم دربار (چالش استراتژیک سطح بالا)',
    en: 'Imperial Three-Realm Charter (Late-Game Strategic Challenge)',
  },
} as const;

