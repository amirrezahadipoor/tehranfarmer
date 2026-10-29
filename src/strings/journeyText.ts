import { CFG } from '../game/settings';

export interface JourneyChapterCopy {
  title: string;
  recap: string;
}

const FA: readonly JourneyChapterCopy[] = [
  { title: 'پرولوگ — میراث و دفتر شش‌سندی', recap: 'به مزرعهٔ پدربزرگ برگشته‌ای؛ مادربزرگ نصرت کنارت است و جهانگیر برای شش سند، حساب‌وکتاب روشنی پیش رویت گذاشته.' },
  { title: 'فصل ۱ — نخستین برداشت', recap: 'کرت‌های خالی دوباره جان می‌گیرند. اولین برداشت تو ثابت می‌کند این مزرعه هنوز آینده‌ای دارد.' },
  { title: 'فصل ۲ — دشت شمالی و دامداری', recap: 'دام‌ها به مزرعه برمی‌گردند و سند دشت شمالی، افق تازه‌ای برای خانواده و کار روزانه می‌گشاید.' },
  { title: 'فصل ۳ — آب، عسل و ماشین‌ها', recap: 'قنات، کندوها و کارگاه به هم می‌رسند؛ حالا مزرعه فقط زمین نیست، یک چرخهٔ زندهٔ تولید است.' },
  { title: 'فصل ۴ — قنات و گلخانه', recap: 'آب قدیمی و گلخانهٔ تازه، برداشت را از فصل‌ها آزاد می‌کنند و اعتبار تو نزد اهالی بیشتر می‌شود.' },
  { title: 'فصل ۵ — باغ‌دره و همکاران', recap: 'باغ‌درهٔ آفتاب و کارگران تازه، مزرعهٔ خانوادگی را به همکاری بزرگ و منظم دهکده تبدیل می‌کنند.' },
  { title: 'فصل ۶ — منشور آزادی مزرعه', recap: 'آخرین منشور، خاک طلایی و ماشین‌های کامل، میراث را برای تسویهٔ نهایی و آزادی همهٔ زمین‌ها آماده می‌کنند.' },
];

const EN: readonly JourneyChapterCopy[] = [
  { title: 'Prologue — Inheritance & Six Deeds', recap: 'You have returned to Grandpa’s farm. Grandma Nosrat stands with you, while Jahangir has laid out six deeds and a clear ledger.' },
  { title: 'Chapter 1 — First Harvest', recap: 'Empty plots come back to life. Your first harvest proves this old farm still has a future.' },
  { title: 'Chapter 2 — Northern Meadow & Ranching', recap: 'Animals return to the homestead and the Northern Meadow deed opens a new horizon for daily work.' },
  { title: 'Chapter 3 — Water, Honey & Machines', recap: 'Qanats, hives and the workshop connect; the farm becomes a living production cycle rather than bare land.' },
  { title: 'Chapter 4 — Qanat & Greenhouse', recap: 'Ancient water and a new greenhouse free harvests from the seasons and strengthen your village standing.' },
  { title: 'Chapter 5 — Sunlit Valley & Farmhands', recap: 'Sunlit Valley and a reliable crew turn the family farm into an organized village partnership.' },
  { title: 'Chapter 6 — The Freedom Charter', recap: 'The final charter, golden soil and a complete machine fleet prepare every field for its final release.' },
];

export function journeyCopy() {
  const en = CFG.locale === 'en';
  return {
    chapters: en ? EN : FA,
    journeyTitle: en ? 'Farm Journey Journal' : 'دفتر سفر مزرعه',
    chapterWord: en ? 'Chapter' : 'فصل',
    done: en ? 'Completed' : 'روایت‌شده',
    current: en ? 'Current chapter' : 'فصل جاری',
    upcoming: en ? 'Ahead' : 'در ادامه',
    actionHint: en ? 'Go to this objective' : 'رفتن به محل این هدف',
    postgameTitle: en ? 'Epilogue — A Village Breathing Again' : 'پایان — دهکده‌ای که دوباره نفس می‌کشد',
    postgameRecap: en
      ? 'All six deeds are settled. The farms are free, the village thrives, and every new day is now yours to shape.'
      : 'شش سند تسویه شده‌اند؛ مزرعه‌ها آزادند، دهکده شکوفا شده و هر روز تازه حالا از آنِ توست.',
  };
}
