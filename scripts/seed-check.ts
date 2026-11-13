/** npm run seed:check — read-only gate for pause 2: every verify check except the keyless freeze, plus the float. */
import { RpcClient } from '../src/lib/rpc';
import { formatNear, parseNear } from '../src/lib/units';
import { KEYLESS_CHECK, runChecks } from '../src/lib/verify';
import { gatherVerifyInput, printChecks, readDeployment } from './lib/inspect';

const MIN_FLOAT = parseNear('8');

async function main(): Promise<void> {
  const deployment = readDeployment();
  const rpc = new RpcClient(deployment.rpc);
  const checks = runChecks(await gatherVerifyInput(rpc, deployment)).filter((c) => c.name !== KEYLESS_CHECK);
  const available = BigInt(await rpc.view<string>(deployment.dao, 'get_available_amount'));
  checks.push({ name: 'treasury holds the loan float', ok: available >= MIN_FLOAT, detail: `${formatNear(available)} NEAR available` });
  const ok = printChecks(checks);
  console.log(ok ? `SEED PASS dao=${deployment.dao} desk=${deployment.desk}` : 'SEED FAIL');
  process.exit(ok ? 0 : 1);
}

main().catch((err: unknown) => {
  console.error(`SEED FAIL: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
