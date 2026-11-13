/** npm run freeze -- --yes — pause 3 (human-gated, IRREVERSIBLE): deletes every access key on the desk, then verifies. */
import { actions, PublicKey } from 'near-api-js';
import { RpcClient } from '../src/lib/rpc';
import { runChecks } from '../src/lib/verify';
import { hasFlag } from './lib/args';
import { loadDotEnv, readEnv } from './lib/env';
import { gatherVerifyInput, printChecks, readDeployment } from './lib/inspect';
import { connect, summarizeOutcome, requireOk, waitFor } from './lib/near';

async function main(): Promise<void> {
  if (!hasFlag(process.argv.slice(2), 'yes')) {
    throw new Error('the freeze is permanent (no key, no upgrade, ever); rerun with --yes once the story run has passed');
  }
  loadDotEnv();
  const env = readEnv(process.env);
  const deployment = readDeployment();
  const near = connect(env);
  const rpc = new RpcClient(deployment.rpc);
  const list = await near.provider.viewAccessKeyList({ accountId: deployment.desk });
  const keys = list.keys.map((k) => k.public_key);
  if (keys.length > 0) {
    console.log(`deleting ${keys.length} access key(s) from ${deployment.desk}`);
    const raw: unknown = await near.account(deployment.desk).signAndSendTransaction({
      receiverId: deployment.desk,
      actions: keys.map((k) => actions.deleteKey(PublicKey.from(k))),
      throwOnFailure: false,
    });
    requireOk(summarizeOutcome(raw), 'delete keys');
    await waitFor(() => rpc.accessKeyCount(deployment.desk), (n) => n === 0, 'desk keys to disappear');
  } else console.log('desk already keyless');
  const ok = printChecks(runChecks(await gatherVerifyInput(rpc, deployment)));
  console.log(ok ? `FREEZE PASS ${deployment.desk} has no access keys; VERIFY PASS` : 'FREEZE DONE but VERIFY FAIL');
  process.exit(ok ? 0 : 1);
}

main().catch((err: unknown) => {
  console.error(`FREEZE FAIL: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
