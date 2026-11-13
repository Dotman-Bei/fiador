/** Read-only gathering for verify, seed:check and freeze: public RPC views only, no keys. */
import { readFileSync } from 'node:fs';
import { readDesk } from '../../src/lib/desk';
import { DEPLOYMENT_PATH, isDeployment } from '../../src/lib/deployments';
import type { Deployment } from '../../src/lib/deployments';
import type { RpcClient } from '../../src/lib/rpc';
import { parseProposal } from '../../src/lib/sputnik';
import type { Policy, ProposalOutput } from '../../src/lib/sputnik';
import type { Check, VerifyInput } from '../../src/lib/verify';

export function readDeployment(path: string = DEPLOYMENT_PATH): Deployment {
  const value: unknown = JSON.parse(readFileSync(path, 'utf8'));
  if (!isDeployment(value)) throw new Error(`${path} is not a deployment record (run the seed first)`);
  return value;
}

export async function gatherVerifyInput(rpc: RpcClient, deployment: Deployment): Promise<VerifyInput> {
  const factoryInfo = await rpc.view<{ factory_id: string; auto_update: boolean }>(deployment.dao, 'get_factory_info');
  const policy = await rpc.view<Policy>(deployment.dao, 'get_policy');
  const snapshot = await readDesk(rpc, deployment.desk);
  const deskKeyCount = await rpc.accessKeyCount(deployment.desk);
  const proposals = new Map<number, ProposalOutput>();
  for (const loan of snapshot.loans) {
    if (loan.proposal_id === null || proposals.has(loan.proposal_id)) continue;
    proposals.set(loan.proposal_id, parseProposal(await rpc.view<unknown>(deployment.dao, 'get_proposal', { id: loan.proposal_id })));
  }
  return { deployment, factoryInfo, policy, config: snapshot.config, deskKeyCount, members: snapshot.members, loans: snapshot.loans, proposals };
}

/** Prints one line per check; returns whether all passed. */
export function printChecks(checks: readonly Check[]): boolean {
  for (const c of checks) console.log(`${c.ok ? 'PASS' : 'FAIL'}  ${c.name} — ${c.detail}`);
  return checks.every((c) => c.ok);
}
