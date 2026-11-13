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
