import { useState } from 'react';
import {
  ACHS, CROPS, CROP, FEED_PRICE, FINGER_PRICE, GOOD, GOODS, HIVE_MAX,
  FERT_PRICE, HONEY_CAP_PER_HIVE, MACHINES, MACHINE_LIST, MK_FA, POND_GROW_DAYS, POND_MAX, STAM_CAP,
  DAY_RATE, fa, machineMkLv,
  type MachineId,
} from '../game/data';
import {
  S, UI, achValue, addStat, buyFeed, buyFert, buyFingerling, buyMachine, buySeed, deliverContract,
  effectiveMachinePrice, feedPond, goodPrice, goodRatio, harvestHoney, harvestPond, honeyCap, manageAllPonds, mkOf, notify,
  isNight, resetGame, saleValueSel, saveGame, season, seedPackPrice, seedPrice, sellAll, sellGood, sleepToMorning, srcHave, stockPond, holdCount,
} from '../game/state';
import { sfx } from '../game/sound';
import { Bar, Coin, Ic, Modal, Trend } from './parts';
import { BuildingBadge, BuyBtn, close, grid, Lock, lv, UpCard, Wallet, buildingNow } from './shopKit';
import { Carpenter, Estate } from './Shops2';
import { AnimalShop } from './AnimalModal';
import { InventoryModal } from './InventoryModal';
import { Ledger } from './Ledger';
import { Quests } from './Quests';
import { Museum } from './Museum';
import { AutoPanelModal } from './AutoPanelModal';
import { FarmhouseModal } from './FarmhouseModal';
import { AlmanacModal } from './AlmanacModal';
import { MailboxModal } from './MailboxModal';
import { FishingModal } from './FishingModal';
import { FestivalModal } from './FestivalModal';
import { WorldAtlasModal } from './WorldAtlasModal';
import { currentRegionalShock, hasMonocultureSaturation } from '../game/core/frontier';
import { FT } from '../strings/frontierText';
import { bestEstateForCrop, estateGrowthRate } from '../game/estates';
import { offerContractBoard, signBoardContract } from '../story/socialVillagers';
import { WX } from '../strings/worldExpansionText';
import { SettingsPanel } from './SettingsPanel';
import { CFG, setShortBeat, updateSetting } from '../game/settings';
import { APP_VERSION, CHANGELOG, formatVersion } from '../strings/version';
import { UT } from '../strings/uiText';
import { exitNativeApp } from '../game/androidNav';
import { maybeStartPrologue } from '../story/engine';



/** مدت پایهٔ رشد یک بذر به روزِ بازی، بدون کود و ماشین، روی مزرعهٔ اصلی — با همان فرمول effectivePlotDailyRate (قیمت ۰٫۹ روزِ قدیمی ۲٫۴ برابر کمتر بود) */
export function seedDurationDays(c: { days: number }): number {
  return Math.round((c.days / (DAY_RATE * estateGrowthRate('farm', 0) * (0.83 + 0.44 * 0))) * 10) / 10;
}

export function Modals() {
  return (
    <>
      {UI.modal === 'seed' && <SeedShop />}
      {UI.modal === 'market' && <Market />}
      {UI.modal === 'work' && <Workshop />}
      {UI.modal === 'carp' && <Carpenter />}
      {UI.modal === 'estate' && <Estate />}
      {UI.modal === 'animal' && <AnimalShop />}
      {UI.modal === 'inv' && <InventoryModal />}
      {UI.modal === 'menu' && <Menu />}
      {UI.modal === 'auto' && <AutoPanelModal />}
      {UI.modal === 'pond' && <PondModal />}
      {UI.modal === 'hive' && <HiveModal />}
      {UI.modal === 'achieve' && <Achievements />}
      {UI.modal === 'ledger' && <Ledger />}
      {UI.modal === 'quests' && <Quests />}
      {UI.modal === 'museum' && <Museum />}
      {UI.modal === 'home' && <FarmhouseModal />}
      {UI.modal === 'fishing' && <FishingModal />}
      {UI.modal === 'festival' && <FestivalModal />}
      {UI.modal === 'atlas' && <WorldAtlasModal />}
      {UI.modal === 'almanac' && <AlmanacModal />}
      {UI.modal === 'mail' && <MailboxModal />}
      {UI.confirm === 'reset' && <Confirm icon="trash" msg={UT.confirmResetMsg} onYes={() => { UI.confirm = null; UI.modal = null; resetGame(); window.location.reload(); }} />}
      {UI.confirm === 'newgame' && <Confirm icon="trash" msg={UT.confirmNewGameMsg} onYes={() => { UI.confirm = null; UI.modal = null; resetGame(); UI.started = true; maybeStartPrologue(); sfx.fanfare(); notify(); }} />}
      {UI.confirm === 'exit' && <Confirm icon="house" msg={UT.exitPrompt} onYes={() => { UI.confirm = null; notify(); exitNativeApp(); }} />}
    </>
  );
}

