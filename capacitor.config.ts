import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ir.mazraerangi.game',
  appName: 'مزرعه رنگی',
  webDir: 'dist',
  backgroundColor: '#7cc8f4',
  android: {
    allowMixedContent: false,
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    SystemBars: {
      insetsHandling: 'disable',
      // MainActivity owns system-bar visibility. Hiding the navigation bar here
      // triggers Android's touch-blocking first-run immersive confirmation.
      hidden: false,
    },
    StatusBar: {
      overlaysWebView: true,
      style: 'DARK',
    },
  },
};

export default config;
