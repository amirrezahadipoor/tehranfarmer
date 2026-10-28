#!/usr/bin/env node
// ===== ممیزی اعداد جادویی اقتصادی — ثابت‌های اقتصادی فقط در data.ts و debtData.ts =====
import fs from 'node:fs';
import ts from 'typescript';

const ALLOW = new Set([0, 0.5, 1, 2, 3, 4, 100]);
const FILES = [
  'src/game/core/debt.ts',
  'src/game/core/economy.ts',
  'src/game/core/ponds.ts',
  'src/game/core/build.ts',
  'src/game/core/advisor.ts',
  'src/game/core/farmDeep.ts',
];

let hits = 0;
for (const f of FILES) {
  if (!fs.existsSync(f)) continue;
  const src = fs.readFileSync(f, 'utf8');
  const sf = ts.createSourceFile(f, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const visit = (n) => {
    if (ts.isNumericLiteral(n)) {
      const v = Number(n.text);
      if (!ALLOW.has(v) && !ts.isLiteralTypeNode(n.parent)) {
        const { line } = sf.getLineAndCharacterOfPosition(n.getStart(sf));
        console.log(`${f}:${line + 1} -> ${v}`);
        hits++;
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
}

console.log(`— اعداد جادویی در هستهٔ اقتصاد/بدهی: ${hits}`);
if (hits > 0) process.exit(1);
