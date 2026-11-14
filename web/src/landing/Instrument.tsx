/** The landing hero: the live chain instrument. Two controls (lane, party) with a real effect on real desk data. */
import type { Lane } from '../../../src/lib/desk';
import type { Deployment } from '../../../src/lib/deployments';
import type { Snapshot } from '../data/reads';
import { errorWords } from '../data/store';
import { ago, near, utcTime } from '../data/format';
import { shortAccount, stampWords } from '../ledger';
import { Stamp } from '../board/bits';
import { Prov } from '../board/states';
import type { Freshness } from '../board/states';
import { Segmented } from '../ui/Segmented';
import { boundaryOf, laneLoans, LANES, PARTIES, partyNote, stationsOf } from './chain';
import type { Party } from './chain';

export interface Selection {
  lane: Lane;
  loanId: number | null;
  party: Party;
}

export const DEFAULT_SELECTION: Selection = { lane: 'Cosigned', loanId: null, party: 'desk' };

/** Station names shown while reading or when testnet cannot be read: the steps every loan goes through (README). */
const STEP_RULES: readonly { name: string; rule: string }[] = [
  { name: 'Asked', rule: 'a member asks the desk for NEAR' },
  { name: 'Co-signed', rule: 'above their unused standing, another member covers the gap' },
  { name: 'Filed', rule: 'the desk files a Sputnik Transfer proposal' },
  { name: 'Approved', rule: "the desk's one vote, or the council's 2 of 3" },
  { name: 'Paid', rule: 'the DAO pays the borrower from its treasury' },
  { name: 'Closed', rule: 'repaid on time, repaid late, or defaulted' },
];

