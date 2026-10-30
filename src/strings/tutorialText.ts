/** Copy for the rebuilt, non-blocking first-day coach. Kept outside UI dictionaries. */
export interface TutorialStepText {
  icon: string;
  title: string;
  hint: string;
  selectHint?: string;
  townHint?: string;
  target: string;
}

export const TUTORIAL_COPY = {
  fa: {
    region: 'راهنمای تعاملی روز اول',
    short: 'راهنما',
    kicker: 'روز نخست',
    step: 'گام',
    of: 'از',
    minimize: 'جمع کردن راهنما',
    expand: 'باز کردن راهنمای روز اول',
    skip: 'رد کردن آموزش',
    progress: 'پیشرفت آموزش',
    targetPrefix: 'هدف: ',
    steps: [
      {
        icon: 'hoe', title: 'کرت را شخم بزن',
        hint: 'بیل آماده است؛ روی کرتِ نشان‌دار بزن.',
        selectHint: 'ابزار «شخم» و سپس کرتِ نشان‌دار را انتخاب کن.', target: 'کرت ۱',
      },
      {
        icon: 'seed:wheat', title: 'گندم بکار',
        hint: 'بذر گندم انتخاب شده است؛ روی همان کرت بزن.',
        selectHint: 'ابزار «کاشت» را انتخاب کن و روی کرتِ شخم‌خورده بزن.', target: 'کرت شخم‌خورده',
      },
      {
        icon: 'can', title: 'کرت را آب بده',
        hint: 'با آب‌پاش روی کرت بزن؛ این محصول تمرینی سریع می‌رسد.',
        selectHint: 'ابزار «آب» را انتخاب کن و کرتِ نشان‌دار را آبیاری کن.', target: 'کرت گندم',
      },
      {
        icon: 'sickle', title: 'گندم را بردار',
        hint: 'گندم تمرینی رسیده است؛ با ابزار برداشت روی آن بزن.',
        selectHint: 'ابزار «برداشت» و سپس گندمِ رسیده را انتخاب کن.', target: 'گندم رسیده',
      },
      {
        icon: 'market', title: 'گندم را بفروش',
        hint: 'از دکمهٔ شهر یا نقشه به شهر برو؛ گندمِ کوله در بازار قابل فروش است.',
        townHint: 'روی ساختمان بازار بزن و فروش یک گندم را انتخاب کن.', target: 'شهر و بازار',
      },
      {
        icon: 'ledger', title: 'دفتر سند را باز کن',
        hint: 'کارت «بدهی فصل» بالای صفحه را باز کن؛ مبلغ و سررسید قسط آنجاست.', target: 'دفتر سند',
      },
      {
        icon: 'moon', title: 'به فردا برو',
        hint: 'دکمهٔ ماه بالای صفحه را بزن تا فردا با نیروی کامل شروع شود.', target: 'دکمهٔ ماه',
      },
    ] satisfies TutorialStepText[],
  },
  en: {
    region: 'Interactive first-day guide',
    short: 'Guide',
    kicker: 'First day',
    step: 'Step',
    of: 'of',
    minimize: 'Collapse guide',
    expand: 'Open first-day guide',
    skip: 'Skip tutorial',
    progress: 'Tutorial progress',
    targetPrefix: 'Target: ',
    steps: [
      {
        icon: 'hoe', title: 'Till the plot',
        hint: 'The hoe is ready. Tap the highlighted plot.',
        selectHint: 'Select Till, then tap the highlighted plot.', target: 'Plot 1',
      },
      {
        icon: 'seed:wheat', title: 'Plant wheat',
        hint: 'Wheat is selected. Tap the same plot again.',
        selectHint: 'Select Plant, then tap the tilled plot.', target: 'Tilled plot',
      },
      {
        icon: 'can', title: 'Water the crop',
        hint: 'Use the watering can on the plot. This practice crop grows quickly.',
        selectHint: 'Select Water and water the highlighted crop.', target: 'Wheat plot',
      },
      {
        icon: 'sickle', title: 'Harvest the wheat',
        hint: 'The practice wheat is ripe. Select Harvest and tap it.',
        selectHint: 'Select Harvest, then tap the ripe wheat.', target: 'Ripe wheat',
      },
      {
        icon: 'market', title: 'Sell the wheat',
        hint: 'Go to Town with the Town button or Atlas. Your harvested wheat is in the backpack.',
        townHint: 'Tap the Market building, then sell one wheat.', target: 'Town market',
      },
      {
        icon: 'ledger', title: 'Open the deed ledger',
        hint: 'Open the Current Deed card at the top to see the installment and due date.', target: 'Deed ledger',
      },
      {
        icon: 'moon', title: 'Rest for tomorrow',
        hint: 'Tap the moon button at the top to start tomorrow with full stamina.', target: 'Moon button',
      },
    ] satisfies TutorialStepText[],
  },
} as const;

/** Legacy coach-mark keys remain available to the shared UI dictionary. */
export const TUTORIAL_UT_EN = {
  tutSell: 'Sell at the market',
  tutSellHint: 'Travel to Town and sell one harvested crop at the Market.',
  tutLedger: 'Open the deed ledger',
  tutLedgerHint: 'Select the Current Deed card at the top to open the ledger.',
  tutSleep: 'Rest until tomorrow',
  tutSleepHint: 'Use the moon button at the top to begin tomorrow with full stamina.',
} as const;
