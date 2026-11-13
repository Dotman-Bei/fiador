import { describe, expect, it } from 'vitest';
import { base64ToUtf8, bytesToUtf8, jsonToBase64, utf8ToBase64 } from './encoding';

describe('encoding', () => {
  it('round-trips UTF-8 through base64', () => {
    expect(base64ToUtf8(utf8ToBase64('fiador ✓'))).toBe('fiador ✓');
  });
  it('encodes JSON args the way NEAR RPC expects', () => {
    expect(jsonToBase64({ id: 3 })).toBe('eyJpZCI6M30=');
  });
  it('decodes RPC result byte arrays', () => {
    expect(bytesToUtf8([34, 50, 46, 51, 46, 49, 34])).toBe('"2.3.1"');
  });
});
