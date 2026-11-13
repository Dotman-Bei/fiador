/** Typed calls to the desk. Every call attaches 300 Tgas (callTx default) and never throws on a failed receipt. */
import type { AskResult, LoanStatus } from '../../src/lib/desk';
import type { CallFn } from './council';
import { requireOk } from './near';
import type { TxResult } from './near';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function parseAskResult(value: unknown): AskResult {
  if (isRecord(value)) {
    const held = value['Held'];
    if (isRecord(held) && typeof held['gap'] === 'string' && typeof held['expires_at_ms'] === 'number') {
      return { Held: { gap: held['gap'], expires_at_ms: held['expires_at_ms'] } };
    }
    const loan = value['Loan'];
    if (isRecord(loan) && typeof loan['loan_id'] === 'number' && typeof loan['status'] === 'string') {
      const pid = loan['proposal_id'];
      return { Loan: { loan_id: loan['loan_id'], status: loan['status'] as LoanStatus, proposal_id: typeof pid === 'number' ? pid : null } };
    }
  }
  throw new Error(`not an AskResult: ${JSON.stringify(value)}`);
}

export function loanIdOf(result: AskResult): number {
  if ('Held' in result) throw new Error(`expected a loan, the desk held the request (gap ${result.Held.gap})`);
  return result.Loan.loan_id;
}

export async function ask(call: CallFn, deskId: string, amountYocto: bigint): Promise<{ result: AskResult; tx: TxResult }> {
  const tx = await call(deskId, 'ask', { amount: amountYocto.toString() }, 0n);
  return { result: parseAskResult(requireOk(tx, 'ask')), tx };
}

export async function cosign(call: CallFn, deskId: string, borrower: string, maxPledgeYocto: bigint): Promise<{ result: AskResult; tx: TxResult }> {
  const tx = await call(deskId, 'cosign', { borrower, max_pledge: maxPledgeYocto.toString() }, 0n);
  return { result: parseAskResult(requireOk(tx, 'cosign')), tx };
}

export async function askCouncil(call: CallFn, deskId: string, amountYocto: bigint): Promise<{ result: AskResult; tx: TxResult }> {
  const tx = await call(deskId, 'ask_council', { amount: amountYocto.toString() }, 0n);
  return { result: parseAskResult(requireOk(tx, 'ask_council')), tx };
}

export function cancelRequest(call: CallFn, deskId: string): Promise<TxResult> {
  return call(deskId, 'cancel_request', {}, 0n);
}

/** Attaches exactly the principal: the desk forwards it to the DAO in the same chain. */
export function repay(call: CallFn, deskId: string, loanId: number, principalYocto: bigint): Promise<TxResult> {
  return call(deskId, 'repay', { loan_id: loanId }, principalYocto);
}

export function syncLoan(call: CallFn, deskId: string, loanId: number): Promise<TxResult> {
  return call(deskId, 'sync_loan', { loan_id: loanId }, 0n);
}

export function markDefault(call: CallFn, deskId: string, loanId: number): Promise<TxResult> {
  return call(deskId, 'mark_default', { loan_id: loanId }, 0n);
}

export function joinVisitorLine(call: CallFn, deskId: string, depositYocto: bigint): Promise<TxResult> {
  return call(deskId, 'join_visitor_line', {}, depositYocto);
}
