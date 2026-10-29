// Complete English (EN) & Persian (FA) localization files for ALL 79 cinematic scenes,
// UI controls, character names, scene titles, and closing Next-Objective banners (zero hardcoded strings).
import type { CharId } from '../story/types';

export interface CinemaUiStrings {
  skip: string;
  fastForward: string;
  next: string;
  finish: string;
  replayTag: string;
  objectivePrefix: string;
  directorBtn: string;
  directorTitle: string;
  langToggle: string;
  filterAll: string;
  launchScene: string;
  close: string;
  seenBadge: string;
  unseenBadge: string;
  majorBadge: string;
  routineBadge: string;
  triggerLabel: string;
  flagsLabel: string;
  proceduralLabel: string;
  fineTitle: string;
  fineEnergy: string;
  fineEnergyVal: string;
  fineStand: string;
  fineAckBtn: string;
  areas: Record<string, string>;
  cats: Record<string, string>;
}

export const CINEMA_UI: Record<'fa' | 'en', CinemaUiStrings> = {
  fa: {
    skip: 'رد کردن صحنه',
    fineTitle: 'خلاصهٔ جریمهٔ قسط',
    fineEnergy: 'انرژی',
    fineEnergyVal: 'نصف شد',
    fineStand: 'اعتبار نزد روستا',
    fineAckBtn: 'متوجه شدم',
    fastForward: 'تند',
    next: 'ادامه',
    finish: 'پایان',
    replayTag: 'بازپخش کارگردان',
    objectivePrefix: 'هدف بعدی: ',
    directorBtn: 'گالری صحنه‌های سینمایی',
    directorTitle: 'گالری و میز کارگردانی صحنه‌های سینمایی',
    langToggle: 'زبان بازی: فارسی',
    filterAll: 'همه',
    launchScene: 'اجرای صحنه',
    close: 'بستن',
    seenBadge: 'دیده‌شده',
    unseenBadge: 'جدید',
    majorBadge: 'سینمایی اصلی',
    routineBadge: 'کوتاه زنده',
    triggerLabel: 'شرط اجرا',
    flagsLabel: 'نشانگرها',
    proceduralLabel: 'صحنهٔ پویا',
    areas: { farm: 'مزرعهٔ اصلی', north: 'دشت شمالی', valley: 'باغ‌درهٔ آفتاب', town: 'شهر', river: 'رودخانه', apiary: 'دشت زنبورستان' },
    cats: {
      all: 'همه', prologue: 'پرولوگ', chapter: 'فصل‌ها', deed: 'سندها', visit: 'شرخر',
      sharkhar: 'واکنش جهانگیر', villager: 'اهالی شهر', area: 'نواحی', quest: 'کوئست‌ها', shop: 'مغازه‌ها', season: 'فصل سال', secret: 'رازهای مخفی',
    },
  },
  en: {
    skip: 'Skip Scene',
    fineTitle: 'Installment Penalty Summary',
    fineEnergy: 'Energy',
    fineEnergyVal: 'Halved',
    fineStand: 'Village standing',
    fineAckBtn: 'Understood',
    fastForward: 'Fast',
    next: 'Next',
    finish: 'Finish',
    replayTag: 'Director Replay',
    objectivePrefix: 'Next Objective: ',
    directorBtn: 'Scene Director Gallery',
    directorTitle: 'In-Engine Cinematic Scene Gallery & Debug Launcher',
    langToggle: 'Language: English',
    filterAll: 'All',
    launchScene: 'Play Scene',
    close: 'Close',
    seenBadge: 'Seen',
    unseenBadge: 'New',
    majorBadge: 'Major Film',
    routineBadge: 'Short Live',
    triggerLabel: 'Trigger',
    flagsLabel: 'Flags',
    proceduralLabel: 'procedural',
    areas: { farm: 'Main Farm', north: 'Northern Meadow', valley: 'Sunlit Valley', town: 'Town', river: 'River', apiary: 'Apiary' },
    cats: {
      all: 'All', prologue: 'Prologue', chapter: 'Chapters', deed: 'Deeds', visit: 'Visits',
      sharkhar: 'Sharkhar', villager: 'Villagers', area: 'Areas', quest: 'Quests', shop: 'Shops', season: 'Seasons', secret: 'Secrets',
    },
  },
};

