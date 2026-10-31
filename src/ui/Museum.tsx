// ===== موزهٔ میراث مزرعه، تندیس طلایی جهانگیر و تالار رازهای کهن دره =====
import { S, ownedFarms, visitMuseum } from '../game/state';
import { MUSEUM_GIFT_COINS } from '../game/data';
import { SECRETS, TRUE_ENDING_MIN_SECRETS, checkSecretTriggers, discoveredSecretCount } from '../story/secrets';
import { fa } from '../strings/fa';
import { Coin, Ic, Modal } from './parts';
import { close } from './shopKit';
import { UT } from '../strings/uiText';

export function Museum() {
  const open = S.story.postgame;
  const foundCount = discoveredSecretCount();
  return (
    <Modal title={open ? UT.museumTitle : UT.museumTitlePre} icon="trophy" onClose={close} coins={<Coin v={S.coins} />}>
      {!open ? (
        <div className="paper p-4 text-center text-sm font-extrabold">{UT.museumLocked}</div>
      ) : (
        <div className="flex flex-col items-center gap-3 pb-3" data-museum-hall="1">
          <div className="museum-legacy-hero paper relative w-full max-w-md overflow-hidden p-3" data-museum-legacy-hero="1">
            <div className="museum-hero-glow" aria-hidden="true" />
            <div className="relative flex items-center gap-3">
              <div className="museum-legacy-seal"><Ic n="trophy" s={3.4} /></div>
              <div className="min-w-0 flex-1">
                <div className="ft text-xl text-[#5a3518] sm:text-2xl">{UT.museumLegacyTitle}</div>
                <div className="mt-0.5 text-xs font-extrabold leading-relaxed opacity-75">{UT.museumLegacyText}</div>
              </div>
            </div>
            <div className="relative mt-2 flex items-end justify-center gap-3" aria-label={UT.museumEstateSeal}>
              <Ic n="house" s={2.3} /><Ic n="greenhouse" s={2.8} /><Ic n="valley" s={2.3} />
            </div>
            <div className="relative mt-2 grid grid-cols-3 gap-1.5">
              {[
                { id: 'freedom', icon: 'note', value: fa(S.debt?.paidTotal ?? 0), label: UT.museumDebtSeal },
                { id: 'harvest', icon: 'wheat', value: fa(S.stats.cropHarv), label: UT.museumHarvestSeal },
                { id: 'estates', icon: 'land', value: fa(ownedFarms().length), label: UT.museumEstateSeal },
              ].map((exhibit) => (
                <div key={exhibit.id} data-museum-exhibit={exhibit.id} className="rounded-lg border-2 border-[#c89b53] bg-[#fff4d8]/80 px-1.5 py-1.5 text-center">
                  <Ic n={exhibit.icon} s={1.55} cls="mx-auto" />
                  <div className="ft text-base leading-tight">{exhibit.value}</div>
                  <div className="text-[.65rem] font-black leading-tight opacity-70">{exhibit.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="paper flex w-full max-w-md flex-col items-center p-3">
            <svg viewBox="0 0 220 130" className="h-32 w-52" aria-hidden="true">
              <rect x="46" y="96" width="128" height="24" rx="5" fill="#b6b0a6" stroke="#503426" strokeWidth="3" />
              <rect x="64" y="84" width="92" height="14" rx="4" fill="#d8d2c6" stroke="#503426" strokeWidth="2.5" />
              <circle cx="96" cy="36" r="14" fill="#ffd93b" stroke="#503426" strokeWidth="3" />
              <path d="M80 28 Q96 14 112 28 Z" fill="#e6b422" stroke="#503426" strokeWidth="2.5" />
              <rect x="82" y="50" width="28" height="34" rx="6" fill="#f2c94c" stroke="#503426" strokeWidth="3" />
              <line x1="126" y1="84" x2="144" y2="30" stroke="#c8924e" strokeWidth="6" strokeLinecap="round" />
              <ellipse cx="146" cy="26" rx="9" ry="6" fill="#ffd93b" stroke="#503426" strokeWidth="2.5" />
              <line x1="146" y1="84" x2="126" y2="34" stroke="#8a5a28" strokeWidth="5" strokeLinecap="round" />
            </svg>
            <div className="mt-1 text-center text-xs font-extrabold leading-relaxed">{UT.museumPlaque}</div>
          </div>

          <div className="grid w-full max-w-md grid-cols-2 gap-2 text-center text-xs font-black">
            <div className="paper p-2"><div className="opacity-65">{UT.museumHarv}</div><div className="ft text-xl">{fa(S.stats.harv ?? 0)}</div></div>
            <div className="paper p-2"><div className="opacity-65">{UT.museumFish}</div><div className="ft text-xl">{fa((S.stats.fish ?? 0) + (S.stats.honey ?? 0))}</div></div>
            <div className="paper p-2"><div className="opacity-65">{UT.museumPaid}</div><div className="ft text-xl">{fa(S.debt?.paidTotal ?? 0)}</div></div>
            <div className="paper p-2"><div className="opacity-65">{UT.museumDays}</div><div className="ft text-xl">{fa(S.day)}</div></div>
          </div>

          <button
            className={'btn press w-full max-w-md flex-wrap justify-center !px-4 !py-1.5 ' + (S.museumVisited ? 'b' : 'g')}
            disabled={S.museumVisited}
            onClick={() => {
              visitMuseum();
              if (checkSecretTriggers('museum-open')) close();
            }}
          >
            <Ic n="medal" s={2} />
            <span className="text-sm font-black">{S.museumVisited ? UT.museumClaimed : UT.museumClaim}</span>
            {!S.museumVisited && <Coin v={MUSEUM_GIFT_COINS} s={1.4} />}
          </button>

          <div className="paper w-full max-w-md p-2.5 text-center text-xs font-extrabold">
            <span>{UT.secretsTitle}: <span dir="ltr">{fa(foundCount)} / {fa(SECRETS.length)}</span></span>
            {S.museumVisited && !S.secrets?.['secret-true-epilogue'] && (
              <div className="mt-1 text-[.7rem] opacity-80">{SECRETS[7].clueFa}</div>
            )}
            {S.museumVisited && !S.secrets?.['secret-true-epilogue'] && foundCount >= TRUE_ENDING_MIN_SECRETS && (
              <button
                className="btn y press mt-1.5 !px-3 !py-1"
                onClick={() => { if (checkSecretTriggers('museum-open')) close(); }}
              >
                <Ic n="star" s={1.5} />
                <span className="text-xs font-black">{SECRETS[7].titleFa}</span>
              </button>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
