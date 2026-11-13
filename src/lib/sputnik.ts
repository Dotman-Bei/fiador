import { jsonToBase64 } from './encoding';

export const FACTORY_ID = 'sputnikv2.testnet';
export const COUNCIL_ROLE = 'council';
export const DESK_ROLE = 'desk';
export const DESK_PERMISSIONS = ['transfer:AddProposal', 'transfer:VoteApprove'] as const;

export type WeightOrRatio = string | [number, number];
export interface VotePolicy {
  weight_kind: 'RoleWeight' | 'TokenWeight';
  quorum: string;
  threshold: WeightOrRatio;
}
export type RoleKind = 'Everyone' | { Group: string[] } | { Member: string };
export interface RolePermission {
  name: string;
  kind: RoleKind;
  permissions: string[];
  vote_policy: Record<string, VotePolicy>;
}
export interface Policy {
  roles: RolePermission[];
  default_vote_policy: VotePolicy;
  proposal_bond: string;
  proposal_period: string;
  bounty_bond: string;
  bounty_forgiveness_period: string;
}

export type TransferKind = { Transfer: { token_id: string; receiver_id: string; amount: string; msg?: string | null } };
export type FunctionCallAction = { method_name: string; args: string; deposit: string; gas: string };
export type FunctionCallKind = { FunctionCall: { receiver_id: string; actions: FunctionCallAction[] } };
export type AddMemberKind = { AddMemberToRole: { member_id: string; role: string } };
export type RemoveMemberKind = { RemoveMemberFromRole: { member_id: string; role: string } };
export type FactoryInfoUpdateKind = { FactoryInfoUpdate: { factory_info: { factory_id: string; auto_update: boolean } } };
export type ProposalKindInput = TransferKind | FunctionCallKind | AddMemberKind | RemoveMemberKind | FactoryInfoUpdateKind | 'Vote';
export interface FunctionCallSpec {
  methodName: string;
  args: Record<string, unknown>;
  depositYocto: bigint;
  gas: bigint;
}

export type ProposalStatus = 'InProgress' | 'Approved' | 'Rejected' | 'Removed' | 'Expired' | 'Moved' | 'Failed';
export const PROPOSAL_STATUSES: readonly ProposalStatus[] = ['InProgress', 'Approved', 'Rejected', 'Removed', 'Expired', 'Moved', 'Failed'];
export type VoteAction = 'VoteApprove' | 'VoteReject' | 'VoteRemove' | 'Finalize' | 'RemoveProposal';

