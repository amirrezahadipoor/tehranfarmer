import { describe, expect, it } from 'vitest';
import { installDom } from './helpers/dom';
import {
  runLoop7CutsceneActionAndSetPieceAudit,
  runLoop8MandatoryUpgradesAndMachinesAudit,
  runLoop9HiddenSecretsAndSaveV6Audit,
  runLoop10AntiSpamAndLocationCoherenceAudit,
  runLoop11AntiGrindAndVarietyAudit,
} from '../scripts/audit-depth-loops';

installDom();

describe('ممیزی جامع اکشن صحنه‌ها، الزام ارتقا و ماشین‌آلات، ۸ راز مخفی و ریتم منطقی تریگرها', () => {
  it('حلقهٔ ۷: تمام ۸۷ صحنه حرکت فیزیکی واقعی، چرخش آزاد بازو با ابزار و دکور زنده دارند', () => {
    const errs: string[] = [];
    runLoop7CutsceneActionAndSetPieceAudit((c, w, d) => errs.push(`[${c}] ${w}: ${d}`));
    expect(errs).toEqual([]);
  });

  it('حلقهٔ ۸: تمام ۶ ربات بدون ارتقا/گسترش/ماشین‌آلات قفل می‌شوند و فقط توسعهٔ کامل برنده می‌شود', () => {
    const errs: string[] = [];
    runLoop8MandatoryUpgradesAndMachinesAudit((c, w, d) => errs.push(`[${c}] ${w}: ${d}`));
    expect(errs).toEqual([]);
  });

  it('حلقهٔ ۹: هر ۸ راز مخفی فقط با شرایط خاص باز می‌شوند، پاداش می‌دهند و در سِیو نسخهٔ ۶ می‌مانند', () => {
    const errs: string[] = [];
    runLoop9HiddenSecretsAndSaveV6Audit((c, w, d) => errs.push(`[${c}] ${w}: ${d}`));
    expect(errs).toEqual([]);
  });

  it('حلقهٔ ۱۰: هیچ صحنه‌ای پشت‌سرهم بی‌دلیل یا در مکان اشتباه اجرا نمی‌شود', () => {
    const errs: string[] = [];
    runLoop10AntiSpamAndLocationCoherenceAudit((c, w, d) => errs.push(`[${c}] ${w}: ${d}`));
    expect(errs).toEqual([]);
  });

  it('حلقهٔ ۱۱: سیستم‌های ضدیکنواختی (AoE ۳×۳، پاتیل روستایی، حفاظت قرارداد، سرویس حوضچه‌ها و ساخت در خواب) دقیق کار می‌کنند', () => {
    const errs: string[] = [];
    runLoop11AntiGrindAndVarietyAudit((c, w, d) => errs.push(`[${c}] ${w}: ${d}`));
    expect(errs).toEqual([]);
  });
});
