// Renders the Film composition to out/film-raw.mp4 (1080p h264, AAC). QC passes use --scale 0.5 --crf 28 via env.
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const chrome = process.env.DEMO_CHROME ?? 'C:\Program Files\Google\Chrome\Application\chrome.exe';
const browserExecutable = existsSync(chrome) ? chrome : undefined;
const out = resolve(here, 'out');
mkdirSync(out, { recursive: true });
const scale = Number(process.env.SCALE ?? 1);
const crf = Number(process.env.CRF ?? 16);
const file = resolve(out, process.env.OUT ?? 'film-raw.mp4');
const serveUrl = await bundle({ entryPoint: resolve(here, 'src/index.tsx'), publicDir: resolve(here, 'public') });
const composition = await selectComposition({ serveUrl, id: 'Film', browserExecutable });
console.log(`rendering ${composition.durationInFrames} frames (${(composition.durationInFrames / composition.fps).toFixed(1)} s) at scale ${scale}`);
let last = -1;
await renderMedia({
  composition, serveUrl, codec: 'h264', outputLocation: file, browserExecutable, crf, scale, concurrency: 4,
  audioCodec: 'aac', pixelFormat: 'yuv420p',
  onProgress: ({ progress }) => { const p = Math.floor(progress * 10); if (p !== last) { last = p; console.log(`  ${p * 10}%`); } },
});
console.log('done', file);
