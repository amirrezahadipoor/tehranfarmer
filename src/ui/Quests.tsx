// ===== تابلوی کوئست‌های اصلی فصل، مأموریت‌های روزانه/هفتگی و طومار رازهای پنهان =====
import { GOOD } from '../game/data';
import { cmd } from '../game/engine';
import { S, UI, claimAllReadyQuests, deliverContract, holdCount, notify, readyQuestCount } from '../game/state';
import { claim, ensureQuests, isClaimed, questDone, questLabelOf, questProgress, type QuestGoal } from '../story/dailyQuests';
import { chapterChecklist, questOf, questProgress as storyQuestProgress, type ChapterAction } from '../story/quests';
import { SECRETS, discoveredSecretCount } from '../story/secrets';
import { offerContractBoard, signBoardContract } from '../story/socialVillagers';
import { talkToSharkhar, talkToTownNpc } from '../story/engine';
import { sfx } from '../game/sound';
import { fa } from '../strings/fa';
import { Bar, Coin, Ic, Modal } from './parts';
import { BuyBtn, close } from './shopKit';
import { CFG } from '../game/settings';
import { NPC_QUEST_SPECS, isNpcQuestActive, npcHasQuestMarker } from '../story/npcQuests';
import { ESTATE_UI, NPC_ROLES } from '../strings/estateStoryText';
import { UT } from '../strings/uiText';
import { WX } from '../strings/worldExpansionText';
import { journeyCopy } from '../strings/journeyText';

function Card({ g, week }: { g: QuestGoal; week?: boolean }) {
  const p = questProgress(g, !!week);
  const done = questDone(g, !!week);
  const taken = isClaimed(g, week);
  return (
    <div className="paper flex flex-col gap-1 p-2">
      <div className="flex items-center gap-2">
        <Ic n={ICON[g.kind]} s={2.4} />
        <div className="flex-1">
          <div className="text-sm font-black">{questLabelOf(g, !!week)}</div>
          <div className="text-[.65rem] font-bold opacity-60">{week ? UT.u141 : UT.u142}</div>
        </div>
        <span className="ft text-lg" dir="ltr">{fa(Math.min(p, g.target))}/{fa(g.target)}</span>
      </div>
      <Bar v={p / g.target} col={done ? '#8fd35a' : '#b48aff'} />
      <div className="flex items-center gap-2">
        <Coin v={g.reward} s={1.3} cls="text-sm" />
        <span className="text-[.65rem] font-black opacity-60"><bdi>+{fa(g.xp)}</bdi>{UT.u143}</span>
        <div className="flex-1" />
        <button
          className={'btn press !px-2 !py-0.5 ' + (taken ? 'b' : done ? 'g' : 'y')}
          disabled={!done || taken}
          onClick={() => { claim(g, week); notify(); }}
        >
          <span className="text-sm font-black">{taken ? UT.u144 : done ? UT.u145 : UT.u146}</span>
        </button>
      </div>
    </div>
  );
}

const ICON: Record<string, string> = {
  harvest: 'sickle', plant: 'seedbag', collect: 'egg', honey: 'honey', pond: 'fish', sell: 'coin', build: 'hammer', fish: 'fish', babies: 'nest',
};
const ACTION_ICON: Record<ChapterAction, string> = { farm: 'house', carp: 'hammer', estate: 'land', work: 'tractor' };
const JOURNEY_STATUS_ICON: Record<string, string> = { done: 'check', current: 'scroll', upcoming: 'lock' };

function goChapterAction(action: ChapterAction) {
  UI.modal = null;
  UI.afterModal = null;
  UI.afterTalkNpc = null;
  UI.info = null;
  UI.seedTray = false;
  sfx.tap();
  if (action === 'farm') {
    if (UI.scene !== 'farm') cmd.travelTo('farm');
  } else if (UI.scene === 'town') {
    UI.modal = action;
  } else {
    UI.afterModal = action;
    cmd.travelTo('town');
  }
  notify();
}

