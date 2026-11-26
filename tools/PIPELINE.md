# Ink & Pip — episode pipeline (for scheduled production runs)

Channel: Ink & Pip (YouTube, EN "what if" science cartoons). Heroes: Pip (girl, curious, jokes) and Ink (boy, explains).
Reference episode for code and style: `studio/projects/ep03-moon-full` (8:06, style `inkworld`).

## 0. Setup in a fresh container
```
git clone https://github.com/vitalik260789/Ink-Pip.git ink-pip && cd ink-pip/studio && npm install --no-audit --no-fund   # no package-lock: npm ci fails
pip install --break-system-packages kokoro-onnx soundfile scipy opencv-python-headless
mkdir -p ~/tts && cd ~/tts && curl -sLO https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx && curl -sLO https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin
export CHROME_BIN=$(ls -d /opt/pw-browsers/chromium-*/chrome-linux*/chrome | head -1)   # or let Playwright install chromium
```

## 1. Topic + script (~1,600 words → ~8 min at Kokoro ×1.25/×1.28)
- Topic: spectacular "What if…?" about space/Earth/science that can be shown in 3D; not done before (see list of releases / project docs).
- Facts: web-check every number; keep a `## Fact sheet` at the end of the script.
- Formula: hook = paradox in sentence 1 · title promise · 8–12 short sections (`## m:ss — TITLE`) · "You see," pivot before the main mechanism · 1 myth-bust · twist near the end · outro: subscribe + "tell us in the comments what's next".
- One `## m:ss — mid-roll` heading around 3:00–4:30 (2-second pause). Format of lines: `PIP: …` / `INK: …` (one line each, no stage directions inside lines).

## 2. Voice
`python3 tools/gen_voice.py script.md <project>/timeline <~/tts>` → `voice.wav`, `lines.json` (copy voice.wav to `<project>/input/voiceover.wav`).
Target: speaking rate ≈ 3.6 words/s, duration 8:00–9:00.

## 3. Project
Topic rubrics rotate (never space twice in a row): animals & nature · human body · Earth & weather · history & dinosaurs · tech & everyday life · space. Ep04 `ep04-no-bees` adds `scenes/sets/nature3d.js` (meadow/hive/bees, macro flower with UV view, honeycomb, blossoming orchard with ladders, market stall, farm, cacao tree) and keys beats to line indices (`LN(i)`); its plan script is `tools/plan_ep04.py`. Ep05 `ep05-no-rain` (Earth & weather) adds `scenes/sets/weather3d.js`: standing on a cloud above the sea (vapour, rain shafts, morphing giant raindrop, grey/hazy mode), a valley that dries out (river with puddles, lake → cracked-mud bed + stranded boat, wheat green→brown, snow caps shrink, rain returns), rainforest with a mist "flying river" that browns and smokes, Atacama desert with fog nets + rover; rain streak field for any set; plan `tools/plan_ep05.py`. Ep06 `ep06-dinosaurs` (history & dinosaurs) adds `scenes/sets/dino3d.js`: one Cretaceous valley in five moods (`plain` day with titanosaur herd, T. rex (jaw/roar), triceratops, pterosaurs, ferns/cycads/palms, river, volcano · `impact` dusk with fireball, impact glow, embers, fires, darkening dust · `miss` fireball flying away · `night` fern floor with tiny glowing-eyed mammals · `today` cold grassland, feathered dinosaur flock, dinosauroid statue) + room props `toyRex`, `pigeon`; plan `tools/plan_ep06.py`, thumbnail `studio/projects/thumb06`.
Copy `studio/projects/ep03-moon-full` → `studio/projects/<slug>`; keep `scenes/sets/*` (room3d night/day, space3d, worlds3d: dune/reef/beach, props3d: planets) and the camera/cast helpers at the top of `scenes/shots/episode.js`; rewrite the beats (labels, moon/tilt states, ACT table) for the new story. Add sets in `worlds3d.js` if the story needs a new place.
`tools/plan_example_ep03.py` shows how `story/shots.json`, `timeline/words.json`, `config.json` and `scenes/cast.js` are generated (one shot per location segment, dissolve 0.3 s between locations).
Rules (reference-matched, see claude/ep03_reference_match.md in the claude.ai project):
- style `inkworld`, bars 0, captions on, compress true, lra 3, loudness −14.
- long continuous location shots; camera glides ~0.9 s on every line + every ~2.5 s, slow push-in; ≤1 hard cut per minute.
- characters in room/beach scenes act on beats (ACT table); labels with kText at the matching words.
QC: `node render.mjs --project projects/<slug> --stills t1,t2,… --scale 0.4` → look at the contact sheets, fix, repeat.
Colour check: `python3 tools/qa_colour.py <stills dir> <shots.json>` — room Y p50 ≈ 0.45, S ≈ 0.42.

