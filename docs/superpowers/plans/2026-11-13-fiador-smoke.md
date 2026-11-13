# Fiador Smoke + Toolchain Implementation Plan

**Goal:** Prove on day 1, from this Windows machine, that a near-sdk 5.30.1 contract builds and deploys, that the real demo DAO can be created on `sputnikv2.testnet` with Fiador's bond-0, 2-of-3 policy, and that a contract holding the `desk` seat can file and alone-approve a Transfer; and freeze the shared TypeScript signatures every later plan consumes.
**Architecture:** One npm package (strict TS, ESM, tsx, vitest) plus standalone Rust crates under `contract/`. A Node cargo launcher makes host unit tests work on the Windows GNU host (MSYS2 binutils on PATH, prebuilt NASM). `src/lib/` holds browser-and-Node shared code (fetch-only RPC client, Sputnik 2.3.1 types and the policy builder); `scripts/lib/` holds near-api-js signing helpers. Two human-gated tasks end the plan (pause 1).
**Tech Stack:** Rust 1.99.0 (pinned in `rust-toolchain.toml`, target `wasm32-unknown-unknown`), near-sdk =5.30.1 (built with `--cfg near`), Node >= 22.22.2, near-api-js 7.5.3, tsx 4.23.15, typescript 5.9.3, vitest 5.1.0, vite 8.3.8 (vitest peer), @types/node 22.20.5. MSYS2 `C:\msys64\mingw64\bin` (dlltool, as, gcc) and `AWS_LC_SYS_PREBUILT_NASM=1` for host tests on Windows.
**Source spec:** docs/superpowers/specs/2026-11-13-fiador-design.md

Conventions for every task: strict TypeScript, ESM, `import type` for type-only imports (`verbatimModuleSyntax`), never `as any`, no secrets anywhere (env-var names only), paths are relative to the repo root, and every command runs from the repo root. The executor never runs git.

Execution notes for the orchestrator: the two `[HUMAN GATE]` tasks (11, 12) run in the main checkout, because they need the git-ignored `.env` and `node_modules/`. The first `cargo` call (Task 5) may install the pinned 1.99.0 toolchain and then cold-build for 2–3 minutes, so give that step a 10-minute timeout.

---

### Task 1: Workspace scaffold and the cargo launcher

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `rust-toolchain.toml`
- Create: `.cargo/config.toml`
- Create: `tools/cargo-env.ts`
- Create: `tools/cargo.ts`
- Test: `tools/cargo-env.test.ts`

**Effort:** low
**Provides:** `tools/cargo-env.ts: buildCargoEnv(input: CargoEnvInput): Record<string, string>`, `npm run cargo -- <cargo args>`, `npm run typecheck`

- [ ] **Step 1: Create the package and config files**

`package.json`:
```json
{
  "name": "fiador",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "engines": { "node": ">=22.22.2" },
  "scripts": {
    "cargo": "tsx tools/cargo.ts",
    "wasm": "tsx tools/wasm-build.ts",
    "wasm:check": "tsx tools/wasm-check.ts",
    "root": "tsx scripts/root.ts",
    "smoke": "tsx scripts/smoke.ts",
    "smoke:check": "tsx scripts/smoke-check.ts",
    "typecheck": "tsc -p tsconfig.json",
    "test": "vitest run",
    "check": "tsc -p tsconfig.json && vitest run"
  },
  "dependencies": {
    "near-api-js": "7.5.3"
  },
  "devDependencies": {
    "@types/node": "22.20.5",
    "tsx": "4.23.15",
    "typescript": "5.9.3",
    "vite": "8.3.8",
    "vitest": "5.1.0"
  }
}
```

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022", "DOM"],
    "types": ["node"],
    "strict": true,
    "noEmit": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "forceConsistentCasingInFileNames": true,
    "jsx": "react-jsx"
  },
  "include": ["src", "scripts", "tools", "web", "vitest.config.ts"]
}
```

`vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: [
      'src/**/*.test.ts',
      'scripts/**/*.test.ts',
      'tools/**/*.test.ts',
      'web/**/*.test.ts',
      'web/**/*.test.tsx',
    ],
    environment: 'node',
  },
});
```

`.gitignore`:
```
node_modules/
dist/
web/dist/
target/
.env
.env.*
!.env.example
*.log
```

`.env.example`:
```
# Copy to .env (git-ignored). Values are never committed.
FIADOR_ROOT=
FIADOR_ROOT_KEY=
FIADOR_RPC=https://rpc.testnet.fastnear.com
FIADOR_DAO_NAME=fiador
FIADOR_FAUCET_URL=https://helper.nearprotocol.com/account
# FIADOR_MINGW_BIN is read by tools/cargo.ts from the SHELL environment only (default C:\msys64\mingw64\bin).
```

`rust-toolchain.toml`:
```toml
[toolchain]
channel = "1.99.0"
targets = ["wasm32-unknown-unknown"]
profile = "minimal"
```

`.cargo/config.toml`:
```toml
# near-sdk >= 5.27 selects on-chain host functions only under `--cfg near`.
[target.wasm32-unknown-unknown]
rustflags = ["--cfg", "near", "-C", "link-arg=-s"]
```

- [ ] **Step 2: Install dependencies**

Run: `npm install`
Expected: exits 0 and creates `package-lock.json` and `node_modules/`.

- [ ] **Step 3: Write the failing test**

`tools/cargo-env.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { buildCargoEnv, DEFAULT_MINGW_BIN } from './cargo-env';

describe('buildCargoEnv', () => {
  it('leaves non-Windows environments unchanged', () => {
    const env = buildCargoEnv({ platform: 'linux', env: { PATH: '/usr/bin', HOME: '/home/u' }, pathDelimiter: ':' });
    expect(env).toEqual({ PATH: '/usr/bin', HOME: '/home/u' });
  });

  it('appends the default MSYS2 bin and sets prebuilt NASM on Windows', () => {
    const env = buildCargoEnv({ platform: 'win32', env: { Path: 'C:\\Windows' }, pathDelimiter: ';' });
    expect(env['Path']).toBe(`C:\\Windows;${DEFAULT_MINGW_BIN}`);
    expect(env['AWS_LC_SYS_PREBUILT_NASM']).toBe('1');
  });

  it('honours FIADOR_MINGW_BIN and keeps the existing PATH key casing', () => {
    const env = buildCargoEnv({
      platform: 'win32',
      env: { PATH: 'C:\\a', FIADOR_MINGW_BIN: 'D:\\mingw\\bin' },
      pathDelimiter: ';',
    });
    expect(env['PATH']).toBe('C:\\a;D:\\mingw\\bin');
    expect(env['Path']).toBeUndefined();
  });

  it('drops undefined values', () => {
    const env = buildCargoEnv({ platform: 'linux', env: { A: undefined, B: 'b' }, pathDelimiter: ':' });
    expect(env).toEqual({ B: 'b' });
  });
});
```

- [ ] **Step 4: Run to confirm it fails**

Run: `npx vitest run tools/cargo-env.test.ts`
Expected: FAIL — `Failed to resolve import "./cargo-env"` (the module does not exist yet).

- [ ] **Step 5: Minimal implementation**

`tools/cargo-env.ts`:
```ts
export interface CargoEnvInput {
  platform: string;
  env: Record<string, string | undefined>;
  pathDelimiter: string;
}

/** MSYS2's mingw64 bin holds dlltool.exe, as.exe and gcc.exe, which host unit tests need on the Windows GNU host. */
export const DEFAULT_MINGW_BIN = 'C:\\msys64\\mingw64\\bin';

/**
 * The environment for a cargo child process. On Windows it APPENDS the MSYS2 bin to PATH (so it never shadows
 * rustup's cargo or rustc) and sets AWS_LC_SYS_PREBUILT_NASM=1 because NASM is not installed. Elsewhere it is a copy.
 */
export function buildCargoEnv(input: CargoEnvInput): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(input.env)) {
    if (value !== undefined) out[key] = value;
  }
  if (input.platform !== 'win32') return out;
  const configured = out['FIADOR_MINGW_BIN'];
  const mingw = configured !== undefined && configured.length > 0 ? configured : DEFAULT_MINGW_BIN;
  const pathKey = Object.keys(out).find((k) => k.toUpperCase() === 'PATH') ?? 'Path';
  const current = out[pathKey] ?? '';
  out[pathKey] = current.length > 0 ? `${current}${input.pathDelimiter}${mingw}` : mingw;
  out['AWS_LC_SYS_PREBUILT_NASM'] = '1';
  return out;
}
```

`tools/cargo.ts`:
```ts
import { spawnSync } from 'node:child_process';
import { delimiter } from 'node:path';
import { buildCargoEnv } from './cargo-env';

const result = spawnSync('cargo', process.argv.slice(2), {
  stdio: 'inherit',
  env: buildCargoEnv({ platform: process.platform, env: process.env, pathDelimiter: delimiter }),
});
if (result.error) {
  console.error(`cargo launcher: ${result.error.message}`);
  process.exit(1);
}
process.exit(result.status ?? 1);
```

- [ ] **Step 6: Run the gate**

Run: `npx vitest run tools/cargo-env.test.ts`
Expected: PASS — `Tests  4 passed (4)`

- [ ] **Step 7: Commit (kernel-performed — no agent runs this)**
The kernel re-runs the gate, scope-checks the worktree against `Files:` (plus `package-lock.json`), and commits.
Message: `chore: scaffold the fiador workspace and cargo launcher`

---

### Task 2: wasm build and wasm check tools

**Files:**
- Create: `tools/wasm-inspect.ts`
- Create: `tools/wasm-check.ts`
- Create: `tools/wasm-build.ts`
- Test: `tools/wasm-inspect.test.ts`

**Depends on:** Task 1
**Effort:** low
**Requires:** `tools/cargo-env.ts: buildCargoEnv(input: CargoEnvInput): Record<string, string>`
**Provides:** `tools/wasm-inspect.ts: checkWasm(bytes: Uint8Array, required: readonly string[]): WasmCheckResult`, `npm run wasm -- <smoke|desk>`, `npm run wasm:check -- <file.wasm> <export1,export2,...>`

Context: `buildCargoEnv` (Task 1, `tools/cargo-env.ts`) has the signature
`export function buildCargoEnv(input: { platform: string; env: Record<string, string | undefined>; pathDelimiter: string }): Record<string, string>`.

- [ ] **Step 1: Write the failing test**

`tools/wasm-inspect.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { checkWasm } from './wasm-inspect';

// A hand-assembled module: imports env.foo, exports function "bar".
const WITH_ENV = Uint8Array.from([
  0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00,
  0x01, 0x04, 0x01, 0x60, 0x00, 0x00,
  0x02, 0x0b, 0x01, 0x03, 0x65, 0x6e, 0x76, 0x03, 0x66, 0x6f, 0x6f, 0x00, 0x00,
  0x03, 0x02, 0x01, 0x00,
  0x07, 0x07, 0x01, 0x03, 0x62, 0x61, 0x72, 0x00, 0x01,
  0x0a, 0x04, 0x01, 0x02, 0x00, 0x0b,
]);
// The same export with no imports at all (what a build without `--cfg near` looks like to this check).
const NO_ENV = Uint8Array.from([
  0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00,
  0x01, 0x04, 0x01, 0x60, 0x00, 0x00,
  0x03, 0x02, 0x01, 0x00,
  0x07, 0x07, 0x01, 0x03, 0x62, 0x61, 0x72, 0x00, 0x00,
  0x0a, 0x04, 0x01, 0x02, 0x00, 0x0b,
]);

describe('checkWasm', () => {
  it('passes when every required export exists and the module imports from env', () => {
    const r = checkWasm(WITH_ENV, ['bar']);
    expect(r).toEqual({ ok: true, size: WITH_ENV.byteLength, exports: ['bar'], missing: [], usesNearHost: true });
  });

  it('reports missing exports', () => {
    const r = checkWasm(WITH_ENV, ['bar', 'baz']);
    expect(r.ok).toBe(false);
    expect(r.missing).toEqual(['baz']);
  });

  it('fails a module that never calls NEAR host functions', () => {
    const r = checkWasm(NO_ENV, ['bar']);
    expect(r.ok).toBe(false);
    expect(r.usesNearHost).toBe(false);
  });

  it('throws on bytes that are not wasm', () => {
    expect(() => checkWasm(Uint8Array.from([1, 2, 3]), [])).toThrow();
  });
});
```

- [ ] **Step 2: Run to confirm it fails**

Run: `npx vitest run tools/wasm-inspect.test.ts`
Expected: FAIL — `Failed to resolve import "./wasm-inspect"`.

- [ ] **Step 3: Minimal implementation**

`tools/wasm-inspect.ts`:
```ts
export interface WasmCheckResult {
  ok: boolean;
  size: number;
  exports: string[];
  missing: string[];
  usesNearHost: boolean;
}

/** Compiles the module (which validates it), lists function exports, and confirms it imports NEAR's `env` host module. */
export function checkWasm(bytes: Uint8Array, required: readonly string[]): WasmCheckResult {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const module = new WebAssembly.Module(copy);
  const exports = WebAssembly.Module.exports(module)
    .filter((e) => e.kind === 'function')
    .map((e) => e.name);
  const usesNearHost = WebAssembly.Module.imports(module).some((i) => i.module === 'env');
  const missing = required.filter((name) => !exports.includes(name));
  return { ok: missing.length === 0 && usesNearHost, size: bytes.byteLength, exports, missing, usesNearHost };
}
```

`tools/wasm-check.ts`:
```ts
import { readFileSync } from 'node:fs';
import { checkWasm } from './wasm-inspect';

const [file, requiredCsv] = process.argv.slice(2);
if (file === undefined || requiredCsv === undefined) {
  console.error('usage: npm run wasm:check -- <file.wasm> <export1,export2,...>');
  process.exit(2);
}
const required = requiredCsv
  .split(',')
  .map((s) => s.trim())
  .filter((s) => s.length > 0);
const result = checkWasm(new Uint8Array(readFileSync(file)), required);
if (result.ok) {
  console.log(`WASM CHECK PASS ${file} ${result.size} bytes, ${result.exports.length} exports`);
  process.exit(0);
}
console.log(`WASM CHECK FAIL ${file}: missing=[${result.missing.join(',')}] usesNearHost=${String(result.usesNearHost)}`);
process.exit(1);
```

`tools/wasm-build.ts`:
```ts
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, statSync } from 'node:fs';
import { delimiter, join } from 'node:path';
import { buildCargoEnv } from './cargo-env';

const CRATES: Record<string, string> = { smoke: 'fiador_smoke', desk: 'fiador_desk' };

const name = process.argv[2];
const crate = name === undefined ? undefined : CRATES[name];
if (name === undefined || crate === undefined) {
  console.error('usage: npm run wasm -- <smoke|desk>');
  process.exit(2);
}
const manifest = join('contract', name, 'Cargo.toml');
const build = spawnSync(
  'cargo',
  ['build', '--release', '--target', 'wasm32-unknown-unknown', '--manifest-path', manifest],
  { stdio: 'inherit', env: buildCargoEnv({ platform: process.platform, env: process.env, pathDelimiter: delimiter }) },
);
if (build.error) {
  console.error(`wasm build: ${build.error.message}`);
  process.exit(1);
}
if (build.status !== 0) process.exit(build.status ?? 1);
const built = join('contract', name, 'target', 'wasm32-unknown-unknown', 'release', `${crate}.wasm`);
mkdirSync(join('contract', 'res'), { recursive: true });
const out = join('contract', 'res', `${crate}.wasm`);
copyFileSync(built, out);
console.log(`WASM BUILT ${out} ${statSync(out).size} bytes`);
```

- [ ] **Step 4: Run the gate**

Run: `npx vitest run tools/wasm-inspect.test.ts`
Expected: PASS — `Tests  4 passed (4)`

- [ ] **Step 5: Commit (kernel-performed — no agent runs this)**
Message: `feat(tools): wasm build and wasm check`

---

### Task 3: Encoding, NEAR units and the RPC view client

**Files:**
- Create: `src/lib/encoding.ts`
- Create: `src/lib/units.ts`
- Create: `src/lib/rpc.ts`
- Test: `src/lib/encoding.test.ts`
- Test: `src/lib/units.test.ts`
- Test: `src/lib/rpc.test.ts`

**Depends on:** Task 1
**Effort:** medium
**Provides:** `src/lib/encoding.ts: utf8ToBase64(text: string): string`, `src/lib/encoding.ts: base64ToUtf8(b64: string): string`, `src/lib/encoding.ts: jsonToBase64(value: unknown): string`, `src/lib/encoding.ts: bytesToUtf8(bytes: readonly number[]): string`, `src/lib/units.ts: YOCTO_PER_NEAR, TGAS, GAS_300_TGAS (bigint)`, `src/lib/units.ts: parseNear(text: string): bigint`, `src/lib/units.ts: formatNear(yocto: bigint | string, maxDecimals?: number): string`, `src/lib/rpc.ts: DEFAULT_TESTNET_RPC = 'https://rpc.testnet.fastnear.com'`, `src/lib/rpc.ts: class RpcError extends Error`, `src/lib/rpc.ts: interface AccountInfo { amount: string; locked: string; storage_usage: number; code_hash: string }`, `src/lib/rpc.ts: class RpcClient { constructor(url?: string, fetchImpl?: FetchLike); view<T>(accountId: string, methodName: string, args?: Record<string, unknown>): Promise<T>; viewAccount(accountId: string): Promise<AccountInfo | null>; accessKeyCount(accountId: string): Promise<number>; status(): Promise<{ protocolVersion: number; chainId: string }> }`

- [ ] **Step 1: Write the failing tests**

`src/lib/encoding.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { base64ToUtf8, bytesToUtf8, jsonToBase64, utf8ToBase64 } from './encoding';

