#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const env = { ...process.env, VITE_NATIVE_BUILD: '1', NATIVE_BUILD: '1' };
execFileSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build'], { cwd: root, env, stdio: 'inherit' });
execFileSync(process.execPath, ['scripts/verify-dist.mjs'], { cwd: root, env, stdio: 'inherit' });
