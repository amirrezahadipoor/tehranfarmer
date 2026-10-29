export interface SavedFarmMeta {
  day: number;
  coins: number;
  chapter: number;
  postgame: boolean;
}

const SAVE_KEYS = [
  'mazrae-rangi-save-v1',
  'mazrae-rangi-save-v1-bak1',
  'mazrae-rangi-save-v1-bak2',
  'mazrae-rangi-save-v1-bak',
  'mazrae-rangi-save-bak1',
  'mazrae-rangi-save-bak2',
  'mazrae-rangi-save-bak',
] as const;

/** Reads presentation metadata without trusting or hydrating the save into live game state. */
export function summarizeSave(raw: string): SavedFarmMeta | null {
  try {
    const parsed = JSON.parse(raw) as {
      day?: unknown;
      coins?: unknown;
      story?: { chapter?: unknown; postgame?: unknown };
    } | null;
    if (!parsed || typeof parsed.day !== 'number' || !Number.isFinite(parsed.day)) return null;
    const coins = typeof parsed.coins === 'number' && Number.isFinite(parsed.coins) ? parsed.coins : 0;
    const rawChapter = parsed.story?.chapter;
    const chapter = typeof rawChapter === 'number' && Number.isFinite(rawChapter) ? Math.floor(rawChapter) : 0;
    return {
      day: Math.max(1, Math.floor(parsed.day)),
      coins: Math.max(0, Math.floor(coins)),
      chapter: Math.max(0, Math.min(6, chapter)),
      postgame: parsed.story?.postgame === true,
    };
  } catch {
    return null;
  }
}

/** A corrupt primary save must not hide a readable backup on the title screen. */
export function readSavedFarmMeta(store?: Pick<Storage, 'getItem'>): SavedFarmMeta | null {
  const source = store ?? (typeof localStorage !== 'undefined' ? localStorage : null);
  if (!source) return null;
  for (const key of SAVE_KEYS) {
    try {
      const raw = source.getItem(key);
      if (!raw) continue;
      const meta = summarizeSave(raw);
      if (meta) return meta;
    } catch {
      // Storage denial or one malformed slot must not block the remaining backups.
    }
  }
  return null;
}