describe('encoding', () => {
  it('round-trips UTF-8 through base64', () => {
    expect(base64ToUtf8(utf8ToBase64('fiador ✓'))).toBe('fiador ✓');
  });
  it('encodes JSON args the way NEAR RPC expects', () => {
    expect(jsonToBase64({ id: 3 })).toBe('eyJpZCI6M30=');
  });
  it('decodes RPC result byte arrays', () => {
    expect(bytesToUtf8([34, 50, 46, 51, 46, 49, 34])).toBe('"2.3.1"');
  });
});
```

`src/lib/units.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { formatNear, GAS_300_TGAS, parseNear, TGAS, YOCTO_PER_NEAR } from './units';

describe('units', () => {
  it('parses whole and fractional NEAR into yocto', () => {
    expect(parseNear('6')).toBe(6n * YOCTO_PER_NEAR);
    expect(parseNear('0.01')).toBe(10n ** 22n);
    expect(parseNear(' 1.5 ')).toBe(15n * 10n ** 23n);
  });
  it('rejects malformed amounts and more than 24 decimals', () => {
    expect(() => parseNear('abc')).toThrow('invalid NEAR amount');
    expect(() => parseNear('1.0000000000000000000000001')).toThrow('invalid NEAR amount');
  });
  it('formats yocto as NEAR, truncating to the requested decimals', () => {
    expect(formatNear(6n * YOCTO_PER_NEAR)).toBe('6');
    expect(formatNear('10000000000000000000000')).toBe('0.01');
    expect(formatNear(1234567n * 10n ** 18n, 2)).toBe('1.23');
  });
  it('defines gas units', () => {
    expect(TGAS).toBe(10n ** 12n);
    expect(GAS_300_TGAS).toBe(300n * 10n ** 12n);
  });
});
```

`src/lib/rpc.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { RpcClient, RpcError } from './rpc';
import type { FetchLike } from './rpc';

function fakeFetch(responses: unknown[], calls: unknown[], ok = true): FetchLike {
  let i = 0;
  return async (_url, init) => {
    calls.push(JSON.parse(init.body) as unknown);
    const body = responses[i];
    i += 1;
    return { ok, status: ok ? 200 : 503, json: async () => body };
  };
}

const bytes = (text: string): number[] => Array.from(new TextEncoder().encode(text));

describe('RpcClient', () => {
  it('calls a view function with base64 args and decodes the JSON result', async () => {
    const calls: unknown[] = [];
    const rpc = new RpcClient('https://rpc.example', fakeFetch([{ jsonrpc: '2.0', id: 'x', result: { result: bytes('"2.3.1"'), logs: [] } }], calls));
    await expect(rpc.view<string>('dao.testnet', 'get_proposal', { id: 3 })).resolves.toBe('2.3.1');
    expect(calls[0]).toMatchObject({
      method: 'query',
      params: { request_type: 'call_function', finality: 'final', account_id: 'dao.testnet', method_name: 'get_proposal', args_base64: 'eyJpZCI6M30=' },
    });
  });

  it('turns a contract error string into an RpcError', async () => {
    const rpc = new RpcClient('https://rpc.example', fakeFetch([{ result: { error: 'wasm execution failed with error: ERR_NO_PROPOSAL', logs: [] } }], []));
    await expect(rpc.view('dao.testnet', 'get_proposal', { id: 99 })).rejects.toThrow(RpcError);
  });

  it('returns null for an unknown account', async () => {
    const rpc = new RpcClient('https://rpc.example', fakeFetch([{ error: { name: 'HANDLER_ERROR', cause: { name: 'UNKNOWN_ACCOUNT', info: {} } } }], []));
    await expect(rpc.viewAccount('nobody.testnet')).resolves.toBeNull();
  });

  it('reads an existing account', async () => {
    const rpc = new RpcClient('https://rpc.example', fakeFetch([{ result: { amount: '5', locked: '0', storage_usage: 182, code_hash: '11111111111111111111111111111111' } }], []));
    await expect(rpc.viewAccount('a.testnet')).resolves.toEqual({ amount: '5', locked: '0', storage_usage: 182, code_hash: '11111111111111111111111111111111' });
  });

  it('counts access keys', async () => {
    const rpc = new RpcClient('https://rpc.example', fakeFetch([{ result: { keys: [{ public_key: 'ed25519:a' }, { public_key: 'ed25519:b' }] } }], []));
    await expect(rpc.accessKeyCount('a.testnet')).resolves.toBe(2);
  });

  it('reads node status', async () => {
    const rpc = new RpcClient('https://rpc.example', fakeFetch([{ result: { protocol_version: 88, chain_id: 'testnet' } }], []));
    await expect(rpc.status()).resolves.toEqual({ protocolVersion: 88, chainId: 'testnet' });
  });

  it('throws on an HTTP failure', async () => {
    const rpc = new RpcClient('https://rpc.example', fakeFetch([{}], [], false));
    await expect(rpc.status()).rejects.toThrow('RPC HTTP 503');
  });
});
```

- [ ] **Step 2: Run to confirm they fail**

Run: `npx vitest run src/lib/encoding.test.ts src/lib/units.test.ts src/lib/rpc.test.ts`
Expected: FAIL — `Failed to resolve import "./encoding"` (and the same for `./units`, `./rpc`).

- [ ] **Step 3: Minimal implementation**

`src/lib/encoding.ts`:
```ts
export function utf8ToBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

export function base64ToUtf8(b64: string): string {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

export function jsonToBase64(value: unknown): string {
  return utf8ToBase64(JSON.stringify(value));
}

export function bytesToUtf8(bytes: readonly number[]): string {
  return new TextDecoder().decode(Uint8Array.from(bytes));
}
```

`src/lib/units.ts`:
```ts
export const YOCTO_PER_NEAR = 10n ** 24n;
export const TGAS = 10n ** 12n;
export const GAS_300_TGAS = 300n * TGAS;

export function parseNear(text: string): bigint {
  const trimmed = text.trim();
  if (!/^\d+(\.\d{1,24})?$/.test(trimmed)) throw new Error(`invalid NEAR amount: ${text}`);
  const [whole, frac] = trimmed.split('.');
  return BigInt(whole ?? '0') * YOCTO_PER_NEAR + BigInt((frac ?? '').padEnd(24, '0'));
}

export function formatNear(yocto: bigint | string, maxDecimals = 4): string {
  const value = typeof yocto === 'bigint' ? yocto : BigInt(yocto);
  const negative = value < 0n;
  const abs = negative ? -value : value;
  const whole = abs / YOCTO_PER_NEAR;
  const frac = (abs % YOCTO_PER_NEAR).toString().padStart(24, '0').slice(0, maxDecimals).replace(/0+$/, '');
  return `${negative ? '-' : ''}${whole.toString()}${frac.length > 0 ? `.${frac}` : ''}`;
}
```

`src/lib/rpc.ts`:
```ts
import { bytesToUtf8, jsonToBase64 } from './encoding';

export const DEFAULT_TESTNET_RPC = 'https://rpc.testnet.fastnear.com';

export class RpcError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RpcError';
  }
}

export interface AccountInfo {
  amount: string;
  locked: string;
  storage_usage: number;
  code_hash: string;
}

export type FetchLike = (
  url: string,
  init: { method: string; headers: Record<string, string>; body: string },
) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Read-only NEAR JSON-RPC client. Uses only `fetch`, so it runs in the browser and in Node 22. */
export class RpcClient {
  readonly url: string;
  private readonly fetchImpl: FetchLike;
  private nextId = 0;

  constructor(url: string = DEFAULT_TESTNET_RPC, fetchImpl?: FetchLike) {
    this.url = url;
    this.fetchImpl = fetchImpl ?? ((u, init) => fetch(u, init));
  }

  async request(method: string, params: unknown): Promise<unknown> {
    this.nextId += 1;
    const res = await this.fetchImpl(this.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: `fiador-${this.nextId}`, method, params }),
    });
    if (!res.ok) throw new RpcError(`RPC HTTP ${res.status} for ${method}`);
    const body = await res.json();
    if (!isRecord(body)) throw new RpcError(`RPC returned a non-object for ${method}`);
    const error = body['error'];
    if (error !== undefined && error !== null) throw new RpcError(`RPC error for ${method}: ${JSON.stringify(error)}`);
    return body['result'];
  }

  async view<T>(accountId: string, methodName: string, args: Record<string, unknown> = {}): Promise<T> {
    const result = await this.request('query', {
      request_type: 'call_function',
      finality: 'final',
      account_id: accountId,
      method_name: methodName,
      args_base64: jsonToBase64(args),
    });
    if (!isRecord(result)) throw new RpcError(`view ${accountId}.${methodName}: empty result`);
    const error = result['error'];
    if (typeof error === 'string') throw new RpcError(`view ${accountId}.${methodName}: ${error}`);
    const raw = result['result'];
    if (!Array.isArray(raw) || !raw.every((n): n is number => typeof n === 'number')) {
      throw new RpcError(`view ${accountId}.${methodName}: no result bytes`);
    }
    const text = bytesToUtf8(raw);
    return (text.length === 0 ? null : JSON.parse(text)) as T;
  }

  async viewAccount(accountId: string): Promise<AccountInfo | null> {
    let result: unknown;
    try {
      result = await this.request('query', { request_type: 'view_account', finality: 'final', account_id: accountId });
    } catch (err) {
      if (err instanceof RpcError && err.message.includes('UNKNOWN_ACCOUNT')) return null;
      throw err;
    }
    if (!isRecord(result)) throw new RpcError(`view_account ${accountId}: unexpected shape`);
    const amount = result['amount'];
    const locked = result['locked'];
    const storageUsage = result['storage_usage'];
    const codeHash = result['code_hash'];
    if (typeof amount !== 'string' || typeof locked !== 'string' || typeof storageUsage !== 'number' || typeof codeHash !== 'string') {
      throw new RpcError(`view_account ${accountId}: unexpected shape`);
    }
    return { amount, locked, storage_usage: storageUsage, code_hash: codeHash };
  }

  async accessKeyCount(accountId: string): Promise<number> {
    const result = await this.request('query', { request_type: 'view_access_key_list', finality: 'final', account_id: accountId });
    if (!isRecord(result)) throw new RpcError(`view_access_key_list ${accountId}: unexpected shape`);
    const keys = result['keys'];
    if (!Array.isArray(keys)) throw new RpcError(`view_access_key_list ${accountId}: unexpected shape`);
    return keys.length;
  }

  async status(): Promise<{ protocolVersion: number; chainId: string }> {
    const result = await this.request('status', []);
    if (!isRecord(result)) throw new RpcError('status: unexpected shape');
    const protocolVersion = result['protocol_version'];
    const chainId = result['chain_id'];
    if (typeof protocolVersion !== 'number' || typeof chainId !== 'string') throw new RpcError('status: unexpected shape');
    return { protocolVersion, chainId };
  }
}
```

- [ ] **Step 4: Run the gate**

Run: `npx vitest run src/lib/encoding.test.ts src/lib/units.test.ts src/lib/rpc.test.ts`
Expected: PASS — `Test Files  3 passed (3)` and `Tests  14 passed (14)`

- [ ] **Step 5: Commit (kernel-performed — no agent runs this)**
Message: `feat(lib): encoding, NEAR units and the RPC view client`

---

### Task 4: Sputnik 2.3.1 types and the Fiador policy builder

**Files:**
- Create: `src/lib/sputnik.ts`
- Create: `src/lib/fixtures/sputnik-2.3.1.ts`
- Test: `src/lib/sputnik.test.ts`

**Depends on:** Task 3
**Effort:** high
**Model tier:** top
**Requires:** `src/lib/encoding.ts: jsonToBase64(value: unknown): string`, `src/lib/encoding.ts: base64ToUtf8(b64: string): string`
**Provides:** `src/lib/sputnik.ts: FACTORY_ID = 'sputnikv2.testnet', COUNCIL_ROLE = 'council', DESK_ROLE = 'desk', DESK_PERMISSIONS`, `src/lib/sputnik.ts: types Policy, RolePermission, VotePolicy, RoleKind, ProposalKindInput, TransferKind, FunctionCallKind, FunctionCallSpec, AddMemberKind, RemoveMemberKind, FactoryInfoUpdateKind, ProposalOutput, ProposalStatus, VoteAction`, `src/lib/sputnik.ts: daoAccountId(name: string): string`, `src/lib/sputnik.ts: buildFiadorPolicy(input: { council: readonly string[]; deskSeat: readonly string[] }): Policy`, `src/lib/sputnik.ts: transferKind(receiverId: string, amountYocto: bigint): TransferKind`, `src/lib/sputnik.ts: functionCallKind(receiverId: string, calls: readonly FunctionCallSpec[]): FunctionCallKind`, `src/lib/sputnik.ts: addMemberKind(memberId: string, role: string): AddMemberKind`, `src/lib/sputnik.ts: removeMemberKind(memberId: string, role: string): RemoveMemberKind`, `src/lib/sputnik.ts: factoryInfoUpdateKind(autoUpdate: boolean): FactoryInfoUpdateKind`, `src/lib/sputnik.ts: addProposalArgs(description: string, kind: ProposalKindInput): { proposal: { description: string; kind: ProposalKindInput } }`, `src/lib/sputnik.ts: actProposalArgs(id: number, action: VoteAction, kind: unknown): { id: number; action: VoteAction; proposal: unknown }`, `src/lib/sputnik.ts: createDaoArgs(input: { name: string; purpose: string; policy: Policy }): { name: string; args: string }`, `src/lib/sputnik.ts: parseProposal(value: unknown): ProposalOutput`, `src/lib/sputnik.ts: isTransferKind(kind: unknown): kind is TransferKind`, `src/lib/sputnik.ts: roleMembers(policy: Policy, roleName: string): string[] | null`, `src/lib/sputnik.ts: canonicalJson(value: unknown): string`, `src/lib/sputnik.ts: policiesMatch(a: Policy, b: Policy): boolean`, `src/lib/fixtures/sputnik-2.3.1.ts: LIVE_TRANSFER_PROPOSAL, LIVE_FACTORY_INFO_PROPOSAL, LIVE_POLICY`

Context: from Task 3, `src/lib/encoding.ts` exports `export function jsonToBase64(value: unknown): string` and
`export function base64ToUtf8(b64: string): string`. JSON shapes below are copied from the live 2.3.1 testnet
contract (spec §2), not from Sputnik `main`.

- [ ] **Step 1: Create the live fixtures**

`src/lib/fixtures/sputnik-2.3.1.ts`:
```ts
import type { Policy, ProposalOutput } from '../sputnik';

/** e2e-team-2ece-4zbi7v.sputnikv2.testnet proposal 0 (version 2.3.1), read 2026-11-13. */
export const LIVE_TRANSFER_PROPOSAL: ProposalOutput = {
  id: 0,
  proposer: 'bot.commons-spike-mw75h7o0.testnet',
  description: 'pizza for demo night (asked by @alice2ece in Telegram)',
  kind: {
    Transfer: {
      token_id: '',
      receiver_id: 'bob2ece.commons-spike-mw75h7o0.testnet',
      amount: '100000000000000000000000',
      msg: null,
    },
  },
  status: 'Approved',
  vote_counts: { council: [2, 0, 0] },
  votes: {
    'alice2ece.commons-spike-mw75h7o0.testnet': 'Approve',
    'bob2ece.commons-spike-mw75h7o0.testnet': 'Approve',
  },
  submission_time: '1794515258987148509',
};

/** harvestpool-community-garden.sputnikv2.testnet proposal 0 (version 2.3.1), read 2026-11-13. */
export const LIVE_FACTORY_INFO_PROPOSAL: ProposalOutput = {
  id: 0,
  proposer: 'dalamaa.testnet',
  description: 'Disable factory auto-updates before Community Garden contributions',
  kind: { FactoryInfoUpdate: { factory_info: { factory_id: 'sputnikv2.testnet', auto_update: false } } },
  status: 'Approved',
  vote_counts: { community: [2, 0, 0] },
  votes: { 'dalamaa.testnet': 'Approve', 'harvestpool-member-a-2026.testnet': 'Approve' },
  submission_time: '1794553638645897901',
};

/** harvestpool-community-garden.sputnikv2.testnet get_policy (version 2.3.1), read 2026-11-13. */
export const LIVE_POLICY: Policy = {
  roles: [
    { name: 'all', kind: 'Everyone', permissions: [], vote_policy: {} },
    {
      name: 'community',
      kind: { Group: ['harvestpool-member-a-2026.testnet', 'harvestpool-farmer-2026.testnet', 'dalamaa.testnet'] },
      permissions: [
        'factory_info_update:AddProposal',
        'transfer:VoteRemove',
        'factory_info_update:VoteReject',
        'factory_info_update:VoteApprove',
        'factory_info_update:VoteRemove',
        'transfer:AddProposal',
        'transfer:Finalize',
        'transfer:VoteApprove',
        'factory_info_update:Finalize',
        'transfer:VoteReject',
      ],
      vote_policy: {},
    },
  ],
  default_vote_policy: { weight_kind: 'RoleWeight', quorum: '0', threshold: [1, 2] },
  proposal_bond: '100000000000000000000000',
  proposal_period: '604800000000000',
  bounty_bond: '1000000000000000000000000',
  bounty_forgiveness_period: '86400000000000',
};
```

- [ ] **Step 2: Write the failing test**

`src/lib/sputnik.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { base64ToUtf8 } from './encoding';
import {
  actProposalArgs,
  addMemberKind,
  addProposalArgs,
  buildFiadorPolicy,
  canonicalJson,
  createDaoArgs,
  daoAccountId,
  DESK_PERMISSIONS,
  factoryInfoUpdateKind,
  functionCallKind,
  isTransferKind,
  parseProposal,
  policiesMatch,
  removeMemberKind,
  roleMembers,
  transferKind,
} from './sputnik';
import { LIVE_FACTORY_INFO_PROPOSAL, LIVE_POLICY, LIVE_TRANSFER_PROPOSAL } from './fixtures/sputnik-2.3.1';

