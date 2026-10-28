import { UT } from '../strings/uiText';
import { faPct } from '../strings/fa';
import { Ic } from './parts';

interface BootLoaderProps {
  pct: number;
  label: string;
  fadingOut: boolean;
}

const FLOWERS: readonly [number, number, string][] = [
  [120, 612, '#ffd93b'], [255, 646, '#ff8fab'], [415, 622, '#fffdf6'],
  [548, 658, '#ffd93b'], [642, 628, '#ff9685'], [748, 654, '#fffdf6'],
  [865, 625, '#ffd93b'], [1015, 650, '#ff8fab'], [1155, 616, '#fffdf6'],
];

export function BootLoader({ pct, label, fadingOut }: BootLoaderProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(pct)));

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="boot-loader"
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden select-none"
      style={{
        background: 'linear-gradient(180deg, #58b8f0 0%, #9be0ff 48%, #c9f2a8 76%, #74bf44 100%)',
        opacity: fadingOut ? 0 : 1,
        transition: 'opacity .18s ease-out',
        pointerEvents: fadingOut ? 'none' : 'auto',
      }}
    >
      {/* منظرهٔ دست‌کشیدهٔ کاملاً ایستا (بدون بازرسم تمام‌صفحه در هر فریم تا در هیچ گوشی‌ای پرک نزند) */}
      <svg
        aria-hidden="true"
        viewBox="0 0 1280 720"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 h-full w-full pointer-events-none"
      >
        <circle cx="1010" cy="132" r="84" fill="#fff3b0" opacity="0.55" />
        <circle cx="1010" cy="132" r="54" fill="#ffd93b" stroke="#503426" strokeWidth="4.5" />

        <g fill="#fffdf6" stroke="#503426" strokeWidth="4" strokeLinejoin="round">
          <path d="M180 156 C168 134 196 116 218 122 C234 96 276 98 292 122 C318 120 334 142 324 160 Z" />
          <path d="M470 112 C460 94 484 80 502 84 C516 64 550 66 562 86 C582 84 596 102 588 116 Z" />
          <path d="M745 132 C735 114 759 100 777 104 C791 84 825 86 837 106 C857 104 871 122 863 136 Z" />
        </g>

        <path
          d="M-40 430 L170 250 L330 356 L530 202 L650 318 L790 214 L965 344 L1135 236 L1320 342 L1320 520 L-40 520 Z"
          fill="#8fb4c9"
          stroke="#503426"
          strokeWidth="4.5"
          strokeLinejoin="round"
        />
        <path d="M530 202 L478 262 L508 258 L530 278 L554 256 L584 264 Z" fill="#fffdf6" stroke="#503426" strokeWidth="3.5" strokeLinejoin="round" />
        <path d="M790 214 L744 268 L772 264 L792 282 L814 262 L838 270 Z" fill="#fffdf6" stroke="#503426" strokeWidth="3.5" strokeLinejoin="round" />

        <path d="M-40 468 Q310 358 670 438 T1320 422 L1320 740 L-40 740 Z" fill="#9ad85f" stroke="#503426" strokeWidth="4.5" />
        <path d="M-40 548 Q380 468 780 534 T1320 512 L1320 740 L-40 740 Z" fill="#6ec343" stroke="#503426" strokeWidth="4.5" />

        {/* آسیاب بادی دست‌کشیده */}
        <g transform="translate(212, 430)">
          <path d="M-42 64 L-26 -58 L26 -58 L42 64 Z" fill="#f5e6c8" stroke="#503426" strokeWidth="4.5" strokeLinejoin="round" />
          <path d="M-34 -56 L0 -94 L34 -56 Z" fill="#d9534a" stroke="#503426" strokeWidth="4.5" strokeLinejoin="round" />
          <rect x="-13" y="18" width="26" height="46" rx="6" fill="#9c6234" stroke="#503426" strokeWidth="4" />
          <g transform="translate(0, -52) rotate(26)">
            <rect x="-7" y="-92" width="14" height="78" rx="4" fill="#ffe17d" stroke="#503426" strokeWidth="4" />
            <rect x="-7" y="14" width="14" height="78" rx="4" fill="#ffe17d" stroke="#503426" strokeWidth="4" />
            <rect x="-92" y="-7" width="78" height="14" rx="4" fill="#ffe17d" stroke="#503426" strokeWidth="4" />
            <rect x="14" y="-7" width="78" height="14" rx="4" fill="#ffe17d" stroke="#503426" strokeWidth="4" />
            <circle cx="0" cy="0" r="12" fill="#d9534a" stroke="#503426" strokeWidth="4" />
          </g>
        </g>

        <g stroke="#503426" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
          <rect x="880" y="458" width="320" height="14" rx="4" fill="#d9a35e" />
          <rect x="880" y="492" width="320" height="14" rx="4" fill="#d9a35e" />
          <rect x="910" y="442" width="16" height="84" rx="4" fill="#b87d3e" />
          <rect x="1028" y="442" width="16" height="84" rx="4" fill="#b87d3e" />
          <rect x="1146" y="442" width="16" height="84" rx="4" fill="#b87d3e" />
        </g>

        {FLOWERS.map(([fx, fy, col], idx) => (
          <g key={idx} transform={`translate(${fx}, ${fy})`}>
            <path d="M0 0 L0 18" stroke="#3c8d2f" strokeWidth="3.5" strokeLinecap="round" />
            <circle cx="0" cy="-2" r="9" fill={col} stroke="#503426" strokeWidth="3" />
            <circle cx="0" cy="-2" r="3.2" fill="#503426" />
          </g>
        ))}
      </svg>

      {/* تابلوی چوبی مرکزی بارگذاری */}
      <div
        className="paper relative z-10 mx-4 flex flex-col items-center px-6 py-4 text-center"
        style={{
          width: 'min(92vw, 31rem)',
          paddingLeft: 'max(1.35rem, var(--safe-left))',
          paddingRight: 'max(1.35rem, var(--safe-right))',
        }}
      >
        <div className="mb-1.5 inline-flex items-center gap-1.5 rounded-full border-2 border-[#503426] bg-[#ffe79c] px-3 py-0.5 text-[0.74rem] font-black text-[#4b2f20]">
          <Ic n="wheat" s={1.35} />
          <span>{UT.startRibbon}</span>
          <Ic n="sun" s={1.35} />
        </div>

        <div className="mt-1 flex max-w-full items-center justify-center gap-2">
          <Ic n="cow" s={2.15} />
          <h1
            className="ft whitespace-nowrap leading-none select-none"
            style={{
              fontSize: 'clamp(1.6rem, 4.5vw, 2.65rem)',
              textShadow: '.12rem .12rem 0 rgba(80,52,38,.3)',
            }}
          >
            <span style={{ color: '#e8564a' }}>{UT.u1}</span>{' '}
            <span style={{ color: '#3f9a3a' }}>{UT.u2}</span>
          </h1>
          <Ic n="chicken" s={1.95} />
        </div>

        <p
          data-testid="boot-step-label"
          className="mt-2 mb-2.5 min-h-[1.35rem] text-xs font-extrabold text-[#5b3d2b]"
        >
          {label}
        </p>

        <div
          className="w-full overflow-hidden p-1"
          style={{
            height: '1.65rem',
            background: '#ebd6ad',
            border: '3px solid #503426',
            borderRadius: '999px',
            boxShadow: 'inset 0 2px 4px rgba(80,52,38,.22)',
          }}
        >
          <div
            data-testid="boot-progress-bar"
            className="h-full rounded-full"
            style={{
              width: `${Math.max(8, clamped)}%`,
              background: 'linear-gradient(90deg, #52b74a 0%, #8be053 55%, #ffd93b 100%)',
              border: '2px solid #503426',
              transition: 'width .14s ease-out',
            }}
          />
        </div>

        <div
          data-testid="boot-progress-pct"
          className="ft mt-1.5 text-xl text-[#503426]"
        >
          {faPct(clamped)}
        </div>
      </div>
    </div>
  );
}
