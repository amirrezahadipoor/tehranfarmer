import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, test } from '@playwright/test';

test('the isolated index.html really plays embedded music with zero companion files or network', async ({ context, page }) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mazrae-single-file-'));
  const isolated = path.join(dir, 'index.html');
  fs.copyFileSync(path.resolve('dist/index.html'), isolated);
  const url = pathToFileURL(isolated).href;
  const errors: string[] = [];
  const companions: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('request', (r) => {
    if (/^https?:\/\//i.test(r.url()) || (r.url().startsWith('file:') && r.url() !== url)) companions.push(r.url());
  });
  await context.setOffline(true);
  await page.addInitScript(() => {
    const w = window as unknown as { __offlinePlays: number; __offlineMusic?: HTMLAudioElement };
    w.__offlinePlays = 0;
    const original = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      if (this.loop && this instanceof HTMLAudioElement) {
        w.__offlinePlays += 1;
        w.__offlineMusic = this;
      }
      return original.call(this);
    };
  });

  try {
    await page.goto(url);
    await page.locator('button').first().click();
    const skip = page.locator('button:has-text("رد کردن صحنه")');
    if (await skip.count()) await skip.click();
    await expect.poll(() => page.evaluate(() => (window as unknown as { __offlinePlays: number }).__offlinePlays)).toBeGreaterThan(0);
    await expect.poll(() => page.evaluate(() => {
      const audio = (window as unknown as { __offlineMusic?: HTMLAudioElement }).__offlineMusic;
      return audio?.readyState ?? 0;
    })).toBeGreaterThanOrEqual(3);

    const audio = await page.evaluate(() => {
      const el = (window as unknown as { __offlineMusic?: HTMLAudioElement }).__offlineMusic;
      return {
        srcPrefix: el?.src.slice(0, 30) ?? '',
        srcLength: el?.src.length ?? 0,
        paused: el?.paused ?? true,
        error: el?.error?.code ?? null,
      };
    });
    expect(audio.srcPrefix).toBe('data:audio/mpeg;base64,SUQzBAA');
    expect(audio.srcLength).toBeGreaterThan(100_000);
    expect(audio.paused).toBe(false);
    expect(audio.error).toBeNull();
    expect(companions).toEqual([]);
    expect(errors).toEqual([]);
    expect(fs.readdirSync(dir)).toEqual(['index.html']);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
