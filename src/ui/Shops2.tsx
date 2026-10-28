// === نجار (همهٔ ساخت و ارتقای مزرعه) و املاکی (زمین و کارگر) ===
import type { ReactNode } from 'react';
import {
  ANIMALS, BAG_CAP, CAN_CAP, fa, faDec, GH_LV, GH_PRICE, GH_SPEED, HIVE_LV, HIVE_MAX, hivePrice, HOE_SPEED, LAND_PRICES,
  PEN_BUILD, PEN_CAP_LV, PEN_KINDS, PEN_UP, plotsOf, POND_LV, POND_MAX, pondPrice, ROD_LV, ROD_PRICE, SILO_LV, SILO_MULT, SILO_PRICE,
  TROUGH_CAP, WORKER_LV, WORKER_MAX, WORKER_PRICES, WORKER_WAGE,
  type AnimalKind,
} from '../game/data';
import { S, buyGh, buyHive, buyPen, buyPenUp, buyPond, buyRod, buySilo, buyWell, buyWorker, orderScarecrow, scarecrowPrice, toast, troughCap, wellLvReq, wellPrice } from '../game/state';
import { Coin, Ic, Modal, Pips } from './parts';
import { BuildingBadge, BuyBtn, close, grid, Lock, lv, UpCard, Wallet, buildingNow } from './shopKit';
import { isEstateOwned } from '../game/estates';
import { cmd } from '../game/engine';
import { CFG } from '../game/settings';
import { ESTATE_UI } from '../strings/estateStoryText';
import { UT } from '../strings/uiText';

function SecTitle({ icon, t }: { icon: string; t: string }) {
  return (
    <div className="mb-1 mt-3 flex items-center gap-2 border-t-2 border-dashed border-[#50342633] pt-3 first:mt-0 first:border-t-0 first:pt-0">
      <Ic n={icon} s={2.4} /><span className="ft text-2xl">{t}</span>
    </div>
  );
}

/** کارت خریدبانهٔ واحد برای ساخت/ارتقا با نوار پیشرفت */
function BuildCard({ icon, title, pips, note, buildQ, price, req, onBuy, done }: {
  icon: string; title: string; pips?: [number, number]; note?: ReactNode;
  buildQ: [string, string]; price: number | null; req?: number; onBuy: () => void; done?: boolean;
}) {
  const busy = !!buildingNow(buildQ[0], buildQ[1]) || !!buildingNow('pen', buildQ[1]) && buildQ[0] === 'penup';
  return (
    <div className="paper flex flex-col items-center gap-1 p-2">
      <Ic n={icon} s={4.4} />
      <div className="text-sm font-extrabold">{title}</div>
      {pips && <Pips n={pips[0]} max={pips[1]} />}
      {note && <div className="text-xs font-bold opacity-70">{note}</div>}
      {busy ? <BuildingBadge kind={buildQ[0]} keyName={buildQ[1]} />
        : done ? <Ic n="check" s={2.4} />
        : req && req > lv() ? <Lock req={req} />
        : price === null ? null
        : <BuyBtn n={UT.u148} price={price} onClick={onBuy} />}
    </div>
  );
}

function PenCard({ k }: { k: AnimalKind }) {
  const d = ANIMALS[k];
  const pl = S.pens[k] ?? 0;
  const building = buildingNow('pen', k) || buildingNow('penup', k);
  return (
    <div className="paper flex flex-col items-center gap-1 p-2">
      <Ic n={k} s={4.4} />
      <div className="text-sm font-extrabold">{UT.u149}{d.fa}</div>
      <Pips n={pl} max={3} />
      <div className="flex items-center gap-1 text-xs font-bold opacity-70">
        <span>{UT.u150}</span>
        <span>{fa(PEN_CAP_LV[pl])}</span>
        {pl > 0 && pl < 3 ? <><Ic n="arrow" s={1} /><span className="text-green-700 font-black">{fa(PEN_CAP_LV[pl + 1])}</span></> : null}
      </div>
      {building ? <BuildingBadge kind={building.kind} keyName={k} />
        : pl === 0 ? (d.lv > lv() ? <Lock req={d.lv} /> : <BuyBtn n={UT.u151} price={PEN_BUILD[k]} onClick={() => buyPen(k)} />)
        : pl < 3 ? <BuyBtn n={UT.u152} price={PEN_UP[pl]} onClick={() => buyPenUp(k)} />
        : <Ic n="check" s={2.4} />}
    </div>
  );
}

