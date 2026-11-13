# Fiador Chain Scripts Implementation Plan

**Goal:** Seed the demo DAO, run the builder's story, check everything read-only with `verify`, and freeze the desk, all from TypeScript against the live testnet contracts.
**Architecture:** One shared, browser-safe layer in `src/lib/` (`desk.ts` mirrors the contract JSON; `deployments.ts`; `verify.ts` holds the pure spec §7 checks) and Node CLIs in `scripts/` built on the smoke slice's helpers (`near.ts`, `council.ts`, `records.ts`). Live runs happen only in the three human-gated tasks (pauses 2 and 3); everything else is checked offline by `tsc` and vitest.
**Tech Stack:** Node >= 22.22.2, near-api-js 7.5.3, tsx 4.23.15, typescript 5.9.3, vitest 5.1.0; React 19.3.1, react-dom 19.3.1, @vitejs/plugin-react 6.3.0 and Vite 8.3.8 are installed here for the web plans.
**Source spec:** docs/superpowers/specs/2026-11-13-fiador-design.md

Conventions for every task: run every command from the repo root; the executor never runs git; no secrets anywhere (env-var names only). The code below was developed and run before planning: in the combined workspace `tsc` is clean and every vitest suite passes, and `npm run web:check` builds both pages. `[HUMAN GATE]` tasks run in the main checkout (they need the git-ignored `.env`).

---

### Task 41: Remaining npm scripts and dependencies; the desk TypeScript mirror

**Files:**
- Modify: `package.json`
- Create: `src/lib/desk.ts`
- Create: `src/lib/fixtures/desk.ts`
- Test: `src/lib/desk.test.ts`

**Depends on:** Task 1, Task 10, Task 21
**Effort:** medium
**Requires:** `contract/desk JSON: Params { starter_standing: U128, max_standing: U128, growth_step: U128, book_cap: U128, loan_term_sec: u64, grace_sec: u64, request_ttl_sec: u64, visitor_slots: u32, visitor_starter: U128, visitor_window_sec: u64, visitor_deposit: U128, proposal_bond: U128 }`, `contract/desk JSON: ConfigView { dao: string, params: Params, book: U128, member_count: u32, loan_count: u64, request_count: u32 }`, `contract/desk JSON: Lane = "Standing" | "Cosigned" | "Council"; LoanStatus = "Filing" | "Voting" | "AwaitingCouncil" | "Active" | "Repaid" | "RepaidLate" | "Defaulted" | "Refused" | "NotFunded" | "Voided"`, `contract/desk JSON: AskResult = { "Held": { gap: U128, expires_at_ms: u64 } } | { "Loan": { loan_id: u64, status: LoanStatus, proposal_id: u64 | null } }`, `contract/desk JSON: MemberView { account_id: string, standing: U128, drawn: U128, pledged: U128, unused: U128, open_loans: u32, visitor: SeatView | null, repaid_on_time: u32, defaults: u32 }; SeatView { joined_at_ms: u64, expires_at_ms: u64, deposit: U128, loans_taken: u32 }`, `contract/desk JSON: LoanView { id: u64, borrower: string, principal: U128, borrower_part: U128, cosigner: string | null, pledge: U128, lane: Lane, status: LoanStatus, proposal_id: u64 | null, created_at_ms: u64, due_at_ms: u64, closed_at_ms: u64 }`, `contract/desk JSON: RequestView { borrower: string, amount: U128, gap: U128, expires_at_ms: u64, expired: bool }`
**Provides:** `package.json scripts: seed, seed:check, story, story:check, verify, freeze, visitor, web, web:build, web:preview, web:check (plus react 19.3.1, react-dom 19.3.1, @vitejs/plugin-react 6.3.0, @types/react 19.3.0, @types/react-dom 19.3.0)`, `src/lib/desk.ts: types Lane, LoanStatus, DeskParams, ConfigView, SeatView, MemberView, LoanView, RequestView, AskResult, DeskViewer, DeskSnapshot`, `src/lib/desk.ts: DEMO_PARAMS: DeskParams (spec §6 demo values)`, `src/lib/desk.ts: readDesk(viewer: DeskViewer, deskId: string): Promise<DeskSnapshot>`, `src/lib/desk.ts: holdsReservation(loan: LoanView): boolean`, `src/lib/desk.ts: loansBehindStanding(memberId: string, loans: readonly LoanView[]): LoanView[]`, `src/lib/desk.ts: isHeld(result: AskResult): result is { Held: { gap: string; expires_at_ms: number } }`, `src/lib/fixtures/desk.ts: NEAR, DAO, DESK, loan(over), member(over), config(over)`

Context: the desk contract's JSON (contract/desk/src/types.rs, Task 21) is mirrored exactly in TypeScript: amounts are yocto strings (U128), times are milliseconds, `Lane` and `LoanStatus` are string enums, and `AskResult` is `{"Held":{gap,expires_at_ms}}` or `{"Loan":{loan_id,status,proposal_id}}`. Paginated views take `from_index` and `limit` (capped at 100). This task also writes the whole remaining `package.json` (every later npm script and the web dependencies) so no other task edits it except the wallet task (Task 93). Strict TypeScript, ESM, `import type` for type-only imports, no `as any`, run every command from the repo root, the executor never runs git.

- [ ] **Step 1: Replace `package.json` with this content, then install**

`package.json`:
```json
{
  "name": "fiador",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "engines": {
    "node": ">=22.22.2"
  },
  "scripts": {
    "cargo": "tsx tools/cargo.ts",
    "wasm": "tsx tools/wasm-build.ts",
    "wasm:check": "tsx tools/wasm-check.ts",
    "root": "tsx scripts/root.ts",
    "smoke": "tsx scripts/smoke.ts",
    "smoke:check": "tsx scripts/smoke-check.ts",
    "seed": "tsx scripts/seed.ts",
    "seed:check": "tsx scripts/seed-check.ts",
    "story": "tsx scripts/story.ts",
    "story:check": "tsx scripts/story-check.ts",
    "verify": "tsx scripts/verify.ts",
    "freeze": "tsx scripts/freeze.ts",
    "visitor": "tsx scripts/visitor.ts",
    "web": "vite --config web/vite.config.ts",
    "web:build": "vite build --config web/vite.config.ts",
    "web:preview": "vite preview --config web/vite.config.ts",
    "web:check": "vitest run web && vite build --config web/vite.config.ts",
    "typecheck": "tsc -p tsconfig.json",
    "test": "vitest run",
    "check": "tsc -p tsconfig.json && vitest run"
  },
  "dependencies": {
    "near-api-js": "7.5.3",
    "react": "19.3.1",
    "react-dom": "19.3.1"
  },
  "devDependencies": {
    "@types/node": "22.20.5",
    "@types/react": "19.3.0",
    "@types/react-dom": "19.3.0",
    "@vitejs/plugin-react": "6.3.0",
    "tsx": "4.23.15",
    "typescript": "5.9.3",
    "vite": "8.3.8",
    "vitest": "5.1.0"
  }
}
```

- [ ] **Step 2: Run**

Run: `npm install`
Expected: exits 0 (updates `package-lock.json`)

- [ ] **Step 3: Write the failing test and its fixtures**

`src/lib/fixtures/desk.ts`:
```ts
import type { ConfigView, LoanView, MemberView } from '../desk';
import { DEMO_PARAMS } from '../desk';

export const NEAR = 10n ** 24n;
export const DAO = 'fiador.sputnikv2.testnet';
export const DESK = 'desk.root.testnet';

export function loan(over: Partial<LoanView> & { id: number }): LoanView {
  return {
    borrower: 'ada.root.testnet',
    principal: (6n * NEAR).toString(),
    borrower_part: (4n * NEAR).toString(),
    cosigner: 'bayo.root.testnet',
    pledge: (2n * NEAR).toString(),
    lane: 'Cosigned',
    status: 'Repaid',
    proposal_id: over.id + 10,
    created_at_ms: 1_800_000_000_000,
    due_at_ms: 1_800_000_120_000,
    closed_at_ms: 1_800_000_060_000,
    ...over,
  };
}

export function member(over: Partial<MemberView> & { account_id: string }): MemberView {
  return {
    standing: (4n * NEAR).toString(),
    drawn: '0',
    pledged: '0',
    unused: (4n * NEAR).toString(),
    open_loans: 0,
    visitor: null,
    repaid_on_time: 0,
    defaults: 0,
    ...over,
  };
}

export function config(over: Partial<ConfigView> = {}): ConfigView {
  return { dao: DAO, params: DEMO_PARAMS, book: '0', member_count: 2, loan_count: 1, request_count: 0, ...over };
}
```

`src/lib/desk.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { DEMO_PARAMS, holdsReservation, isHeld, isOpen, loansBehindStanding, readDesk } from './desk';
import type { DeskViewer, LoanView } from './desk';
import { loan, member } from './fixtures/desk';

describe('desk helpers', () => {
  it('uses the spec §6 demo parameters', () => {
    expect(DEMO_PARAMS).toMatchObject({
      starter_standing: '4000000000000000000000000',
      max_standing: '10000000000000000000000000',
      book_cap: '12000000000000000000000000',
      loan_term_sec: 120,
      grace_sec: 60,
      request_ttl_sec: 600,
      visitor_slots: 10,
      visitor_deposit: '50000000000000000000000',
      proposal_bond: '0',
    });
  });

  it('mirrors the contract reservation rule', () => {
    expect(holdsReservation(loan({ id: 0, status: 'Active' }))).toBe(true);
    expect(holdsReservation(loan({ id: 0, status: 'Voting' }))).toBe(true);
    expect(holdsReservation(loan({ id: 0, status: 'Repaid' }))).toBe(false);
    expect(holdsReservation(loan({ id: 0, lane: 'Council', status: 'AwaitingCouncil' }))).toBe(false);
    expect(holdsReservation(loan({ id: 0, lane: 'Council', status: 'Active' }))).toBe(true);
    expect(isOpen('AwaitingCouncil')).toBe(true);
    expect(isOpen('Voided')).toBe(false);
  });

  it('finds the repaid loans behind a standing, as borrower or pledging co-signer', () => {
    const loans: LoanView[] = [
      loan({ id: 0 }),
      loan({ id: 1, status: 'Defaulted' }),
      loan({ id: 2, borrower: 'chidi.root.testnet', cosigner: 'ada.root.testnet' }),
      loan({ id: 3, borrower: 'chidi.root.testnet', cosigner: 'ada.root.testnet', pledge: '0' }),
    ];
    expect(loansBehindStanding('ada.root.testnet', loans).map((l) => l.id)).toEqual([0, 2]);
    expect(loansBehindStanding('bayo.root.testnet', loans).map((l) => l.id)).toEqual([0]);
  });

  it('tells a held request from a loan', () => {
    expect(isHeld({ Held: { gap: '2', expires_at_ms: 1 } })).toBe(true);
    expect(isHeld({ Loan: { loan_id: 1, status: 'Active', proposal_id: 3 } })).toBe(false);
  });

  it('reads every page of every view', async () => {
    const calls: string[] = [];
    const many = Array.from({ length: 100 }, (_, i) => loan({ id: i }));
    const viewer: DeskViewer = {
      view: async <T,>(_desk: string, method: string, args?: Record<string, unknown>): Promise<T> => {
        calls.push(`${method}:${String(args?.['from_index'] ?? '-')}`);
        if (method === 'get_config') return { dao: 'd' } as unknown as T;
        if (method === 'get_loans') return (args?.['from_index'] === 0 ? many : [loan({ id: 100 })]) as unknown as T;
        if (method === 'get_members') return [member({ account_id: 'ada.root.testnet' })] as unknown as T;
        return [] as unknown as T;
      },
    };
    const snap = await readDesk(viewer, 'desk.root.testnet');
    expect(snap.loans).toHaveLength(101);
    expect(snap.members).toHaveLength(1);
    expect(calls).toEqual(['get_config:-', 'get_members:0', 'get_loans:0', 'get_loans:100', 'get_requests:0']);
  });
});
```

