import '../src/strings/en';
import { renderToString } from 'react-dom/server';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { installDom } from './helpers/dom';
import { checkInvariants } from './helpers/invariants';
import { CFG } from '../src/game/settings';
import { S, UI, exportSaveJson, importSaveJson, resetGame } from '../src/game/state';
import { ensureFrontier } from '../src/game/core/frontier';
import {
  activeMineNodes, closeMineEncounter, completeMineNode, currentMineEncounter, finishMineEncounter, mineFloorProgress,
  openMineEncounter, openMineMap, stepMineFloor,
} from '../src/game/core/mining';
import { MiningModal } from '../src/ui/MiningModal';
import { MineMapModal, MineStatusChip } from '../src/ui/MinePanels';

const quick = [0.45, 0.45, 0.45];
const visible = (html: string) => html.replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ');

describe('Rebuilt Mine Expedition — skill, guarantees, progression, saves and bilingual UI', () => {
  beforeAll(() => installDom());
  beforeEach(() => {
    closeMineEncounter();
    resetGame();
    CFG.locale = 'fa';
    UI.scene = 'cave';
    UI.modal = null;
    S.story.prologueSeen = true;
    S.story.chapter = 6;
    S.stamina = 500;
  });

  it('opening and cancelling costs nothing; only a real completed extraction spends stamina', () => {
    const before = S.stamina;
    expect(openMineEncounter(0)).toBe(true);
    expect(UI.modal).toBe('mining');
    expect(currentMineEncounter()?.spot.good).toBe(activeMineNodes()[0].good);
    closeMineEncounter();
    expect(UI.modal).toBeNull();
    expect(S.stamina).toBe(before);
    expect(mineFloorProgress(1).cleared).toBe(0);
    const result = completeMineNode(1, 0, quick);
    expect(result?.qty).toBe(1);
    expect(S.stats.harv).toBe(1);
    expect(S.stamina).toBe(before - activeMineNodes(1)[0].stam);
  });

  it('rejects incomplete strikes, insufficient stamina and duplicate completion without economic drift', () => {
    const before = S.stamina;
    expect(completeMineNode(1, 0, [1])).toBeNull();
    expect(S.stamina).toBe(before);
    const first = completeMineNode(1, 0, quick);
    expect(first).not.toBeNull();
    const spent = S.stamina;
    const gems = S.stats.mineGems;
    expect(completeMineNode(1, 0, quick)).toBeNull();
    expect(S.stamina).toBe(spent);
    expect(S.stats.mineGems).toBe(gems);
    S.stamina = 0;
    expect(openMineEncounter(1)).toBe(false);
    expect(UI.modal).toBeNull();
    expect(completeMineNode(1, 1, quick)).toBeNull();
    checkInvariants('mine-validation');
  });

  it('two veins power the lift permanently while daily nodes and deterministic layouts refresh', () => {
    const dayOneLayout = activeMineNodes(1).map((n) => n.good);
    completeMineNode(1, 0, quick);
    expect(stepMineFloor(1)).toBe(false);
    completeMineNode(1, 1, quick);
    expect(mineFloorProgress(1).liftOpen).toBe(true);
    expect(stepMineFloor(1)).toBe(true);
    expect(ensureFrontier().maxCaveFloor).toBe(2);
    S.day = 2;
    expect(mineFloorProgress(1).cleared).toBe(0);
    expect(mineFloorProgress(1).liftOpen).toBe(true);
    expect(activeMineNodes(1).map((n) => n.good)).not.toEqual(dayOneLayout);
    expect(ensureFrontier().maxCaveFloor).toBe(2);
    const snap = exportSaveJson();
    resetGame();
    expect(importSaveJson(snap)).toBe(true);
    expect(ensureFrontier().maxCaveFloor).toBe(2);
    expect(ensureFrontier().stairsFound['cave:1']).toBe(true);
  });

  it('royal vein upgrades ruby to diamond only through flawless four-stage extraction', () => {
    const f = ensureFrontier();
    f.maxCaveFloor = 3;
    f.caveFloor = 3;
    const normal = completeMineNode(3, 5, [0.45, 0.45, 0.45, 0.45]);
    expect(normal).toMatchObject({ good: 'ruby', qty: 1, perfect: false });
    S.day = 2;
    S.stamina = 500;
    const flawless = completeMineNode(3, 5, [0.97, 0.97, 0.97, 0.97]);
    expect(flawless).toMatchObject({ good: 'diamond', qty: 1, perfect: true });
    expect(S.stats.minePerfect).toBe(1);
  });

  it('a stale finish callback cannot spend or complete a newly reopened encounter', () => {
    expect(openMineEncounter(0)).toBe(true);
    const staleToken = currentMineEncounter()!.token;
    closeMineEncounter();
    expect(openMineEncounter(1)).toBe(true);
    const currentToken = currentMineEncounter()!.token;
    expect(currentToken).not.toBe(staleToken);
    const stamina = S.stamina;
    expect(finishMineEncounter(quick, staleToken)).toBeNull();
    expect(currentMineEncounter()?.token).toBe(currentToken);
    expect(UI.modal).toBe('mining');
    expect(S.stamina).toBe(stamina);
    expect(mineFloorProgress(1).cleared).toBe(0);
    expect(finishMineEncounter(quick, currentToken)?.qty).toBe(1);
    expect(UI.modal).toBeNull();
  });

  it('mining modal, map and contextual HUD render in FA and EN without Persian leaks or ASCII FA digits', () => {
    openMineEncounter(0);
    const faMining = visible(renderToString(<MiningModal />));
    expect(faMining).toContain('شکستن رگه');
    expect(/[0-9]/.test(faMining)).toBe(false);
    openMineMap();
    const faMap = visible(renderToString(<MineMapModal />));
    expect(faMap).toContain('دفترچهٔ معدن');
    expect(/[0-9]/.test(faMap)).toBe(false);
    expect(/[0-9]/.test(visible(renderToString(<MineStatusChip />)))).toBe(false);

    CFG.locale = 'en';
    openMineEncounter(0);
    expect(/[\u0600-\u06FF]/.test(visible(renderToString(<MiningModal />)))).toBe(false);
    openMineMap();
    expect(/[\u0600-\u06FF]/.test(visible(renderToString(<MineMapModal />)))).toBe(false);
    expect(/[\u0600-\u06FF]/.test(visible(renderToString(<MineStatusChip />)))).toBe(false);
    CFG.locale = 'fa';
  });
});
