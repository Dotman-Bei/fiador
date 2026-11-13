# Fiador Tail Implementation Plan (droppable)

**Goal:** The two droppable features, in cut order (wallet-connected /app actions go first, then the faucet visitor flow), and the README updates that follow each one only if it ships.
**Architecture:** Independent tasks that touch nothing the core depends on: `scripts/visitor.ts` (+ one human-gated live run) and `web/src/wallet/*` rendered under the board. If a feature is cut, its README task is cut with it.
**Tech Stack:** near-api-js 7.5.3; NEAR Wallet Selector 10.1.4 (@near-wallet-selector/core, @near-wallet-selector/my-near-wallet) with @near-js/transactions 2.5.1.
**Source spec:** docs/superpowers/specs/2026-11-13-fiador-design.md

Conventions for every task: run every command from the repo root; the executor never runs git; no secrets anywhere (env-var names only). The code below was developed and run before planning: in the combined workspace `tsc` is clean and every vitest suite passes, and `npm run web:check` builds both pages. `[HUMAN GATE]` tasks run in the main checkout (they need the git-ignored `.env`).

---

### Task 91: The faucet-based visitor flow script (droppable)

**Files:**
- Create: `scripts/visitor.ts`

**Depends on:** Task 44, Task 43, Task 8
**Effort:** medium
**Model tier:** top
**Requires:** `scripts/lib/inspect.ts: readDeployment(path?: string): Deployment, gatherVerifyInput(rpc: RpcClient, deployment: Deployment): Promise<VerifyInput>, printChecks(checks): boolean`, `scripts/lib/desk-calls.ts: ask, cosign, askCouncil -> Promise<{ result: AskResult; tx: TxResult }>; cancelRequest, repay, syncLoan, markDefault, joinVisitorLine -> Promise<TxResult>; parseAskResult, loanIdOf`, `src/lib/desk.ts: isHeld(result: AskResult): result is { Held: { gap: string; expires_at_ms: number } }`, `src/lib/rpc.ts: class RpcClient { constructor(url?: string, fetchImpl?: FetchLike); view<T>(accountId: string, methodName: string, args?: Record<string, unknown>): Promise<T>; viewAccount(accountId: string): Promise<AccountInfo | null>; accessKeyCount(accountId: string): Promise<number>; status(): Promise<{ protocolVersion: number; chainId: string }> }`, `src/lib/units.ts: formatNear(yocto: bigint | string, maxDecimals?: number): string`, `scripts/lib/council.ts: callerFor(account: Account): CallFn`, `scripts/lib/env.ts: readPublicEnv(source: Record<string, string | undefined>): { rpc: string; daoName: string; faucetUrl: string }`, `scripts/lib/faucet.ts: requestFaucetAccount(faucetUrl: string, newAccountId: string, publicKey: string, post?: PostJson): Promise<void>`, `scripts/lib/faucet.ts: randomAccountName(prefix: string, random?: () => number): string`, `scripts/lib/faucet.ts: waitForAccount(rpc: { viewAccount(accountId: string): Promise<AccountInfo | null> }, accountId: string, timeoutMs?: number, intervalMs?: number): Promise<AccountInfo>`, `scripts/lib/near.ts: hasFailure(result: TxResult, needle: string): boolean`, `scripts/lib/near.ts: requireOk(result: TxResult, what: string): unknown`, `scripts/lib/near.ts: waitFor<T>(read: () => Promise<T>, done: (value: T) => boolean, what: string, timeoutMs?: number, intervalMs?: number): Promise<T>`
**Provides:** `npm run visitor (no secrets; throwaway faucet account; VISITOR PASS / VISITOR SKIPPED)`

Context: cut-order item 2 (droppable without touching anything else). No secrets: the throwaway key is made with `KeyPair.fromRandom('ed25519')` and lives only in memory; the account comes from the public faucet helper (`requestFaucetAccount`, Task 8). A down faucet or a full visitor line exits with a clear "VISITOR SKIPPED … run npm run verify instead" (exit 2 or 3), never a stack trace. Strict TypeScript, ESM, `import type` for type-only imports, no `as any`, run every command from the repo root, the executor never runs git.

- [ ] **Step 1: Create the script**

