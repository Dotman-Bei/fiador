<!-- demo-script-schema: v1 -->
# Fiador — demo script

## 0 — Production card

| field | value |
|---|---|
| Project | Fiador: a credit union seat for Sputnik DAOs (desk contract on a Sputnik DAO, NEAR testnet) |
| Event | NEAR HACKATHON 2026, Social Money track (`social`); deadline 2026-11-14 23:59 UTC |
| Target length | 2:00 (hard maximum 2:15; X caps ordinary video at 2:20) |
| Resolution / fps | 1920×1080 @ 30 |
| Voice | Kokoro (local, offline, English), voice `af_heart` |
| Music | off (captions-only) |
| Wallet on camera | none live. The wallet run happened for real on 2026-11-14; it appears only as one honest still card (S8) built from the real screenshots in `docs/design/screenshots/wallet/` and the chain ids in `docs/design/ACCEPTANCE_EVIDENCE.md`, labelled "recorded on testnet 2026-11-14" |
| Upload target | none. The builder attaches the rendered MP4 to their own X post. The file stays local and git-ignored |
| Schema | v1 |

## 1 — Story & time budget

Prove: a Sputnik DAO can lend. A real loan went from a member through a co-signer to a Sputnik transfer that the desk filed and approved with no council vote, was paid by the DAO treasury and was repaid, and every step is read back from NEAR testnet in the browser and by `npm run verify`.
Money shot: scene S2 (the brief's money shot, "Ada asks for 6 NEAR, Bayo co-signs 2, the desk files and approves the Sputnik transfer with no council vote, she repays", shown as the real loan #0 read live from the chain; S3 is its follow-up).

The event publishes **no judging criteria and no weights** (`event.md` §5: "NONE PUBLISHED"; none are invented here). What it does publish: Claude Code and Codex screen every project first, checking that it runs and does what the README says (Q-017), and "previous NEAR hackathons evaluated technical implementation, design, impact, originality and sustainability — a good guide to prepare by". The seconds below follow that guide, weighted toward the money shot and toward what a screener can reproduce.

| criterion | weight | seconds |
|---|---|---|
| Impact: the problem, who it is for (S1) | none published | 12 |
| Working demo: the money shot, a real loan end to end (S2) | none published; screeners check it does what the README says | 25 |
| Technical implementation: lanes, what the desk can and cannot do, the board, a default shown honestly (S3, S4, S5) | none published | 41 |
| Reproducibility: checks in the browser and `npm run verify` (S6, S7) | none published; the screeners' reproducibility check | 22 |
| Sustainability and honesty: the real wallet run, testnet only, frozen desk, scripted council (S8, S9) | none published | 20 |
| Design and originality | none published; carried by every screen, no dedicated seconds | 0 |

Total: 120 s. A 3 s silent outro card (repo URL) is added after S9 and is inside the 2:15 ceiling.

**Story notes: what differs from the candidate story, and why**

1. The brief's money shot is a live ask-and-repay. Nothing may be written to testnet and no wallet is connected, so the money shot is the real loan #0 (made by the scripted story on 2026-11-13) read from the chain now. The narration says "read live" and "loan zero"; it never says "watch me ask". An on-screen tag in S2 reads: "A real loan from the scripted story (13 Nov), read from NEAR testnet now".
2. The "held until a co-signer" step is not narrated as something the page read: after co-signing the page shows no ask time ("the desk keeps no ask time once a request is co-signed"). The narration says what the page does show: Ada's own standing covered 4, 2 NEAR needed a co-signer, Bayo pledged 2.
3. The default scene uses loan #3, not #7. #3 is the scripted default and shows the co-signer's slash (Chidi's standing to zero, Ada loses her 1 NEAR pledge). #7 is the wallet run's unplanned default (a 120 s term missed by a human); it is kept honestly on the S8 evidence card, in one on-screen line, not narrated.
4. The wallet scene (S8) is stills only. It shows the real run's ask and on-time repay (loan #9, proposal 19), and a request above standing that was held and cancelled (the two real screenshots). The browser co-sign was never run and is not claimed.
5. Not in the cut, for time: the council-unseats-the-desk beat, the visitor line, the Requests tab, member passbook pages. All exist on the board.
6. Narration numbers in S4 and S7 (treasury about 15 NEAR, 22 checks, 10 loans) are templated from what the capture actually shows; S7's words are generated from the recorded `VERIFY PASS (N checks, M loans)` line, not from this script.

## 2 — Pre-flight — set up before recording

| # | item | how to verify | ✓ |
|---|---|---|---|
| 1 | App running — production build under a `/fiador/` subpath: `npm run web:build`, copy `dist/` to `demo/.serve/fiador/`, `node demo/serve.mjs` (Node built-ins only) on port 5231 (spare; not 5190, 5192 or 5173). Routes: `http://127.0.0.1:5231/fiador/` (landing), `/fiador/app/` (board), `/fiador/app/#/loans/0`, `#/loans/3`, `#/desk`. Reads live NEAR testnet through `https://rpc.testnet.fastnear.com` | `curl -I` each route returns 200; `netstat` shows 5231 free before and listening after; the page shows "Live" within 4 to 12 s (public RPC may rate-limit: the board retries after 5 s) | |
| 2 | Demo data — nothing is seeded or written. Chain facts re-read read-only before filming (2026-11-14 ~13:45 UTC, `npm run verify` plus view calls): 10 loans; params term 600 s, grace 300 s; DAO 15.4215 NEAR; book 0; standings ada-1 4, bayo-1 5, chidi-1 0, two visitors 0.2, goodkale2741.testnet 6; loan #0 Repaid proposal 6 (ada-1, 6 NEAR, co-signer bayo-1 pledged 2); loan #3 Defaulted proposal 9 (chidi-1, 2 NEAR, co-signer ada-1 pledged 1); loan #7 Defaulted proposal 15 | repeat the read-only calls immediately before capture; if any figure changed, update §4 and re-approve the changed lines (superseded-edit row). No `visitor`, `seed`, `story`, `admit`, `params` or any sending script is run | |
| 3 | Wallet state — N/A: no wallet is connected and no account is signed in. Only the public account id `goodkale2741.testnet` may appear (in the S8 stills) | grep the capture and render inputs for key, phrase and `.env` strings: none | |
| 4 | Browser hygiene — Playwright launches the installed Google Chrome (`channel: 'chrome'`) with a fresh temporary profile (no extensions, no bookmarks, not the builder's profile), 1920×1080 viewport, device scale 1, 100% zoom, `page.screencast` frames re-encoded to constant 30 fps | the launch log prints the temp profile path; the first frame is read as an image | |
| 5 | Desktop hygiene — the terminal scene (S7) only: Do Not Disturb on, the recording window is one I launch myself with a known title, in the repo folder, cleared, no `.env` open, no other window in the capture (gfxcapture captures that window only); monitor: one display, 1536×864 logical (125% DPI) | window title discovered at runtime, never a hardcoded handle; a frame check of the first second | |
| 6 | Capture toolchain — tollgate session card for Step 2.5 | `docs/gates/2026-11-13-gate-ledger.md`, section "Demo studio (Step 2.5)": rows 9, 10, 11, 16 PASS; row 5 not needed (Playwright, not the Chrome extension); rows 6, 8, 12, 13 N/A | |
| 7 | Assets — no logo and no music. Title/outro text: "Fiador — a credit union seat for Sputnik DAOs", `github.com/Dotman-Bei/fiador` (text only, no QR: the repo is not public yet and a QR adds a dependency); S8 stills: `docs/design/screenshots/wallet/6a-signed-in-meteor.jpg`, `6f-held-request-waiting.jpg`, `6f-request-cancelled.jpg`; chain ids from `docs/design/ACCEPTANCE_EVIDENCE.md` §Wallet run | the files exist; each id on the S8 card is compared to the evidence file by script | |

## 3 — Shot list

Every browser take waits for the "Live" tag and fails on "unavailable", "Stale" or "status unavailable" text; retakes wait 15 s or more between attempts (public RPC rate limit). On budget exhaustion a scene becomes an honest placeholder card that says it could not be captured, never a staged take.

| id | seconds | visual (route/action/window) | narration cue | driver | wallet verbs | gate assertion | retakes | take |
|---|---|---|---|---|---|---|---|---|
| S1 | 12 | Landing `/fiador/`: the h1 "Short until the payout lands? Your DAO can lend you the gap." held 4 s, then slow scroll to the band "A DAO treasury can only give money away" and its list of what Sputnik DAO and Trezu lack | S1 "A Sputnik DAO can…" | screencast | — | h1 text equals the hero line; the instrument shows "Live" and six station names; the problem band is in view at the end | 3 | |
| S2 | 25 | Landing, hero instrument, lane "With a co-signer", loan #0 selected: hold on "#0 ada-1 borrowed 6 NEAR" and the REPAID stamp, then read the six stations left to right (Asked, Co-signed, Filed, Approved, Paid, Closed) with the cursor under each; on-screen tag "A real loan from the scripted story (13 Nov), read from NEAR testnet now" | S2 "This is loan zero…" | screencast | — | the title reads "#0 ada-1 borrowed 6 NEAR"; stamp REPAID; 6 stations; text "Sputnik proposal #6" present; no "status unavailable"; "Live" tag | 3 | |
| S3 | 14 | Same instrument: lane "By council vote" (a council-lane loan appears, #1), then party "Desk": "The desk can" and "The desk cannot" lists with "0 access keys" | S3 "Switch the lane…" | screencast | — | the title reads "#1 chidi-1 borrowed 3 NEAR"; the party boundary heads read "The desk can" and "The desk cannot"; the keys line reads 0 access keys; "Live" tag | 3 | |
| S4 | 14 | `/fiador/app/` Overview: the Live chip, the book (0 NEAR out of a 12 NEAR cap), treasury balance, then scroll to the Loan book with each loan's Sputnik proposal id and status, then Members with standing and the repaid loans behind it | S4 "The board reads…" | screencast | — | the status chip aria-label starts "Data status: Live"; treasury shows 15.4215 NEAR; the loan book has 10 rows (#0 to #9); no "Unavailable" or "Stale" | 3 | |
| S5 | 13 | `/fiador/app/#/loans/3`: the loan page of the scripted default: DEFAULTED stamp, proposal #9, borrower chidi-1, co-signer ada-1 and her pledge | S5 "In the scripted story…" | screencast | — | page title "Loan #3"; stamp DEFAULTED; "#9" shown; "Live" chip | 3 | |
| S6 | 12 | `/fiador/app/#/desk` "Desk and proof": the checks run on arrival and the rows turn to Pass one by one | S6 "Desk and proof runs…" | screencast | — | all check rows read Pass, none read Fail, the summary names 22 checks (or the live count); waits up to 30 s; "Live" chip | 3 | |
| S7 | 10 | Terminal window (gfxcapture): `npm run verify` typed and run in the repo folder; the PASS lines scroll; hold on the last line | S7 "The same checks…" | gfxcapture | — | the teed stdout ends with `VERIFY PASS (N checks, M loans)` and exit code 0; the window frames are not black; no secret pattern in the stdout | 3 | |
| S8 | 10 | Still card, honest and labelled "recorded on testnet 2026-11-14": left, the real screenshot of the held request and then of its cancel; right, the evidence lines for loan #9 (proposal 19, repay tx, standing 5 to 6) and a second line "loan #7 missed its 120 s term and defaulted: kept in the book" | S8 "Recorded on testnet…" | N/A (Remotion still card) | — | each id and hash on the card equals the string in ACCEPTANCE_EVIDENCE.md; the label is present; no balance beyond what the evidence file states | 1 | |
| S9 | 10 | Card: three lines (Testnet only, unaudited, not real money · The desk is frozen: 0 access keys, no admin, no upgrade · The council is three scripted accounts sharing one operator key), then the outro card with the wordmark and the repo URL (3 s, silent) | S9 "Testnet only…" | N/A (Remotion card) | — | the three honesty lines appear as text; the outro shows the repo URL | 1 | |

Seconds sum to 120 (S1 to S9), the target; the outro card adds 3 s.

## 4 — Narration script

The single source of the words. Planning rate about 2.4 words per second; the real timing is audio-first from Kokoro. Names in prose are spelled for reading; the gloss gives the synthesis spelling.

**S1** — A Sputnik DAO can only give money away. A member short until a payout lands asks the whole council for a grant, or goes without. Fiador lets the DAO lend.
words: 30 · planned: 12s @ ~2.4 w/s · tone: plain, a little dry, the problem in one breath · gloss: Fiador → "Fee-ah-dor" (synthesize as "Fee-ah-DOR"); Sputnik → "SPUT-nik"; DAO → "dow"

**S2** — This is loan zero, read live from NEAR testnet. Ada asked for six NEAR. Her own standing covered four, so two needed a co-signer. Bayo pledged those two from his standing. The desk filed a native Sputnik transfer, proposal six, and approved it with its own single vote. No council vote. The DAO paid Ada, and she repaid on time.
words: 60 · planned: 25s @ ~2.4 w/s · tone: steady, one beat per station, the loudest moment of the film · gloss: NEAR → "near"; Ada → "AY-da"; Bayo → "BAH-yo"

**S3** — Switch the lane to follow a council-vote loan. Switch the party to see the desk's limits, read from the DAO's policy: it can file and approve transfers, nothing else, and it holds no access keys.
words: 35 · planned: 14s @ ~2.4 w/s · tone: matter-of-fact · gloss: none

**S4** — The board reads the same chain. The DAO treasury holds about fifteen NEAR, none out on loan. Every loan carries its Sputnik proposal id and status. Each member's standing traces back to named loans.
words: 34 · planned: 14s @ ~2.4 w/s · tone: calm walk-through · gloss: none. The figure "about fifteen" is templated from the captured treasury balance (15.4215 at the time of writing)

**S5** — In the scripted story, loan three ran past its grace period. Chidi's standing went to zero, and Ada, who co-signed, lost the one NEAR she pledged. A default is shown as a default.
words: 33 · planned: 13s @ ~2.4 w/s · tone: level, no drama · gloss: Chidi → "CHEE-dee"

**S6** — Desk and proof runs the checks in your browser, against public RPC: a two-of-three council, a narrow desk seat, no access keys, every loan matching its proposal. All pass.
words: 29 · planned: 12s @ ~2.4 w/s · tone: confident, short · gloss: RPC → "R P C". "All pass" is spoken only if every row passed in the take

**S7** — The same checks run from a terminal. npm run verify reads public testnet and prints one line per check. Twenty-two checks, ten loans: verify pass.
words: 25 · planned: 10s @ ~2.4 w/s · tone: flat, let the terminal speak · gloss: npm → "N P M"; the two numbers are templated from the recorded `VERIFY PASS (N checks, M loans)` line

**S8** — Recorded on testnet, November fourteenth: a member signed in with a wallet, asked one NEAR, repaid on time. A request above standing was held, then cancelled.
words: 26 · planned: 10s @ ~2.4 w/s · tone: matter-of-fact · gloss: none

**S9** — Testnet only, unaudited, not real money. The desk is frozen: no access keys, no admin, no upgrade. The council is three scripted accounts sharing one operator key.
words: 27 · planned: 10s @ ~2.4 w/s · tone: plain, unhurried, the honesty lines · gloss: none

Total 299 words, about 125 s at the planning rate; if Kokoro runs slower than that and the cut would pass 2:15, S4 and S5 are trimmed first (their lines drop to the first two sentences).

## 5 — Assembly plan

Order: S1 → S2 → S3 → S4 → S5 → S6 → S7 → S8 → S9 → 3 s outro card. No title card: the film opens on the real landing hero (the seconds go to the money shot, not an intro). Transitions: hard cuts. Captions: on, word-timed from Kokoro token timestamps, bottom third, one line at a time, white on a dark translucent bar, sized to read at 1080p and on a phone. Scene durations are audio-first: each scene lasts its narration plus 0.4 s, and the footage is held or trimmed to fit (never sped up).
Music: off. Loudness: −14 LUFS two-pass. Export: 1080p h264 at `demo/out/fiador-demo.mp4` (git-ignored). Total hard maximum 2:15.
Honesty on screen: S2's tag, S8's "recorded on testnet 2026-11-14" label, and S9's three lines. Mechanics: references/demo-stack.md in the kit, which is the authority on pins. Differences found when re-verifying it on 2026-11-14: Remotion latest is 4.0.543 (the sheet says 4.0.487; one exact version will be locked across every `@remotion/*` package), Playwright latest is 1.65.1 (inside the sheet's `>=1.59 <2`), the local ffmpeg is 9.0.2 essentials (inside `>=8.1`, `gfxcapture` compiled in). The machine has an Intel UHD iGPU, so the software `libx264` path is used.

## 6 — QC record

| check | scene(s) | pass/fail | note |
|---|---|---|---|
| money shot visible | | | |
| text legible at 1080p | | | |
| captions present + synced | | | |
| no capture yellow border | | | |
| no secret / no address that shouldn't be on screen | | | |
| per-scene duration within budget | | | |
| total duration within ±10% | | | |
| audio present, loudness sane | | | |

## 7 — Publish block

| field | value |
|---|---|
| Upload target + account | none. The builder attaches the MP4 to their own X post; no account is used here |
| Title | Fiador: a credit union seat for Sputnik DAOs (NEAR HACKATHON, Social Money) |
| Description | A Sputnik DAO can only give money away. Fiador lets it lend: a real loan from ask to repay, read from NEAR testnet, checked by `npm run verify`. Testnet only, unaudited, not real money. Built at NEAR HACKATHON. Repo: https://github.com/Dotman-Bei/fiador. Music attribution: none (music off) |
| Tags | #NEARHackathon, @NEARProtocol, Sputnik DAO, NEAR testnet, credit union |
| Visibility | N/A (no upload; attached to the builder's own X post) |
| URL | TBD (the builder's demo post URL, left for them) |
| Verified logged-out | TBD |
| Resolves | submission-draft demo video URL |

## 8 — Status ledger

| date | event | by |
|---|---|---|
| 2026-11-14 | scripted | demo-studio |
