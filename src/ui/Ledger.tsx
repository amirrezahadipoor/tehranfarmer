// ===== دفتر کل جهانگیر — مدیریت بدهی، قلک، اعتبار و مترسک =====
import { useState } from 'react';
import { S, UI, farmLevel, notify } from '../game/state';
import {
  activeNote, buyScarecrow, daysToDue, debt, floorCoins, formatDebtHistoryText, interestOf, minPay, payDebt,
  scarecrowPrice, stashCap, stashDeposit, stashWithdraw, standingBand, totalRemaining,
} from '../game/core/debt';
import { NOTES } from '../story/debtData';
import { questOf, questProgress } from '../story/quests';
import { talkToSharkhar } from '../story/engine';
import { economicHint } from '../game/core/advisor';
import { fa } from '../strings/fa';
import { Bar, Coin, Ic, Modal } from './parts';
import { close } from './shopKit';
import { sfx } from '../game/sound';
import { UT } from '../strings/uiText';

const money = (n: number) => fa(Math.max(0, Math.round(n)));

export function Ledger() {
  const [custom, setCustom] = useState('');
  const d = debt();
  const note = activeNote();
  const band = standingBand();
  const cap = stashCap();
  const due = daysToDue();

  return (
    <Modal title={UT.u36} icon="ledger" onClose={close} coins={<Coin v={S.coins} />}>
      {!d || !note ? (
        <div className="paper p-4 text-center text-sm font-extrabold">{UT.u42}</div>
      ) : S.story.postgame ? (
        <div className="flex flex-col gap-2 pb-3">
          <div className="paper p-4 text-center">
            <Ic n="trophy" s={3.6} cls="mx-auto mb-1 bob" />
            <div className="ft text-2xl text-green-800">{UT.ledgerClearedTitle}</div>
            <div className="mt-1 text-xs font-extrabold opacity-80">{UT.ledgerClearedSub}</div>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <button className="btn g press !px-3 !py-1" onClick={() => { UI.modal = 'museum'; notify(); }}>
                <Ic n="trophy" s={1.6} /><span className="text-xs font-black">{UT.museumShort}</span>
              </button>
              <button className="btn p press !px-3 !py-1" onClick={() => { UI.modal = null; talkToSharkhar(); notify(); }}>
                <span className="text-xs font-black">{UT.talkJahangir}</span>
              </button>
            </div>
          </div>
          {d.stash > 0 && (
            <div className="paper flex items-center justify-between p-3">
              <div className="flex items-center gap-2">
                <Ic n="stash" s={2.2} />
                <span className="ft text-lg">{UT.u61}: {money(d.stash)}</span>
              </div>
              <button className="btn b press !px-3" onClick={() => stashWithdraw(d.stash)}>
                <span className="text-sm font-black">{UT.stashTake}</span>
              </button>
            </div>
          )}
          <div className="paper p-3">
            <div className="mb-1 flex items-center gap-2"><Ic n="history" s={2} /><span className="ft text-xl">{UT.u70}</span></div>
            <div className="scroll max-h-40 space-y-1 pr-1">
              {[...d.history].reverse().slice(0, 20).map((h, i) => (
                <div key={i} className="flex items-center gap-2 rounded bg-[#f3e6c4] px-2 py-1 text-xs font-bold">
                  <span className="opacity-60" dir="ltr">{UT.u72}{fa(h.day)}</span>
                  <span className="flex-1">{formatDebtHistoryText(h)}</span>
                  {h.amount > 0 && <span className="ft text-sm">{money(h.amount)}</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5 pb-2">
          {economicHint() && (
            <div className="paper flex items-center gap-2 px-2.5 py-1 text-xs font-extrabold" data-advisor="1">
              <Ic n={economicHint()!.icon} s={1.65} />
              <span>{economicHint()!.text}</span>
            </div>
          )}
          {/* سند فعال */}
          <div className="paper p-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <Ic n="note" s={2.5} />
              <div className="min-w-40 flex-1">
                <div className="text-xs font-black opacity-60">{UT.u43}{fa(d.noteIdx + 1)}{UT.u44}{fa(NOTES.length)})</div>
                <div className="ft text-xl leading-tight sm:text-2xl">{note.name}</div>
              </div>
              <div className="text-left">
                <div className="text-xs font-black opacity-60">{UT.u45}</div>
                <div className="ft text-xl text-[#c8433a] sm:text-2xl">{money(d.remaining)}</div>
              </div>
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <Bar v={1 - d.remaining / note.amount} col="#8fd35a" icon="coin" />
              <span className="text-xs font-black" dir="ltr">{fa(Math.round((1 - d.remaining / note.amount) * 100))}{UT.u46}</span>
            </div>
            <div className="mt-1.5 grid grid-cols-2 gap-1 text-xs font-black sm:grid-cols-4">
              <Chip l={UT.u47} v={money(minPay())} />
              <Chip l={UT.u48} v={money(interestOf())} />
              <Chip l={UT.u38} v={fa(due) + UT.u39} />
              <Chip l={UT.u49} v={money(totalRemaining())} />
            </div>
            <div className="mt-1.5 flex items-center justify-between gap-2 text-xs font-bold opacity-80">
              <span>{note.why}</span>
              <button
                className="btn p press shrink-0 !px-2 !py-0.5"
                onClick={() => { UI.modal = null; talkToSharkhar(); notify(); }}
              >
                <span className="text-xs font-black">{UT.talkJahangir}</span>
              </button>
            </div>
          </div>

          {/* پرداخت */}
          <div className="paper p-2.5">
            <div className="mb-1.5 flex items-center gap-2"><Ic n="coin" s={1.9} /><span className="ft text-lg sm:text-xl">{UT.u50}</span></div>
            <div className="flex flex-wrap gap-1">
              {[0.25, 0.5].map((r) => (
                <button key={r} className="btn y press !px-2" onClick={() => payDebt(d.remaining * r)}>
                  <span className="text-sm font-black">{fa(r * 100)}{UT.u46}</span>
                </button>
              ))}
              <button className="btn b press !px-2" onClick={() => payDebt(minPay())}><span className="text-sm font-black">{UT.u47}</span></button>
              <button className="btn g press !px-2" onClick={() => payDebt(d.remaining)}><span className="text-sm font-black">{UT.u51}</span></button>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <input
                value={custom}
                onChange={(e) => setCustom(e.target.value.replace(/[^0-9]/g, ''))}
                inputMode="numeric"
                placeholder={UT.u52}
                className="w-32 rounded-md border-2 border-[#503426] bg-[#fff4d8] px-2 py-1 text-sm font-black"
                dir="ltr"
              />
              <button className="btn y press !px-2" onClick={() => { payDebt(Number(custom || 0)); setCustom(''); }}>
                <span className="text-sm font-black">{UT.u53}</span>
              </button>
              <div className="flex-1" />
              <span className="text-xs font-black opacity-60">{UT.u54}{fa(due)}{UT.u39}</span>
            </div>
          </div>

          {/* اعتبار و قلک */}
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="paper p-3">
              <div className="mb-1 flex items-center gap-2"><Ic n="medal" s={2} /><span className="ft text-xl">{UT.u55}</span></div>
              <Bar v={d.standing / 100} col={band === 'good' ? '#8fd35a' : band === 'bad' ? '#ff8b7a' : '#ffd93b'} />
              <div className="mt-1 flex justify-between text-xs font-black">
                <span>{fa(d.standing)}{UT.u56}</span>
                <span className={band === 'good' ? 'text-green-700' : band === 'bad' ? 'text-red-700' : ''}>
                  {band === 'good' ? UT.u57 : band === 'bad' ? UT.u58 : UT.u59}
                </span>
              </div>
              <div className="mt-1 text-[.7rem] font-bold opacity-60">{UT.u60}</div>
            </div>

            <div className="paper p-3">
              <div className="mb-1 flex items-center gap-2"><Ic n="stash" s={2} /><span className="ft text-xl">{UT.u61}</span></div>
              <Bar v={cap ? d.stash / cap : 0} col="#d6b8ff" />
              <div className="mt-1 flex justify-between text-xs font-black"><span dir="ltr">{money(d.stash)} / {money(cap)}</span><span>{UT.u62}</span></div>
              <div className="mt-2 flex gap-1">
                <button className="btn y press !px-2" onClick={() => stashDeposit(Math.floor(S.coins - floorCoins()))}><span className="text-sm font-black">{UT.u63}</span></button>
                <button className="btn b press !px-2" onClick={() => stashWithdraw(d.stash)}><span className="text-sm font-black">{UT.stashTake}</span></button>
              </div>
            </div>
          </div>

          {/* مترسک */}
          <div className="paper flex flex-wrap items-center gap-2 p-3">
            <Ic n="scarecrow" s={3} />
            <div className="flex-1">
              <div className="ft text-xl">{UT.u64}</div>
              <div className="text-xs font-black opacity-70">{UT.u65}{fa(d.scarecrow)}{UT.u66}</div>
            </div>
            {d.scarecrow >= 3 ? <Ic n="check" s={2.6} /> : (
              <button className="btn g press !px-2" disabled={S.coins < scarecrowPrice()} onClick={() => buyScarecrow()}>
                <span className="text-sm font-black">{UT.u67}</span><Coin v={scarecrowPrice()} s={1.4} />
              </button>
            )}
          </div>

          {/* کوئست فصل */}
          {questOf(S.story.chapter) && (
            <div className="paper p-3">
              <div className="flex items-center gap-2"><Ic n="star" s={2} /><span className="ft text-xl">{UT.u68}{fa(S.story.chapter)}: {questOf(S.story.chapter)!.title}</span></div>
              <div className="mt-1 text-xs font-bold">{questOf(S.story.chapter)!.desc}</div>
              <div className="mt-1 flex items-center gap-2"><Bar v={questProgress(S.story.chapter)} col="#b48aff" /><span className="text-xs font-black" dir="ltr">{fa(Math.round(questProgress(S.story.chapter) * 100))}{UT.u46}</span></div>
              <div className="mt-1 text-[.7rem] font-bold opacity-60">{UT.u69}{fa(farmLevel())}</div>
            </div>
          )}

          {/* تاریخچه */}
          <div className="paper p-3">
            <div className="mb-1 flex items-center gap-2"><Ic n="history" s={2} /><span className="ft text-xl">{UT.u70}</span></div>
            <div className="scroll max-h-40 space-y-1 pr-1">
              {d.history.length === 0 && <div className="text-xs font-bold opacity-50">{UT.u71}</div>}
              {[...d.history].reverse().slice(0, 20).map((h, i) => (
                <div key={i} className="flex items-center gap-2 rounded bg-[#f3e6c4] px-2 py-1 text-xs font-bold">
                  <span className="opacity-60" dir="ltr">{UT.u72}{fa(h.day)}</span>
                  <span className="flex-1">{formatDebtHistoryText(h)}</span>
                  {h.amount > 0 && <span className="ft text-sm">{money(h.amount)}</span>}
                </div>
              ))}
            </div>
          </div>

          {d.extorted > 0 && (
            <div className="paper-dark p-3 text-[#fff4d8]">
              <div className="flex items-center gap-2"><Ic n="stash" s={2} /><span className="ft text-lg">{UT.u73}{money(d.extorted)}</span></div>
              <div className="text-xs font-bold opacity-80">{UT.u74}</div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

function Chip({ l, v }: { l: string; v: string }) {
  return (
    <div className="rounded-md bg-[#f3e6c4] px-2 py-1">
      <div className="text-[.65rem] opacity-60">{l}</div>
      <div className="ft text-lg leading-none">{v}</div>
    </div>
  );
}

/** دکمهٔ کوچک برای پنل‌ها */
export function openLedger() { UI.modal = 'ledger'; sfx.tap(); notify(); }
