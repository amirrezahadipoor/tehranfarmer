import { memo, type ReactNode } from 'react';
import { iconURL } from '../game/art';
import { fa, faPct } from '../game/data';
import { UT } from '../strings/uiText';

export const Ic = memo(function Ic({ n, s = 3, cls = '' }: { n: string; s?: number; cls?: string }) {
  return (
    <img
      src={iconURL(n)}
      alt=""
      decoding="sync"
      draggable={false}
      style={{ width: `${s}rem`, height: `${s}rem` }}
      className={'pointer-events-none select-none shrink-0 ' + (n === 'arrow' ? 'rtl:-scale-x-100 ' : '') + cls}
    />
  );
});

export function Coin({ v, s = 1.6, cls = '' }: { v: number; s?: number; cls?: string }) {
  return (
    <span className={'inline-flex items-center gap-1 font-extrabold ' + cls}>
      <Ic n="coin" s={s} />
      <span>{fa(v)}</span>
    </span>
  );
}

export function Trend({ r }: { r: number }) {
  const up = r > 1.12, down = r < 0.88;
  const pct = Math.round(r * 100);
  return (
    <span className="inline-flex items-center gap-1" title={faPct(pct)}>
      <span aria-hidden style={up ? { display: 'inline-block', width: 0, height: 0, borderLeft: '7px solid transparent', borderRight: '7px solid transparent', borderBottom: '9px solid #15803d' } : down ? { display: 'inline-block', width: 0, height: 0, borderLeft: '7px solid transparent', borderRight: '7px solid transparent', borderTop: '9px solid #dc2626' } : { display: 'inline-block', width: 9, height: 9, borderRadius: 6, background: '#a8a29e' }} />
      <span className="bar w-10"><i style={{ width: `${Math.max(8, Math.min(100, (r / 1.6) * 100))}%`, background: up ? '#6cc84c' : down ? '#ff7a6a' : '#c9b99a' }} /></span>
      <span className={'text-[.66rem] font-black ' + (up ? 'text-green-800' : down ? 'text-red-700' : 'text-[#6c5538]')}>{faPct(pct)}</span>
    </span>
  );
}

export function Bar({ v, col, icon }: { v: number; col: string; icon?: string }) {
  return (
    <div className="flex w-full items-center gap-1">
      {icon && <Ic n={icon} s={1.5} />}
      <div className="bar flex-1"><i style={{ width: `${Math.max(0, Math.min(1, v)) * 100}%`, background: col }} /></div>
    </div>
  );
}

export function Pips({ n, max }: { n: number; max: number }) {
  return (
    <div className="flex max-w-[9.5rem] flex-wrap justify-center gap-1" dir="ltr">
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className="inline-block h-3 w-3 rounded-full border-2 border-[#503426]" style={{ background: i < n ? '#ffd93b' : '#f3e6c4' }} />
      ))}
    </div>
  );
}

export const ModalShell = Modal;

export function Modal({ title, icon, onClose, children, coins }: { title: string; icon: string; onClose: () => void; children: ReactNode; coins?: ReactNode; wide?: boolean }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45"
      style={{
        paddingLeft: 'max(0.5rem, var(--safe-left))',
        paddingRight: 'max(0.5rem, var(--safe-right))',
        paddingTop: 'max(0.5rem, var(--safe-top))',
        paddingBottom: 'max(0.5rem, var(--safe-bottom))',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="paper popin flex max-h-[calc(100dvh-var(--safe-top)-var(--safe-bottom)-1rem)] w-[min(94vw,46rem)] max-w-[calc(100vw-var(--safe-left)-var(--safe-right)-1rem)] flex-col p-2 sm:p-2.5"
      >
        <div className="mb-1.5 flex items-center gap-2">
          <div className="paper-dark flex min-w-0 flex-1 items-center gap-1.5 px-2.5 py-0.5 text-[#fff4d8] sm:flex-initial">
            <Ic n={icon} s={2.05} />
            <span className="ft text-xl sm:truncate sm:text-2xl">{title}</span>
          </div>
          <div className="hidden flex-1 sm:block" />
          {coins && <div className="shrink-0">{coins}</div>}
          <button aria-label={UT.closeBtn} className="btn r press !min-h-[max(48px,2.5rem)] !min-w-[max(48px,2.5rem)] !p-1" onClick={onClose}><Ic n="close" s={2.2} /></button>
        </div>
        <div className="scroll min-h-0 flex-1 pr-1">{children}</div>
      </div>
    </div>
  );
}
