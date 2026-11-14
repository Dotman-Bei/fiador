/**
 * Browser stand-in for the `randombytes` package, aliased in web/vite.config.ts. The Meteor Wallet SDK's
 * @near-js/crypto 2.2.5 calls `randombytes(n)` for new key pairs; the real package reaches Node's `Buffer` through
 * safe-buffer, which the browser build stubs out, so the Meteor chunk crashed on load ("reading 'from'"). Its callers
 * only spread the bytes or wrap them in a Uint8Array, so Web Crypto's random bytes are a drop-in.
 */
const MAX_BYTES = 65_536;

export default function randomBytes(size: number): Uint8Array {
  if (!Number.isInteger(size) || size < 0) throw new RangeError('randombytes: size must be a whole number of bytes');
  const bytes = new Uint8Array(size);
  for (let at = 0; at < size; at += MAX_BYTES) globalThis.crypto.getRandomValues(bytes.subarray(at, Math.min(size, at + MAX_BYTES)));
  return bytes;
}
