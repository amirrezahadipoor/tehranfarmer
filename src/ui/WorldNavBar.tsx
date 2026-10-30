import { cmd } from '../game/engine';
import { CFG } from '../game/settings';
import { UI, notify } from '../game/state';
import { sfx } from '../game/sound';
import { ESTATE_UI } from '../strings/estateStoryText';
import { FT } from '../strings/frontierText';
import { UT } from '../strings/uiText';
import { Ic } from './parts';

/** Full desktop navigation plus a single compact Atlas destination on small screens. */
export function WorldNavBar() {
  const cur = UI.scene;
  const eu = ESTATE_UI[CFG.locale === 'en' ? 'en' : 'fa'];
  const places = [
    { id: 'farm', ic: 'house', label: UT.backFarm, cls: 'g' },
    { id: 'north', ic: 'north', label: eu.goNorth, cls: 'g' },
    { id: 'valley', ic: 'valley', label: eu.goValley, cls: 'y' },
    { id: 'town', ic: 'cart', label: UT.goTown, cls: 'y' },
    { id: 'river', ic: 'fish', label: UT.goRiver, cls: 'b' },
    { id: 'cave', ic: 'cave', label: FT.navCave, cls: 'b' },
    { id: 'apiary', ic: 'honey', label: UT.goApiary, cls: 'p' },
    { id: 'forest', ic: 'forest', label: FT.navForest, cls: 'g' },
  ] as const;
  return (
    <>
      <div className="paper pointer-events-auto hidden flex-wrap items-center justify-center gap-0.5 p-0.5 min-[901px]:flex xl:gap-1 xl:p-1" data-world-nav="desktop">
        {places.map((pl) => {
          const active = cur === pl.id;
          return (
            <button
              key={pl.id}
              data-nav={pl.id}
              aria-label={pl.label}
              title={pl.label}
              disabled={active}
              onClick={() => { sfx.tap(); cmd.travelTo(pl.id); }}
              className={`btn ${pl.cls} press !min-h-[max(48px,2.45rem)] !min-w-[max(48px,2.35rem)] !p-0.5 xl:!p-1 ${active ? 'ring-2 ring-[#503426] !opacity-100 !filter-none' : ''}`}
            >
              <Ic n={pl.ic} s={UI.portrait ? 1.32 : 1.5} />
            </button>
          );
        })}
      </div>
      <div className="paper pointer-events-auto p-0.5 min-[901px]:hidden" data-world-nav="compact">
        <button
          type="button"
          className="btn g press !min-h-[max(48px,2.45rem)] !px-2.5 !py-0.5 text-xs font-black"
          aria-label={FT.atlasTitle}
          title={FT.atlasTitle}
          data-mobile-atlas="1"
          onClick={() => { sfx.tap(); UI.modal = 'atlas'; notify(); }}
        >
          <Ic n={places.find((pl) => pl.id === cur)?.ic ?? 'atlas'} s={1.55} />
          <span>{FT.navAtlas}</span>
          <Ic n="atlas" s={1.55} />
        </button>
      </div>
    </>
  );
}
