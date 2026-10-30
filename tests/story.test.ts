import { beforeEach, describe, expect, it } from 'vitest';
import { S, UI, resetGame } from './helpers/game';
import { NODES, nodeById, visitNodeId } from '../src/story/story';
import { advanceNode, applyEffects, maybeStartPrologue, pendingNode, playerMood, playNode, talkToSharkhar, talkToTownNpc } from '../src/story/engine';
import { sharkharNodeId } from '../src/story/sharkhar';
import { TOWN_ACTORS, npcTargetAt } from '../src/story/townNpc';
import { QUESTS, questOf } from '../src/story/quests';
import { NOTES } from '../src/story/debtData';
import { runStoryBot } from '../scripts/bot';
import type { CharId, Effect } from '../src/story/types';
import { EN_LINES } from '../src/strings/cinemaLocales';

const CHARS: CharId[] = ['narrator', 'player', 'jahangir', 'engineer', 'grandma', 'sara', 'rancher', 'carpenter', 'estateAgent'];
const EFFECTS: Effect['k'][] = ['chapter', 'flag', 'coins', 'item', 'xp', 'note', 'end', 'heal'];

beforeEach(() => { localStorage.clear(); resetGame(); UI.started = true; });

describe('اعتبار دادهٔ داستان', () => {
  it('همهٔ گره‌ها شناسهٔ درست و گره بعدی موجود دارند', () => {
    const ids = Object.keys(NODES);
    expect(ids.length).toBeGreaterThanOrEqual(25);
    for (const id of ids) {
      const n = NODES[id];
      expect(n.id).toBe(id);
      expect(n.lines.length).toBeGreaterThan(0);
      for (const l of n.lines) {
        expect(CHARS).toContain(l.who);
        expect(l.text.trim().length).toBeGreaterThan(2);
      }
      if (n.next) expect(nodeById(n.next), `گرهٔ بعدی ${n.next} برای ${id}`).toBeTruthy();
      for (const e of n.effects ?? []) expect(EFFECTS).toContain(e.k);
      if (n.effects?.some((e) => e.k === 'chapter')) {
        const v = n.effects.find((e) => e.k === 'chapter')!.v;
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(7);
      }
    }
  });

  it('گره‌های ملاقات موجودند و ۳ واریانت کتک متمایز دارند', () => {
    const beatIds = [1, 2, 3].map((b) => visitNodeId('due', true, b));
    expect(new Set(beatIds).size).toBe(3);
    for (const id of [visitNodeId('due', false, 0), ...beatIds, visitNodeId('raid', false, 2), visitNodeId('rest', false, 3)]) {
      expect(nodeById(id)).not.toBeNull();
    }
  });

  it('هر فصل کوئست و سند دارد', () => {
    for (let ch = 1; ch <= 6; ch++) {
      expect(questOf(ch), `کوئست فصل ${ch}`).toBeTruthy();
      expect(NOTES[ch - 1].chapter).toBe(ch);
    }
    expect(QUESTS).toHaveLength(6);
  });
});

