import { CFG } from '../game/settings';

const JOKES: Record<string, { fa: string; en: string }> = {
  wheat: { fa: 'هنوز نان نشده، ولی از همین حالا ادای نانِ تنوری را دارد.', en: 'Not bread yet, but already acting like it owns the oven.' },
  carrot: { fa: 'هویجِ خوش‌تیپِ مزرعه؛ شایعه است که در انبار بدنسازی می‌کند.', en: 'The farm’s stylish carrot; rumor says it works out in the barn.' },
  egg: { fa: 'تخم‌مرغی که هنوز تصمیم نگرفته صبحانه شود یا جوجه.', en: 'Still deciding between becoming breakfast or a chicken.' },
  milk: { fa: 'شیرِ تازه؛ قبل از پنیر شدن کمی خودش را گرفته است.', en: 'Fresh milk, currently acting far too sophisticated about becoming cheese.' },
  honey: { fa: 'عسلِ طلایی؛ زنبورها روی دستمزدش خیلی حساس‌اند.', en: 'Golden honey; the bees are extremely protective of their overtime pay.' },
  fish: { fa: 'ماهیِ رودخانه، دیگر به چراغ‌قوه و وعدهٔ قلاب نیاز ندارد.', en: 'A river fish, finally free from flashlights and hook-related promises.' },
  gold: { fa: 'طلایی که از معدن آمده تا قیمت انبار را بالا ببرد.', en: 'Gold that left the mine to raise the barn’s property value.' },
  diamond: { fa: 'الماسِ درخشان؛ سنگ‌های دیگر با او فامیلی دورند.', en: 'A sparkling diamond; the other rocks claim they are distant relatives.' },
  iron: { fa: 'آهنِ سخت‌جان؛ هنوز از ضربهٔ کلنگ حرف‌زدن یاد نگرفته.', en: 'Tough iron; it has not learned to talk back to the pickaxe yet.' },
  feed: { fa: 'علوفهٔ رژیمیِ دام‌ها؛ ظاهراً رژیم شامل وعدهٔ دوبار هم می‌شود.', en: 'Animal diet feed; apparently the diet includes second helpings.' },
  herb: { fa: 'گیاه معطرِ جنگل، با عطرِ «من از بوته‌های معمولی نیستم».', en: 'A fragrant forest herb with the aroma of “I am not a regular bush”.' },
  seed: { fa: 'این بذر فقط آب، خاک و کمی تشویقِ احساسی می‌خواهد.', en: 'This seed needs only water, soil, and a little emotional encouragement.' },
  fert: { fa: 'کودِ مزرعه؛ بوی عجیبی دارد ولی محصول عاشقش است.', en: 'Farm fertilizer; suspicious smell, excellent crop reviews.' },
  default: { fa: 'در انبار ساکت نشسته؛ احتمالاً دارد نقشهٔ گران‌فروشی می‌کشد.', en: 'Sitting quietly in storage, probably plotting its big market debut.' },
};

export function inventoryJoke(id: string): string {
  const joke = JOKES[id] ?? JOKES.default;
  return CFG.locale === 'en' ? joke.en : joke.fa;
}