function JourneyJournal({ chapter, postgame }: { chapter: number; postgame: boolean }) {
  const J = journeyCopy();
  const current = Math.max(1, Math.min(6, Math.floor(chapter)));
  const summary = J.chapters[Math.max(0, Math.min(6, Math.floor(chapter)))];
  return (
    <section className="paper mb-3 flex flex-col gap-2 border-2 border-[#7897a4] p-2.5" data-journey-journal="1" aria-label={J.journeyTitle}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Ic n="atlas" s={1.8} />
          <span className="ft text-base text-[#395865]">{J.journeyTitle}</span>
        </div>
        <span className="rounded-full bg-[#e4f2f4] px-2.5 py-0.5 text-[.68rem] font-black text-[#395865]">
          {postgame ? J.done : chapter === 0 ? J.current : `${J.chapterWord} ${fa(current)}`}
        </span>
      </div>
      <div className="grid grid-cols-6 gap-1" role="list">
        {J.chapters.slice(1).map((item, idx) => {
          const n = idx + 1;
          const status = postgame || (chapter >= 1 && n < chapter) ? 'done' : !postgame && n === current ? 'current' : 'upcoming';
          const statusText = status === 'done' ? J.done : status === 'current' ? J.current : J.upcoming;
          return (
            <div
              key={item.title}
              role="listitem"
              data-journey-chapter={n}
              data-status={status}
              aria-current={status === 'current' ? 'step' : undefined}
              aria-label={`${J.chapterWord} ${fa(n)}: ${statusText}`}
              title={item.title}
              className={'flex min-w-0 flex-col items-center justify-center rounded-lg border px-1 py-1 ' + (status === 'done'
                ? 'border-[#7db867] bg-[#dff4ce] text-[#2f5d22]'
                : status === 'current' ? 'border-[#c88d32] bg-[#ffe79c] text-[#5a3518]' : 'border-black/10 bg-white/55 opacity-65')}
            >
              <Ic n={JOURNEY_STATUS_ICON[status]} s={1.15} />
              <span className="ft text-xs leading-none">{fa(n)}</span>
            </div>
          );
        })}
      </div>
      <div className="rounded-xl bg-[#f3f8ed] px-2.5 py-1.5" data-journey-recap="1">
        <div className="text-xs font-black text-[#405b36]">{postgame ? J.postgameTitle : summary.title}</div>
        <p className="mt-0.5 text-[.72rem] font-bold leading-relaxed text-[#5f6048]">{postgame ? J.postgameRecap : summary.recap}</p>
      </div>
    </section>
  );
}

