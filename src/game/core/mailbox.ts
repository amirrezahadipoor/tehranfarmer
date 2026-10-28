// Hand-Drawn Village Postbox & Interactive Letter Engine
// Zero interference with global PRNG (`rnd()`): uses pure deterministic hashes so all seeded campaign simulations
// (`sim:balance`, `audit-playthrough`, `audit-deep-loops`) remain 100.000% bit-identical while delivering rich live mail!
import { CROPS, CROP, GOOD, XP, type CropId } from '../data';
import { S, addGood, addStat, addXp, farmLevel, invCap, invCount, notify, saveGame, season, stamCap, toast } from '../state';
import { activeNote, addStanding, daysToDue } from './debt';
import { NPC_QUEST_SPECS, npcHasQuestMarker } from '../../story/npcQuests';
import { SOCIAL_NPC_IDS, villagerHearts } from '../../story/socialVillagers';
import { sfx } from '../sound';
import {
  MAIL_UI, type MailEntry, type MailItemGrant, type MailSenderId, type MailState,
} from '../../strings/mailText';

// رفع C-6: سقف سخت روی صندوق (۴۰ نامه) و روی کلیدهای ارسال‌شده (۳۰۰ کلید).
// اندازه‌گیری ممیزی: با ۱۰۴۰ نامه، سِیو روی روز ۱۲۰۰ به ~۳۰۷KB می‌رسید که برای
// گوشی‌های ضعیف و حافظهٔ محدود وب‌ویو خطرناک است.
const MAX_MAIL_ARCHIVE = 40;
const MAX_SENT_KEYS = 300;

let suppressMailToast = false;
export function setMailSilentMode(silent: boolean) {
  suppressMailToast = silent;
}

/** Deterministic non-RNG hash so mail generation NEVER perturbs `rnd()` sequences in balance bots */
function detHash(a: number, b: number): number {
  let h = (Math.imul(a | 0, 2654435761) ^ Math.imul(b | 0, 2246822519)) >>> 0;
  h ^= h >>> 15;
  h = Math.imul(h, 2779517777) >>> 0;
  return (h ^ (h >>> 13)) >>> 0;
}

export function ensureMailState(): MailState {
  if (!S.mail || !Array.isArray(S.mail.inbox) || !S.mail.sentKeys) {
    S.mail = { inbox: [], sentKeys: {}, lastDealDay: 0 };
  }
  return S.mail;
}

function pruneMailArchive(ms: MailState) {
  const removable = (m: MailEntry, allowUnread: boolean) => {
    const hasUnclaimed = Boolean(m.parcel?.length && !m.claimed);
    const hasOpenDeal = Boolean(m.trade && !m.trade.fulfilled && S.day <= m.trade.dueDay);
    if (m.pinned || hasUnclaimed || hasOpenDeal) return false;
    return allowUnread || m.read;
  };
  // مرحلهٔ ۱: نامه‌های خوانده‌شده (قدیمی‌ترین اول)
  for (let i = ms.inbox.length - 1; i >= 0 && ms.inbox.length > MAX_MAIL_ARCHIVE; i--) {
    if (removable(ms.inbox[i], false)) ms.inbox.splice(i, 1);
  }
  // مرحلهٔ ۲ (سقف سخت): اگر هنوز بالای سقف است، نامه‌های خوانده‌نشدهٔ بی‌محتوا هم حذف می‌شوند
  // تا صندوق هیچ‌گاه از MAX_MAIL_ARCHIVE بزرگ‌تر نشود و رشد سِیو بی‌پایان نباشد.
  for (let i = ms.inbox.length - 1; i >= 0 && ms.inbox.length > MAX_MAIL_ARCHIVE; i--) {
    if (removable(ms.inbox[i], true)) ms.inbox.splice(i, 1);
  }
  if (ms.inbox.length > MAX_MAIL_ARCHIVE) {
    // بدترین حالت (همه سنجاق‌شده): قدیمی‌ترین‌ها را با حفظ سنجاق حذف نکن، فقط ببُر.
    ms.inbox.splice(0, ms.inbox.length - MAX_MAIL_ARCHIVE);
  }
}

/** رفع C-6: کلیدهای ارسال‌شده (sentKeys) با گذشت بازی به هزاران کلید می‌رسیدند */
function pruneSentKeys(ms: MailState) {
  const keys = Object.keys(ms.sentKeys ?? {});
  if (keys.length <= MAX_SENT_KEYS) return;
  // کلیدها الگوی «...-<day>» دارند؛ قدیمی‌ترین‌ها (کوچک‌ترین روز) اول حذف می‌شوند
  const dayOf = (k: string) => {
    const m = /-(\d+)$/.exec(k);
    return m ? Number(m[1]) : 0;
  };
  keys.sort((a, b) => dayOf(a) - dayOf(b));
  for (const k of keys.slice(0, keys.length - MAX_SENT_KEYS)) delete ms.sentKeys[k];
}

