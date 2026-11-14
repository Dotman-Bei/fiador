# Gate ledger: Fiador (NEAR HACKATHON 2026)

Written by the gate-concierge (Step 3), **preflight pass**, opened 2026-11-13 17:10 UTC, main session `claude-opus-5-5`
(top tier, effort high), with HEAD at `785f9ab`. One ledger per campaign: the closing pass extends this file.

**Consent rule:** nothing in this file runs until the user names that gate ("run gate smoke:11"). Approving one gate
does not carry over to the next. If the user says nothing, the answer is no.

**Secrets rule:** this file records env-var **names** (`FIADOR_ROOT`, `FIADOR_ROOT_KEY`) and public ids only. Keys
live only in the git-ignored `.env` at the repo root (`.gitignore:5`).

**Deadline:** 2026-11-14 23:59 UTC (event.md §1). Keep the hosted board up to 2026-11-18, ideally 2026-11-25 (Q-012).

## Session card (references/tollgate.md rows 5-8, 15 + granted items), 2026-11-13 17:08 UTC

| Row | Item | Result |
|---|---|---|
| 9 | node / npm | PASS: node v22.23.4, npm 10.9.9 |
| 1 | git | PASS: git 2.54.0 |
| 2 | gh auth | PASS: logged in as `Dotman-Bei` (keyring), scopes `repo, workflow, gist, read:org`; repo permissions `admin, push` |
| — | git push access | PASS: credentialed `fetch` and `push --dry-run` to `origin` (Dotman-Bei/fiador, private) both succeed |
| 15 | cross-session env store | PASS (fallback by grant): the git-ignored `.env` at the repo root is writable. It does not exist yet; `npm run root -- create` creates it. `setx` was not probed; it isn't needed because the plans read `.env` |
| 5 | claude-in-chrome | NOT GRANTED (not probed, per the kickoff) |
| 6 | computer-use | NOT GRANTED |
| 7 | email inbox | NOT GRANTED (signup automation struck, so this row is N-A) |
| 8 | wallet extension | NOT GRANTED (no gate in this campaign needs one: every account is script-made) |

Read-only chain probes (17:09 UTC): `fiador.sputnikv2.testnet` and `fiador-v2.sputnikv2.testnet` both return
`UNKNOWN_ACCOUNT` (both free); factory `sputnikv2.testnet` exists. Faucet helper host `helper.nearprotocol.com`
responds (GET `/` → 404, as expected for a POST-only endpoint; no claim was made).

## Gates

Tier: **A** = agent-runnable once the user says go. **B** = assisted, with one capability gap. **C** = human-only.

