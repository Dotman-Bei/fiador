# Design direction: Passbook

The Design pass for Fiador, run with the ui-inspiration skill on 2026-11-13 as `docs/design/frontend-contract.md` requires. This file is the only source of visual decisions for `/` (landing) and `/app/` (board). Every color, font, size, space, radius and rule in `web/src/styles/` comes from the token set below.

Chosen direction: **A · Passbook**, picked by the builder from three rendered mockups (A Passbook, B Wax seal, C Clearing house).

## References

Five live sites shortlisted from three galleries on mkdir.directory's list. Each value below was read from the live page with `getComputedStyle` on 2026-11-13.

| Site | Found via | What was measured | What we borrow (principle, not pieces) |
|---|---|---|---|
| [Jack & Jill](https://www.jackandjill.ai/) | [SiteInspire, Business & Finance](https://www.siteinspire.com/websites/category/business-and-finance) | h1 serif 72px / weight 400 / tracking −1.8px (−0.025em); sans body 16/24; ink `#100f0f` on white; muted = ink at 62%; tint surface `#f9f9f6`, radius 4px; black pill buttons, 14px/500 | A light-weight serif for display over a plain sans for reading; muted text derived from ink, not a new grey; pill buttons |
| [Bruun & Hjejle](https://bruunhjejle.dk) | SiteInspire, Business & Finance | serif display 78px / weight 400 / −1px; sans body 16.8/23.8; ground `#f6f6f2`, ink `#1f2122`; one accent `#ae8420` used on round actions and labels only; hairline column rules `#c6c6c4` between content columns; a dark band for the closing block | Institutional calm: one accent color used sparingly; content laid out in columns divided by 1px hairlines instead of cards and shadows |
| [Imprint](https://imprint.co/) | SiteInspire, Business & Finance | grotesk h1 76px / tracking −3px; h2 58px; monochrome text; cards radius 15px with a soft 0 0 10px shadow | Big, tight display headings for a financial product are fine; we take the scale, not the shadowed cards |
| [Causal](https://causal.so/) | [Minimal Gallery](https://minimal.gallery/websites/) | ground `#f9f9f9`, ink `#1a1a1a`, muted `#878787`; h1 60px/700; pill CTA radius 100px, 10px 16px; product tiles radius 7px; monospace at 12px for data | Restraint: one ground, one ink, one muted; the product's own data shown in a monospace |
| [Column](https://column.com/) | [Land-book, search "bank"](https://land-book.com/search/websites?q=bank) | h1 52px / 600 / −1.56px; body copy 20px/300; buttons radius 8px with a 1px ring; statistics row with figures above small labels; hairline section rules | A bank shows its numbers plainly: figures large, labels small and quiet, hairline rules between rows |

A sixth gallery, [Saaspo's fintech category](https://saaspo.com/industry/fintech-saas-websites), was tried first; it showed a Cloudflare bot check, so it was skipped.

### Do-not-reuse check (live `:root` tokens read 2026-11-13)

| Site | Fonts | Palette | Fiador's tokens |
|---|---|---|---|
| [nightcrew.suitz.xyz](https://nightcrew.suitz.xyz) | Host Grotesk, JetBrains Mono | `#dedad3` ground, `#d3cec6` surface, `#0a0a0a` ink, `#256f82` teal accent | none shared |
| [stigi.suitz.xyz](https://stigi.suitz.xyz) | Host Grotesk, JetBrains Mono | `#ecebe7` ground, `#e1dfd9` surface, `#38450f` olive ink and accent, `#79a8d6` sky | none shared |
| Basanos (basanos.suitz.xyz) | IBM Plex Sans, IBM Plex Mono | `#256f82` teal, `#1a4be0` cobalt, `#ffffff` / `#f4f4f4`, `#d9ccb7` sand | none shared |

The Basanos site returned a Vercel `404: NOT_FOUND` at `/` and `/app/` on 2026-11-13, so its tokens were read from its source (`packages/design/tokens.css` in the Basanos repo) instead of the live page. Fiador uses none of these fonts, and no color in its token set is within a visible step of these palettes: its ground is a near-white paper, not a warm grey; its accent is oxblood, not teal, olive or blue.

## Principles the references share

1. **One ground, one ink, one accent.** Every reference runs on a near-white or near-black ground with one dark ink. Color carries meaning (an action, a status), never decoration.
2. **Serif or tight display over a plain reading face.** The display face is light (400) with negative tracking; body text stays 16–18px with a 1.5 line height.
3. **Hairlines instead of boxes.** Structure comes from 1px rules between columns and rows. Shadows are rare or absent.
4. **Numbers are shown plainly.** Figures are large and set in a steady face; their labels are small, uppercase or muted.
5. **Few, quiet controls.** One filled primary action per view, outlined secondary actions, pill or small-radius shapes.

## Identity: the passbook

*Fiador* is Spanish and Portuguese for guarantor, the person who signs for you. A credit union member's record used to be a **passbook**: a small ruled book in a dark cover where every loan and every repayment was written as a line and stamped. Standing in Fiador works the same way: it is earned line by line, and every point traces to a repaid loan and its Sputnik proposal.

So the product looks like that book, set on screen:

- **Paper and ink.** A warm near-white page (`--paper`) with brown-black ink, and a slightly darker leaf (`--leaf`) for the ledger panels.
- **The cover.** Oxblood (`--cover`) is the passbook cover: the primary button, the closing call to action band, emphasis in headings. It is also the accountant's red ink, so a default is written in it.
- **Ruled ledgers.** Every table is a ledger: monospace figures, an ink-weight rule under the header, hairline rules between lines, amounts right-aligned with tabular numerals.
- **Stamps.** A loan's status is a small outlined stamp, tilted slightly as if pressed by hand: green for repaid, amber for open, oxblood for defaulted, muted for closed without effect.
- **No ornament beyond that.** No gradients, no glass, no illustrations, no shadows.

## Token set

These are the only design values `web/` may use. They live as CSS custom properties in `web/src/styles/tokens.css`. Derived values are written with `color-mix()` from these tokens, never as new hex values.

### Color

| Token | Value | Use |
|---|---|---|
| `--paper` | `#fffdf8` | page ground |
| `--leaf` | `#f6f1e7` | ledger panels, form fields, the video slot |
| `--ink` | `#1b1612` | text, ledger header rule, outlined buttons |
| `--muted` | `#6e6358` | secondary text, labels (5.8:1 on paper) |
| `--rule` | `#e5dccb` | hairlines between rows, columns and sections |
| `--cover` | `#7b1e2c` | primary action, CTA band, heading emphasis, defaulted stamp |
| `--cover-deep` | `#5e1520` | primary action hover and pressed |
| `--cover-ink` | `#fffdf8` | text on the cover color |
| `--ok` | `#1d6b45` | repaid stamp, true values ("yes") |
| `--open` | `#a35a00` | open-loan stamps (filing, voting, awaiting council, active), time left |
| `--focus` | `#7b1e2c` | focus ring (same as `--cover`) |

Every text color passes WCAG AA (4.5:1) on both `--paper` and `--leaf`.

### Type

| Token | Value |
|---|---|
| `--font-display` | `"Newsreader", Georgia, "Times New Roman", serif`, weight 400, optical sizes on, italic for emphasis |
| `--font-text` | `"Instrument Sans", system-ui, -apple-system, "Segoe UI", sans-serif`, weights 400 / 500 / 600 |
| `--font-figure` | `"DM Mono", ui-monospace, "Cascadia Mono", Menlo, monospace`, weights 400 / 500: figures, ids, account names, labels |
| `--track-display` | `-0.025em` |
| `--track-label` | `0.06em` (uppercase labels only) |

Loaded from Google Fonts with `display=swap`; the fallbacks keep the layout if the font CDN is unreachable.

Scale (px): `--fs-stamp 11`, `--fs-label 12`, `--fs-small 13`, `--fs-body 16`, `--fs-lede 18`, `--fs-h3 22`, `--fs-h2 clamp(30, 4vw, 40)`, `--fs-figure clamp(26, 3vw, 34)`, `--fs-display clamp(42, 7vw, 72)`.

Line heights: `--lh-display 1.02`, `--lh-heading 1.15`, `--lh-tight 1.35` (tables, labels, stamps), `--lh-body 1.55`.

### Space, shape, layout

| Token | Value |
|---|---|
| `--s-1` … `--s-9` | 4, 8, 12, 16, 24, 32, 48, 72, 112 px |
| `--container` | 1120px |
| `--gutter` | `clamp(16px, 4vw, 40px)` (16px at phone width) |
| `--r-stamp` | 3px |
| `--r-panel` | 4px |
| `--r-pill` | 999px |
| `--hair` | `1px solid var(--rule)` |
| `--hair-ink` | `1px solid var(--ink)` |
| `--stamp-border` | 1.5px |
| `--tilt` | `-2deg` (stamps only) |
| shadow | none |
| `--ease` | `120ms ease-out` (color and background transitions only; removed under `prefers-reduced-motion`) |

Sections are separated by `--hair` rules with `--s-8` (72px) vertical padding, `--s-7` (48px) under 720px. Content columns are divided by vertical hairlines on wide screens and stack under 720px. Tables sit inside a horizontally scrollable wrapper so the page itself never scrolls sideways.

### Components

- **Primary button:** `--cover` fill, `--cover-ink` text, `--r-pill`, `--s-3` × `--s-5` padding, `--font-text` 600 at `--fs-body`. Hover `--cover-deep`.
- **Secondary button:** transparent, `--hair-ink` border, `--ink` text, same shape.
- **Ledger table:** `--font-figure` 13px; header labels 11–12px uppercase with `--track-label` in `--muted` over a `--hair-ink` rule; rows divided by `--hair`; numeric cells right-aligned with `font-variant-numeric: tabular-nums`.
- **Stamp:** inline, `--stamp-border` solid currentColor, `--r-stamp`, uppercase `--fs-stamp` `--font-figure` with `--track-label`, rotated by `--tilt`. Tones: `ok`, `open`, `bad` (uses `--cover`), `quiet` (uses `--muted`).
- **Figure block (dl):** label in `--fs-label` uppercase `--muted`, value in `--font-figure` at `--fs-figure` for treasury figures, `--fs-body` for desk parameters.
- **Panel:** `--leaf` fill, `--hair` border, `--r-panel`. No shadow.
- **Inputs:** `--paper` fill, `--hair-ink` bottom border only (a line to write on), `--font-figure` text; label above in `--fs-label` uppercase.
- **Focus:** 2px solid `--focus`, offset 2px, on every link, button and input.

## Page map

- **`/`**: header (wordmark, *Open the board*, *Source*) → hero (display heading with the cover-colored emphasis, lede, primary *Open the live board*, secondary *Source*, and a ledger panel restating the three lanes from the brief) → problem (heading column + text column, hairline between) → how it works (three lane columns with hairlines, then the repayment and default paragraph) → proof (ledger-ruled list with check stamps, ids in `--font-figure`) → demo (a 16:9 `--leaf` slot holding the honest placeholder line until the video is published) → try it (a full-width `--cover` band with the button into `/app/`) → footer (small print and repo link).
- **`/app/`**: top bar (wordmark linking back to `/`, *Source*) → board header → treasury and desk panels side by side → waiting list, loan book and members as ledger tables with stamps → read-time footer line → member actions (wallet) panel with ruled inputs.

## Page check (2026-11-13)

Both pages were checked in Chrome against this file at desktop width and at 375px (16px gutter, no horizontal page scroll; ledger tables scroll inside their own wrapper), and the stylesheets were searched for any color, font family or inline style outside `tokens.css` (none found). `/app/` was checked with live testnet data loaded.

What matches: every color and font family comes from the token set; text contrast is AA or better for every token pair (lowest: `--open` on `--leaf`, 4.64:1); structure is hairlines, not shadows; statuses are stamps in the four tones; one filled primary action per view.

Deviations, each kept on purpose:

1. **Reading measures are literal `em`/`ch` widths** (`13ch` hero heading, `32em`–`48em` paragraphs). The token set has no measure token; these only cap line length.
2. **Micro-geometry is literal:** 1px underline thickness, 3px underline offset, 2px focus outline and offset, 1px vertical padding inside stamps, `0.9em` for inline code. All are below the spacing scale.
3. **A second breakpoint at 860px** on `/app/` stacks the three member-action forms earlier than the 720px page breakpoint, because three ruled forms are cramped between 720 and 860px.
4. **Board ledger blocks use `--s-6` (32px) vertical padding, not `--s-8`,** so the treasury, waiting list, loan book and members read as one dense book; the landing page keeps `--s-8`.
5. **Desk parameters are set at `--fs-small`, not `--fs-body`,** so the monospace values fit their column without wrapping at most widths.
6. **The hero heading wraps to three lines at 1120px**: the hero column caps it; no copy change was made to force two lines.
7. **Copy additions on `/`, all restating the brief and README:** a kicker (`NEAR testnet · Sputnik DAO v2`), a hero ledger panel restating the three lanes (lane, when, approved by), and the *Try it* sentence reworded from "Open the board to see…" to "See…" beside a separate button. `/app/` gains a top bar linking back to `/` (*About*) and to the repo (*Source*). No numbers, addresses or claims were added; the board's data and the demo-video placeholder are unchanged.

## Rules for later changes

- Use only the tokens above; add a token here first if a new value is needed.
- No shadows, gradients, images or icons beyond text glyphs.
- Keep the board's data, wallet actions and links unchanged; the Design pass styles them, it does not change what they say.
