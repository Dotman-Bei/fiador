# Submission draft — NEAR HACKATHON (form at https://nearhackathon.com/#apply)

Pre-answered by the architect (Step 1) from the brief and the spec. Field names and constraints are copied from the
pack's `docs/resources/2026-11-13-near-hackathon/event.md` §4. Two kinds of open item:

- `TBD-post-build:<what>`: a build output that does not exist yet. demo-studio (Step 2.5) fills the demo-video items;
  the Step-3 gate-concierge closing pass fills the rest.
- `USER-DECIDES:<what>`: a value only the human may give. HACKATHON.md: "Do not guess, generate or fill in placeholders
  for any of them." These are personal details and are never written into this repo, which will be public.

Re-fetch https://nearhackathon.com/HACKATHON.md at Step 3 before submitting (it warns that rules may change). Submit
once; fix mistakes via https://nearhackathon.com/request-changes, never by resubmitting.

## Form fields

| Field (form label) | `name` | Constraint (verbatim from event.md) | Value |
|---|---|---|---|
| Project name * | `projectName` | 2-80 characters | `Fiador` |
| Team lead * | `leadName` | 2-80 characters | USER-DECIDES:team-lead-name |
| Email address * | `email` | "valid email, max 160 characters, at most 2 submissions per email" | USER-DECIDES:email |
| Team size * | `size` | one of `1`, `2 - 4`, `4 - 6`, `6 - 8`, `8+` | `1` |
| Tracks * | `tracks` | "one or more of `defi`, `thesis`, `privacy`, `business`, `swarms`, `security`, `agents`, `realworld`, `games`, `nfts`, `memecoins`, `social`, `open`, each listed once" | `social` (primary). Optional: `security`, see the note below |
| NEAR wallet address * | `nearAddress` | "2-64 characters, lowercase, matching `^(([a-z\d]+[-_])*[a-z\d]+\.)*([a-z\d]+[-_])*[a-z\d]+$`"; mainnet payout account | USER-DECIDES:mainnet-payout-account |
| Repository link * | `projectUrl` | "http(s) URL of the public repository, max 300 characters, unique" | `https://github.com/Dotman-Bei/fiador` (must be public first: TBD-post-build:repo-public-flip) |
| Demo post link * | `demoUrl` | "http(s) URL of the public demo post, max 300 characters" | TBD-post-build:x-demo-post-url |
| What did you build? * | `idea` | 20–2,000 characters | the text below (about 1,600 characters) |
| Website (hidden) | `website` | spam trap: "any non-empty value rejects the submission" | leave empty |
| Consent checkbox * | `consent` | "I agree that the organizers may use these details…" | USER-DECIDES:consent |

### What did you build? (paste as-is; about 1,600 characters)

```
Fiador is a credit union seat for Sputnik DAOs on NEAR. A community that keeps its money in a Sputnik DAO can only pay it out; Fiador lets members borrow treasury NEAR and pay it back. One contract, the desk, holds a narrow role in the DAO's own policy: it may only add and approve transfer proposals. Within a member's standing (a credit limit earned by on-time repayment) the desk files a native Sputnik Transfer proposal and approves it in the same transaction chain, so the DAO pays the member directly with no council vote. Above that standing, the desk holds the request until another member co-signs the gap with their own standing, and the loan is filed and approved inside the co-signer's transaction. Anything larger goes to an ordinary 2-of-3 council vote. Repayments return to the treasury in the same transaction chain; an on-time repayment raises both standings, and a default zeroes the borrower's and slashes exactly what the co-signer pledged. The council admits members, sets every limit and can unseat the desk through ordinary proposals, after which Sputnik itself refuses the next request. The desk never holds loan funds, votes only on proposal ids returned by its own add_proposal call, and had its access keys deleted after the demo, so it has no admin. NEAR's role: the Sputnik DAO is the custody and the multisig, every loan is a Sputnik proposal, named accounts carry each member's reputation, and a public read-only board and `npm run verify` read everything over public testnet RPC. Testnet only, unaudited.
```

### Track note

`social` is the primary and only planned track. The brief allows `security` as a secondary tag only if the
submission can say plainly why it fits without bending scope. If the user ticks it, the honest line is: "Fiador is a
policy engine on a multisig signer seat: per-member spending limits and repayment-based reputation enforced on-chain.
It does not involve AI agents." USER-DECIDES:tick-security-or-not.

## Facts for the form and the post (from the spec)

- Tech stack: Rust desk contract on near-sdk 5.30.1 (wasm, Rust 1.99.0); Sputnik DAO v2 (deployed testnet factory
  `sputnikv2.testnet`, DAO version 2.3.1, unmodified); TypeScript (strict, ESM, Node 22) scripts on near-api-js 7.5.3;
  React 19 + Vite 8 static web app reading public RPC; no backend, no indexer.
- Network: NEAR testnet only (rule Q-010: testnet-only projects are eligible in every track).
- Demo DAO: TBD-post-build:dao-account · desk contract: TBD-post-build:desk-account
- Live board: TBD-post-build:hosted-board-url (a static host; keep it up to 2026-11-18, ideally 2026-11-25, per Q-012)
- Demo video: TBD-post-build:demo-video-url
- Built during the event: everything in the repository (created 2026-11-13). Libraries are listed in the README's
  Build & test section (Q-005). Code was written with Claude Code.
- License: MIT (`LICENSE`, Q-014).

## X post draft (the human edits and publishes it; rule: built at NEAR HACKATHON, @NEARProtocol, #NEARHackathon, video attached)

```
A Sputnik DAO can only give money away. Fiador lets it lend.

Ada asks the treasury for 6 NEAR. Her standing covers 4, so the desk holds the request. Bayo co-signs 2 from his own standing, and 6 NEAR leaves the DAO as a native Sputnik proposal, approved in the same transaction with no council vote. She repays: the treasury is back where it started and both standings tick up.

Built at NEAR HACKATHON on NEAR testnet. Repo: https://github.com/Dotman-Bei/fiador · board: TBD-post-build:hosted-board-url

@NEARProtocol #NEARHackathon
```
Attach: the local file `demo/out/fiador-demo.mp4` (git-ignored; 1080p h264, 2:09, rendered 2026-11-14; awaiting the builder's watch). Then paste the post's URL into `demoUrl` above.