const council = ['council-1.root.testnet', 'council-2.root.testnet', 'council-3.root.testnet'];

describe('buildFiadorPolicy', () => {
  it('builds the spec §5 policy exactly', () => {
    expect(buildFiadorPolicy({ council, deskSeat: ['smoke.root.testnet'] })).toEqual({
      roles: [
        { name: 'council', kind: { Group: council }, permissions: ['*:*'], vote_policy: {} },
        {
          name: 'desk',
          kind: { Group: ['smoke.root.testnet'] },
          permissions: ['transfer:AddProposal', 'transfer:VoteApprove'],
          vote_policy: { transfer: { weight_kind: 'RoleWeight', quorum: '0', threshold: '1' } },
        },
      ],
      default_vote_policy: { weight_kind: 'RoleWeight', quorum: '2', threshold: '2' },
      proposal_bond: '0',
      proposal_period: '604800000000000',
      bounty_bond: '1000000000000000000000000',
      bounty_forgiveness_period: '86400000000000',
    });
  });
  it('gives the desk only the two transfer permissions', () => {
    expect(DESK_PERMISSIONS).toEqual(['transfer:AddProposal', 'transfer:VoteApprove']);
  });
  it('reads role members', () => {
    const policy = buildFiadorPolicy({ council, deskSeat: ['desk.root.testnet'] });
    expect(roleMembers(policy, 'desk')).toEqual(['desk.root.testnet']);
    expect(roleMembers(policy, 'missing')).toBeNull();
    expect(roleMembers(LIVE_POLICY, 'all')).toBeNull();
  });
});

describe('policiesMatch / canonicalJson', () => {
  it('ignores ordering of keys, roles, permissions and group members', () => {
    const shuffled = {
      ...LIVE_POLICY,
      roles: [...LIVE_POLICY.roles].reverse().map((r) => ({
        ...r,
        permissions: [...r.permissions].reverse(),
        kind: typeof r.kind === 'object' && 'Group' in r.kind ? { Group: [...r.kind.Group].reverse() } : r.kind,
      })),
    };
    expect(policiesMatch(LIVE_POLICY, shuffled)).toBe(true);
    expect(canonicalJson({ b: 1, a: [2, { d: 1, c: 2 }] })).toBe('{"a":[2,{"c":2,"d":1}],"b":1}');
  });
  it('detects a different bond or a different seat', () => {
    expect(policiesMatch(LIVE_POLICY, { ...LIVE_POLICY, proposal_bond: '0' })).toBe(false);
    const a = buildFiadorPolicy({ council, deskSeat: ['smoke.root.testnet'] });
    const b = buildFiadorPolicy({ council, deskSeat: ['desk.root.testnet'] });
    expect(policiesMatch(a, b)).toBe(false);
  });
});

describe('proposal kinds and args', () => {
  it('builds a NEAR Transfer kind without msg (valid on 2.3.1 and main)', () => {
    expect(transferKind('bob.testnet', 10n ** 24n)).toEqual({
      Transfer: { token_id: '', receiver_id: 'bob.testnet', amount: '1000000000000000000000000' },
    });
  });
  it('recognises live Transfer kinds, including msg: null', () => {
    expect(isTransferKind(LIVE_TRANSFER_PROPOSAL.kind)).toBe(true);
    expect(isTransferKind(LIVE_FACTORY_INFO_PROPOSAL.kind)).toBe(false);
    expect(isTransferKind('Vote')).toBe(false);
  });
  it('builds the verified FactoryInfoUpdate shape', () => {
    expect(factoryInfoUpdateKind(false)).toEqual(LIVE_FACTORY_INFO_PROPOSAL.kind);
  });
  it('builds role membership kinds', () => {
    expect(addMemberKind('desk.root.testnet', 'desk')).toEqual({ AddMemberToRole: { member_id: 'desk.root.testnet', role: 'desk' } });
    expect(removeMemberKind('smoke.root.testnet', 'desk')).toEqual({ RemoveMemberFromRole: { member_id: 'smoke.root.testnet', role: 'desk' } });
  });
  it('builds FunctionCall kinds with base64 JSON args and string deposit/gas', () => {
    const kind = functionCallKind('desk.root.testnet', [
      { methodName: 'admit_member', args: { account_id: 'ada.root.testnet' }, depositYocto: 0n, gas: 15n * 10n ** 12n },
    ]);
    const action = kind.FunctionCall.actions[0];
    expect(kind.FunctionCall.receiver_id).toBe('desk.root.testnet');
    expect(action?.method_name).toBe('admit_member');
    expect(action?.deposit).toBe('0');
    expect(action?.gas).toBe('15000000000000');
    expect(JSON.parse(base64ToUtf8(action?.args ?? ''))).toEqual({ account_id: 'ada.root.testnet' });
  });
  it('wraps add_proposal and echoes the kind in act_proposal', () => {
    expect(addProposalArgs('d', 'Vote')).toEqual({ proposal: { description: 'd', kind: 'Vote' } });
    expect(actProposalArgs(7, 'VoteApprove', LIVE_TRANSFER_PROPOSAL.kind)).toEqual({
      id: 7,
      action: 'VoteApprove',
      proposal: LIVE_TRANSFER_PROPOSAL.kind,
    });
  });
  it('encodes factory create args as base64 of { config, policy }', () => {
    const policy = buildFiadorPolicy({ council, deskSeat: ['smoke.root.testnet'] });
    const out = createDaoArgs({ name: 'fiador', purpose: 'p', policy });
    expect(out.name).toBe('fiador');
    expect(JSON.parse(base64ToUtf8(out.args))).toEqual({ config: { name: 'fiador', purpose: 'p', metadata: '' }, policy });
    expect(daoAccountId('fiador')).toBe('fiador.sputnikv2.testnet');
  });
});

describe('parseProposal', () => {
  it('accepts the live 2.3.1 shape', () => {
    expect(parseProposal(JSON.parse(JSON.stringify(LIVE_TRANSFER_PROPOSAL)))).toEqual(LIVE_TRANSFER_PROPOSAL);
  });
  it('rejects a proposal without a known status', () => {
    expect(() => parseProposal({ id: 1, kind: 'Vote', status: 'Weird' })).toThrow('proposal: bad status');
    expect(() => parseProposal('nope')).toThrow('proposal: not an object');
  });
});
```

- [ ] **Step 3: Run to confirm it fails**

Run: `npx vitest run src/lib/sputnik.test.ts`
Expected: FAIL — `Failed to resolve import "./sputnik"`.

- [ ] **Step 4: Minimal implementation**

`src/lib/sputnik.ts`:
```ts
import { jsonToBase64 } from './encoding';

export const FACTORY_ID = 'sputnikv2.testnet';
export const COUNCIL_ROLE = 'council';
export const DESK_ROLE = 'desk';
export const DESK_PERMISSIONS = ['transfer:AddProposal', 'transfer:VoteApprove'] as const;

export type WeightOrRatio = string | [number, number];
export interface VotePolicy {
  weight_kind: 'RoleWeight' | 'TokenWeight';
  quorum: string;
  threshold: WeightOrRatio;
}
export type RoleKind = 'Everyone' | { Group: string[] } | { Member: string };
export interface RolePermission {
  name: string;
  kind: RoleKind;
  permissions: string[];
  vote_policy: Record<string, VotePolicy>;
}
export interface Policy {
  roles: RolePermission[];
  default_vote_policy: VotePolicy;
  proposal_bond: string;
  proposal_period: string;
  bounty_bond: string;
  bounty_forgiveness_period: string;
}

export type TransferKind = { Transfer: { token_id: string; receiver_id: string; amount: string; msg?: string | null } };
export type FunctionCallAction = { method_name: string; args: string; deposit: string; gas: string };
export type FunctionCallKind = { FunctionCall: { receiver_id: string; actions: FunctionCallAction[] } };
export type AddMemberKind = { AddMemberToRole: { member_id: string; role: string } };
export type RemoveMemberKind = { RemoveMemberFromRole: { member_id: string; role: string } };
export type FactoryInfoUpdateKind = { FactoryInfoUpdate: { factory_info: { factory_id: string; auto_update: boolean } } };
export type ProposalKindInput = TransferKind | FunctionCallKind | AddMemberKind | RemoveMemberKind | FactoryInfoUpdateKind | 'Vote';
export interface FunctionCallSpec {
  methodName: string;
  args: Record<string, unknown>;
  depositYocto: bigint;
  gas: bigint;
}

export type ProposalStatus = 'InProgress' | 'Approved' | 'Rejected' | 'Removed' | 'Expired' | 'Moved' | 'Failed';
export const PROPOSAL_STATUSES: readonly ProposalStatus[] = ['InProgress', 'Approved', 'Rejected', 'Removed', 'Expired', 'Moved', 'Failed'];
export type VoteAction = 'VoteApprove' | 'VoteReject' | 'VoteRemove' | 'Finalize' | 'RemoveProposal';

export interface ProposalOutput {
  id: number;
  proposer: string;
  description: string;
  kind: unknown;
  status: ProposalStatus;
  vote_counts: Record<string, [number, number, number]>;
  votes: Record<string, string>;
  submission_time: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function daoAccountId(name: string): string {
  return `${name}.${FACTORY_ID}`;
}

/** Spec §5: council 2-of-3 for every kind; the desk seat may only add and approve transfers, alone. Bond 0. */
export function buildFiadorPolicy(input: { council: readonly string[]; deskSeat: readonly string[] }): Policy {
  return {
    roles: [
      { name: COUNCIL_ROLE, kind: { Group: [...input.council] }, permissions: ['*:*'], vote_policy: {} },
      {
        name: DESK_ROLE,
        kind: { Group: [...input.deskSeat] },
        permissions: [...DESK_PERMISSIONS],
        vote_policy: { transfer: { weight_kind: 'RoleWeight', quorum: '0', threshold: '1' } },
      },
    ],
    default_vote_policy: { weight_kind: 'RoleWeight', quorum: '2', threshold: '2' },
    proposal_bond: '0',
    proposal_period: '604800000000000',
    bounty_bond: '1000000000000000000000000',
    bounty_forgiveness_period: '86400000000000',
  };
}

export function transferKind(receiverId: string, amountYocto: bigint): TransferKind {
  return { Transfer: { token_id: '', receiver_id: receiverId, amount: amountYocto.toString() } };
}

export function functionCallKind(receiverId: string, calls: readonly FunctionCallSpec[]): FunctionCallKind {
  return {
    FunctionCall: {
      receiver_id: receiverId,
      actions: calls.map((c) => ({
        method_name: c.methodName,
        args: jsonToBase64(c.args),
        deposit: c.depositYocto.toString(),
        gas: c.gas.toString(),
      })),
    },
  };
}

export function addMemberKind(memberId: string, role: string): AddMemberKind {
  return { AddMemberToRole: { member_id: memberId, role } };
}

export function removeMemberKind(memberId: string, role: string): RemoveMemberKind {
  return { RemoveMemberFromRole: { member_id: memberId, role } };
}

export function factoryInfoUpdateKind(autoUpdate: boolean): FactoryInfoUpdateKind {
  return { FactoryInfoUpdate: { factory_info: { factory_id: FACTORY_ID, auto_update: autoUpdate } } };
}

export function addProposalArgs(description: string, kind: ProposalKindInput): { proposal: { description: string; kind: ProposalKindInput } } {
  return { proposal: { description, kind } };
}

/** `proposal` echoes the kind exactly as filed (read back via get_proposal): valid on 2.3.1 and on main. */
export function actProposalArgs(id: number, action: VoteAction, kind: unknown): { id: number; action: VoteAction; proposal: unknown } {
  return { id, action, proposal: kind };
}

export function createDaoArgs(input: { name: string; purpose: string; policy: Policy }): { name: string; args: string } {
  return {
    name: input.name,
    args: jsonToBase64({ config: { name: input.name, purpose: input.purpose, metadata: '' }, policy: input.policy }),
  };
}

function isProposalStatus(value: string): value is ProposalStatus {
  return (PROPOSAL_STATUSES as readonly string[]).includes(value);
}

function voteCountsOf(value: unknown): Record<string, [number, number, number]> {
  const out: Record<string, [number, number, number]> = {};
  if (!isRecord(value)) return out;
  for (const [role, counts] of Object.entries(value)) {
    if (Array.isArray(counts) && counts.length === 3) {
      const [a, r, m] = counts;
      if (typeof a === 'number' && typeof r === 'number' && typeof m === 'number') out[role] = [a, r, m];
    }
  }
  return out;
}

function votesOf(value: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!isRecord(value)) return out;
  for (const [voter, vote] of Object.entries(value)) {
    if (typeof vote === 'string') out[voter] = vote;
  }
  return out;
}

/** Tolerant parser for get_proposal output (2.3.1 has numeric vote_counts and no last_actions_log). */
export function parseProposal(value: unknown): ProposalOutput {
  if (!isRecord(value)) throw new Error('proposal: not an object');
  const id = value['id'];
  const status = value['status'];
  if (typeof id !== 'number') throw new Error('proposal: bad id');
  if (typeof status !== 'string' || !isProposalStatus(status)) throw new Error('proposal: bad status');
  const proposer = value['proposer'];
  const description = value['description'];
  const submission = value['submission_time'];
  return {
    id,
    proposer: typeof proposer === 'string' ? proposer : '',
    description: typeof description === 'string' ? description : '',
    kind: value['kind'],
    status,
    vote_counts: voteCountsOf(value['vote_counts']),
    votes: votesOf(value['votes']),
    submission_time: typeof submission === 'string' ? submission : '',
  };
}

export function isTransferKind(kind: unknown): kind is TransferKind {
  if (!isRecord(kind)) return false;
  const t = kind['Transfer'];
  return isRecord(t) && typeof t['token_id'] === 'string' && typeof t['receiver_id'] === 'string' && typeof t['amount'] === 'string';
}

export function roleMembers(policy: Policy, roleName: string): string[] | null {
  const role = policy.roles.find((r) => r.name === roleName);
  if (role === undefined || typeof role.kind !== 'object' || !('Group' in role.kind)) return null;
  return [...role.kind.Group];
}

export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map((v) => canonicalJson(v)).join(',')}]`;
  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonicalJson(value[k])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

function normalizeRole(role: RolePermission): unknown {
  const kind = typeof role.kind === 'object' && 'Group' in role.kind ? { Group: [...role.kind.Group].sort() } : role.kind;
  return { name: role.name, kind, permissions: [...role.permissions].sort(), vote_policy: role.vote_policy };
}

export function policiesMatch(a: Policy, b: Policy): boolean {
  const norm = (p: Policy): string =>
    canonicalJson({
      roles: [...p.roles].sort((x, y) => x.name.localeCompare(y.name)).map(normalizeRole),
      default_vote_policy: p.default_vote_policy,
      proposal_bond: p.proposal_bond,
      proposal_period: p.proposal_period,
      bounty_bond: p.bounty_bond,
      bounty_forgiveness_period: p.bounty_forgiveness_period,
    });
  return norm(a) === norm(b);
}
```

- [ ] **Step 5: Run the gate**

Run: `npx vitest run src/lib/sputnik.test.ts`
Expected: PASS — `Tests  14 passed (14)`

- [ ] **Step 6: Commit (kernel-performed — no agent runs this)**
Message: `feat(lib): Sputnik 2.3.1 types and the Fiador policy builder`

---

### Task 5: The seat-holding smoke contract

**Files:**
- Create: `contract/smoke/Cargo.toml`
- Create: `contract/smoke/Cargo.lock`
- Create: `contract/smoke/src/lib.rs`

**Depends on:** Task 1
**Effort:** high
**Model tier:** top
**Requires:** `npm run cargo -- <cargo args>`
**Provides:** `contract/smoke: fiador_smoke { new(dao: AccountId); file_and_approve(receiver_id: AccountId, amount: U128) -> Promise; on_filed(receiver_id: AccountId, amount: U128) -> PromiseOrValue<u64>; on_voted(proposal_id: u64) -> u64; get_last() -> SmokeView }`

Context: `npm run cargo -- <args>` (Task 1) runs cargo from the repo root with MSYS2 on PATH and
`AWS_LC_SYS_PREBUILT_NASM=1` on Windows; `rust-toolchain.toml` pins Rust 1.99.0. This contract is throwaway: it
holds the DAO's `desk` seat only during pause 1, and only its own account may call `file_and_approve` (the DAO keeps
just its ~0.59 NEAR creation leftover until the seed swaps the seat). It must vote only on the id returned by its
own `add_proposal`.

- [ ] **Step 1: Create the crate manifest**

`contract/smoke/Cargo.toml`:
```toml
[package]
name = "fiador-smoke"
version = "0.1.0"
edition = "2021"
publish = false

[lib]
crate-type = ["cdylib", "rlib"]

[dependencies]
near-sdk = "=5.30.1"

[dev-dependencies]
near-sdk = { version = "=5.30.1", features = ["unit-testing"] }

[profile.release]
codegen-units = 1
opt-level = "z"
lto = true
debug = false
panic = "abort"
overflow-checks = true
```

- [ ] **Step 2: Write the failing tests (with a stub that does nothing)**

