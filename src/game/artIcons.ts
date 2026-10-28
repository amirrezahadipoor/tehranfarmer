import { INK, box, cached, circ, cloud, dot, ell, ln, oval, shape, sun, drawProduce, drawTool, type Ctx } from './art';
import { drawAnimalIcon } from './animalArt';

function leafIcon(c: Ctx) {
  shape(c, [[0, -24], [18, -6], [14, 14], [0, 24], [-14, 14], [-18, -6]], { fill: '#f08a24', hatch: 0.12 });
  ln(c, [[0, 24], [0, -12]], 2.5, '#a8501a'); ln(c, [[0, 6], [9, -2]], 2, '#a8501a'); ln(c, [[0, 10], [-9, 2]], 2, '#a8501a');
}

export function drawIcon(c: Ctx, name: string) {
  if (!name || typeof name !== 'string') return;
  if (name.startsWith('seed:')) {
    shape(c, [[-20, -26], [20, -26], [22, 28], [-22, 28]], { fill: '#fff4d8', smooth: false, hatch: 0.08 });
    shape(c, [[-20, -26], [20, -26], [18, -14], [-18, -14]], { fill: '#e8564a', smooth: false, line: 2.5 });
    c.save(); c.translate(0, 6); c.scale(0.55, 0.55); drawProduce(c, name.slice(5)); c.restore();
    return;
  }
  switch (name) {
    case 'wheat': case 'corn': case 'tomato': case 'carrot': case 'watermelon': case 'strawberry': case 'pumpkin': case 'saffron':
    case 'potato': case 'onion': case 'rice': case 'grape': case 'olive': case 'pepper': case 'cucumber': case 'sunflower':
    case 'fig': case 'plum': case 'cherry': case 'peach': case 'orange': case 'pomegranate': case 'pistachio': case 'rose':
    case 'egg': case 'milk': case 'wool': case 'feed': case 'honey': case 'fish': case 'roe': case 'cheese':
    case 'quartz': case 'turquoise': case 'amber': case 'amethyst': case 'garnet':
    case 'opal': case 'sapphire': case 'emerald': case 'ruby': case 'diamond':
      drawProduce(c, name); break;
    case 'fert': c.save(); c.translate(0, -12); c.scale(1.1, 1.1); drawTool(c, 'fertsack'); c.restore(); break;
    case 'hoe': c.save(); c.scale(0.8, 0.8); c.rotate(0.7); c.translate(-8, -24); drawTool(c, 'hoe'); c.restore(); break;
    case 'can': c.save(); c.scale(0.72, 0.72); c.translate(-41, 4); drawTool(c, 'can'); c.restore(); break;
    case 'seedbag': c.save(); c.translate(0, -16); c.scale(1.1, 1.1); drawTool(c, 'seedbag'); c.restore(); break;
    case 'sickle': c.save(); c.scale(1.1, 1.1); c.translate(-15, -15); drawTool(c, 'sickle'); c.restore(); break;
    case 'hand':
      for (const [x, y, r] of [[-13, -8, -0.3], [-4, -14, -0.1], [6, -14, 0.1], [15, -8, 0.3]] as const) oval(c, x, y, 4.5, 11, '#ffd2a8', r, 2.5);
      oval(c, -2, 6, 17, 15, '#ffd2a8', 0, 3, 0.08); oval(c, -19, 6, 4.5, 9, '#ffd2a8', -0.9, 2.5);
      break;
    case 'coin':
      circ(c, 0, 0, 22, '#ffcf3b', 3.5, 0.12); circ(c, 0, 0, 15, '#ffe27a', 2);
      shape(c, [[0, -9], [3, -3], [9, -3], [4, 2], [6, 9], [0, 5], [-6, 9], [-4, 2], [-9, -3], [-3, -3]], { fill: '#e8a21c', line: 1.8, smooth: false });
      break;
    case 'bag':
      shape(c, box(-24, -16, 48, 38), { fill: '#d39a55', smooth: false, hatch: 0.14 });
      shape(c, box(-24, -16, 48, 9), { fill: '#b87d3c', smooth: false, line: 2.5 });
      ln(c, [[-24, 2], [24, 2]], 2.5); ln(c, [[-8, 2], [-8, 22]], 2.5); ln(c, [[8, 2], [8, 22]], 2.5);
      break;
    case 'spring':
      ln(c, [[0, 26], [0, 0]], 3.5, '#4fb046'); oval(c, 8, 16, 8, 4, '#6cc84c', -0.5, 2);
      for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; oval(c, Math.cos(a) * 11, -8 + Math.sin(a) * 11, 7, 7, '#ff8fb8', 0, 2.5); }
      circ(c, 0, -8, 6, '#ffd93b', 2.5);
      break;
    case 'summer': sun(c); break;
    case 'autumn': leafIcon(c); break;
    case 'winter':
      for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI; ln(c, [[Math.cos(a) * 24, Math.sin(a) * 24], [-Math.cos(a) * 24, -Math.sin(a) * 24]], 4, '#5aa7e0'); }
      for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; ln(c, [[Math.cos(a) * 13, Math.sin(a) * 13], [Math.cos(a + 0.5) * 19, Math.sin(a + 0.5) * 19]], 3, '#5aa7e0'); }
      break;
    case 'sun': sun(c); break;
    case 'cloud': cloud(c, 0, 4, 1.1); break;
    case 'rain':
      cloud(c, 0, -8, 1, '#c8d4e2');
      for (const x of [-14, 0, 14]) ln(c, [[x, 10], [x - 4, 22]], 4, '#3e8fcb');
      break;
    case 'snow':
      cloud(c, 0, -8, 1, '#dfe8f2');
      for (const [x, y] of [[-14, 14], [0, 20], [14, 14]]) circ(c, x, y, 4, '#ffffff', 2);
      break;
    case 'moon':
      shape(c, [[8, -24], [-6, -20], [-20, -6], [-20, 10], [-8, 22], [8, 24], [20, 18], [4, 14], [-4, 0], [0, -14], [12, -18]], { fill: '#ffe9a0', hatch: 0.1 });
      break;
    case 'bolt':
      shape(c, [[6, -26], [-14, 4], [-2, 4], [-8, 26], [14, -6], [2, -6]], { fill: '#ffd93b', smooth: false, line: 3, hatch: 0.1 });
      break;
    case 'bed':
      shape(c, box(-26, 2, 52, 14), { fill: '#d39a55', smooth: false });
      shape(c, box(-26, -14, 8, 30), { fill: '#b87d3c', smooth: false, line: 2.5 });
      shape(c, box(-18, -6, 42, 10), { fill: '#e8564a', smooth: false });
      oval(c, -9, -10, 8, 5, '#fff', 0, 2.5);
      break;
    case 'pause': shape(c, box(-14, -16, 9, 32), { fill: '#fff', smooth: false }); shape(c, box(5, -16, 9, 32), { fill: '#fff', smooth: false }); break;
    case 'play': shape(c, [[-10, -18], [18, 0], [-10, 18]], { fill: '#fff', smooth: false }); break;
    case 'fast':
      shape(c, [[-18, -16], [2, 0], [-18, 16]], { fill: '#fff', smooth: false }); shape(c, [[0, -16], [20, 0], [0, 16]], { fill: '#fff', smooth: false });
      break;
    case 'worker': {
      circ(c, 0, 2, 15, '#ffd2a8', 3);
      shape(c, ell(0, -10, 24, 6, 12), { fill: '#f0cf6a' }); oval(c, 0, -16, 14, 12, '#f5dc84', 0, 3);
      shape(c, box(-14, -14, 28, 4), { fill: '#e8564a', smooth: false, line: 1.5 });
      dot(c, -5, 3, 2); dot(c, 6, 3, 2); ln(c, [[-4, 10], [0, 12], [5, 10]], 2);
      break;
    }
    case 'chicken':
    case 'cow':
    case 'sheep':
      drawAnimalIcon(c, name);
      break;
    case 'land':
      shape(c, [[-26, -4], [24, -10], [28, 18], [-24, 22]], { fill: '#8a5a34', hatch: 0.14 });
      for (let i = 0; i < 3; i++) ln(c, [[-20, 2 + i * 7], [22, -2 + i * 7]], 2.5, '#5b3419');
      ln(c, [[-18, -8], [-18, -26]], 4, '#c8924e'); shape(c, box(-18, -28, 20, 12), { fill: '#fff4d8', smooth: false, line: 2.5 });
      break;
    case 'hammer':
      ln(c, [[-14, 22], [8, -8]], 7, INK); ln(c, [[-14, 22], [8, -8]], 4, '#c8924e');
      shape(c, [[-2, -22], [24, -8], [16, 4], [-10, -10]], { fill: '#a9b3bd', hatch: 0.1 });
      break;
    case 'house':
      shape(c, box(-18, -2, 36, 26), { fill: '#fff0cf', smooth: false, hatch: 0.08 });
      shape(c, [[-26, 0], [0, -24], [26, 0]], { fill: '#d9534a', smooth: false });
      shape(c, box(-5, 8, 10, 16), { fill: '#8a5a34', smooth: false, line: 2.5 });
      break;
    case 'lock':
      ln(c, [[-9, -2], [-9, -14], [0, -22], [9, -14], [9, -2]], 5, INK);
      shape(c, box(-15, -4, 30, 24), { fill: '#f2c94c', smooth: false });
      circ(c, 0, 8, 3, INK, 0);
      break;
    case 'check': ln(c, [[-16, 2], [-5, 14], [18, -14]], 8, '#2e8b3a'); break;
    case 'close': ln(c, [[-14, -14], [14, 14]], 8, '#e8564a'); ln(c, [[14, -14], [-14, 14]], 8, '#e8564a'); break;
    case 'info':
      shape(c, ell(0, 0, 24, 14, 12), { fill: '#fff' }); circ(c, 0, 0, 9, '#4aa3df', 2.5); dot(c, 0, 0, 4);
      break;
    case 'medal':
      ln(c, [[-9, -22], [-2, -2]], 6, '#d63a4a'); ln(c, [[9, -22], [2, -2]], 6, '#3a6ad6');
      circ(c, 0, 8, 13, '#f2b632', 2.6, 0.1);
      circ(c, 0, 8, 8, '#ffd93b', 2);
      shape(c, [[0, 2], [2.2, 6.4], [7, 6.8], [3.4, 10], [4.6, 14.6], [0, 12], [-4.6, 14.6], [-3.4, 10], [-7, 6.8], [-2.2, 6.4]], { fill: '#c98a1a', smooth: false, line: 1.6 });
      break;
    case 'gear':
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; shape(c, [[Math.cos(a - 0.2) * 14, Math.sin(a - 0.2) * 14], [Math.cos(a - 0.15) * 24, Math.sin(a - 0.15) * 24], [Math.cos(a + 0.15) * 24, Math.sin(a + 0.15) * 24], [Math.cos(a + 0.2) * 14, Math.sin(a + 0.2) * 14]], { fill: '#9aa3ad', smooth: false, line: 2.5 }); }
      circ(c, 0, 0, 16, '#b4bcc5', 3); circ(c, 0, 0, 6, '#fff7e8', 2.5);
      break;
    case 'sound':
      shape(c, [[-18, -6], [-8, -6], [4, -16], [4, 16], [-8, 6], [-18, 6]], { fill: '#fff', smooth: false });
      ln(c, [[10, -8], [14, 0], [10, 8]], 3.5, '#fff'); ln(c, [[16, -14], [22, 0], [16, 14]], 3.5, '#fff');
      break;
    case 'mute':
      shape(c, [[-18, -6], [-8, -6], [4, -16], [4, 16], [-8, 6], [-18, 6]], { fill: '#fff', smooth: false });
      ln(c, [[10, -8], [22, 8]], 4, '#ff8b7a'); ln(c, [[22, -8], [10, 8]], 4, '#ff8b7a');
      break;
    case 'trash':
      shape(c, [[-16, -10], [16, -10], [13, 24], [-13, 24]], { fill: '#9aa3ad', smooth: false, hatch: 0.12 });
      shape(c, box(-20, -18, 40, 7), { fill: '#b4bcc5', smooth: false, line: 2.5 }); ln(c, [[-5, -6], [-4, 18]], 2.5); ln(c, [[5, -6], [4, 18]], 2.5);
      break;
    case 'save':
      shape(c, box(-20, -20, 40, 40), { fill: '#4aa3df', smooth: false }); shape(c, box(-12, -20, 24, 14), { fill: '#fff', smooth: false, line: 2 });
      shape(c, box(-12, 4, 24, 16), { fill: '#e8f3fb', smooth: false, line: 2 });
      break;
    case 'cart':
      shape(c, [[-22, -10], [22, -10], [16, 10], [-16, 10]], { fill: '#d39a55', smooth: false, hatch: 0.14 });
      circ(c, -10, 16, 7, '#8a5a34', 3); circ(c, 10, 16, 7, '#8a5a34', 3);
      break;
    case 'seedshop': drawIcon(c, 'seed:wheat'); break;
    case 'market': c.save(); c.translate(0, 4); drawIcon(c, 'coin'); c.restore(); break;
    case 'workshop': drawIcon(c, 'hammer'); break;
    case 'animalshop': drawIcon(c, 'cow'); break;
    case 'drop':
      shape(c, [[0, -24], [14, 4], [14, 14], [0, 24], [-14, 14], [-14, 4]], { fill: '#4aa3df', hatch: 0.1 });
      oval(c, -5, 6, 3, 6, 'rgba(255,255,255,.6)', 0.3, 0);
      break;
    case 'bug':
      oval(c, 0, 4, 14, 16, '#e8564a', 0, 3); ln(c, [[0, -12], [0, 20]], 2.5); dot(c, -6, 0, 3); dot(c, 6, 8, 3); circ(c, 0, -16, 7, INK, 2);
      break;
    case 'ledger':
      // دفتر کل: جلد چرمی با مهر و روبان
      shape(c, box(-19, -22, 38, 44), { fill: '#7a4b2c', smooth: false, line: 2.6 });
      shape(c, box(-16, -19, 32, 38), { fill: '#fff4d8', smooth: false, line: 2 });
      for (let i = -12; i <= 8; i += 8) ln(c, [[-11, i], [11, i]], 2.4, '#b0a084');
      circ(c, 10, 14, 6, '#c8433a', 2.2);
      ln(c, [[-19, -14], [-26, -6], [-19, 2]], 3, '#c8433a');
      break;
    case 'note':
      // سند: کاغذ مهرشده
      shape(c, [[-17, -22], [17, -22], [20, 12], [0, 22], [-20, 12]], { fill: '#fff4d8', smooth: false, line: 2.4 });
      ln(c, [[-10, -12], [10, -12]], 2.4, '#8a6b48'); ln(c, [[-10, -4], [10, -4]], 2.4, '#8a6b48');
      ln(c, [[-10, 4], [4, 4]], 2.4, '#8a6b48');
      circ(c, 8, 12, 6, '#c8433a', 2.2);
      break;
    case 'stash':
      // قلک سفالی با سکهٔ طلا در شکاف
      circ(c, 0, -18, 7, '#ffd93b', 2.2);
      shape(c, ell(0, 4, 22, 17, 12), { fill: '#d98b62', hatch: 0.08, line: 2.6 });
      shape(c, box(-7, -14, 14, 5), { fill: '#b06a45', smooth: false, line: 2 });
      ln(c, [[-8, -1], [8, -1]], 3.6, '#503426');
      circ(c, 13, 2, 2.4, '#503426', 0);
      ln(c, [[-14, 17], [-11, 22]], 3, '#b06a45'); ln(c, [[14, 17], [11, 22]], 3, '#b06a45');
      break;
    case 'scarecrow':
      // مترسک دست‌کش: چوب ضربدری، کت وصله‌دار، کاه و کلاه حصیری
      ln(c, [[0, -6], [0, 24]], 5, '#8a6b48');
      ln(c, [[-20, -1], [20, -1]], 4, '#8a6b48');
      shape(c, [[-11, -3], [11, -3], [14, 13], [-14, 13]], { fill: '#5a8ab8', smooth: false, hatch: 0.1, line: 2.2 });
      ln(c, [[-22, -1], [-26, 4]], 2.2, '#e6c068'); ln(c, [[22, -1], [26, 4]], 2.2, '#e6c068');
      shape(c, ell(0, -13, 11, 10, 10), { fill: '#d6b06a', line: 2.4 });
      shape(c, [[-17, -21], [17, -21], [11, -28], [-11, -28]], { fill: '#c8433a', smooth: false, line: 2 });
      dot(c, -4, -13, 1.8); dot(c, 4, -13, 1.8);
      ln(c, [[-4, -8], [4, -8]], 2, '#503426');
      break;
    case 'club':
      // چماق اسفنجی «مهربان»
      shape(c, [[-18, 18], [-12, 22], [18, -8], [10, -20], [-4, -8]], { fill: '#c8924e', hatch: 0.14, line: 2.8 });
      ln(c, [[-15, 15], [-10, 19]], 3, '#7a4b2c');
      circ(c, 12, -13, 4.5, '#ffd93b', 2);
      break;
    case 'stamp':
      // مهر چوبی و اثر جوهر سرخ
      shape(c, ell(0, 14, 18, 6, 12), { fill: '#c8433a', line: 2.4 });
      shape(c, box(-12, 4, 24, 7), { fill: '#8a5a28', smooth: false, line: 2.4 });
      shape(c, [[-5, 4], [-7, -10], [7, -10], [5, 4]], { fill: '#a8742a', smooth: false, line: 2.2 });
      circ(c, 0, -15, 7.5, '#c8924e', 2.4);
      break;
    case 'history':
      // ساعت با پیکان بازگشت
      circ(c, 0, 0, 17, '#fff4d8', 3);
      ln(c, [[0, 0], [0, -10]], 3, '#503426'); ln(c, [[0, 0], [8, 4]], 3, '#503426');
      ln(c, [[-16, -14], [-22, -6], [-12, -2]], 3, '#c8433a');
      break;
    case 'star':
      shape(c, [[0, -24], [6, -8], [24, -8], [10, 3], [15, 22], [0, 11], [-15, 22], [-10, 3], [-24, -8], [-6, -8]], { fill: '#ffd93b', hatch: 0.08, smooth: false });
      shape(c, [[0, -13], [3.5, -4.5], [13, -4.5], [5.5, 1.5], [8, 12], [0, 6], [-8, 12], [-5.5, 1.5], [-13, -4.5], [-3.5, -4.5]], { fill: '#fff0a8', line: 1.6, smooth: false });
      dot(c, -3, -6, 2.2, '#ffffff');
      break;
    case 'nest':
      shape(c, [[-24, 2], [-18, 18], [0, 22], [18, 18], [24, 2], [16, -2], [-16, -2]], { fill: '#c8924e', hatch: 0.16, line: 2.8 });
      for (const y of [6, 12, 17]) ln(c, [[-18, y], [18, y - 1]], 2, '#7a4b2c');
      oval(c, -7, -4, 8, 10, '#fff4d8', -0.2, 2.4, 0.05);
      oval(c, 7, -3, 8, 10, '#ffe8c2', 0.22, 2.4, 0.05);
      dot(c, -8, -6, 1.4, '#b8844c'); dot(c, 8, -4, 1.4, '#b8844c');
      break;
    case 'scroll':
      shape(c, box(-16, -20, 32, 40), { fill: '#fff4d8', hatch: 0.06, smooth: false, line: 2.5 });
      shape(c, ell(0, -20, 19, 4.5, 12), { fill: '#e8d2a6', line: 2.4 });
      shape(c, ell(0, 20, 19, 4.5, 12), { fill: '#e8d2a6', line: 2.4 });
      ln(c, [[-9, -9], [9, -9]], 2.4, '#8a6b48'); ln(c, [[-9, -1], [7, -1]], 2.4, '#8a6b48');
      ln(c, [[-7, 8], [-2, 13], [8, 4]], 3.2, '#2e8b3a');
      break;
    case 'contract':
      shape(c, [[-18, -22], [14, -22], [20, -14], [20, 20], [-18, 20]], { fill: '#fff4d8', hatch: 0.06, smooth: false, line: 2.5 });
      ln(c, [[-11, -12], [9, -12]], 2.4, '#8a6b48'); ln(c, [[-11, -4], [11, -4]], 2.4, '#8a6b48');
      circ(c, -6, 9, 7, '#ffd93b', 2.2);
      circ(c, 9, 10, 6.5, '#c8433a', 2.2);
      ln(c, [[7, 16], [5, 25]], 2.6, '#c8433a'); ln(c, [[11, 16], [14, 25]], 2.6, '#c8433a');
      break;
    case 'well':
      ln(c, [[-15, 2], [-15, -16]], 3.2, '#7a4b2c'); ln(c, [[15, 2], [15, -16]], 3.2, '#7a4b2c');
      shape(c, [[-22, -14], [0, -26], [22, -14]], { fill: '#b85a3a', hatch: 0.1, smooth: false, line: 2.5 });
      shape(c, box(-18, 2, 36, 18), { fill: '#9aa3ad', hatch: 0.14, smooth: false, line: 2.6 });
      ln(c, [[0, -14], [0, -3]], 2, '#503426');
      shape(c, box(-5, -4, 10, 8), { fill: '#5ab4e8', smooth: false, line: 2 });
      break;
    case 'trophy':
      shape(c, box(-12, 17, 24, 7), { fill: '#7a4b2c', smooth: false, line: 2.4 });
      shape(c, box(-5, 9, 10, 8), { fill: '#d9a21c', smooth: false, line: 2.2 });
      shape(c, [[-16, -18], [16, -18], [11, 6], [0, 11], [-11, 6]], { fill: '#ffd93b', hatch: 0.08, smooth: false, line: 2.6 });
      ln(c, [[-16, -14], [-23, -10], [-20, 0], [-12, 2]], 3, '#e8a21c');
      ln(c, [[16, -14], [23, -10], [20, 0], [12, 2]], 3, '#e8a21c');
      dot(c, -6, -8, 2.2, '#ffffff');
      break;
    case 'female':
      circ(c, 0, -5, 11, '#ffdfe8', 3.4);
      circ(c, 0, -5, 6, '#fffdf8', 2.4);
      ln(c, [[0, 6], [0, 21]], 3.6, '#d94878');
      ln(c, [[-7, 14], [7, 14]], 3.6, '#d94878');
      break;
    case 'male':
      circ(c, -3, 4, 11, '#dff0ff', 3.4);
      circ(c, -3, 4, 6, '#fffdf8', 2.4);
      ln(c, [[5, -4], [16, -15]], 3.6, '#2f7bc8');
      ln(c, [[7, -15], [16, -15], [16, -6]], 3.6, '#2f7bc8');
      break;
    case 'duck':
    case 'goat':
    case 'rabbit':
      drawAnimalIcon(c, name);
      break;
    case 'tractor':
      // Classic crimson farm tractor with exhaust chimney, cab glass, brass headlamp & treaded wheels
      ln(c, [[15, -6], [15, -23], [19, -25]], 4.2, '#3a3a40');
      shape(c, box(-22, -7, 38, 19), { fill: '#e0483d', smooth: false, hatch: 0.1 });
      shape(c, box(-20, -25, 21, 19), { fill: '#c83b31', smooth: false, line: 2.5 });
      shape(c, box(-16, -21, 13, 12), { fill: '#cbeaff', smooth: false, line: 2 });
      circ(c, 19, -2, 3.6, '#fff29c', 2);
      circ(c, -13, 15, 12.5, '#33343a', 3); circ(c, -13, 15, 5.5, '#f2c94c', 2);
      circ(c, 16, 17, 9, '#33343a', 3); circ(c, 16, 17, 3.8, '#f2c94c', 1.8);
      break;
    case 'seeder':
      // Precision green grain drill with golden seed hopper & coulter discs
      shape(c, [[-15, -24], [15, -24], [11, -9], [-11, -9]], { fill: '#f2c94c', smooth: false, line: 2.5 });
      shape(c, box(-24, -9, 48, 15), { fill: '#5bb843', smooth: false, hatch: 0.1 });
      for (const x of [-16, -5, 6, 17]) {
        ln(c, [[x, 6], [x, 18]], 3.2, '#6b4a2b');
        circ(c, x, 19, 3.2, '#a9b3bd', 1.8);
      }
      circ(c, -17, 13, 7.5, '#33343a', 2.6); circ(c, 18, 13, 7.5, '#33343a', 2.6);
      break;
    case 'sprinkler':
      // Brass rotary field sprinkler with mist arcs
      ln(c, [[0, 22], [0, -6]], 4.8, '#3e8fcb');
      shape(c, [[-15, -6], [15, -6], [11, -14], [-11, -14]], { fill: '#e0a938', smooth: false, line: 2.4 });
      for (const a of [-1.1, -0.4, 0.4, 1.1]) {
        ln(c, [[0, -16], [Math.sin(a) * 22, -16 - Math.cos(a) * 14]], 2.6, '#8fd0ff');
        dot(c, Math.sin(a) * 24, -18 - Math.cos(a) * 14, 2.3, '#5ab4e8');
      }
      shape(c, ell(0, 24, 18, 5, 10), { fill: '#a6a096' });
      break;
    case 'harvester':
      // Golden combine harvester with grain auger tube, blue cab & front rotary reel
      ln(c, [[12, -14], [26, -24]], 4.5, '#d99a1a');
      shape(c, box(-24, -12, 40, 20), { fill: '#f2b632', smooth: false, hatch: 0.1 });
      shape(c, box(4, -28, 18, 17), { fill: '#cbeaff', smooth: false, line: 2.5 });
      shape(c, [[-39, -1], [-24, -13], [-24, 9]], { fill: '#d8c8ad', smooth: false, line: 2.4 });
      circ(c, -31, 0, 8.5, 'rgba(180,120,40,0.22)', 2);
      for (let k = 0; k < 4; k++) ln(c, [[-38 + k * 4, 2], [-33 + k * 4, -8]], 2, '#8a5a34');
      circ(c, -11, 14, 10.5, '#33343a', 3); circ(c, -11, 14, 4.5, '#f2c94c', 1.8);
      circ(c, 17, 15, 8, '#33343a', 3);
      break;
    case 'drone':
      // Quad-rotor crop-care drone with spinning rotor halos & fertilizer nozzle lens
      for (const [x, y] of [[-23, -12], [23, -12], [-23, 5], [23, 5]] as const) {
        ln(c, [[x * 0.5, y * 0.5], [x, y]], 3, '#4a4a5a');
        shape(c, ell(x, y - 2, 11.5, 3.2, 10), { fill: '#dcd6ea', line: 1.8 });
      }
      shape(c, box(-13, -8, 26, 15), { fill: '#8f52d0', smooth: false, hatch: 0.08 });
      circ(c, 0, -1, 4.5, '#9ee2ff', 2);
      ln(c, [[0, 7], [0, 15]], 2.8, '#4a4a5a'); dot(c, 0, 18, 3.2, '#5ab4e8');
      break;
    case 'feeder':
      // Automatic ranch grain dispenser hopper & filled oak trough
      shape(c, [[-11, -24], [11, -24], [7, -8], [-7, -8]], { fill: '#d6a446', smooth: false, line: 2.4 });
      shape(c, [[-23, -7], [23, -7], [19, 17], [-19, 17]], { fill: '#a8742a', hatch: 0.12 });
      shape(c, [[-17, -5], [17, -5], [15, 4], [-15, 4]], { fill: '#f2cc59', smooth: false, line: 2 });
      break;
    case 'collector':
      // Gentle vacuum ranch collector cart with brass beacon & milk/egg canister window
      shape(c, box(-19, -17, 38, 27), { fill: '#4aa3df', smooth: false, hatch: 0.1 });
      shape(c, box(-11, -10, 22, 13), { fill: '#dff3ff', smooth: false, line: 2.2 });
      shape(c, [[-23, 10], [23, 10], [18, 21], [-18, 21]], { fill: '#3582ba', smooth: false, line: 2.4 });
      ln(c, [[0, -17], [0, -25]], 3, '#4a4a5a'); circ(c, 0, -27, 4, '#ffd93b', 2);
      break;
    case 'mail':
      // Sealed cream parchment letter envelope with crimson wax seal
      shape(c, box(-23, -15, 46, 31), { fill: '#fff6de', smooth: false, hatch: 0.05, line: 2.7 });
      ln(c, [[-22, 15], [-4, 1]], 1.8, '#d4bc94');
      ln(c, [[22, 15], [4, 1]], 1.8, '#d4bc94');
      shape(c, [[-23, -15], [0, 4], [23, -15]], { fill: '#f5e4be', smooth: false, line: 2.5 });
      circ(c, 0, 3, 6.2, '#cf3834', 2.2);
      dot(c, -1.5, 1.5, 1.5, '#ff9d98');
      break;
    case 'mailopen':
      // Opened parchment letter rising out of envelope with handwritten lines
      shape(c, box(-22, -6, 44, 24), { fill: '#f2dec0', smooth: false, line: 2.5 });
      shape(c, box(-17, -23, 34, 25), { fill: '#fffaf0', smooth: false, line: 2.3 });
      ln(c, [[-11, -15], [11, -15]], 2.2, '#8a6b48');
      ln(c, [[-11, -9], [8, -9]], 2.2, '#8a6b48');
      shape(c, [[-22, -6], [0, 8], [22, -6]], { fill: '#fff4d8', smooth: false, line: 2.3 });
      break;
    case 'parcel':
      // Kraft gift parcel tied with red-gold ribbon & wax tag
      shape(c, box(-20, -14, 40, 32), { fill: '#d8a464', smooth: false, hatch: 0.1, line: 2.7 });
      shape(c, box(-4, -14, 8, 32), { fill: '#cf3834', smooth: false, line: 2 });
      shape(c, box(-20, -1, 40, 7), { fill: '#cf3834', smooth: false, line: 2 });
      oval(c, -7, -18, 6.5, 4, '#e64c46', -0.35, 2.2);
      oval(c, 7, -18, 6.5, 4, '#e64c46', 0.35, 2.2);
      circ(c, 0, -16, 3.4, '#ffd93b', 2);
      break;
    case 'postbox':
      // Country wooden-post mailbox with raised crimson mail flag
      shape(c, box(-4.5, 2, 9, 24), { fill: '#8f5d32', smooth: false, line: 2.4 });
      shape(c, [[-20, 2], [20, 2], [20, -13], [12, -21], [-12, -21], [-20, -13]], { fill: '#4d7c6f', hatch: 0.08, line: 2.7 });
      ln(c, [[-3, -12], [-3, -29]], 3.6, '#e63935');
      shape(c, [[-3, -29], [9, -29], [7, -22], [-3, -22]], { fill: '#e63935', smooth: false, line: 2 });
      dot(c, -3, -12, 2.5, '#ffd43b');
      break;
    case 'hive':
      shape(c, box(-20, -16, 40, 12), { fill: '#f2c94c', smooth: false, line: 2.4 });
      shape(c, box(-20, -4, 40, 12), { fill: '#e8b23a', smooth: false, line: 2.4 });
      shape(c, box(-20, 8, 40, 12), { fill: '#d9a21c', smooth: false, line: 2.4 });
      shape(c, [[-24, -22], [24, -22], [16, -14], [-16, -14]], { fill: '#c8924e', smooth: false, line: 2.4 });
      oval(c, 0, 10, 6, 4, '#4a2a1a', 0, 1.8);
      break;
    case 'pond':
      shape(c, ell(0, 6, 26, 15, 14), { fill: '#5ab4e8', hatch: 0.1, line: 3 });
      shape(c, ell(-6, 2, 10, 4, 10), { fill: 'rgba(255,255,255,.45)', line: 0 });
      break;
    case 'fingerling':
      oval(c, 0, 0, 13, 7, '#7cc4f0', 0.15, 2.4);
      shape(c, [[10, 0], [19, -7], [19, 7]], { fill: '#5ab4e8', smooth: false, line: 2 });
      dot(c, -7, -1, 1.6);
      break;
    case 'bee':
      oval(c, 0, 2, 11, 8, '#f2c94c', 0, 2.4, 0.1);
      ln(c, [[-4, -5], [-4, 9]], 2, '#3a2a1a'); ln(c, [[3, -5], [3, 9]], 2, '#3a2a1a');
      oval(c, -6, -8, 6, 4, 'rgba(200,230,255,.8)', -0.5, 1.6); oval(c, 6, -8, 6, 4, 'rgba(200,230,255,.8)', 0.5, 1.6);
      dot(c, 10, 1, 2, '#3a2a1a');
      break;
    case 'plant':
      ln(c, [[0, 22], [0, -2]], 4, '#4fb046'); oval(c, -10, -6, 12, 6, '#6cc84c', -0.5, 2.5); oval(c, 10, -10, 12, 6, '#5dbb46', 0.5, 2.5);
      shape(c, ell(0, 24, 22, 7, 10), { fill: '#7a4b2c' });
      break;
    case 'silo': {
      shape(c, box(-14, -22, 28, 46), { fill: '#c9c9cd', hatch: 0.1, smooth: false });
      shape(c, [[-16, -22], [0, -36], [16, -22]], { fill: '#e0453a', smooth: false });
      for (let i = 0; i < 4; i++) ln(c, [[-14 + i * 9, -20], [-14 + i * 9, 24]], 2, 'rgba(0,0,0,.15)');
      dot(c, 0, -14, 3, '#ffd93b');
      break;
    }
    case 'greenhouse': {
      shape(c, [[-24, 24], [-24, -6], [-12, -20], [0, -26], [12, -20], [24, -6], [24, 24]], { fill: 'rgba(120,200,230,.55)', line: 3 });
      ln(c, [[0, -26], [0, 24]], 2.2, 'rgba(80,120,140,.8)');
      ln(c, [[-24, -6], [24, -6]], 2.2, 'rgba(80,120,140,.8)');
      ln(c, [[-12, -20], [12, -20]], 2.2, 'rgba(80,120,140,.8)');
      for (const x of [-16, -8, 8, 16]) ln(c, [[x, 24], [x + 2, 12]], 2, '#4fa83c');
      break;
    }
    case 'rod': {
      ln(c, [[-18, 26], [14, -18]], 4.5, '#8a5a28');
      ln(c, [[14, -18], [20, -24]], 3.5, '#a8742a');
      circ(c, -12, 18, 6, '#d9a21c', 2.4);
      ln(c, [[20, -24], [20, 4]], 1.8, 'rgba(60,40,20,.9)');
      ln(c, [[20, 4], [16, 9]], 2.2, '#6a90b8');
      dot(c, -18, 26, 2.4, '#503426');
      break;
    }
    case 'coins': {
      for (const [dx, dy, col] of [[-4, 8, '#d99a1a'], [4, 0, '#f2c94c'], [-2, -8, '#ffd93b']] as const) {
        shape(c, ell(dx, dy, 16, 8, 16), { fill: col, hatch: 0.08, line: 2.5 });
      }
      dot(c, -6, -10, 2.2, '#ffffff');
      break;
    }
    case 'up': shape(c, [[-12, 8], [0, -12], [12, 8]], { fill: '#4fb046', smooth: false }); break;
    case 'down': shape(c, [[-12, -8], [0, 12], [12, -8]], { fill: '#e0453a', smooth: false }); break;
    case 'heart':
      shape(c, [[0, 16], [-20, -2], [-13, -16], [0, -7], [13, -16], [20, -2]], { fill: '#e8455a', hatch: 0.1, smooth: true, line: 3 });
      oval(c, -9, -8, 3.5, 5.5, 'rgba(255,255,255,.7)', -0.4, 0);
      break;
    case 'arrow': shape(c, [[-16, -5], [4, -5], [4, -12], [18, 0], [4, 12], [4, 5], [-16, 5]], { fill: '#8a5a28', smooth: false, line: 2 }); break;
    case 'carp': {
      circ(c, 0, -8, 11, '#f2c89a', 3);
      shape(c, [[-15, -16], [15, -16], [11, -24], [-11, -24]], { fill: '#d99a1a', smooth: false });
      shape(c, box(-15, 2, 30, 26), { fill: '#5a78b0', smooth: false, hatch: 0.1 });
      dot(c, -4, -9, 1.8, '#503426'); dot(c, 4, -9, 1.8, '#503426');
      break;
    }
    case 'north': {
      shape(c, [[-24, 22], [-10, 8], [10, 8], [24, 22]], { fill: '#79c954', hatch: 0.1 });
      shape(c, [[-8, 18], [-5, -10], [5, -10], [8, 18]], { fill: '#f4e4c4', smooth: false, hatch: 0.1 });
      shape(c, [[-7, -10], [0, -18], [7, -10]], { fill: '#c8483c', smooth: false });
      ln(c, [[-16, -22], [16, 4]], 3.2, '#8a5a28');
      ln(c, [[16, -22], [-16, 4]], 3.2, '#8a5a28');
      dot(c, 0, -9, 2.8, '#ffd43b');
      break;
    }
    case 'valley': {
      circ(c, 0, -14, 9, '#ffd43b', 2.4);
      shape(c, [[-26, 20], [-10, -2], [2, 12]], { fill: '#6fb552', hatch: 0.1 });
      shape(c, [[-4, 14], [12, -4], [26, 20]], { fill: '#8ad15d', hatch: 0.1 });
      shape(c, [[-6, 22], [-2, 12], [6, 12], [12, 22]], { fill: '#6cc4f4', smooth: false, line: 2 });
      break;
    }
    case 'cave': {
      shape(c, [[-24, 22], [-20, -8], [0, -22], [20, -8], [24, 22]], { fill: '#475569', hatch: 0.12 });
      shape(c, [[-12, 22], [-10, 0], [0, -10], [10, 0], [12, 22]], { fill: '#1e293b', line: 2.2 });
      shape(c, [[-4, 16], [0, -2], [5, 16]], { fill: '#38bdf8', smooth: false, line: 1.8 });
      break;
    }
    case 'forest': {
      shape(c, box(-4, 4, 8, 18), { fill: '#7c4d2b', smooth: false });
      shape(c, [[-20, 8], [0, -22], [20, 8]], { fill: '#16a34a', hatch: 0.1 });
      shape(c, [[-15, -4], [0, -26], [15, -4]], { fill: '#22c55e' });
      break;
    }
    case 'herb': {
      ln(c, [[0, 20], [0, -14]], 3.2, '#15803d');
      shape(c, [[-14, 2], [-2, -4], [-4, 10]], { fill: '#4ade80' });
      shape(c, [[14, -4], [2, -10], [4, 4]], { fill: '#22c55e' });
      dot(c, 0, -18, 4.5, '#a855f7');
      break;
    }
    case 'mushroom': {
      shape(c, box(-6, 2, 12, 18), { fill: '#fef3c7', smooth: false });
      shape(c, [[-22, 4], [-14, -16], [14, -16], [22, 4]], { fill: '#e11d48' });
      dot(c, -8, -7, 3, '#fff'); dot(c, 7, -9, 3.2, '#fff');
      break;
    }
    case 'truffle': {
      circ(c, 0, 2, 16, '#b45309', 3);
      circ(c, -3, -2, 8, '#fbbf24', 0);
      break;
    }
    case 'herbal-elixir': {
      shape(c, box(-9, -4, 18, 22), { fill: '#10b981', smooth: false });
      shape(c, box(-5, -16, 10, 12), { fill: '#d97706', smooth: false });
      break;
    }
    case 'turquoise-amulet': {
      ln(c, [[-13, -18], [0, -6], [13, -18]], 3, '#cbd5e1');
      shape(c, [[-14, 14], [-11, -6], [0, -11], [11, -6], [14, 14], [0, 22]], { fill: '#0d9488', smooth: false, line: 2.6 });
      shape(c, [[-8, 10], [-6, -2], [0, -5], [6, -2], [8, 10], [0, 15]], { fill: '#2dd4bf', smooth: false, line: 1.8 });
      dot(c, -2, 2, 2.2, '#f0fdfa');
      break;
    }
    case 'crown': {
      shape(c, [[-20, 14], [-18, -10], [-7, 2], [0, -16], [7, 2], [18, -10], [20, 14]], { fill: '#fbbf24', smooth: false });
      dot(c, 0, 4, 4.2, '#14b8a6');
      break;
    }
    case 'target': {
      circ(c, 0, 0, 19, '#ef4444', 3);
      circ(c, 0, 0, 11, '#fff', 2.4);
      circ(c, 0, 0, 4.5, '#eab308', 2);
      break;
    }
    case 'water': {
      shape(c, [[0, -22], [14, 4], [10, 18], [0, 22], [-10, 18], [-14, 4]], { fill: '#38bdf8' });
      circ(c, -4, 6, 3.2, '#e0f2fe', 0);
      break;
    }
    case 'fire': {
      shape(c, [[0, -22], [15, 0], [10, 19], [-10, 19], [-15, 0]], { fill: '#f97316' });
      shape(c, [[0, -8], [7, 6], [5, 17], [-5, 17], [-7, 6]], { fill: '#fde047', line: 0 });
      break;
    }
  }
}

const iconCache = new Map<string, string>();
export function iconURL(name: string): string {
  let u = iconCache.get(name);
  if (!u) {
    const cv = document.createElement('canvas');
    cv.width = 128;
    cv.height = 128;
    const c = (cv.getContext('2d', { willReadFrequently: true }) ?? cv.getContext('2d'))!;
    c.scale(2, 2);
    c.translate(32, 32);
    drawIcon(c, name);
    u = cv.toDataURL();
    cv.width = 0;
    cv.height = 0;
    iconCache.set(name, u);
  }
  return u;
}
export const iconPart = (name: string) => cached('icon:' + name, 64, 64, 32, 32, (c) => drawIcon(c, name));
