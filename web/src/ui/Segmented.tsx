/**
 * A segmented selector with WAI-ARIA radio group behavior: Tab enters and leaves the group, arrow keys move and select,
 * Home and End jump. The selected option is an ink fill; selection never sends anything.
 */
import { useRef } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';

export interface Option<T extends string> {
  value: T;
  label: ReactNode;
  /** Accessible name when the label is not plain text. */
  name?: string;
}

export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  className = '',
}: {
  label: string;
  options: readonly Option<T>[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  const move = (to: number): void => {
    const n = options.length;
    const i = ((to % n) + n) % n;
    const opt = options[i];
    if (opt === undefined) return;
    onChange(opt.value);
    refs.current[i]?.focus();
  };
  const onKey = (e: KeyboardEvent<HTMLButtonElement>): void => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      move(index + 1);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      move(index - 1);
    } else if (e.key === 'Home') {
      e.preventDefault();
      move(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      move(options.length - 1);
    }
  };
  return (
    <div role="radiogroup" aria-label={label} className={`seg ${className}`}>
      {options.map((o, i) => (
        <button
          key={o.value}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          aria-label={o.name}
          tabIndex={o.value === value ? 0 : -1}
          className="seg-opt"
          onClick={() => onChange(o.value)}
          onKeyDown={onKey}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
