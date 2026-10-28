#!/usr/bin/env node
// بیلد مخصوص آزمون‌های بصری E2E: ابزارهای توسعه (F9/__cinemaDebug) را روشن نگه می‌دارد
// ولی بیلد production همچنان آن‌ها را کامل حذف می‌کند (رفع N-6).
import { execFileSync } from 'node:child_process';
execFileSync('npx', ['vite', 'build'], { stdio: 'inherit', env: { ...process.env, VITE_E2E_ASSETS: '1' } });
