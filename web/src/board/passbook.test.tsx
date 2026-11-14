/**
 * The passbook. Updated for the redesign (S3): the landing hero no longer renders the passbook, so the PassbookView
 * case moves to the member's passbook on the member page; the stamp, naming and entry tests are unchanged.
 */
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { entryDetail, proposalWords, shortAccount, stampInk, stampWords } from '../ledger';
import { loan, NEAR } from '../test/fixtures';
import { MemberPassbook } from './pages/Members';

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

  it("shows only the member's real lines, as borrower and as co-signer", () => {
    const book = [loan({ id: 0 }), loan({ id: 1, borrower: 'chidi.root.testnet', cosigner: 'ada.root.testnet', status: 'Defaulted' }), loan({ id: 2, borrower: 'bayo.root.testnet', cosigner: null })];
    const html = renderToStaticMarkup(<MemberPassbook account="ada.root.testnet" loans={book} root="root.testnet" />);
    expect(html).toContain('#0');
    expect(html).toContain('co-signed for chidi');
    expect(html).not.toContain('#2');
    expect(html).toContain('stamp ink-default');
    expect(renderToStaticMarkup(<MemberPassbook account="nobody.root.testnet" loans={book} root="root.testnet" />)).toContain('No loans yet as borrower or co-signer.');
  });
});
