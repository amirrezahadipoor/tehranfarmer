import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { CFG } from '../game/settings';
import { APP_VERSION, formatVersion } from './version';

describe('single application version source', () => {
  it('matches package.json and formats both locales', () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'package.json'), 'utf8')) as { version: string };
    expect(APP_VERSION).toBe(pkg.version);
    CFG.locale = 'en';
    expect(formatVersion(APP_VERSION)).toBe(pkg.version);
    CFG.locale = 'fa';
    const faVersion = pkg.version.replace(/\./g, '٫').replace(/\d/g, (digit) => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)]);
    expect(formatVersion(APP_VERSION)).toBe(faVersion);
    CFG.locale = 'en';
  });
});