describe('موتور داستان', () => {
  it('پرولوگ از p1 تا p7 پیش می‌رود و سند اول را باز می‌کند', () => {
    maybeStartPrologue();
    expect(pendingNode()?.id).toBe('p1');
    let guard = 0;
    let node = pendingNode()!;
    while (node.next && guard++ < 20) {
      const res = advanceNode(node);
      if (!res.next) break;
      node = res.next;
    }
    expect(node.id).toBe('p7');
    advanceNode(node);
    expect(S.debt).toBeTruthy();
    expect(S.debt!.noteIdx).toBe(0);
    expect(S.debt!.remaining).toBe(NOTES[0].amount);
    expect(S.story.chapter).toBe(1);
    expect(S.story.prologueSeen).toBe(true);
    expect(S.story.pending).toBeNull();
  });

  it('زنجیرهٔ کامل پرولوگ p1…p7 بدون هیچ گرهٔ یتیم اجرا می‌شود (پوشش C-1)', () => {
    // رگرسیون C-1: قبلاً p1 → p4 و p4 → p7 بود و p2/p3/p5/p6 هرگز پخش نمی‌شدند.
    const chain = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7'];
    for (let i = 0; i < chain.length - 1; i++) {
      expect(NODES[chain[i]].next, `گرهٔ بعدی ${chain[i]}`).toBe(chain[i + 1]);
    }
    expect(NODES.p7.next).toBeNull();
    const lines = chain.reduce((sum, id) => sum + NODES[id].lines.length, 0);
    expect(lines).toBe(16);
    for (const id of chain) expect(EN_LINES[id]).toHaveLength(NODES[id].lines.length);
  });

  it('هیچ گرهٔ پرولوگ (p1…p6) در بازی واقعی از صف نمی‌افتد', () => {
    maybeStartPrologue();
    let guard = 0;
    let node = pendingNode()!;
    const visited: string[] = [node.id];
    while (node.next && guard++ < 20) {
      const res = advanceNode(node);
      if (!res.next) break;
      node = res.next;
      visited.push(node.id);
    }
    expect(visited).toEqual(['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7']);
    advanceNode(node);
    for (const id of ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7']) expect(S.story.seen[id]).toBe(true);
  });

  it('اثر گره واقعاً روی سِیو اعمال می‌شود', () => {
    const c0 = S.coins;
    applyEffects({ id: 'test', lines: [], effects: [{ k: 'coins', v: 500 }, { k: 'item', good: 'feed', v: 3 }, { k: 'xp', v: 10 }] });
    expect(S.coins).toBe(c0 + 500);
    expect(S.inv.feed).toBe(3);
    expect(S.xp).toBe(10);
    expect(S.story.seen.test).toBe(true);
  });

  it('گره بدون next، pending را پاک می‌کند', () => {
    playNode('visit-rest');
    const res = advanceNode(nodeById('visit-rest')!);
    expect(res.done).toBe(true);
    expect(S.story.pending).toBeNull();
  });

  it('پرولوگ فقط یک بار شروع می‌شود', () => {
    maybeStartPrologue();
    const first = S.story.pending;
    S.story.pending = null;
    S.story.prologueSeen = true;
    maybeStartPrologue();
    expect(S.story.pending).toBeNull();
    expect(first).toBe('p1');
  });

  it('پایان بازی گرهٔ finale دارد', () => {
    expect(nodeById('finale')).toBeTruthy();
    expect(nodeById('ch6-outro')?.next).toBe('finale');
  });

  it('ربات داستان از پرولوگ تا جشن پایان را کامل طی می‌کند', () => {
    const res = runStoryBot(8001, 2500);
    expect(res.prologueDone).toBe(true);
    expect(res.notesOpened).toBe(6);
    expect(res.questsDone).toBe(6);
    expect(res.finaleSeen).toBe(true);
    expect(res.postgameDay).not.toBeNull();
    expect(res.softLockDays).toBe(0);
  });

  it('دیالوگ واکنشی جهانگیر برای هر ۶ فصل حداقل ۳ واریانت مستقل دارد', () => {
    const seenTexts = new Set<string>();
    for (let ch = 1; ch <= 6; ch++) {
      for (const mood of ['rich', 'bad', 'debt'] as const) {
        const id = sharkharNodeId(ch, mood);
        const node = nodeById(id);
        expect(node, `واریانت ${id}`).not.toBeNull();
        expect(node!.lines.length).toBeGreaterThan(0);
        seenTexts.add(node!.lines[0].text);
      }
    }
    expect(seenTexts.size).toBe(18);
  });

  it('وضعیت بازیکن (پولدار/بدحساب/بدهکار) درست تشخیص داده و پخش می‌شود', () => {
    maybeStartPrologue();
    while (pendingNode()) advanceNode(pendingNode()!);
    S.story.chapter = 3;
    S.debt!.standing = 80;
    S.coins = 50000;
    expect(playerMood()).toBe('rich');
    expect(talkToSharkhar()?.id).toBe('sharkhar-ch3-rich');
    S.coins = 50;
    expect(playerMood()).toBe('debt');
    expect(talkToSharkhar()?.id).toBe('sharkhar-ch3-debt');
    S.debt!.standing = 15;
    expect(playerMood()).toBe('bad');
    expect(talkToSharkhar()?.id).toBe('sharkhar-ch3-bad');
  });

  it('شخصیت‌های شهر برنامهٔ روزانهٔ متمایز و دیالوگ‌های داستانی معتبر در src/story دارند (P6-08)', () => {
    expect(TOWN_ACTORS).toHaveLength(4);
    const speeds = new Set(TOWN_ACTORS.map((a) => a.speed));
    expect(speeds.size).toBe(4);
    for (let i = 0; i < TOWN_ACTORS.length; i++) {
      expect(npcTargetAt(i, 8)).not.toEqual(npcTargetAt(i, 13));
      expect(npcTargetAt(i, 13)).not.toEqual(npcTargetAt(i, 19));
      const node = talkToTownNpc(i);
      expect(node).not.toBeNull();
      expect(node!.lines.length).toBeGreaterThan(0);
    }
  });
});
