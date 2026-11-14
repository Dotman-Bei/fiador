// Playwright browser scenes (S1, S4, S5, S6, S7) from the PRODUCTION build served on 127.0.0.1:5231/fiador/.
// Headless Chrome (installed Google Chrome, temporary profile, no extensions, no wallet), viewport 1920x980 (the stage).
// Read-only: it only loads pages and clicks view controls. Every scene waits for the "Live" tag and asserts what is on screen;
// a failed gate retakes after a pause (public RPC rate limit); out of retakes the scene is reported BLOCKED, never staged.
//   node capture-scenes.mjs S1 S4 ...   (default: all)
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, 'capture');
mkdirSync(out, { recursive: true });
const BASE = 'http://127.0.0.1:5231/fiador/';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const W = 1920, H = 980;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const bodyText = (page) => page.evaluate(() => document.body.innerText);

async function waitLive(page, where) {
  if (where === 'landing') await page.waitForFunction(() => /Live · read from NEAR testnet/.test(document.body.innerText), null, { timeout: 40000 });
  else await page.waitForSelector('button[aria-label^="Data status: Live"]', { timeout: 40000 });
  const t = await bodyText(page);
  if (/status unavailable|Unavailable|could not be read|Stale/.test(t)) throw new Error('page shows unavailable/stale text');
}

/** Eased smooth scroll to a y offset (or an element's top minus pad) over ms. */
async function scrollTo(page, target, ms = 2500, pad = 100) {
  await page.evaluate(({ target, ms, pad }) => new Promise((done) => {
    const el = typeof target === 'string' ? document.querySelector(target) : null;
    const to = el ? el.getBoundingClientRect().top + window.scrollY - pad : target;
    const from = window.scrollY;
    const t0 = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - t0) / ms);
      const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      window.scrollTo(0, from + (to - from) * e);
      if (p < 1) requestAnimationFrame(step); else done();
    };
    requestAnimationFrame(step);
  }), { target, ms, pad });
}

