import type { ReactNode } from 'react';
import { S, UI, notify } from '../game/state';
import { SHOP_META } from '../game/shops';
import { CFG } from '../game/settings';
import { NPC_ROLES } from '../strings/estateStoryText';
import { SHOP_TEXT, SHOP_UI } from '../strings/shopText';
import { talkToShopkeeper } from '../story/engine';
import { sfx } from '../game/sound';
import { Ic, ModalVisitContext, useDialogFocus } from './parts';
import { Portrait } from './portraits';
import { ShopInteriorArt } from './ShopInteriorArt';

const locale = () => CFG.locale === 'en' ? 'en' : 'fa';

function leaveShop() {
  UI.modal = null;
  UI.afterModal = null;
  UI.shopPanel = 'lobby';
  sfx.tap();
  notify();
}

function backToLobby() {
  UI.shopPanel = 'lobby';
  UI.afterModal = null;
  sfx.tap();
  notify();
}

function PurchaseBanner() {
  const loc = locale();
  const shop = UI.activeShop;
  const meta = SHOP_META[shop];
  const keeper = NPC_ROLES[loc][meta.keeper];
  return <div data-shop-purchase={shop} data-shop-keeper={meta.keeper} className="paper mb-2 flex flex-wrap items-center gap-2 border-[#8a653d] bg-[#fff7df] p-2">
    <div className="relative h-12 w-12 overflow-hidden rounded-full border-2 border-[#503426] bg-[#ead9b4]">
      <div className="absolute left-1/2 top-1 -translate-x-1/2"><Portrait id={meta.keeper} size={3.5} /></div>
    </div>
    <div className="min-w-0 flex-1">
      <div className="text-[.68rem] font-black text-[#86603b]">{SHOP_UI[loc].purchase} · {SHOP_UI[loc].seller}</div>
      <div className="break-words text-sm font-black leading-normal">{keeper.name} — {SHOP_TEXT[shop][loc].name}</div>
    </div>
    <button type="button" data-shop-back-lobby="1" className="btn b press !min-h-[max(48px,2.5rem)] !whitespace-normal !px-2.5 !py-1 text-[.72rem] font-black" onClick={backToLobby}>
      <Ic n="arrow" s={1.2} /><span>{SHOP_UI[loc].backLobby}</span>
    </button>
  </div>;
}

