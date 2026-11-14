import { describe, expect, it } from 'vitest';
import { errorStatus, openingStatus, sentStatus, slowStatus, txHash, txUrl } from './status';

/** The shape Meteor's SDK throws: an Error whose `_reason.endTags` names what happened. */
function meteorError(message: string, endTags: string[]): Error {
  return Object.assign(new Error(message), { name: 'MeteorActionError', _reason: { message, endTags } });
}

describe('wallet status text', () => {
  it('opens, then explains a wallet that has not answered without claiming anything was sent', () => {
    expect(openingStatus('repay')).toBe('Opening your wallet for repay…');
    const slow = slowStatus('repay');
    expect(slow).toContain('Nothing is sent until you approve it there');
    expect(slow).toContain('click the Meteor icon in the browser toolbar');
    expect(slow).toContain('blocked pop-up icon');
    expect(slow).toContain('press Repay again');
    expect(slow).toContain('If you closed the wallet window, nothing was sent');
  });

  it('says a blocked Meteor pop-up in plain words', () => {
    const blocked = meteorError("Couldn't open popup window to complete wallet action", ['POPUP_WINDOW_OPEN_FAILED']);
    expect(errorStatus('repay', blocked)).toBe('Meteor Wallet could not open its window because the browser blocked the pop-up, so nothing was sent. Allow pop-ups for this site, then press Repay again.');
    expect(errorStatus('repay', meteorError('User refused to allow the popup window to open', ['POPUP_WINDOW_REFUSED']))).toContain('blocked the pop-up');
  });

  it('says a closed wallet window, a cancel and a replaced action in plain words', () => {
    expect(errorStatus('repay', meteorError('User closed the window before completing the action', ['INCOMPLETE_ACTION', 'WINDOW_CLOSED']))).toBe('The wallet window was closed before repay was approved, so nothing was sent.');
    expect(errorStatus('repay', meteorError('User cancelled the action', ['USER_CANCELLED']))).toBe('You cancelled repay in the wallet, so nothing was sent.');
    expect(errorStatus('ask', meteorError('A new action was started by the user, old action failed', ['NEW_ACTION_STARTED']))).toBe('A newer wallet action replaced ask, so ask was not sent.');
  });

  it('keeps an unknown error verbatim and does not claim nothing was sent', () => {
    const s = errorStatus('ask', new Error('Buffer is not defined'));
    expect(s).toBe('The wallet reported an error for ask: Buffer is not defined. Check the board before trying again.');
    expect(s).not.toContain('nothing was sent');
  });

  it('shows the transaction hash when the wallet returns one', () => {
    expect(txHash({ transaction: { hash: 'AxUGFN' }, transaction_outcome: { id: 'AxUGFN' } })).toBe('AxUGFN');
    expect(txHash({ transaction_outcome: { id: 'H2' } })).toBe('H2');
    expect(txHash(undefined)).toBeNull();
    expect(sentStatus('repay', { transaction: { hash: 'AxUGFN' } })).toBe('Your wallet sent repay in transaction AxUGFN. The board shows the result once the desk records it.');
    expect(sentStatus('repay', undefined)).toContain('Fiador has not read the result');
    expect(txUrl('https://testnet.nearblocks.io/', 'AxUGFN')).toBe('https://testnet.nearblocks.io/txns/AxUGFN');
  });
});
