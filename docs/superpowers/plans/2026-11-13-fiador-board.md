# Fiador Board Implementation Plan

**Goal:** The public, read-only board at `/app/`: treasury, desk, "Waiting for a co-signer", the loan book with Sputnik proposal ids, and members with the repaid loans behind each standing.
**Architecture:** A Vite 8 multi-page React app in `web/` with no backend: a pure data layer (`web/src/board/data.ts`) over the shared RPC client, and structural components (`Board.tsx`) that re-read every 5 seconds. Styling belongs to the Design pass.
**Tech Stack:** React 19.3.1, Vite 8.3.8 (`build.rolldownOptions`), @vitejs/plugin-react 6.3.0, vitest 5.1.0 with `react-dom/server` for markup tests.
**Source spec:** docs/superpowers/specs/2026-11-13-fiador-design.md

Conventions for every task: run every command from the repo root; the executor never runs git; no secrets anywhere (env-var names only). The code below was developed and run before planning: in the combined workspace `tsc` is clean and every vitest suite passes, and `npm run web:check` builds both pages. `[HUMAN GATE]` tasks run in the main checkout (they need the git-ignored `.env`).

---

### Task 61: Web scaffold and the board data layer

**Files:**
- Create: `web/vite.config.ts`
- Create: `web/src/vite-env.d.ts`
- Create: `web/src/deployment.ts`
- Create: `web/src/board/data.ts`
- Test: `web/src/board/data.test.ts`

**Depends on:** Task 41, Task 42
**Effort:** medium
**Requires:** `package.json scripts: seed, seed:check, story, story:check, verify, freeze, visitor, web, web:build, web:preview, web:check (plus react 19.3.1, react-dom 19.3.1, @vitejs/plugin-react 6.3.0, @types/react 19.3.0, @types/react-dom 19.3.0)`, `src/lib/desk.ts: types Lane, LoanStatus, DeskParams, ConfigView, SeatView, MemberView, LoanView, RequestView, AskResult, DeskViewer, DeskSnapshot`, `src/lib/desk.ts: readDesk(viewer: DeskViewer, deskId: string): Promise<DeskSnapshot>`, `src/lib/desk.ts: loansBehindStanding(memberId: string, loans: readonly LoanView[]): LoanView[]`, `src/lib/fixtures/desk.ts: NEAR, DAO, DESK, loan(over), member(over), config(over)`, `src/lib/deployments.ts: interface Deployment { network, rpc, factory, dao, desk, smoke, council, root, seeded_at, explorer }, DEPLOYMENT_PATH, EXPLORER, isDeployment(value: unknown): value is Deployment, accountUrl(deployment, accountId): string`, `src/lib/rpc.ts: class RpcClient { constructor(url?: string, fetchImpl?: FetchLike); view<T>(accountId: string, methodName: string, args?: Record<string, unknown>): Promise<T>; viewAccount(accountId: string): Promise<AccountInfo | null>; accessKeyCount(accountId: string): Promise<number>; status(): Promise<{ protocolVersion: number; chainId: string }> }`, `src/lib/sputnik.ts: parseProposal(value: unknown): ProposalOutput`, `src/lib/sputnik.ts: roleMembers(policy: Policy, roleName: string): string[] | null`, `src/lib/sputnik.ts: FACTORY_ID = 'sputnikv2.testnet', COUNCIL_ROLE = 'council', DESK_ROLE = 'desk', DESK_PERMISSIONS`, `src/lib/units.ts: formatNear(yocto: bigint | string, maxDecimals?: number): string`
**Provides:** `web/vite.config.ts (multi-page: / and /app/), web/src/deployment.ts: loadDeployment(): Deployment | null, REPO_URL`, `web/src/board/data.ts: loadBoard(rpc, deployment, nowMs): Promise<BoardData>, waitingRows, loanRows, memberRows, timeLeft, near`

