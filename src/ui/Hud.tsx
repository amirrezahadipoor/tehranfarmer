import { CROPS, CROP, LEVEL_CAP, SEASONS, WORKER_WAGE, fa, faClock } from '../game/data';
import { estateSpecialtyMult, isEstateOwned, isFarmScene } from '../game/estates';
import { hasSkill } from '../game/core/rpgSystems';
import { tutToolBlocked, tutToolHi } from '../game/tutorial';
import { cmd } from '../game/engine';
import { CFG } from '../game/settings';
import { S, UI, activeFarm, canCap, dismissMorningReport, effectivePlotDailyRate, farmLevel, ghCoversFarm, isNight, notify, ownedFarms, packCap, packCount, plotInfo, plotsForFarm, readyQuestCount, season, skillPointsAvailable, sleepToMorning, stamCap, unreadMailCount, xpProgress, type Tool } from '../game/state';
import { MAIL_UI } from '../strings/mailText';
import { questOf } from '../story/quests';
import { Bar, Ic } from './parts';
import { dueWarningText, standingBadgeText } from '../story/engine';
import { activeNote, daysToDue, debt, minPay, standingBand } from '../game/core/debt';
import { buildJobLabel } from '../game/core/build';
import { economicHint } from '../game/core/advisor';
import { fa as faNum, faPct } from '../strings/fa';
import { sfx } from '../game/sound';
import { ESTATE_UI } from '../strings/estateStoryText';
import { UT } from '../strings/uiText';
import { WX } from '../strings/worldExpansionText';
import { FT } from '../strings/frontierText';

const WEATHER = ['sun', 'cloud', 'rain', 'snow'];

function WorldNavBar() {
  const cur = UI.scene;
  const loc = CFG.locale === 'en' ? 'en' : 'fa';
  const eu = ESTATE_UI[loc];
  const places = [
    { id: 'farm', ic: 'house', label: UT.backFarm, cls: 'g' },
    { id: 'north', ic: 'north', label: eu.goNorth, cls: 'g' },
    { id: 'valley', ic: 'valley', label: eu.goValley, cls: 'y' },
    { id: 'town', ic: 'cart', label: UT.goTown, cls: 'y' },
    { id: 'river', ic: 'fish', label: UT.goRiver, cls: 'b' },
    { id: 'cave', ic: 'cave', label: FT.navCave, cls: 'b' },
    { id: 'apiary', ic: 'honey', label: UT.goApiary, cls: 'p' },
    { id: 'forest', ic: 'forest', label: FT.navForest, cls: 'g' },
  ] as const;
  return (
    <div className="paper pointer-events-auto max-[700px]:grid max-[700px]:grid-cols-4 flex flex-wrap items-center justify-center gap-0.5 p-0.5 xl:gap-1 xl:p-1">
      {places.map((pl) => {
        const active = cur === pl.id;
        return (
          <button
            key={pl.id}
            data-nav={pl.id}
            aria-label={pl.label}
            title={pl.label}
            disabled={active}
            onClick={() => { sfx.tap(); cmd.travelTo(pl.id); }}
            className={`btn ${pl.cls} press !min-h-[max(48px,2.45rem)] !min-w-[max(48px,2.35rem)] !p-0.5 xl:!p-1 ${active ? 'ring-2 ring-[#503426] !opacity-100 !filter-none' : ''}`}
          >
            <Ic n={pl.ic} s={UI.portrait ? 1.32 : 1.5} />
          </button>
        );
      })}
    </div>
  );
}

