export const YOCTO_PER_NEAR = 10n ** 24n;
export const TGAS = 10n ** 12n;
export const GAS_300_TGAS = 300n * TGAS;

export function parseNear(text: string): bigint {
  const trimmed = text.trim();
  if (!/^\d+(\.\d{1,24})?$/.test(trimmed)) throw new Error(`invalid NEAR amount: ${text}`);
  const [whole, frac] = trimmed.split('.');
  return BigInt(whole ?? '0') * YOCTO_PER_NEAR + BigInt((frac ?? '').padEnd(24, '0'));
}

export function formatNear(yocto: bigint | string, maxDecimals = 4): string {
  const value = typeof yocto === 'bigint' ? yocto : BigInt(yocto);
  const negative = value < 0n;
  const abs = negative ? -value : value;
  const whole = abs / YOCTO_PER_NEAR;
  const frac = (abs % YOCTO_PER_NEAR).toString().padStart(24, '0').slice(0, maxDecimals).replace(/0+$/, '');
  return `${negative ? '-' : ''}${whole.toString()}${frac.length > 0 ? `.${frac}` : ''}`;
}
