/** Desk and proof (`#/desk`): the desk's seat and keys as read, and the checks run in the browser. */
import type { Deployment } from '../../../../src/lib/deployments';
import type { Snapshot } from '../../data/reads';
import { ChecksView } from '../../proof/Checks';
import type { ChecksState } from '../../proof/Checks';
import type { Freshness } from '../states';
import { DeskCard } from './Overview';

export function DeskView({ deployment, snap, fresh, checks, onRunChecks }: { deployment: Deployment; snap: Snapshot; fresh: Freshness; checks: ChecksState; onRunChecks: () => void }) {
  return (
    <>
      <header className="page-head">
        <h1 className="page-title" data-page-title tabIndex={-1}>Desk and proof</h1>
        <p className="page-sub">
          The desk's seat in the DAO policy, its keys, its limits, and every check <code>npm run verify</code> makes, run here in your browser.
        </p>
      </header>
      <div className="detail-grid">
        <section className="detail-main card side-card" aria-labelledby="checks-h">
          <h2 id="checks-h" className="section-title">The checks</h2>
          <ChecksView state={checks} onRun={onRunChecks} nowMs={fresh.nowMs} />
        </section>
        <aside className="detail-side">
          <DeskCard deployment={deployment} snap={snap} fresh={fresh} />
        </aside>
      </div>
    </>
  );
}
