"""Kokoro (local, offline) narration for every scene: audio/<id>.wav plus audio/<id>.json with word timings.

Words come from src/generated/script.json (built from §4 of the demo script, the single source). Names are respelled for
the voice only (see SPEECH); captions keep the original words, and each original word gets the timing of the tokens that
spoke it.   Run: .venv/Scripts/python.exe tts/synth.py [S1 S2 ...]
"""
import json, os, re, sys, wave
os.environ.setdefault("HF_HUB_OFFLINE", "1")
import numpy as np
from kokoro import KPipeline

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(HERE, "audio")
os.makedirs(OUT, exist_ok=True)
SR = 24000
VOICE = "af_heart"

# surface respelling for the voice (original word -> spoken text), matched on the word without punctuation
SPEECH = {
    "Fiador": ("[Fiador](/fiˈɑdɔɹ/)", "Fiador"),
    "DAO": ("[DAO](/dˈaʊ/)", "DAO"),
    "ada-1": ("Ada one", "Ada one"),
    "bayo-1": ("Bayo one", "Bayo one"),
    "chidi-1": ("Chidi one", "Chidi one"),
    "chidi-1's": ("Chidi one's", "Chidi one's"),
    "RPC": ("R P C", "R P C"),
    "npm": ("N P M", "N P M"),
}


def norm(s: str) -> str:
    return re.sub(r"[^a-z0-9]", "", s.lower())


def split_word(w: str):
    m = re.match(r"^(.*?)([.,:;!?]*)$", w)
    return m.group(1), m.group(2)


def build(text: str):
    """-> (speech text for Kokoro, [(orig_word, normalized surface target)])"""
    spoken, targets = [], []
    for w in text.split():
        core, punct = split_word(w)
        markup, surface = SPEECH.get(core, (core, core))
        spoken.append(markup + punct)
        targets.append((w, norm(surface)))
    return " ".join(spoken), targets


def write_wav(path, samples):
    pcm = (np.clip(samples, -1, 1) * 32767).astype(np.int16)
    with wave.open(path, "wb") as f:
        f.setnchannels(1); f.setsampwidth(2); f.setframerate(SR); f.writeframes(pcm.tobytes())


def main(ids):
    data = json.load(open(os.path.join(HERE, "src", "generated", "script.json"), encoding="utf8"))
    pipe = KPipeline(lang_code="a", repo_id="hexgrad/Kokoro-82M")
    for sc in data["scenes"]:
        if ids and sc["id"] not in ids:
            continue
        spoken, targets = build(sc["narration"])
        audio, toks, off = [], [], 0.0
        for r in pipe(spoken, voice=VOICE, speed=1.0, split_pattern=r"\n+"):
            a = r.audio.numpy() if hasattr(r.audio, "numpy") else np.asarray(r.audio)
            for tk in (r.tokens or []):
                if tk.start_ts is not None and tk.end_ts is not None and norm(tk.text):
                    toks.append((norm(tk.text), off + float(tk.start_ts), off + float(tk.end_ts)))
            audio.append(a)
            off += len(a) / SR
        y = np.concatenate(audio)
        dur = len(y) / SR
        # map tokens to the original words by consuming normalized text
        words, i, ok = [], 0, True
        for orig, target in targets:
            acc, first, last = "", None, None
            while i < len(toks) and len(acc) < len(target):
                acc += toks[i][0]
                first = toks[i][1] if first is None else first
                last = toks[i][2]
                i += 1
            if acc != target or first is None:
                ok = False
            words.append({"text": orig, "start": first, "end": last})
        if not ok:
            # fall back: spread words evenly over the speech (still honest: timings approximate); report it
            n = len(words)
            for k, wd in enumerate(words):
                wd["start"], wd["end"] = dur * k / n, dur * (k + 1) / n
            print(f"{sc['id']}: token alignment failed, using even spacing")
        write_wav(os.path.join(OUT, f"{sc['id']}.wav"), y)
        json.dump({"id": sc["id"], "duration": dur, "words": words, "aligned": ok}, open(os.path.join(OUT, f"{sc['id']}.json"), "w", encoding="utf8"), indent=1)
        print(f"{sc['id']}: {dur:5.1f}s, {len(words)} words, {len(words)/dur:.2f} w/s, aligned={ok}")


if __name__ == "__main__":
    main(set(sys.argv[1:]))