const SCENES = {
  S1: {
    url: BASE, live: 'landing',
    async run(page, a) {
      await sleep(6500);
      a.h1 = await page.locator('h1').first().innerText();
      await scrollTo(page, '#problem', 3200, 120);
      await sleep(6500);
    },
    async check(page, a) {
      const t = await bodyText(page);
      const stations = await page.locator('.chain .station').count();
      const inView = await page.evaluate(() => { const r = document.querySelector('#problem')?.getBoundingClientRect(); return !!r && r.top < innerHeight && r.bottom > 0; });
      return [
        ['h1 equals the hero line', a.h1 === 'Short until the payout lands? Your DAO can lend you the gap.', a.h1],
        ['six stations', stations === 6, String(stations)],
        ['Live tag', /Live · read from NEAR testnet/.test(t), ''],
        ['problem band in view', inView, ''],
      ];
    },
  },
  S4: {
    url: BASE, live: 'landing',
    async run(page, a) {
      await page.getByRole('radio', { name: 'With a co-signer' }).click();
      await sleep(600);
      await page.getByRole('radio', { name: /^Loan 0,/ }).click();
      await sleep(900);
      await scrollTo(page, '#instrument', 1500, 90);
      await sleep(7000);
      await page.getByRole('radio', { name: 'Desk' }).click();
      await sleep(7500);
      a.title = await page.locator('.inst-title').first().innerText();
    },
    async check(page, a) {
      const t = await bodyText(page);
      const stations = await page.locator('.chain .station').count();
      return [
        ['title #0 ada-1 borrowed 6 NEAR', /#0\s+ada-1 borrowed 6 NEAR/.test(a.title), a.title],
        ['REPAID stamp', /REPAID/i.test(await page.locator('.inst-head').innerText()), ''],
        ['six stations', stations === 6, String(stations)],
        ['the desk filed proposal #6', /the desk filed proposal #6/.test(t) && /Sputnik · proposal #6/.test(t), ''],
        ["by the desk's one vote, no council vote", /by the desk's one vote, 1 of 1/.test(t) && /no council vote/.test(t), ''],
        ['no "status unavailable"', !/status unavailable/.test(t), ''],
        ['The desk can / cannot', /The desk can/.test(t) && /The desk cannot/.test(t), ''],
        ['0 access keys', /0 access keys/.test(t), ''],
        ['Live tag', /Live · read from NEAR testnet/.test(t), ''],
      ];
    },
  },
  S5: {
    url: `${BASE}app/`, live: 'board',
    async run(page, a) {
      await sleep(2500);
      await scrollTo(page, '#book', 2800, 110);
      await sleep(3800);
      await scrollTo(page, '#members', 2600, 110);
      await sleep(3800);
      await scrollTo(page, 100000, 2800);
      await sleep(3200);
      a.rows = await page.locator('section[aria-labelledby="book"] tbody tr').count();
    },
    async check(page, a) {
      const t = await bodyText(page);
      return [
        ['loan book has 12 rows (#0 to #11)', a.rows === 12, String(a.rows)],
        ['loan #11 Repaid row', /#11[\s\S]{0,160}REPAID/i.test(t), ''],
        ['member standing 8 NEAR for goodkale2741', /goodkale2741\.testnet[\s\S]{0,60}member[\s\S]{0,30}8 NEAR/.test(t), ''],
        ['footer scripted-council line', /three scripted accounts sharing one operator key/.test(t), ''],
        ['Live chip', (await page.locator('button[aria-label^="Data status: Live"]').count()) === 1, ''],
      ];
    },
  },
  S6: {
    url: `${BASE}app/#/loans/3`, live: 'board',
    async run(page, a) {
      await sleep(7500);
      a.h3 = await page.locator('h1').first().innerText();
      a.t3 = await bodyText(page);
      await page.evaluate(() => { location.hash = '#/loans/7'; });
      await sleep(900);
      await page.waitForSelector('button[aria-label^="Data status: Live"]', { timeout: 40000 });
      await sleep(7000);
      a.h7 = await page.locator('h1').first().innerText();
      a.t7 = await bodyText(page);
    },
    async check(page, a) {
      return [
        ['Loan #3 page', /Loan #3/.test(a.h3), a.h3],
        ['loan #3 Defaulted, proposal #9', /DEFAULTED/i.test(a.t3) && /#9\b/.test(a.t3), ''],
        ['Loan #7 page', /Loan #7/.test(a.h7), a.h7],
        ['loan #7 Defaulted, proposal #15', /DEFAULTED/i.test(a.t7) && /#15\b/.test(a.t7), ''],
        ['Live chip', (await page.locator('button[aria-label^="Data status: Live"]').count()) === 1, ''],
      ];
    },
  },
  S7: {
    url: `${BASE}app/`, live: 'board',
    async run(page, a) {
      await sleep(1500);
      await page.getByRole('link', { name: /Desk & proof/ }).first().click();
      await page.waitForSelector('.check-list li', { timeout: 40000 });
      await page.waitForFunction(() => document.querySelectorAll('.check-list li').length >= 20, null, { timeout: 60000 });
      await sleep(8500);
      a.pass = await page.locator('.check-pass').count();
      a.fail = await page.locator('.check-fail').count();
      a.summary = await page.locator('.checks-summary').first().innerText();
    },
    async check(page, a) {
      return [
        ['all checks Pass, none Fail', a.fail === 0 && a.pass >= 20, `pass ${a.pass}, fail ${a.fail}`],
        ['summary line', /\d+ checks?/.test(a.summary), a.summary],
        ['Live chip', (await page.locator('button[aria-label^="Data status: Live"]').count()) === 1, ''],
      ];
    },
  },
};

async function takeOne(browser, id, scene) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const mp4 = resolve(out, `${id}.mp4`);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-use_wallclock_as_timestamps', '1', '-f', 'image2pipe', '-c:v', 'mjpeg', '-i', '-',
    '-vf', `fps=30,scale=${W}:${H},tpad=stop_mode=clone:stop_duration=1,format=yuv420p`, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '14', mp4], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((r) => ff.on('exit', r));
  try {
    await page.goto(scene.url, { waitUntil: 'load' });
    await waitLive(page, scene.live); // the gate before filming: the page is Live
    const wall0 = new Date().toISOString();
    await page.screencast.start({ quality: 95, size: { width: W, height: H }, onFrame: ({ data }) => { try { ff.stdin.write(data); } catch { /* closed */ } } });
    const a = {};
    await scene.run(page, a);
    await page.screencast.stop();
    const results = await scene.check(page, a);
    ff.stdin.end(); await done;
    await ctx.close();
    const failed = results.filter((r) => !r[1]);
    return { ok: failed.length === 0, results, wall0 };
  } catch (err) {
    try { await page.screencast.stop(); } catch { /* not started */ }
    ff.stdin.end(); await done; await ctx.close();
    return { ok: false, results: [['scene ran', false, String(err.message ?? err)]], wall0: null };
  }
}

const ids = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(SCENES);
const browser = await chromium.launch({ executablePath: existsSync(CHROME) ? CHROME : undefined, headless: true });
const report = {};
for (const id of ids) {
  let final = null;
  for (let take = 1; take <= 3; take++) {
    console.log(`${id} take ${take} ...`);
    const r = await takeOne(browser, id, SCENES[id]);
    for (const [name, pass, note] of r.results) console.log(`  ${pass ? 'PASS' : 'FAIL'} ${name}${note ? ': ' + note : ''}`);
    if (r.ok) { final = { take, ...r }; break; }
    console.log(`  take ${take} failed its gate; pausing 20 s before a retake`);
    await sleep(20000);
  }
  report[id] = final ? { status: 'recorded', take: final.take, wall: final.wall0, results: final.results } : { status: 'BLOCKED' };
  console.log(`${id}: ${final ? `recorded (take ${final.take})` : 'BLOCKED'}`);
  await sleep(6000);
}
await browser.close();
writeFileSync(resolve(out, `scenes-report-${Date.now()}.json`), JSON.stringify(report, null, 2));
