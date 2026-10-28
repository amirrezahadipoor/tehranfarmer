import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
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
