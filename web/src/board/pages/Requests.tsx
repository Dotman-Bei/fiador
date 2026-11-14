/** Requests (`#/requests`): asks held for a co-signer, live, and the ones that expired but are not yet cleared. */
import type { Deployment } from '../../../../src/lib/deployments';
import type { Snapshot } from '../../data/reads';
import { duration, near, utcTime } from '../../data/format';
import { Acct } from '../bits';
import { waitingRows } from '../data';
import { WaitingList } from '../lists';
import { memberHref } from '../router';
import { Empty, Prov } from '../states';
import type { Freshness } from '../states';
import { LINKS } from './Overview';

export function RequestsView({ deployment, snap, fresh }: { deployment: Deployment; snap: Snapshot; fresh: Freshness }) {
  const clock = fresh.phase === 'stale' ? snap.readAtMs : fresh.nowMs;
  const live = waitingRows(snap.desk.requests, clock);
  const expired = snap.desk.requests.filter((r) => r.expired || r.expires_at_ms <= clock);
  const ttl = duration(snap.desk.config.params.request_ttl_sec);
  return (
    <>
      <header className="page-head">
        <h1 className="page-title" data-page-title tabIndex={-1}>Requests</h1>
        <p className="page-sub">
          Asks held for a co-signer. A request appears when a member asks above their unused standing, and lasts {ttl} (the request window the council set). One
          member covers the whole gap from their own standing.
        </p>
      </header>
      <section aria-labelledby="waiting">
        <h2 id="waiting" className="section-title">Waiting for a co-signer</h2>
        {live.length === 0 ? (
          <Empty>No request is waiting for a co-signer. Time left counts down by this device's clock.</Empty>
        ) : (
          <>
            <WaitingList rows={live} root={deployment.root} caption="Requests waiting for a co-signer" memberHref={LINKS.member} />
            <p className="note">Time left counts down by this device's clock from the desk's expiry time.</p>
          </>
        )}
        <Prov kind="live" fresh={fresh} />
      </section>
      {expired.length === 0 ? null : (
        <section className="block" aria-labelledby="expired">
          <h2 id="expired" className="section-title">Expired, not yet cleared</h2>
          <ul className="slips">
            {expired.map((r) => (
              <li key={r.borrower} className="slip">
                <span className="slip-stub" aria-hidden="true">exp.</span>
                <div className="slip-body">
                  <p className="slip-head">
                    <a href={memberHref(r.borrower)} className="slip-who"><Acct account={r.borrower} root={deployment.root} /></a>
                    <span className="slip-amt">{near(r.amount)}</span>
                  </p>
                  <p className="slip-meta">expired {utcTime(r.expires_at_ms)}; it can no longer be co-signed</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
