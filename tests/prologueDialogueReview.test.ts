import { describe, expect, it } from 'vitest';
import { NODES } from '../src/story/story';
import { compileSceneScript } from '../src/story/sceneScripts';
import { EN_LINES } from '../src/strings/cinemaLocales';

const PROLOGUE = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7'] as const;

describe('بازبینی دیالوگ پرولوگ و چمای سینمایی (گزارش کاربر)', () => {
  it('تعداد خطوط و ترتیبِ گوینده‌های پرولوگ برای کِورئوگرافی صحنه ثابت می‌ماند', () => {
    expect(PROLOGUE.map((id) => NODES[id].lines.length)).toEqual([2, 2, 2, 1, 3, 4, 2]);
    expect(NODES.p1.lines.map((l) => l.who)).toEqual(['player', 'grandma']);
    expect(NODES.p2.lines.map((l) => l.who)).toEqual(['player', 'grandma']);
    expect(NODES.p3.lines.map((l) => l.who)).toEqual(['grandma', 'grandma']);
    expect(NODES.p4.lines.map((l) => l.who)).toEqual(['jahangir']);
    expect(NODES.p5.lines.map((l) => l.who)).toEqual(['jahangir', 'player', 'jahangir']);
    expect(NODES.p6.lines.map((l) => l.who)).toEqual(['jahangir', 'jahangir', 'player', 'jahangir']);
    expect(NODES.p7.lines.map((l) => l.who)).toEqual(['narrator', 'jahangir']);
    // زنجیره و افکت‌ها دست‌نخورده
    expect(NODES.p1.next).toBe('p2');
    expect(NODES.p6.next).toBe('p7');
    expect(NODES.p7.effects).toContainEqual({ k: 'note', v: 0 });
    expect(NODES.p7.effects).toContainEqual({ k: 'chapter', v: 1 });
  });

  it('تکرارهای شروعِ بازی حذف شده‌اند (خوش‌آمد/رسیدیم/دستورِ رفتن فقط یک‌بار)', () => {
    const texts = PROLOGUE.slice(0, 6).flatMap((id) => NODES[id].lines.map((l) => l.text));
    const count = (needle: string) => texts.filter((t) => t.includes(needle)).length;
    expect(count('خوش برگشتی')).toBe(1);
    expect(count('بالاخره خانهٔ بابابزرگ')).toBe(1);
    expect(count('من مادربزرگ نصرتم')).toBe(1); // معرفی در اولین برخورد، نه سومین دیالوگ
    expect(count('شش میلیون')).toBe(2); // اعلامِ جهانگیر + واکنشِ بازیکن — نه دوبارِ پشت‌سرهم
    expect(count('شش قسط')).toBe(0); // ادعای نادرستِ «شش قسط» (واقعی: شش سند با اقساطِ ۲۸ روزه)
    expect(count('هر ۲۸ روز')).toBe(1);
  });

  it('جهانگیر در صحنه‌های سینمایی بدون نشانِ دست، «مهربان» (چماق) در دست دارد', () => {
    for (const id of ['sharkhar-ch1-debt', 'sharkhar-ch6-bad', 'reaction-rich', 'reaction-bad', 'ch5-outro']) {
      const scene = compileSceneScript(id);
      expect(scene, id).not.toBeNull();
      const mark = scene!.initialMarks.find((m) => m.actor === 'jahangir');
      if (mark) expect(mark.prop, id).toBe('club');
    }
    // در دفتر املاک و جشن، فنجان/چایِ صریحِ صحنه جایگزین می‌شود (عمدی)
    const p4 = compileSceneScript('p4');
    expect(p4!.beats[0].marks?.find((m) => m.actor === 'jahangir')?.prop).toBe('teacup');
  });

  it('ترجمهٔ انگلیسی پرولوگ هم‌تعداد با متن فارسی است', () => {
    for (const id of PROLOGUE) {
      expect(EN_LINES[id]?.length, id).toBe(NODES[id].lines.length);
    }
  });
});