`contract/smoke/src/lib.rs`:
```rust
use near_sdk::json_types::U128;
use near_sdk::{near, AccountId, PanicOnDefault, Promise, PromiseOrValue};

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct Smoke {
    dao: AccountId,
    last_proposal_id: Option<u64>,
    last_vote_ok: Option<bool>,
}

#[near(serializers = [json])]
#[derive(Clone, Debug, PartialEq)]
pub struct SmokeView {
    pub dao: AccountId,
    pub last_proposal_id: Option<u64>,
    pub last_vote_ok: Option<bool>,
}

#[near]
impl Smoke {
    #[init]
    pub fn new(dao: AccountId) -> Self {
        Self { dao, last_proposal_id: None, last_vote_ok: None }
    }

    pub fn file_and_approve(&mut self, receiver_id: AccountId, amount: U128) -> Promise {
        let _ = (receiver_id, amount);
        Promise::new(self.dao.clone())
    }

    #[private]
    pub fn on_filed(&mut self, receiver_id: AccountId, amount: U128) -> PromiseOrValue<u64> {
        let _ = (receiver_id, amount);
        PromiseOrValue::Value(0)
    }

    #[private]
    pub fn on_voted(&mut self, proposal_id: u64) -> u64 {
        proposal_id
    }

    pub fn get_last(&self) -> SmokeView {
        SmokeView { dao: self.dao.clone(), last_proposal_id: self.last_proposal_id, last_vote_ok: self.last_vote_ok }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use near_sdk::serde_json::json;
    use near_sdk::test_utils::VMContextBuilder;
    use near_sdk::{testing_env, PromiseResult};

    fn smoke_id() -> AccountId {
        "smoke.root.testnet".parse().unwrap()
    }
    fn dao_id() -> AccountId {
        "fiador.sputnikv2.testnet".parse().unwrap()
    }
    fn bob() -> AccountId {
        "bob.testnet".parse().unwrap()
    }

    fn context(predecessor: AccountId, results: Vec<PromiseResult>) {
        let ctx = VMContextBuilder::new()
            .current_account_id(smoke_id())
            .predecessor_account_id(predecessor)
            .build();
        testing_env!(ctx, near_sdk::test_vm_config(), near_sdk::RuntimeFeesConfig::test(), Default::default(), results);
    }

    #[test]
    fn new_records_the_dao() {
        context(smoke_id(), vec![]);
        let c = Smoke::new(dao_id());
        assert_eq!(c.get_last(), SmokeView { dao: dao_id(), last_proposal_id: None, last_vote_ok: None });
    }

    #[test]
    #[should_panic(expected = "ERR_ONLY_SELF")]
    fn file_and_approve_rejects_any_other_caller() {
        context(bob(), vec![]);
        let mut c = Smoke::new(dao_id());
        let _ = c.file_and_approve(bob(), U128(10));
    }

    #[test]
    fn file_and_approve_by_its_own_account_schedules_the_chain() {
        context(smoke_id(), vec![]);
        let mut c = Smoke::new(dao_id());
        let _ = c.file_and_approve(bob(), U128(10));
    }

    #[test]
    fn transfer_kind_matches_the_live_2_3_1_shape_without_msg() {
        assert_eq!(
            transfer_kind(&bob(), 10),
            json!({ "Transfer": { "token_id": "", "receiver_id": "bob.testnet", "amount": "10" } })
        );
    }

    #[test]
    fn on_filed_success_stores_the_returned_id_and_votes() {
        context(smoke_id(), vec![PromiseResult::Successful(b"7".to_vec())]);
        let mut c = Smoke::new(dao_id());
        match c.on_filed(bob(), U128(10)) {
            PromiseOrValue::Promise(_) => {}
            PromiseOrValue::Value(v) => panic!("expected a vote promise, got value {v}"),
        }
        assert_eq!(c.get_last().last_proposal_id, Some(7));
    }

    #[test]
    fn on_filed_failure_records_no_vote_and_returns_the_sentinel() {
        context(smoke_id(), vec![PromiseResult::Failed]);
        let mut c = Smoke::new(dao_id());
        match c.on_filed(bob(), U128(10)) {
            PromiseOrValue::Value(v) => assert_eq!(v, u64::MAX),
            PromiseOrValue::Promise(_) => panic!("must not vote when add_proposal failed"),
        }
        assert_eq!(c.get_last().last_proposal_id, None);
        assert_eq!(c.get_last().last_vote_ok, Some(false));
    }

    #[test]
    fn on_voted_success_records_ok() {
        context(smoke_id(), vec![PromiseResult::Successful(vec![])]);
        let mut c = Smoke::new(dao_id());
        assert_eq!(c.on_voted(7), 7);
        assert_eq!(c.get_last().last_vote_ok, Some(true));
    }

    #[test]
    fn on_voted_failure_records_not_ok() {
        context(smoke_id(), vec![PromiseResult::Failed]);
        let mut c = Smoke::new(dao_id());
        assert_eq!(c.on_voted(7), 7);
        assert_eq!(c.get_last().last_vote_ok, Some(false));
    }
}
```

- [ ] **Step 3: Run to confirm it fails**

Run: `npm run cargo -- test --manifest-path contract/smoke/Cargo.toml`
Expected: FAIL — compile error `cannot find function \`transfer_kind\` in this scope` (the first cold build takes about 2–3 minutes and creates `contract/smoke/Cargo.lock`).

- [ ] **Step 4: Minimal implementation (replace the whole file)**

`contract/smoke/src/lib.rs`:
```rust
use near_sdk::json_types::U128;
use near_sdk::serde_json::{self, json, Value};
use near_sdk::{env, near, require, AccountId, Gas, NearToken, PanicOnDefault, Promise, PromiseOrValue};

pub const GAS_ADD_PROPOSAL: Gas = Gas::from_tgas(50);
pub const GAS_ON_FILED: Gas = Gas::from_tgas(150);
pub const GAS_ACT_PROPOSAL: Gas = Gas::from_tgas(100);
pub const GAS_ON_VOTED: Gas = Gas::from_tgas(20);
const MAX_RESULT_LEN: usize = 16_384;

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct Smoke {
    dao: AccountId,
    last_proposal_id: Option<u64>,
    last_vote_ok: Option<bool>,
}

#[near(serializers = [json])]
#[derive(Clone, Debug, PartialEq)]
pub struct SmokeView {
    pub dao: AccountId,
    pub last_proposal_id: Option<u64>,
    pub last_vote_ok: Option<bool>,
}

/// The NEAR Transfer kind exactly as the live 2.3.1 DAO stores it, minus `msg` (valid on 2.3.1 and main).
pub fn transfer_kind(receiver_id: &AccountId, amount: u128) -> Value {
    json!({ "Transfer": { "token_id": "", "receiver_id": receiver_id, "amount": amount.to_string() } })
}

fn read_result() -> Option<Vec<u8>> {
    env::promise_result_checked(0, MAX_RESULT_LEN).ok()
}

#[near]
impl Smoke {
    #[init]
    pub fn new(dao: AccountId) -> Self {
        Self { dao, last_proposal_id: None, last_vote_ok: None }
    }

    /// Files a Transfer on the DAO and approves it alone. Only this contract's own account may call it.
    pub fn file_and_approve(&mut self, receiver_id: AccountId, amount: U128) -> Promise {
        require!(env::predecessor_account_id() == env::current_account_id(), "ERR_ONLY_SELF");
        let args = json!({
            "proposal": {
                "description": format!("fiador smoke: {} yocto to {}", amount.0, receiver_id),
                "kind": transfer_kind(&receiver_id, amount.0)
            }
        });
        Promise::new(self.dao.clone())
            .function_call("add_proposal", serde_json::to_vec(&args).expect("args"), NearToken::from_yoctonear(0), GAS_ADD_PROPOSAL)
            .then(Self::ext(env::current_account_id()).with_static_gas(GAS_ON_FILED).on_filed(receiver_id, amount))
    }

    /// Votes only on the id returned by this contract's own add_proposal call.
    #[private]
    pub fn on_filed(&mut self, receiver_id: AccountId, amount: U128) -> PromiseOrValue<u64> {
        let id = match read_result().and_then(|bytes| serde_json::from_slice::<u64>(&bytes).ok()) {
            Some(id) => id,
            None => {
                self.last_proposal_id = None;
                self.last_vote_ok = Some(false);
                env::log_str("fiador smoke: add_proposal failed");
                return PromiseOrValue::Value(u64::MAX);
            }
        };
        self.last_proposal_id = Some(id);
        let args = json!({ "id": id, "action": "VoteApprove", "proposal": transfer_kind(&receiver_id, amount.0) });
        PromiseOrValue::Promise(
            Promise::new(self.dao.clone())
                .function_call("act_proposal", serde_json::to_vec(&args).expect("args"), NearToken::from_yoctonear(0), GAS_ACT_PROPOSAL)
                .then(Self::ext(env::current_account_id()).with_static_gas(GAS_ON_VOTED).on_voted(id)),
        )
    }

    #[private]
    pub fn on_voted(&mut self, proposal_id: u64) -> u64 {
        let ok = read_result().is_some();
        self.last_vote_ok = Some(ok);
        env::log_str(&format!("fiador smoke: vote on proposal {} ok={}", proposal_id, ok));
        proposal_id
    }

    pub fn get_last(&self) -> SmokeView {
        SmokeView { dao: self.dao.clone(), last_proposal_id: self.last_proposal_id, last_vote_ok: self.last_vote_ok }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use near_sdk::serde_json::json;
    use near_sdk::test_utils::VMContextBuilder;
    use near_sdk::{testing_env, PromiseResult};

    fn smoke_id() -> AccountId {
        "smoke.root.testnet".parse().unwrap()
    }
    fn dao_id() -> AccountId {
        "fiador.sputnikv2.testnet".parse().unwrap()
    }
    fn bob() -> AccountId {
        "bob.testnet".parse().unwrap()
    }

    fn context(predecessor: AccountId, results: Vec<PromiseResult>) {
        let ctx = VMContextBuilder::new()
            .current_account_id(smoke_id())
            .predecessor_account_id(predecessor)
            .build();
        testing_env!(ctx, near_sdk::test_vm_config(), near_sdk::RuntimeFeesConfig::test(), Default::default(), results);
    }

    #[test]
    fn new_records_the_dao() {
        context(smoke_id(), vec![]);
        let c = Smoke::new(dao_id());
        assert_eq!(c.get_last(), SmokeView { dao: dao_id(), last_proposal_id: None, last_vote_ok: None });
    }

    #[test]
    #[should_panic(expected = "ERR_ONLY_SELF")]
    fn file_and_approve_rejects_any_other_caller() {
        context(bob(), vec![]);
        let mut c = Smoke::new(dao_id());
        let _ = c.file_and_approve(bob(), U128(10));
    }

    #[test]
    fn file_and_approve_by_its_own_account_schedules_the_chain() {
        context(smoke_id(), vec![]);
        let mut c = Smoke::new(dao_id());
        let _ = c.file_and_approve(bob(), U128(10));
    }

    #[test]
    fn transfer_kind_matches_the_live_2_3_1_shape_without_msg() {
        assert_eq!(
            transfer_kind(&bob(), 10),
            json!({ "Transfer": { "token_id": "", "receiver_id": "bob.testnet", "amount": "10" } })
        );
    }

    #[test]
    fn on_filed_success_stores_the_returned_id_and_votes() {
        context(smoke_id(), vec![PromiseResult::Successful(b"7".to_vec())]);
        let mut c = Smoke::new(dao_id());
        match c.on_filed(bob(), U128(10)) {
            PromiseOrValue::Promise(_) => {}
            PromiseOrValue::Value(v) => panic!("expected a vote promise, got value {v}"),
        }
        assert_eq!(c.get_last().last_proposal_id, Some(7));
    }

    #[test]
    fn on_filed_failure_records_no_vote_and_returns_the_sentinel() {
        context(smoke_id(), vec![PromiseResult::Failed]);
        let mut c = Smoke::new(dao_id());
        match c.on_filed(bob(), U128(10)) {
            PromiseOrValue::Value(v) => assert_eq!(v, u64::MAX),
            PromiseOrValue::Promise(_) => panic!("must not vote when add_proposal failed"),
        }
        assert_eq!(c.get_last().last_proposal_id, None);
        assert_eq!(c.get_last().last_vote_ok, Some(false));
    }

    #[test]
    fn on_voted_success_records_ok() {
        context(smoke_id(), vec![PromiseResult::Successful(vec![])]);
        let mut c = Smoke::new(dao_id());
        assert_eq!(c.on_voted(7), 7);
        assert_eq!(c.get_last().last_vote_ok, Some(true));
    }

    #[test]
    fn on_voted_failure_records_not_ok() {
        context(smoke_id(), vec![PromiseResult::Failed]);
        let mut c = Smoke::new(dao_id());
        assert_eq!(c.on_voted(7), 7);
        assert_eq!(c.get_last().last_vote_ok, Some(false));
    }
}
```

- [ ] **Step 5: Run the gate**

Run: `npm run cargo -- test --manifest-path contract/smoke/Cargo.toml`
Expected: PASS — `test result: ok. 8 passed; 0 failed`

- [ ] **Step 6: Commit (kernel-performed — no agent runs this)**
Message: `feat(smoke): seat-holding smoke contract`

---

### Task 6: Build and commit the smoke wasm

**Files:**
- Create: `contract/res/fiador_smoke.wasm`

**Depends on:** Task 2, Task 5
**Effort:** low
**Requires:** `npm run wasm -- <smoke|desk>`, `npm run wasm:check -- <file.wasm> <export1,export2,...>`, `contract/smoke: fiador_smoke { new(dao: AccountId); file_and_approve(receiver_id: AccountId, amount: U128) -> Promise; on_filed(receiver_id: AccountId, amount: U128) -> PromiseOrValue<u64>; on_voted(proposal_id: u64) -> u64; get_last() -> SmokeView }`
**Provides:** `contract/res/fiador_smoke.wasm`

Context: needs the Stack requirement "Rust 1.99.0 with the `wasm32-unknown-unknown` target" (tollgate report §3).
If this task's build fails because the local wasm toolchain cannot build, stop and report BLOCKED with the cargo
error; the orchestrator then applies **Appendix A** (Linux CI fallback) — do not improvise another build path.

- [ ] **Step 1: Build the wasm**

Run: `npm run wasm -- smoke`
Expected: ends with `WASM BUILT contract/res/fiador_smoke.wasm <N> bytes` (Windows prints `contract\res\fiador_smoke.wasm`).

- [ ] **Step 2: Run the gate**

Run: `npm run wasm:check -- contract/res/fiador_smoke.wasm new,file_and_approve,on_filed,on_voted,get_last`
Expected: PASS — `WASM CHECK PASS contract/res/fiador_smoke.wasm <N> bytes, <M> exports`

- [ ] **Step 3: Commit (kernel-performed — no agent runs this)**
Message: `build(smoke): commit fiador_smoke.wasm`

---

### Task 7: Script env loading and near-api-js helpers

**Files:**
- Create: `scripts/lib/env.ts`
- Create: `scripts/lib/near.ts`
- Test: `scripts/lib/env.test.ts`
- Test: `scripts/lib/near.test.ts`

**Depends on:** Task 3
**Effort:** medium
**Model tier:** top
**Requires:** `src/lib/rpc.ts: DEFAULT_TESTNET_RPC = 'https://rpc.testnet.fastnear.com'`, `src/lib/encoding.ts: base64ToUtf8(b64: string): string`, `src/lib/units.ts: YOCTO_PER_NEAR, TGAS, GAS_300_TGAS (bigint)`, `src/lib/rpc.ts: interface AccountInfo { amount: string; locked: string; storage_usage: number; code_hash: string }`
**Provides:** `scripts/lib/env.ts: interface FiadorEnv { root: string; rootKey: ed25519 secret key string; rpc: string; daoName: string; faucetUrl: string }`, `scripts/lib/env.ts: loadDotEnv(path?: string): void`, `scripts/lib/env.ts: readEnv(source: Record<string, string | undefined>): FiadorEnv`, `scripts/lib/env.ts: readPublicEnv(source: Record<string, string | undefined>): { rpc: string; daoName: string; faucetUrl: string }`, `scripts/lib/near.ts: connect(env: FiadorEnv): Near`, `scripts/lib/near.ts: interface TxResult { ok: boolean; failures: string[]; value: unknown; raw: unknown }`, `scripts/lib/near.ts: callTx(from: Account, receiverId: string, methodName: string, args: Record<string, unknown>, depositYocto?: bigint, gas?: bigint): Promise<TxResult>`, `scripts/lib/near.ts: summarizeOutcome(raw: unknown): TxResult`, `scripts/lib/near.ts: hasFailure(result: TxResult, needle: string): boolean`, `scripts/lib/near.ts: requireOk(result: TxResult, what: string): unknown`, `scripts/lib/near.ts: ensureSubAccount(parent: SubAccountCreator, rpc: Pick<RpcClient, 'viewAccount'>, accountId: string, publicKey: string, nearToTransfer: bigint, pollMs?: number): Promise<'created' | 'exists'>`, `scripts/lib/near.ts: deployWithInit(account: Account, wasm: Uint8Array, initArgs: Record<string, unknown>): Promise<TxResult>`, `scripts/lib/near.ts: waitFor<T>(read: () => Promise<T>, done: (value: T) => boolean, what: string, timeoutMs?: number, intervalMs?: number): Promise<T>`, `scripts/lib/near.ts: sleep(ms: number): Promise<void>`, `scripts/lib/near.ts: EMPTY_CODE_HASH = '11111111111111111111111111111111'`

