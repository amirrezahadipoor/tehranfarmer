// ===== پنل کامل تنظیمات صوتی، دیداری، گیم‌پلی، برون‌بری/درون‌بری سِیو و دسترسی‌پذیری (P9-01..P9-02) =====
import { useRef } from 'react';
import { S, UI, exportSaveJson, importSaveJson, listBackupSlots, notify, restoreBackupSlot, toast } from '../game/state';
import { CFG, resetSettings, updateSetting } from '../game/settings';
import { fa, faDec } from '../strings/fa';
import { sfx } from '../game/sound';
import { GT } from '../strings/gameText';
import { UT } from '../strings/uiText';
import { CINEMA_UI } from '../strings/cinemaLocales';
import { DEV_TOOLS } from '../strings/version';
import { clearErrorLog, exportErrorLogJson, getErrorLog } from '../game/errorLog';
// رفع N-6: گالری کارگردان صحنه فقط در بیلد توسعه‌دهنده لود می‌شود.
const openSceneDirector = DEV_TOOLS
  ? () => { void import('./SceneDebugMenu').then((m) => m.openSceneDirector()); }
  : null;

export function SettingsPanel() {
  const fileRef = useRef<HTMLInputElement>(null);

  const toggle = (k: 'sound' | 'music' | 'haptics' | 'reduceMotion' | 'colorblind' | 'shortBeat', label: string) => {
    const on = CFG[k];
    return (
      <button
        key={k}
        aria-label={label}
        aria-pressed={on}
        className={'btn press !px-2.5 !py-1 text-xs font-black ' + (on ? 'g' : 'r opacity-85')}
        onClick={() => {
          const next = !on;
          updateSetting(k, next);
          if (k === 'sound') UI.sound = next;
          sfx.tap();
          notify();
        }}
      >
        <span>{label}: {on ? UT.stateOn : UT.stateOff}</span>
      </button>
    );
  };

  const handleExport = () => {
    try {
      const json = exportSaveJson();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mazrae-rangi-day-${S.day}.json`;
      a.click();
      URL.revokeObjectURL(url);
      sfx.buy();
      toast('save', GT.saveExported);
    } catch { /* */ }
  };

  const scales: Array<1 | 1.1 | 1.2> = [1, 1.1, 1.2];
  const actionSpeeds: Array<1 | 1.5 | 2> = [1, 1.5, 2];
  return (
    <div className="paper mx-auto mt-2 max-w-lg p-3" data-settings-panel="1">
      <div className="flex flex-wrap justify-center gap-1.5">
        {toggle('sound', UT.u136)}
        {toggle('music', UT.setMusic)}
        {toggle('haptics', UT.setHaptics)}
        {toggle('reduceMotion', UT.setMotion)}
        {toggle('colorblind', UT.setColorblind)}
        {toggle('shortBeat', UT.alwaysShort)}
      </div>
      <div data-action-speed-control="1" className="mt-2 rounded-lg border border-[#b89668] bg-[#fff6df] px-2 py-1.5 text-center">
        <div className="flex flex-wrap items-center justify-center gap-1.5 text-xs font-black">
          <span>{UT.setActionSpeed}:</span>
          {actionSpeeds.map((speed) => (
            <button key={speed} data-action-speed={speed} aria-pressed={CFG.actionSpeed === speed} aria-label={`${UT.setActionSpeed} ${faDec(speed)}×`} className={'btn press !min-h-[48px] !px-3 !py-0.5 text-xs ' + (CFG.actionSpeed === speed ? 'y' : 'b')} onClick={() => { updateSetting('actionSpeed', speed); sfx.tap(); notify(); }}><span dir="ltr">{faDec(speed)}×</span></button>
          ))}
        </div>
        <p className="mt-1 text-[.68rem] font-bold leading-4 text-[#67513d]">{UT.setActionSpeedHint}</p>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5 text-xs font-black">
        <span>{UT.setFont}:</span>
        {scales.map((sc) => (
          <button
            key={sc}
            aria-label={`${UT.setFont} ${fa(Math.round(sc * 100))}${UT.u46}`}
            className={'btn press !px-2 !py-0.5 text-xs ' + (CFG.fontScale === sc ? 'y' : 'b')}
            onClick={() => { updateSetting('fontScale', sc); sfx.tap(); notify(); }}
          >
            <span dir="ltr">{fa(Math.round(sc * 100))}{UT.u46}</span>
          </button>
        ))}
        <button
          aria-label={UT.setReset}
          className="btn b press !px-2.5 !py-0.5 text-xs font-black"
          onClick={() => { resetSettings(); UI.sound = CFG.sound; sfx.tap(); notify(); }}
        >
          <span>{UT.setReset}</span>
        </button>
        {openSceneDirector && (
          <button
            type="button"
            className="btn p press !px-2.5 !py-0.5 text-xs font-black"
            onClick={() => { sfx.tap(); openSceneDirector(); }}
          >
            <span>{CINEMA_UI[CFG.locale].directorBtn}</span>
          </button>
        )}
        <button
          type="button"
          data-lang-toggle="1"
          aria-label={CINEMA_UI[CFG.locale === 'en' ? 'en' : 'fa'].langToggle}
          className="btn y press !px-2.5 !py-0.5 text-xs font-black"
          onClick={() => { updateSetting('locale', CFG.locale === 'en' ? 'fa' : 'en'); sfx.tap(); notify(); }}
        >
          <span>{CINEMA_UI[CFG.locale === 'en' ? 'en' : 'fa'].langToggle}</span>
        </button>
      </div>
      {/* رفع C-8: گزارش خطاهای محلی — برای پشتیبانی کاربران بدون هیچ ارسال شبکه */}
      <div className="mt-3 rounded-lg border-2 border-[#503426] bg-[#fff9eb] p-2 text-xs font-black" data-error-log="1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span>{UT.errLogTitle}</span>
          <span className="ft">{fa(getErrorLog().length)}</span>
        </div>
        <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            className="btn b press !px-2.5 !py-0.5 text-xs font-black"
            onClick={() => {
              try {
                const blob = new Blob([exportErrorLogJson()], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'mazrae-rangi-errors.json';
                a.click();
                URL.revokeObjectURL(url);
              } catch { /* بی‌صدا */ }
              sfx.tap();
            }}
          >
            <span>{UT.errLogExport}</span>
          </button>
          <button
            type="button"
            className="btn r press !px-2.5 !py-0.5 text-xs font-black"
            onClick={() => { clearErrorLog(); sfx.tap(); notify(); }}
          >
            <span>{UT.errLogClear}</span>
          </button>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-2 text-xs font-black">
        <button
          aria-label={UT.exportSave}
          className="btn g press !px-3 !py-1 text-xs font-black"
          onClick={handleExport}
        >
          <span>{UT.exportSave}</span>
        </button>
        <button
          aria-label={UT.importSave}
          className="btn y press !px-3 !py-1 text-xs font-black"
          onClick={() => fileRef.current?.click()}
        >
          <span>{UT.importSave}</span>
        </button>
        {listBackupSlots().map((b) => (
          <button
            key={b.slot}
            aria-label={`${UT.restoreSlot}${fa(b.slot)}`}
            className="btn b press !px-2.5 !py-1 text-xs font-black"
            onClick={() => {
              if (restoreBackupSlot(b.slot)) {
                sfx.fanfare();
                toast('history', GT.saveRecovered);
              }
            }}
          >
            <span>{UT.restoreSlot}{fa(b.slot)}{UT.dayShort}{fa(b.day)}{UT.parenEnd}</span>
          </button>
        ))}
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (!file) return;
            const txt = await file.text();
            if (importSaveJson(txt)) {
              sfx.fanfare();
              toast('check', GT.saveImported);
            } else {
              sfx.err();
              toast('close', GT.saveImportBad);
            }
          }}
        />
      </div>
    </div>
  );
}
