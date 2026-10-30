import path from "path";
import fs from "node:fs";
import zlib from "node:zlib";
import { createHash } from "node:crypto";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import pkg from "./package.json";
import { viteSingleFile } from "vite-plugin-singlefile";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const NATIVE_BUILD = process.env.VITE_NATIVE_BUILD === '1';

const MUSIC_FILES = ['peaceful-forest.mp3', 'ch2.mp3', 'ch3.mp3', 'ch4.mp3', 'ch5.mp3', 'ch6.mp3', 'ch7.mp3'] as const;

/** Native Capacitor keeps one inline starter track for file:// WebView startup. */
function inlineMusicPack(files: readonly string[]): string {
  return files.map((file) => {
    const bytes = fs.readFileSync(path.resolve(__dirname, 'public/music', file));
    return `<script type="application/octet-stream" data-music-pack="${file}">${bytes.toString('base64')}</script>`;
  }).join('');
}

/** Self-extracting offline single-file JS packer for the native WebView build. */
function packInlineModule(): Plugin {
  return {
    name: "pack-inline-module",
    enforce: "post",
    generateBundle(_opts, bundle) {
      for (const item of Object.values(bundle)) {
        if (item.type !== "asset" || item.fileName !== "index.html" || typeof item.source !== "string") continue;
        let bootstrapHash = "";
        item.source = item.source.replace(
          /<script type="module" crossorigin>([\s\S]*?)<\/script>/,
          (_full, code: string) => {
            const b64 = zlib.deflateRawSync(Buffer.from(code, "utf8"), { level: 9 }).toString("base64");
            const loader = `(async()=>{const b=Uint8Array.from(atob("${b64}"),c=>c.charCodeAt(0));const r=new Blob([b]).stream().pipeThrough(new DecompressionStream("deflate-raw")).getReader();const a=[];for(;;){const{value:v,done:d}=await r.read();if(d)break;a.push(v)}const u=new Uint8Array(a.reduce((s,x)=>s+x.length,0));let o=0;for(const x of a){u.set(x,o);o+=x.length}const s=document.createElement("script");s.type="module";const url=URL.createObjectURL(new Blob([u],{type:"text/javascript"}));s.src=url;s.onload=()=>URL.revokeObjectURL(url);const mount=()=>document.head.appendChild(s);if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount,{once:true});else mount()})();`;
            bootstrapHash = createHash("sha256").update(loader).digest("base64");
            return `<script>${loader}</script>`;
          },
        );
        if (bootstrapHash) {
          item.source = item.source.replace(
            "script-src 'self' blob:",
            `script-src 'self' blob: 'sha256-${bootstrapHash}'`,
          );
          item.source = item.source.replace('</head>', `<!-- offline-music-pack:1/${MUSIC_FILES.length} -->\n</head>`);
          item.source = item.source.replace('</body>', `${inlineMusicPack([MUSIC_FILES[0]])}</body>`);
        }
      }
    },
  };
}

function audioInlineGuard(): Plugin {
  return {
    name: 'audio-inline-guard',
    enforce: 'post',
    config(config) {
      if (!config.build) config.build = {};
      config.build.assetsInlineLimit = (filePath: string, content: Buffer) =>
        !filePath.includes('assets/music') && content.length < 2000000;
    },
  };
}

function assetFiles(root: string, dir = root): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return assetFiles(root, full);
    return [path.relative(root, full).split(path.sep).join('/')];
  });
}

/** Inject hashed JS/CSS chunks into the web service-worker precache for offline code splitting. */
function webOfflineManifest(): Plugin {
  return {
    name: 'web-offline-manifest',
    closeBundle() {
      const dist = path.resolve(__dirname, 'dist');
      const swPath = path.join(dist, 'sw.js');
      if (!fs.existsSync(swPath)) return;
      const assetsRoot = path.join(dist, 'assets');
      const assets = assetFiles(assetsRoot)
        .filter((file) => /\.(?:js|css|svg|png|webp|woff2?)$/.test(file))
        .map((file) => `./assets/${file}`)
        .sort();
      const marker = '/*__TF_BUILD_ASSETS__*/null';
      let sw = fs.readFileSync(swPath, 'utf8');
      if (!sw.includes(marker)) throw new Error('Service-worker build-assets marker is missing');
      sw = sw.replace(marker, JSON.stringify(assets));
      fs.writeFileSync(swPath, sw);
    },
  };
}

export default defineConfig({
  base: './',
  server: { host: '0.0.0.0', allowedHosts: true, port: 5173 },
  preview: { host: '0.0.0.0', allowedHosts: true },
  build: {
    target: 'es2022',
    modulePreload: { polyfill: false },
    assetsInlineLimit: NATIVE_BUILD ? 2000000 : 4096,
    chunkSizeWarningLimit: 2000,
  },
  esbuild: { legalComments: 'none', drop: ['debugger'] },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __DEV_TOOLS__: JSON.stringify(
      process.env.VITE_DEV_TOOLS === '1' || process.env.VITE_E2E_ASSETS === '1',
    ),
  },
  plugins: [
    react(),
    tailwindcss(),
    ...(NATIVE_BUILD
      ? [viteSingleFile({ removeViteModuleLoader: true }), packInlineModule(), audioInlineGuard()]
      : [webOfflineManifest()]),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
