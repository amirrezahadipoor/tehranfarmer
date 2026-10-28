// Scene Director Gallery & Debug Launcher: launch or replay ANY of the 79 in-engine scenes on demand,
// inspect triggers/prerequisites/flags/procedural tracks, and switch EN/FA subtitles live.
import { useEffect, useState } from 'react';
import { S, UI, notify } from '../game/state';
import { triggerCutscene } from '../story/engine';
import { listAllScenes } from '../story/sceneScripts';
import { CFG, updateSetting } from '../game/settings';
import { CINEMA_UI, EN_LINES } from '../strings/cinemaLocales';
import { nodeById } from '../story/story';
import { Ic } from './parts';
import { sfx } from '../game/sound';

let openSetter: ((v: boolean) => void) | null = null;

export function openSceneDirector() {
  UI.modal = null;
  openSetter?.(true);
  notify();
}

const CATS = ['all', 'prologue', 'chapter', 'deed', 'visit', 'sharkhar', 'villager', 'area', 'quest', 'shop', 'season', 'secret'] as const;

export function SceneDebugMenu() {
  const [open, setOpen] = useState(false);
  const [cat, setCat] = useState<string>('all');
  const locale = CFG.locale === 'en' ? 'en' : 'fa';
  const ui = CINEMA_UI[locale];

  useEffect(() => {
    openSetter = setOpen;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'F9') {
        e.preventDefault();
        UI.modal = null;
        setOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    const dbg = {
      open: () => { UI.modal = null; setOpen(true); },
      close: () => setOpen(false),
      list: () => listAllScenes(),
      play: (id: string) => {
        UI.started = true;
        UI.modal = null;
        setOpen(false);
        return triggerCutscene(id, { forceReplay: true, director: true });
      },
      setLocale: (loc: 'fa' | 'en') => { updateSetting('locale', loc); notify(); },
    };
    (window as unknown as { __cinemaDebug?: typeof dbg }).__cinemaDebug = dbg;
    return () => {
      openSetter = null;
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  if (!open) return null;

  const all = listAllScenes();
  const shown = cat === 'all' ? all : all.filter((s) => s.category === cat);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/65 p-3"
      dir={locale === 'fa' ? 'rtl' : 'ltr'}
      role="dialog"
      aria-modal="true"
    >
      <div className="paper flex max-h-[90vh] w-[min(96vw,54rem)] flex-col p-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-[#503426]/20 pb-2">
          <div className="flex items-center gap-2">
            <Ic n="star" s={2.2} />
            <span className="ft text-xl text-[#503426]">{ui.directorTitle}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn y press !px-2.5 !py-0.5 text-xs font-black"
              onClick={() => { updateSetting('locale', locale === 'fa' ? 'en' : 'fa'); sfx.tap(); notify(); }}
            >
              <span>{ui.langToggle}</span>
            </button>
            <button
              type="button"
              className="btn r press !px-3 !py-0.5 text-xs font-black"
              onClick={() => { setOpen(false); sfx.tap(); }}
            >
              <span>{ui.close}</span>
            </button>
          </div>
        </div>

        <div className="mt-2 flex flex-wrap gap-1">
          {CATS.map((k) => (
            <button
              key={k}
              type="button"
              className={'btn press !px-2 !py-0.5 text-xs font-black ' + (cat === k ? 'g' : 'b')}
              onClick={() => { setCat(k); sfx.tap(); }}
            >
              <span>{ui.cats[k]}</span>
            </button>
          ))}
        </div>

        <div className="scroll mt-2 flex-1 space-y-1.5 pr-1">
          {shown.map((sc) => {
            const seen = !!S.story?.seen?.[sc.id];
            const preview = locale === 'en'
              ? (EN_LINES[sc.id]?.[0] ?? nodeById(sc.id)?.lines[0]?.text ?? '')
              : (nodeById(sc.id)?.lines[0]?.text ?? '');
            return (
              <div
                key={sc.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border-2 border-[#503426]/25 bg-[#fffdf4] px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5 text-xs font-black">
                    <span dir="ltr" className="rounded bg-[#503426] px-1.5 py-0.5 text-[#fff6da]">{sc.id}</span>
                    <span className="rounded bg-[#ffe6a3] px-1.5 py-0.5">{ui.areas[sc.area] ?? sc.area}</span>
                    <span className="rounded bg-[#e4f5d6] px-1.5 py-0.5">
                      {sc.durationKind === 'major' ? ui.majorBadge : ui.routineBadge}
                    </span>
                    <span className={'rounded px-1.5 py-0.5 ' + (seen ? 'bg-[#d8ecff]' : 'bg-[#ffd9d4]')}>
                      {seen ? ui.seenBadge : ui.unseenBadge}
                    </span>
                  </div>
                  <div className="mt-1 truncate text-xs font-bold opacity-85">{preview}</div>
                  <div dir="ltr" className="mt-0.5 truncate text-[11px] opacity-60">
                    {ui.triggerLabel}: {sc.trigger} | {ui.flagsLabel}: {sc.flagsSet.join(', ') || '—'}
                  </div>
                </div>
                <button
                  type="button"
                  className="btn g press shrink-0 !px-3 !py-1 text-xs font-black"
                  onClick={() => {
                    UI.started = true;
                    UI.modal = null;
                    setOpen(false);
                    sfx.tap();
                    triggerCutscene(sc.id, { forceReplay: true, director: true });
                  }}
                >
                  <Ic n="arrow" s={1.4} />
                  <span>{ui.launchScene}</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
