// S8: runs `npm run verify` (read-only) in a new Windows Terminal window that this script launches, and records ONLY that
// window with ffmpeg gfxcapture (silent). The window is found at runtime by diffing Windows Terminal window handles before
// and after the launch. The shell script lives in a file (Windows Terminal treats ";" on its command line as a separator),
// prints a plain "$ " prompt so no user name shows in a path, and exits 0 by itself so the window closes.
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '../..');
const cap = resolve(here, '../capture');
mkdirSync(cap, { recursive: true });
const take = process.argv[2] ?? 'take1';
const mp4 = resolve(cap, `S8-${take}.mp4`);
const stdoutFile = resolve(cap, `S8-${take}-stdout.txt`);
const logFile = resolve(cap, `S8-${take}.log`);
const ps1 = resolve(here, `../tmp/s8-${take}.ps1`);
for (const f of [mp4, stdoutFile, logFile]) if (existsSync(f)) rmSync(f);
const log = (m) => { const l = `${new Date().toISOString()} ${m}`; console.log(l); writeFileSync(logFile, l + '\n', { flag: 'a' }); };

writeFileSync(ps1, [
  `$Host.UI.RawUI.WindowTitle = 'fiador-verify'`,
  `chcp 65001 | Out-Null`,
  `[Console]::OutputEncoding = [System.Text.Encoding]::UTF8`,
  `$OutputEncoding = [System.Text.Encoding]::UTF8`,
  `function prompt { '$ ' }`,
  `Set-Location -LiteralPath '${repo.replaceAll("'", "''")}'`,
  `Clear-Host`,
  `Start-Sleep -Seconds 6`,
  `Write-Host '$ npm run verify'`,
  `npm run verify 2>&1 | Tee-Object -FilePath '${stdoutFile.replaceAll("'", "''")}'`,
  `Write-Host ''`,
  `Start-Sleep -Seconds 12`,
  `exit 0`,
].join('\r\n'));

const handles = () => spawnSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', resolve(here, 'enumwt.ps1')], { encoding: 'utf8' }).stdout.split(/\s+/).filter(Boolean);
const before = new Set(handles());
log(`terminal windows before: ${before.size}`);
log('launching Windows Terminal window');
const wt = spawn('wt.exe', ['--maximized', '-d', repo, 'powershell.exe', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', ps1], { detached: true, stdio: 'ignore' });
wt.unref();

let hwnd = null;
for (let i = 0; i < 20 && hwnd === null; i++) {
  await new Promise((r) => setTimeout(r, 400));
  hwnd = handles().find((h) => !before.has(h)) ?? null;
}
if (hwnd === null) { log('new window not found; aborting'); process.exit(2); }
log(`new window handle discovered at runtime: ${hwnd}`);

const ff = spawn('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', `gfxcapture=hwnd=${hwnd}:capture_cursor=0:max_framerate=30,fps=30,hwdownload,format=bgra`,
  '-vf', 'format=yuv420p', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '16', '-t', '27', mp4], { stdio: ['ignore', 'inherit', 'inherit'] });
log(`gfxcapture started ${new Date().toISOString()}`);
await new Promise((r) => ff.on('exit', r));
log('ffmpeg finished');
await new Promise((r) => setTimeout(r, 6000));
const raw = existsSync(stdoutFile) ? readFileSync(stdoutFile) : Buffer.alloc(0);
const out = raw[0] === 0xff && raw[1] === 0xfe ? raw.toString('utf16le') : raw.toString('utf8');
const m = out.match(/VERIFY PASS \((\d+) checks, (\d+) loans\)/);
log(m ? `gate: ${m[0]}` : 'gate FAILED: no VERIFY PASS line');
const secret = /(ed25519:|private key|secret|seed phrase|FIADOR_[A-Z_]*KEY=)/i.test(out);
log(secret ? 'gate FAILED: secret-like text in stdout' : 'gate: no secret pattern in stdout');
process.exit(m && !secret ? 0 : 1);
