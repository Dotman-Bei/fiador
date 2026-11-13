import { bytesToUtf8, jsonToBase64 } from './encoding';

export const DEFAULT_TESTNET_RPC = 'https://rpc.testnet.fastnear.com';

export class RpcError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RpcError';
  }
}

export interface AccountInfo {
  amount: string;
  locked: string;
  storage_usage: number;
  code_hash: string;
}

export type FetchLike = (
  url: string,
  init: { method: string; headers: Record<string, string>; body: string },
) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Read-only NEAR JSON-RPC client. Uses only `fetch`, so it runs in the browser and in Node 22. */
export class RpcClient {
  readonly url: string;
  private readonly fetchImpl: FetchLike;
  private nextId = 0;

  constructor(url: string = DEFAULT_TESTNET_RPC, fetchImpl?: FetchLike) {
    this.url = url;
    this.fetchImpl = fetchImpl ?? ((u, init) => fetch(u, init));
  }

  async request(method: string, params: unknown): Promise<unknown> {
    this.nextId += 1;
    const res = await this.fetchImpl(this.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: `fiador-${this.nextId}`, method, params }),
    });
    if (!res.ok) throw new RpcError(`RPC HTTP ${res.status} for ${method}`);
    const body = await res.json();
    if (!isRecord(body)) throw new RpcError(`RPC returned a non-object for ${method}`);
    const error = body['error'];
    if (error !== undefined && error !== null) throw new RpcError(`RPC error for ${method}: ${JSON.stringify(error)}`);
    return body['result'];
  }

  async view<T>(accountId: string, methodName: string, args: Record<string, unknown> = {}): Promise<T> {
    const result = await this.request('query', {
      request_type: 'call_function',
      finality: 'final',
      account_id: accountId,
      method_name: methodName,
      args_base64: jsonToBase64(args),
    });
    if (!isRecord(result)) throw new RpcError(`view ${accountId}.${methodName}: empty result`);
    const error = result['error'];
    if (typeof error === 'string') throw new RpcError(`view ${accountId}.${methodName}: ${error}`);
    const raw = result['result'];
    if (!Array.isArray(raw) || !raw.every((n): n is number => typeof n === 'number')) {
      throw new RpcError(`view ${accountId}.${methodName}: no result bytes`);
    }
    const text = bytesToUtf8(raw);
    return (text.length === 0 ? null : JSON.parse(text)) as T;
  }

  async viewAccount(accountId: string): Promise<AccountInfo | null> {
    let result: unknown;
    try {
      result = await this.request('query', { request_type: 'view_account', finality: 'final', account_id: accountId });
    } catch (err) {
      if (err instanceof RpcError && err.message.includes('UNKNOWN_ACCOUNT')) return null;
      throw err;
    }
    if (!isRecord(result)) throw new RpcError(`view_account ${accountId}: unexpected shape`);
    const amount = result['amount'];
    const locked = result['locked'];
    const storageUsage = result['storage_usage'];
    const codeHash = result['code_hash'];
    if (typeof amount !== 'string' || typeof locked !== 'string' || typeof storageUsage !== 'number' || typeof codeHash !== 'string') {
      throw new RpcError(`view_account ${accountId}: unexpected shape`);
    }
    return { amount, locked, storage_usage: storageUsage, code_hash: codeHash };
  }

  async accessKeyCount(accountId: string): Promise<number> {
    const result = await this.request('query', { request_type: 'view_access_key_list', finality: 'final', account_id: accountId });
    if (!isRecord(result)) throw new RpcError(`view_access_key_list ${accountId}: unexpected shape`);
    const keys = result['keys'];
    if (!Array.isArray(keys)) throw new RpcError(`view_access_key_list ${accountId}: unexpected shape`);
    return keys.length;
  }

  async status(): Promise<{ protocolVersion: number; chainId: string }> {
    const result = await this.request('status', []);
    if (!isRecord(result)) throw new RpcError('status: unexpected shape');
    const protocolVersion = result['protocol_version'];
    const chainId = result['chain_id'];
    if (typeof protocolVersion !== 'number' || typeof chainId !== 'string') throw new RpcError('status: unexpected shape');
    return { protocolVersion, chainId };
  }
}
