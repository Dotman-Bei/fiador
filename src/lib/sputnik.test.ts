import { describe, expect, it } from 'vitest';
import { base64ToUtf8 } from './encoding';
import {
  actProposalArgs,
  addMemberKind,
  addProposalArgs,
  buildFiadorPolicy,
  canonicalJson,
  createDaoArgs,
  daoAccountId,
  DESK_PERMISSIONS,
  factoryInfoUpdateKind,
  functionCallKind,
  isTransferKind,
  parseProposal,
  policiesMatch,
  removeMemberKind,
  roleMembers,
  transferKind,
} from './sputnik';
import { LIVE_FACTORY_INFO_PROPOSAL, LIVE_POLICY, LIVE_TRANSFER_PROPOSAL } from './fixtures/sputnik-2.3.1';

const council = ['council-1.root.testnet', 'council-2.root.testnet', 'council-3.root.testnet'];

describe('buildFiadorPolicy', () => {
  it('builds the spec §5 policy exactly', () => {
    expect(buildFiadorPolicy({ council, deskSeat: ['smoke.root.testnet'] })).toEqual({
      roles: [
        { name: 'council', kind: { Group: council }, permissions: ['*:*'], vote_policy: {} },
        {
          name: 'desk',
          kind: { Group: ['smoke.root.testnet'] },
          permissions: ['transfer:AddProposal', 'transfer:VoteApprove'],
          vote_policy: { transfer: { weight_kind: 'RoleWeight', quorum: '0', threshold: '1' } },
        },
      ],
      default_vote_policy: { weight_kind: 'RoleWeight', quorum: '2', threshold: '2' },
      proposal_bond: '0',
      proposal_period: '604800000000000',
      bounty_bond: '1000000000000000000000000',
      bounty_forgiveness_period: '86400000000000',
    });
  });
  it('gives the desk only the two transfer permissions', () => {
    expect(DESK_PERMISSIONS).toEqual(['transfer:AddProposal', 'transfer:VoteApprove']);
  });
  it('reads role members', () => {
    const policy = buildFiadorPolicy({ council, deskSeat: ['desk.root.testnet'] });
    expect(roleMembers(policy, 'desk')).toEqual(['desk.root.testnet']);
    expect(roleMembers(policy, 'missing')).toBeNull();
    expect(roleMembers(LIVE_POLICY, 'all')).toBeNull();
  });
});

describe('policiesMatch / canonicalJson', () => {
  it('ignores ordering of keys, roles, permissions and group members', () => {
    const shuffled = {
      ...LIVE_POLICY,
      roles: [...LIVE_POLICY.roles].reverse().map((r) => ({
        ...r,
        permissions: [...r.permissions].reverse(),
        kind: typeof r.kind === 'object' && 'Group' in r.kind ? { Group: [...r.kind.Group].reverse() } : r.kind,
      })),
    };
    expect(policiesMatch(LIVE_POLICY, shuffled)).toBe(true);
    expect(canonicalJson({ b: 1, a: [2, { d: 1, c: 2 }] })).toBe('{"a":[2,{"c":2,"d":1}],"b":1}');
  });
  it('detects a different bond or a different seat', () => {
    expect(policiesMatch(LIVE_POLICY, { ...LIVE_POLICY, proposal_bond: '0' })).toBe(false);
    const a = buildFiadorPolicy({ council, deskSeat: ['smoke.root.testnet'] });
    const b = buildFiadorPolicy({ council, deskSeat: ['desk.root.testnet'] });
    expect(policiesMatch(a, b)).toBe(false);
  });
});

describe('proposal kinds and args', () => {
  it('builds a NEAR Transfer kind without msg (valid on 2.3.1 and main)', () => {
    expect(transferKind('bob.testnet', 10n ** 24n)).toEqual({
      Transfer: { token_id: '', receiver_id: 'bob.testnet', amount: '1000000000000000000000000' },
    });
  });
  it('recognises live Transfer kinds, including msg: null', () => {
    expect(isTransferKind(LIVE_TRANSFER_PROPOSAL.kind)).toBe(true);
    expect(isTransferKind(LIVE_FACTORY_INFO_PROPOSAL.kind)).toBe(false);
    expect(isTransferKind('Vote')).toBe(false);
  });
  it('builds the verified FactoryInfoUpdate shape', () => {
    expect(factoryInfoUpdateKind(false)).toEqual(LIVE_FACTORY_INFO_PROPOSAL.kind);
  });
  it('builds role membership kinds', () => {
    expect(addMemberKind('desk.root.testnet', 'desk')).toEqual({ AddMemberToRole: { member_id: 'desk.root.testnet', role: 'desk' } });
    expect(removeMemberKind('smoke.root.testnet', 'desk')).toEqual({ RemoveMemberFromRole: { member_id: 'smoke.root.testnet', role: 'desk' } });
  });
  it('builds FunctionCall kinds with base64 JSON args and string deposit/gas', () => {
    const kind = functionCallKind('desk.root.testnet', [
      { methodName: 'admit_member', args: { account_id: 'ada.root.testnet' }, depositYocto: 0n, gas: 15n * 10n ** 12n },
    ]);
    const action = kind.FunctionCall.actions[0];
    expect(kind.FunctionCall.receiver_id).toBe('desk.root.testnet');
    expect(action?.method_name).toBe('admit_member');
    expect(action?.deposit).toBe('0');
    expect(action?.gas).toBe('15000000000000');
    expect(JSON.parse(base64ToUtf8(action?.args ?? ''))).toEqual({ account_id: 'ada.root.testnet' });
  });
  it('wraps add_proposal and echoes the kind in act_proposal', () => {
    expect(addProposalArgs('d', 'Vote')).toEqual({ proposal: { description: 'd', kind: 'Vote' } });
    expect(actProposalArgs(7, 'VoteApprove', LIVE_TRANSFER_PROPOSAL.kind)).toEqual({
      id: 7,
      action: 'VoteApprove',
      proposal: LIVE_TRANSFER_PROPOSAL.kind,
    });
  });
  it('encodes factory create args as base64 of { config, policy }', () => {
    const policy = buildFiadorPolicy({ council, deskSeat: ['smoke.root.testnet'] });
    const out = createDaoArgs({ name: 'fiador', purpose: 'p', policy });
    expect(out.name).toBe('fiador');
    expect(JSON.parse(base64ToUtf8(out.args))).toEqual({ config: { name: 'fiador', purpose: 'p', metadata: '' }, policy });
    expect(daoAccountId('fiador')).toBe('fiador.sputnikv2.testnet');
  });
});

describe('parseProposal', () => {
  it('accepts the live 2.3.1 shape', () => {
    expect(parseProposal(JSON.parse(JSON.stringify(LIVE_TRANSFER_PROPOSAL)))).toEqual(LIVE_TRANSFER_PROPOSAL);
  });
  it('rejects a proposal without a known status', () => {
    expect(() => parseProposal({ id: 1, kind: 'Vote', status: 'Weird' })).toThrow('proposal: bad status');
    expect(() => parseProposal('nope')).toThrow('proposal: not an object');
  });
});
