// Records the primary display with ffmpeg ddagrab (no input injection) and stops itself 15 s after the chain shows
// the live take's loan Repaid (read-only RPC), or at the hard limit.   node scripts/record.mjs <take-name> [loanId]
import { spawn } from 'node:child_process';
import { appendFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const cap = resolve(here, '../capture');
mkdirSync(cap, { recursive: true });
const take = process.argv[2] ?? 'take1';
const loanId = Number(process.argv[3] ?? 10);
const out = resolve(cap, `live-${take}.mp4`);
const logPath = resolve(cap, `live-${take}.log`);
const HARD_LIMIT_S = 720;
const TAIL_S = Number(process.env.TAIL_S ?? 45);
const log = (m) => { const l = `${new Date().toISOString()} ${m}`; appendFileSync(logPath, l + '\n'); console.log(l); };

const dep = JSON.parse((await import('node:fs')).readFileSync(resolve(here, '../../deployments/testnet.json'), 'utf8'));
const loanIdArgs = (id) => Buffer.from(JSON.stringify({ loan_id: id })).toString('base64');
async function loan() {
  try {
    const r = await fetch(dep.rpc, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'query', params: { request_type: 'call_function', finality: 'final', account_id: dep.desk, method_name: 'get_loan', args_base64: loanIdArgs(loanId) } }) });
    const j = await r.json();
    if (j.error || !j.result?.result) return undefined;
    return JSON.parse(Buffer.from(j.result.result).toString());
  } catch { return undefined; }
}

const args = ['-y', '-hide_banner', '-f', 'lavfi', '-i', 'ddagrab=output_idx=0:framerate=30:draw_mouse=1,hwdownload,format=bgra', '-vf', 'format=yuv420p',
  '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-t', String(HARD_LIMIT_S), out];
const startedAt = Date.now();
const ff = spawn('ffmpeg', args, { stdio: ['pipe', 'ignore', 'pipe'] });
let firstFrameAt = null;
let stderrTail = '';
ff.stderr.on('data', (d) => {
  const s = d.toString();
  stderrTail = (stderrTail + s).slice(-600);
  if (firstFrameAt === null && /frame=\s*\d+/.test(s)) { firstFrameAt = Date.now(); log(`first frame written; capture clock origin ~ ${new Date(firstFrameAt).toISOString()} (spawn was ${new Date(startedAt).toISOString()})`); writeFileSync(resolve(cap, `live-${take}.start.txt`), new Date(firstFrameAt).toISOString()); }
  const m = s.match(/Stream #0:0.*?(\d{3,4}x\d{3,4})/);
  if (m) log(`video size ${m[1]}`);
});
ff.on('exit', (code) => { log(`ffmpeg exited ${code}`); clearInterval(poll); process.exit(0); });
log(`recording started to ${out}`);

let seen = '';
let repaidAt = null;
let stopping = false;
const stop = (why) => { if (stopping) return; stopping = true; log(`stopping: ${why}`); ff.stdin.write('q'); setTimeout(() => ff.kill(), 8000); };
const poll = setInterval(async () => {
  const elapsed = (Date.now() - startedAt) / 1000;
  const l = await loan();
  const state = l ? `${l.status}${l.proposal_id != null ? `/proposal ${l.proposal_id}` : ''}` : 'absent';
  if (state !== seen) { seen = state; log(`chain: loan #${loanId} ${state}`); }
  if (l?.status === 'Repaid' || l?.status === 'RepaidLate' || l?.status === 'Defaulted') {
    if (repaidAt === null) repaidAt = Date.now();
    if (Date.now() - repaidAt >= TAIL_S * 1000) stop(`loan #${loanId} ${l.status} ${TAIL_S} s ago`);
  }
  if (elapsed > HARD_LIMIT_S - 5) stop('hard limit');
}, 4000);
void existsSync;