export const CHAR_NAMES: Record<'fa' | 'en', Record<CharId, string>> = {
  fa: {
    narrator: 'راوی',
    player: 'وارث مزرعه',
    jahangir: 'آقا جهانگیر',
    engineer: 'مهندس کاوه',
    grandma: 'مادربزرگ نصرت',
    sara: 'سارا (بازار)',
    rancher: 'عمو مراد دامدار',
  },
  en: {
    narrator: 'Narrator',
    player: 'Young Farmer',
    jahangir: 'Agha Jahangir',
    engineer: 'Engineer Kaveh',
    grandma: 'Grandma Nosrat',
    sara: 'Sara (Market)',
    rancher: 'Uncle Morad',
  },
};

import { ESTATE_EN_LINES } from './estateStoryText';
import { EXTRA_NPC_QUEST_EN_LINES } from '../story/npcQuests';
import { EN_SEASONAL_NPC_LINES } from '../story/socialVillagers';

export const EN_LINES: Record<string, string[]> = {
  ...ESTATE_EN_LINES,
  ...EXTRA_NPC_QUEST_EN_LINES,
  ...EN_SEASONAL_NPC_LINES,
  p1: [
    'We made it—Grandpa’s home at last!',
    'Welcome back, son! I have waited so long for you—come here and let me hug you!',
  ],
  p2: [
    'Hello, Grandma! Where should I start?',
    'I am Grandma Nosrat, your grandfather’s next-door neighbor. Welcome, son—eat some fresh bread first and catch your breath.',
  ],
  p3: [
    'Before I forget: a heavy old debt still sits on this farm’s deed.',
    'Jahangir knows everything—go to his office to sort out the installments. I will bake fresh bread for you!',
  ],
  p4: [
    'Six million coins of debt, six separate deeds registered against this farm—and you must not sell the land.',
  ],
  p5: [
    'You pay one small installment every 28 days; keep up and the deed clears and you can relax.',
    'Six million coins?! All I have right now is this old hoe and tiny savings!',
    'Easy now—nobody pays all at once. I am fair; even this soft foam club is named "Gentle," strictly for friendly reminders!',
  ],
  p6: [
    'The whole debt is split into six separate deeds—one per chapter—and the first one is very light.',
    'Behave and your credit rises; fall behind and I will visit your farm myself with "Gentle"!',
    'What happens if I come up short at month end?',
    'One harmless boop from "Gentle," part of your pocket cash credited toward the debt, plus a small late fee!',
  ],
  p7: [
    'Deed One: fifteen thousand coins, with no added interest.',
    'Pick up the hoe and start with the plots—you will bring this farm back to life with your own hands!',
  ],
  'ch1-outro': [
    'Well done, son! The first fifteen thousand coins are paid off, and your rows are finally green again.',
    'Next is Deed Two: the cost of pruning and maintaining your boundary orchard trees while the farm stood empty.',
    'Do not worry, sweetheart—build two animal pens alongside your crops and your income will multiply fast!',
  ],
  'ch2-outro': [
    'Deed Two is stamped clear! Honestly, I wanted to be sure you would not quit after the first harvest.',
    'Told you, sweetheart! Jahangir acts gruff, yet seeing this farm bloom makes him prouder than anyone.',
  ],
  'ch3-outro': [
    'Sweetheart, I found your grandfather’s old tin box in the storeroom—he left a letter inside for you.',
    'Grandfather wrote: "Forgive me for leaving debt behind. City speculators wanted to bulldoze our orchard—please revive the village qanat."',
    '... God rest his soul. He was a great man. Come on—let’s open the Qanat Deed and bring water back to the whole village.',
  ],
  'ch4-outro': [
    'Great news! The underground qanat is cleared and fresh water is rushing down the main channel stronger than ever!',
    'Day one I swore a city kid would quit in a month—I take every word back, son. You earned real respect!',
    'With fresh qanat water and a greenhouse running, the Town Market wants your produce all four seasons!',
  ],
  'ch5-outro': [
    'Deed Five is paid down to the last coin! I tore up the bank contract so no city speculator can ever touch your farm.',
    'Bravo, Engineer! Now only the final homestead deed remains inside my safe.',
  ],
  'ch6-outro': [
    'It is done! The sixth and final deed is cleared—every single inch of this homestead belongs freely to you.',
    'Now hear the truth: forty years ago I was an orphan farmhand, and your grandfather taught me everything I know.',
    'Wait a second... then what was the whole six-million-coin debt really about?!',
    'Your grandfather’s own wish! He feared speculators would buy you out cheap, so he made me promise to test you until you became a true master farmer!',
  ],
  finale: [
    'Grand Harvest Festival night! The whole village has gathered as Jahangir places a heavy wooden chest onto the table.',
    'Here, son—every single coin I collected during surprise visits was saved safely for you, plus twenty percent bonus interest!',
    'Your grandfather would be beaming tonight, sweetheart! Hot bread and festival dinner are ready—everyone dig in!',
  ],
  'note-open-1': [
    'Deed Two: seventy thousand coins for pruning and fixing your boundary orchard fences while nobody lived here!',
    'Seventy thousand coins just for boundary trees?!',
    'Empty orchards cost money, brother! Start raising livestock and you will cover it smoothly.',
  ],
  'note-open-2': [
    'Deed Three: two hundred and fifty thousand coins—your grandfather’s drought loan that saved the village orchards. Pay steadily.',
  ],
  'note-open-3': [
    'Deed Four: seven hundred thousand coins to dredge and rebuild the village’s main underground qanat.',
    'Do not stress over the figure—build a glass greenhouse too and year-round harvests will cover every installment.',
  ],
  'note-open-4': [
    'City speculators tried to buy up your debt, so I stepped in first and registered one million six hundred thousand under clear legal terms.',
    'Good catch, Engineer—just pay on schedule, son, because official bank clauses never blink!',
  ],
  'note-open-5': [
    'Deed Six—the Final Deed: three million three hundred sixty-five thousand coins to release the full farm title forever.',
    'This is the final stretch, son; clear this last paper and the whole village feast is on me!',
  ],
  'visit-due-paid': [
    'Hello, neighbor! Just stopped by for tea—you already paid this cycle’s installment right on schedule.',
    'Punctual farmers make my job easy. Keep up the great work!',
  ],
  'visit-due-missed': [
    'Hey brother, installment day arrived and you missed it! "Gentle," give him a tiny reminder!',
    'The soft foam club lands on your straw hat with a comic BOOP—zero pain, plenty of embarrassment!',
    'I credited part of your pocket coins to the debt plus a small late fee. Be on time next month!',
  ],
  'visit-due-missed-0': [
    'Did you forget due day on the calendar, brother? "Gentle," one soft tap!',
    'BOOP! The foam club pops your straw hat straight up into the morning air.',
    'Installment share collected from your pocket plus a small late fee. See you on time next cycle!',
  ],
  'visit-due-missed-1': [
    'Behind on the installment again? Step into the yard so you remember due day next month!',
    'A playful cartoon dust cloud puffs up while ledger slips flutter in the breeze.',
    'Brush off your vest, son—some pocket cash went to your debt; plant an extra crop row tomorrow!',
  ],
  'visit-due-missed-2': [
    'Sit by the samovar. No foam club today—just one firm palm slap on the wooden table!',
    'Teacups clatter cheerfully while little cartoon stars circle over the farmer’s hat.',
    'Drink your tea and rest up; I logged the small late fee so next month stays right on schedule.',
  ],
  'visit-raid': [
    'Surprise inspection! Saw your pockets jingling with coins and stopped by before you spent it all!',
    'Half goes straight toward paying down your debt, and the other half stays safely in trust with me!',
  ],
  'visit-rest': [
    'Your installment is fully paid—I just happened to stroll down your lane to check on the crops.',
    'Right, Jahangir—strolling down a dead-end farm lane by pure coincidence!',
  ],
  'reaction-rich': ['Your coin pouch is nice and full! Pay extra on your deed early to cut down interest.'],
  'reaction-poor': ['Running low on cash, son—plant quick wheat and carrots to rebuild working capital fast.'],
  'reaction-bad': ['Your credit score slipped, brother—pay two installments on time and you are back in good standing.'],
  'sharkhar-ch1-rich': ['Heavy coin pouch already! Did you dig up treasure behind the barn?', 'Pure hard work on the plots, Jahangir.', 'Bravo—full pockets keep my foam club completely unemployed!'],
  'sharkhar-ch1-bad': ['Barely started Deed One and already late? "Gentle" just yawned.', 'The first installment is small—pay on time and keep things easy.'],
  'sharkhar-ch1-debt': ['Empty pockets on week one are normal—just till four rows and sell the harvest.', 'Count on it before due day.'],
  'sharkhar-ch2-rich': ['Business is booming! Those new animal pens clearly paid off.', 'Put any extra cash on the deed early so you pay less interest.'],
  'sharkhar-ch2-bad': ['Folks in town are asking whether you came here to farm or take naps!', 'The pens just started producing—give me a few days.', 'Settle an installment soon so your credit bounces right back!'],
  'sharkhar-ch2-debt': ['Short on coins this week? Keep your hens fed—fresh eggs bring steady daily cash.', 'Hey, that was not friendly advice—I just want my installment on time!'],
  'sharkhar-ch3-rich': ['Fish ponds running and pockets full! Your grandfather would be proud to see this.', '... Drink your tea before it gets cold.'],
  'sharkhar-ch3-bad': ['Your grandfather’s loan is on the table and you missed the date?', 'That drought loan is steep—I am working on it!', 'Save coins in your safe stash bit by bit so due day never catches you off guard.'],
  'sharkhar-ch3-debt': ['Deed Three is bigger, no doubt. Pay whatever you can spare along the way.', 'As soon as your pond fish mature, income jumps sharply.'],
  'sharkhar-ch4-rich': ['Greenhouse shining and cash flowing! Even Engineer Kaveh was impressed yesterday.', 'Drop a payment in the Ledger and keep cruising!'],
  'sharkhar-ch4-bad': ['Kaveh worried qanat repairs might overwhelm you—prove him wrong!', 'Count on it.', 'Great—pay on schedule and watch your credit climb!'],
  'sharkhar-ch4-debt': ['Greenhouse glass costs plenty upfront, yet winter harvests pay it back fast.'],
  'sharkhar-ch5-rich': ['With pockets that full, the bank contract will be cleared in no time!', 'Head to the Ledger whenever you want to knock out a big chunk.'],
  'sharkhar-ch5-bad': ['Missing dates on Deed Five costs both credit and bank late fees—watch the calendar closely!', 'Got it—clearing it right away.'],
  'sharkhar-ch5-debt': ['Hiring three farmhands took cash today, right? Tomorrow they double your output.', 'Wait—are you actually cheering for me now?', 'Ahem! I purely cheer for punctual accounting!'],
  'sharkhar-ch6-rich': ['Look at this place... once tall weeds, now the finest farm in the valley!', 'Step into the Office whenever you are ready to clear the final deed!'],
  'sharkhar-ch6-bad': ['You are right at the finish line—do not let due day slip on the last deed!', '"Gentle" stays on the wall; come finish this proudly!'],
  'sharkhar-ch6-debt': ['The final deed is large, yet your farm earns more every single week. Keep steady!', 'The village festival lanterns are almost ready!'],
  'sharkhar-postgame': ['Zero deeds left between us, neighbor—sit down for fresh tea!', 'Truly retired the foam club?', '"Gentle" hangs retired above the samovar forever!'],
  'town-grandma-0': ['Welcome, sweetheart! Seeing these green fields brings back the happiest days of this village.', 'Your kindness keeps me going every day, Grandma.'],
  'town-grandma-1': ['Plant a different crop on each plot next round—crop rotation boosts harvest yield!'],
  'town-grandma-2': ['Secret between us: Jahangir brags to everyone in town about how hard you work!'],
  'town-sara-0': ['Hi there! Check the green arrow in the Market—high-demand goods pay extra coins today.', 'Great tip, thanks Sara!'],
  'town-sara-1': ['Market supply contracts pay a 45% bonus if you deliver the requested goods on time!'],
  'town-sara-2': ['Honey jars and autumn pomegranates always sell for great money at my stall.'],
  'town-engineer-0': ['Upgrading your farm well cuts water evaporation way down—pure math!'],
  'town-engineer-1': ['A glass greenhouse lets your best crops grow straight through snowy winter days.', 'Best investment on the whole farm!'],
  'town-engineer-2': ['Build a Scarecrow at Carpentry—it keeps surprise collector raids way down!'],
  'town-rancher-0': ['Keep the feed trough stocked for sheep, goats, and cattle—hens and ducks forage free on clean straw!'],
  'town-rancher-1': ['Upgrading pens in Carpentry boosts both capacity and milk/wool quality.', 'Upgrading them soon!'],
  'town-rancher-2': ['Put one male and one female of the same animal in a pen and new babies hatch on their own!'],
  'area-intro-town': [
    'Town Square—six lively shops, friendly neighbors, and the Estate Office all gathered in one place.',
    'Welcome to town! Buy seeds, animals, machines, or sell fresh crops right around this square.',
    'Awesome—everything the farm needs is right here!',
  ],
  'area-intro-river': [
    'The clear village riverbank—cool mountain water with fish swimming under the sunlight.',
    'Here you can fish with a rod for quick cash or build fish ponds for steady big harvests.',
    'Great spot to add steady income beside our crops!',
  ],
  'area-intro-apiary': [
    'The sunny meadow apiary—wildflowers everywhere and honeybees buzzing peacefully.',
    'Your grandfather raised the sweetest honey in the valley right on this hillside, sweetheart.',
    'Let’s set up new beehives and bring that honey back, Grandma!',
  ],
  'area-intro-cave': [
    'The ancient Qanat Crystal Cavern—veins of quartz, turquoise, and sun-amber shimmer across vaulted stone strata.',
    'Each deeper floor yields rarer gems, heir—watch your stamina and rest beside the thermal spring!',
    'Lanterns lit! Let’s delve into the deep crystal strata!',
  ],
  'area-intro-forest': [
    'The Misty Ancient Woods—golden sunbeams filter through towering oaks onto wild herbs and glowing mushrooms.',
    'Three living canopy glades hold rare botanicals and golden truffles, sweetheart—visit the Heartwood Shrine too.',
    'Breathe that mountain air—let’s explore every glade!',
  ],
  'shop-intro-seed': ['Welcome to the Seed Shop! Check the season icons on each packet before planting.', 'Let’s grab fresh seeds for the farm!'],
  'shop-intro-market': ['Welcome to the Town Market! Sell crops here anytime, or sign bonus supply contracts.', 'Fresh farm goods coming right up!'],
  'shop-intro-work': ['Welcome to the Workshop! Buy a tractor, sprinkler, or harvester here to automate farm chores.', 'Automating the fields is going to save tons of time!'],
  'shop-intro-animal': ['Welcome to the Livestock Barn! Hens and ducks forage free on straw, while sheep, goats, and cattle eat from the trough.', 'Got it, Uncle Morad—straw nests and troughs are ready!'],
  'shop-intro-carp': ['Welcome to Carpentry! Build animal pens, silos, greenhouses, and raid-blocking scarecrows here.', 'Time to build up the farm step by step!'],
  'shop-intro-estate': ['Welcome to the Estate Office! Unlock Northern Meadow & Sunlit Valley deeds or hire farmhands right here.', 'Checking the estate deeds and crew contracts first, Jahangir!'],
  'season-dawn-summer': ['Summer has arrived—warm sunshine fills the valley from morning till dusk.', 'Corn, tomatoes, and watermelons love summer sun—keep your watering can handy!'],
  'season-dawn-autumn': ['Autumn is here—cool breezes blow and golden leaves drift across the yard.', 'Pumpkins, grapes, and saffron sell for top prices all autumn long!'],
  'season-dawn-winter': ['Winter morning—soft white snow blankets the farmhouse roof.', 'Rely on your greenhouse, livestock pens, and fish ponds for strong winter profit!'],
  'season-dawn-spring': ['Spring of a brand-new year! Blossoms open and every plot wakes up fresh.', 'New year, bigger harvests—let’s make this our best year yet!'],
  'quest-done-q1': ['Wonderful job, sweetheart! Twenty harvests done, and the farm is truly alive again!', 'Thanks Grandma—putting this quest reward straight toward Deed One!'],
  'quest-done-q2': ['Solid work, kid! Two active animal pens and Level Six—you are a real rancher now!', 'Appreciate the help, Uncle—heading to the Ledger to finish Deed Two!'],
  'quest-done-q3': ['Two stocked fish ponds and Level Ten! Your farm output is growing right on schedule.', 'Now let’s head to the Ledger and pay off Deed Three!'],
  'quest-done-q4': ['The glass greenhouse is built and the village qanat flows crystal clear—amazing work!', 'With four-season harvests running, the whole market counts on your farm!'],
  'quest-done-q5': ['Three farm workers hired and Level Eighteen reached—you run a powerhouse farm now!', 'Together with the crew, those final deeds stand zero chance!'],
  'quest-done-q6': ['Level Twenty-Two! Every lantern in the village is lit for the Grand Harvest Festival!', '... Come to the desk, son. One final stamp makes this farm yours forever.'],
  'secret-midnight-well': [
    'Clear midnight under the stars—suddenly a silver stream of light erupts from the stone well!',
    'Well done, sweetheart! You found your grandfather’s hidden spring—and his keepsake coin pouch beside it!',
    'Unbelievable! The crystal water soaked and enriched every single plot on the farm overnight!',
  ],
  'secret-golden-kingfish': [
    'The fishing line pulls tight under the rain as the legendary Golden Kingfish leaps out of the river!',
    'Are my eyes playing tricks, or did you really reel in the Golden Kingfish of the valley?!',
    'Nobody has caught one in forty years! Collectors in town pay thirty thousand coins cash for this beauty!',
  ],
  'secret-queen-bee-bloom': [
    'Hundreds of golden bees dance in a ring above the hives as the rare Valley Queen settles on the crown box!',
    'Bless your hands! Your blooming farm brought back the Golden Queen—every hive is overflowing with pure honey!',
    'The whole meadow smells amazing, Grandma!',
  ],
  'secret-scarecrow-duel': [
    'Jahangir tiptoes past the hedge for a surprise check—when the Level-Three Scarecrow spring snaps loose!',
    'WHOA!! What kind of monster jumped out of the dark?! My heart nearly jumped out of my boots!',
    'Hahaha! The anti-collector scarecrow works like magic, Jahangir—you even dropped a bag of coins!',
  ],
  'secret-yalda-lanterns': [
    'Warm lanterns glow across the snowy winter night as neighbors gather around trays of pomegranates and tea.',
    'So glad you brought fresh fruit! Longest winter night wouldn’t feel the same without your harvest!',
    '... Ahem! Not inspecting anything tonight—just dropping off cinnamon tea on my way past!',
  ],
  'secret-grandpa-tree': [
    'Your shovel clinks against metal beneath the ancient tree roots—Grandfather’s brass chest emerges from the earth!',
    'Five rare rose seed packets and a heavy pouch of vintage coins with Grandfather’s handwritten note!',
    'Your grandfather swore this treasure belonged to you the day you unlocked every field and enriched the soil!',
  ],
  'secret-silk-merchant': [
    'Great news! The Grand Silk Caravan merchant just bought your saffron and honey at pure gold prices!',
    'Delivering those market contracts on time really opened big doors for our farm!',
  ],
  'secret-true-epilogue': [
    'The grand valley bell rings out across the hills as everyone gathers beside the golden museum statue!',
    'You didn’t just pay off the farm debt—you uncovered every ancient secret your grandfather left behind, kid!',
    'From this day on, your name stands in the valley chronicles as Eternal Master of the Farm!',
    'Three cheers for the greatest farmer this village has ever seen!',
  ],
};

