// ===== رویدادهای فصلی با اثر واقعی بر اقتصاد، آب، خاک، دام و اعتبار =====
import {
  ANIMALS, EVENT_CHANCE, EVENT_DROUGHT_WATER, EVENT_FESTIVAL_COINS,
  EVENT_GUEST_DEMAND, EVENT_HOT_DEMAND, EVENT_MIN_DAY, EVENT_YALDA_STANDING, GOODS,
} from '../data';
import { S, grantGoodWithMailOverflow, mkOf, notify, notifyWorldEventMail, ownedFarms, plotsForFarm, stamCap, toast } from '../state';
import { addStanding } from './debt';
import { chance, randInt } from '../rng';
import { GT } from '../../strings/gameText';

export type EventId = 'festival' | 'drought' | 'flood' | 'guest' | 'hotmarket' | 'yalda';

export interface ActiveEvent {
  id: EventId;
  day: number;
  icon: string;
  title: string;
  desc: string;
}

export const EVENT_IDS: EventId[] = ['festival', 'drought', 'flood', 'guest', 'hotmarket', 'yalda'];

const META: Record<EventId, { icon: string; title: () => string; desc: () => string }> = {
  festival: { icon: 'star', title: () => GT.evFestivalTitle, desc: () => GT.evFestivalDesc },
  drought: { icon: 'sun', title: () => GT.evDroughtTitle, desc: () => GT.evDroughtDesc },
  flood: { icon: 'rain', title: () => GT.evFloodTitle, desc: () => GT.evFloodDesc },
  guest: { icon: 'cart', title: () => GT.evGuestTitle, desc: () => GT.evGuestDesc },
  hotmarket: { icon: 'coin', title: () => GT.evHotTitle, desc: () => GT.evHotDesc },
  yalda: { icon: 'pomegranate', title: () => GT.evYaldaTitle, desc: () => GT.evYaldaDesc },
};

/** بازگردانی getterهای زندهٔ عنوان/توضیح رویداد پس از بارگذاری از JSON سِیو */
export function hydrateEvent(raw: ActiveEvent | null | undefined): ActiveEvent | null {
  if (!raw || !META[raw.id]) return null;
  const id = raw.id;
  return {
    id,
    day: raw.day,
    icon: META[id].icon,
    get title() { return META[id].title(); },
    get desc() { return META[id].desc(); },
  };
}

/** اجرای قطعی یک رویداد فصلی و ثبت آن روی وضعیت امروز */
export function triggerEvent(id: EventId): ActiveEvent {
  const ev = hydrateEvent({ id, day: S.day, icon: META[id].icon, title: '', desc: '' })!;
  S.event = ev;

  switch (id) {
    case 'festival':
      S.stamina = stamCap();
      S.coins += EVENT_FESTIVAL_COINS;
      break;
    case 'drought':
      S.weather = 0;
      if (mkOf('sprinkler') < 3) {
        for (const farm of ownedFarms()) {
          for (const p of plotsForFarm(farm)) {
            if (p.st > 0) p.water = Math.max(0, p.water - EVENT_DROUGHT_WATER);
          }
        }
      }
      break;
    case 'flood':
      S.weather = 2;
      for (const farm of ownedFarms()) {
        for (const p of plotsForFarm(farm)) {
          if (p.st > 0) {
            p.water = 1;
            p.dry = 0;
          }
        }
      }
      grantGoodWithMailOverflow('fingerling', 1, 'rancher', 'event-flood');
      break;
    case 'guest':
      for (const g of GOODS) {
        S.dem[g.id] = Math.min(1.6, (S.dem[g.id] ?? 1) * EVENT_GUEST_DEMAND);
      }
      S.seeds.carrot = (S.seeds.carrot ?? 0) + 2;
      break;
    case 'hotmarket':
      for (const g of GOODS) {
        S.dem[g.id] = Math.min(1.75, (S.dem[g.id] ?? 1) * EVENT_HOT_DEMAND);
      }
      break;
    case 'yalda':
      S.stamina = stamCap();
      grantGoodWithMailOverflow('pomegranate', 2, 'grandma', 'event-yalda');
      for (const a of S.animals) {
        if (a.sex === 'f' && a.grown <= 0) {
          a.ready = Math.min(ANIMALS[a.kind].cap, a.ready + 2);
        }
      }
      addStanding(EVENT_YALDA_STANDING);
      break;
  }

  toast(ev.icon, ev.title);
  notifyWorldEventMail(id, ev.title, ev.desc);
  notify();
  return ev;
}

/** قرعه‌کشی روزانهٔ رویداد فصلی متناسب با فصل سال */
export function processSeasonalEvent(sn: number) {
  S.event = null;
  if (S.day < EVENT_MIN_DAY) return;
  // آغاز زمستان (اولین شب زمستان = شب یلدا) و شب پایانی زمستان جشن یلدا دارند
  if (sn === 3 && (((S.day - 1) % 7) === 0 || S.day % 28 === 0)) {
    triggerEvent('yalda');
    return;
  }
  if (!chance(EVENT_CHANCE)) return;
  const seasonalPool: Record<number, EventId[]> = {
    0: ['festival', 'flood', 'guest', 'hotmarket'],
    1: ['drought', 'hotmarket', 'guest'],
    2: ['guest', 'hotmarket'],
    3: ['yalda', 'guest', 'hotmarket'],
  };
  const pool = seasonalPool[sn] ?? EVENT_IDS;
  triggerEvent(pool[randInt(pool.length)]);
}
