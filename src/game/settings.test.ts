import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { applySettingsToDom, CFG, loadSettings, SETTINGS_KEY, updateSetting } from './settings';

describe('locale document metadata', () => {
  const values = new Map<string, string>();
  const attrs: Record<string, string> = {};
  const root = {
    dataset: {} as Record<string, string>,
    setAttribute: (key: string, value: string) => { attrs[key] = value; },
  };
  const doc = { title: '', documentElement: root };

  beforeEach(() => {
    values.clear();
    for (const key of Object.keys(attrs)) delete attrs[key];
    root.dataset = {};
    doc.title = '';
    CFG.locale = 'fa';
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, String(value)); },
      removeItem: (key: string) => { values.delete(key); },
      clear: () => values.clear(),
    });
    vi.stubGlobal('document', doc);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('updates lang, dir and title in both directions', () => {
    updateSetting('locale', 'en');
    expect(attrs.lang).toBe('en');
    expect(attrs.dir).toBe('ltr');
    expect(doc.title).toContain('Colorful Farm');

    updateSetting('locale', 'fa');
    expect(attrs.lang).toBe('fa');
    expect(attrs.dir).toBe('rtl');
    expect(doc.title).toContain('مزرعه رنگی');
  });

  it('repairs invalid persisted locales and applies metadata on load', () => {
    values.set(SETTINGS_KEY, JSON.stringify({ locale: 'invalid' }));
    loadSettings();
    expect(CFG.locale).toBe('fa');
    expect(attrs.lang).toBe('fa');
    expect(attrs.dir).toBe('rtl');
  });

  it('keeps the DOM helper safe for direct application', () => {
    CFG.locale = 'en';
    applySettingsToDom();
    expect(attrs.lang).toBe('en');
  });
});