- [ ] **Step 4: Run to confirm it fails**

Run: `npx vitest run src/lib/desk.test.ts`
Expected: FAIL — `Failed to resolve import "./desk"`

- [ ] **Step 5: Implement**

`src/lib/desk.ts`:
```ts
/** TypeScript mirror of the desk contract's JSON (contract/desk/src/types.rs). Amounts are yocto strings (U128). */
export type Lane = 'Standing' | 'Cosigned' | 'Council';
export type LoanStatus =
  | 'Filing'
  | 'Voting'
  | 'AwaitingCouncil'
  | 'Active'
  | 'Repaid'
  | 'RepaidLate'
  | 'Defaulted'
  | 'Refused'
  | 'NotFunded'
  | 'Voided';

export interface DeskParams {
  starter_standing: string;
  max_standing: string;
  growth_step: string;
  book_cap: string;
  loan_term_sec: number;
  grace_sec: number;
  request_ttl_sec: number;
  visitor_slots: number;
  visitor_starter: string;
  visitor_window_sec: number;
  visitor_deposit: string;
  proposal_bond: string;
}

export interface ConfigView {
  dao: string;
  params: DeskParams;
  book: string;
  member_count: number;
  loan_count: number;
  request_count: number;
}

export interface SeatView {
  joined_at_ms: number;
  expires_at_ms: number;
  deposit: string;
  loans_taken: number;
}

export interface MemberView {
  account_id: string;
  standing: string;
  drawn: string;
  pledged: string;
  unused: string;
  open_loans: number;
  visitor: SeatView | null;
  repaid_on_time: number;
  defaults: number;
}

export interface LoanView {
  id: number;
  borrower: string;
  principal: string;
  borrower_part: string;
  cosigner: string | null;
  pledge: string;
  lane: Lane;
  status: LoanStatus;
  proposal_id: number | null;
  created_at_ms: number;
  due_at_ms: number;
  closed_at_ms: number;
}

export interface RequestView {
  borrower: string;
  amount: string;
  gap: string;
  expires_at_ms: number;
  expired: boolean;
}

export type AskResult =
  | { Held: { gap: string; expires_at_ms: number } }
  | { Loan: { loan_id: number; status: LoanStatus; proposal_id: number | null } };

export interface DeskViewer {
  view<T>(accountId: string, methodName: string, args?: Record<string, unknown>): Promise<T>;
}

export interface DeskSnapshot {
  config: ConfigView;
  members: MemberView[];
  loans: LoanView[];
  requests: RequestView[];
}

const NEAR = 10n ** 24n;
const PAGE = 100;

/** Demo DAO parameters (spec §6). */
export const DEMO_PARAMS: DeskParams = {
  starter_standing: (4n * NEAR).toString(),
  max_standing: (10n * NEAR).toString(),
  growth_step: NEAR.toString(),
  book_cap: (12n * NEAR).toString(),
  loan_term_sec: 120,
  grace_sec: 60,
  request_ttl_sec: 600,
  visitor_slots: 10,
  visitor_starter: (NEAR / 10n).toString(),
  visitor_window_sec: 1800,
  visitor_deposit: (NEAR / 20n).toString(),
  proposal_bond: '0',
};

export const OPEN_STATUSES: readonly LoanStatus[] = ['Filing', 'Voting', 'AwaitingCouncil', 'Active'];

export function isOpen(status: LoanStatus): boolean {
  return OPEN_STATUSES.includes(status);
}

/** Mirrors Desk::holds_reservation: which loans count toward `book`, `drawn` and `pledged`. */
export function holdsReservation(loan: LoanView): boolean {
  if (loan.lane === 'Council') return loan.status === 'Active';
  return loan.status === 'Filing' || loan.status === 'Voting' || loan.status === 'Active';
}

async function paged<T>(read: (from: number, limit: number) => Promise<T[]>): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const page = await read(from, PAGE);
    out.push(...page);
    if (page.length < PAGE) return out;
  }
}

/** Reads the whole desk through its paginated views (no indexer). */
export async function readDesk(viewer: DeskViewer, deskId: string): Promise<DeskSnapshot> {
  const config = await viewer.view<ConfigView>(deskId, 'get_config');
  const members = await paged((from, limit) => viewer.view<MemberView[]>(deskId, 'get_members', { from_index: from, limit }));
  const loans = await paged((from, limit) => viewer.view<LoanView[]>(deskId, 'get_loans', { from_index: from, limit }));
  const requests = await paged((from, limit) => viewer.view<RequestView[]>(deskId, 'get_requests', { from_index: from, limit }));
  return { config, members, loans, requests };
}

/** The repaid loans behind a member's standing: every on-time repayment they borrowed or co-signed. */
export function loansBehindStanding(memberId: string, loans: readonly LoanView[]): LoanView[] {
  return loans.filter((l) => l.status === 'Repaid' && (l.borrower === memberId || (l.cosigner === memberId && BigInt(l.pledge) > 0n)));
}

export function isHeld(result: AskResult): result is { Held: { gap: string; expires_at_ms: number } } {
  return 'Held' in result;
}
```

- [ ] **Step 6: Run the gate**

Run: `npx vitest run src/lib/desk.test.ts`
Expected: PASS — `Tests  5 passed (5)`

- [ ] **Step 7: Commit (kernel-performed — no agent runs this)**
Message: `feat(lib): desk TypeScript mirror and remaining npm scripts`

---

### Task 42: The deployment record and the read-only verify checks

**Files:**
- Create: `src/lib/deployments.ts`
- Create: `src/lib/verify.ts`
- Test: `src/lib/verify.test.ts`

**Depends on:** Task 41, Task 4
**Effort:** high
**Model tier:** top
**Requires:** `src/lib/desk.ts: types Lane, LoanStatus, DeskParams, ConfigView, SeatView, MemberView, LoanView, RequestView, AskResult, DeskViewer, DeskSnapshot`, `src/lib/desk.ts: holdsReservation(loan: LoanView): boolean`, `src/lib/fixtures/desk.ts: NEAR, DAO, DESK, loan(over), member(over), config(over)`, `src/lib/sputnik.ts: FACTORY_ID = 'sputnikv2.testnet', COUNCIL_ROLE = 'council', DESK_ROLE = 'desk', DESK_PERMISSIONS`, `src/lib/sputnik.ts: types Policy, RolePermission, VotePolicy, RoleKind, ProposalKindInput, TransferKind, FunctionCallKind, FunctionCallSpec, AddMemberKind, RemoveMemberKind, FactoryInfoUpdateKind, ProposalOutput, ProposalStatus, VoteAction`, `src/lib/sputnik.ts: buildFiadorPolicy(input: { council: readonly string[]; deskSeat: readonly string[] }): Policy`, `src/lib/sputnik.ts: isTransferKind(kind: unknown): kind is TransferKind`, `src/lib/sputnik.ts: roleMembers(policy: Policy, roleName: string): string[] | null`
**Provides:** `src/lib/deployments.ts: interface Deployment { network, rpc, factory, dao, desk, smoke, council, root, seeded_at, explorer }, DEPLOYMENT_PATH, EXPLORER, isDeployment(value: unknown): value is Deployment, accountUrl(deployment, accountId): string`, `src/lib/verify.ts: runChecks(input: VerifyInput): Check[], KEYLESS_CHECK, allowedProposalStatuses(status: LoanStatus)`

Context: spec §7 lists every check. From Task 4, `src/lib/sputnik.ts` exports `COUNCIL_ROLE = 'council'`, `DESK_ROLE = 'desk'`, `DESK_PERMISSIONS = ['transfer:AddProposal','transfer:VoteApprove']`, `buildFiadorPolicy({ council, deskSeat })`, `isTransferKind(kind)`, `roleMembers(policy, roleName): string[] | null` and the types `Policy`, `ProposalOutput`, `ProposalStatus`. From Task 41, `src/lib/desk.ts` exports `holdsReservation(loan)` (Standing/Cosigned loans in Filing/Voting/Active and Council loans in Active hold book, drawn and pledge) and the view types; `src/lib/fixtures/desk.ts` exports `loan()`, `member()`, `config()`, `NEAR`, `DAO`, `DESK`. Strict TypeScript, ESM, `import type` for type-only imports, no `as any`, run every command from the repo root, the executor never runs git.

- [ ] **Step 1: Write the failing test**

