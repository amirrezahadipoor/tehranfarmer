import { dot, ln, oval, shape, type Ctx } from './art';

/** ده گوهر مستقل با سیلوئت، رنگ و وجه‌های متفاوت؛ برای انبار، بازار و جایزهٔ معدن. */
export function drawGem(c: Ctx, id: string) {
  const palettes: Record<string, [string, string, string]> = {
    quartz: ['#dff6ff', '#93d5ed', '#ffffff'], turquoise: ['#20c7b5', '#0f8f89', '#a7f3d0'],
    amber: ['#ffb629', '#d56a12', '#fff1a8'], amethyst: ['#a875e8', '#6936a8', '#ead7ff'],
    garnet: ['#a62c45', '#66172d', '#f191a5'], opal: ['#8de4dc', '#8274d8', '#ffd2ec'],
    sapphire: ['#367cd8', '#173f92', '#a9d8ff'], emerald: ['#27b975', '#106443', '#a2f2bf'],
    ruby: ['#e43d58', '#921b36', '#ffb3bd'], diamond: ['#eafcff', '#8fc7e2', '#ffffff'],
  };
  const [base, dark, light] = palettes[id] ?? palettes.quartz;
  if (id === 'amber') {
    oval(c, 0, 1, 17, 21, base, -0.12, 3, 0.08);
    shape(c, [[-5, 8], [0, -10], [7, 5]], { fill: light, line: 0, smooth: false });
    dot(c, -5, -3, 2.2, dark);
    return;
  }
  if (id === 'turquoise') {
    shape(c, [[-18, 13], [-13, -13], [-2, -20], [14, -13], [18, 12], [3, 20]], { fill: base, smooth: false, line: 2.8 });
    ln(c, [[-12, -8], [-2, 1], [5, -7], [12, 7]], 2.2, '#6b4b34');
    ln(c, [[-8, 12], [1, 3], [12, 12]], 1.8, light);
    return;
  }
  if (id === 'opal') {
    oval(c, 0, 1, 18, 22, base, 0.12, 2.8, 0.05);
    shape(c, [[-11, 4], [-4, -14], [4, -8], [12, 7], [1, 16]], { fill: light, line: 0, smooth: false });
    shape(c, [[-7, -11], [2, -16], [10, -5], [0, 1]], { fill: dark, line: 0, smooth: false });
    oval(c, -6, -6, 3.5, 6, 'rgba(255,255,255,.72)', 0.4, 0);
    return;
  }
  const tall = id === 'quartz' || id === 'emerald';
  const wide = id === 'diamond' || id === 'sapphire';
  const top = tall ? -25 : -19, side = wide ? 24 : 18, bottom = tall ? 23 : 20;
  shape(c, [[-side, -4], [-side * 0.55, top], [side * 0.42, top + 2], [side, -3], [side * 0.45, bottom], [-side * 0.5, bottom - 2]], { fill: base, smooth: false, line: 2.8 });
  shape(c, [[-side, -4], [0, 2], [-side * 0.55, top]], { fill: light, line: 1.2, smooth: false });
  shape(c, [[0, 2], [side, -3], [side * 0.45, bottom]], { fill: dark, line: 1.2, smooth: false });
  ln(c, [[-side * 0.55, top], [0, 2], [side * 0.42, top + 2]], 1.5, light);
  ln(c, [[0, 2], [-side * 0.5, bottom - 2]], 1.4, light);
  if (id === 'diamond') ln(c, [[-side, -4], [side, -3]], 1.8, '#ffffff');
  if (id === 'ruby') dot(c, -5, -8, 2.4, '#ffd9df');
  if (id === 'garnet') shape(c, [[-7, -11], [2, -15], [8, -6], [-1, -2]], { fill: light, line: 0, smooth: false });
}
