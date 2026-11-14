<!-- demo-script-schema: v1 -->
# Fiador — demo script

## 0 — Production card

| field | value |
|---|---|
| Project | Fiador: a credit union seat for Sputnik DAOs (desk contract on a Sputnik DAO, NEAR testnet) |
| Event | NEAR HACKATHON 2026, Social Money track (`social`); deadline 2026-11-14 23:59 UTC |
| Target length | about 2:05 (scenes 2:04 plus a 3 s outro; hard maximum 2:15; X caps ordinary video at 2:20) |
| Resolution / fps | 1920×1080 @ 30 |
| Voice | Kokoro (local, offline, English), voice `af_heart` |
| Music | off (captions-only) |
| Wallet on camera | **live, the builder's own hand.** The builder drives their own Chrome with their own Meteor extension, already unlocked, signed in as `goodkale2741.testnet` (council-admitted, standing 6 NEAR). The recording is of the builder's real screen (ffmpeg `ddagrab` on the display), because the extension lives in the builder's real profile. demo-studio never touches the wallet, keys, password or Meteor: it starts and stops the screen recording and verifies the result afterwards by read-only RPC. No replay, no still-card substitute |
| Upload target | none. The builder attaches the rendered MP4 to their own X post. The file stays local and git-ignored |
| Schema | v1 |

## 1 — Story & time budget

Prove: a Sputnik DAO can lend, live. A member's own wallet asks the desk for 2 NEAR, the desk files and approves a native Sputnik transfer with no council vote, the DAO treasury pays, the member repays with one wallet approval, the loan closes Repaid on time and the member's standing rises 6 to 7, and every step is read back from NEAR testnet in the browser and by `npm run verify`.
Money shot: scenes S2 and S3, the live ask and the live repay, one real take on testnet (S2 ask, S3 repay). S4 is context only: a scripted-run loan.

The event publishes **no judging criteria and no weights** (`event.md` §5: "NONE PUBLISHED"; none are invented here). What it does publish: Claude Code and Codex screen every project first, checking that it runs and does what the README says (Q-017), and "previous NEAR hackathons evaluated technical implementation, design, impact, originality and sustainability — a good guide to prepare by". The seconds below follow that guide, weighted toward the money shot and toward what a screener can reproduce.

| criterion | weight | seconds |
|---|---|---|
| Impact: the problem, who it is for (S1) | none published | 12 |
| Working demo: the live ask and the live repay, the money shot (S2, S3) | none published; screeners check it does what the README says | 38 |
| Technical implementation: the scripted-run loan and what the desk can do, the board, defaults shown honestly (S4, S5, S6) | none published | 40 |
| Reproducibility: the checks in the browser and `npm run verify` (S7, S8) | none published; the screeners' reproducibility check | 21 |
| Sustainability and honesty: testnet only, frozen desk, what is scripted (S9) | none published | 13 |
| Design and originality | none published; carried by every screen, no dedicated seconds | 0 |

Scenes total 124 s; a 3 s silent outro card (repo URL) follows S9: 127 s, about 2:07, under the 2:15 ceiling. The trim rule (§4) keeps it there if Kokoro runs slower than the planning rate.

**What is scripted and what is real: said plainly, and kept visible in the film**

- **Scripted:** the three council accounts (`council-1`, `council-2`, `council-3`, three accounts that share one operator key; they admit members and set parameters through ordinary Sputnik proposals); the personas `ada-1`, `bayo-1` and `chidi-1`; loans #0 to #4 (the scripted story, 13 Nov; #4 was refused); loans #5 and #6 (the faucet visitor script).
- **Real and unplanned:** loans #7, #8 and #9 (the wallet run of 14 Nov, by the builder's own hand). #7 defaulted because the 120 s term was too short to repay by hand; the council has since raised the term to 600 s (proposal 16).
- **Live in this film:** the one ask and one repay of S2 and S3, from the builder's own wallet, plus every figure the board and `npm run verify` read from the chain during the recording.
- **Real on testnet throughout:** the Sputnik DAO, the desk contract, every proposal and every transfer. Nothing is real money.
- **Visible in the film:** S2 and S3 carry the tag "Live: a real wallet, a real transaction, NEAR testnet, 14 Nov"; S4 carries "Scripted-run loan: made by the scripted story on 13 Nov"; S5 holds on the board footer ("the council is three scripted accounts sharing one operator key"); S9 says all of it in three lines.

