// ===== انبار مزرعه + کولهٔ پشتی بازیکن + پاتیل و آسیاب فرآوری روستایی =====
import { useState } from 'react';
import { CROPS, GOOD, GOODS, SEASONS, fa } from '../game/data';
import {
  ARTISAN_RECIPES, S, UI, artisanMaxBatches, artisanRewardCoins, craftArtisan, goodPrice, invCap, invCount,
  notify, packCap, packCount, saveGame, toast, transferPackToBarn,
} from '../game/state';
import { Coin, Ic, Modal } from './parts';
import { close, grid, Wallet } from './shopKit';
import { GT } from '../strings/gameText';
import { UT } from '../strings/uiText';
import { inventoryJoke } from '../strings/inventoryText';
import { seedDurationDays } from '../game/core/cropGrowth';
import { faDec } from '../strings/fa';

function Cell({ itemKey, ic, q, name, selected, onSelect }: {
  itemKey: string; ic: string; q: number; name: string; selected: boolean; onSelect: (key: string) => void;
}) {
  return (
    <button
      type="button"
      className={'paper press flex min-h-[76px] flex-col items-center justify-center p-1.5 ' + (selected ? 'ring-4 ring-[#2563eb]' : '')}
      aria-pressed={selected}
      aria-label={`${name} — ${fa(q)}`}
      data-inventory-item={itemKey}
      onClick={() => onSelect(itemKey)}
    >
      <span className="relative block">
        <Ic n={ic} s={3.6} />
        <span className="absolute -left-2 -top-1 rounded-full border-2 border-[#503426] bg-white px-1.5 text-sm font-black">{fa(q)}</span>
      </span>
      <span className="text-xs font-extrabold">{name}</span>
    </button>
  );
}

/** Compact, always-visible metadata for the selected real inventory item. */
function ItemDetails({ selection }: { selection: string | null }) {
  if (!selection) {
    return <div className="paper flex items-center gap-2 px-2.5 py-1.5 text-xs font-bold" data-inventory-details="empty"><Ic n="bag" s={1.5} /><span>{UT.invSelectHint}</span></div>;
  }
  const [where, kind, id] = selection.split('|');
  if (kind === 'seed') {
    const crop = CROPS.find((c) => c.id === id);
    if (!crop || (S.seeds[crop.id] ?? 0) <= 0) return <ItemDetails selection={null} />;
    return (
      <div className="paper flex flex-wrap items-center gap-x-3 gap-y-1 px-2.5 py-1.5 text-xs font-bold" data-inventory-details="seed">
        <Ic n={'seed:' + crop.id} s={2} />
        <span className="font-black">{UT.seedBagPrefix}{crop.fa} × {fa(S.seeds[crop.id])}</span>
        <span>{UT.invGrowthDays}: {faDec(seedDurationDays(crop))}</span>
        <span>{UT.invSeasons}: {crop.seasons.map((s) => SEASONS[s]).join(' · ')}</span>
        <span className="flex items-center gap-1"><Coin v={crop.seed} s={1} />{GT.g59}</span>
        <span className="w-full opacity-75">{inventoryJoke('seed')}</span>
      </div>
    );
  }
  if (kind === 'fert') {
    if (S.fert <= 0) return <ItemDetails selection={null} />;
    return (
      <div className="paper flex items-center gap-2 px-2.5 py-1.5 text-xs font-bold" data-inventory-details="fert">
        <Ic n="fert" s={2} /><span className="font-black">{UT.u31} × {fa(S.fert)}</span><span>{UT.invFertDetail}</span>
        <span className="w-full opacity-75">{inventoryJoke('fert')}</span>
      </div>
    );
  }
  if (kind !== 'good' || !id || !GOOD[id]) return <ItemDetails selection={null} />;
  const source = where === 'pack' ? S.pack : S.inv;
  const q = source[id] ?? 0;
  if (q <= 0) return <ItemDetails selection={null} />;
  const recipes = ARTISAN_RECIPES.filter((r) => r.inputs.some(([gid]) => gid === id));
  const total = (S.inv[id] ?? 0) + (S.pack[id] ?? 0);
  return (
    <div className="paper flex flex-wrap items-center gap-x-3 gap-y-1 px-2.5 py-1.5 text-xs font-bold" data-inventory-details="good">
      <Ic n={id} s={2} />
      <span className="font-black">{GOOD[id].fa} × {fa(q)}</span>
      <span>{where === 'pack' ? UT.uPack : UT.u133} · {UT.invTotal}: {fa(total)}</span>
      <span className="flex items-center gap-1">{UT.invUnitPrice}: <Coin v={goodPrice(id)} s={1} /></span>
      <span className="w-full opacity-80">
        {recipes.length > 0
          ? <>{UT.invUsedIn}: {recipes.slice(0, 3).map((r) => r.name).join(' · ')}{recipes.length > 3 ? ` +${fa(recipes.length - 3)}` : ''}</>
          : UT.invNoRecipe}
      </span>
      <span className="w-full opacity-75">{inventoryJoke(id)}</span>
    </div>
  );
}

