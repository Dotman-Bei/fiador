import { describe, expect, it } from 'vitest';
import { askCall, cancelCall, cosignCall, GAS_300, repayCall } from './actions';

describe('wallet call specs', () => {
  it('asks in yocto with 300 Tgas and no deposit', () => {
    expect(askCall('6')).toEqual({ methodName: 'ask', args: { amount: '6000000000000000000000000' }, gas: GAS_300, deposit: 0n });
  });
  it('co-signs with a cap', () => {
    expect(cosignCall(' ada.testnet ', '2').args).toEqual({ borrower: 'ada.testnet', max_pledge: '2000000000000000000000000' });
  });
  it('repays the exact principal', () => {
    expect(repayCall(3, '6000000000000000000000000')).toEqual({ methodName: 'repay', args: { loan_id: 3 }, gas: GAS_300, deposit: 6n * 10n ** 24n });
    expect(() => repayCall(-1, '1')).toThrow('loan id must be a whole number');
  });
  it('cancels a request', () => {
    expect(cancelCall().methodName).toBe('cancel_request');
  });
});