export interface ProposalOutput {
  id: number;
  proposer: string;
  description: string;
  kind: unknown;
  status: ProposalStatus;
  vote_counts: Record<string, [number, number, number]>;
  votes: Record<string, string>;
  submission_time: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function daoAccountId(name: string): string {
  return `${name}.${FACTORY_ID}`;
}

/** Spec §5: council 2-of-3 for every kind; the desk seat may only add and approve transfers, alone. Bond 0. */
export function buildFiadorPolicy(input: { council: readonly string[]; deskSeat: readonly string[] }): Policy {
  return {
    roles: [
      { name: COUNCIL_ROLE, kind: { Group: [...input.council] }, permissions: ['*:*'], vote_policy: {} },
      {
        name: DESK_ROLE,
        kind: { Group: [...input.deskSeat] },
        permissions: [...DESK_PERMISSIONS],
        vote_policy: { transfer: { weight_kind: 'RoleWeight', quorum: '0', threshold: '1' } },
      },
    ],
    default_vote_policy: { weight_kind: 'RoleWeight', quorum: '2', threshold: '2' },
    proposal_bond: '0',
    proposal_period: '604800000000000',
    bounty_bond: '1000000000000000000000000',
    bounty_forgiveness_period: '86400000000000',
  };
}

export function transferKind(receiverId: string, amountYocto: bigint): TransferKind {
  return { Transfer: { token_id: '', receiver_id: receiverId, amount: amountYocto.toString() } };
}

export function functionCallKind(receiverId: string, calls: readonly FunctionCallSpec[]): FunctionCallKind {
  return {
    FunctionCall: {
      receiver_id: receiverId,
      actions: calls.map((c) => ({
        method_name: c.methodName,
        args: jsonToBase64(c.args),
        deposit: c.depositYocto.toString(),
        gas: c.gas.toString(),
      })),
    },
  };
}

export function addMemberKind(memberId: string, role: string): AddMemberKind {
  return { AddMemberToRole: { member_id: memberId, role } };
}

export function removeMemberKind(memberId: string, role: string): RemoveMemberKind {
  return { RemoveMemberFromRole: { member_id: memberId, role } };
}

export function factoryInfoUpdateKind(autoUpdate: boolean): FactoryInfoUpdateKind {
  return { FactoryInfoUpdate: { factory_info: { factory_id: FACTORY_ID, auto_update: autoUpdate } } };
}

export function addProposalArgs(description: string, kind: ProposalKindInput): { proposal: { description: string; kind: ProposalKindInput } } {
  return { proposal: { description, kind } };
}

/** `proposal` echoes the kind exactly as filed (read back via get_proposal): valid on 2.3.1 and on main. */
export function actProposalArgs(id: number, action: VoteAction, kind: unknown): { id: number; action: VoteAction; proposal: unknown } {
  return { id, action, proposal: kind };
}

export function createDaoArgs(input: { name: string; purpose: string; policy: Policy }): { name: string; args: string } {
  return {
    name: input.name,
    args: jsonToBase64({ config: { name: input.name, purpose: input.purpose, metadata: '' }, policy: input.policy }),
  };
}

function isProposalStatus(value: string): value is ProposalStatus {
  return (PROPOSAL_STATUSES as readonly string[]).includes(value);
}

function voteCountsOf(value: unknown): Record<string, [number, number, number]> {
  const out: Record<string, [number, number, number]> = {};
  if (!isRecord(value)) return out;
  for (const [role, counts] of Object.entries(value)) {
    if (Array.isArray(counts) && counts.length === 3) {
      const [a, r, m] = counts;
      if (typeof a === 'number' && typeof r === 'number' && typeof m === 'number') out[role] = [a, r, m];
    }
  }
  return out;
}

function votesOf(value: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!isRecord(value)) return out;
  for (const [voter, vote] of Object.entries(value)) {
    if (typeof vote === 'string') out[voter] = vote;
  }
  return out;
}

/** Tolerant parser for get_proposal output (2.3.1 has numeric vote_counts and no last_actions_log). */
export function parseProposal(value: unknown): ProposalOutput {
  if (!isRecord(value)) throw new Error('proposal: not an object');
  const id = value['id'];
  const status = value['status'];
  if (typeof id !== 'number') throw new Error('proposal: bad id');
  if (typeof status !== 'string' || !isProposalStatus(status)) throw new Error('proposal: bad status');
  const proposer = value['proposer'];
  const description = value['description'];
  const submission = value['submission_time'];
  return {
    id,
    proposer: typeof proposer === 'string' ? proposer : '',
    description: typeof description === 'string' ? description : '',
    kind: value['kind'],
    status,
    vote_counts: voteCountsOf(value['vote_counts']),
    votes: votesOf(value['votes']),
    submission_time: typeof submission === 'string' ? submission : '',
  };
}

export function isTransferKind(kind: unknown): kind is TransferKind {
  if (!isRecord(kind)) return false;
  const t = kind['Transfer'];
  return isRecord(t) && typeof t['token_id'] === 'string' && typeof t['receiver_id'] === 'string' && typeof t['amount'] === 'string';
}

export function roleMembers(policy: Policy, roleName: string): string[] | null {
  const role = policy.roles.find((r) => r.name === roleName);
  if (role === undefined || typeof role.kind !== 'object' || !('Group' in role.kind)) return null;
  return [...role.kind.Group];
}

export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map((v) => canonicalJson(v)).join(',')}]`;
  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonicalJson(value[k])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

function normalizeRole(role: RolePermission): unknown {
  const kind = typeof role.kind === 'object' && 'Group' in role.kind ? { Group: [...role.kind.Group].sort() } : role.kind;
  return { name: role.name, kind, permissions: [...role.permissions].sort(), vote_policy: role.vote_policy };
}

export function policiesMatch(a: Policy, b: Policy): boolean {
  const norm = (p: Policy): string =>
    canonicalJson({
      roles: [...p.roles].sort((x, y) => x.name.localeCompare(y.name)).map(normalizeRole),
      default_vote_policy: p.default_vote_policy,
      proposal_bond: p.proposal_bond,
      proposal_period: p.proposal_period,
      bounty_bond: p.bounty_bond,
      bounty_forgiveness_period: p.bounty_forgiveness_period,
    });
  return norm(a) === norm(b);
}