/** Idempotently pushes a letter into `S.mail.inbox` keyed by `dedupeKey` */
export function deliverMail(
  dedupeKey: string,
  entry: Omit<MailEntry, 'id' | 'day' | 'season' | 'read'>,
  announce = true,
): MailEntry | null {
  const ms = ensureMailState();
  if (ms.sentKeys[dedupeKey]) return null;
  ms.sentKeys[dedupeKey] = true;
  const full: MailEntry = {
    ...entry,
    id: dedupeKey,
    day: S.day,
    season: season(),
    read: false,
  };
  ms.inbox.unshift(full);
  pruneMailArchive(ms);
  pruneSentKeys(ms);
  if (announce && !suppressMailToast) {
    toast('mail', MAIL_UI.newMailToast);
  }
  return full;
}

/** Count of unread OR actionable (unclaimed parcel / fulfillable trade deal) letters */
export function unreadMailCount(): number {
  const ms = S.mail;
  if (!ms || !Array.isArray(ms.inbox)) return 0;
  let n = 0;
  for (const m of ms.inbox) {
    if (!m.read) { n++; continue; }
    if (m.parcel?.length && !m.claimed) { n++; continue; }
    if (m.trade && !m.trade.fulfilled && S.day <= m.trade.dueDay && (S.inv[m.trade.good] ?? 0) >= m.trade.qty) n++;
  }
  return n;
}

export function markMailRead(id: string) {
  const ms = ensureMailState();
  const item = ms.inbox.find((m) => m.id === id);
  if (item && !item.read) {
    item.read = true;
    saveGame();
    notify();
  }
}

export function markAllMailRead() {
  const ms = ensureMailState();
  let changed = false;
  for (const m of ms.inbox) {
    if (!m.read) { m.read = true; changed = true; }
  }
  if (changed) {
    saveGame();
    notify();
  }
}

export function togglePinMail(id: string) {
  const ms = ensureMailState();
  const item = ms.inbox.find((m) => m.id === id);
  if (!item) return;
  item.pinned = !item.pinned;
  sfx.tap();
  saveGame();
  notify();
}

export function mailItemLabel(id: string): string {
  return GOOD[id]?.fa ?? CROP[id]?.fa ?? id;
}

/** Claims an enclosed gift parcel attached to a letter */
export function claimMailParcel(id: string): boolean {
  const ms = ensureMailState();
  const item = ms.inbox.find((m) => m.id === id);
  if (!item || !item.parcel?.length || item.claimed) return false;
  const bagNeeded = item.parcel.reduce((acc, g) => acc + (g.kind === 'good' ? g.qty : 0), 0);
  if (bagNeeded > 0 && invCount() + bagNeeded > invCap()) {
    sfx.err();
    toast('bag', MAIL_UI.bagFullToast);
    return false;
  }
  for (const g of item.parcel) {
    if (g.kind === 'coin') {
      S.coins += g.qty;
    } else if (g.kind === 'seed' && g.id) {
      S.seeds[g.id] = (S.seeds[g.id] ?? 0) + g.qty;
    } else if (g.kind === 'good' && g.id) {
      addGood(g.id, g.qty);
    } else if (g.kind === 'fert') {
      S.fert += g.qty;
    } else if (g.kind === 'stamina') {
      S.stamina = Math.min(stamCap(), S.stamina + g.qty);
    }
  }
  item.claimed = true;
  item.read = true;
  sfx.paper();
  sfx.coin();
  toast('parcel', MAIL_UI.parcelToast);
  saveGame();
  notify();
  return true;
}

/** Ships goods directly via village courier to fulfill a Mail-Order Wholesale Trade Offer */
export function fulfillMailDeal(id: string): boolean {
  const ms = ensureMailState();
  const item = ms.inbox.find((m) => m.id === id);
  const tr = item?.trade;
  if (!item || !tr || tr.fulfilled || S.day > tr.dueDay) {
    sfx.err();
    return false;
  }
  const have = S.inv[tr.good] ?? 0;
  if (have < tr.qty) {
    sfx.err();
    return false;
  }
  S.inv[tr.good] = have - tr.qty;
  if (S.inv[tr.good] <= 0) delete S.inv[tr.good];
  S.coins += tr.reward;
  S.earned += tr.reward;
  addXp(tr.xp || Math.round(tr.reward / XP.sellPer));
  if (tr.standing > 0) addStanding(tr.standing);
  addStat('contracts', 1);
  tr.fulfilled = true;
  item.read = true;
  sfx.coin();
  toast('coin', MAIL_UI.dealDoneToast);
  saveGame();
  notify();
  return true;
}