`src/lib/verify.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { isDeployment } from './deployments';
import type { Deployment } from './deployments';
import { buildFiadorPolicy } from './sputnik';
import type { ProposalOutput } from './sputnik';
import { allowedProposalStatuses, KEYLESS_CHECK, runChecks } from './verify';
import type { VerifyInput } from './verify';
import { config, DAO, DESK, loan, member, NEAR } from './fixtures/desk';

const DEPLOYMENT: Deployment = {
  network: 'testnet',
  rpc: 'https://rpc.testnet.fastnear.com',
  factory: 'sputnikv2.testnet',
  dao: DAO,
  desk: DESK,
  smoke: 'smoke.root.testnet',
  council: ['council-1.root.testnet', 'council-2.root.testnet', 'council-3.root.testnet'],
  root: 'root.testnet',
  seeded_at: '2026-11-14T08:00:00.000Z',
  explorer: 'https://testnet.nearblocks.io',
};

function proposal(id: number, status: ProposalOutput['status'], receiver = 'ada.root.testnet', amount = (6n * NEAR).toString()): ProposalOutput {
  return { id, proposer: DESK, description: 'd', kind: { Transfer: { token_id: '', receiver_id: receiver, amount, msg: null } }, status, vote_counts: {}, votes: {}, submission_time: '1' };
}

function healthy(): VerifyInput {
  const active = loan({ id: 1, status: 'Active', borrower: 'chidi.root.testnet', principal: (2n * NEAR).toString(), borrower_part: (1n * NEAR).toString(), cosigner: 'ada.root.testnet', pledge: (1n * NEAR).toString() });
  return {
    deployment: DEPLOYMENT,
    factoryInfo: { factory_id: 'sputnikv2.testnet', auto_update: false },
    policy: buildFiadorPolicy({ council: DEPLOYMENT.council, deskSeat: [DESK] }),
    config: config({ book: (2n * NEAR).toString() }),
    deskKeyCount: 0,
    members: [
      member({ account_id: 'ada.root.testnet', pledged: (1n * NEAR).toString() }),
      member({ account_id: 'chidi.root.testnet', drawn: (1n * NEAR).toString() }),
    ],
    loans: [loan({ id: 0 }), active, loan({ id: 2, status: 'Refused', proposal_id: null })],
    proposals: new Map([
      [10, proposal(10, 'Approved')],
      [11, proposal(11, 'Approved', 'chidi.root.testnet', (2n * NEAR).toString())],
    ]),
  };
}

const failing = (input: VerifyInput): string[] => runChecks(input).filter((c) => !c.ok).map((c) => c.name);

describe('runChecks', () => {
  it('passes a healthy, frozen desk', () => {
    expect(failing(healthy())).toEqual([]);
  });
  it('fails while the desk still has a key', () => {
    expect(failing({ ...healthy(), deskKeyCount: 1 })).toEqual([KEYLESS_CHECK]);
  });
  it('fails when the factory may still upgrade the DAO', () => {
    expect(failing({ ...healthy(), factoryInfo: { factory_id: 'sputnikv2.testnet', auto_update: true } })).toEqual(['factory auto-upgrade is off']);
  });
  it('fails when the seat holds someone else or extra permissions', () => {
    const smokeSeated = { ...healthy(), policy: buildFiadorPolicy({ council: DEPLOYMENT.council, deskSeat: [DESK, 'smoke.root.testnet'] }) };
    expect(failing(smokeSeated)).toContain('desk seat holds only the desk, with transfer:AddProposal and transfer:VoteApprove only');
  });
  it('fails a loan whose proposal pays someone else or reads the wrong status', () => {
    const input = healthy();
    input.proposals.set(10, proposal(10, 'Approved', 'eve.testnet'));
    input.proposals.set(11, proposal(11, 'Failed', 'chidi.root.testnet', (2n * NEAR).toString()));
    expect(failing(input)).toEqual(['loan #0 (Repaid) matches its Sputnik proposal', 'loan #1 (Active) matches its Sputnik proposal']);
  });
  it('fails a broken book or member invariant', () => {
    expect(failing({ ...healthy(), config: config({ book: '0' }) })).toEqual(['book equals the open principal']);
    const input = healthy();
    input.members[0] = member({ account_id: 'ada.root.testnet' });
    expect(failing(input)).toEqual(['ada.root.testnet drawn and pledged match open loans']);
  });
  it('maps loan statuses to the Sputnik statuses they allow', () => {
    expect(allowedProposalStatuses('Voided')).toEqual(['Failed']);
    expect(allowedProposalStatuses('Refused')).toBeNull();
    expect(allowedProposalStatuses('AwaitingCouncil')).toEqual(['InProgress', 'Approved']);
  });
  it('validates a deployment record', () => {
    expect(isDeployment(DEPLOYMENT)).toBe(true);
    expect(isDeployment({ ...DEPLOYMENT, council: [1] })).toBe(false);
  });
});
```

- [ ] **Step 2: Run to confirm it fails**

Run: `npx vitest run src/lib/verify.test.ts`
Expected: FAIL — `Failed to resolve import "./deployments"`

- [ ] **Step 3: Implement**

`src/lib/deployments.ts`:
```ts
/** The public ids `seed` writes to deployments/testnet.json. No secrets: account ids are public identifiers. */
export interface Deployment {
  network: 'testnet';
  rpc: string;
  factory: string;
  dao: string;
  desk: string;
  smoke: string;
  council: string[];
  root: string;
  seeded_at: string;
  explorer: string;
}

export const DEPLOYMENT_PATH = 'deployments/testnet.json';
export const EXPLORER = 'https://testnet.nearblocks.io';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function isDeployment(value: unknown): value is Deployment {
  if (!isRecord(value)) return false;
  const council = value['council'];
  return (
    value['network'] === 'testnet' &&
    ['rpc', 'factory', 'dao', 'desk', 'smoke', 'root', 'seeded_at', 'explorer'].every((k) => typeof value[k] === 'string') &&
    Array.isArray(council) &&
    council.every((c) => typeof c === 'string')
  );
}

export function accountUrl(deployment: Pick<Deployment, 'explorer'>, accountId: string): string {
  return `${deployment.explorer}/address/${accountId}`;
}
```

`src/lib/verify.ts`:
```ts
/** spec §7: every read-only check `npm run verify` makes. Pure, so it is unit-tested against fixtures. */
import { holdsReservation } from './desk';
import type { ConfigView, LoanStatus, LoanView, MemberView } from './desk';
import type { Deployment } from './deployments';
import { COUNCIL_ROLE, DESK_PERMISSIONS, DESK_ROLE, isTransferKind, roleMembers } from './sputnik';
import type { Policy, ProposalOutput, ProposalStatus } from './sputnik';

export interface VerifyInput {
  deployment: Deployment;
  factoryInfo: { factory_id: string; auto_update: boolean };
  policy: Policy;
  config: ConfigView;
  deskKeyCount: number;
  members: MemberView[];
  loans: LoanView[];
  proposals: Map<number, ProposalOutput>;
}

export interface Check {
  name: string;
  ok: boolean;
  detail: string;
}

export const KEYLESS_CHECK = 'desk is keyless (frozen)';

/** Which Sputnik statuses are consistent with each desk loan status (null = the loan has no proposal). */
export function allowedProposalStatuses(status: LoanStatus): readonly ProposalStatus[] | null {
  switch (status) {
    case 'Active':
    case 'Repaid':
    case 'RepaidLate':
    case 'Defaulted':
      return ['Approved'];
    case 'Voided':
      return ['Failed'];
    case 'NotFunded':
      return ['Rejected', 'Removed', 'Expired', 'Moved', 'Failed'];
    case 'AwaitingCouncil':
      return ['InProgress', 'Approved'];
    case 'Voting':
    case 'Filing':
      return ['InProgress', 'Approved', 'Failed'];
    case 'Refused':
      return null;
  }
}

function sum(values: readonly string[]): bigint {
  return values.reduce((acc, v) => acc + BigInt(v), 0n);
}

export function runChecks(input: VerifyInput): Check[] {
  const checks: Check[] = [];
  const add = (name: string, ok: boolean, detail: string): void => {
    checks.push({ name, ok, detail });
  };
  const { deployment, policy, config } = input;

  add('factory auto-upgrade is off', input.factoryInfo.auto_update === false, `auto_update=${String(input.factoryInfo.auto_update)}`);

  const seat = roleMembers(policy, DESK_ROLE);
  const deskRole = policy.roles.find((r) => r.name === DESK_ROLE);
  const perms = deskRole === undefined ? [] : [...deskRole.permissions].sort();
  const others = policy.roles.filter((r) => r.name !== DESK_ROLE && typeof r.kind === 'object' && 'Group' in r.kind && r.kind.Group.includes(deployment.desk));
  add(
    'desk seat holds only the desk, with transfer:AddProposal and transfer:VoteApprove only',
    seat !== null && seat.length === 1 && seat[0] === deployment.desk && perms.join(',') === [...DESK_PERMISSIONS].sort().join(',') && others.length === 0,
    `seat=${JSON.stringify(seat)} permissions=${JSON.stringify(perms)} other roles=${others.map((r) => r.name).join(',') || 'none'}`,
  );

  const council = roleMembers(policy, COUNCIL_ROLE);
  const dvp = policy.default_vote_policy;
  add(
    'council is 3 members and every kind needs 2 approvals',
    council !== null && council.length === 3 && dvp.weight_kind === 'RoleWeight' && dvp.quorum === '2' && dvp.threshold === '2',
    `council=${council === null ? 'missing' : council.length} quorum=${dvp.quorum} threshold=${JSON.stringify(dvp.threshold)}`,
  );

  add('desk is wired to this DAO', config.dao === deployment.dao, `desk.dao=${config.dao}`);
  add(KEYLESS_CHECK, input.deskKeyCount === 0, `${input.deskKeyCount} access key(s) on ${deployment.desk}`);

  for (const loan of input.loans) {
    const allowed = allowedProposalStatuses(loan.status);
    const name = `loan #${loan.id} (${loan.status}) matches its Sputnik proposal`;
    if (allowed === null) {
      add(name, loan.proposal_id === null, loan.proposal_id === null ? 'refused before filing' : `unexpected proposal ${loan.proposal_id}`);
      continue;
    }
    if (loan.proposal_id === null) {
      add(name, false, 'no proposal id');
      continue;
    }
    const p = input.proposals.get(loan.proposal_id);
    if (p === undefined) {
      add(name, false, `proposal ${loan.proposal_id} not found`);
      continue;
    }
    const kindOk =
      isTransferKind(p.kind) && p.kind.Transfer.token_id === '' && p.kind.Transfer.receiver_id === loan.borrower && p.kind.Transfer.amount === loan.principal;
    add(name, kindOk && allowed.includes(p.status), `proposal ${p.id}: ${p.status}, kind ${kindOk ? 'Transfer to borrower for principal' : JSON.stringify(p.kind)}`);
  }

  const reserving = input.loans.filter(holdsReservation);
  const book = sum(reserving.map((l) => l.principal));
  add('book equals the open principal', book === BigInt(config.book), `book=${config.book} expected=${book.toString()}`);

  for (const m of input.members) {
    const drawn = sum(reserving.filter((l) => l.borrower === m.account_id && l.lane !== 'Council').map((l) => l.borrower_part));
    const pledged = sum(reserving.filter((l) => l.cosigner === m.account_id).map((l) => l.pledge));
    add(
      `${m.account_id} drawn and pledged match open loans`,
      drawn === BigInt(m.drawn) && pledged === BigInt(m.pledged),
      `drawn=${m.drawn}/${drawn.toString()} pledged=${m.pledged}/${pledged.toString()}`,
    );
  }
  return checks;
}
```

- [ ] **Step 4: Run the gate**

Run: `npx vitest run src/lib/verify.test.ts`
Expected: PASS — `Tests  8 passed (8)`

- [ ] **Step 5: Commit (kernel-performed — no agent runs this)**
Message: `feat(lib): deployment record and verify checks`

---

### Task 43: Typed desk calls and the story's expected end state

**Files:**
- Create: `scripts/lib/desk-calls.ts`
- Create: `scripts/lib/story-expect.ts`
- Test: `scripts/lib/desk-calls.test.ts`
- Test: `scripts/lib/story-expect.test.ts`

**Depends on:** Task 41, Task 9
**Effort:** medium
**Model tier:** top
**Requires:** `src/lib/desk.ts: types Lane, LoanStatus, DeskParams, ConfigView, SeatView, MemberView, LoanView, RequestView, AskResult, DeskViewer, DeskSnapshot`, `src/lib/fixtures/desk.ts: NEAR, DAO, DESK, loan(over), member(over), config(over)`, `scripts/lib/council.ts: type CallFn = (receiverId: string, methodName: string, args: Record<string, unknown>, depositYocto: bigint) => Promise<TxResult>`, `scripts/lib/near.ts: interface TxResult { ok: boolean; failures: string[]; value: unknown; raw: unknown }`, `scripts/lib/near.ts: requireOk(result: TxResult, what: string): unknown`
**Provides:** `scripts/lib/desk-calls.ts: ask, cosign, askCouncil -> Promise<{ result: AskResult; tx: TxResult }>; cancelRequest, repay, syncLoan, markDefault, joinVisitorLine -> Promise<TxResult>; parseAskResult, loanIdOf`, `scripts/lib/story-expect.ts: interface StoryRecord, EXPECTED_STATUS, EXPECTED_STANDING_NEAR, isStoryRecord(value: unknown), checkStory(record, loans, members): string[]`

Context: from Task 9, `scripts/lib/council.ts` exports `type CallFn = (receiverId: string, methodName: string, args: Record<string, unknown>, depositYocto: bigint) => Promise<TxResult>`; from Task 7, `scripts/lib/near.ts` exports `interface TxResult { ok: boolean; failures: string[]; value: unknown; raw: unknown }` and `requireOk(result, what): unknown` (throws "<what> failed: …"). Desk methods (Tasks 24–28): `ask({amount})`, `cosign({borrower, max_pledge})`, `ask_council({amount})` return an AskResult as the chain's final value; `cancel_request({})`, `repay({loan_id})` (attach exactly the principal), `sync_loan({loan_id})`, `mark_default({loan_id})`, `join_visitor_line({})` (attach exactly visitor_deposit). Expected story end state (spec §6): Ada 4, Bayo 5, Chidi 0 NEAR. Strict TypeScript, ESM, `import type` for type-only imports, no `as any`, run every command from the repo root, the executor never runs git.

- [ ] **Step 1: Write the failing tests**

`scripts/lib/desk-calls.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import type { CallFn } from './council';
import { ask, cosign, loanIdOf, parseAskResult, repay } from './desk-calls';
import type { TxResult } from './near';

