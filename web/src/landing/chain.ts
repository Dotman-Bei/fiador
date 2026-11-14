/**
 * The live chain: a loan's steps between named parties, each read from the desk or from Sputnik, and what each party
 * can and cannot do, read from the DAO's live policy (or, for the desk's own rules, labelled as coming from its source).
 * Pure, so the landing instrument, the loan page and the tests share it.
 */
import type { DeskParams, Lane, LoanView } from '../../../src/lib/desk';
import type { Deployment } from '../../../src/lib/deployments';
import { COUNCIL_ROLE, DESK_ROLE, isTransferKind, roleMembers } from '../../../src/lib/sputnik';
import type { Policy, ProposalOutput } from '../../../src/lib/sputnik';
import { shortAccount } from '../ledger';
import { near, nsToMs, utcTime } from '../data/format';

export type Party = 'member' | 'cosigner' | 'desk' | 'council' | 'anyone';
export const PARTIES: readonly { key: Party; label: string }[] = [
  { key: 'member', label: 'Member' },
  { key: 'cosigner', label: 'Co-signer' },
  { key: 'desk', label: 'Desk' },
  { key: 'council', label: 'Council' },
  { key: 'anyone', label: 'Anyone' },
];

export const LANES: readonly { key: Lane; label: string; short: string }[] = [
  { key: 'Standing', label: 'Within standing', short: 'Standing' },
  { key: 'Cosigned', label: 'With a co-signer', short: 'Co-signed' },
  { key: 'Council', label: 'By council vote', short: 'Council' },
];

/** The loans of a lane, newest first, and the one to show: the latest that closed Repaid, else the latest. */
export function laneLoans(loans: readonly LoanView[], lane: Lane): { all: LoanView[]; pick: LoanView | null } {
  const all = loans.filter((l) => l.lane === lane).sort((a, b) => b.id - a.id);
  return { all, pick: all.find((l) => l.status === 'Repaid') ?? all[0] ?? null };
}

/** The latest loan that ended in a given status (for the outcome legend). */
export function latestWithStatus(loans: readonly LoanView[], status: string): LoanView | null {
  return [...loans].sort((a, b) => b.id - a.id).find((l) => l.status === status) ?? null;
}

export type Done = 'yes' | 'no' | 'pending';

export interface Station {
  key: string;
  name: string;
  done: Done;
  /** The party that took this step, for the party control (null: the DAO contract itself). */
  party: Party | null;
  lines: string[];
  time: number | null;
  /** When the time is unknown, why. */
  timeNote: string | null;
  source: string;
}

function voters(p: ProposalOutput | undefined): string[] {
  if (p === undefined) return [];
  return Object.entries(p.votes)
    .filter(([, v]) => v === 'Approve')
    .map(([who]) => who)
    .sort();
}

export interface ChainContext {
  deployment: Pick<Deployment, 'desk' | 'root' | 'council'>;
  params: Pick<DeskParams, 'growth_step' | 'max_standing'>;
}

