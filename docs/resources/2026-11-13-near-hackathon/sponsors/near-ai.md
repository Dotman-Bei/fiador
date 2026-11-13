# NEAR.AI: private AI inference (Agent Economy / Privacy tracks, DEEP-lite)

Fetched 2026-11-13. Sources:
- https://docs.near.ai/llms.txt (curl; 54 KB)
- https://docs.near.ai/cloud/guides/openai-compatibility.md (curl)
- [H] Q-000 and the Facts table
- Prompt repo tracks/07-agents.md and 03-privacy.md

Hackathon listing ([H]): "NEAR.AI | Private AI | Docs https://docs.near.ai/ | https://near.ai/ | https://github.com/nearai/cloud-api".

## What it is (verbatim)

docs.near.ai/llms.txt: "Documentation for NEAR AI Cloud: private, verifiable AI inference in Trusted Execution Environments through an OpenAI-compatible API."

## Integration model

- **OpenAI-compatible endpoint:** "To use the OpenAI SDKs with NEAR AI Cloud, you simply need to override the `base_url` and provide your NEAR AI `api_key`." Base URL: **`https://cloud-api.near.ai/v1`**. A model id seen in the examples: `zai-org/GLM-5.1-FP8`. The current model list was not extracted (gap).
- Responses carry an `X-Request-Id` header.
- A "Stateless Responses API" (OpenAI Responses shape without server-side storage) exists.
- **Verification:** gateway attestation, model attestations, TLS connection binding, response signatures, image provenance (docs pages under `/cloud/verification/cloud-api/`). Example repo: https://github.com/near-examples/nearai-cloud-verification-example
- **Staking for inference:** "Stake NEAR and let the staking rewards pay for private inference on NEAR AI Cloud — your principal stays yours and stays withdrawable."
- Integrations listed: OpenCode, Cursor, Continue.

## Credits and keys (Q-000, verbatim)

"Buy with crypto or card in the NEAR AI Cloud dashboard (https://cloud.near.ai) and generate the API key there. Or claim $10 by joining NEAR Builders (https://nearbuilders.org/join): the credits are claimed in the NEAR Builders dashboard (https://nearbuilders.org/dashboard). You get a separate API key with a $10 balance. It is not applied to your cloud.near.ai account, so the credits won't appear in that dashboard."

Getting a key requires a user sign-up; the pipeline never does this. The key belongs in env var(s) only.

## Related agent tooling named by the agents track (shallow)

- NEAR MCP server: https://github.com/nearai/near-mcp (not read)
- **Agent API** (Agents on Intents), "a policy-bound wallet" per agent:
  - Docs: https://docs.agentsonintents.com/integration/agent-api/overview
  - Demo base URL "https://api.demo.agentsonintents.com", keys from https://partners.demo.agentsonintents.com/dashboard. "The demo keys are temporary and rotate after the demo period." (tracks/07-agents.md)
  - Not read in depth (gap).
- PingPay Agent Pay facilitator (x402, USDC on Base → NEAR via Intents): https://pingpay.gitbook.io/docs/pingpay-api/agent-pay-facilitator (not read)
- NEAR agent skills: `npx skills add near/agent-skills` (`near-ai-cloud`, `near-api-js`, `near-dapp`, `near-intents`, `near-kit`, `near-smart-contracts`)

## Testnet

Not applicable. This is an off-chain inference API billed in credits. Any on-chain part of an agent uses normal NEAR testnet or mainnet.
