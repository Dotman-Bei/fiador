/** spec §7: every read-only check `npm run verify` makes. Pure, so it is unit-tested against fixtures. */
import { holdsReservation } from './desk';
import type { ConfigView, LoanStatus, LoanView, MemberView } from './desk';
import type { Deployment } from './deployments';
import { COUNCIL_ROLE, DESK_PERMISSIONS, DESK_ROLE, isTransferKind, roleMembers } from './sputnik';
import type { Policy, ProposalOutput, ProposalStatus } from './sputnik';

export interface VerifyInput {
  deployment: Deployment;
  factoryInfo: { factory_id: string; auto_update: boolean };
  policy: Policy;
  config: ConfigView;
  deskKeyCount: number;
  members: MemberView[];
  loans: LoanView[];
  proposals: Map<number, ProposalOutput>;
}

export interface Check {
  name: string;
  ok: boolean;
  detail: string;
}

export const KEYLESS_CHECK = 'desk is keyless (frozen)';

/** Which Sputnik statuses are consistent with each desk loan status (null = the loan has no proposal). */
export function allowedProposalStatuses(status: LoanStatus): readonly ProposalStatus[] | null {
  switch (status) {
    case 'Active':
    case 'Repaid':
    case 'RepaidLate':
    case 'Defaulted':
      return ['Approved'];
    case 'Voided':
      return ['Failed'];
    case 'NotFunded':
      return ['Rejected', 'Removed', 'Expired', 'Moved', 'Failed'];
    case 'AwaitingCouncil':
      return ['InProgress', 'Approved'];
    case 'Voting':
    case 'Filing':
      return ['InProgress', 'Approved', 'Failed'];
    case 'Refused':
      return null;
  }
}

function sum(values: readonly string[]): bigint {
  return values.reduce((acc, v) => acc + BigInt(v), 0n);
}

export function runChecks(input: VerifyInput): Check[] {
  const checks: Check[] = [];
  const add = (name: string, ok: boolean, detail: string): void => {
    checks.push({ name, ok, detail });
  };
  const { deployment, policy, config } = input;

  add('factory auto-upgrade is off', input.factoryInfo.auto_update === false, `auto_update=${String(input.factoryInfo.auto_update)}`);

  const seat = roleMembers(policy, DESK_ROLE);
  const deskRole = policy.roles.find((r) => r.name === DESK_ROLE);
  const perms = deskRole === undefined ? [] : [...deskRole.permissions].sort();
  const others = policy.roles.filter((r) => r.name !== DESK_ROLE && typeof r.kind === 'object' && 'Group' in r.kind && r.kind.Group.includes(deployment.desk));
  add(
    'desk seat holds only the desk, with transfer:AddProposal and transfer:VoteApprove only',
    seat !== null && seat.length === 1 && seat[0] === deployment.desk && perms.join(',') === [...DESK_PERMISSIONS].sort().join(',') && others.length === 0,
    `seat=${JSON.stringify(seat)} permissions=${JSON.stringify(perms)} other roles=${others.map((r) => r.name).join(',') || 'none'}`,
  );

  const council = roleMembers(policy, COUNCIL_ROLE);
  const dvp = policy.default_vote_policy;
  add(
    'council is 3 members and every kind needs 2 approvals',
    council !== null && council.length === 3 && dvp.weight_kind === 'RoleWeight' && dvp.quorum === '2' && dvp.threshold === '2',
    `council=${council === null ? 'missing' : council.length} quorum=${dvp.quorum} threshold=${JSON.stringify(dvp.threshold)}`,
  );

  add('desk is wired to this DAO', config.dao === deployment.dao, `desk.dao=${config.dao}`);
  add(KEYLESS_CHECK, input.deskKeyCount === 0, `${input.deskKeyCount} access key(s) on ${deployment.desk}`);

  for (const loan of input.loans) {
    const allowed = allowedProposalStatuses(loan.status);
    const name = `loan #${loan.id} (${loan.status}) matches its Sputnik proposal`;
    if (allowed === null) {
      add(name, loan.proposal_id === null, loan.proposal_id === null ? 'refused before filing' : `unexpected proposal ${loan.proposal_id}`);
      continue;
    }
    if (loan.proposal_id === null) {
      add(name, false, 'no proposal id');
      continue;
    }
    const p = input.proposals.get(loan.proposal_id);
    if (p === undefined) {
      add(name, false, `proposal ${loan.proposal_id} not found`);
      continue;
    }
    const kindOk =
      isTransferKind(p.kind) && p.kind.Transfer.token_id === '' && p.kind.Transfer.receiver_id === loan.borrower && p.kind.Transfer.amount === loan.principal;
    add(name, kindOk && allowed.includes(p.status), `proposal ${p.id}: ${p.status}, kind ${kindOk ? 'Transfer to borrower for principal' : JSON.stringify(p.kind)}`);
  }

  const reserving = input.loans.filter(holdsReservation);
  const book = sum(reserving.map((l) => l.principal));
  add('book equals the open principal', book === BigInt(config.book), `book=${config.book} expected=${book.toString()}`);

  for (const m of input.members) {
    const drawn = sum(reserving.filter((l) => l.borrower === m.account_id && l.lane !== 'Council').map((l) => l.borrower_part));
    const pledged = sum(reserving.filter((l) => l.cosigner === m.account_id).map((l) => l.pledge));
    add(
      `${m.account_id} drawn and pledged match open loans`,
      drawn === BigInt(m.drawn) && pledged === BigInt(m.pledged),
      `drawn=${m.drawn}/${drawn.toString()} pledged=${m.pledged}/${pledged.toString()}`,
    );
  }
  return checks;
}