export function Hud() {
  const sn = season();
  const farmId = isFarmScene(UI.scene) ? UI.scene : null;
  const farm = !!farmId;
  const ownedFarm = farmId ? isEstateOwned(farmId, S.lv.land) : false;
  const eu = ESTATE_UI[CFG.locale === 'en' ? 'en' : 'fa'];
  // منبع واحد شب: همان isNight موتور بازی (NIGHT_START_H=19.5 / NIGHT_END_H=5.5) تا آیکون HUD هرگز از منطق بازی جلو نزند
  const nightNow = isNight();
  return (
    <>
      {/* نوار یکپارچهٔ بالای صفحه: چیدمان انعطاف‌پذیر، کم‌ارتفاع (آزاد بودن کامل سقف خانه و مزرعه) و صفر برخورد در هر عرض صفحه */}
      <div
        className="pointer-events-none fixed z-20 flex items-start justify-between gap-1.5"
        style={{
          left: 'calc(var(--safe-left) + .5rem)',
          right: 'calc(var(--safe-right) + .5rem)',
          top: 'calc(var(--safe-top) + .45rem)',
        }}
      >
        {/* خوشهٔ وضعیت بازیکن (چپ در RTL / راست در LTR در جریان طبیعی): فقط دو ردیف فشرده به جای ستون بلند ۴ کارتی */}
        <div className="flex flex-col items-start gap-1">
          <div className="flex flex-wrap items-center gap-1">
            <div className="paper pointer-events-auto flex items-center gap-2 px-2.5 py-0.5">
              <div className="flex items-center gap-1">
                <Ic n="coin" s={1.75} />
                <span className="ft text-xl leading-none">{fa(S.coins)}</span>
              </div>
              <div className="flex items-center gap-1">
                <Ic n="bolt" s={1.55} />
                <div className="bar !h-2.5 w-14 sm:w-20">
                  <i style={{ width: `${(S.stamina / stamCap()) * 100}%`, background: S.stamina < 20 ? '#ff7a6a' : '#ffd93b' }} />
                </div>
              </div>
            </div>
            <LevelChip />
          </div>
          <div className="flex flex-wrap items-center gap-1">
            <DebtChip />
            {S.builds.slice(0, 2).map((b) => (
              <div key={b.id} className="paper flex w-44 items-center gap-1.5 px-2 py-0.5">
                <Ic n={b.icon} s={1.6} cls="bob" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[.72rem] font-black">{buildJobLabel(b)}</div>
                  <div className="bar mt-0.5 !h-2"><i style={{ width: `${(b.prog / b.dur) * 100}%`, background: '#6cc84c' }} /></div>
                </div>
                <span className="ft text-xs text-green-800">{faPct(Math.round((b.prog / b.dur) * 100))}</span>
              </div>
            ))}
          </div>
        </div>

        {/* خوشهٔ ساعت، فصل و دکمه‌های کنترلی در یک گروه انعطاف‌پذیر بدون امکان هم‌پوشانی در هیچ ابعادی */}
        <div className="flex flex-wrap-reverse items-start justify-end gap-1.5">
          <div className="flex flex-col items-end">
            <div className="paper flex items-center gap-2 px-2 py-0.5">
              <Ic n={UI.scene === 'cave' ? 'cave' : nightNow && sn === 1 ? 'star' : ['spring', 'summer', 'autumn', 'winter'][sn]} s={1.85} />
              <div className="leading-tight">
                <div className="text-[.72rem] font-extrabold whitespace-nowrap">{SEASONS[sn]}{UT.u32}{fa(((S.day - 1) % 7) + 1)}</div>
                <div className="ft text-base leading-none">{faClock(S.hour)}</div>
              </div>
              <Ic n={UI.scene === 'cave' ? 'cave' : nightNow ? 'moon' : WEATHER[S.weather]} s={1.85} />
              {UI.scene !== 'cave' && nightNow && S.weather > 0 ? <Ic n={WEATHER[S.weather]} s={1.5} /> : null}
            </div>
            {S.event && (
              <div data-event-id={S.event.id} className="paper mt-1 flex items-center justify-center gap-1.5 px-2 py-0.5 text-xs font-extrabold">
                <Ic n={S.event.icon} s={1.45} />
                <span>{S.event.title}</span>
              </div>
            )}
          </div>
          <div className="pointer-events-auto flex flex-wrap items-start justify-end gap-1">
            <button aria-label={isNight() ? UT.u33 : UT.restAnytime} className="btn b press !min-h-[max(48px,2.45rem)] !min-w-[max(48px,2.45rem)] !p-1" title={isNight() ? UT.u33 : UT.restAnytime} onClick={() => { sleepToMorning(); sfx.tap(); }}>
              <Ic n="moon" s={UI.portrait ? 1.7 : 1.9} />
            </button>
            <button aria-label={UT.u133} className="btn y press !min-h-[max(48px,2.45rem)] !min-w-[max(48px,2.45rem)] !px-1.5 !py-0.5" onClick={() => { UI.modal = 'inv'; notify(); }}>
              <Ic n="bag" s={UI.portrait ? 1.65 : 1.9} />
              <span className="text-xs font-black" dir="ltr">{fa(packCount())}/{fa(packCap())}</span>
            </button>
            {UI.scene === 'river' && (
              <button
                aria-label={FT.fishModalTitle}
                data-open-fishing="1"
                className="btn b press !min-h-[max(48px,2.45rem)] !min-w-[max(48px,2.45rem)] !p-1"
                onClick={() => { sfx.tap(); UI.modal = 'fishing'; notify(); }}
                title={FT.fishModalTitle}
              >
                <Ic n="rod" s={UI.portrait ? 1.7 : 1.9} />
              </button>
            )}
            {UI.scene === 'town' && (
              <button
                aria-label={FT.fairTitle}
                data-open-festival="1"
                className="btn p press !min-h-[max(48px,2.45rem)] !min-w-[max(48px,2.45rem)] !p-1"
                onClick={() => { sfx.tap(); UI.modal = 'festival'; notify(); }}
                title={FT.fairTitle}
              >
                <Ic n="crown" s={UI.portrait ? 1.7 : 1.9} />
              </button>
            )}
            <button
              aria-label={FT.atlasTitle}
              data-open-atlas="1"
              className="btn g press !min-h-[max(48px,2.45rem)] !min-w-[max(48px,2.45rem)] !p-1"
              onClick={() => { sfx.tap(); UI.modal = 'atlas'; notify(); }}
              title={FT.atlasTitle}
            >
              <Ic n="star" s={UI.portrait ? 1.7 : 1.9} />
            </button>
            <button
              aria-label={MAIL_UI.title}
              data-open-mail="1"
              className="btn y press relative !min-h-[max(48px,2.45rem)] !min-w-[max(48px,2.45rem)] !p-1"
              onClick={() => { sfx.paper(); UI.modal = 'mail'; notify(); }}
              title={MAIL_UI.title}
            >
              <Ic n={unreadMailCount() > 0 ? 'mail' : 'mailopen'} s={UI.portrait ? 1.7 : 1.9} />
              {unreadMailCount() > 0 && (
                <span data-mail-badge="1" className="absolute -left-1.5 -top-1.5 rounded-full border-2 border-[#503426] bg-[#e63935] px-1 text-[.68rem] font-black leading-none text-white">
                  {fa(unreadMailCount())}
                </span>
              )}
            </button>
            <button aria-label={UT.u34} className="btn p press relative !min-h-[max(48px,2.45rem)] !min-w-[max(48px,2.45rem)] !p-1" onClick={() => { UI.modal = 'quests'; notify(); }} title={UT.u34}>
              <Ic n="star" s={UI.portrait ? 1.7 : 1.9} />
              {readyQuestCount() > 0 && (
                <span className="absolute -left-1.5 -top-1.5 rounded-full border-2 border-[#503426] bg-[#ffd93b] px-1 text-[.68rem] font-black leading-none text-[#503426]">
                  {fa(readyQuestCount())}
                </span>
              )}
            </button>
            <button data-open-settings="1" aria-label={UT.u134} className="btn g press !min-h-[max(48px,2.45rem)] !min-w-[max(48px,2.45rem)] !p-1" onClick={() => { UI.modal = 'menu'; notify(); }}><Ic n="gear" s={UI.portrait ? 1.7 : 1.9} /></button>
          </div>
        </div>
      </div>

      {/* پایین: نوار ابزار + ماشین‌ها + ناوبری سریع هر ۶ ناحیه (در مزارع خریداری‌نشده، دکمهٔ مستقیم خرید سند نمایش داده می‌شود) */}
      {UI.portrait ? (
        <div
          className="pointer-events-none fixed z-20 flex flex-col items-center gap-1.5"
          style={{
            bottom: 'calc(var(--safe-bottom) + .3rem)',
            left: 'calc(var(--safe-left) + .5rem)',
            right: 'calc(var(--safe-right) + .5rem)',
          }}
        >
          <div className="flex w-full items-center justify-between gap-2">
            <div className="pointer-events-auto">
              {ownedFarm && (
                <button aria-label={UT.u35} className="btn b press !min-h-[max(48px,2.5rem)] !min-w-[max(48px,2.5rem)] !p-1" onClick={() => { UI.modal = 'auto'; notify(); }} title={UT.u35}><Ic n="tractor" s={2.3} /></button>
              )}
            </div>
            <WorldNavBar />
          </div>
          {ownedFarm ? <Toolbar /> : farm ? (
            <div className="paper pointer-events-auto flex items-center gap-2 px-3 py-1">
              <Ic n="land" s={1.7} />
              <span className="text-xs font-extrabold">{UI.scene === 'north' ? eu.deedBoardNorth : eu.deedBoardValley}</span>
              <button className="btn y press !min-h-[max(48px,2rem)] !min-w-[max(48px,3rem)] !px-2.5 !py-0.5 text-xs font-black" onClick={() => { sfx.tap(); UI.modal = 'estate'; notify(); }}>
                {eu.buyDeedBtn}
              </button>
            </div>
          ) : null}
        </div>
      ) : (
        <div
          className="pointer-events-none fixed z-20 flex items-end justify-between"
          style={{
            bottom: 'calc(var(--safe-bottom) + .25rem)',
            left: 'calc(var(--safe-left) + .5rem)',
            right: 'calc(var(--safe-right) + .5rem)',
          }}
        >
          <div className="pointer-events-auto">
            {ownedFarm ? (
              <button aria-label={UT.u35} className="btn b press !min-h-[max(48px,2.6rem)] !min-w-[max(48px,2.6rem)] !p-1.5" onClick={() => { UI.modal = 'auto'; notify(); }} title={UT.u35}><Ic n="tractor" s={2.7} /></button>
            ) : <div />}
          </div>
          {ownedFarm ? <Toolbar /> : farm ? (
            <div className="paper pointer-events-auto mb-0.5 flex items-center gap-2.5 px-3.5 py-1.5">
              <Ic n="land" s={1.85} />
              <span className="text-xs font-extrabold">{UI.scene === 'north' ? eu.deedBoardNorth : eu.deedBoardValley}</span>
              <button className="btn y press !min-h-[max(48px,2.1rem)] !min-w-[max(48px,3rem)] !px-3 !py-0.5 text-xs font-black" onClick={() => { sfx.tap(); UI.modal = 'estate'; notify(); }}>
                {eu.buyDeedBtn}
              </button>
            </div>
          ) : <div />}
          <WorldNavBar />
        </div>
      )}

      {UI.combo.count >= 2 && UI.combo.until > Date.now() && (
        <div
          data-combo-badge="1"
          className="paper popin pointer-events-none fixed left-1/2 z-30 flex -translate-x-1/2 items-center gap-1.5 !bg-[#ffe680] px-3 py-0.5 text-xs font-black text-[#4a2b13] shadow"
          style={{ bottom: UI.portrait ? 'calc(var(--safe-bottom) + 8.3rem)' : 'calc(var(--safe-bottom) + 5.75rem)' }}
        >
          <Ic n={UI.combo.kind === 'fish' ? 'fish' : 'star'} s={1.45} cls="bob" />
          <span className="ft text-base leading-none">
            {(UI.combo.kind === 'fish' ? WX.fishStreakPrefix : WX.comboPrefix) + fa(UI.combo.count)}
          </span>
        </div>
      )}
      {UI.scene === 'river' && !S.rod && UI.needRodHint > Date.now() && (
        <button
          type="button"
          data-buy-rod-cta="1"
          className="btn y press pointer-events-auto fixed left-1/2 z-30 -translate-x-1/2 !px-3.5 !py-1 text-xs font-black shadow-lg"
          style={{ bottom: 'calc(var(--safe-bottom) + 4.2rem)' }}
          onClick={() => { UI.needRodHint = 0; UI.afterModal = 'carp'; cmd.travelTo('town'); sfx.tap(); notify(); }}
        >
          <Ic n="hammer" s={1.5} />
          <span>{WX.buyRodBtn}</span>
        </button>
      )}
      {farm && UI.seedTray && UI.tool === 'plant' && <SeedTray />}
      {farm && UI.info && <Info />}
      {S.morning && !S.morning.shown && S.hour >= 5.5 && S.hour < 19 && (S.custom?.morningCard ?? true) && !UI.modal && (() => {
        const almostRipe = ownedFarms().reduce((acc, f) => acc + plotsForFarm(f).filter((p) => p.st === 2 && !p.dead && !p.ripe && p.prog >= 0.7).length, 0);
        const spReady = skillPointsAvailable() > 0;
        const chQ = questOf(S.story.chapter);
        const topHot = Object.entries(S.dem ?? {})
          .filter(([k]) => k !== 'feed' && k !== 'fingerling')
          .sort((a, b) => b[1] - a[1])[0];
        // هشدارهای صبحگاهی همان روز: تشنگی، حقوق، قسط، باج‌گیری
        const thirsty = (() => {
          let n = 0, minH = 99;
          for (const f of ownedFarms()) for (const p of plotsForFarm(f)) {
            if (p.crop && !p.dead && p.water <= 0) { n++; minH = Math.min(minH, Math.max(0, Math.ceil(36 - p.dry))); }
          }
          return n > 0 ? { n, h: minH } : null;
        })();
        const wageNight = S.workers > 0 && S.coins < Math.round(WORKER_WAGE * S.workers * (hasSkill('trade-3') ? 0.7 : 1));
        const dueIn = daysToDue();
        const d0 = debt();
        const dueShort = d0 ? Math.max(0, Math.ceil(minPay() - (d0.paidThisCycle ?? 0))) : 0;
        const raidTip = d0?.lastVisit?.kind === 'raid' && d0.lastVisit.day === S.day;
        return (
          <div
            data-morning-report="1"
            className="paper popin pointer-events-none fixed left-1/2 z-30 flex w-[min(92vw,26rem)] -translate-x-1/2 items-center justify-between gap-2 px-3 py-1.5 text-xs font-extrabold shadow-lg"
            style={{ top: 'calc(var(--safe-top) + 4.45rem)' }}
          >
            <div className="min-w-0 flex-1">
              <div className="ft text-sm text-[#5a3518]">{WX.morningTitle}{fa(S.morning.day)}</div>
              <div className="flex flex-wrap gap-x-2.5 gap-y-0.5 text-[.7rem] font-black">
                <span>{WX.morningEarned}: +{fa(S.morning.earned)}</span>
                <span>{WX.morningHarv}: +{fa(S.morning.gathered)}</span>
                <span className="text-emerald-800">{WX.morningRipe}: {fa(S.morning.ripe)}</span>
                {almostRipe > 0 && <span className="text-amber-800">{WX.morningAlmostRipe}: {fa(almostRipe)}</span>}
              </div>
              <div className="mt-0.5 truncate text-[.68rem] font-black text-[#6c3d16]">
                {spReady
                  ? WX.morningSkillReady
                  : chQ
                    ? `${WX.morningNextHook}${chQ.title}`
                    : topHot
                      ? `${WX.hotMarketLabel} ×${faPct(Math.round(topHot[1] * 100))}`
                      : ''}
              </div>
              {(thirsty || wageNight || (S.debt && dueIn <= 10) || raidTip) && (
                <div className="mt-0.5 flex flex-col gap-y-0.5 text-[.68rem] font-black">
                  {thirsty && (
                    <span className="text-[#c2410c]">!{fa(thirsty.n)}{WX.morningThirsty}{fa(thirsty.h)}{WX.morningThirstyEta}</span>
                  )}
                  {raidTip && <span className="text-[#b45309]">{WX.morningRaidTip}</span>}
                  {wageNight && <span className="text-[#b45309]">!{WX.morningWage}</span>}
                  {S.debt && dueIn <= 10 && (
                    <span className="text-[#b91c1c]">!{dueIn === 0 ? WX.morningDue0 : `${WX.morningDue}${fa(dueIn)}${WX.plotDaysUnit}`}{dueShort > 0 ? ` · ${WX.morningNeed}${fa(dueShort)}` : ''}</span>
                  )}
                </div>
              )}
            </div>
            <button
              type="button"
              className="btn g press pointer-events-auto shrink-0 !min-h-[max(48px,1.9rem)] !min-w-[max(48px,3rem)] !px-2.5 !py-0.5 text-xs font-black"
              onClick={() => dismissMorningReport()}
            >
              {WX.morningOk}
            </button>
          </div>
        );
      })()}
      <Toasts />
    </>
  );
}

