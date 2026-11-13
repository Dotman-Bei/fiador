/**
 * npm run visitor — no secrets and no wallet: a throwaway testnet account from the public faucet joins the demo
 * DAO's capped visitor line, is held above its standing, borrows within it, repays, and sees its standing rise.
 * The key lives only in memory for this run.
 */
import { Account, JsonRpcProvider, KeyPair, KeyPairSigner } from 'near-api-js';
import { isHeld } from '../src/lib/desk';
import type { ConfigView, LoanStatus, LoanView, MemberView } from '../src/lib/desk';
import { RpcClient } from '../src/lib/rpc';
import { formatNear } from '../src/lib/units';
import { callerFor } from './lib/council';
import { ask, cancelRequest, joinVisitorLine, loanIdOf, repay } from './lib/desk-calls';
import { readPublicEnv } from './lib/env';
import { randomAccountName, requestFaucetAccount, waitForAccount } from './lib/faucet';
import { readDeployment } from './lib/inspect';
import { hasFailure, requireOk, waitFor } from './lib/near';

function stop(code: number, message: string): never {
  console.log(message);
  process.exit(code);
}

async function main(): Promise<void> {
  const d = readDeployment();
  const env = readPublicEnv(process.env);
  const rpc = new RpcClient(d.rpc);
  const config = await rpc.view<ConfigView>(d.desk, 'get_config');
  const deposit = BigInt(config.params.visitor_deposit);
  const starter = BigInt(config.params.visitor_starter);

  console.log('== 1/5 a throwaway account from the public testnet faucet');
  const key = KeyPair.fromRandom('ed25519');
  const id = randomAccountName('fiador-visitor');
  try {
    await requestFaucetAccount(env.faucetUrl, id, key.getPublicKey().toString());
  } catch (err) {
    stop(2, `VISITOR SKIPPED: the public faucet did not create an account (${err instanceof Error ? err.message : String(err)}). Run \`npm run verify\` instead; it needs no account.`);
  }
  const info = await waitForAccount(rpc, id);
  console.log(`${id} created with ${formatNear(info.amount)} NEAR (key held in memory only)`);
  const call = callerFor(new Account(id, new JsonRpcProvider({ url: d.rpc }), new KeyPairSigner(key)));
  const member = (): Promise<MemberView | null> => rpc.view<MemberView | null>(d.desk, 'get_member', { account_id: id });
  const loanIs = (loanId: number, status: LoanStatus): Promise<LoanView | null> =>
    waitFor(() => rpc.view<LoanView | null>(d.desk, 'get_loan', { loan_id: loanId }), (l) => l?.status === status, `loan #${loanId} ${status}`, 90_000);

  console.log(`\n== 2/5 join the visitor line (attaching the ${formatNear(deposit)} NEAR storage deposit)`);
  const joined = await joinVisitorLine(call, d.desk, deposit);
  if (hasFailure(joined, 'ERR_VISITOR_LINE_FULL')) {
    stop(3, 'VISITOR SKIPPED: the visitor line is full right now (seats recycle after their window). Run `npm run verify` instead.');
  }
  requireOk(joined, 'join_visitor_line');
  const start = await waitFor(member, (m) => m !== null, 'visitor seat');
  console.log(`seated with standing ${formatNear(start?.standing ?? '0')} NEAR`);

  console.log('\n== 3/5 ask above the standing: the desk holds it for a co-signer');
  const held = await ask(call, d.desk, starter * 2n);
  if (!isHeld(held.result)) throw new Error(`expected a held request, got ${JSON.stringify(held.result)}`);
  console.log(`held: needs ${formatNear(held.result.Held.gap)} NEAR co-signed; cancelling it`);
  requireOk(await cancelRequest(call, d.desk), 'cancel_request');

  console.log('\n== 4/5 ask within the standing: the DAO pays through its own Transfer proposal, no vote');
  const loan = await ask(call, d.desk, starter);
  const loanId = loanIdOf(loan.result);
  const active = await loanIs(loanId, 'Active');
  console.log(`loan #${loanId} of ${formatNear(starter)} NEAR paid via Sputnik proposal ${String(active?.proposal_id)}`);

  console.log('\n== 5/5 repay on time and watch the standing rise');
  requireOk(await repay(call, d.desk, loanId, starter), 'repay');
  await loanIs(loanId, 'Repaid');
  const end = await waitFor(member, (m) => m !== null && m.standing !== start?.standing, 'standing to rise');
  console.log(`standing ${formatNear(start?.standing ?? '0')} -> ${formatNear(end?.standing ?? '0')} NEAR`);
  console.log(`VISITOR PASS ${id} loan=${loanId}`);
}

main().catch((err: unknown) => {
  console.error(`VISITOR FAIL: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
