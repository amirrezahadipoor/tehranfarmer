// تست‌های رگرسیون رفع ایرادهای ممیزی ۱۰/۲۸:
//  C-1 زنجیرهٔ کامل پرولوگ (p1…p7) بدون گرهٔ گم‌شده
//  C-2 صف اعلان‌ها: پیام‌های هم‌زمان همدیگر را حذف نمی‌کنند و هدیهٔ بذر مادربزرگ همیشه دیده می‌شود
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { S, UI, resetGame } from './helpers/game';
import { MAX_TOASTS, TOAST_MS, clearToasts, toast } from '../src/game/state';
import { pendingNode, advanceNode, maybeStartPrologue } from '../src/story/engine';
import { NODES, nodeById } from '../src/story/story';

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  resetGame();
  clearToasts();
  UI.started = true;
});

afterEach(() => {
  vi.useRealTimers();
  clearToasts();
});

describe('C-2 — صف اعلان‌ها', () => {
  it('چند اعلان هم‌زمان همه در صف می‌مانند (نه فقط دوتا)', () => {
    toast('seedbag', 'مادربزرگ ۳ بذر گندم گذاشت');
    toast('mail', 'نامهٔ تازه از تاجر');
    toast('egg', 'مرغ تخم بارور گذاشت');
    const texts = UI.toasts.map((t) => t.text);
    expect(texts).toEqual(['مادربزرگ ۳ بذر گندم گذاشت', 'نامهٔ تازه از تاجر', 'مرغ تخم بارور گذاشت']);
  });

  it('سقف صف رعایت می‌شود و قدیمی‌ترین پیام جای خود را به تازه می‌دهد', () => {
    for (let i = 0; i < MAX_TOASTS + 3; i++) toast('coin', `پیام ${i}`);
    expect(UI.toasts).toHaveLength(MAX_TOASTS);
    expect(UI.toasts[UI.toasts.length - 1].text).toBe(`پیام ${MAX_TOASTS + 2}`);
    expect(UI.toasts.some((t) => t.text === 'پیام 0')).toBe(false);
  });

  it('هر اعلان تایمر مستقل دارد؛ با گذشت زمان فقط پیام‌های کهنه می‌روند', () => {
    toast('seedbag', 'هدیهٔ بذر');
    vi.advanceTimersByTime(TOAST_MS - 100);
    toast('mail', 'نامهٔ تازه');
    vi.advanceTimersByTime(200);
    expect(UI.toasts.map((t) => t.text)).toEqual(['نامهٔ تازه']);
    vi.advanceTimersByTime(TOAST_MS);
    expect(UI.toasts).toHaveLength(0);
  });

  it('پیام تکراری صف را شلوغ نمی‌کند ولی عمرش تازه می‌شود', () => {
    toast('seedbag', 'هدیهٔ بذر');
    vi.advanceTimersByTime(TOAST_MS - 200);
    toast('seedbag', 'هدیهٔ بذر');
    expect(UI.toasts).toHaveLength(1);
    vi.advanceTimersByTime(TOAST_MS - 200);
    expect(UI.toasts).toHaveLength(1);
    vi.advanceTimersByTime(300);
    expect(UI.toasts).toHaveLength(0);
  });

  it('toast هرگز پرتاب نمی‌کند و clearToasts صف را خالی می‌کند', () => {
    toast('x', 'یک');
    clearToasts();
    expect(UI.toasts).toHaveLength(0);
  });
});

describe('C-1 — زنجیرهٔ پرولوگ', () => {
  it('همهٔ گره‌های p1…p6 گرهٔ بعدی دارند و هیچ‌کدام یتیم نیست', () => {
    for (let i = 1; i <= 6; i++) expect(NODES[`p${i}`].next).toBe(`p${i + 1}`);
    expect(NODES.p7.next).toBeNull();
  });

  it('پخش واقعی پرولوگ تمام هفت صحنه را پشت سر هم می‌گذراند', () => {
    maybeStartPrologue();
    const seen: string[] = [];
    let guard = 0;
    let node = pendingNode();
    while (node && guard++ < 20) {
      seen.push(node.id);
      const res = advanceNode(node);
      node = res.next;
    }
    expect(seen).toEqual(['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7']);
    expect(S.story.prologueSeen).toBe(true);
    expect(S.story.chapter).toBe(1);
  });

  it('صف صحنه‌ها (sceneQueue) پس از اتمام پرولوگ خالی است', () => {
    maybeStartPrologue();
    let guard = 0;
    while (pendingNode() && guard++ < 20) advanceNode(pendingNode()!);
    expect(S.story.queue ?? []).toEqual([]);
    expect(S.story.pending).toBeNull();
  });

  it('گره‌های بازنشستهٔ p2/p3/p5/p6 دیگر در مسیر نیستند اما متن‌شان در زنجیره حاضر است', () => {
    for (const id of ['p2', 'p3', 'p5', 'p6']) {
      const node = nodeById(id);
      expect(node, id).not.toBeNull();
      expect(node!.lines.length).toBeGreaterThan(0);
    }
  });
});