`scripts/visitor.ts`:
```ts
/**
 * npm run visitor — no secrets and no wallet: a throwaway testnet account from the public faucet joins the demo
 * DAO's capped visitor line, is held above its standing, borrows within it, repays, and sees its standing rise.
 * The key lives only in memory for this run.
 */
import { Account, JsonRpcProvider, KeyPair, KeyPairSigner } from 'near-api-js';
import { isHeld } from '../src/lib/desk';
import type { ConfigView, LoanStatus, LoanView, MemberView } from '../src/lib/desk';
import { RpcClient } from '../src/lib/rpc';
import { formatNear } from '../src/lib/units';
import { callerFor } from './lib/council';
import { ask, cancelRequest, joinVisitorLine, loanIdOf, repay } from './lib/desk-calls';
import { readPublicEnv } from './lib/env';
import { randomAccountName, requestFaucetAccount, waitForAccount } from './lib/faucet';
import { readDeployment } from './lib/inspect';
import { hasFailure, requireOk, waitFor } from './lib/near';

function stop(code: number, message: string): never {
  console.log(message);
  process.exit(code);
}

async function main(): Promise<void> {
  const d = readDeployment();
  const env = readPublicEnv(process.env);
  const rpc = new RpcClient(d.rpc);
  const config = await rpc.view<ConfigView>(d.desk, 'get_config');
  const deposit = BigInt(config.params.visitor_deposit);
  const starter = BigInt(config.params.visitor_starter);

  console.log('== 1/5 a throwaway account from the public testnet faucet');
  const key = KeyPair.fromRandom('ed25519');
  const id = randomAccountName('fiador-visitor');
  try {
    await requestFaucetAccount(env.faucetUrl, id, key.getPublicKey().toString());
  } catch (err) {
    stop(2, `VISITOR SKIPPED: the public faucet did not create an account (${err instanceof Error ? err.message : String(err)}). Run \`npm run verify\` instead; it needs no account.`);
  }
  const info = await waitForAccount(rpc, id);
  console.log(`${id} created with ${formatNear(info.amount)} NEAR (key held in memory only)`);
  const call = callerFor(new Account(id, new JsonRpcProvider({ url: d.rpc }), new KeyPairSigner(key)));
  const member = (): Promise<MemberView | null> => rpc.view<MemberView | null>(d.desk, 'get_member', { account_id: id });
  const loanIs = (loanId: number, status: LoanStatus): Promise<LoanView | null> =>
    waitFor(() => rpc.view<LoanView | null>(d.desk, 'get_loan', { loan_id: loanId }), (l) => l?.status === status, `loan #${loanId} ${status}`, 90_000);

  console.log(`\n== 2/5 join the visitor line (attaching the ${formatNear(deposit)} NEAR storage deposit)`);
  const joined = await joinVisitorLine(call, d.desk, deposit);
  if (hasFailure(joined, 'ERR_VISITOR_LINE_FULL')) {
    stop(3, 'VISITOR SKIPPED: the visitor line is full right now (seats recycle after their window). Run `npm run verify` instead.');
  }
  requireOk(joined, 'join_visitor_line');
  const start = await waitFor(member, (m) => m !== null, 'visitor seat');
  console.log(`seated with standing ${formatNear(start?.standing ?? '0')} NEAR`);

  console.log('\n== 3/5 ask above the standing: the desk holds it for a co-signer');
  const held = await ask(call, d.desk, starter * 2n);
  if (!isHeld(held.result)) throw new Error(`expected a held request, got ${JSON.stringify(held.result)}`);
  console.log(`held: needs ${formatNear(held.result.Held.gap)} NEAR co-signed; cancelling it`);
  requireOk(await cancelRequest(call, d.desk), 'cancel_request');

  console.log('\n== 4/5 ask within the standing: the DAO pays through its own Transfer proposal, no vote');
  const loan = await ask(call, d.desk, starter);
  const loanId = loanIdOf(loan.result);
  const active = await loanIs(loanId, 'Active');
  console.log(`loan #${loanId} of ${formatNear(starter)} NEAR paid via Sputnik proposal ${String(active?.proposal_id)}`);

  console.log('\n== 5/5 repay on time and watch the standing rise');
  requireOk(await repay(call, d.desk, loanId, starter), 'repay');
  await loanIs(loanId, 'Repaid');
  const end = await waitFor(member, (m) => m !== null && m.standing !== start?.standing, 'standing to rise');
  console.log(`standing ${formatNear(start?.standing ?? '0')} -> ${formatNear(end?.standing ?? '0')} NEAR`);
  console.log(`VISITOR PASS ${id} loan=${loanId}`);
}