const ok = (value: unknown): TxResult => ({ ok: true, failures: [], value, raw: null });

describe('desk calls', () => {
  it('parses both AskResult shapes', () => {
    expect(parseAskResult({ Held: { gap: '2', expires_at_ms: 5 } })).toEqual({ Held: { gap: '2', expires_at_ms: 5 } });
    expect(parseAskResult({ Loan: { loan_id: 3, status: 'Active', proposal_id: 9 } })).toEqual({ Loan: { loan_id: 3, status: 'Active', proposal_id: 9 } });
    expect(parseAskResult({ Loan: { loan_id: 4, status: 'Refused', proposal_id: null } })).toEqual({ Loan: { loan_id: 4, status: 'Refused', proposal_id: null } });
    expect(() => parseAskResult({ nope: 1 })).toThrow('not an AskResult');
  });

  it('sends yocto strings and returns the parsed result', async () => {
    const sent: Array<[string, string, Record<string, unknown>, bigint]> = [];
    const call: CallFn = async (r, m, a, d) => {
      sent.push([r, m, a, d]);
      return ok({ Held: { gap: '2000000000000000000000000', expires_at_ms: 9 } });
    };
    const { result } = await ask(call, 'desk.r.testnet', 6n * 10n ** 24n);
    expect(sent[0]).toEqual(['desk.r.testnet', 'ask', { amount: '6000000000000000000000000' }, 0n]);
    expect(() => loanIdOf(result)).toThrow('the desk held the request');
  });

  it('co-signs with a max pledge and repays with the exact principal attached', async () => {
    const sent: Array<[string, Record<string, unknown>, bigint]> = [];
    const call: CallFn = async (_r, m, a, d) => {
      sent.push([m, a, d]);
      return ok(m === 'cosign' ? { Loan: { loan_id: 7, status: 'Active', proposal_id: 12 } } : null);
    };
    const { result } = await cosign(call, 'desk', 'ada.r.testnet', 2n);
    expect(loanIdOf(result)).toBe(7);
    await repay(call, 'desk', 7, 6n);
    expect(sent).toEqual([
      ['cosign', { borrower: 'ada.r.testnet', max_pledge: '2' }, 0n],
      ['repay', { loan_id: 7 }, 6n],
    ]);
  });

  it('surfaces a failed ask', async () => {
    const call: CallFn = async () => ({ ok: false, failures: ['desk: ERR_BOOK_FULL'], value: null, raw: null });
    await expect(ask(call, 'desk', 1n)).rejects.toThrow('ask failed: desk: ERR_BOOK_FULL');
  });
});
```

`scripts/lib/story-expect.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import type { LoanView, MemberView } from '../../src/lib/desk';
import { loan, member, NEAR } from '../../src/lib/fixtures/desk';
import { checkStory, isStoryRecord } from './story-expect';
import type { StoryRecord } from './story-expect';

const RECORD: StoryRecord = {
  run: '1',
  at: '2026-11-14T09:00:00.000Z',
  personas: { ada: 'ada-1.r.testnet', bayo: 'bayo-1.r.testnet', chidi: 'chidi-1.r.testnet' },
  loans: { money_shot: 0, council: 1, late: 2, defaulted: 3, refused: 4 },
  treasury: { before: '100', after_payout: '94', after_repay: '100' },
};

function good(): { loans: Map<number, LoanView>; members: Map<string, MemberView> } {
  const loans = new Map<number, LoanView>([
    [0, loan({ id: 0, status: 'Repaid' })],
    [1, loan({ id: 1, status: 'Repaid', lane: 'Council' })],
    [2, loan({ id: 2, status: 'RepaidLate' })],
    [3, loan({ id: 3, status: 'Defaulted' })],
    [4, loan({ id: 4, status: 'Refused', proposal_id: null })],
  ]);
  const members = new Map<string, MemberView>([
    ['ada-1.r.testnet', member({ account_id: 'ada-1.r.testnet', standing: (4n * NEAR).toString() })],
    ['bayo-1.r.testnet', member({ account_id: 'bayo-1.r.testnet', standing: (5n * NEAR).toString() })],
    ['chidi-1.r.testnet', member({ account_id: 'chidi-1.r.testnet', standing: '0' })],
  ]);
  return { loans, members };
}

describe('checkStory', () => {
  it('accepts the expected end state', () => {
    const { loans, members } = good();
    expect(checkStory(RECORD, loans, members)).toEqual([]);
    expect(isStoryRecord(RECORD)).toBe(true);
    expect(isStoryRecord({ ...RECORD, loans: { money_shot: 0 } })).toBe(false);
  });
  it('reports a wrong status, a wrong standing and an unrecovered treasury', () => {
    const { loans, members } = good();
    loans.set(3, loan({ id: 3, status: 'Active' }));
    members.set('bayo-1.r.testnet', member({ account_id: 'bayo-1.r.testnet' }));
    const problems = checkStory({ ...RECORD, treasury: { before: '100', after_payout: '94', after_repay: '94' } }, loans, members);
    expect(problems).toEqual([
      'defaulted: loan #3 is Active, expected Defaulted',
      'bayo: standing 4000000000000000000000000, expected 5000000000000000000000000',
      'treasury did not recover: 100 -> 94',
    ]);
  });
});
```

- [ ] **Step 2: Run to confirm it fails**

Run: `npx vitest run scripts/lib/desk-calls.test.ts scripts/lib/story-expect.test.ts`
Expected: FAIL — `Failed to resolve import "./desk-calls"`

- [ ] **Step 3: Implement**

`scripts/lib/desk-calls.ts`:
```ts
/** Typed calls to the desk. Every call attaches 300 Tgas (callTx default) and never throws on a failed receipt. */
import type { AskResult, LoanStatus } from '../../src/lib/desk';
import type { CallFn } from './council';
import { requireOk } from './near';
import type { TxResult } from './near';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function parseAskResult(value: unknown): AskResult {
  if (isRecord(value)) {
    const held = value['Held'];
    if (isRecord(held) && typeof held['gap'] === 'string' && typeof held['expires_at_ms'] === 'number') {
      return { Held: { gap: held['gap'], expires_at_ms: held['expires_at_ms'] } };
    }
    const loan = value['Loan'];
    if (isRecord(loan) && typeof loan['loan_id'] === 'number' && typeof loan['status'] === 'string') {
      const pid = loan['proposal_id'];
      return { Loan: { loan_id: loan['loan_id'], status: loan['status'] as LoanStatus, proposal_id: typeof pid === 'number' ? pid : null } };
    }
  }
  throw new Error(`not an AskResult: ${JSON.stringify(value)}`);
}

export function loanIdOf(result: AskResult): number {
  if ('Held' in result) throw new Error(`expected a loan, the desk held the request (gap ${result.Held.gap})`);
  return result.Loan.loan_id;
}

export async function ask(call: CallFn, deskId: string, amountYocto: bigint): Promise<{ result: AskResult; tx: TxResult }> {
  const tx = await call(deskId, 'ask', { amount: amountYocto.toString() }, 0n);
  return { result: parseAskResult(requireOk(tx, 'ask')), tx };
}

export async function cosign(call: CallFn, deskId: string, borrower: string, maxPledgeYocto: bigint): Promise<{ result: AskResult; tx: TxResult }> {
  const tx = await call(deskId, 'cosign', { borrower, max_pledge: maxPledgeYocto.toString() }, 0n);
  return { result: parseAskResult(requireOk(tx, 'cosign')), tx };
}

export async function askCouncil(call: CallFn, deskId: string, amountYocto: bigint): Promise<{ result: AskResult; tx: TxResult }> {
  const tx = await call(deskId, 'ask_council', { amount: amountYocto.toString() }, 0n);
  return { result: parseAskResult(requireOk(tx, 'ask_council')), tx };
}

export function cancelRequest(call: CallFn, deskId: string): Promise<TxResult> {
  return call(deskId, 'cancel_request', {}, 0n);
}

/** Attaches exactly the principal: the desk forwards it to the DAO in the same chain. */
export function repay(call: CallFn, deskId: string, loanId: number, principalYocto: bigint): Promise<TxResult> {
  return call(deskId, 'repay', { loan_id: loanId }, principalYocto);
}

export function syncLoan(call: CallFn, deskId: string, loanId: number): Promise<TxResult> {
  return call(deskId, 'sync_loan', { loan_id: loanId }, 0n);
}

export function markDefault(call: CallFn, deskId: string, loanId: number): Promise<TxResult> {
  return call(deskId, 'mark_default', { loan_id: loanId }, 0n);
}

