import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DEMO_PARAMS } from '../../../src/lib/desk';
import { buildFiadorPolicy } from '../../../src/lib/sputnik';
import { DEPLOYMENT, loan, member, NEAR, NOW, proposal, snapshot } from '../test/fixtures';
import { attentionItems, lastMovement } from './attention';
import { DeskView } from './pages/Desk';
import { LoanDetailView } from './pages/LoanDetail';
import { filterLoans, LoansView } from './pages/Loans';
import { MemberDetailView, MembersView } from './pages/Members';
import { LINKS, OverviewView } from './pages/Overview';
import { RequestsView } from './pages/Requests';
import { search } from './searchIndex';
import { standingTrail } from './standing';
import type { Freshness } from './states';

const FRESH: Freshness = { phase: 'live', readAtMs: NOW - 4_000, nowMs: NOW };
const BOOK = [
  loan({ id: 0, created_at_ms: NOW - 90_000, closed_at_ms: NOW - 50_000 }),
  loan({ id: 1, lane: 'Council', borrower: 'chidi.root.testnet', cosigner: null, pledge: '0', principal: (3n * NEAR).toString(), created_at_ms: NOW - 80_000, closed_at_ms: NOW - 40_000 }),
  loan({ id: 3, borrower: 'chidi.root.testnet', cosigner: 'ada.root.testnet', status: 'Defaulted', principal: (2n * NEAR).toString(), pledge: (1n * NEAR).toString(), created_at_ms: NOW - 70_000, closed_at_ms: NOW - 30_000 }),
];
const MEMBERS = [
  member({ account_id: 'ada.root.testnet', standing: (4n * NEAR).toString() }),
  member({ account_id: 'bayo.root.testnet', standing: (5n * NEAR).toString() }),
  member({ account_id: 'chidi.root.testnet', standing: '0' }),
];
const SNAP = snapshot({ desk: { ...snapshot().desk, loans: BOOK, members: MEMBERS }, proposals: { 10: proposal(10, 'Approved'), 11: proposal(11, 'Approved'), 13: proposal(13, 'Approved') } });

describe('attention', () => {
  it('is empty on a quiet desk and names the last movement', () => {
    expect(attentionItems(SNAP, DEPLOYMENT, NOW)).toEqual([]);
    expect(lastMovement(SNAP)).toBe('loan #3 defaulted at 07:59:30 UTC');
  });

  it('puts an unseated desk first, then overdue loans and requests, then what is merely due', () => {
    const grace = DEMO_PARAMS.grace_sec * 1000;
    const busy = snapshot({
      policy: buildFiadorPolicy({ council: DEPLOYMENT.council, deskSeat: [] }),
      desk: {
        ...snapshot().desk,
        loans: [loan({ id: 7, status: 'Active', due_at_ms: NOW - grace - 1_000, closed_at_ms: 0 }), loan({ id: 8, status: 'Active', due_at_ms: NOW + 80_000, closed_at_ms: 0 })],
        requests: [{ borrower: 'bayo.root.testnet', amount: (6n * NEAR).toString(), gap: (2n * NEAR).toString(), expires_at_ms: NOW + 420_000, expired: false }],
      },
    });
    const items = attentionItems(busy, DEPLOYMENT, NOW);
    expect(items.map((i) => i.key)).toEqual(['unseated', 'overdue-7', 'request-bayo.root.testnet', 'due-8']);
    expect(items[1]?.text).toContain('anyone may mark it defaulted');
    expect(items[2]?.text).toBe('bayo asked 6 NEAR and needs 2 NEAR co-signed · 7m 00s left.');
    expect(items[3]?.text).toContain('is due in 1m 20s');
  });
});

describe('standing trail', () => {
  it('derives every member from the grant and the loan book, and reconciles', () => {
    const ada = standingTrail(MEMBERS[0]!, BOOK, DEMO_PARAMS);
    expect(ada.steps.map((s) => [s.loanId, s.after])).toEqual([
      [null, 4n * NEAR],
      [0, 5n * NEAR],
      [3, 4n * NEAR],
    ]);
    expect(ada.reconciles).toBe(true);
    expect(standingTrail(MEMBERS[1]!, BOOK, DEMO_PARAMS).reconciles).toBe(true);
    const chidi = standingTrail(MEMBERS[2]!, BOOK, DEMO_PARAMS);
    expect(chidi.steps.map((s) => s.after)).toEqual([4n * NEAR, 5n * NEAR, 0n]);
  });

  it('says so when the derivation does not match the figure the desk reports', () => {
    const t = standingTrail(member({ account_id: 'ada.root.testnet', standing: (7n * NEAR).toString() }), BOOK, DEMO_PARAMS);
    expect(t.reconciles).toBe(false);
    const html = renderToStaticMarkup(<MemberDetailView deployment={DEPLOYMENT} snap={snapshot({ desk: { ...SNAP.desk, members: [member({ account_id: 'ada.root.testnet', standing: (7n * NEAR).toString() })] } })} fresh={FRESH} account="ada.root.testnet" />);
    expect(html).toContain("Differs from the desk&#x27;s figure (7 NEAR) by 3 NEAR");
  });
});