function DebtChip() {
  if (S.story.postgame) {
    return (
      <button
        className="paper pointer-events-auto press flex min-h-[48px] w-48 items-center gap-1.5 px-2.5 py-1"
        onClick={() => { UI.modal = 'museum'; sfx.tap(); notify(); }}
        title={UT.museumTitle}
      >
        <Ic n="trophy" s={1.8} />
        <span className="flex flex-1 flex-col leading-tight">
          <span className="text-[.72rem] font-black opacity-70">{UT.museumShort}</span>
          <span className="ft text-sm text-green-800">{UT.freeHomestead}</span>
        </span>
      </button>
    );
  }
  const d = debt();
  if (!d) return null;
  const days = daysToDue();
  const warn = dueWarningText(days);
  const note = activeNote();
  const stBand = standingBand();
  const stVal = Math.max(0, Math.min(100, Math.round(d.standing ?? 60)));
  const stColor = stBand === 'bad' ? '#c8433a' : stBand === 'good' ? '#2e8b3a' : '#d9a03c';
  return (
    <>
      <button
        className="paper pointer-events-auto press flex min-h-[48px] w-48 items-center gap-1 px-2 py-0.5"
        onClick={() => { UI.modal = 'ledger'; sfx.tap(); notify(); }}
        title={note?.name ?? UT.u36}
      >
        <Ic n="ledger" s={1.8} />
        <span className="flex flex-1 flex-col leading-none">
          <span className="text-[.72rem] font-black opacity-70">{UT.u37} {faNum(d.noteIdx + 1)}</span>
          <span className="ft text-base">{faNum(Math.max(0, Math.round(d.remaining)))}</span>
          {/* نوارِ اعتبار (پیشنهاد گزارش ۳۰۰X): مرزها و اثرش بر سود با تولتیپ */}
          <span className="mt-1 block h-1.5 w-full overflow-hidden rounded-full bg-black/15" title={standingBadgeText()}>
            <span className="block h-full rounded-full transition-[width]" style={{ width: `${stVal}%`, background: stColor }} />
          </span>
        </span>
        <span className="flex flex-col items-end leading-none">
          <span className="text-[.72rem] font-black opacity-70">{UT.u38}</span>
          <span className="ft text-base whitespace-nowrap">{faNum(days)}{UT.u39}</span>
        </span>
      </button>
      {warn && (
        <button
          type="button"
          data-debt-warning="1"
          className="paper-dark pointer-events-auto press flex min-h-[48px] items-center gap-1 px-2 py-0.5 text-[#fff4d8]"
          title={economicHint()?.text ?? warn}
          onClick={() => { UI.modal = 'ledger'; sfx.tap(); notify(); }}
        >
          <Ic n="scarecrow" s={1.45} cls="bob" />
          <span className="text-xs font-black whitespace-nowrap">{warn}</span>
        </button>
      )}
    </>
  );
}

