/** npm run story:check -- --run <id> — read-only gate for the story run. */
import { readFileSync } from 'node:fs';
import type { LoanView, MemberView } from '../src/lib/desk';
import { RpcClient } from '../src/lib/rpc';
import { flag } from './lib/args';
import { readDeployment } from './lib/inspect';
import { checkStory, isStoryRecord } from './lib/story-expect';

async function main(): Promise<void> {
  const run = flag(process.argv.slice(2), 'run') ?? '1';
  const path = `deployments/story-${run}.json`;
  const record: unknown = JSON.parse(readFileSync(path, 'utf8'));
  if (!isStoryRecord(record)) throw new Error(`${path} is not a story record`);
  const d = readDeployment();
  const rpc = new RpcClient(d.rpc);
  const loans = new Map<number, LoanView>();
  for (const id of Object.values(record.loans)) {
    const loan = await rpc.view<LoanView | null>(d.desk, 'get_loan', { loan_id: id });
    if (loan !== null) loans.set(id, loan);
  }
  const members = new Map<string, MemberView>();
  for (const id of Object.values(record.personas)) {
    const m = await rpc.view<MemberView | null>(d.desk, 'get_member', { account_id: id });
    if (m !== null) members.set(id, m);
  }
  const problems = checkStory(record, loans, members);
  if (problems.length > 0) {
    console.log(`STORY FAIL run=${run}\n- ${problems.join('\n- ')}`);
    process.exit(1);
  }
  console.log(`STORY PASS run=${run} loans=${Object.values(record.loans).join(',')}`);
}

main().catch((err: unknown) => {
  console.error(`STORY FAIL: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