export const OBJECTIVES: Record<'fa' | 'en', Record<string, string>> = {
  fa: {
    prologue: '۲۰ محصول بکار و برداشت کن و ۱۵٬۰۰۰ سکهٔ سند اول را در دفتر کل تسویه کن',
    ch1: '۲ حصار دام بساز، سند دشت شمالی را بخر، به سطح ۶ برس و سند دوم (۷۰٬۰۰۰ سکه) را تسویه کن',
    ch2: '۲ استخر ماهی و ۲ کندو بساز، به سطح ۱۰ برس و سند سوم (۲۵۰٬۰۰۰ سکه) را بپرداز',
    ch3: 'گلخانه بساز، قنات دشت شمالی را احیا کن، به سطح ۱۴ برس و سند چهارم (۷۰۰٬۰۰۰ سکه) را صاف کن',
    ch4: '۳ کارگر استخدام کن، باغ‌درهٔ آفتاب را باز کن، به سطح ۱۸ برس و سند پنجم (۱٬۶۰۰٬۰۰۰ سکه) را بپرداز',
    ch5: 'منشور هر ۳ مزرعه (۱۵۴ کرت) را کامل کن، به سطح ۲۲ برس و آخرین سند (۳٬۳۶۵٬۰۰۰ سکه) را تسویه کن',
    q1done: 'کوئست فصل ۱ کامل شد! به «دفتر کل» برو و باقی‌ماندهٔ سند اول را تسویه کن',
    q2done: 'کوئست فصل ۲ کامل شد! به «دفتر کل» برو و باقی‌ماندهٔ سند دوم را تسویه کن',
    q3done: 'کوئست فصل ۳ کامل شد! به «دفتر کل» برو و باقی‌ماندهٔ سند سوم را بپرداز',
    q4done: 'کوئست فصل ۴ کامل شد! به «دفتر کل» برو و باقی‌ماندهٔ سند چهارم را تسویه کن',
    q5done: 'کوئست فصل ۵ کامل شد! به «دفتر کل» برو و باقی‌ماندهٔ سند پنجم را صاف کن',
    q6done: 'کوئست نهایی کامل شد! در «دفتر کل» آخرین قسط سند ششم را بده تا جشن آزادی شروع شود',
    finale: 'مزرعه برای همیشه آزاد شد! از موزهٔ میراث دیدن کن و مزرعه را تا سطح ۳۰ گسترش بده',
    visit: 'در «دفتر کل» تاریخ قسط بعدی و پس‌انداز امن قلک را بررسی کن',
    town: 'از مغازه‌های شهر بذر، ابزار یا دام بخر و محصولت را در بازار بفروش',
    river: 'با قلاب ماهی بگیر یا استخر پرورش ماهی بساز تا درآمد ثابتی داشته باشی',
    apiary: 'در زنبورستان کندو بخر تا زنبورها برایت عسل تولید کنند',
    default: 'زمین‌ها را آبیاری کن، محصول رسیده را در بازار بفروش و قسط بعدی را پس‌انداز کن',
  },
  en: {
    prologue: 'Harvest 20 crops and pay off Deed #1 (15,000 coins) in the Ledger',
    ch1: 'Build 2 pens, claim Northern Meadow, reach Level 6, and pay Deed #2 (70,000 coins)',
    ch2: 'Build 2 ponds & 2 hives, reach Level 10, and pay off Deed #3 (250,000 coins)',
    ch3: 'Build a Greenhouse, restore Northern Qanat, reach Level 14, and clear Deed #4 (700,000 coins)',
    ch4: 'Hire 3 farmhands, claim Sunlit Valley, reach Level 18, and pay Deed #5 (1,600,000 coins)',
    ch5: 'Complete All 3 Estates (154 plots), reach Level 22, and clear Final Deed (3,365,000 coins)',
    q1done: 'Chapter 1 quest complete! Open the Ledger and finish paying Deed #1',
    q2done: 'Chapter 2 quest complete! Open the Ledger and finish paying Deed #2',
    q3done: 'Chapter 3 quest complete! Open the Ledger and finish paying Deed #3',
    q4done: 'Chapter 4 quest complete! Open the Ledger and finish paying Deed #4',
    q5done: 'Chapter 5 quest complete! Open the Ledger and finish paying Deed #5',
    q6done: 'Final quest complete! Pay off the last balance in the Ledger to start the Festival',
    finale: 'Your farm is 100% debt-free! Visit the Heritage Museum and expand to Level 30',
    visit: 'Check your next installment due date and safe piggy stash in the Ledger',
    town: 'Visit town shops for seeds, tools, or animals and sell crops at the Market',
    river: 'Cast your fishing rod or build fish ponds for steady income',
    apiary: 'Buy beehives in the Apiary to harvest sweet honey jars',
    default: 'Water your crops, sell goods at peak demand, and save for your next installment',
  },
};
