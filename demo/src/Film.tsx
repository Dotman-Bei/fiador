import { AbsoluteFill, Audio, Easing, OffthreadVideo, Sequence, interpolate, staticFile, useCurrentFrame } from 'remotion';
import plan from './generated/plan.json';
import { Honesty, Outro } from './Storyboard';
import { C, MONO, SANS, STAGE_H, STRIP_H } from './ui';

interface Clip { file: string; from: number; dur: number }
interface Word { text: string; start: number; end: number }
interface Note { from: number; to: number; text: string }
interface SceneT {
  id: string; kind: 'browser' | 'live' | 'term' | 'card'; seconds: number; frames: number; audioSeconds: number; words: Word[]; lead: number;
  clips: Clip[]; tag: string | null; notes: Note[]; zoom: { lastSeconds: number; scale: number; originX: number; originY: number } | null;
}
const FPS = plan.fps;
const scenes = plan.scenes as unknown as SceneT[];

/* ---------- captions: word-timed from Kokoro, one short line at a time ---------- */
const groupWords = (words: Word[]): Word[][] => {
  const out: Word[][] = [];
  let cur: Word[] = [];
  for (const w of words) {
    cur.push(w);
    if (/[.,:;?!]$/.test(w.text) || cur.length >= 8) { out.push(cur); cur = []; }
  }
  if (cur.length) out.push(cur);
  // avoid a one- or two-word orphan line: merge into the previous group
  for (let i = out.length - 1; i > 0; i--) {
    if (out[i]!.length <= 2 && out[i - 1]!.length + out[i]!.length <= 9) { out[i - 1] = [...out[i - 1]!, ...out[i]!]; out.splice(i, 1); }
  }
  return out;
};

const Captions = ({ scene }: { scene: SceneT }) => {
  const frame = useCurrentFrame();
  const t = frame / FPS - scene.lead;
  const groups = groupWords(scene.words);
  let gi = groups.findIndex((g, i) => t >= g[0]!.start - 0.05 && (i === groups.length - 1 || t < groups[i + 1]![0]!.start - 0.05));
  if (t < 0) gi = -1;
  if (gi < 0) return <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: STRIP_H, background: C.band }} />;
  const g = groups[gi]!;
  const active = g.findIndex((w) => t >= w.start && t < w.end);
  const activeIdx = active === -1 ? (t >= g[g.length - 1]!.end ? g.length - 1 : 0) : active;
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: STRIP_H, background: C.band, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 80px', fontFamily: SANS, fontSize: 42, fontWeight: 500, whiteSpace: 'nowrap' }}>
      {g.map((w, i) => (
        <span key={i} style={{ marginRight: 14, color: i === activeIdx ? C.amber : '#fff' }}>{w.text}</span>
      ))}
    </div>
  );
};

/* ---------- small overlays ---------- */
const Chip = ({ children, left, right, top, bottom, mono }: { children: React.ReactNode; left?: number; right?: number; top?: number; bottom?: number; mono?: boolean }) => (
  <div style={{ position: 'absolute', left, right, top, bottom, fontFamily: mono ? MONO : SANS, fontSize: 26, fontWeight: 600, color: '#fff', background: 'rgba(20,16,12,0.88)', padding: '8px 16px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.28)', maxWidth: 1500, lineHeight: 1.25 }}>{children}</div>
);

/* ---------- footage ---------- */
const segmentStarts = (clips: Clip[]) => {
  let acc = 0;
  return clips.map((c) => { const s = acc; acc += Math.round(c.dur * FPS); return s; });
};

const LIVE_K = STAGE_H / 1030; // the display is 1920x1080; the bottom 50 px (taskbar) are cropped, the rest is fitted to the stage
const TERM_K = STAGE_H / 1020;

const Footage = ({ scene }: { scene: SceneT }) => {
  const frame = useCurrentFrame();
  const starts = segmentStarts(scene.clips);
  const k = scene.kind === 'live' ? LIVE_K : scene.kind === 'term' ? TERM_K : 1;
  const srcW = scene.kind === 'term' ? 1920 : 1920, srcH = scene.kind === 'term' ? 1020 : 1080;
  const left = scene.kind === 'browser' ? 0 : (1920 - srcW * k) / 2;
  const w = scene.kind === 'browser' ? 1920 : srcW * k;
  const h = scene.kind === 'browser' ? STAGE_H : srcH * k;
  let zoomStyle: React.CSSProperties = {};
  if (scene.zoom) {
    const zs = scene.frames - Math.round(scene.zoom.lastSeconds * FPS);
    const s = interpolate(frame, [zs, zs + 20], [1, scene.zoom.scale], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic) });
    zoomStyle = { transform: `scale(${s})`, transformOrigin: `${scene.zoom.originX * 100}% ${scene.zoom.originY * 100}%` };
  }
  // live clock: the capture's own start time plus the position in the source file
  let clock: string | null = null;
  if (scene.kind === 'live') {
    let si = 0;
    for (let i = 0; i < starts.length; i++) if (frame >= starts[i]!) si = i;
    const src = scene.clips[si]!.from + (frame - starts[si]!) / FPS;
    clock = new Date(plan.liveOriginMs + src * 1000).toISOString().slice(11, 19);
  }
  return (
    <AbsoluteFill style={{ background: C.band }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: 1920, height: STAGE_H, overflow: 'hidden', background: '#0e0b08', ...zoomStyle }}>
        {scene.clips.map((c, i) => (
          <Sequence key={i} from={starts[i]} durationInFrames={Math.round(c.dur * FPS)}>
            <OffthreadVideo src={staticFile(c.file)} startFrom={Math.round(c.from * FPS)} muted style={{ position: 'absolute', left, top: 0, width: w, height: h }} />
          </Sequence>
        ))}
        {scene.kind === 'live' ? (
          // hide the other extension icons and the profile avatar in Chrome's toolbar (source x 1396 to 1872, y 58 to 104)
          <div style={{ position: 'absolute', left: left + 1396 * k, top: 58 * k, width: (1872 - 1396) * k, height: 46 * k, background: '#50332f' }} />
        ) : null}
      </div>
      {scene.tag ? <Chip left={24} top={18}>{scene.tag}</Chip> : null}
      {clock ? <Chip right={24} top={18} mono>capture clock {clock} UTC</Chip> : null}
      {scene.notes.filter((n) => frame / FPS >= n.from && frame / FPS < n.to).map((n, i) => (
        <Chip key={i} left={24} bottom={STRIP_H + 20}>{n.text}</Chip>
      ))}
    </AbsoluteFill>
  );
};

const SceneView = ({ scene }: { scene: SceneT }) => (
  <AbsoluteFill style={{ background: C.band }}>
    {scene.kind === 'card' ? (
      <div style={{ position: 'absolute', left: 0, top: 0, width: 1920, height: STAGE_H, overflow: 'hidden' }}><Honesty /></div>
    ) : (
      <Footage scene={scene} />
    )}
    <Captions scene={scene} />
    <Sequence from={Math.round(scene.lead * FPS)}>
      <Audio src={staticFile(`audio/${scene.id}.wav`)} />
    </Sequence>
  </AbsoluteFill>
);

export const Film = () => {
  let from = 0;
  return (
    <AbsoluteFill style={{ background: C.band }}>
      {scenes.map((s) => {
        const f = from;
        from += s.frames;
        return (
          <Sequence key={s.id} from={f} durationInFrames={s.frames}>
            <SceneView scene={s} />
          </Sequence>
        );
      })}
      <Sequence from={from} durationInFrames={plan.outroFrames}>
        <Outro />
      </Sequence>
    </AbsoluteFill>
  );
};