/** Generates an organic Mail-Order Trade Deal tailored to the player's current level & season */
export function rollMailTradeOffer(force = false): MailEntry | null {
  const ms = ensureMailState();
  if (!force && S.day - ms.lastDealDay < 3) return null;
  const lv = farmLevel();
  const sn = season();
  const inSeason = CROPS.filter((c) => c.lv <= lv && c.seasons.includes(sn));
  const pool = inSeason.length ? inSeason : CROPS.slice(0, 2);
  const h = detHash(S.day, lv + sn * 31);
  const pick = pool[h % pool.length] ?? CROPS[0];
  const qty = 4 + (h % 6);
  const baseUnit = GOOD[pick.id]?.base ?? pick.price;
  const reward = Math.max(24, Math.round(baseUnit * qty * 1.32));
  const senders: MailSenderId[] = ['sara', 'herald', 'rancher', 'engineer'];
  const sender = senders[(h >>> 4) % senders.length];
  ms.lastDealDay = S.day;
  return deliverMail(`deal:day:${S.day}:${pick.id}`, {
    category: 'trade',
    sender,
    template: 'mail-trade',
    params: { good: pick.id, qty, amount: reward, dueDay: S.day + 5 },
    trade: {
      good: pick.id,
      qty,
      reward,
      xp: Math.max(8, Math.round(reward / XP.sellPer)),
      standing: 2,
      dueDay: S.day + 5,
      fulfilled: false,
    },
  });
}

/** Hooks world events, market booms, animal births & completed builds into illustrated letters */
export function notifyWorldEventMail(eventId: string, titleFa: string, descFa: string, titleEn?: string, descEn?: string) {
  deliverMail(`event:${S.day}:${eventId}`, {
    category: 'world',
    sender: eventId === 'hotmarket' || eventId === 'guest' ? 'sara' : eventId === 'yalda' ? 'grandma' : 'herald',
    template: 'world-event',
    params: { eventId, titleFa, descFa, titleEn: titleEn ?? titleFa, descEn: descEn ?? descFa },
  }, false);
}

export function notifyMarketBoomMail(goodId: string) {
  deliverMail(`boom:${S.day}:${goodId}`, {
    category: 'trade',
    sender: 'sara',
    template: 'market-boom',
    params: { good: goodId },
  }, false);
}

let overflowParcelSeq = 0;

/** Grants a reward good safely: fits what can enter `S.inv` now and mails any overflow in a sealed Postbox parcel so 0 items are ever lost! */
export function grantGoodWithMailOverflow(goodId: string, qty: number, sender: MailSenderId = 'herald', tag = 'reward'): number {
  const got = addGood(goodId, qty);
  const rem = qty - got;
  if (rem > 0) {
    const ms = ensureMailState();
    overflowParcelSeq += 1;
    let key = `overflow:${tag}:${S.day}:${goodId}:${ms.inbox.length}:${overflowParcelSeq}`;
    while (ms.sentKeys[key]) {
      overflowParcelSeq += 1;
      key = `overflow:${tag}:${S.day}:${goodId}:${ms.inbox.length}:${overflowParcelSeq}`;
    }
    deliverMail(key, {
      category: 'quest',
      sender,
      template: 'overflow-parcel',
      params: { good: goodId, qty: rem },
      parcel: [{ kind: 'good', id: goodId, qty: rem }],
    });
  }
  return got;
}

export function notifyFarmMilestoneMail(kind: 'baby' | 'build', label = '', buildKind = '', buildKey = '') {
  const key = kind === 'baby' ? `baby:week:${Math.ceil(S.day / 7)}` : `build:${S.day}:${buildKind || label}:${buildKey}`;
  deliverMail(key, {
    category: 'world',
    sender: kind === 'baby' ? 'rancher' : 'engineer',
    template: 'farm-milestone',
    params: { kind, label, buildKind, buildKey },
  }, false);
}

