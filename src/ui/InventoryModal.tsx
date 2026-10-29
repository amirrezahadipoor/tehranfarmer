// ===== انبار مزرعه + کولهٔ پشتی بازیکن + پاتیل و آسیاب فرآوری روستایی =====
import { CROPS, GOOD, GOODS, fa } from '../game/data';
import {
  ARTISAN_RECIPES, S, UI, artisanMaxBatches, artisanRewardCoins, craftArtisan, invCap, invCount,
  notify, packCap, packCount, saveGame, toast, transferPackToBarn,
} from '../game/state';
import { Coin, Ic, Modal } from './parts';
import { close, grid, Wallet } from './shopKit';
import { GT } from '../strings/gameText';
import { UT } from '../strings/uiText';

export function InventoryModal() {
  const goods = GOODS.filter((g) => (S.inv[g.id] ?? 0) > 0);
  const packGoods = GOODS.filter((g) => (S.pack[g.id] ?? 0) > 0);
  const seeds = CROPS.filter((c) => (S.seeds[c.id] ?? 0) > 0);
  const Cell = ({ ic, q, name }: { ic: string; q: number; name: string }) => (
    <div className="paper flex flex-col items-center p-1.5">
      <div className="relative">
        <Ic n={ic} s={3.6} />
        <span className="absolute -left-2 -top-1 rounded-full border-2 border-[#503426] bg-white px-1.5 text-sm font-black">{fa(q)}</span>
      </div>
      <span className="text-xs font-extrabold">{name}</span>
    </div>
  );

  return (
    <Modal title={UT.u133} icon="bag" onClose={close} coins={<Wallet />}>
      {/* کولهٔ پشتی بازیکن — پر از برداشت، اینجا به انبار تخلیه می‌شود */}
      <div className="paper mb-2 p-2" data-pack-section="1">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <Ic n="bag" s={2} />
          <span className="ft text-lg">{UT.uPack}</span>
          <span className="text-xs font-black" dir="ltr">{fa(packCount())}/{fa(packCap())}</span>
          <button
            className="btn g press ms-auto !px-2 !py-1 text-xs font-black"
            disabled={packCount() === 0}
            data-pack-to-barn="1"
            onClick={() => {
              const mv = transferPackToBarn();
              toast('house', mv <= 0 ? GT.g43 : packCount() > 0 ? GT.gPackPartial : GT.gPackMoved);
              if (mv > 0) { saveGame(); notify(); }
            }}
          >
            {UT.uToBarn}
          </button>
        </div>
        <div className="bar !h-3">
          <i style={{ width: `${Math.min(100, (packCount() / packCap()) * 100)}%`, background: packCount() >= packCap() ? '#ff7a6a' : '#8fd35a' }} />
        </div>
        {packGoods.length > 0 && (
          <div className="mt-1.5 grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-6">
            {packGoods.map((g) => <Cell key={'p' + g.id} ic={g.id} q={S.pack[g.id]} name={GOOD[g.id].fa} />)}
          </div>
        )}
      </div>

      <div className="mb-2 flex items-center gap-2">
        <Ic n="house" s={2} />
        <span className="ft text-lg">{UT.u133}</span>
        <div className="bar flex-1 !h-4">
          <i style={{ width: `${(invCount() / invCap()) * 100}%`, background: invCount() >= invCap() ? '#ff7a6a' : '#8fd35a' }} />
        </div>
        <span className="ft text-lg" dir="ltr">{fa(invCount())}/{fa(invCap())}</span>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-6">
        {goods.map((g) => <Cell key={g.id} ic={g.id} q={S.inv[g.id]} name={GOOD[g.id].fa} />)}
        {seeds.map((c) => <Cell key={'s' + c.id} ic={'seed:' + c.id} q={S.seeds[c.id]} name={UT.seedBagPrefix + c.fa} />)}
        {S.fert > 0 && <Cell ic="fert" q={S.fert} name={UT.u31} />}
      </div>
      {goods.length + seeds.length === 0 && S.fert === 0 && (
        <div className="flex justify-center py-4"><Ic n="bag" s={6} cls="opacity-30" /></div>
      )}

      <div className="mb-1.5 mt-4 flex flex-col gap-0.5 border-t-2 border-dashed border-[#50342633] pt-3">
        <div className="flex items-center gap-2">
          <Ic n="honey" s={2.2} />
          <span className="ft text-xl">{UT.artisanSecTitle}</span>
        </div>
        <div className="text-xs font-bold opacity-75">{UT.artisanSecSub}</div>
      </div>

      <div className={UI.portrait ? 'grid grid-cols-2 gap-2 pb-2' : grid} data-artisan-kitchen="1">
        {ARTISAN_RECIPES.map((rec) => {
          const maxB = artisanMaxBatches(rec);
          const reward = artisanRewardCoins(rec);
          return (
            <div key={rec.id} className={'paper flex flex-col justify-between gap-1.5 p-2 ' + (maxB > 0 ? 'ring-2 ring-[#6cc84c]' : 'border-dashed')}>
              <div className="flex items-center gap-2">
                <Ic n={rec.icon} s={3} />
                <div className="min-w-0 flex-1 leading-tight">
                  <div className="text-xs font-black">{rec.name}</div>
                  <div className="text-[.68rem] font-bold opacity-75">{rec.sub}</div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 text-xs font-extrabold">
                {rec.inputs.map(([gid, need]) => {
                  const have = S.inv[gid] ?? 0;
                  return (
                    <span key={gid} className={'rounded-lg px-1.5 py-0.5 ' + (have >= need ? 'bg-[#dcfce7] text-green-900' : 'bg-[#f5ebd6] text-[#5b3b24]')} dir="ltr">
                      <Ic n={gid} s={1.2} /> {fa(have)}/{fa(need)}
                    </span>
                  );
                })}
                {reward > 0 && <Coin v={reward} s={1.2} cls="text-xs" />}
              </div>
              <div className="flex w-full gap-1">
                <button
                  className="btn y press flex-1 !px-1 !py-1 text-xs font-black"
                  disabled={maxB < 1}
                  onClick={() => craftArtisan(rec.id, 1)}
                >
                  {UT.craftOne}
                </button>
                <button
                  className="btn g press flex-1 !px-1 !py-1 text-xs font-black"
                  disabled={maxB < 2}
                  onClick={() => craftArtisan(rec.id, maxB)}
                >
                  {UT.craftAll}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
