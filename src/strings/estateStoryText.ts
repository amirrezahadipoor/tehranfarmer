// Bilingual (FA + EN) strings for the Two Larger Purchasable Farms, Roads, NPC Roles & Real NPC Quests
// Note: Zero ASCII digits in Persian strings (strictly enforced by audit-playthrough).
import type { CharId } from '../story/types';

export type NpcRoleActor = Exclude<CharId, 'narrator' | 'player'>;

export const NPC_ROLES: Record<'fa' | 'en', Record<NpcRoleActor, { name: string; job: string }>> = {
  fa: {
    grandma: { name: 'مادربزرگ نصرت', job: 'بزرگ دهکده' },
    sara: { name: 'سارا', job: 'غرفه‌دار بازار' },
    engineer: { name: 'مهندس کاوه', job: 'مهندس آب و کارگاه' },
    rancher: { name: 'عمو مراد', job: 'استاد دامدار' },
    jahangir: { name: 'آقا جهانگیر', job: 'طلبکار و صاحب املاک' },
  },
  en: {
    grandma: { name: 'Grandma Nosrat', job: 'Village Elder' },
    sara: { name: 'Sara', job: 'Market Merchant' },
    engineer: { name: 'Eng. Kaveh', job: 'Water & Workshop Eng.' },
    rancher: { name: 'Uncle Morad', job: 'Master Rancher' },
    jahangir: { name: 'Agha Jahangir', job: 'Creditor & Estate Broker' },
  },
};

export const ESTATE_UI = {
  fa: {
    goNorth: 'سفر به مزرعهٔ دشت شمالی',
    goValley: 'سفر به مزرعهٔ باغ‌درهٔ آفتاب',
    farmShort: 'مزرعهٔ اصلی',
    northShort: 'دشت شمالی',
    valleyShort: 'باغ‌درهٔ آفتاب',
    mainFarmCard: 'مزرعهٔ اصلی (۴۰ کرت)',
    mainFarmOpen: 'همهٔ ۴۰ کرت از روز اول کاملاً باز است',
    northFarmCard: 'مزرعهٔ بزرگ دشت شمالی (۵۴ کرت)',
    northFarmDesc: 'زمین پهناور کنار آسیاب بادی با چاه سنگی و جادهٔ اختصاصی',
    northQanatCard: 'احیای قنات دشت شمالی',
    northQanatDesc: 'آبرسانی دائمی قنات و کاهش تبخیر ۵۴ کرت دشت شمالی',
    valleyFarmCard: 'مزرعهٔ عظیم باغ‌درهٔ آفتاب (۶۰ کرت)',
    valleyFarmDesc: 'بزرگ‌ترین مزرعهٔ دره کنار آبشار کوهستانی و سروهای کهنسال',
    valleyCharterCard: 'منشور یکپارچهٔ هر سه مزرعه (۱۵۴ کرت)',
    valleyCharterDesc: 'ثبت نهایی میراث پدربزرگ و حاصلخیزی دائمی باغ‌دره',
    buyDeedBtn: 'خرید سند مزرعه',
    lockedNorthToast: 'سند «دشت شمالی» (۵۴ کرت) را از دفتر املاک شهر تهیه کن',
    lockedValleyToast: 'سند «باغ‌درهٔ آفتاب» (۶۰ کرت) را از دفتر املاک شهر تهیه کن',
    deedBoardNorth: 'دشت شمالی — ۵۴ کرت',
    deedBoardValley: 'باغ‌درهٔ آفتاب — ۶۰ کرت',
    deedBoardHint: 'خرید سند در دفتر املاک شهر',
    npcQuestsTitle: 'مأموریت‌های اهالی دهکده',
    npcQuestTalkHint: 'علامت تعجب زرد بالای نام اهالی شهر نشان‌دهندهٔ کوئست آماده است',
    npcQuestActive: 'در جریان',
    npcQuestReady: 'آمادهٔ تحویل در شهر!',
  },
  en: {
    goNorth: 'Travel to Northern Meadow Farm',
    goValley: 'Travel to Sunlit Valley Farm',
    farmShort: 'Main Homestead',
    northShort: 'Northern Meadow',
    valleyShort: 'Sunlit Valley',
    mainFarmCard: 'Main Homestead (40 Plots)',
    mainFarmOpen: 'All 40 plots unlocked from Day 1',
    northFarmCard: 'Northern Meadow Estate (54 Plots)',
    northFarmDesc: 'Vast windy plateau with stone well, windmill & road link',
    northQanatCard: 'Restore Northern Qanat',
    northQanatDesc: 'Permanent mountain water channel boosting all 54 plots',
    valleyFarmCard: 'Sunlit Valley Estate (60 Plots)',
    valleyFarmDesc: 'Largest terraced estate by the mountain waterfall & cypresses',
    valleyCharterCard: 'Three-Estate Heritage Charter (154 Plots)',
    valleyCharterDesc: 'Grandpa’s unified deed blessing all three estates',
    buyDeedBtn: 'Buy Deed',
    lockedNorthToast: 'Purchase the Northern Meadow deed (54 plots) at Town Estate Office',
    lockedValleyToast: 'Purchase the Sunlit Valley deed (60 plots) at Town Estate Office',
    deedBoardNorth: 'Northern Meadow · 54 Plots',
    deedBoardValley: 'Sunlit Valley · 60 Plots',
    deedBoardHint: 'Buy Deed at Town Estate Office',
    npcQuestsTitle: 'Villager Story Quests',
    npcQuestTalkHint: 'A golden ! above a villager in Town marks an available quest',
    npcQuestActive: 'In Progress',
    npcQuestReady: 'Turn in at Town!',
  },
} as const;

