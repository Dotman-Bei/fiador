export function utf8ToBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

export function base64ToUtf8(b64: string): string {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

export function jsonToBase64(value: unknown): string {
  return utf8ToBase64(JSON.stringify(value));
}

export function bytesToUtf8(bytes: readonly number[]): string {
  return new TextDecoder().decode(Uint8Array.from(bytes));
}
