import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { installDom } from './helpers/dom';
import { S, UI, resetGame } from '../src/game/state';
import { openShop, SHOP_IDS, SHOP_META } from '../src/game/shops';
import { ShopExperience } from '../src/ui/ShopExperience';
import { Modal } from '../src/ui/parts';
import { pendingNode, talkToShopkeeper } from '../src/story/engine';
import { sceneA11yTargets } from '../src/game/a11y';
import { EN_LINES } from '../src/strings/cinemaLocales';

beforeAll(() => { installDom(); });
beforeEach(() => {
  localStorage.clear();
  resetGame();
  UI.started = true;
  UI.scene = 'town';
  UI.modal = null;
  UI.afterModal = null;
  S.story.pending = null;
});

describe('شش داخل‌فروشگاه و فروشندهٔ سراسری', () => {
  it('هر فروشگاه داخل‌نما، فروشندهٔ مشخص و دقیقاً دو مسیر گفت‌وگو/خرید دارد', () => {
    for (const shop of SHOP_IDS) {
      openShop(shop);
      expect(UI.modal).toBe('shop');
      expect(UI.shopPanel).toBe('lobby');
      expect(UI.activeShop).toBe(shop);
      const html = renderToString(<ShopExperience catalog={<div data-catalog={shop} />} />);
      expect(html).toContain(`data-shop-interior="${shop}"`);
      expect(html).toContain(`data-shop-keeper="${SHOP_META[shop].keeper}"`);
      expect(html).toContain(`data-shop-talk="${shop}"`);
      expect(html).toContain(`data-shop-buy="${shop}"`);
      expect(html).toContain('گفت‌وگو با فروشنده');
      expect(html).toContain('خرید و معامله');
      expect(html).not.toContain(`data-catalog="${shop}"`);
    }
  });

  it('پیشخوان خرید همان کاتالوگ واقعی را با فروشنده و بازگشت به داخل‌نما نشان می‌دهد', () => {
    openShop('work');
    UI.shopPanel = 'buy';
    const html = renderToString(<ShopExperience catalog={<Modal title="کارگاه" icon="workshop" onClose={() => {}}><div data-real-catalog="1" /></Modal>} />);
    expect(html).toContain('data-shop-purchase="work"');
    expect(html).toContain('data-shop-back-lobby="1"');
    expect(html).toContain('data-shop-keeper="engineer"');
    expect(html).toContain('data-real-catalog="1"');
  });

  it('گفت‌وگوی هر شش فروشنده داخل همان مغازه باقی می‌ماند و گره‌های FA/EN موجودند', () => {
    for (const shop of SHOP_IDS) {
      resetGame();
      UI.started = true;
      UI.modal = 'shop';
      UI.afterModal = 'shop';
      UI.activeShop = shop;
      UI.shopPanel = 'lobby';
      S.story.pending = null;
      S.story.seen[`shop-intro-${shop}`] = true;
      const node = talkToShopkeeper(shop);
      expect(node, shop).not.toBeNull();
      expect(pendingNode()?.id).toBe(node!.id);
      expect(UI.modal).toBe('shop');
      expect(UI.afterModal).toBe('shop');
      expect(EN_LINES[node!.id], `EN ${node!.id}`).toBeDefined();
    }
  });

  it('در خیابان فقط جهانگیرِ قابل‌گفت‌وگو می‌ماند؛ چهار فروشنده هدف لمسی خیابانی ندارند', () => {
    const ids = sceneA11yTargets().map((target) => target.id);
    expect(ids).toContain('sharkhar');
    expect(ids).toContain('shop:seed');
    expect(ids).toContain('shop:estate');
    expect(ids.some((id) => id.startsWith('npc:'))).toBe(false);
  });
});