export const ESTATE_EN_LINES: Record<string, string[]> = {
  'area-intro-north': [
    'Look at this wide northern plateau! Fifty-four rich plots stretch right beside your grandfather’s old windmill.',
    'Jahangir locked its deed years ago, yet the road from the main homestead still leads straight here.',
    'Once we reach Level Four and register the deed at the Town Estate Office, every single plot here will bloom again!',
  ],
  'estate-north-bought': [
    'Congratulations, kid! The Northern Meadow deed is officially yours—fifty-four brand-new plots ready for the plow!',
    'Wait a second—you actually bought out the entire Northern Meadow?! How can one farmer tend ninety-four plots?!',
    'With hired farmhands walking between our farms and steady mountain water, watch how fast this meadow turns gold!',
  ],
  'estate-north-qanat': [
    'Stand back—the last keystone is clear, and crystal mountain water is rushing back through the Northern Qanat!',
    'Listen to that water sing! Your grandfather carved this stone channel with his own two hands fifty years ago.',
    'Now all fifty-four plots of Northern Meadow hold moisture deeper and yield richer harvests every season!',
  ],
  'estate-north-harvest': [
    'The scent of fresh harvest from Northern Meadow just filled the whole village—the old windmill is smiling again!',
    'Our first harvest on Northern Meadow is in, and this is only the beginning!',
  ],
  'area-intro-valley': [
    'Welcome to Sunlit Valley—sixty sheltered terraced plots warmed by mountain cliffs and fed by a living waterfall!',
    'Even in harsh winds, fruit trees, saffron, and roses thrive down in this valley like nowhere else in the county.',
    'When your farm reaches Level Fourteen, pick up the Sunlit Valley deed at the Estate Office and claim Grandpa’s crown jewel!',
  ],
  'estate-valley-bought': [
    'Sixty more plots unlocked in a single stroke! From the main homestead to Northern Meadow and Sunlit Valley—all connected!',
    'Unbelievable... a hundred and fifty-four plots under one banner! My ledger barely has enough pages for your harvests!',
    'Every road between our three farms is open now, and our workers are already heading down to till the valley terraces!',
  ],
  'estate-valley-legacy': [
    'Look beneath the cypress tree—Grandfather’s carved boundary stone uniting all three farms of the valley!',
    'Main Homestead, Northern Meadow, and Sunlit Valley... you fulfilled the dream he spent his whole life building.',
    'With three thriving estates behind us, settling the final deed is right within reach!',
  ],
  'estate-valley-harvest': [
    'The harvest from Sunlit Valley’s sunlit terraces tastes extraordinary—the whole town market wants your next load!',
    'All three farms are producing together like clockwork!',
  ],
  'npc-q-grandma-1-start': [
    'Sweetheart, your grandfather always started a new season by bringing twelve fresh bundles home from the main field.',
    'Count on me, Grandma—I will harvest twelve fresh crops and bring life back to every corner of the homestead!',
  ],
  'npc-q-grandma-1-done': [
    'Bless your hands, dear! The scent of twelve fresh harvests just took me back forty years—take these coins from my sash!',
  ],
  'npc-q-rancher-1-start': [
    'Hey neighbor! Those free-range hens lay golden eggs right on the straw bed—gather six fresh products and show me your touch!',
    'Right away, Uncle Morad—I will collect six fresh ranch goods and bring them straight over!',
  ],
  'npc-q-rancher-1-done': [
    'Ha! Clean straw and healthy birds—you have a true rancher’s eye, kid! Take this bonus coin pouch!',
  ],
  'npc-q-sara-1-start': [
    'The market stalls are hungry for your produce! Earn two thousand five hundred coins in sales so I can list you as a prime supplier!',
    'Deal, Sara! Fresh crops are heading to the market stalls right away!',
  ],
  'npc-q-sara-1-done': [
    'Every basket sold out before noon! Here is your merchant bonus—our customers already ask for your farm by name!',
  ],
  'npc-q-engineer-1-start': [
    'Numbers never lie: hand-watering alone wastes half your day. Upgrade the Drip Well or install a Workshop Sprinkler!',
    'Smart call, Engineer Kaveh—upgrading our water system is next on my list!',
  ],
  'npc-q-engineer-1-done': [
    'Precision hydraulics in action! Take this engineering grant—your water pressure across the farm looks textbook!',
  ],
  'npc-q-grandma-2-start': [
    'Now that the main field is thriving, my heart longs to see the old Northern Meadow deed return to our family at the Estate Office.',
    'I will head to the Estate Office and bring Northern Meadow’s fifty-four plots back home, Grandma!',
  ],
  'npc-q-grandma-2-done': [
    'The Northern Meadow windmill is turning for our family once more! Take this keepsake reward, my proud heir!',
  ],
  'npc-q-rancher-2-start': [
    'Time to scale up the ranch! Gather twenty-five total dairy, wool, or egg products across your animal sections!',
    'Consider it done, Uncle Morad—all our animal sections are thriving!',
  ],
  'npc-q-rancher-2-done': [
    'Finest wool and milk in the valley! Here is a hearty rancher’s purse for your hard work!',
  ],
  'npc-q-engineer-2-start': [
    'Northern Meadow sits right above an ancient underground qanat! Restore its water channel at the Estate Office or build a Glass Greenhouse!',
    'Let’s bring high-tech irrigation to our estates—on it right now, Kaveh!',
  ],
  'npc-q-engineer-2-done': [
    'Magnificent engineering! Your estates now run like clockwork—accept this master guild reward!',
  ],
  'npc-q-sara-2-start': [
    'City merchants are offering top gold if we unlock the sixty-plot Sunlit Valley Estate! Claim its deed at the Estate Office!',
    'Sunlit Valley’s sixty plots will change everything—I am going for that deed right away, Sara!',
  ],
  'npc-q-sara-2-done': [
    'Three estates supplying the whole region! Take this grand trade commission—you are officially the top grower in town!',
  ],
};
