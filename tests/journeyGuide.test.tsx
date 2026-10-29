import { beforeEach, describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { installDom } from './helpers/dom';
import { resetGame, S } from '../src/game/state';
import { CFG } from '../src/game/settings';
import { readSavedFarmMeta, summarizeSave } from '../src/game/saveSummary';
import { journeyCopy } from '../src/strings/journeyText';
import { chapterChecklist, type ChapterAction } from '../src/story/quests';
import { Quests } from '../src/ui/Quests';

describe('دفتر سفر، اهداف مستقیم و خلاصهٔ امن سِیو', () => {
  beforeEach(() => {
    installDom();
    resetGame();
    CFG.locale = 'fa';
  });

  it('خلاصهٔ سِیو اعداد غیرمجاز را نمی‌پذیرد و فصل و پایان را درست می‌خواند', () => {
    expect(summarizeSave(JSON.stringify({ day: 42.8, coins: 1234.9, story: { chapter: 3.9, postgame: false } }))).toEqual({
      day: 42, coins: 1234, chapter: 3, postgame: false,
    });
    expect(summarizeSave('{"day":1e400,"coins":20}')).toBeNull();
    expect(summarizeSave('{"day":4,"coins":1e400,"story":{"chapter":99,"postgame":true}}')).toEqual({
      day: 4, coins: 0, chapter: 6, postgame: true,
    });
    expect(summarizeSave('{broken')).toBeNull();
  });

  it('JSON خراب در نسخهٔ اصلی، خلاصهٔ نسخهٔ پشتیبان سالم را پنهان نمی‌کند', () => {
    const store: Pick<Storage, 'getItem'> = {
      getItem: (key: string) => {
        if (key === 'mazrae-rangi-save-v1') return '{broken';
        if (key === 'mazrae-rangi-save-v1-bak1') return JSON.stringify({ day: 17, coins: 800, story: { chapter: 5 } });
        return null;
      },
    };
    expect(readSavedFarmMeta(store)).toEqual({ day: 17, coins: 800, chapter: 5, postgame: false });
  });

  it('روایت هر هفت ایستگاه در هر دو زبان کامل است و همهٔ اهداف مقصد واقعی دارند', () => {
    for (const locale of ['fa', 'en'] as const) {
      CFG.locale = locale;
      const copy = journeyCopy();
      expect(copy.chapters).toHaveLength(7);
      for (const chapter of copy.chapters) {
        expect(chapter.title.trim().length).toBeGreaterThan(12);
        expect(chapter.recap.trim().length).toBeGreaterThan(45);
      }
    }
    const valid = new Set<ChapterAction>(['farm', 'carp', 'estate', 'work']);
    const used = new Set<ChapterAction>();
    for (let chapter = 1; chapter <= 6; chapter++) {
      for (const item of chapterChecklist(chapter)) {
        expect(valid.has(item.action)).toBe(true);
        used.add(item.action);
      }
    }
    expect(used).toEqual(valid);
  });

  it('کارت دفتر سفر، فصل جاری، اهداف مستقیم و حالت پایان‌بازی رندر می‌شود', () => {
    S.story.chapter = 2;
    const html = renderToStaticMarkup(<Quests />);
    expect(html).toContain('data-journey-journal="1"');
    expect(html).toMatch(/data-journey-chapter="2"[^>]*data-status="current"/);
    expect(html).toContain('data-chapter-action="carp"');
    expect(html).toContain('data-chapter-action="estate"');

    CFG.locale = 'en';
    const english = renderToStaticMarkup(<Quests />);
    expect(english).toContain('Farm Journey Journal');
    expect(english).toContain('Go to this objective');

    CFG.locale = 'fa';
    S.story.postgame = true;
    S.story.chapter = 6;
    const postgame = renderToStaticMarkup(<Quests />);
    expect((postgame.match(/data-status="done"/g) ?? []).length).toBe(6);
    expect(postgame).toContain('دهکده‌ای که دوباره نفس می‌کشد');
  });
});