export function joinVisitorLine(call: CallFn, deskId: string, depositYocto: bigint): Promise<TxResult> {
  return call(deskId, 'join_visitor_line', {}, depositYocto);
}
```

`scripts/lib/story-expect.ts`:
```ts
/** What a `story --run <id>` must leave on-chain (spec §6), checked read-only by `story:check`. */
import type { LoanStatus, LoanView, MemberView } from '../../src/lib/desk';

export interface StoryRecord {
  run: string;
  at: string;
  personas: { ada: string; bayo: string; chidi: string };
  loans: { money_shot: number; council: number; late: number; defaulted: number; refused: number };
  treasury: { before: string; after_payout: string; after_repay: string };
}

export const EXPECTED_STATUS: Record<keyof StoryRecord['loans'], LoanStatus> = {
  money_shot: 'Repaid',
  council: 'Repaid',
  late: 'RepaidLate',
  defaulted: 'Defaulted',
  refused: 'Refused',
};

/** Final standings in whole NEAR: Ada 4→5 then −1 pledge slashed; Bayo 4→5; Chidi 4→5 then defaulted to 0. */
export const EXPECTED_STANDING_NEAR = { ada: 4n, bayo: 5n, chidi: 0n } as const;

const NEAR = 10n ** 24n;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function isStoryRecord(value: unknown): value is StoryRecord {
  if (!isRecord(value)) return false;
  const p = value['personas'];
  const l = value['loans'];
  const t = value['treasury'];
  return (
    typeof value['run'] === 'string' &&
    typeof value['at'] === 'string' &&
    isRecord(p) &&
    ['ada', 'bayo', 'chidi'].every((k) => typeof p[k] === 'string') &&
    isRecord(l) &&
    Object.keys(EXPECTED_STATUS).every((k) => typeof l[k] === 'number') &&
    isRecord(t) &&
    ['before', 'after_payout', 'after_repay'].every((k) => typeof t[k] === 'string')
  );
}

export function checkStory(record: StoryRecord, loans: ReadonlyMap<number, LoanView>, members: ReadonlyMap<string, MemberView>): string[] {
  const problems: string[] = [];
  for (const [beat, status] of Object.entries(EXPECTED_STATUS) as Array<[keyof StoryRecord['loans'], LoanStatus]>) {
    const loan = loans.get(record.loans[beat]);
    if (loan === undefined) problems.push(`${beat}: loan #${record.loans[beat]} not found`);
    else if (loan.status !== status) problems.push(`${beat}: loan #${loan.id} is ${loan.status}, expected ${status}`);
  }
  for (const who of ['ada', 'bayo', 'chidi'] as const) {
    const m = members.get(record.personas[who]);
    const want = EXPECTED_STANDING_NEAR[who] * NEAR;
    if (m === undefined) problems.push(`${who}: ${record.personas[who]} is not a member`);
    else if (BigInt(m.standing) !== want) problems.push(`${who}: standing ${m.standing}, expected ${want.toString()}`);
  }
  if (BigInt(record.treasury.after_repay) < BigInt(record.treasury.before)) {
    problems.push(`treasury did not recover: ${record.treasury.before} -> ${record.treasury.after_repay}`);
  }
  return problems;
}
```

- [ ] **Step 4: Run the gate**

Run: `npx vitest run scripts/lib/desk-calls.test.ts scripts/lib/story-expect.test.ts`
Expected: PASS — `Test Files  2 passed (2)` and `Tests  6 passed (6)`

- [ ] **Step 5: Commit (kernel-performed — no agent runs this)**
Message: `feat(scripts): typed desk calls and story expectations`

---

### Task 44: verify, seed, seed:check and freeze

**Files:**
- Create: `scripts/lib/inspect.ts`
- Create: `scripts/verify.ts`
- Create: `scripts/seed.ts`
- Create: `scripts/seed-check.ts`
- Create: `scripts/freeze.ts`

**Depends on:** Task 42, Task 43, Task 10
**Effort:** high
**Model tier:** top
**Requires:** `src/lib/deployments.ts: interface Deployment { network, rpc, factory, dao, desk, smoke, council, root, seeded_at, explorer }, DEPLOYMENT_PATH, EXPLORER, isDeployment(value: unknown): value is Deployment, accountUrl(deployment, accountId): string`, `src/lib/verify.ts: runChecks(input: VerifyInput): Check[], KEYLESS_CHECK, allowedProposalStatuses(status: LoanStatus)`, `src/lib/desk.ts: readDesk(viewer: DeskViewer, deskId: string): Promise<DeskSnapshot>`, `src/lib/desk.ts: DEMO_PARAMS: DeskParams (spec §6 demo values)`, `src/lib/rpc.ts: class RpcClient { constructor(url?: string, fetchImpl?: FetchLike); view<T>(accountId: string, methodName: string, args?: Record<string, unknown>): Promise<T>; viewAccount(accountId: string): Promise<AccountInfo | null>; accessKeyCount(accountId: string): Promise<number>; status(): Promise<{ protocolVersion: number; chainId: string }> }`, `src/lib/sputnik.ts: parseProposal(value: unknown): ProposalOutput`, `src/lib/sputnik.ts: roleMembers(policy: Policy, roleName: string): string[] | null`, `src/lib/sputnik.ts: addMemberKind(memberId: string, role: string): AddMemberKind`, `src/lib/sputnik.ts: removeMemberKind(memberId: string, role: string): RemoveMemberKind`, `src/lib/sputnik.ts: factoryInfoUpdateKind(autoUpdate: boolean): FactoryInfoUpdateKind`, `src/lib/sputnik.ts: FACTORY_ID = 'sputnikv2.testnet', COUNCIL_ROLE = 'council', DESK_ROLE = 'desk', DESK_PERMISSIONS`, `src/lib/units.ts: parseNear(text: string): bigint`, `src/lib/units.ts: formatNear(yocto: bigint | string, maxDecimals?: number): string`, `scripts/lib/args.ts: flag(argv: readonly string[], name: string): string | undefined`, `scripts/lib/args.ts: hasFlag(argv: readonly string[], name: string): boolean`, `scripts/lib/council.ts: callerFor(account: Account): CallFn`, `scripts/lib/council.ts: councilAction(callers: readonly CallFn[], view: ViewFn, daoId: string, description: string, kind: ProposalKindInput, pollMs?: number): Promise<ProposalOutput>`, `scripts/lib/env.ts: loadDotEnv(path?: string): void`, `scripts/lib/env.ts: readEnv(source: Record<string, string | undefined>): FiadorEnv`, `scripts/lib/near.ts: connect(env: FiadorEnv): Near`, `scripts/lib/near.ts: deployWithInit(account: Account, wasm: Uint8Array, initArgs: Record<string, unknown>): Promise<TxResult>`, `scripts/lib/near.ts: EMPTY_CODE_HASH = '11111111111111111111111111111111'`, `scripts/lib/near.ts: ensureSubAccount(parent: SubAccountCreator, rpc: Pick<RpcClient, 'viewAccount'>, accountId: string, publicKey: string, nearToTransfer: bigint, pollMs?: number): Promise<'created' | 'exists'>`, `scripts/lib/near.ts: requireOk(result: TxResult, what: string): unknown`, `scripts/lib/near.ts: summarizeOutcome(raw: unknown): TxResult`, `scripts/lib/near.ts: waitFor<T>(read: () => Promise<T>, done: (value: T) => boolean, what: string, timeoutMs?: number, intervalMs?: number): Promise<T>`, `scripts/lib/records.ts: readSmokeRecord(path?: string): SmokeRecord`, `scripts/lib/records.ts: writeJson(path: string, value: unknown): void`
**Provides:** `scripts/lib/inspect.ts: readDeployment(path?: string): Deployment, gatherVerifyInput(rpc: RpcClient, deployment: Deployment): Promise<VerifyInput>, printChecks(checks): boolean`, `npm run verify (read-only; VERIFY PASS / VERIFY FAIL)`, `npm run seed -- --desk <account> [--float <near>]; npm run seed:check`, `npm run freeze -- --yes (deletes every desk access key, then verifies)`

Context: spec §6 seed and freeze rows, D11, D12, D20, D30, D31. Every signature these files import is listed under Requires exactly as its provider wrote it (Tasks 3, 4, 7, 8, 9, 10, 41, 42); key ones: `councilAction(callers, view, daoId, description, kind)` runs 1 proposal + 2 approvals and returns the Approved proposal; `deployWithInit(account, wasm, initArgs)` deploys and calls `new` in ONE transaction; `readSmokeRecord()` returns `{ dao, council, smoke, factory, … }` from deployments/smoke.json; `runChecks(input)` and `KEYLESS_CHECK`. near-api-js 7.5.3: `account.transfer({ receiverId, amount })`, `provider.viewAccessKeyList({ accountId })` → `{ keys: { public_key }[] }`, `actions.deleteKey(PublicKey.from(key))`. The seed scales the float to the root's balance (default 12, minimum 8 NEAR, keeping 2 NEAR on the root) and refuses below the minimum. The freeze is irreversible and demands `--yes`. These are run live only in the human-gated Tasks 46–48. Strict TypeScript, ESM, `import type` for type-only imports, no `as any`, run every command from the repo root, the executor never runs git.

- [ ] **Step 1: Create the files**

`scripts/lib/inspect.ts`:
```ts
/** Read-only gathering for verify, seed:check and freeze: public RPC views only, no keys. */
import { readFileSync } from 'node:fs';
import { readDesk } from '../../src/lib/desk';
import { DEPLOYMENT_PATH, isDeployment } from '../../src/lib/deployments';
import type { Deployment } from '../../src/lib/deployments';
import type { RpcClient } from '../../src/lib/rpc';
import { parseProposal } from '../../src/lib/sputnik';
import type { Policy, ProposalOutput } from '../../src/lib/sputnik';
import type { Check, VerifyInput } from '../../src/lib/verify';

export function readDeployment(path: string = DEPLOYMENT_PATH): Deployment {
  const value: unknown = JSON.parse(readFileSync(path, 'utf8'));
  if (!isDeployment(value)) throw new Error(`${path} is not a deployment record (run the seed first)`);
  return value;
}

export async function gatherVerifyInput(rpc: RpcClient, deployment: Deployment): Promise<VerifyInput> {
  const factoryInfo = await rpc.view<{ factory_id: string; auto_update: boolean }>(deployment.dao, 'get_factory_info');
  const policy = await rpc.view<Policy>(deployment.dao, 'get_policy');
  const snapshot = await readDesk(rpc, deployment.desk);
  const deskKeyCount = await rpc.accessKeyCount(deployment.desk);
  const proposals = new Map<number, ProposalOutput>();
  for (const loan of snapshot.loans) {
    if (loan.proposal_id === null || proposals.has(loan.proposal_id)) continue;
    proposals.set(loan.proposal_id, parseProposal(await rpc.view<unknown>(deployment.dao, 'get_proposal', { id: loan.proposal_id })));
  }
  return { deployment, factoryInfo, policy, config: snapshot.config, deskKeyCount, members: snapshot.members, loans: snapshot.loans, proposals };
}

