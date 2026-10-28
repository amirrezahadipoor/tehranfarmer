#!/usr/bin/env node
// شمارش تسک‌های ROADMAP به تفکیک فاز و بازنویسی بخش «پیشرفت کل»
import fs from 'node:fs';
const FILE = 'ROADMAP.md';
const src = fs.readFileSync(FILE, 'utf8');
const lines = src.split('\n');
const phases = [];
let cur = null;
for (const line of lines) {
  const h = line.match(/^##\s+(فاز\s+[۰-۹0-9]+.*)$/);
  if (h) { cur = { title: h[1].trim(), total: 0, done: 0 }; phases.push(cur); continue; }
  const t = line.match(/^- \[( |x)\]\s+(P[0-9]+(?:-RR-[0-9]+)?-[0-9]+)/);
  if (t && cur) { cur.total++; if (t[1] === 'x') cur.done++; }
}
const total = phases.reduce((a, p) => a + p.total, 0);
const done = phases.reduce((a, p) => a + p.done, 0);
const pct = total ? Math.floor((done / total) * 100) : 0;
const faN = (n) => String(n).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[+d]);
const rows = phases.map((p) => `| ${p.title.replace(/\|/g, '/')} | ${faN(p.done)}/${faN(p.total)} | ${faN(p.total ? Math.floor((p.done / p.total) * 100) : 0)}٪ |`);
const block = [
  `**پیشرفت کل:** ${faN(done)}/${faN(total)} (${faN(pct)}٪)`,
  '',
  '| فاز | انجام‌شده | درصد |',
  '|---|---|---|',
  ...rows,
].join('\n');
const out = src.replace(/<!-- PROGRESS:START -->[\s\S]*?<!-- PROGRESS:END -->/, `<!-- PROGRESS:START -->\n${block}\n<!-- PROGRESS:END -->`);
fs.writeFileSync(FILE, out);
console.log(block);
console.log(`\n[OK] ROADMAP.md به‌روز شد — ${done}/${total}`);
