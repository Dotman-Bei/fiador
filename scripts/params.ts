/**
 * npm run params -- --term <sec> --grace <sec> [--yes]
 * The scripted 2-of-3 council changes the desk's loan term and grace through ONE ordinary FunctionCall proposal to
 * set_params (the desk accepts it only from the DAO). It reads the live params first and sends the full set with only
 * those two values changed. Without --yes it prints the before and after values and sends nothing. Refuses while any
 * loan is open, so no open loan's settlement changes under it. The root key is read from .env and never printed.
 */
import type { ConfigView, DeskParams } from '../src/lib/desk';
import { readDesk } from '../src/lib/desk';
import { isOpen } from '../src/lib/desk';
import { RpcClient } from '../src/lib/rpc';
import { functionCallKind } from '../src/lib/sputnik';
import { TGAS } from '../src/lib/units';
import { flag, hasFlag } from './lib/args';
import { callerFor, councilAction } from './lib/council';
import { loadDotEnv, readEnv } from './lib/env';
import { readDeployment } from './lib/inspect';
import { connect, waitFor } from './lib/near';
import { changedFields, parseSeconds, retime } from './lib/params';

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const d = readDeployment();
  if (d.network !== 'testnet' || !d.desk.endsWith('.testnet')) throw new Error('params runs on testnet only');
  const termArg = flag(argv, 'term');
  const graceArg = flag(argv, 'grace');
  if (termArg === undefined || graceArg === undefined) throw new Error('give both --term <sec> and --grace <sec>');
  const rpc = new RpcClient(d.rpc);
  const live = (await rpc.view<ConfigView>(d.desk, 'get_config')).params;
  const next = retime(live, parseSeconds('term', termArg), parseSeconds('grace', graceArg));
  const changes = changedFields(live, next);

  console.log(`params: desk ${d.desk}, DAO ${d.dao}`);
  console.log(`before: ${JSON.stringify(live)}`);
  console.log(`after:  ${JSON.stringify(next)}`);
  console.log(`changed: ${changes.length === 0 ? 'nothing' : changes.join('; ')}`);
  if (changes.length === 0) {
    console.log('PARAMS PASS (already set; nothing sent)');
    return;
  }
  const open = (await readDesk(rpc, d.desk)).loans.filter((l) => isOpen(l.status));
  if (open.length > 0) throw new Error(`refused: loan(s) ${open.map((l) => `#${l.id} ${l.status}`).join(', ')} are open`);
  if (!hasFlag(argv, 'yes')) {
    console.log('dry run: nothing sent; rerun with --yes to file the council proposal');
    return;
  }

  loadDotEnv();
  const env = readEnv(process.env);
  if (env.root !== d.root) throw new Error('FIADOR_ROOT does not match deployments/testnet.json root');
  const near = connect(env);
  const council = d.council.map((id) => callerFor(near.account(id)));
  const kind = functionCallKind(d.desk, [{ methodName: 'set_params', args: { params: next }, depositYocto: 0n, gas: 20n * TGAS }]);
  const p = await councilAction(council, rpc, d.dao, `Fiador: set loan term ${next.loan_term_sec} s and grace ${next.grace_sec} s (npm run params)`, kind);
  console.log(`council proposal ${p.id} ${p.status} (2 of 3): ${changes.join('; ')}`);
  const read = await waitFor(
    () => rpc.view<ConfigView>(d.desk, 'get_config'),
    (c) => c.params.loan_term_sec === next.loan_term_sec && c.params.grace_sec === next.grace_sec,
    'the desk to report the new params',
  );
  const after: DeskParams = read.params;
  const drift = changedFields(next, after);
  if (drift.length > 0) throw new Error(`the desk reports params other than sent: ${drift.join('; ')}`);
  console.log(`desk now reports: ${JSON.stringify(after)}`);
  console.log('PARAMS PASS');
}

main().catch((err: unknown) => {
  console.error(`PARAMS FAIL: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