**Story notes: what the rewrite changed**

1. The money shot is now a **real, live interaction** on testnet, authorised by the builder. S2 and S3 show only what really happened. A failed take is retaken with a fresh ask; the film never shows a replay of the live scene. The replay of the scripted loan #0 is context only (S4), tagged as such.
2. Waiting is cut with hard cuts only where a visible clock shows the jump: a burned-in capture clock (UTC, from the capture's own start time) stays on screen through S2 and S3, plus the board's own "Live · N s" chip, the loan's time-left countdown and the transaction hash in the wallet panel. Footage is never sped up.
3. The default scene uses loan #3 (the scripted default, which shows the co-signer's slash), with a short second beat on loan #7 and the council's term raise to 600 s.
4. The wallet still card (old S8) is dropped; the live scene replaces it. The browser co-sign was never run and is not claimed.
5. Neutral wording throughout, matching the board: members are named as the board names them (`ada-1`, `bayo-1`, `chidi-1`), and the live account is "a member" or "the member"; no gendered pronouns.
6. Not in the cut, for time: the council-unseats-the-desk beat, the Requests tab, member passbook pages, the lane and party controls beyond one pass in S4.
7. Narration numbers that depend on the chain (S2's amount and standing, S3's standing, S8's counts) are templated from what the capture and the post-take read-only RPC actually show; the words are generated from the recorded values, not from this script.

**Optional beat O1: `npm run visitor` live in the terminal (the builder decides)**

A fresh faucet account does the whole lifecycle: created, joins the visitor line, is held above its standing, borrows within it, repays, standing rises. Time cost: the last run took 29 s (13 Nov, 17:36:08 to 17:36:37 UTC), plus faucet variability; the film cost is about 14 s with one narrated line, hard cuts and the terminal's own timestamps. It writes to testnet (a faucet account, a visitor-line seat, one loan) and uses one faucet claim. To stay under 2:15 it replaces S5 (8 s) and S4 is trimmed by 3 s: total about 130 s. **Recommendation: skip it.** The live take is already a full lifecycle, and the extra beat costs the board scene that shows the new loan in the book. If you want it: only you run `npm run visitor` in the recorded terminal; demo-studio never runs it.

## 2 — Pre-flight — set up before recording

| # | item | how to verify | ✓ |
|---|---|---|---|
| 1 | App running — production build under a `/fiador/` subpath: `npm run web:build`, copy `dist/` to `demo/.serve/fiador/`, `node demo/serve.mjs` (Node built-ins only) on port 5231 (spare; not 5190, 5192 or 5173), started by demo-studio before the live take. Routes: `http://127.0.0.1:5231/fiador/` (landing), `/fiador/app/` (board), `/fiador/app/#/loans/3`, `#/loans/7`, `#/desk`. Reads live NEAR testnet through `https://rpc.testnet.fastnear.com`. Build must be at or after `dd6f60e` (the wallet panel fix) | `curl -I` each route returns 200; `netstat` shows 5231 free before and listening after; the board shows "Live" within 4 to 12 s (the public RPC may rate-limit; the board retries after 5 s) | |
| 2 | Demo data — nothing is seeded. Chain facts re-read read-only immediately before the live take and saved as the "before" record: 10 loans, nothing open (book 0), params term 600 s and grace 300 s, DAO about 15.4215 NEAR, `goodkale2741.testnet` standing 6 with `repaid_on_time` 2, no request waiting; loan #0 Repaid proposal 6, loan #3 Defaulted proposal 9, loan #7 Defaulted proposal 15. The live take adds exactly one loan (id 10), then closes it | read-only RPC (`get_config`, `get_member`, `get_loans`, DAO `view_account`); if anything differs, stop and tell the builder. Rules for the take: only `goodkale2741.testnet`, only asks within standing, never more than 3 NEAR (planned: 2 NEAR), repay inside the 600 s term. No `visitor`, `seed`, `story`, `admit` or `params` is run by demo-studio | |
| 3 | Wallet state — the builder's `goodkale2741.testnet`, NEAR testnet, balance enough for gas (read-only check before the take), Meteor extension **unlocked before recording** so no password is ever typed or shown, the board's address `http://127.0.0.1:5231` allowed to open pop-ups, and the board signed in on that origin (a sign-in on a new origin is done by the builder before recording, off camera; it adds another desk-only key with a 0.25 NEAR allowance, as the 14 Nov wallet run's sign-in did). Meteor popups show the public account id and the testnet balance: fine. If a recovery phrase or key is ever on screen, stop and retake | the builder reads "Signed in as goodkale2741.testnet" on the board; demo-studio reads the account's standing and balance by RPC; demo-studio never opens, clicks or reads the wallet | |
| 4 | Browser hygiene — the builder's own Chrome (the Meteor extension lives in that profile; no temporary Playwright profile for S2 and S3), one window, **one tab** at `http://127.0.0.1:5231/fiador/app/`, every other tab closed, **bookmarks bar hidden** (Ctrl+Shift+B), zoom 100%, window maximised on the 1920×1080 display, nothing identifying in the toolbar except the Meteor icon and a generic profile icon, no extension popup left open, no downloads bar | the builder ticks it; demo-studio reads the first captured frame as an image before the take counts | |
| 5 | Desktop hygiene — **Do Not Disturb / Focus on**, every other window and app closed, the taskbar hidden (auto-hide, set by the builder) or cropped out in assembly (the bottom strip is cropped, and the live scenes are fitted into the 1080p frame), no notification able to appear (chat apps, mail, updaters, antivirus pop-ups closed), nothing from `.env` open or on screen, the mouse parked in a quiet spot, monitor: one display, 1536×864 logical (125% scaling). The terminal scene S8 uses a window launched by demo-studio with a known title | the builder ticks it; demo-studio reads the first captured frames of every take; window title discovered at runtime, never a hardcoded handle | |
| 6 | Capture toolchain — tollgate session card for Step 2.5 | `docs/gates/2026-11-13-gate-ledger.md`, section "Demo studio (Step 2.5)": rows 9, 10, 11, 16 PASS; row 5 not needed; rows 6, 12, 13 N/A; row 8 (wallet) is now the builder's own hand and demo-studio does not probe or touch it | |
| 7 | Assets — no logo, no music, no stills. Text only: title/outro "Fiador — a credit union seat for Sputnik DAOs", `github.com/Dotman-Bei/fiador` (no QR: the repo is not public yet); the on-screen tags quoted in §1; the burned-in capture clock | the strings are rendered from this file; the capture clock is computed from the logged capture start time (±1 s) | |

**Live-take checklist for the builder (do these, then say "ready")**

1. Do Not Disturb on. Close every other window and every other Chrome tab. Hide the taskbar (auto-hide) if you can; otherwise it is cropped out.
2. Chrome: one window, one tab; bookmarks bar hidden; zoom 100%; maximised.
3. Open the Meteor extension and unlock it now. Close its popup. Do not type a password during the recording.
4. Allow pop-ups for `http://127.0.0.1:5231` (the address bar's pop-up icon, or Chrome's site settings).
5. Open `http://127.0.0.1:5231/fiador/app/` (I serve it), connect with Meteor Wallet (off camera, once) and confirm "Signed in as goodkale2741.testnet".
6. Close nothing else, say "ready". I start the screen recording and say "recording". You then, at your own pace: look at the board a moment (standing 6) → type `2` in "Ask for (NEAR)" and click **Ask** → wait for the loan to appear on the board with its proposal id → click **Repay** → approve once in Meteor (the extension popup) → wait until the board shows the loan Repaid and the standing 7 → stay on that view for about 10 seconds. I stop the recording about 15 s after the chain shows Repaid, then check the result by read-only RPC and tell you pass or retake.
7. Repay within about 4 minutes of the ask (the term is 600 s). If a take stalls past 6 minutes, repay it yourself and we retake with a fresh ask. A loan that is not repaid within the 300 s grace after the term defaults and zeroes the standing, so never leave a take open.

## 3 — Shot list

Every Playwright browser take waits for the "Live" tag and fails on "unavailable", "Stale" or "status unavailable" text; retakes wait 15 s or more between attempts (public RPC rate limit). On budget exhaustion a scene becomes an honest placeholder card that says it could not be captured, never a staged take. S2 and S3 are one live capture on the builder's real screen; their gate assertions run afterwards by read-only RPC and by reading the captured frames. Playwright scenes S1, S4 to S7 are recorded after the live take so the board already shows the new loan.

| id | seconds | visual (route/action/window) | narration cue | driver | wallet verbs | gate assertion | retakes | take |
|---|---|---|---|---|---|---|---|---|
| S1 | 12 | Landing `/fiador/`: the h1 "Short until the payout lands? Your DAO can lend you the gap." held 4 s, then slow scroll to the band "A DAO treasury can only give money away" and its list of what Sputnik DAO and Trezu lack | S1 "A Sputnik DAO can…" | screencast | — | h1 text equals the hero line; the instrument shows "Live" and six station names; the problem band is in view at the end | 3 | |
| S2 | 20 | **LIVE.** The builder's Chrome on `/fiador/app/`: signed in as `goodkale2741.testnet`, standing 6; "Ask for (NEAR)" set to 2; click Ask; the new loan #10 appears in the loan book (Standing lane, Active) with its Sputnik proposal id; the DAO treasury figure drops by 2 NEAR. Capture clock and tag "Live: a real wallet, a real transaction, NEAR testnet, 14 Nov" burned in | S2 "Now live, on testnet…" | ddagrab | ask (signed in the page by the desk-only key; no approval expected) | by read-only RPC after the take: loan id 10 (the prior `loan_count`), borrower `goodkale2741.testnet`, principal 2 NEAR, lane Standing, proposal id present with `get_proposal` Approved and kind Transfer of 2 NEAR to the borrower, DAO balance before minus 2 NEAR; in the frames: the board's "Live" chip and the new loan row with its proposal id | 3 | |
| S3 | 18 | **LIVE, same capture.** Click Repay; the Meteor extension popup shows the repay approval (account id and testnet balance only); the builder approves once; the wallet panel shows the transaction hash; the board shows loan #10 Repaid, the standing 7 and the treasury back. Hard cuts only across visible clock jumps | S3 "Repay: one click…" | ddagrab | approveTx (once; repay attaches NEAR) | by read-only RPC: loan 10 status Repaid (not RepaidLate) with `closed_at_ms` ≤ `due_at_ms`, `goodkale2741.testnet` standing 7 and `repaid_on_time` 3, DAO balance equal to the "before" record; in the frames: no recovery phrase or key on screen, the Repaid stamp and standing 7 readable | 3 | |
| S4 | 15 | Landing hero instrument, lane "With a co-signer", loan #0 selected: the title "#0 ada-1 borrowed 6 NEAR", REPAID stamp, six stations read left to right, then the party "Desk" lists (can / cannot, 0 access keys). Tag "Scripted-run loan: made by the scripted story on 13 Nov" | S4 "The same chain…" | screencast | — | the title reads "#0 ada-1 borrowed 6 NEAR"; stamp REPAID; 6 stations; "Sputnik proposal #6" present; no "status unavailable"; the party boundary heads read "The desk can" and "The desk cannot"; "Live" tag | 3 | |
| S5 | 8 | `/fiador/app/` Overview after the live take: the "Live" chip, scroll to the loan book (each loan's Sputnik proposal id and status, including loan #10 Repaid), then Members with standing and the repaid loans behind it, then hold 2 s on the footer line ("the council is three scripted accounts sharing one operator key") | S5 "The board keeps…" | screencast | — | the status chip aria-label starts "Data status: Live"; the loan book lists #0 to #10 (11 rows); loan #10 reads Repaid; no "Unavailable" or "Stale"; the footer line is visible | 3 | |
| S6 | 17 | `/fiador/app/#/loans/3`: DEFAULTED stamp, proposal #9, borrower chidi-1, co-signer ada-1 and the pledge; then `#/loans/7`: DEFAULTED, proposal #15, with the on-screen line "loan #7: a real miss under a 120 s term; the council has since raised the term to 600 s (proposal 16)" | S6 "Loan three, from the scripted run…" | screencast | — | page title "Loan #3", stamp DEFAULTED, "#9" shown; then page title "Loan #7", stamp DEFAULTED, "#15" shown; "Live" chip on both | 3 | |
| S7 | 11 | `/fiador/app/#/desk` "Desk and proof": the checks run on arrival and the rows turn to Pass one by one | S7 "Desk and proof runs…" | screencast | — | all check rows read Pass, none read Fail, the summary names the live count; waits up to 30 s; "Live" chip | 3 | |
| S8 | 10 | Terminal window launched by demo-studio (gfxcapture, one window only): `npm run verify` runs in the repo folder; the PASS lines scroll; hold on the last line | S8 "The same checks…" | gfxcapture | — | the teed stdout ends with `VERIFY PASS (N checks, M loans)` and exit code 0; the window frames are not black; no secret pattern in the stdout | 3 | |
| S9 | 13 | Card: three lines (Testnet only, unaudited, not real money · The desk is frozen: 0 access keys, no admin, no upgrade · The council is three scripted accounts sharing one operator key, and the first loans came from a scripted run), then the outro card with the wordmark and the repo URL (3 s, silent) | S9 "Testnet only…" | N/A (Remotion card) | — | the honesty lines appear as text; the outro shows the repo URL | 1 | |

Seconds sum to 124 (S1 to S9); the outro card adds 3 s.

## 4 — Narration script

The single source of the words. Planning rate about 2.4 words per second; the real timing is audio-first from Kokoro. Names in prose are spelled for reading; the gloss gives the synthesis spelling. No gendered pronouns anywhere.

**S1** — A Sputnik DAO can only give money away. A member short until a payout lands asks the whole council for a grant, or goes without. Fiador lets the DAO lend.
words: 30 · planned: 12s @ ~2.4 w/s · tone: plain, a little dry, the problem in one breath · gloss: Fiador → synthesize as "Fee-ah-DOR"; Sputnik → "SPUT-nik"; DAO → "dow"

**S2** — Now live, on testnet. A member signed in with their own wallet asks the desk for two NEAR, within their standing of six. The desk files a Sputnik transfer and approves it. The DAO pays, and the board shows the new loan with its proposal id.
words: 46 · planned: 20s @ ~2.4 w/s · tone: steady, present tense, the loudest moment of the film · gloss: NEAR → "near"; Sputnik → "SPUT-nik". Amount (two) and standing (six) are templated from the take

**S3** — Repay: one click, one approval in the wallet. The loan closes repaid on time, and the member's standing goes from six to seven. Waiting is cut only where the clock on screen shows it.
words: 34 · planned: 18s (the live footage, not the words, sets this scene's length) · tone: matter-of-fact · gloss: none. "six to seven" templated from the take

**S4** — The same chain, from the scripted run on the thirteenth: loan zero. ada-1 asked for six NEAR, bayo-1 pledged two from their own standing, and ada-1 repaid on time. The desk itself holds no access keys.
words: 36 · planned: 15s @ ~2.4 w/s · tone: calm, labelled as scripted · gloss: ada-1 → "ADA one"; bayo-1 → "BAH-yo one"

**S5** — The board keeps every loan with its Sputnik proposal id, the new one included. The council is three scripted accounts.
words: 20 · planned: 8s @ ~2.4 w/s · tone: calm walk-through · gloss: none

**S6** — Loan three, from the scripted run, defaulted: chidi-1's standing went to zero, and co-signer ada-1 lost the one NEAR pledged. Loan seven was a real miss under a two-minute term; the council has since raised the term to six hundred seconds.
words: 41 · planned: 17s @ ~2.4 w/s · tone: level, no drama · gloss: chidi-1 → "CHEE-dee one"

**S7** — Desk and proof runs the checks in your browser, against public RPC: a two-of-three council, a narrow desk seat, no access keys, every loan matching its proposal. All pass.
words: 29 · planned: 11s (live recount) · tone: confident, short · gloss: RPC → "R P C". "All pass" is spoken only if every row passed in the take

**S8** — The same checks run from a terminal. npm run verify reads public testnet and prints one line per check. Twenty-three checks, eleven loans: verify pass.
words: 25 · planned: 10s @ ~2.4 w/s · tone: flat, let the terminal speak · gloss: npm → "N P M"; the two numbers are templated from the recorded `VERIFY PASS (N checks, M loans)` line (the loan count is 11 and the check count 23 if the live take adds loan #10)

**S9** — Testnet only, unaudited, not real money. The desk is frozen: no access keys, no admin, no upgrade. The council is three scripted accounts sharing one operator key, and the first loans came from a scripted run.
words: 36 · planned: 13s @ ~2.4 w/s · tone: plain, unhurried, the honesty lines · gloss: none

Total 297 words, about 124 s at the planning rate. **Trim rule:** if the audio-first timing pushes the cut past 2:15 including the outro, S5 drops to its first sentence, then S4 drops its last sentence, then S6 drops its last sentence, in that order, until the total is at or under 2:15. S2 and S3 are never trimmed.

## 5 — Assembly plan

Order: S1 → S2 → S3 → S4 → S5 → S6 → S7 → S8 → S9 → 3 s outro card. No title card: the film opens on the real landing hero (the seconds go to the money shot, not an intro). Transitions: hard cuts. Captions: on, word-timed from Kokoro token timestamps, bottom third, one line at a time, white on a dark translucent bar, sized to read at 1080p and on a phone. Scene durations are audio-first: each scene lasts its narration plus 0.4 s, and S2 and S3 last at least as long as the live footage they keep (footage is held or trimmed with hard cuts, never sped up).
Live scenes: the ddagrab capture of the display is cropped to remove the taskbar and fitted into the 1080p frame (the freed strip carries the captions); a burned-in capture clock (UTC, ±1 s, derived from the logged capture start time) and the tag "Live: a real wallet, a real transaction, NEAR testnet, 14 Nov" stay on through S2 and S3; every hard cut sits on a visible clock jump.
Music: off. Loudness: −14 LUFS two-pass. Export: 1080p h264 at `demo/out/fiador-demo.mp4` (git-ignored). Total hard maximum 2:15.
Honesty on screen: the tags in §1 and S9's three lines. Mechanics: references/demo-stack.md in the kit, which is the authority on pins. Differences found when re-verifying it on 2026-11-14: Remotion latest is 4.0.543 (the sheet says 4.0.487; one exact version, no carets, across every `@remotion/*` package), Playwright latest is 1.65.1 (inside the sheet's `>=1.59 <2`), the local ffmpeg is 9.0.2 essentials (inside `>=8.1`, `gfxcapture` and `ddagrab` compiled in). The machine has an Intel UHD iGPU, so the software `libx264` path is used. Remotion uses the installed Chrome first; the Chrome Headless Shell is downloaded only if that fails, and only after the builder is told its size.

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
| Description | A Sputnik DAO can only give money away. Fiador lets it lend: a live ask and repay from a member's own wallet on NEAR testnet, checked by `npm run verify`. Testnet only, unaudited, not real money; the council is three scripted accounts. Built at NEAR HACKATHON. Repo: https://github.com/Dotman-Bei/fiador. Music attribution: none (music off) |
| Tags | #NEARHackathon, @NEARProtocol, Sputnik DAO, NEAR testnet, credit union |
| Visibility | N/A (no upload; attached to the builder's own X post) |
| URL | TBD (the builder's demo post URL, left for them) |
| Verified logged-out | TBD |
| Resolves | submission-draft demo video URL |

## 8 — Status ledger

| date | event | by |
|---|---|---|
| 2026-11-14 | scripted | demo-studio |
| 2026-11-14 | approved (v1 call sheet, with the builder's amendments 1 to 3 and the live money shot) | the builder |
| 2026-11-14 | superseded-edit (S2 and S3 are now the live ask and repay; the loan #0 replay shrinks to S4 context; old S3 merged into S4; old S8 wallet still card dropped; neutral wording; loan #7 mention carries the 600 s term raise; live-take pre-flight and scripted-vs-real list added; optional beat O1 listed; total about 2:07, cap 2:15); fresh approval pending | demo-studio |
