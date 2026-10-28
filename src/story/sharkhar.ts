// ===== دیالوگ‌های واکنشی جهانگیر بر پایهٔ فصل (۱..۶) و وضعیت بازیکن (پولدار / بدحساب / بدهکار) =====
import type { StoryNode } from './types';

export type SharkharMood = 'rich' | 'bad' | 'debt';

const mk = (id: string, lines: StoryNode['lines'], chapter: number): StoryNode => ({ id, lines, next: null, chapter });

export const SHARKHAR_NODES: StoryNode[] = [
  // فصل ۱ — حق خوش‌آمدگویی
  mk('sharkhar-ch1-rich', [
    { who: 'jahangir', text: 'به! کیسهٔ سکه‌ات سنگین است وارث. نکند گنج زیر کاهدان پیدا کرده‌ای؟' },
    { who: 'player', text: 'عرق جبین است جهانگیر، نه گنج.' },
    { who: 'jahangir', text: 'آفرین. آدمی که اول کار جیبش پر باشد، چماق من را بیکار می‌کند.' },
  ], 1),
  mk('sharkhar-ch1-bad', [
    { who: 'jahangir', text: 'هنوز سند اول خشک نشده بدحساب شدی داداشِ من؟ «مهربان» دارد خمیازه می‌کشد.' },
    { who: 'jahangir', text: 'قسط کوچک است؛ سر وقت بده تا چای تلخ نشود.' },
  ], 1),
  mk('sharkhar-ch1-debt', [
    { who: 'jahangir', text: 'جیب خالی عیب نیست، زمین بایر عیب است. چهار خط شخم بزن، پول خودش می‌آید.' },
    { who: 'player', text: 'تا سر برج جور می‌شود.' },
  ], 1),

  // فصل ۲ — اجارهٔ سایه
  mk('sharkhar-ch2-rich', [
    { who: 'jahangir', text: 'صدای سکه‌هایت تا کلبهٔ من می‌آید! مثل اینکه سایهٔ درخت‌ها برایت خوش‌یمن بوده.' },
    { who: 'jahangir', text: 'اگر اضافه داری، زودتر بگذار روی سند؛ سودش به جیب خودت برمی‌گردد.' },
  ], 2),
  mk('sharkhar-ch2-bad', [
    { who: 'jahangir', text: 'اعتبارت ریخته کف جاده وارث. مردم شهر می‌پرسند این پسر آمده کار کند یا چرت بزند؟' },
    { who: 'player', text: 'دام‌ها تازه پا گرفته‌اند، صبر کن.' },
    { who: 'jahangir', text: 'سند صبر سرش نمی‌شود؛ یک قسط درست بده تا حسابمان صاف شود.' },
  ], 2),
  mk('sharkhar-ch2-debt', [
    { who: 'jahangir', text: 'دستت تنگ است، می‌بینم. علوفهٔ مرغ‌هایت را کم نگذار؛ تخم‌مرغ خرج قسط را درمی‌آورد.' },
    { who: 'jahangir', text: 'این نصیحت نبود ها! فقط نخواستم بدهی‌ام سوخت شود.' },
  ], 2),

  // فصل ۳ — سند بابابزرگ
  mk('sharkhar-ch3-rich', [
    { who: 'jahangir', text: 'استخر ساخته‌ای، جیب هم پر! بابابزرگت اگر بود سبیلش را تاب می‌داد.' },
    { who: 'jahangir', text: '... چای را بخور، سرد شد.' },
  ], 3),
  mk('sharkhar-ch3-bad', [
    { who: 'jahangir', text: 'روی سند اسم بابابزرگت خورده، آن‌وقت تو قسط عقب می‌اندازی؟ خجالت دارد داداشِ من.' },
    { who: 'player', text: 'سود مرکب چهل‌ساله شوخی نیست!' },
    { who: 'jahangir', text: 'غر نزن، قلکت را پر کن و سر برج بیا.' },
  ], 3),
  mk('sharkhar-ch3-debt', [
    { who: 'jahangir', text: 'سند بابابزرگ سنگین است، قبول. هر چه دستت آمد کم‌کم بده؛ قطره‌قطره دریاست.' },
    { who: 'jahangir', text: 'ماهی‌های استخر که برسند نفست باز می‌شود.' },
  ], 3),

  // فصل ۴ — سند قنات
  mk('sharkhar-ch4-rich', [
    { who: 'jahangir', text: 'گلخانه شیشه‌ای و جیب پر از سکه! مهندس دیروز از تعجب عینکش بخار کرد.' },
    { who: 'jahangir', text: 'بده این قسط را تا دهانش بسته بماند.' },
  ], 4),
  mk('sharkhar-ch4-bad', [
    { who: 'jahangir', text: 'مهندس می‌گوید بهت گفتم این وارث از پس قنات برنمی‌آید. می‌خواهی حرفش درست از آب دربیاید؟' },
    { who: 'player', text: 'هرگز.' },
    { who: 'jahangir', text: 'پس اعتبارت را جمع کن و سر وقت تسویه کن!' },
  ], 4),
  mk('sharkhar-ch4-debt', [
    { who: 'jahangir', text: 'خرج قنات و گلخانه کمرشکن است، می‌دانم. زمستان هم در شیشه محصول داری — از آن پول درآور.' },
  ], 4),

  // فصل ۵ — سند مهندس
  mk('sharkhar-ch5-rich', [
    { who: 'jahangir', text: 'آفرین پسر! با این دست پر، بند جریمهٔ مهندس دیگر کاغذپاره است.' },
    { who: 'jahangir', text: 'بیا یک‌جا صافش کن تا خودش کاغذش را قورت بدهد.' },
  ], 5),
  mk('sharkhar-ch5-bad', [
    { who: 'jahangir', text: 'ای وای داداشِ من، بدحسابی جلوی مهندس یعنی دو برابر ضرر! من چماق می‌زنم، او درصد می‌بندد.' },
    { who: 'jahangir', text: 'زودتر خودت را جمع‌وجور کن.' },
  ], 5),
  mk('sharkhar-ch5-debt', [
    { who: 'jahangir', text: 'کارگر گرفته‌ای و دستت خالی مانده؟ عیب ندارد، فردا محصول دو برابر جمع می‌کنند.' },
    { who: 'player', text: 'عجیب است، انگار طرف منی!' },
    { who: 'jahangir', text: 'حرف اضافه نزن، طرف پول خودم هستم!' },
  ], 5),

  // فصل ۶ — سند نهایی
  mk('sharkhar-ch6-rich', [
    { who: 'jahangir', text: 'نگاهش کن... مزرعه‌ای که علف هرز بود حالا طلا می‌دهد. جیبت هم که پر است.' },
    { who: 'jahangir', text: 'هر وقت آماده‌ای بیا آخرین مهر را بزنیم، وارث.' },
  ], 6),
  mk('sharkhar-ch6-bad', [
    { who: 'jahangir', text: 'قدم آخر است داداشِ من! سر پیچ آخر شل نکن؛ مزرعه گرو است.' },
    { who: 'jahangir', text: '«مهربان» را کنار گذاشته‌ام، خودت مردانه بیا تسویه کن.' },
  ], 6),
  mk('sharkhar-ch6-debt', [
    { who: 'jahangir', text: 'سند آخر بزرگ است، اما این مزرعه از آن بزرگ‌تر شده. عجله نکن، ولی پیوسته بده.' },
    { who: 'jahangir', text: 'تا جشن برداشت چیزی نمانده.' },
  ], 6),

  // پس از پایان داستان
  mk('sharkhar-postgame', [
    { who: 'jahangir', text: 'دیگر سندی نمانده وارث. حالا فقط همسایه‌ایم — چای تازه دم است!' },
    { who: 'player', text: 'بی‌چماق؟' },
    { who: 'jahangir', text: '«مهربان» بازنشسته شد؛ آویزانش کردم بالای سماور.' },
  ], 7),
];

export function sharkharNodeId(chapter: number, mood: SharkharMood): string {
  if (chapter >= 7) return 'sharkhar-postgame';
  const ch = Math.max(1, Math.min(6, Math.floor(chapter || 1)));
  return `sharkhar-ch${ch}-${mood}`;
}
