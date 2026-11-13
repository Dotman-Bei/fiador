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
