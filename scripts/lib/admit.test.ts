import { describe, expect, it } from 'vitest';
import { checkAdmitIds, MAX_TOP_UP, parseTopUp, readmitRefusal, topUpAmount } from './admit';

const NEAR = 10n ** 24n;
const CTX = { desk: 'desk.ops.testnet', dao: 'fiador.sputnikv2.testnet', deskSeat: ['desk.ops.testnet', 'old-desk.ops.testnet'] };

describe('admit checks', () => {
  it('accepts named testnet accounts, trimmed and deduplicated', () => {
    expect(checkAdmitIds([' goodkale2741.testnet', 'a-b_c.sub.testnet', 'goodkale2741.testnet'], CTX)).toEqual(['goodkale2741.testnet', 'a-b_c.sub.testnet']);
  });

  it('refuses anything that is not a *.testnet id', () => {
    for (const id of ['alice.near', 'alice', 'Alice.testnet', 'testnet', '.testnet', 'a..b.testnet', 'a-.testnet', `${'a'.repeat(64)}.testnet`, '98793cd91a3f870fb126f66285808c7e094afcfc4eda8a970f6648cdf0dbd6de']) {
      expect(() => checkAdmitIds([id], CTX), id).toThrow('not a *.testnet account id');
    }
  });

  it('refuses the desk, any desk-seat account and the DAO', () => {
    expect(() => checkAdmitIds(['desk.ops.testnet'], CTX)).toThrow("desk.ops.testnet: holds the DAO's desk seat");
    expect(() => checkAdmitIds(['old-desk.ops.testnet'], CTX)).toThrow("holds the DAO's desk seat");
    expect(() => checkAdmitIds(['fiador.sputnikv2.testnet'], CTX)).toThrow('is the DAO itself');
  });

  it('refuses the whole batch if any id is refused, naming each', () => {
    expect(() => checkAdmitIds(['ok.testnet', 'bad.near', 'desk.ops.testnet'], CTX)).toThrow(/bad\.near: not a \*\.testnet account id; desk\.ops\.testnet: holds/);
  });

  it('needs at least one id', () => {
    expect(() => checkAdmitIds([], CTX)).toThrow('at least one account id');
  });
});

describe('readmit', () => {
  const idle = { open_loans: 0, drawn: '0', pledged: '0', visitor: null };
  it('allows a member with nothing open, drawn, pledged or requested', () => {
    expect(readmitRefusal('kale.testnet', idle, false)).toBeNull();
  });
  it('refuses an open loan, a pledge, a waiting request, a visitor seat and a non-member', () => {
    expect(readmitRefusal('k.testnet', { ...idle, open_loans: 1, drawn: '3' }, false)).toBe('k.testnet: has an open loan');
    expect(readmitRefusal('k.testnet', { ...idle, drawn: '1' }, false)).toBe('k.testnet: has an open loan');
    expect(readmitRefusal('k.testnet', { ...idle, pledged: '1' }, false)).toBe('k.testnet: has an open pledge');
    expect(readmitRefusal('k.testnet', idle, true)).toBe('k.testnet: has a request waiting for a co-signer');
    expect(readmitRefusal('k.testnet', { ...idle, visitor: { deposit: '1' } }, false)).toBe('k.testnet: holds a visitor seat');
    expect(readmitRefusal('k.testnet', null, false)).toContain('not a member');
  });
});

describe('top-up', () => {
  it('takes a target above 0 and at most 5 NEAR', () => {
    expect(parseTopUp('2')).toBe(2n * NEAR);
    expect(parseTopUp('5')).toBe(MAX_TOP_UP);
    expect(() => parseTopUp('0')).toThrow('above 0 and at most 5');
    expect(() => parseTopUp('5.1')).toThrow('above 0 and at most 5');
  });

  it('sends only the shortfall, and nothing on a rerun', () => {
    expect(topUpAmount(0n, 2n * NEAR)).toBe(2n * NEAR);
    expect(topUpAmount(NEAR / 2n, 2n * NEAR)).toBe(2n * NEAR - NEAR / 2n);
    expect(topUpAmount(2n * NEAR, 2n * NEAR)).toBe(0n);
    expect(topUpAmount(3n * NEAR, 2n * NEAR)).toBe(0n);
  });
});
