/**
 * Hash routes for /app/ (`./app/#/loans/3`): they work from any subpath, GitHub Pages included, with no server rewrite.
 * Links are plain `<a href="#/...">`, so open-in-new-tab and copy-link work.
 */
import { useEffect, useState } from 'react';

export type LaneFilter = 'standing' | 'cosigned' | 'council';
export type StatusFilter = 'open' | 'repaid' | 'late' | 'defaulted' | 'unpaid';

export interface LoanFilters {
  lane?: LaneFilter;
  status?: StatusFilter;
  member?: string;
}

export type Route =
  | { name: 'overview' }
  | { name: 'loans'; filters: LoanFilters }
  | { name: 'loan'; id: number }
  | { name: 'requests' }
  | { name: 'members' }
  | { name: 'member'; account: string }
  | { name: 'desk' }
  | { name: 'states' }
  | { name: 'notfound'; path: string };

const LANES: readonly LaneFilter[] = ['standing', 'cosigned', 'council'];
const STATUSES: readonly StatusFilter[] = ['open', 'repaid', 'late', 'defaulted', 'unpaid'];

function pick<T extends string>(value: string | null, allowed: readonly T[]): T | undefined {
  return value !== null && (allowed as readonly string[]).includes(value) ? (value as T) : undefined;
}

export function parseHash(hash: string): Route {
  if (!hash.startsWith('#/')) return { name: 'overview' };
  const [rawPath = '', rawQuery = ''] = hash.slice(1).split('?');
  const parts = rawPath.split('/').filter((p) => p.length > 0).map((p) => decodeURIComponent(p));
  const q = new URLSearchParams(rawQuery);
  const [head, arg, extra] = parts;
  if (head === undefined) return { name: 'overview' };
  if (extra !== undefined) return { name: 'notfound', path: rawPath };
  switch (head) {
    case 'loans': {
      if (arg === undefined) {
        const filters: LoanFilters = {};
        const lane = pick(q.get('lane'), LANES);
        const status = pick(q.get('status'), STATUSES);
        const member = q.get('member');
        if (lane !== undefined) filters.lane = lane;
        if (status !== undefined) filters.status = status;
        if (member !== null && member.length > 0) filters.member = member;
        return { name: 'loans', filters };
      }
      return /^\d+$/.test(arg) ? { name: 'loan', id: Number(arg) } : { name: 'notfound', path: rawPath };
    }
    case 'members':
      return arg === undefined ? { name: 'members' } : { name: 'member', account: arg };
    case 'requests':
    case 'desk':
    case 'states':
      return arg === undefined ? { name: head } : { name: 'notfound', path: rawPath };
    default:
      return { name: 'notfound', path: rawPath };
  }
}

export function hrefOf(route: Route): string {
  switch (route.name) {
    case 'overview':
      return '#/';
    case 'loans': {
      const q = new URLSearchParams();
      if (route.filters.lane !== undefined) q.set('lane', route.filters.lane);
      if (route.filters.status !== undefined) q.set('status', route.filters.status);
      if (route.filters.member !== undefined) q.set('member', route.filters.member);
      const s = q.toString();
      return s.length === 0 ? '#/loans' : `#/loans?${s}`;
    }
    case 'loan':
      return `#/loans/${route.id}`;
    case 'member':
      return `#/members/${encodeURIComponent(route.account)}`;
    case 'notfound':
      return `#/${route.path}`;
    default:
      return `#/${route.name}`;
  }
}

export const loanHref = (id: number): string => hrefOf({ name: 'loan', id });
export const memberHref = (account: string): string => hrefOf({ name: 'member', account });

/** Which index tab a route belongs to. */
export function tabOf(route: Route): string {
  switch (route.name) {
    case 'loans':
    case 'loan':
      return 'loans';
    case 'members':
    case 'member':
      return 'members';
    default:
      return route.name;
  }
}

export function useRoute(): Route {
  const read = (): Route => parseHash(typeof location === 'undefined' ? '' : location.hash);
  const [route, setRoute] = useState<Route>(read);
  useEffect(() => {
    const on = (): void => setRoute(read());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}