/** The steps of one loan, as far as the desk and Sputnik record them. */
export function stationsOf(loan: LoanView, proposal: ProposalOutput | undefined, ctx: ChainContext): Station[] {
  const name = (a: string): string => shortAccount(a, ctx.deployment.root);
  const who = name(loan.borrower);
  const amount = near(loan.principal);
  const desk = `desk · loan #${loan.id}`;
  const out: Station[] = [];

  if (loan.lane === 'Cosigned') {
    out.push({
      key: 'asked',
      name: 'Asked',
      done: 'yes',
      party: 'member',
      lines: [`${who} asked for ${amount}`, `${near(loan.borrower_part)} fit their unused standing; ${near(loan.pledge)} needed a co-signer`],
      time: null,
      timeNote: 'the desk keeps no ask time once a request is co-signed',
      source: desk,
    });
    out.push({
      key: 'cosigned',
      name: 'Co-signed',
      done: 'yes',
      party: 'cosigner',
      lines: [`${loan.cosigner === null ? 'a member' : name(loan.cosigner)} pledged ${near(loan.pledge)} from their own standing`],
      time: loan.created_at_ms,
      timeNote: null,
      source: desk,
    });
  } else {
    out.push({
      key: 'asked',
      name: 'Asked',
      done: 'yes',
      party: 'member',
      lines: loan.lane === 'Council' ? [`${who} asked the council for ${amount}`] : [`${who} asked for ${amount}`, 'within their unused standing and the book cap'],
      time: loan.created_at_ms,
      timeNote: null,
      source: desk,
    });
  }

  if (loan.proposal_id === null) {
    out.push({
      key: 'filed',
      name: 'Filed',
      done: 'no',
      party: 'desk',
      lines: ['Sputnik would not file the transfer', 'no proposal exists, nothing was paid'],
      time: loan.closed_at_ms > 0 ? loan.closed_at_ms : null,
      timeNote: null,
      source: desk,
    });
    out.push({ key: 'closed', name: 'Refused', done: 'yes', party: null, lines: ['the loan closed without a payout'], time: loan.closed_at_ms || null, timeNote: null, source: desk });
    return out;
  }

  const sp = `Sputnik · proposal #${loan.proposal_id}`;
  if (proposal === undefined) {
    out.push({ key: 'filed', name: 'Filed', done: 'yes', party: 'desk', lines: [`Sputnik proposal #${loan.proposal_id}`, 'its details could not be read just now'], time: null, timeNote: 'status unavailable', source: sp });
    return out;
  }

  const kind = proposal.kind;
  const transfer = isTransferKind(kind) ? kind.Transfer : null;
  out.push({
    key: 'filed',
    name: 'Filed',
    done: 'yes',
    party: proposal.proposer === ctx.deployment.desk ? 'desk' : null,
    lines: [
      `${proposal.proposer === ctx.deployment.desk ? 'the desk' : name(proposal.proposer)} filed proposal #${proposal.id}`,
      transfer === null ? 'not a transfer' : `transfer ${near(transfer.amount)} to ${name(transfer.receiver_id)}`,
    ],
    time: nsToMs(proposal.submission_time),
    timeNote: null,
    source: sp,
  });

  const v = voters(proposal);
  const deskVoted = v.includes(ctx.deployment.desk);
  const councilVotes = v.filter((a) => ctx.deployment.council.includes(a));
  const approvedBy = deskVoted ? "the desk's one vote, 1 of 1" : councilVotes.length > 0 ? `${councilVotes.map(name).join(' and ')}, ${councilVotes.length} of ${ctx.deployment.council.length}` : 'no recorded votes';
  const approved: Station = {
    key: 'approved',
    name: 'Approved',
    done: proposal.status === 'Approved' || proposal.status === 'Failed' ? 'yes' : proposal.status === 'InProgress' ? 'pending' : 'no',
    party: deskVoted ? 'desk' : councilVotes.length > 0 ? 'council' : null,
    lines:
      proposal.status === 'InProgress'
        ? [`waiting for votes: ${councilVotes.length} of 2 so far`]
        : proposal.status === 'Approved' || proposal.status === 'Failed'
          ? [`by ${approvedBy}`, deskVoted ? 'no council vote' : 'a council vote']
          : [`Sputnik status: ${proposal.status}`, 'not approved'],
    time: null,
    timeNote: 'Sputnik keeps no approval time',
    source: sp,
  };
  out.push(approved);

  const paid: Station = {
    key: 'paid',
    name: 'Paid',
    done: proposal.status === 'Approved' && loan.status !== 'Voided' ? 'yes' : proposal.status === 'InProgress' ? 'pending' : 'no',
    party: null,
    lines:
      proposal.status === 'Failed' || loan.status === 'Voided'
        ? ['the transfer failed inside Sputnik', 'the loan was voided']
        : proposal.status === 'Approved'
          ? [`the DAO paid ${who} ${amount}`, 'from its treasury; the desk never held it']
          : ['not paid'],
    time: null,
    timeNote: proposal.status === 'Approved' ? 'paid when the proposal passed' : null,
    source: sp,
  };
  out.push(paid);

  const step = BigInt(ctx.params.growth_step);
  const min = (a: bigint, b: bigint): bigint => (a < b ? a : b);
  switch (loan.status) {
    case 'Active':
      out.push({ key: 'closed', name: 'Due', done: 'pending', party: 'member', lines: [`due at ${utcTime(loan.due_at_ms)}`, 'repay with exactly the principal'], time: loan.due_at_ms, timeNote: null, source: desk });
      break;
    case 'Repaid': {
      const lines = [`on time, ${utcTime(loan.closed_at_ms)}`, `${who} +${near(min(step, BigInt(loan.principal)))} standing`];
      if (loan.cosigner !== null && BigInt(loan.pledge) > 0n) lines.push(`${name(loan.cosigner)} +${near(min(step, BigInt(loan.pledge)))}`);
      out.push({ key: 'closed', name: 'Repaid', done: 'yes', party: 'member', lines, time: loan.closed_at_ms, timeNote: null, source: `${desk}; standing change derived from the desk's rule` });
      break;
    }
    case 'RepaidLate':
      out.push({ key: 'closed', name: 'Repaid late', done: 'yes', party: 'member', lines: [`after the due time ${utcTime(loan.due_at_ms)}`, 'within grace: no gain, no slash'], time: loan.closed_at_ms, timeNote: null, source: desk });
      break;
    case 'Defaulted': {
      const lines = ['past the grace period', `${who}'s standing went to 0`];
      if (loan.cosigner !== null && BigInt(loan.pledge) > 0n) lines.push(`${name(loan.cosigner)} lost the ${near(loan.pledge)} pledged`);
      out.push({ key: 'closed', name: 'Defaulted', done: 'yes', party: 'anyone', lines, time: loan.closed_at_ms, timeNote: null, source: `${desk}; anyone may call mark_default after term plus grace` });
      break;
    }
    case 'NotFunded':
      out.push({ key: 'closed', name: 'Not funded', done: 'yes', party: null, lines: ['the council did not approve it', 'nothing was paid'], time: loan.closed_at_ms || null, timeNote: null, source: desk });
      break;
    case 'Voided':
      out.push({ key: 'closed', name: 'Voided', done: 'yes', party: null, lines: ['closed after the payout failed'], time: loan.closed_at_ms || null, timeNote: null, source: desk });
      break;
    default:
      out.push({ key: 'closed', name: 'Open', done: 'pending', party: null, lines: [`desk status: ${loan.status}`], time: null, timeNote: null, source: desk });
  }
  return out;
}