Context: frontend contract (docs/design/frontend-contract.md): two surfaces, `/` and `/app`; UI code is structural only (semantic markup, routing, state, data) with no colors, fonts, shadows or animation. Vite 8 multi-page build: `build.rolldownOptions.input` (`rollupOptions` is deprecated in Vite 8). The board reads `deployments/testnet.json` at build time through `import.meta.glob` (missing file → the board says it is not seeded) and everything else from public RPC. Strict TypeScript, ESM, `import type` for type-only imports, no `as any`, run every command from the repo root, the executor never runs git.

- [ ] **Step 1: Create the scaffold**

`web/vite.config.ts`:
```ts
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const here = (p: string): string => fileURLToPath(new URL(p, import.meta.url));

/** Two static pages, no server: `/` (landing) and `/app/` (the board). Any static host serves dist/ as-is. */
export default defineConfig({
  root: here('.'),
  plugins: [react()],
  build: {
    outDir: here('../dist'),
    emptyOutDir: true,
    rolldownOptions: {
      input: { main: here('./index.html'), app: here('./app/index.html') },
    },
  },
});
```

`web/src/vite-env.d.ts`:
```ts
/// <reference types="vite/client" />
```

`web/src/deployment.ts`:
```ts
/** The seeded testnet ids, compiled into the build from deployments/testnet.json when it exists. */
import { isDeployment } from '../../src/lib/deployments';
import type { Deployment } from '../../src/lib/deployments';

const found: Record<string, unknown> = import.meta.glob('../../deployments/testnet.json', { eager: true, import: 'default' });

export function loadDeployment(): Deployment | null {
  const value = Object.values(found)[0];
  return isDeployment(value) ? value : null;
}

export const REPO_URL = 'https://github.com/Dotman-Bei/fiador';
```

- [ ] **Step 2: Write the failing test**

`web/src/board/data.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { loan, member, NEAR } from '../../../src/lib/fixtures/desk';
import { loanRows, memberRows, timeLeft, waitingRows } from './data';

const NOW = 1_800_000_000_000;

describe('board data', () => {
  it('formats time left', () => {
    expect(timeLeft(NOW + 125_000, NOW)).toBe('2m 05s');
    expect(timeLeft(NOW - 1, NOW)).toBe('expired');
    expect(timeLeft(0, NOW)).toBe('—');
  });
  it('lists only live requests waiting for a co-signer', () => {
    const rows = waitingRows(
      [
        { borrower: 'ada.root.testnet', amount: (6n * NEAR).toString(), gap: (2n * NEAR).toString(), expires_at_ms: NOW + 60_000, expired: false },
        { borrower: 'old.root.testnet', amount: '1', gap: '1', expires_at_ms: NOW - 1, expired: true },
      ],
      NOW,
    );
    expect(rows).toEqual([{ borrower: 'ada.root.testnet', amount: '6 NEAR', gap: '2 NEAR', timeLeft: '1m 00s' }]);
  });
  it('shows newest loans first with their proposal id and live status', () => {
    const rows = loanRows([loan({ id: 0 }), loan({ id: 1, status: 'Active', due_at_ms: NOW + 30_000 })], { 10: 'Approved', 11: 'Approved' }, NOW);
    expect(rows.map((r) => [r.id, r.status, r.timeLeft, r.proposal])).toEqual([
      [1, 'Active', '0m 30s', '#11 Approved'],
      [0, 'Repaid', '—', '#10 Approved'],
    ]);
    expect(rows[1]?.cosigner).toBe('bayo.root.testnet (2 NEAR)');
  });
  it('names the repaid loans behind every standing', () => {
    const rows = memberRows([member({ account_id: 'ada.root.testnet', standing: (5n * NEAR).toString() })], [loan({ id: 0 }), loan({ id: 1, status: 'Defaulted' })]);
    expect(rows[0]).toMatchObject({ account: 'ada.root.testnet', kind: 'member', standing: '5 NEAR', behind: '#0' });
  });
});
```

- [ ] **Step 3: Run to confirm it fails**

