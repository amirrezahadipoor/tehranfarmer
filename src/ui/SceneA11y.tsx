import { useEffect, useState } from 'react';
import { cmd } from '../game/engine';
import { sceneA11yTargets, sceneSummary } from '../game/a11y';
import { UI, notify } from '../game/state';
import { CFG } from '../game/settings';
import { sfx } from '../game/sound';
import { SCENE_A11Y_TEXT } from '../strings/sceneA11yText';

/** A structural alternative to pointer-only canvas play, visible on keyboard focus. */
export function SceneA11y() {
  const t = SCENE_A11Y_TEXT[CFG.locale === 'en' ? 'en' : 'fa'];
  const [pinned, setPinned] = useState(false);
  const [plotId, setPlotId] = useState('plot:0');
  const targets = sceneA11yTargets();
  const plots = targets.filter((target) => target.group === 'plot');
  const actions = targets.filter((target) => target.group === 'action');
  const travels = targets.filter((target) => target.group === 'travel');

  useEffect(() => { setPlotId('plot:0'); }, [UI.scene]);
  const activate = (id: string) => {
    if (cmd.activateTarget(id)) sfx.tap();
    notify();
  };

  return (
    <section
      className="scene-a11y"
      data-scene-a11y="1"
      data-pinned={pinned ? '1' : '0'}
      aria-label={t.panelLabel}
    >
      <button
        type="button"
        data-scene-a11y-toggle="1"
        className="btn y press w-full"
        aria-expanded={pinned}
        onClick={() => setPinned((value) => !value)}
      >
        {pinned ? t.closePanel : t.pinPanel}
      </button>
      <div className="mt-2 space-y-2">
        <h2 className="ft text-xl">{t.currentScene}</h2>
        <p id="scene-summary" role="status" aria-live="polite" className="rounded-lg bg-white/75 p-2 text-xs font-black leading-5">
          {sceneSummary()}
        </p>
        <p id="scene-keyboard-help" className="text-xs font-bold leading-5">
          {t.keyboardHelp}
        </p>
        {plots.length > 0 && (
          <div className="rounded-xl border-2 border-[#8a6a45] bg-[#fff9e9] p-2">
            <label htmlFor="scene-plot-select" className="mb-1 block text-xs font-black">
              {t.plotSelect}
            </label>
            <select
              id="scene-plot-select"
              data-a11y-plot-select="1"
              className="w-full rounded-lg border-2 border-[#503426] bg-white px-2 py-1 text-xs font-bold text-[#3d251a]"
              value={plots.some((plot) => plot.id === plotId) ? plotId : plots[0].id}
              onChange={(event) => setPlotId(event.target.value)}
            >
              {plots.map((plot) => <option key={plot.id} value={plot.id}>{plot.label}</option>)}
            </select>
            <button
              type="button"
              data-a11y-activate-plot="1"
              className="btn g press mt-2 w-full"
              onClick={() => activate(plots.some((plot) => plot.id === plotId) ? plotId : plots[0].id)}
            >
              {t.activatePlot}
            </button>
          </div>
        )}
        {actions.length > 0 && (
          <div className="grid gap-1.5" aria-label={t.interactions}>
            {actions.map((target) => (
              <button
                type="button"
                key={target.id}
                data-a11y-target={target.id}
                disabled={target.disabled}
                className="btn b press w-full !justify-start !text-start text-xs"
                onClick={() => activate(target.id)}
              >
                {target.label}
              </button>
            ))}
          </div>
        )}
        <nav className="grid gap-1.5 border-t-2 border-[#b89668] pt-2" aria-label={t.destinations}>
          {travels.map((target) => (
            <button
              type="button"
              key={target.id}
              data-a11y-target={target.id}
              disabled={target.disabled}
              className="btn p press w-full !justify-start !text-start text-xs"
              onClick={() => activate(target.id)}
            >
              {target.label}
            </button>
          ))}
        </nav>
      </div>
    </section>
  );
}
