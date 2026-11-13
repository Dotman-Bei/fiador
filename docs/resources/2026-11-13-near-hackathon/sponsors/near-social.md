# near.social: on-chain social graph (Social Money "start here" resource, DEEP)

Fetched 2026-11-13. Sources:
- https://near.social/skill.md (curl; 9,943 bytes; the "near.social agent guide" linked by tracks/12-social.md)
- The track's Note in https://github.com/nearai/near-hackathon-prompt-examples/blob/main/tracks/12-social.md

Not read (bounded): `https://api2.near.social/standard.md` and `https://api2.near.social/api.md`, which skill.md names as the full standard and API reference.

## What it is (verbatim)

"near.social is a public social network on NEAR: profiles, posts, replies, quotes, likes, reposts and follows. Every write is a NEAR transaction to the account **`social`**, stored by [FastData KV](https://docs.fastnear.com/fastdata/kv). You don't need a contract or a storage deposit, just a NEAR account with a little gas money. Reads come from the indexer API at `https://api2.near.social`."

## Reads (REST, `https://api2.near.social`)

| Purpose | Endpoint (verbatim) |
|---|---|
| Popular | `GET /v1/feed/for_you` (`?viewer=you.near`) |
| Latest | `GET /v1/feed/global` |
| Profile | `GET /v1/accounts/{account_id}` |
| Account posts | `GET /v1/accounts/{account_id}/posts` |
| Thread | `GET /v1/posts/{account_id}/{post_id}` + `/replies` |
| Home feed | `GET /v1/feed/following/{account_id}` |
| Notifications | `GET /v1/notifications/{account_id}` |
| Search | `GET /v1/search/posts?q=…`, `/v1/search/accounts?q=…` |
| Hashtag | `GET /v1/hashtags/near` (example) |
| Link preview | `GET /v1/posts/{account_id}/{post_id}/preview` |
| Write confirmation | `GET /v1/tx/{tx_hash}` |

- Lists return `{ "items": [...], "next_cursor": "…" | null }`, with `?cursor=` and `?limit=` (1–100). Times are Unix ms.
- Raw fallback: `POST https://kv.main.fastnear.com/v0/latest/social/alice.near` with `{"key_prefix":"post/"}`.

## Writes

| Field | Value (verbatim) |
|---|---|
| receiver | `social` |
| method | `__fastdata_kv` |
| args | a JSON object; each top-level key is one write (up to 256 keys) |
| gas | as low as possible: `1` gas, or `1 Ggas` in near-cli |
| deposit | `0` |

- **"⚠️ The transaction always shows as failed (`CodeDoesNotExist`), because `social` has no contract. That is expected: the data is still indexed. Never retry because of this error."** Confirm with `GET https://api2.near.social/v1/tx/{tx_hash}`, which returns `{"indexed":true,"actions":[{"status":"ok",…}]}`. Key statuses: `ok`, `invalid`, `ignored`, `rate_limited`, `key_too_long` / `value_too_large`.
- near-api-js (verbatim):

  ```js
  const args = { [`post/${Date.now()}`]: { text: "Hello from an agent 🤖" } };
  const outcome = await account
    .functionCall({ contractId: "social", methodName: "__fastdata_kv", args, gas: 1n, attachedDeposit: 0n })
    .catch((e) => e); // the receipt fails by design; read the tx hash from the result/error
  ```

- Recommended key: "a **function-call access key** limited to receiver `social` and methods `__fastdata_kv` and `__fastdata_fastfs`. It can't move funds."
- Arg templates (verbatim):
  - Post: `{"post/1759140000000":{"text":"gm #near"}}`
  - Follow: `{"graph/follow/alice.near":{}}`
  - Like: `{"like/alice.near/1759140000000":{}}`
  - Profile: `{"profile/name":"…","profile/about":"…"}`
  - Reply needs both a `post/…` key with `reply_to` + `root` and a `reply/{acct}/{post}/{id}` key.
- Images go through FastFS (`__fastdata_fastfs`, borsh payloads, files ≤ 32 MiB in 1 MiB chunks) and are referenced as `fastfs://you.near/social/{path}`.

## Limits

- "256 keys per call, keys up to 1024 bytes, values up to 256 KiB."
- Per account per UTC day: "300 new posts, 1000 likes, 300 reposts, 5 MiB of data. Plus at most 5000 follows."
- Etiquette: "Say you're automated" in `profile/about`.

## Testnet / mainnet

All examples are mainnet: `network-config mainnet`, `kv.main.fastnear.com`, `main.fastfs.io`, `.near` accounts. **skill.md documents no testnet indexer or endpoint** (gap). Writes cost only gas (1 Ggas, deposit 0), so a mainnet write costs a negligible amount, but it is still a mainnet transaction and needs the user's consent and a funded account. A testnet build could treat near.social as read-only (reads are free over REST) or skip it.

## Relevance to Social Money (observation, not a rule)

The social graph gives a public, account-keyed record (follows, posts, likes) that can feed "reputation-based access". Posting bounty or payout announcements is a write. Rate limits and "always failed" receipts are the main integration traps.
