import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { isSmokeRecord, readSmokeRecord, writeJson } from './records';
import type { SmokeRecord } from './records';

const RECORD: SmokeRecord = {
  network: 'testnet',
  rpc: 'https://rpc.testnet.fastnear.com',
  factory: 'sputnikv2.testnet',
  dao: 'fiador.sputnikv2.testnet',
  dao_version: '2.3.1',
  smoke: 'smoke.root.testnet',
  council: ['council-1.root.testnet', 'council-2.root.testnet', 'council-3.root.testnet'],
  root: 'root.testnet',
  vote_check_proposal: 0,
  transfer_proposal: 1,
  permission_denied: true,
  smoke_transfer_yocto: '10000000000000000000000',
  at: '2026-11-13T15:00:00.000Z',
};

describe('records', () => {
  it('validates a smoke record', () => {
    expect(isSmokeRecord(RECORD)).toBe(true);
    expect(isSmokeRecord({ ...RECORD, council: 'x' })).toBe(false);
    expect(isSmokeRecord({ ...RECORD, network: 'mainnet' })).toBe(false);
  });
  it('writes pretty JSON with a trailing newline and reads it back', () => {
    const dir = mkdtempSync(join(tmpdir(), 'fiador-'));
    const path = join(dir, 'nested', 'smoke.json');
    writeJson(path, RECORD);
    expect(readFileSync(path, 'utf8').endsWith('}\n')).toBe(true);
    expect(readSmokeRecord(path)).toEqual(RECORD);
  });
  it('refuses a malformed file', () => {
    const dir = mkdtempSync(join(tmpdir(), 'fiador-'));
    const path = join(dir, 'bad.json');
    writeJson(path, { network: 'testnet' });
    expect(() => readSmokeRecord(path)).toThrow('not a smoke record');
  });
});
