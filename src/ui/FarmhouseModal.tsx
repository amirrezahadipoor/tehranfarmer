import { useState } from 'react';
import { ACHS, ACH_OUTFIT_REWARDS, GOOD, SEASONS, fa } from '../game/data';
import {
  DECOR_ITEMS, OUTFIT_THEMES, SKILL_DEFS, S, UI, buyCourtyardDecor, farmLevel, hasDecor, hasSkill,
  isNight, isOutfitUnlocked, notify, setHomesteadNames, setPlayerOutfit, skillPointsAvailable,
  toggleMorningCard, toggleCompactStory, unlockSkill, type SkillBranch,
} from '../game/state';
import { VILLAGER_PROFILES, canGiftVillagerToday, findBestGiftInBag, giftVillager, villagerHearts } from '../story/socialVillagers';
import { daysToDue, debt } from '../game/core/debt';
import { CFG } from '../game/settings';
import { sfx } from '../game/sound';
import { Ic, Modal } from './parts';
import { BuyBtn, Lock, close, Wallet } from './shopKit';
import { NPC_ROLES } from '../strings/estateStoryText';
import { UT } from '../strings/uiText';
import { WX } from '../strings/worldExpansionText';
import { requestSleep } from '../game/sleep';

type HomeTab = 'home' | 'decor' | 'skills' | 'social' | 'calendar';

