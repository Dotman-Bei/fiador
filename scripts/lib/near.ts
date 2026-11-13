import { Account, JsonRpcProvider, KeyPairSigner, actions } from 'near-api-js';
import { base64ToUtf8 } from '../../src/lib/encoding';
import type { RpcClient } from '../../src/lib/rpc';
import { GAS_300_TGAS, TGAS } from '../../src/lib/units';
import type { FiadorEnv } from './env';

export const EMPTY_CODE_HASH = '11111111111111111111111111111111';

export interface Near {
  provider: JsonRpcProvider;
  signer: KeyPairSigner;
  account(accountId: string): Account;
}

/** Every Fiador sub-account carries the root's public key, so one signer signs for all of them. */
export function connect(env: FiadorEnv): Near {
  const provider = new JsonRpcProvider({ url: env.rpc });
  const signer = KeyPairSigner.fromSecretKey(env.rootKey);
  return { provider, signer, account: (accountId: string) => new Account(accountId, provider, signer) };
}

export interface TxResult {
  ok: boolean;
  failures: string[];
  value: unknown;
  raw: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function decodeSuccessValue(b64: string): unknown {
  if (b64.length === 0) return null;
  const text = base64ToUtf8(b64);
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

/** Reads a final execution outcome: top-level success/value plus the failure text of every failed receipt. */
export function summarizeOutcome(raw: unknown): TxResult {
  const failures: string[] = [];
  let ok = false;
  let value: unknown = null;
  if (isRecord(raw)) {
    const status = raw['status'];
    if (isRecord(status)) {
      if ('Failure' in status) failures.push(`tx: ${JSON.stringify(status['Failure'])}`);
      const successValue = status['SuccessValue'];
      if (typeof successValue === 'string') {
        ok = true;
        value = decodeSuccessValue(successValue);
      } else if (typeof status['SuccessReceiptId'] === 'string') {
        ok = true;
      }
    }
    const receipts = raw['receipts_outcome'];
    if (Array.isArray(receipts)) {
      for (const receipt of receipts) {
        if (!isRecord(receipt)) continue;
        const outcome = receipt['outcome'];
        if (!isRecord(outcome)) continue;
        const receiptStatus = outcome['status'];
        const executor = outcome['executor_id'];
        if (isRecord(receiptStatus) && 'Failure' in receiptStatus) {
          failures.push(`${typeof executor === 'string' ? executor : '?'}: ${JSON.stringify(receiptStatus['Failure'])}`);
        }
      }
    }
  }
  return { ok, failures, value, raw };
}

export function hasFailure(result: TxResult, needle: string): boolean {
  return result.failures.some((f) => f.includes(needle));
}

export function requireOk(result: TxResult, what: string): unknown {
  if (!result.ok) throw new Error(`${what} failed: ${result.failures.join(' | ') || 'no success status'}`);
  return result.value;
}

/** One function call, 300 Tgas by default, never throwing on an execution failure (inspect the TxResult). */
export async function callTx(
  from: Account,
  receiverId: string,
  methodName: string,
  args: Record<string, unknown>,
  depositYocto: bigint = 0n,
  gas: bigint = GAS_300_TGAS,
): Promise<TxResult> {
  const raw: unknown = await from.signAndSendTransaction({
    receiverId,
    actions: [actions.functionCall(methodName, args, gas, depositYocto)],
    throwOnFailure: false,
  });
  return summarizeOutcome(raw);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function waitFor<T>(
  read: () => Promise<T>,
  done: (value: T) => boolean,
  what: string,
  timeoutMs = 45_000,
  intervalMs = 1_500,
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const value = await read();
    if (done(value)) return value;
    if (Date.now() > deadline) throw new Error(`timed out waiting for ${what}`);
    await sleep(intervalMs);
  }
}

export interface SubAccountCreator {
  createSubAccount(args: { accountOrPrefix: string; publicKey: string; nearToTransfer: bigint }): Promise<unknown>;
}

export async function ensureSubAccount(
  parent: SubAccountCreator,
  rpc: Pick<RpcClient, 'viewAccount'>,
  accountId: string,
  publicKey: string,
  nearToTransfer: bigint,
  pollMs = 1_500,
): Promise<'created' | 'exists'> {
  if ((await rpc.viewAccount(accountId)) !== null) return 'exists';
  await parent.createSubAccount({ accountOrPrefix: accountId, publicKey, nearToTransfer });
  await waitFor(() => rpc.viewAccount(accountId), (info) => info !== null, `account ${accountId}`, 45_000, pollMs);
  return 'created';
}

/** Deploy + init in ONE transaction, so nobody can call `new` before us. */
export async function deployWithInit(account: Account, wasm: Uint8Array, initArgs: Record<string, unknown>): Promise<TxResult> {
  const raw: unknown = await account.signAndSendTransaction({
    receiverId: account.accountId,
    actions: [actions.deployContract(wasm), actions.functionCall('new', initArgs, 100n * TGAS, 0n)],
    throwOnFailure: false,
  });
  return summarizeOutcome(raw);
}
