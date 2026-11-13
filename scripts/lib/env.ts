import { existsSync } from 'node:fs';
import { DEFAULT_TESTNET_RPC } from '../../src/lib/rpc';

export const DEFAULT_DAO_NAME = 'fiador';
export const DEFAULT_FAUCET_URL = 'https://helper.nearprotocol.com/account';

export interface FiadorEnv {
  root: string;
  rootKey: `ed25519:${string}`;
  rpc: string;
  daoName: string;
  faucetUrl: string;
}

/** Loads a git-ignored .env into process.env when it exists (Node 22's built-in loader). */
export function loadDotEnv(path = '.env'): void {
  if (existsSync(path)) process.loadEnvFile(path);
}

function nonEmpty(value: string | undefined): string | undefined {
  return value !== undefined && value.trim().length > 0 ? value.trim() : undefined;
}

function isEd25519Secret(value: string): value is `ed25519:${string}` {
  return value.startsWith('ed25519:') && value.length > 'ed25519:'.length;
}

export function readPublicEnv(source: Record<string, string | undefined>): { rpc: string; daoName: string; faucetUrl: string } {
  return {
    rpc: nonEmpty(source['FIADOR_RPC']) ?? DEFAULT_TESTNET_RPC,
    daoName: nonEmpty(source['FIADOR_DAO_NAME']) ?? DEFAULT_DAO_NAME,
    faucetUrl: nonEmpty(source['FIADOR_FAUCET_URL']) ?? DEFAULT_FAUCET_URL,
  };
}

export function readEnv(source: Record<string, string | undefined>): FiadorEnv {
  const root = nonEmpty(source['FIADOR_ROOT']);
  if (root === undefined) throw new Error('FIADOR_ROOT is not set (see .env.example)');
  const key = nonEmpty(source['FIADOR_ROOT_KEY']);
  if (key === undefined || !isEd25519Secret(key)) {
    throw new Error('FIADOR_ROOT_KEY is not set to an ed25519: secret key (see .env.example)');
  }
  return { root, rootKey: key, ...readPublicEnv(source) };
}
