#!/usr/bin/env node
// Repeatable laboratory startup budget; not a substitute for a physical-device test.
import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import { chromium } from '@playwright/test';

const node = process.execPath;
const vite = 'node_modules/vite/bin/vite.js';
const port = Number(process.env.STARTUP_AUDIT_PORT ?? 4187);
const runs = Math.max(1, Number(process.env.RUNS ?? 3));
const budgets = { 1: Number(process.env.STARTUP_BUDGET_MS_1X ?? 1500), 4: Number(process.env.STARTUP_BUDGET_MS_4X ?? 3500) };
const baseURL = `http://127.0.0.1:${port}/`;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];

execFileSync(node, [vite, 'build'], { stdio: 'inherit' });
if (!fs.existsSync('dist/index.html')) throw new Error('dist/index.html was not produced');
const server = spawn(node, [vite, 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { stdio: 'ignore' });
let browser;
try {
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (server.exitCode !== null) throw new Error('Vite preview exited before startup audit');
    try { if ((await fetch(baseURL)).ok) { ready = true; break; } } catch { /* server is still starting */ }
    await sleep(100);
  }
  if (!ready) throw new Error('Timed out waiting for Vite preview');
  browser = await chromium.launch({ headless: true });
  const results = [];
  for (const rate of [1, 4]) {
    for (let run = 1; run <= runs; run++) {
      const context = await browser.newContext();
      const page = await context.newPage();
      const cdp = await context.newCDPSession(page);
      await cdp.send('Performance.enable');
      await cdp.send('Emulation.setCPUThrottlingRate', { rate });
      await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
      await page.locator('button').first().waitFor({ state: 'visible', timeout: 30_000 });
      const firstButtonMs = await page.evaluate(() => performance.now());
      const { metrics } = await cdp.send('Performance.getMetrics');
      const metric = (name) => metrics.find((m) => m.name === name)?.value ?? 0;
      results.push({ rate, run, firstButtonMs: Math.round(firstButtonMs), scriptMs: Math.round(metric('ScriptDuration') * 1000), heapBytes: metric('JSHeapUsedSize') });
      await context.close();
    }
  }
  for (const rate of [1, 4]) {
    const rows = results.filter((r) => r.rate === rate);
    const first = Math.round(median(rows.map((r) => r.firstButtonMs)));
    const script = Math.round(median(rows.map((r) => r.scriptMs)));
    const heap = Math.round(median(rows.map((r) => r.heapBytes)));
    console.log(`CPU ${rate}x · first control median ${first}ms / budget ${budgets[rate]}ms · script ${script}ms · heap ${(heap / 1048576).toFixed(1)}MiB · ${runs} runs`);
    if (first > budgets[rate]) process.exitCode = 1;
  }
  console.log(JSON.stringify(results));
  console.log('[NOTE] این بودجه آزمایشگاه Chromium است؛ startup، حافظه و لمس گوشی فیزیکی جداگانه سنجیده شود.');
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
}
