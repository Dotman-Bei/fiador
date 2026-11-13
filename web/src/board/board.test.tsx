import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { Deployment } from '../../../src/lib/deployments';
import { config, loan, member, NEAR } from '../../../src/lib/fixtures/desk';
import { Board, BoardView, LoanBook, WaitingTable } from './Board';
import type { BoardData } from './data';

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
const NOW = 1_800_000_000_000;

describe('board markup', () => {
  it('renders the five blocks with proposal ids', () => {
    const data: BoardData = {
      snapshot: { config: config({ book: (6n * NEAR).toString() }), members: [member({ account_id: 'ada.root.testnet' })], loans: [loan({ id: 0 })], requests: [] },
      treasury: { balance: (12n * NEAR).toString(), available: (6n * NEAR).toString() },
      seated: true,
      frozen: true,
      proposals: { 10: 'Approved' },
      loadedAtMs: NOW,
    };
    const html = renderToStaticMarkup(<BoardView deployment={DEPLOYMENT} data={data} nowMs={NOW} />);
    for (const heading of ['Treasury', 'Desk', 'Waiting for a co-signer', 'Loan book', 'Members']) expect(html).toContain(`>${heading}</h2>`);
    expect(html).toContain('#10 Approved');
    expect(html).toContain('https://testnet.nearblocks.io/address/fiador.sputnikv2.testnet');
    expect(html).toContain('yes: no access keys, so no admin and no upgrade');
  });
  it('says so when nothing is waiting or there are no loans', () => {
    expect(renderToStaticMarkup(<WaitingTable rows={[]} />)).toContain('No request is waiting for a co-signer.');
    expect(renderToStaticMarkup(<LoanBook rows={[]} />)).toContain('No loans yet.');
  });
  it('explains an unseeded build', () => {
    expect(renderToStaticMarkup(<Board deployment={null} />)).toContain('has not been seeded in this build');
  });
});