function LevelChip() {
  const p = xpProgress();
  const L = farmLevel();
  return (
    <button className="paper pointer-events-auto press flex min-h-[48px] min-w-[48px] items-center gap-1 px-2 py-0.5" onClick={() => { UI.modal = 'achieve'; notify(); }} title={UT.u40}>
      <Ic n="medal" s={1.65} />
      <span className="ft text-base leading-none">{fa(L)}</span>
      <div className="bar !h-2.5 w-10 sm:w-14"><i style={{ width: `${Math.min(100, (p.cur / p.need) * 100)}%`, background: '#b48aff' }} /></div>
      {L < LEVEL_CAP && <span className="hidden sm:inline text-[.68rem] font-black opacity-70" dir="ltr">{fa(Math.round(p.cur))}/{fa(p.need)}</span>}
    </button>
  );
}

function Toolbar() {
  const tools: { k: Tool; ic: string; fa: string }[] = [
    { k: 'hand', ic: 'hand', fa: UT.u26 },
    { k: 'till', ic: 'hoe', fa: UT.u27 },
    { k: 'plant', ic: 'seedbag', fa: UT.u28 },
    { k: 'water', ic: 'can', fa: UT.u29 },
    { k: 'harvest', ic: 'sickle', fa: UT.u30 },
    { k: 'fert', ic: 'fert', fa: UT.u31 },
  ];
  return (
    <div className="paper pointer-events-auto flex items-end gap-1 px-1.5 pb-1 pt-1">
      {tools.map((t) => {
        const on = UI.tool === t.k;
        return (
          <button
            key={t.k}
            data-tool={t.k}
            onClick={() => {
              if (tutToolBlocked(t.k)) { sfx.err(); return; } // حین آموزش فقط ابزار همان گام انتخاب می‌شود
              sfx.tap();
              if (t.k === 'plant') UI.seedTray = UI.tool === 'plant' ? !UI.seedTray : true;
              else UI.seedTray = false;
              UI.tool = t.k; UI.info = null; notify();
            }}
            className={'press relative flex min-h-[48px] min-w-[48px] flex-col items-center justify-center rounded-xl border-[.18rem] px-1 pb-0.5 '
              + (UI.portrait ? 'w-[3.2rem] ' : 'w-[3.45rem] md:w-[4.15rem] ')
              + (tutToolHi(t.k) ? 'animate-pulse !border-amber-500 ring-[.22rem] ring-amber-400 ' : '')
              + (on ? 'border-[#503426] bg-[#ffd93b] -translate-y-1.5 shadow-[0_.22rem_0_rgba(80,52,38,.7)]' : 'border-transparent')}
          >
            <Ic n={t.ic} s={UI.portrait ? (on ? 2.5 : 2.2) : (on ? 3 : 2.6)} />
            <span className="text-[.78rem] font-extrabold leading-none">{t.fa}</span>
            {t.k === 'plant' && (
              <span className="absolute -right-1 -top-1 flex items-center rounded-lg border-2 border-[#503426] bg-white px-0.5">
                <Ic n={'seed:' + UI.seed} s={1.2} />
                <span className="text-[.75rem] font-black">{fa(S.seeds[UI.seed] ?? 0)}</span>
              </span>
            )}
            {t.k === 'water' && <div className="bar mt-0.5 w-full !h-2"><i style={{ width: `${(S.can / canCap()) * 100}%`, background: '#4aa3df' }} /></div>}
            {t.k === 'fert' && <span className="absolute -right-1 -top-1 rounded-lg border-2 border-[#503426] bg-white px-1 text-[.75rem] font-black">{fa(S.fert)}</span>}
          </button>
        );
      })}
    </div>
  );
}

