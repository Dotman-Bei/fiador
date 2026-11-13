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
| 3 | **scripts:46** Seed the demo DAO (`deploy`, pause 2) | A | closing | Bash: `npm run seed -- --desk desk.<root>`, then `npm run seed:check`; if it reports "below the minimum viable float", `npm run root -- topup --count 2` and rerun | none | creates `desk.<root>` (3.5 NEAR) + float; more faucet claims are likely here (B11 puts the total at ~30 NEAR) | blocked on desk:31 + smoke:12 |
| 4 | **scripts:47** Story run 1 (`wallet`, pause 3) | A: persona accounts are script-made burners | closing | Bash: `npm run story -- --run 1`, then `npm run story:check -- --run 1` (~6 min of chain time) | none | ~1.5 NEAR persona funding + 2 NEAR of float lost to the default beat | blocked on scripts:45/46 |
| 5 | **tail:92** Live visitor run (`faucet`, pause 3) | A | closing | Bash: `npm run visitor` → `VISITOR PASS …` or `VISITOR SKIPPED` | none | throwaway faucet account; if the faucet is down, record it here and drop Task 94 | blocked on tail:91 + scripts:46 |
| 6 | **scripts:48** Keyless freeze of the desk (`account`, pause 3, IRREVERSIBLE) | A to execute, but permanent: I run it only on a separate, explicit go | closing | Bash: `npm run freeze -- --yes`, then `npm run verify` | the go itself; restated with "permanent" before running | after this the desk can never be patched (a fix means a new desk). The submission text (B17) claims the freeze, so if it's skipped, that sentence must be edited | blocked on scripts:47 + board:62 |
| 7 | **Repo public flip** (implicit) | A | closing | Bash/gh: re-read `gh auth status` (expect `Dotman-Bei`); scan history for secrets (`git log -p --all` grep for `ed25519:` secret keys / `FIADOR_ROOT_KEY=`, `.env` never tracked); then `gh repo edit Dotman-Bei/fiador --visibility public --accept-visibility-change-consequences`; verify with `gh api repos/Dotman-Bei/fiador --jq .visibility` | none | exposure is effectively irreversible (forks and caches), so the history scan comes first. Must be public by the deadline and through judging | pending (best after the freeze, so the README matches what shipped) |
| 8 | **Static hosting of `dist/`** (implicit, B16; see the options below) | A for the recommended option | closing | Recommended: GitHub Pages. (1) the orchestrator makes a one-line build change (`base: './'` in `web/vite.config.ts`, routed through the guide; I don't write product code); (2) after scripts:46, I run `npm run build` and push `dist/` to a `gh-pages` branch from a temporary `git worktree` (no change to the main tree); (3) `gh api -X POST repos/Dotman-Bei/fiador/pages -f source[branch]=gh-pages -f source[path]=/`; (4) verify `https://dotman-bei.github.io/fiador/` and `/fiador/app/` return 200 and load their assets | none | needs the repo public first (Pages on a private repo needs a paid plan; the account's plan didn't show via the API). Rebuild and push again if `deployments/testnet.json` changes | pending; needs the user's choice of option + the build change |
| 9 | **Demo video** (not a concierge gate) | n/a | closing | demo-studio (Step 2.5) resolves `TBD-post-build:demo-video-url` in the draft and logs its upload here | per demo-studio | dependency of rows 10 and 13 | not started |
| 10 | **X demo post** (implicit) | C: the user's own account; no X access granted | closing | I fill the draft's `board:` URL and hand over the final text (submission-draft.md §X post) and the video file path | the user attaches the video, publishes, and pastes the post URL back to me (`demoUrl`) | public post under the user's name | blocked on rows 8, 9 |
| 11 | **USER-DECIDES form fields** (B18) | C | closing | none: these values are never written into the repo. I'll ask for them in chat just before the form, or the user types them into the form | user gives: team lead name, email, **mainnet** payout account (one they own; never created by us), consent, tick `security` or not | personal data; the repo goes public, so none of it is committed | pending |
| 12 | **Re-fetch https://nearhackathon.com/HACKATHON.md** (implicit) | A, read-only | closing | web-fetch agent (or `curl`), diffed against event.md §4: field names, tracks, deadline, any new rule | none | the rules may change; a changed field blocks the form until resolved | pending (run right before row 13) |
| 13 | **Resolve the submission draft + README TBDs** | A | closing | Edit `docs/gates/submission-draft.md` and README `TBD-post-build:` lines (DAO id, desk id, board URL, repo link, demo post URL); commit by explicit path | none | B17 consistency: wording must match what shipped (freeze, visitor flow, wallet actions) | blocked on rows 2-10 |
| 14 | **Fill the hackathon form** (https://nearhackathon.com/#apply) | B in this session: Chrome not granted | closing | with a Chrome grant: claude-in-chrome fills every field from the resolved draft and leaves `website` (spam trap) empty, then stops before Submit. Without a grant: I give the user a field-by-field paste sheet. (The site also has a submission API, but posting to it IS submitting, so it would merge rows 14 and 15; I won't use it unless told to.) | user grants Chrome for this gate, or pastes the fields in | one submission per project, never resubmit (409); fixes go via /request-changes | NOT touched in this pass |
| 15 | **Submit** | C: final, irreversible | closing | none: the user presses Submit, then I verify the confirmation (screenshot/URL) if Chrome is granted | user presses Submit before 2026-11-14 23:59 UTC | irreversible | pending |

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