export function FarmhouseModal() {
  const [tab, setTab] = useState<HomeTab>('home');
  const loc = CFG.locale === 'en' ? 'en' : 'fa';
  const L = farmLevel();
  const sp = skillPointsAvailable();
  const curSeason = ((Math.floor((Math.max(1, S.day) - 1) / 7)) % 4 + 4) % 4;
  const dayInSeason = ((Math.max(1, S.day) - 1) % 7) + 1;
  const dayInYear = ((Math.max(1, S.day) - 1) % 28) + 1;
  const dueOffset = debt() ? daysToDue() : -1;
  const dueYearDay = dueOffset >= 0 && dayInYear + dueOffset <= 28 ? dayInYear + dueOffset : -1;

  return (
    <Modal
      title={WX.homeTitle}
      icon="house"
      onClose={close}
      coins={<Wallet />}
      actions={(
        <button
          type="button"
          className={'btn b press w-full !py-1.5 text-sm font-black ' + (S.tut?.active && S.tut.step === 6 ? 'ring-4 ring-amber-300' : '')}
          data-home-sleep="1"
          onClick={requestSleep}
        >
          <Ic n="moon" s={1.6} />
          <span>{isNight() ? UT.u33 : UT.restAnytime}</span>
        </button>
      )}
    >
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-1.5">
        <div className="flex flex-wrap gap-1">
          {([
            ['home', 'house', WX.tabHome],
            ['decor', 'sun', WX.tabDecor],
            ['skills', 'star', `${WX.tabSkills} (${fa(sp)})`],
            ['social', 'heart', WX.tabVillagers],
            ['calendar', 'scroll', WX.tabCalendar],
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
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="btn b press !px-2.5 !py-0.5 text-xs font-black"
            onClick={() => { UI.modal = 'almanac'; notify(); }}
          >
            <Ic n="scroll" s={1.3} />
            <span>{WX.almanacBtn}</span>
          </button>
          <button
            type="button"
            className="btn g press !px-2.5 !py-0.5 text-xs font-black"
            onClick={() => { UI.modal = 'menu'; notify(); }}
          >
            <Ic n="gear" s={1.3} />
            <span>{UT.u134}</span>
          </button>
        </div>
      </div>

      {tab === 'home' && (
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2.5 sm:grid-cols-2">
          <div className="paper min-w-0 flex flex-col gap-2 p-3">
            <div className="ft text-lg text-[#5a3518]">{WX.farmerNameLbl}: {S.custom?.farmerName || WX.defaultFarmerName}</div>
            <div className="flex flex-wrap gap-1">
              {WX.farmerPresets.map((nm) => (
                <button
                  key={nm}
                  type="button"
                  className={'btn press !px-2.5 !py-0.5 text-xs font-black ' + (S.custom?.farmerName === nm ? 'g' : '')}
                  onClick={() => setHomesteadNames(nm, S.custom?.farmName ?? WX.defaultFarmName)}
                >
                  {nm}
                </button>
              ))}
            </div>
            <div className="ft mt-1 text-lg text-[#5a3518]">{WX.farmNameLbl}: {S.custom?.farmName || WX.defaultFarmName}</div>
            <div className="flex flex-wrap gap-1">
              {WX.farmPresets.map((fn) => (
                <button
                  key={fn}
                  type="button"
                  className={'btn press !px-2.5 !py-0.5 text-xs font-black ' + (S.custom?.farmName === fn ? 'y' : '')}
                  onClick={() => setHomesteadNames(S.custom?.farmerName ?? WX.defaultFarmerName, fn)}
                >
                  {fn}
                </button>
              ))}
            </div>
          </div>

          <div className="paper min-w-0 flex flex-col justify-between gap-2 p-3">
            <div>
              <div className="ft text-lg text-[#5a3518]">{WX.outfitTitle}</div>
              <div className="mt-1.5 flex w-full min-w-0 max-w-full flex-wrap gap-1.5 pb-1" aria-label={WX.outfitTitle}>
                {OUTFIT_THEMES.map((o) => {
                  const unlocked = isOutfitUnlocked(o.id);
                  const reward = ACH_OUTFIT_REWARDS.find((r) => r.outfit === o.id);
                  const achievement = reward ? ACHS.find((a) => a.id === reward.ach) : null;
                  const requirement = achievement && reward ? `${achievement.fa}: ${fa(achievement.tiers[reward.tier]?.n ?? 0)}` : o.name;
                  return (
                    <button
                      key={o.id}
                      type="button"
                      className={'btn press shrink-0 !px-2.5 !py-0.5 text-xs font-black ' + ((S.custom?.outfit ?? 0) === o.id ? 'g' : '')}
                      disabled={!unlocked}
                      title={unlocked ? o.name : requirement}
                      data-outfit={o.id}
                      onClick={() => setPlayerOutfit(o.id)}
                    >
                      <span className="inline-block h-3 w-3 rounded-full border border-[#503426]" style={{ background: o.swatch }} />
                      <span>{o.name}</span>
                      {!unlocked && <Ic n="lock" s={1.1} />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-1.5 border-t border-[#d8c498] pt-2">
              <button
                type="button"
                className={'btn press w-full !py-1.5 text-xs font-black ' + ((S.custom?.morningCard ?? true) ? 'g' : '')}
                onClick={() => toggleMorningCard()}
              >
                <Ic n="sun" s={1.4} />
                <span>{WX.morningToggleOff}</span>
              </button>
              <button
                type="button"
                title={WX.storyCompactHint}
                className={'btn press w-full !py-1.5 text-xs font-black ' + ((S.custom?.compactStory ?? false) ? 'g' : '')}
                onClick={() => toggleCompactStory()}
              >
                <Ic n="scroll" s={1.4} />
                <span>{WX.storyCompact}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === 'decor' && (
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {DECOR_ITEMS.map((item) => {
            const owned = hasDecor(item.id);
            return (
              <div key={item.id} className={'paper flex flex-col justify-between gap-1.5 p-2.5 ' + (owned ? 'ring-2 ring-[#6cc84c]' : '')}>
                <div className="flex items-center gap-2">
                  <Ic n={item.icon} s={2.8} />
                  <div className="text-xs font-extrabold leading-snug">{item.label}</div>
                </div>
                {owned ? (
                  <div className="flex items-center justify-center gap-1 rounded-lg bg-emerald-100 py-1 text-xs font-black text-emerald-900">
                    <Ic n="check" s={1.3} />
                    <span>{WX.decorOwned}</span>
                  </div>
                ) : item.reqLv > L ? (
                  <Lock req={item.reqLv} />
                ) : (
                  <BuyBtn n={UT.u92} price={item.price} onClick={() => buyCourtyardDecor(item.id)} />
                )}
              </div>
            );
          })}
        </div>
      )}

      {tab === 'skills' && (
        <div>
          <div className="paper mb-2 flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 text-sm font-black">
            <span>{WX.skillPtsAvail} <span className="text-emerald-800">{fa(sp)}</span></span>
            <span className="text-xs font-bold opacity-75">{WX.skillNextAtLv}</span>
          </div>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {([
              ['crop', WX.branchCrop],
              ['ranch', WX.branchRanch],
              ['trade', WX.branchTrade],
              ['nature', WX.branchNature],
            ] as Array<[SkillBranch, string]>).map(([br, title]) => (
              <div key={br} className="paper flex flex-col gap-1.5 p-2.5">
                <div className="ft text-base text-[#5a3518]">{title}</div>
                {SKILL_DEFS.filter((s) => s.branch === br).map((sk) => {
                  const unlocked = hasSkill(sk.id);
                  const prevOk = !sk.reqSkill || hasSkill(sk.reqSkill);
                  return (
                    <div key={sk.id} className="flex items-center justify-between gap-2 rounded-xl border border-[#d8c498] bg-white/75 p-2 text-xs">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Ic n={sk.icon} s={1.8} />
                        <div className="min-w-0 font-extrabold leading-snug">{sk.label}</div>
                      </div>
                      {unlocked ? (
                        <span className="shrink-0 font-black text-emerald-800">{WX.skillLearned}</span>
                      ) : (
                        <button
                          type="button"
                          className="btn g press shrink-0 !px-2.5 !py-0.5 text-xs font-black"
                          disabled={!prevOk || sp <= 0}
                          onClick={() => unlockSkill(sk.id)}
                        >
                          {WX.skillLearnBtn}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'social' && (
        <div className="grid gap-2.5 sm:grid-cols-2">
          {VILLAGER_PROFILES.map((v) => {
            const hearts = villagerHearts(v.who);
            const canGift = canGiftVillagerToday(v.who);
            const bestGift = findBestGiftInBag(v.who);
            const role = NPC_ROLES[loc][v.who];
            return (
              <div key={v.who} className="paper flex flex-col gap-1.5 p-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-black">{role.name}</div>
                    <div className="text-[.68rem] font-bold opacity-75">{role.job}</div>
                  </div>
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((h) => (
                      <Ic key={h} n="heart" s={1.25} cls={h <= hearts ? '' : 'grayscale opacity-35'} />
                    ))}
                  </div>
                </div>
                <div className={'text-[.7rem] font-extrabold ' + (hearts >= 2 ? 'text-emerald-800' : 'opacity-65')}>
                  {fa(2)} <Ic n="heart" s={0.95} cls="inline" /> {v.perk2}
                </div>
                <div className={'text-[.7rem] font-extrabold ' + (hearts >= 5 ? 'text-amber-800' : 'opacity-65')}>
                  {fa(5)} <Ic n="heart" s={0.95} cls="inline" /> {v.perk5}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-1 border-t border-[#d8c498] pt-1.5">
                  <span className="text-[.68rem] font-bold opacity-80">
                    {WX.favLikesPrefix}{v.favorites.slice(0, 4).map((g) => GOOD[g]?.fa ?? g).join(' · ')}
                  </span>
                  {!canGift ? (
                    <span className="font-black text-emerald-800">{WX.giftedToday}</span>
                  ) : bestGift ? (
                    <button
                      type="button"
                      className="btn g press !px-2.5 !py-0.5 text-xs font-black"
                      onClick={() => giftVillager(v.who, bestGift)}
                    >
                      <Ic n={bestGift} s={1.25} />
                      <span>{WX.giftBtn}</span>
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'calendar' && (
        <div className="paper p-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div className="ft text-lg text-[#5a3518]">{SEASONS[curSeason]} — {WX.calendarTitle}</div>
            <div className="text-xs font-extrabold">{WX.calToday}: {SEASONS[curSeason]} — <span dir="ltr">{fa(dayInSeason)}/{fa(7)}</span></div>
          </div>
          <div className="grid grid-cols-7 gap-1.5 text-center text-xs">
            {Array.from({ length: 28 }, (_, idx) => {
              const dNum = idx + 1;
              const cellSeason = Math.floor(idx / 7);
              const cellDayInSeason = (idx % 7) + 1;
              const isToday = dNum === dayInYear;
              const isFest = dNum === 1 || dNum === 28;
              const isDue = dNum === dueYearDay;
              return (
                <div
                  key={dNum}
                  className={
                    'rounded-xl border border-[#d4be8d] p-1.5 font-black '
                    + (isToday ? 'bg-[#ffd93b] ring-2 ring-[#503426]' : isFest ? 'bg-pink-100' : isDue ? 'bg-amber-100' : 'bg-white/75')
                  }
                >
                  <div className="text-[.58rem] font-bold opacity-65">{SEASONS[cellSeason]}</div>
                  <div>{fa(cellDayInSeason)}</div>
                  {isToday && <div className="text-[.62rem] text-[#503426]">{WX.calToday}</div>}
                  {!isToday && isFest && <Ic n="star" s={1.0} cls="mx-auto" />}
                  {!isToday && isDue && <div className="text-[.6rem] text-red-800">{WX.calDue}</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Modal>
  );
}
