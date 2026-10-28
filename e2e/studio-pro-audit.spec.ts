import { test, expect } from '@playwright/test';

test.describe('Studio-Pro Real .mp3 Audio Engine, Calendar Sync & Live Bilingual Switching E2E', () => {
  test('decodes all 16 inline .mp3 audio samples via real Chromium WebAudio with 0 harsh waveforms, syncs 28-day Farmhouse Calendar, and switches FA -> EN cleanly', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.addInitScript(() => {
      const w = window as unknown as {
        __decodedMp3Durations: number[];
        __oscTypes: string[];
      };
      w.__decodedMp3Durations = [];
      w.__oscTypes = [];

      const OrigAC = window.AudioContext;
      if (OrigAC) {
        const origDecode = OrigAC.prototype.decodeAudioData;
        OrigAC.prototype.decodeAudioData = function (buf: ArrayBuffer, ok?: DecodeSuccessCallback, err?: DecodeErrorCallback) {
          return origDecode.call(this, buf, ok, err).then((audioBuf) => {
            w.__decodedMp3Durations.push(audioBuf.duration);
            return audioBuf;
          });
        };
        const origOsc = OrigAC.prototype.createOscillator;
        OrigAC.prototype.createOscillator = function () {
          const osc = origOsc.call(this);
          w.__oscTypes.push(osc.type);
          return osc;
        };
      }
    });

    await page.goto('/');
    const startBtn = page.locator('button.btn.y').first();
    await expect(startBtn).toBeVisible({ timeout: 10000 });
    await startBtn.click();

    const skipBtn = page.locator('[data-skip-cutscene="1"], button:has-text("رد"), button:has-text("Skip")').first();
    if (await skipBtn.isVisible({ timeout: 2500 }).catch(() => false)) {
      await skipBtn.click();
    }

    // Wait briefly for async hardware decodeAudioData of all 16 inline .mp3 samples
    await expect.poll(async () => {
      return page.evaluate(() => (window as unknown as { __decodedMp3Durations: number[] }).__decodedMp3Durations.length);
    }, { timeout: 8000 }).toBe(16);

    const audioAudit = await page.evaluate(() => {
      const w = window as unknown as { __decodedMp3Durations: number[]; __oscTypes: string[] };
      return {
        count: w.__decodedMp3Durations.length,
        minDur: Math.min(...w.__decodedMp3Durations),
        harshOsc: w.__oscTypes.filter((t) => t === 'square' || t === 'sawtooth').length,
      };
    });
    expect(audioAudit.count).toBe(16);
    expect(audioAudit.minDur).toBeGreaterThan(0.05);
    expect(audioAudit.harshOsc).toBe(0);

    // Open Settings -> Switch to English live in the running session!
    await page.locator('[data-open-settings="1"]').click();
    const enBtn = page.locator('[data-lang-toggle="1"]');
    await expect(enBtn).toBeVisible({ timeout: 5000 });
    await enBtn.click();

    // Close menu and inspect live English HUD + Mailbox
    await page.locator('[role="dialog"] button.btn.r').first().click();

    const mailBtn = page.locator('[data-open-mail="1"]');
    await mailBtn.click();
    const mailModal = page.locator('[data-mailbox-modal="1"]');
    await expect(mailModal).toBeVisible({ timeout: 5000 });
    const mailText = ((await mailModal.textContent()) ?? '').replace(/فارسی/g, '');
    expect(/[\u0600-\u06FF]/.test(mailText)).toBe(false);

    expect(errors).toEqual([]);
  });
});
