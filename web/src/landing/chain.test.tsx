import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DEMO_PARAMS } from '../../../src/lib/desk';
import { buildFiadorPolicy } from '../../../src/lib/sputnik';
import { DEPLOYMENT, loan, NEAR, NOW, POLICY, proposal, snapshot } from '../test/fixtures';
import { boundaryOf, laneLoans, latestWithStatus, partyNote, stationsOf } from './chain';
import { DEFAULT_SELECTION, InstrumentView } from './Instrument';

const CTX = { deployment: DEPLOYMENT, params: DEMO_PARAMS };
const BOOK = [
  loan({ id: 0 }),
  loan({ id: 1, lane: 'Council', cosigner: null, pledge: '0', borrower_part: '0', principal: (3n * NEAR).toString() }),
  loan({ id: 2, lane: 'Standing', status: 'RepaidLate', cosigner: null, pledge: '0' }),
  loan({ id: 3, status: 'Defaulted', principal: (2n * NEAR).toString(), borrower_part: (1n * NEAR).toString(), pledge: (1n * NEAR).toString() }),
  loan({ id: 4, lane: 'Standing', status: 'Refused', cosigner: null, pledge: '0', proposal_id: null }),
  loan({ id: 5, lane: 'Standing', cosigner: null, pledge: '0' }),
];

describe('lane to loan', () => {
  it('shows the latest loan of a lane that closed Repaid, else the latest; lists the rest newest first', () => {
    expect(laneLoans(BOOK, 'Standing').pick?.id).toBe(5);
    expect(laneLoans(BOOK, 'Standing').all.map((l) => l.id)).toEqual([5, 4, 2]);
    expect(laneLoans(BOOK, 'Cosigned').pick?.id).toBe(0);
    expect(laneLoans(BOOK, 'Council').pick?.id).toBe(1);
    expect(laneLoans([BOOK[2]!], 'Standing').pick?.id).toBe(2);
    expect(laneLoans([], 'Council').pick).toBeNull();
    expect(latestWithStatus(BOOK, 'Defaulted')?.id).toBe(3);
  });
});

describe('stations', () => {
  it('walks a co-signed loan from ask to repayment, each step with its source', () => {
    const s = stationsOf(BOOK[0]!, proposal(10, 'Approved'), CTX);
    expect(s.map((x) => x.name)).toEqual(['Asked', 'Co-signed', 'Filed', 'Approved', 'Paid', 'Repaid']);
    expect(s[0]?.lines[1]).toBe('4 NEAR fit their unused standing; 2 NEAR needed a co-signer');
    expect(s[0]?.timeNote).toBe('the desk keeps no ask time once a request is co-signed');
    expect(s[1]?.lines[0]).toBe('bayo pledged 2 NEAR from their own standing');
    expect(s[2]?.lines).toEqual(['the desk filed proposal #10', 'transfer 6 NEAR to ada']);
    expect(s[3]?.lines[0]).toBe("by the desk's one vote, 1 of 1");
    expect(s[3]?.party).toBe('desk');
    expect(s[3]?.timeNote).toBe('Sputnik keeps no approval time');
    expect(s[5]?.lines).toEqual(['on time, 08:01:00 UTC', 'ada +1 NEAR standing', 'bayo +1 NEAR']);
    expect(s[2]?.source).toBe('Sputnik · proposal #10');
  });

  it('names the council voters on a council-lane loan', () => {
    const p = proposal(11, 'Approved', { votes: { 'council-1.root.testnet': 'Approve', 'council-2.root.testnet': 'Approve' }, vote_counts: { council: [2, 0, 0] } });
    const s = stationsOf(BOOK[1]!, p, CTX);
    expect(s.map((x) => x.name)).toEqual(['Asked', 'Filed', 'Approved', 'Paid', 'Repaid']);
    expect(s[0]?.lines[0]).toBe('ada asked the council for 3 NEAR');
    expect(s[2]?.lines).toEqual(['by council-1 and council-2, 2 of 3', 'a council vote']);
    expect(s[2]?.party).toBe('council');
  });

  it('stops a refused loan at the filing, and marks a default for anyone', () => {
    expect(stationsOf(BOOK[4]!, undefined, CTX).map((x) => [x.name, x.done])).toEqual([
      ['Asked', 'yes'],
      ['Filed', 'no'],
      ['Refused', 'yes'],
    ]);
    const d = stationsOf(BOOK[3]!, proposal(13, 'Approved'), CTX);
    const last = d[d.length - 1];
    expect(last?.lines).toEqual(['past the grace period', "ada's standing went to 0", 'bayo lost the 1 NEAR pledged']);
    expect(last?.party).toBe('anyone');
  });

  it('says when a proposal could not be read instead of guessing', () => {
    const s = stationsOf(BOOK[0]!, undefined, CTX);
    expect(s[s.length - 1]?.lines).toEqual(['Sputnik proposal #10', 'its details could not be read just now']);
  });
});

