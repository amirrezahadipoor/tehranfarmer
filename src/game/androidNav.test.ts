import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../story/engine', () => ({ skipActiveCutscene: vi.fn() }));

import { skipActiveCutscene } from '../story/engine';
import { handleHardwareBack } from './androidNav';
import { cinema } from './cinemaStage';
import { fresh, S, UI } from './state';

describe('hardware Back during a closing cutscene', () => {
  beforeEach(() => {
    Object.assign(S, fresh());
    UI.confirm = null;
    UI.modal = null;
    UI.afterModal = null;
    cinema.active = true;
    cinema.script = { id: 'ch6-outro' } as never;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    cinema.active = false;
    cinema.script = null;
  });

  it('closes the current tableau without consuming the next pending scene', () => {
    const click = vi.fn();
    const querySelector = vi.fn(() => ({ click }));
    vi.stubGlobal('document', { querySelector });

    expect(handleHardwareBack()).toBe('cutscene-skipped');
    expect(querySelector).toHaveBeenCalledWith('[data-scene-closing="1"] [data-cutscene-next="1"]');
    expect(click).toHaveBeenCalledTimes(1);
    expect(skipActiveCutscene).not.toHaveBeenCalled();
  });
});
