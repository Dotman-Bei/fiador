import { AbsoluteFill } from 'remotion';
import data from './generated/script.json';
import { C, Chip, CaptionStrip, Hatch, MONO, SANS, SERIF, STAGE_H, STRIP_H } from './ui';

interface Scene { id: string; seconds: number; visual: string; cue: string; driver: string; gate: string; narration: string }
const scenes = data.scenes as Scene[];

const TAGS: Record<string, string> = {
  S2: 'Live: a real wallet, a real transaction, NEAR testnet, 14 Nov',
  S3: 'Live: a real wallet, a real transaction, NEAR testnet, 14 Nov',
  S4: 'Scripted-run loan: made by the scripted story on 13 Nov',
};

const firstLine = (text: string): { words: string[]; active: number } => ({ words: text.split(/\s+/).slice(0, 8), active: 2 });

const short = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

const Honesty = () => (
  <AbsoluteFill style={{ background: C.ground, fontFamily: SERIF, color: C.ink }}>
    <div style={{ position: 'absolute', left: 140, top: 100, fontSize: 56, letterSpacing: -0.5 }}>Fiador</div>
    <div style={{ position: 'absolute', left: 140, top: 230, right: 140 }}>
      {[
        'Testnet only. Unaudited. Not real money.',
        'The desk is frozen: 0 access keys, no admin, no upgrade.',
        'The council is three scripted accounts sharing one operator key, and the first loans came from a scripted run.',
      ].map((l, i) => (
        <div key={i} style={{ fontSize: i === 2 ? 52 : 62, lineHeight: 1.22, padding: '34px 0', borderTop: `2px solid ${C.ink}22`, letterSpacing: -0.4 }}>{l}</div>
      ))}
      <div style={{ borderTop: `2px solid ${C.ink}22` }} />
    </div>
  </AbsoluteFill>
);

export const Outro = () => (
  <AbsoluteFill style={{ background: C.ground, color: C.ink, alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
    <div style={{ fontFamily: SERIF, fontSize: 150, letterSpacing: -2 }}>Fiador</div>
    <div style={{ fontFamily: SERIF, fontSize: 48, color: C.ink2, marginTop: 8 }}>a credit union seat for Sputnik DAOs</div>
    <div style={{ fontFamily: MONO, fontSize: 40, color: C.accent, marginTop: 70 }}>github.com/Dotman-Bei/fiador</div>
    <div style={{ fontFamily: SANS, fontSize: 28, color: C.ink2, marginTop: 28 }}>NEAR testnet · Social Money track · built at NEAR HACKATHON</div>
  </AbsoluteFill>
);

export const Storyboard = ({ sceneId }: { sceneId: string }) => {
  if (sceneId === 'OUTRO') return <Outro />;
  const s = scenes.find((x) => x.id === sceneId);
  if (!s) return <AbsoluteFill style={{ background: '#fff', fontSize: 60 }}>unknown scene {sceneId}</AbsoluteFill>;
  const cap = firstLine(s.narration);
  if (s.id === 'S9') {
    return (
      <AbsoluteFill>
        <Honesty />
        <CaptionStrip words={cap.words} active={cap.active} />
        <Chip style={{ right: 30, top: 24, fontSize: 20 }}>STORYBOARD {s.id} · {s.seconds} s · Remotion card (not footage)</Chip>
      </AbsoluteFill>
    );
  }
  const live = s.id === 'S2' || s.id === 'S3';
  const label = `FOOTAGE SLOT · ${s.id} · ${s.seconds} s · ${s.driver}${live ? " · LIVE: builder's own Chrome and screen" : ''}`;
  return (
    <AbsoluteFill style={{ background: C.band }}>
      <Hatch label={label} sub={short(s.visual.replaceAll('**', ''), 420)} live={live} />
      {TAGS[s.id] ? <Chip style={{ left: live ? 110 : 30, top: 24 }}>{TAGS[s.id]}</Chip> : null}
      {live ? <Chip style={{ right: 110, top: 24, fontFamily: MONO }}>capture clock 14:07:31 UTC</Chip> : null}
      {s.id === 'S6' ? (
        <Chip style={{ left: 30, bottom: STRIP_H + 24, fontSize: 26 }}>loan #7: a real miss under a 120 s term; the council has since raised the term to 600 s (proposal 16)</Chip>
      ) : null}
      <CaptionStrip words={cap.words} active={cap.active} />
      <div style={{ position: 'absolute', right: 30, top: STAGE_H - 44, fontFamily: SANS, fontSize: 20, color: '#8d7f6d' }}>storyboard · stage 1920×{STAGE_H} · caption strip {STRIP_H}px</div>
    </AbsoluteFill>
  );
};
