import { describe, expect, it } from 'vitest';
import { hrefOf, parseHash, tabOf } from './router';

describe('hash router', () => {
  it('treats no hash, or an old anchor, as the overview', () => {
    expect(parseHash('')).toEqual({ name: 'overview' });
    expect(parseHash('#book')).toEqual({ name: 'overview' });
    expect(parseHash('#/')).toEqual({ name: 'overview' });
  });

  it('parses loans with filters, a loan, members, a member, requests and desk', () => {
    expect(parseHash('#/loans?lane=cosigned&status=open')).toEqual({ name: 'loans', filters: { lane: 'cosigned', status: 'open' } });
    expect(parseHash('#/loans?lane=nope')).toEqual({ name: 'loans', filters: {} });
    expect(parseHash('#/loans/3')).toEqual({ name: 'loan', id: 3 });
    expect(parseHash('#/members/ada-1.fiador-ops-vmwpxk.testnet')).toEqual({ name: 'member', account: 'ada-1.fiador-ops-vmwpxk.testnet' });
    expect(parseHash('#/requests')).toEqual({ name: 'requests' });
    expect(parseHash('#/desk')).toEqual({ name: 'desk' });
    expect(parseHash('#/__states')).toEqual({ name: 'states' });
    expect(parseHash('#/states')).toEqual({ name: 'notfound', path: '/states' });
  });

  it('sends anything else to not found', () => {
    expect(parseHash('#/loans/x')).toEqual({ name: 'notfound', path: '/loans/x' });
    expect(parseHash('#/nope')).toEqual({ name: 'notfound', path: '/nope' });
    expect(parseHash('#/loans/3/extra')).toEqual({ name: 'notfound', path: '/loans/3/extra' });
  });

  it('writes links that parse back to the same route', () => {
    const routes = [
      { name: 'overview' },
      { name: 'loans', filters: { lane: 'council', member: 'ada.root.testnet' } },
      { name: 'loan', id: 12 },
      { name: 'member', account: 'fiador-visitor-k7lsumcc.testnet' },
      { name: 'requests' },
      { name: 'desk' },
    ] as const;
    for (const r of routes) expect(parseHash(hrefOf(r))).toEqual(r);
  });

  it('maps detail routes to their tab', () => {
    expect(tabOf({ name: 'loan', id: 1 })).toBe('loans');
    expect(tabOf({ name: 'member', account: 'a' })).toBe('members');
    expect(tabOf({ name: 'overview' })).toBe('overview');
  });
});