Context (from Task 3): `src/lib/rpc.ts` exports `DEFAULT_TESTNET_RPC = 'https://rpc.testnet.fastnear.com'`,
`interface AccountInfo { amount: string; locked: string; storage_usage: number; code_hash: string }` and
`class RpcClient` whose `viewAccount(accountId: string): Promise<AccountInfo | null>` returns `null` for unknown
accounts; `src/lib/encoding.ts` exports `base64ToUtf8(b64: string): string`; `src/lib/units.ts` exports `TGAS` and
`GAS_300_TGAS` (bigint). near-api-js 7.5.3 API used here: `new JsonRpcProvider({ url })`,
`KeyPairSigner.fromSecretKey(key)`, `new Account(accountId, provider, signer)`,
`account.signAndSendTransaction({ receiverId, actions, throwOnFailure })`, `actions.functionCall(method, args, gas, deposit)`,
`actions.deployContract(code)`.

- [ ] **Step 1: Write the failing tests**

`scripts/lib/env.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { readEnv, readPublicEnv } from './env';

describe('readEnv', () => {
  it('requires FIADOR_ROOT', () => {
    expect(() => readEnv({ FIADOR_ROOT_KEY: 'ed25519:abc' })).toThrow('FIADOR_ROOT is not set');
  });
  it('requires an ed25519 secret key', () => {
    expect(() => readEnv({ FIADOR_ROOT: 'r.testnet', FIADOR_ROOT_KEY: 'secp256k1:abc' })).toThrow('FIADOR_ROOT_KEY');
    expect(() => readEnv({ FIADOR_ROOT: 'r.testnet', FIADOR_ROOT_KEY: 'ed25519:' })).toThrow('FIADOR_ROOT_KEY');
  });
  it('applies defaults and trims overrides', () => {
    expect(readEnv({ FIADOR_ROOT: 'r.testnet', FIADOR_ROOT_KEY: 'ed25519:abc' })).toEqual({
      root: 'r.testnet',
      rootKey: 'ed25519:abc',
      rpc: 'https://rpc.testnet.fastnear.com',
      daoName: 'fiador',
      faucetUrl: 'https://helper.nearprotocol.com/account',
    });
    expect(readEnv({ FIADOR_ROOT: 'r.testnet', FIADOR_ROOT_KEY: 'ed25519:abc', FIADOR_DAO_NAME: ' fiador-v2 ' }).daoName).toBe('fiador-v2');
  });
  it('reads the public part without any secret', () => {
    expect(readPublicEnv({})).toEqual({ rpc: 'https://rpc.testnet.fastnear.com', daoName: 'fiador', faucetUrl: 'https://helper.nearprotocol.com/account' });
  });
});
```

`scripts/lib/near.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { ensureSubAccount, hasFailure, requireOk, summarizeOutcome, waitFor } from './near';

const denied = {
  ActionError: { index: 0, kind: { FunctionCallError: { ExecutionError: 'Smart contract panicked: ERR_PERMISSION_DENIED' } } },
};

describe('summarizeOutcome', () => {
  it('decodes a JSON SuccessValue', () => {
    const r = summarizeOutcome({ status: { SuccessValue: 'Nw==' }, receipts_outcome: [] });
    expect(r.ok).toBe(true);
    expect(r.value).toBe(7);
    expect(r.failures).toEqual([]);
  });
  it('treats an empty SuccessValue as null', () => {
    expect(summarizeOutcome({ status: { SuccessValue: '' }, receipts_outcome: [] }).value).toBeNull();
  });
  it('collects a failed transaction and its failed receipts', () => {
    const r = summarizeOutcome({
      status: { Failure: denied },
      receipts_outcome: [{ id: 'r1', outcome: { executor_id: 'fiador.sputnikv2.testnet', status: { Failure: denied } } }],
    });
    expect(r.ok).toBe(false);
    expect(hasFailure(r, 'ERR_PERMISSION_DENIED')).toBe(true);
    expect(r.failures[1]).toContain('fiador.sputnikv2.testnet: ');
    expect(() => requireOk(r, 'add_proposal')).toThrow('add_proposal failed');
  });
  it('keeps an intermediate receipt failure on a successful transaction', () => {
    const r = summarizeOutcome({
      status: { SuccessValue: 'eyJsb2FuX2lkIjozfQ==' },
      receipts_outcome: [{ id: 'r1', outcome: { executor_id: 'fiador.sputnikv2.testnet', status: { Failure: denied } } }],
    });
    expect(r.ok).toBe(true);
    expect(r.value).toEqual({ loan_id: 3 });
    expect(hasFailure(r, 'ERR_PERMISSION_DENIED')).toBe(true);
  });
});

describe('waitFor', () => {
  it('resolves once the predicate holds', async () => {
    let n = 0;
    await expect(waitFor(async () => (n += 1), (v) => v >= 3, 'three', 1000, 1)).resolves.toBe(3);
  });
  it('times out', async () => {
    await expect(waitFor(async () => 0, () => false, 'never', 5, 1)).rejects.toThrow('timed out waiting for never');
  });
});

describe('ensureSubAccount', () => {
  it('skips an existing account', async () => {
    const calls: string[] = [];
    const parent = { createSubAccount: async (a: { accountOrPrefix: string }) => { calls.push(a.accountOrPrefix); return {}; } };
    const rpc = { viewAccount: async () => ({ amount: '1', locked: '0', storage_usage: 1, code_hash: 'x' }) };
    await expect(ensureSubAccount(parent, rpc, 'smoke.r.testnet', 'ed25519:pk', 1n, 1)).resolves.toBe('exists');
    expect(calls).toEqual([]);
  });
  it('creates a missing account and waits until RPC sees it', async () => {
    const calls: Array<{ accountOrPrefix: string; publicKey: string; nearToTransfer: bigint }> = [];
    const parent = { createSubAccount: async (a: { accountOrPrefix: string; publicKey: string; nearToTransfer: bigint }) => { calls.push(a); return {}; } };
    let reads = 0;
    const rpc = {
      viewAccount: async () => {
        reads += 1;
        return reads < 3 ? null : { amount: '1', locked: '0', storage_usage: 1, code_hash: 'x' };
      },
    };
    await expect(ensureSubAccount(parent, rpc, 'smoke.r.testnet', 'ed25519:pk', 2n, 1)).resolves.toBe('created');
    expect(calls).toEqual([{ accountOrPrefix: 'smoke.r.testnet', publicKey: 'ed25519:pk', nearToTransfer: 2n }]);
  });
});
```

- [ ] **Step 2: Run to confirm they fail**

Run: `npx vitest run scripts/lib/env.test.ts scripts/lib/near.test.ts`
Expected: FAIL — `Failed to resolve import "./env"` and `Failed to resolve import "./near"`.

- [ ] **Step 3: Minimal implementation**

`scripts/lib/env.ts`:
```ts
import { existsSync } from 'node:fs';
import { DEFAULT_TESTNET_RPC } from '../../src/lib/rpc';

export const DEFAULT_DAO_NAME = 'fiador';
export const DEFAULT_FAUCET_URL = 'https://helper.nearprotocol.com/account';

export interface FiadorEnv {
  root: string;
  rootKey: `ed25519:${string}`;
  rpc: string;
  daoName: string;
  faucetUrl: string;
}

/** Loads a git-ignored .env into process.env when it exists (Node 22's built-in loader). */
export function loadDotEnv(path = '.env'): void {
  if (existsSync(path)) process.loadEnvFile(path);
}

function nonEmpty(value: string | undefined): string | undefined {
  return value !== undefined && value.trim().length > 0 ? value.trim() : undefined;
}

function isEd25519Secret(value: string): value is `ed25519:${string}` {
  return value.startsWith('ed25519:') && value.length > 'ed25519:'.length;
}

export function readPublicEnv(source: Record<string, string | undefined>): { rpc: string; daoName: string; faucetUrl: string } {
  return {
    rpc: nonEmpty(source['FIADOR_RPC']) ?? DEFAULT_TESTNET_RPC,
    daoName: nonEmpty(source['FIADOR_DAO_NAME']) ?? DEFAULT_DAO_NAME,
    faucetUrl: nonEmpty(source['FIADOR_FAUCET_URL']) ?? DEFAULT_FAUCET_URL,
  };
}

export function readEnv(source: Record<string, string | undefined>): FiadorEnv {
  const root = nonEmpty(source['FIADOR_ROOT']);
  if (root === undefined) throw new Error('FIADOR_ROOT is not set (see .env.example)');
  const key = nonEmpty(source['FIADOR_ROOT_KEY']);
  if (key === undefined || !isEd25519Secret(key)) {
    throw new Error('FIADOR_ROOT_KEY is not set to an ed25519: secret key (see .env.example)');
  }
  return { root, rootKey: key, ...readPublicEnv(source) };
}
```

`scripts/lib/near.ts`:
```ts
import { Account, JsonRpcProvider, KeyPairSigner, actions } from 'near-api-js';
import { base64ToUtf8 } from '../../src/lib/encoding';
import type { RpcClient } from '../../src/lib/rpc';
import { GAS_300_TGAS, TGAS } from '../../src/lib/units';
import type { FiadorEnv } from './env';

export const EMPTY_CODE_HASH = '11111111111111111111111111111111';

export interface Near {
  provider: JsonRpcProvider;
  signer: KeyPairSigner;
  account(accountId: string): Account;
}

/** Every Fiador sub-account carries the root's public key, so one signer signs for all of them. */
export function connect(env: FiadorEnv): Near {
  const provider = new JsonRpcProvider({ url: env.rpc });
  const signer = KeyPairSigner.fromSecretKey(env.rootKey);
  return { provider, signer, account: (accountId: string) => new Account(accountId, provider, signer) };
}

export interface TxResult {
  ok: boolean;
  failures: string[];
  value: unknown;
  raw: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function decodeSuccessValue(b64: string): unknown {
  if (b64.length === 0) return null;
  const text = base64ToUtf8(b64);
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

/** Reads a final execution outcome: top-level success/value plus the failure text of every failed receipt. */
export function summarizeOutcome(raw: unknown): TxResult {
  const failures: string[] = [];
  let ok = false;
  let value: unknown = null;
  if (isRecord(raw)) {
    const status = raw['status'];
    if (isRecord(status)) {
      if ('Failure' in status) failures.push(`tx: ${JSON.stringify(status['Failure'])}`);
      const successValue = status['SuccessValue'];
      if (typeof successValue === 'string') {
        ok = true;
        value = decodeSuccessValue(successValue);
      } else if (typeof status['SuccessReceiptId'] === 'string') {
        ok = true;
      }
    }
    const receipts = raw['receipts_outcome'];
    if (Array.isArray(receipts)) {
      for (const receipt of receipts) {
        if (!isRecord(receipt)) continue;
        const outcome = receipt['outcome'];
        if (!isRecord(outcome)) continue;
        const receiptStatus = outcome['status'];
        const executor = outcome['executor_id'];
        if (isRecord(receiptStatus) && 'Failure' in receiptStatus) {
          failures.push(`${typeof executor === 'string' ? executor : '?'}: ${JSON.stringify(receiptStatus['Failure'])}`);
        }
      }
    }
  }
  return { ok, failures, value, raw };
}

export function hasFailure(result: TxResult, needle: string): boolean {
  return result.failures.some((f) => f.includes(needle));
}

export function requireOk(result: TxResult, what: string): unknown {
  if (!result.ok) throw new Error(`${what} failed: ${result.failures.join(' | ') || 'no success status'}`);
  return result.value;
}

/** One function call, 300 Tgas by default, never throwing on an execution failure (inspect the TxResult). */
export async function callTx(
  from: Account,
  receiverId: string,
  methodName: string,
  args: Record<string, unknown>,
  depositYocto: bigint = 0n,
  gas: bigint = GAS_300_TGAS,
): Promise<TxResult> {
  const raw: unknown = await from.signAndSendTransaction({
    receiverId,
    actions: [actions.functionCall(methodName, args, gas, depositYocto)],
    throwOnFailure: false,
  });
  return summarizeOutcome(raw);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function waitFor<T>(
  read: () => Promise<T>,
  done: (value: T) => boolean,
  what: string,
  timeoutMs = 45_000,
  intervalMs = 1_500,
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const value = await read();
    if (done(value)) return value;
    if (Date.now() > deadline) throw new Error(`timed out waiting for ${what}`);
    await sleep(intervalMs);
  }
}

export interface SubAccountCreator {
  createSubAccount(args: { accountOrPrefix: string; publicKey: string; nearToTransfer: bigint }): Promise<unknown>;
}

export async function ensureSubAccount(
  parent: SubAccountCreator,
  rpc: Pick<RpcClient, 'viewAccount'>,
  accountId: string,
  publicKey: string,
  nearToTransfer: bigint,
  pollMs = 1_500,
): Promise<'created' | 'exists'> {
  if ((await rpc.viewAccount(accountId)) !== null) return 'exists';
  await parent.createSubAccount({ accountOrPrefix: accountId, publicKey, nearToTransfer });
  await waitFor(() => rpc.viewAccount(accountId), (info) => info !== null, `account ${accountId}`, 45_000, pollMs);
  return 'created';
}

/** Deploy + init in ONE transaction, so nobody can call `new` before us. */
export async function deployWithInit(account: Account, wasm: Uint8Array, initArgs: Record<string, unknown>): Promise<TxResult> {
  const raw: unknown = await account.signAndSendTransaction({
    receiverId: account.accountId,
    actions: [actions.deployContract(wasm), actions.functionCall('new', initArgs, 100n * TGAS, 0n)],
    throwOnFailure: false,
  });
  return summarizeOutcome(raw);
}
```

- [ ] **Step 4: Run the gate**

Run: `npx vitest run scripts/lib/env.test.ts scripts/lib/near.test.ts`
Expected: PASS — `Test Files  2 passed (2)` and `Tests  12 passed (12)`

- [ ] **Step 5: Commit (kernel-performed — no agent runs this)**
Message: `feat(scripts): env loading and near-api-js helpers`

---

### Task 8: CLI args, faucet, gas measurement and the root CLI

**Files:**
- Create: `scripts/lib/args.ts`
- Create: `scripts/lib/faucet.ts`
- Create: `scripts/lib/gas.ts`
- Create: `scripts/root.ts`
- Test: `scripts/lib/args.test.ts`
- Test: `scripts/lib/faucet.test.ts`
- Test: `scripts/lib/gas.test.ts`

**Depends on:** Task 3, Task 7
**Effort:** medium
**Model tier:** top
**Requires:** `scripts/lib/env.ts: loadDotEnv(path?: string): void`, `scripts/lib/env.ts: readEnv(source: Record<string, string | undefined>): FiadorEnv`, `scripts/lib/env.ts: readPublicEnv(source: Record<string, string | undefined>): { rpc: string; daoName: string; faucetUrl: string }`, `scripts/lib/near.ts: connect(env: FiadorEnv): Near`, `scripts/lib/near.ts: waitFor<T>(read: () => Promise<T>, done: (value: T) => boolean, what: string, timeoutMs?: number, intervalMs?: number): Promise<T>`, `src/lib/units.ts: parseNear(text: string): bigint`, `src/lib/units.ts: formatNear(yocto: bigint | string, maxDecimals?: number): string`, `src/lib/rpc.ts: class RpcClient { constructor(url?: string, fetchImpl?: FetchLike); view<T>(accountId: string, methodName: string, args?: Record<string, unknown>): Promise<T>; viewAccount(accountId: string): Promise<AccountInfo | null>; accessKeyCount(accountId: string): Promise<number>; status(): Promise<{ protocolVersion: number; chainId: string }> }`
**Provides:** `scripts/lib/args.ts: flag(argv: readonly string[], name: string): string | undefined`, `scripts/lib/args.ts: hasFlag(argv: readonly string[], name: string): boolean`, `scripts/lib/faucet.ts: requestFaucetAccount(faucetUrl: string, newAccountId: string, publicKey: string, post?: PostJson): Promise<void>`, `scripts/lib/faucet.ts: randomAccountName(prefix: string, random?: () => number): string`, `scripts/lib/faucet.ts: waitForAccount(rpc: { viewAccount(accountId: string): Promise<AccountInfo | null> }, accountId: string, timeoutMs?: number, intervalMs?: number): Promise<AccountInfo>`, `scripts/lib/gas.ts: interface ChainGas { addProposal: bigint; onFiled: bigint; actProposal: bigint; onVoted: bigint }`, `scripts/lib/gas.ts: measureChain(raw: unknown, daoId: string, contractId: string): ChainGas`, `scripts/lib/gas.ts: recommendedGas(measured: bigint): bigint`, `npm run root -- create <name> | topup --count <n> | check [--min <near>]`

Context: from Task 7, `scripts/lib/env.ts` exports `loadDotEnv(path?: string): void`,
`readEnv(source): FiadorEnv` (`{ root, rootKey, rpc, daoName, faucetUrl }`) and `readPublicEnv(source)`;
`scripts/lib/near.ts` exports `connect(env: FiadorEnv): Near` (`{ provider, signer, account(id) }`) and
`waitFor<T>(read, done, what, timeoutMs?, intervalMs?)`. From Task 3, `src/lib/units.ts` exports
`parseNear(text): bigint` and `formatNear(yocto, maxDecimals?)`; `src/lib/rpc.ts` exports `RpcClient` with
`viewAccount(accountId): Promise<AccountInfo | null>`. The faucet helper is what near-cli-rs'
`sponsor-by-faucet-service` calls on testnet: `POST <FIADOR_FAUCET_URL>` with JSON `{"newAccountId","newAccountPublicKey"}`;
the amount it grants is unverified, so `topup` claims throwaway accounts and deletes them into the root.

- [ ] **Step 1: Write the failing tests**

