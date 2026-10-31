import { expect, test, type Page } from '@playwright/test';

const SAVE_KEY = 'mazrae-rangi-save-v1';
const SETTINGS_KEY = 'mazrae-rangi-settings-v1';

async function dismissCutscenes(page: Page) {
  for (let i = 0; i < 16; i++) {
    const root = page.locator('[data-tap="cutscene"]');
    if (!await root.isVisible().catch(() => false)) return;
    const choice = page.locator('[data-scene-choice]:visible');
    if (await choice.count()) {
      await choice.first().tap();
      await page.waitForTimeout(180);
      continue;
    }
    const skip = page.locator('[data-cutscene-skip="1"]');
    if (await skip.isVisible().catch(() => false)) {
      await skip.tap();
      await page.waitForTimeout(180);
      continue;
    }
    const next = page.locator('[data-cutscene-next="1"]');
    if (await next.isVisible().catch(() => false) && await next.isEnabled()) {
      await next.tap();
      await page.waitForTimeout(120);
    } else await page.waitForTimeout(120);
  }
  throw new Error('A production cutscene did not finish');
}

async function begin(page: Page, skipTutorial = true) {
  await page.getByRole('button', { name: 'شروع', exact: true }).tap();
  await expect(page.locator('[data-prologue-digest="1"]')).toBeVisible();
  await dismissCutscenes(page);
  const portraitGate = page.locator('[data-portrait-continue="1"]');
  if (await portraitGate.isVisible().catch(() => false)) await portraitGate.tap();
  if (skipTutorial) {
    const skip = page.getByRole('button', { name: 'رد کردن آموزش', exact: true });
    if (await skip.isVisible().catch(() => false)) await skip.tap();
  }
  await expect(page.locator('canvas')).toBeVisible();
}

async function startFresh(page: Page) {
  await page.goto('/', { waitUntil: 'networkidle' });
  await begin(page);
}

async function travel(page: Page, destination: string) {
  await page.locator('[data-mobile-atlas="1"]').tap();
  await page.locator(`[data-atlas-go="${destination}"]`).tap();
  await page.waitForTimeout(1050);
  await dismissCutscenes(page);
}

async function activateSceneTarget(page: Page, id: string) {
  await page.locator('[data-scene-a11y-toggle="1"]').focus();
  const target = page.locator(`[data-a11y-target="${id}"]`);
  await expect(target).toHaveCount(1);
  await target.press('Enter');
}

async function openMarket(page: Page) {
  await travel(page, 'town');
  await activateSceneTarget(page, 'shop:market');
  const buy = page.locator('[data-shop-buy="market"]');
  await expect(buy).toBeVisible();
  if (await page.locator('[data-shop-dialogue="1"]').isVisible().catch(() => false)) await dismissCutscenes(page);
  await buy.tap();
  await expect(page.locator('[data-market-sell-all="1"]')).toBeVisible();
}

test('production prologue has portraits and tutorial HUD discloses advanced controls later', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'شروع', exact: true }).tap();
  const prologue = page.locator('[data-prologue-digest="1"]');
  await expect(prologue).toBeVisible();
  await expect(prologue.locator('[data-prologue-speaker]')).toHaveCount(6);
  await expect(prologue.locator('[data-prologue-speaker] svg')).toHaveCount(6);
  await dismissCutscenes(page);
  const portraitGate = page.locator('[data-portrait-continue="1"]');
  if (await portraitGate.isVisible().catch(() => false)) await portraitGate.tap();

  await expect(page.locator('[data-open-settings="1"]')).toBeVisible();
  await expect(page.locator('[data-tool="till"]')).toBeVisible();
  await expect(page.locator('[data-open-mail="1"]')).toHaveCount(0);
  await expect(page.locator('[data-open-quests="1"]')).toHaveCount(0);
  await expect(page.locator('[data-open-auto="1"]')).toHaveCount(0);
  await expect(page.locator('[data-rest-anytime="1"]')).toHaveCount(0);

  await page.getByRole('button', { name: 'رد کردن آموزش', exact: true }).tap();
  await expect(page.locator('[data-open-mail="1"]')).toBeVisible();
  await expect(page.locator('[data-open-quests="1"]')).toBeVisible();
  await expect(page.locator('[data-open-auto="1"]')).toBeVisible();
  await expect(page.locator('[data-rest-anytime="1"]')).toBeVisible();
});

test('production market keeps selling first and reveals advanced demand details on request', async ({ page }) => {
  await startFresh(page);
  await openMarket(page);
  const guideToggle = page.locator('[data-market-guide-toggle="1"]');
  await expect(guideToggle).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('[data-market-guide="1"]')).toHaveCount(0);
  await expect(page.locator('[data-market-hot="1"]')).toHaveCount(0);
  await expect(page.locator('[data-market-contract="1"]')).toHaveCount(0);
  await expect(page.locator('[data-market-demand-preview]')).toHaveCount(0);

  await page.locator('[data-market-show-all="1"]').tap();
  const wheat = page.locator('[data-market-card="wheat"]');
  await expect(wheat).toBeVisible();
  const sellY = await page.locator('[data-market-sell-all="1"]').evaluate((el) => el.getBoundingClientRect().top);
  const wheatY = await wheat.evaluate((el) => el.getBoundingClientRect().top);
  expect(sellY).toBeLessThan(wheatY);

  await guideToggle.tap();
  await expect(guideToggle).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('[data-market-guide="1"]')).toBeVisible();
  await expect(page.locator('[data-market-hot="1"]')).toBeVisible();
  await expect(page.locator('[data-market-shock]')).toBeVisible();
  await expect(page.locator('[data-market-contract="1"]')).toBeVisible();
  await expect(page.locator('[data-market-demand-preview="wheat"]')).toBeVisible();
  await guideToggle.tap();
  await expect(page.locator('[data-market-demand-preview]')).toHaveCount(0);
});

