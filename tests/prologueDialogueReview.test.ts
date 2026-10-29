import { describe, expect, it } from 'vitest';
import { NODES } from '../src/story/story';
import { compileSceneScript, listAllScenes } from '../src/story/sceneScripts';
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

  it('دیالوگ عادی بازیگر را نمی‌رَواند؛ ورودهای دیررس جای جدا و حرکت‌های تعمدی حفظ می‌شوند', () => {
    const scenes = listAllScenes();
    const beats = scenes.flatMap((scene) => scene.beats);
    expect(beats.length).toBeGreaterThan(300);
    expect(beats.filter((beat) => beat.move)).toHaveLength(13);

    const p1 = compileSceneScript('p1')!;
    expect(p1.beats[0].move).toMatchObject({ actor: 'player', toX: 522, toY: 472 });
    expect(p1.beats.filter((beat) => beat.nodeId === 'p1').slice(1).every((beat) => !beat.move)).toBe(true);
    expect(compileSceneScript('p6')!.beats.every((beat) => !beat.move)).toBe(true);

    for (const scene of scenes) {
      for (let i = 0; i < scene.initialMarks.length; i++) {
        for (let j = i + 1; j < scene.initialMarks.length; j++) {
          expect(Math.abs(scene.initialMarks[i].x - scene.initialMarks[j].x), scene.id).toBeGreaterThanOrEqual(90);
        }
      }
      const staged = new Map(scene.initialMarks.map((mark) => [mark.actor, mark]));
      for (const beat of scene.beats) {
        const lateSpeaker = beat.who !== 'narrator' && !staged.has(beat.who) ? beat.who : null;
        for (const mark of beat.marks ?? []) staged.set(mark.actor, mark);
        if (lateSpeaker) {
          expect(beat.marks?.some((mark) => mark.actor === lateSpeaker), `${scene.id}:${beat.nodeId}`).toBe(true);
          const entrance = staged.get(lateSpeaker)!;
          for (const [actor, other] of staged) {
            if (actor !== lateSpeaker) expect(Math.abs(entrance.x - other.x), `${scene.id}:${beat.nodeId}:${actor}`).toBeGreaterThanOrEqual(90);
          }
        }
        if (beat.move) staged.set(beat.move.actor, { actor: beat.move.actor, x: beat.move.toX, y: beat.move.toY });
      }
    }
  });

  it('ترجمهٔ انگلیسی پرولوگ هم‌تعداد با متن فارسی است', () => {
    for (const id of PROLOGUE) {
      expect(EN_LINES[id]?.length, id).toBe(NODES[id].lines.length);
    }
  });
});
