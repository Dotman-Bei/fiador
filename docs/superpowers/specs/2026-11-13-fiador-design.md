# Fiador — design spec

> Approved design for the NEAR HACKATHON build. Source brief: `docs/idea-forge/2026-11-13-good-standing-brief.md`
> (the brief keeps its provisional title "Good Standing"; the product is **Fiador**). This spec is the single
> source of truth for every plan under `docs/superpowers/plans/`. On any conflict between a plan and this file,
> this file wins.

## 0. Header (constraints, verbatim from the architect kickoff)

- **Target platform:** NEAR testnet only, on the Sputnik DAO factory `sputnikv2.testnet`.
- **Language / runtime:** one Rust contract (near-sdk; toolchain pinned and probed first: the build machine is
  Windows with rustc 1.99.0, no wasm32-unknown-unknown target, no cargo-near, no WSL, no Docker). TypeScript
  strict + ESM on Node >= 20 (machine has v22.23.4) for scripts and a React web app. No backend service and no
  indexer: the UI reads public RPC views. Follow `docs/design/frontend-contract.md`.
- **Hard deadline:** 2026-11-14 23:59 UTC = 2026-11-15 00:59 WAT. Team = solo + AI. Latest acceptable submission
  target (guide): 2026-11-14 18:00 UTC.
- **Tracks:** `social` (primary). `security` is an optional secondary tag that must not shape scope.
- **Must land the demo money shot.** AI screeners (Claude Code and Codex) must be able to run the project from the
  README's "do X - see Y" steps with no secrets and no human wallet: a public read-only board over a seeded
  testnet DAO, a read-only verify command, and a scripted flow.
- **No secrets in the repo**, env-var names only.
- **Sputnik specifics:** the proposal bond must equal the policy's bond exactly; `act_proposal` echoes the proposal
  kind; JSON shapes come from the live 2.3.1 testnet contract, not from `main`.
- **Out of scope:** mainnet; any dependence on hosted Trezu; Agent Market, near.social writes, nearaccounts TLA
  names and NEAR Intents on the demo path; a new multisig or any custody in our contract; a bounty board, payouts
  for work, spending budgets or allowances; interest-rate models, collateral, liquidations, NEP-141 loans;
  off-chain scoring, ML, AI agents, KYC; a token, NFT badges, cross-DAO reputation; an installer wizard for
  arbitrary DAOs; a Sputnik fork; visual design in the plans.
