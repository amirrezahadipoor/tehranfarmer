import { iconURL } from '../game/art';
import { SHOP_META, type ShopId } from '../game/shops';

function Img({ n, x, y, s = 44, o = 1 }: { n: string; x: number; y: number; s?: number; o?: number }) {
  return <image href={iconURL(n)} x={x} y={y} width={s} height={s} opacity={o} />;
}

const timber = '#5b3927';
const ink = '#3d291f';

function Shelf({ x, y, w = 230 }: { x: number; y: number; w?: number }) {
  return <g>
    <rect x={x} y={y} width={w} height="12" rx="4" fill={timber} stroke={ink} strokeWidth="3" />
    <path d={`M${x + 12} ${y + 12}v20M${x + w - 12} ${y + 12}v20`} stroke={ink} strokeWidth="5" />
  </g>;
}

function Crate({ x, y, w = 116 }: { x: number; y: number; w?: number }) {
  return <g>
    <rect x={x} y={y} width={w} height="57" rx="5" fill="#a96b37" stroke={ink} strokeWidth="3" />
    <path d={`M${x + 8} ${y + 12}h${w - 16}M${x + 8} ${y + 42}h${w - 16}M${x + 16} ${y + 5}l${w - 32} 48M${x + w - 16} ${y + 5}l-${w - 32} 48`} stroke="#704324" strokeWidth="4" opacity=".75" />
  </g>;
}

function Window({ x, y }: { x: number; y: number }) {
  return <g>
    <rect x={x - 7} y={y - 7} width="160" height="124" rx="8" fill="#6b432d" stroke={ink} strokeWidth="4" />
    <rect x={x} y={y} width="146" height="110" rx="3" fill="#a9dcf0" />
    <path d={`M${x} ${y + 70}q40-45 76-10t70-8v58H${x}z`} fill="#81b85d" />
    <circle cx={x + 112} cy={y + 24} r="14" fill="#ffe49a" />
    <path d={`M${x + 73} ${y}v110M${x} ${y + 54}h146`} stroke="#f7e8c9" strokeWidth="7" />
    <path d={`M${x - 12} ${y + 118}h170`} stroke={ink} strokeWidth="8" strokeLinecap="round" />
  </g>;
}

