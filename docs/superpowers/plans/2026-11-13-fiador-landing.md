# Fiador Landing Page Implementation Plan

**Goal:** The landing page at `/`: hero, problem, how it works, proof, demo-video slot, button into /app, footer with the repo link.
**Architecture:** One React page in the same Vite multi-page app as the board, structural markup with real copy drawn only from the brief and README.
**Tech Stack:** React 19.3.1, Vite 8.3.8, vitest 5.1.0.
**Source spec:** docs/superpowers/specs/2026-11-13-fiador-design.md

Conventions for every task: run every command from the repo root; the executor never runs git; no secrets anywhere (env-var names only). The code below was developed and run before planning: in the combined workspace `tsc` is clean and every vitest suite passes, and `npm run web:check` builds both pages. `[HUMAN GATE]` tasks run in the main checkout (they need the git-ignored `.env`).

---

### Task 81: The landing page at /

**Files:**
- Create: `web/index.html`
- Create: `web/src/landing/Landing.tsx`
- Create: `web/src/landing/main.tsx`
- Test: `web/src/landing/landing.test.tsx`

**Depends on:** Task 62
**Effort:** medium
**Requires:** `web/vite.config.ts (multi-page: / and /app/), web/src/deployment.ts: loadDeployment(): Deployment | null, REPO_URL`, `web/src/board/Board.tsx: Board({ deployment }), BoardView, WaitingTable, LoanBook, MembersTable; /app/ page (web/app/index.html + web/src/board/main.tsx)`, `src/lib/deployments.ts: interface Deployment { network, rpc, factory, dao, desk, smoke, council, root, seeded_at, explorer }, DEPLOYMENT_PATH, EXPLORER, isDeployment(value: unknown): value is Deployment, accountUrl(deployment, accountId): string`
**Provides:** `web/src/landing/Landing.tsx: Landing({ deployment }), DEMO_VIDEO_URL; the / page (web/index.html + web/src/landing/main.tsx)`

Context: frontend contract item 1: the landing page is a required deliverable with these sections, in order: hero, problem, how it works, proof, demo-video slot, button into /app, footer with the repo link; copy is drawn only from the brief and the README, and makes no claim the project cannot back up. Structural markup only (the Design pass styles it). From Task 61, `web/src/deployment.ts` exports `loadDeployment(): Deployment | null` and `REPO_URL = 'https://github.com/Dotman-Bei/fiador'`; `web/vite.config.ts` builds `web/index.html` and `web/app/index.html`. `DEMO_VIDEO_URL` stays empty until the closing pass sets it. Strict TypeScript, ESM, `import type` for type-only imports, no `as any`, run every command from the repo root, the executor never runs git.

- [ ] **Step 1: Write the failing test**

`web/src/landing/landing.test.tsx`:
```tsx
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Landing } from './Landing';

describe('landing page', () => {
  const html = renderToStaticMarkup(<Landing deployment={null} />);

  it('has the frontend-contract sections in order', () => {
    const order = ['id="hero"', 'id="problem"', 'id="how"', 'id="proof"', 'id="demo"', 'id="try"', '<footer>'];
    const positions = order.map((needle) => html.indexOf(needle));
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  it('links into the board and to the repo', () => {
    expect(html).toContain('href="./app/"');
    expect(html).toContain('href="https://github.com/Dotman-Bei/fiador"');
  });

  it('keeps the demo slot honest until a video exists', () => {
    expect(html).toContain('The demo video is linked here once it is published.');
  });

  it('names the three lanes and the verify command', () => {
    for (const text of ['Standing lane.', 'Co-signed lane.', 'Council lane.', 'npm run verify']) expect(html).toContain(text);
  });

  it('shows the live DAO when the build was seeded', () => {
    const seeded = renderToStaticMarkup(
      <Landing
        deployment={{
          network: 'testnet',
          rpc: 'r',
          factory: 'sputnikv2.testnet',
          dao: 'fiador.sputnikv2.testnet',
          desk: 'desk.root.testnet',
          smoke: 's',
          council: [],
          root: 'root.testnet',
          seeded_at: 't',
          explorer: 'https://testnet.nearblocks.io',
        }}
      />,
    );
    expect(seeded).toContain('<code>fiador.sputnikv2.testnet</code>');
  });
});
```

- [ ] **Step 2: Run to confirm it fails**

Run: `npx vitest run web/src/landing/landing.test.tsx`
Expected: FAIL — `Failed to resolve import "./Landing"`

- [ ] **Step 3: Implement**