test('production dialogue volume persists independently and large English toolbar becomes icon-first', async ({ page }) => {
  await startFresh(page);
  await page.locator('[data-open-settings="1"]').tap();
  const voice = page.locator('[data-audio-volume="voiceVolume"]');
  await expect(voice).toBeVisible();
  await voice.evaluate((el) => {
    const input = el as HTMLInputElement;
    input.value = '35';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await expect.poll(() => page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '{}').voiceVolume, SETTINGS_KEY)).toBe(35);
  const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '{}'), SETTINGS_KEY);
  expect(saved.sfxVolume).toBe(100);

  await page.locator('[data-settings-group="display"] summary').tap();
  await page.locator('[data-font-scale="1.2"]').tap();
  await page.locator('[data-settings-panel="1"] [data-lang-toggle="1"]').tap();
  await page.getByRole('button', { name: 'Close Modal', exact: true }).tap();
  await expect(page.locator('[data-toolbar-label="hand"]')).toHaveClass(/sr-only/);
  await expect(page.locator('[data-tool="hand"]')).toHaveAttribute('aria-label', 'Inspect');
  await expect(page.locator('[data-tool="hand"]')).toHaveAttribute('title', 'Inspect');
});

test('production weekly plan applies its real field effect once and persists in the save', async ({ page }) => {
  await startFresh(page);
  const raw = await page.evaluate((key) => {
    const save = JSON.parse(localStorage.getItem(key)!);
    save.day = 3;
    save.stamina = 100;
    save.story.chapter = 2;
    save.morning = { day: 3, earned: 0, gathered: 0, ripe: 0, shown: false };
    Object.assign(save.plots[0], { st: 2, crop: 'wheat', water: 0.2, prog: 0.5, dead: false, ripe: false });
    return JSON.stringify(save);
  }, SAVE_KEY);
  // Seed after the old page's real pagehide save, but before the new app boots.
  await page.addInitScript(({ key, raw }) => localStorage.setItem(key, raw), { key: SAVE_KEY, raw });
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'ادامه', exact: true }).tap();
  await expect(page.locator('[data-morning-report="1"]')).toBeVisible();
  await expect(page.locator('[data-weekly-plan="choose"]')).toBeVisible();
  await page.locator('[data-weekly-plan-choice="field"]').tap();
  await expect(page.locator('[data-weekly-plan="field"]')).toBeVisible();
  const save = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), SAVE_KEY);
  expect(save.stamina).toBeCloseTo(90, 0); // live stamina regeneration resumes immediately after the real action
  expect(save.plots[0].water).toBeCloseTo(0.55);
  expect(save.weeklyPlan).toMatchObject({ week: 0, day: 3, kind: 'field' });
  await expect(page.locator('[data-weekly-plan-choice]')).toHaveCount(0);
});

test('production finale supports celebration, villager interaction, estate montage and a postgame goal', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await startFresh(page);
  const raw = await page.evaluate((key) => {
    const save = JSON.parse(localStorage.getItem(key)!);
    save.lv.land = 3;
    save.story = { ...save.story, chapter: 7, pending: 'finale', postgame: false, queue: [] };
    save.stats.cropHarv = 12;
    Object.assign(save.plots[0], { st: 2, crop: 'wheat', water: 1, prog: 1, dead: false, ripe: true });
    return JSON.stringify(save);
  }, SAVE_KEY);
  await page.addInitScript(({ key, raw }) => localStorage.setItem(key, raw), { key: SAVE_KEY, raw });
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'ادامه', exact: true }).tap();
  await expect(page.locator('[data-tap="cutscene"]')).toBeVisible();
  for (let i = 0; i < 12; i++) {
    if (await page.locator('[data-scene-closing="1"]').isVisible().catch(() => false)) break;
    await page.locator('[data-cutscene-next="1"]').tap();
    await page.waitForTimeout(140);
  }
  await expect(page.locator('[data-finale-tableau="1"]')).toBeVisible();
  await page.locator('[data-finale-celebrate="1"]').tap();
  await expect(page.locator('[data-finale-villager="grandma"]')).toBeVisible();
  await page.locator('[data-finale-celebrate="1"]').tap();
  await expect(page.locator('[data-finale-villager="sara"]')).toBeVisible();
  await page.locator('[data-finale-celebrate="1"]').tap();
  await expect(page.locator('[data-finale-villager="jahangir"]')).toBeVisible();
  await expect(page.locator('[data-finale-villager="jahangir"]')).toHaveAttribute('data-finale-greeting-progress', '3');
  await expect(page.locator('[data-finale-celebrate="1"]')).toBeDisabled();
  await page.locator('[data-finale-montage-toggle="1"]').tap();
  await expect(page.locator('[data-finale-montage="1"]')).toBeVisible();
  await expect(page.locator('[data-finale-estate]')).toHaveCount(3);
  await expect(page.locator('[data-finale-estate="farm"]')).toContainText('۴۰');
  await expect(page.locator('[data-finale-next-goal="1"]')).toContainText('۲۰');

  await page.locator('[data-cutscene-next="1"]').tap();
  await expect(page.locator('[data-tap="cutscene"]')).toHaveCount(0);
  await travel(page, 'town');
  await activateSceneTarget(page, 'museum');
  await expect(page.locator('[data-postgame-goal="1"]')).toBeVisible();
  await expect(page.locator('[data-postgame-goal="1"]')).toHaveAttribute('data-postgame-target', '20');
  expect(errors).toEqual([]);
});
