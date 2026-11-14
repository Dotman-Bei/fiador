import type { CSSProperties, ReactNode } from 'react';

/** Fiador's public design tokens (docs/design/direction.md): ground, ink, one oxblood accent. */
export const C = { ground: '#faf8f3', ink: '#1f1a15', ink2: '#5c5248', accent: '#7b1e2c', band: '#14100c', amber: '#ffd27a' };
export const SERIF = 'Georgia, "Times New Roman", serif';
export const SANS = '"Segoe UI", Arial, sans-serif';
export const MONO = 'Consolas, "Courier New", monospace';

/** Footage lives in a 1920x980 stage; the bottom 100 px is the caption strip. */
export const STAGE_H = 980;
export const STRIP_H = 100;

export const CaptionStrip = ({ words, active }: { words: string[]; active: number }) => (
  <div
    style={{
      position: 'absolute', left: 0, right: 0, bottom: 0, height: STRIP_H, background: C.band,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 120px', fontFamily: SANS,
      fontSize: 40, fontWeight: 500, color: '#fff', letterSpacing: 0.2, whiteSpace: 'nowrap', overflow: 'hidden',
    }}
  >
    {words.map((w, i) => (
      <span key={i} style={{ marginRight: 14, color: i === active ? C.amber : '#fff' }}>{w}</span>
    ))}
  </div>
);

export const Chip = ({ children, style }: { children: ReactNode; style?: CSSProperties }) => (
  <div
    style={{
      position: 'absolute', fontFamily: SANS, fontSize: 24, fontWeight: 600, color: '#fff', background: 'rgba(20,16,12,0.86)',
      padding: '8px 16px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.25)', ...style,
    }}
  >
    {children}
  </div>
);

export const Hatch = ({ label, sub, live }: { label: string; sub: string; live?: boolean }) => (
  <div
    style={{
      position: 'absolute', left: 0, top: 0, width: 1920, height: STAGE_H,
      background: 'repeating-linear-gradient(135deg, #2a231c 0 22px, #251f19 22px 44px)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#efe6d8', fontFamily: SANS, textAlign: 'center',
    }}
  >
    {live ? (
      <div style={{ position: 'absolute', left: 94, top: 0, width: 1732, height: STAGE_H, border: '3px dashed #c98a8a', boxSizing: 'border-box' }} />
    ) : null}
    <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: 1, marginBottom: 22, color: live ? '#ffb3b3' : '#efe6d8' }}>{label}</div>
    <div style={{ fontSize: 30, lineHeight: 1.35, maxWidth: 1300, color: '#d9ccb9' }}>{sub}</div>
  </div>
);
