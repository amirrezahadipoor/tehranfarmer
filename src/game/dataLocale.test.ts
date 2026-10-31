import { afterEach, describe, expect, it } from 'vitest';
import { ACHS, ANIMALS, AUTO_FA, CROP, GOOD, MACHINES, machineModelName, seasonName } from './data';
import { CFG } from './settings';

describe('live localized catalog names', () => {
  afterEach(() => { CFG.locale = 'fa'; });

  it('updates crops, goods, seasons, animals, machines and achievements in both directions', () => {
    CFG.locale = 'en';
    expect(CROP.wheat.fa).toBe('Wheat');
    expect(GOOD.wheat.fa).toBe('Wheat');
    expect(seasonName(0)).toBe('Spring');
    expect(ANIMALS.chicken.fa).toBe('Chicken');
    expect(ANIMALS.chicken.baby).toBe('Chick');
    expect(MACHINES.tractor.fa).toBe('Farm Tractor');
    expect(machineModelName(2)).toBe('Model 2');
    expect(AUTO_FA.till).toBe('Auto-Till');
    expect(ACHS[0].fa).toBe('Green Thumb');

    CFG.locale = 'fa';
    expect(CROP.wheat.fa).toBe('گندم');
    expect(GOOD.wheat.fa).toBe('گندم');
    expect(seasonName(0)).toBe('بهار');
    expect(ANIMALS.chicken.fa).toBe('مرغ');
    expect(ANIMALS.chicken.baby).toBe('جوجه');
    expect(MACHINES.tractor.fa).toBe('تراکتور');
    expect(machineModelName(2)).toBe('مدل ۲');
    expect(AUTO_FA.till).toBe('شخم');
    expect(ACHS[0].fa).toBe('کشاورز');
  });
});
