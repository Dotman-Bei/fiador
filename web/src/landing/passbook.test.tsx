import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { Deployment } from '../../../src/lib/deployments';
import { loan, NEAR } from '../../../src/lib/fixtures/desk';
import { shortAccount, stampInk, stampWords } from '../ledger';
import { entryDetail, PassbookView, proposalWords } from './Passbook';

const DEPLOYMENT: Deployment = {
  network: 'testnet',
  rpc: 'https://rpc.testnet.fastnear.com',
  factory: 'sputnikv2.testnet',
  dao: 'fiador.sputnikv2.testnet',
  desk: 'desk.root.testnet',
  smoke: 'smoke.root.testnet',
  council: ['c1', 'c2', 'c3'],
  root: 'root.testnet',
  seeded_at: '2026-11-14T08:00:00.000Z',
  explorer: 'https://testnet.nearblocks.io',
};

describe('passbook', () => {
  it('stamps each outcome in its own ink and words', () => {
    expect([stampInk('Repaid'), stampInk('RepaidLate'), stampInk('Defaulted'), stampInk('Active'), stampInk('Refused')]).toEqual(['repaid', 'late', 'default', 'open', 'void']);
    expect(stampWords('RepaidLate')).toBe('Repaid late');
    expect(stampWords('AwaitingCouncil')).toBe('Awaiting council');
  });

  it('shortens only accounts under the demo root', () => {
    expect(shortAccount('ada.root.testnet', 'root.testnet')).toBe('ada');
    expect(shortAccount('visitor-x.testnet', 'root.testnet')).toBe('visitor-x.testnet');
  });

  it('writes the co-signer and the proposal on the line, or says no proposal was filed', () => {
    const cosigned = loan({ id: 0, cosigner: 'bayo.root.testnet', pledge: (2n * NEAR).toString(), lane: 'Cosigned', proposal_id: 6 });
    expect(entryDetail(cosigned, 'root.testnet')).toBe('co-signed by bayo for 2 NEAR');
    expect(proposalWords(cosigned)).toBe('proposal #6');
    const refused = loan({ id: 4, lane: 'Standing', cosigner: null, proposal_id: null, status: 'Refused' });
    expect([entryDetail(refused, 'root.testnet'), proposalWords(refused)]).toEqual(['within standing', 'no proposal']);
  });

  it('shows only real lines: none while loading, the read lines once loaded', () => {
    expect(renderToStaticMarkup(<PassbookView deployment={DEPLOYMENT} data={null} error={null} />)).not.toContain('<td');
    const html = renderToStaticMarkup(<PassbookView deployment={DEPLOYMENT} data={{ loans: [loan({ id: 0 })], total: 6 }} error={null} />);
    expect(html).toContain('#0');
    expect(html).toContain('Loans #0 to #0 of 6, read live from NEAR testnet. Accounts under root.testnet are shown by their first label.');
    expect(html).toContain('stamp ink-repaid');
  });
});
