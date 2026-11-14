// Assembly plan: which footage segments (source seconds) fill each scene. Everything else (durations, words, timings)
// is derived from the audio and from docs/demo/2026-11-14-demo-script.md. Footage is only ever cut, never sped up.
// Live scenes (S2, S3) come from live take 2, cut only across jumps the burned-in capture clock makes visible.
export const FPS = 30;
export const LEAD = 0.25; // seconds of silence before the narration starts in each scene
export const LIVE_ORIGIN_ISO = '2026-11-14T14:28:24.698Z'; // first frame of live-take2.mp4 (logged by scripts/record.mjs)
export const LIVE_FILE = 'live-take2.mp4';

export const SCENES = {
  S1: { kind: 'browser', clips: [{ file: 'S1.mp4', from: 0, dur: 11.4 }] },
  S2: {
    kind: 'live',
    clips: [
      { file: LIVE_FILE, from: 32.5, dur: 5.0 },  // type 2, click Ask, "Opening your wallet for ask"
      { file: LIVE_FILE, from: 40.5, dur: 4.0 },  // Meteor: Approve Transaction (the builder approves)
      { file: LIVE_FILE, from: 45.0, dur: 3.5 },  // Executing, then the transaction hash line
      { file: LIVE_FILE, from: 54.0, dur: 3.0 },  // Overview: 2 NEAR out, treasury 13.4215
      { file: LIVE_FILE, from: 58.0, dur: 3.5 },  // Loans: loan #11 Active, proposal #21 Approved
    ],
    tag: 'Live: a real wallet, a real transaction, NEAR testnet, 14 Nov',
  },
  S3: {
    kind: 'live',
    clips: [
      { file: LIVE_FILE, from: 77.5, dur: 4.0 },  // click Repay
      { file: LIVE_FILE, from: 82.0, dur: 3.5 },  // Meteor: Send 2 NEAR approved, Executing
      { file: LIVE_FILE, from: 88.0, dur: 4.5 },  // hash line; Members row: goodkale2741 standing 8 NEAR, 4 repaid on time
      { file: LIVE_FILE, from: 96.0, dur: 3.0 },  // Overview: book 0, treasury 15.4215
      { file: LIVE_FILE, from: 100.0, dur: 3.0 }, // Loans: loan #11 Repaid
    ],
    tag: 'Live: a real wallet, a real transaction, NEAR testnet, 14 Nov',
  },
  S4: { kind: 'browser', clips: [{ file: 'S4.mp4', from: 0, dur: 12.8 }], tag: 'Scripted-run loan: made by the scripted story on 13 Nov' },
  S5: {
    kind: 'browser',
    clips: [
      { file: 'S5.mp4', from: 3.5, dur: 3.0 },   // the loan book with each loan's proposal id
      { file: 'S5.mp4', from: 9.5, dur: 2.8 },   // the members and their standing
      { file: 'S5.mp4', from: 19.5, dur: 2.6 },  // the footer: three scripted accounts, one operator key
    ],
    notes: [{ from: 0, to: 99, text: 'Loans #10 and #11 are the two live takes of 14 Nov' }],
  },
  S6: {
    kind: 'browser',
    clips: [{ file: 'S6.mp4', from: 0, dur: 16.6 }],
    // the loan page switches from #3 to #7 about 8.5 s into the clip
    notes: [
      { from: 0, to: 8.4, text: 'Loan #3: a default from the scripted run (13 Nov)' },
      { from: 8.6, to: 99, text: 'Loan #7: a real miss under a 120 s term; the council has since raised the term to 600 s (proposal 16)' },
    ],
  },
  S7: { kind: 'browser', clips: [{ file: 'S7.mp4', from: 0, dur: 12.6 }] },
  S8: {
    kind: 'term',
    clips: [
      { file: 'S8-take4.mp4', from: 6.0, dur: 3.5 },   // the command and npm's banner
      { file: 'S8-take4.mp4', from: 15.5, dur: 8.2 },  // the PASS lines and the final VERIFY PASS line
    ],
    zoom: { lastSeconds: 3.6, scale: 1.9, originX: 0.0, originY: 0.7 },
  },
  S9: { kind: 'card', clips: [] },
};

export const ORDER = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9'];
export const OUTRO_SECONDS = 3;
