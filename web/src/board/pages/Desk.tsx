/**
 * Desk and proof (`#/desk`): the DAO policy laid out as read, the desk's keys and parameters, and every check
 * `npm run verify` makes, run in the browser on the first visit (and again on request).
 */
import type { DeskParams } from '../../../../src/lib/desk';
import type { Deployment } from '../../../../src/lib/deployments';
import { accountUrl } from '../../../../src/lib/deployments';
import { DESK_ROLE, COUNCIL_ROLE } from '../../../../src/lib/sputnik';
import type { RolePermission, VotePolicy } from '../../../../src/lib/sputnik';
import { REPO_URL } from '../../deployment';
import type { Snapshot } from '../../data/reads';
import { duration, near } from '../../data/format';
import { ChecksView } from '../../proof/Checks';
import type { ChecksState } from '../../proof/Checks';
import { Id } from '../bits';
import { Prov } from '../states';
import type { Freshness } from '../states';

function votePolicyWords(v: VotePolicy): string {
  const t = typeof v.threshold === 'string' ? v.threshold : `${v.threshold[0]}/${v.threshold[1]}`;
  return `${v.weight_kind === 'RoleWeight' ? 'one vote per member' : 'token weight'}, quorum ${v.quorum}, threshold ${t}`;
}

function who(role: RolePermission): string[] {
  if (role.kind === 'Everyone') return ['everyone'];
  if ('Group' in role.kind) return role.kind.Group;
  return [role.kind.Member];
}

/** A Sputnik period in nanoseconds, in words. */
export function nsPeriod(ns: string): string {
  if (!/^\d+$/.test(ns)) return ns;
  const sec = Number(BigInt(ns) / 1_000_000_000n);
  if (sec % 86_400 === 0) return `${sec / 86_400} day${sec === 86_400 ? '' : 's'}`;
  return duration(sec);
}

export function paramRows(p: DeskParams): { label: string; value: string; raw: string }[] {
  return [
    { label: "Starter standing (the council's grant)", value: near(p.starter_standing), raw: p.starter_standing },
    { label: 'Maximum standing', value: near(p.max_standing), raw: p.max_standing },
    { label: 'Growth per on-time repayment', value: `up to ${near(p.growth_step)}`, raw: p.growth_step },
    { label: 'Book cap (all open loans together)', value: near(p.book_cap), raw: p.book_cap },
    { label: 'Loan term', value: duration(p.loan_term_sec), raw: `${p.loan_term_sec} s` },
    { label: 'Grace period after the term', value: duration(p.grace_sec), raw: `${p.grace_sec} s` },
    { label: 'Request window (waiting for a co-signer)', value: duration(p.request_ttl_sec), raw: `${p.request_ttl_sec} s` },
    { label: 'Visitor seats', value: String(p.visitor_slots), raw: String(p.visitor_slots) },
    { label: 'Visitor starting standing', value: near(p.visitor_starter), raw: p.visitor_starter },
    { label: 'Visitor seat window', value: duration(p.visitor_window_sec), raw: `${p.visitor_window_sec} s` },
    { label: 'Visitor deposit (refunded when the seat is recycled)', value: near(p.visitor_deposit), raw: p.visitor_deposit },
    { label: 'Proposal bond the desk attaches', value: near(p.proposal_bond), raw: p.proposal_bond },
  ];
}

