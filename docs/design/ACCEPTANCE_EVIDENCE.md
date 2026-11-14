# Acceptance evidence: the Fiador redesign

Date: 14 November 2026, stage S5 of [UX_AUDIT_AND_REDESIGN_PROPOSAL.md](UX_AUDIT_AND_REDESIGN_PROPOSAL.md), with the scope the builder approved on 2026-11-14 (S4 reduced to Desk and proof; S5 shortened).

What was tested: the production build (`npm run web:build`) of the S5 working tree, copied under a `fiador/` folder and served by `python -m http.server` at `http://127.0.0.1:5192/fiador/`, so the hash routes and relative assets were exercised from a subpath, as on GitHub Pages. Pages were driven by headless Chrome over the DevTools protocol from a Node 22 script using built-ins only (no package installed), at exact CSS widths with device scale 1 (mobile emulation at 390), against live NEAR testnet through the public RPC in `deployments/testnet.json`. Nothing was written to testnet; no wallet was used.

## Summary

| Check | Result | Evidence |
|---|---|---|
| Every route at 390, 768, 1440 and 1920 | 48 of 48 pages render with live data, one `h1` each, smallest text 12px | [Width matrix](#width-matrix) |
| No page-level horizontal scroll | 48 of 48: `scrollWidth` equals `clientWidth`, and no element extends past the viewport | [Width matrix](#width-matrix) |
| Scripted keyboard pass | Pass: skip link first, focus moves to the page title after navigation, radio groups move with arrow keys, filters keep focus, search by `/`, status panel closes on Escape | [Keyboard](#keyboard) |
| Reduced motion | Pass: animations and transitions computed as `none` / `0s`; all six stations and their lines still present | [Reduced motion](#reduced-motion) |
| One stale run | Pass: after one good read the RPC was blocked; the data stayed, marked stale with its read time, the reason and Retry | [States](#stale-unavailable-loading) |
| One unavailable run | Pass: RPC blocked from the start; the board says testnet could not be read, shows no figures, offers Retry | [States](#stale-unavailable-loading) |
| Contrast | Every text pair at least 4.84:1 (AA) | [Contrast](#contrast) |
| The `#/__states` gallery is not in `dist/` | Pass: no gallery code, no gallery chunk, no fixture account in the bundle | [Gallery](#the-dev-gallery-is-not-in-dist) |
| unslop checklist | 15 of 15, with the stamp deviation kept from the craft pass | [unslop](#unslop-checklist) |
| README step 3 on `./app/` with no hash | Pass: treasury, "Waiting for a co-signer", the loan book with each Sputnik proposal id and status, every member's standing with the repaid loans behind it | [overview-390](screenshots/acceptance/overview-390.jpg), `web/src/board/board.test.tsx` |
| `npm run check` and `npm run web:check` | Pass at every stage commit | the stage commit messages and the final report |

## Width matrix

Routes: the landing (`index.html`), Overview (`app/`), Loans, Loan #0, Loan #4 (refused), Members, member ada-1, the visitor, Requests, Desk and proof, a not-found route (`#/nope`), and `#/__states` in the production build (which must be "not found"). "Ready" is the time from load until a live read was on screen. Reads that took about 6.7 s were first reads the public RPC refused for rate limiting (seen as "Failed to fetch"); the board retried 5 s later and went live, as designed.

| Route | 390 | 768 | 1440 | 1920 |
|---|---|---|---|---|
| Landing | 390 = 390, ready 1.9 s | 768 = 768, 1.5 s | 1440 = 1440, 1.3 s | 1920 = 1920, 1.3 s |
| Overview | 390 = 390, 1.1 s | 768 = 768, 1.1 s | 1440 = 1440, 1.5 s | 1920 = 1920, 7.1 s |
| Loans | 390 = 390, 1.5 s | 768 = 768, 1.3 s | 1440 = 1440, 6.9 s | 1920 = 1920, 6.7 s |
| Loan #0 | 390 = 390, 1.1 s | 768 = 768, 1.3 s | 1440 = 1440, 1.1 s | 1920 = 1920, 1.1 s |
| Loan #4 (refused) | 390 = 390, 1.5 s | 768 = 768, 1.5 s | 1440 = 1440, 6.7 s | 1920 = 1920, 1.3 s |
| Members | 390 = 390, 1.5 s | 768 = 768, 6.7 s | 1440 = 1440, 1.1 s | 1920 = 1920, 6.7 s |
| Member ada-1 | 390 = 390, 1.4 s | 768 = 768, 1.1 s | 1440 = 1440, 6.9 s | 1920 = 1920, 1.1 s |
| Member (visitor) | 390 = 390, 1.3 s | 768 = 768, 6.7 s | 1440 = 1440, 1.3 s | 1920 = 1920, 6.7 s |
| Requests | 390 = 390, 1.3 s | 768 = 768, 1.1 s | 1440 = 1440, 1.5 s | 1920 = 1920, 1.1 s |
| Desk and proof | 390 = 390, 1.3 s | 768 = 768, 6.7 s | 1440 = 1440, 6.7 s | 1920 = 1920, 6.7 s |
| Not found (`#/nope`) | 390 = 390 | 768 = 768 | 1440 = 1440 | 1920 = 1920 |
| `#/__states` in production | 390 = 390, "not found" | 768 = 768, "not found" | 1440 = 1440, "not found" | 1920 = 1920, "not found" |

Each cell is `scrollWidth = clientWidth`. Every page had exactly one `h1`, no element wider than the viewport, and no text under 12px (13px on the not-found page). On three `#/__states` loads the status chip read "Unavailable" because a background read was refused at that moment; that page needs no data.

Screenshots: landing [390](screenshots/acceptance/landing-390.jpg), [768](screenshots/acceptance/landing-768.jpg), [1440](screenshots/acceptance/landing-1440.jpg), [1920](screenshots/acceptance/landing-1920.jpg); overview [390](screenshots/acceptance/overview-390.jpg), [768](screenshots/acceptance/overview-768.jpg), [1440](screenshots/acceptance/overview-1440.jpg), [1920](screenshots/acceptance/overview-1920.jpg); loans [390](screenshots/acceptance/loans-390.jpg), [1440](screenshots/acceptance/loans-1440.jpg); loan #0 [390](screenshots/acceptance/loan-0-390.jpg), [1440](screenshots/acceptance/loan-0-1440.jpg); [loan #4 refused](screenshots/acceptance/loan-4-refused-1440.jpg); [members 768](screenshots/acceptance/members-768.jpg); member ada-1 [390](screenshots/acceptance/member-ada-390.jpg), [1440](screenshots/acceptance/member-ada-1440.jpg); [the visitor](screenshots/acceptance/member-visitor-1440.jpg); [requests](screenshots/acceptance/requests-1440.jpg); desk [390](screenshots/acceptance/desk-390.jpg), [1440](screenshots/acceptance/desk-1440.jpg); [not found](screenshots/acceptance/notfound-1440.jpg).

The full-page captures at 390 show the phone tab bar part-way down the page: it is `position: fixed` to the bottom of the 844px viewport, and a full-page capture paints it at that offset. In a real phone viewport it sits at the bottom edge, and the footer is padded so nothing hides behind it.

## Keyboard

Scripted with DevTools key events on the production build at 1440, live data:

| Step | Result |
|---|---|
| First Tab on `./app/` | the "Skip to content" link |
| Enter on it | focus on `main` |
| Next twelve Tabs | the DAO link, the desk link, then the loan book in reading order: `#5`, the visitor, `#4`, ada-1, `#3`, chidi-1, ada-1 (co-signer), `#2`, chidi-1, `#1` |
| Status chip: Enter, then Escape inside the panel | `aria-expanded` true, then false; focus back on the chip ("Data status: Live · 3 s. Show details") |
| `/` anywhere | focus on the search combobox |
| Type `p9` | one option: "Loan #3, chidi-1 · 2 NEAR · Defaulted · proposal #9" |
| Enter | the hash becomes `#/loans/3` and focus moves to the page title "Loan #3" |
| Loans, lane filter: ArrowRight, ArrowRight | the hash becomes `#/loans?lane=standing`, then `?lane=cosigned`; focus stays on the radio ("Standing"), so the arrows keep working |
| Landing: Tab to the first radio | "With a co-signer" (the chosen lane) |
| ArrowRight | the lane becomes "By council vote" and the instrument changes from "#0 ada-1 borrowed 6 NEAR" to "#1 chidi-1 borrowed 3 NEAR" |
| Party control: ArrowRight | the party becomes "Council"; the boundary card reads "The council can …" |

The landing's focus state after this pass: [keyboard-landing-focus](screenshots/acceptance/keyboard-landing-focus.jpg). Not done: a screen-reader walkthrough (no NVDA or VoiceOver run here).

## Reduced motion

With `prefers-reduced-motion: reduce` emulated on the landing: the first station computes `animation-name: none`, `animation-duration: 0s`, `transition-duration: 0s`, and the segmented options `transition-duration: 0s`. All 6 stations and 12 station lines are present, so nothing depends on watching an animation. [reduced-motion-landing-1440](screenshots/acceptance/reduced-motion-landing-1440.jpg).

## Stale, unavailable, loading

| Run | What happened | Screenshot |
|---|---|---|
| Stale | Board live ("Live · 1 s"); RPC then blocked for 9 s. The chip turned to "Stale · 10 s"; the band read "Stale. Showing the read from 10:46:06 UTC (10 s ago). The latest read failed: the RPC endpoint could not be reached from this browser. Countdowns are paused until a read succeeds." with Retry; the loan book stayed on screen | [state-stale-1440](screenshots/acceptance/state-stale-1440.jpg) |
| Unavailable (board) | RPC blocked from the first request. "NEAR testnet could not be read", the reason, "an empty page here never means an empty desk", Retry, the endpoint, `npm run verify` as the CLI route, the raw error in a disclosure; no loan book, no figures | [state-unavailable-1440](screenshots/acceptance/state-unavailable-1440.jpg) |
| Unavailable (landing) | The instrument says testnet could not be read and shows only the step names with the README's rules, tagged Rules | [state-landing-unavailable-1440](screenshots/acceptance/state-landing-unavailable-1440.jpg) |
| Loading | RPC requests held open at 390: "Reading the DAO and the desk from NEAR testnet · 2 s", chip "Reading…", zero figures on screen | [state-loading-390](screenshots/acceptance/state-loading-390.jpg) |

After repeated failures the board now waits 5, 10, 20, then 30 s between reads (`nextDelay` in `web/src/data/store.ts`), added in S5 when the first acceptance run was rate-limited by the public RPC.

## Contrast

WCAG ratios computed from the token values (`web/src/styles/tokens.css`):

| Pair | Values | Ratio |
|---|---|---|
| `--ink` on `--ground` | #1f1a15 on #faf8f3 | 16.26:1 |
| `--ink-2` on `--ground` | #5c5248 on #faf8f3 | 7.18:1 |
| `--ink-3` on `--ground` | #6f655a on #faf8f3 | 5.37:1 |
| `--ink-3` on `--raised` (inputs, hover) | #6f655a on #f1ece2 | 4.84:1 |
| `--ink-3` on `--slip` | #6f655a on #fffcf4 | 5.56:1 |
| `--ink-3` on `--leaf` (passbook) | #6f655a on #fdf8ec | 5.38:1 |
| `--on-accent` on `--accent` (primary button) | #fffdf8 on #7b1e2c | 10.01:1 |
| `--accent` on `--ground` (hover, focus ring) | #7b1e2c on #faf8f3 | 9.58:1 |
| `--on-select` on `--select` (selection, testnet line) | #ffffff on #1f1a15 | 17.26:1 |
| `--signal` on `--ground` | #8a4f00 on #faf8f3 | 6.18:1 |
| `--signal` on `--signal-wash` (stale band) | #8a4f00 on #f6efe4 | 5.75:1 |
| `--ink` on `--signal-wash` | #1f1a15 on #f6efe4 | 15.11:1 |
| `--stamp-repaid` on `--slip` | #2f6b45 on #fffcf4 | 6.19:1 |
| `--stamp-late` on `--slip` | #8a5a14 on #fffcf4 | 5.76:1 |
| `--stamp-default` on `--slip` | #b0251c on #fffcf4 | 6.55:1 |
| `--stamp-default` on `--leaf` | #b0251c on #fdf8ec | 6.34:1 |
| `--stamp-void` on `--leaf` | #6f655a on #fdf8ec | 5.38:1 |

## The dev gallery is not in `dist/`

`#/__states` renders every populated or failing state from fixtures, each marked Fixture: the attention queue with an unseated desk, an overdue loan, a waiting request, a loan due soon and a council loan awaiting votes; an active loan's page; a waiting request; a standing that does not reconcile; an unseated, keyed desk with a failing check; the stale, unavailable, loading and not-seeded panels. It is loaded with `import.meta.env.DEV ? lazy(() => import('../dev/States')) : null`, so production builds drop it.

On the build tested:

```
$ ls dist/assets
Segmented-BKhzUbmz.js  Segmented-CEC4Usjg.css  app-B5FheMgf.js  app-D2kBBDu3.css  main-BdkpZxeO.css  main-tQI5Z0s0.js
$ grep -c "fiador-dev-state-gallery\|State gallery (fixtures\|root\.testnet" dist/assets/*.js
dist/assets/Segmented-BKhzUbmz.js:0
dist/assets/app-B5FheMgf.js:0
dist/assets/main-tQI5Z0s0.js:0
```

No gallery chunk, no gallery marker or title, and none of the fixtures' made-up accounts (`*.root.testnet`). The only `__states` strings in the bundle are the route parser and the production "not found" message that names the path, and the width matrix above shows that route rendering "not found" at every width.

## unslop checklist

Measured from computed styles on the landing, Overview, Loan #3, member ada-1 and Desk and proof at 1440 (live data), plus the page review in S1 to S4.

| Item | Result |
|---|---|
| The direction is written and every pass follows it | Yes: [direction.md](direction.md), rewritten in S1, updated in S5 |
| Spacing on the 4px scale, equal things equal | Yes: zero padding, margin or gap values off the 4px grid (2px nudges allowed) on all five pages |
| Icons, labels and numbers aligned | Yes: no icons; figures right-aligned and tabular; stamps in one column |
| One tinted neutral ramp, three text roles, one accent with contrast | Yes: see [Contrast](#contrast) |
| No hue gradients, gradient text, glows, colored shadows or blobs | Yes: zero elements with a gradient background; shadows are ink-based |
| No emoji | Yes: 0 on all five pages |
| One icon set | Yes: none used |
| Type for the character, weights 400 to 600, no uppercase tracked labels, no italic, no negative tracking on small text | Yes: weights {400, 500, 600}; 0 italic elements; the only uppercase elements are stamps (deviation kept from the craft pass: a stamp is the rendered object, cut in capitals); 0 elements under 32px with negative tracking; the check marks became "Pass"/"Fail" in S5 |
| No exclamation marks, no trailing periods on short strings, no greeting, no unverified claims | Yes: 0 exclamation marks; every figure carries a provenance tag; README facts only |
| Numbers in one format, tabular | Yes: NEAR from `formatNear`, up to four decimals, `tabular-nums` on the body |
| Nested radii add up | Yes: the selector's options moved to 4px inside an 8px group with 4px padding (S5) |
| A hero with a real product preview and a moment | Yes: the live chain instrument over the real desk |
| The first screen composed as a whole | Yes: headline, sentence and the instrument's first row in the first screen at 1440×900 |
| No looping or bouncy motion, one easing curve, no animated layout properties | Yes: one easing, `cubic-bezier(0.22, 1, 0.36, 1)`; 0 infinite animations; 0 transitions on `all` |
| Template check | Passes: swap the name and the hero no longer fits, because it is this desk's own loans, its Sputnik proposals, its council voters and its keyless seat |

## Not verified here

- **Wallet flows.** Sign-in, ask, co-sign, repay and cancel were not run (the builder ruled out a wallet run). The repay form now attaches the principal read from the chosen loan; that is unit-tested (`web/src/wallet/actions.test.ts`), not exercised with a wallet. The panel claims no transaction state: after the wallet returns it says only that.
- No screen-reader walkthrough, no 200% browser zoom, no 320px width, no real phone or keyboard-open test.
- Timings are from one machine and one network; no LCP, INP or CLS traces.
- Populated live states (a held request, an active or overdue loan) do not exist on the frozen desk; they were checked from fixtures (the gallery and the tests), not live. No command that writes to testnet was run.

## What the amendment cut

From the proposal's S4: Activity, the operations dock, the review sheet and redesigned Ask / Co-sign / Repay / Cancel flows, Mark default and Sync loan, and any `tx` reads. The wallet panel stays as it was, re-hosted on Overview and Requests, with the repay fix. From S5: 200% zoom and short-height runs.
