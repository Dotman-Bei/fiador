/** What a `story --run <id>` must leave on-chain (spec §6), checked read-only by `story:check`. */
import type { LoanStatus, LoanView, MemberView } from '../../src/lib/desk';

export interface StoryRecord {
  run: string;
  at: string;
  personas: { ada: string; bayo: string; chidi: string };
  loans: { money_shot: number; council: number; late: number; defaulted: number; refused: number };
  treasury: { before: string; after_payout: string; after_repay: string };
}

export const EXPECTED_STATUS: Record<keyof StoryRecord['loans'], LoanStatus> = {
  money_shot: 'Repaid',
  council: 'Repaid',
  late: 'RepaidLate',
  defaulted: 'Defaulted',
  refused: 'Refused',
};

/** Final standings in whole NEAR: Ada 4→5 then −1 pledge slashed; Bayo 4→5; Chidi 4→5 then defaulted to 0. */
export const EXPECTED_STANDING_NEAR = { ada: 4n, bayo: 5n, chidi: 0n } as const;

const NEAR = 10n ** 24n;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function isStoryRecord(value: unknown): value is StoryRecord {
  if (!isRecord(value)) return false;
  const p = value['personas'];
  const l = value['loans'];
  const t = value['treasury'];
  return (
    typeof value['run'] === 'string' &&
    typeof value['at'] === 'string' &&
    isRecord(p) &&
    ['ada', 'bayo', 'chidi'].every((k) => typeof p[k] === 'string') &&
    isRecord(l) &&
    Object.keys(EXPECTED_STATUS).every((k) => typeof l[k] === 'number') &&
    isRecord(t) &&
    ['before', 'after_payout', 'after_repay'].every((k) => typeof t[k] === 'string')
  );
}

export function checkStory(record: StoryRecord, loans: ReadonlyMap<number, LoanView>, members: ReadonlyMap<string, MemberView>): string[] {
  const problems: string[] = [];
  for (const [beat, status] of Object.entries(EXPECTED_STATUS) as Array<[keyof StoryRecord['loans'], LoanStatus]>) {
    const loan = loans.get(record.loans[beat]);
    if (loan === undefined) problems.push(`${beat}: loan #${record.loans[beat]} not found`);
    else if (loan.status !== status) problems.push(`${beat}: loan #${loan.id} is ${loan.status}, expected ${status}`);
  }
  for (const who of ['ada', 'bayo', 'chidi'] as const) {
    const m = members.get(record.personas[who]);
    const want = EXPECTED_STANDING_NEAR[who] * NEAR;
    if (m === undefined) problems.push(`${who}: ${record.personas[who]} is not a member`);
    else if (BigInt(m.standing) !== want) problems.push(`${who}: standing ${m.standing}, expected ${want.toString()}`);
  }
  if (BigInt(record.treasury.after_repay) < BigInt(record.treasury.before)) {
    problems.push(`treasury did not recover: ${record.treasury.before} -> ${record.treasury.after_repay}`);
  }
  return problems;
}
