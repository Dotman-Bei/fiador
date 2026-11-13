import { describe, expect, it } from 'vitest';
import { ensureSubAccount, hasFailure, requireOk, summarizeOutcome, waitFor } from './near';

const denied = {
  ActionError: { index: 0, kind: { FunctionCallError: { ExecutionError: 'Smart contract panicked: ERR_PERMISSION_DENIED' } } },
};

describe('summarizeOutcome', () => {
  it('decodes a JSON SuccessValue', () => {
    const r = summarizeOutcome({ status: { SuccessValue: 'Nw==' }, receipts_outcome: [] });
    expect(r.ok).toBe(true);
    expect(r.value).toBe(7);
    expect(r.failures).toEqual([]);
  });
  it('treats an empty SuccessValue as null', () => {
    expect(summarizeOutcome({ status: { SuccessValue: '' }, receipts_outcome: [] }).value).toBeNull();
  });
  it('collects a failed transaction and its failed receipts', () => {
    const r = summarizeOutcome({
      status: { Failure: denied },
      receipts_outcome: [{ id: 'r1', outcome: { executor_id: 'fiador.sputnikv2.testnet', status: { Failure: denied } } }],
    });
    expect(r.ok).toBe(false);
    expect(hasFailure(r, 'ERR_PERMISSION_DENIED')).toBe(true);
    expect(r.failures[1]).toContain('fiador.sputnikv2.testnet: ');
    expect(() => requireOk(r, 'add_proposal')).toThrow('add_proposal failed');
  });
  it('keeps an intermediate receipt failure on a successful transaction', () => {
    const r = summarizeOutcome({
      status: { SuccessValue: 'eyJsb2FuX2lkIjozfQ==' },
      receipts_outcome: [{ id: 'r1', outcome: { executor_id: 'fiador.sputnikv2.testnet', status: { Failure: denied } } }],
    });
    expect(r.ok).toBe(true);
    expect(r.value).toEqual({ loan_id: 3 });
    expect(hasFailure(r, 'ERR_PERMISSION_DENIED')).toBe(true);
  });
});

describe('waitFor', () => {
  it('resolves once the predicate holds', async () => {
    let n = 0;
    await expect(waitFor(async () => (n += 1), (v) => v >= 3, 'three', 1000, 1)).resolves.toBe(3);
  });
  it('times out', async () => {
    await expect(waitFor(async () => 0, () => false, 'never', 5, 1)).rejects.toThrow('timed out waiting for never');
  });
});

describe('ensureSubAccount', () => {
  it('skips an existing account', async () => {
    const calls: string[] = [];
    const parent = { createSubAccount: async (a: { accountOrPrefix: string }) => { calls.push(a.accountOrPrefix); return {}; } };
    const rpc = { viewAccount: async () => ({ amount: '1', locked: '0', storage_usage: 1, code_hash: 'x' }) };
    await expect(ensureSubAccount(parent, rpc, 'smoke.r.testnet', 'ed25519:pk', 1n, 1)).resolves.toBe('exists');
    expect(calls).toEqual([]);
  });
  it('creates a missing account and waits until RPC sees it', async () => {
    const calls: Array<{ accountOrPrefix: string; publicKey: string; nearToTransfer: bigint }> = [];
    const parent = { createSubAccount: async (a: { accountOrPrefix: string; publicKey: string; nearToTransfer: bigint }) => { calls.push(a); return {}; } };
    let reads = 0;
    const rpc = {
      viewAccount: async () => {
        reads += 1;
        return reads < 3 ? null : { amount: '1', locked: '0', storage_usage: 1, code_hash: 'x' };
      },
    };
    await expect(ensureSubAccount(parent, rpc, 'smoke.r.testnet', 'ed25519:pk', 2n, 1)).resolves.toBe('created');
    expect(calls).toEqual([{ accountOrPrefix: 'smoke.r.testnet', publicKey: 'ed25519:pk', nearToTransfer: 2n }]);
  });
});
