import { Component, type ErrorInfo, type ReactNode } from 'react';
import { clearErrorLog, exportErrorLogJson, getLastError, setLastError } from '../game/errorLog';
import { UI, hasSave, loadGame, notify } from '../game/state';
import { UT } from '../strings/uiText';

interface State { hasError: boolean; message: string }

/** مرز خطا: هیچ باگی نباید صفحهٔ بازی را سفید کند یا سِیو را از بین ببرد؛ بدون هیچ ارسال شبکه‌ای (P9-06) */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(err: unknown): State {
    return { hasError: true, message: err instanceof Error ? err.message : String(err) };
  }

  componentDidCatch(err: Error, info: ErrorInfo) {
    setLastError(err.message + ' @ ' + ((info.componentStack ?? '').split('\n')[1] ?? '').trim(), 'react');
  }

  private recover = () => {
    UI.modal = null;
    if (hasSave()) loadGame();
    notify();
    this.setState({ hasError: false, message: '' });
  };

  private downloadLocalReport = () => {
    try {
      const blob = new Blob([exportErrorLogJson()], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'mazrae-rangi-local-errors.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch { /* */ }
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div role="alert" className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 p-4" dir="rtl">
        <div className="paper max-w-lg p-5 text-center">
          <div className="ft text-3xl text-[#e8564a]">{UT.u23}</div>
          <div className="mt-2 text-sm font-bold leading-relaxed">{UT.u24}</div>
          <div className="mt-1 text-xs opacity-60" dir="ltr">{this.state.message}</div>
          {getLastError() && <div className="mt-1 text-[.6rem] opacity-40" dir="ltr">{getLastError()}</div>}
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <button className="btn g press !px-4 !py-2" onClick={this.recover}>{UT.u3}</button>
            <button className="btn y press !px-3 !py-2 text-xs font-black" onClick={this.downloadLocalReport}>{UT.errExport}</button>
            <button className="btn b press !px-3 !py-2 text-xs font-black" onClick={() => { clearErrorLog(); this.forceUpdate(); }}>{UT.errClear}</button>
          </div>
        </div>
      </div>
    );
  }
}
