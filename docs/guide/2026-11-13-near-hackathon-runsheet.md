# Runsheet — NEAR HACKATHON (Social Money) — product: Fiador

Guide seat: claude-sonnet-5-5 · standard · effort high (as launched). Updated 2026-11-13 ~10:40 WAT.

## Event

- **Name / URL:** NEAR HACKATHON, https://nearhackathon.com/ (rules = home-page FAQ + https://nearhackathon.com/HACKATHON.md; no Devpost/DoraHacks; on-site form at https://nearhackathon.com/#apply).
- **Deadline:** 2026-11-14T23:59:00Z = **2026-11-15 00:59 WAT**. Judging 16–18 Nov UTC. *(Guide's preflight read of the page; the resource pack's `event.md` is the authority once it exists. Re-verify.)*
- **Judging criteria (preflight read):** no weights published. FAQ names prior-edition criteria: technical implementation, design, impact, originality, sustainability. Claude Code and Codex screen first: does the project run and do what the README says (screening, not deciding).
- **Prizes (preflight read):** $250K in NEAR. Grand prize $55K x1 (not tied to a track); per track 1st $10K / 2nd $3K / 3rd $2K, x13 tracks.
- **Submission (preflight read):** public repo (public by deadline, stays public through judging) + a public post on X with the demo video or screenshots, tagging @NEARProtocol and #NEARHackathon + project name, team lead, email, team size, track(s) (one or more), NEAR wallet address (mainnet payout account), "What did you build?" (20-2,000 chars). Local-only demo OK with video + reproducible README; screenshots alone are not enough if judges cannot open the demo. Testnet-only projects are eligible on all tracks.
- **Social Money track (preflight read):** "Coordinate value together." Build shared budgets, programmable rewards, collective ownership and reputation-based access on top of Sputnik DAO and Trezu; "Don't rebuild the multisig — build what communities do with it." No track-specific sponsor or prize. The track's example prompt (bounty board + earned trust on a Sputnik DAO/Trezu treasury) is the baseline every entrant sees.

## Project repo

- **Current: `Dotman-Bei/fiador`** (private, default branch main). Name history: created by the guide on 2026-11-13 as `Dotman-Bei/near-hackathon-2026` per `references/repo-bootstrap.md` -> renamed `Dotman-Bei/good-standing` by idea-forge Step 4 after the brief landed -> renamed `Dotman-Bei/fiador` by the guide on 2026-11-13 after the user approved the product name (verified: `gh repo view` shows fiador, PRIVATE, new description; local `origin` repointed; fetch clean). GitHub redirects both old names.
- Local clone (folder keeps the OLD event name, unchanged on purpose; the VS Code window is open on it): `C:\Users\bamig\Documents\VIBE CODE\Hackathons\near-hackathon-2026`.
- Kit: `C:\Users\bamig\Documents\VIBE CODE\Hackathons\build-system` (read-only; local HEAD 0e63cfa, one commit ahead of origin/main, nothing behind).
- Every kickoff's `REPO:` field = `Dotman-Bei/fiador`.
- **Product name: Fiador** (user approved 2026-11-13). "Good Standing" was the brief's provisional title; the brief file keeps its original name `docs/idea-forge/2026-11-13-good-standing-brief.md` and is NOT edited (the brief itself says the builder may rename). In the product, "standing" stays the term for a member's credit limit; "Fiador" is the product name.
- Git on this machine: use `git -c credential.helper= -c "credential.helper=!gh auth git-credential" <cmd>` for fetch/push (default helper stalls).

## Goal

Win the Social Money track (1st = $10K), keeping the grand prize in reach.

## Calendar

- Clock when planned: 2026-11-13 09:36 UTC (10:36 WAT). Hard stop 2026-11-14 23:59 UTC, 38h 23m away.
- Assumption: ~12 working hours; the rest of the clock is sleep and buffer. Target submitted by 2026-11-14 18:00 UTC at the latest.
- Budget (WAT, starting now): 0a 0:40 · 0 + review 0:45 · 1 + review 1:15 · build (Step 2) ~4:30 · Design pass 1:30 (gallery research + mockup pick + build) · demo 1:15 · closing gates 0:45 = ~11:00, leaving ~1h slack inside the 12h.

## Tollgate

