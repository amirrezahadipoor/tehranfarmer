import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fresh, S } from '../game/state';
import { SECRETS, isSecretListed, revealSecretHint, secretHintLevel } from './secrets';

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
});