function ShopLobby() {
  const loc = locale();
  const shop = UI.activeShop;
  const meta = SHOP_META[shop];
  const copy = SHOP_TEXT[shop][loc];
  const keeper = NPC_ROLES[loc][meta.keeper];
  const dialogueActive = Boolean(S.story.pending);
  const shortViewport = typeof window !== 'undefined' && window.innerHeight <= 430;
  const rootFontPx = shortViewport && typeof getComputedStyle === 'function' ? parseFloat(getComputedStyle(document.documentElement).fontSize) || 16 : 16;
  const keeperSize = shortViewport ? 112 / rootFontPx : 8.5; // پرتره با فونت ۱۲۰٪ از قاب کوتاه بیرون نمی‌زند
  const dialogRef = useDialogFocus<HTMLDivElement>('[data-shop-talk]', dialogueActive ? false : shop);

  const talk = () => {
    UI.shopPanel = 'lobby';
    UI.afterModal = 'shop';
    const started = talkToShopkeeper(shop);
    if (!started) { UI.afterModal = null; notify(); }
    sfx.tap();
  };
  const buy = () => {
    UI.shopPanel = 'buy';
    UI.afterModal = null;
    sfx.tap();
    notify();
  };

  return <div
    ref={dialogRef}
    role={dialogueActive ? undefined : 'dialog'}
    aria-modal={dialogueActive ? undefined : true}
    aria-hidden={dialogueActive || undefined}
    aria-label={dialogueActive ? undefined : copy.name}
    inert={dialogueActive}
    tabIndex={-1}
    data-shop-interior={shop}
    className="fixed inset-0 z-[60] flex items-center justify-center bg-[#21150f]/75"
    style={{ padding: 'max(.5rem, var(--safe-top)) max(.5rem, var(--safe-right)) max(.5rem, var(--safe-bottom)) max(.5rem, var(--safe-left))' }}
    onClick={(event) => { if (!dialogueActive && event.target === event.currentTarget) leaveShop(); }}
  >
    <div className="paper popin flex max-h-full w-[min(97vw,62rem)] flex-col overflow-hidden border-[#503426] bg-[#f8ebc9] p-2 shadow-2xl sm:p-3">
      <header className="mb-2 flex shrink-0 items-center gap-2">
        <div className="paper-dark flex min-w-0 flex-1 items-center gap-2 px-3 py-1 text-[#fff4d8]" style={{ backgroundColor: meta.dark }}>
          <Ic n={meta.icon} s={2.1} />
          <div className="min-w-0">
            <div className="text-[.63rem] font-black uppercase tracking-wide opacity-75">{SHOP_UI[loc].eyebrow}</div>
            <h2 className="ft break-words text-xl leading-normal sm:text-2xl">{copy.name}</h2>
          </div>
        </div>
        <button type="button" data-shop-exit="1" aria-label={SHOP_UI[loc].close} className="btn r press !min-h-[max(48px,2.6rem)] !min-w-[max(48px,2.6rem)] !p-1" onClick={leaveShop}>
          <Ic n="close" s={2.1} />
        </button>
      </header>

      <div className="scroll min-h-0 flex-1 pr-1" tabIndex={0} role={dialogueActive ? undefined : 'region'} aria-label={dialogueActive ? undefined : copy.subtitle} data-modal-scroll="1">
        <div className="shop-art-frame relative overflow-hidden rounded-2xl border-[3px] border-[#503426] bg-[#b98956] shadow-inner">
          <ShopInteriorArt shop={shop} />
          <div className="pointer-events-none absolute bottom-0 right-[2%] h-[88%] w-[9rem] max-w-[30%] overflow-hidden" data-shop-keeper={meta.keeper}>
            <div className="absolute bottom-[-.5rem] left-1/2 -translate-x-1/2"><Portrait id={meta.keeper} size={keeperSize} /></div>
          </div>
          <div className="paper pointer-events-none absolute right-2 top-2 max-w-[55%] px-2.5 py-1 text-center shadow-lg">
            <div className="text-[.62rem] font-black text-[#8a613a]">{SHOP_UI[loc].seller}</div>
            <div className="break-words text-sm font-black leading-normal sm:text-base">{keeper.name}</div>
            <div className="hidden break-words text-[.68rem] font-bold leading-normal text-[#725035] sm:block">{keeper.job}</div>
          </div>
        </div>

        <div className="paper mt-2 flex items-start gap-2 border-[#b78b52] bg-[#fff9e9] p-2.5">
          <Ic n={meta.icon} s={2.1} cls="mt-0.5" />
          <div className="min-w-0">
            <p className="text-xs font-black leading-5 text-[#4b3122] sm:text-sm">{copy.greeting}</p>
            <p className="mt-0.5 hidden text-[.72rem] font-bold leading-5 text-[#765439] sm:block">{copy.detail}</p>
          </div>
        </div>
      </div>

      <div className="mt-2 grid shrink-0 grid-cols-2 gap-2 pb-1" aria-label={SHOP_UI[loc].choice}>
        <button type="button" data-shop-talk={shop} className="btn b press min-w-0 !min-h-[max(52px,3.35rem)] !flex-col !gap-0.5 !whitespace-normal !px-2 !py-1.5 text-center" onClick={talk}>
          <span className="flex w-full min-w-0 flex-wrap items-center justify-center gap-1.5 break-words text-sm font-black leading-normal sm:text-base"><Ic n="mail" s={1.35} />{SHOP_UI[loc].talk}</span>
          <span className="max-w-full break-words text-[.65rem] font-bold leading-4">{keeper.name}</span>
        </button>
        <button type="button" data-shop-buy={shop} className="btn g press min-w-0 !min-h-[max(52px,3.35rem)] !flex-col !gap-0.5 !whitespace-normal !px-2 !py-1.5 text-center" onClick={buy}>
          <span className="flex w-full min-w-0 flex-wrap items-center justify-center gap-1.5 break-words text-sm font-black leading-normal sm:text-base"><Ic n="cart" s={1.35} />{SHOP_UI[loc].buy}</span>
          <span className="max-w-full break-words text-[.65rem] font-bold leading-4">{copy.subtitle}</span>
        </button>
      </div>
    </div>
  </div>;
}

/** مودال خرید قبلی بدون تغییر اقتصادی، حالا با نوار فروشنده و مسیر بازگشت به داخل‌نما. */
export function ShopExperience({ catalog }: { catalog: ReactNode }) {
  if (UI.shopPanel === 'buy') {
    return <ModalVisitContext.Provider value={{ onClose: backToLobby, banner: <PurchaseBanner /> }}>{catalog}</ModalVisitContext.Provider>;
  }
  return <ShopLobby />;
}
