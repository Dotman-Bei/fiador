# Fiador README Implementation Plan

**Goal:** The judge- and screener-facing README in schema R2-contract-protocol v1, plus the MIT LICENSE.
**Architecture:** One task, sequenced right after the board (not droppable). The README states only what the repo can show; post-build facts ride as `TBD-post-build:` lines for the closing pass.
**Tech Stack:** Markdown; the kit's README conformance check as `tools/readme-check.ps1` (Windows PowerShell 5.1).
**Source spec:** docs/superpowers/specs/2026-11-13-fiador-design.md

Conventions for every task: run every command from the repo root; the executor never runs git; no secrets anywhere (env-var names only). The code below was developed and run before planning: in the combined workspace `tsc` is clean and every vitest suite passes, and `npm run web:check` builds both pages. `[HUMAN GATE]` tasks run in the main checkout (they need the git-ignored `.env`).

---

### Task 71: README (R2-contract-protocol v1) and LICENSE

**Files:**
- Modify: `README.md`
- Create: `LICENSE`
- Create: `tools/readme-check.ps1`

**Depends on:** Task 45, Task 62
**Effort:** medium
**Requires:** `npm run verify (read-only; VERIFY PASS / VERIFY FAIL)`, `npm run seed -- --desk <account> [--float <near>]; npm run seed:check`, `npm run story -- --run <id>; npm run story:check -- --run <id>`, `npm run freeze -- --yes (deletes every desk access key, then verifies)`, `web/src/board/Board.tsx: Board({ deployment }), BoardView, WaitingTable, LoanBook, MembersTable; /app/ page (web/app/index.html + web/src/board/main.tsx)`
**Provides:** `README.md (R2-contract-protocol v1) + LICENSE (MIT) + tools/readme-check.ps1`

Context: schema `R2-contract-protocol v1` (references/readme-schemas.md in the kit; no event overlay is mandated by the NEAR HACKATHON rules). Resolved heading list, in order: `# Fiador`, `## Demo`, `## What it does`, `## Quickstart`, `## Built at NEAR HACKATHON`, `## Contract addresses`, `## How it works`, `## Security notes`, `## Build & test`, `## Deploy`, `## Roadmap`, `## License`; stamp `<!-- readme-schema: R2-contract-protocol v1 -->` on line 1. TBD lines this README carries (the Step-3 closing pass resolves them): `TBD-post-build:demo-video-url`, `TBD-post-build:hosted-board-url`, `TBD-post-build:board-screenshot`, `TBD-post-build:dao-account`, `TBD-post-build:dao-explorer-url`, `TBD-post-build:desk-account`, `TBD-post-build:desk-explorer-url`. The Quickstart is the screener path, written as "do X - see Y" steps with no secrets and no wallet. The Roadmap carries the known limitations of D29. The visitor and wallet steps are NOT here: the tail plan adds them only if those tasks ship (Tasks 94, 95). The gate is the kit's conformance check with this list, saved as a .ps1 so it runs from any shell.

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
4. Do `npm run cargo -- test --manifest-path contract/desk/Cargo.toml` (needs Rust 1.99.0; on Windows the launcher also needs MSYS2 at `C:\msys64`) - see `test result: ok. 96 passed`.

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

- [ ] **Step 2: Create the LICENSE and the conformance check**

`LICENSE`:
```
MIT License

Copyright (c) 2026 Dotman-Bei

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

`tools/readme-check.ps1`:
```powershell
# README conformance check (references/readme-schemas.md): R2-contract-protocol v1, no event overlay, Roadmap present.
# Run from the repo root: powershell -NoProfile -ExecutionPolicy Bypass -File tools/readme-check.ps1
$want = @('# Fiador','## Demo','## What it does','## Quickstart','## Built at NEAR HACKATHON','## Contract addresses','## How it works','## Security notes','## Build & test','## Deploy','## Roadmap','## License')
$stamp = '<!-- readme-schema: R2-contract-protocol v1 -->'
$lines = Get-Content README.md -Encoding UTF8
$inFence = $false
$got = foreach ($l in $lines) {
  if ($l -match '^```') { $inFence = -not $inFence }
  elseif (-not $inFence -and $l -cmatch '^#{1,2} ') { $l } }
$ok = ($got.Count -eq $want.Count)
if ($ok) { for ($i = 0; $i -lt $want.Count; $i++) { if ($got[$i] -cne $want[$i]) { $ok = $false } } }
if ($ok -and ($lines[0] -ceq $stamp)) { 'PASS' } else { 'FAIL' }
```

- [ ] **Step 3: Run the gate**

Run: `powershell -NoProfile -ExecutionPolicy Bypass -File tools/readme-check.ps1`
Expected: PASS — prints `PASS`

- [ ] **Step 4: Commit (kernel-performed — no agent runs this)**
Message: `docs: README (R2-contract-protocol v1) and MIT LICENSE`

---
