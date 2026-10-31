import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { sceneA11yTargets, sceneSummary } from './a11y';
import { CFG } from './settings';
import { fresh, S, UI } from './state';

describe('town semantic controls', () => {
  afterEach(() => { CFG.locale = 'fa'; });
  beforeEach(() => {
    Object.assign(S, fresh());
    UI.scene = 'town';
    UI.modal = null;
  });

  it('exposes every walking villager, not only Jahangir', () => {
    const ids = sceneA11yTargets().map((target) => target.id);
    for (const who of ['grandma', 'sara', 'engineer', 'rancher']) {
      expect(ids).toContain(`npc:${who}`);
    }
    expect(ids).toContain('sharkhar');
  });

  it('capitalizes English sentence starts in the semantic scene summary', () => {
    CFG.locale = 'en';
    const text = sceneSummary();
    expect(text).toContain('. Stamina ');
    expect(text).toContain('. Selected tool: ');
    expect(text).not.toContain('. stamina ');
    expect(text).not.toContain('. selected tool: ');
  });
});