describe('who can do what', () => {
  const input = { policy: POLICY, deskKeys: 0, deployment: DEPLOYMENT, visitorDeposit: (NEAR / 20n).toString() };

  it('reads the desk and the council from the live policy', () => {
    const desk = boundaryOf('desk', input);
    expect(desk.can).toEqual(['file a transfer proposal', 'approve a transfer proposal', 'pass a transfer with its one vote']);
    expect(desk.cannot).toContain('act with its own keys: it has 0 access keys, so no admin and no upgrade');
    expect(desk.sources.every((s) => s.live)).toBe(true);
    expect(boundaryOf('council', input).can[0]).toBe('every proposal kind, each needing 2 approvals of 3');
    expect(boundaryOf('council', input).sources[1]).toEqual({ text: 'three scripted accounts sharing one operator key (README)', live: false });
    expect(boundaryOf('anyone', input).can).toContain('join the visitor line with a 0.05 NEAR deposit');
  });

  it('shows an unseated desk as able to do nothing, and a keyed desk as not keyless', () => {
    const unseated = boundaryOf('desk', { ...input, policy: buildFiadorPolicy({ council: DEPLOYMENT.council, deskSeat: [] }), deskKeys: 2 });
    expect(unseated.can).toEqual([]);
    expect(unseated.cannot[0]).toContain('not seated');
    expect(unseated.cannot).toContain('stay keyless: it has 2 access key(s)');
  });

  it('explains a party that took no step', () => {
    const s = stationsOf(BOOK[0]!, proposal(10, 'Approved'), CTX);
    expect(partyNote('council', BOOK[0]!, s)).toBe("No council vote: the desk's seat approved it within the limits the council set.");
    expect(partyNote('desk', BOOK[0]!, s)).toBeNull();
  });
});

describe('instrument', () => {
  const fresh = { phase: 'live' as const, readAtMs: NOW - 4_000, nowMs: NOW };
  const props = { deployment: DEPLOYMENT, fresh, elapsedMs: 2_000, sel: DEFAULT_SELECTION, onSelect: () => undefined, onRetry: () => undefined };

  it('shows only the step names while reading, never a figure', () => {
    const html = renderToStaticMarkup(<InstrumentView {...props} snap={null} error={null} />);
    expect(html).toContain('Reading the loan book from NEAR testnet · 2 s');
    expect(html).toContain('Approved');
    expect(html).not.toContain('NEAR</');
  });

  it('falls back to the rules, labelled, when testnet cannot be read', () => {
    const html = renderToStaticMarkup(<InstrumentView {...props} snap={null} error="Failed to fetch" />);
    expect(html).toContain('the RPC endpoint could not be reached from this browser');
    expect(html).toContain('Rules');
    expect(html).toContain('Retry now');
  });

  it('follows the real loan of the chosen lane, with both controls and the read age', () => {
    const html = renderToStaticMarkup(<InstrumentView {...props} snap={snapshot()} error={null} />);
    expect(html).toContain('role="radiogroup"');
    expect(html).toContain('aria-checked="true"');
    expect(html).toContain('ada borrowed 6 NEAR');
    expect(html).toContain('the desk filed proposal #10');
    expect(html).toContain('The desk can');
    expect(html).toContain('read from NEAR testnet 4 s ago');
  });
});