Run: `npx vitest run web/src/board/data.test.ts`
Expected: FAIL — `Failed to resolve import "./data"`

- [ ] **Step 4: Implement**

`web/src/board/data.ts`:
```ts
/** Board data: everything comes from public RPC views (no backend, no indexer). */
import { loansBehindStanding, readDesk } from '../../../src/lib/desk';
import type { DeskSnapshot, LoanView, MemberView, RequestView } from '../../../src/lib/desk';
import type { Deployment } from '../../../src/lib/deployments';
import type { RpcClient } from '../../../src/lib/rpc';
import { DESK_ROLE, parseProposal, roleMembers } from '../../../src/lib/sputnik';
import type { Policy, ProposalStatus } from '../../../src/lib/sputnik';
import { formatNear } from '../../../src/lib/units';

export interface BoardData {
  snapshot: DeskSnapshot;
  treasury: { balance: string; available: string };
  seated: boolean;
  frozen: boolean;
  proposals: Record<number, ProposalStatus>;
  loadedAtMs: number;
}

export async function loadBoard(rpc: RpcClient, deployment: Deployment, nowMs: number): Promise<BoardData> {
  const snapshot = await readDesk(rpc, deployment.desk);
  const dao = await rpc.viewAccount(deployment.dao);
  const available = await rpc.view<string>(deployment.dao, 'get_available_amount');
  const policy = await rpc.view<Policy>(deployment.dao, 'get_policy');
  const seat = roleMembers(policy, DESK_ROLE) ?? [];
  const keys = await rpc.accessKeyCount(deployment.desk);
  const proposals: Record<number, ProposalStatus> = {};
  for (const loan of snapshot.loans) {
    if (loan.proposal_id === null || loan.proposal_id in proposals) continue;
    proposals[loan.proposal_id] = parseProposal(await rpc.view<unknown>(deployment.dao, 'get_proposal', { id: loan.proposal_id })).status;
  }
  return {
    snapshot,
    treasury: { balance: dao?.amount ?? '0', available },
    seated: seat.includes(deployment.desk),
    frozen: keys === 0,
    proposals,
    loadedAtMs: nowMs,
  };
}

export function near(yocto: string): string {
  return `${formatNear(yocto)} NEAR`;
}

/** "2m 05s", "expired" or "—" when there is no deadline. */
export function timeLeft(targetMs: number, nowMs: number): string {
  if (targetMs === 0) return '—';
  const s = Math.floor((targetMs - nowMs) / 1000);
  if (s <= 0) return 'expired';
  return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`;
}

export interface WaitingRow {
  borrower: string;
  amount: string;
  gap: string;
  timeLeft: string;
}

export function waitingRows(requests: readonly RequestView[], nowMs: number): WaitingRow[] {
  return requests
    .filter((r) => !r.expired && r.expires_at_ms > nowMs)
    .map((r) => ({ borrower: r.borrower, amount: near(r.amount), gap: near(r.gap), timeLeft: timeLeft(r.expires_at_ms, nowMs) }));
}

export interface LoanRow {
  id: number;
  lane: string;
  borrower: string;
  cosigner: string;
  amount: string;
  status: string;
  timeLeft: string;
  proposal: string;
}

export function loanRows(loans: readonly LoanView[], proposals: Readonly<Record<number, ProposalStatus>>, nowMs: number): LoanRow[] {
  return [...loans].reverse().map((l) => ({
    id: l.id,
    lane: l.lane,
    borrower: l.borrower,
    cosigner: l.cosigner === null ? '—' : `${l.cosigner} (${near(l.pledge)})`,
    amount: near(l.principal),
    status: l.status,
    timeLeft: l.status === 'Active' ? timeLeft(l.due_at_ms, nowMs) : '—',
    proposal: l.proposal_id === null ? '—' : `#${l.proposal_id} ${proposals[l.proposal_id] ?? '…'}`,
  }));
}

export interface MemberRow {
  account: string;
  kind: string;
  standing: string;
  unused: string;
  drawn: string;
  pledged: string;
  behind: string;
}

