import { describe, expect, it } from 'vitest';
import { randomAccountName, requestFaucetAccount, waitForAccount } from './faucet';
import type { FaucetRequest } from './faucet';

describe('faucet', () => {
  it('posts the near-cli-rs helper payload', async () => {
    const sent: Array<{ url: string; body: FaucetRequest }> = [];
    await requestFaucetAccount('https://helper.example/account', 'fiador-x.testnet', 'ed25519:pk', async (url, body) => {
      sent.push({ url, body });
      return { status: 200, text: '{}' };
    });
    expect(sent).toEqual([{ url: 'https://helper.example/account', body: { newAccountId: 'fiador-x.testnet', newAccountPublicKey: 'ed25519:pk' } }]);
  });
  it('reports a refusal with the HTTP status', async () => {
    await expect(
      requestFaucetAccount('https://helper.example/account', 'fiador-x.testnet', 'ed25519:pk', async () => ({ status: 429, text: 'rate limited' })),
    ).rejects.toThrow('faucet refused fiador-x.testnet: HTTP 429 rate limited');
  });
  it('only creates top-level .testnet names', async () => {
    await expect(requestFaucetAccount('u', 'a.b.testnet', 'pk', async () => ({ status: 200, text: '' }))).rejects.toThrow('<name>.testnet');
  });
  it('makes random names from a prefix', () => {
    expect(randomAccountName('fiador-visitor', () => 0)).toBe('fiador-visitor-00000000.testnet');
    expect(randomAccountName('fiador-visitor')).toMatch(/^fiador-visitor-[0-9a-z]{8}\.testnet$/);
  });
  it('waits until the account is visible', async () => {
    let reads = 0;
    const rpc = { viewAccount: async () => { reads += 1; return reads < 2 ? null : { amount: '9', locked: '0', storage_usage: 1, code_hash: 'x' }; } };
    await expect(waitForAccount(rpc, 'a.testnet', 1000, 1)).resolves.toEqual({ amount: '9', locked: '0', storage_usage: 1, code_hash: 'x' });
  });
});
