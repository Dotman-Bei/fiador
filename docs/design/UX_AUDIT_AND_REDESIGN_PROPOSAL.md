# Fiador UX audit and redesign proposal

Date: 13 November 2026. Audited commit: `47b495c` on `main`.

Status: review and proposed direction, written for the builder's approval as the frontend contract requires (item 7). No runtime UI change was made for this audit, and this document authorizes no implementation by itself. If it is approved, stage S1 rewrites `docs/design/direction.md` to the new token set and page map; until then `direction.md` remains the source of truth for the shipped pages.

## 1. Recommendation

Build Fiador around one experience: **a credit desk you can watch work.** Every loan is a short public chain between named parties: a member asks, sometimes a co-signer pledges, the desk files a Sputnik transfer, the desk or the council approves it, the DAO pays, and the member repays or defaults. Each link of that chain can be read from testnet. The landing hero should be that chain, live: the visitor picks a lane and sees the real loan that went through it, then picks a party and sees what that party did, can do and cannot do, read from the DAO's live policy. The app should be the desk itself: a shell with routes, an overview that first says whether anything needs a hand, a page for every loan and every member, the proof run in the browser, and wallet actions that pass through a review slip and an operations dock that reports only what the chain returned.

Keep what already works:

- The data honesty: public RPC only, no invented rows, nothing shown while loading except the structure, the read time and endpoint on the page.
- The stamp as the outcome signature, oxblood as the one accent, the verified warm ink ramp, tabular figures, sentence case, no icons for decoration.
- The wallet as an optional extra: everything reads with no wallet and no secret.
- The tested pure functions: `stampInk`, `stampWords`, `laneWords`, `shortAccount`, `entryDetail`, `proposalWords`, `loanRows`, `waitingRows`, `memberRows`, `timeLeft` and the call specs in `wallet/actions.ts`.
- The global focus ring and the global reduced-motion rule.

Change substantially:

- The hero: from a figure to look at, beside a headline, to a full-width instrument with two real controls.
- `/app`: from one scroll of equal cards to a hash-routed shell with Overview, Loans, Loan detail, Requests, Members, Member detail, Desk and proof, and Activity.
- The state model: loading, live, stale, unavailable, partial, empty, not seeded and not found become distinct, per panel, with freshness always visible.
- Phone and tablet: lists become slips under 900px instead of tables that hide the deciding columns.
- The wallet: from three bare forms to actions in context, a preview from the last read, a review slip and an operations dock.
- The proof: from a card and a CLI command to the same checks run live in the browser.
- The interface typeface: Instrument Sans is rooq.trade's face and is replaced.

Adding entrance animation or new colors to the current boxes would leave every P1 finding below in place.

### Constraints this proposal keeps