export function memberRows(members: readonly MemberView[], loans: readonly LoanView[]): MemberRow[] {
  return members.map((m) => {
    const behind = loansBehindStanding(m.account_id, loans).map((l) => `#${l.id}`);
    return {
      account: m.account_id,
      kind: m.visitor === null ? 'member' : 'visitor',
      standing: near(m.standing),
      unused: near(m.unused),
      drawn: near(m.drawn),
      pledged: near(m.pledged),
      behind: behind.length === 0 ? '—' : behind.join(', '),
    };
  });
}
```

- [ ] **Step 5: Run the gate**

Run: `npx vitest run web/src/board/data.test.ts`
Expected: PASS — `Tests  4 passed (4)`

- [ ] **Step 6: Commit (kernel-performed — no agent runs this)**
Message: `feat(web): scaffold and board data layer`

---

### Task 62: Board components and the /app page

**Files:**
- Create: `web/app/index.html`
- Create: `web/src/board/Board.tsx`
- Create: `web/src/board/main.tsx`
- Test: `web/src/board/board.test.tsx`

**Depends on:** Task 61
**Effort:** medium
**Requires:** `web/vite.config.ts (multi-page: / and /app/), web/src/deployment.ts: loadDeployment(): Deployment | null, REPO_URL`, `web/src/board/data.ts: loadBoard(rpc, deployment, nowMs): Promise<BoardData>, waitingRows, loanRows, memberRows, timeLeft, near`, `src/lib/deployments.ts: interface Deployment { network, rpc, factory, dao, desk, smoke, council, root, seeded_at, explorer }, DEPLOYMENT_PATH, EXPLORER, isDeployment(value: unknown): value is Deployment, accountUrl(deployment, accountId): string`, `src/lib/fixtures/desk.ts: NEAR, DAO, DESK, loan(over), member(over), config(over)`
**Provides:** `web/src/board/Board.tsx: Board({ deployment }), BoardView, WaitingTable, LoanBook, MembersTable; /app/ page (web/app/index.html + web/src/board/main.tsx)`

Context: spec §8 and the user's request-row rule: each open request shows as a "Waiting for a co-signer" row with borrower, amount, gap and time left; every loan row carries its Sputnik proposal id and the proposal's live status; members show standing with the repaid loans behind each point. From Task 61, `web/src/board/data.ts` exports `loadBoard(rpc, deployment, nowMs)`, `waitingRows`, `loanRows`, `memberRows`, `near`, and the types `BoardData`, `WaitingRow`, `LoanRow`, `MemberRow`. Structural markup only. Strict TypeScript, ESM, `import type` for type-only imports, no `as any`, run every command from the repo root, the executor never runs git.

- [ ] **Step 1: Write the failing test**

`web/src/board/board.test.tsx`:
```tsx
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { Deployment } from '../../../src/lib/deployments';
import { config, loan, member, NEAR } from '../../../src/lib/fixtures/desk';
import { Board, BoardView, LoanBook, WaitingTable } from './Board';
import type { BoardData } from './data';

const DEPLOYMENT: Deployment = {
  network: 'testnet',
  rpc: 'https://rpc.testnet.fastnear.com',
  factory: 'sputnikv2.testnet',
  dao: 'fiador.sputnikv2.testnet',
  desk: 'desk.root.testnet',
  smoke: 'smoke.root.testnet',
  council: ['c1', 'c2', 'c3'],
  root: 'root.testnet',
  seeded_at: '2026-11-14T08:00:00.000Z',
  explorer: 'https://testnet.nearblocks.io',
};
const NOW = 1_800_000_000_000;

