// Reads docs/demo/2026-11-14-demo-script.md (the single source) and writes src/generated/script.json.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const md = readFileSync(resolve(here, '../../docs/demo/2026-11-14-demo-script.md'), 'utf8').replaceAll('\r\n', '\n');
const section = (n) => {
  const start = md.indexOf(`\n## ${n} —`);
  const next = md.indexOf('\n## ', start + 5);
  return md.slice(start, next === -1 ? undefined : next);
};

// §3 shot list: id | seconds | visual | narration cue | driver | ...
const shots = {};
for (const line of section(3).split('\n')) {
  const cells = line.split(' | ').map((c) => c.replace(/^\|\s*|\s*\|$/g, '').trim());
  if (/^S\d$/.test(cells[0] ?? '')) {
    shots[cells[0]] = { id: cells[0], seconds: Number(cells[1]), visual: cells[2], cue: cells[3], driver: cells[4], gate: cells[6] };
  }
}
// §4 narration: **S1** — text \n words: n · planned: ...
const narr = {};
for (const m of section(4).matchAll(/\*\*(S\d)\*\* — (.+)\nwords: (\d+) · planned: ([^·\n]+)/g)) {
  narr[m[1]] = { text: m[2].trim(), words: Number(m[3]), planned: m[4].trim() };
}
const scenes = Object.keys(shots).sort().map((id) => ({ ...shots[id], narration: narr[id]?.text ?? '' }));
mkdirSync(resolve(here, '../src/generated'), { recursive: true });
writeFileSync(resolve(here, '../src/generated/script.json'), JSON.stringify({ scenes }, null, 2));
console.log(`script.json: ${scenes.length} scenes, ${scenes.reduce((a, s) => a + s.seconds, 0)} s, ${scenes.reduce((a, s) => a + s.narration.split(/\s+/).length, 0)} words`);
