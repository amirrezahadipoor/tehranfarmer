// === ابزارهای مشترک مودال‌های فروشگاه (کوچک‌نگه‌داشتن فایل‌ها) ===
import { fa, type BuildJob } from '../game/data';
import { S, UI, farmLevel, notify, buyUpgrade, upgradeLvReq, upgradePrice, type UpKey } from '../game/state';
import { Bar, Coin, Ic, Pips } from './parts';
import { UT } from '../strings/uiText';

export const close = () => { UI.modal = null; notify(); };
export const Wallet = () => <div className="paper flex items-center gap-2 px-3 py-0.5"><Ic n="coin" s={2.2} /><span className="ft text-2xl">{fa(S.coins)}</span></div>;
export const grid = 'grid grid-cols-3 gap-1.5 pb-2 sm:grid-cols-4';
export const buildingNow = (kind: BuildJob['kind'] | string, key: string) => S.builds.find((b) => b.kind === kind && b.key === key);
export const lv = () => farmLevel();
export const Lock = ({ req }: { req: number }) => (
  <div className="flex items-center gap-1 text-xs font-black text-red-700"><Ic n="lock" s={1.5} />{UT.u65}{fa(req)}</div>
);

export function BuyBtn({ n, price, onClick, disabled }: { n: string; price: number; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      className="btn y press min-w-0 flex-1 !flex-col !gap-0 !px-1 !py-1 leading-tight"
      disabled={disabled || S.coins < price}
      onClick={onClick}
    >
      <span className="max-w-full truncate text-[.72rem] font-black">{n}</span>
      <Coin v={price} s={0.95} cls="text-[.72rem]" />
    </button>
  );
}

/** نشان «کارگر مشغول است» با نوار پیشرفت واقعی سفارش */
export function BuildingBadge({ kind, keyName }: { kind: string; keyName: string }) {
  const b = buildingNow(kind, keyName);
  if (!b) return null;
  return (
    <div className="flex w-full flex-col items-center gap-0.5">
      <div className="flex items-center gap-1 text-xs font-black"><Ic n="hammer" s={1.4} />{UT.u181}</div>
      <Bar v={b.prog / b.dur} col="#6cc84c" />
    </div>
  );
}

export function UpCard({ icon, k, cur, max, next, name, compact = false, pipsN }: { icon: string; k: UpKey; cur: string; max: number; next: string | null; name: string; compact?: boolean; pipsN?: number }) {
  const p = upgradePrice(k);
  const b = buildingNow('upgrade', k);
  const req = upgradeLvReq(k);
  const lockL = p !== null && req > lv();
  const filled = pipsN ?? (S.lv[k] + 1);
  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-2.5">
        <Pips n={filled} max={max} />
        <div className="min-w-28 flex">
          {b ? <BuildingBadge kind="upgrade" keyName={k} /> : p === null ? <Ic n="check" s={2.2} /> : lockL ? <Lock req={req} /> : <BuyBtn n={UT.u152} price={p} onClick={() => buyUpgrade(k)} />}
        </div>
      </div>
    );
  }
  return (
    <div className="paper flex flex-col items-center gap-1 p-2">
      <Ic n={icon} s={4.6} />
      <div className="text-sm font-extrabold">{name}</div>
      <Pips n={filled} max={max} />
      <div className="flex items-center gap-1 text-sm font-black"><span>{cur}</span>{next && <><Ic n="arrow" s={1.3} /><span className="text-green-700">{next}</span></>}</div>
      {b ? <BuildingBadge kind="upgrade" keyName={k} /> : p === null ? <Ic n="check" s={2.4} /> : lockL ? <Lock req={req} /> : <BuyBtn n={UT.u152} price={p} onClick={() => buyUpgrade(k)} />}
    </div>
  );
}
