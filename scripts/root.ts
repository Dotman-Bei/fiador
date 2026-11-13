import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import { Account, KeyPair, KeyPairSigner } from 'near-api-js';
import { RpcClient } from '../src/lib/rpc';
import { formatNear, parseNear } from '../src/lib/units';
import { flag } from './lib/args';
import { loadDotEnv, readEnv, readPublicEnv } from './lib/env';
import { randomAccountName, requestFaucetAccount, waitForAccount } from './lib/faucet';
import { connect } from './lib/near';

const DEFAULT_MIN_NEAR = '21';

async function create(nameArg: string | undefined): Promise<void> {
  if (nameArg === undefined) throw new Error('usage: npm run root -- create <name>');
  const accountId = nameArg.endsWith('.testnet') ? nameArg : `${nameArg}.testnet`;
  if (existsSync('.env') && /^FIADOR_ROOT_KEY=.+/m.test(readFileSync('.env', 'utf8'))) {
    throw new Error('.env already holds FIADOR_ROOT_KEY; refusing to overwrite it');
  }
  loadDotEnv();
  const env = readPublicEnv(process.env);
  const key = KeyPair.fromRandom('ed25519');
  await requestFaucetAccount(env.faucetUrl, accountId, key.getPublicKey().toString());
  const info = await waitForAccount(new RpcClient(env.rpc), accountId);
  appendFileSync('.env', `\nFIADOR_ROOT=${accountId}\nFIADOR_ROOT_KEY=${key.toString()}\n`);
  console.log(`ROOT CREATED ${accountId} ${formatNear(info.amount)} NEAR (key written to the git-ignored .env)`);
}

async function topup(countArg: string | undefined): Promise<void> {
  const count = countArg === undefined ? 1 : Number.parseInt(countArg, 10);
  if (!Number.isInteger(count) || count < 1 || count > 10) throw new Error('--count must be 1..10');
  loadDotEnv();
  const env = readEnv(process.env);
  const near = connect(env);
  const rpc = new RpcClient(env.rpc);
  for (let i = 0; i < count; i += 1) {
    const id = randomAccountName('fiador-topup');
    const key = KeyPair.fromRandom('ed25519');
    await requestFaucetAccount(env.faucetUrl, id, key.getPublicKey().toString());
    const info = await waitForAccount(rpc, id);
    console.log(`faucet granted ${formatNear(info.amount)} NEAR to ${id}; folding it into ${env.root}`);
    await new Account(id, near.provider, new KeyPairSigner(key)).deleteAccount(env.root);
  }
  const root = await rpc.viewAccount(env.root);
  console.log(`root ${env.root} now holds ${root === null ? '?' : formatNear(root.amount)} NEAR`);
}

async function check(minArg: string | undefined): Promise<void> {
  loadDotEnv();
  const env = readEnv(process.env);
  const min = parseNear(minArg ?? DEFAULT_MIN_NEAR);
  const info = await new RpcClient(env.rpc).viewAccount(env.root);
  if (info === null) throw new Error(`root ${env.root} does not exist`);
  if (BigInt(info.amount) < min) {
    console.log(`ROOT LOW ${env.root} ${formatNear(info.amount)} NEAR < ${formatNear(min)} NEAR (run: npm run root -- topup --count 2)`);
    process.exit(1);
  }
  console.log(`ROOT OK ${env.root} ${formatNear(info.amount)} NEAR`);
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const command = argv[0];
  if (command === 'create') return create(argv[1]);
  if (command === 'topup') return topup(flag(argv, 'count'));
  if (command === 'check') return check(flag(argv, 'min'));
  throw new Error('usage: npm run root -- create <name> | topup --count <n> | check [--min <near>]');
}

main().catch((err: unknown) => {
  console.error(`ROOT FAIL: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
