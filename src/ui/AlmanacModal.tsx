import { useState } from 'react';
import { ANIMALS, CROPS, DAY_RATE, GOOD, SEASONS, type AnimalKind } from '../game/data';
import { bestEstateForCrop, estateSpecialtyMult } from '../game/estates';
import { ESTATE_UI } from '../strings/estateStoryText';
import { ARTISAN_RECIPES, FISH_SPECIES, S, UI, artisanRewardCoins, goodPrice, notify, penCap } from '../game/state';
import { SECRETS, discoveredSecretCount } from '../story/secrets';
import { CFG } from '../game/settings';
import { fa, faDec, faPct } from '../strings/fa';
import { sfx } from '../game/sound';
import { Coin, Ic, Modal } from './parts';
import { close, Wallet } from './shopKit';
import { UT } from '../strings/uiText';
import { WX } from '../strings/worldExpansionText';

type AlmTab = 'crops' | 'animals' | 'fish' | 'artisan';

export function AlmanacModal() {
  const [tab, setTab] = useState<AlmTab>('crops');
  const loc = CFG.locale === 'en' ? 'en' : 'fa';

  return (
    <Modal title={WX.almanacTitle} icon="scroll" onClose={close} coins={<Wallet />}>
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-1.5">
        <div className="flex flex-wrap gap-1">
          {([
            ['crops', 'wheat', WX.almTabCrops],
            ['animals', 'cow', WX.almTabRanch],
            ['fish', 'fish', WX.almTabFish],
            ['artisan', 'honey', WX.almTabArtisan],
          ] as const).map(([id, ic, label]) => (
            <button
              key={id}
              type="button"
              className={'btn press !px-2.5 !py-0.5 text-xs font-black ' + (tab === id ? 'y' : '')}
              onClick={() => { sfx.tap(); setTab(id); }}
            >
              <Ic n={ic} s={1.3} />
              <span>{label}</span>
            </button>
          ))}
        </div>
        <div className="paper px-2.5 py-1 text-xs font-black">
          <span>{UT.secretsTitle}: {fa(discoveredSecretCount())}/{fa(SECRETS.length)}</span>
        </div>
      </div>

      {tab === 'crops' && (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {CROPS.map((c) => {
            const bestEst = bestEstateForCrop(c.id);
            const specPct = Math.round((estateSpecialtyMult(bestEst, c.id) - 1) * 100);
            const harvests = c.maxH ?? 1;
            const totalDays = c.days + (c.regrow ?? 0) * Math.max(0, harvests - 1);
            const avgYield = (c.yield[0] + c.yield[1]) * 0.5;
            const netPerDay = Math.max(1, Math.round((goodPrice(c.id) * avgYield * harvests - c.seed) / Math.max(1, totalDays)));
            return (
              <div key={c.id} className="paper flex flex-col gap-1 p-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Ic n={c.id} s={2.4} />
                    <div>
                      <div className="text-sm font-black">{c.fa}</div>
                      <div className="text-[.68rem] font-bold opacity-75">
                        {c.seasons.map((s) => SEASONS[s]).join(' · ')}
                      </div>
                    </div>
                  </div>
                  <div className="text-end font-black text-emerald-800">
                    <div>+{fa(netPerDay)}</div>
                    <div className="text-[.64rem] opacity-80">{WX.profitPerDay}</div>
                  </div>
                </div>
                <div className="flex items-center justify-between border-t border-[#d8c498] pt-1 text-[.7rem] font-extrabold">
                  <span className="text-[#5a3518]">
                    {WX.almBestFarm} {bestEst === 'farm' ? ESTATE_UI[loc].farmShort : bestEst === 'north' ? ESTATE_UI[loc].northShort : ESTATE_UI[loc].valleyShort} (+{faPct(specPct)})
                  </span>
                  <Coin v={goodPrice(c.id)} s={1.05} cls="text-xs" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'animals' && (
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {(['chicken', 'rabbit', 'duck', 'sheep', 'goat', 'cow'] as AnimalKind[]).map((k) => {
            const d = ANIMALS[k];
            const count = S.animals.filter((a) => a.kind === k).length;
            return (
              <div key={k} className="paper flex flex-col gap-1.5 p-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Ic n={k} s={2.8} />
                    <div>
                      <div className="text-sm font-black">{d.fa}</div>
                      <div className="text-[.7rem] font-bold opacity-75">
                        {d.eat <= 0 ? UT.freeRangeNoFeed : `${GOOD.feed.fa}: ${faDec(Math.round(d.eat * DAY_RATE * 10) / 10)}`}
                      </div>
                    </div>
                  </div>
                  <span className="ft text-base" dir="ltr">{fa(count)}/{fa(penCap(k))}</span>
                </div>
                <div className="flex items-center justify-between border-t border-[#d8c498] pt-1 font-extrabold">
                  <span className="flex items-center gap-1"><Ic n={d.prod} s={1.4} />{GOOD[d.prod]?.fa}</span>
                  <Coin v={goodPrice(d.prod)} s={1.1} cls="text-xs" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'fish' && (
        <div>
          <div className="paper mb-2 px-3 py-1.5 text-xs font-extrabold text-sky-900">
            <Ic n="fish" s={1.4} cls="inline me-1" />
            <span>{WX.fishMinigameTitle}</span>
          </div>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {FISH_SPECIES.map((f) => {
              const bestKg = S.fishLog?.[f.id] ?? 0;
              return (
                <div key={f.id} className={'paper flex items-center justify-between gap-2 p-2.5 text-xs ' + (bestKg > 0 ? 'ring-1 ring-[#38bdf8]' : 'opacity-80')}>
                  <div className="flex items-center gap-2">
                    <Ic n={f.good} s={2.4} />
                    <div>
                      <div className="text-sm font-black">{f.name}</div>
                      <div className="text-[.68rem] font-bold opacity-75">
                        {f.seasons.map((s) => SEASONS[s]).join(' · ')}
                      </div>
                    </div>
                  </div>
                  <div className="text-end font-black text-sky-900">
                    {bestKg > 0 ? `${WX.almCaughtMax} ${faDec(bestKg)}${WX.fishWeightUnit}` : WX.almUncaught}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'artisan' && (
        <div className="grid gap-2 sm:grid-cols-2">
          {ARTISAN_RECIPES.map((r) => (
            <div key={r.id} className="paper flex items-center justify-between gap-2 p-2.5 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <Ic n={r.icon} s={2.4} />
                <div className="min-w-0">
                  <div className="text-sm font-black truncate">{r.name}</div>
                  <div className="text-[.68rem] font-bold opacity-80">
                    {r.inputs.map(([gid, q]) => `${fa(q)} ${GOOD[gid]?.fa ?? gid}`).join(' + ')}
                  </div>
                </div>
              </div>
              <div className="shrink-0 text-end">
                {r.feedOut > 0 ? (
                  <span className="font-black text-emerald-800">+{fa(r.feedOut)} {GOOD.feed.fa}</span>
                ) : (
                  <Coin v={artisanRewardCoins(r)} s={1.15} cls="text-xs" />
                )}
                <div>
                  <button
                    type="button"
                    className="btn y press mt-1 !px-2 !py-0.5 text-[.68rem] font-black"
                    onClick={() => { UI.modal = 'inv'; notify(); }}
                  >
                    {UT.u133}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
