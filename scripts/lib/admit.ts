/** Pure checks for `npm run admit`: which accounts the scripted council may admit, and how much gas money to send. */
import { parseNear } from '../../src/lib/units';

/** A named testnet account: lowercase NEAR account id parts, ending in `.testnet` (no mainnet, no implicit ids). */
const TESTNET_ID = /^(?:[a-z\d]+[-_])*[a-z\d]+(?:\.(?:[a-z\d]+[-_])*[a-z\d]+)*\.testnet$/;

export interface AdmitContext {
  desk: string;
  dao: string;
  /** Members of the DAO policy's `desk` role, read live. */
  deskSeat: readonly string[];
}

/** Returns the ids to admit, deduplicated and in order; throws naming every refused id and why. */
export function checkAdmitIds(ids: readonly string[], ctx: AdmitContext): string[] {
  if (ids.length === 0) throw new Error('give at least one account id, e.g. npm run admit -- alice.testnet');
  const refusals: string[] = [];
  const out: string[] = [];
  for (const raw of ids) {
    const id = raw.trim();
    if (id.length > 64 || !TESTNET_ID.test(id)) refusals.push(`${raw}: not a *.testnet account id`);
    else if (id === ctx.desk || ctx.deskSeat.includes(id)) refusals.push(`${id}: holds the DAO's desk seat`);
    else if (id === ctx.dao) refusals.push(`${id}: is the DAO itself`);
    else if (!out.includes(id)) out.push(id);
  }
  if (refusals.length > 0) throw new Error(`refused: ${refusals.join('; ')}`);
  return out;
}

/** The fields of a desk member that --readmit inspects. */
export interface ReadmitMember {
  open_loans: number;
  drawn: string;
  pledged: string;
  visitor: unknown;
}

/**
 * Why a member may not be removed and admitted again (back to the starter standing), or null when it may: nothing
 * open, nothing drawn, nothing pledged, no request waiting, and not a visitor seat. The desk's remove_member enforces
 * the loan, pledge and request part too; this refuses before any proposal is filed.
 */
export function readmitRefusal(id: string, m: ReadmitMember | null, hasRequest: boolean): string | null {
  if (m === null) return `${id}: not a member, so there is nothing to re-admit (admit without --readmit)`;
  if (m.visitor !== null) return `${id}: holds a visitor seat`;
  if (m.open_loans > 0 || BigInt(m.drawn) > 0n) return `${id}: has an open loan`;
  if (BigInt(m.pledged) > 0n) return `${id}: has an open pledge`;
  if (hasRequest) return `${id}: has a request waiting for a co-signer`;
  return null;
}

export const MAX_TOP_UP = parseNear('5');

/** `--top-up <NEAR>`: a target balance above zero and at most 5 NEAR (gas money for a wallet test, testnet only). */
export function parseTopUp(value: string): bigint {
  const target = parseNear(value);
  if (target <= 0n || target > MAX_TOP_UP) throw new Error('--top-up must be above 0 and at most 5 NEAR');
  return target;
}

/** What to send so the balance reaches the target; 0 when it already does (so a rerun sends nothing). */
export function topUpAmount(balance: bigint, target: bigint): bigint {
  return balance >= target ? 0n : target - balance;
}
