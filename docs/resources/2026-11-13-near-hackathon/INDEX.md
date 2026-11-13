# Resource pack: NEAR HACKATHON (2026-11-13)

Step 0a (resource-extractor) output for campaign `Dotman-Bei/near-hackathon-2026`. Extracted 2026-11-13 by a `claude-opus-5-5` main session.

- **Primary track:** Social Money (`social`)
- **Double-dip candidate:** Agent Economy (`agents`)
- **Hard deadline:** **2026-11-14 23:59 UTC = 2026-11-15 00:59 WAT**

idea-forge reads this pack as ground truth. Anything not here is unverified.

## The four questions, answered first

### 1. Do Sputnik DAO and Trezu work on testnet? How does a builder get a testnet account and free NEAR?

- **Sputnik DAO: yes, testnet works.** Factories verified on-chain 2026-11-13:
  - **`sputnikv2.testnet`** is current: 5,634 DAOs, `get_default_version` `[3,31]`.
  - `sputnik-v2.testnet` is legacy: its DAOs report `2.0.0`.
  - Mainnet is **`sputnik-dao.near`**: 2,148 DAOs. → sponsors/sputnik-dao.md §1
- **Trezu: production is mainnet-only.** Quote: "The production backend is mainnet-only." A testnet DAO can only be viewed by running Trezu's frontend locally with its dev mock backend (`bun run testnet:mock`; "assets and activity stay empty for testnet DAOs (no indexer)"). There is also a local Docker sandbox. A Trezu treasury *is* a Sputnik DAO, so any `*.sputnik-dao.near` DAO appears in trezu.app on mainnet. → sponsors/trezu.md §2
- **Testnet account and faucet:**
  - Create a `.testnet` account with a wallet or `near-cli-rs`.
  - Free NEAR: the built-in faucet at https://docs.near.org/getting-started/faucet and https://near-faucet.io. Testnet USDC: the Circle faucet, "20 USDC on NEAR `testnet` every 2 hours".
  - [H] Q-008: "Testnet NEAR is free (near-cli faucet, near-faucet.io)."
  - Budget for a DAO `create` (README example attaches 10 NEAR) and for the default 1 NEAR proposal bond. Trezu-style policies use bond 0.
- **Rules:** Q-010, "Testnet-only projects eligible? Yes, all tracks." Q-007: NEAR Intents has no testnet.
- **Other mainnet-only pieces:** Agent Market documents no testnet (real USD/USDC custodial balances). near.social documents mainnet only. nearaccounts TLA marketplace resale says "Intents settlement is mainnet-only", and no testnet contract IDs are published.

### 2. Which approval flows exist in Sputnik DAO and Trezu, and what must a builder add?

- **Sputnik (from source):**
  - Propose (bond) → role-scoped votes → auto-execute at threshold. Expired proposals are `Finalize`d.
  - Thresholds are set **per proposal-kind label** (`transfer`, `call`, `add_bounty`, …), as a ratio or a fixed vote count. Weight is RoleWeight or TokenWeight, with a quorum.
  - Roles are `Everyone`, `Group` or `Member(balance)`; permissions are `<label>:<action>`.
  - Native bounty lifecycle (`AddBounty` → `bounty_claim` → `bounty_done` → voted `BountyDone` payout).
  - `FunctionCall` to any contract; `Transfer` of NEAR / NEP-141.
- **Trezu (docs + live policy):**
  - Requestor / Finance / Governance roles, which map to Sputnik roles `Requestor` / `Approver` / `Admin`.
  - A separate Finance threshold and Governance threshold (vote counts), one voting duration, 24 h swap windows.
  - Custom proposal templates: JSON manifests that file `FunctionCall` proposals. Authoring needs `ChangePolicy`.
  - The bulk-payment contract is approved via a DAO `FunctionCall`.
