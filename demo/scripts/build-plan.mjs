// Builds src/generated/plan.json (per-scene frames, clips, words) and stages media into public/.
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { FPS, LEAD, LIVE_ORIGIN_ISO, ORDER, OUTRO_SECONDS, SCENES } from '../plan.config.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const script = JSON.parse(readFileSync(resolve(root, 'src/generated/script.json'), 'utf8'));
const pub = resolve(root, 'public');
mkdirSync(resolve(pub, 'audio'), { recursive: true });

const scenes = [];
let total = 0;
for (const id of ORDER) {
  const cfg = SCENES[id];
  const audio = JSON.parse(readFileSync(resolve(root, 'audio', `${id}.json`), 'utf8'));
  copyFileSync(resolve(root, 'audio', `${id}.wav`), resolve(pub, 'audio', `${id}.wav`));
  const need = LEAD + audio.duration + 0.4; // narration plus lead-in and a short tail
  const clipSum = cfg.clips.reduce((a, c) => a + c.dur, 0);
  let seconds = cfg.kind === 'card' ? Math.ceil(need * 10) / 10 : clipSum;
  if (seconds + 1e-6 < need) {
    console.warn(`${id}: footage ${clipSum.toFixed(1)} s is shorter than narration ${need.toFixed(1)} s; extend its segments`);
    seconds = need;
  }
  for (const c of cfg.clips) {
    const src = resolve(root, 'capture', c.file);
    if (!existsSync(src)) throw new Error(`missing ${src}`);
    copyFileSync(src, resolve(pub, c.file));
  }
  const frames = Math.round(seconds * FPS);
  scenes.push({ id, kind: cfg.kind, seconds: frames / FPS, frames, audioSeconds: audio.duration, words: audio.words, lead: LEAD, clips: cfg.clips, tag: cfg.tag ?? null, notes: cfg.notes ?? [], zoom: cfg.zoom ?? null,
    narration: script.scenes.find((s) => s.id === id)?.narration ?? '' });
  total += frames;
}
const outroFrames = OUTRO_SECONDS * FPS;
total += outroFrames;
const plan = { fps: FPS, liveOriginMs: Date.parse(LIVE_ORIGIN_ISO), scenes, outroFrames, totalFrames: total };
writeFileSync(resolve(root, 'src/generated/plan.json'), JSON.stringify(plan, null, 1));
for (const s of scenes) console.log(`${s.id}: ${s.seconds.toFixed(1)} s (narration ${s.audioSeconds.toFixed(1)} s)`);
console.log(`total ${(total / FPS).toFixed(1)} s = ${Math.floor(total / FPS / 60)}:${String(Math.round((total / FPS) % 60)).padStart(2, '0')} (cap 2:15 = 135 s)`);
