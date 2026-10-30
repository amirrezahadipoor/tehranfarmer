import { ANIMALS, DAY_RATE, MEDICINE_PRICE, PEN_CAP_LV, PEN_UP, fa, type AnimalKind } from '../game/data';
import {
  S, UI, animalSellPrice, buyAnimal, buyPenUp, cureAllAnimals, notify,
  penCap, penHas, penOccupied, sellAnimal,
} from '../game/state';
import { Coin, Ic, Modal } from './parts';
import { BuyBtn, close, Lock, lv, Wallet, buildingNow, BuildingBadge } from './shopKit';
import { UT } from '../strings/uiText';

export function AnimalShop() {
  const L = lv();
  const kinds: AnimalKind[] = ['chicken', 'rabbit', 'duck', 'sheep', 'goat', 'cow'];
  const babies = S.animals.filter((a) => a.grown > 0).length;
  const pregs = S.animals.filter((a) => (a.preg ?? 0) > 0).length;
  const sicks = S.animals.filter((a) => a.sick).length;
  const totalCap = kinds.reduce((acc, k) => acc + penCap(k), 0);
  const totalOcc = kinds.reduce((acc, k) => acc + penOccupied(k), 0);

  return (
    <Modal title={UT.u94} icon="animalshop" onClose={close} coins={<Wallet />}>
      {sicks > 0 && (
        <div className="paper mb-2 flex items-center justify-between gap-2 p-2" data-vet-clinic="1">
          <span className="text-xs font-extrabold">{UT.sickBanner}{fa(sicks)}</span>
          <BuyBtn n={UT.cureBtn} price={sicks * MEDICINE_PRICE} onClick={() => { cureAllAnimals(); }} />
        </div>
      )}
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="paper flex items-center gap-1 px-2 py-0.5 text-xs font-black" data-herd-total="1">
          <Ic n="chicken" s={1.4} />
          <span>{UT.herdTotalLabel}</span>
          <span dir="ltr">{fa(totalOcc)}/{fa(totalCap)}</span>
        </span>
        {babies > 0 && <span className="paper flex items-center gap-1 px-2 py-0.5 text-xs font-black"><Ic n="star" s={1.4} />{fa(babies)}{UT.u95}</span>}
        {pregs > 0 && <span className="paper flex items-center gap-1 px-2 py-0.5 text-xs font-black text-pink-700"><Ic n="heart" s={1.3} />{fa(pregs)}{UT.u96}</span>}
        {S.nests.length > 0 && <span className="paper flex items-center gap-1 px-2 py-0.5 text-xs font-black"><Ic n="egg" s={1.3} />{fa(S.nests.length)}{UT.u97}</span>}
        <span className="text-xs font-bold opacity-75">{UT.u98}</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {kinds.map((k) => {
          const d = ANIMALS[k];
          const locked = d.lv > L;
          const hasPen = penHas(k);
          const pl = S.pens[k] ?? 0;
          const group = S.animals.filter((a) => a.kind === k);
          const cap = penCap(k);
          const occ = penOccupied(k);
          const reserved = Math.max(0, occ - group.length);
          const males = group.filter((a) => a.sex === 'm' && a.grown <= 0).length;
          const females = group.filter((a) => a.sex === 'f' && a.grown <= 0).length;
          const young = group.filter((a) => a.grown > 0).length;
          const resell = animalSellPrice(k);
          const penB = buildingNow('penup', k);
          const full = occ >= cap;
          const cannotBuy = full || S.coins < d.price;

          return (
            <div key={k} className={'paper flex flex-col items-center gap-1 p-2 ' + (locked || !hasPen ? 'opacity-70' : '')} data-animal-card={k}>
              <div className="relative">
                <Ic n={locked ? 'lock' : k} s={3.8} cls={locked ? 'grayscale' : 'bob'} />
                <span className="absolute -left-2 -top-1 rounded-full border-2 border-[#503426] bg-white px-1.5 text-xs font-black" dir="ltr">
                  {fa(occ)}/{fa(cap)}
                </span>
              </div>
              <div className="text-sm font-extrabold">{locked ? UT.lockedAnimal : d.fa}</div>
              {locked ? <Lock req={d.lv} /> : !hasPen ? (
                <button className="btn b press !px-2.5 !py-1 text-[.75rem] font-black" onClick={() => { UI.modal = 'carp'; notify(); }}>{UT.u99}</button>
              ) : (
                <>
                  <div className="flex flex-wrap items-center justify-center gap-1.5 text-xs font-black">
                    {d.eat <= 0 ? (
                      <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[.68rem] font-black text-emerald-900">{UT.freeRangeNoFeed}</span>
                    ) : (
                      <span className="flex items-center gap-0.5"><Ic n="feed" s={1.3} />{fa(Math.round(d.eat * DAY_RATE * 10) / 10)}</span>
                    )}
                    <Ic n="arrow" s={1.1} />
                    <span className="flex items-center gap-0.5"><Ic n={d.prod} s={1.4} />{fa(d.qty * DAY_RATE)}{d.every > 1 ? UT.u100 : ''}</span>
                    <span className="opacity-65 text-[.68rem]">({UT.maxStoreBadge}{fa(d.cap)})</span>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-1.5 text-xs font-black">
                    <span className="inline-flex items-center gap-0.5 rounded-md bg-pink-50 px-1.5 py-0.5 text-pink-800 ring-1 ring-pink-300">
                      <Ic n="female" s={1.1} />{fa(females)} {UT.sexFemaleBadge}
                    </span>
                    <span className="inline-flex items-center gap-0.5 rounded-md bg-sky-50 px-1.5 py-0.5 text-sky-900 ring-1 ring-sky-300">
                      <Ic n="male" s={1.1} />{fa(males)} {UT.sexMaleBadge}
                    </span>
                    {young > 0 && <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-amber-900 ring-1 ring-amber-300">{fa(young)}{UT.u95}</span>}
                    {reserved > 0 && <span className="rounded-md bg-purple-50 px-1.5 py-0.5 text-purple-900 ring-1 ring-purple-300">{UT.penReservedNote}{fa(reserved)}</span>}
                  </div>

                  <div className="text-[.68rem] font-extrabold text-center leading-tight">
                    {males > 0 && females > 0 ? (
                      <span className="inline-flex items-center gap-0.5 text-green-800"><Ic n="heart" s={1.05} />{UT.breedActive}</span>
                    ) : females > 0 ? (
                      <span className="text-sky-800">{UT.breedNeedMale}</span>
                    ) : (
                      <span className="text-pink-800">{UT.breedNeedFemale}</span>
                    )}
                  </div>

                  <div className="grid w-full grid-cols-2 gap-1.5">
                    <button
                      className="btn g press min-w-0 !flex-col !gap-0 !px-1.5 !py-1 leading-tight"
                      aria-label={UT.buyFemale}
                      disabled={cannotBuy}
                      onClick={() => buyAnimal(k, 'f')}
                      data-buy-female={k}
                    >
                      <span className="inline-flex max-w-full items-center gap-0.5 text-[.72rem] font-black"><Ic n="female" s={0.9} />{UT.buyFemaleShort}</span>
                      <Coin v={d.price} s={0.95} cls="text-[.72rem]" />
                    </button>
                    <button
                      className="btn g press min-w-0 !flex-col !gap-0 !px-1.5 !py-1 leading-tight"
                      aria-label={UT.buyMale}
                      disabled={cannotBuy}
                      onClick={() => buyAnimal(k, 'm')}
                      data-buy-male={k}
                    >
                      <span className="inline-flex max-w-full items-center gap-0.5 text-[.72rem] font-black"><Ic n="male" s={0.9} />{UT.buyMaleShort}</span>
                      <Coin v={d.price} s={0.95} cls="text-[.72rem]" />
                    </button>
                  </div>

                  {(females > 0 || males > 0) && (
                    <div className="grid w-full grid-cols-2 gap-1.5">
                      <button
                        className="btn y press min-w-0 !flex-col !gap-0 !px-1.5 !py-1 leading-tight"
                        aria-label={UT.sellFemale}
                        disabled={females <= 0}
                        onClick={() => sellAnimal(k, 'f')}
                        data-sell-female={k}
                      >
                        <span className="inline-flex max-w-full items-center gap-0.5 text-[.72rem] font-black"><Ic n="female" s={0.9} />{UT.sellFemaleShort}</span>
                        <Coin v={resell} s={0.95} cls="text-[.72rem]" />
                      </button>
                      <button
                        className="btn y press min-w-0 !flex-col !gap-0 !px-1.5 !py-1 leading-tight"
                        aria-label={UT.sellMale}
                        disabled={males <= 0}
                        onClick={() => sellAnimal(k, 'm')}
                        data-sell-male={k}
                      >
                        <span className="inline-flex max-w-full items-center gap-0.5 text-[.72rem] font-black"><Ic n="male" s={0.9} />{UT.sellMaleShort}</span>
                        <Coin v={resell} s={0.95} cls="text-[.72rem]" />
                      </button>
                    </div>
                  )}

                  {penB ? (
                    <BuildingBadge kind="penup" keyName={k} />
                  ) : pl < 3 && (
                    <div className="flex w-full pt-0.5">
                      <BuyBtn
                        n={`${UT.upgradePenDirect}${fa(PEN_CAP_LV[pl + 1] ?? 10)}`}
                        price={PEN_UP[pl] ?? 6500}
                        onClick={() => buyPenUp(k)}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
