// Industrial Machine Automation Engine (Full Homestead + Tiered Satellite Multi-Estate Automation + Zero-Arbitrage Trough Milling)
import { ANIMALS, MK_BATCH, MK_FERTSAVE, POND_FEED, XP } from '../data';
import {
  S, addGood, addStat, addXp, canAct, doAct, fertAddAmt, ghCoversFarm,
  mkOf, ownedFarms, pickSeed, plotsForFarm, troughCap,
} from '../state';

export function runAuto() {
  const A = S.auto;
  const farms = ownedFarms();
  if (A.harvest) {
    const satCap = MK_BATCH[mkOf('harvester')] ?? 999;
    let satDone = 0;
    for (const f of farms) {
      const n = plotsForFarm(f).length;
      for (let i = 0; i < n; i++) {
        if (f !== 'farm' && satDone >= satCap) break;
        if (canAct('harvest', i, true, undefined, f) === '') {
          doAct('harvest', i, true, undefined, true, f);
          if (f !== 'farm') satDone++;
        }
      }
    }
  }
  if (A.till) {
    const satCap = MK_BATCH[mkOf('tractor')] ?? 999;
    let satDone = 0;
    for (const f of farms) {
      const n = plotsForFarm(f).length;
      for (let i = 0; i < n; i++) {
        if (f !== 'farm' && satDone >= satCap) break;
        if (canAct('till', i, true, undefined, f) === '') {
          doAct('till', i, true, undefined, true, f);
          if (f !== 'farm') satDone++;
        }
      }
    }
  }
  if (A.plant) {
    const satCap = MK_BATCH[mkOf('seeder')] ?? 999;
    let satDone = 0;
    let baseOut = pickSeed(false);
    let baseGh = S.gh > 0 ? pickSeed(true) : baseOut;
    for (const f of farms) {
      const hasLock = S.farmSeeds?.[f] && S.farmSeeds[f] !== 'auto';
      let seedOut = hasLock ? pickSeed(false, f) : baseOut;
      let seedGh = S.gh > 0 ? (hasLock ? pickSeed(true, f) : baseGh) : seedOut;
      const n = plotsForFarm(f).length;
      for (let i = 0; i < n; i++) {
        if (f !== 'farm' && satDone >= satCap) break;
        const gh = ghCoversFarm(f, i);
        let s = gh ? seedGh : seedOut;
        if (s && (S.seeds[s] ?? 0) <= 0) {
          baseOut = pickSeed(false);
          baseGh = S.gh > 0 ? pickSeed(true) : baseOut;
          seedOut = hasLock ? pickSeed(false, f) : baseOut;
          seedGh = S.gh > 0 ? (hasLock ? pickSeed(true, f) : baseGh) : seedOut;
          s = gh ? seedGh : seedOut;
        }
        if (!s || (S.seeds[s] ?? 0) <= 0) continue;
        if (canAct('plant', i, true, s, f) === '') {
          doAct('plant', i, true, s, true, f);
          if (f !== 'farm') satDone++;
        }
      }
    }
  }
  if (A.water) {
    const satCap = MK_BATCH[mkOf('sprinkler')] ?? 999;
    let satDone = 0;
    for (const f of farms) {
      for (const p of plotsForFarm(f)) {
        if (f !== 'farm' && satDone >= satCap) break;
        if (p.st === 2 && p.crop && !p.dead && p.water < 0.55) {
          p.water = 1;
          p.dry = 0;
          if (f !== 'farm') satDone++;
        }
      }
    }
  }
  if (A.fert && S.fert > 0) {
    const dMk = mkOf('drone');
    const saveRate = S.skills?.['crop-2'] ? (MK_FERTSAVE[dMk] ?? 0) : 0;
    const satCap = MK_BATCH[dMk] ?? 999;
    let fertStep = 0;
    let satDone = 0;
    for (const f of farms) {
      for (const p of plotsForFarm(f)) {
        if (S.fert <= 0 || (f !== 'farm' && satDone >= satCap)) break;
        if ((p.st === 1 || (p.st === 2 && !p.dead)) && p.fert < 0.5) {
          const savedByDrone = saveRate > 0 && (((S.day * 7 + fertStep++) % 100) / 100) < saveRate;
          if (!savedByDrone) S.fert--;
          p.fert = Math.min(1, p.fert + fertAddAmt());
          if (f !== 'farm') satDone++;
        }
      }
    }
  }
  if (A.feed) {
    if (S.animals.some((a) => ANIMALS[a.kind].eat > 0) && S.trough < 5) {
      const fMk = mkOf('feeder');
      let space = troughCap() - S.trough;
      if (fMk >= 2 && space >= 4 && (S.inv.feed ?? 0) <= 0 && (S.inv.wheat ?? 0) >= 2) {
        S.inv.wheat -= 2; if (S.inv.wheat <= 0) delete S.inv.wheat;
        S.trough += 4; space -= 4;
      }
      for (const id of ['feed', 'wheat', 'corn']) {
        const n = Math.floor(Math.min(space, S.inv[id] ?? 0));
        if (n > 0) { S.inv[id] -= n; if (S.inv[id] <= 0) delete S.inv[id]; space -= n; S.trough += n; }
      }
    }
    for (const p of S.ponds) if (p.stocked && p.feed < POND_FEED * 4) {
      const n = Math.floor(Math.min(POND_FEED * 4 - p.feed, S.inv.feed ?? 0));
      if (n > 0) { S.inv.feed -= n; if (S.inv.feed <= 0) delete S.inv.feed; p.feed += n; }
    }
  }
  if (A.collect) {
    for (const a of S.animals) {
      if (a.grown > 0 || a.ready <= 0) continue;
      const got = addGood(ANIMALS[a.kind].prod, a.ready);
      a.ready -= got;
      if (got <= 0) break;
      addStat('collect', got);
      addXp(got * XP.collect);
    }
  }
}