function Confirm({ icon, msg, onYes }: { icon: string; msg?: string; onYes: () => void }) {
  return (
    <div role="alertdialog" aria-modal="true" className="fixed inset-0 z-[90] flex items-center justify-center bg-black/45">
      <div className="paper popin flex flex-col items-center gap-3 p-5 text-center">
        <Ic n={icon} s={7} cls="bob" />
        {msg && <div className="text-sm font-black">{msg}</div>}
        <div className="flex gap-6">
          <button aria-label={UT.yesBtn} className="btn g press !p-2" onClick={onYes}><Ic n="check" s={3.5} /></button>
          <button aria-label={UT.noBtn} className="btn r press !p-2" onClick={() => { UI.confirm = null; notify(); }}><Ic n="close" s={3.5} /></button>
        </div>
      </div>
    </div>
  );
}



function SeedShop() {
  const L = lv();
  const [seasonOnly, setSeasonOnly] = useState(false);
  const curSeason = season();
  const visibleCrops = seasonOnly ? CROPS.filter((c) => c.seasons.includes(curSeason)) : CROPS;
  return (
    <Modal title={UT.u75} icon="seedshop" onClose={close} coins={<Wallet />}>
      <div className="mb-2 flex items-center gap-1.5">
        <button
          className={`btn press !px-2.5 !py-0.5 text-xs font-black ${!seasonOnly ? 'y' : ''}`}
          onClick={() => setSeasonOnly(false)}
        >
          {UT.filterAllSeeds}
        </button>
        <button
          className={`btn press !px-2.5 !py-0.5 text-xs font-black ${seasonOnly ? 'g' : ''}`}
          onClick={() => setSeasonOnly(true)}
        >
          <Ic n={['spring', 'summer', 'autumn', 'winter'][curSeason]} s={1.2} />
          <span>{UT.filterSeasonSeeds}</span>
        </button>
      </div>
      <div className={grid}>
        {visibleCrops.map((c) => {
          const p = seedPrice(c.id);
          const locked = c.lv > L;
          const yieldTxt = c.yield[0] === c.yield[1] ? fa(c.yield[0]) : `${fa(c.yield[0])}-${fa(c.yield[1])}`;
          return (
            <div key={c.id} className={'paper relative flex flex-col items-center gap-1 p-2 ' + (locked ? 'opacity-70' : '')}>
              <div className="relative">
                <Ic n={locked ? 'lock' : 'seed:' + c.id} s={4.6} cls={locked ? 'grayscale' : ''} />
                {!locked && (S.seeds[c.id] ?? 0) > 0 && <span className="absolute -left-2 -top-1 rounded-full border-2 border-[#503426] bg-[#8fd35a] px-1.5 text-sm font-black">{fa(S.seeds[c.id])}</span>}
              </div>
              <div className="text-sm font-extrabold leading-none">{locked ? UT.u76 : c.fa}</div>
              <div className="flex items-center gap-1">
                {[0, 1, 2, 3].map((s) => <Ic key={s} n={['spring', 'summer', 'autumn', 'winter'][s]} s={1.35} cls={!locked && c.seasons.includes(s) ? '' : 'opacity-20 grayscale'} />)}
              </div>
              {locked ? <Lock req={c.lv} /> : (
                <>
                  <div className="flex flex-wrap items-center justify-center gap-1.5 text-xs font-extrabold">
                    <span>{fa(seedDurationDays(c))}{UT.u39}</span>
                    <span className="flex items-center gap-0.5"><Ic n={c.id} s={1.2} /> <Coin v={c.price} s={1} /></span>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-1 text-[.68rem] font-extrabold text-[#5c3b24]">
                    <span className="rounded bg-amber-50 px-1 py-0.5 ring-1 ring-[#50342626]">{UT.yieldRange}<span dir="ltr">{yieldTxt}</span></span>
                    {c.regrow && <span className="rounded bg-emerald-50 px-1 py-0.5 text-emerald-900 ring-1 ring-emerald-300">{UT.regrowTag}{fa(c.maxH ?? 1)}</span>}
                    <span className="rounded bg-sky-50 px-1 py-0.5 text-sky-950 ring-1 ring-sky-300">
                      {bestEstateForCrop(c.id) === 'north' ? WX.specNorthBadge : bestEstateForCrop(c.id) === 'valley' ? WX.specValleyBadge : WX.specFarmBadge}
                    </span>
                  </div>
                  <Trend r={p / c.seed} />
                  <div className="flex w-full gap-1">
                    <BuyBtn n={UT.u77} price={p} onClick={() => buySeed(c.id, 1)} />
                    <BuyBtn n={UT.u78} price={seedPackPrice(c.id, 5)} onClick={() => buySeed(c.id, 5)} />
                    <BuyBtn n={UT.pack25} price={seedPackPrice(c.id, 25)} onClick={() => buySeed(c.id, 25)} />
                  </div>
                </>
              )}
            </div>
          );
        })}
        <div className="paper flex flex-col items-center gap-1 p-2">
          <div className="relative"><Ic n="fert" s={4.6} /><span className="absolute -left-2 -top-1 rounded-full border-2 border-[#503426] bg-[#8fd35a] px-1.5 text-sm font-black">{fa(S.fert)}</span></div>
          <div className="text-sm font-extrabold">{UT.u31}</div>
          <div className="flex w-full gap-1">
            <BuyBtn n={UT.u77} price={FERT_PRICE} onClick={() => buyFert(1)} />
            <BuyBtn n={UT.u78} price={FERT_PRICE * 5} onClick={() => buyFert(5)} />
            <BuyBtn n={UT.pack25} price={FERT_PRICE * 25} onClick={() => buyFert(25)} />
          </div>
        </div>
        <div className="paper flex flex-col items-center gap-1 p-2">
          <div className="relative"><Ic n="feed" s={4.6} /><span className="absolute -left-2 -top-1 rounded-full border-2 border-[#503426] bg-[#8fd35a] px-1.5 text-sm font-black">{fa(S.inv.feed ?? 0)}</span></div>
          <div className="text-sm font-extrabold">{UT.u79}</div>
          <div className="flex w-full gap-1">
            <BuyBtn n={UT.u78} price={FEED_PRICE * 5} onClick={() => buyFeed(5)} />
            <BuyBtn n={UT.u80} price={FEED_PRICE * 10} onClick={() => buyFeed(10)} />
            <BuyBtn n={UT.pack50} price={FEED_PRICE * 50} onClick={() => buyFeed(50)} />
          </div>
        </div>
        <div className="paper flex flex-col items-center gap-1 p-2">
          <div className="relative"><Ic n="fingerling" s={4.6} /><span className="absolute -left-2 -top-1 rounded-full border-2 border-[#503426] bg-[#8fd35a] px-1.5 text-sm font-black">{fa(S.inv.fingerling ?? 0)}</span></div>
          <div className="text-sm font-extrabold">{UT.u81}</div>
          <div className="text-[.7rem] font-bold opacity-70">{UT.u82}</div>
          <div className="flex w-full gap-1">
            <BuyBtn n={UT.u77} price={FINGER_PRICE} onClick={() => buyFingerling(1)} />
            <BuyBtn n={UT.u78} price={FINGER_PRICE * 5} onClick={() => buyFingerling(5)} />
          </div>
        </div>
      </div>
    </Modal>
  );
}

function Market() {
  const rows = GOODS.filter((g) => g.id !== 'feed' && g.id !== 'fingerling');
  let total = 0;
  for (const g of rows) {
    const keep = S.contract && S.contract.good === g.id ? S.contract.qty : 0;
    const sellable = Math.max(0, srcHave(g.id) - keep);
    total += saleValueSel(g.id, sellable);
  }
  const hotGoods = [...rows].sort((a, b) => goodRatio(b.id) - goodRatio(a.id)).slice(0, 3);
  const shock = currentRegionalShock();
  const monoWarn = hasMonocultureSaturation();
  const boardOffers = offerContractBoard();
  const active = S.contract;
  return (
    <Modal title={UT.u84} icon="market" onClose={close} coins={<Wallet />}>
      {/* انتخاب منبع فروش: کولهٔ پشتی یا انبار یا هر دو */}
      <div className="mb-2 flex items-center gap-1.5" data-market-sellfrom="1">
        <span className="whitespace-nowrap text-xs font-black opacity-75">{UT.uSellFrom}</span>
        <div className="flex flex-1 gap-1">
          {(['pack', 'barn', 'both'] as const).map((k) => (
            <button
              key={k}
              aria-pressed={S.sellFrom === k}
              data-sell-src={k}
              className={'btn press flex-1 !py-1.5 text-xs font-black ' + (S.sellFrom === k ? 'g' : 'y opacity-70')}
              onClick={() => { S.sellFrom = k; saveGame(); notify(); sfx.tap(); }}
            >
              {k === 'pack' ? UT.uSrcPack : k === 'barn' ? UT.uSrcBarn : UT.uSrcBoth}
            </button>
          ))}
        </div>
      </div>
      <button className="btn g press mb-2 w-full !py-1.5" disabled={total <= 0} onClick={() => { sellAll(); }}>
        <Ic n="cart" s={2.4} /><span className="ft text-xl">{UT.u85}</span><Coin v={total} s={1.8} cls="text-xl" />
      </button>
      <div className="paper mb-2 flex flex-wrap items-center gap-1.5 px-2.5 py-1 text-xs font-extrabold" data-market-hot="1">
        <Ic n="star" s={1.3} />
        <span className="text-[#6c3d16]">{WX.hotMarketLabel}</span>
        {hotGoods.map((hg) => (
          <span key={hg.id} className="inline-flex items-center gap-1 rounded-full border border-[#c88d32] bg-[#fff6d6] px-2 py-0.5 text-[.7rem] font-black text-[#4a2b13]">
            <Ic n={hg.id} s={1.1} />
            <span>{hg.fa}</span>
            <Trend r={goodRatio(hg.id)} />
          </span>
        ))}
      </div>
      <div className={grid}>
        {rows.map((g) => {
          const q = srcHave(g.id);
          const offSeason = !!CROP[g.id] && !CROP[g.id].seasons.includes(season());
          return (
            <div key={g.id} className={'paper flex flex-col items-center gap-1 p-2 ' + (q ? '' : 'opacity-60')}>
              <div className="relative">
                <Ic n={g.id} s={4.2} />
                <span className="absolute -left-2 -top-1 rounded-full border-2 border-[#503426] bg-white px-1.5 text-sm font-black">{fa(q)}</span>
              </div>
              <div className="text-sm font-extrabold leading-none">{g.fa}</div>
              {offSeason && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[.66rem] font-black text-amber-900">{UT.outSeasonBonus}</span>}
              <div className="flex items-center gap-2"><Coin v={goodPrice(g.id)} s={1.4} cls="text-base" /><Trend r={goodRatio(g.id)} /></div>
              <div className="flex w-full gap-1">
                <button className="btn y press min-w-0 flex-1 !px-1 !text-xs" disabled={q < 1} onClick={() => sellGood(g.id, 1)}><span className="font-black">{UT.u77}</span><Ic n="coin" s={1.1} /></button>
                <button className="btn g press min-w-0 flex-1 !px-1 !text-xs" disabled={q < 1} onClick={() => sellGood(g.id, q)}><span className="font-black">{UT.sellAllStack}</span><Ic n="coin" s={1.1} /></button>
              </div>
            </div>
          );
        })}
      </div>
      <div className="paper mt-2 flex flex-wrap items-center justify-between gap-2 px-2.5 py-1.5 text-xs font-extrabold" data-market-shock={shock.id}>
        <div>
          <span className="text-amber-900">{CFG.locale === 'en' ? shock.titleEn : shock.titleFa}: </span>
          <span className="opacity-85">{CFG.locale === 'en' ? shock.descEn : shock.descFa}</span>
          {monoWarn && <div className="mt-0.5 text-[.7rem] text-rose-800">{FT.monoWarn}</div>}
        </div>
        <button className="btn y press !px-2.5 !py-0.5 text-[.72rem] font-black" onClick={() => { UI.modal = 'atlas'; notify(); }}>
          <Ic n="crown" s={1.25} /> {FT.tabDecrees}
        </button>
      </div>
      <div className="paper mt-2 flex flex-col gap-2 p-2" data-market-contract="1">
        {!active ? (
          <div className="grid gap-1.5 sm:grid-cols-3">
            {boardOffers.map((of) => (
              <div key={of.slot} className="flex flex-col justify-between gap-1 rounded-xl border border-[#d6c08a] bg-white/80 p-2 text-xs font-extrabold">
                <div>
                  <div className="text-[.68rem] font-black text-emerald-800">{of.tierLabel}</div>
                  <div>{fa(of.qty)} {of.fa}</div>
                  <div className="opacity-75">{UT.contractReward}{fa(of.reward)}</div>
                </div>
                <BuyBtn n={UT.contractSign} price={of.deposit} onClick={() => { signBoardContract(of.slot); }} />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs font-extrabold">
              <div>{UT.contractTitle}: <span dir="ltr">{fa(holdCount(active.good))}/{fa(active.qty)}</span> {GOOD[active.good]?.fa ?? active.good}</div>
              <div className="opacity-75">{UT.contractDue}{fa(active.dueDay)} — {UT.contractReward}{fa(active.reward)}</div>
              <div className="text-[.68rem] text-green-800">{UT.contractReservedNote}</div>
            </div>
            <button className="btn g press !px-2.5 !py-1 text-xs font-black" disabled={holdCount(active.good) < active.qty} onClick={() => { deliverContract(); }}>
              {UT.contractDeliver}
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}


const MACHINE_PERKS: Record<MachineId, () => string> = {
  feeder: () => UT.machPerkFeeder,
  sprinkler: () => UT.machPerkSprinkler,
  tractor: () => UT.machPerkTractor,
  seeder: () => UT.machPerkSeeder,
  harvester: () => UT.machPerkHarvester,
  collector: () => UT.machPerkCollector,
  drone: () => UT.machPerkDrone,
};

function Workshop() {
  const L = lv();
  return (
    <Modal title={UT.u86} icon="workshop" onClose={close} coins={<Wallet />}>
      <div className="paper mb-2 flex flex-wrap items-center justify-between gap-2 p-2">
        <div className="flex items-center gap-2">
          <Ic n="bolt" s={2.6} />
          <div>
            <div className="text-sm font-extrabold">{UT.u87} — {UT.u88}</div>
            <div className="flex items-center gap-1.5 text-xs font-black opacity-80">
              <span>{fa(STAM_CAP[S.lv.stam])}</span>
              {S.lv.stam < 5 && <><Ic n="arrow" s={1.1} /><span className="text-green-700">{fa(STAM_CAP[S.lv.stam + 1])}</span></>}
            </div>
          </div>
        </div>
        <div className="min-w-44">
          <UpCard icon="bolt" k="stam" name={UT.u88} max={6} cur={fa(STAM_CAP[S.lv.stam])} next={S.lv.stam < 5 ? fa(STAM_CAP[S.lv.stam + 1]) : null} compact />
        </div>
      </div>
      <div className="mb-1.5 flex items-center gap-2">
        <Ic n="tractor" s={2.1} />
        <span className="ft text-xl">{UT.u89}</span>
        <span className="text-xs font-bold opacity-70">{UT.u90}</span>
      </div>
      <div className={grid}>
        {MACHINE_LIST.map((id) => {
          const m = MACHINES[id];
          const mk = mkOf(id);
          const b = buildingNow('machine', id);
          const nextMk = mk + 1;
          const req = nextMk <= 3 ? machineMkLv(id, nextMk) : 0;
          const price = nextMk <= 3 ? effectiveMachinePrice(id, nextMk) : 0;
          return (
            <div key={id} className={'paper flex flex-col items-center gap-1 p-2 ' + (mk > 0 ? 'ring-2 ring-[#6cc84c]' : '')}>
              <Ic n={m.icon} s={4.6} cls={mk > 0 ? 'bob' : ''} />
              <div className="text-sm font-extrabold">{m.fa}</div>
              <div className="flex items-center gap-0.5">
                {[1, 2, 3].map((k) => <Ic key={k} n="star" s={1.2} cls={k <= mk ? '' : 'grayscale opacity-40'} />)}
              </div>
              <div className="text-center text-[.72rem] font-extrabold leading-tight">{mk > 0 ? MK_FA[mk] : m.desc}</div>
              <div className="text-center text-[.66rem] font-bold opacity-75 leading-tight">{MACHINE_PERKS[id]()}</div>
              {b ? <BuildingBadge kind="machine" keyName={id} /> : mk >= 3 ? (
                <div className="flex items-center gap-1 text-xs font-black text-green-700"><Ic n="check" s={1.8} />{UT.u91}</div>
              ) : req > L ? <Lock req={req} /> : <BuyBtn n={mk === 0 ? UT.u92 : UT.u93 + fa(nextMk)} price={price} onClick={() => buyMachine(id)} />}
            </div>
          );
        })}
      </div>
    </Modal>
  );
}

function PondModal() {
  const n = S.ponds.length;
  const stockedN = S.ponds.filter((p) => p.stocked).length;
  const readyN = S.ponds.filter((p) => p.stocked && p.grow >= POND_GROW_DAYS).length;
  const avgGrow = stockedN > 0
    ? S.ponds.filter((p) => p.stocked).reduce((s, p) => s + Math.min(1, p.grow / POND_GROW_DAYS), 0) / stockedN
    : 0;
  const totalFeed = S.ponds.reduce((s, p) => s + p.feed, 0);
  const maxGrowLeft = stockedN > 0
    ? Math.max(...S.ponds.filter((p) => p.stocked).map((p) => Math.max(0, POND_GROW_DAYS - p.grow)))
    : POND_GROW_DAYS;

  return (
    <Modal title={UT.unifiedPondTitle} icon="pond" onClose={close} coins={<Wallet />}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Ic n="pond" s={2.4} />
          <span className="ft text-xl" dir="ltr">{fa(n)} / {fa(POND_MAX)}</span>
          <span className="text-xs font-bold opacity-75">{UT.unifiedPondSub}</span>
        </div>
        {n > 0 && (
          <button className="btn g press !px-2.5 !py-1 text-xs font-black" onClick={() => { manageAllPonds(); }}>
            <Ic n="fish" s={1.4} />
            <span>{UT.manageAllPonds}</span>
          </button>
        )}
      </div>

      {n > 0 ? (
        <div className="paper mb-3 flex flex-col gap-2.5 p-3.5" data-unified-pond="1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Ic n="pond" s={4.2} />
              <div>
                <div className="text-base font-extrabold">{UT.unifiedPondTitle} — {UT.u112}{fa(n)}</div>
                <div className="text-xs font-bold opacity-75">
                  {stockedN > 0
                    ? (readyN > 0 ? UT.u113 : (fa(Math.ceil(maxGrowLeft / DAY_RATE)) + UT.u114))
                    : UT.u116}
                </div>
              </div>
            </div>
            <span className="paper flex items-center gap-1 px-2.5 py-1 text-xs font-black">
              <Ic n="feed" s={1.4} />{fa(Math.round(totalFeed * 10) / 10)}
            </span>
          </div>

          <Bar v={avgGrow} col="#5ab4e8" icon="fish" />

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {stockedN < n && (
              <button
                className="btn b press w-full justify-center !py-1.5 text-xs font-black"
                onClick={() => { for (let i = 0; i < S.ponds.length; i++) if (!S.ponds[i].stocked) stockPond(i); }}
              >
                <Ic n="fingerling" s={1.5} />
                <span>{UT.pondStockAll}</span>
                {(S.inv.fingerling ?? 0) <= 0 && <Coin v={FINGER_PRICE * (n - stockedN)} />}
              </button>
            )}
            <button
              className="btn y press w-full justify-center !py-1.5 text-xs font-black"
              disabled={stockedN <= 0}
              onClick={() => { for (let i = 0; i < S.ponds.length; i++) if (S.ponds[i].stocked) feedPond(i); }}
            >
              <Ic n="feed" s={1.5} />
              <span>{UT.pondFeedAll}</span>
            </button>
            <button
              className="btn g press w-full justify-center !py-1.5 text-xs font-black"
              disabled={readyN <= 0}
              onClick={() => { for (let i = 0; i < S.ponds.length; i++) if (S.ponds[i].stocked && S.ponds[i].grow >= POND_GROW_DAYS) harvestPond(i); }}
            >
              <Ic n="fish" s={1.5} />
              <span>{UT.pondHarvestAll}</span>
            </button>
          </div>
        </div>
      ) : null}

      {n < POND_MAX && (
        <div className="paper flex items-center justify-between gap-3 p-3">
          <div className="flex items-center gap-2.5">
            <Ic n="pond" s={3.6} cls="opacity-70" />
            <div className="text-sm font-extrabold">{n > 0 ? UT.expandUnifiedPond : UT.buildUnifiedPond}</div>
          </div>
          <BuildingBadge kind="pond" keyName="pond" />
          {!buildingNow('pond', 'pond') && (
            <button className="btn b press !px-3 !py-1.5 text-xs font-black" onClick={() => { UI.modal = 'carp'; notify(); }}>
              {UT.u120}
            </button>
          )}
        </div>
      )}
    </Modal>
  );
}

function HiveModal() {
  const acc = Math.floor(S.honeyAcc);
  return (
    <Modal title={UT.u121} icon="hive" onClose={close} coins={<Wallet />}>
      <div className="mb-2 flex items-center gap-3">
        <Ic n="hive" s={2.2} />
        <span className="ft text-xl" dir="ltr">{fa(S.hives)} / {fa(HIVE_MAX)}</span>
        <span className="paper flex items-center gap-1 px-2 py-0.5 text-sm font-black" dir="ltr"><Ic n="honey" s={1.6} />{fa(acc)} / {fa(honeyCap())}</span>
        <span className="text-xs font-bold opacity-70">{UT.u122}</span>
      </div>
      <div className={grid}>
        {Array.from({ length: HIVE_MAX }, (_, i) => {
          const built = i < S.hives;
          return (
            <div key={i} className={'paper flex flex-col items-center gap-1.5 p-3 ' + (built ? '' : 'opacity-60')}>
              <Ic n={built ? 'hive' : 'lock'} s={4.6} cls={built ? 'bob' : 'grayscale'} />
              <div className="text-sm font-extrabold">{UT.u123}{fa(i + 1)}</div>
              {built ? <div className="text-xs font-black text-green-700">{UT.u124}</div> : i === S.hives ? (
                <>
                  <BuildingBadge kind="hive" keyName="hive" />
                  {!buildingNow('hive', 'hive') && <button className="btn b press flex-1 !px-1 text-xs font-black" onClick={() => { UI.modal = 'carp'; notify(); }}>{UT.u120}</button>}
                </>
              ) : <div className="text-[.7rem] font-bold opacity-70">{UT.u125}</div>}
            </div>
          );
        })}
      </div>
      <button className="btn g press mt-2 w-full !py-2" disabled={acc <= 0} onClick={() => { harvestHoney(); }}>
        <Ic n="honey" s={2.6} /><span className="ft text-xl">{UT.u126}</span>
        {acc > 0 && <span className="ft text-lg" dir="ltr">+{fa(acc)}</span>}
      </button>
      <div className="mt-1 text-center text-xs font-bold opacity-70">{UT.u127}{fa(HONEY_CAP_PER_HIVE)}{UT.u128}</div>
    </Modal>
  );
}

const achStatValue = (a: (typeof ACHS)[number]) => achValue(a.stat);

function Achievements() {
  const done = ACHS.reduce((s, a) => s + (S.ach[a.id] ?? 0), 0);
  const total = ACHS.reduce((s, a) => s + a.tiers.length, 0);
  return (
    <Modal title={UT.u129} icon="medal" onClose={close} coins={<Wallet />}>
      <div className="mb-2 flex items-center gap-3">
        <Ic n="medal" s={2.4} cls="bob" />
        <span className="ft text-xl" dir="ltr">{fa(done)} / {fa(total)}</span>
        <span className="text-xs font-bold opacity-70">{UT.u130}</span>
      </div>
      <div className={grid}>
        {ACHS.map((a) => {
          const claimed = S.ach[a.id] ?? 0;
          const allDone = claimed >= a.tiers.length;
          const tier = a.tiers[Math.min(claimed, a.tiers.length - 1)];
          const value = achStatValue(a);
          return (
            <div key={a.id} className={'paper flex flex-col items-center gap-1 p-2 ' + (allDone ? 'ring-2 ring-[#d99a1a]' : '')}>
              <Ic n={a.icon} s={4} cls={allDone ? '' : claimed === 0 ? 'grayscale opacity-80' : ''} />
              <div className="text-sm font-extrabold">{a.fa}</div>
              <div className="flex items-center gap-0.5">
                {a.tiers.map((_, i) => <Ic key={i} n="star" s={1.1} cls={i < claimed ? '' : 'grayscale opacity-40'} />)}
              </div>
              {allDone ? (
                <div className="flex items-center gap-1 text-xs font-black text-green-700"><Ic n="check" s={1.8} />{UT.u131}</div>
              ) : (
                <>
                  <Bar v={Math.min(1, value / tier.n)} col="#d99a1a" icon={a.icon} />
                  <div className="flex items-center gap-1 text-xs font-black" dir="ltr">
                    <span>{fa(Math.min(value, tier.n))}/{fa(tier.n)}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[.7rem] font-bold opacity-75">{UT.u132}<Coin v={tier.reward} s={1.1} /></div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </Modal>
  );
}

function Menu() {
  void addStat;
  const done = ACHS.reduce((s, a) => s + (S.ach[a.id] ?? 0), 0);
  const total = ACHS.reduce((s, a) => s + a.tiers.length, 0);
  return (
    <Modal title={UT.u134} icon="gear" onClose={close}>
      <div className="flex flex-wrap items-center justify-center gap-4 py-4">
        <button className="btn g press flex-col !p-3" onClick={close}><Ic n="play" s={4.5} cls="invert-0" /><span className="ft text-xl">{UT.u3}</span></button>
        <button className="btn b press flex-col !p-3" onClick={() => { saveGame(); sfx.buy(); }}><Ic n="save" s={4.5} /><span className="ft text-xl">{UT.u135}</span></button>
        <button className="btn y press flex-col !p-3" onClick={() => { UI.modal = 'achieve'; notify(); }}>
          <Ic n="medal" s={4.5} /><span className="ft text-xl">{UT.u129}</span>
          <span className="text-xs font-black" dir="ltr">{fa(done)}/{fa(total)}</span>
        </button>
        <button className="btn y press flex-col !p-3" onClick={() => { const next = !CFG.sound; updateSetting('sound', next); UI.sound = next; notify(); }}><Ic n={CFG.sound ? 'sound' : 'mute'} s={4.5} /><span className="ft text-xl">{UT.u136}</span></button>
        <button className={'btn press flex-col !p-3 ' + (CFG.shortBeat ? 'p' : 'y')} onClick={() => { setShortBeat(!CFG.shortBeat); notify(); }}>
          <Ic n="note" s={4.5} /><span className="ft text-xl">{UT.alwaysShort}</span>
          <span className="text-xs font-black">{CFG.shortBeat ? UT.shortOn : UT.shortOff}</span>
        </button>
        <button className="btn b press flex-col !p-3" onClick={() => { sleepToMorning(); sfx.buy(); close(); }}>
          <Ic n="moon" s={4.5} /><span className="ft text-xl">{isNight() ? UT.u33 : UT.restAnytime}</span>
          <span className="text-xs font-black">{isNight() ? UT.u137 : UT.restSub}</span>
        </button>
        <button className="btn p press flex-col !p-3" onClick={() => { UI.modal = 'ledger'; notify(); }}><Ic n="ledger" s={4.5} /><span className="ft text-xl">{UT.u36}</span></button>
        <button className="btn g press flex-col !p-3" onClick={() => { UI.modal = 'home'; notify(); }}><Ic n="house" s={4.5} /><span className="ft text-xl">{WX.homeBtn}</span></button>
        <button className="btn b press flex-col !p-3" onClick={() => { UI.modal = 'almanac'; notify(); }}><Ic n="scroll" s={4.5} /><span className="ft text-xl">{WX.almanacBtn}</span></button>
        <button className="btn y press flex-col !p-3" onClick={() => { UI.modal = 'museum'; notify(); }}><Ic n="trophy" s={4.5} /><span className="ft text-xl">{UT.museumShort}</span></button>
        <button className="btn r press flex-col !p-3" onClick={() => { UI.modal = null; UI.confirm = 'reset'; notify(); }}><Ic n="trash" s={4.5} /><span className="ft text-xl">{UT.u25}</span></button>
      </div>
      <SettingsPanel />
      <div className="paper mx-auto mt-2 max-w-md p-3 text-center">
        <div className="ft text-lg">{UT.u139}{formatVersion(APP_VERSION)}</div>
        <div className="mt-1 space-y-0.5 text-[.7rem] font-bold opacity-70">
          {CHANGELOG.map((c) => <div key={c.v}>{UT.u139}{c.v} — {c.note}</div>)}
        </div>
      </div>
      <div className="paper mx-auto mt-2 max-w-md p-3 text-center text-sm font-bold opacity-80">
        <Ic n="info" s={1.6} cls="inline" />{UT.u140}</div>
    </Modal>
  );
}
