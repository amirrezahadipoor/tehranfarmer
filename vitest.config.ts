import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  // آینهٔ define در vite.config تا ابزارهای دیباگ در محیط تست هم تعریف شوند (false).
  define: {
    __DEV_TOOLS__: JSON.stringify(
      process.env.VITE_DEV_TOOLS === '1' || process.env.VITE_E2E_ASSETS === '1',
    ),
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.{ts,tsx}'],
    setupFiles: ['tests/setup.ts'],
    globals: false,
    // اجرای تک‌کارگره روی حافظهٔ FUSE از خواندن ناقص موازی ماژول‌ها جلوگیری می‌کند.
    maxWorkers: 1,
    minWorkers: 1,
    testTimeout: 120000,
    hookTimeout: 60000,
    reporters: ['default'],
  },
});
