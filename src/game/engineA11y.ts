import { ESTATES, isFarmScene, type FarmSceneId } from './estates';
import type { SceneKey } from './scenes';
import { UI, notify } from './state';
import { plotA11yLabel, sceneSummary } from './a11y';

const SCENE_KEYS: readonly SceneKey[] = ['farm', 'north', 'valley', 'town', 'river', 'apiary', 'forest', 'cave'];

interface CanvasA11yDeps {
  blocked: () => boolean;
  startTrans: (scene: SceneKey) => void;
  activateTarget: (id: string) => boolean;
  setHoverPlot: (index: number) => void;
}

/** Keyboard and semantic-DOM adapter; game rules stay in the ordinary tap router. */
export function createCanvasA11yController(d: CanvasA11yDeps) {
  let keyboardPlot = 0;
  let keyboardFarm: FarmSceneId = 'farm';

  function activateTarget(id: string): boolean {
    if (d.blocked()) return false;
    if (id.startsWith('travel:')) {
      const to = id.slice(7) as SceneKey;
      if (!SCENE_KEYS.includes(to)) return false;
      d.startTrans(to);
      notify();
      return true;
    }
    const activated = d.activateTarget(id);
    if (activated) notify();
    return activated;
  }

  function canvasKey(key: string): boolean {
    if (d.blocked() || !isFarmScene(UI.scene)) return false;
    if (keyboardFarm !== UI.scene) { keyboardFarm = UI.scene; keyboardPlot = 0; }
    const spec = ESTATES[UI.scene];
    const count = spec.cols * spec.rows;
    const old = keyboardPlot;
    if (key === 'ArrowRight') keyboardPlot = Math.min(count - 1, keyboardPlot + 1);
    else if (key === 'ArrowLeft') keyboardPlot = Math.max(0, keyboardPlot - 1);
    else if (key === 'ArrowUp') keyboardPlot = Math.max(0, keyboardPlot - spec.cols);
    else if (key === 'ArrowDown') keyboardPlot = Math.min(count - 1, keyboardPlot + spec.cols);
    else if (key === 'Home') keyboardPlot = 0;
    else if (key === 'End') keyboardPlot = count - 1;
    else if (key === 'Enter' || key === ' ') {
      d.activateTarget(`plot:${keyboardPlot}`);
      notify();
      return true;
    } else return false;
    d.setHoverPlot(keyboardPlot);
    if (old !== keyboardPlot || key === 'Home' || key === 'End') notify();
    return true;
  }

  return {
    activateTarget,
    canvasKey,
    sceneAnnouncement: () => isFarmScene(UI.scene)
      ? `${sceneSummary()} ${plotA11yLabel(UI.scene, keyboardPlot)}`
      : sceneSummary(),
  };
}
