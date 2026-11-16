import json, re, sys
P = sys.argv[1]
L = json.load(open(P + '/timeline/lines.json')); lines, DUR = L['lines'], L['duration']
T = [(0.0, 'room', {'part': 'start'}), (16.4, 'space', {'set': 'title'}), (28.4, 'space', {'set': 'bary'}), (55.3, 'room', {'part': 'mid'}), (98.6, 'space', {'set': 'mars'}),
     (114.6, 'dune', {}), (130.5, 'reef', {}), (154.5, 'beach', {'mode': 'day'}), (160.0, 'space', {'set': 'bulge'}), (176.2, 'beach', {'mode': 'day'}),
     (197.6, 'reef', {'deep': True}), (228.4, 'beach', {'mode': 'ancient'}), (261.0, 'space', {'set': 'brake'}), (290.0, 'space', {'set': 'tilt'}),
     (363.4, 'beach', {'mode': 'sky'}), (387.4, 'space', {'set': 'myth'}), (416.0, 'room', {'part': 'disco', 'disco': True}), (440.4, 'space', {'set': 'drift'}), (464.1, 'room', {'part': 'end'})]
SFX = [(1.6, 'pop', -10), (15.9, 'whoosh', -10), (46.35, 'pop', -12), (99.0, 'pop', -16), (123.8, 'whoosh', -18), (139.0, 'whoosh', -18), (181.0, 'hit', -16),
       (262.9, 'hit', -16), (312.35, 'pop', -14), (329.9, 'hit', -12), (376.0, 'whoosh', -14), (388.2, 'hit', -12), (419.6, 'pop', -12), (433.8, 'hit', -14), (466.4, 'pop', -10), (474.3, 'pop', -12)]
shots = []
for i, (a, kind, prm) in enumerate(T):
    b = T[i + 1][0] if i + 1 < len(T) else DUR
    spoken = ' '.join(l['text'] for l in lines if a - 0.2 <= l['start'] < b - 0.2)
    sfx = [{'at': round(t - a, 2), 'name': n, 'gain': gn} for t, n, gn in SFX if a <= t < b]
    same = i and T[i - 1][1] == kind and kind == 'space'
    tr = {'type': 'cut'} if i == 0 else {'type': 'fade', 'dur': 0.3}
    shots.append({'id': 's%03d' % (i + 1), 'start': a, 'end': round(b, 2), 'line': spoken, 'scene': kind, 'kind': kind, 'params': prm, 'in': tr, 'sfx': sfx, 'captions': True})
music = [{'start': 0, 'end': 28.4, 'mood': 'mystery', 'intensity': 0.45}, {'start': 28.4, 'end': 154.5, 'mood': 'wonder', 'intensity': 0.45}, {'start': 154.5, 'end': 261.0, 'mood': 'playful', 'intensity': 0.45},
         {'start': 261.0, 'end': 363.4, 'mood': 'tension', 'intensity': 0.5}, {'start': 363.4, 'end': 440.4, 'mood': 'wonder', 'intensity': 0.45}, {'start': 440.4, 'end': DUR, 'mood': 'hopeful', 'intensity': 0.5}]
TITLE = 'What If the Moon Disappeared?'
json.dump({'title': TITLE, 'duration': DUR, 'shots': shots, 'music': music}, open(P + '/story/shots.json', 'w'), indent=1)
words = []
for l in lines:
    toks = l['text'].split(); wts = [len(re.sub(r'[^A-Za-z0-9]', '', t)) + 1.5 for t in toks]; tot = sum(wts); d = l['end'] - l['start'] - 0.1; t = l['start'] + 0.03
    for tok, w in zip(toks, wts): dd = d * w / tot; words.append({'word': tok, 'start': round(t, 3), 'end': round(t + dd * 0.92, 3)}); t += dd
json.dump({'source': 'kokoro lines (proportional)', 'words': words}, open(P + '/timeline/words.json', 'w'))
cfg = {'title': TITLE, 'aspect': '16:9', 'resolution': '1080p', 'fps': 24, 'style': 'inkworld', 'voiceover': 'input/voiceover.wav', 'duration': DUR, 'captions': True, 'bars': 0,
       'fadeIn': 0.0, 'fadeOut': 0.6, 'music': {'enabled': True, 'gainDb': -16, 'seed': 5}, 'sfx': {'enabled': True, 'gainDb': -6}, 'loudness': -14, 'compress': True, 'lra': 3}
json.dump(cfg, open(P + '/config.json', 'w'), indent=1)
cast = open(P + '/../ep02-day-1-hour/scenes/cast.js').read().split('export const LINES')[0]
cast += 'export const LINES = [\n' + ',\n'.join("  ['%s', %.3f, %.3f]" % (l['who'], l['start'], l['end']) for l in lines) + '];\n'
cast += "export const talkOf = (who, gT) => { const L = LINES.find(l => l[0] === who && gT >= l[1] && gT <= l[2]); return L ? talkAmount(gT, L[1], L[2]) : 0; };\n"
open(P + '/scenes/cast.js', 'w').write(cast)
print(len(shots), 'shots', DUR)
