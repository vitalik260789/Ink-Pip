# Episode 05 plan: shots.json, words.json, config.json, cast.js from timeline/lines.json (segments keyed to line indices).
import json, re, sys
P = sys.argv[1]
L = json.load(open(P + '/timeline/lines.json')); lines, DUR = L['lines'], L['duration']
S = lambda i, d=-0.3: round(lines[i]['start'] + d, 2)
E_ = lambda i, d=0.0: round(lines[i]['end'] + d, 2)
T = [(0.0, 'room', {'part': 'start'}), (S(10), 'sky', {'mode': 'title'}), (S(32), 'valley', {'mode': 'valley', 'part': 'dry'}), (S(70), 'sky', {'mode': 'drop'}),
     (S(80), 'valley', {'mode': 'forest'}), (S(94), 'sky', {'mode': 'grey'}), (S(104), 'valley', {'mode': 'desert'}), (S(118), 'valley', {'mode': 'valley', 'part': 'good'}), (S(128), 'room', {'part': 'end'})]
SFX = [(E_(3, 0.05), 'pop', -10), (S(10, -0.1), 'whoosh', -10), (S(12, 0.2), 'pop', -10), (S(22, 0.1), 'hit', -14), (S(32, -0.2), 'whoosh', -16), (S(37, 0.4), 'pop', -16), (S(43, 0.5), 'pop', -16),
       (S(53, 2.6), 'pop', -14), (S(55, 1.0), 'pop', -14), (S(65, 1.8), 'hit', -14), (S(71, 0.4), 'hit', -12), (S(77, 4.7), 'pop', -10), (S(79, 0.2), 'hit', -12), (S(80, -0.2), 'whoosh', -16),
       (S(85, 2.4), 'hit', -14), (S(94, -0.2), 'whoosh', -16), (S(104, -0.2), 'whoosh', -16), (S(109, 1.6), 'hit', -14), (S(118, -0.2), 'whoosh', -16), (S(121, 1.2), 'pop', -12), (S(124, -0.3), 'hit', -12),
       (S(125, 0.8), 'hit', -14), (S(133, 0.0), 'pop', -12)]
shots = []
for i, (a, kind, prm) in enumerate(T):
    b = T[i + 1][0] if i + 1 < len(T) else DUR
    spoken = ' '.join(l['text'] for l in lines if a - 0.2 <= l['start'] < b - 0.2)
    sfx = [{'at': round(t - a, 2), 'name': n, 'gain': gn} for t, n, gn in SFX if a <= t < b]
    tr = {'type': 'cut'} if i == 0 else {'type': 'fade', 'dur': 0.3}
    shots.append({'id': 's%03d' % (i + 1), 'start': a, 'end': round(b, 2), 'line': spoken, 'scene': kind, 'kind': kind, 'params': prm, 'in': tr, 'sfx': sfx, 'captions': True})
music = [{'start': 0, 'end': S(10), 'mood': 'playful', 'intensity': 0.45}, {'start': S(10), 'end': S(32), 'mood': 'wonder', 'intensity': 0.45}, {'start': S(32), 'end': S(62), 'mood': 'mystery', 'intensity': 0.45},
         {'start': S(62), 'end': S(80), 'mood': 'playful', 'intensity': 0.45}, {'start': S(80), 'end': S(104), 'mood': 'tension', 'intensity': 0.45}, {'start': S(104), 'end': S(118), 'mood': 'wonder', 'intensity': 0.45},
         {'start': S(118), 'end': DUR, 'mood': 'hopeful', 'intensity': 0.5}]
TITLE = 'What If It Never Rained Again?'
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
print(len(shots), 'shots', DUR); [print(s['id'], s['kind'], s['params'], s['start'], s['end']) for s in shots]
