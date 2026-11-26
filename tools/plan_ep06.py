# Episode 06 plan: shots.json, words.json, config.json, cast.js from timeline/lines.json (segments keyed to line indices).
import json, re, sys
P = sys.argv[1]
L = json.load(open(P + '/timeline/lines.json')); lines, DUR = L['lines'], L['duration']
S = lambda i, d=-0.3: round(lines[i]['start'] + d, 2)
E_ = lambda i, d=0.0: round(lines[i]['end'] + d, 2)
T = [(0.0, 'room', {'part': 'start'}), (S(10), 'cret', {'mode': 'plain'}), (S(49), 'cret', {'mode': 'impact'}), (S(63), 'cret', {'mode': 'miss'}),
     (S(67), 'cret', {'mode': 'night'}), (S(89), 'cret', {'mode': 'today'}), (S(115), 'room', {'part': 'end'})]
SFX = [(S(0, 0.6), 'whoosh', -14), (S(9, 0.4), 'whoosh', -10), (S(10, 0.1), 'pop', -12), (S(12, 0.3), 'hit', -14), (S(14, 0.2), 'pop', -16), (S(22, 0.3), 'hit', -12),
       (S(27, 0.6), 'hit', -12), (S(41, 1.0), 'pop', -12), (S(44, 2.0), 'pop', -14), (S(46, 0.3), 'pop', -12), (S(48, 0.2), 'hit', -12),
       (S(49, 0.1), 'whoosh', -16), (S(51, 0.2), 'whoosh', -10), (S(54, 2.4), 'hit', -6), (S(56, 0.2), 'hit', -10), (S(62, 2.4), 'whoosh', -10),
       (S(63, 0.1), 'whoosh', -8), (S(63, 0.9), 'pop', -10), (S(67, -0.2), 'whoosh', -16), (S(69, 0.2), 'pop', -14), (S(77, 0.2), 'pop', -12), (S(79, 0.2), 'hit', -12),
       (S(89, -0.2), 'whoosh', -14), (S(103, 0.2), 'hit', -10), (S(110, 0.5), 'pop', -14), (S(115, -0.2), 'whoosh', -14), (S(120, 0.1), 'hit', -10), (S(122, 0.6), 'pop', -12),
       (S(128, 1.8), 'pop', -12), (S(131, 0.6), 'pop', -12), (S(136, 0.0), 'pop', -12)]
shots = []
for i, (a, kind, prm) in enumerate(T):
    b = T[i + 1][0] if i + 1 < len(T) else DUR
    spoken = ' '.join(l['text'] for l in lines if a - 0.2 <= l['start'] < b - 0.2)
    sfx = [{'at': round(t - a, 2), 'name': n, 'gain': gn} for t, n, gn in SFX if a <= t < b]
    tr = {'type': 'cut'} if i == 0 else {'type': 'fade', 'dur': 0.3}
    shots.append({'id': 's%03d' % (i + 1), 'start': a, 'end': round(b, 2), 'line': spoken, 'scene': kind, 'kind': kind, 'params': prm, 'in': tr, 'sfx': sfx, 'captions': True})
music = [{'start': 0, 'end': S(10), 'mood': 'playful', 'intensity': 0.45}, {'start': S(10), 'end': S(41), 'mood': 'wonder', 'intensity': 0.45}, {'start': S(41), 'end': S(49), 'mood': 'playful', 'intensity': 0.45},
         {'start': S(49), 'end': S(63), 'mood': 'tension', 'intensity': 0.5}, {'start': S(63), 'end': S(67), 'mood': 'hopeful', 'intensity': 0.5}, {'start': S(67), 'end': S(89), 'mood': 'mystery', 'intensity': 0.45},
         {'start': S(89), 'end': S(115), 'mood': 'wonder', 'intensity': 0.45}, {'start': S(115), 'end': DUR, 'mood': 'playful', 'intensity': 0.5}]
TITLE = 'What If the Dinosaurs Never Went Extinct?'
json.dump({'title': TITLE, 'duration': DUR, 'shots': shots, 'music': music}, open(P + '/story/shots.json', 'w'), indent=1)
words = []
for l in lines:
    toks = l['text'].split(); wts = [len(re.sub(r'[^A-Za-z0-9]', '', t)) + 1.5 for t in toks]; tot = sum(wts); d = l['end'] - l['start'] - 0.1; t = l['start'] + 0.03
    for tok, w in zip(toks, wts): dd = d * w / tot; words.append({'word': tok, 'start': round(t, 3), 'end': round(t + dd * 0.92, 3)}); t += dd
json.dump({'source': 'kokoro lines (proportional)', 'words': words}, open(P + '/timeline/words.json', 'w'))
cfg = {'title': TITLE, 'aspect': '16:9', 'resolution': '1080p', 'fps': 24, 'style': 'inkworld', 'voiceover': 'input/voiceover.wav', 'duration': DUR, 'captions': True, 'bars': 0,
       'fadeIn': 0.0, 'fadeOut': 0.6, 'music': {'enabled': True, 'gainDb': -16, 'seed': 6}, 'sfx': {'enabled': True, 'gainDb': -6}, 'loudness': -14, 'compress': True, 'lra': 3}
json.dump(cfg, open(P + '/config.json', 'w'), indent=1)
cast = open(P + '/../ep02-day-1-hour/scenes/cast.js').read().split('export const LINES')[0]
cast += 'export const LINES = [\n' + ',\n'.join("  ['%s', %.3f, %.3f]" % (l['who'], l['start'], l['end']) for l in lines) + '];\n'
cast += "export const talkOf = (who, gT) => { const L = LINES.find(l => l[0] === who && gT >= l[1] && gT <= l[2]); return L ? talkAmount(gT, L[1], L[2]) : 0; };\n"
open(P + '/scenes/cast.js', 'w').write(cast)
print(len(shots), 'shots', DUR); [print(s['id'], s['kind'], s['params'], s['start'], s['end']) for s in shots]
