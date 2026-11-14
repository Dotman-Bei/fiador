/**
 * `npm run verify`, in the browser: the same reads as scripts/lib/inspect.ts gatherVerifyInput (which imports node:fs,
 * so it cannot be bundled), then the same pure checks, runChecks from src/lib/verify.ts. Each read is reported as it
 * completes, as a real count, never as a percentage.
 */
import type { Deployment } from '../../../src/lib/deployments';
import { parseProposal } from '../../../src/lib/sputnik';
import type { Policy, ProposalOutput } from '../../../src/lib/sputnik';
import { runChecks } from '../../../src/lib/verify';
import type { Check, VerifyInput } from '../../../src/lib/verify';
import { readDeskParallel } from './reads';
import type { Reader } from './reads';

export interface ReadStep {
  key: string;
  label: string;
  done: boolean;
}

export const FIRST_STEPS: readonly ReadStep[] = [
  { key: 'factory', label: 'DAO factory settings', done: false },
  { key: 'policy', label: 'DAO policy', done: false },
  { key: 'desk', label: 'Desk config, members, loans and requests', done: false },
  { key: 'keys', label: 'Desk access keys', done: false },
];

export async function gatherVerifyInputWeb(
  reader: Reader,
  deployment: Deployment,
  onStep: (steps: ReadStep[]) => void = () => undefined,
): Promise<VerifyInput> {
  let steps: ReadStep[] = FIRST_STEPS.map((s) => ({ ...s }));
  const done = (key: string): void => {
    steps = steps.map((s) => (s.key === key ? { ...s, done: true } : s));
    onStep(steps);
  };
  onStep(steps);
  const track = <T,>(key: string, p: Promise<T>): Promise<T> =>
    p.then((v) => {
      done(key);
      return v;
    });
  const [factoryInfo, policy, desk, deskKeyCount] = await Promise.all([
    track('factory', reader.view<{ factory_id: string; auto_update: boolean }>(deployment.dao, 'get_factory_info')),
    track('policy', reader.view<Policy>(deployment.dao, 'get_policy')),
    track('desk', readDeskParallel(reader, deployment.desk)),
    track('keys', reader.accessKeyCount(deployment.desk)),
  ]);
  const ids = [...new Set(desk.loans.flatMap((l) => (l.proposal_id === null ? [] : [l.proposal_id])))].sort((a, b) => a - b);
  steps = [...steps, ...ids.map((id) => ({ key: `p${id}`, label: `Sputnik proposal #${id}`, done: false }))];
  onStep(steps);
  const proposals = new Map<number, ProposalOutput>();
  await Promise.all(
    ids.map(async (id) => {
      proposals.set(id, parseProposal(await reader.view<unknown>(deployment.dao, 'get_proposal', { id })));
      done(`p${id}`);
    }),
  );
  return { deployment, factoryInfo, policy, config: desk.config, deskKeyCount, members: desk.members, loans: desk.loans, proposals };
}

export interface VerifyRun {
  checks: Check[];
  input: VerifyInput;
  ranAtMs: number;
}

export async function runVerifyWeb(reader: Reader, deployment: Deployment, nowMs: () => number, onStep?: (steps: ReadStep[]) => void): Promise<VerifyRun> {
  const input = await gatherVerifyInputWeb(reader, deployment, onStep);
  return { checks: runChecks(input), input, ranAtMs: nowMs() };
}

/** The check for one loan, as named by runChecks ("loan #3 (Defaulted) matches its Sputnik proposal"). */
export function loanCheck(checks: readonly Check[], loanId: number): Check | undefined {
  return checks.find((c) => c.name.startsWith(`loan #${loanId} (`));
}