function SeedTray() {
  const owned = CROPS.filter((c) => (S.seeds[c.id] ?? 0) > 0);
  return (
    <div
      className="paper popin pointer-events-auto fixed left-1/2 z-30 -translate-x-1/2 p-2"
      style={{ bottom: UI.portrait ? 'calc(var(--safe-bottom) + 8.6rem)' : 'calc(var(--safe-bottom) + 6.4rem)' }}
    >
      {owned.length === 0 ? (
        <div className="flex items-center gap-3 px-3 py-1">
          <Ic n="seed:wheat" s={3} cls="bob" /><Ic n="arrow" s={1.2} cls="opacity-50" /><Ic n="cart" s={3} />
        </div>
      ) : (
        <div className="scroll-x flex max-w-[92vw] gap-1">
          {owned.map((c) => {
            const ok = c.seasons.includes(season()) || S.gh > 0;
            return (
              <button key={c.id} onClick={() => { UI.seed = c.id; UI.seedTray = false; sfx.tap(); notify(); }}
                className={'press relative flex min-h-[48px] min-w-[48px] flex-col items-center justify-center rounded-xl border-[.18rem] px-1.5 py-0.5 ' + (UI.seed === c.id ? 'border-[#503426] bg-[#ffd93b]' : 'border-[#d6c08a] bg-white/60')}>
                <Ic n={'seed:' + c.id} s={2.8} cls={ok ? '' : 'opacity-40 grayscale'} />
                <span className="text-[.68rem] font-extrabold leading-none">{c.fa}</span>
                <span className="text-xs font-black">{fa(S.seeds[c.id])}</span>
                <div className="flex">{[0, 1, 2, 3].map((s) => <Ic key={s} n={['spring', 'summer', 'autumn', 'winter'][s]} s={0.9} cls={c.seasons.includes(s) ? '' : 'opacity-20'} />)}</div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Info() {
  const inf = UI.info!;
  const { p, def } = plotInfo(inf.plot);
  const inGh = ghCoversFarm(activeFarm(), inf.plot);
  const canUp = !def;
  const quickAction = !def
    ? (p.st === 0 ? { k: 'till', label: UT.actTillNow, ic: 'hoe' } : { k: 'plant', label: `${UT.actPlantNow}: ${CROP[UI.seed]?.fa ?? ''}`, ic: 'seed:' + UI.seed })
    : p.dead
      ? { k: 'till', label: UT.actClearDead, ic: 'hoe' }
      : p.ripe
        ? { k: 'harvest', label: UT.actHarvestNow, ic: def.id }
        : p.water < 0.85
          ? { k: 'water', label: UT.actWaterNow, ic: 'can' }
          : null;

  return (
    <div
      data-plot-info="1"
      className="paper popin pointer-events-auto fixed z-30 min-w-48 max-w-64 p-2.5 text-sm"
      style={{ left: Math.max(8, Math.min(window.innerWidth - 220, inf.x - 96)), top: Math.max(8, inf.y - 128) }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Ic n={def ? def.id : p.st === 0 ? 'hoe' : 'seedbag'} s={2.4} />
          <div className="font-extrabold leading-tight">{def ? def.fa : p.st === 0 ? UT.u41 : UT.plotTilled}</div>
        </div>
        <button aria-label={UT.closeBtn} className="btn r press !min-h-[max(48px,2.05rem)] !min-w-[max(48px,2.05rem)] !p-0.5" onClick={() => { UI.info = null; notify(); }}>
          <Ic n="close" s={1.1} />
        </button>
      </div>
      {def && (
        <div className="mt-1.5 flex flex-col gap-1 text-xs font-bold">
          {p.dead ? <div className="text-red-700 font-extrabold">{UT.plotDead}</div>
            : p.ripe ? <div className="text-green-800 font-extrabold">{UT.plotRipe}</div>
            : <Bar v={p.prog} col="#6cc84c" icon="sun" />}
          <Bar v={p.water} col="#4aa3df" icon="drop" />
          <Bar v={p.fert} col="#c88a3c" icon="fert" />
          {def.regrow && <div>{UT.plotRegrow}<span dir="ltr">{fa(Math.min(def.maxH ?? 1, p.n + 1))}/{fa(def.maxH ?? 1)}</span></div>}
          {!p.dead && !p.ripe && (() => {
            const curSn = season();
            const isDorm = !inGh && !def.regrow && !def.seasons.includes(curSn);
            if (isDorm) return <div className="font-extrabold text-amber-800">{WX.plotDormant}</div>;
            const curFarm = activeFarm();
            const rate = effectivePlotDailyRate(curFarm, inf.plot);
            const hrsLeft = Math.max(1, Math.round(((1 - p.prog) / Math.max(0.01, rate)) * 24));
            return (
              <div className="text-[.7rem] font-extrabold text-emerald-900">
                {WX.plotEtaLabel}{fa(hrsLeft)}{WX.plotHoursUnit}
              </div>
            );
          })()}
          {estateSpecialtyMult(activeFarm(), def.id) > 1.01 && (
            <div className="text-[.7rem] font-extrabold text-emerald-800">
              {WX.plotSpecBonus}+{faPct(Math.round((estateSpecialtyMult(activeFarm(), def.id) - 1) * 100))}
            </div>
          )}
        </div>
      )}
      {inGh && <div className="mt-1 text-[.7rem] font-extrabold text-sky-800">{UT.plotGreenhouse}</div>}
      {S.lv.soil > 0 && <div className="mt-0.5 text-[.7rem] font-extrabold text-amber-800">{UT.plotSoilBonus}{faPct(S.lv.soil * 12)}</div>}
      {canUp && p.last && CROP[p.last] && <div className="mt-1 text-xs font-bold opacity-80">{UT.plotLastCrop}{CROP[p.last].fa}</div>}
      {quickAction && (
        <button
          className="btn g press mt-1.5 w-full !min-h-[max(48px,2.1rem)] !py-1 text-xs font-black"
          onClick={() => { const pl = inf.plot; UI.info = null; cmd.actPlot(quickAction.k, pl); notify(); }}
        >
          <Ic n={quickAction.ic} s={1.4} />
          <span>{quickAction.label}</span>
        </button>
      )}
    </div>
  );
}

function Toasts() {
  const morningOpen = Boolean(S.morning && !S.morning.shown && S.hour >= 5.5 && S.hour < 19 && (S.custom?.morningCard ?? true) && !UI.modal);
  return (
    <div
      className="pointer-events-none fixed left-1/2 z-30 flex max-w-[min(88vw,25rem)] -translate-x-1/2 flex-col items-center gap-1"
      style={{ top: morningOpen ? 'calc(var(--safe-top) + 10.6rem)' : 'calc(var(--safe-top) + 6.4rem)' }}
    >
      {UI.toasts.filter((t) => !t.locale || t.locale === CFG.locale).map((t) => (
        <div key={t.id} className="paper toast flex items-center gap-2 px-3 py-1 text-sm font-extrabold">
          <Ic n={t.icon} s={2} /><span>{t.text}</span>
        </div>
      ))}
    </div>
  );
}