## 4. Render (GitHub Actions, 20 machines, ~45–60 min)
```
gh api -X POST repos/vitalik260789/Ink-Pip/actions/workflows/render.yml/dispatches -f ref=main -f 'inputs[project]=<slug>' -f 'inputs[shards]=20' -f 'inputs[scale]=1'
```
Result: release `<slug>-rN`, asset `<slug>.mp4` (auto re-encoded to ≈420 MB when larger than 450 MB — Metricool rejects ~700 MB uploads) → `https://github.com/vitalik260789/Ink-Pip/releases/download/<tag>/<slug>.mp4`.
Fix a few chunks: `-f 'inputs[chunks]=8,28' -f 'inputs[reuse_run]=<run id>'` (chunk = floor(t/4 s)).
Use REST only (`gh api …`); GraphQL (`gh run view/watch`, `gh release download`) is blocked in Claude sessions → download with curl.

## 5. Thumbnail + Shorts
- Thumbnail: a 3D still (see `studio/projects/thumb03`) + 2–3 word title in Fredoka 700 (`tools/Fredoka700.ttf`), white + gold #ffd47e, 16 px dark stroke; 1280×720 jpg → `media/<slug>/thumbnail.jpg`.
- **Shorts are rendered natively in 9:16 — never cropped from the 16:9 video.** The scene code must be vertical-aware (see the top of `ep03-moon-full/scenes/shots/episode.js`: `E.vertical`, `vPos`/`vSize` for labels, `applyCam` widens the fov and centres the subject; space shots pull back). Check with a vertical copy: copy the project, set `"aspect": "9:16"` in its config.json, render `--stills` and look.
- List the Shorts in `studio/projects/<slug>/shorts.json`: `[{"name":"short_a","from":0.0,"to":28.2,"q1":"WHAT IF THE MOON","q2":"VANISHED TONIGHT?"}, …]` (20–58 s each, a complete thought, 3–4 per episode).
- Render: `gh api -X POST repos/vitalik260789/Ink-Pip/actions/workflows/shorts.yml/dispatches -f ref=main -f 'inputs[project]=<slug>'` (optional `-f 'inputs[only]=short_b'`). Result: release `<slug>-shorts-rN` with `short_*.mp4` (1080×1920, question on top, "FULL VIDEO ON THE CHANNEL" in the last 3 s) → use those URLs in Metricool.

## 6. Publishing (Metricool, brand blogId 7075155, timezone Europe/Budapest)
- Schedule (free Metricool: max 20 posts per calendar month, long + Shorts together): **long videos Tue and Sat at 00:00; Shorts Mon, Thu, Sun at 00:00**, one per night. Never two posts the same night. Shorts over the monthly limit wait for the next month.
- Long: youtubeData {title, type video, privacy public, category EDUCATION, madeForKids false, isAiGeneratedContent false, tags}, videoThumbnailUrl = raw thumbnail jpg.
- Short: youtubeData {type short, …}, text with "Full video: <title>" (later replaced by the youtu.be link).
