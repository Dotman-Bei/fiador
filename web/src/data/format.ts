/** Times, durations and amounts as the board writes them. */
import { formatNear } from '../../../src/lib/units';

export function near(yocto: string | bigint): string {
  return `${formatNear(yocto)} NEAR`;
}

/** "4 s", "42 s", "3 min", "2 h", "5 d": how long ago, in one unit. */
export function ago(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h} h`;
  return `${Math.floor(h / 24)} d`;
}

/** "17:31:35 UTC" */
export function utcTime(ms: number): string {
  return `${new Date(ms).toISOString().slice(11, 19)} UTC`;
}

/** "2026-11-13 17:31 UTC" */
export function utcDateTime(ms: number): string {
  const iso = new Date(ms).toISOString();
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`;
}

/** A contract duration in seconds, in words: "2 min", "90 s", "1 h 30 min". */
export function duration(sec: number): string {
  if (sec < 60 || sec % 60 !== 0) return sec < 120 ? `${sec} s` : `${Math.floor(sec / 60)} min ${sec % 60} s`;
  const m = sec / 60;
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return m % 60 === 0 ? `${h} h` : `${h} h ${m % 60} min`;
}

/** Sputnik's submission_time is nanoseconds as a string. */
export function nsToMs(ns: string): number | null {
  if (!/^\d+$/.test(ns)) return null;
  return Number(BigInt(ns) / 1_000_000n);
}

/** "2m 05s", "expired" or "—" when there is no deadline. Kept from the first board (web/src/board/data.ts). */
export function countdown(targetMs: number, nowMs: number): string {
  if (targetMs === 0) return '—';
  const s = Math.floor((targetMs - nowMs) / 1000);
  if (s <= 0) return 'expired';
  return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`;
}
