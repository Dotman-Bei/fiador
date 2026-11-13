/** npm run seed -- --desk <account> [--float <near>] — pause 2 (human-gated). Idempotent: every step checks first. */
import { readFileSync } from 'node:fs';
import { DEMO_PARAMS } from '../src/lib/desk';
import type { ConfigView } from '../src/lib/desk';
import { DEPLOYMENT_PATH, EXPLORER } from '../src/lib/deployments';
import type { Deployment } from '../src/lib/deployments';
import { RpcClient } from '../src/lib/rpc';
import { addMemberKind, DESK_ROLE, factoryInfoUpdateKind, removeMemberKind, roleMembers } from '../src/lib/sputnik';
import type { Policy } from '../src/lib/sputnik';
import { formatNear, parseNear } from '../src/lib/units';
import { flag } from './lib/args';
import { callerFor, councilAction } from './lib/council';
import { loadDotEnv, readEnv } from './lib/env';
import { connect, deployWithInit, EMPTY_CODE_HASH, ensureSubAccount, requireOk, waitFor } from './lib/near';
import { readSmokeRecord, writeJson } from './lib/records';

const DESK_WASM = 'contract/res/fiador_desk.wasm';
const DESK_FUNDING = parseNear('3.5');
const DEFAULT_FLOAT = parseNear('12');
const MIN_FLOAT = parseNear('8');
/** Kept on the root for gas and one story run's personas (3 x 0.5 NEAR). */
const ROOT_RESERVE = parseNear('2');

async function main(): Promise<void> {
  loadDotEnv();
  const env = readEnv(process.env);
  const argv = process.argv.slice(2);
  const near = connect(env);
  const rpc = new RpcClient(env.rpc);
  const smoke = readSmokeRecord();
  const dao = smoke.dao;
  const deskId = flag(argv, 'desk') ?? `desk.${env.root}`;
  const floatArg = flag(argv, 'float');
  const root = near.account(env.root);
  const publicKey = (await near.signer.getPublicKey()).toString();
  const council = smoke.council.map((id) => callerFor(near.account(id)));

  console.log(`\n== 1/5 desk account ${deskId}`);
  console.log(await ensureSubAccount(root, rpc, deskId, publicKey, DESK_FUNDING));
  const info = await rpc.viewAccount(deskId);
  if (info !== null && info.code_hash !== EMPTY_CODE_HASH) {
    const config = await rpc.view<ConfigView>(deskId, 'get_config');
    if (config.dao !== dao) throw new Error(`${deskId} is already a desk for ${config.dao}; pass a fresh --desk`);
    console.log('desk already deployed and initialised for this DAO');
  } else {
    requireOk(await deployWithInit(near.account(deskId), new Uint8Array(readFileSync(DESK_WASM)), { dao, params: DEMO_PARAMS }), 'deploy desk');
    await waitFor(() => rpc.view<ConfigView>(deskId, 'get_config').catch(() => null), (c) => c !== null, 'desk get_config');
    console.log('desk deployed and initialised in one transaction');
  }

  console.log('\n== 2/5 lock out factory upgrades (FactoryInfoUpdate auto_update=false)');
  const factory = await rpc.view<{ factory_id: string; auto_update: boolean }>(dao, 'get_factory_info');
  if (factory.auto_update) {
    const p = await councilAction(council, rpc, dao, 'Fiador: stop factory auto-upgrades so the DAO code and its JSON shapes stay fixed', factoryInfoUpdateKind(false));
    console.log(`proposal ${p.id} Approved`);
  } else console.log('already off');

  console.log(`\n== 3/5 seat swap: only ${deskId} in the "${DESK_ROLE}" role`);
  const policy = await rpc.view<Policy>(dao, 'get_policy');
  const seated = roleMembers(policy, DESK_ROLE) ?? [];
  for (const m of seated.filter((m) => m !== deskId)) {
    const p = await councilAction(council, rpc, dao, `Fiador: unseat ${m} from the desk role`, removeMemberKind(m, DESK_ROLE));
    console.log(`unseated ${m} (proposal ${p.id})`);
  }
  if (!seated.includes(deskId)) {
    const p = await councilAction(council, rpc, dao, `Fiador: seat ${deskId} in the desk role`, addMemberKind(deskId, DESK_ROLE));
    console.log(`seated ${deskId} (proposal ${p.id})`);
  } else console.log('desk already seated');

  console.log('\n== 4/5 loan float to the treasury (scaled to the root balance)');
  const rootInfo = await rpc.viewAccount(env.root);
  const daoInfo = await rpc.viewAccount(dao);
  if (rootInfo === null || daoInfo === null) throw new Error('root or DAO missing');
  const daoAvailable = BigInt(await rpc.view<string>(dao, 'get_available_amount'));
  const target = floatArg === undefined ? DEFAULT_FLOAT : parseNear(floatArg);
  if (daoAvailable >= target) {
    console.log(`DAO already has ${formatNear(daoAvailable)} NEAR available`);
  } else {
    const affordable = BigInt(rootInfo.amount) - ROOT_RESERVE;
    const send = (target - daoAvailable < affordable ? target - daoAvailable : affordable);
    if (daoAvailable + send < MIN_FLOAT) {
      throw new Error(`below the minimum viable float: DAO would hold ${formatNear(daoAvailable + send)} NEAR < ${formatNear(MIN_FLOAT)}; top up the root (npm run root -- topup)`);
    }
    await root.transfer({ receiverId: dao, amount: send });
    console.log(`sent ${formatNear(send)} NEAR; DAO float now about ${formatNear(daoAvailable + send)} NEAR`);
  }

  console.log(`\n== 5/5 write ${DEPLOYMENT_PATH}`);
  const deployment: Deployment = {
    network: 'testnet',
    rpc: env.rpc,
    factory: smoke.factory,
    dao,
    desk: deskId,
    smoke: smoke.smoke,
    council: smoke.council,
    root: env.root,
    seeded_at: new Date().toISOString(),
    explorer: EXPLORER,
  };
  writeJson(DEPLOYMENT_PATH, deployment);
  console.log(`SEED PASS dao=${dao} desk=${deskId}`);
}

main().catch((err: unknown) => {
  console.error(`SEED FAIL: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
