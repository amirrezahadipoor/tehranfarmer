import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../game/art', () => ({ iconURL: (name: string) => `data:image/svg+xml,${name}` }));
import { renderToStaticMarkup } from 'react-dom/server';
import { SOIL_BONUS, SOIL_PRICES } from '../game/data';
import { fresh, resetLvCache, S } from '../game/state';
import { faDec } from '../strings/fa';
import { UT } from '../strings/uiText';
import { SoilUpCard } from './Shops2';

describe('golden soil UI/core consistency', () => {
  beforeEach(() => {
    Object.assign(S, fresh());
    resetLvCache();
  });

  it('renders every upgrade pip and the exact current/next core bonuses', () => {
    S.lv.soil = 2;
    const html = renderToStaticMarkup(<SoilUpCard />);
    expect(html).toContain(`data-pips="${2}"`);
    expect(html).toContain(`data-pips-max="${SOIL_PRICES.length}"`);
    expect(html).toContain(`+${faDec(2 * SOIL_BONUS * 100)}${UT.u46}`);
    expect(html).toContain(`+${faDec(3 * SOIL_BONUS * 100)}${UT.u46}`);
  });

  it('shows the real +36% cap with five filled pips and no phantom next tier', () => {
    S.lv.soil = SOIL_PRICES.length;
    const html = renderToStaticMarkup(<SoilUpCard />);
    expect(html).toContain(`data-pips="${SOIL_PRICES.length}"`);
    expect(html).toContain(`data-pips-max="${SOIL_PRICES.length}"`);
    expect(html).toContain(`+${faDec(SOIL_PRICES.length * SOIL_BONUS * 100)}${UT.u46}`);
    expect(html).not.toContain('text-green-700');
  });
});