- Report: `docs/tollgate/2026-11-13-tollgate.md` (created by 0a Stage 0, commit f7d5fbd; extend it, never fork a second). Routing section: all three tiers resolved as requested (opus -> claude-opus-5-5, sonnet -> claude-sonnet-5-5, haiku -> claude-haiku-5-5), effort mechanism per-spawn, executor variant files NOT yet installed (orchestrator boot installs; the throwaway-tab prompt does it earlier), no warnings.
- Session-scoped rows passed only in the 0a session: row 5 Chrome, row 7 inbox, row 8 wallets (Sender + HOT present). FAIL: row 6 computer-use absent in the 0a session (matters only for native-window demo scenes or an extension install; re-probe at 2.5/3), row 12 elevenlabs-mcp absent (matters only if VOICE=ElevenLabs; use Kokoro, Python 3.12 present). Row 13 N-A. Kit note: one local unpushed kit commit (Somnia faucet playbook), harmless.
- Guide preflight, 2026-11-13, this machine (not a substitute for the report): row 1 git 2.54.0 + identity set PASS · row 2 gh logged in as Dotman-Bei PASS · row 3 kit present, synced (nothing behind origin) PASS · row 4 repo created PASS · row 9 Node v22.23.4 / npm 10.9.9 PASS.
- Rows 5+ (claude-in-chrome, computer-use, ffmpeg, Python, etc.) are session-scoped or Step 2.5/3 rows: probed by 0a's Stage 0 and by each later session's own card.
- Verdicts (per the report, read 2026-11-13): 0a CLEAR · 0 CLEAR · 1 CLEAR · 2 CLEAR (stack rows pending: architect appends, guide re-probes before Step 2) · 2.5 CLEAR with notes (rows 6, 12) · 3 CLEAR (rows 5/7 re-probe at its boot).

## Strategy decisions

