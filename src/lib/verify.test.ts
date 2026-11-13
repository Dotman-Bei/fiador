import { describe, expect, it } from 'vitest';
import { isDeployment } from './deployments';
import type { Deployment } from './deployments';
import { buildFiadorPolicy } from './sputnik';
import type { ProposalOutput } from './sputnik';
import { allowedProposalStatuses, KEYLESS_CHECK, runChecks } from './verify';
import type { VerifyInput } from './verify';
import { config, DAO, DESK, loan, member, NEAR } from './fixtures/desk';

const DEPLOYMENT: Deployment = {
  network: 'testnet',
  rpc: 'https://rpc.testnet.fastnear.com',
  factory: 'sputnikv2.testnet',
  dao: DAO,
  desk: DESK,
  smoke: 'smoke.root.testnet',
  council: ['council-1.root.testnet', 'council-2.root.testnet', 'council-3.root.testnet'],
  root: 'root.testnet',
  seeded_at: '2026-11-14T08:00:00.000Z',
  explorer: 'https://testnet.nearblocks.io',
};

function proposal(id: number, status: ProposalOutput['status'], receiver = 'ada.root.testnet', amount = (6n * NEAR).toString()): ProposalOutput {
  return { id, proposer: DESK, description: 'd', kind: { Transfer: { token_id: '', receiver_id: receiver, amount, msg: null } }, status, vote_counts: {}, votes: {}, submission_time: '1' };
}

function healthy(): VerifyInput {
  const active = loan({ id: 1, status: 'Active', borrower: 'chidi.root.testnet', principal: (2n * NEAR).toString(), borrower_part: (1n * NEAR).toString(), cosigner: 'ada.root.testnet', pledge: (1n * NEAR).toString() });
  return {
    deployment: DEPLOYMENT,
    factoryInfo: { factory_id: 'sputnikv2.testnet', auto_update: false },
    policy: buildFiadorPolicy({ council: DEPLOYMENT.council, deskSeat: [DESK] }),
    config: config({ book: (2n * NEAR).toString() }),
    deskKeyCount: 0,
    members: [
      member({ account_id: 'ada.root.testnet', pledged: (1n * NEAR).toString() }),
      member({ account_id: 'chidi.root.testnet', drawn: (1n * NEAR).toString() }),
    ],
    loans: [loan({ id: 0 }), active, loan({ id: 2, status: 'Refused', proposal_id: null })],
    proposals: new Map([
      [10, proposal(10, 'Approved')],
      [11, proposal(11, 'Approved', 'chidi.root.testnet', (2n * NEAR).toString())],
    ]),
  };
}

const failing = (input: VerifyInput): string[] => runChecks(input).filter((c) => !c.ok).map((c) => c.name);

describe('runChecks', () => {
  it('passes a healthy, frozen desk', () => {
    expect(failing(healthy())).toEqual([]);
  });
  it('fails while the desk still has a key', () => {
    expect(failing({ ...healthy(), deskKeyCount: 1 })).toEqual([KEYLESS_CHECK]);
  });
  it('fails when the factory may still upgrade the DAO', () => {
    expect(failing({ ...healthy(), factoryInfo: { factory_id: 'sputnikv2.testnet', auto_update: true } })).toEqual(['factory auto-upgrade is off']);
  });
  it('fails when the seat holds someone else or extra permissions', () => {
    const smokeSeated = { ...healthy(), policy: buildFiadorPolicy({ council: DEPLOYMENT.council, deskSeat: [DESK, 'smoke.root.testnet'] }) };
    expect(failing(smokeSeated)).toContain('desk seat holds only the desk, with transfer:AddProposal and transfer:VoteApprove only');
  });
  it('fails a loan whose proposal pays someone else or reads the wrong status', () => {
    const input = healthy();
    input.proposals.set(10, proposal(10, 'Approved', 'eve.testnet'));
    input.proposals.set(11, proposal(11, 'Failed', 'chidi.root.testnet', (2n * NEAR).toString()));
    expect(failing(input)).toEqual(['loan #0 (Repaid) matches its Sputnik proposal', 'loan #1 (Active) matches its Sputnik proposal']);
  });
  it('fails a broken book or member invariant', () => {
    expect(failing({ ...healthy(), config: config({ book: '0' }) })).toEqual(['book equals the open principal']);
    const input = healthy();
    input.members[0] = member({ account_id: 'ada.root.testnet' });
    expect(failing(input)).toEqual(['ada.root.testnet drawn and pledged match open loans']);
  });
  it('maps loan statuses to the Sputnik statuses they allow', () => {
    expect(allowedProposalStatuses('Voided')).toEqual(['Failed']);
    expect(allowedProposalStatuses('Refused')).toBeNull();
    expect(allowedProposalStatuses('AwaitingCouncil')).toEqual(['InProgress', 'Approved']);
  });
  it('validates a deployment record', () => {
    expect(isDeployment(DEPLOYMENT)).toBe(true);
    expect(isDeployment({ ...DEPLOYMENT, council: [1] })).toBe(false);
  });
});
