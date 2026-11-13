import { describe, expect, it } from 'vitest';
import { RpcClient, RpcError } from './rpc';
import type { FetchLike } from './rpc';

function fakeFetch(responses: unknown[], calls: unknown[], ok = true): FetchLike {
  let i = 0;
  return async (_url, init) => {
    calls.push(JSON.parse(init.body) as unknown);
    const body = responses[i];
    i += 1;
    return { ok, status: ok ? 200 : 503, json: async () => body };
  };
}

const bytes = (text: string): number[] => Array.from(new TextEncoder().encode(text));

describe('RpcClient', () => {
  it('calls a view function with base64 args and decodes the JSON result', async () => {
    const calls: unknown[] = [];
    const rpc = new RpcClient('https://rpc.example', fakeFetch([{ jsonrpc: '2.0', id: 'x', result: { result: bytes('"2.3.1"'), logs: [] } }], calls));
    await expect(rpc.view<string>('dao.testnet', 'get_proposal', { id: 3 })).resolves.toBe('2.3.1');
    expect(calls[0]).toMatchObject({
      method: 'query',
      params: { request_type: 'call_function', finality: 'final', account_id: 'dao.testnet', method_name: 'get_proposal', args_base64: 'eyJpZCI6M30=' },
    });
  });

  it('turns a contract error string into an RpcError', async () => {
    const rpc = new RpcClient('https://rpc.example', fakeFetch([{ result: { error: 'wasm execution failed with error: ERR_NO_PROPOSAL', logs: [] } }], []));
    await expect(rpc.view('dao.testnet', 'get_proposal', { id: 99 })).rejects.toThrow(RpcError);
  });

  it('returns null for an unknown account', async () => {
    const rpc = new RpcClient('https://rpc.example', fakeFetch([{ error: { name: 'HANDLER_ERROR', cause: { name: 'UNKNOWN_ACCOUNT', info: {} } } }], []));
    await expect(rpc.viewAccount('nobody.testnet')).resolves.toBeNull();
  });

  it('reads an existing account', async () => {
    const rpc = new RpcClient('https://rpc.example', fakeFetch([{ result: { amount: '5', locked: '0', storage_usage: 182, code_hash: '11111111111111111111111111111111' } }], []));
    await expect(rpc.viewAccount('a.testnet')).resolves.toEqual({ amount: '5', locked: '0', storage_usage: 182, code_hash: '11111111111111111111111111111111' });
  });

  it('counts access keys', async () => {
    const rpc = new RpcClient('https://rpc.example', fakeFetch([{ result: { keys: [{ public_key: 'ed25519:a' }, { public_key: 'ed25519:b' }] } }], []));
    await expect(rpc.accessKeyCount('a.testnet')).resolves.toBe(2);
  });

  it('reads node status', async () => {
    const rpc = new RpcClient('https://rpc.example', fakeFetch([{ result: { protocol_version: 88, chain_id: 'testnet' } }], []));
    await expect(rpc.status()).resolves.toEqual({ protocolVersion: 88, chainId: 'testnet' });
  });

  it('throws on an HTTP failure', async () => {
    const rpc = new RpcClient('https://rpc.example', fakeFetch([{}], [], false));
    await expect(rpc.status()).rejects.toThrow('RPC HTTP 503');
  });
});
