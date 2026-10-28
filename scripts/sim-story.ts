#!/usr/bin/env node
// ===== ربات بازی‌کنندهٔ داستان: از پرولوگ تا پایان =====
import { runStoryBot } from './bot';
import { RUNS } from './bot-config';
import { NOTES } from '../src/story/debtData';
import { NODES } from '../src/story/story';

const runs = process.env.RUNS ? Number(process.env.RUNS) : RUNS;
const maxDays = process.env.MAX_DAYS ? Number(process.env.MAX_DAYS) : 2500;

console.log('\n=== ربات داستان «مزرعه رنگی» ===');
console.log(`گره‌های دیالوگ: ${Object.keys(NODES).length} · سندها: ${NOTES.length} · ${runs} اجرا × حداکثر ${maxDays} روز\n`);

let finished = 0, prologues = 0, totalBeatings = 0, totalDays = 0;
const rows: string[] = [];
for (let r = 0; r < runs; r++) {
  const seed = 8000 + r * 13;
  const m = runStoryBot(seed, maxDays);
  if (m.prologueDone) prologues++;
  if (m.postgameDay) finished++;
  totalBeatings += m.beatings;
  totalDays += m.days;
  rows.push(
    `اجرا ${r + 1}: پرولوگ=${m.prologueDone ? 'بله' : 'نه'} · فصل=${m.chapter} · سند=${m.notesOpened} · کتک=${m.beatings} · ` +
    `پایان=${m.postgameDay ?? '—'} · روز=${m.days} · سطح=${m.maxLevel} · قفل‌نرم=${m.softLockDays}`,
  );
}
rows.forEach((r) => console.log(r));

const pct = Math.round((finished / runs) * 100);
console.log(`\nنتیجه: پرولوگ ${prologues}/${runs} · پایان ${finished}/${runs} (${pct}٪) · میانگین کتک ${Math.round(totalBeatings / runs)} · میانگین روز ${Math.round(totalDays / runs)}`);
if (process.env.STRICT === '1' && pct < 100) {
  console.error('[ERR] معیار پذیرش: ربات باید در ۱۰۰٪ اجراها به پایان برسد');
  process.exit(1);
}