export function DeskView({ deployment, snap, fresh, checks, onRunChecks }: { deployment: Deployment; snap: Snapshot; fresh: Freshness; checks: ChecksState; onRunChecks: () => void }) {
  const policy = snap.policy;
  const deskRole = policy.roles.find((r) => r.name === DESK_ROLE);
  const seated = deskRole !== undefined && who(deskRole).includes(deployment.desk);
  const elsewhere = policy.roles.filter((r) => r.name !== DESK_ROLE && who(r).includes(deployment.desk)).map((r) => r.name);
  const factory = checks.phase === 'done' ? checks.run.input.factoryInfo : null;
  return (
    <>
      <header className="page-head">
        <h1 className="page-title" data-page-title tabIndex={-1}>Desk and proof</h1>
        <p className="page-sub">
          The desk's seat in the DAO policy, its keys, its limits, and every check <code>npm run verify</code> makes, run here in your browser. Testnet only and
          unaudited.
        </p>
      </header>

      <div className="detail-grid">
        <div className="detail-main">
          <section className="card side-card" aria-labelledby="checks-h">
            <h2 id="checks-h" className="section-title">The checks</h2>
            <ChecksView state={checks} onRun={onRunChecks} nowMs={fresh.nowMs} />
          </section>

          <section className="block" aria-labelledby="policy-h">
            <h2 id="policy-h" className="section-title">The DAO policy, as read</h2>
            <div className="wide-only">
              <table className="table policy-table">
                <caption className="vh">Every role in the DAO policy</caption>
                <thead>
                  <tr>
                    <th scope="col">Role</th>
                    <th scope="col">Who</th>
                    <th scope="col">May</th>
                    <th scope="col">Votes</th>
                  </tr>
                </thead>
                <tbody>
                  {policy.roles.map((r) => (
                    <tr key={r.name}>
                      <th scope="row">{r.name}</th>
                      <td>
                        <ul className="id-list">
                          {who(r).map((a) => (
                            <li key={a}><Id>{a}</Id></li>
                          ))}
                        </ul>
                      </td>
                      <td className="id">{r.permissions.length === 0 ? 'nothing' : r.permissions.join(', ')}</td>
                      <td>
                        {Object.keys(r.vote_policy).length === 0
                          ? 'the default vote policy'
                          : Object.entries(r.vote_policy).map(([kind, v]) => (
                              <span key={kind} className="block-line">
                                {kind}: {votePolicyWords(v)}
                              </span>
                            ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="narrow-only slips" aria-label="Every role in the DAO policy">
              {policy.roles.map((r) => (
                <li key={r.name} className="slip">
                  <span className="slip-stub">{r.name}</span>
                  <div className="slip-body">
                    <p className="slip-meta">{who(r).join(', ')}</p>
                    <p className="slip-meta id">{r.permissions.join(', ') || 'nothing'}</p>
                  </div>
                </li>
              ))}
            </ul>
            <dl className="facts">
              <dt>Default vote policy (every other kind)</dt>
              <dd>{votePolicyWords(policy.default_vote_policy)}</dd>
              <dt>Proposal bond</dt>
              <dd>{near(policy.proposal_bond)}</dd>
              <dt>Proposal period</dt>
              <dd>{nsPeriod(policy.proposal_period)}</dd>
            </dl>
            <Prov kind="live" fresh={fresh}>get_policy on <span className="id">{deployment.dao}</span></Prov>
            <Prov kind="rules">the {COUNCIL_ROLE} role is three scripted accounts sharing one operator key (README); on chain it is a real 2-of-3</Prov>
          </section>

          <section className="block" aria-labelledby="params-h">
            <h2 id="params-h" className="section-title">The desk's parameters</h2>
            <dl className="facts params">
              {paramRows(snap.desk.config.params).map((p) => (
                <div key={p.label} className="param">
                  <dt>{p.label}</dt>
                  <dd>
                    {p.value}
                    {p.value === p.raw ? null : <span className="param-raw id">{p.raw}</span>}
                  </dd>
                </div>
              ))}
            </dl>
            <Prov kind="live" fresh={fresh}>get_config on the desk; the council sets every one through an ordinary proposal</Prov>
          </section>
        </div>

        <aside className="detail-side">
          <div className="card side-card">
            <h2 className="section-title">The seat</h2>
            <dl className="facts facts-stack">
              <dt>Seated in the DAO policy</dt>
              <dd className={seated ? 'tone-yes' : 'signal'}>{seated ? 'yes' : 'no'}</dd>
              <dt>May</dt>
              <dd className="id">{deskRole === undefined ? 'no desk role' : deskRole.permissions.join(', ')}</dd>
              <dt>In any other role</dt>
              <dd className={elsewhere.length === 0 ? undefined : 'signal'}>{elsewhere.length === 0 ? 'no' : elsewhere.join(', ')}</dd>
            </dl>
            <Prov kind="live" fresh={fresh} />
          </div>
          <div className="card side-card">
            <h2 className="section-title">Keys and upgrades</h2>
            <dl className="facts facts-stack">
              <dt>Access keys on the desk</dt>
              <dd className={snap.deskKeys === 0 ? 'tone-yes' : 'signal'}>{snap.deskKeys === 0 ? '0: no admin, no upgrade' : `${snap.deskKeys}: not keyless`}</dd>
              <dt>Factory auto-upgrade of the DAO</dt>
              <dd className={factory === null ? 'cell-quiet' : factory.auto_update ? 'signal' : 'tone-yes'}>
                {factory === null ? 'read when the checks run' : factory.auto_update ? 'on' : 'off'}
              </dd>
            </dl>
            <Prov kind="live" fresh={fresh}>access keys every 5 s; factory settings with the checks</Prov>
          </div>
          <div className="card side-card">
            <h2 className="section-title">The code</h2>
            <ul className="link-list">
              <li><a href={`${REPO_URL}/tree/main/contract/desk/src`}>Desk contract source (Rust)</a></li>
              <li><a href={accountUrl(deployment, deployment.desk)}>Desk account <Id>{deployment.desk}</Id></a></li>
              <li><a href={accountUrl(deployment, deployment.dao)}>DAO account <Id>{deployment.dao}</Id></a></li>
            </ul>
            <p className="note">Unaudited hackathon code on NEAR testnet. A fix after the freeze is a new desk the council seats.</p>
          </div>
        </aside>
      </div>
    </>
  );
}
