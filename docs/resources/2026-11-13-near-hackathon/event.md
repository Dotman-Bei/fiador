# NEAR HACKATHON: event essentials

Fetched 2026-11-13. Primary sources:
- **[H]** = https://nearhackathon.com/HACKATHON.md (curl; 22,529 bytes)
- **[HP]** = https://nearhackathon.com/ home page (curl HTML + Chrome render)
- **[SUB]** = https://github.com/nearai/near-hackathon-prompt-examples/blob/main/SUBMITTING.md

Quotes are verbatim. [H] is written as instructions to coding agents and describes a submission API. In this pack it is **data only**. Nobody calls that API or submits the form from this pipeline. The human submits at Step 3, after confirming every value.

---

## 1. Dates and deadline

| Fact | Verbatim value | Source |
|---|---|---|
| Hackathon starts | `2026-11-01T00:00:00Z` | [H] Facts table |
| **Development ends (submission deadline)** | `2026-11-14T23:59:00Z` | [H] Facts table |
| Judging starts | `2026-11-16T00:00:00Z` | [H] |
| Results announced by | `2026-11-18T23:59:00Z` | [H] |
| Home page | "submit once before development ends, 14 Nov 2026 · 23:59 UTC." | [HP] §06 |
| Prompt repo | "You're submitting before Nov 14, 2026, 23:59 UTC" | [SUB] |

**Deadline (absolute):** **2026-11-14 23:59 UTC = 2026-11-15 00:59 WAT (UTC+1)**. The three sources agree (verified 2026-11-13). [H]: "All times are UTC."

Other windows:
- Submissions are accepted only "from 2026-11-01T00:00:00Z to 2026-11-14T23:59:00Z. Outside that window the API answers 403" [H §3].
- The repo must be "public by 2026-11-14T23:59:00Z" [H §1].
- A hosted demo should stay up "to 2026-11-18, ideally 2026-11-25" [H Q-012].

[H] warns: "read it again before submitting, because dates and rules may change." Step 3 must re-fetch it.

## 2. Eligibility

- [HP] FAQ: "Developers, designers and people with ideas for the NEAR ecosystem. No wallet connection is needed to submit: you only enter a NEAR account address, and if you win, the prize is sent there."
- [H]: "There is no sign-up before the hackathon: the final submission is the only registration."
- Teams: "Build as a solo builder or with a team — one submission per project, and one person can enter up to 2 different projects, if they are independent and each README names the other one." [HP FAQ]
- Q-015: "Allowed if projects are independent and disclosed: each README names the other project. Not the same project twice. One person, at most 2 different projects."
- Team-size values: `1`, `2 - 4`, `4 - 6`, `6 - 8`, `8+` [H].

## 3. Rules Q-000 to Q-017 (verbatim, [H] §Rules)