`scripts/lib/args.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { flag, hasFlag } from './args';

describe('args', () => {
  it('reads a flag value', () => {
    expect(flag(['seed', '--desk', 'desk2.r.testnet'], 'desk')).toBe('desk2.r.testnet');
    expect(flag(['seed'], 'desk')).toBeUndefined();
  });
  it('rejects a flag without a value', () => {
    expect(() => flag(['--desk'], 'desk')).toThrow('--desk needs a value');
    expect(() => flag(['--desk', '--run', '2'], 'desk')).toThrow('--desk needs a value');
  });
  it('detects a bare flag', () => {
    expect(hasFlag(['--dry-run'], 'dry-run')).toBe(true);
    expect(hasFlag([], 'dry-run')).toBe(false);
  });
});
```

`scripts/lib/faucet.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { randomAccountName, requestFaucetAccount, waitForAccount } from './faucet';
import type { FaucetRequest } from './faucet';

describe('faucet', () => {
  it('posts the near-cli-rs helper payload', async () => {
    const sent: Array<{ url: string; body: FaucetRequest }> = [];
    await requestFaucetAccount('https://helper.example/account', 'fiador-x.testnet', 'ed25519:pk', async (url, body) => {
      sent.push({ url, body });
      return { status: 200, text: '{}' };
    });
    expect(sent).toEqual([{ url: 'https://helper.example/account', body: { newAccountId: 'fiador-x.testnet', newAccountPublicKey: 'ed25519:pk' } }]);
  });
  it('reports a refusal with the HTTP status', async () => {
    await expect(
      requestFaucetAccount('https://helper.example/account', 'fiador-x.testnet', 'ed25519:pk', async () => ({ status: 429, text: 'rate limited' })),
    ).rejects.toThrow('faucet refused fiador-x.testnet: HTTP 429 rate limited');
  });
  it('only creates top-level .testnet names', async () => {
    await expect(requestFaucetAccount('u', 'a.b.testnet', 'pk', async () => ({ status: 200, text: '' }))).rejects.toThrow('<name>.testnet');
  });
  it('makes random names from a prefix', () => {
    expect(randomAccountName('fiador-visitor', () => 0)).toBe('fiador-visitor-00000000.testnet');
    expect(randomAccountName('fiador-visitor')).toMatch(/^fiador-visitor-[0-9a-z]{8}\.testnet$/);
  });
  it('waits until the account is visible', async () => {
    let reads = 0;
    const rpc = { viewAccount: async () => { reads += 1; return reads < 2 ? null : { amount: '9', locked: '0', storage_usage: 1, code_hash: 'x' }; } };
    await expect(waitForAccount(rpc, 'a.testnet', 1000, 1)).resolves.toEqual({ amount: '9', locked: '0', storage_usage: 1, code_hash: 'x' });
  });
});
```

`scripts/lib/gas.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { measureChain, recommendedGas } from './gas';

const T = 1_000_000_000_000;
const node = (id: string, executor: string, gas: number, children: string[]) => ({
  id,
  outcome: { executor_id: executor, gas_burnt: gas, receipt_ids: children, status: { SuccessValue: '' }, logs: [] },
});

const OUTCOME = {
  transaction_outcome: { id: 't', outcome: { executor_id: 'root.testnet', gas_burnt: 1, receipt_ids: ['r0'] } },
  receipts_outcome: [
    node('r0', 'smoke.root.testnet', 3 * T, ['r1', 'r2']),
    node('r1', 'fiador.sputnikv2.testnet', 5 * T, ['r1a']),
    node('r1a', 'system', 0, []),
    node('r2', 'smoke.root.testnet', 4 * T, ['r3', 'r4']),
    node('r3', 'fiador.sputnikv2.testnet', 9 * T, ['r3a', 'r3b']),
    node('r3a', 'root.testnet', 0.2 * T, []),
    node('r3b', 'fiador.sputnikv2.testnet', 2 * T, []),
    node('r4', 'smoke.root.testnet', 2 * T, []),
  ],
};

describe('measureChain', () => {
  it('sums each step of the add_proposal → act_proposal chain over its receipt subtree', () => {
    expect(measureChain(OUTCOME, 'fiador.sputnikv2.testnet', 'smoke.root.testnet')).toEqual({
      addProposal: 5_000_000_000_000n,
      onFiled: 17_200_000_000_000n,
      actProposal: 11_200_000_000_000n,
      onVoted: 2_000_000_000_000n,
    });
  });
  it('throws when the chain is incomplete', () => {
    const broken = { ...OUTCOME, receipts_outcome: OUTCOME.receipts_outcome.filter((r) => r.id !== 'r2') };
    expect(() => measureChain(broken, 'fiador.sputnikv2.testnet', 'smoke.root.testnet')).toThrow('gas: no on_filed receipt');
  });
  it('adds at least 30% headroom, rounded up', () => {
    expect(recommendedGas(10n)).toBe(13n);
    expect(recommendedGas(11n)).toBe(15n);
  });
});
```

- [ ] **Step 2: Run to confirm they fail**

Run: `npx vitest run scripts/lib/args.test.ts scripts/lib/faucet.test.ts scripts/lib/gas.test.ts`
Expected: FAIL — `Failed to resolve import "./args"` (and `./faucet`, `./gas`).

- [ ] **Step 3: Minimal implementation**

`scripts/lib/args.ts`:
```ts
export function flag(argv: readonly string[], name: string): string | undefined {
  const i = argv.indexOf(`--${name}`);
  if (i < 0) return undefined;
  const value = argv[i + 1];
  if (value === undefined || value.startsWith('--')) throw new Error(`--${name} needs a value`);
  return value;
}

export function hasFlag(argv: readonly string[], name: string): boolean {
  return argv.includes(`--${name}`);
}
```

`scripts/lib/faucet.ts`:
```ts
import type { AccountInfo } from '../../src/lib/rpc';
import { waitFor } from './near';

export interface FaucetRequest {
  newAccountId: string;
  newAccountPublicKey: string;
}

export type PostJson = (url: string, body: FaucetRequest) => Promise<{ status: number; text: string }>;

export const defaultPostJson: PostJson = async (url, body) => {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return { status: res.status, text: await res.text() };
};

/** Asks the public testnet faucet helper to create `<name>.testnet` holding `publicKey`. */
export async function requestFaucetAccount(faucetUrl: string, newAccountId: string, publicKey: string, post: PostJson = defaultPostJson): Promise<void> {
  if (!/^[a-z0-9]+([-_][a-z0-9]+)*\.testnet$/.test(newAccountId)) {
    throw new Error(`faucet accounts must be <name>.testnet: ${newAccountId}`);
  }
  const res = await post(faucetUrl, { newAccountId, newAccountPublicKey: publicKey });
  if (res.status < 200 || res.status >= 300) {
    throw new Error(`faucet refused ${newAccountId}: HTTP ${res.status} ${res.text.slice(0, 300)}`);
  }
}

export function randomAccountName(prefix: string, random: () => number = Math.random): string {
  const suffix = Math.floor(random() * 36 ** 8).toString(36).padStart(8, '0');
  return `${prefix}-${suffix}.testnet`;
}

export async function waitForAccount(
  rpc: { viewAccount(accountId: string): Promise<AccountInfo | null> },
  accountId: string,
  timeoutMs = 60_000,
  intervalMs = 2_000,
): Promise<AccountInfo> {
  const info = await waitFor(() => rpc.viewAccount(accountId), (v) => v !== null, `account ${accountId}`, timeoutMs, intervalMs);
  if (info === null) throw new Error(`account ${accountId} never appeared`);
  return info;
}
```

`scripts/lib/gas.ts`:
```ts
export interface ChainGas {
  addProposal: bigint;
  onFiled: bigint;
  actProposal: bigint;
  onVoted: bigint;
}

interface ReceiptNode {
  executor: string;
  gasBurnt: bigint;
  children: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseReceipts(raw: unknown): { rootId: string; nodes: Map<string, ReceiptNode> } {
  if (!isRecord(raw)) throw new Error('gas: outcome is not an object');
  const tx = raw['transaction_outcome'];
  const txOutcome = isRecord(tx) ? tx['outcome'] : undefined;
  const rootIds = isRecord(txOutcome) ? txOutcome['receipt_ids'] : undefined;
  const rootId = Array.isArray(rootIds) ? rootIds[0] : undefined;
  if (typeof rootId !== 'string') throw new Error('gas: no root receipt');
  const nodes = new Map<string, ReceiptNode>();
  const receipts = raw['receipts_outcome'];
  if (Array.isArray(receipts)) {
    for (const r of receipts) {
      if (!isRecord(r)) continue;
      const id = r['id'];
      const outcome = r['outcome'];
      if (typeof id !== 'string' || !isRecord(outcome)) continue;
      const executor = outcome['executor_id'];
      const gas = outcome['gas_burnt'];
      const children = outcome['receipt_ids'];
      nodes.set(id, {
        executor: typeof executor === 'string' ? executor : '',
        gasBurnt: typeof gas === 'number' ? BigInt(Math.round(gas)) : 0n,
        children: Array.isArray(children) ? children.filter((c): c is string => typeof c === 'string') : [],
      });
    }
  }
  return { rootId, nodes };
}

function subtreeGas(nodes: Map<string, ReceiptNode>, id: string): bigint {
  const n = nodes.get(id);
  if (n === undefined) return 0n;
  return n.children.reduce((sum, child) => sum + subtreeGas(nodes, child), n.gasBurnt);
}

function childBy(nodes: Map<string, ReceiptNode>, parentId: string, executor: string): string | undefined {
  const parent = nodes.get(parentId);
  return parent?.children.find((c) => nodes.get(c)?.executor === executor);
}

/**
 * Gas each step of `file_and_approve` really used, as the burnt gas of that step's receipt subtree:
 * root → [add_proposal on the DAO, on_filed on the contract]; on_filed → [act_proposal on the DAO, on_voted].
 */
export function measureChain(raw: unknown, daoId: string, contractId: string): ChainGas {
  const { rootId, nodes } = parseReceipts(raw);
  const add = childBy(nodes, rootId, daoId);
  if (add === undefined) throw new Error('gas: no add_proposal receipt');
  const onFiled = childBy(nodes, rootId, contractId);
  if (onFiled === undefined) throw new Error('gas: no on_filed receipt');
  const act = childBy(nodes, onFiled, daoId);
  if (act === undefined) throw new Error('gas: no act_proposal receipt');
  const onVoted = childBy(nodes, onFiled, contractId);
  if (onVoted === undefined) throw new Error('gas: no on_voted receipt');
  return {
    addProposal: subtreeGas(nodes, add),
    onFiled: subtreeGas(nodes, onFiled),
    actProposal: subtreeGas(nodes, act),
    onVoted: subtreeGas(nodes, onVoted),
  };
}

export function recommendedGas(measured: bigint): bigint {
  return (measured * 13n + 9n) / 10n;
}
```

`scripts/root.ts`:
```ts
import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import { Account, KeyPair, KeyPairSigner } from 'near-api-js';
import { RpcClient } from '../src/lib/rpc';
import { formatNear, parseNear } from '../src/lib/units';
import { flag } from './lib/args';
import { loadDotEnv, readEnv, readPublicEnv } from './lib/env';
import { randomAccountName, requestFaucetAccount, waitForAccount } from './lib/faucet';
import { connect } from './lib/near';

const DEFAULT_MIN_NEAR = '21';

async function create(nameArg: string | undefined): Promise<void> {
  if (nameArg === undefined) throw new Error('usage: npm run root -- create <name>');
  const accountId = nameArg.endsWith('.testnet') ? nameArg : `${nameArg}.testnet`;
  if (existsSync('.env') && /^FIADOR_ROOT_KEY=.+/m.test(readFileSync('.env', 'utf8'))) {
    throw new Error('.env already holds FIADOR_ROOT_KEY; refusing to overwrite it');
  }
  loadDotEnv();
  const env = readPublicEnv(process.env);
  const key = KeyPair.fromRandom('ed25519');
  await requestFaucetAccount(env.faucetUrl, accountId, key.getPublicKey().toString());
  const info = await waitForAccount(new RpcClient(env.rpc), accountId);
  appendFileSync('.env', `\nFIADOR_ROOT=${accountId}\nFIADOR_ROOT_KEY=${key.toString()}\n`);
  console.log(`ROOT CREATED ${accountId} ${formatNear(info.amount)} NEAR (key written to the git-ignored .env)`);
}

async function topup(countArg: string | undefined): Promise<void> {
  const count = countArg === undefined ? 1 : Number.parseInt(countArg, 10);
  if (!Number.isInteger(count) || count < 1 || count > 10) throw new Error('--count must be 1..10');
  loadDotEnv();
  const env = readEnv(process.env);
  const near = connect(env);
  const rpc = new RpcClient(env.rpc);
  for (let i = 0; i < count; i += 1) {
    const id = randomAccountName('fiador-topup');
    const key = KeyPair.fromRandom('ed25519');
    await requestFaucetAccount(env.faucetUrl, id, key.getPublicKey().toString());
    const info = await waitForAccount(rpc, id);
    console.log(`faucet granted ${formatNear(info.amount)} NEAR to ${id}; folding it into ${env.root}`);
    await new Account(id, near.provider, new KeyPairSigner(key)).deleteAccount(env.root);
  }
  const root = await rpc.viewAccount(env.root);
  console.log(`root ${env.root} now holds ${root === null ? '?' : formatNear(root.amount)} NEAR`);
}

async function check(minArg: string | undefined): Promise<void> {
  loadDotEnv();
  const env = readEnv(process.env);
  const min = parseNear(minArg ?? DEFAULT_MIN_NEAR);
  const info = await new RpcClient(env.rpc).viewAccount(env.root);
  if (info === null) throw new Error(`root ${env.root} does not exist`);
  if (BigInt(info.amount) < min) {
    console.log(`ROOT LOW ${env.root} ${formatNear(info.amount)} NEAR < ${formatNear(min)} NEAR (run: npm run root -- topup --count 2)`);
    process.exit(1);
  }
  console.log(`ROOT OK ${env.root} ${formatNear(info.amount)} NEAR`);
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const command = argv[0];
  if (command === 'create') return create(argv[1]);
  if (command === 'topup') return topup(flag(argv, 'count'));
  if (command === 'check') return check(flag(argv, 'min'));
  throw new Error('usage: npm run root -- create <name> | topup --count <n> | check [--min <near>]');
}

main().catch((err: unknown) => {
  console.error(`ROOT FAIL: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
```

- [ ] **Step 4: Run the gate**

Run: `npx vitest run scripts/lib/args.test.ts scripts/lib/faucet.test.ts scripts/lib/gas.test.ts`
Expected: PASS — `Test Files  3 passed (3)` and `Tests  11 passed (11)`

- [ ] **Step 5: Commit (kernel-performed — no agent runs this)**
Message: `feat(scripts): CLI args, faucet, gas measurement and root CLI`

---

### Task 9: Council propose and vote helpers

**Files:**
- Create: `scripts/lib/council.ts`
- Test: `scripts/lib/council.test.ts`

**Depends on:** Task 4, Task 7
**Effort:** high
**Model tier:** top
**Requires:** `src/lib/sputnik.ts: addProposalArgs(description: string, kind: ProposalKindInput): { proposal: { description: string; kind: ProposalKindInput } }`, `src/lib/sputnik.ts: actProposalArgs(id: number, action: VoteAction, kind: unknown): { id: number; action: VoteAction; proposal: unknown }`, `src/lib/sputnik.ts: parseProposal(value: unknown): ProposalOutput`, `src/lib/sputnik.ts: types Policy, RolePermission, VotePolicy, RoleKind, ProposalKindInput, TransferKind, FunctionCallKind, FunctionCallSpec, AddMemberKind, RemoveMemberKind, FactoryInfoUpdateKind, ProposalOutput, ProposalStatus, VoteAction`, `scripts/lib/near.ts: callTx(from: Account, receiverId: string, methodName: string, args: Record<string, unknown>, depositYocto?: bigint, gas?: bigint): Promise<TxResult>`, `scripts/lib/near.ts: interface TxResult { ok: boolean; failures: string[]; value: unknown; raw: unknown }`, `scripts/lib/near.ts: requireOk(result: TxResult, what: string): unknown`, `scripts/lib/near.ts: waitFor<T>(read: () => Promise<T>, done: (value: T) => boolean, what: string, timeoutMs?: number, intervalMs?: number): Promise<T>`
**Provides:** `scripts/lib/council.ts: type CallFn = (receiverId: string, methodName: string, args: Record<string, unknown>, depositYocto: bigint) => Promise<TxResult>`, `scripts/lib/council.ts: interface ViewFn { view<T>(accountId: string, methodName: string, args?: Record<string, unknown>): Promise<T> }`, `scripts/lib/council.ts: callerFor(account: Account): CallFn`, `scripts/lib/council.ts: readBond(view: ViewFn, daoId: string): Promise<bigint>`, `scripts/lib/council.ts: readProposal(view: ViewFn, daoId: string, id: number): Promise<ProposalOutput>`, `scripts/lib/council.ts: waitForProposal(view: ViewFn, daoId: string, id: number, done: (p: ProposalOutput) => boolean, pollMs?: number, timeoutMs?: number): Promise<ProposalOutput>`, `scripts/lib/council.ts: propose(call: CallFn, view: ViewFn, daoId: string, description: string, kind: ProposalKindInput): Promise<number>`, `scripts/lib/council.ts: vote(call: CallFn, view: ViewFn, daoId: string, id: number, action?: VoteAction, pollMs?: number): Promise<TxResult>`, `scripts/lib/council.ts: councilAction(callers: readonly CallFn[], view: ViewFn, daoId: string, description: string, kind: ProposalKindInput, pollMs?: number): Promise<ProposalOutput>`

Context: from Task 4, `src/lib/sputnik.ts` exports `addProposalArgs(description, kind)` →
`{ proposal: { description, kind } }`, `actProposalArgs(id, action, kind)` → `{ id, action, proposal: kind }`,
`parseProposal(value: unknown): ProposalOutput`, and the types `ProposalKindInput`, `ProposalOutput`
(`{ id, proposer, description, kind: unknown, status, vote_counts, votes, submission_time }`), `VoteAction`, `Policy`.
From Task 7, `scripts/lib/near.ts` exports `callTx(from, receiverId, methodName, args, depositYocto?, gas?)`
(300 Tgas default, never throws on execution failure), `interface TxResult { ok; failures; value; raw }`,
`requireOk(result, what): unknown` and `waitFor(read, done, what, timeoutMs?, intervalMs?)`. Sputnik rules: the
attached deposit on `add_proposal` must EQUAL `get_policy().proposal_bond`; `act_proposal` must echo the kind exactly
as `get_proposal` returns it. Views read `final` finality, which lags writes by a block or two, so reads after a
write poll.

- [ ] **Step 1: Write the failing test**

`scripts/lib/council.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { councilAction, propose, readBond, vote } from './council';
import type { CallFn, ViewFn } from './council';
import type { TxResult } from './near';

