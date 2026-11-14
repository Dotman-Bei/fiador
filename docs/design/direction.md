# Design direction: Counter slip

The design source of truth for Fiador's `/` (landing) and `/app/` (the board), as `docs/design/frontend-contract.md` requires. Every color, font, size, space, radius, shadow and duration in `web/src/styles/` comes from `web/src/styles/tokens.css`, and every token is listed here.

Four passes produced it:

1. **Design pass** (2026-11-13) with the ui-inspiration skill: references, shared principles, the passbook identity (direction A, Passbook, picked by the builder from three mockups).
2. **Craft pass** (2026-11-13) with the unslop skill, heavy mode, after the builder judged the first result basic.
3. **Redesign proposal** (2026-11-13), [UX_AUDIT_AND_REDESIGN_PROPOSAL.md](UX_AUDIT_AND_REDESIGN_PROPOSAL.md), approved by the builder on 2026-11-14 with a reduced scope: the structure changed, not only the paint (frontend contract, item 7).
4. **Redesign build** (2026-11-14), stages S1 to S5. This file was rewritten in S1 to the new token set and page map.

> The craft checklist is **unslop** by Damir Sokolovsky ([@heydamir](https://x.com/heydamir), [heydamir.design/unslop](https://heydamir.design/unslop)), licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Its process, rules and checklist shaped this file and the stylesheets; this credit is kept as the license asks.

## Direction

- **Product:** A credit desk seated in a Sputnik DAO's own policy that lends treasury NEAR to the DAO's members: at once within standing earned by repaying, more when a member co-signs, anything bigger by council vote, every repayment back to the treasury.
- **Experience:** a credit desk you can watch work. Every loan is a short public chain between named parties (a member asks, a co-signer pledges, the desk files a Sputnik transfer, the desk or the council approves it, the DAO pays, the member repays or defaults), and every link of it is read from testnet.
- **Character:** exact, neighbourly, on the record.
- **World:** a credit union's front counter: the loan slip with its numbered stub and perforation, the guarantor's signature line, the rubber stamp and its ink pad, the member's passbook.
- **Moments:** on `/`, the live chain instrument: pick a lane and follow the real loan that went through it, pick a party and see what it did, can do and cannot do, read from the DAO's live policy. On `/app/`, the board: the book as one large figure, then what needs a hand, then the loan book and the members.
- **Signature:** the inked rubber stamp. A loan's outcome is pressed in the ink that means it: tilted on the hero, a loan's page and the member's passbook; upright in lists so a column scans.

## References

The redesign's reference board, with what was measured and the boundary for each, is section 4 of the [proposal](UX_AUDIT_AND_REDESIGN_PROPOSAL.md#4-reference-board-what-to-learn-and-what-to-leave-behind): rooq.trade and rooq.trade/app (structure only), Tenor and Canopy (via Land-book, "lending"), Cactus (formerly Tally), Linear, Kiva, a GitHub Actions run page, Column, and the WAI-ARIA Authoring Practices. The Design pass's references still stand for the principles below:

| Site | Found via | What was measured | What we borrow (principle, not pieces) |
|---|---|---|---|
| [Jack & Jill](https://www.jackandjill.ai/) | [SiteInspire, Business & Finance](https://www.siteinspire.com/websites/category/business-and-finance) | h1 serif 72px / 400 / −0.025em; sans body 16/24; ink `#100f0f`; muted = ink at 62% | A light-weight serif for display over a plain sans for reading; muted text derived from ink |
| [Bruun & Hjejle](https://bruunhjejle.dk) | SiteInspire, Business & Finance | serif display 78px / 400; ground `#f6f6f2`, ink `#1f2122`; one accent `#ae8420`; hairline column rules | Institutional calm: one accent used sparingly; columns divided by 1px hairlines |
| [Causal](https://causal.so/) | [Minimal Gallery](https://minimal.gallery/websites/) | ground `#f9f9f9`, ink `#1a1a1a`, muted `#878787` | Restraint: one ground, one ink, one muted; the product's own content as the visual |
| [Column](https://column.com/) | [Land-book, "bank"](https://land-book.com/search/websites?q=bank) | h1 52px / 600 / −1.56px; figures above small labels; hairline rules | A bank shows its numbers plainly |

### Do-not-reuse check

Fonts and palettes read from the live `:root` on 2026-11-13; rooq.trade's computed font stack and the shells read on 2026-11-13 and 2026-11-14.

| Product | Fonts | Palette | Shell and hero | Fiador shares |
|---|---|---|---|---|
| [rooq.trade](https://rooq.trade) | Instrument Sans, IBM Plex Mono | dark carbon and white, copper | left rail of routes, bottom status bar; centered headline over a framed demo app | nothing (Fiador dropped Instrument Sans in the redesign) |
| [nightcrew.suitz.xyz](https://nightcrew.suitz.xyz) | Host Grotesk, JetBrains Mono | `#dedad3` ground, `#d3cec6` surface, `#0a0a0a` ink, `#256f82` teal | top links; headline left, framed tower right | nothing (Fiador dropped the split hero) |
| [stigi.suitz.xyz](https://stigi.suitz.xyz) | Host Grotesk, JetBrains Mono | `#ecebe7` ground, `#38450f` olive, `#79a8d6` sky | top links; headline left, app screenshot right | nothing |
| Basanos (basanos.suitz.xyz) | IBM Plex Sans, IBM Plex Mono | `#256f82` teal, `#1a4be0` cobalt, white, `#d9ccb7` sand | site 404 (`DEPLOYMENT_NOT_FOUND`); tokens from its source | nothing |

Fiador's families are Public Sans, Newsreader (display only) and Red Hat Mono (machine strings only). Its ground `#faf8f3` is lighter and warmer than nightcrew's and stigi's greys; its one accent is oxblood, not teal, olive, cobalt, sky or copper. Its shell is ledger index tabs across the top with the status chip in the topbar; its hero is a left-aligned headline over a full-width chain of stations, not framed as an app window. No copy is shared: the landing's old "Check it yourself", which rooq.trade also uses, is retired.

## Principles

1. **One ground, one ink, one accent.** Color carries meaning: oxblood means act (and focus); a stamp ink means how a loan ended; signal amber means look at this. Everything else is ink on paper. Every state also carries a word and a shape, never color alone.
2. **A serif headline over a plain reading face.** Newsreader only for each page's h1, the hero headline and the wordmark; Public Sans everywhere else, figures included.
3. **Hairlines instead of boxes.** Structure comes from 1px rules; shadows only on the review sheet, the status panel and the open passbook.
4. **Numbers shown plainly, with their source.** Figures large and tabular, labels small and quiet, and a provenance tag under every live figure or group.
5. **Few, quiet controls.** One filled primary action per view; selection is an ink fill; tabs are links.

## Identity: the counter slip and the stamp

*Fiador* is Spanish and Portuguese for guarantor. At a credit union counter a loan is a slip: a numbered stub, the amount, the guarantor's signature line, and a stamp when it closes. The **slip** is the container for every record (a loan, a request, a member on a phone); the **stamp** marks how a loan ended; the **passbook** is the member's own page, a ruled record of their loans. The wordmark stays typographic ("Fiador" in Newsreader).

## Token set

All in `web/src/styles/tokens.css`. Contrast ratios were computed with the WCAG formula on 2026-11-14.

### Color

| Token | Value | Role |
|---|---|---|
| `--ground` | `#faf8f3` | page background |
| `--surface` | `#ffffff` | cards, topbar, status panel |
| `--slip` | `#fffcf4` | record paper: slips, the book bar, the passbook (ink 16.8:1, ink-3 5.6:1) |
| `--raised` | `#f1ece2` | inputs, hover, skeleton rows |
| `--ink` / `--ink-2` / `--ink-3` | `#1f1a15` / `#5c5248` / `#6f655a` | text roles (16.3, 7.2 and 5.4:1 on ground) |
| `--hair-color` / `--hair-strong` | ink at 9% / 18% | hairlines; header, slip and control rules |
| `--accent` / `--accent-deep` / `--on-accent` | `#7b1e2c` / `#5e1520` / `#fffdf8` | the one accent: primary action and focus ring (9.6:1 on ground; 10:1 with its text) |
| `--select` / `--on-select` | `#1f1a15` / `#ffffff` | selection fill, the testnet line, the skip link (17.3:1) |
| `--signal` / `--signal-wash` | `#8a4f00` / `#f6efe4` | system attention only: stale, unavailable, overdue (6.2:1 on ground, 5.8:1 on its wash) |
| `--stamp-repaid` / `--stamp-late` / `--stamp-default` / `--stamp-open` / `--stamp-void` | `#2f6b45` / `#8a5a14` / `#b0251c` / `#1f1a15` / `#6f655a` | stamp inks, only for loan outcomes and their legend (all ≥ 5:1 on ground and slip) |
| `--leaf` / `--margin-rule` | `#fdf8ec` / accent at 32% | the passbook page and its red margin rule |
| `--cloth` / `--cloth-deep` / `--thread` / `--leaf-fold` / `--object-shadow` | as before | the landing passbook cover, retired when stage S2 replaces the hero |
| `--card-shadow` / `--sheet-shadow` | ink 5% / ink 6% and 28% | cards; the status panel and sheets |

### Type

| Token | Value |
|---|---|
| `--font-text` | `"Public Sans"`, system fallbacks: interface, body and every figure (`tabular-nums` on the body) |
| `--font-display` | `"Newsreader"`, Georgia fallback: each page's h1, the hero headline, the wordmark |
| `--font-id` | `"Red Hat Mono"`, ui-monospace fallback: account ids, proposal ids, hashes, `code` |
| sizes | `--fs-meta 12`, `--fs-small 13`, `--fs-id 13`, `--fs-body 15`, `--fs-read 17`, `--fs-title 18`, `--fs-lede 19`, `--fs-wordmark 24`, `--fs-figure 32`, `--fs-page-title 36`, `--fs-hero-figure 48`, `--fs-h2 clamp(32, 4vw, 44)`, `--fs-display clamp(40, 5vw, 60)` |
| line heights | `--lh-tight 1`, `--lh-display 1.04`, `--lh-heading 1.15`, `--lh-ui 1.4`, `--lh-read 1.6` |
| weights | `--w-regular 400`, `--w-medium 500`, `--w-strong 600` (stamps only) |
| tracking | `--track-display -0.03em` (h1), `--track-h2 -0.02em` (h2, page titles), `--track-stamp 0.04em` (stamps); 0 everywhere else |

Fonts load from Google Fonts with `display=swap`: Public Sans 400/500/600, Newsreader 400 with optical sizes, Red Hat Mono 400/500.

### Space and layout

| Token | Value |
|---|---|
| `--s-1` … `--s-13` | 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128 px |
| `--container` / `--container-app` | 1200px landing / 1280px board |
| `--gutter` | `clamp(16px, 4vw, 32px)` (16px at phone width) |
| `--measure` / `--measure-wide` | 36rem / 44rem |
| `--nav-h` / `--topbar-h` / `--tabbar-h` | 64 / 56 / 56 px |
| `--row-h` / `--touch` / `--control-h` / `--hero-control-h` | 44 / 44 / 40 / 48 px |
| `--stub-w` / `--bar-h` | 56px slip stub / 12px book bar |

Lists are tables above 900px and slips below; the phone tab bar appears under 720px.

### Shape and depth

| Token | Value |
|---|---|
| `--r-tag` / `--r-slip` / `--r-control` / `--r-card` | 4 / 6 / 8 / 12 px |
| `--hair` / `--rule-strong` | 1px ink at 9% / 18% |
| `--perforation` / `--notch` | 1px dashed ink at 18%; 5px half-circle notches at the top and bottom of a slip's perforation |
| `--tab-edge` | 2px ink top edge on the active index tab and phone tab |
| `--stamp-border` / `--stamp-pad-y` / `--stamp-opacity` | 2px / 2px / 0.92 |
| `--tilt-a` / `--tilt-b` / `--tilt-c` | −2° / 1.5° / −3.5° (tilted stamps only) |

### Motion

| Token | Value |
|---|---|
| `--ease` | `cubic-bezier(0.22, 1, 0.36, 1)` (the only curve) |
| `--dur-fast` / `--dur-select` / `--dur-route` / `--dur-stamp` / `--dur-enter` | 120 / 180 / 160 / 220 / 420 ms |
| `--stagger` / `--rise` / `--press` / `--dim` | 40ms (six at most) / 6px / 0.98 / 0.45 |

Hovers change color or background only; buttons scale to 0.98 on press; transitions are named, never `all`; no layout property is animated. Under `prefers-reduced-motion` every animation and transition is removed and every state still appears at once.

## Components

- **Primary button:** `--accent` fill, `--on-accent` text, `--r-control`, 40px (48px on the landing), weight 500. Hover `--accent-deep`, press `--press`.
- **Quiet button:** `--surface` with an 18% ink hairline; hover `--raised`.
- **Testnet line:** one ink line above the topbar with the facts that must stay true (testnet only, unaudited, not real money, the desk frozen with no access keys, the council three scripted accounts sharing one operator key) and a link to the proof.
- **Topbar and index tabs:** wordmark, then ledger index tabs: the active tab is joined to the page (ground fill, no bottom rule, a 2px ink top edge). They are links with `aria-current="page"`, not ARIA tabs.
- **Status chip:** a word plus a mark (Reading, Live with the read age, Stale, Unavailable, Not seeded); it opens a panel with the endpoint, the last good read in UTC, the last error in words and Retry. Phase changes are announced in a polite live region; read ages are not.
- **Phone tab bar:** text tabs fixed to the bottom under 720px, 56px tall, safe-area inset.
- **Card:** `--surface`, `--hair`, `--r-card`, `--card-shadow`, 24px padding (20px on phones).
- **Table:** 44px rows, a visually hidden caption, `th` scopes, header in `--fs-small` `--ink-3` over an 18% rule, figures right-aligned and tabular.
- **Slip:** a record on `--slip` with a 56px numbered stub behind a dashed perforation, notched top and bottom; the first line carries party, amount and outcome. Used for loans, requests and members under 900px. Never nested, never on summary figures.
- **Stamp (the signature):** capitals in Public Sans 600 at 12px, 0.04em tracking, a 2px border in the outcome's ink, `--r-tag`; tilted on detail pages and the hero, upright (`.flat`) in lists.
- **Provenance tag:** a small line, a word plus a shape: Live (filled dot, with the read age), Stale (filled square, signal), Derived (hollow dot, with the rule), Rules (hollow square, with the source), Recorded (heavy ring), Fixture (dashed, signal; dev gallery only), Illustrative (dashed, signal; none in use).
- **Data states:** not seeded, loading (skeleton rows the size of real rows, the elapsed time, no numbers), unavailable (the reason in words, Retry, the CLI route, the raw error in a disclosure), stale (the data stays under a signal band with the last good read and Retry; countdowns pause), partial (a missing cell says "status unavailable"), empty (a sentence saying what would fill it), not found.
- **Inputs:** `--raised` fill, hairline, `--r-control`, 40px, label above in `--fs-small` `--ink-2`.
- **Focus:** 2px `--accent` outline, offset 2px, on every link, button and input; a skip link first in the tab order.

## Page map

- **`/`:** navigation → hero (headline, one sentence from the README, the live chain instrument with the lane and party controls) → `#problem` "A DAO treasury can only give money away" → `#how` the three lanes and how a loan closes, each outcome linked to its real loan → `#proof` the desk's checks run live in the browser → `#try` open the board, the visitor line → footer with the repo link. No demo-video section (frontend contract, item 1). *Until stage S2 lands, `/` is the Passbook landing.*
- **`/app/`** (hash routes, so every deep link works from a subpath with no server rewrite):
  - `#/` Overview: the book (one large figure, the book bar, treasury balance and spendable, room to lend), the desk's state, what needs a hand, "Waiting for a co-signer", the loan book with each loan's Sputnik proposal id and status, the members with the repaid loans behind each standing, and the optional wallet panel. README step 3 is true on this route with no hash.
  - `#/loans` (filters in the hash), `#/loans/:id` with the proposal chain, `#/requests`, `#/members`, `#/members/:account` with the passbook and the derived standing trail, `#/desk` with the live checks and the policy as read. Each tab appears in the stage that builds its page.

## Data honesty

- Every read goes through `RpcClient` (`src/lib/rpc.ts`) to the RPC in `deployments/testnet.json`; independent reads run in parallel, the next read starts only after the previous one settles, reads pause while the tab is hidden, and the proposals of closed loans are cached once read (`web/src/data/`).
- A missing DAO account shows as "DAO account not found", never 0 NEAR; a proposal that could not be read shows "status unavailable", never dots.
- After a failed read the last good snapshot stays on screen marked stale, with its time, the reason and Retry.
- Every live figure or group carries a provenance tag with the read's age; a computed figure is tagged Derived with its rule; static facts from the README or the contract source are tagged Rules.
- Accounts under the demo's root are shown by their first label (`ada-1`), and the page says so; any other account is shown whole; full ids appear in the mono face where they matter.
- Landing copy restates the brief and README only: standing starts as a council grant, a refused ask has no proposal, the desk is keyless, the visitor line exists.
- The dev-only state gallery (`#/__states`) renders fixtures, every screen marked Fixture, and is excluded from production builds.

## Rules for later changes

- Use only the tokens above; add a token here and in `tokens.css` first if a new value is needed.
- Stamp inks only on loan outcomes; signal amber only on system attention; oxblood only on actions and focus.
- No shadows beyond `--card-shadow` and `--sheet-shadow` (and the passbook's while it lives); no gradients outside the passbook; no italic; no uppercase outside stamps; mono only for machine strings.
- A design change styles the board's data, wallet actions and links; it does not change what they say. A figure without a provenance tag is a bug.