export interface Boundary {
  title: string;
  can: string[];
  cannot: string[];
  /** Each source line, with whether it is a live read or a rule. */
  sources: { text: string; live: boolean }[];
}

const PERMISSION_WORDS: Record<string, string> = {
  'transfer:AddProposal': 'file a transfer proposal',
  'transfer:VoteApprove': 'approve a transfer proposal',
  '*:*': 'every proposal kind',
};

export function boundaryOf(party: Party, input: { policy: Policy; deskKeys: number; deployment: Pick<Deployment, 'desk'>; visitorDeposit: string }): Boundary {
  const { policy, deskKeys } = input;
  const keys = deskKeys === 0 ? 'act with its own keys: it has 0 access keys, so no admin and no upgrade' : `stay keyless: it has ${deskKeys} access key(s)`;
  switch (party) {
    case 'desk': {
      const role = policy.roles.find((r) => r.name === DESK_ROLE);
      const seat = roleMembers(policy, DESK_ROLE) ?? [];
      const seated = seat.includes(input.deployment.desk);
      const perms = role === undefined ? [] : role.permissions.map((p) => PERMISSION_WORDS[p] ?? p);
      const threshold = role?.vote_policy['transfer']?.threshold;
      return {
        title: 'The desk',
        can: seated ? [...perms, ...(threshold === '1' ? ['pass a transfer with its one vote'] : [])] : [],
        cannot: [...(seated ? [] : ['anything: it is not seated in the policy, so Sputnik refuses its asks']), 'any other proposal kind', keys],
        sources: [
          { text: `policy role "${DESK_ROLE}"${seated ? `, seat: ${input.deployment.desk}` : ', seat empty'}`, live: true },
          { text: `access keys on the desk: ${deskKeys}`, live: true },
        ],
      };
    }
    case 'council': {
      const role = policy.roles.find((r) => r.name === COUNCIL_ROLE);
      const members = roleMembers(policy, COUNCIL_ROLE) ?? [];
      const dvp = policy.default_vote_policy;
      const need = typeof dvp.threshold === 'string' ? dvp.threshold : `${dvp.threshold[0]}/${dvp.threshold[1]}`;
      return {
        title: 'The council',
        can: [
          `${(role?.permissions ?? []).map((p) => PERMISSION_WORDS[p] ?? p).join(', ') || 'nothing'}, each needing ${need} approvals of ${members.length}`,
          'admit members and set every limit',
          'vote council-lane loans',
          'unseat the desk',
        ],
        cannot: ["change the desk's code: " + (deskKeys === 0 ? 'the desk has 0 access keys' : `the desk has ${deskKeys} access key(s)`)],
        sources: [
          { text: `policy role "${COUNCIL_ROLE}", ${members.length} accounts; default vote policy quorum ${dvp.quorum}, threshold ${need}`, live: true },
          { text: 'three scripted accounts sharing one operator key (README)', live: false },
        ],
      };
    }
    case 'member':
      return {
        title: 'A member',
        can: ['ask within their unused standing', 'ask above it and wait for a co-signer', 'ask the council', "co-sign another member's gap", 'cancel their own request', 'repay with exactly the principal'],
        cannot: ['approve their own loan', 'borrow past the book cap'],
        sources: [{ text: 'the desk contract source (contract/desk/src)', live: false }],
      };
    case 'cosigner':
      return {
        title: 'A co-signer',
        can: ["cover the whole gap of one held request from their own unused standing, up to a cap they set"],
        cannot: ['co-sign their own request', 'co-sign as a visitor', 'take the pledge back before the loan closes', 'keep the pledge if the borrower defaults'],
        sources: [{ text: 'the desk contract source (contract/desk/src/requests.rs)', live: false }],
      };
    case 'anyone':
      return {
        title: 'Anyone',
        can: ['read every view (this page does)', 'call sync_loan', 'call mark_default once term and grace have passed', `join the visitor line with a ${near(input.visitorDeposit)} deposit`],
        cannot: ['move any NEAR', 'approve anything'],
        sources: [{ text: 'the desk contract source (contract/desk/src)', live: false }],
      };
  }
}

/** What the chosen party did in this loan, in one sentence, when the stations alone do not say it. */
export function partyNote(party: Party, loan: LoanView, stations: readonly Station[]): string | null {
  const took = stations.some((s) => s.party === party);
  if (took) return null;
  if (party === 'council' && loan.lane !== 'Council') return "No council vote: the desk's seat approved it within the limits the council set.";
  if (party === 'cosigner') return `No co-signer: loan #${loan.id} went through the ${loan.lane === 'Council' ? 'council' : 'standing'} lane.`;
  if (party === 'anyone') return loan.status === 'Active' ? 'Anyone may call mark_default once term and grace have passed.' : `No outside step in loan #${loan.id}.`;
  return `The ${party} took no step in loan #${loan.id}.`;
}