- **Calendar (guide's call, 2026-11-13 12:59 UTC):** build ≈ 4.5 h orchestrator time; Design pass 1.5 h; demo
  1.25 h; closing 0.75 h. Cut order is real: desk contract, seeded DAO, board and verify first; the faucet visitor
  flow and the wallet-connected `/app` actions last, as independent droppable tasks.

## 1. Design decisions (question → answer → source)

| # | Question | Answer | Source |
|---|---|---|---|
| D1 | How does co-signing work? | **Ask first.** Ada asks; if it exceeds her unused standing the desk **holds the request** ("needs N co-signed"). A co-signer's single `cosign` call covers the whole gap; the desk files and approves the transfer inside the co-signer's transaction. | User, 2026-11-13 |
| D2 | Request rules | One open request per borrower; expiry is a DAO parameter (`request_ttl_sec`, minutes on the demo DAO); bounded storage; `cancel_request`. No pledge exists until the co-sign, so an expired or cancelled request has nothing to unlock. | User |
| D3 | Several co-signers per request? | **No — one co-signer per request in v1** (several would leave partial pledges on expiring requests, breaking D2). The README says so plainly. | Architect under the user's condition 3 |
| D4 | **Refinement of the brief's money-shot wording** | The brief says "the desk refuses". This spec refines it to **"the desk holds the request: needs 2 co-signed"**. Approved by the user on 2026-11-13. The brief file is not edited. | User |
| D5 | Where does membership live? | **In the desk.** `admit_member`, `remove_member`, `set_params` accept calls only when the predecessor is the DAO account stored at init. The council uses ordinary Sputnik `FunctionCall` proposals. No owner, no other admin. | User |
| D6 | Visitor line | Self-serve, capped; visitors attach a storage deposit; seats recycle (expire after a window or free up when nothing is open); if full, the README says so and points at `verify`. | User |
| D7 | Proving "no other admin" | A final human-gated **keyless freeze** deletes every access key on the desk account after the story run passes. `verify` checks the desk has zero access keys; the README states the freeze. Until then the deploy key lives in the git-ignored `.env`. | User |
| D8 | Views | Paginated views for members, standing, requests and the loan book; no indexer. | User |
| D9 | How does standing move? | Borrower `+min(growth_step, principal)`, co-signer `+min(growth_step, pledge)`, both capped at `max_standing`, on an on-time repayment. | User |
| D10 | Late repayment (deterministic, by the timestamp of the `repay` call) | `now ≤ due_at` → on time (growth). `due_at < now ≤ due_at + grace` → closes with no gain and no slash. `now > due_at + grace` → the money still returns to the treasury but the loan settles as **defaulted** at that moment (borrower standing → 0, co-signer slashed by exactly the pledge). `mark_default` closes loans never repaid. | User |
| D11 | Smoke DAO = demo DAO | The smoke test creates the real demo DAO with the final policy and the smoke contract seated in the `desk` role. The DAO keeps only its creation leftover (~0.59 NEAR) during the smoke test; the real loan float is sent at seed time after the seat swap. Only the smoke contract's own account can call `file_and_approve`. Fallback DAO name `fiador-v2` (`FIADOR_DAO_NAME`). | User |
| D12 | Re-seeding | `seed --desk <account>`: a post-freeze fix is a re-seed with a new desk account plus a council vote. Freeze only after every view the board, `verify` and the demo need exists. | User |
| D13 | Council | **3 members, 2 approvals pass, for every proposal kind.** The default vote policy is `{"weight_kind":"RoleWeight","quorum":"2","threshold":"2"}`, so removing a member never lowers the bar below 2 approvals. The smoke test verifies this live. | User |
| D14 | **Refinement of the brief's "unseats the desk with one vote"** | Becomes "**one council action needing 2 of 3 approvals**". Approved by the user. | User |
| D15 | Council honesty | The README states the demo council is three scripted accounts sharing one operator key, demonstrating the on-chain 2-of-3 mechanism, not three independent humans. | User |
| D16 | Council-lane tracking | `sync_loan(id)` (anyone, re-runnable) reads `get_proposal(id)`: Approved → Active (term starts at sync); Rejected/Removed/Expired/Moved/Failed → NotFunded; an Active loan whose proposal later reads `Failed` → Voided. | Architect, user-approved |
| D17 | `mark_default` | Allowed after term + grace; reads the proposal first: `Approved` → default; `Failed` → void. Nobody is slashed for a loan they never received. | Architect, user-approved |
| D18 | Repay | Synchronous. Exact principal; Active loans only; every refusal is a panic (the runtime refunds the attached NEAR). The extra proposal read was cut (cost > a few lines); the unsynced failed-payout window of a block or two is accepted and listed in the README Roadmap. | User |
| D19 | Approach for the async core | **Reserve, then file.** All reservations happen before any cross-contract call; callbacks commit or roll back exactly. | User approved Section 1 |
| D20 | Funding | All amounts are parameters; `seed` scales the float and persona funding to the root's actual balance; minimum viable budget ≈ 21 NEAR; the preflight may claim the faucet for several throwaway accounts and consolidate into the root. | User |
| D21 | Story re-runs | `story --run <id>` creates fresh personas per run; the first run's history stays on the board as permanent proof. | User |
| D22 | Linux CI fallback | Written in the smoke plan (Appendix A), applied only if the local wasm build fails. | User |
| D23 | Funds held by the desk | Every path where the desk holds a caller's NEAR (repay, visitor deposit) refunds in every failure branch, with a test per branch. | User |
| D24 | Ask-chain tests | Unit tests cover each step of the ask chain failing, with the reservation rolled back exactly. | User |
| D25 | Book cap | An ask that fits standing but not the book cap panics `ERR_BOOK_FULL` (suggest `ask_council`); never a held request. | User |
| D26 | Self co-sign | The co-signer must not be the borrower. | User |
| D27 | Vote failure | A standing or co-signed loan whose `act_proposal` vote fails becomes a **council-lane loan** with every reservation (pledge, drawn, book) released; `sync_loan` is tested on that path. | User |
| D28 | Gas | Gas numbers are estimates. The smoke test measures the real add_proposal → act_proposal chain; the desk constants carry ≥ 30% headroom over the measurement (a unit test enforces it). Scripts and the board attach 300 Tgas. | User |
| D29 | README | Own plan, sequenced right after the board, not droppable. Quickstart = screener path: `verify`, the board, `visitor`. Roadmap lists known limitations: scripted council, testnet only, unaudited, permanent keyless freeze, no minimum loan (a member could bloat storage), the unsynced failed-payout window. The tail plan updates it. | User |
| D30 | Factory upgrades | Seed files `FactoryInfoUpdate { auto_update: false }` (shape verified live on `harvestpool-community-garden.sputnikv2.testnet` proposal 0, status Approved): `{"FactoryInfoUpdate":{"factory_info":{"factory_id":"sputnikv2.testnet","auto_update":false}}}`. `get_factory_info` exists on 2.3.1. | User |
| D31 | Human-gate batching | At most three build-time pauses: (1) preflight: create and fund the root, then `npm run smoke`; (2) `npm run seed`; (3) `npm run story`, then `visitor` (if built), then `freeze`. | User |
| D32 | Manifest discipline | After the smoke slice is pushed, the manifest is append-only: later plans may add tasks and require smoke Provides, but never change a smoke task's id, files, gate or provides. A signature change is a new task. | User |

Settled by the architect (the user may object; each is final unless changed here):
ask amounts are exact yocto with no minimum loan; `repay` and `join_visitor_line` require the exact attached
amount; anyone may repay on a borrower's behalf; council loans count toward `book` but never against the cap;
a `Refused` filing stays as a history row; events are plain log lines (the board reads views only); explorer
links go to `testnet.nearblocks.io`; visitors cannot co-sign and cannot use `ask_council`; each visitor seat takes
at most 3 loans.

## 2. Live facts this design rests on (verified 2026-11-13)

- Testnet: protocol version 88, neard 2.14.1 (`status` on `rpc.testnet.fastnear.com` and `rpc.testnet.near.org`).
  cargo-near lifts its rustc 1.86 ceiling at protocol ≥ 84 ("the nearcore 2.12 VM accepts rustc 1.87+ opcodes").
- near-sdk 5.30.1 (2026-11-05), MSRV 1.95. **near-sdk ≥ 5.27 requires `--cfg near`** to use on-chain host functions;
  a build without it uses pure-Rust fallbacks that are "not for on-chain use". The build sets it in
  `.cargo/config.toml`.
- Host unit tests on this machine need `C:\msys64\mingw64\bin` on PATH (dlltool + as + gcc for `getrandom` and
  `cmake`) and `AWS_LC_SYS_PREBUILT_NASM=1` (near-crypto 0.38 pulls `aws-lc-sys`; NASM is absent). Probed in a
  scratch crate: `test result: ok` after 2m25s cold. `tools/cargo.ts` sets both.
- near-sandbox ships for macOS ARM64 and Linux x86 only: no local sandbox on Windows. Integration happens in the
  gated live runs.
- near-api-js 7.5.3 (`engines.node >= 22.22.2`): `new Account(id, provider, signer)`,
  `new JsonRpcProvider({ url })`, `KeyPairSigner.fromSecretKey(key)`, `KeyPair.fromRandom('ed25519')`,
  `account.signAndSendTransaction({ receiverId, actions, throwOnFailure })` (default wait `EXECUTED_OPTIMISTIC`),
  `account.createSubAccount({ accountOrPrefix, publicKey, nearToTransfer })`, `account.deleteAccount(beneficiary)`,
  `actions.functionCall(method, args, gas, deposit)`, `actions.deployContract(code)`, `actions.deleteKey(pk)`.
- Faucet helper (what near-cli-rs' `sponsor-by-faucet-service` calls on testnet):
  `POST https://helper.nearprotocol.com/account` with JSON `{"newAccountId","newAccountPublicKey"}`; reachable
  (405 on GET). The amount it grants is unverified.
- Live 2.3.1 shapes:
  - Transfer kind: `{"Transfer":{"token_id":"","receiver_id":"bob.testnet","amount":"1000000000000000000000000","msg":null}}`
  - Proposal: `{"id":0,"proposer":"…","description":"…","kind":{…},"status":"Approved","vote_counts":{"council":[2,0,0]},"votes":{"a.testnet":"Approve"},"submission_time":"1794515258987148509"}`
  - Policy with custom roles and `"threshold":[1,2]` / `"threshold":"1"` forms; `proposal_bond` is a yocto string.
  - `get_factory_info` → `{"factory_id":"sputnikv2.testnet","auto_update":false}`.
- Names free on 2026-11-13: `fiador.sputnikv2.testnet`, `fiador.testnet`.

## 3. Architecture

```
            ┌────────────── Sputnik DAO fiador.sputnikv2.testnet (2.3.1) ──────────────┐
 council-1 ─┤ role council: Group[c1,c2,c3], "*:*", default vote policy quorum 2 / thr 2 │
 council-2 ─┤ role desk:    Group[desk],  transfer:AddProposal + transfer:VoteApprove,   │
 council-3 ─┤               vote_policy.transfer = quorum 0 / threshold 1               │
            │ treasury (loan float)  ── Transfer proposals pay borrowers directly ──►  borrower
            └───────▲───────────────────────────────────────────────▲──────────────────┘
       add_proposal │ act_proposal(VoteApprove, kind echoed)        │ repay forwarded (same tx chain)
            ┌───────┴───────────────────────────────────────────────┴──────┐
            │ Fiador desk (contract/desk, near-sdk 5.30.1, keyless after   │
            │ freeze): members, standing, requests, loan book, params       │
            └───────▲─────────────────────▲──────────────────▲──────────────┘
                    │ views (RPC)          │ calls (300 Tgas)  │ FunctionCall proposals (DAO only)
   web/ board /app + landing /     scripts/ smoke seed story verify visitor freeze
```

### Repository layout

| Path | Responsibility |
|---|---|
| `package.json`, `tsconfig.json`, `vitest.config.ts` | one npm package, strict TS, ESM |
| `rust-toolchain.toml` | `channel = "1.99.0"`, `targets = ["wasm32-unknown-unknown"]`, `profile = "minimal"` |
| `.cargo/config.toml` | `[target.wasm32-unknown-unknown] rustflags = ["--cfg","near","-C","link-arg=-s"]` |
| `tools/cargo.ts`, `tools/cargo-env.ts` | cargo launcher (Windows: MSYS2 on PATH + prebuilt NASM) |
| `tools/wasm-build.ts`, `tools/wasm-check.ts` | build a crate's wasm into `contract/res/`; check exports + `env` imports |
| `contract/smoke/` | `fiador_smoke` crate (throwaway) |
| `contract/desk/` | `fiador_desk` crate (the product) |
| `contract/res/*.wasm` | committed build outputs |
| `src/lib/` | shared TS: `encoding.ts`, `units.ts`, `rpc.ts`, `sputnik.ts` (frozen in the smoke slice), later `desk.ts`, `deployments.ts` |
| `scripts/lib/` | `env.ts`, `near.ts`, `faucet.ts`, `gas.ts` (smoke slice), later council/desk helpers |
| `scripts/*.ts` | `root.ts`, `smoke.ts`, `smoke-check.ts` (smoke slice); `seed.ts`, `story.ts`, `story-check.ts`, `verify.ts`, `freeze.ts`, `visitor.ts` |
| `deployments/` | public ids and records written by the gated runs (`smoke.json`, `smoke-gas.json`, `testnet.json`, `story-<run>.json`) |
| `web/` | Vite + React multi-page app: `web/index.html` (landing `/`), `web/app/index.html` (board `/app`) |
| `README.md`, `LICENSE` | README schema R2-contract-protocol v1; MIT |

### Accounts and secrets

- One faucet-funded **root** account (`FIADOR_ROOT`, a `.testnet` name chosen at the gate). Every other account is
  a sub-account created by the root **with the root's public key**, so the only secret is `FIADOR_ROOT_KEY`
  (an `ed25519:` secret key) in the git-ignored `.env`.
- Sub-accounts: `smoke.<root>`, `desk.<root>`, `council-1.<root>`, `council-2.<root>`, `council-3.<root>`, and per
  story run `ada-<run>.<root>`, `bayo-<run>.<root>`, `chidi-<run>.<root>`.
- DAO: `<FIADOR_DAO_NAME>.sputnikv2.testnet`, default name `fiador`, fallback `fiador-v2`.
- Env var names (values never committed): `FIADOR_ROOT`, `FIADOR_ROOT_KEY`, `FIADOR_RPC` (default
  `https://rpc.testnet.fastnear.com`), `FIADOR_DAO_NAME` (default `fiador`), `FIADOR_MINGW_BIN` (default
  `C:\msys64\mingw64\bin`), `FIADOR_FAUCET_URL` (default `https://helper.nearprotocol.com/account`).
- Screeners need none of these: `verify` and the board read `deployments/testnet.json` and public RPC; `visitor`
  makes its own throwaway key in memory.

### Budget (all amounts are script parameters)

| Item | NEAR |
|---|---|
| DAO creation deposit (`create`, attached) | 6 |
| smoke sub-account (contract storage) | 2 |
| council-1..3 (gas) | 0.5 each |
| desk sub-account (contract storage + records) | 3.5 |
| loan float sent to the DAO at seed | 8 minimum, 12 default |
| personas per story run (gas) | 0.5 each |
| **Minimum viable total** | **≈ 21** (seed refuses below its own share) |

## 4. The desk contract (`contract/desk`, crate `fiador_desk`)

### 4.1 State

```rust
pub struct Desk {
    dao: AccountId,                              // fixed at init; the only admin
    params: Params,
    members: IterableMap<AccountId, Member>,
    loans: Vector<Loan>,                          // loan id = index
    requests: IterableMap<AccountId, Request>,    // at most one per borrower
    book: u128,                                   // reserved + outstanding principal
}
pub struct Params {
    starter_standing: U128, max_standing: U128, growth_step: U128, book_cap: U128,
    loan_term_sec: u64, grace_sec: u64, request_ttl_sec: u64,
    visitor_slots: u32, visitor_starter: U128, visitor_window_sec: u64, visitor_deposit: U128,
    proposal_bond: U128,                          // must equal the DAO policy's bond (0 on the demo DAO)
}
pub struct Member {
    standing: u128, drawn: u128, pledged: u128, open_loans: u32,   // open_loans counts non-terminal loans, all lanes
    visitor: Option<Seat>, repaid_on_time: u32, defaults: u32,
}
pub struct Seat { joined_at: u64, deposit: u128, loans_taken: u32 }
pub struct Request { amount: u128, created_at: u64, expires_at: u64 }
pub struct Loan {
    id: u64, borrower: AccountId, principal: u128, borrower_part: u128,
    cosigner: Option<AccountId>, pledge: u128, lane: Lane, status: LoanStatus,
    proposal_id: Option<u64>, created_at: u64, due_at: u64, closed_at: u64,
}
pub enum Lane { Standing, Cosigned, Council }
pub enum LoanStatus { Filing, Voting, AwaitingCouncil, Active, Repaid, RepaidLate, Defaulted, Refused, NotFunded, Voided }
```

`unused(m) = m.standing.saturating_sub(m.drawn + m.pledged)`. Times are nanoseconds internally
(`env::block_timestamp()`); views expose milliseconds. Parameters are seconds.

Param validation (`ERR_INVALID_PARAMS`): `starter_standing ≤ max_standing`, `visitor_starter ≤ max_standing`,
`growth_step > 0`, `loan_term_sec > 0`, `request_ttl_sec > 0`, `visitor_window_sec > 0`.

### 4.2 Methods

| Method | Caller | Behaviour |
|---|---|---|
| `new(dao, params)` `#[init]` | the deploy batch (deploy + init in one tx) | validates params |
| `set_params(params)` | DAO only (`ERR_ONLY_DAO`) | validates, replaces |
| `admit_member(account_id)` | DAO only | `ERR_ALREADY_MEMBER`; standing = `starter_standing` |
| `remove_member(account_id)` | DAO only | `ERR_NOT_MEMBER`; `ERR_MEMBER_BUSY` if `open_loans > 0`, pledged > 0 or a request is open; a removed visitor's deposit is refunded |
| `join_visitor_line()` payable | anyone | exact `visitor_deposit` (`ERR_VISITOR_DEPOSIT`); `ERR_ALREADY_MEMBER`; if occupied seats ≥ `visitor_slots`, reclaim one expired idle seat (refund its deposit to that visitor) else `ERR_VISITOR_LINE_FULL`; standing = `visitor_starter` |
| `ask(amount)` | member | `ERR_ZERO_AMOUNT`, `ERR_NOT_MEMBER`, `ERR_VISITOR_SEAT_EXPIRED`, `ERR_VISITOR_LOAN_LIMIT`, `ERR_REQUEST_OPEN` (an unexpired request exists; an expired one is dropped first). If `amount ≤ unused`: if `book + amount > book_cap` → `ERR_BOOK_FULL`; else reserve and run the core routine with `approve = true` (lane Standing). If `amount > unused`: gap = `amount − unused`; if `gap > max_standing` → `ERR_TOO_LARGE_FOR_COSIGN`; else store a Request and return `Held` |
| `cosign(borrower, max_pledge)` | non-visitor member | `ERR_SELF_COSIGN`, `ERR_VISITOR_CANNOT_COSIGN`, `ERR_NO_REQUEST`, `ERR_REQUEST_EXPIRED` (a panic cannot delete state, so an expired request is dropped by the borrower's next `ask` or `cancel_request`, and views mark it `expired`), gap recomputed now: `ERR_NO_GAP` if 0, `ERR_PLEDGE_CAP` if gap > `max_pledge`, `ERR_COSIGNER_SHORT` if gap > co-signer unused, `ERR_BOOK_FULL`; consumes the request, reserves borrower_part = borrower unused and pledge = gap, runs the core routine (lane Cosigned) |
| `cancel_request()` | borrower | `ERR_NO_REQUEST`; removes it |
| `ask_council(amount)` | non-visitor member | `ERR_ZERO_AMOUNT`, `ERR_VISITOR_NO_COUNCIL`; creates a Council-lane loan (no reservations) and runs the core routine with `approve = false` |
| `sync_loan(loan_id)` | anyone | `ERR_LOAN_NOT_FOUND`, `ERR_NO_PROPOSAL`; reads `get_proposal`, reconciles (§4.5) |
| `repay(loan_id)` payable | anyone | `ERR_LOAN_NOT_FOUND`, `ERR_LOAN_NOT_ACTIVE`, `ERR_WRONG_REPAY_AMOUNT` (attached ≠ principal); settles (§4.4), then transfers the principal to the DAO |
| `mark_default(loan_id)` | anyone | `ERR_LOAN_NOT_FOUND`, `ERR_LOAN_NOT_ACTIVE`, `ERR_NOT_OVERDUE` (now ≤ due + grace); reads `get_proposal`, reconciles (§4.5) |

`ask`, `cosign`, `ask_council` return `PromiseOrValue<AskResult>`:
`AskResult::Held { gap: U128, expires_at_ms: u64 }` or `AskResult::Loan { loan_id: u64, status: LoanStatus, proposal_id: Option<u64> }`.

### 4.3 The core routine (the security-reviewed unit)

`fn file_transfer(&mut self, loan_id: u64, approve: bool) -> Promise` is the **only** code that calls Sputnik's
write methods.

1. `add_proposal({"proposal":{"description":"fiador loan #<id>: <principal> yocto to <borrower> (<lane>)","kind":{"Transfer":{"token_id":"","receiver_id":<borrower>,"amount":<principal>}}}})`
   attaching exactly `params.proposal_bond`, static gas `GAS_ADD_PROPOSAL`, then
   `on_filed(loan_id, approve)` with `GAS_ON_FILED`.
2. `on_filed` (`#[private]`): read `env::promise_result_checked(0, 16_384)`.
   - failure or unparsable → **roll back exactly** what this loan reserved, status `Refused`, log, return `Loan`.
   - success → the proposal id is parsed from **this desk's own `add_proposal` result** and stored; it is the only
     id the desk ever votes on. If `approve`: status `Voting`, call
     `act_proposal({"id":<id>,"action":"VoteApprove","proposal":<the same Transfer kind rebuilt from the loan>})`
     with `GAS_ACT_PROPOSAL`, then `on_voted(loan_id)` with `GAS_ON_VOTED`. If not `approve` (council lane):
     status `AwaitingCouncil`, return `Loan`.
3. `on_voted` (`#[private]`): success → status `Active`, `due_at = now + loan_term_sec`; failure → release every
   reservation (drawn, pledge, book) and set lane `Council`, status `AwaitingCouncil` (D27).

Rollback releases `borrower_part` from the borrower's `drawn`, `pledge` from the co-signer's `pledged`, and
`principal` from `book` (Standing/Cosigned lanes only), and decrements a visitor's `loans_taken`.

Gas constants live in `contract/desk/src/gas.rs`; starting values are the smoke contract's proven allocations
(`GAS_ADD_PROPOSAL` 50 Tgas, `GAS_ON_FILED` 150 Tgas, `GAS_ACT_PROPOSAL` 100 Tgas, `GAS_ON_VOTED` 20 Tgas,
`GAS_GET_PROPOSAL` 20 Tgas, `GAS_ON_READ` 30 Tgas); a unit test asserts each is ≥ 1.3 × the measurement in
`deployments/smoke-gas.json` (D28).

### 4.4 Settlement (`repay`, by the timestamp of the call)

- `now ≤ due_at` → release reservations; borrower `standing = min(max, standing + min(step, principal))`,
  `repaid_on_time += 1`; co-signer `standing = min(max, standing + min(step, pledge))`; status `Repaid`.
- `due_at < now ≤ due_at + grace` → release; status `RepaidLate`.
- `now > due_at + grace` → release; borrower `standing = 0`, `defaults += 1`; co-signer
  `standing = standing.saturating_sub(pledge)`; status `Defaulted`.
- Council-lane loans (no reservations) follow the same rules; `book` is released by `principal`.
- Then `Promise::new(dao).transfer(principal)`.

### 4.5 Reconciliation (`sync_loan`, `mark_default` → `on_proposal_read(loan_id, purpose)`)

| Loan status | Proposal status | Result |
|---|---|---|
| AwaitingCouncil | Approved | Active; `due_at = now + term`; `book += principal` |
| AwaitingCouncil | Rejected / Removed / Expired / Moved / Failed | NotFunded |
| Active | Failed | Voided; release reservations and `book` |
| Active (purpose Default, now > due + grace) | Approved | Defaulted (D10 penalties); release |
| anything else | anything | no change (log) |
| read failed | — | no change (log) |

### 4.6 Views (amounts U128 strings, times ms)

`get_config() -> ConfigView { dao, params, book, member_count, loan_count, request_count }`,
`get_members(from_index: u32, limit: u32) -> Vec<MemberView>`, `get_member(account_id) -> Option<MemberView>`,
`get_loans(from_index: u64, limit: u64) -> Vec<LoanView>`, `get_loan(loan_id) -> Option<LoanView>`,
`get_requests(from_index: u32, limit: u32) -> Vec<RequestView>`. Limits are capped at 100.
`MemberView { account_id, standing, drawn, pledged, unused, visitor: Option<SeatView>, repaid_on_time, defaults }`;
`RequestView { borrower, amount, gap, expires_at_ms, expired }` (gap computed now).

### 4.7 Storage

The desk's own balance pays for member, request and loan records (the DAO attaches no deposit to admits). A
visitor's deposit (`visitor_deposit`, 0.05 NEAR on the demo DAO) is held for the seat and refunded when the seat is
reclaimed. Visitor records never exceed `visitor_slots`: a join when the line holds `visitor_slots` records must
reclaim one whose window has passed and which has no open loan, pledge or request (else `ERR_VISITOR_LINE_FULL`). Each seat takes at most `VISITOR_MAX_LOANS = 3` loans.

## 5. The DAO policy (built by `src/lib/sputnik.ts` `buildFiadorPolicy`)

```json
{
  "roles": [
    {"name":"council","kind":{"Group":["council-1.<root>","council-2.<root>","council-3.<root>"]},"permissions":["*:*"],"vote_policy":{}},
    {"name":"desk","kind":{"Group":["smoke.<root>"]},"permissions":["transfer:AddProposal","transfer:VoteApprove"],
     "vote_policy":{"transfer":{"weight_kind":"RoleWeight","quorum":"0","threshold":"1"}}}
  ],
  "default_vote_policy":{"weight_kind":"RoleWeight","quorum":"2","threshold":"2"},
  "proposal_bond":"0","proposal_period":"604800000000000",
  "bounty_bond":"1000000000000000000000000","bounty_forgiveness_period":"86400000000000"
}
```

No `Everyone` role: nobody outside the council and the seat can add a proposal, so an unseated desk gets
`ERR_PERMISSION_DENIED` from Sputnik itself. Every script reads `get_policy().proposal_bond` and attaches it
exactly; every vote first reads `get_proposal(id).kind` and echoes it in `act_proposal`.

## 6. Scripts (`scripts/`, Node 22 + tsx + near-api-js 7.5.3; all transactions attach 300 Tgas)

| Command | Pause | What it does |
|---|---|---|
| `npm run root -- create <name>` / `topup --count <n>` / `check` | 1 | create the root via the faucet helper and write `.env`; claim throwaway faucet accounts and `deleteAccount` them into the root; print `ROOT OK <id> <balance>` when ≥ 21 NEAR |
| `npm run smoke` | 1 | create council-1..3 and smoke sub-accounts; deploy + init the smoke contract; create the DAO with the final policy (6 NEAR); live 2-of-3 check on a `Vote` proposal; non-member `add_proposal` → `ERR_PERMISSION_DENIED`; smoke `file_and_approve` 0.01 NEAR → `Approved`; write `deployments/smoke.json` and `deployments/smoke-gas.json`; print `SMOKE PASS` |
| `npm run smoke:check` | 1 (gate) | read-only re-check of `deployments/smoke.json` against RPC; `SMOKE PASS` |
| `npm run seed -- --desk <acct> [--float <near>]` | 2 | create + deploy + init the desk (one batch); council actions (each 1 proposal + 2 approvals, skipped when already true): FactoryInfoUpdate auto_update false; remove every desk-role member except `<acct>`; add `<acct>` to `desk`; send the float (scaled to the root's balance, min 8, default 12) to the DAO; write `deployments/testnet.json` |
| `npm run story -- --run <id>` | 3 | create `ada/bayo/chidi-<id>`; one council FunctionCall admits them; money shot; council lane; late-within-grace; co-signed default; unseat → refused by Sputnik → re-seat; write `deployments/story-<id>.json` |
| `npm run story:check -- --run <id>` | 3 (gate) | read-only: every loan in `story-<id>.json` has its expected status and the standings match |
| `npm run visitor` | 3 (droppable) | throwaway faucet account, join, ask above standing (held) then cancel, ask within (paid), repay, print the standing rise |
| `npm run freeze` | 3 | delete every access key on the desk in one transaction, then run `verify` |
| `npm run verify` | any (read-only) | §7; prints `VERIFY PASS` / `VERIFY FAIL`, exit 0 / 1 |

Demo DAO parameters (seed defaults): starter 4 NEAR, max 10, step 1, book cap 12, term 600 s, grace 300 s,
request TTL 600 s, visitor slots 10, visitor starter 0.1 NEAR, visitor window 1800 s, visitor deposit 0.05 NEAR,
bond 0. (The live desk was seeded with term 120 s and grace 60 s; on 2026-11-14 the council raised them to 600 s
and 300 s with Sputnik proposal 16, because a browser-wallet repayment could not land inside two minutes.)

Story run (`--run <id>`, default `1`): Ada asks 6 → held "needs 2 co-signed"; Bayo co-signs 2 → 6 NEAR leaves the
treasury with no vote; Ada repays 6 → treasury restored; Ada 4→5, Bayo 4→5. Chidi `ask_council(3)` → council
2-of-3 → `sync_loan` → Active → repaid on time (4→5). Chidi asks 4 (late loan) and, with 1 left, asks 2 → held,
Ada co-signs 1 → paid; the script waits past term and repays the 4 within grace (`RepaidLate`, no change), then
waits past term + grace and calls `mark_default` on the 2 (`Defaulted`: Chidi → 0, Ada loses 1). Council unseats
the desk (2-of-3); Ada asks 1 → `Refused`, the script prints the DAO receipt's `ERR_PERMISSION_DENIED`; council
re-seats the desk. Each run loses 2 NEAR of float to the default beat.

## 7. `verify` (read-only, exit 0/1)

1. `get_factory_info().auto_update === false`.
2. The `desk` role is exactly `Group[<desk>]` with exactly `transfer:AddProposal` and `transfer:VoteApprove`, and
   no other role names the desk.
3. The council role is a Group of 3 and `default_vote_policy` is RoleWeight, quorum "2", threshold "2".
4. `desk.get_config().dao === <dao>`.
5. The desk account has **zero** access keys (keyless freeze).
6. For every loan with a `proposal_id`: `get_proposal` kind is `Transfer` with `token_id ""`, `receiver_id ===
   borrower`, `amount === principal`, and the status is consistent: Active/Repaid/RepaidLate/Defaulted ↔
   Approved; Voided ↔ Failed; NotFunded ↔ Rejected/Removed/Expired/Moved/Failed; AwaitingCouncil ↔ InProgress or
   Approved (not yet synced); Refused has no proposal.
7. `book` equals the sum of principal over Filing/Voting/Active loans (Standing/Cosigned) plus Active council
   loans; each member's `drawn` and `pledged` equal the sums over that member's open loans.

## 8. Web (`web/`, Vite multi-page, structural only per the frontend contract)

- `/app` (board, read-only, re-reads every 5 s): treasury (DAO balance + `get_available_amount`); desk (seated,
  frozen = zero keys, params); **"Waiting for a co-signer"** rows (borrower, amount, gap, time left); loan book
  (id, lane, borrower, co-signer, amount, status, time left, Sputnik proposal id + its live status); members
  (standing, unused, drawn, pledged, and the repaid loan ids behind each point). Reads `deployments/testnet.json`
  (copied into the build) and public RPC through `src/lib/rpc.ts`.
- `/` (landing): hero, problem, how it works, proof, demo-video slot, button into `/app`, footer with the repo link;
  copy drawn only from the brief and README.
- Wallet-connected actions (ask, co-sign, repay) in `/app` are the tail plan's last, droppable tasks.
- No colors, fonts, shadows or animation; the Design pass styles both pages from `docs/design/direction.md`.

## 9. README

Schema `R2-contract-protocol v1` (stamp `<!-- readme-schema: R2-contract-protocol v1 -->`), no event overlay
(none mandated). Headings: `# Fiador`, `## Demo`, `## What it does`, `## Quickstart`, `## Built at NEAR HACKATHON`,
`## Contract addresses`, `## How it works`, `## Security notes`, `## Build & test`, `## Deploy`, `## Roadmap`,
`## License`. Quickstart is the screener path ("do X - see Y"): `npm ci` → `npm run verify` → the board (hosted URL
TBD-post-build, or `npm run web`) → `npm run visitor`. Security notes: unaudited; keyless freeze; desk votes only on
its own add_proposal ids; the scripted 2-of-3 council (D15). Roadmap = the known limitations in D29. Libraries are
listed under Build & test (Q-005). `LICENSE` is MIT (Q-014).

## 10. Testing strategy

- Rust unit tests (`testing_env!` with promise results): each ask-chain step failing with exact rollback;
  each `repay` / `join_visitor_line` refusal branch; settlement at the three timings; every reconciliation row of
  §4.5 including the D27 path; DAO-only guards; views and pagination; the gas-headroom test.
- TypeScript (vitest): encoding, units, RPC client against canned responses, policy builder and kinds against the
  live 2.3.1 fixtures above, gas measurement against a canned outcome, `verify` checks against fixtures.
- Live: only the gated runs (pauses 1–3).

## 11. Plans and sequence

| # | Plan file | Task ids | Notes |
|---|---|---|---|
| 1 | `2026-11-13-fiador-smoke.md` | smoke:1–12 | first; tasks 11–12 are pause 1; Appendix A = Linux CI fallback |
| 2 | `2026-11-13-fiador-desk.md` | desk:21–31 | top tier throughout; 30 needs the live gas measurement |
| 3 | `2026-11-13-fiador-chain-scripts.md` | scripts:41–48 | 46 = pause 2 (seed); 47, 48 = pause 3 (story, freeze) |
| 4 | `2026-11-13-fiador-board.md` | board:61–62 | `/app` read-only |
| 5 | `2026-11-13-fiador-readme.md` | readme:71 | right after the board; not droppable |
| 6 | `2026-11-13-fiador-landing.md` | landing:81 | `/` |
| 7 | `2026-11-13-fiador-tail.md` | tail:91–95 | visitor flow (91, 92 = pause 3) + wallet actions (93), each droppable, with their README updates (94, 95) |

Task numbers are global across plans, so a `Depends on: Task N` reference is unambiguous.

## 12. Error handling summary

- Contract: every refusal is a named `ERR_*` panic (list in §4.2); callbacks never panic on a failed promise;
  they roll back and record a status.
- Scripts: every transaction uses `throwOnFailure: false` and inspects every receipt's failure text; a step
  that expects a failure (permission denied, refused) asserts the exact error string; any other failure stops the
  script with the receipt text.
- Board: an RPC error shows the error text in place of the block; nothing retries forever.
