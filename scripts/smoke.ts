import { readFileSync } from 'node:fs';
import { RpcClient } from '../src/lib/rpc';
import {
  addProposalArgs,
  buildFiadorPolicy,
  createDaoArgs,
  daoAccountId,
  FACTORY_ID,
  isTransferKind,
  policiesMatch,
  transferKind,
} from '../src/lib/sputnik';
import type { Policy } from '../src/lib/sputnik';
import { formatNear, parseNear } from '../src/lib/units';
import { callerFor, propose, readBond, vote, waitForProposal } from './lib/council';
import { loadDotEnv, readEnv } from './lib/env';
import { measureChain, recommendedGas } from './lib/gas';
import { callTx, connect, deployWithInit, EMPTY_CODE_HASH, ensureSubAccount, hasFailure, requireOk, waitFor } from './lib/near';
import { writeJson } from './lib/records';
import type { SmokeRecord } from './lib/records';

const SMOKE_WASM = 'contract/res/fiador_smoke.wasm';
const DAO_DEPOSIT = parseNear('6');
const SMOKE_FUNDING = parseNear('2');
const COUNCIL_FUNDING = parseNear('0.5');
const SMOKE_TRANSFER = parseNear('0.01');

interface SmokeView {
  dao: string;
  last_proposal_id: number | null;
  last_vote_ok: boolean | null;
}

function step(text: string): void {
  console.log(`\n== ${text}`);
}

