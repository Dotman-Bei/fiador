# Design direction: Passbook

The design source of truth for Fiador's `/` (landing) and `/app/` (board), as `docs/design/frontend-contract.md` requires. Every color, font, size, space, radius, shadow and duration in `web/src/styles/` comes from `web/src/styles/tokens.css`, and every token is listed here.

Two passes produced it, both on 2026-11-13:

1. **Design pass** with the ui-inspiration skill: references, shared principles, the passbook identity. The builder picked direction **A · Passbook** from three rendered mockups (A Passbook, B Wax seal, C Clearing house).
2. **Craft pass** with the unslop skill, in heavy mode over both pages, after the builder judged the first result basic. It audited the screens, set the five direction lines below, and fixed spacing, color, icons, copy, type, layout, details, visuals and motion in that order. Where unslop and the first pass disagreed, the result is written here.

> The craft pass uses **unslop** by Damir Sokolovsky ([@heydamir](https://x.com/heydamir), [heydamir.design/unslop](https://heydamir.design/unslop)), licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Its process, rules and checklist shaped this file and the stylesheets; this credit is kept as the license asks.

## Direction (unslop)

- **Product:** A credit desk seated in a Sputnik DAO's own policy that lends treasury NEAR to the DAO's members: at once within standing earned by repaying, more when a member co-signs, anything bigger by council vote, every repayment back to the treasury.
- **Character:** exact, neighbourly, on the record.
- **World:** a credit union's front counter. The member's passbook in an oxblood cloth cover, cream ruled pages, a rubber stamp and its ink pad, and the guarantor's signature on the line.
- **Moments:** on `/`, the open passbook built in CSS: a stitched oxblood cover and a ruled page whose lines are the first loans on the desk, read live from NEAR testnet, each with its co-signer, its Sputnik proposal and an inked stamp. On `/app/`, the loan book is the same ruled page, with the treasury balance set as the board's one large figure.
- **Signature:** the inked rubber stamp. A loan's outcome is pressed onto its line, tilted, in an ink that means the outcome. It appears only on loan lines (the passbook, the board's loan book) and the legend that explains them.

## References (Design pass)

Five live sites shortlisted from three galleries on mkdir.directory's list. Each value below was read from the live page with `getComputedStyle` on 2026-11-13.

| Site | Found via | What was measured | What we borrow (principle, not pieces) |
|---|---|---|---|
| [Jack & Jill](https://www.jackandjill.ai/) | [SiteInspire, Business & Finance](https://www.siteinspire.com/websites/category/business-and-finance) | h1 serif 72px / weight 400 / tracking −1.8px (−0.025em); sans body 16/24; ink `#100f0f` on white; muted = ink at 62%; tint surface `#f9f9f6`, radius 4px; black pill buttons, 14px/500 | A light-weight serif for display over a plain sans for reading; muted text derived from ink, not a new grey |
| [Bruun & Hjejle](https://bruunhjejle.dk) | SiteInspire, Business & Finance | serif display 78px / weight 400 / −1px; sans body 16.8/23.8; ground `#f6f6f2`, ink `#1f2122`; one accent `#ae8420` used on round actions and labels only; hairline column rules `#c6c6c4` between content columns; a dark band for the closing block | Institutional calm: one accent color used sparingly; content laid out in columns divided by 1px hairlines |
| [Imprint](https://imprint.co/) | SiteInspire, Business & Finance | grotesk h1 76px / tracking −3px; h2 58px; monochrome text; cards radius 15px with a soft 0 0 10px shadow | Big, tight display headings for a financial product; cards in the 12–16px radius range |
| [Causal](https://causal.so/) | [Minimal Gallery](https://minimal.gallery/websites/) | ground `#f9f9f9`, ink `#1a1a1a`, muted `#878787`; h1 60px/700; pill CTA radius 100px, 10px 16px; product tiles radius 7px; monospace at 12px for data | Restraint: one ground, one ink, one muted; the product's own content as the visual |
| [Column](https://column.com/) | [Land-book, search "bank"](https://land-book.com/search/websites?q=bank) | h1 52px / 600 / −1.56px; body copy 20px/300; buttons radius 8px with a 1px ring; statistics row with figures above small labels; hairline section rules | A bank shows its numbers plainly: figures large, labels small and quiet, hairline rules between rows |

A sixth gallery, [Saaspo's fintech category](https://saaspo.com/industry/fintech-saas-websites), was tried first; it showed a Cloudflare bot check, so it was skipped. The unslop pass also studied the skill's own finished examples (an invoicing hero drawn in its own material, a finance dashboard whose color lives in two moments, an engraved lighthouse hero, a 3D meadow footer) for their qualities only: one bright element per screen, quiet chrome, a visual that can be said in one sentence.

### Do-not-reuse check

Live `:root` tokens read 2026-11-13, checked again against the craft-pass token set.

| Site | Fonts | Palette | Fiador shares |
|---|---|---|---|
| [nightcrew.suitz.xyz](https://nightcrew.suitz.xyz) | Host Grotesk, JetBrains Mono | `#dedad3` ground, `#d3cec6` surface, `#0a0a0a` ink, `#256f82` teal accent | nothing |
| [stigi.suitz.xyz](https://stigi.suitz.xyz) | Host Grotesk, JetBrains Mono | `#ecebe7` ground, `#e1dfd9` surface, `#38450f` olive ink and accent, `#79a8d6` sky | nothing |
| Basanos (basanos.suitz.xyz) | IBM Plex Sans, IBM Plex Mono | `#256f82` teal, `#1a4be0` cobalt, `#ffffff` / `#f4f4f4`, `#d9ccb7` sand | nothing |

The Basanos site returned a Vercel `404: NOT_FOUND` at `/` and `/app/` on 2026-11-13, so its tokens were read from its source (`packages/design/tokens.css` in the Basanos repo). Fiador's families are Instrument Sans and Newsreader (no mono at all since the craft pass). Its ground `#faf8f3` is lighter and warmer than nightcrew's and stigi's greys; its one accent is oxblood, not teal, olive, cobalt or sky; its stamp green `#2f6b45` is a mid green, not stigi's dark olive.

## Principles the references share

1. **One ground, one ink, one accent.** Color carries meaning (an action, an outcome), never decoration.
2. **A serif headline over a plain reading face.** The display face is regular weight with slight negative tracking at large sizes only.
3. **Hairlines instead of boxes.** Structure comes from 1px rules between columns and rows; shadows are rare and neutral.
4. **Numbers are shown plainly.** Figures are large, tabular and set in the interface face; their labels are small and muted, in sentence case.
5. **Few, quiet controls.** One filled primary action per view, one quiet secondary; small-radius shapes.

## Identity: the passbook

*Fiador* is Spanish and Portuguese for guarantor, the person who signs for you. A credit union member's record used to be a **passbook**: a small ruled book in a dark cloth cover where every loan and every repayment was written as a line and stamped. Standing in Fiador works the same way: a new member starts with the standing the council gave them and earns more line by line; every funded loan carries its Sputnik proposal id, and each member's standing shows the repaid loans behind what they have earned.

## Audit (unslop, heavy)

What the craft pass found on the first-pass pages, and where it went:

| Sign | Where it lived | Fix |
|---|---|---|
| Uppercase tracked labels | `.label`, `.ledger th`, stamps, board `dt`, wallet labels, lane counters | Sentence case everywhere; only the stamp keeps capitals, as a rendered object |
| Italic for emphasis | `h1 em` (hero "Sputnik DAOs") | Removed; upright Newsreader |
| Three families | Newsreader, Instrument Sans, DM Mono | Instrument Sans plus Newsreader for headlines; DM Mono dropped (Instrument Sans has true tabular figures) |
| Mono as a third voice | kicker, labels, notices, inputs, read-time line | Interface face, muted role |
| Negative tracking below 40px | wordmark, h3, board h2, lane titles | Tracking 0 under 32px; −0.02em on h2, −0.03em on h1 |
| Accent flooding a band | oxblood "Try it" band | A white card on the ground; oxblood only on actions and the cover |
| Tan solid hairlines | `--rule #e5dccb` | Ink at 9% and 18% |
| Decorative check glyphs | green ✓ before each proof item | Removed; titled items |
| Template section titles and an eyebrow kicker | "The problem", "How it works", "Proof you can check", "Try it", "NEAR testnet · Sputnik DAO v2" | Titles that say this product's facts; kicker removed |
| Trailing periods on short labels | "Standing lane." etc. | Removed |
| No moment in the hero | text beside a three-row lane table | The live passbook |
| Prose bands | problem, how, proof as identical heading-left, prose-right bands | Varied: a "what is missing" list, lane columns plus a stamped outcome legend, a two-by-two proof grid |
| Narrow app column | `/app/` at 1120px | 1440px app container, treasury and desk as cards |
| Radii off the scale | pill buttons beside 4px panels | 10px controls, 14px cards, 4px stamps |
| Labeled placeholder box | the demo-video slot | Removed with the Demo section (builder's decision) |

## Token set

All in `web/src/styles/tokens.css`.

### Color

| Token | Value | Role |
|---|---|---|
| `--ground` | `#faf8f3` | page background (warm ramp) |
| `--surface` | `#ffffff` | cards |
| `--raised` | `#f1ece2` | inputs, quiet button hover |
| `--ink` | `#1f1a15` | primary text (16.3:1 on ground) |
| `--ink-2` | `#5c5248` | secondary text (7.2:1) |
| `--ink-3` | `#6f655a` | muted text, meta (5.4:1 on ground, 4.8:1 on raised) |
| `--hair-color` / `--hair-strong` | ink at 9% / 18% | hairlines; header and list rules |
| `--accent` / `--accent-deep` / `--on-accent` | `#7b1e2c` / `#5e1520` / `#fffdf8` | the one accent: primary action, wordmark on the passbook, focus ring (10:1 with its text) |
| `--stamp-repaid` / `--stamp-late` / `--stamp-default` / `--stamp-open` / `--stamp-void` | `#2f6b45` / `#8a5a14` / `#b0251c` / `#1f1a15` / `#6f655a` | stamp inks, only on loan lines, their legend, and the desk's yes/no facts (all ≥ 5:1 on the leaf) |
| `--cloth` / `--cloth-deep` / `--thread` | `#6e1a27` / `#4c111b` / `#e2cfa9` | the passbook cover and its stitching |
| `--leaf` / `--leaf-fold` / `--margin-rule` | `#fdf8ec` / cloth at 12% / accent at 32% | the cream page, the fold shading at the gutter, the red ledger margin rule |
| `--object-shadow` | `0 2px 4px` ink 8%, `0 28px 56px -20px` ink 35% | the passbook only |
| `--card-shadow` | `0 1px 2px` ink 5% | cards |

### Type

| Token | Value |
|---|---|
| `--font-text` | `"Instrument Sans"`, system fallbacks: interface, body, figures (`tabular-nums` on the body) |
| `--font-display` | `"Newsreader"`, Georgia fallback: h1, h2 and the passbook's title only |
| sizes | `--fs-meta 12`, `--fs-small 13`, `--fs-body 15`, `--fs-read 17` (landing prose), `--fs-title 18`, `--fs-lede 19`, `--fs-figure 32`, `--fs-page-title 36`, `--fs-hero-figure 48`, `--fs-h2 clamp(32, 4vw, 44)`, `--fs-display clamp(40, 5vw, 60)` |
| line heights | `--lh-tight 1`, `--lh-display 1.04`, `--lh-heading 1.15`, `--lh-ui 1.4`, `--lh-read 1.6` |
| weights | `--w-regular 400`, `--w-medium 500`, `--w-strong 600` (wordmark and stamps only) |
| tracking | `--track-display -0.03em` (h1), `--track-h2 -0.02em` (h2, page title), `--track-stamp 0.04em` (stamps); 0 everywhere else |

Fonts load from Google Fonts with `display=swap` (Instrument Sans 400/500/600, Newsreader 400 with optical sizes).

### Space and layout

| Token | Value |
|---|---|
| `--s-1` … `--s-13` | 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128 px |
| `--container` / `--container-app` | 1200px landing / 1440px board |
| `--gutter` | `clamp(16px, 4vw, 32px)` (16px at phone width) |
| `--measure` / `--measure-wide` | 36rem / 44rem |
| `--nav-h` / `--row-h` / `--control-h` / `--hero-control-h` | 64 / 44 / 40 / 48 px |
| `--pb-col-amount` / `--pb-col-outcome` / `--legend-col` | 96 / 108 / 136 px |

Landing sections: `--s-12` (96px) vertical padding, `--s-10` (64px) on phones. Board blocks: `--s-6` (24px) inside cards and between them.

### Shape and depth

| Token | Value |
|---|---|
| `--r-tag` | 4px (stamps) |
| `--r-control` | 10px (buttons, inputs) |
| `--r-card` | 14px (cards) |
| `--r-cover` / `--r-leaf` | 12px cover, 4px pages (nested: stitching inset `--s-1` at 12 − 4 = 8px) |
| `--hair` | `1px solid var(--hair-color)` |
| `--rule-double` | `3px double var(--margin-rule)` (ledger header rule) |
| `--stamp-border` / `--stamp-pad-y` / `--stamp-opacity` | 2px / 2px / 0.92 |
| `--tilt-a` / `--tilt-b` / `--tilt-c` / `--object-tilt` | −2° / 1.5° / −3.5° per stamp row; −1° for the passbook |
| `--stitch-opacity` | 0.55 |

### Motion

| Token | Value |
|---|---|
| `--ease` | `cubic-bezier(0.22, 1, 0.36, 1)` (the only curve) |
| `--dur-fast` | 150ms (hover, press, input focus) |
| `--dur-enter` | 420ms (the one entrance) |
| `--stagger` | 50ms, six lines at most |
| `--rise` / `--press` / `--stamp-press-from` | 8px / 0.98 / 1.08 |

The one entrance: the passbook's lines rise in with a 50ms stagger once the loans arrive, then each stamp is pressed (scale 1.08 → 1, fading in). Hovers change color or background only; buttons scale to 0.98 on press. Transitions are named (`color`, `background-color`, `border-color`, `transform`), never `all`. Everything is off under `prefers-reduced-motion`.

## Components

- **Primary button:** `--accent` fill, `--on-accent` text, `--r-control`, 40px tall (48px in the hero), 16–20px side padding, weight 500. Hover `--accent-deep`, press `--press`.
- **Quiet button:** `--surface` fill with an 18% ink hairline, `--ink` text; hover `--raised`.
- **Navigation:** wordmark "Fiador" in Instrument Sans 600 at 18px, quiet text links, one small primary button ("Open the board" on `/`).
- **Card:** `--surface`, `--hair`, `--r-card`, `--card-shadow`, 24px padding.
- **Table:** 44px rows, header in `--fs-small` `--ink-3` over an 18% rule, hairlines between rows, figures right-aligned and tabular; wide tables scroll inside their own box.
- **Stamp (the signature):** caps in Instrument Sans 600 at 12px with 0.04em tracking, a 2px border in the ink of its outcome, `--r-tag`, rotated by row (`--tilt-a/b/c`), multiplied onto the page. Inks: repaid (green), repaid late (umber), defaulted (red), open (ink), refused, not funded or voided (grey).
- **Passbook (the hero moment):** an oxblood cloth cover with a soft tone shift inside its one hue, dashed thread stitching inset 4px, two cream pages with fold shading at the gutter, a red double margin rule on the ruled page, and the table of the first six loans. On screens under 1180px it shows the ruled page only; on phones each line becomes a small card (entry left, amount and stamp right).
- **Inputs:** `--raised` fill, hairline, `--r-control`, 40px tall, label above in `--fs-small` `--ink-2`.
- **Focus:** 2px `--accent` outline, offset 2px, on every link, button and input.

## Page map

- **`/`:** navigation → hero (headline, lede, *Open the live board* and *Read the source*, the live passbook) → "A DAO treasury can only give money away" (two paragraphs and the list of what Sputnik DAO and Trezu lack) → "One seat in the DAO's policy, three lanes" (the seat, three lane columns, "When a loan closes" with a stamped legend, the council's powers) → "Check it yourself" (proposal ids, `npm run verify`, the keyless desk, the demo DAO ids) → "Read the whole book" (the board, the visitor line, *Open the board*) → footer with the repo link. There is no demo-video section (frontend contract, item 1).
- **`/app/`:** navigation (wordmark back to `/`, *About*, *Source*) → board heading with the DAO and desk links → treasury card (balance as the one large figure, available and out on loan) beside the desk card → waiting list → the loan book as a ruled, stamped page → members → read-time line → member actions card (three forms divided by hairlines).

## Data honesty

- The passbook reads the desk's own views (`get_config`, then `get_loans` from 0, six lines) through the RPC in `deployments/testnet.json`, the same public endpoint the board uses. It never shows invented rows: while loading it shows only its ruling and "Reading the loan book from NEAR testnet…", and on an RPC error it says so and points to the board.
- Accounts under the demo's root account are shortened to their first label (`ada-1`), and the page says so under the table; any other account (the visitor) is shown whole, and every name has its full account as a tooltip.
- Landing copy restates the brief and README only: standing starts as a council grant, a refused ask has no proposal, the desk is keyless, the visitor line exists.

## Page check (2026-11-13, after the craft pass)

Checked in Chrome on both pages at 1536px wide and at 375px wide, with live testnet data, against this file and the unslop checklist:

- Spacing on the 4px scale, equal rows in each list; stamps, figures and labels each in one column.
- One warm neutral ramp, three text roles, one accent (AA or better everywhere); no hue gradients, gradient text, glows, colored shadows or blobs; no emoji; no icons at all.
- Two families, weights 400 to 600, no italic (0 italic elements measured), no uppercase except the stamps, no negative tracking below 32px.
- No exclamation marks, no greeting, no trailing periods on short strings, no unverified claims; numbers tabular in one format (NEAR with up to four decimals, trailing zeros trimmed).
- Nested radii add up; the hero has a real product moment and no placeholder; motion has one curve, no loops, no layout properties animated.
- At 375px: no sideways page scroll on either page (scroll width 360 = client width), a 16px gutter, `/app/` tables scroll inside their own box, the smallest text is 12px.
- Template check: swap the name and the screen no longer fits, because the hero is this desk's own loan book with its own stamps.

Deviations, each kept on purpose:

1. **Stamps are uppercase with 0.04em tracking.** unslop bans uppercase tracked labels; a stamp is not a label but the rendered object of the signature, and real rubber stamps are cut in capitals. Nothing else is uppercase.
2. **The moments use tone gradients:** the cover shifts from `--cloth` to `--cloth-deep` (one hue) and the pages carry fold shading at the gutter. unslop allows a tone shift inside one hue and real materials inside a moment.
3. **The passbook's shadow is stronger than unslop's light-theme floating shadow** (`--object-shadow`), because it is a physical object with weight; it is neutral, not colored.
4. **Newsreader is used for every h1 and h2 and the passbook title, not the hero headline only.** unslop's warm row reserves it for the hero; its editorial row allows it for headlines. It never appears on labels, buttons or board section titles, which use Instrument Sans.
5. **`/app/` keeps the warm near-neutral ground** (`#faf8f3`, cards `#ffffff`) instead of a graphite ramp, so the board and the landing read as one product; the ground's chroma is very low and the board's color still lives only in the stamps.
6. **NEAR amounts keep their natural precision** (`15.4215 NEAR` beside `4 NEAR`). The board's figures come from `formatNear` in `src/lib/units.ts` (outside `web/`, up to four decimals with trailing zeros trimmed) and the board's data tests assert that format; it is one rule, set in tabular figures.
7. **In windows under about 700px tall the passbook runs about 24px past the first screen** (measured 634px against 610px in a 674px-tall window). unslop allows the product view to run past the bottom edge to invite a scroll; on taller windows the hero fills the first screen exactly.
8. **The passbook drops its left page under 1180px** and turns its lines into small cards on phones, instead of scaling the spread down.
9. **Literal micro-geometry:** 1px underline thickness, 3px underline offset, 2px focus outline offset, and `100%` widths are written in place; all else comes from tokens.

## Optional generated scene

No image-generation tool was available, so the hero object is built in CSS and nothing on the page waits for an image. If a scene is wanted behind the hero later, this is the prompt (unslop recipe):

> An open credit union passbook with an oxblood cloth cover and cream ruled pages lies on a pale paper-white counter, a wooden-handled rubber stamp and a small round ink pad beside it. Soft morning window light from the upper left, page background color #faf8f3 so the edges blend into the page, warm neutral palette with the oxblood cover as the only strong color. Cinematic photo of one object, shallow depth of field. Subject on the right half, calm empty space on the left half and in the lower fifth. No text, no letters, no numbers, no logos, no UI, no watermark. 16:9, 2880 × 1620.

Save it as `web/public/hero-scene.webp` with a real `alt`, and keep the coded passbook as the product view in front of it.

## Rules for later changes

- Use only the tokens above; add a token here and in `tokens.css` first if a new value is needed.
- The stamp appears only on loan lines and their legend. No other badges.
- No shadows beyond `--card-shadow` and the passbook's `--object-shadow`; no gradients outside the passbook; no italic; no uppercase outside stamps.
- Keep the board's data, wallet actions and links unchanged; a design change styles them, it does not change what they say.
