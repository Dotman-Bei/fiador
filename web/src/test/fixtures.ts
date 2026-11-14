/**
 * Fixtures for tests and the dev-only state gallery (#/__states). Never imported by production code paths:
 * the gallery is loaded only when import.meta.env.DEV is true, so none of this reaches dist/.
 */
import type { Deployment } from '../../../src/lib/deployments';
import { config, loan, member, NEAR } from '../../../src/lib/fixtures/desk';
import { buildFiadorPolicy, transferKind } from '../../../src/lib/sputnik';
import type { ProposalOutput, ProposalStatus } from '../../../src/lib/sputnik';
import type { Snapshot } from '../data/reads';

export { config, loan, member, NEAR };

export const NOW = 1_800_000_000_000;

export const DEPLOYMENT: Deployment = {
  network: 'testnet',
  rpc: 'https://rpc.testnet.fastnear.com',
  factory: 'sputnikv2.testnet',
  dao: 'fiador.sputnikv2.testnet',
  desk: 'desk.root.testnet',
  smoke: 'smoke.root.testnet',
  council: ['council-1.root.testnet', 'council-2.root.testnet', 'council-3.root.testnet'],
  root: 'root.testnet',
  seeded_at: '2026-11-14T08:00:00.000Z',
  explorer: 'https://testnet.nearblocks.io',
};

export function proposal(id: number, status: ProposalStatus, over: Partial<ProposalOutput> = {}): ProposalOutput {
  return {
    id,
    proposer: DEPLOYMENT.desk,
    description: `fiador loan: proposal ${id}`,
    kind: transferKind('ada.root.testnet', 6n * NEAR),
    status,
    vote_counts: { desk: [1, 0, 0] },
    votes: { [DEPLOYMENT.desk]: 'Approve' },
    submission_time: String(BigInt(NOW - 60_000) * 1_000_000n),
    ...over,
  };
}

export const POLICY = buildFiadorPolicy({ council: DEPLOYMENT.council, deskSeat: [DEPLOYMENT.desk] });

export function snapshot(over: Partial<Snapshot> = {}): Snapshot {
  return {
    desk: {
      config: config({ book: '0', member_count: 1, loan_count: 1 }),
      members: [member({ account_id: 'ada.root.testnet' })],
      loans: [loan({ id: 0 })],
      requests: [],
    },
    daoAccount: { amount: (12n * NEAR).toString(), locked: '0', storage_usage: 0, code_hash: '11111111111111111111111111111111' },
    spendable: (6n * NEAR).toString(),
    policy: POLICY,
    deskKeys: 0,
    proposals: { 10: proposal(10, 'Approved') },
    proposalErrors: [],
    readAtMs: NOW,
    ...over,
  };
}
