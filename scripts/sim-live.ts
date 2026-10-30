#!/usr/bin/env node
// Reproducible wall-time report for the actual live clock. No days×constant shortcut.
import fs from 'node:fs';
import { runLiveSim, type LivePolicy, type LiveSimMetrics } from './live-bot';
import { LIVE_DAY_SECONDS } from '../src/game/data';
import { fa, faDec } from '../src/strings/fa';

const RUNS = Math.max(1, Number(process.env.LIVE_RUNS ?? 3));
const MAX_DAYS = Math.max(2, Number(process.env.MAX_DAYS ?? 2500));
const SLEEP_MAX_DAYS = Math.max(2, Number(process.env.SLEEP_MAX_DAYS ?? 500));
const policies: LivePolicy[] = ['normal', 'optimal'];

interface Aggregate {
  runs: number;
  completed: number;
  meanHours: number | null;
  observedMinHours: number | null;
  observedMaxHours: number | null;
  ci95Low: number | null;
  ci95High: number | null;
  meanDays: number;
  meanActions: number;
  meanSleeps: number;
}

const T95 = [0, 0, 12.706, 4.303, 3.182, 2.776, 2.571, 2.447, 2.365, 2.306, 2.262];
const round = (n: number, digits = 2) => Number(n.toFixed(digits));
const mean = (values: number[]) => values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;

function aggregate(runs: LiveSimMetrics[]): Aggregate {
  const hours = runs.filter((r) => r.completed).map((r) => r.wallHours);
  const avg = mean(hours);
  let margin: number | null = null;
  if (hours.length >= 2) {
    const variance = hours.reduce((sum, v) => sum + (v - avg) ** 2, 0) / (hours.length - 1);
    const t = T95[Math.min(10, hours.length)] ?? 1.96;
    margin = t * Math.sqrt(variance) / Math.sqrt(hours.length);
  }
  return {
    runs: runs.length,
    completed: hours.length,
    meanHours: hours.length ? round(avg) : null,
    observedMinHours: hours.length ? round(Math.min(...hours)) : null,
    observedMaxHours: hours.length ? round(Math.max(...hours)) : null,
    ci95Low: margin === null ? null : round(Math.max(0, avg - margin)),
    ci95High: margin === null ? null : round(avg + margin),
    meanDays: round(mean(runs.map((r) => r.days)), 1),
    meanActions: round(mean(runs.map((r) => r.actions)), 1),
    meanSleeps: round(mean(runs.map((r) => r.sleeps)), 1),
  };
}

const runs: LiveSimMetrics[] = [];
console.log(`\n=== Live-clock balance · ${LIVE_DAY_SECONDS}s/day · ${RUNS} seed(s) ===`);
for (const policy of policies) {
  for (let i = 0; i < RUNS; i++) {
    const seed = 1000 + i;
    const started = Date.now();
    const result = runLiveSim(policy, MAX_DAYS, seed);
    runs.push(result);
    console.log(`${policy.padEnd(8)} seed=${seed} completed=${result.completed} day=${result.days} wall=${result.wallHours}h actions=${result.actions} sleeps=${result.sleeps} (${Math.round((Date.now() - started) / 1000)}s)`);
    fs.writeFileSync('docs/live-balance-runs.jsonl', runs.map((r) => JSON.stringify(r)).join('\n') + '\n');
  }
}
const sleep = runLiveSim('sleep-spam', SLEEP_MAX_DAYS, 1000);
runs.push(sleep);
console.log(`sleep-spam seed=1000 completed=${sleep.completed} day=${sleep.days} wall=${sleep.wallHours}h actions=${sleep.actions} sleeps=${sleep.sleeps}`);
fs.writeFileSync('docs/live-balance-runs.jsonl', runs.map((r) => JSON.stringify(r)).join('\n') + '\n');

const normalRuns = runs.filter((r) => r.policy === 'normal');
const optimalRuns = runs.filter((r) => r.policy === 'optimal');
const normal = aggregate(normalRuns);
const optimal = aggregate(optimalRuns);
const sleepAgg = aggregate([sleep]);
const checks: Array<[string, boolean, string]> = [
  ['مدل همان ساعت زندهٔ ۴۸۰ثانیه‌ای است', LIVE_DAY_SECONDS === 480, `${LIVE_DAY_SECONDS}s`],
  ['سیاست معمولی در همهٔ seedها به پایان می‌رسد', normal.completed === normal.runs, `${normal.completed}/${normal.runs}`],
  ['سیاست بهینه در همهٔ seedها به پایان می‌رسد', optimal.completed === optimal.runs, `${optimal.completed}/${optimal.runs}`],
  ['sleep-spam به‌تنهایی کوئست برداشت و داستان را تمام نمی‌کند', !sleep.completed && sleep.sleeps === SLEEP_MAX_DAYS, `postgame=${sleep.postgameDay ?? '—'} · sleeps=${sleep.sleeps}`],
  ['زمان، اقدام و خواب برای همهٔ اجراها معتبر است', runs.every((r) => Number.isFinite(r.wallSeconds) && r.wallSeconds > 0 && r.actions > 0 && r.sleeps > 0), 'finite / positive'],
  ['میانگین سیاست معمولی در بازهٔ هدف ۶۰ تا ۸۵ ساعت', normal.meanHours !== null && normal.meanHours >= 60 && normal.meanHours <= 85, `${normal.meanHours ?? '—'}h`],
];

