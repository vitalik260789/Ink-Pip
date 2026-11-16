import re, json, sys, numpy as np, soundfile as sf
from kokoro_onnx import Kokoro
from scipy.signal import resample_poly
k = Kokoro(sys.argv[3] + '/kokoro-v1.0.onnx', sys.argv[3] + '/voices-v1.0.bin')
V = {'PIP': ('af_heart', 1.28), 'INK': ('am_michael', 1.25)}
src = open(sys.argv[1]).read().split('## Fact sheet')[0]
SR = 48000; parts = [np.zeros(int(SR * 0.08), np.float32)]; t = 0.08; lines = []; marks = []; pend = 0.0; sec = None
for raw in src.splitlines():
    m = re.match(r'^## ([0-9:]+) — (.*)', raw)
    if m:
        sec = m.group(2); pend = max(pend, 2.0 if 'mid-roll' in sec else 0.5); marks.append({'title': sec}); continue
    m = re.match(r'^(PIP|INK): (.*)', raw)
    if not m: continue
    who, text = m.groups(); voice, sp = V[who]
    say = text.replace('?!', '?').replace('"what if"', 'what if')
    a, sr = k.create(say, voice=voice, speed=sp, lang='en-us')
    a = resample_poly(a, SR, sr).astype(np.float32); nz = np.where(np.abs(a) > 0.01)[0]; a = a[max(0, nz[0] - 240): nz[-1] + 1200]; a = a / (np.abs(a).max() + 1e-9) * 0.8
    gap = pend if pend else (0.14 if lines and lines[-1]['who'] != who else 0.08)
    if lines: parts.append(np.zeros(int(SR * gap), np.float32)); t += gap
    if pend: marks[-1]['t'] = round(t, 3)
    pend = 0.0; d = len(a) / SR
    lines.append({'who': who, 'text': text, 'start': round(t, 3), 'end': round(t + d, 3), 'section': sec}); parts.append(a); t += d
parts.append(np.zeros(int(SR * 3.5), np.float32)); t += 3.5
sf.write(sys.argv[2] + '/voice.wav', np.concatenate(parts), SR)
json.dump({'lines': lines, 'sections': marks, 'duration': round(t, 3)}, open(sys.argv[2] + '/lines.json', 'w'), indent=1)
w = sum(len(l['text'].split()) for l in lines); sp = sum(l['end'] - l['start'] for l in lines)
print('lines', len(lines), 'words', w, 'duration %.1f s' % t, 'speaking %.2f w/s' % (w / sp))
for i, l in enumerate(lines): print(i, l['who'], l['start'], l['end'], l['text'][:50])
for m in marks: print(m.get('t'), m['title'])