describe('board markup', () => {
  it('renders the five blocks with proposal ids', () => {
    const data: BoardData = {
      snapshot: { config: config({ book: (6n * NEAR).toString() }), members: [member({ account_id: 'ada.root.testnet' })], loans: [loan({ id: 0 })], requests: [] },
      treasury: { balance: (12n * NEAR).toString(), available: (6n * NEAR).toString() },
      seated: true,
      frozen: true,
      proposals: { 10: 'Approved' },
      loadedAtMs: NOW,
    };
    const html = renderToStaticMarkup(<BoardView deployment={DEPLOYMENT} data={data} nowMs={NOW} />);
    for (const heading of ['Treasury', 'Desk', 'Waiting for a co-signer', 'Loan book', 'Members']) expect(html).toContain(`>${heading}</h2>`);
    expect(html).toContain('#10 Approved');
    expect(html).toContain('https://testnet.nearblocks.io/address/fiador.sputnikv2.testnet');
    expect(html).toContain('yes: no access keys, so no admin and no upgrade');
  });
  it('says so when nothing is waiting or there are no loans', () => {
    expect(renderToStaticMarkup(<WaitingTable rows={[]} />)).toContain('No request is waiting for a co-signer.');
    expect(renderToStaticMarkup(<LoanBook rows={[]} />)).toContain('No loans yet.');
  });
  it('explains an unseeded build', () => {
    expect(renderToStaticMarkup(<Board deployment={null} />)).toContain('has not been seeded in this build');
  });
});
```

- [ ] **Step 2: Run to confirm it fails**

Run: `npx vitest run web/src/board/board.test.tsx`
Expected: FAIL — `Failed to resolve import "./Board"`

- [ ] **Step 3: Implement**

`web/src/board/Board.tsx`:
```tsx
/** /app — the public read-only board. Structural markup only: the Design pass styles it from docs/design/direction.md. */
import { useEffect, useState } from 'react';
import type { Deployment } from '../../../src/lib/deployments';
import { accountUrl } from '../../../src/lib/deployments';
import { RpcClient } from '../../../src/lib/rpc';
import { loadBoard, loanRows, memberRows, near, waitingRows } from './data';
import type { BoardData, LoanRow, MemberRow, WaitingRow } from './data';

const POLL_MS = 5_000;