export function Quests() {
  ensureQuests();
  const q = S.quests;
  const mainQ = !S.story.postgame ? questOf(S.story.chapter) : null;
  const checks = mainQ ? chapterChecklist(mainQ.chapter) : [];
  const foundSecrets = discoveredSecretCount();
  const loc = CFG.locale === 'en' ? 'en' : 'fa';
  const J = journeyCopy();
  const eu = ESTATE_UI[loc];
  const activeNpcQuests = NPC_QUEST_SPECS.filter((sq) => isNpcQuestActive(sq));
  const waitingActors = (['grandma', 'sara', 'engineer', 'rancher', 'jahangir'] as const).filter((w) => npcHasQuestMarker(w));

  return (
    <Modal title={UT.u34} icon="scroll" onClose={close} coins={<Coin v={S.coins} />}>
      {readyQuestCount() > 0 && (
        <button className="btn g press mb-2 w-full !py-1.5 text-sm font-black" onClick={() => { claimAllReadyQuests(claim); notify(); }}>
          <Ic n="star" s={1.8} />
          <span>{UT.claimAllQuests}</span>
        </button>
      )}
      <JourneyJournal chapter={S.story.chapter} postgame={S.story.postgame} />
      {/* کارت هدف اصلی و پیش‌نیازهای توسعهٔ فصل جاری */}
      {mainQ && (
        <div className="paper mb-3 flex flex-col gap-1.5 border-2 border-[#c88d32] p-2.5" data-chapter-quest={mainQ.id}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <Ic n="medal" s={2} />
              <span className="ft text-base text-[#5a3518]">
                {UT.chapterGoalTitle}{fa(mainQ.chapter)}: {mainQ.title}
              </span>
            </div>
            <Coin v={mainQ.reward} s={1.3} cls="text-sm" />
          </div>
          <div className="text-xs font-bold opacity-85">{mainQ.desc}</div>
          <Bar v={storyQuestProgress(mainQ.chapter)} col="#56b847" />
          <div className="grid gap-1 pt-0.5 sm:grid-cols-2">
            {checks.map((c, idx) => (
              <button
                key={idx}
                type="button"
                data-chapter-action={c.action}
                disabled={c.ok}
                aria-label={c.ok ? c.label : `${J.actionHint}: ${c.label}`}
                title={c.ok ? undefined : J.actionHint}
                onClick={() => { if (!c.ok) goChapterAction(c.action); }}
                className={'flex min-h-[48px] items-center gap-1.5 rounded-lg px-2 py-1 text-start text-[.72rem] font-extrabold ' + (c.ok ? 'bg-[#dcf6c8] text-[#235216]' : 'bg-black/5 hover:bg-[#fff0b8]')}
              >
                <Ic n={c.ok ? 'check' : ACTION_ICON[c.action]} s={1.2} />
                <span className="flex-1">{c.label}</span>
                {!c.ok && <Ic n="arrow" s={1} cls="opacity-60" />}
              </button>
            ))}
          </div>
        </div>
      )}

      {(activeNpcQuests.length > 0 || waitingActors.length > 0) && (
        <div className="paper mb-3 flex flex-col gap-1.5 border-2 border-[#e0a82e] p-2.5" data-npc-quests="1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <Ic n="star" s={1.8} />
              <span className="ft text-base text-[#5a3518]">{eu.npcQuestsTitle}</span>
            </div>
          </div>
          {waitingActors.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-1.5 rounded-lg bg-[#fff4c2] px-2.5 py-1.5 text-xs font-extrabold text-[#5a3518]">
              <span>{eu.npcQuestTalkHint}</span>
              <div className="flex flex-wrap gap-1">
                {waitingActors.map((a) => (
                  <button
                    key={a}
                    type="button"
                    data-quest-talk={a}
                    className="btn y press !px-2 !py-0.5 text-[.7rem] font-black"
                    onClick={() => {
                      const idxMap = { grandma: 0, sara: 1, engineer: 2, rancher: 3 } as const;
                      const target = a === 'jahangir' ? 'sharkhar' : idxMap[a];
                      UI.modal = null;
                      sfx.tap();
                      if (UI.scene === 'town') {
                        if (target === 'sharkhar') talkToSharkhar();
                        else talkToTownNpc(target);
                        notify();
                      } else {
                        UI.afterTalkNpc = target;
                        cmd.travelTo('town');
                        notify();
                      }
                    }}
                  >
                    <span>{NPC_ROLES[loc][a].name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="grid gap-1.5 sm:grid-cols-2">
            {activeNpcQuests.map((sq) => {
              const [curVal, target] = sq.progress();
              const ready = curVal >= target;
              const role = NPC_ROLES[loc][sq.who];
              const idxMap = { grandma: 0, sara: 1, engineer: 2, rancher: 3 } as const;
              const npcTarget = idxMap[sq.who];
              return (
                <div key={sq.id} className="rounded-xl border border-[#d6c08a] bg-white/75 p-2 text-xs">
                  <div className="flex items-center justify-between font-black">
                    <span>{loc === 'en' ? sq.titleEn : sq.titleFa}</span>
                    <span dir="ltr">{fa(curVal)}/{fa(target)}</span>
                  </div>
                  <div className="text-[.68rem] font-bold text-[#7c5125]">{role.name} — {role.job}</div>
                  <div className="my-1"><Bar v={curVal / Math.max(1, target)} col={ready ? '#56b847' : '#e0a82e'} /></div>
                  <div className="flex items-center justify-between gap-1 text-[.7rem] font-extrabold">
                    <Coin v={sq.rewardCoins} s={1.15} cls="text-xs" />
                    <button
                      type="button"
                      data-quest-turnin={sq.id}
                      className={'btn press !px-2 !py-0.5 text-[.68rem] font-black ' + (ready ? 'g' : 'y')}
                      onClick={() => {
                        UI.modal = null;
                        sfx.tap();
                        if (UI.scene === 'town') {
                          talkToTownNpc(npcTarget);
                          notify();
                        } else {
                          UI.afterTalkNpc = npcTarget;
                          cmd.travelTo('town');
                          notify();
                        }
                      }}
                    >
                      <span>{ready ? WX.questTurnInBtn : WX.questGoTalkBtn}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid gap-2 pb-3 sm:grid-cols-2">
        {q.daily.map((g, i) => <Card key={'d' + i} g={g} />)}
        {q.weekly && <Card g={q.weekly} week />}
      </div>

      {/* تابلوی ۳ قرارداد موازی انجمن دهکده */}
      <div className="paper mb-3 flex flex-col gap-2 border-2 border-[#8c9d6e] p-2.5" data-contract-board="1">
        <div className="flex items-center gap-1.5">
          <Ic n="contract" s={1.8} />
          <span className="ft text-base text-[#5a3518]">{WX.contractsBoardTitle}</span>
        </div>
        {S.contract ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/80 p-2 text-xs font-extrabold">
            <div>
              <div>{UT.contractTitle}: <span dir="ltr">{fa(holdCount(S.contract.good))}/{fa(S.contract.qty)}</span> {GOOD[S.contract.good]?.fa ?? S.contract.good}</div>
              <div className="opacity-75">{UT.contractDue}{fa(S.contract.dueDay)} — {UT.contractReward}{fa(S.contract.reward)}</div>
            </div>
            <button
              type="button"
              className="btn g press !px-3 !py-1 text-xs font-black"
              disabled={holdCount(S.contract.good) < S.contract.qty}
              onClick={() => deliverContract()}
            >
              {UT.contractDeliver}
            </button>
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-3">
            {offerContractBoard().map((slot) => (
              <div key={slot.slot} className="flex flex-col justify-between gap-1.5 rounded-xl border border-[#d4be8d] bg-white/75 p-2 text-xs">
                <div className="text-[.66rem] font-extrabold text-[#7c5125]">{slot.tierLabel}</div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 font-black"><Ic n={slot.good} s={1.5} />{fa(slot.qty)} {slot.fa}</span>
                  <span className="text-[.68rem] font-extrabold opacity-75">{fa(slot.days)}{UT.u39}</span>
                </div>
                <div className="text-[.7rem] font-extrabold text-emerald-800">{UT.contractReward}{fa(slot.reward)}</div>
                <BuyBtn n={UT.contractSign} price={slot.deposit} onClick={() => signBoardContract(slot.slot)} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* طومار رازهای پنهان دره */}
      <div className="paper mt-1 flex flex-col gap-2 p-2.5" data-secrets-panel="1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Ic n="star" s={1.9} />
            <span className="ft text-base">{UT.secretsTitle}</span>
          </div>
          <span className="ft rounded-full bg-[#ffe8a3] px-2.5 py-0.5 text-sm whitespace-nowrap" dir="ltr">
            {fa(foundSecrets)} / {fa(SECRETS.length)}
          </span>
        </div>
        <div className="grid gap-1.5 sm:grid-cols-2">
          {SECRETS.map((sec) => {
            const unlocked = !!S.secrets?.[sec.id];
            return (
              <div
                key={sec.id}
                className={'rounded-xl border p-2 text-xs ' + (unlocked ? 'border-[#6ec251] bg-[#eefbe6]' : 'border-black/10 bg-white/50 opacity-85')}
              >
                <div className="flex items-center justify-between gap-1 font-black">
                  <span className="flex items-center gap-1">
                    <Ic n={unlocked ? sec.icon : 'lock'} s={1.4} />
                    <span>{unlocked ? sec.titleFa : UT.secretHiddenBadge}</span>
                  </span>
                  {unlocked && <span className="rounded bg-[#5dc246] px-1.5 py-0.5 text-[.62rem] text-white">{UT.secretFoundBadge}</span>}
                </div>
                <div className="mt-1 text-[.7rem] font-bold leading-relaxed opacity-85">
                  {unlocked ? sec.rewardTextFa : sec.clueFa}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="paper mx-auto mt-2 max-w-md p-2.5 text-center text-xs font-bold opacity-80">{UT.u147}</div>
    </Modal>
  );
}
