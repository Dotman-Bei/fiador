// Renders storyboard stills (real narration text, empty footage slots) to out/storyboard/*.png.
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';
import { existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const chrome = process.env.DEMO_CHROME ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const browserExecutable = existsSync(chrome) ? chrome : undefined;
const out = resolve(here, 'out/storyboard');
mkdirSync(out, { recursive: true });
const serveUrl = await bundle({ entryPoint: resolve(here, 'src/index.tsx') });
const ids = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'OUTRO'];
for (const sceneId of ids) {
  const composition = await selectComposition({ serveUrl, id: 'Storyboard', inputProps: { sceneId }, browserExecutable });
  await renderStill({ composition, serveUrl, output: resolve(out, `${sceneId}.png`), inputProps: { sceneId }, browserExecutable });
  console.log('rendered', sceneId);
}
