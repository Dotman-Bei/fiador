/** Topbar search: a WAI-ARIA combobox over the loaded snapshot. `/` or Ctrl+K focuses it; nothing is sent anywhere. */
import { useEffect, useRef, useState } from 'react';
import type { Snapshot } from '../data/reads';
import { search } from './searchIndex';

export function Search({ snap, root }: { snap: Snapshot | null; root: string }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const hits = snap === null ? [] : search(snap, root, q);

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const t = e.target as HTMLElement | null;
      const typing = t !== null && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
      if ((e.key === '/' && !typing) || (e.key.toLowerCase() === 'k' && (e.ctrlKey || e.metaKey))) {
        e.preventDefault();
        input.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const go = (href: string): void => {
    location.hash = href;
    setQ('');
    setOpen(false);
  };
  const showList = open && q.trim().length > 0;

  return (
    <div className="search" role="search">
      <label htmlFor="board-search" className="vh">Find a loan, member or proposal</label>
      <input
        ref={input}
        id="board-search"
        type="search"
        role="combobox"
        autoComplete="off"
        aria-expanded={showList}
        aria-controls="board-search-list"
        aria-autocomplete="list"
        aria-activedescendant={showList && hits[active] !== undefined ? `board-search-${active}` : undefined}
        placeholder="Find a loan, member or proposal"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, Math.max(0, hits.length - 1)));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((a) => Math.max(0, a - 1));
          } else if (e.key === 'Enter') {
            const h = hits[active];
            if (h !== undefined) {
              e.preventDefault();
              go(h.href);
            }
          } else if (e.key === 'Escape') {
            setQ('');
            setOpen(false);
          }
        }}
      />
      <kbd className="search-key" aria-hidden="true">/</kbd>
      {showList ? (
        <ul id="board-search-list" role="listbox" className="search-list" aria-label="Matches">
          {snap === null ? (
            <li className="search-none" role="option" aria-selected={false} aria-disabled="true">Search works once the board is read</li>
          ) : hits.length === 0 ? (
            <li className="search-none" role="option" aria-selected={false} aria-disabled="true">No loan or member matches "{q.trim()}"</li>
          ) : (
            hits.map((h, i) => (
              <li
                key={h.href}
                id={`board-search-${i}`}
                role="option"
                aria-selected={i === active}
                className="search-hit"
                onMouseDown={(e) => {
                  e.preventDefault();
                  go(h.href);
                }}
                onMouseEnter={() => setActive(i)}
              >
                <span className="hit-label">{h.label}</span>
                <span className="hit-detail">{h.detail}</span>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