main().catch((err: unknown) => {
  console.error(`VISITOR FAIL: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
```

- [ ] **Step 2: Run the gate**

Run: `npm run check`
Expected: PASS — `tsc` prints nothing, then vitest ends with `Test Files  <N> passed (<N>)` and no failed files

- [ ] **Step 3: Commit (kernel-performed — no agent runs this)**
Message: `feat(scripts): faucet-based visitor flow`

---

### Task 92: [HUMAN GATE] Live visitor run (pause 3)

**Files:**
- (none — nothing tracked changes)

**Depends on:** Task 91, Task 46
**Effort:** medium
**Model tier:** top
**Requires:** `npm run visitor (no secrets; throwaway faucet account; VISITOR PASS / VISITOR SKIPPED)`, `deployments/testnet.json (seeded demo DAO + desk ids)`
**Provides:** `a live visitor loan repaid on the demo DAO`

Context: run by the gate-concierge with the user's explicit go, in the same pause as the story run, before the freeze if possible (the freeze does not stop it; the desk works keyless). It uses the public faucet, so it is human-gated (faucet). Nothing tracked changes (`allow_empty`). If the faucet is down, record that in the gate ledger and drop Task 94 (the README then keeps only `verify` and the board).

- [ ] **Step 1: Run the gate**

Run: `npm run visitor`
Expected: PASS — sections `1/5` … `5/5` ending `VISITOR PASS fiador-visitor-<…>.testnet loan=<id>`

- [ ] **Step 2: Commit (kernel-performed — no agent runs this)**
Message: `chore(gate): live visitor run`

---

### Task 93: Wallet-connected member actions in /app (droppable, cut first)

**Files:**
- Modify: `package.json`
- Create: `web/src/wallet/actions.ts`
- Create: `web/src/wallet/wallet.ts`
- Create: `web/src/wallet/MemberActions.tsx`
- Test: `web/src/wallet/actions.test.ts`
- Modify: `web/src/board/main.tsx`

**Depends on:** Task 81, Task 62
**Effort:** medium
**Requires:** `web/src/board/Board.tsx: Board({ deployment }), BoardView, WaitingTable, LoanBook, MembersTable; /app/ page (web/app/index.html + web/src/board/main.tsx)`, `web/vite.config.ts (multi-page: / and /app/), web/src/deployment.ts: loadDeployment(): Deployment | null, REPO_URL`, `web/src/landing/Landing.tsx: Landing({ deployment }), DEMO_VIDEO_URL; the / page (web/index.html + web/src/landing/main.tsx)`, `src/lib/units.ts: parseNear(text: string): bigint`
**Provides:** `web/src/wallet: actions.ts (askCall, cosignCall, cancelCall, repayCall), wallet.ts (MyNearWallet via NEAR Wallet Selector 10.1.4), MemberActions.tsx rendered under the board`

Context: cut-order item 1: the first thing to drop; the board stays fully read-only without it. NEAR Wallet Selector 10.1.4 takes `@near-js/transactions` actions (`actionCreators.functionCall(method, args, gas, deposit)`); MyNearWallet's factory returns an `InjectedWallet`, so `selector.wallet<InjectedWallet>('my-near-wallet').signIn({ contractId, methodNames: [] })`. Every call attaches 300 Tgas; `repay` attaches exactly the principal. Structural markup only. Strict TypeScript, ESM, `import type` for type-only imports, no `as any`, run every command from the repo root, the executor never runs git.

- [ ] **Step 1: Replace `package.json` with this content (adds the three wallet dependencies), then install**

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
    "@near-js/transactions": "2.5.1",
    "@near-wallet-selector/core": "10.1.4",
    "@near-wallet-selector/my-near-wallet": "10.1.4",
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

- [ ] **Step 3: Write the failing test**

`web/src/wallet/actions.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { askCall, cancelCall, cosignCall, GAS_300, repayCall } from './actions';

describe('wallet call specs', () => {
  it('asks in yocto with 300 Tgas and no deposit', () => {
    expect(askCall('6')).toEqual({ methodName: 'ask', args: { amount: '6000000000000000000000000' }, gas: GAS_300, deposit: 0n });
  });
  it('co-signs with a cap', () => {
    expect(cosignCall(' ada.testnet ', '2').args).toEqual({ borrower: 'ada.testnet', max_pledge: '2000000000000000000000000' });
  });
  it('repays the exact principal', () => {
    expect(repayCall(3, '6000000000000000000000000')).toEqual({ methodName: 'repay', args: { loan_id: 3 }, gas: GAS_300, deposit: 6n * 10n ** 24n });
    expect(() => repayCall(-1, '1')).toThrow('loan id must be a whole number');
  });
  it('cancels a request', () => {
    expect(cancelCall().methodName).toBe('cancel_request');
  });
});
```

- [ ] **Step 4: Run to confirm it fails**

Run: `npx vitest run web/src/wallet/actions.test.ts`
Expected: FAIL — `Failed to resolve import "./actions"`

- [ ] **Step 5: Implement, and render the actions under the board**

`web/src/wallet/actions.ts`:
```ts
/** Desk calls a member signs in a testnet wallet. Pure, so they are unit-tested; 300 Tgas each. */
import { parseNear } from '../../../src/lib/units';

export interface CallSpec {
  methodName: string;
  args: Record<string, unknown>;
  gas: bigint;
  deposit: bigint;
}

export const GAS_300 = 300n * 10n ** 12n;

export function askCall(amountNear: string): CallSpec {
  return { methodName: 'ask', args: { amount: parseNear(amountNear).toString() }, gas: GAS_300, deposit: 0n };
}

export function cosignCall(borrower: string, maxPledgeNear: string): CallSpec {
  return { methodName: 'cosign', args: { borrower: borrower.trim(), max_pledge: parseNear(maxPledgeNear).toString() }, gas: GAS_300, deposit: 0n };
}

export function cancelCall(): CallSpec {
  return { methodName: 'cancel_request', args: {}, gas: GAS_300, deposit: 0n };
}

/** Attaches exactly the loan's principal, as the desk requires. */
export function repayCall(loanId: number, principalYocto: string): CallSpec {
  if (!Number.isInteger(loanId) || loanId < 0) throw new Error('loan id must be a whole number');
  return { methodName: 'repay', args: { loan_id: loanId }, gas: GAS_300, deposit: BigInt(principalYocto) };
}
```

`web/src/wallet/wallet.ts`:
```ts
/** Testnet wallet connection (MyNearWallet via NEAR Wallet Selector). Optional: the board works without it. */
import { actionCreators } from '@near-js/transactions';
import { setupWalletSelector } from '@near-wallet-selector/core';
import type { InjectedWallet, WalletSelector } from '@near-wallet-selector/core';
import { setupMyNearWallet } from '@near-wallet-selector/my-near-wallet';
import type { CallSpec } from './actions';

let selector: Promise<WalletSelector> | null = null;

function getSelector(): Promise<WalletSelector> {
  selector ??= setupWalletSelector({ network: 'testnet', modules: [setupMyNearWallet()] });
  return selector;
}

export async function currentAccount(): Promise<string | null> {
  const s = await getSelector();
  return s.store.getState().accounts[0]?.accountId ?? null;
}

export async function signIn(deskId: string): Promise<void> {
  const s = await getSelector();
  const wallet = await s.wallet<InjectedWallet>('my-near-wallet');
  await wallet.signIn({ contractId: deskId, methodNames: [] });
}

export async function signOut(): Promise<void> {
  const s = await getSelector();
  if (!s.isSignedIn()) return;
  const wallet = await s.wallet();
  await wallet.signOut();
}

/** Sends one desk call from the signed-in account; the wallet asks the member to confirm. */
export async function send(deskId: string, spec: CallSpec): Promise<void> {
  const s = await getSelector();
  const wallet = await s.wallet();
  await wallet.signAndSendTransaction({
    receiverId: deskId,
    actions: [actionCreators.functionCall(spec.methodName, spec.args, spec.gas, spec.deposit)],
  });
}
```

`web/src/wallet/MemberActions.tsx`:
```tsx
/** Wallet-connected member actions for /app (ask, co-sign, repay). Structural only; the board stays read-only without it. */
import { useEffect, useState } from 'react';
import type { Deployment } from '../../../src/lib/deployments';
import { askCall, cancelCall, cosignCall, repayCall } from './actions';
import type { CallSpec } from './actions';
import { currentAccount, send, signIn, signOut } from './wallet';

export function MemberActions({ deployment }: { deployment: Deployment | null }) {
  const [account, setAccount] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('');
  const [askAmount, setAskAmount] = useState('1');
  const [borrower, setBorrower] = useState('');
  const [maxPledge, setMaxPledge] = useState('1');
  const [loanId, setLoanId] = useState('');
  const [principal, setPrincipal] = useState('');

  useEffect(() => {
    currentAccount()
      .then(setAccount)
      .catch((e: unknown) => setStatus(e instanceof Error ? e.message : String(e)));
  }, []);

  if (deployment === null) return null;
  const desk = deployment.desk;
  const run = (build: () => CallSpec): void => {
    try {
      const spec = build();
      setStatus(`Sending ${spec.methodName}…`);
      send(desk, spec)
        .then(() => setStatus(`${spec.methodName} sent; the board updates within 5 seconds.`))
        .catch((e: unknown) => setStatus(`${spec.methodName} failed: ${e instanceof Error ? e.message : String(e)}`));
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <section aria-labelledby="act">
      <h2 id="act">Act as a member (testnet wallet)</h2>
      <p>Optional. Members admitted by the council can ask, co-sign and repay here. Everything on the board above works without a wallet.</p>
      {account === null ? (
        <button type="button" onClick={() => void signIn(desk)}>Connect a testnet wallet</button>
      ) : (
        <>
          <p>
            Signed in as {account}. <button type="button" onClick={() => void signOut().then(() => setAccount(null))}>Sign out</button>
          </p>
          <form onSubmit={(e) => { e.preventDefault(); run(() => askCall(askAmount)); }}>
            <label>Ask for (NEAR) <input value={askAmount} onChange={(e) => setAskAmount(e.target.value)} inputMode="decimal" /></label>
            <button type="submit">Ask</button>
            <button type="button" onClick={() => run(cancelCall)}>Cancel my request</button>
          </form>
          <form onSubmit={(e) => { e.preventDefault(); run(() => cosignCall(borrower, maxPledge)); }}>
            <label>Co-sign for (account) <input value={borrower} onChange={(e) => setBorrower(e.target.value)} /></label>
            <label>Pledge up to (NEAR) <input value={maxPledge} onChange={(e) => setMaxPledge(e.target.value)} inputMode="decimal" /></label>
            <button type="submit">Co-sign</button>
          </form>
          <form onSubmit={(e) => { e.preventDefault(); run(() => repayCall(Number(loanId), principal)); }}>
            <label>Repay loan # <input value={loanId} onChange={(e) => setLoanId(e.target.value)} inputMode="numeric" /></label>
            <label>Principal (yocto, from the loan book) <input value={principal} onChange={(e) => setPrincipal(e.target.value)} inputMode="numeric" /></label>
            <button type="submit">Repay</button>
          </form>
        </>
      )}
      <p role="status">{status}</p>
    </section>
  );
}
```

`web/src/board/main.tsx`:
```tsx
import { createRoot } from 'react-dom/client';
import { MemberActions } from '../wallet/MemberActions';
import { loadDeployment } from '../deployment';
import { Board } from './Board';

const deployment = loadDeployment();
const el = document.getElementById('root');
if (el !== null) {
  createRoot(el).render(
    <>
      <Board deployment={deployment} />
      <MemberActions deployment={deployment} />
    </>,
  );
}
```

- [ ] **Step 6: Run the gate**

Run: `npm run web:check`
Expected: PASS — `Test Files  4 passed (4)`, then Vite prints `dist/index.html`, `dist/app/index.html` and `built in`

- [ ] **Step 7: Commit (kernel-performed — no agent runs this)**
Message: `feat(web): wallet-connected member actions`

---

### Task 94: README: add the visitor step (only if the visitor flow ships)

**Files:**
- Modify: `README.md`

**Depends on:** Task 91, Task 71
**Effort:** low
**Requires:** `README.md (R2-contract-protocol v1) + LICENSE (MIT) + tools/readme-check.ps1`, `npm run visitor (no secrets; throwaway faucet account; VISITOR PASS / VISITOR SKIPPED)`
**Provides:** `README.md with the visitor Quickstart step`

Context: same schema and headings as Task 71; only Quickstart step 4 (the visitor run) is added and the cargo step renumbered to 5. Drop this task if Task 91 is dropped.

- [ ] **Step 1: Replace `README.md` with exactly this**

`README.md`:
```markdown
<!-- readme-schema: R2-contract-protocol v1 -->
# Fiador

A credit union seat for Sputnik DAOs: members borrow treasury NEAR within a limit earned by on-time repayment.

## Demo

- Demo video: TBD-post-build:demo-video-url
- Live board (read-only, no wallet): TBD-post-build:hosted-board-url
- Screenshot of the board: TBD-post-build:board-screenshot

## What it does

A community that keeps its money in a Sputnik DAO can only give it away: every payment out is a one-way payout, so a member who needs a short float has to ask the whole council for a grant or go without. Fiador adds a credit desk to the DAO. The desk is one contract holding one narrow seat in the DAO's own policy, and it lends treasury NEAR to members as native Sputnik Transfer proposals. A loan within a member's standing is filed and approved at once; a larger one is held until another member co-signs the gap with their own standing; anything bigger goes to an ordinary 2-of-3 council vote. Every repayment returns to the same treasury, on-time repayments raise standing, and defaults zero it and slash the co-signer's pledge.

## Quickstart

Needs Node 22.22.2 or newer. No wallet, no keys, no secrets.

1. Do `npm ci` - see the install finish with no errors.
2. Do `npm run verify` - see one `PASS` line per check (factory upgrades off, the desk seat holds only the desk with transfer rights only, a 2-of-3 council, the desk has no access keys, every loan matches its Sputnik proposal) and a final `VERIFY PASS (N checks, M loans)`. It reads public testnet RPC only.
3. Do `npm run web`, then open `http://localhost:5173/app/` - see the treasury, the "Waiting for a co-signer" list, the loan book with each loan's Sputnik proposal id and status, and every member's standing with the repaid loans behind it, read live from testnet. (The same board is hosted: TBD-post-build:hosted-board-url.)
4. Do `npm run visitor` - see a throwaway testnet account created from the public faucet join the visitor line, get its first ask held for a co-signer, borrow within its standing (paid by the DAO through a Sputnik proposal), repay, then `standing 0.1 -> 0.2 NEAR` and `VISITOR PASS`. Its key lives only in memory. If the public faucet or the visitor line is unavailable, it says so and exits without error; use step 2 instead.
5. Do `npm run cargo -- test --manifest-path contract/desk/Cargo.toml` (needs Rust 1.99.0; on Windows the launcher also needs MSYS2 at `C:\msys64`) - see `test result: ok. 96 passed`.

If testnet RPC is unreachable, step 2 prints the RPC error; set `FIADOR_RPC` to another public testnet endpoint (https://docs.near.org/api/rpc/providers) and retry.

## Built at NEAR HACKATHON

- Event: NEAR HACKATHON (https://nearhackathon.com/), development window ending 2026-11-14 23:59 UTC.
- Track: Social Money (`social`).
- Team: one builder working with Claude Code (AI-written code, reviewed and gated by the builder).
- Built during the event: everything in this repository (created 2026-11-13), the desk contract, the scripts, the board and the landing page. The Sputnik DAO contract and factory are used as deployed on testnet (`sputnikv2.testnet`, DAO version 2.3.1), unmodified.

## Contract addresses

| Network | Account | What it is | Explorer |
|---|---|---|---|
| testnet | `sputnikv2.testnet` | Sputnik DAO factory (not ours) | https://testnet.nearblocks.io/address/sputnikv2.testnet |
| testnet | TBD-post-build:dao-account | the demo DAO (Sputnik 2.3.1, bond 0, 3-member council) | TBD-post-build:dao-explorer-url |
| testnet | TBD-post-build:desk-account | the Fiador desk contract (keyless) | TBD-post-build:desk-explorer-url |

`deployments/testnet.json` holds the same ids; `verify` and the board read them from there.

## How it works

- **The seat.** The DAO policy has a `desk` role whose only member is the desk account, with exactly two permissions: `transfer:AddProposal` and `transfer:VoteApprove`, and a vote policy of 1 for transfers. Nobody else outside the council can add proposals. The council (3 accounts) needs 2 approvals for every proposal kind.
- **Standing.** Each member has a standing (a credit limit in NEAR), admitted by the council through an ordinary `FunctionCall` proposal to the desk's `admit_member`. Unused standing is standing minus what the member has drawn and minus what they have pledged for others.
- **Three lanes.**
  - Standing lane: `ask(amount)` within unused standing and the book cap. The desk reserves the standing and book room first, files a `Transfer` proposal on the DAO (attaching exactly the policy bond), and then votes to approve only the proposal id its own `add_proposal` call returned. The desk's single vote passes, and the DAO pays the borrower directly.
  - Co-signed lane: an ask above unused standing is held as a request ("needs N co-signed") that expires after a DAO-set window. One member covers the whole gap with `cosign(borrower, max_pledge)`, and the loan is filed and approved inside that co-signer's transaction. The pledge stays locked until repayment.
  - Council lane: `ask_council(amount)` files the proposal without voting; the council votes it 2-of-3; anyone then calls `sync_loan` and the desk tracks it as a loan.
- **Repayment.** `repay(loan_id)` with exactly the principal attached forwards the NEAR to the DAO in the same transaction chain. Settlement is by the timestamp of that call: on time, the borrower's standing grows by min(step, principal) and the co-signer's by min(step, pledge), capped at the maximum; after the term but within grace, the loan closes with no gain and no slash; after the grace period, the money still returns but the loan counts as defaulted.
- **Default.** After term plus grace, anyone can call `mark_default`. The desk first reads the proposal back from Sputnik and only slashes if the payout shows `Approved`: the borrower's standing goes to 0 and the co-signer loses exactly what they pledged.
- **Governed by the multisig it sits on.** The council seats the desk, admits members, sets every parameter (starter and maximum standing, growth step, book cap, term, grace, request window, visitor line) and can unseat the desk, all through ordinary Sputnik proposals; the desk accepts those calls only from the DAO account. After the council unseats it, the next ask fails inside Sputnik with `ERR_PERMISSION_DENIED`.
- **Visitor line.** So anyone can try it without a council vote, the desk runs a small capped line of visitor seats: a visitor attaches a 0.05 NEAR storage deposit (refunded when the seat is recycled), starts at 0.1 NEAR standing, takes at most 3 loans and cannot co-sign or use the council lane. Seats recycle after 30 minutes when nothing is open.
- **No custody, no indexer.** The desk never holds loan funds. The board and `verify` read paginated public views.

## Security notes

- Unaudited hackathon code on testnet. Do not use it with real funds.
- The desk is the security-sensitive part: one routine (`file_transfer`) is the only code that writes to Sputnik, and the desk votes only on the proposal id returned by its own `add_proposal` call. Every reservation is made before any cross-contract call, and every callback either commits or rolls back exactly; unit tests fail each step of that chain and check the rollback.
- Keyless freeze: after the demo story run, every access key on the desk account was deleted. The desk has no owner and no upgrade path; its only admin is the DAO, through proposals. `npm run verify` checks that the desk has zero access keys.
- The factory's auto-upgrade of the demo DAO was switched off by a council proposal, so the DAO's code and JSON shapes cannot change under the desk.
- The demo council is three scripted accounts sharing one operator key. It demonstrates the on-chain 2-of-3 mechanism; it is not three independent people.
- Refusals are panics, so the runtime refunds any attached NEAR (wrong repayment amount, inactive loan, wrong visitor deposit).

## Build & test

- Contract: Rust 1.99.0 (pinned in `rust-toolchain.toml`), `near-sdk` 5.30.1, built for `wasm32-unknown-unknown` with `--cfg near` (set in `.cargo/config.toml`). Do `npm run cargo -- test --manifest-path contract/desk/Cargo.toml` for the 96 unit tests and `npm run wasm -- desk` to rebuild `contract/res/fiador_desk.wasm`. `tools/cargo.ts` puts MSYS2's mingw64 tools on PATH and sets `AWS_LC_SYS_PREBUILT_NASM=1` on Windows.
- TypeScript: do `npm run check` (strict `tsc`, then every vitest suite) and `npm run web:check` (web tests, then the production build of `/` and `/app/` into `dist/`).

### Libraries and tools

`near-sdk` 5.30.1 (Rust), `near-api-js` 7.5.3, React 19.3, Vite 8.3, vitest 5.1, tsx 4.23, TypeScript 5.9. The Sputnik DAO v2 contract and factory are used as deployed on testnet. Code was written with Claude Code.

## Deploy

Testnet only. The scripts read env vars from a git-ignored `.env` (names in `.env.example`; values are never committed): `FIADOR_ROOT`, `FIADOR_ROOT_KEY`, `FIADOR_RPC`, `FIADOR_DAO_NAME`, `FIADOR_FAUCET_URL`.

1. `npm run root -- create <name>`, then `npm run root -- topup --count 2` until `npm run root -- check` prints `ROOT OK` (about 21 NEAR).
2. `npm run smoke` creates the DAO with the final policy and proves the seat can file and approve alone.
3. `npm run seed -- --desk desk.<root>` deploys and initialises the desk in one transaction, switches off factory upgrades, swaps the seat to the desk, sends the loan float and writes `deployments/testnet.json`.
4. `npm run story -- --run 1` runs the scripted story; `npm run story:check -- --run 1` checks it.
5. `npm run freeze -- --yes` deletes the desk's keys (permanent), then runs `verify`.

A fix after the freeze is a new desk: `npm run seed -- --desk desk2.<root>` deploys it and the council votes the seat over.

## Roadmap

Known limitations:

- The demo council is scripted (three accounts, one operator key).
- Testnet only.
- Unaudited.
- The keyless freeze is permanent: the deployed desk can never be patched, only replaced by a new desk the council seats.
- No minimum loan: a member could create many tiny loans and bloat storage (the desk's and the DAO's; visitors are capped at 3 loans per seat).
- One co-signer per request in this version.
- Sputnik pays out in a detached step, so a payout can read `Approved` for a block or two before a failing transfer turns it `Failed`; a repayment in that window is accepted. `sync_loan` voids such a loan afterwards.

Next: amounts in NEP-141 stablecoins, several co-signers per request, and a Trezu custom template that files `ask` from Trezu's UI.

## License

MIT, see `LICENSE`.
```

- [ ] **Step 2: Run the gate**

Run: `powershell -NoProfile -ExecutionPolicy Bypass -File tools/readme-check.ps1`
Expected: PASS — prints `PASS`

- [ ] **Step 3: Commit (kernel-performed — no agent runs this)**
Message: `docs(readme): add the visitor flow step`

---

### Task 95: README: note the wallet actions (only if they ship)

**Files:**
- Modify: `README.md`

**Depends on:** Task 93, Task 94
**Effort:** low
**Requires:** `README.md with the visitor Quickstart step`, `web/src/wallet: actions.ts (askCall, cosignCall, cancelCall, repayCall), wallet.ts (MyNearWallet via NEAR Wallet Selector 10.1.4), MemberActions.tsx rendered under the board`
**Provides:** `README.md with the wallet note`

Context: same schema and headings; adds the optional wallet paragraph to the Quickstart and NEAR Wallet Selector to the library list. Drop this task if Task 93 is dropped.

- [ ] **Step 1: Replace `README.md` with exactly this**

`README.md`:
```markdown
<!-- readme-schema: R2-contract-protocol v1 -->
# Fiador

A credit union seat for Sputnik DAOs: members borrow treasury NEAR within a limit earned by on-time repayment.

## Demo

- Demo video: TBD-post-build:demo-video-url
- Live board (read-only, no wallet): TBD-post-build:hosted-board-url
- Screenshot of the board: TBD-post-build:board-screenshot

## What it does

A community that keeps its money in a Sputnik DAO can only give it away: every payment out is a one-way payout, so a member who needs a short float has to ask the whole council for a grant or go without. Fiador adds a credit desk to the DAO. The desk is one contract holding one narrow seat in the DAO's own policy, and it lends treasury NEAR to members as native Sputnik Transfer proposals. A loan within a member's standing is filed and approved at once; a larger one is held until another member co-signs the gap with their own standing; anything bigger goes to an ordinary 2-of-3 council vote. Every repayment returns to the same treasury, on-time repayments raise standing, and defaults zero it and slash the co-signer's pledge.

## Quickstart

Needs Node 22.22.2 or newer. No wallet, no keys, no secrets.

1. Do `npm ci` - see the install finish with no errors.
2. Do `npm run verify` - see one `PASS` line per check (factory upgrades off, the desk seat holds only the desk with transfer rights only, a 2-of-3 council, the desk has no access keys, every loan matches its Sputnik proposal) and a final `VERIFY PASS (N checks, M loans)`. It reads public testnet RPC only.
3. Do `npm run web`, then open `http://localhost:5173/app/` - see the treasury, the "Waiting for a co-signer" list, the loan book with each loan's Sputnik proposal id and status, and every member's standing with the repaid loans behind it, read live from testnet. (The same board is hosted: TBD-post-build:hosted-board-url.)
4. Do `npm run visitor` - see a throwaway testnet account created from the public faucet join the visitor line, get its first ask held for a co-signer, borrow within its standing (paid by the DAO through a Sputnik proposal), repay, then `standing 0.1 -> 0.2 NEAR` and `VISITOR PASS`. Its key lives only in memory. If the public faucet or the visitor line is unavailable, it says so and exits without error; use step 2 instead.
5. Do `npm run cargo -- test --manifest-path contract/desk/Cargo.toml` (needs Rust 1.99.0; on Windows the launcher also needs MSYS2 at `C:\msys64`) - see `test result: ok. 96 passed`.

Optional: members admitted by the council can also ask, co-sign and repay from the board with a testnet wallet (MyNearWallet, via NEAR Wallet Selector). None of the steps above needs it.

If testnet RPC is unreachable, step 2 prints the RPC error; set `FIADOR_RPC` to another public testnet endpoint (https://docs.near.org/api/rpc/providers) and retry.

## Built at NEAR HACKATHON

- Event: NEAR HACKATHON (https://nearhackathon.com/), development window ending 2026-11-14 23:59 UTC.
- Track: Social Money (`social`).
- Team: one builder working with Claude Code (AI-written code, reviewed and gated by the builder).
- Built during the event: everything in this repository (created 2026-11-13), the desk contract, the scripts, the board and the landing page. The Sputnik DAO contract and factory are used as deployed on testnet (`sputnikv2.testnet`, DAO version 2.3.1), unmodified.

## Contract addresses

| Network | Account | What it is | Explorer |
|---|---|---|---|
| testnet | `sputnikv2.testnet` | Sputnik DAO factory (not ours) | https://testnet.nearblocks.io/address/sputnikv2.testnet |
| testnet | TBD-post-build:dao-account | the demo DAO (Sputnik 2.3.1, bond 0, 3-member council) | TBD-post-build:dao-explorer-url |
| testnet | TBD-post-build:desk-account | the Fiador desk contract (keyless) | TBD-post-build:desk-explorer-url |

`deployments/testnet.json` holds the same ids; `verify` and the board read them from there.

## How it works

- **The seat.** The DAO policy has a `desk` role whose only member is the desk account, with exactly two permissions: `transfer:AddProposal` and `transfer:VoteApprove`, and a vote policy of 1 for transfers. Nobody else outside the council can add proposals. The council (3 accounts) needs 2 approvals for every proposal kind.
- **Standing.** Each member has a standing (a credit limit in NEAR), admitted by the council through an ordinary `FunctionCall` proposal to the desk's `admit_member`. Unused standing is standing minus what the member has drawn and minus what they have pledged for others.
- **Three lanes.**
  - Standing lane: `ask(amount)` within unused standing and the book cap. The desk reserves the standing and book room first, files a `Transfer` proposal on the DAO (attaching exactly the policy bond), and then votes to approve only the proposal id its own `add_proposal` call returned. The desk's single vote passes, and the DAO pays the borrower directly.
  - Co-signed lane: an ask above unused standing is held as a request ("needs N co-signed") that expires after a DAO-set window. One member covers the whole gap with `cosign(borrower, max_pledge)`, and the loan is filed and approved inside that co-signer's transaction. The pledge stays locked until repayment.
  - Council lane: `ask_council(amount)` files the proposal without voting; the council votes it 2-of-3; anyone then calls `sync_loan` and the desk tracks it as a loan.
- **Repayment.** `repay(loan_id)` with exactly the principal attached forwards the NEAR to the DAO in the same transaction chain. Settlement is by the timestamp of that call: on time, the borrower's standing grows by min(step, principal) and the co-signer's by min(step, pledge), capped at the maximum; after the term but within grace, the loan closes with no gain and no slash; after the grace period, the money still returns but the loan counts as defaulted.
- **Default.** After term plus grace, anyone can call `mark_default`. The desk first reads the proposal back from Sputnik and only slashes if the payout shows `Approved`: the borrower's standing goes to 0 and the co-signer loses exactly what they pledged.
- **Governed by the multisig it sits on.** The council seats the desk, admits members, sets every parameter (starter and maximum standing, growth step, book cap, term, grace, request window, visitor line) and can unseat the desk, all through ordinary Sputnik proposals; the desk accepts those calls only from the DAO account. After the council unseats it, the next ask fails inside Sputnik with `ERR_PERMISSION_DENIED`.
- **Visitor line.** So anyone can try it without a council vote, the desk runs a small capped line of visitor seats: a visitor attaches a 0.05 NEAR storage deposit (refunded when the seat is recycled), starts at 0.1 NEAR standing, takes at most 3 loans and cannot co-sign or use the council lane. Seats recycle after 30 minutes when nothing is open.
- **No custody, no indexer.** The desk never holds loan funds. The board and `verify` read paginated public views.

## Security notes

- Unaudited hackathon code on testnet. Do not use it with real funds.
- The desk is the security-sensitive part: one routine (`file_transfer`) is the only code that writes to Sputnik, and the desk votes only on the proposal id returned by its own `add_proposal` call. Every reservation is made before any cross-contract call, and every callback either commits or rolls back exactly; unit tests fail each step of that chain and check the rollback.
- Keyless freeze: after the demo story run, every access key on the desk account was deleted. The desk has no owner and no upgrade path; its only admin is the DAO, through proposals. `npm run verify` checks that the desk has zero access keys.
- The factory's auto-upgrade of the demo DAO was switched off by a council proposal, so the DAO's code and JSON shapes cannot change under the desk.
- The demo council is three scripted accounts sharing one operator key. It demonstrates the on-chain 2-of-3 mechanism; it is not three independent people.
- Refusals are panics, so the runtime refunds any attached NEAR (wrong repayment amount, inactive loan, wrong visitor deposit).

## Build & test

- Contract: Rust 1.99.0 (pinned in `rust-toolchain.toml`), `near-sdk` 5.30.1, built for `wasm32-unknown-unknown` with `--cfg near` (set in `.cargo/config.toml`). Do `npm run cargo -- test --manifest-path contract/desk/Cargo.toml` for the 96 unit tests and `npm run wasm -- desk` to rebuild `contract/res/fiador_desk.wasm`. `tools/cargo.ts` puts MSYS2's mingw64 tools on PATH and sets `AWS_LC_SYS_PREBUILT_NASM=1` on Windows.
- TypeScript: do `npm run check` (strict `tsc`, then every vitest suite) and `npm run web:check` (web tests, then the production build of `/` and `/app/` into `dist/`).

### Libraries and tools

`near-sdk` 5.30.1 (Rust), `near-api-js` 7.5.3, NEAR Wallet Selector 10.1.4 (`@near-wallet-selector/core`, `@near-wallet-selector/my-near-wallet`) with `@near-js/transactions` 2.5.1, React 19.3, Vite 8.3, vitest 5.1, tsx 4.23, TypeScript 5.9. The Sputnik DAO v2 contract and factory are used as deployed on testnet. Code was written with Claude Code.

## Deploy

Testnet only. The scripts read env vars from a git-ignored `.env` (names in `.env.example`; values are never committed): `FIADOR_ROOT`, `FIADOR_ROOT_KEY`, `FIADOR_RPC`, `FIADOR_DAO_NAME`, `FIADOR_FAUCET_URL`.

1. `npm run root -- create <name>`, then `npm run root -- topup --count 2` until `npm run root -- check` prints `ROOT OK` (about 21 NEAR).
2. `npm run smoke` creates the DAO with the final policy and proves the seat can file and approve alone.
3. `npm run seed -- --desk desk.<root>` deploys and initialises the desk in one transaction, switches off factory upgrades, swaps the seat to the desk, sends the loan float and writes `deployments/testnet.json`.
4. `npm run story -- --run 1` runs the scripted story; `npm run story:check -- --run 1` checks it.
5. `npm run freeze -- --yes` deletes the desk's keys (permanent), then runs `verify`.

A fix after the freeze is a new desk: `npm run seed -- --desk desk2.<root>` deploys it and the council votes the seat over.

## Roadmap

Known limitations:

- The demo council is scripted (three accounts, one operator key).
- Testnet only.
- Unaudited.
- The keyless freeze is permanent: the deployed desk can never be patched, only replaced by a new desk the council seats.
- No minimum loan: a member could create many tiny loans and bloat storage (the desk's and the DAO's; visitors are capped at 3 loans per seat).
- One co-signer per request in this version.
- Sputnik pays out in a detached step, so a payout can read `Approved` for a block or two before a failing transfer turns it `Failed`; a repayment in that window is accepted. `sync_loan` voids such a loan afterwards.

Next: amounts in NEP-141 stablecoins, several co-signers per request, and a Trezu custom template that files `ask` from Trezu's UI.

## License

MIT, see `LICENSE`.
```

- [ ] **Step 2: Run the gate**

Run: `powershell -NoProfile -ExecutionPolicy Bypass -File tools/readme-check.ps1`
Expected: PASS — prints `PASS`

- [ ] **Step 3: Commit (kernel-performed — no agent runs this)**
Message: `docs(readme): note the wallet actions`

---