describe('search and filters', () => {
  it('finds loans by number, proposals by number, members by name and outcomes by word', () => {
    expect(search(SNAP, 'root.testnet', '#3').map((h) => h.href)).toEqual(['#/loans/3']);
    expect(search(SNAP, 'root.testnet', 'p11').map((h) => h.href)).toEqual(['#/loans/1']);
    expect(search(SNAP, 'root.testnet', 'chi').map((h) => h.label)).toEqual(['chidi']);
    expect(search(SNAP, 'root.testnet', 'defaul').map((h) => h.href)).toEqual(['#/loans/3']);
    expect(search(SNAP, 'root.testnet', '')).toEqual([]);
  });

  it('filters by lane, outcome and member', () => {
    expect(filterLoans(BOOK, { lane: 'council' }).map((l) => l.id)).toEqual([1]);
    expect(filterLoans(BOOK, { status: 'defaulted' }).map((l) => l.id)).toEqual([3]);
    expect(filterLoans(BOOK, { member: 'ada.root.testnet' }).map((l) => l.id)).toEqual([0, 3]);
  });
});

describe('pages', () => {
  it('overview shows the attention queue with its empty state and links into loans and members', () => {
    const html = renderToStaticMarkup(<OverviewView deployment={DEPLOYMENT} snap={SNAP} fresh={FRESH} links={LINKS} />);
    expect(html).toContain('>Needs a hand</h2>');
    expect(html).toContain('Nothing needs a hand.');
    expect(html).toContain('href="#/loans/3"');
    expect(html).toContain('href="#/members/ada.root.testnet"');
  });

  it('loans shows a count, the filters and a clear link', () => {
    const html = renderToStaticMarkup(<LoansView deployment={DEPLOYMENT} snap={SNAP} fresh={FRESH} filters={{ lane: 'council' }} />);
    expect(html).toContain('1 of 3 loans');
    expect(html).toContain('Clear filters');
    expect(html).toContain('aria-label="Filter by lane"');
  });

  it('loan detail walks the chain and offers the check; an unknown loan says what exists', () => {
    const html = renderToStaticMarkup(<LoanDetailView deployment={DEPLOYMENT} snap={SNAP} fresh={FRESH} id={0} checks={{ phase: 'idle' }} onRunChecks={() => undefined} />);
    expect(html).toContain('Loan #0');
    expect(html).toContain('The proposal chain');
    expect(html).toContain('Proposal #10 as read from Sputnik');
    expect(html).toContain('Run the desk&#x27;s checks');
    expect(html).toContain('Next: loan #1');
    const missing = renderToStaticMarkup(<LoanDetailView deployment={DEPLOYMENT} snap={SNAP} fresh={FRESH} id={99} checks={{ phase: 'idle' }} onRunChecks={() => undefined} />);
    expect(missing).toContain('There is no loan #99');
    expect(missing).toContain('numbered #0 to #3');
  });

  it('members and member detail, with the passbook and an unknown account', () => {
    expect(renderToStaticMarkup(<MembersView deployment={DEPLOYMENT} snap={SNAP} fresh={FRESH} />)).toContain('Standing starts as a council grant.');
    const ada = renderToStaticMarkup(<MemberDetailView deployment={DEPLOYMENT} snap={SNAP} fresh={FRESH} account="ada.root.testnet" />);
    expect(ada).toContain('>Passbook</h2>');
    expect(ada).toContain('Reconciles with the desk&#x27;s figure: 4 NEAR.');
    expect(ada).toContain('Derived');
    expect(renderToStaticMarkup(<MemberDetailView deployment={DEPLOYMENT} snap={SNAP} fresh={FRESH} account="who.testnet" />)).toContain('not a member of the desk');
  });

  it('requests keeps the README heading and says what fills it', () => {
    const html = renderToStaticMarkup(<RequestsView deployment={DEPLOYMENT} snap={SNAP} fresh={FRESH} />);
    expect(html).toContain('>Waiting for a co-signer</h2>');
    expect(html).toContain('lasts 10 min');
  });

  it('desk page offers the checks', () => {
    expect(renderToStaticMarkup(<DeskView deployment={DEPLOYMENT} snap={SNAP} fresh={FRESH} checks={{ phase: 'idle' }} onRunChecks={() => undefined} />)).toContain('Run the checks');
  });
});
