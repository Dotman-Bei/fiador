import { describe, expect, it } from 'vitest';
import { checkWasm } from './wasm-inspect';

// A hand-assembled module: imports env.foo, exports function "bar".
const WITH_ENV = Uint8Array.from([
  0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00,
  0x01, 0x04, 0x01, 0x60, 0x00, 0x00,
  0x02, 0x0b, 0x01, 0x03, 0x65, 0x6e, 0x76, 0x03, 0x66, 0x6f, 0x6f, 0x00, 0x00,
  0x03, 0x02, 0x01, 0x00,
  0x07, 0x07, 0x01, 0x03, 0x62, 0x61, 0x72, 0x00, 0x01,
  0x0a, 0x04, 0x01, 0x02, 0x00, 0x0b,
]);
// The same export with no imports at all (what a build without `--cfg near` looks like to this check).
const NO_ENV = Uint8Array.from([
  0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00,
  0x01, 0x04, 0x01, 0x60, 0x00, 0x00,
  0x03, 0x02, 0x01, 0x00,
  0x07, 0x07, 0x01, 0x03, 0x62, 0x61, 0x72, 0x00, 0x00,
  0x0a, 0x04, 0x01, 0x02, 0x00, 0x0b,
]);

describe('checkWasm', () => {
  it('passes when every required export exists and the module imports from env', () => {
    const r = checkWasm(WITH_ENV, ['bar']);
    expect(r).toEqual({ ok: true, size: WITH_ENV.byteLength, exports: ['bar'], missing: [], usesNearHost: true });
  });

  it('reports missing exports', () => {
    const r = checkWasm(WITH_ENV, ['bar', 'baz']);
    expect(r.ok).toBe(false);
    expect(r.missing).toEqual(['baz']);
  });

  it('fails a module that never calls NEAR host functions', () => {
    const r = checkWasm(NO_ENV, ['bar']);
    expect(r.ok).toBe(false);
    expect(r.usesNearHost).toBe(false);
  });

  it('throws on bytes that are not wasm', () => {
    expect(() => checkWasm(Uint8Array.from([1, 2, 3]), [])).toThrow();
  });
});
