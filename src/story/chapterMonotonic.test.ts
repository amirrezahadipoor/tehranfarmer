import { beforeEach, describe, expect, it } from 'vitest';
import { resetGame, S, UI } from '../game/state';
import { startDebt } from '../game/core/debt';
import { applyEffects } from './engine';
import { nodeById } from './story';

describe('monotonic chapter effects', () => {
  beforeEach(() => {
    resetGame();
    UI.directorReplay = false;
    S.story.prologueSeen = true;
    startDebt(5);
    S.story.postgame = true;
    S.story.chapter = 7;
    S.debt!.chapter = 7;
  });

  it('does not let a stale chapter-one outro regress a completed save', () => {
    const stale = nodeById('ch1-outro');
    expect(stale).not.toBeNull();
    applyEffects(stale!);
    expect(S.story.chapter).toBe(7);
    expect(S.debt?.chapter).toBe(7);
    expect(S.story.seen.ch1).toBe(true);
    expect(S.story.postgame).toBe(true);
  });

  it('keeps story and debt chapters synchronized when a legacy save disagrees', () => {
    S.debt!.chapter = 2;
    applyEffects(nodeById('ch1-outro')!);
    expect(S.story.chapter).toBe(7);
    expect(S.debt?.chapter).toBe(7);
    applyEffects(nodeById('finale')!);
    expect(S.debt?.chapter).toBe(7);
  });
});
