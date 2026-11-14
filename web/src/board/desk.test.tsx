import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DEMO_PARAMS } from '../../../src/lib/desk';
import { DEPLOYMENT, NOW, snapshot } from '../test/fixtures';
import { DeskView, nsPeriod, paramRows } from './pages/Desk';
import { tabsFor } from './App';

const FRESH = { phase: 'live' as const, readAtMs: NOW - 2_000, nowMs: NOW };

describe('desk and proof', () => {
  it('lays out every parameter in words with its raw value', () => {
    const rows = paramRows(DEMO_PARAMS);
    expect(rows).toHaveLength(12);
    expect(rows.find((r) => r.label === 'Loan term')).toEqual({ label: 'Loan term', value: '2 min', raw: '120 s' });
    expect(rows.find((r) => r.label.startsWith('Visitor deposit'))?.value).toBe('0.05 NEAR');
    expect(nsPeriod('604800000000000')).toBe('7 days');
  });

  it('shows the policy as read, the seat, the keys, and the factory setting from the checks run', () => {
    const idle = renderToStaticMarkup(<DeskView deployment={DEPLOYMENT} snap={snapshot()} fresh={FRESH} checks={{ phase: 'idle' }} onRunChecks={() => undefined} />);
    expect(idle).toContain('The DAO policy, as read');
    expect(idle).toContain('transfer:AddProposal, transfer:VoteApprove');
    expect(idle).toContain('0: no admin, no upgrade');
    expect(idle).toContain('read when the checks run');
    expect(idle).toContain('three scripted accounts sharing one operator key');
    const input = { deployment: DEPLOYMENT, factoryInfo: { factory_id: 'sputnikv2.testnet', auto_update: false }, policy: snapshot().policy, config: snapshot().desk.config, deskKeyCount: 0, members: [], loans: [], proposals: new Map() };
    const done = renderToStaticMarkup(
      <DeskView deployment={DEPLOYMENT} snap={snapshot()} fresh={FRESH} checks={{ phase: 'done', steps: [], run: { checks: [{ name: 'desk is keyless (frozen)', ok: true, detail: '0 access key(s)' }], input, ranAtMs: NOW } }} onRunChecks={() => undefined} />,
    );
    expect(done).toContain('1 of 1 checks passed');
    expect(done).toMatch(/Factory auto-upgrade of the DAO<\/dt><dd class="tone-yes">off/);
  });

  it('puts the proof page in the tabs and counts waiting requests', () => {
    const tabs = tabsFor(snapshot({ desk: { ...snapshot().desk, requests: [{ borrower: 'b', amount: '1', gap: '1', expires_at_ms: NOW + 1_000, expired: false }] } }), NOW);
    expect(tabs.map((t) => t.key)).toEqual(['overview', 'loans', 'requests', 'members', 'desk']);
    expect(tabs.find((t) => t.key === 'requests')?.count).toBe(1);
  });
});