const KIND = { Transfer: { token_id: '', receiver_id: 'bob.testnet', amount: '5', msg: null } };
const okResult = (value: unknown): TxResult => ({ ok: true, failures: [], value, raw: null });

function fakeView(state: { bond: string; status: string[] }): ViewFn {
  let reads = 0;
  return {
    view: async <T,>(_account: string, method: string): Promise<T> => {
      if (method === 'get_policy') return { proposal_bond: state.bond } as unknown as T;
      const status = state.status[Math.min(reads, state.status.length - 1)] ?? 'InProgress';
      reads += 1;
      return { id: 4, proposer: 'c1', description: 'd', kind: KIND, status, vote_counts: {}, votes: {}, submission_time: '1' } as unknown as T;
    },
  };
}

describe('council helpers', () => {
  it('reads the bond from get_policy', async () => {
    await expect(readBond(fakeView({ bond: '1000', status: [] }), 'dao')).resolves.toBe(1000n);
  });

  it('attaches exactly the policy bond and returns the new id', async () => {
    const calls: Array<{ method: string; deposit: bigint; args: Record<string, unknown> }> = [];
    const call: CallFn = async (_r, method, args, deposit) => {
      calls.push({ method, deposit, args });
      return okResult(4);
    };
    await expect(propose(call, fakeView({ bond: '7', status: [] }), 'dao', 'd', 'Vote')).resolves.toBe(4);
    expect(calls).toEqual([{ method: 'add_proposal', deposit: 7n, args: { proposal: { description: 'd', kind: 'Vote' } } }]);
  });

  it('echoes the kind read back from get_proposal when voting', async () => {
    const calls: Array<Record<string, unknown>> = [];
    const call: CallFn = async (_r, _m, args) => {
      calls.push(args);
      return okResult(null);
    };
    await vote(call, fakeView({ bond: '0', status: ['InProgress'] }), 'dao', 4, 'VoteApprove', 1);
    expect(calls).toEqual([{ id: 4, action: 'VoteApprove', proposal: KIND }]);
  });

  it('runs a 2-of-3 council action and returns the approved proposal', async () => {
    const seen: string[] = [];
    const mk = (name: string): CallFn => async (_r, method) => {
      seen.push(`${name}:${method}`);
      return okResult(method === 'add_proposal' ? 4 : null);
    };
    const view = fakeView({ bond: '0', status: ['InProgress', 'InProgress', 'InProgress', 'Approved'] });
    const result = await councilAction([mk('c1'), mk('c2'), mk('c3')], view, 'dao', 'd', 'Vote', 1);
    expect(result.status).toBe('Approved');
    expect(seen).toEqual(['c1:add_proposal', 'c1:act_proposal', 'c2:act_proposal']);
  });

  it('fails a council action that does not reach Approved', async () => {
    const call: CallFn = async (_r, method) => okResult(method === 'add_proposal' ? 4 : null);
    const view = fakeView({ bond: '0', status: ['InProgress', 'InProgress', 'InProgress', 'Failed'] });
    await expect(councilAction([call, call], view, 'dao', 'd', 'Vote', 1)).rejects.toThrow('council action "d" ended Failed');
  });
});
```

- [ ] **Step 2: Run to confirm it fails**

Run: `npx vitest run scripts/lib/council.test.ts`
Expected: FAIL — `Failed to resolve import "./council"`.

- [ ] **Step 3: Minimal implementation**

`scripts/lib/council.ts`:
```ts
import type { Account } from 'near-api-js';
import { actProposalArgs, addProposalArgs, parseProposal } from '../../src/lib/sputnik';
import type { Policy, ProposalKindInput, ProposalOutput, VoteAction } from '../../src/lib/sputnik';
import { callTx, requireOk, waitFor } from './near';
import type { TxResult } from './near';

export type CallFn = (receiverId: string, methodName: string, args: Record<string, unknown>, depositYocto: bigint) => Promise<TxResult>;

export interface ViewFn {
  view<T>(accountId: string, methodName: string, args?: Record<string, unknown>): Promise<T>;
}

export function callerFor(account: Account): CallFn {
  return (receiverId, methodName, args, depositYocto) => callTx(account, receiverId, methodName, args, depositYocto);
}

export async function readBond(view: ViewFn, daoId: string): Promise<bigint> {
  const policy = await view.view<Policy>(daoId, 'get_policy');
  return BigInt(policy.proposal_bond);
}

export async function readProposal(view: ViewFn, daoId: string, id: number): Promise<ProposalOutput> {
  return parseProposal(await view.view<unknown>(daoId, 'get_proposal', { id }));
}

/** Polls get_proposal (final finality lags writes) until `done` holds; a not-yet-visible proposal counts as "not yet". */
export async function waitForProposal(
  view: ViewFn,
  daoId: string,
  id: number,
  done: (p: ProposalOutput) => boolean,
  pollMs = 1_500,
  timeoutMs = 45_000,
): Promise<ProposalOutput> {
  const found = await waitFor(
    () => readProposal(view, daoId, id).catch(() => null),
    (p) => p !== null && done(p),
    `proposal ${id} on ${daoId}`,
    timeoutMs,
    pollMs,
  );
  if (found === null) throw new Error(`proposal ${id} on ${daoId} never appeared`);
  return found;
}

/** Files a proposal attaching exactly the policy's bond; returns the id Sputnik returned. */
export async function propose(call: CallFn, view: ViewFn, daoId: string, description: string, kind: ProposalKindInput): Promise<number> {
  const bond = await readBond(view, daoId);
  const value = requireOk(await call(daoId, 'add_proposal', addProposalArgs(description, kind), bond), `add_proposal "${description}"`);
  if (typeof value !== 'number') throw new Error(`add_proposal "${description}" returned ${JSON.stringify(value)}, expected an id`);
  return value;
}

/** Votes after reading the proposal back, echoing its kind exactly as stored (anti-race check on main). */
export async function vote(call: CallFn, view: ViewFn, daoId: string, id: number, action: VoteAction = 'VoteApprove', pollMs = 1_500): Promise<TxResult> {
  const proposal = await waitForProposal(view, daoId, id, () => true, pollMs);
  return call(daoId, 'act_proposal', actProposalArgs(id, action, proposal.kind), 0n);
}

/** One council action: callers[0] proposes, callers[0] and callers[1] approve (2 of 3); must end Approved. */
export async function councilAction(
  callers: readonly CallFn[],
  view: ViewFn,
  daoId: string,
  description: string,
  kind: ProposalKindInput,
  pollMs = 1_500,
): Promise<ProposalOutput> {
  const [first, second] = callers;
  if (first === undefined || second === undefined) throw new Error('councilAction needs at least two council callers');
  const id = await propose(first, view, daoId, description, kind);
  requireOk(await vote(first, view, daoId, id, 'VoteApprove', pollMs), `council vote 1 on ${id}`);
  requireOk(await vote(second, view, daoId, id, 'VoteApprove', pollMs), `council vote 2 on ${id}`);
  const final = await waitForProposal(view, daoId, id, (p) => p.status !== 'InProgress', pollMs);
  if (final.status !== 'Approved') throw new Error(`council action "${description}" ended ${final.status}`);
  return final;
}
```

- [ ] **Step 4: Run the gate**

Run: `npx vitest run scripts/lib/council.test.ts`
Expected: PASS — `Tests  5 passed (5)`

- [ ] **Step 5: Commit (kernel-performed — no agent runs this)**
Message: `feat(scripts): council propose and vote helpers`

---

### Task 10: The smoke and smoke:check scripts

**Files:**
- Create: `scripts/lib/records.ts`
- Create: `scripts/smoke.ts`
- Create: `scripts/smoke-check.ts`
- Test: `scripts/lib/records.test.ts`

**Depends on:** Task 3, Task 4, Task 7, Task 8, Task 9
**Effort:** high
**Model tier:** top
**Requires:** `src/lib/rpc.ts: class RpcClient { constructor(url?: string, fetchImpl?: FetchLike); view<T>(accountId: string, methodName: string, args?: Record<string, unknown>): Promise<T>; viewAccount(accountId: string): Promise<AccountInfo | null>; accessKeyCount(accountId: string): Promise<number>; status(): Promise<{ protocolVersion: number; chainId: string }> }`, `src/lib/units.ts: parseNear(text: string): bigint`, `src/lib/units.ts: formatNear(yocto: bigint | string, maxDecimals?: number): string`, `scripts/lib/env.ts: loadDotEnv(path?: string): void`, `scripts/lib/env.ts: readEnv(source: Record<string, string | undefined>): FiadorEnv`, `src/lib/sputnik.ts: buildFiadorPolicy(input: { council: readonly string[]; deskSeat: readonly string[] }): Policy`, `src/lib/sputnik.ts: createDaoArgs(input: { name: string; purpose: string; policy: Policy }): { name: string; args: string }`, `src/lib/sputnik.ts: daoAccountId(name: string): string`, `src/lib/sputnik.ts: transferKind(receiverId: string, amountYocto: bigint): TransferKind`, `src/lib/sputnik.ts: addProposalArgs(description: string, kind: ProposalKindInput): { proposal: { description: string; kind: ProposalKindInput } }`, `src/lib/sputnik.ts: isTransferKind(kind: unknown): kind is TransferKind`, `src/lib/sputnik.ts: policiesMatch(a: Policy, b: Policy): boolean`, `src/lib/sputnik.ts: roleMembers(policy: Policy, roleName: string): string[] | null`, `scripts/lib/near.ts: connect(env: FiadorEnv): Near`, `scripts/lib/near.ts: callTx(from: Account, receiverId: string, methodName: string, args: Record<string, unknown>, depositYocto?: bigint, gas?: bigint): Promise<TxResult>`, `scripts/lib/near.ts: ensureSubAccount(parent: SubAccountCreator, rpc: Pick<RpcClient, 'viewAccount'>, accountId: string, publicKey: string, nearToTransfer: bigint, pollMs?: number): Promise<'created' | 'exists'>`, `scripts/lib/near.ts: deployWithInit(account: Account, wasm: Uint8Array, initArgs: Record<string, unknown>): Promise<TxResult>`, `scripts/lib/near.ts: waitFor<T>(read: () => Promise<T>, done: (value: T) => boolean, what: string, timeoutMs?: number, intervalMs?: number): Promise<T>`, `scripts/lib/near.ts: EMPTY_CODE_HASH = '11111111111111111111111111111111'`, `scripts/lib/near.ts: hasFailure(result: TxResult, needle: string): boolean`, `scripts/lib/near.ts: requireOk(result: TxResult, what: string): unknown`, `src/lib/sputnik.ts: FACTORY_ID = 'sputnikv2.testnet', COUNCIL_ROLE = 'council', DESK_ROLE = 'desk', DESK_PERMISSIONS`, `src/lib/sputnik.ts: parseProposal(value: unknown): ProposalOutput`, `scripts/lib/council.ts: callerFor(account: Account): CallFn`, `scripts/lib/council.ts: propose(call: CallFn, view: ViewFn, daoId: string, description: string, kind: ProposalKindInput): Promise<number>`, `scripts/lib/council.ts: vote(call: CallFn, view: ViewFn, daoId: string, id: number, action?: VoteAction, pollMs?: number): Promise<TxResult>`, `scripts/lib/council.ts: waitForProposal(view: ViewFn, daoId: string, id: number, done: (p: ProposalOutput) => boolean, pollMs?: number, timeoutMs?: number): Promise<ProposalOutput>`, `scripts/lib/council.ts: readBond(view: ViewFn, daoId: string): Promise<bigint>`, `scripts/lib/gas.ts: measureChain(raw: unknown, daoId: string, contractId: string): ChainGas`, `scripts/lib/gas.ts: recommendedGas(measured: bigint): bigint`
**Provides:** `scripts/lib/records.ts: interface SmokeRecord`, `scripts/lib/records.ts: isSmokeRecord(value: unknown): value is SmokeRecord`, `scripts/lib/records.ts: readSmokeRecord(path?: string): SmokeRecord`, `scripts/lib/records.ts: writeJson(path: string, value: unknown): void`, `npm run smoke`, `npm run smoke:check`

Context: every signature listed under Requires is defined in Tasks 4, 7, 8 and 9 of this plan, exactly as written
there (paste-equal). Behaviour the scripts must implement is spec §6 "smoke": sub-accounts (smoke 2 NEAR, council-1..3
0.5 NEAR each, all holding the root's public key); deploy + init the smoke contract in ONE transaction; create the
DAO via `sputnikv2.testnet.create` attaching 6 NEAR with `buildFiadorPolicy({ council, deskSeat: [smoke] })`; prove
2-of-3 live on a `Vote` proposal; prove a non-member gets `ERR_PERMISSION_DENIED`; have the smoke contract
`file_and_approve` 0.01 NEAR to the root and read it back `Approved`; measure gas; write the records. The smoke
contract's methods are `file_and_approve(receiver_id, amount: U128 string)` and
`get_last() -> { dao, last_proposal_id: number | null, last_vote_ok: boolean | null }`.

- [ ] **Step 1: Write the failing test**

`scripts/lib/records.test.ts`:
```ts
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { isSmokeRecord, readSmokeRecord, writeJson } from './records';
import type { SmokeRecord } from './records';

const RECORD: SmokeRecord = {
  network: 'testnet',
  rpc: 'https://rpc.testnet.fastnear.com',
  factory: 'sputnikv2.testnet',
  dao: 'fiador.sputnikv2.testnet',
  dao_version: '2.3.1',
  smoke: 'smoke.root.testnet',
  council: ['council-1.root.testnet', 'council-2.root.testnet', 'council-3.root.testnet'],
  root: 'root.testnet',
  vote_check_proposal: 0,
  transfer_proposal: 1,
  permission_denied: true,
  smoke_transfer_yocto: '10000000000000000000000',
  at: '2026-11-13T15:00:00.000Z',
};

describe('records', () => {
  it('validates a smoke record', () => {
    expect(isSmokeRecord(RECORD)).toBe(true);
    expect(isSmokeRecord({ ...RECORD, council: 'x' })).toBe(false);
    expect(isSmokeRecord({ ...RECORD, network: 'mainnet' })).toBe(false);
  });
  it('writes pretty JSON with a trailing newline and reads it back', () => {
    const dir = mkdtempSync(join(tmpdir(), 'fiador-'));
    const path = join(dir, 'nested', 'smoke.json');
    writeJson(path, RECORD);
    expect(readFileSync(path, 'utf8').endsWith('}\n')).toBe(true);
    expect(readSmokeRecord(path)).toEqual(RECORD);
  });
  it('refuses a malformed file', () => {
    const dir = mkdtempSync(join(tmpdir(), 'fiador-'));
    const path = join(dir, 'bad.json');
    writeJson(path, { network: 'testnet' });
    expect(() => readSmokeRecord(path)).toThrow('not a smoke record');
  });
});
```

- [ ] **Step 2: Run to confirm it fails**

Run: `npx vitest run scripts/lib/records.test.ts`
Expected: FAIL — `Failed to resolve import "./records"`.

- [ ] **Step 3: Minimal implementation**

`scripts/lib/records.ts`:
```ts
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

