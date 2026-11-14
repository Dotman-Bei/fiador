/** Small shared pieces: the stamp, account names, machine ids. */
import { laneWords, shortAccount, stampInk, stampWords } from '../ledger';

/** The outcome stamp. Upright and compact in lists (`flat`), tilted on detail pages. */
export function Stamp({ status, flat = false }: { status: string; flat?: boolean }) {
  return <span className={`stamp ink-${stampInk(status)}${flat ? ' flat' : ''}`}>{stampWords(status)}</span>;
}

/** An account by the one naming rule: accounts under the demo root by their first label, any other account whole. */
export function Acct({ account, root }: { account: string; root: string }) {
  const short = shortAccount(account, root);
  return short === account ? <span className="acct">{account}</span> : <span className="acct">{short}</span>;
}

/** A machine string (account id, proposal id, hash) in the mono face, where 1/l and 0/O must not be confused. */
export function Id({ children }: { children: string }) {
  return <span className="id">{children}</span>;
}

export function lane(laneKey: string): string {
  return laneWords(laneKey);
}

/** "Accounts under fiador-ops-vmwpxk.testnet are shown by their first label." */
export function NamingNote({ root }: { root: string }) {
  if (root === '') return null;
  return (
    <p className="note">
      Accounts under <span className="id">{root}</span> are shown by their first label; any other account is shown whole.
    </p>
  );
}
