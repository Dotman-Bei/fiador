import os, sys, time
os.environ["HF_HUB_OFFLINE"]="1"
import numpy as np, soundfile as sf
from kokoro import KPipeline
t0=time.time()
pipe=KPipeline(lang_code='a', repo_id='hexgrad/Kokoro-82M')
text="A Sputnik DAO can only give money away. A member short until a payout lands asks the whole council for a grant, or goes without. Fiador lets the DAO lend."
audio=[];words=[];off=0.0
for r in pipe(text, voice='af_heart', speed=1.0):
    a=r.audio.numpy() if hasattr(r.audio,'numpy') else np.asarray(r.audio)
    for tk in (r.tokens or []):
        if tk.start_ts is not None and tk.end_ts is not None and tk.text.strip():
            words.append((tk.text, round(off+tk.start_ts,2), round(off+tk.end_ts,2)))
    audio.append(a); off+=len(a)/24000
y=np.concatenate(audio); sf.write('tmp/smoke.wav', y, 24000)
print('seconds',round(len(y)/24000,2),'words',len(text.split()),'w/s',round(len(text.split())/(len(y)/24000),2),'load+synth',round(time.time()-t0,1))
print(words[:8])
