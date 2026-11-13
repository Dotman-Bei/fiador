/** npm run verify — read-only: checks the DAO and the desk against every loan's Sputnik proposal (spec §7). */
import { RpcClient } from '../src/lib/rpc';
import { runChecks } from '../src/lib/verify';
import { gatherVerifyInput, printChecks, readDeployment } from './lib/inspect';

async function main(): Promise<void> {
  const deployment = readDeployment();
  const override = process.env['FIADOR_RPC']?.trim();
  const rpc = new RpcClient(override !== undefined && override.length > 0 ? override : deployment.rpc);
  console.log(`verify: DAO ${deployment.dao}, desk ${deployment.desk}, RPC ${rpc.url}`);
  const input = await gatherVerifyInput(rpc, deployment);
  const checks = runChecks(input);
  const ok = printChecks(checks);
  console.log(`${ok ? 'VERIFY PASS' : 'VERIFY FAIL'} (${checks.length} checks, ${input.loans.length} loans)`);
  process.exit(ok ? 0 : 1);
}

main().catch((err: unknown) => {
  console.error(`VERIFY FAIL: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