/** Synchronizes Story Chapters, Debt Ledger Notices, Estate Deeds, Seasonal Gazettes, Villager Quests & Friendship Parcels */
export function syncMailboxState(announce = true) {
  ensureMailState();

  // 1. Story Chapter Milestones (Chapters 1..8)
  const ch = S.story?.chapter ?? 0;
  if (ch >= 1) {
    const chSenders: MailSenderId[] = ['grandma', 'jahangir', 'sara', 'rancher', 'engineer', 'grandma', 'sara', 'jahangir'];
    const giftCrop: CropId = CROPS.find((c) => c.lv <= farmLevel() && c.seasons.includes(season()))?.id ?? 'wheat';
    deliverMail(`story:chapter:${ch}`, {
      category: 'story',
      sender: chSenders[(ch - 1) % chSenders.length],
      template: 'chapter-milestone',
      params: { chapter: ch },
      parcel: [{ kind: 'seed', id: giftCrop, qty: 2 }, { kind: 'stamina', qty: 20 }],
    }, announce);
  }

  // 3. Debt Promissory Note Receipts & Due-Soon Warnings
  const d = S.debt;
  if (d) {
    for (let nIdx = 1; nIdx <= d.noteIdx; nIdx++) {
      deliverMail(`debt:paid:${nIdx}`, {
        category: 'story',
        sender: 'jahangir',
        template: 'debt-note-cleared',
        params: { chapter: nIdx },
        parcel: [{ kind: 'fert', qty: 2 }],
      }, announce);
    }
    const curNote = activeNote();
    const rem = daysToDue();
    if (curNote && rem <= 2 && rem >= 0) {
      deliverMail(`debt:due:${curNote.chapter}:${S.day}`, {
        category: 'story',
        sender: 'jahangir',
        template: 'debt-due-soon',
        params: { chapter: curNote.chapter, daysLeft: rem, amount: Math.round(d.remaining) },
      }, announce);
    }
  }

  // 4. Estate Land Deeds (Northern Meadow & Sunlit Valley)
  if (S.lv.land >= 1) {
    deliverMail('deed:north', {
      category: 'story',
      sender: 'engineer',
      template: 'estate-deed',
      params: { estate: 'north' },
      parcel: [{ kind: 'seed', id: 'wheat', qty: 3 }],
    }, announce);
  }
  if (S.lv.land >= 3) {
    deliverMail('deed:valley', {
      category: 'story',
      sender: 'grandma',
      template: 'estate-deed',
      params: { estate: 'valley' },
      parcel: [{ kind: 'seed', id: 'strawberry', qty: 2 }],
    }, announce);
  }

  // 5. Postgame Golden Freedom Charter
  if (S.story?.postgame) {
    deliverMail('story:postgame-freedom', {
      category: 'story',
      sender: 'grandma',
      template: 'postgame-freedom',
      parcel: [{ kind: 'coin', qty: 250 }, { kind: 'fert', qty: 4 }],
    }, announce);
  }

  // 6. Seasonal Gazette on Dawn of Each Season
  const yr = Math.floor((S.day - 1) / 28) + 1;
  const sn = season();
  if (S.day >= 2 || sn > 0) {
    deliverMail(`gazette:y${yr}:s${sn}`, {
      category: 'world',
      sender: 'herald',
      template: 'season-gazette',
    }, false);
  }

  // 7. Ready Villager Quests Dispatches (`npcQuests.ts`)
  for (const q of NPC_QUEST_SPECS) {
    if (q.canActivate() && !S.story?.seen[`${q.id}-done`] && npcHasQuestMarker(q.who)) {
      deliverMail(`quest:${q.id}`, {
        category: 'quest',
        sender: q.who,
        template: 'npc-quest-invite',
        questNpc: q.who,
        questTitleFa: q.titleFa,
        questTitleEn: q.titleEn,
      }, false);
    }
  }

  // 8. Villager Friendship Parcels at 2 Hearts & 5 Hearts
  const favSeeds: Record<Exclude<MailSenderId, 'herald'>, MailItemGrant[]> = {
    grandma: [{ kind: 'seed', id: 'strawberry', qty: 2 }, { kind: 'stamina', qty: 25 }],
    sara: [{ kind: 'coin', qty: 45 }, { kind: 'seed', id: 'tomato', qty: 2 }],
    rancher: [{ kind: 'good', id: 'feed', qty: 4 }, { kind: 'stamina', qty: 20 }],
    engineer: [{ kind: 'fert', qty: 3 }, { kind: 'stamina', qty: 20 }],
    jahangir: [{ kind: 'coin', qty: 65 }, { kind: 'fert', qty: 2 }],
  };
  for (const who of SOCIAL_NPC_IDS) {
    const hearts = villagerHearts(who);
    for (const tier of [2, 5] as const) {
      if (hearts >= tier) {
        deliverMail(`friend:${who}:${tier}`, {
          category: 'quest',
          sender: who,
          template: 'friendship-parcel',
          params: { hearts: tier },
          parcel: favSeeds[who],
        }, announce);
      }
    }
  }

  // 9. Periodic Mail-Order Trade Contract Offer (from Day 2 onwards)
  if (S.day >= 2) {
    rollMailTradeOffer(false);
  }

  // 10. Starter Welcome Letter from Grandma Nosrat (unshifted last on Day 1 so it sits right on top of the postbox!)
  deliverMail('story:welcome', {
    category: 'story',
    sender: 'grandma',
    template: 'welcome-homestead',
    parcel: [
      { kind: 'seed', id: 'wheat', qty: 2 },
      { kind: 'good', id: 'feed', qty: 1 },
      { kind: 'coin', qty: 20 },
    ],
  }, false);
}