`web/src/landing/Landing.tsx`:
```tsx
/** / — the landing page. Structural markup and real copy only (drawn from the brief and README); no styling. */
import type { Deployment } from '../../../src/lib/deployments';
import { REPO_URL } from '../deployment';

/** Set by the closing pass once the demo video is published; empty means the slot says so honestly. */
export const DEMO_VIDEO_URL = '';

export function Landing({ deployment }: { deployment: Deployment | null }) {
  return (
    <>
      <header>
        <p>Fiador</p>
        <nav>
          <a href="./app/">Open the board</a> <a href={REPO_URL}>Source</a>
        </nav>
      </header>
      <main>
        <section aria-labelledby="hero">
          <h1 id="hero">A credit union seat for Sputnik DAOs</h1>
          <p>
            Members borrow treasury NEAR instantly within a limit earned by on-time repayment, get more when another member co-signs, and anything larger goes to a
            normal council vote. Every loan is a native Sputnik proposal and every repayment returns to the treasury.
          </p>
          <p>
            <a href="./app/">Open the live board</a>
          </p>
        </section>

        <section aria-labelledby="problem">
          <h2 id="problem">The problem</h2>
          <p>
            A community that keeps its money in a Sputnik DAO can only give it away. Every payment out is a one-way payout, so a member who needs a short float, a
            venue deposit to front or a gap before a payout lands, can either ask the whole council to vote a grant or go without.
          </p>
          <p>
            Communities solved this long ago with credit unions: small loans to known members, sized by whether they repaid the last one and backed by a fellow
            member's word. Sputnik DAO and Trezu have none of the pieces that needs: no amount tiers, no automatic approval for trusted members, no limits, and no
            record of who kept their word.
          </p>
        </section>

        <section aria-labelledby="how">
          <h2 id="how">How it works</h2>
          <p>
            Fiador is one contract, the desk, holding one narrow seat in the DAO's own policy: it may file and approve transfer proposals and nothing else. It never
            holds loan funds. The DAO pays every loan through its own Transfer proposal.
          </p>
          <ol>
            <li>
              <strong>Standing lane.</strong> The amount fits your unused standing and the book cap has room: the desk files a Sputnik transfer and approves it in
              the same transaction chain. No council vote.
            </li>
            <li>
              <strong>Co-signed lane.</strong> Above your standing, the desk holds your request. One member co-signs the gap from their own standing, and the loan
              is filed and approved inside their transaction. The pledge stays locked until you repay.
            </li>
            <li>
              <strong>Council lane.</strong> Anything larger is filed as an ordinary proposal that the council votes, 2 of 3. Once approved, the desk tracks it as a
              loan.
            </li>
          </ol>
          <p>
            Repay on time and your standing grows by up to the step the DAO set, never by more than you put at risk; your co-signer's grows too. Let a loan run past
            its term and grace period and your standing goes to zero, and your co-signer loses exactly what they pledged. The council admits members, sets every
            limit and can unseat the desk with an ordinary 2-of-3 proposal, after which Sputnik itself refuses the next request.
          </p>
        </section>

        <section aria-labelledby="proof">
          <h2 id="proof">Proof you can check</h2>
          <ul>
            <li>Every row on the board carries its Sputnik proposal id, so every point of standing traces to a named account and a repaid loan.</li>
            <li>
              <code>npm run verify</code> reads the DAO and the desk through public RPC and checks every loan against its proposal: kind, receiver, amount and
              status. It needs no wallet and no secrets.
            </li>
            <li>After the demo run the desk's access keys were deleted, so it has no admin and cannot be upgraded; verify checks that too.</li>
            {deployment === null ? null : (
              <li>
                Demo DAO on NEAR testnet: <code>{deployment.dao}</code>; desk: <code>{deployment.desk}</code>.
              </li>
            )}
          </ul>
        </section>

        <section aria-labelledby="demo">
          <h2 id="demo">Demo</h2>
          {DEMO_VIDEO_URL === '' ? <p>The demo video is linked here once it is published.</p> : <p><a href={DEMO_VIDEO_URL}>Watch the demo video</a></p>}
        </section>

        <section aria-labelledby="try">
          <h2 id="try">Try it</h2>
          <p>
            <a href="./app/">Open the board</a> to see the treasury, the loan book and every member's standing, read live from testnet.
          </p>
        </section>
      </main>
      <footer>
        <p>
          Built at NEAR HACKATHON 2026. Testnet only, unaudited. <a href={REPO_URL}>Source on GitHub</a>.
        </p>
      </footer>
    </>
  );
}
```

`web/src/landing/main.tsx`:
```tsx
import { createRoot } from 'react-dom/client';
import { loadDeployment } from '../deployment';
import { Landing } from './Landing';

const el = document.getElementById('root');
if (el !== null) createRoot(el).render(<Landing deployment={loadDeployment()} />);
```

`web/index.html`:
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Fiador</title>
    <meta name="description" content="A credit union seat for Sputnik DAOs: members borrow treasury NEAR within a limit earned by on-time repayment." />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./src/landing/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 4: Run the gate**

Run: `npm run web:check`
Expected: PASS — `Test Files  3 passed (3)`, then Vite prints `dist/index.html`, `dist/app/index.html` and `built in`

- [ ] **Step 5: Commit (kernel-performed — no agent runs this)**
Message: `feat(web): the landing page`

---
