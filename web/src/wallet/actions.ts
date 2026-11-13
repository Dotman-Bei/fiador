/** Desk calls a member signs in a testnet wallet. Pure, so they are unit-tested; 300 Tgas each. */
import { parseNear } from '../../../src/lib/units';

export interface CallSpec {
  methodName: string;
  args: Record<string, unknown>;
  gas: bigint;
  deposit: bigint;
}

export const GAS_300 = 300n * 10n ** 12n;

export function askCall(amountNear: string): CallSpec {
  return { methodName: 'ask', args: { amount: parseNear(amountNear).toString() }, gas: GAS_300, deposit: 0n };
}

export function cosignCall(borrower: string, maxPledgeNear: string): CallSpec {
  return { methodName: 'cosign', args: { borrower: borrower.trim(), max_pledge: parseNear(maxPledgeNear).toString() }, gas: GAS_300, deposit: 0n };
}

export function cancelCall(): CallSpec {
  return { methodName: 'cancel_request', args: {}, gas: GAS_300, deposit: 0n };
}

/** Attaches exactly the loan's principal, as the desk requires. */
export function repayCall(loanId: number, principalYocto: string): CallSpec {
  if (!Number.isInteger(loanId) || loanId < 0) throw new Error('loan id must be a whole number');
  return { methodName: 'repay', args: { loan_id: loanId }, gas: GAS_300, deposit: BigInt(principalYocto) };
}