export function InventoryModal() {
  const [selected, setSelected] = useState<string | null>(null);
  const goods = GOODS.filter((g) => (S.inv[g.id] ?? 0) > 0);
  const packGoods = GOODS.filter((g) => (S.pack[g.id] ?? 0) > 0);
  const seeds = CROPS.filter((c) => (S.seeds[c.id] ?? 0) > 0);
  const select = (key: string) => setSelected((old) => old === key ? null : key);
  const transferAction = (
    <div className="flex flex-col gap-1.5">
      <div className="paper-dark flex items-center gap-2 px-2.5 py-1 text-[#fff4d8]">
        <Ic n="bag" s={1.7} />
        <span className="text-xs font-black" dir="ltr">{fa(packCount())}/{fa(packCap())}</span>
        <button
          type="button"
          className="btn g press ms-auto !px-2.5 !py-1 text-xs font-black"
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
      <div aria-live="polite"><ItemDetails selection={selected} /></div>
    </div>
  );

  return (
    <Modal title={UT.u133} icon="bag" onClose={close} coins={<Wallet />} actions={transferAction}>
      {/* کولهٔ پشتی بازیکن — پر از برداشت، اینجا به انبار تخلیه می‌شود */}
      <div className="paper mb-2 p-2" data-pack-section="1">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <Ic n="bag" s={2} />
          <span className="ft text-lg">{UT.uPack}</span>
          <span className="text-xs font-black" dir="ltr">{fa(packCount())}/{fa(packCap())}</span>
        </div>
        <div className="bar !h-3">
          <i style={{ width: `${Math.min(100, (packCount() / packCap()) * 100)}%`, background: packCount() >= packCap() ? '#ff7a6a' : '#8fd35a' }} />
        </div>
        {packGoods.length > 0 && (
          <div className="mt-1.5 grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-6">
            {packGoods.map((g) => <Cell key={'p' + g.id} itemKey={`pack|good|${g.id}`} ic={g.id} q={S.pack[g.id]} name={GOOD[g.id].fa} selected={selected === `pack|good|${g.id}`} onSelect={select} />)}
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
        {goods.map((g) => <Cell key={g.id} itemKey={`barn|good|${g.id}`} ic={g.id} q={S.inv[g.id]} name={GOOD[g.id].fa} selected={selected === `barn|good|${g.id}`} onSelect={select} />)}
        {seeds.map((c) => <Cell key={'s' + c.id} itemKey={`barn|seed|${c.id}`} ic={'seed:' + c.id} q={S.seeds[c.id]} name={UT.seedBagPrefix + c.fa} selected={selected === `barn|seed|${c.id}`} onSelect={select} />)}
        {S.fert > 0 && <Cell itemKey="barn|fert|" ic="fert" q={S.fert} name={UT.u31} selected={selected === 'barn|fert|'} onSelect={select} />}
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
                <button type="button" className="btn y press flex-1 !px-1 !py-1 text-xs font-black" disabled={maxB < 1} onClick={() => craftArtisan(rec.id, 1)}>{UT.craftOne}</button>
                <button type="button" className="btn g press flex-1 !px-1 !py-1 text-xs font-black" disabled={maxB < 2} onClick={() => craftArtisan(rec.id, maxB)}>{UT.craftAll}</button>
              </div>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
