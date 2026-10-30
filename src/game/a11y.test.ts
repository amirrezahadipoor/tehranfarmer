import { beforeEach, describe, expect, it } from 'vitest';
import { sceneA11yTargets } from './a11y';
import { fresh, S, UI } from './state';

describe('town semantic controls', () => {
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
});
