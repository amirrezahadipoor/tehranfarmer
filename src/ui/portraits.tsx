// پرتره‌های دست‌کش شخصیت‌ها — همه با SVG (بدون تصویر/ایموجی بیرونی)
export type PortraitId = 'player' | 'jahangir' | 'engineer' | 'grandma' | 'sara' | 'rancher' | 'carpenter' | 'estateAgent' | 'narrator';

const P: Record<PortraitId, { skin: string; shirt: string; hat?: string; hair: string; beard?: string; blush?: string }> = {
  player: { skin: '#e8b88a', shirt: '#8fd35a', hat: '#ffd93b', hair: '#3f2a1c' },
  jahangir: { skin: '#d9a06a', shirt: '#7a4b2c', hat: '#503426', hair: '#2b1a10', beard: '#3a2415' },
  engineer: { skin: '#f0c9a0', shirt: '#7cc8f4', hat: '#dfe8ef', hair: '#4a3a2a' },
  grandma: { skin: '#e6c2a2', shirt: '#d6b8ff', hair: '#e8e4dc' },
  sara: { skin: '#efc6a0', shirt: '#ff8b7a', hair: '#241811' },
  rancher: { skin: '#d9a879', shirt: '#c9b99a', hat: '#8a6b48', hair: '#5a4230', beard: '#6b5238' },
  carpenter: { skin: '#d8a076', shirt: '#b8783f', hat: '#6d4b32', hair: '#3d2b22', beard: '#5b3a28' },
  estateAgent: { skin: '#edbd98', shirt: '#667b9f', hat: '#303b59', hair: '#34251f' },
  narrator: { skin: '#e8d7bb', shirt: '#fff4d8', hair: '#cfc0a8' },
};

export function Portrait({ id, size = 8 }: { id: PortraitId; size?: number }) {
  const c = P[id] ?? P.player;
  const s = size;
  return (
    <svg width={`${s}rem`} height={`${s}rem`} viewBox="0 0 100 100" aria-hidden className="shrink-0">
      <ellipse cx="50" cy="92" rx="34" ry="16" fill={c.shirt} stroke="#503426" strokeWidth="2.5" />
      {id === 'carpenter' && <path d="M35 74h30l7 28H28z" fill="#7a4b2c" stroke="#503426" strokeWidth="2" />}
      {id === 'estateAgent' && <path d="M39 73l11 12l11-12l7 23H32z" fill="#f4e7ce" stroke="#503426" strokeWidth="2" />}
      <rect x="42" y="66" width="16" height="12" rx="4" fill={c.skin} stroke="#503426" strokeWidth="2" />
      <ellipse cx="50" cy="46" rx="26" ry="28" fill={c.skin} stroke="#503426" strokeWidth="2.5" />
      {id === 'grandma' && <path d="M24 44 q4 -26 26 -26 q22 0 26 26 q-26 -12 -52 0" fill={c.hair} stroke="#503426" strokeWidth="2" />}
      {id === 'sara' && <path d="M22 52 q0 -34 28 -34 q28 0 28 34 q-8 -18 -28 -18 q-20 0 -28 18" fill={c.hair} stroke="#503426" strokeWidth="2" />}
      {id === 'player' && <>
        <path d="M22 34 q28 -14 56 0 q-4 -14 -28 -14 q-24 0 -28 14" fill={c.hat} stroke="#503426" strokeWidth="2.5" />
        <rect x="18" y="32" width="64" height="6" rx="3" fill={c.hat} stroke="#503426" strokeWidth="2" />
      </>}
      {id === 'jahangir' && <>
        <path d="M24 36 q26 -12 52 0" stroke={c.hair} strokeWidth="6" fill="none" />
        <path d="M30 66 q20 14 40 0 q-6 16 -20 16 q-14 0 -20 -16" fill={c.beard} stroke="#503426" strokeWidth="2" />
        <path d="M62 18 l10 -10" stroke="#503426" strokeWidth="3" />
      </>}
      {id === 'engineer' && <>
        <rect x="20" y="26" width="60" height="10" rx="3" fill={c.hat} stroke="#503426" strokeWidth="2" />
        <path d="M40 26 q10 -12 20 0" fill={c.hat} stroke="#503426" strokeWidth="2" />
        <circle cx="35" cy="48" r="9" fill="none" stroke="#503426" strokeWidth="2" />
        <circle cx="65" cy="48" r="9" fill="none" stroke="#503426" strokeWidth="2" />
        <path d="M44 48 h12" stroke="#503426" strokeWidth="2" />
      </>}
      {id === 'rancher' && <>
        <ellipse cx="50" cy="28" rx="32" ry="9" fill={c.hat} stroke="#503426" strokeWidth="2.5" />
        <path d="M32 64 q18 12 36 0 q-4 18 -18 18 q-14 0 -18 -18" fill={c.beard} stroke="#503426" strokeWidth="2" />
      </>}
      {id === 'carpenter' && <>
        <path d="M23 34q27-19 54 0v7H23z" fill={c.hat} stroke="#503426" strokeWidth="2.5" />
        <path d="M30 63q20 15 40 0q-5 18-20 18q-15 0-20-18" fill={c.beard} stroke="#503426" strokeWidth="2" />
        <path d="M69 78l8-15" stroke="#d8b273" strokeWidth="4" />
      </>}
      {id === 'estateAgent' && <>
        <path d="M23 51q-2-33 27-33q29 0 27 33q-8-19-27-19q-19 0-27 19" fill={c.hair} stroke="#503426" strokeWidth="2.5" />
        <path d="M27 38q23-15 46 0" stroke={c.hat} strokeWidth="5" fill="none" />
        <circle cx="28" cy="54" r="3" fill="#d5ae58" /><circle cx="72" cy="54" r="3" fill="#d5ae58" />
      </>}
      {id !== 'engineer' && <>
        <circle cx="40" cy="46" r="3.2" fill="#2b1a10" />
        <circle cx="60" cy="46" r="3.2" fill="#2b1a10" />
      </>}
      <path d="M42 58 q8 6 16 0" stroke="#503426" strokeWidth="2.4" fill="none" strokeLinecap="round" />
    </svg>
  );
}
