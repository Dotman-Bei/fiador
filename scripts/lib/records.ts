import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

export interface SmokeRecord {
  network: 'testnet';
  rpc: string;
  factory: string;
  dao: string;
  dao_version: string;
  smoke: string;
  council: string[];
  root: string;
  vote_check_proposal: number;
  transfer_proposal: number;
  permission_denied: boolean;
  smoke_transfer_yocto: string;
  at: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function isSmokeRecord(value: unknown): value is SmokeRecord {
  if (!isRecord(value)) return false;
  const council = value['council'];
  return (
    value['network'] === 'testnet' &&
    typeof value['rpc'] === 'string' &&
    typeof value['factory'] === 'string' &&
    typeof value['dao'] === 'string' &&
    typeof value['dao_version'] === 'string' &&
    typeof value['smoke'] === 'string' &&
    Array.isArray(council) &&
    council.every((c) => typeof c === 'string') &&
    typeof value['root'] === 'string' &&
    typeof value['vote_check_proposal'] === 'number' &&
    typeof value['transfer_proposal'] === 'number' &&
    typeof value['permission_denied'] === 'boolean' &&
    typeof value['smoke_transfer_yocto'] === 'string' &&
    typeof value['at'] === 'string'
  );
}

export function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

export function readSmokeRecord(path = 'deployments/smoke.json'): SmokeRecord {
  const value: unknown = JSON.parse(readFileSync(path, 'utf8'));
  if (!isSmokeRecord(value)) throw new Error(`${path} is not a smoke record`);
  return value;
}
