import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, statSync } from 'node:fs';
import { delimiter, join } from 'node:path';
import { buildCargoEnv } from './cargo-env';

const CRATES: Record<string, string> = { smoke: 'fiador_smoke', desk: 'fiador_desk' };

const name = process.argv[2];
const crate = name === undefined ? undefined : CRATES[name];
if (name === undefined || crate === undefined) {
  console.error('usage: npm run wasm -- <smoke|desk>');
  process.exit(2);
}
const manifest = join('contract', name, 'Cargo.toml');
const build = spawnSync(
  'cargo',
  ['build', '--release', '--target', 'wasm32-unknown-unknown', '--manifest-path', manifest],
  { stdio: 'inherit', env: buildCargoEnv({ platform: process.platform, env: process.env, pathDelimiter: delimiter }) },
);
if (build.error) {
  console.error(`wasm build: ${build.error.message}`);
  process.exit(1);
}
if (build.status !== 0) process.exit(build.status ?? 1);
const built = join('contract', name, 'target', 'wasm32-unknown-unknown', 'release', `${crate}.wasm`);
mkdirSync(join('contract', 'res'), { recursive: true });
const out = join('contract', 'res', `${crate}.wasm`);
copyFileSync(built, out);
console.log(`WASM BUILT ${out} ${statSync(out).size} bytes`);
