# Episode 04 plan: shots.json, words.json, config.json, cast.js from timeline/lines.json (segments keyed to line indices).
import json, re, sys
P = sys.argv[1]
L = json.load(open(P + '/timeline/lines.json')); lines, DUR = L['lines'], L['duration']
S = lambda i, d=-0.3: round(lines[i]['start'] + d, 2)
E_ = lambda i, d=0.0: round(lines[i]['end'] + d, 2)
T = [(0.0, 'room', {'part': 'start'}), (S(6), 'meadow', {'mode': 'meadow', 'part': 'title'}), (S(17), 'flower', {}), (S(27), 'flower', {'mode': 'comb'}),
     (S(40), 'meadow', {'mode': 'orchard', 'part': 'crops'}), (S(48), 'market', {}), (S(65), 'meadow', {'mode': 'farm'}), (S(75), 'meadow', {'mode': 'cacao'}),
     (S(83), 'meadow', {'mode': 'orchard', 'part': 'human'}), (S(98), 'meadow', {'mode': 'meadow', 'part': 'good'}), (S(106), 'room', {'part': 'end'})]
SFX = [(S(1, 0), 'pop', -12), (E_(1, 0.05), 'pop', -12), (E_(1, 0.4), 'pop', -13), (E_(1, 0.75), 'pop', -13), (S(6, -0.1), 'whoosh', -10), (E_(8, 0.2), 'pop', -10),
       (S(17, -0.2), 'whoosh', -16), (S(27, -0.2), 'whoosh', -16), (S(49, 4.5), 'pop', -16), (S(60, 0.3), 'hit', -12), (S(64, 0.2), 'hit', -14), (S(68, 0.4), 'pop', -14),
       (S(76, 0.2), 'hit', -16), (S(99, 0.6), 'pop', -10), (S(106, 0.4), 'pop', -12), (S(109, 0.0), 'pop', -12)]
shots = []
for i, (a, kind, prm) in enumerate(T):
    b = T[i + 1][0] if i + 1 < len(T) else DUR
    spoken = ' '.join(l['text'] for l in lines if a - 0.2 <= l['start'] < b - 0.2)
    sfx = [{'at': round(t - a, 2), 'name': n, 'gain': gn} for t, n, gn in SFX if a <= t < b]
    tr = {'type': 'cut'} if i == 0 else {'type': 'fade', 'dur': 0.3}
    shots.append({'id': 's%03d' % (i + 1), 'start': a, 'end': round(b, 2), 'line': spoken, 'scene': kind, 'kind': kind, 'params': prm, 'in': tr, 'sfx': sfx, 'captions': True})
music = [{'start': 0, 'end': S(6), 'mood': 'mystery', 'intensity': 0.45}, {'start': S(6), 'end': S(40), 'mood': 'wonder', 'intensity': 0.45}, {'start': S(40), 'end': S(65), 'mood': 'playful', 'intensity': 0.45},
         {'start': S(65), 'end': S(75), 'mood': 'tension', 'intensity': 0.45}, {'start': S(75), 'end': S(98), 'mood': 'playful', 'intensity': 0.45}, {'start': S(98), 'end': DUR, 'mood': 'hopeful', 'intensity': 0.5}]
TITLE = 'What If All the Bees Disappeared?'
json.dump({'title': TITLE, 'duration': DUR, 'shots': shots, 'music': music}, open(P + '/story/shots.json', 'w'), indent=1)
words = []
for l in lines:
    toks = l['text'].split(); wts = [len(re.sub(r'[^A-Za-z0-9]', '', t)) + 1.5 for t in toks]; tot = sum(wts); d = l['end'] - l['start'] - 0.1; t = l['start'] + 0.03
    for tok, w in zip(toks, wts): dd = d * w / tot; words.append({'word': tok, 'start': round(t, 3), 'end': round(t + dd * 0.92, 3)}); t += dd
json.dump({'source': 'kokoro lines (proportional)', 'words': words}, open(P + '/timeline/words.json', 'w'))
cfg = {'title': TITLE, 'aspect': '16:9', 'resolution': '1080p', 'fps': 24, 'style': 'inkworld', 'voiceover': 'input/voiceover.wav', 'duration': DUR, 'captions': True, 'bars': 0,
       'fadeIn': 0.0, 'fadeOut': 0.6, 'music': {'enabled': True, 'gainDb': -16, 'seed': 7}, 'sfx': {'enabled': True, 'gainDb': -6}, 'loudness': -14, 'compress': True, 'lra': 3}
json.dump(cfg, open(P + '/config.json', 'w'), indent=1)
cast = open(P + '/../ep02-day-1-hour/scenes/cast.js').read().split('export const LINES')[0]
cast += 'export const LINES = [\n' + ',\n'.join("  ['%s', %.3f, %.3f]" % (l['who'], l['start'], l['end']) for l in lines) + '];\n'
cast += "export const talkOf = (who, gT) => { const L = LINES.find(l => l[0] === who && gT >= l[1] && gT <= l[2]); return L ? talkAmount(gT, L[1], L[2]) : 0; };\n"
open(P + '/scenes/cast.js', 'w').write(cast)
print(len(shots), 'shots', DUR); [print(s['id'], s['kind'], s['params'], s['start'], s['end']) for s in shots]