function CommonRoom({ shop }: { shop: ShopId }) {
  const meta = SHOP_META[shop];
  const goods: Record<ShopId, string[]> = {
    seed: ['seed:wheat', 'seed:carrot', 'seed:corn', 'seed:tomato', 'fert', 'feed'],
    market: ['wheat', 'egg', 'milk', 'honey', 'apple', 'pomegranate'],
    work: ['tractor', 'harvester', 'drone', 'bolt', 'can', 'hoe'],
    animal: ['chicken', 'duck', 'sheep', 'goat', 'cow', 'feed'],
    carp: ['hammer', 'silo', 'greenhouse', 'pond', 'hive', 'rod'],
    estate: ['ledger', 'land', 'worker', 'note', 'house', 'coin'],
  };
  return <>
    <defs>
      <linearGradient id={`wall-${shop}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#fff6df" />
        <stop offset="1" stopColor={meta.accent} stopOpacity=".42" />
      </linearGradient>
      <linearGradient id={`floor-${shop}`} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#9a6b43" /><stop offset=".5" stopColor="#c08b56" /><stop offset="1" stopColor="#8a5b3c" />
      </linearGradient>
      <pattern id={`grain-${shop}`} width="90" height="28" patternUnits="userSpaceOnUse">
        <path d="M0 27h90M18 0v27" stroke="#5b3927" strokeOpacity=".25" strokeWidth="2" />
        <path d="M28 9q18-8 40 0" fill="none" stroke="#f0c78e" strokeOpacity=".25" />
      </pattern>
      <filter id={`shadow-${shop}`} x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="5" stdDeviation="4" floodColor="#2b1a10" floodOpacity=".25" /></filter>
    </defs>
    <rect width="960" height="330" fill={`url(#wall-${shop})`} />
    <path d="M0 0h960v28H0zM0 28h24v250H0zM936 28h24v250h-24z" fill={meta.dark} opacity=".9" />
    <path d="M0 252h960v78H0z" fill={`url(#floor-${shop})`} />
    <path d="M0 252h960v78H0z" fill={`url(#grain-${shop})`} />
    <path d="M0 250h960" stroke={ink} strokeWidth="7" />
    <Window x={46} y={60} />
    <g filter={`url(#shadow-${shop})`}>
      <Shelf x={252} y={91} w={236} /><Shelf x={252} y={172} w={236} />
      {goods[shop].slice(0, 3).map((n, i) => <Img key={n} n={n} x={267 + i * 70} y={43} s={50} />)}
      {goods[shop].slice(3).map((n, i) => <Img key={n} n={n} x={267 + i * 70} y={124} s={50} />)}
    </g>
    <g opacity=".9">
      <path d="M529 31v54M577 31v54M625 31v54" stroke={ink} strokeWidth="3" />
      {[529, 577, 625].map((x, i) => <g key={x}><circle cx={x} cy="91" r={15 + i * 2} fill={i === 1 ? '#7aa354' : '#8ebc62'} /><path d={`M${x - 11} 81l22 20M${x + 11} 81l-22 20`} stroke="#496a3b" strokeWidth="3" /></g>)}
    </g>
    <Crate x={52} y={202} w={132} /><Crate x={510} y={204} w={118} />
    <Img n={goods[shop][0]} x={76} y={171} s={58} /><Img n={goods[shop][4]} x={532} y={174} s={54} />
  </>;
}

function ShopSpecial({ shop }: { shop: ShopId }) {
  if (shop === 'seed') return <g>
    <path d="M711 47q35 32 0 64q-35-32 0-64M748 42q35 32 0 64q-35-32 0-64" fill="#7ea95c" opacity=".8" />
    <rect x="690" y="115" width="116" height="76" rx="9" fill="#f6e7b9" stroke={ink} strokeWidth="4" />
    <path d="M706 139h84M706 157h60M706 175h72" stroke="#6b8b4b" strokeWidth="6" strokeLinecap="round" />
    <path d="M676 216q22-47 44 0v45h-44zM735 216q22-47 44 0v45h-44z" fill="#d5b478" stroke={ink} strokeWidth="4" />
    <path d="M676 218h44M735 218h44" stroke="#7d5634" strokeWidth="5" />
  </g>;
  if (shop === 'market') return <g>
    <path d="M660 45h242l-18 46H678z" fill="#f5d58b" stroke={ink} strokeWidth="4" />
    {[0, 1, 2, 3, 4].map((i) => <path key={i} d={`M${666 + i * 47} 47l12 42`} stroke={i % 2 ? '#f5d58b' : '#b94d3c'} strokeWidth="24" />)}
    <path d="M714 112v91M842 112v91M700 112h156" stroke={ink} strokeWidth="5" />
    <path d="M777 119v48M741 166h72M746 166q-18 38-36 0M808 166q18 38 36 0" fill="none" stroke="#70543c" strokeWidth="4" />
    <circle cx="777" cy="119" r="12" fill="#f2c94c" stroke={ink} strokeWidth="3" />
  </g>;
  if (shop === 'work') return <g>
    <rect x="659" y="48" width="239" height="137" rx="8" fill="#6d7d86" stroke={ink} strokeWidth="4" />
    {[0, 1, 2, 3, 4, 5].map((i) => <circle key={i} cx={681 + (i % 3) * 78} cy={72 + Math.floor(i / 3) * 66} r="4" fill="#d7e2df" />)}
    <path d="M687 83l30 30M717 83l-30 30M779 69v57M765 83h28M844 69l-24 54" stroke="#f0d18c" strokeWidth="8" strokeLinecap="round" />
    <rect x="676" y="197" width="211" height="22" rx="5" fill="#5a3928" stroke={ink} strokeWidth="4" />
    <path d="M695 218v48M866 218v48" stroke={ink} strokeWidth="8" />
    <path d="M736 192l22-20l22 20M802 192l22-20l22 20" fill="none" stroke="#c6d5da" strokeWidth="6" />
  </g>;
  if (shop === 'animal') return <g>
    <path d="M656 45h246v190H656z" fill="#8c5a38" stroke={ink} strokeWidth="5" />
    <path d="M674 62h210v164H674z" fill="#d9b77a" />
    <path d="M674 120h210M744 62v164M814 62v164" stroke={ink} strokeWidth="7" />
    <Img n="chicken" x={682} y={75} s={54} /><Img n="sheep" x={752} y={75} s={54} /><Img n="cow" x={822} y={75} s={54} />
    <path d="M666 223q90-38 226 0" stroke="#edce73" strokeWidth="13" strokeLinecap="round" />
    <rect x="660" y="34" width="238" height="25" rx="6" fill="#a93e32" stroke={ink} strokeWidth="4" />
    <path d="M771 39v15M764 46h15" stroke="#fff5d9" strokeWidth="5" />
  </g>;
  if (shop === 'carp') return <g>
    {[0, 1, 2, 3].map((i) => <rect key={i} x={668 + i * 18} y={49 + i * 6} width="185" height="22" rx="5" fill={i % 2 ? '#b87b43' : '#d49a58'} stroke={ink} strokeWidth="3" transform={`rotate(${-7 + i * 3} 760 110)`} />)}
    <path d="M680 201h196M704 199l-25 63M851 199l25 63" stroke={ink} strokeWidth="9" strokeLinecap="round" />
    <path d="M714 170h126l24 29H690z" fill="#d39a5d" stroke={ink} strokeWidth="4" />
    <path d="M753 165v-45h54v45M744 142h72" fill="none" stroke="#f3e3bd" strokeWidth="7" />
    {[0, 1, 2, 3, 4].map((i) => <path key={i} d={`M${700 + i * 34} 238q12-12 24 0q-12 14-24 0`} fill="#e7bd79" stroke="#8a5a34" strokeWidth="2" />)}
  </g>;
  return <g>
    <rect x="656" y="45" width="239" height="144" rx="6" fill="#6a4632" stroke={ink} strokeWidth="5" />
    {[0, 1, 2].map((row) => <g key={row}><path d={`M666 ${86 + row * 45}h218`} stroke="#d2aa71" strokeWidth="6" />{[0, 1, 2, 3, 4, 5].map((i) => <rect key={i} x={673 + i * 34} y={54 + row * 45} width="22" height="31" rx="2" fill={['#7c3f3a', '#365d68', '#b58a45'][row]} stroke="#39271f" strokeWidth="2" />)}</g>)}
    <rect x="687" y="199" width="177" height="66" rx="7" fill="#79503a" stroke={ink} strokeWidth="5" />
    <path d="M705 215h80v36h-80z" fill="#f4e5bd" stroke="#4d3a2c" strokeWidth="3" />
    <path d="M716 226h56M716 237h44" stroke="#73835d" strokeWidth="3" />
    <circle cx="830" cy="225" r="16" fill="#b94d42" stroke={ink} strokeWidth="3" /><path d="M830 209v32M814 225h32" stroke="#e6b76d" strokeWidth="3" />
  </g>;
}

/** شش فضای کاملاً متمایز، با قفسه/ابزار/کالای اختصاصی و عمق چوبی دست‌ساز؛ همه درون‌خطی و آفلاین. */
export function ShopInteriorArt({ shop }: { shop: ShopId }) {
  const meta = SHOP_META[shop];
  return <svg viewBox="0 0 960 330" className="block h-full w-full" preserveAspectRatio="xMidYMid slice" role="img" aria-label={shop}>
    <CommonRoom shop={shop} />
    <ShopSpecial shop={shop} />
    <g filter={`url(#shadow-${shop})`}>
      <path d="M196 254h600l42 76H151z" fill={meta.dark} stroke={ink} strokeWidth="5" />
      <path d="M196 254h600l-10 25H186z" fill={meta.accent} stroke={ink} strokeWidth="4" />
      <path d="M227 290h530M250 312h486" stroke="#f6d79c" strokeOpacity=".35" strokeWidth="4" />
      <rect x="411" y="277" width="137" height="37" rx="9" fill="#f7e7bd" stroke={ink} strokeWidth="4" />
      <Img n={meta.icon} x={455} y={270} s={48} />
    </g>
    <path d="M33 317h894" stroke="#f5d6a0" strokeOpacity=".35" strokeWidth="3" />
  </svg>;
}