export function InstrumentView({
  deployment,
  snap,
  fresh,
  error,
  elapsedMs,
  sel,
  onSelect,
  onRetry,
}: {
  deployment: Deployment | null;
  snap: Snapshot | null;
  fresh: Freshness;
  error: string | null;
  elapsedMs: number;
  sel: Selection;
  onSelect: (s: Selection) => void;
  onRetry: () => void;
}) {
  const laneControl = (
    <div className="inst-control">
      <p className="inst-label" id="lane-label">Follow a real loan</p>
      <Segmented label="Follow a real loan, by lane" options={LANES.map((l) => ({ value: l.key, label: l.label }))} value={sel.lane} onChange={(lane) => onSelect({ ...sel, lane, loanId: null })} />
    </div>
  );

  if (deployment === null) {
    return (
      <div className="instrument">
        <div className="inst-card">
          <p className="inst-title">The demo DAO has not been seeded in this build, so there is no loan to follow.</p>
        </div>
      </div>
    );
  }

  if (snap === null) {
    const down = error !== null;
    return (
      <div className="instrument">
        <div className="inst-controls">{laneControl}</div>
        <div className={`inst-card${down ? ' inst-down' : ''}`} aria-busy={!down}>
          <p className="inst-title">
            {down ? `NEAR testnet could not be read: ${errorWords(error)}.` : `Reading the loan book from NEAR testnet · ${ago(elapsedMs)}`}
          </p>
          <ol className="chain chain-empty">
            {STEP_RULES.map((s) => (
              <li key={s.name} className="station done-pending">
                <span className="station-dot" aria-hidden="true" />
                <p className="station-name">{s.name}</p>
                {down ? <p className="station-line">{s.rule}</p> : null}
              </li>
            ))}
          </ol>
          {down ? (
            <div className="inst-foot">
              <Prov kind="rules">the steps every loan goes through, from the README; no live figures until a read succeeds</Prov>
              <button type="button" className="btn btn-quiet btn-sm" onClick={onRetry}>Retry now</button>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  const { all, pick } = laneLoans(snap.desk.loans, sel.lane);
  const loan = (sel.loanId === null ? null : all.find((l) => l.id === sel.loanId)) ?? pick;
  const root = deployment.root;
  const host = (() => {
    try {
      return new URL(deployment.rpc).host;
    } catch {
      return deployment.rpc;
    }
  })();

  return (
    <div className="instrument">
      <div className="inst-controls">
        {laneControl}
        {all.length > 1 ? (
          <div className="inst-control">
            <p className="inst-label">Loans in this lane</p>
            <Segmented
              label="Loans in this lane"
              className="seg-loans"
              options={all.map((l) => ({ value: String(l.id), label: <>#{l.id} <Stamp status={l.status} flat /></>, name: `Loan ${l.id}, ${stampWords(l.status)}` }))}
              value={String(loan?.id ?? '')}
              onChange={(v) => onSelect({ ...sel, loanId: Number(v) })}
            />
          </div>
        ) : null}
      </div>

      <div className="inst-card">
        {loan === null ? (
          <p className="inst-title" aria-live="polite">No loan has gone through this lane yet.</p>
        ) : (
          <>
            <div className="inst-head">
              <p className="inst-title" aria-live="polite">
                <span className="id">#{loan.id}</span> {shortAccount(loan.borrower, root)} borrowed {near(loan.principal)}
              </p>
              <Stamp status={loan.status} />
            </div>
            <Chain loan={loan} snap={snap} deployment={deployment} party={sel.party} />
          </>
        )}

        <div className="inst-party">
          <div className="inst-control">
            <p className="inst-label">Who can do what</p>
            <Segmented label="Who can do what, by party" options={PARTIES.map((p) => ({ value: p.key, label: p.label }))} value={sel.party} onChange={(party) => onSelect({ ...sel, party })} />
          </div>
          <Boundary party={sel.party} snap={snap} deployment={deployment} fresh={fresh} loanNote={loan === null ? null : partyNote(sel.party, loan, stationsOf(loan, loan.proposal_id === null ? undefined : snap.proposals[loan.proposal_id], { deployment, params: snap.desk.config.params }))} />
        </div>

        <div className="inst-foot">
          <Prov kind="live" fresh={fresh}>through <span className="id">{host}</span>; every step names its source</Prov>
        </div>
      </div>
    </div>
  );
}

function Chain({ loan, snap, deployment, party }: { loan: NonNullable<ReturnType<typeof laneLoans>['pick']>; snap: Snapshot; deployment: Deployment; party: Party }) {
  const proposal = loan.proposal_id === null ? undefined : snap.proposals[loan.proposal_id];
  const stations = stationsOf(loan, proposal, { deployment, params: snap.desk.config.params });
  const anyByParty = stations.some((s) => s.party === party);
  return (
    <ol className="chain" key={`${loan.id}`} aria-label={`The steps of loan ${loan.id}`}>
      {stations.map((s, i) => {
        const mine = s.party === party;
        return (
          <li key={s.key} className={`station done-${s.done}${anyByParty && !mine ? ' dim' : ''}${mine ? ' mine' : ''}`} style={{ ['--i' as string]: i }}>
            <span className="station-dot" aria-hidden="true" />
            <p className="station-name">
              {s.name}
              {mine ? <span className="vh"> (a step by the selected party)</span> : null}
            </p>
            {s.lines.map((line) => (
              <p key={line} className="station-line">{line}</p>
            ))}
            {s.time === null ? (s.timeNote === null ? null : <p className="station-note">{s.timeNote}</p>) : <p className="station-time">{utcTime(s.time)}</p>}
            <p className="station-src">{s.source}</p>
          </li>
        );
      })}
    </ol>
  );
}

function Boundary({ party, snap, deployment, fresh, loanNote }: { party: Party; snap: Snapshot; deployment: Deployment; fresh: Freshness; loanNote: string | null }) {
  const b = boundaryOf(party, { policy: snap.policy, deskKeys: snap.deskKeys, deployment, visitorDeposit: snap.desk.config.params.visitor_deposit });
  return (
    <div className="boundary-wrap" aria-live="polite">
      {loanNote === null ? null : <p className="party-note">{loanNote}</p>}
      <div className="boundary">
        <div>
          <p className="boundary-head">{b.title} can</p>
          <ul>{b.can.length === 0 ? <li>nothing</li> : b.can.map((c) => <li key={c}>{c}</li>)}</ul>
        </div>
        <div>
          <p className="boundary-head">{b.title} cannot</p>
          <ul>{b.cannot.map((c) => <li key={c}>{c}</li>)}</ul>
        </div>
      </div>
      {b.sources.map((s) => (s.live ? <Prov key={s.text} kind="live" fresh={fresh}>{s.text}</Prov> : <Prov key={s.text} kind="rules">{s.text}</Prov>))}
    </div>
  );
}
