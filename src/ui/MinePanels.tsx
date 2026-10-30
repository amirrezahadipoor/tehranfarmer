import { Ic, ModalShell } from './parts';
import { FT } from '../strings/frontierText';
import { S, UI, farmLevel, notify, useGame } from '../game/state';
import { fa, faPct } from '../game/data';
import {
  MINE_FLOOR_COUNT, activeMineNodes, canEnterMineFloor, mineFloorProgress, mineFloorRequiredLevel, mineFloorTitle, openMineMap, travelMineFloor,
} from '../game/core/mining';

const FLOOR_STYLES = [
  { paper: 'bg-[#e5f0e7]', line: 'border-[#607a69]', badge: 'bg-[#d2e6d7]' },
  { paper: 'bg-[#e0f2f1]', line: 'border-[#397b7b]', badge: 'bg-[#c7e8e6]' },
  { paper: 'bg-[#f2e5ef]', line: 'border-[#845675]', badge: 'bg-[#ead3e4]' },
];

export function MineStatusChip() {
  useGame();
  const floor = S.frontier?.caveFloor ?? 1;
  const progress = mineFloorProgress(floor);
  const detail = progress.liftOpen
    ? `${fa(progress.cleared)}/${fa(progress.total)} ${FT.mineVeinsShort}`
    : `${fa(progress.cleared)}/${fa(progress.required)} · ${FT.mineLiftShort}`;
  return (
    <button data-open-mine-map="1" aria-label={FT.mineOpenMap} className="hud-mine-status paper press pointer-events-auto flex min-h-[48px] min-w-0 flex-1 items-center gap-1.5 px-2 py-1 text-start sm:flex-none" onClick={openMineMap}>
      <Ic n="cave" s={2.35} />
      <span className="min-w-0">
        <span className="flex items-center gap-1 whitespace-nowrap text-xs font-black"><span>{mineFloorTitle(floor)}</span><span className="rounded bg-[#dce9e4] px-1 text-[.65rem]">{detail}</span></span>
        <span className="mt-0.5 block h-1.5 w-full overflow-hidden rounded-full bg-[#d4c4a4]"><span className="block h-full rounded-full bg-[#3e9b8d]" style={{ width: `${(progress.cleared / progress.total) * 100}%` }} /></span>
      </span>
    </button>
  );
}

export function MineMapModal() {
  useGame();
  const f = S.frontier;
  const current = f?.caveFloor ?? 1;
  const unlocked = f?.maxCaveFloor ?? 1;
  const names = [FT.mineFloor1Name, FT.mineFloor2Name, FT.mineFloor3Name];
  const lore = [FT.mineFloor1Lore, FT.mineFloor2Lore, FT.mineFloor3Lore];
  const close = () => { UI.modal = null; notify(); };
  return (
    <ModalShell title={FT.mineMapTitle} icon="cave" onClose={close}>
      <div data-mine-map="1" className="flex flex-col gap-2.5 p-1">
        <div className="rounded-xl border border-[#9a7951] bg-[#fff4d7] px-3 py-2 text-xs font-bold leading-6">{FT.mineMapIntro}</div>
        <div className="grid gap-2 md:grid-cols-3">
          {Array.from({ length: MINE_FLOOR_COUNT }, (_, i) => {
            const floor = i + 1;
            const style = FLOOR_STYLES[i];
            const progress = mineFloorProgress(floor);
            const needsProgress = floor > unlocked;
            const requiredLevel = mineFloorRequiredLevel(floor);
            const locked = needsProgress || !canEnterMineFloor(floor);
            const here = floor === current;
            const gems = [...new Set(activeMineNodes(floor).map((n) => n.good))].slice(0, 4);
            const best = Math.max(0, ...activeMineNodes(floor).map((n) => S.stats[`mineBest:${floor}:${n.idx}`] ?? 0));
            return (
              <section data-mine-floor={floor} key={floor} className={`flex flex-col gap-2 rounded-xl border-2 p-2.5 ${style.paper} ${style.line} ${locked ? 'border-dashed' : ''}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[.68rem] font-black ${style.badge}`}>{mineFloorTitle(floor)}</span>
                  {here && <span className="text-[.68rem] font-black text-[#315d4b]">{FT.mineCurrentFloor}</span>}
                  {locked && <Ic n="lock" s={1.35} />}
                </div>
                <h3 className="ft text-xl">{names[i]}</h3>
                <div className="flex min-h-8 items-center gap-1">{gems.map((g) => <Ic key={g} n={g} s={1.75} />)}</div>
                <p className="min-h-[4.5rem] text-[.72rem] font-bold leading-5 text-[#564537]">{locked ? (needsProgress ? FT.mineLockedFloor : farmLevel() < requiredLevel ? FT.mineFloorLevelLock(requiredLevel) : FT.mineLockedFloor) : lore[i]}</p>
                <div className="text-xs font-black">{FT.mineProgressLabel}: {fa(progress.cleared)}/{fa(progress.total)}</div>
                <div className="h-2 overflow-hidden rounded-full bg-[#50342625]"><div className="h-full rounded-full bg-[#3e9b8d]" style={{ width: `${(progress.cleared / progress.total) * 100}%` }} /></div>
                {best > 0 && <div className="text-[.68rem] font-black text-[#6b4a24]">{FT.mineBestAccuracy}: {faPct(best)}</div>}
                {!locked && <button data-mine-travel={floor} className={`btn press mt-auto min-h-[48px] text-xs font-black ${here ? '' : 'g'}`} disabled={here} onClick={() => { if (travelMineFloor(floor)) close(); }}>{here ? FT.mineCurrentFloor : FT.mineTravelFloor}</button>}
              </section>
            );
          })}
        </div>
        <div className="flex flex-wrap justify-center gap-2 rounded-xl bg-[#503426] px-3 py-2 text-xs font-black text-[#fff4d8]">
          <span>{FT.mineLifetimeLabel}: {fa(S.stats.mineNodes ?? 0)}</span>
          <span>•</span>
          <span>{FT.minePerfectLabel}: {fa(S.stats.minePerfect ?? 0)}</span>
        </div>
        <div className="flex items-start gap-2 rounded-xl border border-[#c69c4d] bg-[#fff2c9] px-3 py-2 text-xs font-bold leading-5"><Ic n="hammer" s={1.7} /><span>{FT.mineWeakPointHint}</span></div>
      </div>
    </ModalShell>
  );
}
