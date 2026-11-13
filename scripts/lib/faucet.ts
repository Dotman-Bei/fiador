import type { AccountInfo } from '../../src/lib/rpc';
import { waitFor } from './near';

export interface FaucetRequest {
  newAccountId: string;
  newAccountPublicKey: string;
}

export type PostJson = (url: string, body: FaucetRequest) => Promise<{ status: number; text: string }>;

export const defaultPostJson: PostJson = async (url, body) => {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return { status: res.status, text: await res.text() };
};

/** Asks the public testnet faucet helper to create `<name>.testnet` holding `publicKey`. */
export async function requestFaucetAccount(faucetUrl: string, newAccountId: string, publicKey: string, post: PostJson = defaultPostJson): Promise<void> {
  if (!/^[a-z0-9]+([-_][a-z0-9]+)*\.testnet$/.test(newAccountId)) {
    throw new Error(`faucet accounts must be <name>.testnet: ${newAccountId}`);
  }
  const res = await post(faucetUrl, { newAccountId, newAccountPublicKey: publicKey });
  if (res.status < 200 || res.status >= 300) {
    throw new Error(`faucet refused ${newAccountId}: HTTP ${res.status} ${res.text.slice(0, 300)}`);
  }
}

export function randomAccountName(prefix: string, random: () => number = Math.random): string {
  const suffix = Math.floor(random() * 36 ** 8).toString(36).padStart(8, '0');
  return `${prefix}-${suffix}.testnet`;
}

export async function waitForAccount(
  rpc: { viewAccount(accountId: string): Promise<AccountInfo | null> },
  accountId: string,
  timeoutMs = 60_000,
  intervalMs = 2_000,
): Promise<AccountInfo> {
  const info = await waitFor(() => rpc.viewAccount(accountId), (v) => v !== null, `account ${accountId}`, timeoutMs, intervalMs);
  if (info === null) throw new Error(`account ${accountId} never appeared`);
  return info;
}
