import { useEffect, useState } from 'react';
import { CROP, GOOD, fa } from '../game/data';
import { cmd } from '../game/engine';
import { CFG } from '../game/settings';
import { S, UI, holdCount, notify, stamCap } from '../game/state';
import {
  claimMailParcel, ensureMailState, fulfillMailDeal, mailItemLabel,
  markAllMailRead, markMailRead, syncMailboxState, togglePinMail,
} from '../game/core/mailbox';
import { sfx } from '../game/sound';
import { talkToTownNpc } from '../story/engine';
import { TOWN_ACTORS } from '../story/townNpc';
import {
  MAIL_UI, SENDER_META, renderMailTemplate, seasonLabel,
  type MailCategory, type MailEntry, type MailItemGrant,
} from '../strings/mailText';
import { Coin, Ic, Modal } from './parts';
import { close, Wallet } from './shopKit';

type FilterTab = 'all' | MailCategory;

function grantIcon(g: MailItemGrant): string {
  if (g.kind === 'coin') return 'coin';
  if (g.kind === 'seed') return g.id ? `seed:${g.id}` : 'seedbag';
  if (g.kind === 'good') return g.id ?? 'bag';
  if (g.kind === 'fert') return 'fert';
  return 'bolt';
}

function grantText(g: MailItemGrant): string {
  const en = CFG.locale === 'en';
  if (g.kind === 'coin') return en ? `${g.qty}` : fa(g.qty);
  if (g.kind === 'seed') {
    const nm = g.id ? (CROP[g.id]?.fa ?? g.id) : '';
    return MAIL_UI.seedUnit(nm, g.qty);
  }
  if (g.kind === 'good') {
    const nm = g.id ? (GOOD[g.id]?.fa ?? g.id) : '';
    return `${en ? g.qty : fa(g.qty)} ${nm}`;
  }
  if (g.kind === 'fert') return MAIL_UI.fertUnit(g.qty);
  return MAIL_UI.stamUnit(g.qty);
}

function hasPendingAction(m: MailEntry): boolean {
  if (m.parcel?.length && !m.claimed) return true;
  if (m.trade && !m.trade.fulfilled && S.day <= m.trade.dueDay && holdCount(m.trade.good) >= m.trade.qty) return true;
  return false;
}

