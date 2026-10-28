import { AUTO_FA, CROPS, MACHINES, MK_COLLECT, MK_EAT, MK_FERTSAVE, MK_GROW, MK_HARVEST, MK_SEEDSAVE, MK_THIRST, WORKER_MAX, type AutoKey, type CropId, type MachineId } from '../game/data';
import { isEstateOwned, bestEstateForCrop, type FarmSceneId } from '../game/estates';
import { ESTATE_UI } from '../strings/estateStoryText';
import { S, farmLevel, machineForAuto, machineSynergySpeedMult, mkOf, setCrewRole, setFarmSeedLock, toggleAuto } from '../game/state';
import { CFG } from '../game/settings';
import { fa, faPct } from '../strings/fa';
import { Ic, Modal } from './parts';
import { close, grid, Wallet } from './shopKit';
import { UT } from '../strings/uiText';
import { WX } from '../strings/worldExpansionText';

function liveMachineStat(id: MachineId, mk: number): string {
  if (mk <= 0) return WX.machExclusiveTag;
  switch (id) {
    case 'harvester':
      return `+${faPct(Math.round(MK_HARVEST[mk] * 100))} ${WX.statHarv}`;
    case 'seeder':
      return `${faPct(Math.round(MK_SEEDSAVE[mk] * 100))} ${WX.statSeeds}`;
    case 'sprinkler':
      return `-${faPct(Math.round((1 - MK_THIRST[mk]) * 100))} — +${faPct(Math.round((MK_GROW[mk] - 1) * 100))} ${WX.statWater}`;
    case 'tractor':
      return mk >= 3 ? WX.statSoilFloor : `+${faPct(mk * 6)} ${WX.statSoilAdd}`;
    case 'drone':
      return `${faPct(Math.round(MK_FERTSAVE[mk] * 100))} ${WX.statFertSave}`;
    case 'feeder':
      return `-${faPct(Math.round((1 - MK_EAT[mk]) * 100))} ${WX.statFeedSave}`;
    case 'collector':
      return `+${faPct(Math.round((MK_COLLECT[mk] - 1) * 100))} ${WX.statCollect}`;
  }
}

export function AutoPanelModal() {
  const keys: AutoKey[] = ['till', 'plant', 'water', 'harvest', 'fert', 'feed', 'collect'];
  const loc = CFG.locale === 'en' ? 'en' : 'fa';
  const synPct = Math.round(machineSynergySpeedMult() * 100);
  const L = farmLevel();
  const unlockedSeeds = CROPS.filter((c) => c.lv <= L);
  const role = S.crewRole ?? 'balanced';

  return (
    <Modal title={UT.u103} icon="tractor" onClose={close} coins={<Wallet />}>
      <div className="paper mb-2.5 p-2.5 text-xs">
        <div className="ft text-base text-[#5a3518]">{WX.pillarTitle}</div>
        <div className="mt-0.5 font-bold opacity-85 leading-relaxed">{WX.pillarDesc}</div>
      </div>

      {/* Per-Farm Independent Crop Assignment & Specialty */}
      <div className="paper mb-2.5 p-2.5">
        <div className="ft text-base text-[#5a3518]">{WX.seedPlanTitle}</div>
        <div className="mt-1.5 grid gap-2 sm:grid-cols-3">
          {(['farm', 'north', 'valley'] as FarmSceneId[]).map((fid) => {
            const owned = isEstateOwned(fid, S.lv.land);
            const cur = S.farmSeeds?.[fid] ?? 'auto';
            const eu = ESTATE_UI[loc];
            const farmName = fid === 'farm' ? eu.farmShort : fid === 'north' ? eu.northShort : eu.valleyShort;
            const specLabel = fid === 'farm' ? WX.specFarmBadge : fid === 'north' ? WX.specNorthBadge : WX.specValleyBadge;
            return (
              <div key={fid} className={'rounded-xl border border-[#d4be8d] bg-white/75 p-2 text-xs ' + (owned ? '' : 'opacity-55')}>
                <div className="font-black">{farmName}</div>
                <div className="text-[.68rem] font-extrabold text-emerald-800">{specLabel}</div>
                {owned && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    <button
                      type="button"
                      className={'btn press !px-2 !py-0.5 text-[.68rem] font-black ' + (cur === 'auto' ? 'g' : '')}
                      onClick={() => setFarmSeedLock(fid, 'auto')}
                    >
                      {WX.seedAutoBest}
                    </button>
                    {[...unlockedSeeds]
                      .sort((a, b) => Number(bestEstateForCrop(b.id) === fid) - Number(bestEstateForCrop(a.id) === fid))
                      .map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        className={'btn press !px-1.5 !py-0.5 text-[.68rem] font-black ' + (cur === c.id ? 'y' : '')}
                        onClick={() => setFarmSeedLock(fid, c.id as CropId)}
                        title={c.fa}
                      >
                        <Ic n={c.id} s={1.15} />
                        {bestEstateForCrop(c.id) === fid && <Ic n="star" s={0.85} />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Crew Priority Focus & Machine Synergy */}
      <div className="paper mb-2.5 flex flex-wrap items-center justify-between gap-2 p-2">
        <div className="flex items-center gap-2">
          <Ic n="worker" s={2.6} />
          <div className="text-xs">
            <div className="font-black">{WX.crewFocusTitle} <span dir="ltr">({fa(S.workers)}/{fa(WORKER_MAX)})</span></div>
            <div className="font-extrabold text-emerald-800">{WX.synergyLabel} {faPct(synPct)}</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-1">
          {([
            ['balanced', WX.crewBalanced],
            ['crops', WX.crewCrops],
            ['ranch', WX.crewRanch],
          ] as const).map(([rk, label]) => (
            <button
              key={rk}
              type="button"
              className={'btn press !px-2.5 !py-0.5 text-xs font-black ' + (role === rk ? 'g' : '')}
              onClick={() => setCrewRole(rk)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 7 Industrial Machines */}
      <div className={grid}>
        {keys.map((k) => {
          const m = machineForAuto(k);
          const mk = m ? mkOf(m as MachineId) : 0;
          const on = !!S.auto[k] && !!m;
          return (
            <div key={k} className={'paper flex flex-col items-center gap-1.5 p-2.5 ' + (on ? 'ring-2 ring-[#6cc84c]' : 'opacity-80')}>
              <Ic n={m ? MACHINES[m].icon : 'lock'} s={3.8} cls={on ? 'bob' : 'grayscale'} />
              <div className="text-sm font-extrabold">{AUTO_FA[k]}</div>
              {m && (
                <>
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3].map((i) => <Ic key={i} n="star" s={1.1} cls={i <= mk ? '' : 'grayscale opacity-40'} />)}
                  </div>
                  <div className="rounded bg-emerald-50 px-1.5 py-0.5 text-center text-[.68rem] font-black text-emerald-900">
                    {liveMachineStat(m as MachineId, mk)}
                  </div>
                </>
              )}
              <button
                className={'press min-h-[48px] w-full rounded-xl border-[.18rem] border-[#503426] px-2 py-1 text-sm font-black ' + (on ? 'bg-[#8fd35a]' : 'bg-[#e8d9b8]')}
                disabled={!m}
                onClick={() => toggleAuto(k)}
              >
                {on ? UT.u105 : UT.u106}
              </button>
              {!m && <div className="text-[.7rem] font-bold opacity-70">{UT.u107}</div>}
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
