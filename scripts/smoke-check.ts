import { existsSync, readFileSync } from 'node:fs';
import { RpcClient } from '../src/lib/rpc';
import { COUNCIL_ROLE, isTransferKind, parseProposal, roleMembers } from '../src/lib/sputnik';
import type { Policy } from '../src/lib/sputnik';
import { readSmokeRecord } from './lib/records';

async function main(): Promise<void> {
  const record = readSmokeRecord();
  const rpc = new RpcClient(record.rpc);
  const problems: string[] = [];

  const policy = await rpc.view<Policy>(record.dao, 'get_policy');
  const council = roleMembers(policy, COUNCIL_ROLE);
  if (council === null || [...council].sort().join(',') !== [...record.council].sort().join(',')) problems.push('council role differs from the record');
  const dvp = policy.default_vote_policy;
  if (dvp.weight_kind !== 'RoleWeight' || dvp.quorum !== '2' || dvp.threshold !== '2') problems.push(`default vote policy is ${JSON.stringify(dvp)}`);
  if (policy.proposal_bond !== '0') problems.push(`proposal bond is ${policy.proposal_bond}`);

  const voteCheck = parseProposal(await rpc.view<unknown>(record.dao, 'get_proposal', { id: record.vote_check_proposal }));
  const approvals = Object.values(voteCheck.votes).filter((v) => v === 'Approve').length;
  if (voteCheck.status !== 'Approved' || approvals !== 2) problems.push(`vote check ${voteCheck.id}: ${voteCheck.status} with ${approvals} approvals`);

  const transfer = parseProposal(await rpc.view<unknown>(record.dao, 'get_proposal', { id: record.transfer_proposal }));
  if (transfer.status !== 'Approved') problems.push(`transfer ${transfer.id} is ${transfer.status}`);
  if (!isTransferKind(transfer.kind) || transfer.kind.Transfer.receiver_id !== record.root || transfer.kind.Transfer.amount !== record.smoke_transfer_yocto) {
    problems.push(`transfer ${transfer.id} kind is ${JSON.stringify(transfer.kind)}`);
  }
  if (transfer.proposer !== record.smoke) problems.push(`transfer ${transfer.id} was proposed by ${transfer.proposer}`);
  if (!record.permission_denied) problems.push('permission check did not run');

  if (!existsSync('deployments/smoke-gas.json')) {
    problems.push('deployments/smoke-gas.json is missing');
  } else {
    const gas: unknown = JSON.parse(readFileSync('deployments/smoke-gas.json', 'utf8'));
    const keys = ['add_proposal', 'on_filed', 'act_proposal', 'on_voted'];
    if (typeof gas !== 'object' || gas === null || !keys.every((k) => /^\d+$/.test(String((gas as Record<string, unknown>)[k])))) {
      problems.push('deployments/smoke-gas.json lacks the four measurements');
    }
  }

  if (problems.length > 0) {
    console.log(`SMOKE FAIL\n- ${problems.join('\n- ')}`);
    process.exit(1);
  }
  console.log(`SMOKE PASS dao=${record.dao} version=${record.dao_version} vote_check=${voteCheck.id} transfer=${transfer.id}`);
}

main().catch((err: unknown) => {
  console.error(`SMOKE FAIL: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