export function WaitingTable({ rows }: { rows: readonly WaitingRow[] }) {
  return (
    <section aria-labelledby="waiting">
      <h2 id="waiting">Waiting for a co-signer</h2>
      {rows.length === 0 ? (
        <p>No request is waiting for a co-signer.</p>
      ) : (
        <table>
          <thead>
            <tr><th>Borrower</th><th>Amount</th><th>Gap to co-sign</th><th>Time left</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.borrower}><td>{r.borrower}</td><td>{r.amount}</td><td>{r.gap}</td><td>{r.timeLeft}</td></tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

export function LoanBook({ rows }: { rows: readonly LoanRow[] }) {
  return (
    <section aria-labelledby="book">
      <h2 id="book">Loan book</h2>
      {rows.length === 0 ? (
        <p>No loans yet.</p>
      ) : (
        <table>
          <thead>
            <tr><th>Loan</th><th>Lane</th><th>Borrower</th><th>Co-signer</th><th>Amount</th><th>Status</th><th>Time left</th><th>Sputnik proposal</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>#{r.id}</td><td>{r.lane}</td><td>{r.borrower}</td><td>{r.cosigner}</td><td>{r.amount}</td><td>{r.status}</td><td>{r.timeLeft}</td><td>{r.proposal}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

export function MembersTable({ rows }: { rows: readonly MemberRow[] }) {
  return (
    <section aria-labelledby="members">
      <h2 id="members">Members</h2>
      {rows.length === 0 ? (
        <p>No members yet.</p>
      ) : (
        <table>
          <thead>
            <tr><th>Account</th><th>Kind</th><th>Standing</th><th>Unused</th><th>Drawn</th><th>Pledged</th><th>Repaid loans behind the standing</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.account}>
                <td>{r.account}</td><td>{r.kind}</td><td>{r.standing}</td><td>{r.unused}</td><td>{r.drawn}</td><td>{r.pledged}</td><td>{r.behind}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

export function BoardView({ deployment, data, nowMs }: { deployment: Deployment; data: BoardData; nowMs: number }) {
  const p = data.snapshot.config.params;
  return (
    <main>
      <header>
        <h1>Fiador board</h1>
        <p>
          Live, read-only view of the demo credit union on NEAR testnet. DAO <a href={accountUrl(deployment, deployment.dao)}>{deployment.dao}</a>, desk{' '}
          <a href={accountUrl(deployment, deployment.desk)}>{deployment.desk}</a>.
        </p>
      </header>
      <section aria-labelledby="treasury">
        <h2 id="treasury">Treasury</h2>
        <dl>
          <dt>Balance</dt><dd>{near(data.treasury.balance)}</dd>
          <dt>Available to lend</dt><dd>{near(data.treasury.available)}</dd>
          <dt>Out on loan (book)</dt><dd>{near(data.snapshot.config.book)} of {near(p.book_cap)} cap</dd>
        </dl>
      </section>
      <section aria-labelledby="desk">
        <h2 id="desk">Desk</h2>
        <dl>
          <dt>Seated in the DAO policy</dt><dd>{data.seated ? 'yes' : 'no (unseated by the council)'}</dd>
          <dt>Keyless (frozen)</dt><dd>{data.frozen ? 'yes: no access keys, so no admin and no upgrade' : 'not yet'}</dd>
          <dt>Starter standing</dt><dd>{near(p.starter_standing)}</dd>
          <dt>Maximum standing</dt><dd>{near(p.max_standing)}</dd>
          <dt>Growth per on-time repayment</dt><dd>up to {near(p.growth_step)}</dd>
          <dt>Loan term / grace</dt><dd>{p.loan_term_sec} s / {p.grace_sec} s</dd>
        </dl>
      </section>
      <WaitingTable rows={waitingRows(data.snapshot.requests, nowMs)} />
      <LoanBook rows={loanRows(data.snapshot.loans, data.proposals, nowMs)} />
      <MembersTable rows={memberRows(data.snapshot.members, data.snapshot.loans)} />
      <footer>
        <p>Last read {new Date(data.loadedAtMs).toISOString()} from {deployment.rpc}. Re-reads every 5 seconds.</p>
      </footer>
    </main>
  );
}

export function Board({ deployment }: { deployment: Deployment | null }) {
  const [data, setData] = useState<BoardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  useEffect(() => {
    if (deployment === null) return undefined;
    const rpc = new RpcClient(deployment.rpc);
    let alive = true;
    const tick = (): void => {
      const now = Date.now();
      loadBoard(rpc, deployment, now)
        .then((d) => {
          if (alive) {
            setData(d);
            setError(null);
            setNowMs(now);
          }
        })
        .catch((e: unknown) => {
          if (alive) setError(e instanceof Error ? e.message : String(e));
        });
    };
    tick();
    const id = setInterval(tick, POLL_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [deployment]);

  if (deployment === null) {
    return (
      <main>
        <h1>Fiador board</h1>
        <p>The demo DAO has not been seeded in this build (deployments/testnet.json is missing).</p>
      </main>
    );
  }
  if (data === null) {
    return (
      <main>
        <h1>Fiador board</h1>
        <p>{error === null ? 'Reading the DAO and the desk from public RPC…' : `Could not read testnet: ${error}`}</p>
      </main>
    );
  }
  return <BoardView deployment={deployment} data={data} nowMs={nowMs} />;
}
```

`web/src/board/main.tsx`:
```tsx
import { createRoot } from 'react-dom/client';
import { loadDeployment } from '../deployment';
import { Board } from './Board';

const el = document.getElementById('root');
if (el !== null) createRoot(el).render(<Board deployment={loadDeployment()} />);
```

`web/app/index.html`:
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Fiador board</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="../src/board/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 4: Run the gate**

Run: `npx vitest run web/src/board/board.test.tsx`
Expected: PASS — `Tests  3 passed (3)`

- [ ] **Step 5: Commit (kernel-performed — no agent runs this)**
Message: `feat(web): the /app board`

---