export interface SmokeRecord {
  network: 'testnet';
  rpc: string;
  factory: string;
  dao: string;
  dao_version: string;
  smoke: string;
  council: string[];
  root: string;
  vote_check_proposal: number;
  transfer_proposal: number;
  permission_denied: boolean;
  smoke_transfer_yocto: string;
  at: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function isSmokeRecord(value: unknown): value is SmokeRecord {
  if (!isRecord(value)) return false;
  const council = value['council'];
  return (
    value['network'] === 'testnet' &&
    typeof value['rpc'] === 'string' &&
    typeof value['factory'] === 'string' &&
    typeof value['dao'] === 'string' &&
    typeof value['dao_version'] === 'string' &&
    typeof value['smoke'] === 'string' &&
    Array.isArray(council) &&
    council.every((c) => typeof c === 'string') &&
    typeof value['root'] === 'string' &&
    typeof value['vote_check_proposal'] === 'number' &&
    typeof value['transfer_proposal'] === 'number' &&
    typeof value['permission_denied'] === 'boolean' &&
    typeof value['smoke_transfer_yocto'] === 'string' &&
    typeof value['at'] === 'string'
  );
}

export function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

export function readSmokeRecord(path = 'deployments/smoke.json'): SmokeRecord {
  const value: unknown = JSON.parse(readFileSync(path, 'utf8'));
  if (!isSmokeRecord(value)) throw new Error(`${path} is not a smoke record`);
  return value;
}
```

`scripts/smoke.ts`:
```ts
import { readFileSync } from 'node:fs';
import { RpcClient } from '../src/lib/rpc';
import {
  addProposalArgs,
  buildFiadorPolicy,
  createDaoArgs,
  daoAccountId,
  FACTORY_ID,
  isTransferKind,
  policiesMatch,
  transferKind,
} from '../src/lib/sputnik';
import type { Policy } from '../src/lib/sputnik';
import { formatNear, parseNear } from '../src/lib/units';
import { callerFor, propose, readBond, vote, waitForProposal } from './lib/council';
import { loadDotEnv, readEnv } from './lib/env';
import { measureChain, recommendedGas } from './lib/gas';
import { callTx, connect, deployWithInit, EMPTY_CODE_HASH, ensureSubAccount, hasFailure, requireOk, waitFor } from './lib/near';
import { writeJson } from './lib/records';
import type { SmokeRecord } from './lib/records';

const SMOKE_WASM = 'contract/res/fiador_smoke.wasm';
const DAO_DEPOSIT = parseNear('6');
const SMOKE_FUNDING = parseNear('2');
const COUNCIL_FUNDING = parseNear('0.5');
const SMOKE_TRANSFER = parseNear('0.01');

interface SmokeView {
  dao: string;
  last_proposal_id: number | null;
  last_vote_ok: boolean | null;
}

function step(text: string): void {
  console.log(`\n== ${text}`);
}

async function main(): Promise<void> {
  loadDotEnv();
  const env = readEnv(process.env);
  const near = connect(env);
  const rpc = new RpcClient(env.rpc);
  const root = near.account(env.root);
  const publicKey = (await near.signer.getPublicKey()).toString();
  const daoId = daoAccountId(env.daoName);
  const smokeId = `smoke.${env.root}`;
  const councilIds = [1, 2, 3].map((n) => `council-${n}.${env.root}`);

  step('1/7 sub-accounts (all hold the root key)');
  console.log(smokeId, await ensureSubAccount(root, rpc, smokeId, publicKey, SMOKE_FUNDING));
  for (const id of councilIds) console.log(id, await ensureSubAccount(root, rpc, id, publicKey, COUNCIL_FUNDING));

  step('2/7 deploy + init the smoke contract in one transaction');
  const smoke = near.account(smokeId);
  const smokeInfo = await rpc.viewAccount(smokeId);
  if (smokeInfo !== null && smokeInfo.code_hash !== EMPTY_CODE_HASH) {
    console.log('smoke contract already deployed');
  } else {
    requireOk(await deployWithInit(smoke, new Uint8Array(readFileSync(SMOKE_WASM)), { dao: daoId }), 'deploy smoke');
  }

  step(`3/7 create ${daoId} with the final policy (bond 0, council 2-of-3, smoke in the desk seat)`);
  const policy = buildFiadorPolicy({ council: councilIds, deskSeat: [smokeId] });
  if ((await rpc.viewAccount(daoId)) === null) {
    const args = createDaoArgs({ name: env.daoName, purpose: 'Fiador demo credit union (NEAR HACKATHON, testnet)', policy });
    requireOk(await callTx(root, FACTORY_ID, 'create', args, DAO_DEPOSIT), 'factory create');
  } else {
    console.log('DAO already exists');
  }
  const livePolicy = await waitFor(() => rpc.view<Policy>(daoId, 'get_policy').catch(() => null), (p) => p !== null, 'DAO policy');
  if (livePolicy === null || !policiesMatch(livePolicy, policy)) {
    throw new Error(`${daoId} exists with a different policy; set FIADOR_DAO_NAME=fiador-v2 in .env and rerun`);
  }
  const version = await rpc.view<string>(daoId, 'version');
  if (version !== '2.3.1') console.log(`WARNING: DAO version ${version} (plans were written against 2.3.1)`);

  step('4/7 live 2-of-3 check: one council approval must NOT pass a Vote proposal, two must');
  const [c1, c2] = councilIds.map((id) => callerFor(near.account(id)));
  if (c1 === undefined || c2 === undefined) throw new Error('council accounts missing');
  const c1Id = councilIds[0] ?? '';
  const voteId = await propose(c1, rpc, daoId, 'fiador smoke: 2-of-3 threshold check', 'Vote');
  requireOk(await vote(c1, rpc, daoId, voteId), 'council-1 approve');
  const afterOne = await waitForProposal(rpc, daoId, voteId, (p) => p.votes[c1Id] === 'Approve');
  if (afterOne.status !== 'InProgress') throw new Error(`expected InProgress after 1 approval, got ${afterOne.status}`);
  requireOk(await vote(c2, rpc, daoId, voteId), 'council-2 approve');
  const afterTwo = await waitForProposal(rpc, daoId, voteId, (p) => p.status !== 'InProgress');
  if (afterTwo.status !== 'Approved') throw new Error(`expected Approved after 2 approvals, got ${afterTwo.status}`);
  console.log(`Vote proposal ${voteId}: InProgress after 1 approval, Approved after 2`);

  step('5/7 a non-member cannot file anything');
  const denied = await callTx(root, daoId, 'add_proposal', addProposalArgs('fiador smoke: must be refused', transferKind(env.root, SMOKE_TRANSFER)), await readBond(rpc, daoId));
  if (denied.ok || !hasFailure(denied, 'ERR_PERMISSION_DENIED')) {
    throw new Error(`expected ERR_PERMISSION_DENIED, got ${denied.ok ? 'success' : denied.failures.join(' | ')}`);
  }
  console.log('root (no role) got ERR_PERMISSION_DENIED');

  step('6/7 the seated smoke contract files a Transfer and approves it alone');
  const filed = await callTx(smoke, smokeId, 'file_and_approve', { receiver_id: env.root, amount: SMOKE_TRANSFER.toString() });
  requireOk(filed, 'file_and_approve');
  const last = await waitFor(() => rpc.view<SmokeView>(smokeId, 'get_last'), (v) => v.last_vote_ok !== null, 'smoke get_last');
  if (last.last_proposal_id === null || last.last_vote_ok !== true) throw new Error(`smoke chain incomplete: ${JSON.stringify(last)}`);
  const transfer = await waitForProposal(rpc, daoId, last.last_proposal_id, (p) => p.status !== 'InProgress');
  if (transfer.status !== 'Approved') throw new Error(`transfer proposal ${transfer.id} is ${transfer.status}, expected Approved`);
  if (!isTransferKind(transfer.kind) || transfer.kind.Transfer.receiver_id !== env.root || transfer.kind.Transfer.amount !== SMOKE_TRANSFER.toString()) {
    throw new Error(`transfer proposal ${transfer.id} has an unexpected kind: ${JSON.stringify(transfer.kind)}`);
  }
  console.log(`Transfer proposal ${transfer.id}: ${formatNear(SMOKE_TRANSFER)} NEAR to ${env.root}, Approved by the seat alone`);

  step('7/7 measure the chain gas and write the records');
  const gas = measureChain(filed.raw, daoId, smokeId);
  writeJson('deployments/smoke-gas.json', {
    measured_at: new Date().toISOString(),
    headroom: '1.3',
    add_proposal: gas.addProposal.toString(),
    on_filed: gas.onFiled.toString(),
    act_proposal: gas.actProposal.toString(),
    on_voted: gas.onVoted.toString(),
    recommended: {
      add_proposal: recommendedGas(gas.addProposal).toString(),
      on_filed: recommendedGas(gas.onFiled).toString(),
      act_proposal: recommendedGas(gas.actProposal).toString(),
      on_voted: recommendedGas(gas.onVoted).toString(),
    },
  });
  const record: SmokeRecord = {
    network: 'testnet',
    rpc: env.rpc,
    factory: FACTORY_ID,
    dao: daoId,
    dao_version: version,
    smoke: smokeId,
    council: councilIds,
    root: env.root,
    vote_check_proposal: voteId,
    transfer_proposal: transfer.id,
    permission_denied: true,
    smoke_transfer_yocto: SMOKE_TRANSFER.toString(),
    at: new Date().toISOString(),
  };
  writeJson('deployments/smoke.json', record);
  console.log(`SMOKE PASS dao=${daoId} version=${version} vote_check=${voteId} transfer=${transfer.id}`);
}

main().catch((err: unknown) => {
  console.error(`SMOKE FAIL: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
```

`scripts/smoke-check.ts`:
```ts
import { existsSync, readFileSync } from 'node:fs';
import { RpcClient } from '../src/lib/rpc';
import { COUNCIL_ROLE, isTransferKind, parseProposal, roleMembers } from '../src/lib/sputnik';
import type { Policy } from '../src/lib/sputnik';
import { readSmokeRecord } from './lib/records';

async function main(): Promise<void> {
  const record = readSmokeRecord();
  const rpc = new RpcClient(record.rpc);
  const problems: string[] = [];

  const policy = await rpc.view<Policy>(record.dao, 'get_policy');
  const council = roleMembers(policy, COUNCIL_ROLE);
  if (council === null || [...council].sort().join(',') !== [...record.council].sort().join(',')) problems.push('council role differs from the record');
  const dvp = policy.default_vote_policy;
  if (dvp.weight_kind !== 'RoleWeight' || dvp.quorum !== '2' || dvp.threshold !== '2') problems.push(`default vote policy is ${JSON.stringify(dvp)}`);
  if (policy.proposal_bond !== '0') problems.push(`proposal bond is ${policy.proposal_bond}`);

  const voteCheck = parseProposal(await rpc.view<unknown>(record.dao, 'get_proposal', { id: record.vote_check_proposal }));
  const approvals = Object.values(voteCheck.votes).filter((v) => v === 'Approve').length;
  if (voteCheck.status !== 'Approved' || approvals !== 2) problems.push(`vote check ${voteCheck.id}: ${voteCheck.status} with ${approvals} approvals`);

  const transfer = parseProposal(await rpc.view<unknown>(record.dao, 'get_proposal', { id: record.transfer_proposal }));
  if (transfer.status !== 'Approved') problems.push(`transfer ${transfer.id} is ${transfer.status}`);
  if (!isTransferKind(transfer.kind) || transfer.kind.Transfer.receiver_id !== record.root || transfer.kind.Transfer.amount !== record.smoke_transfer_yocto) {
    problems.push(`transfer ${transfer.id} kind is ${JSON.stringify(transfer.kind)}`);
  }
  if (transfer.proposer !== record.smoke) problems.push(`transfer ${transfer.id} was proposed by ${transfer.proposer}`);
  if (!record.permission_denied) problems.push('permission check did not run');

  if (!existsSync('deployments/smoke-gas.json')) {
    problems.push('deployments/smoke-gas.json is missing');
  } else {
    const gas: unknown = JSON.parse(readFileSync('deployments/smoke-gas.json', 'utf8'));
    const keys = ['add_proposal', 'on_filed', 'act_proposal', 'on_voted'];
    if (typeof gas !== 'object' || gas === null || !keys.every((k) => /^\d+$/.test(String((gas as Record<string, unknown>)[k])))) {
      problems.push('deployments/smoke-gas.json lacks the four measurements');
    }
  }

  if (problems.length > 0) {
    console.log(`SMOKE FAIL\n- ${problems.join('\n- ')}`);
    process.exit(1);
  }
  console.log(`SMOKE PASS dao=${record.dao} version=${record.dao_version} vote_check=${voteCheck.id} transfer=${transfer.id}`);
}

main().catch((err: unknown) => {
  console.error(`SMOKE FAIL: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
```

- [ ] **Step 4: Run the records test**

Run: `npx vitest run scripts/lib/records.test.ts`
Expected: `Tests  3 passed (3)`

- [ ] **Step 5: Run the gate (type-checks smoke.ts and smoke-check.ts, then every test)**

Run: `npm run check`
Expected: PASS — `tsc` prints nothing, then vitest ends with `Test Files  <N> passed (<N>)` and no failed files

- [ ] **Step 6: Commit (kernel-performed — no agent runs this)**
Message: `feat(scripts): smoke and smoke:check`

---

### Task 11: [HUMAN GATE] Create and fund the root account

**Files:**
- (none — writes only the git-ignored `.env`)

**Depends on:** Task 8
**Effort:** medium
**Model tier:** top
**Requires:** `npm run root -- create <name> | topup --count <n> | check [--min <near>]`
**Provides:** `.env with FIADOR_ROOT and FIADOR_ROOT_KEY (git-ignored) and a root holding >= 21 NEAR`

Context: run by the gate-concierge (preflight, pause 1) with the user's explicit go. The faucet amount is
unverified: record every amount it actually grants in the gate ledger. Never print, paste or commit the key; it
lives only in `.env`. If the helper refuses, the user may create the account in a wallet and fund it from
https://near-faucet.io, then add `FIADOR_ROOT=` and `FIADOR_ROOT_KEY=` to `.env` by hand.

- [ ] **Step 1: Create the root**

Run: `npm run root -- create fiador-ops-<6 random lowercase letters>`
Expected: `ROOT CREATED fiador-ops-<…>.testnet <N> NEAR (key written to the git-ignored .env)`

- [ ] **Step 2: Top up until the minimum viable budget is reached**

Run: `npm run root -- topup --count 2` (repeat while `npm run root -- check` prints `ROOT LOW`)
Expected: one `faucet granted <N> NEAR to fiador-topup-<…>.testnet; folding it into <root>` line per claim.

- [ ] **Step 3: Run the gate**

Run: `npm run root -- check`
Expected: PASS — `ROOT OK <root> <N> NEAR` with N >= 21

- [ ] **Step 4: Commit (kernel-performed — no agent runs this)**
Nothing tracked changes (`allow_empty`); the ledger entry records the account id and the faucet amounts.
Message: `chore(gate): root account created and funded`

---

### Task 12: [HUMAN GATE] Live smoke run (creates the real demo DAO)

**Files:**
- Create: `deployments/smoke.json`
- Create: `deployments/smoke-gas.json`

**Depends on:** Task 6, Task 10, Task 11
**Effort:** medium
**Model tier:** top
**Requires:** `contract/res/fiador_smoke.wasm`, `npm run smoke`, `npm run smoke:check`, `.env with FIADOR_ROOT and FIADOR_ROOT_KEY (git-ignored) and a root holding >= 21 NEAR`
**Provides:** `deployments/smoke.json`, `deployments/smoke-gas.json`, `live DAO fiador.sputnikv2.testnet with the final policy and the smoke contract in the desk seat`

Context: run by the gate-concierge (pause 1) with the user's explicit go. Spends about 9.5 NEAR (DAO 6, smoke 2,
council 1.5) plus gas. The DAO keeps only its ~0.59 NEAR creation leftover; the real loan float is sent by the seed
(after the seat swap). If step 3 of the script reports "exists with a different policy", set
`FIADOR_DAO_NAME=fiador-v2` in `.env` and rerun.

- [ ] **Step 1: Run the smoke test**

Run: `npm run smoke`
Expected: seven `== n/7` sections ending with `SMOKE PASS dao=fiador.sputnikv2.testnet version=2.3.1 vote_check=<id> transfer=<id>`

- [ ] **Step 2: Run the gate**

Run: `npm run smoke:check`
Expected: PASS — `SMOKE PASS dao=fiador.sputnikv2.testnet version=2.3.1 vote_check=<id> transfer=<id>`

- [ ] **Step 3: Commit (kernel-performed — no agent runs this)**
Message: `chore(gate): live smoke run records`

---

## Appendix A — Linux CI wasm fallback (not a task; applied only if Task 6 cannot build locally)

Trigger: Task 6 returns BLOCKED, or its `npm run wasm -- smoke` fails with a toolchain/linker error after one
retry. The orchestrator routes this to the architect as a one-task plan-bug fix, which appends **Task 6.1** below
to this plan and to the manifest (append-only; Task 6's id, files and gate never change), then re-runs Task 6's
gate after CI has committed the wasm. The workflow builds every crate named in its input and commits only
`contract/res/*.wasm`.

Task 6.1 creates `.github/workflows/wasm.yml` with exactly:
```yaml
name: wasm
on:
  workflow_dispatch:
    inputs:
      crates:
        description: "space-separated crates to build (smoke, desk)"
        required: true
        default: "smoke"
permissions:
  contents: write
jobs:
  build:
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v4
      - name: Pinned Rust (same as rust-toolchain.toml)
        run: rustup toolchain install 1.99.0 --profile minimal --target wasm32-unknown-unknown
      - uses: actions/setup-node@v4
        with:
          node-version: "22"
      - run: npm ci
      - name: Build wasm
        run: |
          for c in ${{ inputs.crates }}; do npm run wasm -- "$c"; done
      - name: Check wasm (validates, and confirms the on-chain host path from --cfg near)
        run: |
          for c in ${{ inputs.crates }}; do npm run wasm:check -- "contract/res/fiador_$c.wasm" new; done
      - name: Commit wasm
        run: |
          git config user.name "fiador-ci"
          git config user.email "fiador-ci@users.noreply.github.com"
          git add contract/res/*.wasm
          git diff --cached --quiet || git commit -m "build: wasm from Linux CI [skip ci]"
          git push
```
Its gate: `node -e "const t=require('fs').readFileSync('.github/workflows/wasm.yml','utf8');process.exit(t.includes('npm run wasm --')&&t.includes('contents: write')?0:1)"` (Expected: exit 0).
Then the human (gh token has `workflow` scope) runs, on this machine:
`git -c credential.helper= -c "credential.helper=!gh auth git-credential" push`, then
`gh workflow run wasm.yml -R Dotman-Bei/fiador -f crates=smoke`, `gh run watch -R Dotman-Bei/fiador`, and
`git -c credential.helper= -c "credential.helper=!gh auth git-credential" pull --rebase`; Task 6's gate then passes on
the committed `contract/res/fiador_smoke.wasm`. The desk plan's wasm task uses the same workflow with `crates=desk`.
