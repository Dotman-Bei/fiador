/**
 * npm run admit -- <id.testnet> [more ids] [--top-up <NEAR> [--yes]]
 * The scripted 2-of-3 council admits the given testnet accounts as desk members (one FunctionCall proposal to
 * admit_member, the same council helpers as the story). Idempotent: accounts already on the desk are skipped.
 * --top-up brings each account's balance up to <NEAR> from the root (testnet gas money, at most 5); it only prints the
 * plan unless --yes is given, and sends nothing to an account already at the target. Prints account ids, proposal ids
 * and amounts only; the root key is read from .env by this process and never printed.
 */
import type { MemberView } from '../src/lib/desk';
import { RpcClient } from '../src/lib/rpc';
import { DESK_ROLE, functionCallKind } from '../src/lib/sputnik';
import type { Policy } from '../src/lib/sputnik';
import { formatNear, parseNear, TGAS } from '../src/lib/units';
import { checkAdmitIds, parseTopUp, topUpAmount } from './lib/admit';
import { flag, hasFlag } from './lib/args';
import { callerFor, councilAction } from './lib/council';
import { loadDotEnv, readEnv } from './lib/env';
import { readDeployment } from './lib/inspect';
import { connect, waitFor } from './lib/near';

const ROOT_RESERVE = parseNear('1');

function positional(argv: readonly string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i] ?? '';
    if (a === '--top-up') i += 1;
    else if (!a.startsWith('--')) out.push(a);
  }
  return out;
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const d = readDeployment();
  if (d.network !== 'testnet' || !d.dao.endsWith('.testnet') || !d.desk.endsWith('.testnet')) throw new Error('admit runs on testnet only');
  const topUpArg = flag(argv, 'top-up');
  const target = topUpArg === undefined ? null : parseTopUp(topUpArg);
  const rpc = new RpcClient(d.rpc);

  const policy = await rpc.view<Policy>(d.dao, 'get_policy');
  const seatKind = policy.roles.find((r) => r.name === DESK_ROLE)?.kind;
  const deskSeat = typeof seatKind === 'object' && 'Group' in seatKind ? seatKind.Group : [];
  const ids = checkAdmitIds(positional(argv), { desk: d.desk, dao: d.dao, deskSeat });
  for (const id of ids) if ((await rpc.viewAccount(id)) === null) throw new Error(`${id} does not exist on testnet`);

  loadDotEnv();
  const env = readEnv(process.env);
  if (env.root !== d.root) throw new Error('FIADOR_ROOT does not match deployments/testnet.json root');
  const near = connect(env);
  const member = (id: string): Promise<MemberView | null> => rpc.view<MemberView | null>(d.desk, 'get_member', { account_id: id });

  console.log(`admit: desk ${d.desk}, DAO ${d.dao}`);
  const missing: string[] = [];
  for (const id of ids) {
    const m = await member(id);
    if (m === null) missing.push(id);
    else console.log(`${id} is already a member (standing ${formatNear(m.standing)} NEAR): skipped`);
  }
  if (missing.length > 0) {
    const council = d.council.map((id) => callerFor(near.account(id)));
    const kind = functionCallKind(d.desk, missing.map((id) => ({ methodName: 'admit_member', args: { account_id: id }, depositYocto: 0n, gas: 20n * TGAS })));
    const p = await councilAction(council, rpc, d.dao, `Fiador: admit ${missing.join(', ')} (npm run admit)`, kind);
    console.log(`council proposal ${p.id} ${p.status} (2 of 3): admit ${missing.join(', ')}`);
    for (const id of missing) {
      const m = await waitFor(() => member(id), (x) => x !== null, `${id} admitted`);
      console.log(`${id} admitted with standing ${formatNear(m?.standing ?? '0')} NEAR`);
    }
  }

  if (target !== null) {
    const root = near.account(env.root);
    for (const id of ids) {
      const info = await rpc.viewAccount(id);
      const send = topUpAmount(BigInt(info?.amount ?? '0'), target);
      if (send === 0n) {
        console.log(`${id} already holds at least ${formatNear(target)} NEAR: nothing sent`);
        continue;
      }
      if (!hasFlag(argv, 'yes')) {
        console.log(`would send ${formatNear(send)} NEAR from ${env.root} to ${id} (balance ${formatNear(info?.amount ?? '0')} -> ${formatNear(target)}); rerun with --yes to send`);
        continue;
      }
      const rootInfo = await rpc.viewAccount(env.root);
      if (rootInfo === null || BigInt(rootInfo.amount) - send < ROOT_RESERVE) throw new Error(`the root cannot spare ${formatNear(send)} NEAR and keep ${formatNear(ROOT_RESERVE)} NEAR`);
      await root.transfer({ receiverId: id, amount: send });
      const after = await waitFor(() => rpc.viewAccount(id), (x) => x !== null && BigInt(x.amount) >= target, `${id} balance`);
      console.log(`sent ${formatNear(send)} NEAR from ${env.root} to ${id}: balance now ${formatNear(after?.amount ?? '0')} NEAR`);
    }
  }
  console.log('ADMIT PASS');
}

main().catch((err: unknown) => {
  console.error(`ADMIT FAIL: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
