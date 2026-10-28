// ===== پالت رنگی استاندارد و پالت پرکنتراست مخصوص کوررنگی + سنجش نسبت کنتراست WCAG 2.1 (P7-04) =====
export interface ThemePalette {
  ink: string;
  paper: string;
  paperDark: string;
  paperDarkText: string;
  btnG: string;
  btnY: string;
  btnR: string;
  btnB: string;
  btnP: string;
}

export const DEFAULT_PALETTE: ThemePalette = {
  ink: '#503426',
  paper: '#fff4d8',
  paperDark: '#7a4b2c',
  paperDarkText: '#fff4d8',
  btnG: '#8fd35a',
  btnY: '#ffd93b',
  btnR: '#ff9685',
  btnB: '#7cc8f4',
  btnP: '#d6b8ff',
};

// پالت Okabe-Ito ایمن برای سرخ‌سبزکوری (دوترا/پروتانوپی) با کنتراست AAA بالای ۷:۱
export const COLORBLIND_PALETTE: ThemePalette = {
  ink: '#1f140d',
  paper: '#fff9eb',
  paperDark: '#2b2540',
  paperDarkText: '#fff9eb',
  btnG: '#56b4e9',
  btnY: '#f0e442',
  btnR: '#f4a261',
  btnB: '#8ecae6',
  btnP: '#dec9ff',
};

function channelLum(v255: number): number {
  const s = v255 / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

export function relativeLuminance(hex: string): number {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return 0.2126 * channelLum(r) + 0.7152 * channelLum(g) + 0.0722 * channelLum(b);
}

export function contrastRatio(fgHex: string, bgHex: string): number {
  const l1 = relativeLuminance(fgHex);
  const l2 = relativeLuminance(bgHex);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}
