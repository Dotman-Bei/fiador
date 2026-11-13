import { describe, expect, it } from 'vitest';
import { readEnv, readPublicEnv } from './env';

describe('readEnv', () => {
  it('requires FIADOR_ROOT', () => {
    expect(() => readEnv({ FIADOR_ROOT_KEY: 'ed25519:abc' })).toThrow('FIADOR_ROOT is not set');
  });
  it('requires an ed25519 secret key', () => {
    expect(() => readEnv({ FIADOR_ROOT: 'r.testnet', FIADOR_ROOT_KEY: 'secp256k1:abc' })).toThrow('FIADOR_ROOT_KEY');
    expect(() => readEnv({ FIADOR_ROOT: 'r.testnet', FIADOR_ROOT_KEY: 'ed25519:' })).toThrow('FIADOR_ROOT_KEY');
  });
  it('applies defaults and trims overrides', () => {
    expect(readEnv({ FIADOR_ROOT: 'r.testnet', FIADOR_ROOT_KEY: 'ed25519:abc' })).toEqual({
      root: 'r.testnet',
      rootKey: 'ed25519:abc',
      rpc: 'https://rpc.testnet.fastnear.com',
      daoName: 'fiador',
      faucetUrl: 'https://helper.nearprotocol.com/account',
    });
    expect(readEnv({ FIADOR_ROOT: 'r.testnet', FIADOR_ROOT_KEY: 'ed25519:abc', FIADOR_DAO_NAME: ' fiador-v2 ' }).daoName).toBe('fiador-v2');
  });
  it('reads the public part without any secret', () => {
    expect(readPublicEnv({})).toEqual({ rpc: 'https://rpc.testnet.fastnear.com', daoName: 'fiador', faucetUrl: 'https://helper.nearprotocol.com/account' });
  });
});