/** Prints one line per check; returns whether all passed. */
export function printChecks(checks: readonly Check[]): boolean {
  for (const c of checks) console.log(`${c.ok ? 'PASS' : 'FAIL'}  ${c.name} — ${c.detail}`);
  return checks.every((c) => c.ok);
}
```

`scripts/verify.ts`:
```ts
/** npm run verify — read-only: checks the DAO and the desk against every loan's Sputnik proposal (spec §7). */
import { RpcClient } from '../src/lib/rpc';
import { runChecks } from '../src/lib/verify';
import { gatherVerifyInput, printChecks, readDeployment } from './lib/inspect';

async function main(): Promise<void> {
  const deployment = readDeployment();
  const override = process.env['FIADOR_RPC']?.trim();
  const rpc = new RpcClient(override !== undefined && override.length > 0 ? override : deployment.rpc);
  console.log(`verify: DAO ${deployment.dao}, desk ${deployment.desk}, RPC ${rpc.url}`);
  const input = await gatherVerifyInput(rpc, deployment);
  const checks = runChecks(input);
  const ok = printChecks(checks);
  console.log(`${ok ? 'VERIFY PASS' : 'VERIFY FAIL'} (${checks.length} checks, ${input.loans.length} loans)`);
  process.exit(ok ? 0 : 1);
}

