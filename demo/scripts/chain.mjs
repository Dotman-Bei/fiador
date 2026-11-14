// Read-only NEAR testnet checks for the live take. Sends nothing, signs nothing, holds no key.
//   node scripts/chain.mjs before   -> writes capture/before.json and prints it
//   node scripts/chain.mjs status   -> one compact line (used to watch the take)
//   node scripts/chain.mjs check    -> verifies the live take against before.json and prints PASS/RETAKE
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const dep = JSON.parse(readFileSync(resolve(here, '../../deployments/testnet.json'), 'utf8'));
const MEMBER = 'goodkale2741.testnet';
const NEAR = 10n ** 24n;
const fmt = (y) => (Number(BigInt(y) / 10n ** 20n) / 10000).toFixed(4);

async function rpc(method, params, tries = 4) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(dep.rpc, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }) });
      const j = await r.json();
      if (!j.error) return j.result;
    } catch { /* retry */ }
    await new Promise((s) => setTimeout(s, 1500 * (i + 1)));
  }
  throw new Error(`rpc ${method} failed`);
}
async function view(account, method, args = {}) {
  const r = await rpc('query', { request_type: 'call_function', finality: 'final', account_id: account, method_name: method, args_base64: Buffer.from(JSON.stringify(args)).toString('base64') });
  return JSON.parse(Buffer.from(r.result).toString());
}
const balance = async (account) => (await rpc('query', { request_type: 'view_account', finality: 'final', account_id: account })).amount;

async function snapshot() {
  const config = await view(dep.desk, 'get_config');
  const loans = await view(dep.desk, 'get_loans', { from_index: 0, limit: 100 });
  const member = await view(dep.desk, 'get_member', { account_id: MEMBER });
  const requests = await view(dep.desk, 'get_requests', { from_index: 0, limit: 50 });
  return {
    at: new Date().toISOString(),
    loan_count: config.loan_count, book: config.book, request_count: config.request_count, params: config.params,
    dao_balance: await balance(dep.dao), member_balance: await balance(MEMBER),
    member, requests, loans,
  };
}

const mode = process.argv[2];
mkdirSync(resolve(here, '../capture'), { recursive: true });
const beforePath = resolve(here, '../capture/before.json');

if (mode === 'before') {
  const s = await snapshot();
  writeFileSync(beforePath, JSON.stringify(s, null, 2));
  const p = s.params;
  console.log(`BEFORE ${s.at}`);
  console.log(`  loans ${s.loan_count}, book ${fmt(s.book)}, requests waiting ${s.requests.length} (request_count ${s.request_count})`);
  console.log(`  params: term ${p.loan_term_sec} s, grace ${p.grace_sec} s, request ttl ${p.request_ttl_sec} s, book cap ${fmt(p.book_cap)}`);
  console.log(`  DAO balance ${fmt(s.dao_balance)} NEAR`);
  console.log(`  ${MEMBER}: standing ${fmt(s.member.standing)}, unused ${fmt(s.member.unused)}, drawn ${fmt(s.member.drawn)}, open loans ${s.member.open_loans}, repaid_on_time ${s.member.repaid_on_time}, defaults ${s.member.defaults}`);
  console.log(`  ${MEMBER} account balance ${fmt(s.member_balance)} NEAR (for gas)`);
} else if (mode === 'status') {
  const s = await snapshot();
  const last = s.loans.at(-1);
  console.log(`${new Date().toISOString()} loans=${s.loan_count} last=#${last?.id}:${last?.status}:${last?.borrower?.split('.')[0]} standing=${fmt(s.member.standing)} on_time=${s.member.repaid_on_time} dao=${fmt(s.dao_balance)} requests=${s.requests.length}`);
} else if (mode === 'check') {
  if (!existsSync(beforePath)) throw new Error('no capture/before.json');
  const b = JSON.parse(readFileSync(beforePath, 'utf8'));
  const a = await snapshot();
  const id = b.loan_count;
  const loan = a.loans.find((l) => l.id === id);
  const results = [];
  const ok = (name, pass, note) => results.push({ name, pass, note });
  ok('exactly one new loan', a.loan_count === b.loan_count + 1, `loan_count ${b.loan_count} -> ${a.loan_count}`);
  ok(`loan #${id} borrower`, loan?.borrower === MEMBER, loan?.borrower);
  ok(`loan #${id} principal 2 NEAR`, loan !== undefined && BigInt(loan.principal) === 2n * NEAR, loan ? fmt(loan.principal) : 'missing');
  ok(`loan #${id} lane Standing`, loan?.lane === 'Standing', loan?.lane);
  let prop = null;
  if (loan?.proposal_id != null) prop = await view(dep.dao, 'get_proposal', { id: loan.proposal_id });
  ok('proposal id present', loan?.proposal_id != null, `proposal ${loan?.proposal_id}`);
  const t = prop?.kind?.Transfer;
  ok('proposal status Approved', prop?.status === 'Approved', prop?.status);
  ok('proposal is a Transfer of 2 NEAR to the borrower', t !== undefined && t.receiver_id === MEMBER && BigInt(t.amount) === 2n * NEAR, t ? `${t.receiver_id} ${fmt(t.amount)}` : 'not a Transfer');
  ok('proposal filed by the desk (proposer)', prop?.proposer === dep.desk, prop?.proposer);
  ok(`loan #${id} Repaid (not RepaidLate)`, loan?.status === 'Repaid', loan?.status);
  ok('closed before due', loan !== undefined && loan.closed_at_ms > 0 && loan.closed_at_ms <= loan.due_at_ms, loan ? `closed ${new Date(loan.closed_at_ms).toISOString()} due ${new Date(loan.due_at_ms).toISOString()}` : '');
  const step = BigInt(b.params.growth_step), cap = BigInt(b.params.max_standing);
  const want = BigInt(b.member.standing) + step > cap ? cap : BigInt(b.member.standing) + step;
  ok(`standing ${fmt(b.member.standing)} -> ${fmt(want)}`, BigInt(a.member.standing) === want, `standing ${fmt(a.member.standing)}`);
  ok('repaid_on_time +1', a.member.repaid_on_time === b.member.repaid_on_time + 1, `repaid_on_time ${b.member.repaid_on_time} -> ${a.member.repaid_on_time}`);
  ok('DAO balance back to the before record', a.dao_balance === b.dao_balance, `before ${fmt(b.dao_balance)} after ${fmt(a.dao_balance)}`);
  ok('book 0, no request waiting', BigInt(a.book) === 0n && a.requests.length === 0, `book ${fmt(a.book)}, requests ${a.requests.length}`);
  for (const r of results) console.log(`${r.pass ? 'PASS ' : 'FAIL '} ${r.name}: ${r.note}`);
  if (loan) console.log(`  created ${new Date(loan.created_at_ms).toISOString()} closed ${loan.closed_at_ms ? new Date(loan.closed_at_ms).toISOString() : '-'} (${loan.closed_at_ms ? Math.round((loan.closed_at_ms - loan.created_at_ms) / 1000) : '-'} s open)`);
  writeFileSync(resolve(here, '../capture/after.json'), JSON.stringify({ at: a.at, loan, prop, member: a.member, dao_balance: a.dao_balance }, null, 2));
  const pass = results.every((r) => r.pass);
  console.log(pass ? 'RESULT: PASS' : 'RESULT: RETAKE');
  process.exit(pass ? 0 : 1);
} else {
  console.log('usage: chain.mjs before|status|check');
}