export function Carpenter() {
  const l = S.lv;
  return (
    <Modal title={UT.u153} icon="hammer" onClose={close} coins={<Wallet />}>
      <div className="mb-1 text-sm font-bold opacity-80">{UT.u154}</div>

      <SecTitle icon="hoe" t={UT.u155} />
      <div className={grid}>
        <UpCard
          icon="hoe"
          k="hoe"
          name={`${UT.u156} (${l.hoe >= 4 ? `${fa(3)}×${fa(3)}` : l.hoe >= 2 ? `${fa(1)}×${fa(3)}` : `${fa(1)}×${fa(1)}`})`}
          max={6}
          cur={`×${faDec(HOE_SPEED[l.hoe])}`}
          next={l.hoe < 5 ? `×${faDec(HOE_SPEED[l.hoe + 1])}` : null}
        />
        <UpCard
          icon="can"
          k="can"
          name={`${UT.u157} (${l.can >= 4 ? `${fa(3)}×${fa(3)}` : l.can >= 2 ? `${fa(1)}×${fa(3)}` : `${fa(1)}×${fa(1)}`})`}
          max={6}
          cur={fa(CAN_CAP[l.can])}
          next={l.can < 5 ? fa(CAN_CAP[l.can + 1]) : null}
        />
        <UpCard icon="bag" k="bag" name={UT.u133} max={7} cur={fa(BAG_CAP[l.bag])} next={l.bag < 6 ? fa(BAG_CAP[l.bag + 1]) : null} />
        <UpCard icon="fert" k="soil" name={UT.u158} max={4} cur={("+" + (fa(l.soil * 12)) + UT.u46)} next={l.soil < 3 ? ("+" + (fa((l.soil + 1) * 12)) + UT.u46) : null} />
        <div className="paper flex flex-col items-center gap-1 p-2">
          <Ic n="rod" s={4.4} />
          <div className="text-sm font-extrabold">{UT.u159}</div>
          <div className="text-xs font-bold opacity-70">{UT.u160}</div>
          {S.rod > 0 ? <div className="mt-1 flex items-center gap-1 text-sm font-extrabold text-green-700"><Ic n="check" s={1.6} />{UT.u161}</div>
            : ROD_LV > lv() ? (
              <>
                <div className="mb-0.5 rounded-md bg-[#fff] px-2 py-0.5 text-[.68rem] font-extrabold text-[#8a5a28] ring-1 ring-[#50342633]">{UT.u162}</div>
                <Lock req={ROD_LV} />
              </>
            ) : (
              <>
                <div className="rounded-md bg-[#fff] px-2 py-0.5 text-[.68rem] font-extrabold text-[#8a5a28] ring-1 ring-[#50342633]">{UT.u162}</div>
                <BuyBtn n={UT.u83} price={ROD_PRICE} onClick={buyRod} />
              </>
            )}
        </div>
      </div>

      <SecTitle icon="chicken" t={UT.u163} />
      <div className={grid}>
        {PEN_KINDS.map((k) => <PenCard key={k} k={k} />)}
        <BuildCard icon="silo" title={UT.u164} pips={[S.silo, SILO_PRICE.length]} note={<span className="inline-flex items-center gap-1"><span>{UT.u165}{fa(troughCap())}</span>{S.silo < 2 ? <><Ic n="arrow" s={1} /><span className="text-green-700 font-black">{fa(TROUGH_CAP * SILO_MULT[S.silo + 1])}</span></> : null}</span>}
          buildQ={['silo', 'silo']} price={S.silo < SILO_PRICE.length ? SILO_PRICE[S.silo] : null} req={SILO_LV[S.silo] ?? 0}
          onBuy={buySilo} done={S.silo >= SILO_PRICE.length} />
        <BuildCard icon="greenhouse" title={UT.u166} pips={[S.gh, GH_PRICE.length]} note={S.gh ? (UT.u167 + faDec(GH_SPEED[S.gh])) : UT.u168}
          buildQ={['gh', 'gh']} price={S.gh < GH_PRICE.length ? GH_PRICE[S.gh] : null} req={GH_LV[S.gh] ?? 0}
          onBuy={buyGh} done={S.gh >= GH_PRICE.length} />
      </div>

      <SecTitle icon="pond" t={UT.u169} />
      <div className={grid}>
        <BuildCard icon="pond" title={UT.u170} pips={[S.ponds.length, POND_MAX]} note={((fa(S.ponds.length)) + UT.u171)}
          buildQ={['pond', 'pond']} price={S.ponds.length < POND_MAX ? pondPrice(S.ponds.length) : null} req={POND_LV[S.ponds.length] ?? 0}
          onBuy={buyPond} done={S.ponds.length >= POND_MAX} />
        <BuildCard icon="hive" title={UT.u172} pips={[S.hives, HIVE_MAX]} note={((fa(S.hives)) + UT.u173)}
          buildQ={['hive', 'hive']} price={S.hives < HIVE_MAX ? hivePrice(S.hives) : null} req={HIVE_LV[S.hives] ?? 0}
          onBuy={buyHive} done={S.hives >= HIVE_MAX} />
        <BuildCard icon="well" title={UT.wellTitle} pips={[S.wellLv, 3]} note={UT.wellNote}
          buildQ={['well', 'well']} price={wellPrice()} req={wellLvReq()}
          onBuy={buyWell} done={S.wellLv >= 3} />
      </div>

      {S.debt && (
        <>
          <SecTitle icon="scarecrow" t={UT.scarecrowSec} />
          <div className={grid}>
            <BuildCard
              icon="scarecrow"
              title={UT.scarecrowTitle}
              pips={[S.debt.scarecrow, 3]}
              note={UT.scarecrowNote}
              buildQ={['scarecrow', 'scarecrow']}
              price={S.debt.scarecrow < 3 ? scarecrowPrice() : null}
              onBuy={orderScarecrow}
              done={S.debt.scarecrow >= 3}
            />
          </div>
        </>
      )}
    </Modal>
  );
}