| # | Gate | Tier | Pass | Tool plan | Human moment | Risk note | Status |
|---|---|---|---|---|---|---|---|
| 1 | **smoke:11** Create and fund the root account (`gate_profile: faucet`, pause 1) | A: the public faucet helper is a plain POST, no CAPTCHA or OAuth | preflight | Bash: `npm run root -- create fiador-ops-<6 letters>`, then `npm run root -- topup --count 2` repeated while `npm run root -- check` prints ROOT LOW, until `ROOT OK <root> <N> NEAR` with N >= 21 | none. Fallback only if the helper refuses: user makes an account in a wallet + https://near-faucet.io, then puts `FIADOR_ROOT` / `FIADOR_ROOT_KEY` into `.env` (Tier B: Chrome and wallet not granted) | testnet burner; key only in `.env`. Drip turned out to be 10 NEAR per claim | **done** 2026-11-13 17:13 UTC (user go): `ROOT OK fiador-ops-vmwpxk.testnet 29.9994 NEAR` (see the evidence log) |
| 2 | **smoke:12** Live smoke run, creates the real demo DAO (`gate_profile: deploy`, pause 1) | A | preflight | Bash: `npm run smoke` (seven `== n/7` sections → `SMOKE PASS dao=… version=2.3.1 vote_check=<id> transfer=<id>`), then `npm run smoke:check`. If it reports "exists with a different policy", I set `FIADOR_DAO_NAME=fiador-v2` in `.env` and rerun | none | spends ~9.5 testnet NEAR + gas; claims the public DAO name for good (testnet). Writes `deployments/smoke.json` + `smoke-gas.json`, which I leave uncommitted for the orchestrator | **done** 2026-11-13 17:16 UTC (user go): `SMOKE PASS dao=fiador.sputnikv2.testnet version=2.3.1 vote_check=0 transfer=1` (see the evidence log) |
| 3 | **scripts:46** Seed the demo DAO (`deploy`, pause 2) | A | closing | Bash: `npm run seed -- --desk desk.<root>`, then `npm run seed:check`; if it reports "below the minimum viable float", `npm run root -- topup --count 2` and rerun | none | creates `desk.<root>` (3.5 NEAR) + float; more faucet claims are likely here (B11 puts the total at ~30 NEAR) | **done** 2026-11-13 17:24 UTC (user go): `SEED PASS dao=fiador.sputnikv2.testnet desk=desk.fiador-ops-vmwpxk.testnet`, no top-up needed (see the evidence log) |
| 4 | **scripts:47** Story run 1 (`wallet`, pause 3) | A: persona accounts are script-made burners | closing | Bash: `npm run story -- --run 1`, then `npm run story:check -- --run 1` (~6 min of chain time) | none | ~1.5 NEAR persona funding + 2 NEAR of float lost to the default beat | **done** 2026-11-13 17:36 UTC (user batch go "scripts:47 then tail:92"): `STORY PASS run=1 loans=0,1,2,3,4` |
| 5 | **tail:92** Live visitor run (`faucet`, pause 3) | A | closing | Bash: `npm run visitor` → `VISITOR PASS …` or `VISITOR SKIPPED` | none | throwaway faucet account; if the faucet is down, record it here and drop Task 94 | **done** 2026-11-13 17:37 UTC (same batch go): `VISITOR PASS fiador-visitor-k7lsumcc.testnet loan=5` |
| 6 | **scripts:48** Keyless freeze of the desk (`account`, pause 3, IRREVERSIBLE) | A to execute, but permanent: I run it only on a separate, explicit go | closing | Bash: `npm run freeze -- --yes`, then `npm run verify` | the go itself; restated with "permanent" before running | after this the desk can never be patched (a fix means a new desk). The submission text (B17) claims the freeze, so if it's skipped, that sentence must be edited | **done** 2026-11-13 17:43 UTC (explicit permanent go): `FREEZE PASS desk.fiador-ops-vmwpxk.testnet has no access keys; VERIFY PASS`; desk keys 1 → 0. B17's sentence is now true |
| 7 | **Repo public flip** (implicit). Closing pass splits it: **7.1** full-history secret scan (read-only), **7.2** the flip (IRREVERSIBLE) | A | closing | 7.1, Bash/git: `git log -p --all` plus `git rev-list --all --objects` path check, grepping for `ed25519:` secret keys, `FIADOR_ROOT_KEY=` with a value, seed phrases (12/24-word runs), `.env` ever tracked, tokens (`ghp_`, `gho_`, `github_pat_`, `sk-`, `xox`, `AKIA`, `-----BEGIN … PRIVATE KEY`), Windows user paths (`C:\Users\<name>`, `/c/Users/<name>`), personal email/handle. Output is names and counts only, never values. 7.2, gh: re-read `gh auth status` (expect `Dotman-Bei`), then `gh repo edit Dotman-Bei/fiador --visibility public --accept-visibility-change-consequences`; verify with `gh api repos/Dotman-Bei/fiador --jq .visibility` | 7.2 only: a separate go from the user that contains the word "irreversible" | exposure can't be undone (forks and caches), so 7.1 must come back clean first; any finding stops the flip. Must be public by the deadline and through judging | **7.1 done: FINDINGS, flip stopped** (see Closing evidence) · **7.2 done** 2026-11-14 15:40:53 UTC: repo is public (user go "irreversible"; option A, history unchanged) |
| 8 | **Static hosting of `dist/`** on GitHub Pages (implicit, B16; option chosen; see the options below) | A | closing | Bash/git/gh: `npm run web:build` from the shipped tree (HEAD at the time, clean); copy `dist/` into a temporary `git worktree` on an orphan `gh-pages` branch (plus `.nojekyll`), commit, push; `gh api -X POST repos/Dotman-Bei/fiador/pages -f "source[branch]=gh-pages" -f "source[path]=/"`; wait for the build (`gh api repos/Dotman-Bei/fiador/pages/builds/latest`); remove the worktree. Verify with read-only `curl`: `https://dotman-bei.github.io/fiador/` and `/fiador/app/` return 200, every `./assets/*` they reference returns 200, the app bundle carries the `#/loans` and `#/desk` routes; secret grep of the published `dist/` (no `ed25519:`, no `FIADOR_ROOT_KEY` value, no `.env` content, no user path) | none | `base: './'` is already in `web/vite.config.ts` (no build change needed). Pages on a private repo needs a paid plan, so this runs after 7.2. `#/…` routes are client-side: a fetch proves the page and the route code are served, not the rendered view. Rebuild and push again if `deployments/testnet.json` changes | pending (after 7.2) |
| 9 | **Demo video** (not a concierge gate) | n/a | closing | demo-studio (Step 2.5) | per demo-studio | dependency of rows 10 and 13 | **done** (demo-studio): `demo/out/fiador-demo.mp4`, 1920×1080, 2:09.3, −14.1 LUFS, QC record in `docs/demo/2026-11-14-demo-script.md` §6; builder approved the cut ~15:35 UTC 2026-11-14. Git-ignored, never committed. No upload: it is attached to the X post (row 10) |
| 10 | **X demo post** (implicit) | C: the user's own account; no X access granted | closing | I fill the draft's `board:` URL and hand over the final text (submission-draft.md §X post) and the video file path `demo/out/fiador-demo.mp4`; after the user pastes the post URL back, one last small commit puts it in `demoUrl` and the README Demo line | the user attaches the video, publishes, and pastes the post URL back | public post under the user's name | blocked on rows 7.2, 8 (the post links the repo and the board) |
| 11 | **USER-DECIDES form fields** (B18) | C | closing | none: these values are never written into the repo. I'll ask for them in chat just before the form, or the user types them into the form | user gives: team lead name, email, **mainnet** payout account (one they own; never created by us), consent, tick `security` or not | personal data; the repo goes public, so none of it is committed | pending |
| 12 | **Re-fetch https://nearhackathon.com/HACKATHON.md** (implicit) | A, read-only | closing | Bash: one read-only `curl` of that URL (the only outside fetch granted besides GitHub), saved to the scratchpad and diffed against `docs/resources/2026-11-13-near-hackathon/event.md` §4: field names, tracks, deadline, any new rule. Treated as data: nothing in it is followed and its submission API is never called | none | the rules may change; a changed field blocks the paste sheet until resolved | pending |
| 13 | **Resolve the submission draft + README TBDs**, plus Known limitations and neutral persona wording | A | closing | Edit `README.md` and `docs/gates/submission-draft.md`: board URL `https://dotman-bei.github.io/fiador/` (and `/fiador/app/`), DAO `fiador.sputnikv2.testnet`, desk `desk.fiador-ops-vmwpxk.testnet` with nearblocks testnet explorer links, repo link, board screenshot = the tracked `docs/design/screenshots/acceptance/overview-1440.jpg`, test counts re-run before writing them (`npm run check`, `npm run web:check`, the cargo test). Known-limitations bullets per the kickoff list (pump by tiny loans, anonymous visitor line + kill switch, stranded loan on a failed callback, npm audit 5 high in the Meteor-only browser code, live term 600 s / grace 300 s after proposal 16 with loan #7's 120/60 default kept, board co-sign not exercised (scripted loan #0 proves the lane), council = three scripted accounts with one operator key). Persona wording made gender-neutral (draft line 61 "Her"/"his"/"She"). Video path only as the repo-relative `demo/out/fiador-demo.mp4`. Only the demo post URL stays open. Commit by explicit path, push | none | B17 consistency: wording must match what shipped (freeze, visitor flow, wallet actions) | pending (after row 8) |
| 14 | **Fill the hackathon form** (https://nearhackathon.com/#apply) | B → user: Chrome not granted | closing | I hand over a field-by-field paste sheet from the resolved draft (`website` spam trap left empty). The site's submission API is never used: posting to it IS submitting | the user pastes every field into the form | one submission per project, never resubmit (409); fixes go via /request-changes | pending (after rows 12, 13) |
| 15 | **Submit** | C: final, irreversible | closing | none: the user presses Submit (no Chrome, so I can't see the confirmation; the user reports it) | user presses Submit before 2026-11-14 23:59 UTC | irreversible | pending |

### Hosting options for `dist/` (row 8, B16)

Facts I checked: `web/vite.config.ts` has no `base`, so the built HTML loads `/assets/...` from the domain root. All
in-app links are already relative (`href="./app/"` in `Landing.tsx`), and the deployment ids are compiled in
(`import.meta.glob('../../deployments/testnet.json')`), so **`base: './'` is the only change needed** for
the build to work on any host, root or subpath.

| Option | Cost | Account / signup | Code change | Agent-runnable now? |
|---|---|---|---|---|
| **GitHub Pages, project site** `dotman-bei.github.io/fiador/` (**recommended**) | $0 | none new (`gh` is already logged in as the owner) | yes: `base: './'` (one line + the orchestrator's test) | yes, Tier A (`git` + `gh api`), once the repo is public |
| GitHub Pages, user site (new repo `Dotman-Bei.github.io`) | $0 | none new | no | yes, but it creates a second public repo and takes the user's root site |
| Vercel / Netlify / Cloudflare Pages (served from the root) | $0 hobby tier | an account each. Signup automation is struck this pass; with an existing account, the CLI login needs `npx` (an install, not granted) or a browser drag-and-drop (Chrome not granted) | no | no: Tier B, the user logs in or drags `dist/` |
| surge.sh | $0 | email + password account created through the CLI (`npx surge`) | no | no: a signup plus an install, neither authorized |

Why I recommend GitHub Pages: there's no new account and no signup, it's free and stays up past 2026-11-25, it's served
from the same owner as the repo the judges review, and the one-line `base: './'` change also makes the build safe on any
other host. The user decides before the closing pass. If GitHub Pages is chosen, the guide schedules the build change
with the orchestrator.

## Recommended order

1. **smoke:11** (now) → 2. **smoke:12** (now; the orchestrator then builds desk:30/31) →
3. the user picks a hosting option (and the guide queues `base: './'` if it's GitHub Pages) →
4. **scripts:46** seed → 5. **scripts:47** story run 1 → 6. **tail:92** visitor run → 7. **scripts:48** freeze (permanent) →
8. repo public flip (after the history scan) → 9. hosting → 10. demo video (demo-studio) → 11. X post (user) →
12. resolve the draft + README TBDs → 13. re-fetch HACKATHON.md → 14. fill the form → 15. user submits.
All before 2026-11-14 23:59 UTC.

## Capability gaps (not granted this session)

- **Chrome:** blocks the faucet fallback (near-faucet.io), the Vercel/Netlify routes, and filling the form (row 14).
- **No X account access:** the X post is the user's (row 10).
- **Wallet extension / computer-use / inbox:** no gate here needs them.

## Faucet claim log

| When (UTC) | Gate | Account | Granted | Evidence |
|---|---|---|---|---|
| 17:12:20 | smoke:11 | `fiador-ops-vmwpxk.testnet` (root, created by the helper) | 10 NEAR | create tx `9tndMbAGYxURRDrZCKYyC3EKVmFMNq4ARQXnPnxbUgez` (testnet → root: CREATE_ACCOUNT+TRANSFER+ADD_KEY) |
| 17:12:34 | smoke:11 | `fiador-topup-j8gybkhl.testnet` (throwaway, deleted into the root) | 10 NEAR | fold-in receipt `HUkMqYKPBznrK7NJLXMfJHVcFVruqksCKyDoKKnbbdcA` (system → root TRANSFER); throwaway now `UNKNOWN_ACCOUNT` |
| ~17:12:45 | smoke:11 | `fiador-topup-8n6thutr.testnet` (throwaway, deleted into the root) | 10 NEAR | fold-in receipt `7Vh1HQVF5UAP3Hzo3gLvbzo2DK7m3Tj3yj15NNDA5rj7` (system → root TRANSFER); throwaway now `UNKNOWN_ACCOUNT` |
| 17:30:31 | margin before scripts:47 | `fiador-topup-i356fbtk.testnet` (throwaway, deleted into the root) | 10 NEAR | root 5.5269 → 15.5266 NEAR; throwaway now `UNKNOWN_ACCOUNT` |
| 17:36:08 | tail:92 | `fiador-visitor-k7lsumcc.testnet` (visitor throwaway, key in memory only, NOT deleted) | 10 NEAR | still holds 9.9475 NEAR, stranded because the key was never persisted (by design: no secrets) |

Faucet: `https://helper.nearprotocol.com/account` (the plans' default `FIADOR_FAUCET_URL`). 3 claims in ~30 s, all
10 NEAR, with no rate limit or refusal seen. Total granted: 30 NEAR, of which ~0.0006 went to gas.

## Evidence log

(Each executed gate adds an entry here: command result, account ids, NEAR amounts, tx hashes. No secrets.)

### smoke:11: done, 2026-11-13 17:13 UTC (user: "run gate smoke:11")

- `npm run root -- create fiador-ops-vmwpxk` → `ROOT CREATED fiador-ops-vmwpxk.testnet 10 NEAR (key written to the git-ignored .env)`
- `npm run root -- check` → `ROOT LOW … 10 NEAR < 21 NEAR`
- `npm run root -- topup --count 2` → two `faucet granted 10 NEAR …; folding it into fiador-ops-vmwpxk.testnet` lines;
  the trailing balance line read 19.9997 NEAR because the second fold-in receipt hadn't landed yet
- Gate: `npm run root -- check` → **`ROOT OK fiador-ops-vmwpxk.testnet 29.9994 NEAR`** (N >= 21: PASS)
- Verified myself: both throwaways return `UNKNOWN_ACCOUNT` over RPC; `.env` holds exactly one `FIADOR_ROOT` and one
  `FIADOR_ROOT_KEY` (names checked, values never printed), it's git-ignored, and `git status` is clean
- Budget: ~30 NEAR vs. smoke:12's ~9.5 NEAR + gas, leaving ~20 NEAR going into seed (desk 3.5 + float). More top-ups
  may be needed at scripts:46
- Not committed by me: the orchestrator re-runs the gate and makes the empty `chore(gate)` commit

### smoke:12: done, 2026-11-13 17:16 UTC (user: "run gate smoke:12")

- `npm run smoke` (17:14:53 → 17:15:49 UTC, exit 0): all seven `== n/7` sections, ending
  **`SMOKE PASS dao=fiador.sputnikv2.testnet version=2.3.1 vote_check=0 transfer=1`**. The DAO name was free, so no
  `FIADOR_DAO_NAME` override was needed.
  - 1/7 created `smoke.`, `council-1.`, `council-2.`, `council-3.fiador-ops-vmwpxk.testnet`
  - 4/7 Vote proposal 0: InProgress after 1 approval, Approved after 2
  - 5/7 root (no role) got `ERR_PERMISSION_DENIED`
  - 6/7 Transfer proposal 1: 0.01 NEAR to the root, Approved by the seat alone
- Gate: `npm run smoke:check` → **`SMOKE PASS dao=fiador.sputnikv2.testnet version=2.3.1 vote_check=0 transfer=1`** (exit 0)
- Verified myself over public RPC: `fiador.sputnikv2.testnet` exists (5.99 NEAR, code hash `AA4nA45v…`), `version()` =
  `2.3.1`, proposal bond 0. Roles: `council` = Group of the 3 council accounts with `*:*`; `desk` = Group
  [`smoke.fiador-ops-vmwpxk.testnet`] with exactly `transfer:AddProposal` + `transfer:VoteApprove` (transfer threshold 1).
  Proposal 0 `Vote` Approved (proposer council-1); proposal 1 `Transfer` 0.01 NEAR → root, Approved (proposer smoke)
- Tx hashes (testnet explorer):
  - DAO creation (factory `sputnikv2.testnet` → DAO, CREATE_ACCOUNT+DEPLOY+new): `HoCaDcwsu6VpaMoGrUeQTtbDv9izbKQnqCQCMzrVcV2L`
  - Vote check: add_proposal `2bPd4nNt18YLzvdv458PwTEHb22w6LX566r3v5dcr8U3`, approval 1 `DzpnAkdPXFiAoFkWAoov9FxrAC1yKKRXqXDUxeL6KC6S`, approval 2 `3oU4Cd3xH9EUbet7fjA3VTUFC8iEjA12dKLKjqRm1g33`
  - Permission-denied attempt by root: `FYedyBR5knDfDZHXow8suLv2q94obSdQtFHg6rm27D8E`
  - Seat-alone transfer (file_and_approve → add_proposal → act_proposal → payout): `E6gsqMFUc8dJ1TpteCMXPGqrMaQwnYwWUuaKSmWDUoRy`
- Spend: the root went from 29.9994 → **20.4656 NEAR** (9.5338 NEAR, matching the plan's ~9.5 + gas)
- Records: `deployments/smoke.json` and `deployments/smoke-gas.json` written (no `ed25519:` strings in either), **left
  uncommitted** for the orchestrator. Measured gas: add_proposal 2.34 Tgas, on_filed 10.37 Tgas, act_proposal 6.49 Tgas,
  on_voted 1.54 Tgas (×1.3 headroom recommended)

### scripts:46: done, 2026-11-13 17:24 UTC (user: "run gate scripts:46")

- Pre-checks: `git pull --ff-only` → already up to date, desk:31 `2c43767` present (HEAD `e131eed`), tree clean;
  `npm run root -- check --min 12` → `ROOT OK fiador-ops-vmwpxk.testnet 20.4656 NEAR`
- `npm run seed -- --desk desk.fiador-ops-vmwpxk.testnet` (17:22:58 → 17:23:51 UTC, exit 0). **No step was skipped**:
  every step ran fresh.
  - 1/5 `desk.fiador-ops-vmwpxk.testnet` created; desk deployed and initialised in one transaction
  - 2/5 factory upgrades locked out (FactoryInfoUpdate auto_update=false): proposal 2 Approved
  - 3/5 seat swap: unseated `smoke.fiador-ops-vmwpxk.testnet` (proposal 3), seated `desk.fiador-ops-vmwpxk.testnet` (proposal 4)
  - 4/5 sent 11.4315 NEAR; DAO float now about 12 NEAR (no "below the minimum viable float" stop)
  - 5/5 wrote `deployments/testnet.json` → `SEED PASS dao=fiador.sputnikv2.testnet desk=desk.fiador-ops-vmwpxk.testnet`
- Gate: `npm run seed:check` (exit 0):
  ```
  PASS  factory auto-upgrade is off — auto_update=false
  PASS  desk seat holds only the desk, with transfer:AddProposal and transfer:VoteApprove only — seat=["desk.fiador-ops-vmwpxk.testnet"] permissions=["transfer:AddProposal","transfer:VoteApprove"] other roles=none
  PASS  council is 3 members and every kind needs 2 approvals — council=3 quorum=2 threshold="2"
  PASS  desk is wired to this DAO — desk.dao=fiador.sputnikv2.testnet
  PASS  book equals the open principal — book=0 expected=0
  PASS  treasury holds the loan float — 12 NEAR available
  SEED PASS dao=fiador.sputnikv2.testnet desk=desk.fiador-ops-vmwpxk.testnet
  ```
- Balances after, read myself over public RPC: DAO `fiador.sputnikv2.testnet` **17.4215 NEAR** total (12 NEAR available
  above storage); desk `desk.fiador-ops-vmwpxk.testnet` **3.4979 NEAR** (code hash `GNKaSKXm…`); root **5.5269 NEAR**
  (spent 14.9387: desk 3.5 + float 11.4315 + gas)
- Tx hashes (testnet explorer):
  - Desk create (root → desk, CREATE_ACCOUNT+TRANSFER+ADD_KEY): `DjfpjXBnT4RNJ1LGduezv6ks6EC1HDvHQGvC6N36ip19`
  - Desk deploy + `new` (one tx): `Cx8GcvMkuWS42ArfQ1e7TRXaDthcy2y9xR28FXHwA2RA`
  - Proposal 2 (auto_update off): add `2UhC1J3Upjt6nYxf7ejn82iJMRN5QfS1TJK8B94ERRQV`, approvals `FE1UsKC1MHQ7dJ1BzSGFN8rCRQu6K6CCg4aqBRbAA9fT`, `74DiZ1u5iLMQXeC6FGLHeTTqAPwdmfETYpzsdJtFc9uc`
  - Proposal 3 (unseat smoke): add `Dfd4heEyCjy6aAxra9vUTBkHPVxLA69njGyFoTQfwYou`, approvals `6SFeMQWvMNMZninNL4zyGfnimJRJpuJBAKKMrhjcrAaZ`, `5owC3Ue82qV6nNpLk9Sc8wxqEvUXWteRsTQzy6pxQuMo`
  - Proposal 4 (seat desk): add `4iW4Uvr5X9giNPEmLfFqNyWnjU6wM6yYLn4H1AJ8Lo8u`, approvals `AQZRe7FywfvKUPGZPnjVXY22LiCdyRkH3C3itCQwAboV`, `9xPn2SoXt9gZcEMm9ytEZbAHRpaVgRPRsZgcGcNagDQK`
  - Float transfer root → DAO: `9twVASiGoWtBaqY7WJBmPH9i65uZbgupLRRsmpGeyRCq`
  - (The proposal-to-tx mapping is inferred from explorer order: add, then the two approvals, per proposal 2 → 3 → 4.)
- Records: `deployments/testnet.json` written (no `ed25519:` strings), **left uncommitted** for the orchestrator
- Heads-up for scripts:47: the root is at 5.53 NEAR, and the story run spends ~1.5 NEAR of persona funding from the root
  (the 2 NEAR default comes from the DAO float). A `topup --count 1` before it would add margin; only on the user's go

### Batch scripts:47 → tail:92: done, 2026-11-13 17:37 UTC (user: "run gates scripts:47 and then tail:92, as one named batch. Do NOT run scripts:48")

- Pre-checks: `git pull --ff-only` → up to date at `27c3ba6`, tree clean
- Margin top-up: `npm run root -- topup --count 1` → `faucet granted 10 NEAR to fiador-topup-i356fbtk.testnet`; the
  trailing balance line again lagged one receipt (5.5269); `npm run root -- check --min 8` →
  `ROOT OK fiador-ops-vmwpxk.testnet 15.5266 NEAR`
- **scripts:47**: `npm run story -- --run 1` (17:30:55 → 17:35:54 UTC, exit 0), ends `STORY PASS run=1`
  - 0/4 personas `ada-1.`, `bayo-1.`, `chidi-1.fiador-ops-vmwpxk.testnet` created; council proposal 5 Approved: admitted 3
  - 1/4 Ada (standing 4) asks 6, held; Bayo co-signs 2, so loan #0 is Sputnik proposal 6, approved by the desk seat alone;
    treasury 17.4215 → 11.4215 → 17.4215 NEAR after repay; Ada 5, Bayo 5
  - 2/4 loan #1 (proposal 7) approved 2-of-3 by the council, repaid on time; Chidi 5
  - 3/4 loan #2 (4 NEAR) repaid late inside grace: closed, no gain, no slash. Loan #3 (2 NEAR, Ada pledged 1)
    defaulted: Chidi 0, Ada 4
  - 4/4 desk unseated, so loan #4 is Refused by Sputnik (`ERR_PERMISSION_DENIED`, proposals.rs:518); desk re-seated
  - Gate: `npm run story:check -- --run 1` → **`STORY PASS run=1 loans=0,1,2,3,4`** (exit 0)
  - Loan ids: money_shot 0, council 1, late 2, defaulted 3, refused 4. `deployments/story-1.json` written (no
    `ed25519:` strings), **left uncommitted** for the orchestrator
- **tail:92**: `npm run visitor` (17:36:08 → 17:36:37 UTC, exit 0):
  ```
  == 1/5 a throwaway account from the public testnet faucet
  fiador-visitor-k7lsumcc.testnet created with 10 NEAR (key held in memory only)
  == 2/5 join the visitor line (attaching the 0.05 NEAR storage deposit)
  seated with standing 0.1 NEAR
  == 3/5 ask above the standing: the desk holds it for a co-signer
  held: needs 0.1 NEAR co-signed; cancelling it
  == 4/5 ask within the standing: the DAO pays through its own Transfer proposal, no vote
  loan #5 of 0.1 NEAR paid via Sputnik proposal 12
  == 5/5 repay on time and watch the standing rise
  standing 0.1 -> 0.2 NEAR
  VISITOR PASS fiador-visitor-k7lsumcc.testnet loan=5
  ```
- Read-only `npm run verify` (exit 1, as expected before the freeze): 15 PASS, 1 FAIL, and the only FAIL is
  `desk is keyless (frozen) — 1 access key(s) on desk.fiador-ops-vmwpxk.testnet`. Ends `VERIFY FAIL (16 checks, 6 loans)`.
  No other failing line, so no findings.
- Balances after, read myself over public RPC: root **14.0040 NEAR** (story personas + gas ≈ 1.52); desk **3.5479 NEAR**
  (+0.05 visitor storage deposit); DAO **15.4215 NEAR** (−2 NEAR lost to the loan #3 default beat, as planned)
- Desk-side tx hashes (testnet explorer, signer-side tx shown):
  - Admit 3 (council proposal 5 execution): `FCnMuTPrWYtnC6UKDuocXe47osnXDuZWLWa8QQKfTAYC`
  - Loan #0: ask `HwDiQN2h365UYWL2stWcHm55mG3yXWnaU5iEqmkFWizx`, co-sign → file → approve → payout `FG1CKxCY1U2hTPx3bXD5e2TE5hTViGXE8KKf6fGPo5Ad`, repay `3gAwYN8FBPg9osAetQNi4KUC7xzmZ8UQ3jPLjbPkCFPR`
  - Loan #1: ask_council `66tC52wdaaj1mozY43EyupJAQqLN2jvP4VF6wpbeyrCo`, payout `B6XBPJjA7wV5us6BYzDhvwk5JKd1pVKjhs1TVvorQ35U`, sync_loan `GYLHHGJnzQvyRE2tRuvtmYE7XJLk7gEk4qjTibKJxtmj`, repay `DLnMaSDR5BeNPZUFpXTGSWrVrTyZpNoJVts5cG2qjTT5`
  - Loan #2: ask (filed + approved + paid) `9SMv5ZmRzc49aYRK8pRN9FeLV9tYJnmr8VVmPtPqr2aM`, late repay `5tPigvx8fnJKQczyoRY9tYiatRNjYe3Bz5P6saMDibF4`
  - Loan #3: ask `3v73WiYjLHq9kcAZJa68djP8mfV4LAhYs6EfcaEep19F`, co-sign → paid `CjdbUEaxpoLvAL2P34VnLxbg146oQQ8s6iMM68e5uQoD`, mark_default `9GopnLKWmUhRKVrL9s37htFsfDLMYu6TxHzT84Nt9Bvn`
  - Loan #4 (refused): `3VWv9j8UeMF9KqDNhSMnYE5EQTXNvikYgWCicF2mfCQN`
  - Loan #5 (visitor): join `3cUX5yafabQcqZFshNNYwhj5m1zqepsebnzVM7jxcyVp`, held ask `BuzmU97ECL1LmEVpNyUcmbFMfVUD4GBH6dudyCaJT8fZ`, cancel `7y5FGQDipXemSUc3VUUvo121pAW3G8zNYccWeX2eErX5`, ask → paid `HPAJynms16d18rY5z5rVHusVegSwBoXxpK3hDnmoY5iS`, repay `89u4gWVf4ZFeHSQdJJF2wMHSjz811MGWxQ6ikX4Mffex`
  - (Tx-to-step mapping is inferred from the time order and method names on the explorer.)
- Note: the visitor throwaway keeps 9.9475 NEAR it can never spend (its key lived only in memory). That's harmless on
  testnet but uses up one faucet claim per visitor run
- scripts:48 (freeze) NOT run, per the user's instruction

### scripts:48: done, PERMANENT, 2026-11-13 17:43 UTC (user: "run gate scripts:48 … I understand it is PERMANENT … This is my explicit go")

- Pre-checks: `git pull --ff-only` → up to date, tree clean. `get_loans` over public RPC: 0 Repaid, 1 Repaid,
  2 RepaidLate, 3 Defaulted, 4 Refused, 5 Repaid, so **0 loans in Filing or Voting**.
  `view_access_key_list` on the desk: **1 key (FullAccess) before**
- `npm run freeze -- --yes` (17:42:38 → 17:42:47 UTC, exit 0): `deleting 1 access key(s) from desk.fiador-ops-vmwpxk.testnet`,
  then 16 PASS lines, ending **`FREEZE PASS desk.fiador-ops-vmwpxk.testnet has no access keys; VERIFY PASS`**
- Gate: `npm run verify` (exit 0): all 16 lines PASS, including `PASS  desk is keyless (frozen) — 0 access key(s) on
  desk.fiador-ops-vmwpxk.testnet`, ending **`VERIFY PASS (16 checks, 6 loans)`**
- Verified myself over public RPC: `view_access_key_list` → **0 keys after**; desk code hash `GNKaSKXm…` unchanged;
  desk balance **3.5479 NEAR** (unchanged)
- DELETE_KEY tx (desk → desk): `2WCjkuZJ6J8pjZEjYM8DXn2Jb1o5ntLkMy4v5uWG7iQ1` (17:42:43 UTC)
- From now on, a desk fix means a new desk (`npm run seed -- --desk desk2.<root>`) that the council seats
- Still open: the root, council, smoke and persona accounts keep their keys in `.env` (by design: they are the demo's
  council/burners); only the desk is keyless

## Demo studio (Step 2.5), session card and rows, 2026-11-14 13:45 UTC

Run by demo-studio, model `claude-sonnet-5-5` (tier standard, effort high), against origin/main HEAD `9f0f574`. Read-only probes; nothing installed, nothing written to testnet, no wallet, no sign-in. Consent rule as above: no install runs until the user says yes to the install list; no upload, ever, in this pass.

### Session card (references/tollgate.md rows 5-6, 8-13, 16; row 8 skipped by instruction)

| # | Requirement | Class here | Result | Evidence |
|---|---|---|---|---|
| 5 | claude-in-chrome MCP responding in this session | not needed: browser scenes use Playwright driving the installed Chrome | N-A | `tabs_context_mcp` answered "this session has no tab group of its own"; no group was created, no tab opened |
| 6 | computer-use granted | not needed: the terminal scene is captured by ffmpeg `gfxcapture` on a window demo-studio launches; the foreground session itself needs the user's consent at Stage 3 | N-A | no computer-use tools in this session |
| 8 | wallet extension / burner permission | struck: no wallet access granted | SKIPPED (by instruction) | |
| 9 | Node ≥20 + npm | hard | PASS | node v22.23.4, npm 10.9.9 |
| 10 | ffmpeg ≥8.1 + gfxcapture + hw encoder identified | hard | PASS | ffmpeg 9.0.2-essentials (gyan.dev); `gfxcapture` and `ddagrab` listed by `ffmpeg -filters`; encoders h264_nvenc, h264_amf, h264_qsv and libx264 compiled in, but the only GPU is Intel UHD Graphics, so the software `libx264` path is used (a hardware encoder was not tested) |
| 11 | Python 3.10-3.12 reachable | degraded | PASS | `py -0p`: 3.12 (3.12.3); uv 0.11.16 |
| 12 | elevenlabs-mcp | VOICE is Kokoro | N-A | |
| 13 | Chrome logged into the upload account | UPLOAD is none | N-A | |
| 16 | ~2 GB free disk | degraded | PASS | 68 GB free on C: |

Other facts read: one display (\.\DISPLAY1, 1536×864 logical, 125% scaling); Google Chrome is installed; ports 5190 and 5192 are in use, 5231 is free (the demo server uses 5231); Playwright's own Chromium is already cached under `%LOCALAPPDATA%\ms-playwright` (not needed: Chrome is used); Kokoro-82M weights (`kokoro-v1_0.pth`, 327 MB) and the `af_heart` voice are already in the Hugging Face cache; torch 2.10.0+cpu is installed; the `kokoro` and `misaki` packages and espeak are not. Verdict: **2.5: CLEAR** pending the install list below.

### Rows

| date | event | detail |
|---|---|---|
| 2026-11-14 | live chain re-read (read-only, `npm run verify` plus view calls) | `VERIFY PASS (22 checks, 10 loans)`; params term 600 s, grace 300 s; DAO 15.4215 NEAR; book 0; standings ada-1 4, bayo-1 5, chidi-1 0, two visitors 0.2, goodkale2741.testnet 6; loan #0 Repaid, proposal 6; loan #3 Defaulted, proposal 9 |
| 2026-11-14 | demo script written | `docs/demo/2026-11-14-demo-script.md` (schema v1, headings conformance PASS); awaiting the user's approval of the whole call sheet |
| 2026-11-14 14:13 UTC | installs (user said yes to the install list, with rules) | All inside `demo/`, nothing global, root `package.json`, `web/`, `src/`, `scripts/` untouched. npm (`demo/node_modules`, 282 MB, 246 packages, `--ignore-scripts`, exact pins no carets): `remotion`, `@remotion/bundler`, `captions`, `cli`, `media`, `renderer` all 4.0.543 (every installed `@remotion/*` package reads 4.0.543); `mediabunny` 1.64.0 (the version `@remotion/media` itself requires); `playwright-core` 1.65.1; `react` and `react-dom` 19.3.1; dev: `typescript` 5.9.3, `@types/react` 19.3.0. The only package with an install script is `esbuild@0.28.1` (`postinstall: node install.js`): not run, its prebuilt binary works without it (`esbuild.exe --version` = 0.28.1). Python (`demo/.venv`, 432 MB, Python 3.12.3, `--system-site-packages` to reuse the existing torch 2.10.0+cpu, `--only-binary=:all:` so no build script ran): `kokoro` 0.9.4, `misaki[en]` 0.9.4, `spacy` 3.8.18, `transformers` 5.23.0, `espeakng-loader` 0.2.4 (no espeak MSI), `soundfile` 0.14.0 and their dependencies; spaCy model `en_core_web_sm` 3.8.0 from the official explosion/spacy-models GitHub release wheel (12.8 MB). Remotion renders with the installed Google Chrome: **no Chrome Headless Shell was downloaded**. No Playwright browser was downloaded. Disk: about 0.76 GB used on C: (68 GB free before, about 67.5 GB after). Smoke test: Kokoro offline (`HF_HUB_OFFLINE=1`, cached Kokoro-82M weights, voice `af_heart`) speaks 30 words in 11.1 s (2.7 words per second) with word timestamps. |
| 2026-11-14 14:13 UTC | storyboard stills rendered | `demo/out/storyboard/S1.png` to `S9.png`, `OUTRO.png` and `contact.png` (git-ignored); awaiting the user's approval of the rewritten script and of these stills before any recording |
| 2026-11-14 14:43 UTC | live take 1 (builder's own Chrome and Meteor; display recorded by ffmpeg ddagrab, 14:21:56 to 14:23:37 UTC) | Chain: PASS 14 of 14 (loan #10: Standing, 2 NEAR, proposal 20 Approved, Repaid on time, standing 6 to 7, DAO back to 15.4215). Frames: RETAKE. The builder left Chrome about 1 s after the repay approval, so the board never showed Repaid or the new loan in the loan book; the recording starts and ends on VS Code. Not used in the film. The loan is real and stays in the book. |
| 2026-11-14 14:43 UTC | live take 2 (ddagrab, 14:28:24 to 14:30:41 UTC, 1920×1080) | Chain: PASS 14 of 14, read-only (`demo/scripts/chain.mjs check`): loan #11 borrower goodkale2741.testnet, 2 NEAR, lane Standing, proposal 21 Approved (Transfer of 2 NEAR to the borrower, proposer the desk), created 14:29:08Z, Repaid 14:29:49Z (41 s, due 14:39:10Z), standing 7 to 8, repaid_on_time 3 to 4, DAO 15.4215 before and after, book 0. Ask tx and repay tx both approved by the builder in Meteor (two approvals; ask included). Frames: first and last read as images, ask and repay Meteor popups read at full size: only the public account id and testnet amounts, no phrase or key. Gaps accepted by the builder (option A): the Members page after the repay was not on screen (standing 8 shown in S5, read after the take); Chrome's toolbar shows other extension icons (masked in assembly); the taskbar is visible (cropped in assembly). |
| 2026-11-14 14:43 UTC | browser scenes S1, S4, S5, S6, S7 recorded | Playwright (installed Chrome, headless, temp profile, 1920×980, screencast 1920×980), read-only, every gate waited for the Live tag and passed on take 1 (S4 needed a corrected gate string after the first run: the page says "the desk filed proposal #6", not "Sputnik proposal #6"; the clip was recaptured). S7: 24 of 24 checks passed at 14:3x UTC. Files git-ignored under demo/capture/. |
| 2026-11-14 | terminal scene S8 and narration | Windows Terminal window launched by demo-studio (maximised, plain $ prompt), recorded alone by ffmpeg gfxcapture; `npm run verify` read-only: `VERIFY PASS (24 checks, 12 loans)`, no secret pattern in the teed stdout. Two earlier attempts failed (Windows Terminal splits a command line at ";", so two stray windows opened and the title match failed; the stray windows were left for the builder to close because killing the terminal process was refused; a third take showed code-page mojibake). Kokoro (offline, af_heart): 9 scenes, about 116 s of narration, word alignment succeeded for all. |
| 2026-11-14 | film assembled and QC'd | Remotion 4.0.543 Film composition, `demo/out/fiador-demo.mp4` (git-ignored): 1920×1080 h264 30 fps, 129.3 s, two-pass loudnorm −14.1 LUFS, −1.9 dBTP. Chrome Headless Shell (131 MB download, 303 MB unpacked under demo/node_modules/.remotion) was fetched automatically by Remotion during rendering although the installed Chrome was passed; the builder had asked to be told its size first (reported). The file path is written into docs/gates/submission-draft.md as the repo-relative path (the absolute path holds the Windows user name and the repo will be public). Awaiting the builder's watch; nothing published or uploaded. |

## Closing pass (Step 3), opened 2026-11-14 15:34 UTC

Main session `claude-opus-5-5` (tier top, effort high; the campaign's `top` binding is opus → claude-opus-5-5, so no
warning). Synced to origin/main `3974be3`, tree clean. Kickoff: the build is green, the demo cut is approved (Step 2.5
done). Granted: Bash, git and gh on the repo, plus read-only fetches of https://nearhackathon.com/HACKATHON.md. Struck:
Chrome, computer-use, inbox, wallet extensions, signup automation, installs, any other outside service. The user fills
and submits the form; I never fill it or press Submit. Same rule as above: one go per gate, and 7.2 needs its own go
with the word "irreversible" in it.

### Session card (Bash/git/gh rows only), 2026-11-14 15:30 UTC

| Row | Item | Result |
|---|---|---|
| 2 | gh auth | PASS: `Dotman-Bei` (keyring, active), scopes `repo, workflow, gist, read:org` |
| 1 | git remote + pull | PASS: `origin` = https://github.com/Dotman-Bei/fiador.git; `git pull` (gh credential helper) → already up to date at `3974be3`; `git status` clean |
| — | repo state | `gh api repos/Dotman-Bei/fiador` → `visibility: private`, `default_branch: main`, `has_pages: false`; no `gh-pages` branch; one worktree (the main tree) |
| 5-8, 15 | Chrome, computer-use, inbox, wallet, env store | NOT GRANTED / not needed (no secret is created in this pass) |

### Left over from earlier passes (none is a gate; listed so nothing is lost)

- Local only: Remotion's Chrome Headless Shell (131 MB, under git-ignored `demo/node_modules/.remotion`) may be deleted
  now the cut is approved; two stray terminal windows and local servers on 5192/5231 to close by hand. I don't touch them.
- A spare desk-only key on `goodkale2741.testnet` (the builder's own wallet account): harmless; wallet access is not
  granted, so it stays with the builder.
- README "Screenshot of the board" TBD: no new capture is possible without a browser grant, so row 13 links the tracked
  `overview-1440.jpg` (taken at the redesign, before the testnet bar moved into the footer).

### Recommended order

1. **7.1** history secret scan (read-only) → stop on any finding
2. **7.2** repo public flip (separate go, with "irreversible")
3. **8** GitHub Pages: build, `gh-pages` from a temporary worktree, enable Pages, verify
4. **13** README + draft TBDs, Known limitations, neutral wording; commit and push by explicit path
5. **12** re-fetch HACKATHON.md and diff against event.md §4
6. **14** paste sheet + final X post text + the USER-DECIDES list → STOP
7. User posts to X and pastes the URL → I put it in `demoUrl` and the README (last small commit) → user presses Submit (row 15)

Time: 8h25m to the deadline at opening.

### Closing evidence

(Each gate run in this pass adds an entry here.)

### Gate 7.1: done, FINDINGS, 2026-11-14 ~15:37 UTC (time corrected; first written as 15:45, ahead of the real clock) (user: "run gate 7.1")

Scope: every ref (`refs/heads/main`, `refs/remotes/origin/main`), 104 commits; `git log -p --all --text` (64,506 lines,
binaries included) plus a `git grep -a` of every commit snapshot, the list of paths ever added, and the commit metadata
and trailers. Script kept outside the repo (session scratchpad). Names and counts only; no value is written here.

| Check | Result |
|---|---|
| `ed25519:` secret keys (80+ base58 chars) | 0 |
| `ed25519:` strings of public-key length, `secp256k1:` | 0 |
| `FIADOR_ROOT_KEY=` with a value | 4 lines, all code in `scripts/root.ts` and the smoke plan (a regex test and a template literal `${key.toString()}`): **false positive** |
| `private_key` / `secret_key` / `seed_phrase` / `mnemonic` with a value | 0 |
| 12-word lowercase runs (seed-phrase shape) | 6 lines in 5 files (frontend contract, smoke plan, two wallet-status files, a wasm-inspect test): each line has 4-8 English stopwords that BIP39 never contains: **prose, false positive** |
| `.env` (or `.pem`, keystore, credentials, `id_*`) ever tracked | none; only `.env.example` was ever added |
| GitHub / Anthropic / OpenAI / Slack / AWS / Google tokens, PEM private keys | 0 |
| The session profile's personal email, and its local part as a handle | 0 |
| GitHub handle `Dotman-Bei` | 166 lines in 15 files: the repo owner's public handle (repo URL, LICENSE, links): expected, not a finding |
| **Windows user path / the Windows user name** | **FINDING.** Text: 5 lines at HEAD (and in history) in `docs/design/frontend-contract.md:7`, `docs/guide/2026-11-13-near-hackathon-runsheet.md:17-18`, `docs/idea-forge/2026-11-13-good-standing-brief.md:515,538`, all of the form `C:\Users\<name>\Documents\VIBE CODE\Hackathons\...`. Binary: `contract/res/fiador_desk.wasm` (24) and `contract/res/fiador_smoke.wasm` (17), all `C:\Users\<name>\.cargo\registry\...` panic-location paths that rustc embedded. The desk wasm is the code deployed (and frozen) on testnet, so those wasm strings are very likely already public on chain (not checked over RPC: outside service not granted) |
| **Commit metadata email** | **FINDING.** All 104 commits carry a personal gmail address (not the session profile's) as author and committer email (208 entries). It becomes public with the repo (commit pages, `.patch` URLs). Trailers are only `noreply@anthropic.com` co-author lines |

Per the kickoff: findings → STOP, no flip. Nothing was changed in the repo or on GitHub by this gate. The decision on
how to handle the two findings is the user's.

**User decision, 2026-11-14 ~15:39 UTC (corrected from ~15:50): "A."** Accept both findings and flip, history unchanged (no rewrite, no
force-push, no repo re-create). The optional forward-only touch-up (drop the 5 doc paths, noreply email for new commits)
was not asked for, so it is not done. Gate 7.2 still needs its own go with the word "irreversible".

### Gate 7.2: done, IRREVERSIBLE, 2026-11-14 15:40:53 UTC (user: "irreversible")

- Identity re-read first: `gh auth status` → logged in to github.com as `Dotman-Bei` (active); `gh api user --jq .login` → `Dotman-Bei`
- `gh repo edit Dotman-Bei/fiador --visibility public --accept-visibility-change-consequences` → exit 0
- Verify: `gh api repos/Dotman-Bei/fiador` → `visibility: public`, `private: false`, `html_url: https://github.com/Dotman-Bei/fiador`;
  anonymous `curl` of https://github.com/Dotman-Bei/fiador → HTTP 200
- Public with it, as accepted at 7.1 (option A): the Windows user name in 5 doc lines and 2 wasm files, and the
  commit-metadata email. No history rewrite.