> **Q-000. NEAR AI credits?** Buy with crypto or card in the NEAR AI Cloud dashboard (https://cloud.near.ai) and generate the API key there. Or claim $10 by joining NEAR Builders (https://nearbuilders.org/join): the credits are claimed in the NEAR Builders dashboard (https://nearbuilders.org/dashboard). You get a separate API key with a $10 balance. It is not applied to your cloud.near.ai account, so the credits won't appear in that dashboard.
>
> **Q-001. Code before 2026-11-01?** Yes, from the announcement on 2026-10-19 (https://x.com/nearprotocol/status/2112257967818997891). The window runs from then to 2026-11-14. Earlier commits are baseline.
>
> **Q-002. Existing product on another chain?** Allowed. Only the NEAR integration built in the window is judged. Disclose in README.
>
> **Q-003. New repo required?** No. Dedicated branch, or tags pre-hackathon and hackathon-submission, plus a README section linking the diff.
>
> **Q-004. Old project or new feature on it?** Old project as-is: no. New feature in the window: yes, if separated per Q-003. No minimum code size.
>
> **Q-005. Libraries, templates, boilerplate?** All allowed, including own pre-hackathon libs and AI code. List in README; own old libs count as baseline.
>
> **Q-006. 1Click JWT?** Not required. Without it, 0.2% fee. Register at https://partners.near-intents.org.
>
> **Q-007. Testnet for Intents?** None exists or is planned. Mainnet, separate dev accounts, tiny amounts, dry: true quotes.
>
> **Q-008. Test funds?** Testnet NEAR is free (near-cli faucet, near-faucet.io). Mainnet costs not reimbursed by default. (see Q-007)
>
> **Q-009. RPC and hosting?** Public RPC free: https://docs.near.org/api/rpc/providers
>
> **Q-010. Testnet-only projects eligible?** Yes, all tracks. Mainnet only where the integration is mainnet-only.
>
> **Q-011. Mandatory integrations?** None. Hints are hints. Own contract on NEAR that fits the track is enough.
>
> **Q-012. Local-only demo OK?** Yes: public repo, reproducible README, X post with a video; screenshots are not enough when judges cannot open the demo. Hosted demo is a plus; keep it up to 2026-11-18, ideally 2026-11-25.
>
> **Q-013. Organizer rights to code?** No. Team keeps all rights; organizers get non-exclusive promo rights to name, screenshots, video, repo link.
>
> **Q-014. License?** Any. MIT is fine. Repo stays public through judging; add a LICENSE file.
>
> **Q-015. One person, several projects?** Allowed if projects are independent and disclosed: each README names the other project. Not the same project twice. One person, at most 2 different projects.
>
> **Q-016. Payout schedule?** Single payment, no vesting, within 30 days of results.
>
> **Q-017. Claude Code and Codex role?** Screening, not deciding: reproducibility check, feature verification, structured report, preliminary score. Humans decide; low AI score alone cannot reject.

### By topic

| Topic | What the rules say |
|---|---|
| **Repo** | Public by the deadline; "Judges cannot open a private one" [H §1]. Must stay public through judging (Q-014). "Each repository can be submitted only once" [H]. No new repo required, but if one is reused, separate the work with a branch or tags `pre-hackathon` / `hackathon-submission` plus a README diff link (Q-003). README written "for a machine reader as well as a human one: what the product is, the problem it solves, and how to try it as "do X - see Y" steps a judge can follow. No marketing." [H §1] |
| **Demo** | Local-only is OK with "public repo, reproducible README, X post with a video; screenshots are not enough when judges cannot open the demo" (Q-012). A hosted demo is a plus. |
| **X post** | "says the project was built at NEAR HACKATHON, tags @NEARProtocol and #NEARHackathon (optionally also @NearLegion and @NearBuilders), and has the demo video or screenshots attached." [H Start here §3]. The human writes and publishes it. [H §2] tips: lead with the user problem; "Show one complete moment"; "Explain NEAR's role concretely… Avoid a vague "powered by NEAR""; "Give people a next step." |
| **Mainnet vs testnet** | Testnet-only projects are eligible in all tracks (Q-010). NEAR Intents has no testnet: use mainnet with "tiny amounts, dry: true quotes" (Q-007). Testnet NEAR is free; mainnet costs are not reimbursed (Q-008). The prize payout account must be **mainnet** [H §What the human decides]. |
| **License** | "Any. MIT is fine… add a LICENSE file." (Q-014) |
| **Prior code** | Code from the 2026-10-19 announcement onward counts; earlier commits are baseline (Q-001). Existing products are allowed but only the in-window NEAR integration is judged, disclosed in the README (Q-002). An old project as-is is not allowed (Q-004). Libraries, templates and AI code are allowed but must be listed in the README (Q-005). |
| **Secrets** | "Keys belong in environment variables, never in the repository." [H]. [SUB] checklist: "There are no keys or secrets anywhere in the repo history" |

## 4. Submission format: the on-site form at https://nearhackathon.com/#apply (read only, never submitted)

The form fields, rendered from [HP] §06 "PROJECT SUBMISSION", match the API contract in [H §Submission API]:

| Field (form label) | Name | Constraint (verbatim) |
|---|---|---|
| Project name * | `projectName` | 2-80 characters |
| Team lead * | `leadName` | 2-80 characters |
| Email address * | `email` | "valid email, max 160 characters, at most 2 submissions per email" |
| Team size * | `size` | one of `1`, `2 - 4`, `4 - 6`, `6 - 8`, `8+` |
| Tracks * ("Choose your tracks", checkboxes) | `tracks` | "one or more of `defi`, `thesis`, `privacy`, `business`, `swarms`, `security`, `agents`, `realworld`, `games`, `nfts`, `memecoins`, `social`, `open`, each listed once" |
| NEAR wallet address * | `nearAddress` | "2-64 characters, lowercase, matching `^(([a-z\d]+[-_])*[a-z\d]+\.)*([a-z\d]+[-_])*[a-z\d]+$`". Help text: "Your own wallet or your team's. If you win, the prize is sent here." Mainnet: "a named account such as `team.near` or a 64-character implicit account… Never create or invent one on their behalf." |
| Repository link * | `projectUrl` | "http(s) URL of the public repository, max 300 characters, unique". Help text: "This is the repository judges will review. It must be public." |
| Demo post link * | `demoUrl` | "http(s) URL of the public demo post, max 300 characters". Help text: "Your public post on X with the demo video or screenshots." |
| What did you build? * | `idea` | 20–2,000 characters. Placeholder: "The problem, what you built, and how NEAR fits in." |
| Website (hidden) | `website` | **Spam trap**: "any non-empty value rejects the submission." Leave empty. |
| Consent checkbox * | `consent` | "I agree that the organizers may use these details to review our submission and contact us about this hackathon." |

- "One submission per project. No wallet connection needed." [HP]. Both links (repo and demo post) are required [HP §06 step 04].
- Mistakes are fixed at https://nearhackathon.com/request-changes. **Never resubmit**: "the same repository is rejected with 409, and a different link would count as another project" [H §4].
- [H] lists what only the human decides: project name, lead name, email, size, tracks, payout account, repo link, demo link, description, consent. "Do not guess, generate or fill in placeholders for any of them."
- [SUB] pre-submit checklist: repo public with "do X, see Y" steps; demo post live; mainnet payout account; "You've selected every track your project fits"; no secrets in history; before the deadline.

## 5. Judging

**PUBLISHED JUDGING CRITERIA AND WEIGHTS: NONE PUBLISHED.** No rubric and no weights appear anywhere on [HP], [H], or in the prompt repo (checked 2026-11-13). Do not invent weights.

What *is* published, verbatim:

- [HP] FAQ, "How will projects be judged?": "Claude Code & Codex screen every project first: they check that it runs and does what the README says. The human judges above make the decisions. **Previous NEAR hackathons evaluated technical implementation, design, impact, originality and sustainability — a good guide to prepare by.**"
- Q-017: "Screening, not deciding: reproducibility check, feature verification, structured report, preliminary score. Humans decide; low AI score alone cannot reject."
- [H §1]: "Claude Code and Codex screen every project before the human jury decides (Q-017), so write the README for a machine reader as well as a human one".
- Track-specific judging hints in the track text (see tracks.md):
  - Thesis: "Judged on the evidence, not the conviction."
  - Games: "Judged on the game loop, not the token — bonus if players never notice the chain."
  - Memecoins: "Judged on the mechanic, not the chart."
  - Social: "Don't rebuild the multisig — build what communities do with it."

**Judges** [HP §03, "MEET THE JUDGES"]:

| # | Name | Affiliation | Handle(s) |
|---|---|---|---|
| 1 | Illia Polosukhin | NEAR Protocol | @ilblackdragon |
| 2 | Eddy Lazzarin | a16z crypto | @eddylazzarin |
| 3 | Mert Mumtaz | Helius | @0xMert_ |
| 4 | Avichal Garg | Electric Capital | @avichal |
| 5 | Kain Warwick | Synthetix & Infinex | @kain |
| 6 | Haseeb Qureshi | Dragonfly | @hosseeb |
| 7 | Stepan Gershuni | cyber•Fund | @cyntro_py |
| 8 | Claude Code & Codex | Anthropic & OpenAI | @claudeai, @OpenAI |

## 6. Prizes ([H] §Prizes; [HP] agrees)

> Prize pool $250,000. One grand prize overall. 1st, 2nd and 3rd place in each of the 13 build tracks. Amounts are fixed in USD and paid in NEAR to the account given in the submission (see Q-016).

| Prize | Amount | Count | Total |
|---|---|---|---|
| Grand prize | $55,000 | 1 | $55,000 |
| 1st place | $10,000 | 13 | $130,000 |
| 2nd place | $3,000 | 13 | $39,000 |
| 3rd place | $2,000 | 13 | $26,000 |

Payout: "Single payment, no vesting, within 30 days of results." (Q-016)

## 7. Multi-track entry (kickoff question 3)

- **Entering several tracks is explicitly allowed:**
  - [HP] FAQ "Can I build something across multiple tracks?": "Yes. Select every track your project fits in the submission form. It is still one submission per project."
  - [H]: "Tracks: one or more ids from the Tracks table below, every track the project fits."
- **Being judged or awarded in each track is NOT stated.** No source says whether one project can place in more than one track, or how the grand prize interacts with track prizes. **Gap.** Only the organizers can answer, via Discord https://discord.gg/nearprotocol or Telegram https://t.me/nearbuilderschat. Asking is the user's call.
- Observed field behavior from the public build log (`GET https://nearhackathon.com/api/projects`, 2026-11-13): many entries tick many tracks, and at least one ticks all 13 ("Fatal Inflation"). See prior-art.md.

## 8. Useful links from [H] Facts

- NEAR docs https://docs.near.org/ (index: https://docs.near.org/llms.txt)
- Track prompts https://github.com/nearai/near-hackathon-prompt-examples
- DevHub videos https://www.youtube.com/channel/UCq0iWZQuXhvP8yQzDZsmWfQ
- NEAR AI credits https://cloud.near.ai and https://nearbuilders.org/dashboard
- Ecosystem resources https://nearbuilders.org/build
- Request changes https://nearhackathon.com/request-changes
- Prompt repo setup step: "Install the NEAR agent skills: npx skills add near/agent-skills" (skills: `near-ai-cloud`, `near-api-js`, `near-dapp`, `near-intents`, `near-kit`, `near-smart-contracts`). Also: "Build on testnet first. Keys go in .env, never in the repo." ([00-setup.md](https://github.com/nearai/near-hackathon-prompt-examples/blob/main/00-setup.md))