export function Estate() {
  const l = S.lv;
  const loc = CFG.locale === 'en' ? 'en' : 'fa';
  const eu = ESTATE_UI[loc];
  const stepNames = [eu.northFarmCard, eu.northQanatCard, eu.valleyFarmCard, eu.valleyCharterCard];
  const stepDescs = [eu.northFarmDesc, eu.northQanatDesc, eu.valleyFarmDesc, eu.valleyCharterDesc];
  const stepName = stepNames[Math.min(3, l.land)] ?? UT.u176;
  const stepDesc = stepDescs[Math.min(3, l.land)] ?? '';
  return (
    <Modal title={UT.u174} icon="house" onClose={close} coins={<Wallet />}>
      <div className="mb-2 text-sm font-bold opacity-85">{eu.mainFarmOpen}</div>
      <div className={grid}>
        <UpCard
          icon="land"
          k="land"
          name={stepName}
          max={LAND_PRICES.length}
          pipsN={Math.min(l.land, LAND_PRICES.length)}
          cur={fa(plotsOf(Math.min(l.land, LAND_PRICES.length))) + UT.plotsUnit}
          next={l.land < LAND_PRICES.length ? fa(plotsOf(l.land + 1)) + UT.plotsUnit : null}
        />
        <div className="paper flex flex-col items-center gap-1 p-2 justify-between">
          <Ic n="worker" s={4.6} />
          <div className="text-sm font-extrabold">{UT.u177}</div>
          <Pips n={S.workers} max={WORKER_MAX} />
          <div className="flex items-center gap-1 text-sm font-black"><Coin v={WORKER_WAGE} s={1.2} />{UT.u178}</div>
          {buildingNow('worker', 'worker') ? <BuildingBadge kind="worker" keyName="worker" />
            : S.workers >= WORKER_MAX ? <Ic n="check" s={2.4} />
            : WORKER_LV[S.workers] > lv() ? <Lock req={WORKER_LV[S.workers]} />
            : <BuyBtn n={UT.u179} price={(S.workersHired ?? 0) > S.workers ? 0 : WORKER_PRICES[S.workers]} onClick={buyWorker} />}
        </div>
      </div>
      {l.land < LAND_PRICES.length && (
        <div className="paper mx-auto mt-2 max-w-lg p-2.5 text-center text-xs font-extrabold">{stepDesc}</div>
      )}
      <div className="mt-2.5 flex flex-wrap justify-center gap-1.5">
        <button className="btn g press !px-2.5 !py-1 text-xs font-black" onClick={() => { close(); cmd.travelTo('farm'); }}>
          <Ic n="house" s={1.4} /><span>{eu.mainFarmCard}</span>
        </button>
        <button className={'btn press !px-2.5 !py-1 text-xs font-black ' + (isEstateOwned('north', l.land) ? 'g' : 'opacity-75')} onClick={() => { if (!isEstateOwned('north', l.land)) { toast('lock', eu.lockedNorthToast); return; } close(); cmd.travelTo('north'); }}>
          <Ic n="wheat" s={1.4} /><span>{eu.northFarmCard}</span><Ic n={isEstateOwned('north', l.land) ? 'check' : 'lock'} s={1.1} />
        </button>
        <button className={'btn press !px-2.5 !py-1 text-xs font-black ' + (isEstateOwned('valley', l.land) ? 'y' : 'opacity-75')} onClick={() => { if (!isEstateOwned('valley', l.land)) { toast('lock', eu.lockedValleyToast); return; } close(); cmd.travelTo('valley'); }}>
          <Ic n="sun" s={1.4} /><span>{eu.valleyFarmCard}</span><Ic n={isEstateOwned('valley', l.land) ? 'check' : 'lock'} s={1.1} />
        </button>
      </div>
      <div className="paper mx-auto mt-2 max-w-md p-2.5 text-center text-xs font-bold opacity-85">{UT.u180}</div>
    </Modal>
  );
}