main().catch((err: unknown) => {
  console.error(`VERIFY FAIL: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
```

`scripts/seed.ts`:
```ts
/** npm run seed -- --desk <account> [--float <near>] — pause 2 (human-gated). Idempotent: every step checks first. */
import { readFileSync } from 'node:fs';
import { DEMO_PARAMS } from '../src/lib/desk';
import type { ConfigView } from '../src/lib/desk';
import { DEPLOYMENT_PATH, EXPLORER } from '../src/lib/deployments';
import type { Deployment } from '../src/lib/deployments';
import { RpcClient } from '../src/lib/rpc';
import { addMemberKind, DESK_ROLE, factoryInfoUpdateKind, removeMemberKind, roleMembers } from '../src/lib/sputnik';
import type { Policy } from '../src/lib/sputnik';
import { formatNear, parseNear } from '../src/lib/units';
import { flag } from './lib/args';
import { callerFor, councilAction } from './lib/council';
import { loadDotEnv, readEnv } from './lib/env';
import { connect, deployWithInit, EMPTY_CODE_HASH, ensureSubAccount, requireOk, waitFor } from './lib/near';
import { readSmokeRecord, writeJson } from './lib/records';

const DESK_WASM = 'contract/res/fiador_desk.wasm';
const DESK_FUNDING = parseNear('3.5');
const DEFAULT_FLOAT = parseNear('12');
const MIN_FLOAT = parseNear('8');
/** Kept on the root for gas and one story run's personas (3 x 0.5 NEAR). */
const ROOT_RESERVE = parseNear('2');

async function main(): Promise<void> {
  loadDotEnv();
  const env = readEnv(process.env);
  const argv = process.argv.slice(2);
  const near = connect(env);
  const rpc = new RpcClient(env.rpc);
  const smoke = readSmokeRecord();
  const dao = smoke.dao;
  const deskId = flag(argv, 'desk') ?? `desk.${env.root}`;
  const floatArg = flag(argv, 'float');
  const root = near.account(env.root);
  const publicKey = (await near.signer.getPublicKey()).toString();
  const council = smoke.council.map((id) => callerFor(near.account(id)));

  console.log(`\n== 1/5 desk account ${deskId}`);
  console.log(await ensureSubAccount(root, rpc, deskId, publicKey, DESK_FUNDING));
  const info = await rpc.viewAccount(deskId);
  if (info !== null && info.code_hash !== EMPTY_CODE_HASH) {
    const config = await rpc.view<ConfigView>(deskId, 'get_config');
    if (config.dao !== dao) throw new Error(`${deskId} is already a desk for ${config.dao}; pass a fresh --desk`);
    console.log('desk already deployed and initialised for this DAO');
  } else {
    requireOk(await deployWithInit(near.account(deskId), new Uint8Array(readFileSync(DESK_WASM)), { dao, params: DEMO_PARAMS }), 'deploy desk');
    await waitFor(() => rpc.view<ConfigView>(deskId, 'get_config').catch(() => null), (c) => c !== null, 'desk get_config');
    console.log('desk deployed and initialised in one transaction');
  }

  console.log('\n== 2/5 lock out factory upgrades (FactoryInfoUpdate auto_update=false)');
  const factory = await rpc.view<{ factory_id: string; auto_update: boolean }>(dao, 'get_factory_info');
  if (factory.auto_update) {
    const p = await councilAction(council, rpc, dao, 'Fiador: stop factory auto-upgrades so the DAO code and its JSON shapes stay fixed', factoryInfoUpdateKind(false));
    console.log(`proposal ${p.id} Approved`);
  } else console.log('already off');

  console.log(`\n== 3/5 seat swap: only ${deskId} in the "${DESK_ROLE}" role`);
  const policy = await rpc.view<Policy>(dao, 'get_policy');
  const seated = roleMembers(policy, DESK_ROLE) ?? [];
  for (const m of seated.filter((m) => m !== deskId)) {
    const p = await councilAction(council, rpc, dao, `Fiador: unseat ${m} from the desk role`, removeMemberKind(m, DESK_ROLE));
    console.log(`unseated ${m} (proposal ${p.id})`);
  }
  if (!seated.includes(deskId)) {
    const p = await councilAction(council, rpc, dao, `Fiador: seat ${deskId} in the desk role`, addMemberKind(deskId, DESK_ROLE));
    console.log(`seated ${deskId} (proposal ${p.id})`);
  } else console.log('desk already seated');

  console.log('\n== 4/5 loan float to the treasury (scaled to the root balance)');
  const rootInfo = await rpc.viewAccount(env.root);
  const daoInfo = await rpc.viewAccount(dao);
  if (rootInfo === null || daoInfo === null) throw new Error('root or DAO missing');
  const daoAvailable = BigInt(await rpc.view<string>(dao, 'get_available_amount'));
  const target = floatArg === undefined ? DEFAULT_FLOAT : parseNear(floatArg);
  if (daoAvailable >= target) {
    console.log(`DAO already has ${formatNear(daoAvailable)} NEAR available`);
  } else {
    const affordable = BigInt(rootInfo.amount) - ROOT_RESERVE;
    const send = (target - daoAvailable < affordable ? target - daoAvailable : affordable);
    if (daoAvailable + send < MIN_FLOAT) {
      throw new Error(`below the minimum viable float: DAO would hold ${formatNear(daoAvailable + send)} NEAR < ${formatNear(MIN_FLOAT)}; top up the root (npm run root -- topup)`);
    }
    await root.transfer({ receiverId: dao, amount: send });
    console.log(`sent ${formatNear(send)} NEAR; DAO float now about ${formatNear(daoAvailable + send)} NEAR`);
  }

  console.log(`\n== 5/5 write ${DEPLOYMENT_PATH}`);
  const deployment: Deployment = {
    network: 'testnet',
    rpc: env.rpc,
    factory: smoke.factory,
    dao,
    desk: deskId,
    smoke: smoke.smoke,
    council: smoke.council,
    root: env.root,
    seeded_at: new Date().toISOString(),
    explorer: EXPLORER,
  };
  writeJson(DEPLOYMENT_PATH, deployment);
  console.log(`SEED PASS dao=${dao} desk=${deskId}`);
}

main().catch((err: unknown) => {
  console.error(`SEED FAIL: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
```

`scripts/seed-check.ts`:
```ts
/** npm run seed:check — read-only gate for pause 2: every verify check except the keyless freeze, plus the float. */
import { RpcClient } from '../src/lib/rpc';
import { formatNear, parseNear } from '../src/lib/units';
import { KEYLESS_CHECK, runChecks } from '../src/lib/verify';
import { gatherVerifyInput, printChecks, readDeployment } from './lib/inspect';

const MIN_FLOAT = parseNear('8');

async function main(): Promise<void> {
  const deployment = readDeployment();
  const rpc = new RpcClient(deployment.rpc);
  const checks = runChecks(await gatherVerifyInput(rpc, deployment)).filter((c) => c.name !== KEYLESS_CHECK);
  const available = BigInt(await rpc.view<string>(deployment.dao, 'get_available_amount'));
  checks.push({ name: 'treasury holds the loan float', ok: available >= MIN_FLOAT, detail: `${formatNear(available)} NEAR available` });
  const ok = printChecks(checks);
  console.log(ok ? `SEED PASS dao=${deployment.dao} desk=${deployment.desk}` : 'SEED FAIL');
  process.exit(ok ? 0 : 1);
}

main().catch((err: unknown) => {
  console.error(`SEED FAIL: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
```

`scripts/freeze.ts`:
```ts
/** npm run freeze -- --yes — pause 3 (human-gated, IRREVERSIBLE): deletes every access key on the desk, then verifies. */
import { actions, PublicKey } from 'near-api-js';
import { RpcClient } from '../src/lib/rpc';
import { runChecks } from '../src/lib/verify';
import { hasFlag } from './lib/args';
import { loadDotEnv, readEnv } from './lib/env';
import { gatherVerifyInput, printChecks, readDeployment } from './lib/inspect';
import { connect, summarizeOutcome, requireOk, waitFor } from './lib/near';

async function main(): Promise<void> {
  if (!hasFlag(process.argv.slice(2), 'yes')) {
    throw new Error('the freeze is permanent (no key, no upgrade, ever); rerun with --yes once the story run has passed');
  }
  loadDotEnv();
  const env = readEnv(process.env);
  const deployment = readDeployment();
  const near = connect(env);
  const rpc = new RpcClient(deployment.rpc);
  const list = await near.provider.viewAccessKeyList({ accountId: deployment.desk });
  const keys = list.keys.map((k) => k.public_key);
  if (keys.length > 0) {
    console.log(`deleting ${keys.length} access key(s) from ${deployment.desk}`);
    const raw: unknown = await near.account(deployment.desk).signAndSendTransaction({
      receiverId: deployment.desk,
      actions: keys.map((k) => actions.deleteKey(PublicKey.from(k))),
      throwOnFailure: false,
    });
    requireOk(summarizeOutcome(raw), 'delete keys');
    await waitFor(() => rpc.accessKeyCount(deployment.desk), (n) => n === 0, 'desk keys to disappear');
  } else console.log('desk already keyless');
  const ok = printChecks(runChecks(await gatherVerifyInput(rpc, deployment)));
  console.log(ok ? `FREEZE PASS ${deployment.desk} has no access keys; VERIFY PASS` : 'FREEZE DONE but VERIFY FAIL');
  process.exit(ok ? 0 : 1);
}

main().catch((err: unknown) => {
  console.error(`FREEZE FAIL: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
```

- [ ] **Step 2: Run the gate**

Run: `npm run check`
Expected: PASS — `tsc` prints nothing, then vitest ends with `Test Files  <N> passed (<N>)` and no failed files

- [ ] **Step 3: Commit (kernel-performed — no agent runs this)**
Message: `feat(scripts): verify, seed, seed:check and freeze`

---

### Task 45: story and story:check

**Files:**
- Create: `scripts/story.ts`
- Create: `scripts/story-check.ts`

**Depends on:** Task 44
**Effort:** high
**Model tier:** top
**Requires:** `scripts/lib/inspect.ts: readDeployment(path?: string): Deployment, gatherVerifyInput(rpc: RpcClient, deployment: Deployment): Promise<VerifyInput>, printChecks(checks): boolean`, `scripts/lib/desk-calls.ts: ask, cosign, askCouncil -> Promise<{ result: AskResult; tx: TxResult }>; cancelRequest, repay, syncLoan, markDefault, joinVisitorLine -> Promise<TxResult>; parseAskResult, loanIdOf`, `scripts/lib/story-expect.ts: interface StoryRecord, EXPECTED_STATUS, EXPECTED_STANDING_NEAR, isStoryRecord(value: unknown), checkStory(record, loans, members): string[]`, `src/lib/desk.ts: isHeld(result: AskResult): result is { Held: { gap: string; expires_at_ms: number } }`, `scripts/lib/council.ts: type CallFn = (receiverId: string, methodName: string, args: Record<string, unknown>, depositYocto: bigint) => Promise<TxResult>`, `scripts/lib/council.ts: callerFor(account: Account): CallFn`, `scripts/lib/council.ts: councilAction(callers: readonly CallFn[], view: ViewFn, daoId: string, description: string, kind: ProposalKindInput, pollMs?: number): Promise<ProposalOutput>`, `scripts/lib/council.ts: vote(call: CallFn, view: ViewFn, daoId: string, id: number, action?: VoteAction, pollMs?: number): Promise<TxResult>`, `scripts/lib/council.ts: waitForProposal(view: ViewFn, daoId: string, id: number, done: (p: ProposalOutput) => boolean, pollMs?: number, timeoutMs?: number): Promise<ProposalOutput>`, `src/lib/sputnik.ts: functionCallKind(receiverId: string, calls: readonly FunctionCallSpec[]): FunctionCallKind`, `src/lib/sputnik.ts: addMemberKind(memberId: string, role: string): AddMemberKind`, `src/lib/sputnik.ts: removeMemberKind(memberId: string, role: string): RemoveMemberKind`, `src/lib/sputnik.ts: FACTORY_ID = 'sputnikv2.testnet', COUNCIL_ROLE = 'council', DESK_ROLE = 'desk', DESK_PERMISSIONS`, `src/lib/rpc.ts: class RpcClient { constructor(url?: string, fetchImpl?: FetchLike); view<T>(accountId: string, methodName: string, args?: Record<string, unknown>): Promise<T>; viewAccount(accountId: string): Promise<AccountInfo | null>; accessKeyCount(accountId: string): Promise<number>; status(): Promise<{ protocolVersion: number; chainId: string }> }`, `src/lib/units.ts: formatNear(yocto: bigint | string, maxDecimals?: number): string`, `src/lib/units.ts: parseNear(text: string): bigint`, `src/lib/units.ts: YOCTO_PER_NEAR, TGAS, GAS_300_TGAS (bigint)`, `scripts/lib/args.ts: flag(argv: readonly string[], name: string): string | undefined`, `scripts/lib/env.ts: loadDotEnv(path?: string): void`, `scripts/lib/env.ts: readEnv(source: Record<string, string | undefined>): FiadorEnv`, `scripts/lib/near.ts: connect(env: FiadorEnv): Near`, `scripts/lib/near.ts: ensureSubAccount(parent: SubAccountCreator, rpc: Pick<RpcClient, 'viewAccount'>, accountId: string, publicKey: string, nearToTransfer: bigint, pollMs?: number): Promise<'created' | 'exists'>`, `scripts/lib/near.ts: hasFailure(result: TxResult, needle: string): boolean`, `scripts/lib/near.ts: requireOk(result: TxResult, what: string): unknown`, `scripts/lib/near.ts: waitFor<T>(read: () => Promise<T>, done: (value: T) => boolean, what: string, timeoutMs?: number, intervalMs?: number): Promise<T>`, `scripts/lib/records.ts: writeJson(path: string, value: unknown): void`
**Provides:** `npm run story -- --run <id>; npm run story:check -- --run <id>`

Context: spec §6 story row and D4, D10, D14, D21, D27. The story waits on CHAIN time (block timestamps via `rpc.request('block', { finality: 'final' })` → `header.timestamp_nanosec`) so the late repayment lands inside grace and the default after it. It re-seats the desk after the unseat beat so the live DAO keeps working for the README steps. Every imported signature is listed under Requires exactly as written by its provider (Tasks 3, 4, 7, 8, 9, 10, 41, 43, 44). Strict TypeScript, ESM, `import type` for type-only imports, no `as any`, run every command from the repo root, the executor never runs git.

- [ ] **Step 1: Create the files**

`scripts/story.ts`:
```ts
/** npm run story -- --run <id> — pause 3 (human-gated). The builder's scripted story on the seeded demo DAO (spec §6). */
import { isHeld } from '../src/lib/desk';
import type { LoanStatus, LoanView, MemberView } from '../src/lib/desk';
import { RpcClient } from '../src/lib/rpc';
import { addMemberKind, DESK_ROLE, functionCallKind, removeMemberKind } from '../src/lib/sputnik';
import { formatNear, parseNear, TGAS } from '../src/lib/units';
import { flag } from './lib/args';
import { callerFor, councilAction, vote, waitForProposal } from './lib/council';
import type { CallFn } from './lib/council';
import { ask, askCouncil, cosign, loanIdOf, markDefault, repay, syncLoan } from './lib/desk-calls';
import { loadDotEnv, readEnv } from './lib/env';
import { readDeployment } from './lib/inspect';
import { connect, ensureSubAccount, hasFailure, requireOk, waitFor } from './lib/near';
import { writeJson } from './lib/records';
import type { StoryRecord } from './lib/story-expect';

const NEAR = 10n ** 24n;
const PERSONA_FUNDING = parseNear('0.5');

function beat(text: string): void {
  console.log(`\n== ${text}`);
}

async function main(): Promise<void> {
  loadDotEnv();
  const env = readEnv(process.env);
  const run = flag(process.argv.slice(2), 'run') ?? '1';
  if (!/^[a-z0-9]{1,8}$/.test(run)) throw new Error('--run must be 1-8 lowercase letters or digits');
  const near = connect(env);
  const rpc = new RpcClient(env.rpc);
  const d = readDeployment();
  const root = near.account(env.root);
  const publicKey = (await near.signer.getPublicKey()).toString();
  const council = d.council.map((id) => callerFor(near.account(id)));
  const [c1, c2] = council;
  if (c1 === undefined || c2 === undefined) throw new Error('the deployment lists fewer than two council members');
  const ids = { ada: `ada-${run}.${env.root}`, bayo: `bayo-${run}.${env.root}`, chidi: `chidi-${run}.${env.root}` };
  const as = (id: string): CallFn => callerFor(near.account(id));
  const anyone = callerFor(root);
  const params = (await rpc.view<{ params: { grace_sec: number } }>(d.desk, 'get_config')).params;

  const treasury = async (): Promise<bigint> => {
    const info = await rpc.viewAccount(d.dao);
    if (info === null) throw new Error('DAO missing');
    return BigInt(info.amount);
  };
  const loanIs = (id: number, status: LoanStatus): Promise<LoanView | null> =>
    waitFor(() => rpc.view<LoanView | null>(d.desk, 'get_loan', { loan_id: id }), (l) => l?.status === status, `loan #${id} ${status}`, 90_000);
  const standing = async (id: string): Promise<string> => {
    const m = await rpc.view<MemberView | null>(d.desk, 'get_member', { account_id: id });
    return m === null ? 'not a member' : `${formatNear(m.standing)} NEAR`;
  };
  const chainNowMs = async (): Promise<number> => {
    const block = await rpc.request('block', { finality: 'final' });
    const ts = (block as { header?: { timestamp_nanosec?: string } }).header?.timestamp_nanosec;
    if (ts === undefined) throw new Error('no block timestamp');
    return Number(BigInt(ts) / 1_000_000n);
  };
  const untilChainMs = (ms: number, what: string): Promise<number> => waitFor(chainNowMs, (t) => t > ms, what, 420_000, 3_000);

  beat('0/4 three fresh personas, admitted by one 2-of-3 council action');
  for (const id of Object.values(ids)) console.log(id, await ensureSubAccount(root, rpc, id, publicKey, PERSONA_FUNDING));
  const missing: string[] = [];
  for (const id of Object.values(ids)) if ((await rpc.view<MemberView | null>(d.desk, 'get_member', { account_id: id })) === null) missing.push(id);
  if (missing.length > 0) {
    const kind = functionCallKind(d.desk, missing.map((id) => ({ methodName: 'admit_member', args: { account_id: id }, depositYocto: 0n, gas: 20n * TGAS })));
    const p = await councilAction(council, rpc, d.dao, `Fiador: admit ${missing.join(', ')} (story run ${run})`, kind);
    console.log(`council proposal ${p.id} Approved: admitted ${missing.length}`);
    await waitFor(() => rpc.view<MemberView | null>(d.desk, 'get_member', { account_id: ids.chidi }), (m) => m !== null, 'members admitted');
  }

  beat('1/4 money shot: Ada asks 6, Bayo co-signs 2, the treasury pays with no vote, Ada repays');
  const before = await treasury();
  const held = await ask(as(ids.ada), d.desk, 6n * NEAR);
  if (!isHeld(held.result)) throw new Error(`expected the desk to hold Ada's request, got ${JSON.stringify(held.result)}`);
  console.log(`Ada (standing ${await standing(ids.ada)}) asks 6 NEAR: the desk holds the request: needs ${formatNear(held.result.Held.gap)} co-signed`);
  const shot = await cosign(as(ids.bayo), d.desk, ids.ada, 2n * NEAR);
  const shotId = loanIdOf(shot.result);
  const paid = await loanIs(shotId, 'Active');
  const afterPayout = await treasury();
  console.log(`Bayo co-signs 2: loan #${shotId} filed as Sputnik proposal ${String(paid?.proposal_id)} and approved by the desk seat alone`);
  console.log(`treasury ${formatNear(before)} -> ${formatNear(afterPayout)} NEAR`);
  requireOk(await repay(as(ids.ada), d.desk, shotId, 6n * NEAR), 'Ada repays');
  await loanIs(shotId, 'Repaid');
  const afterRepay = await treasury();
  console.log(`Ada repays 6: treasury back to ${formatNear(afterRepay)} NEAR; Ada ${await standing(ids.ada)}, Bayo ${await standing(ids.bayo)}`);

  beat('2/4 council lane: Chidi asks 3 from the council, 2 of 3 approve, sync, repay on time');
  const big = await askCouncil(as(ids.chidi), d.desk, 3n * NEAR);
  if ('Held' in big.result || big.result.Loan.proposal_id === null) throw new Error(`council filing failed: ${JSON.stringify(big.result)}`);
  const councilId = big.result.Loan.loan_id;
  const councilProposal = big.result.Loan.proposal_id;
  requireOk(await vote(c1, rpc, d.dao, councilProposal), 'council vote 1');
  requireOk(await vote(c2, rpc, d.dao, councilProposal), 'council vote 2');
  await waitForProposal(rpc, d.dao, councilProposal, (p) => p.status === 'Approved');
  requireOk(await syncLoan(anyone, d.desk, councilId), 'sync_loan');
  await loanIs(councilId, 'Active');
  requireOk(await repay(as(ids.chidi), d.desk, councilId, 3n * NEAR), 'Chidi repays the council loan');
  await loanIs(councilId, 'Repaid');
  console.log(`loan #${councilId} (proposal ${councilProposal}) approved 2-of-3, repaid on time; Chidi ${await standing(ids.chidi)}`);

  beat('3/4 a late repayment inside grace, and a co-signed loan left to default');
  const late = await ask(as(ids.chidi), d.desk, 4n * NEAR);
  const lateId = loanIdOf(late.result);
  const lateLoan = await loanIs(lateId, 'Active');
  const held2 = await ask(as(ids.chidi), d.desk, 2n * NEAR);
  if (!isHeld(held2.result)) throw new Error('expected a held request for the 2 NEAR loan');
  const def = await cosign(as(ids.ada), d.desk, ids.chidi, 1n * NEAR);
  const defId = loanIdOf(def.result);
  const defLoan = await loanIs(defId, 'Active');
  if (lateLoan === null || defLoan === null) throw new Error('loans vanished');
  console.log(`loan #${lateId} (4 NEAR) and loan #${defId} (2 NEAR, Ada pledged 1) are out; waiting past the term`);
  await untilChainMs(lateLoan.due_at_ms + 3_000, `term of loan #${lateId}`);
  requireOk(await repay(as(ids.chidi), d.desk, lateId, 4n * NEAR), 'late repayment');
  await loanIs(lateId, 'RepaidLate');
  console.log(`loan #${lateId} repaid after its term but inside grace: closed, no gain, no slash`);
  await untilChainMs(defLoan.due_at_ms + params.grace_sec * 1000 + 3_000, `term + grace of loan #${defId}`);
  requireOk(await markDefault(anyone, d.desk, defId), 'mark_default');
  await loanIs(defId, 'Defaulted');
  console.log(`loan #${defId} defaulted: Chidi ${await standing(ids.chidi)}, Ada ${await standing(ids.ada)} (lost the 1 NEAR she pledged)`);

  beat('4/4 the multisig stays in charge: unseat the desk, the next ask is refused by Sputnik, re-seat');
  await councilAction(council, rpc, d.dao, `Fiador: unseat ${d.desk} (story run ${run})`, removeMemberKind(d.desk, DESK_ROLE));
  const refused = await ask(as(ids.ada), d.desk, 1n * NEAR);
  const refusedId = loanIdOf(refused.result);
  if ('Held' in refused.result || refused.result.Loan.status !== 'Refused' || !hasFailure(refused.tx, 'ERR_PERMISSION_DENIED')) {
    throw new Error(`expected Sputnik to refuse with ERR_PERMISSION_DENIED, got ${JSON.stringify(refused.result)} ${refused.tx.failures.join(' | ')}`);
  }
  console.log(`loan #${refusedId} Refused; Sputnik said: ${refused.tx.failures.find((f) => f.includes('ERR_PERMISSION_DENIED')) ?? ''}`);
  await councilAction(council, rpc, d.dao, `Fiador: re-seat ${d.desk} (story run ${run})`, addMemberKind(d.desk, DESK_ROLE));
  console.log('desk re-seated, so the live DAO keeps working for the README steps');

  const record: StoryRecord = {
    run,
    at: new Date().toISOString(),
    personas: ids,
    loans: { money_shot: shotId, council: councilId, late: lateId, defaulted: defId, refused: refusedId },
    treasury: { before: before.toString(), after_payout: afterPayout.toString(), after_repay: afterRepay.toString() },
  };
  writeJson(`deployments/story-${run}.json`, record);
  console.log(`\nSTORY PASS run=${run}`);
}

main().catch((err: unknown) => {
  console.error(`STORY FAIL: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
```

`scripts/story-check.ts`:
```ts
/** npm run story:check -- --run <id> — read-only gate for the story run. */
import { readFileSync } from 'node:fs';
import type { LoanView, MemberView } from '../src/lib/desk';
import { RpcClient } from '../src/lib/rpc';
import { flag } from './lib/args';
import { readDeployment } from './lib/inspect';
import { checkStory, isStoryRecord } from './lib/story-expect';

async function main(): Promise<void> {
  const run = flag(process.argv.slice(2), 'run') ?? '1';
  const path = `deployments/story-${run}.json`;
  const record: unknown = JSON.parse(readFileSync(path, 'utf8'));
  if (!isStoryRecord(record)) throw new Error(`${path} is not a story record`);
  const d = readDeployment();
  const rpc = new RpcClient(d.rpc);
  const loans = new Map<number, LoanView>();
  for (const id of Object.values(record.loans)) {
    const loan = await rpc.view<LoanView | null>(d.desk, 'get_loan', { loan_id: id });
    if (loan !== null) loans.set(id, loan);
  }
  const members = new Map<string, MemberView>();
  for (const id of Object.values(record.personas)) {
    const m = await rpc.view<MemberView | null>(d.desk, 'get_member', { account_id: id });
    if (m !== null) members.set(id, m);
  }
  const problems = checkStory(record, loans, members);
  if (problems.length > 0) {
    console.log(`STORY FAIL run=${run}\n- ${problems.join('\n- ')}`);
    process.exit(1);
  }
  console.log(`STORY PASS run=${run} loans=${Object.values(record.loans).join(',')}`);
}

main().catch((err: unknown) => {
  console.error(`STORY FAIL: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
```

- [ ] **Step 2: Run the gate**

Run: `npm run check`
Expected: PASS — `tsc` prints nothing, then vitest ends with `Test Files  <N> passed (<N>)` and no failed files

- [ ] **Step 3: Commit (kernel-performed — no agent runs this)**
Message: `feat(scripts): story and story:check`

---

### Task 46: [HUMAN GATE] Seed the demo DAO (pause 2)

**Files:**
- Create: `deployments/testnet.json`

**Depends on:** Task 44, Task 31, Task 12
**Effort:** medium
**Model tier:** top
**Requires:** `npm run seed -- --desk <account> [--float <near>]; npm run seed:check`, `contract/res/fiador_desk.wasm`, `deployments/smoke.json`, `live DAO fiador.sputnikv2.testnet with the final policy and the smoke contract in the desk seat`
**Provides:** `deployments/testnet.json (seeded demo DAO + desk ids)`

Context: run by the gate-concierge with the user's explicit go (pause 2), in the main checkout (needs the git-ignored `.env`). It creates `desk.<root>` (3.5 NEAR), deploys and initialises the desk in one transaction, runs the council actions (factory upgrades off; unseat the smoke contract; seat the desk) and sends the loan float. Every step is skipped when already true, so a rerun is safe. If it stops with "below the minimum viable float", top up the root (`npm run root -- topup --count 2`) and rerun.

- [ ] **Step 1: Run**

Run: `npm run seed`
Expected: `== 1/5` … `== 5/5` sections ending with `SEED PASS dao=<dao> desk=desk.<root>`

- [ ] **Step 2: Run the gate**

Run: `npm run seed:check`
Expected: PASS — one `PASS` line per check and `SEED PASS dao=<dao> desk=desk.<root>`

- [ ] **Step 3: Commit (kernel-performed — no agent runs this)**
Message: `chore(gate): seed the demo DAO`

---

### Task 47: [HUMAN GATE] Story run 1 (pause 3)

**Files:**
- Create: `deployments/story-1.json`

**Depends on:** Task 45, Task 46
**Effort:** medium
**Model tier:** top
**Requires:** `npm run story -- --run <id>; npm run story:check -- --run <id>`, `deployments/testnet.json (seeded demo DAO + desk ids)`
**Provides:** `deployments/story-1.json (story run 1 loan ids)`

Context: run by the gate-concierge with the user's explicit go (pause 3), in the main checkout. Takes about 6 minutes (it waits past a term and a grace period on chain time) and spends about 1.5 NEAR of persona funding plus 2 NEAR of float lost to the default beat. Its history stays on the board as the permanent proof (D21); demo-studio may record a clean take later with `--run 2`.

- [ ] **Step 1: Run**

Run: `npm run story -- --run 1`
Expected: sections `0/4` … `4/4` (money shot, council lane, late and default, unseat → `ERR_PERMISSION_DENIED` → re-seat) ending with `STORY PASS run=1`

- [ ] **Step 2: Run the gate**

Run: `npm run story:check -- --run 1`
Expected: PASS — `STORY PASS run=1 loans=<five ids>`

- [ ] **Step 3: Commit (kernel-performed — no agent runs this)**
Message: `chore(gate): story run 1`

---

### Task 48: [HUMAN GATE] Keyless freeze of the desk (pause 3, irreversible)

**Files:**
- (none — nothing tracked changes)

**Depends on:** Task 47, Task 62
**Effort:** medium
**Model tier:** top
**Requires:** `npm run freeze -- --yes (deletes every desk access key, then verifies)`, `deployments/story-1.json (story run 1 loan ids)`, `web/src/board/Board.tsx: Board({ deployment }), BoardView, WaitingTable, LoanBook, MembersTable; /app/ page (web/app/index.html + web/src/board/main.tsx)`
**Provides:** `the desk account is keyless and npm run verify passes`

Context: D7 and D12. PERMANENT: after this the deployed desk can never be patched; a fix becomes a new desk (`npm run seed -- --desk desk2.<root>`) that the council seats. Run only after the story run passed (Task 47) and the board (Task 62) is built, and, if the tail plan is kept, preferably after the visitor run (Task 92). Run by the gate-concierge with the user's explicit per-gate go. Nothing tracked changes (`allow_empty`).

- [ ] **Step 1: Run**

Run: `npm run freeze -- --yes`
Expected: ends with `FREEZE PASS desk.<root> has no access keys; VERIFY PASS`

- [ ] **Step 2: Run the gate**

Run: `npm run verify`
Expected: PASS — every line `PASS`, ending `VERIFY PASS (<N> checks, <M> loans)`

- [ ] **Step 3: Commit (kernel-performed — no agent runs this)**
Message: `chore(gate): keyless freeze of the desk`

---
