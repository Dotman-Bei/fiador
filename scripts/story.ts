/** npm run story -- --run <id> — pause 3 (human-gated). The builder's scripted story on the seeded demo DAO (spec §6). */
import { isHeld } from '../src/lib/desk';
import type { LoanStatus, LoanView, MemberView } from '../src/lib/desk';
import { RpcClient } from '../src/lib/rpc';
import { addMemberKind, DESK_ROLE, functionCallKind, removeMemberKind } from '../src/lib/sputnik';
import { formatNear, parseNear, TGAS } from '../src/lib/units';
import { flag } from './lib/args';
import { callerFor, councilAction, vote, waitForProposal } from './lib/council';
import type { CallFn } from './lib/council';
import { ask, askCouncil, cosign, loanIdOf, markDefault, repay, syncLoan } from './lib/desk-calls';
import { loadDotEnv, readEnv } from './lib/env';
import { readDeployment } from './lib/inspect';
import { connect, ensureSubAccount, hasFailure, requireOk, waitFor } from './lib/near';
import { writeJson } from './lib/records';
import type { StoryRecord } from './lib/story-expect';

const NEAR = 10n ** 24n;
const PERSONA_FUNDING = parseNear('0.5');

function beat(text: string): void {
  console.log(`\n== ${text}`);
}

