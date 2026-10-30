import { useState } from 'react';
import { GOOD, fa } from '../game/data';
import { cmd } from '../game/engine';
import { CFG } from '../game/settings';
import { S, UI, farmLevel, holdCount, notify } from '../game/state';
import {
  ROYAL_DECREES, activeCharter, charterRequiredChapter, charterSwitchInfo, chooseVillageCharter,
  currentRegionalShock, decreeWeekKey, ensureFrontier, fulfillRoyalDecree, hasMonocultureSaturation, isTownFestivalActive,
} from '../game/core/frontier';
import { sfx } from '../game/sound';
import { CHARTER_DEFS, FT } from '../strings/frontierText';
import type { SceneKey } from '../game/scenes';
import { Ic, ModalShell } from './parts';

export function WorldAtlasModal() {
  const [tab, setTab] = useState<'map' | 'decrees' | 'charters'>('map');
  const f = ensureFrontier();
  const en = CFG.locale === 'en';
  const shock = currentRegionalShock();

  const nodes: readonly { id: SceneKey; x: number; y: number; ic: string; label: string; sub?: string }[] = [
    { id: 'north', x: 52, y: 15, ic: 'north', label: FT.placeNorth },
    { id: 'cave', x: 14, y: 28, ic: 'cave', label: FT.navCave, sub: `${fa(f.caveFloor)}/${fa(3)}` },
    { id: 'river', x: 28, y: 50, ic: 'fish', label: FT.placeRiver },
    { id: 'farm', x: 54, y: 50, ic: 'house', label: FT.placeFarm },
    { id: 'town', x: 84, y: 34, ic: 'market', label: FT.placeTown, sub: isTownFestivalActive() ? FT.navFair : undefined },
    { id: 'apiary', x: 46, y: 82, ic: 'hive', label: FT.placeApiary },
    { id: 'forest', x: 16, y: 82, ic: 'forest', label: FT.navForest, sub: `${fa(f.forestLayer)}/${fa(3)}` },
    { id: 'valley', x: 82, y: 78, ic: 'valley', label: FT.placeValley },
  ];

  // Clean non-crossing planar world graph matching real road connections
  const links: readonly [number, number, number, number][] = [
    [54, 50, 52, 15], [54, 50, 84, 34], [54, 50, 82, 78],
    [54, 50, 28, 50], [28, 50, 14, 28], [54, 50, 46, 82], [46, 82, 16, 82],
  ];

  return (
    <ModalShell title={FT.atlasModalTitle} icon="atlas" wide onClose={() => { UI.modal = null; notify(); }}>
      <div data-atlas-modal="1" className="space-y-2.5 pb-2">
        <div className="flex flex-wrap gap-1.5">
          {([
            ['map', 'land', FT.tabMap],
            ['decrees', 'crown', FT.tabDecrees],
            ['charters', 'scroll', FT.tabCharters],
          ] as const).map(([id, ic, label]) => (
            <button
              key={id}
              type="button"
              data-atlas-tab={id}
              aria-label={label}
              className={'btn press !px-3 !py-1 text-xs font-black ' + (tab === id ? 'y' : 'b')}
              onClick={() => { sfx.tap(); setTab(id); }}
            >
              <Ic n={ic} s={1.4} />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {tab === 'map' && (
          <div className="paper relative grid h-auto w-full grid-cols-2 gap-2 overflow-hidden rounded-2xl border-2 border-[#503426] bg-[#e9efc8] p-2 sm:block sm:h-72 sm:gap-0">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 hidden h-full w-full sm:block">
              {links.map(([x1, y1, x2, y2], i) => (
                <line
                  key={i}
                  x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke="#8b5e34" strokeWidth="1.4" strokeDasharray="2.2 1.4"
                />
              ))}
            </svg>
            {nodes.map((n) => (
              <button
                key={n.id}
                type="button"
                data-atlas-go={n.id}
                aria-label={n.label}
                style={{ left: `${n.x}%`, top: `${n.y}%` }}
                className={'atlas-node btn press static w-full min-w-0 translate-x-0 translate-y-0 !whitespace-normal !px-1.5 !py-1 text-[.7rem] font-black sm:absolute sm:w-auto sm:-translate-x-1/2 sm:-translate-y-1/2 sm:!px-2.5 ' + (UI.scene === n.id ? 'y ' : 'g ') + (S.tut?.active && S.tut.step === 4 && n.id === 'town' ? 'ring-4 ring-amber-300' : '')}
                onClick={() => { UI.modal = null; cmd.travelTo(n.id); notify(); }}
              >
                <Ic n={n.ic} s={1.3} />
                <span className="min-w-0 whitespace-normal break-words leading-tight [overflow-wrap:anywhere]">{n.label}</span>
                {n.sub && <span className="atlas-node-sub shrink-0 rounded bg-black/15 px-1 text-[.66rem]" dir="ltr">{n.sub}</span>}
              </button>
            ))}
          </div>
        )}

        {tab === 'decrees' && (
          <div className="space-y-2">
            <div className="paper border-2 border-amber-700 bg-amber-50 p-2.5 text-xs font-extrabold">
              <div className="font-black text-amber-950">
                {FT.shockBannerPrefix} {en ? shock.titleEn : shock.titleFa}
              </div>
              <div className="mt-0.5 opacity-85">{en ? shock.descEn : shock.descFa}</div>
              {hasMonocultureSaturation() && (
                <div className="mt-1 rounded bg-rose-100 px-2 py-1 text-rose-900">{FT.monoWarn}</div>
              )}
            </div>

            {ROYAL_DECREES.map((dec) => {
              const claimed = !!f.decreeClaimed[decreeWeekKey(dec.id)];
              const unlocked = farmLevel() >= dec.minLv;
              const ready = unlocked && !claimed && dec.items.every((it) => holdCount(it.good) >= it.qty);
              return (
                <div key={dec.id} className="paper flex flex-wrap items-center justify-between gap-2 p-2.5 text-xs font-extrabold">
                  <div className="space-y-1">
                    <div className="font-black">{en ? dec.titleEn : dec.titleFa}</div>
                    <div className="flex flex-wrap gap-1.5">
                      {dec.items.map((it) => (
                        <span key={it.good} className="rounded bg-[#f4e7c8] px-2 py-0.5">
                          {GOOD[it.good]?.fa ?? it.good}: {fa(holdCount(it.good))}/{fa(it.qty)}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    type="button"
                    data-fulfill-decree={dec.id}
                    aria-label={en ? dec.titleEn : dec.titleFa}
                    disabled={!ready}
                    className={'btn press !px-3 !py-1.5 text-xs font-black ' + (claimed ? 'b' : 'g')}
                    onClick={() => fulfillRoyalDecree(dec.id)}
                  >
                    <Ic n="crown" s={1.4} />
                    <span>{claimed ? FT.decreeDone : `${FT.decreeDeliver} (+${fa(dec.coins)})`}</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {tab === 'charters' && (
          <div className="space-y-2">
            {CHARTER_DEFS.map((c) => {
              const cur = activeCharter(c.key);
              const reqCh = charterRequiredChapter(c.key);
              const canRatify = (S.story?.chapter ?? 1) >= reqCh || !!S.story?.postgame;
              const switchInfo = charterSwitchInfo(c.key);
              return (
                <div key={c.key} className="paper space-y-2 p-3 text-xs">
                  <div className="flex items-center justify-between font-black">
                    <span>{en ? c.titleEn : c.titleFa}</span>
                    {!canRatify && <span className="text-amber-800">{FT.charterLockedHint} {fa(reqCh)}</span>}
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {([
                      [c.aVal, en ? c.aTitleEn : c.aTitleFa, en ? c.aEffectEn : c.aEffectFa],
                      [c.bVal, en ? c.bTitleEn : c.bTitleFa, en ? c.bEffectEn : c.bEffectFa],
                    ] as const).map(([val, title, eff]) => (
                      <div key={val} className={'rounded-xl border p-2 ' + (cur === val ? 'border-emerald-700 bg-emerald-50' : 'border-[#cbb489] bg-white/75')}>
                        <div className="font-black">{title}</div>
                        <div className="mt-0.5 text-[.7rem] font-bold opacity-85">{eff}</div>
                        <button
                          type="button"
                          data-charter-pick={`${c.key}:${val}`}
                          aria-label={title}
                          disabled={!canRatify || cur === val || switchInfo.daysLeft > 0}
                          className={'btn press mt-1.5 w-full !py-1 text-[.7rem] font-black ' + (cur === val ? 'g' : 'y')}
                          onClick={() => chooseVillageCharter(c.key, val)}
                        >
                          {cur === val
                            ? <><Ic n="check" s={1.25} /> <span>{title}</span></>
                            : <span>{switchInfo.daysLeft > 0
                              ? FT.charterCooldown(switchInfo.daysLeft)
                              : switchInfo.cost > 0 ? FT.charterSwitchBtn(switchInfo.cost) : FT.charterEnactBtn}</span>}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </ModalShell>
  );
}
