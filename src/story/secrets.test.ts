import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fresh, S, UI } from '../game/state';
import { CFG } from '../game/settings';
import { SECRETS, TRUE_ENDING_MIN_SECRETS, checkSecretTriggers, isSecretListed, revealSecretHint, secretHintLevel } from './secrets';

describe('staged secret journal', () => {
  beforeEach(() => {
    const values = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, String(value)); },
      removeItem: (key: string) => { values.delete(key); },
      clear: () => values.clear(),
    });
    Object.assign(S, fresh());
    CFG.locale = 'fa';
  });

  afterEach(() => vi.unstubAllGlobals());

  it('hides late and postgame conditions until the relevant progression', () => {
    expect(isSecretListed('secret-grandpa-tree')).toBe(false);
    expect(isSecretListed('secret-silk-merchant')).toBe(false);
    expect(isSecretListed('secret-true-epilogue')).toBe(false);
    S.story.chapter = 4;
    expect(isSecretListed('secret-grandpa-tree')).toBe(true);
    expect(isSecretListed('secret-silk-merchant')).toBe(true);
    expect(isSecretListed('secret-true-epilogue')).toBe(false);
    S.story.postgame = true;
    expect(isSecretListed('secret-true-epilogue')).toBe(true);
  });

  it('reveals broad hints first and the full solution only on explicit requests', () => {
    const id = 'secret-midnight-well';
    const def = SECRETS.find((secret) => secret.id === id)!;
    expect(def.clueStagesFa).toHaveLength(3);
    expect(def.clueStagesFa[0]).not.toBe(def.clueFa);
    expect(secretHintLevel(id)).toBe(1);
    expect(revealSecretHint(id)).toBe(2);
    expect(revealSecretHint(id)).toBe(3);
    expect(revealSecretHint(id)).toBe(3);
    expect(S.secretHints?.[id]).toBe(3);
    expect(localStorage.getItem('mazrae-rangi-save-v1')).toContain('"secretHints"');
  });

  it('unlocks the true epilogue after five secrets without a second level-30 grind', () => {
    UI.started = true;
    S.story.prologueSeen = true;
    S.story.postgame = true;
    S.story.pending = null;
    S.xp = 0;
    S.secrets = {
      'secret-midnight-well': true,
      'secret-golden-kingfish': true,
      'secret-queen-bee-bloom': true,
      'secret-scarecrow-duel': true,
      'secret-yalda-lanterns': true,
    };
    const coins = S.coins;
    expect(checkSecretTriggers('museum-open')).toBe(true);
    expect(S.secrets['secret-true-epilogue']).toBe(true);
    expect(S.coins).toBe(coins + 150000);
    expect(S.story.pending).toBe('secret-true-epilogue');
  });

  it('builds the localized clue from the same secret-count gate', () => {
    const def = SECRETS.find((secret) => secret.id === 'secret-true-epilogue')!;
    CFG.locale = 'fa';
    expect(def.clueFa).toContain('۵ راز');
    expect(def.clueFa).not.toContain('سطح');
    CFG.locale = 'en';
    expect(def.clueFa).toContain(`${TRUE_ENDING_MIN_SECRETS} other secrets`);
    expect(def.clueFa).not.toContain('Level 30');
  });
});