export function MailboxModal() {
  const [tab, setTab] = useState<FilterTab>('all');
  const [selectedId, setSelectedId] = useState<string>('');
  const en = CFG.locale === 'en';

  useEffect(() => {
    syncMailboxState(false);
    notify();
  }, []);

  const inbox = ensureMailState().inbox;
  const filtered = tab === 'all' ? inbox : inbox.filter((m) => m.category === tab);
  // Opening the postbox must not silently unseal a letter. Only an explicit row
  // selection marks it read; changing tabs also cannot consume another unread letter.
  const active = filtered.find((m) => m.id === selectedId) ?? null;
  const activeStaminaNeed = active?.parcel?.reduce((sum, g) => sum + (g.kind === 'stamina' ? g.qty : 0), 0) ?? 0;
  const staminaClaimBlocked = activeStaminaNeed > Math.max(0, stamCap() - S.stamina);

  const tabs: Array<{ id: FilterTab; label: string; ic: string }> = [
    { id: 'all', label: MAIL_UI.tabAll, ic: 'mail' },
    { id: 'story', label: MAIL_UI.tabStory, ic: 'scroll' },
    { id: 'world', label: MAIL_UI.tabWorld, ic: 'spring' },
    { id: 'trade', label: MAIL_UI.tabTrade, ic: 'contract' },
    { id: 'quest', label: MAIL_UI.tabQuest, ic: 'parcel' },
  ];

  const handleVisitSender = (npc: NonNullable<MailEntry['questNpc']>) => {
    const idx = TOWN_ACTORS.findIndex((a) => a.who === npc);
    UI.modal = null;
    sfx.tap();
    if (idx >= 0) {
      if (UI.scene === 'town') {
        talkToTownNpc(idx);
      } else {
        UI.afterTalkNpc = idx;
        cmd.travelTo('town');
      }
    } else if (npc === 'jahangir') {
      UI.afterTalkNpc = 'sharkhar';
      if (UI.scene !== 'town') cmd.travelTo('town');
    }
    notify();
  };

  return (
    <Modal title={MAIL_UI.title} icon="postbox" onClose={close} coins={<Wallet />}>
      <div data-mailbox-modal="1" className="flex flex-col gap-2">
        {/* نوار دسته‌بندی نامه‌ها + دکمهٔ خواندن یکجا */}
        <div className="flex flex-wrap items-center justify-between gap-1.5">
          <div className="flex flex-wrap items-center gap-1">
            {tabs.map((tItem) => {
              const cnt = tItem.id === 'all'
                ? inbox.filter((m) => !m.read || hasPendingAction(m)).length
                : inbox.filter((m) => m.category === tItem.id && (!m.read || hasPendingAction(m))).length;
              const on = tab === tItem.id;
              return (
                <button
                  key={tItem.id}
                  data-mail-tab={tItem.id}
                  onClick={() => { sfx.tap(); setTab(tItem.id); setSelectedId(''); }}
                  className={`btn press !px-2 !py-0.5 text-xs font-black ${on ? 'y ring-2 ring-[#503426]' : ''}`}
                >
                  <Ic n={tItem.ic} s={1.2} />
                  <span>{tItem.label}</span>
                  {cnt > 0 && (
                    <span className="rounded-full border border-[#503426] bg-[#e63935] px-1.5 text-[.66rem] font-black leading-tight text-white">
                      {en ? cnt : fa(cnt)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {inbox.some((m) => !m.read) && (
            <button
              data-mail-mark-all="1"
              className="btn g press !px-2.5 !py-0.5 text-xs font-black"
              onClick={() => { sfx.tap(); markAllMailRead(); }}
            >
              <Ic n="check" s={1.1} />
              <span>{MAIL_UI.markAllRead}</span>
            </button>
          )}
        </div>

        {!filtered.length ? (
          <div className="paper flex flex-col items-center justify-center gap-2 py-8 text-center text-sm font-extrabold text-[#6c4c2f]">
            <Ic n="mail" s={4} />
            <div>{MAIL_UI.emptyBox}</div>
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-12">
            {/* ستون فهرست پاکت‌های نامه با مهر موم رنگی */}
            <div data-mail-list="1" className={`${active ? 'hidden sm:flex' : 'flex'} max-h-none flex-col gap-1.5 overflow-y-auto pr-0.5 sm:col-span-5 sm:max-h-[42vh] lg:max-h-[58vh]`}>
              {filtered.map((m) => {
                const meta = SENDER_META[m.sender];
                const txt = renderMailTemplate(m, mailItemLabel);
                const selected = active?.id === m.id;
                const actionReady = hasPendingAction(m);
                const mailIcon = m.read ? 'mailopen' : 'mail';
                const hasSealedParcel = Boolean(m.parcel?.length && !m.claimed);
                return (
                  <button
                    key={m.id}
                    data-mail-row={m.id}
                    data-mail-read={m.read ? '1' : '0'}
                    data-mail-icon={mailIcon}
                    aria-label={`${txt.subject} — ${m.read ? MAIL_UI.readTag : MAIL_UI.unreadTag}`}
                    aria-expanded={selected}
                    onClick={() => { sfx.paper(); setSelectedId(m.id); markMailRead(m.id); }}
                    className={`paper press flex min-h-[48px] items-center gap-2 p-2 text-start transition ${
                      selected ? '!bg-[#fff3ce] ring-2 ring-[#7a4b26]' : m.read ? 'opacity-90' : '!bg-[#fffaf0] ring-1 ring-[#d5a54d]'
                    }`}
                  >
                    <div className="relative shrink-0">
                      <Ic n={mailIcon} s={2.35} />
                      {hasSealedParcel && (
                        <span data-mail-parcel-indicator="1" className="absolute -left-1.5 -top-1.5 rounded-full border border-[#503426] bg-[#fff4d6] p-0.5">
                          <Ic n="parcel" s={0.85} />
                        </span>
                      )}
                      <span
                        className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border border-[#503426]"
                        style={{ backgroundColor: meta.sealColor }}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1 text-[.68rem] font-bold text-[#7c5838]">
                        <span className="min-w-0 font-extrabold leading-tight text-[#4c2e16]">{en ? meta.nameEn : meta.nameFa}</span>
                        <span className="shrink-0">{MAIL_UI.postmarkDay(m.day, seasonLabel(m.season))}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="min-w-0 flex-1 whitespace-normal break-words text-xs font-black leading-snug text-[#2e1c0e]">{txt.subject}</div>
                        {!m.read && (
                          <span data-mail-unread-tag="1" className="shrink-0 rounded-full bg-[#cf3834] px-1.5 py-0.5 text-[.62rem] font-black leading-none text-white">
                            {MAIL_UI.unreadTag}
                          </span>
                        )}
                      </div>
                      {actionReady && (
                        <span className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-amber-100 px-1.5 py-0.2 text-[.64rem] font-black text-amber-950 ring-1 ring-amber-400">
                          <Ic n={m.parcel?.length && !m.claimed ? 'parcel' : 'coin'} s={0.95} />
                          <span>{m.parcel?.length && !m.claimed ? MAIL_UI.parcelReady : MAIL_UI.tabTrade}</span>
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* روی دسکتاپ پیش‌نمایش خالی است تا هیچ نامه‌ای بدون انتخاب باز نشود؛ روی موبایل فقط فهرست دیده می‌شود. */}
            {!active && (
              <div data-mail-selection-empty="1" className="paper hidden flex-col items-center justify-center gap-2 border-2 border-dashed border-[#c6a675] !bg-[#fffaf0] p-6 text-center sm:col-span-7 sm:flex">
                <Ic n="mail" s={4} />
                <div className="text-sm font-black text-[#4c2e16]">{MAIL_UI.chooseLetter}</div>
                <div className="max-w-sm text-xs font-bold leading-relaxed text-[#765334]">{MAIL_UI.sealedUntilOpened}</div>
              </div>
            )}

            {/* کاغذ دست‌ساز نامهٔ بازشده با مهر پستی، امضا، بستهٔ هدیه و دکمه‌های تعاملی */}
            {active && (() => {
              const meta = SENDER_META[active.sender];
              const txt = renderMailTemplate(active, mailItemLabel);
              const tr = active.trade;
              const haveQty = tr ? holdCount(tr.good) : 0;
              const expired = tr ? S.day > tr.dueDay : false;
              return (
                <div
                  data-mail-letter={active.id}
                  className="paper relative flex flex-col justify-between gap-3 border-2 border-[#b8955c] !bg-[#fffaf0] p-3.5 sm:col-span-7"
                >
                  <div className="flex flex-col gap-2.5">
                    <button
                      data-mail-back="1"
                      className="btn b press !min-h-[48px] w-full justify-start !px-3 !py-1 text-xs font-black sm:hidden"
                      onClick={() => { sfx.tap(); setSelectedId(''); }}
                    >
                      <Ic n="mail" s={1.15} />
                      <span>{MAIL_UI.backToLetters}</span>
                    </button>

                    {/* سربرگ تمبر و مهر موم فرستنده */}
                    <div className="flex flex-wrap items-start justify-between gap-2 border-b-2 border-dashed border-[#d8be92] pb-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-[#503426] shadow-inner"
                          style={{ backgroundColor: meta.sealRing }}
                        >
                          <Ic n={meta.icon} s={2.2} />
                        </div>
                        <div>
                          <div className="text-sm font-black text-[#3b2210]">{en ? meta.nameEn : meta.nameFa}</div>
                          <div className="text-[.72rem] font-bold text-[#7a5838]">{en ? meta.roleEn : meta.roleFa}</div>
                        </div>
                      </div>

                      {/* تمبر و مهر پستی جوهرخورده */}
                      <div className="flex items-center gap-1.5">
                        <div className="rounded-lg border-2 border-dotted border-[#9e7444] bg-[#f7ebd0] px-2 py-0.5 text-center leading-tight">
                          <div className="text-[.64rem] font-black text-[#7a4b26]">{en ? meta.stampEn : meta.stampFa}</div>
                          <div className="text-[.68rem] font-extrabold text-[#4b2d16]">
                            {MAIL_UI.postmarkDay(active.day, seasonLabel(active.season))}
                          </div>
                        </div>
                        <button
                          title={MAIL_UI.pinBtn}
                          onClick={() => togglePinMail(active.id)}
                          className={`btn press !px-2 !py-0.5 text-[.68rem] font-black ${active.pinned ? 'y' : ''}`}
                        >
                          <Ic n="star" s={1.1} />
                          <span>{active.pinned ? MAIL_UI.pinnedBtn : MAIL_UI.pinBtn}</span>
                        </button>
                      </div>
                    </div>

                    {/* عنوان و متن دست‌نویس نامه */}
                    <div className="text-base font-black text-[#2e1a0c]">{txt.subject}</div>
                    <div className="text-xs font-black text-[#6d4522]">{txt.greeting}</div>
                    <p className="leading-relaxed text-sm font-bold text-[#3f2918]">{txt.body}</p>
                    <div className="rounded-lg bg-[#f6ecd4] px-2.5 py-1.5 text-xs font-extrabold italic text-[#6b4828]">
                      {txt.ps}
                    </div>

                    {/* بخش تعاملی ۱: بستهٔ پیوست نامه (Claimable Gift Parcel) */}
                    {active.parcel && active.parcel.length > 0 && (
                      <div className="rounded-xl border-2 border-[#cfa25e] bg-[#fff4d6] p-2.5">
                        <div className="mb-1.5 flex items-center gap-1.5 text-xs font-black text-[#5c3614]">
                          <Ic n="parcel" s={1.45} />
                          <span>{MAIL_UI.parcelReady}</span>
                        </div>
                        <div className="mb-2 flex flex-wrap gap-1.5">
                          {active.parcel.map((g, idx) => (
                            <span key={idx} className="inline-flex items-center gap-1 rounded-lg border border-[#b98d48] bg-white px-2 py-0.5 text-xs font-black">
                              <Ic n={grantIcon(g)} s={1.25} />
                              <span>{grantText(g)}</span>
                            </span>
                          ))}
                        </div>
                        {active.claimed ? (
                          <div data-mail-parcel-claimed="1" className="inline-flex items-center gap-1 text-xs font-black text-emerald-800">
                            <Ic n="check" s={1.2} />
                            <span>{MAIL_UI.parcelClaimed}</span>
                          </div>
                        ) : (
                          <>
                            {staminaClaimBlocked && (
                              <div className="mb-1.5 rounded-lg bg-amber-100 px-2 py-1 text-[.7rem] font-black text-amber-900" data-mail-stamina-warning="1">
                                {MAIL_UI.parcelStaminaRoomNeeded(activeStaminaNeed)}
                              </div>
                            )}
                            <button
                              data-mail-claim-parcel={active.id}
                            className="btn g press w-full justify-center !py-1.5 text-xs font-black"
                            onClick={() => { setSelectedId(active.id); claimMailParcel(active.id); }}
                          >
                            <Ic n="parcel" s={1.4} />
                              <span>{MAIL_UI.claimParcelBtn}</span>
                            </button>
                          </>
                        )}
                      </div>
                    )}

                    {/* بخش تعاملی ۲: قرارداد خرید عمدهٔ پستی با ارسال مستقیم از مزرعه */}
                    {tr && (
                      <div className="rounded-xl border-2 border-[#b69254] bg-[#fff6df] p-2.5">
                        <div className="mb-1.5 flex flex-wrap items-center justify-between gap-1 text-xs font-black text-[#4f2f12]">
                          <span className="inline-flex items-center gap-1">
                            <Ic n={tr.good} s={1.45} />
                            <span>{MAIL_UI.dealBoxTitle}</span>
                          </span>
                          <span className="rounded bg-amber-200/70 px-1.5 py-0.5 text-[.68rem]">
                            {MAIL_UI.dueByDay} {en ? tr.dueDay : fa(tr.dueDay)}
                          </span>
                        </div>
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs font-extrabold">
                          <span>
                            {MAIL_UI.bagProgress}{' '}
                            <strong dir="ltr">{en ? `${haveQty}/${tr.qty}` : `${fa(haveQty)}/${fa(tr.qty)}`}</strong>
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <span>{MAIL_UI.rewardLabel}</span>
                            <Coin v={tr.reward} s={1.1} />
                          </span>
                        </div>
                        {tr.fulfilled ? (
                          <div data-mail-deal-done="1" className="inline-flex items-center gap-1 text-xs font-black text-emerald-800">
                            <Ic n="stamp" s={1.3} />
                            <span>{MAIL_UI.dealFulfilled}</span>
                          </div>
                        ) : expired ? (
                          <div className="text-xs font-black text-rose-800">{MAIL_UI.dealExpired}</div>
                        ) : (
                          <button
                            data-mail-fulfill-deal={active.id}
                            disabled={haveQty < tr.qty}
                            className="btn y press w-full justify-center !py-1.5 text-xs font-black"
                            onClick={() => { setSelectedId(active.id); fulfillMailDeal(active.id); }}
                          >
                            <Ic n="stamp" s={1.35} />
                            <span>{MAIL_UI.fulfillDealBtn}</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* دکمه‌های میان‌بر هوشمند متناسب با موضوع نامه */}
                  <div className="flex flex-wrap items-center justify-end gap-1.5 pt-1">
                    {active.questNpc && (
                      <button
                        data-mail-visit-npc={active.questNpc}
                        className="btn b press !px-3 !py-1 text-xs font-black"
                        onClick={() => handleVisitSender(active.questNpc!)}
                      >
                        <Ic n="cart" s={1.25} />
                        <span>{MAIL_UI.visitSenderBtn}</span>
                      </button>
                    )}
                    {active.template === 'market-boom' && (
                      <button
                        className="btn y press !px-3 !py-1 text-xs font-black"
                        onClick={() => { sfx.tap(); UI.modal = 'market'; notify(); }}
                      >
                        <Ic n="market" s={1.25} />
                        <span>{MAIL_UI.openMarketBtn}</span>
                      </button>
                    )}
                    {active.template === 'debt-due-soon' && (
                      <button
                        className="btn p press !px-3 !py-1 text-xs font-black"
                        onClick={() => { sfx.tap(); UI.modal = 'ledger'; notify(); }}
                      >
                        <Ic n="ledger" s={1.25} />
                        <span>{MAIL_UI.openLedgerBtn}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </Modal>
  );
}