- **Not present in either (what the track's example prompt asks to add):** amount-based tiers, auto-approval for trusted members, spending limits or allowances, and reputation derived from completed work.
- → sponsors/sputnik-dao.md §6, sponsors/trezu.md §3

### 3. Can one project enter several tracks and be judged in each?

- **Entering several: yes.** [HP] FAQ: "Select every track your project fits in the submission form. It is still one submission per project." [H]: "one or more ids… every track the project fits."
- **Judged or awarded in each: NOT STATED anywhere (gap).** Only the organizers (Discord / Telegram) can answer; asking is the user's call.
- Field data: 62 of 95 Social entries tick 3 or more tracks; one ticks all 13. → event.md §7, prior-art.md §1

### 4. Exact submission requirements, and what Q-000..Q-017 say about repo, demo, X post, mainnet vs testnet, license and prior code

- All 18 rules are quoted verbatim, the form fields with constraints are listed, and the rules are summarized by topic. → **event.md §3–§4**
- In short:
  - Public repo by the deadline, staying public through judging (Q-014). Each repo can be submitted only once.
  - README with "do X - see Y" steps for AI screeners (Q-017).
  - An X post saying it was built at NEAR HACKATHON, tagging @NEARProtocol and #NEARHackathon, with a video. Screenshots are not enough for a local-only demo (Q-012).
  - Testnet OK (Q-010). Mainnet payout account required in the form.
  - Any license, MIT fine, plus a LICENSE file (Q-014).
  - Code from 2026-10-19 onward counts; earlier is baseline (Q-001). Separate prior work with a branch or tags (Q-003). Disclose libraries and other-chain products (Q-002, Q-005).
  - One submission per project; fix mistakes via request-changes, never resubmit. The hidden `website` field is a spam trap.

### Judging

**No criteria weights are published.** Quoted instead (event.md §5):
- The FAQ line naming previous editions' criteria: "technical implementation, design, impact, originality and sustainability".
- The line that Claude Code & Codex screen first: "they check that it runs and does what the README says. The human judges above make the decisions."

## Contents

| File | What it holds |
|---|---|
| [event.md](event.md) | Dates/deadline (UTC + WAT), eligibility, Q-000..Q-017 verbatim, submission form fields, judging (none published + verbatim lines), judges, prizes, multi-track rule |
| [tracks.md](tracks.md) | All 13 tracks with form ids, verbatim "Build" line, hints, start-here links, prize, minimum bar (none mandatory, Q-011), live entry counts, Social example prompt verbatim |
| [sponsors/sputnik-dao.md](sponsors/sputnik-dao.md) | Factories (testnet/mainnet, RPC-verified), DAO creation, all 17 proposal kinds + policy labels, exact entry-point signatures, policy types, gotchas, approval-flow gap analysis |
| [sponsors/trezu.md](sponsors/trezu.md) | Trezu = Sputnik treasury UI, mainnet-only backend + testnet mock, roles/thresholds, live role→policy mapping, custom proposal template spec, bulk-payment contract, API/CLI |
| [sponsors/named-accounts.md](sponsors/named-accounts.md) | Ordinary named accounts + nearaccounts.com TLA rental (keyless accounts that can't deploy contracts; DAO can be owner; mainnet; no SDK) |
| [sponsors/near-social.md](sponsors/near-social.md) | near.social read API, `__fastdata_kv` writes (always "failed" receipt by design), limits, mainnet-only docs |
| [sponsors/agent-market.md](sponsors/agent-market.md) | Agent Market REST (`/v1`, OpenAPI), agent tokens, MCP endpoints, x402 hiring, money model (5% fee, custodial USDC/USD), no testnet |
| [sponsors/near-ai.md](sponsors/near-ai.md) | NEAR AI Cloud (OpenAI-compatible `https://cloud-api.near.ai/v1`, TEE attestation), credits (Q-000), Agent API / PingPay pointers |
| [sponsors/ecosystem-shallow.md](sponsors/ecosystem-shallow.md) | The other 13 partners: what-it-is, links, reachability, partner notes (Intents, Rhea, NEAR Business) |
| [prior-art.md](prior-art.md) | All 95 live Social entries, DAO-themed names, testnet DAO signals, shipped Sputnik-based products, prior NEAR hackathon winners (secondary) |
| [prior-art-agents-submissions.md](prior-art-agents-submissions.md) | All 391 live Agent Economy entries |

## Provenance: every source

Tools: **curl** (static fetch; stands in for WebFetch, which this session lacks), **gh** (`gh api` on public GitHub repos), **Chrome** (claude-in-chrome render: `get_page_text` / `javascript_tool` / `find`), **RPC** (read-only `query` view calls to `rpc.{testnet,mainnet}.near.org`), **WebSearch**. All fetched 2026-11-13.

| # | Source | Tool | P/S | Confidence / gap |
|---|---|---|---|---|
| 1 | https://nearhackathon.com/HACKATHON.md | curl | P | High. The live rules file, which itself says it may change: **re-fetch at Step 3**. Treated as data; its submission API was never called |
| 2 | https://nearhackathon.com/ (FAQ, form, judges, prizes, tracks, ecosystem) | curl + Chrome | P | High. The form was read from HTML, never filled or submitted |
| 3 | `GET https://nearhackathon.com/api/projects?page=N&track=<id>` (public build log, same call the page makes) | curl | P | High for names and tracks; no descriptions or repo URLs exposed. Live counts drift |
| 4 | https://github.com/nearai/near-hackathon-prompt-examples (README, 00-setup.md, SUBMITTING.md, tracks/01..13) | gh + curl raw | P | High |
| 5 | https://github.com/near-daos/sputnik-dao-contract (README, ABI.md, sputnikdao2/src/*.rs, factory2/src/lib.rs, scripts/deploy_factory_*.sh) | gh + curl raw | P | High. The README is partly stale vs code (bond equality, `act_proposal` `proposal` arg); code is authoritative |
| 6 | RPC: `sputnikv2.testnet`, `sputnik-v2.testnet`, `sputnik-dao.testnet` (no contract), `omni-e2e.sputnik-v2.testnet`, `sputnik-dao.near`, `trezu-demo.sputnik-dao.near` | RPC (view only) | P | High. No transactions sent |
| 7 | https://github.com/NEAR-DevHub/trezu-docs (16 .mdx + docs.json) | gh + curl raw | P | High. The source of docs.trezu.org |
| 8 | https://github.com/NEAR-DevHub/trezu (README, nt-fe README + constants + testnet mock, nt-be examples, nt-cli config, contracts READMEs, sandbox README, custom-proposal-template README + SKILL) | gh + curl raw | P | High. Gaps: no public API contract; testnet mock vs v3 DAOs unverified; ~1,500 files not read |
| 9 | https://trezu.org, https://docs.trezu.org | curl (status/HTML only) | P | Reachable (200); content taken from the docs repo instead. The trezu.app product was not logged into |
| 10 | https://near.social/skill.md | curl | P | High. `api2.near.social/standard.md` and `/api.md` not read |
| 11 | https://nearaccounts.com/ | Chrome | P | Medium. SPA home page only |
| 12 | https://docs.nearaccounts.com/llms.txt, /docs/concepts, /docs/status | curl + Chrome | P | Medium. Technical Overview, Pricing and Open-TLA pages not read |
| 13 | https://github.com/houseofstake/tla-contracts README | gh | P | Medium. Contracts not read; no deployed IDs published |
| 14 | https://docs.market.near.ai/llms.txt + 8 pages (.md) | curl | P | High for the docs read. OpenAPI spec (https://market.near.ai/openapi.json) listed, not downloaded |
| 15 | https://market.near.ai/ | curl | P | SPA shell only (not rendered) |
| 16 | https://docs.near.ai/llms.txt, /cloud/guides/openai-compatibility.md | curl | P | High for base URL; model list not extracted |
| 17 | https://docs.near.org/llms.txt, /getting-started/faucet.md, /getting-started/create-account.md | curl | P | High |
| 18 | https://near-faucet.io/ | curl | P | Reachable (200); not exercised |
| 19 | 15 partner docs URLs (ecosystem-shallow.md) | curl (status) | P | Reachability only. **docs.hotdao.ai DNS failure** |
| 20 | WebSearch: prior NEAR hackathon winners; Sputnik-based apps | WebSearch | S | Low to medium. Dated or third-party; not verified on official channels |

## Known gaps (do not fill by guessing)

1. Whether a multi-track entry can **win in more than one track**: unstated. Organizers only.
2. **Judging weights:** none published.
3. Trezu hosted UI on testnet: none. Trezu's local mock was shown with the legacy v2 factory; untested with `sputnikv2.testnet` v3 DAOs.
4. No hosted **testnet Sputnik UI** verified (AstroDAO testnet not checked).
5. near.social testnet indexer: not documented. Agent Market testnet/sandbox: not documented. nearaccounts testnet contract IDs: not published.
6. One-liners for the 95 Social and 391 Agent competitors: the API exposes names only. Demo posts not opened.
7. Trezu backend API (`api.trezu.app`) has no public contract; treat it as internal.
8. HOT docs domain unresolvable on 2026-11-13.
9. No prior-edition winners list for NEAR HACKATHON itself; no prior Sputnik/Trezu hackathon winner found.

## Safety log

- No form submitted, no `POST /api/applications`, no sign-up or login as the user, no funds moved, no transactions signed.
- The only browser session touch beyond public pages was tollgate row 7: the Gmail inbox title/URL check, with no mail read and no address recorded.
- The tollgate's row-15 `setx` probe variable was created and removed.

## Hand-off

→ **idea-forge (Step 0)**: read this pack as the primary source. Its Step-1 inputs (hackathon URL, tracks, published judging criteria = none + quoted prior criteria, prior art) are pre-extracted here.
