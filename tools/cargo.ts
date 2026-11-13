import { spawnSync } from 'node:child_process';
import { delimiter } from 'node:path';
import { buildCargoEnv } from './cargo-env';

const result = spawnSync('cargo', process.argv.slice(2), {
  stdio: 'inherit',
  env: buildCargoEnv({ platform: process.platform, env: process.env, pathDelimiter: delimiter }),
});
if (result.error) {
  console.error(`cargo launcher: ${result.error.message}`);
  process.exit(1);
}
process.exit(result.status ?? 1);