- **Static site under a subpath.** Deployed to GitHub Pages at `/fiador/` with `base: './'` ([vite.config.ts](../../web/vite.config.ts)). Client routes are hash routes (`./app/#/loans/3`), so a deep link works with no server rewrite; assets stay relative; no History API routing.
- **Live data only through the existing reads.** Everything comes from `src/lib` (`desk`, `rpc`, `verify`, `units`, `deployments`, `sputnik`) through `RpcClient` against the RPC in `deployments/testnet.json`. No backend, no indexer, no fabricated number, name or address. A computed figure is labelled derived; anything illustrative is labelled illustrative (none is planned).
- **Scope of edits.** Only `web/` and `docs/design/` change. Not `contract/`, `scripts/`, `src/`, `deployments/`, `README.md`, `docs/gates/` or `.env`. Where `src/lib` is not browser-safe (the CLI's verify gatherer imports `node:fs`), `web/` gets its own gatherer that calls the same `src/lib` functions.
- **No wallet, no secret.** Every page works read-only. The wallet (MyNearWallet via Wallet Selector) stays optional and was never exercised end to end: section 10 lists what cannot be tested without one, and the UI never shows a transaction state it did not read from the chain.
- **README step 3 cannot be edited**, so `/app/` with no hash must still show, on its first screen of content, the treasury, a "Waiting for a co-signer" list, the loan book with each loan's Sputnik proposal id and status, and every member's standing with the repaid loans behind it. Overview keeps all four, under those words.
- **Facts kept true:** testnet only and unaudited; the desk is frozen (no access keys); the council is three scripted accounts sharing one operator key; standing starts as a council grant; the DAO is `fiador.sputnikv2.testnet` and the desk `desk.fiador-ops-vmwpxk.testnet`.
- **Frontend contract:** the landing keeps hero, problem, how it works, proof, a button into `/app` and a footer with the repo link, with copy drawn from the brief and README, and no demo-video section (item 1); tokens stay the only place design values live (items 4 to 6); the unslop checklist runs at the end (item 5).
- **Tests:** every existing test stays green or is updated with a stated reason (section 9 lists which).
- **Nothing installed.** No npm package is added: the router, dialog, combobox and dock are written with React only. Fonts keep coming from Google Fonts, already used; the new families are listed in section 5 for approval. No outside image service.

## 2. Evidence and review limits

What I inspected:

- **Source:** every file in `web/src` (Landing, Passbook, Board, data, MemberActions, wallet, actions, ledger, deployment, the four stylesheets and their tests); `src/lib/desk.ts`, `rpc.ts`, `verify.ts`, `units.ts`, `deployments.ts`, `sputnik.ts`; `scripts/verify.ts` and `scripts/lib/inspect.ts`; the desk contract's public methods (`contract/desk/src`) to ground the flows; `README.md`; `docs/design/direction.md`; the gate ledger and the run sheet.
- **The running app:** `npm run web` on port 5190 (5173 and 5174 were taken). Screenshots taken with headless Chrome driven over the DevTools protocol from a Node 22 script using only built-ins (no package installed), at exact CSS widths, device scale 1, full page. The 390px captures use mobile emulation. Held RPC requests give the loading state, blocked RPC the unavailable state. DOM measurements: scroll widths, scroller widths, focusable count, headings, live regions, table semantics. First-data timing: five samples.
- **Chain reads:** `npm run verify` printed `VERIFY PASS (16 checks, 6 loans)`. A read-only script read proposals #6, #7 and #9, the six loans' timestamps, `get_last_proposal_id` (13) and `get_proposals` (13 proposals, ids 0 to 12) through `RpcClient`.
- **References:** rooq.trade and rooq.trade/app at 1536 CSS px in Chrome (125% display scaling makes the desktop window 1536 wide); nightcrew.suitz.xyz and stigi.suitz.xyz home pages; the reference board in section 4.

What I could not verify:

- **No wallet.** Sign-in, ask, co-sign, repay and cancel were never run. How MyNearWallet returns to a hash-routed page (whether `transactionHashes` comes back in the query string and whether the hash survives) is unconfirmed. Reading a transaction's status with the RPC `tx` method was not exercised with a real hash. The gate ledger records the wallet gate as not granted ([gate ledger, row 8](../gates/2026-11-13-gate-ledger.md#L26)).
- **No populated attention state exists on the frozen desk right now.** All six loans are closed and no request is waiting, so a held request, an active loan, an overdue loan and a council-lane loan awaiting votes were reviewed from source and fixtures only.
- **No assistive technology.** No screen reader, no live Tab walkthrough, no 200% browser zoom, no 320px width, no 1920px capture, no real phone, no keyboard-open or safe-area test.
- **Timings are one machine and one network**, five samples, with no LCP, INP or CLS traces.
- **NearBlocks** returned a Cloudflare check to the automated browser and was not inspected (it was not bypassed). Fiador links there; a person's browser normally passes it.

Screenshots of the current build (all in [screenshots/](screenshots/), 728 KB in total):

- Landing: [1440](screenshots/current-landing-1440.jpg), [768](screenshots/current-landing-768.jpg), [390](screenshots/current-landing-390.jpg), and [with RPC blocked](screenshots/current-landing-rpc-down.jpg).
- Board: [1440 full page](screenshots/current-app-1440.jpg), [1440 first screen](screenshots/current-app-1440-first-screen.jpg), [768](screenshots/current-app-768.jpg), [390 full page](screenshots/current-app-390.jpg), [390 first screen](screenshots/current-app-390-first-screen.jpg), [loading (RPC held)](screenshots/current-app-loading.jpg) and [RPC blocked](screenshots/current-app-rpc-down.jpg).

## 3. Findings

Priority describes the redesign's impact: **P1** affects understanding, continuity or trust; **P2** affects clarity and quality. These are UX findings, not contract audit severities. F1 to F10 confirm, correct or extend the builder's pre-audit; F11 to F13 are new.

| ID | Priority | Finding and evidence | Recommended treatment |
|---|---|---|---|
| F1 | P1 | **The hero shows the product's data but not the product.** The passbook is live: it reads the first six loans with their proposal ids and stamps ([Passbook.tsx:19](../../web/src/landing/Passbook.tsx#L19), [Landing.tsx:18-32](../../web/src/landing/Landing.tsx#L18-L32)). So "decorative" is half right. The content is real, but it is a figure to look at, with no control, and it reads the oldest six loans, never the latest. Everything that explains the product sits in three prose bands below it: lanes, outcomes, the council's powers, the proof ([Landing.tsx:34-151](../../web/src/landing/Landing.tsx#L34-L151)). The page measured 3,660px tall at 1440 wide, with 13 headings. Its composition (headline left, framed object right) is also nightcrew's and stigi's (observed 2026-11-13). [1440](screenshots/current-landing-1440.jpg), [390](screenshots/current-landing-390.jpg). | Replace it with the live chain instrument (6.1): two controls (lane, party) over real loans and the live policy. The explanation moves into the instrument, and each band below carries one real element. |
| F2 | P1 | **`/app` is one scroll with no shell.** [main.tsx:22-23](../../web/src/board/main.tsx#L22-L23) renders the board, then the wallet forms. [Board.tsx:90-130](../../web/src/board/Board.tsx#L90-L130) stacks treasury, desk, waiting list, loan book and members at equal weight. There are no routes, no URL for a loan or a member, no search and no filter. At 390 wide the loan book starts 1,148px down the page and the wallet panel 1,963px down (measured). [1440](screenshots/current-app-1440.jpg), [390 first screen](screenshots/current-app-390-first-screen.jpg). | A hash-routed shell (6.2): Overview, Loans, Loan detail, Requests, Members, Member detail, Desk and proof, Activity. The topbar carries search, status, the testnet line and operations. |
| F3 | P1 | **No loan detail.** A loan is one table row, and its proposal shows as text such as "#6 Approved", with no link ([Board.tsx:49-55](../../web/src/board/Board.tsx#L49-L55), [data.ts:86](../../web/src/board/data.ts#L86)). The board already fetches every proposal ([data.ts:27-30](../../web/src/board/data.ts#L27-L30)) but keeps only its status, discarding the proposer, the votes by account, the submission time and the transfer kind. **Correction: transaction links are not available.** Public RPC views carry no transaction hashes and Fiador has no indexer. What the chain can show is the desk's own timestamps (created, due, closed), Sputnik's proposal facts, and explorer links for accounts. Read 2026-11-13: proposal #6 was filed by the desk with votes `{desk: Approve}`; proposal #7 has approvals from council-1 and council-2. Sputnik 2.3.1 keeps no approval time ([sputnik.ts:158](../../src/lib/sputnik.ts#L158)). For a co-signed loan, the desk drops the request when the co-signer signs ([requests.rs:31-32](../../contract/desk/src/requests.rs#L31-L32)), so the ask time of that lane is unknown. A transaction hash exists only for an action this browser submits. | Loan detail with the proposal chain (6.5), every station labelled with its source; the proposal as read, in a disclosure; that loan's verify check; explorer links for accounts; transaction links only for this browser's own operations. |
| F4 | P1 | **States are only partly distinct, and stale data passes for live.** First-load loading and first-load error exist ([Board.tsx:173-181](../../web/src/board/Board.tsx#L173-L181); [loading](screenshots/current-app-loading.jpg), [RPC blocked](screenshots/current-app-rpc-down.jpg)), and the passbook has its own ([Passbook.tsx:76-84](../../web/src/landing/Passbook.tsx#L76-L84); [landing, RPC blocked](screenshots/current-landing-rpc-down.jpg)). The gaps: (a) After one good read, a failed poll is stored ([Board.tsx:152](../../web/src/board/Board.tsx#L152)) but never shown ([Board.tsx:183](../../web/src/board/Board.tsx#L183)). The board keeps the old figures with a raw ISO "Last read" line ([Board.tsx:126](../../web/src/board/Board.tsx#L126)), and "Time left" freezes because the clock only advances on success ([Board.tsx:148](../../web/src/board/Board.tsx#L148)). (b) A missing DAO account renders as 0 NEAR ([data.ts:33](../../web/src/board/data.ts#L33)): unavailable shown as empty. (c) A missing proposal status shows "…" forever ([data.ts:86](../../web/src/board/data.ts#L86)). (d) Loading replaces the whole board and offers no retry. Its notices are not live regions; the only one on `/app` is the wallet status. (e) Polls overlap. A new 13-call read starts every 5 s ([Board.tsx:156](../../web/src/board/Board.tsx#L156)) while first reads took 3.5 to 12.4 s, and nothing stops an older read from landing after a newer one. | A per-resource state model (section 7, Data states): not seeded, loading, live, stale, unavailable, partial, empty. Freshness in the topbar, a retry action, and polls scheduled only after the previous read settles. |
| F5 | P1 | **No attention queue.** Requests waiting for a co-signer are listed third, with no action ([Board.tsx:12-34](../../web/src/board/Board.tsx#L12-L34)). An active loan's time left is a column hidden off-screen at 390 and 768 wide. An overdue loan reads "expired" like any other ([data.ts:49](../../web/src/board/data.ts#L49), [data.ts:85](../../web/src/board/data.ts#L85)). `mark_default`, which anyone may call after term plus grace ([council.rs:41-48](../../contract/desk/src/council.rs#L41-L48)), and `sync_loan` are not surfaced. An unseated or keyed desk would show only as a word in the desk card ([Board.tsx:113-114](../../web/src/board/Board.tsx#L113-L114)). Today nothing needs attention (all six loans are closed and no request is waiting), and the board cannot say so in one line. | Overview leads with the attention queue (6.3), ordered by urgency. Each item gives its deadline and its one action. A real empty state names the last movement. |
| F6 | P1 | **The wallet actions are bare forms that claim more than they read, and were never exercised.** Three forms, no review step ([MemberActions.tsx:52-72](../../web/src/wallet/MemberActions.tsx#L52-L72)). After the wallet call resolves, the status reads "\<method\> sent; the board updates within 5 seconds" ([MemberActions.tsx:30](../../web/src/wallet/MemberActions.tsx#L30)). It reads no hash, no outcome and not the desk's answer, which is held or loan ([desk.ts:81-83](../../src/lib/desk.ts#L81-L83)), and contract refusals surface raw. Repay asks for the principal in yocto "from the loan book" ([MemberActions.tsx:68](../../web/src/wallet/MemberActions.tsx#L68)), but the loan book shows NEAR ([data.ts:83](../../web/src/board/data.ts#L83)), so repay cannot be completed from the board without converting by hand. Co-sign makes the member type the borrower's account ([MemberActions.tsx:60](../../web/src/wallet/MemberActions.tsx#L60)), though the waiting list already knows it. No end-to-end wallet run exists (see section 2). | Actions in context, with a preview from the last read and a review slip that writes the call out (6.10). An operations dock tracks the hash through real stages only (6.11). Both are marked untested until a real wallet run. |
| F7 | P1 | **Members have no detail, and no standing can be explained.** The members table shows figures and a list such as "#0" ([Board.tsx:64-88](../../web/src/board/Board.tsx#L64-L88), [data.ts:100-113](../../web/src/board/data.ts#L100-L113)). The desk also returns on-time repayments, defaults and the visitor seat (joined, window, deposit, loans taken) ([desk.ts:39-56](../../src/lib/desk.ts#L39-L56)); none of it is shown. **Correction: the desk keeps no standing history, only the current figure.** A member page can list every loan that moved it, with the rule each outcome applies ([repay.rs:19-47](../../contract/desk/src/repay.rs#L19-L47)). Derived that way from today's loan book, all four members reconcile with the figure the desk reports (ada-1 4, bayo-1 5, chidi-1 0, the visitor 0.2 NEAR). A derivation must still say it is one, and must show a mismatch rather than hide it. | Member detail (6.6): figures, the member's passbook (every loan as borrower or co-signer, stamped), and a derived standing trail with a reconciliation line. |
| F8 | P1 | **No phone composition: the deciding columns are hidden at 390 and 768.** At 390 the loan book is 1,136px wide in a 316px box, so 28% is visible. Loan, lane and borrower show; amount, status, time left and proposal do not ([390](screenshots/current-app-390.jpg)). The members table is 877px in the same 316. At 768 the loan book is 1,136 in 657, and status and proposal are still off-screen ([768](screenshots/current-app-768.jpg)). There is no page-level sideways scroll at any measured width (scroll width equals client width at 390, 768 and 1440). Full ids such as `ada-1.fiador-ops-vmwpxk.testnet` fill every cell ([data.ts:81](../../web/src/board/data.ts#L81)), while the landing shortens them ([ledger.ts:26](../../web/src/ledger.ts#L26)). | Phone and tablet get their own composition (6.12). Under 900px, lists become slips with id, party, amount and outcome on the first line. Phones get a bottom tab bar. One naming rule for accounts applies everywhere. |
| F9 | P1 | **The proof is the strongest thing the product has, and it is a small card.** The desk card shows seated yes/no, keyless yes/no and four parameters ([Board.tsx:110-120](../../web/src/board/Board.tsx#L110-L120)). The policy is read, but only its membership is used ([data.ts:23-24](../../web/src/board/data.ts#L23-L24)): the seat's two permissions, the council and its 2-of-3 rule, and factory auto-update are absent. The checks exist only in the CLI and as landing prose ([Landing.tsx:117-151](../../web/src/landing/Landing.tsx#L117-L151)). They can run in the browser: `runChecks` is pure ([verify.ts:53](../../src/lib/verify.ts#L53)) and its inputs are public reads. Only the CLI's gatherer imports `node:fs` ([inspect.ts:2](../../scripts/lib/inspect.ts#L2)), so the web needs its own. Today: `VERIFY PASS (16 checks, 6 loans)`. | The Desk and proof route (6.8) and the landing's proof section run every check live in the browser with the same code, show each result and its detail, and lay out seat, council, keys and parameters as read. |
| F10 | P2 | **Keyboard, focus and semantics: partly done, partly unaudited.** Present: a visible focus ring on every element ([base.css:85](../../web/src/styles/base.css#L85)); reduced motion removes all animation and transition ([base.css:327](../../web/src/styles/base.css#L327)). Missing: a skip link on `/` and `/app`; table captions and `th` scope (0 found); a label or role on the sideways table boxes; live regions for the loading and error notices. Full account names live only in `title` tooltips ([Passbook.tsx:61](../../web/src/landing/Passbook.tsx#L61)), out of reach by touch or keyboard. No screen reader or Tab walkthrough was run. There are no tabs yet, so no tab defect today. The redesign adds radio groups, tabs only where panels switch, a modal sheet and a combobox, and each must follow its WAI-ARIA pattern. | Skip link, landmarks, captions and scopes, live regions for data and operation state; the APG radio group, tabs, dialog and combobox patterns. Accepted by a keyboard script and a reduced-motion run (section 10). |
| F11 | P1 | **Reads are serial and slow, and the first view waits for all of them.** One poll makes 13 RPC calls in sequence ([data.ts:20-30](../../web/src/board/data.ts#L20-L30), plus `readDesk`'s paged reads at [desk.ts:137-143](../../src/lib/desk.ts#L137-L143)). A typical call took 180 to 370 ms, with one stall of 2.1 s. First board data, five samples: 3.5, 3.9, 5.6 and 12.4 s, and once not yet loaded at 9 s. Every poll re-reads the proposals of closed loans, whose status can no longer change. | Parallel independent reads; terminal proposal statuses cached; polling paused while the tab is hidden; each panel renders as soon as its own read lands. |
| F12 | P2 | **Some copy is imprecise.** "Available to lend" is the DAO's `get_available_amount` ([data.ts:22](../../web/src/board/data.ts#L22), [Board.tsx:106](../../web/src/board/Board.tsx#L106)): the treasury's spendable balance, not the desk's lending room, which the book cap and each member's standing also bound. Term and grace read "120 s / 60 s", the values at the time of this audit (the council raised them to 600 s / 300 s on 2026-11-14, proposal 16) ([Board.tsx:118](../../web/src/board/Board.tsx#L118)), and the read time is an ISO string ([Board.tsx:126](../../web/src/board/Board.tsx#L126)). Accounts are short on `/` and full on `/app`. The landing's proof title "Check it yourself" ([Landing.tsx:119](../../web/src/landing/Landing.tsx#L119)) is word for word a section title on rooq.trade (observed 2026-11-13), which the distinctness rule excludes. | "Treasury spendable", plus "Room under the cap" as a labelled derived figure; human durations, with raw values in the parameters table; relative and UTC times; one naming rule; a new proof title. |
| F13 | P2 | **The current look shares too much with the products Fiador must stay apart from.** Instrument Sans is rooq.trade's interface face: its computed font stack names it, and the rooq proposal keeps it. The split hero is nightcrew's and stigi's. A serif display over a warm off-white is also Tenor's (Tobias on `#fbfaf9`, measured) and the common "editorial fintech" look. | A new interface face; a composition none of them uses (the full-width chain); identity carried by the slip, the stamp and the oxblood accent (section 5). |

Strengths to retain: the provenance line on every live view, no invented rows while loading, the stamp inks and their legend, the measured AA contrast of the ramp, tabular figures, no page-level sideways scroll, the global reduced-motion rule, the focus ring, the pure and tested formatting functions, and `npm run verify` as a no-secret proof. These are a sound foundation; the redesign builds on them.

## 4. Reference board: what to learn and what to leave behind

Found through the ui-inspiration skill's galleries (Land-book searches "lending" and "dashboard"; SiteInspire and Minimal Gallery were already used by the Design pass), plus product pages chosen for one specific decision each. Every one was opened live on 2026-11-13 unless noted. These are references for particular decisions, not templates: Fiador's layouts, component geometry, wording and assets stay its own.

| Reference | Evidence and access | Principle for Fiador | Boundary: what not to take |
|---|---|---|---|
| [rooq.trade](https://rooq.trade), the builder's structure reference | Opened at 1536 CSS px. h1 80px / 400 / −1.6px. A centered headline and one CTA, then a full-width demo instrument labelled "Demo, example data", whose toggles are real buttons with `aria-pressed` (Spot/Perps, Long/Short, timeframes). Further down: an outcome scrubber labelled "Example maths", a "what others can see" panel, and a stepped "From deposit to receipt" walkthrough. Three `prefers-reduced-motion` rule blocks. | The hero is the product, usable at once, with its provenance printed on it. The explanation continues as interaction, not prose. | Not its dark carbon and copper, not the centered-headline-over-an-app-frame composition, not a trading terminal, not its wordmark, copy or screenshots, not Instrument Sans. |
| [rooq.trade/app](https://rooq.trade/app) | Opened at 1536px, wallet disconnected. A left rail of 13 routes. The topbar has a Testnet badge with a one-line testnet notice, "Search markets" with a ⌘K hint, an Operations button and Connect. The Overview has a primary card, skeleton rows while loading, "How to start", "Pending operations" and a watchlist. A bottom status bar shows chain, testnet, connection, wallet, system status and build. There is a "Skip to content" link. | Status, testnet, search and operations are always on screen. The overview starts with one summary and what is pending. Skeletons keep the content's geometry. | No left rail (Fiador uses index tabs across the top), no bottom status bar (status is a topbar chip), no dark theme, no markets or watchlist concepts. |
| [Tenor](https://www.tenor.finance/), via [Land-book "lending"](https://land-book.com/search/websites?q=lending) | Opened at 1536px. h1 Tobias serif 70px / 560 / −2.45px; body Inter 18/27.9 in `#44403b`; ground `#fbfaf9`, ink `#1e1916`; black pill buttons (radius 999px, padding 0 18px, 14px). The hero shows a loan ticket with a Borrow/Lend toggle, an amount and a term. | For lending, the object to show is the loan itself: amount, term, parties. | No rates, collateral or terms Fiador does not have; no tilted 3D cards or pills; and its serif on off-white is the family Fiador is leaving (F13). |
| [Canopy](https://www.canopyservicing.com/), via Land-book "lending" | Opened at 1536px. h1 Open Sauce 96px / 600 / −1.92px. A sticky index of product sections on the left; one product image shows a loan "tape" table with status words. Its other product images had not loaded when inspected. | A lender's system of record is a dense, filterable list where status is a word, not only a color. | B2B marketing composition and giant grotesk; no claim about its product beyond that one image. |
| [Cactus, formerly Tally](https://www.tally.xyz/gov/uniswap) | Opened the Uniswap DAO overview: three summary tiles (delegates, proposals, treasury), each leading to a list; proposal rows with a status stamp ("EXECUTED"), a date and the for/against tally beside it. The proposal page did not open (the renderer timed out), so its timeline was not inspected. | A governance record reads as a row: status stamp, date, tally. Summary figures are doors into their lists. | Token voting, delegates, imagery; no claim about its proposal detail. |
| [Linear](https://linear.app/) | Opened the public homepage (h1 Inter Variable 64px / 510). Its hero frame shows an issue with its id in the header, a "1 / 84" position with previous and next, and an activity list of one line per event (actor, action, relative time). The signed-in app was not inspected. | Loan detail: the record's id leads, previous and next move within the filtered list, and history is one line per event with actor and time. | Dark theme, sidebar, the AI panel, Linear's breadth. |
| [Kiva](https://www.kiva.org/lend-by-category/women) | Opened at 1536px. Filter selects, with applied filters as removable chips, "Reset all filters", a result count ("5772 loans") and sort. Opening a loan slides in a drawer that keeps the list and has its own address (`?loanId=3238775`), with an "open full page" control and a sticky amount and action at the bottom. | Filters are always visible and removable, with a count. A detail can keep the list's context and still have its own URL. One sticky action. | Photography, fundraising tone, green brand, percent-funded bars (Fiador loans are not crowdfunded). |
| [GitHub Actions run page](https://github.com/vitejs/vite/actions/runs/43507278445) | Opened at 1536px. A summary strip ("Triggered via pull request", "Status: Success", "Total duration: 22s", "Artifacts: –") over jobs, each with an icon, a status word and a real duration. | Operations dock: each stage is a real event with a word, an icon and the elapsed time; who started it is named; no percentages. | Dark UI, the CI graph, the log viewer. |
| [Column](https://column.com/), measured by the Design pass ([direction.md](direction.md)) | h1 52px / 600 / −1.56px; figures large above small labels; hairline rules between rows. | A bank shows its numbers plainly: one large figure, quiet labels, hairlines. | Its type, palette and layout. |
| [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/patterns/): radio group, tabs, dialog, combobox, disclosure | Not opened in this session; used as the behavior specification, as the rooq proposal does. | Keyboard and screen-reader behavior for every control the redesign adds. | Patterns only, no visuals. |

Could not inspect: testnet.nearblocks.io (Cloudflare check; not bypassed), mercury.com (the renderer froze), navbar.gallery (blocked by the browser extension's site permissions), saaspo.com (Cloudflare check, per direction.md) and basanos.suitz.xyz (`404: DEPLOYMENT_NOT_FOUND`).

### Distinctness check

Fonts and palettes of the other products come from direction.md's live read on 2026-11-13; shells and heros were observed today.

| Product | Fonts | Ground and accent | Shell | Hero |
|---|---|---|---|---|
| rooq.trade | Instrument Sans, IBM Plex Mono | dark carbon and white, copper | left rail, bottom status bar | centered headline over a framed demo app |
| nightcrew | Host Grotesk, JetBrains Mono | `#dedad3`, teal `#256f82` | top links | headline left, framed tower right |
| stigi | Host Grotesk, JetBrains Mono | `#ecebe7`, olive `#38450f` | top links | headline left, app screenshot right |
| Basanos | IBM Plex Sans, IBM Plex Mono | white, teal `#256f82`, cobalt `#1a4be0` | not seen (site 404) | not seen |
| **Fiador, proposed** | Public Sans, Newsreader (display only), Red Hat Mono (ids only) | `#faf8f3`, oxblood `#7b1e2c`, stamp inks | index tabs across the top; status chip in the topbar; operations dock at the bottom right | left-aligned headline, then a full-width chain of stations with two controls, not framed as an app window |

## 5. Proposed visual direction

### Identity: the counter slip and the stamp

*Fiador* is Spanish and Portuguese for guarantor. At a credit union counter, a loan is a slip: a numbered stub, the amount, the guarantor's signature line, and a stamp when it closes. The redesign keeps the stamp from the Passbook direction as the outcome signature. It adds the slip as the container for every record (a loan, a request, an attention item, an operation, a receipt). The passbook moves to where it belongs: the member's own page, a ruled record of that member's loans. The character stays the same: exact, neighbourly, on the record.

The wordmark stays typographic ("Fiador" in Newsreader) until a separate identity study is approved. A generated logo, shield or letter tile is not an identity.

### Theme decision: one light theme, done properly

Fiador ships one theme, light. Reasons:

1. The material is paper and ink: slips, ruled pages, stamp inks. The stamp inks were contrast-verified on light grounds.
2. It keeps Fiador apart from rooq.trade, which is dark-first.
3. The QA surface goes to states, not themes. Eight data states across about fifteen components at five widths is already the acceptance load; a second theme would double it and halve its quality.
4. The page declares `color-scheme: light`. Under `forced-colors`, stamps keep their borders and selection uses the system `Highlight`.

A dark theme can be revisited after the hackathon.

### Composition

- **Landing:** left-aligned and full-width. The first screen is the headline and the chain instrument across the whole container, with no split columns. Below it, sections alternate between one real element (the outcome legend with real loans, the live checks) and a short text, never two prose bands in a row.
- **App:** content up to 1280px on a 12-column grid. Detail pages use 8 + 4 (the record on the left, its facts on the right). Lists run full width. One primary summary per page, never four equal cards.

### Typography

- **Public Sans** (Google Fonts; 400, 500, 600) for interface, body and every figure, with `tabular-nums`. It was designed for public-service interfaces, which fits a credit union, and none of the four products uses it. It replaces Instrument Sans (F13).
- **Newsreader** (kept; 400) only for each page's h1, the hero headline and the wordmark. App section titles use Public Sans.
- **Red Hat Mono** (Google Fonts; 400, 500) only for account ids, proposal ids and hashes, where `1`/`l` and `0`/`O` must not be confused. This narrows the craft pass's "no mono" rule rather than reversing it: mono is for machine strings, never for labels.
- The existing size, line-height and weight tokens stay, plus a 13px id size. Sentence case everywhere; capitals only inside stamps. No negative tracking below 32px.

### Color

The verified ramp and the one accent stay: ground `#faf8f3`, surface `#ffffff`, ink `#1f1a15`, ink-2 `#5c5248`, ink-3 `#6f655a`, accent `#7b1e2c`. The stamp inks (repaid, repaid late, defaulted, open, void) stay, and only for loan outcomes. Two tokens are added, each to be contrast-verified in S1:

- `--slip` around `#fffcf4`: the record paper for slips, the review slip and receipts, so a record reads as a record against white cards.
- `--signal` around `#8a4f00`: system attention (stale, unavailable, overdue), never used for an outcome.

Rule: oxblood means act or selected focus; a stamp ink means how a loan ended; signal amber means look at this; everything else is ink on paper. Every state also carries a word and a shape, never color alone.

### Spacing and shape

The 4px lattice and the spacing tokens stay. Radii: controls 8px, cards 12px, slips 6px. Touch targets are at least 44px. Hairlines do the structural work; shadows only on the review slip and the open dock.

### A recognizable component family

- **Slip:** a record container on `--slip`, with a 56px stub on its left edge holding the record number (`#3`), separated by a perforation: a dashed hairline with a small half-circle notch cut at its top and bottom. Used for loans on phones, requests, attention items, operations, receipts and the review slip. Never on summary figures, facts lists or navigation.
- **Stamp:** the outcome, in its ink, in capitals. Tilted only in the hero, on Loan detail and in the member's passbook; upright and compact in lists, so lists stay scannable.
- **Chain:** the loan's stations joined by a ruled line, with a filled dot for a step that happened, a hollow dot for one that did not, and a dashed segment for one not yet reached. Horizontal on the landing at desktop width; vertical in the app and on phones.
- **Index tabs:** primary navigation styled like the tabs on the edge of a ledger. The active tab is joined to the page: it has no bottom rule and a 2px ink top edge. These are links with `aria-current="page"`, not ARIA tabs.
- **Provenance tag:** a small line under every live figure or group: a word plus a shape (see below).
- **Boundary card:** a two-column "can / cannot" for one party, each line carrying its source.

The geometry repeats everywhere so the product reads as one system. Nothing decorative is added where it carries no meaning.

### Provenance language

Every figure carries one of these tags, as words plus a shape:

- **Live:** read from testnet N seconds ago (filled dot).
- **Stale:** last good read N seconds ago; the latest read failed (dot with a slash, signal color).
- **Derived:** computed from live figures by a stated rule, for example "Room under the cap = cap − book" (hollow dot).
- **Rules:** from the desk's source or the README, not a chain read (square).
- **Recorded:** from `deployments/*.json`, written by the seed or story scripts, with its time (ring).
- **Illustrative:** an example, not data (dashed ring). None is planned anywhere; the tag exists so that any future example cannot pass for data.

## 6. Screen redesigns

### 6.1 Landing

**Hero: the live chain instrument.** Copy comes from the README and the brief only.

```
Fiador                                                    Source   [Open the board]
NEAR testnet · unaudited · not real money
─────────────────────────────────────────────────────────────────────────────────
A credit union seat for Sputnik DAOs
Members borrow treasury NEAR at once within their standing, with a co-signer above
it, or by council vote. Every payout is a native Sputnik proposal.

Follow a real loan   ( Within standing | With a co-signer | By council vote )
                     in this lane:  #0 REPAID  ·  #3 DEFAULTED
┌───────────────────────────────────────────────────────────────────────────────┐
│ #0  ada-1 borrowed 6 NEAR                                             REPAID  │
│ ●────────────●────────────●────────────●────────────●────────────●            │
│ Asked        Co-signed    Filed        Approved     Paid         Repaid       │
│ 4 NEAR fit   bayo-1       proposal #6  the desk's   DAO paid     on time      │
│ their        pledged 2    17:31:29 UTC one vote,    ada-1        17:31:35 UTC │
│ standing     17:31:28 UTC              1 of 1       6 NEAR       due 17:33:31 │
│ desk loan    desk loan    Sputnik #6   Sputnik #6   Sputnik #6   desk loan    │
├───────────────────────────────────────────────────────────────────────────────┤
│ Who can do what   ( Member | Co-signer | Desk | Council | Anyone )            │
│ The desk can      file a transfer · approve the transfer it filed             │
│ The desk cannot   any other proposal kind · act with its own keys (it has 0)  │
│ policy role "desk", read live · access keys: 0, read live                     │
├───────────────────────────────────────────────────────────────────────────────┤
│ Live · read from NEAR testnet 4 s ago through rpc.testnet.fastnear.com        │
└───────────────────────────────────────────────────────────────────────────────┘
[Open the board]  [Read the source]
```

- **Control 1, lane** (a radio group: "Within standing", "With a co-signer", "By council vote"). Each lane maps to a real loan by a rule, not by hard-coded ids: the latest loan of that lane that closed Repaid, else the latest loan of that lane. Today that gives #5 (the visitor's 0.1 NEAR, proposal #12), #0 (ada-1, co-signed by bayo-1, proposal #6) and #1 (chidi-1, council vote, proposal #7). The lane's other loans sit beside it as small stamped choices ("#3 DEFAULTED"), so every outcome on the desk can be followed: #2 repaid late, #3 defaulted, #4 refused.
- **The chain** for the chosen loan, with every station from a real read:
  - *Asked:* borrower and amount; for co-signed loans, the borrower's own part and the gap. The ask time is shown only where the desk keeps it (F3).
  - *Co-signed:* co-signer, pledge, the desk's created time (co-signed lane only).
  - *Filed:* the proposal id, proposer and submission time, from `get_proposal`.
  - *Approved:* who voted, from Sputnik's `votes` ("the desk's one vote, 1 of 1", or "council-1 and council-2, 2 of 3"). No time, because Sputnik keeps none.
  - *Paid:* "DAO paid ada-1 6 NEAR", from the proposal's Transfer kind and its Approved status. The line says the desk never held the money.
  - *Closed:* the stamp, the closed and due times, and the standing effect by the contract's rule, labelled Derived.
  - A refused loan stops after Asked: "Sputnik would not file the transfer; no proposal exists." For loan #4, the Activity link explains why: the council had unseated the desk (proposal #10) and seated it again afterwards (proposal #11).
- **Control 2, party** (a radio group: Member, Co-signer, Desk, Council, Anyone). Choosing a party (a) marks the stations that party performed in this loan and dims the rest, and (b) opens that party's boundary card:
  - *Desk:* can file a transfer and approve it (policy role `desk`: `transfer:AddProposal`, `transfer:VoteApprove`, transfer threshold 1; read live). Cannot do any other proposal kind, and cannot act with its own keys (0 access keys, read live).
  - *Council:* can do everything, with 2 approvals for every kind (`*:*`, quorum 2, threshold 2; read live): admit members, set every limit, vote council-lane loans, unseat the desk. The card adds "three scripted accounts sharing one operator key" with the Rules tag (README, not a chain fact).
  - *Member* (rules, from the desk's source): ask, ask the council, co-sign another member's gap (not visitors), cancel their own request, repay with the exact principal.
  - *Anyone:* read every view; call `sync_loan`; call `mark_default` once term and grace have passed (for loan #0, "from 17:34:31 UTC had it not been repaid", Derived).
  - For a standing-lane loan, choosing Council shows "No council vote: the desk's seat approved it within the limits the council set". That is the product's point, made by the data.
- **Provenance strip** at the foot of the instrument: Live with the read age and the endpoint, Stale when a refresh failed, and the Rules tag on any static line.
- **States.** *Loading:* the stations with their names and no values, plus "Reading NEAR testnet · 2 s" (elapsed time, not progress). *Unavailable:* the station names with the README's description of each step under the Rules tag, the error in words, Retry, and `npm run verify` as the CLI route; no numbers. *Not seeded:* "The demo DAO has not been seeded in this build". *Empty lane:* "No loan has gone through this lane yet".
- **Sizes.** Desktop: controls above a single row of six stations, about 520px tall, so the instrument sits in the first screen at 1440×900. Tablet: the stations wrap into two rows of three. Phone: a vertical chain on a left rail, lane control full width, party chips wrapping onto two rows. No sideways scroll anywhere.
- **Motion.** Switching lanes moves the stations once (section 7). With reduced motion the content swaps instantly and nothing is lost. No autoplay, no loop, no scroll hijacking. The text and the CTA are usable before the data arrives.

**Below the hero.** Section ids stay, so the contract test holds.

- `#problem`, "A DAO treasury can only give money away": the existing two sentences and the four missing pieces, set as a short statement beside a list. The copy is unchanged.
- `#how`, "Three lanes, and how a loan closes": the three lane names ("Standing lane", "Co-signed lane", "Council lane") and their README rules as text. This is the complete explanation for anyone not using the instrument, and each lane links to it. Then the four outcome stamps, each linked to the real loan that ended that way (Repaid #0, Repaid late #2, Defaulted #3, Refused #4), with the rule and its effect. Then the council's powers line.
- `#proof`, "Run the desk's checks here" (replacing the rooq-identical title): a Run button reads the same inputs as `npm run verify` and runs `runChecks` from `src/lib/verify.ts`. Each read appears as it completes ("policy read", "desk read", "proposals 5 of 5"), as real counts, not a percentage. Then each check shows PASS or FAIL with its detail, under the line "Same code as `npm run verify`". The count comes from the run, never written as "16". The keyless desk and the demo DAO and desk ids (in `<code>`) stay.
- `#try`, "Open the board": the CTA into `./app/`, the visitor line (`npm run visitor`), and "a wallet is optional".
- Footer: "Built at NEAR HACKATHON 2026. Testnet only, unaudited." and the repo link.

### 6.2 App shell, information architecture and routes

Hash routes, all working from a subpath with no rewrite:

| Route | Screen |
|---|---|
| `./app/` or `#/` | Overview |
| `#/loans`, with filters in the hash (`#/loans?lane=cosigned&status=open`) | Loans |
| `#/loans/3` | Loan detail |
| `#/requests` | Requests (waiting for a co-signer) |
| `#/members` | Members |
| `#/members/ada-1.fiador-ops-vmwpxk.testnet` | Member detail |
| `#/desk` | Desk and proof |
| `#/activity` | Activity |
| anything else | Not found, with the routes listed |

The router is a few dozen lines in `web/`: it listens to `hashchange`, writes real `<a href="#/…">` links (so open-in-new-tab and copy-link work), sets `document.title` per route ("Loan #3 · Fiador board"), moves focus to the page's h1 after navigation, and restores the list's scroll position on Back. The app keeps the name "board" because README step 3 uses it.

**Topbar** (desktop):

```
Testnet only · unaudited · not real money · the desk is frozen (0 keys) · the council is 3 scripted accounts   What this means →
Fiador │Overview│Loans│Requests 1│Members│Desk & proof│Activity│   [Find a loan, member or proposal   /]   Operations 0   Connect wallet   ● Live 4 s
```

- **Testnet line:** one line of facts. Its link goes to Desk and proof. On phones it shortens to "Testnet · unaudited" plus the link.
- **Index tabs** for the routes. Requests shows a count only when it is above zero.
- **Search** (a combobox; `/` or Ctrl+K focuses it) over the loaded snapshot only, with no network call. It matches loan numbers (`3`, `#3`), proposal numbers (`proposal 9`, `p9`, which resolve to their loan), accounts (short or full) and status words. Results are grouped: Loans, Members.
- **Operations** button with a count; opens the dock (6.11).
- **Wallet:** "Connect wallet", or the short account name with Sign out. Connecting is never required.
- **Status chip:** "Live 4 s", "Reading…", "Stale 42 s", "Unavailable" or "Paused" (while the tab is hidden). It opens a small panel with the RPC endpoint, the last good read in UTC, the last error in words, and Retry.

A skip link ("Skip to content") comes first in the tab order. Landmarks: `header`, `nav` (labelled "Board"), `main`, and the dock as a labelled `region`.

### 6.3 Overview (`#/`)

Three jobs, in order: is anything in trouble or waiting, what is the state of the book, what happened.

1. **The book** (the one primary summary, 8 columns). Large figure: "Out on loan: 0 NEAR of a 12 NEAR cap". Under it, a bar of the cap with one segment per open loan, each segment a link to its loan. Supporting figures: Treasury balance (15.4215 NEAR, read 2026-11-13), Treasury spendable (`get_available_amount`, 9.9678 NEAR), and Room to lend now (the smaller of cap minus book and spendable; Derived, with the rule shown). Beside it (4 columns), the desk's state in three lines: Seated in the DAO policy, Keyless (0 access keys), and the result of the checks if they ran this session ("16 of 16 passed at 21:30 UTC"), otherwise "Run the checks →".
2. **Needs a hand** (the attention queue, as slips, most urgent first). Each item has a reason, a deadline and one action:
   - The desk is not seated, the desk has access keys, or a check failed: "The desk is not in the DAO's policy: Sputnik will refuse every ask" → Desk and proof.
   - A loan is past its grace period: "Loan #7 is past grace since 14:02 UTC: anyone may mark it defaulted" → Mark default (wallet; optional, see decisions).
   - Waiting for a co-signer (the README's words): "bayo-1 asked 6 NEAR and needs 2 NEAR co-signed · 7 min left" → Co-sign.
   - A loan is in its grace period or due soon: "Loan #6 is due in 1m 20s" or "in grace: repaying now closes it with no gain and no slash" → Repay (shown only to the borrower).
   - A council-lane loan awaits votes: "Loan #8 waits for the council: 1 of 2 approvals" → the loan.
   - Empty, as it is today: "Nothing needs a hand. No request is waiting and no loan is open. Last movement: loan #5 repaid at 17:36:35 UTC." The heading "Waiting for a co-signer" stays visible, with its own empty line, to keep README step 3 true.
3. **The work.** The loan book (all loans when there are 12 or fewer, otherwise the latest 12 with "All loans"), each with its Sputnik proposal id and status, as in README step 3. Members, with standing, unused standing, and the repaid loans behind the standing. Then the latest five Activity lines.

### 6.4 Loans (`#/loans`)

- **Filters, always visible:** Lane (All, Standing, Co-signed, Council); Status (All, Open, Repaid, Repaid late, Defaulted, Not paid out = Refused, Not funded or Voided); Member (from search). Applied filters show as removable chips, with a count ("2 of 6 loans") and "Clear filters". Filters live in the hash, so a filtered list is a link.
- **Desktop table**, columns reordered so the deciding ones come first: Loan · Borrower · Amount · Outcome · Lane · Proposal · When (due or closed) · Co-signer. The loan number and the borrower are real links to the detail. The table has a caption, `th` scopes and sorting (newest first by default, or by amount).
- **Under 900px,** each loan is a slip. Line 1: "#3 · chidi-1 · 2 NEAR" with the compact stamp. Line 2: "Co-signed by ada-1 for 1 NEAR · proposal #9 · closed 17:35 UTC". No sideways scroll.
- **Empty after filtering:** "No loan matches these filters" plus Clear. Truly empty: "No loans yet". Loading: row skeletons the size of real rows.

### 6.5 Loan detail (`#/loans/:id`)

- **Header:** "Loan #3", its stamp (tilted), the lane, previous and next within the current filter ("3 of 6"), and Copy link.
- **Facts** (right column; under the header on phones): borrower (link) · amount · borrower's own part · co-signer and pledge · lane · status · created · due · closed, with UTC times and the relative time beside them.
- **The proposal chain** (left column, vertical), with the same stations as the landing and each station's source. Under it, the disclosure "Proposal #9 as read from Sputnik" shows the kind, receiver, amount, proposer, votes, vote counts and submission time, exactly as returned.
- **Its check:** the line for this loan from `runChecks` ("Loan #3 matches its Sputnik proposal: Transfer to chidi-1 for 2 NEAR, Approved"), taken from the same run as Desk and proof, never re-implemented.
- **Links:** the borrower, co-signer, DAO and desk on the explorer. A transaction link appears only if this browser submitted an operation for this loan.
- **Actions,** shown only when they apply: Repay (signed-in borrower, loan Active; the deposit is the exact principal read from the loan, with no typing), Mark default (loan Active and past grace), Sync loan (Filing, Voting or AwaitingCouncil). The last two are optional (decisions).
- **Not found:** "The desk has no loan #99. It has 6, numbered #0 to #5."

### 6.6 Members (`#/members`) and Member detail (`#/members/:account`)

- **Members list:** member (short name, with the full id on the detail page) · kind (member or visitor) · standing, with a small bar against the maximum standing · unused · drawn · pledged · on-time repayments · defaults. The last two are real fields not shown today. On phones each member is a slip.
- **Member detail.** Header: the short name; the full id in mono with Copy and an explorer link.
  - Figures: standing (large) · unused · drawn · pledged.
  - **The member's passbook** (the signature detail kept from the Passbook direction): ruled lines for every loan they borrowed or co-signed, each with its role, amount, proposal and stamp.
  - **How the standing got here** (Derived): the starting grant (today's `starter_standing`, or `visitor_starter` for a visitor, with the note "today's parameter; the grant at admission may have differed"), then each closed loan's effect by the contract's rule, then the computed figure against the read figure. If they match: "Reconciles with the desk's figure." If not: "Differs by 0.5 NEAR: a parameter or a council action changed it; the desk keeps no history." Never hidden.
  - **Visitor seat** (visitors only): joined, window ends, deposit, loans taken of 3.
  - Their open request, if any, with Cancel for the signed-in owner.

### 6.7 Requests (`#/requests`)

- Each request is a slip: borrower · amount asked · their unused standing · gap to co-sign · time left (a live countdown by this device's clock, labelled as such) · Co-sign.
- Requests the desk still holds but which have expired are grouped as "Expired, not yet cleared", with no action.
- Empty: "No request is waiting for a co-signer. One appears here when a member asks above their unused standing; it lasts 10 minutes (the request window the council set)." The duration comes from `request_ttl_sec`.

### 6.8 Desk and proof (`#/desk`)

- **The seat,** from the live policy: role `desk`, member `desk.fiador-ops-vmwpxk.testnet`, permissions `transfer:AddProposal` and `transfer:VoteApprove`, transfer threshold 1, and "no other role contains the desk".
- **The council:** three full account ids; every kind needs 2 approvals; the Rules line "three scripted accounts sharing one operator key (README)".
- **Keys:** access keys on the desk 0 (Live), so there is no admin and no upgrade. Factory auto-update: off (Live, `get_factory_info`).
- **Parameters:** all twelve, human-readable (a 10 min term, 5 min grace since the council's proposal 16 on 2026-11-14 (2 min and 1 min when this was written), a 10 min request window, 10 visitor seats at 0.1 NEAR for 30 min with a 0.05 NEAR deposit, proposal bond 0), with raw values in a disclosure.
- **Live checks:** the same panel as the landing's proof, run on first visit and again on request. The real read steps, then each check with PASS or FAIL and its detail. "Copy results" copies plain text. A failing check is the most prominent thing on the page and also appears in Overview's attention queue.
- **The code:** links to the contract source and the wasm in the repo, and "Unaudited".

### 6.9 Activity (`#/activity`)

One time-sorted list, newest first, of two real sources:

- **Desk loan events**, from the loan records: opened (created time) and closed (closed time with its stamp).
- **DAO proposals**, from Sputnik's `get_proposals`, one call for all 13 today. Each shows kind, target, status, proposer and submission time. Transfers link to their loan. Proposals that touched the desk read in words: "council-1 proposed removing the desk from its seat (proposal #10, approved)", then "ada-1's ask was refused (loan #4)", then "the desk was seated again (proposal #11)".
- The header line: "Reconstructed from the desk's loan records and the DAO's proposal list. Not a transaction log: Fiador has no indexer."
- Filters: All, Loans, Council and policy.

### 6.10 Ask, co-sign and repay, with the review slip

Entry points are in context: Overview ("Ask for a loan", signed-in members only), a request's Co-sign, a loan's Repay, an own request's Cancel. With no wallet connected, these show "Connect a wallet to act" and nothing else changes.

- **Ask** (in the sheet):
  - An amount in NEAR, validated with `parseNear` without reformatting while typing, with "Use my unused standing (4 NEAR)" as a quick fill.
  - A preview headed "What should happen, from the read at 21:08:57 UTC":
    - within unused standing and room under the cap: "filed and approved at once";
    - above unused standing: "held for a co-signer to cover 2 NEAR, for 10 minutes";
    - over the cap room: "the desk will refuse: the book has 3 NEAR of room";
    - not a member: "this account is not a member of the desk", with the visitor line explained and no submit.
  - The preview ends with "The desk decides; this preview uses the last read."
- **Co-sign:** borrower and gap prefilled from the request; the maximum pledge defaults to the gap. A preflight list from the last read, each item a tick or a cross in words: you are not the borrower; you are not a visitor; the request is still open; the gap fits your unused standing; the book has room; the maximum pledge covers the gap. A failed item blocks the button and gives its reason.
- **Repay:** the loan, the exact principal to attach (read from the loan), whether it is on time, in grace or past grace, and its effect by rule.
- **The review slip** (a modal dialog on desktop, a full-height sheet on phones):
  - Receiver `desk.fiador-ops-vmwpxk.testnet` · method `ask` · arguments as JSON and in words ("6 NEAR") · deposit (0, or the exact principal) · gas 300 Tgas · signed by your account.
  - "Your wallet (MyNearWallet) opens to confirm. Fiador never sees your keys."
  - Primary action: "Open wallet to sign". Secondary: "Back".
  - States: ready, blocked (with the reason), opening the wallet, returned.
- **After signing,** the operations dock takes over. Refusals map to words ("The desk refused: your unused standing is 3 NEAR"), with the raw error in a disclosure. The README states that refusals refund any attached NEAR, and the slip says so only for calls that attach a deposit.

### 6.11 Operations dock

- A topbar button with a count, and a dock: bottom right on desktop, a bottom sheet above the tab bar on phones. It survives navigation and reloads. Operations are stored in `localStorage` on this device: method, account, hash and timestamps, all public data. Their status is always re-read from the chain.
- **Stages are only real events,** each with its time:
  1. *Sent to your wallet:* a local event when the wallet call starts.
  2. *Wallet returned hash 8Fq…3a* (read from the return URL, which is then cleaned with `replaceState`), or *Wallet returned without signing* (operation closed).
  3. *Found on chain:* the RPC `tx` method returns the transaction.
  4. *Final:* the outcome, parsed from the execution result. For example: "Loan #6 filed and approved, proposal #13", "Held: needs 2 NEAR co-signed until 21:40 UTC", or "Failed: \<reason in words\>".
  5. *On the board:* the next desk read contains the loan or request, with a link to it.
- **If no hash comes back,** the operation stays at stage 1 with "Fiador cannot see what happened next. Check your account on the explorer", and never shows success.
- No percentages, no countdown to completion. Elapsed time per stage; "Clear finished".
- Each finished operation becomes a **receipt** slip: method, account, hash in mono with Copy, block, outcome sentence, and links to the explorer and to the loan.

### 6.12 Phone composition (390px)

- **Topbar,** 56px: wordmark, status word ("Live"), search, and operations with its count. The testnet line sits under it.
- **Bottom tab bar** with five text tabs (Overview, Loans, Requests, Members, Desk), at least 44px tall with a safe-area inset. Activity is reached from Overview and from search.
- **Overview:** the book figure and bar, then the attention queue (above the fold when it has items), then the loan slips and members.
- **Lists** are slips; details stack (header, facts, chain); the chain is vertical.
- **The review slip** is a full-height sheet with its primary action pinned above the safe area. The dock opens as a sheet above the tab bar. Nothing hides behind the tab bar.
- No sideways scroll on any route. Tables never render under 900px.

## 7. Components and motion

### Component specification

| Component | Treatment | Required states and behavior |
|---|---|---|
| Primary action | Oxblood fill, paper text, 8px radius, at least 44px tall on touch, Public Sans 500, the exact verb ("Open wallet to sign", "Co-sign 2 NEAR") | Default, hover, pressed, keyboard focus, disabled with its reason beside it (linked by `aria-describedby`), working ("Opening wallet…"), done only after a real state; stable width; no double submit |
| Secondary action | Paper fill, ink hairline, same geometry | Clearly below the primary; never looks disabled |
| Consequential action (Mark default, Cancel request) | Ink outline, explicit verb, one line naming the consequence | No icon-only control; confirmation shows the real effect ("chidi-1's standing goes to 0; ada-1 loses the 1 NEAR pledged") |
| Segmented selector (lane, party, filters) | Hairline group; the selected option ink-filled with paper text | WAI-ARIA radio group: arrow keys move and select, Tab enters and leaves; text always, never color alone; selection never sends a transaction |
| Index tabs (navigation) | Ledger tabs on the topbar rule; the active tab joined to the page | Links with `aria-current="page"`, not ARIA tabs; visible focus; the count announced ("Requests, 1 waiting") |
| Content tabs | Only where a panel switches in place (Member detail on phones: Passbook, Standing trail) | WAI-ARIA tabs with `aria-controls` and panel ids, arrow keys, stable panel height |
| Search | Topbar combobox with grouped results | WAI-ARIA combobox and listbox; states: hint, typing, results, no results ("No loan or member matches 'xyz'"), data not yet read ("Search works once the board is read") |
| Amount input | Large tabular figure, "NEAR" suffix, helper line with the relevant limit, inline validation | Accepts paste and up to 24 decimals; no reformatting while typing; errors in words beside the field; a quick fill, not "Max" (standing is not a balance) |
| Review slip | Slip paper, ruled sections: what should happen, the call, the cost | Modal dialog: focus to its title, focus trapped, Escape closes (except while working), focus returns to the trigger; ready, blocked, opening wallet, returned |
| Status stamp | Capitals in the outcome's ink with a 2px border; tilted in hero, detail and passbook, upright in lists | Text always present; `forced-colors` keeps the border; compact and large sizes |
| Provenance tag | Small line, word plus shape | Live, Stale, Derived, Rules, Recorded, Illustrative; the read age updates every second without being announced |
| Chain | Stations joined by a rule; filled, hollow and dashed dots | Each station: name, actor, value, time if known, source; a list (`ol`) for assistive technology; static under reduced motion |
| Slip | Record row on slip paper with a perforated numbered stub | Real link on the record number; hover and focus on the whole slip; never nested |
| Attention item | A slip with reason, deadline and one action; a severity word and shape | Ordered by urgency; the deadline counts down in text; it disappears only when a read shows it resolved |
| Receipt | A slip: method, account, hash (mono, copy), block, outcome sentence, links | Built only from the chain's answer; a failure receipt states the failure and any refund |
| Operations dock | Topbar count plus a docked panel, or a sheet on phones | Collapsed, expanded, empty ("No operations on this device"); survives navigation and reload; one polite announcement per stage |
| System status chip | Word plus dot in the topbar | Reading, Live, Stale, Unavailable, Paused; opens the endpoint, last read, last error and Retry |

### Data states

Each live resource (desk snapshot, DAO account and policy, proposals, verify run) has its own state, and each panel renders from the resources it needs:

| State | When | What the user sees |
|---|---|---|
| Not seeded | No `deployments/testnet.json` in the build | "The demo DAO has not been seeded in this build", once, per page |
| Loading | First read in progress | Skeletons with the real layout (station names, row heights) and "Reading NEAR testnet · 3 s"; no numbers |
| Live | Last read succeeded within two poll intervals | The data and "Live · 4 s" |
| Stale | Data exists, but the last read failed or is older than two intervals | The data stays, under a signal band: "Showing the read from 21:08:57 UTC (42 s ago). The latest read failed: \<reason\>. Retrying every 5 s. [Retry now]". Countdowns are marked paused |
| Unavailable | No successful read yet, and the read failed | "NEAR testnet could not be read: \<reason in words\>", with Retry, `npm run verify` as the CLI route, and the endpoint |
| Partial | Some resources read and others failed (for example a proposal) | The rest renders; the missing cell reads "status unavailable" with a retry, never "…" or 0 |
| Empty | The read succeeded and the list really is empty | A sentence saying what would fill it ("A request appears here when…") |
| Not found | A route names a loan or member the desk does not have | What exists instead, with links |

Polling: the next read is scheduled only after the previous one settles; independent reads run in parallel; terminal proposal statuses are cached; reads pause while the tab is hidden and resume, with an immediate read, when it is shown.

### Motion choreography

These are proposed timings, not measured results, to be tuned in S5. One curve, the existing `--ease`. Transitions name their properties, never `all`. No layout property is animated.

| Event | Timing | Behavior |
|---|---|---|
| Button hover and press | 120ms | Background or border color; press scales to 0.98; no moving target |
| Focus ring | Immediate | Never animated |
| Segmented selection | 180ms | The ink fill moves between known positions; labels stay crisp |
| Route change | 160ms | Content fades in; the shell, dock and search stay mounted; focus moves to the h1 |
| Hero lane switch (storytelling, landing only) | Up to 560ms in total | Stations fade and rise 6px with a 40ms stagger (six at most), then the joining rule draws once; text and CTA stay usable throughout |
| Hero party switch | 200ms | Stations the party did not perform dim to 45% opacity; the boundary card fades in |
| First data in the hero | Up to 600ms, once | The chain draws when the read lands; never again on refresh |
| Stamp press | 220ms | Scale 1.06 to 1 with a fade, only when a loan detail opens or a status changes during the visit (a real event) |
| Review slip | 220ms in, 160ms out | Desktop: fade and 8px rise. Phone: slides up. No bounce |
| Operation stage | 180ms | The stage marker moves once per real event; one polite announcement |
| Changed row after a read | 200ms fade-in of a static marker | A 2px ink rule beside a changed row for 10 s, plus "updated 21:09" text; values change immediately, with no counting or rolling digits |
| Countdown | Every second | Text only, no animation |

Under `prefers-reduced-motion: reduce`, every transition and animation is removed (the existing global rule stays). Every state still appears, at once: the hero chain is drawn, the changed-row marker and its text remain, and the dock stages are listed. Nothing needs to be watched to be understood.

## 8. Surface coverage matrix

This is a coverage plan, not a claim that every state was exercised live. "Fixture" means rendered from test fixtures in the dev-only state gallery (section 10), because the frozen desk has no such live state today.

| ID | Surface | States covered | Treatment |
|---|---|---|---|
| L1 | Landing hero instrument | loading, live, stale, unavailable, not seeded, empty lane; all three lanes; all five parties; refused loan; reduced motion | 6.1, live chain with two controls |
| L2 | Problem | static | 6.1, unchanged copy, new composition |
| L3 | Three lanes and outcomes | live (outcomes link to real loans), unavailable (rules only) | 6.1 |
| L4 | Proof, live checks | not run, running (real read counts), all pass, a fail (fixture), unavailable | 6.1 and 6.8 |
| L5 | Open the board, and footer | static | 6.1 |
| A0 | Shell: testnet line, index tabs, search, status chip, wallet, dock button, skip link, phone tab bar | each status; search hint, results, none, not read; wallet connected and not | 6.2, 6.12 |
| A1 | Overview | loading, live, stale, unavailable; attention empty (live) and populated (fixture); book empty (live) and with open loans (fixture) | 6.3 |
| A2 | Loans | loading, live, filtered, filtered-empty, truly empty (fixture); table and slips | 6.4 |
| A3 | Loan detail | each status: Repaid, RepaidLate, Defaulted, Refused (live); Active, AwaitingCouncil, NotFunded, Voided (fixture); proposal partial; not found | 6.5 |
| A4 | Members | live, empty (fixture); table and slips | 6.6 |
| A5 | Member detail | member, visitor, reconciles (live), does not reconcile (fixture), open request (fixture), not found | 6.6 |
| A6 | Requests | empty (live), waiting, expired-not-cleared (fixture) | 6.7 |
| A7 | Desk and proof | seated and keyless (live), unseated or keyed (fixture), checks pass (live), checks fail (fixture) | 6.8 |
| A8 | Activity | live (13 proposals, 6 loans), filtered, unavailable | 6.9 |
| F1 | Ask | no wallet, not a member, within standing, held, refused by cap, blocked input | 6.10; wallet path untested |
| F2 | Co-sign | each preflight pass and fail, expired request | 6.10; wallet path untested |
| F3 | Repay | on time, in grace, past grace; exact principal | 6.10; wallet path untested |
| F4 | Cancel request | own request only | 6.10; wallet path untested |
| F5 | Mark default and sync loan (optional) | eligible, not eligible | 6.5, if approved; untested |
| W1 | Wallet connect and sign out | not connected, connecting, connected, failed | 6.2; untested |
| O1 | Operations dock and receipt | each stage, no hash, wallet cancelled, failed, finished, empty | 6.11; real hashes untested |
| S1 | Global data states | not seeded, loading, live, stale, unavailable, partial, empty, not found | section 7 |

## 9. Implementation order

Each stage is one commit on `main` that passes `npm run check` and `npm run web:check` and leaves the site shippable. Commits go by explicit path, then `git pull --rebase`, then push. Estimates are my agent working time, not measurements.

| Stage | Contents | Shippable result | Tests added or changed | Estimate |
|---|---|---|---|---|
| **S1** Shell, routes, tokens, data and states | New tokens (fonts, `--slip`, `--signal`, radii) and a rewritten `direction.md`. Hash router. Shell: testnet line, index tabs, status chip, wallet slot, skip link, phone tab bar. Data layer: parallel reads, scheduled polls, visibility pause, terminal proposal cache, full proposal objects kept, per-resource state. Browser verify gatherer (the landing needs it in S2). State components (loading, stale band, unavailable, empty, not seeded, not found, provenance tag). Overview re-hosts today's five blocks in the new shell with real states; the tabs of later routes appear in their own stage | The current board in a real shell, with honest states and faster reads; the landing untouched | Router parsing and links; state transitions (loading, live, stale, unavailable, partial); poll scheduling with no overlap; gatherer output matches the CLI's shape. `board.test.tsx` is rewritten to assert the same facts (the five headings' content, `#10 Approved`, the explorer link, the keyless sentence) on the Overview route; reason: the single-scroll `BoardView` is replaced | 2.5 h |
| **S2** Landing and its live instrument | Hero instrument (lane and party controls, chain, boundary card, provenance strip, all states); `#problem`, `#how` with outcome links, `#proof` live checks, `#try`, footer; copy review | The new landing; `/app` as in S1 | Lane-to-loan rule; station derivation for each lane and status, including refused; boundary card from a policy fixture; no values while loading; reduced-motion markup equal in content. `landing.test.tsx` stays as is (section ids and order, the `./app/` and repo links, no demo, the three lane names, the DAO id in `<code>`). `passbook.test.tsx` keeps its function tests; its `PassbookView` case moves to the member passbook in S3; reason: the hero no longer renders the passbook | 2.5 h |
| **S3** Overview, Loans, Loan detail, Members, Member detail, Requests | Final Overview (book, attention queue, loan book, members, activity lines); Loans with filters in the hash; Loan detail with chain, proposal as read, its check, previous and next; Members; Member detail with passbook and derived standing trail; Requests; topbar search; slips under 900px. Repay on Loan detail takes the principal from the loan (fixes the yocto entry even if S4 is cut) | Every read-only screen of the redesign | Filter parsing; attention ordering and empty state; standing derivation and reconciliation (including a mismatch fixture); search matching; route not-found; `data.test.ts` kept, extended for new fields | 3 h |
| **S4** Desk and proof, Activity, flows, operations dock | Desk and proof with live checks and the policy laid out; Activity (desk events plus `get_proposals`); Ask, Co-sign, Repay and Cancel with preview, preflight and the review slip; operations dock (return-URL parsing, `tx` status, outcome parsing, receipts, `localStorage`); optional Mark default and Sync loan if approved | The full redesign | Ask preview lanes; co-sign preflight; return-URL parsing (hash, no hash, error); `tx` outcome parsing (held, loan, failure); stage machine never reaching Final without a chain answer. `actions.test.ts` kept unchanged | 3 h |
| **S5** Verification pass | The acceptance script (section 10) at every width and state, fixes, the unslop checklist, `docs/design/ACCEPTANCE_EVIDENCE.md` with screenshots | A checked release | None new beyond fixes | 1.5 h |

Total: about 12.5 hours.

**If time runs short,** value order is S1, S2, S3, then S4. Cut first, in this order:

1. S4's optional Mark default and Sync loan, and Activity's DAO proposal history (keep the loan events).
2. The Activity route.
3. The dock's outcome parsing (keep "hash returned" and "final", with a link to the explorer).
4. The rest of S4. The wallet then stays as today's forms, re-hosted, with S3's repay fix.

Within S3, cut first the search combobox, then the derived standing trail (keep the passbook list).

**Time against the run sheet.** The run sheet assumed about 4 hours for the redesign and a fallback of shipping `f4dcd66` if it was not green by 2026-11-14 06:00 UTC ([run sheet](../guide/2026-11-13-near-hackathon-runsheet.md#L73)). This plan is about 12.5 hours; from approval tonight, S1 and S2 fit before 06:00 UTC and S3 probably does not. Because every stage is shippable, I recommend changing the fallback to "ship the last green stage" and filming the demo on whatever is green when the demo session starts. This is a decision for the builder.

## 10. Acceptance evidence

S5 records each result, with screenshots, in `docs/design/ACCEPTANCE_EVIDENCE.md`.

| Check | How | Can I perform it here? |
|---|---|---|
| Widths 390, 768, 1440 and 1920 (plus 320) on every route and state | Headless Chrome over the DevTools protocol at exact CSS widths, full-page captures, as in this audit | Yes |
| No page-level sideways scroll | A script compares `scrollWidth` to `clientWidth` on every route at every width | Yes |
| Keyboard walkthrough | Scripted Tab, Shift+Tab, arrows, Enter and Escape through the shell, both hero controls, filters, search, the review slip and the dock, logging the focused element and capturing the focus ring; plus live keys in Chrome | Yes, scripted and live; no screen reader |
| Reduced motion | `prefers-reduced-motion: reduce` emulated; check that transition and animation durations are 0 and that every state is reachable and readable | Yes |
| 200% zoom | Approximated by a 720px viewport at device scale 2 (the same reflow as 1440 at 200%); real browser zoom is not available headless, and the extension cannot send zoom shortcuts | Partly |
| Short heights | 1440×700 and 390×600 (an approximation of a phone with the keyboard open) | Yes, approximated |
| Demo state | The frozen desk is live with six closed loans, no request and nothing open. Populated states (held request, active loan due soon, overdue loan, council loan awaiting votes, unseated desk, failing check) render from fixtures in a dev-only state gallery (`#/__states`, excluded from production builds), every screen marked FIXTURE. A real populated state needs `npm run visitor` on testnet, which is an outward action: only with the builder's go-ahead | Fixtures yes; real only with a go-ahead |
| Loading, unavailable, stale | RPC held, blocked, and blocked after one good read, through the DevTools protocol | Yes |
| Honest copy review | Every figure has its provenance tag; the README facts are present (testnet, unaudited, frozen, scripted council, council grant); no transaction state without a chain read; no rooq copy; no hard-coded check count | Yes |
| Wallet flows | Sign-in, sign-and-send, the wallet's return to a hash route, `tx` status with a real hash | **No.** This needs a testnet wallet and the builder's go-ahead; until then the evidence file lists these as untested |
| First-data timing | Five samples, same method as this audit; no LCP, INP or CLS claim without a trace | Yes |
| Contrast | Computed ratios for every token pair used for text, including `--slip` and `--signal` | Yes |
| Checks | `npm run check` and `npm run web:check` at every stage | Yes |

## Decisions needed from the builder

1. **Approve or amend** the direction and the stage plan above. Nothing is built before that.
2. **Type and palette.** Public Sans (interface and figures), Newsreader (display only) and Red Hat Mono (ids only), all from Google Fonts, which the site already uses. The verified palette stays, plus `--slip` and `--signal`. Approve, or ask for a new palette.
3. **Additional reads through the existing `RpcClient`,** with `src/lib` unchanged: the DAO's `get_proposals` (Activity), `get_factory_info` (already read by verify), and the RPC `tx` method (the operations dock). Approve?
4. **Permissionless actions in the UI:** `mark_default` and `sync_loan` (and possibly `join_visitor_line`, which attaches a 0.05 NEAR deposit). Include them in S4 as the first cut, or leave them out?
5. **Time:** about 12.5 hours against the run sheet's 4-hour assumption and its 06:00 UTC fallback. I recommend "ship the last green stage" as the new fallback.
6. **A real populated state:** may S5 run `npm run visitor` (it creates a faucet account and borrows and repays 0.1 NEAR from the demo DAO) to capture live held-request and active-loan states, or should fixtures be used only?
7. **A real wallet run:** ask and repay need one run with a testnet wallet before the flows can be called working. The gate ledger has the wallet gate not granted. Who runs it, and when?
