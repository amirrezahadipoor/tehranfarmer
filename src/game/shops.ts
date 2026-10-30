import type { CharId } from '../story/types';
import { UI, notify } from './state';

export const SHOP_IDS = ['seed', 'market', 'work', 'animal', 'carp', 'estate'] as const;
export type ShopId = (typeof SHOP_IDS)[number];
export type ShopkeeperId = Exclude<CharId, 'narrator' | 'player' | 'jahangir'>;

export interface ShopMeta {
  id: ShopId;
  keeper: ShopkeeperId;
  icon: string;
  accent: string;
  dark: string;
}

/** واحدِ منبع حقیقت برای هر شش داخل‌فروشگاه؛ جهانگیر عمداً در میدان شهر می‌ماند. */
export const SHOP_META: Record<ShopId, ShopMeta> = {
  seed: { id: 'seed', keeper: 'grandma', icon: 'seedshop', accent: '#6f9f4a', dark: '#314d2b' },
  market: { id: 'market', keeper: 'sara', icon: 'market', accent: '#d77a46', dark: '#6e3327' },
  work: { id: 'work', keeper: 'engineer', icon: 'workshop', accent: '#5485a6', dark: '#293f55' },
  animal: { id: 'animal', keeper: 'rancher', icon: 'animalshop', accent: '#b56d3e', dark: '#5b3526' },
  carp: { id: 'carp', keeper: 'carpenter', icon: 'hammer', accent: '#a87642', dark: '#503526' },
  estate: { id: 'estate', keeper: 'estateAgent', icon: 'house', accent: '#667b9f', dark: '#303b59' },
};

export const isShopId = (value: unknown): value is ShopId =>
  typeof value === 'string' && (SHOP_IDS as readonly string[]).includes(value);

/** ورود فیزیکی از میدان همیشه به داخل‌فروشگاه و دو انتخاب روشن می‌رسد. */
export function openShop(id: ShopId) {
  UI.activeShop = id;
  UI.shopPanel = 'lobby';
  UI.afterModal = null;
  UI.info = null;
  UI.modal = 'shop';
  notify();
}
