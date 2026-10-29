import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it } from 'vitest';
import { installDom } from './helpers/dom';
import { resetGame, UI } from '../src/game/state';
import { worldLabelBoost } from '../src/game/labelScale';
import { InventoryModal } from '../src/ui/InventoryModal';
import { npcOverheadLayout, placeNpcOverheadRow } from '../src/game/npcLabels';

describe('Android readability regressions', () => {
  beforeEach(() => {
    installDom(1280, 720);
    resetGame();
    UI.portrait = false;
  });

  it('keeps desktop labels unchanged and lifts canvas labels to 12 CSS px on phones', () => {
    expect(worldLabelBoost()).toBe(1);

    installDom(800, 360);
    const landscape = worldLabelBoost();
    expect(landscape).toBeCloseTo(1.6);
    expect(15 * landscape * 0.5).toBeGreaterThanOrEqual(12);

    installDom(360, 740);
    const portraitScale = Math.min(740 / 720, Math.max(360 / 1280, 360 / 650));
    expect(15 * worldLabelBoost() * portraitScale).toBeGreaterThanOrEqual(12);
  });

  it('grows the NPC plate hit geometry with its mobile artwork', () => {
    const desktop = npcOverheadLayout('grandma', 300, 582, 0.72)!;
    expect(desktop.plateBottomY - desktop.plateTopY).toBe(34);

    installDom(800, 360);
    const mobile = npcOverheadLayout('grandma', 300, 582, 0.72)!;
    expect(mobile.plateBottomY - mobile.plateTopY).toBeGreaterThan(34);
    expect(mobile.questBangCenterY).toBeLessThan(mobile.plateTopY);
  });

  it('separates crowded mobile town plates without shrinking their text', () => {
    installDom(800, 360);
    const roles = ['grandma', 'sara', 'engineer', 'rancher', 'jahangir'] as const;
    const placed = placeNpcOverheadRow(roles.map((who, i) => ({ who, x: 420 + i * 24, footY: 620, actorScale: 0.75 })));
    for (let i = 1; i < placed.length; i++) {
      const prev = placed[i - 1], cur = placed[i];
      expect(cur.cx - cur.width / 2).toBeGreaterThanOrEqual(prev.cx + prev.width / 2);
    }
    expect(placed[0].cx - placed[0].width / 2).toBeGreaterThanOrEqual(0);
    expect(placed.at(-1)!.cx + placed.at(-1)!.width / 2).toBeLessThanOrEqual(1280);
  });

  it('uses two roomy artisan columns only in portrait', () => {
    UI.portrait = true;
    const portrait = renderToStaticMarkup(<InventoryModal />);
    expect(portrait).toContain('grid grid-cols-2 gap-2 pb-2');

    UI.portrait = false;
    const landscape = renderToStaticMarkup(<InventoryModal />);
    expect(landscape).toContain('grid grid-cols-2 gap-2 pb-2 sm:grid-cols-4');
  });
});