const output = {
  generatedAt: new Date().toISOString(),
  model: {
    liveDaySeconds: LIVE_DAY_SECONDS,
    clock: 'tickLiveClock + tickBuilds',
    plotMovement: '320/390 logical px/s, 0.72s scene transition, engine action durations',
    pausedTime: 'shops and dialogue add wall time without advancing the world',
    optimalActionSpeed: 2,
    normalActionSpeed: 1,
    note: 'Bot estimate, not a human playthrough or a guarantee of player enjoyment.',
  },
  runs,
  aggregates: { normal, optimal, sleepSpam: sleepAgg },
  checks,
};
fs.writeFileSync('docs/live-balance-report.json', JSON.stringify(output, null, 2));

const range = (a: Aggregate) => a.meanHours === null
  ? '—'
  : `${faDec(a.observedMinHours ?? 0)} تا ${faDec(a.observedMaxHours ?? 0)}`;
const ci = (a: Aggregate) => a.ci95Low === null ? '—' : `${faDec(a.ci95Low)} تا ${faDec(a.ci95High!)}`;
const md = [
  '# گزارش زمان واقعی بازی — runner ساعت زنده',
  '',
  `> تولید با \`STRICT=1 LIVE_RUNS=${RUNS} npm run sim:live\` · ساعت زندهٔ موتور: ${fa(LIVE_DAY_SECONDS)} ثانیه برای هر روز · سقف کمپین: ${fa(MAX_DAYS)} روز.`,
  '',
  '## مدل و محدودیت',
  '',
  '- پیشرفت جهان با `tickLiveClock()` و ساخت‌وساز با `tickBuilds(dt)` انجام می‌شود؛ هیچ تبدیل `days × 192` یا `days × 480` وجود ندارد.',
  '- حرکت روی کرت‌ها با سرعت ۳۲۰/۳۹۰ پیکسل منطقی، زمان اقدام ابزار و گذر ۰٫۷۲ثانیه‌ای صحنه هزینه دارد. سیاست بهینه از سرعت اقدام ۲× موجود در تنظیمات استفاده می‌کند.',
  '- خرید و دیالوگ زمان دیواری را افزایش می‌دهند اما مثل موتور واقعی جهان را متوقف می‌کنند. زمان منو/خواندن، فرض صریح مدل است؛ این گزارش جای playthrough انسانی را نمی‌گیرد.',
  '- «خواب پی‌درپی» فقط خواب را تکرار می‌کند و هیچ کاشت/برداشت/خرید خودکاری فرض نمی‌کند؛ بنابراین سنجهٔ مسیر فرار از حلقهٔ اصلی است، نه یک استراتژی کامل اتوماسیون.',
  '',
  '## نتیجهٔ کمپین',
  '',
  '| سیاست | پایان‌یافته | میانگین ساعت دیواری | بازهٔ مشاهده‌شده | CI ۹۵٪ میانگین | میانگین روز | میانگین اقدام | خواب |',
  '|---|---|---|---|---|---|---|---|',
  `| معمولی | ${fa(normal.completed)}/${fa(normal.runs)} | ${normal.meanHours === null ? '—' : faDec(normal.meanHours)} | ${range(normal)} | ${ci(normal)} | ${faDec(normal.meanDays)} | ${faDec(normal.meanActions)} | ${faDec(normal.meanSleeps)} |`,
  `| بهینه | ${fa(optimal.completed)}/${fa(optimal.runs)} | ${optimal.meanHours === null ? '—' : faDec(optimal.meanHours)} | ${range(optimal)} | ${ci(optimal)} | ${faDec(optimal.meanDays)} | ${faDec(optimal.meanActions)} | ${faDec(optimal.meanSleeps)} |`,
  `| خواب پی‌درپی | ${fa(sleepAgg.completed)}/${fa(sleepAgg.runs)} | ${sleepAgg.meanHours === null ? 'پایان نیافت' : faDec(sleepAgg.meanHours)} | — | — | ${faDec(sleepAgg.meanDays)} | ${faDec(sleepAgg.meanActions)} | ${faDec(sleepAgg.meanSleeps)} |`,
  '',
  'CI با ضرر ت-student روی ساعت اجراهای پایان‌یافته محاسبه می‌شود؛ برای یک اجرا قابل محاسبه نیست. بازهٔ مشاهده‌شده نیز گزارش شده تا میانگین تنها واریاسیون seed را پنهان نکند.',
  '',
  '## معیارهای فنی و بالانس',
  '',
  '| معیار | وضعیت | جزئیات |',
  '|---|---|---|',
  ...checks.map(([name, ok, detail]) => `| ${name} | ${ok ? 'سبز' : 'رد'} | ${detail} |`),
  '',
  '## دادهٔ خام',
  '',
  'هر اجرا با seed، ساعت جهان/منو، تعداد اقدام کرت، تعداد خواب و روز پایان در `docs/live-balance-report.json` و `docs/live-balance-runs.jsonl` ثبت شده است.',
  '',
].join('\n');
fs.writeFileSync('docs/LIVE-BALANCE-REPORT.md', md);

for (const [name, ok, detail] of checks) console.log(`${ok ? 'PASS' : 'FAIL'} ${name} (${detail})`);
console.log('Saved docs/LIVE-BALANCE-REPORT.md and docs/live-balance-report.json');
if (process.env.STRICT === '1' && checks.some(([, ok]) => !ok)) process.exit(1);