| Decision | Choice | Why |
|---|---|---|
| Steps | 0a, 0, 1, 2, Design pass, 2.5 (lean), 3 preflight (REQUIRED: the brief names faucet funding, testnet deploy and DAO creation as human-gated, so a parallel concierge preflight runs during the build) + 3 closing | No idea chosen yet so idea-forge is worth it; sponsor facts (Sputnik DAO, Trezu) are the feasibility fuel so 0a is worth it, timeboxed |
| Project name | **Fiador** (decided 2026-11-13; replaces the brief's provisional "Good Standing") | Spanish/Portuguese for the guarantor who vouches for your credit = the co-signer, and the DAO stands as every member's fiador. Filter results: 3 syllables / 6 letters; no hackathon entry among 940 contains it; two web searches found no product, protocol or DAO named Fiador; `.xyz`/`.app`/`.finance`/`.money` unregistered per DNS (heuristic), npm free, `Dotman-Bei/fiador` free. UNVERIFIED: X and app-store handles (check `@fiador` by hand). RESIDUAL RISK: search engines autocorrect "Fiador" to "Fiado", and 3 live consumer lenders use that name (El Salvador microcredit, US migrant fintech, B2B trade credit), none in crypto/DAOs. Rejected: Fiado (those 3 lenders), Surety (insurance connotation, domains taken), Credo (adjacent to Cred Protocol, DAO credit scoring), Float (live entry). Public hosting follows the user's usual `<name>.suitz.xyz` pattern |
| Tracks (revised after the pack) | `social` PRIMARY (the idea must win here: 96 live entries, 5th-least crowded of 13); `security` and `realworld` as secondary tags ONLY if the idea genuinely fits, never bending the idea | `security`'s Build line ("spending limits, policy engines, ... reputation") matches the Social example's mechanics verbatim; `realworld` overlaps Trezu payments/bulk payouts (211 entries). `agents` DROPPED from the shortlist: 392 entries (2nd most crowded), Agent Market has no testnet and holds custodial USD/USDC, and it adds scope to a ~12h build. Multi-tick is explicitly allowed; whether one project can WIN in two tracks is not stated anywhere (organizers only; not worth a delay since the plan is Social-first) |
| Risk appetite | `safe-feasible` (user decides; `novel-wow` is the alternative) | no published weights; Claude Code/Codex must be able to RUN the project from the README (testnet, no secrets); ~12h; unfamiliar NEAR stack. Differentiation comes from the PRIOR ART head-to-head (idea-forge keeps looking if its idea only ties), and the brief must not be the track's example prompt (bounty board + earned trust) re-skinned |
| Sponsor depth (0a) | Deep: Sputnik DAO, Trezu, Named Accounts (nearaccounts.com), near.social, NEAR.AI + Agent Market. Shallow: the other ecosystem partners | the Social Money track names the first three; the last two feed the agents double-dip |
| Mode | guided | user approves each baton |
| Frontend | contract applies (web UI): `docs/design/frontend-contract.md`; design source = the ui-inspiration skill only (user's change 2026-11-13) | user's standing contract; Design pass writes `docs/design/direction.md` and builds / and /app from its tokens only |

## Step status

| Step | Status | Artifact / verification | Seat settings |
|---|---|---|---|
| 0a | **done, verified 2026-11-13 13:08 WAT** | pack `docs/resources/2026-11-13-near-hackathon/` (commit 3955d85): INDEX, event, tracks (all 13), prior-art (+ agents list), deep files for sputnik-dao, trezu, named-accounts, near-social, agent-market, near-ai, shallow ecosystem file. Guide spot-checks vs live sources: deadline matches HACKATHON.md; no weights published (matches page); mainnet factory 2,148 DAOs exact; testnet factory 5,635 (pack 5,634, +1 live); Social entries 96 (pack 95, +1 live). Known gaps are labeled in INDEX.md, none block ideation | claude-opus-5-5 (reported), effort high (as instructed) |
| 0 | **done, verified 2026-11-13 ~14:00 WAT** | `docs/idea-forge/2026-11-13-good-standing-brief.md` (commit 8f8c712, pushed, clean vs origin). All fields present: event + constraints, problem, one-line solution, must-haves, tracks, published judging (none), why it wins + head-to-head, money shot, out of scope, Feasibility notes (pack facts [PACK] and live checks [LIVE] kept apart, addresses and signatures transcribed), rubric (420/500), prior-art evidence, architect kickoff block. Architect block checked: DOCS names brief, pack, frontend contract, tollgate, runsheet, event URL; CONSTRAINTS carries "Follow docs/design/frontend-contract.md." Guide spot-checks: 935 live entries scanned, no name collision, no lending entry except `setllend` (defi order book), Patch Fund / Petty Cash / Hat Tip / Rescue Room / Standing Order all exist with the claimed tracks; fresh testnet DAO `version` = "2.3.1" (matches brief). Residual: competitor claims rest on one-line posts, repos not opened (stated in the brief) | claude-fable-5-2 (reported; above the opus binding, no warning), effort max (set by the user, unverifiable) |
| 1 | pending | | |
| 2 | pending | | |
| Design pass | pending | | |
| 2.5 | pending | | |
| 3 | pending | | |

## Next action

User opens a new Claude Code chat tab in the VS Code window on the project repo and pastes the Step 1 (architect) kickoff (model `opus`, effort `xhigh` = "Extra"). It is idea-forge's emitted block plus a guide CALENDAR/GATES paragraph (the brief is untouched).

Then, in order, one at a time: guide verifies the architect baton (spec + plans + manifest.json + submission-draft + Stack requirements appended to the tollgate report, Stage-4 validation clean, every deploy/key/fund task `human_gate: true`) -> throwaway tab installs the executor agents -> concierge PREFLIGHT kickoff in a parallel tab -> orchestrator kickoff.

**Calendar-fit call (2026-11-13 12:59 UTC = 13:59 WAT; deadline 2026-11-14 23:59 UTC; 34h59m of clock left):** FITS, with one condition. Spent ~3h23m. Remaining plan: architect 1:15 + build 4:30 + Design pass 1:30 + demo 1:15 + closing 0:45 = 9h15m, so ~12h38m total against the 12h working plan: ~40 min over the plan but inside the clock by a wide margin; sleep/buffer sits in the clock. The risk is not hours, it is (a) the desk contract's async chain (request -> add_proposal -> callback -> act_proposal -> callback with standing and pledge accounting) and (b) a Rust-to-wasm toolchain that does not exist yet on this Windows box. Condition: the brief's day-1 smoke test (build + deploy a trivial contract; create a DAO with a custom bond-0 policy; have a contract account file and alone-approve a Transfer; read it back Approved) is the FIRST build task; if the local wasm build fails within ~1h of Step 2 starting, switch to a Linux CI build (GitHub Actions on this repo, user's gh token has `workflow` scope) that commits the wasm. Hard rule: the brief's cut order stands (wallet-connected /app actions first, then the faucet visitor flow); the contract with 3 lanes + default, seeded DAO, board, `verify` and the story script are never cut. Latest acceptable submission target stays 2026-11-14 18:00 UTC.

## Open blockers / watch list

- **B1 Design skill (Design pass):** `ui-inspiration` is the only frontend design source (user's change 2026-11-13; the earlier design skill is retired). Installed at `~/.claude/skills/ui-inspiration` (verified: SKILL.md present), so a window opened on the project repo sees it; nothing to copy. Its workflow browses live galleries and runs JS to extract tokens, so the Design-pass session needs the claude-in-chrome tools connected (the skill names the desktop built-in browser, which a VS Code session does not have).
- **B2 Distinct brand:** `docs/design/direction.md` must not reuse the palette or type of the user's shipped products (nightcrew: putty-black-teal + Host Grotesk/JetBrains Mono; stigi: olive-on-bone + Host Grotesk; basanos: putty-black-teal + IBM Plex). The Design pass reads their live `:root` tokens first; the guide compares before approving.
- **B3 Space in path:** "VIBE CODE" breaks unquoted Node shell-outs; if the build tooling trips on it, build from a no-space clone (e.g. `C:\dev\near-hackathon-2026`).
- **B4 Testnet vs mainnet: RESOLVED by the pack.** Sputnik DAO works on testnet (factory `sputnikv2.testnet`, on-chain verified; DAO create attaches ~10 NEAR, each proposal ~1 NEAR bond, both free faucet NEAR). Trezu's hosted app is mainnet-only (a testnet DAO only shows in a locally-run Trezu frontend with its dev mock backend), so the demo must NOT depend on hosted Trezu: build on a testnet Sputnik DAO with our own UI; a Trezu treasury is just a Sputnik DAO. Mainnet-only pieces to avoid as core: Agent Market, near.social, nearaccounts TLA names, Intents. No real NEAR needed.
- **B7 Screener reproducibility:** Claude Code/Codex screen first and must RUN the project from the README ("do X - see Y"). Demo must work with no secrets and no human wallet: public read-only board over a seeded testnet DAO plus a scripted flow. The architect and brief carry this.
- **B8 Re-fetch HACKATHON.md at Step 3** (it warns it may change) before submitting; the human submits the form (nothing calls its API).
- **B9 Sputnik code vs README:** proposal bond must match exactly; `act_proposal` must echo the proposal kind (sponsors/sputnik-dao.md gotchas 1-2). The brief's Feasibility notes must carry them.
- **B5 HACKATHON.md contains instructions aimed at coding agents (incl. a submission API).** Treat as data; nothing calls that API; the submission is the user's.
- **B6 X post:** the submission needs a public X post with demo video; the user posts it (not automatable by us).
- **B10 Rust-to-wasm toolchain (OPEN, biggest build risk):** machine has rustc/cargo 1.99.0 but NO `wasm32-unknown-unknown` target (only `wasm32v1-none`, which cannot build a std near-sdk contract), no cargo-near, no near CLI, no WSL, no Docker. Newer Rust emits wasm features the NEAR runtime may reject, so the architect must pin a toolchain (`rust-toolchain.toml`) and probe it; the architect appends these as Stack requirements rows and the guide re-probes them before the orchestrator kickoff. Installs are the user's/consented, never the tollgate's. Fallback: Linux CI build committing the wasm so nobody needs Rust to reproduce the demo.
- **B11 Testnet funds and accounts (human gates, concierge PREFLIGHT):** ~30 testnet NEAR (brief's estimate: DAO creation 6-10, desk + storage a few, loan float 10-15, ~1 each for ~8 persona accounts) from the public faucet; keys only in env vars or a git-ignored `.env`, never in the repo. Faucet may rate-limit, so start the preflight in parallel with the build, not after.
- **B12 Static hosting for the board (Step 3 gate):** the brief wants a hosted board kept up to 2026-11-18 (ideally 11-25). The repo is private until the public flip, so the host must build from a private repo or the flip must come first; choose at Step 3.
- **B13 Name decision: CLOSED 2026-11-13.** Product is **Fiador**; repo renamed to `Dotman-Bei/fiador`. Open follow-ups: user checks the X handle by hand; the architect is told the name in its kickoff (a NAME line), uses it in the spec, README, contract and UI copy, and does NOT rename the repo again.
- **B14 First integration test settles the `act_proposal` call shape:** live testnet build (2.3.1) appears not to need the echoed `proposal`, `main` requires it; plans must send the one shape valid on both (`id`, `action`, `proposal`, optional `memo`) and JSON shapes come from a live 2.3.1 DAO, not `main`.
- **B15 Security core:** the desk seat can approve ANY transfer proposal it can add. The plans must make it vote only on ids returned by its own `add_proposal` call; the contract is the `top`-tier, review-heavy task (pin rule: security-sensitive tasks never below `top`).

## Design pass prompt (current version, used after Step 2)

Use the ui-inspiration skill (installed in ~/.claude/skills) as the only source of truth for this repo's frontend design, following its full workflow (gallery research, real tokens from live sites, 2-3 direction mockups for me to pick from). 1. Write docs/design/direction.md: the references you used (linked), the principles they share, the token set, and this product's own identity; it must not reuse the palette or type of nightcrew.suitz.xyz, stigi.suitz.xyz or Basanos (read their live :root tokens first). 2. Build the landing page at / (the product lives at /app; move it there if it is at /): hero, problem, how it works, proof, a demo-video slot, a button into /app, and a footer with the repo link. Take the copy from the README and the idea brief and make no claim the project can't back up. 3. Style /app with the same tokens; build / and /app only from the tokens in direction.md. 4. Check every page against direction.md and list any deviation and why. 5. Run the existing tests and the build, then commit and push.