async function main(): Promise<void> {
  loadDotEnv();
  const env = readEnv(process.env);
  const run = flag(process.argv.slice(2), 'run') ?? '1';
  if (!/^[a-z0-9]{1,8}$/.test(run)) throw new Error('--run must be 1-8 lowercase letters or digits');
  const near = connect(env);
  const rpc = new RpcClient(env.rpc);
  const d = readDeployment();
  const root = near.account(env.root);
  const publicKey = (await near.signer.getPublicKey()).toString();
  const council = d.council.map((id) => callerFor(near.account(id)));
  const [c1, c2] = council;
  if (c1 === undefined || c2 === undefined) throw new Error('the deployment lists fewer than two council members');
  const ids = { ada: `ada-${run}.${env.root}`, bayo: `bayo-${run}.${env.root}`, chidi: `chidi-${run}.${env.root}` };
  const as = (id: string): CallFn => callerFor(near.account(id));
  const anyone = callerFor(root);
  const params = (await rpc.view<{ params: { grace_sec: number } }>(d.desk, 'get_config')).params;

  const treasury = async (): Promise<bigint> => {
    const info = await rpc.viewAccount(d.dao);
    if (info === null) throw new Error('DAO missing');
    return BigInt(info.amount);
  };
  const loanIs = (id: number, status: LoanStatus): Promise<LoanView | null> =>
    waitFor(() => rpc.view<LoanView | null>(d.desk, 'get_loan', { loan_id: id }), (l) => l?.status === status, `loan #${id} ${status}`, 90_000);
  const standing = async (id: string): Promise<string> => {
    const m = await rpc.view<MemberView | null>(d.desk, 'get_member', { account_id: id });
    return m === null ? 'not a member' : `${formatNear(m.standing)} NEAR`;
  };
  const chainNowMs = async (): Promise<number> => {
    const block = await rpc.request('block', { finality: 'final' });
    const ts = (block as { header?: { timestamp_nanosec?: string } }).header?.timestamp_nanosec;
    if (ts === undefined) throw new Error('no block timestamp');
    return Number(BigInt(ts) / 1_000_000n);
  };
  const untilChainMs = (ms: number, what: string): Promise<number> => waitFor(chainNowMs, (t) => t > ms, what, 420_000, 3_000);

  beat('0/4 three fresh personas, admitted by one 2-of-3 council action');
  for (const id of Object.values(ids)) console.log(id, await ensureSubAccount(root, rpc, id, publicKey, PERSONA_FUNDING));
  const missing: string[] = [];
  for (const id of Object.values(ids)) if ((await rpc.view<MemberView | null>(d.desk, 'get_member', { account_id: id })) === null) missing.push(id);
  if (missing.length > 0) {
    const kind = functionCallKind(d.desk, missing.map((id) => ({ methodName: 'admit_member', args: { account_id: id }, depositYocto: 0n, gas: 20n * TGAS })));
    const p = await councilAction(council, rpc, d.dao, `Fiador: admit ${missing.join(', ')} (story run ${run})`, kind);
    console.log(`council proposal ${p.id} Approved: admitted ${missing.length}`);
    await waitFor(() => rpc.view<MemberView | null>(d.desk, 'get_member', { account_id: ids.chidi }), (m) => m !== null, 'members admitted');
  }

  beat('1/4 money shot: Ada asks 6, Bayo co-signs 2, the treasury pays with no vote, Ada repays');
  const before = await treasury();
  const held = await ask(as(ids.ada), d.desk, 6n * NEAR);
  if (!isHeld(held.result)) throw new Error(`expected the desk to hold Ada's request, got ${JSON.stringify(held.result)}`);
  console.log(`Ada (standing ${await standing(ids.ada)}) asks 6 NEAR: the desk holds the request: needs ${formatNear(held.result.Held.gap)} co-signed`);
  const shot = await cosign(as(ids.bayo), d.desk, ids.ada, 2n * NEAR);
  const shotId = loanIdOf(shot.result);
  const paid = await loanIs(shotId, 'Active');
  const afterPayout = await treasury();
  console.log(`Bayo co-signs 2: loan #${shotId} filed as Sputnik proposal ${String(paid?.proposal_id)} and approved by the desk seat alone`);
  console.log(`treasury ${formatNear(before)} -> ${formatNear(afterPayout)} NEAR`);
  requireOk(await repay(as(ids.ada), d.desk, shotId, 6n * NEAR), 'Ada repays');
  await loanIs(shotId, 'Repaid');
  const afterRepay = await treasury();
  console.log(`Ada repays 6: treasury back to ${formatNear(afterRepay)} NEAR; Ada ${await standing(ids.ada)}, Bayo ${await standing(ids.bayo)}`);

  beat('2/4 council lane: Chidi asks 3 from the council, 2 of 3 approve, sync, repay on time');
  const big = await askCouncil(as(ids.chidi), d.desk, 3n * NEAR);
  if ('Held' in big.result || big.result.Loan.proposal_id === null) throw new Error(`council filing failed: ${JSON.stringify(big.result)}`);
  const councilId = big.result.Loan.loan_id;
  const councilProposal = big.result.Loan.proposal_id;
  requireOk(await vote(c1, rpc, d.dao, councilProposal), 'council vote 1');
  requireOk(await vote(c2, rpc, d.dao, councilProposal), 'council vote 2');
  await waitForProposal(rpc, d.dao, councilProposal, (p) => p.status === 'Approved');
  requireOk(await syncLoan(anyone, d.desk, councilId), 'sync_loan');
  await loanIs(councilId, 'Active');
  requireOk(await repay(as(ids.chidi), d.desk, councilId, 3n * NEAR), 'Chidi repays the council loan');
  await loanIs(councilId, 'Repaid');
  console.log(`loan #${councilId} (proposal ${councilProposal}) approved 2-of-3, repaid on time; Chidi ${await standing(ids.chidi)}`);

  beat('3/4 a late repayment inside grace, and a co-signed loan left to default');
  const late = await ask(as(ids.chidi), d.desk, 4n * NEAR);
  const lateId = loanIdOf(late.result);
  const lateLoan = await loanIs(lateId, 'Active');
  const held2 = await ask(as(ids.chidi), d.desk, 2n * NEAR);
  if (!isHeld(held2.result)) throw new Error('expected a held request for the 2 NEAR loan');
  const def = await cosign(as(ids.ada), d.desk, ids.chidi, 1n * NEAR);
  const defId = loanIdOf(def.result);
  const defLoan = await loanIs(defId, 'Active');
  if (lateLoan === null || defLoan === null) throw new Error('loans vanished');
  console.log(`loan #${lateId} (4 NEAR) and loan #${defId} (2 NEAR, Ada pledged 1) are out; waiting past the term`);
  await untilChainMs(lateLoan.due_at_ms + 3_000, `term of loan #${lateId}`);
  requireOk(await repay(as(ids.chidi), d.desk, lateId, 4n * NEAR), 'late repayment');
  await loanIs(lateId, 'RepaidLate');
  console.log(`loan #${lateId} repaid after its term but inside grace: closed, no gain, no slash`);
  await untilChainMs(defLoan.due_at_ms + params.grace_sec * 1000 + 3_000, `term + grace of loan #${defId}`);
  requireOk(await markDefault(anyone, d.desk, defId), 'mark_default');
  await loanIs(defId, 'Defaulted');
  console.log(`loan #${defId} defaulted: Chidi ${await standing(ids.chidi)}, Ada ${await standing(ids.ada)} (lost the 1 NEAR she pledged)`);

  beat('4/4 the multisig stays in charge: unseat the desk, the next ask is refused by Sputnik, re-seat');
  await councilAction(council, rpc, d.dao, `Fiador: unseat ${d.desk} (story run ${run})`, removeMemberKind(d.desk, DESK_ROLE));
  const refused = await ask(as(ids.ada), d.desk, 1n * NEAR);
  const refusedId = loanIdOf(refused.result);
  if ('Held' in refused.result || refused.result.Loan.status !== 'Refused' || !hasFailure(refused.tx, 'ERR_PERMISSION_DENIED')) {
    throw new Error(`expected Sputnik to refuse with ERR_PERMISSION_DENIED, got ${JSON.stringify(refused.result)} ${refused.tx.failures.join(' | ')}`);
  }
  console.log(`loan #${refusedId} Refused; Sputnik said: ${refused.tx.failures.find((f) => f.includes('ERR_PERMISSION_DENIED')) ?? ''}`);
  await councilAction(council, rpc, d.dao, `Fiador: re-seat ${d.desk} (story run ${run})`, addMemberKind(d.desk, DESK_ROLE));
  console.log('desk re-seated, so the live DAO keeps working for the README steps');

  const record: StoryRecord = {
    run,
    at: new Date().toISOString(),
    personas: ids,
    loans: { money_shot: shotId, council: councilId, late: lateId, defaulted: defId, refused: refusedId },
    treasury: { before: before.toString(), after_payout: afterPayout.toString(), after_repay: afterRepay.toString() },
  };
  writeJson(`deployments/story-${run}.json`, record);
  console.log(`\nSTORY PASS run=${run}`);
}

main().catch((err: unknown) => {
  console.error(`STORY FAIL: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
