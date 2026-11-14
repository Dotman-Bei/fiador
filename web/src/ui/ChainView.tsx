/** A loan's stations on a ruled line: horizontal on the landing at desktop width, vertical on the loan page and phones. */
import { utcTime } from '../data/format';
import type { Party, Station } from '../landing/chain';

export function ChainView({ stations, loanId, party = null, vertical = false }: { stations: readonly Station[]; loanId: number; party?: Party | null; vertical?: boolean }) {
  const anyByParty = party !== null && stations.some((s) => s.party === party);
  return (
    <ol className={`chain${vertical ? ' chain-v' : ''}`} key={`${loanId}`} aria-label={`The steps of loan ${loanId}`}>
      {stations.map((s, i) => {
        const mine = party !== null && s.party === party;
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