async function main(): Promise<void> {
  loadDotEnv();
  const env = readEnv(process.env);
  const near = connect(env);
  const rpc = new RpcClient(env.rpc);
  const root = near.account(env.root);
  const publicKey = (await near.signer.getPublicKey()).toString();
  const daoId = daoAccountId(env.daoName);
  const smokeId = `smoke.${env.root}`;
  const councilIds = [1, 2, 3].map((n) => `council-${n}.${env.root}`);

  step('1/7 sub-accounts (all hold the root key)');
  console.log(smokeId, await ensureSubAccount(root, rpc, smokeId, publicKey, SMOKE_FUNDING));
  for (const id of councilIds) console.log(id, await ensureSubAccount(root, rpc, id, publicKey, COUNCIL_FUNDING));

  step('2/7 deploy + init the smoke contract in one transaction');
  const smoke = near.account(smokeId);
  const smokeInfo = await rpc.viewAccount(smokeId);
  if (smokeInfo !== null && smokeInfo.code_hash !== EMPTY_CODE_HASH) {
    console.log('smoke contract already deployed');
  } else {
    requireOk(await deployWithInit(smoke, new Uint8Array(readFileSync(SMOKE_WASM)), { dao: daoId }), 'deploy smoke');
  }

  step(`3/7 create ${daoId} with the final policy (bond 0, council 2-of-3, smoke in the desk seat)`);
  const policy = buildFiadorPolicy({ council: councilIds, deskSeat: [smokeId] });
  if ((await rpc.viewAccount(daoId)) === null) {
    const args = createDaoArgs({ name: env.daoName, purpose: 'Fiador demo credit union (NEAR HACKATHON, testnet)', policy });
    requireOk(await callTx(root, FACTORY_ID, 'create', args, DAO_DEPOSIT), 'factory create');
  } else {
    console.log('DAO already exists');
  }
  const livePolicy = await waitFor(() => rpc.view<Policy>(daoId, 'get_policy').catch(() => null), (p) => p !== null, 'DAO policy');
  if (livePolicy === null || !policiesMatch(livePolicy, policy)) {
    throw new Error(`${daoId} exists with a different policy; set FIADOR_DAO_NAME=fiador-v2 in .env and rerun`);
  }
  const version = await rpc.view<string>(daoId, 'version');
  if (version !== '2.3.1') console.log(`WARNING: DAO version ${version} (plans were written against 2.3.1)`);

  step('4/7 live 2-of-3 check: one council approval must NOT pass a Vote proposal, two must');
  const [c1, c2] = councilIds.map((id) => callerFor(near.account(id)));
  if (c1 === undefined || c2 === undefined) throw new Error('council accounts missing');
  const c1Id = councilIds[0] ?? '';
  const voteId = await propose(c1, rpc, daoId, 'fiador smoke: 2-of-3 threshold check', 'Vote');
  requireOk(await vote(c1, rpc, daoId, voteId), 'council-1 approve');
  const afterOne = await waitForProposal(rpc, daoId, voteId, (p) => p.votes[c1Id] === 'Approve');
  if (afterOne.status !== 'InProgress') throw new Error(`expected InProgress after 1 approval, got ${afterOne.status}`);
  requireOk(await vote(c2, rpc, daoId, voteId), 'council-2 approve');
  const afterTwo = await waitForProposal(rpc, daoId, voteId, (p) => p.status !== 'InProgress');
  if (afterTwo.status !== 'Approved') throw new Error(`expected Approved after 2 approvals, got ${afterTwo.status}`);
  console.log(`Vote proposal ${voteId}: InProgress after 1 approval, Approved after 2`);

  step('5/7 a non-member cannot file anything');
  const denied = await callTx(root, daoId, 'add_proposal', addProposalArgs('fiador smoke: must be refused', transferKind(env.root, SMOKE_TRANSFER)), await readBond(rpc, daoId));
  if (denied.ok || !hasFailure(denied, 'ERR_PERMISSION_DENIED')) {
    throw new Error(`expected ERR_PERMISSION_DENIED, got ${denied.ok ? 'success' : denied.failures.join(' | ')}`);
  }
  console.log('root (no role) got ERR_PERMISSION_DENIED');

  step('6/7 the seated smoke contract files a Transfer and approves it alone');
  const filed = await callTx(smoke, smokeId, 'file_and_approve', { receiver_id: env.root, amount: SMOKE_TRANSFER.toString() });
  requireOk(filed, 'file_and_approve');
  const last = await waitFor(() => rpc.view<SmokeView>(smokeId, 'get_last'), (v) => v.last_vote_ok !== null, 'smoke get_last');
  if (last.last_proposal_id === null || last.last_vote_ok !== true) throw new Error(`smoke chain incomplete: ${JSON.stringify(last)}`);
  const transfer = await waitForProposal(rpc, daoId, last.last_proposal_id, (p) => p.status !== 'InProgress');
  if (transfer.status !== 'Approved') throw new Error(`transfer proposal ${transfer.id} is ${transfer.status}, expected Approved`);
  if (!isTransferKind(transfer.kind) || transfer.kind.Transfer.receiver_id !== env.root || transfer.kind.Transfer.amount !== SMOKE_TRANSFER.toString()) {
    throw new Error(`transfer proposal ${transfer.id} has an unexpected kind: ${JSON.stringify(transfer.kind)}`);
  }
  console.log(`Transfer proposal ${transfer.id}: ${formatNear(SMOKE_TRANSFER)} NEAR to ${env.root}, Approved by the seat alone`);

  step('7/7 measure the chain gas and write the records');
  const gas = measureChain(filed.raw, daoId, smokeId);
  writeJson('deployments/smoke-gas.json', {
    measured_at: new Date().toISOString(),
    headroom: '1.3',
    add_proposal: gas.addProposal.toString(),
    on_filed: gas.onFiled.toString(),
    act_proposal: gas.actProposal.toString(),
    on_voted: gas.onVoted.toString(),
    recommended: {
      add_proposal: recommendedGas(gas.addProposal).toString(),
      on_filed: recommendedGas(gas.onFiled).toString(),
      act_proposal: recommendedGas(gas.actProposal).toString(),
      on_voted: recommendedGas(gas.onVoted).toString(),
    },
  });
  const record: SmokeRecord = {
    network: 'testnet',
    rpc: env.rpc,
    factory: FACTORY_ID,
    dao: daoId,
    dao_version: version,
    smoke: smokeId,
    council: councilIds,
    root: env.root,
    vote_check_proposal: voteId,
    transfer_proposal: transfer.id,
    permission_denied: true,
    smoke_transfer_yocto: SMOKE_TRANSFER.toString(),
    at: new Date().toISOString(),
  };
  writeJson('deployments/smoke.json', record);
  console.log(`SMOKE PASS dao=${daoId} version=${version} vote_check=${voteId} transfer=${transfer.id}`);
}

main().catch((err: unknown) => {
  console.error(`SMOKE FAIL: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
