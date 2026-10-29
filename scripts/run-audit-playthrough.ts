// Vite constants are defined explicitly before loading the audit's transitive UI imports.
export {};
// Keeping this runner on the direct tsx dependency avoids relying on Vitest's removed vite-node binary.
(globalThis as { __DEV_TOOLS__?: boolean }).__DEV_TOOLS__ = false;
await import('./audit-playthrough');
