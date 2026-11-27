[![make.fun competition](https://make.fun/badge/turkey-run-game-01.svg)](https://make.fun/bounty/turkey-run-game-01)
[![rank](https://make.fun/badge/turkey-run-game-01/vickyair1/turkey-run-game-01/rank.svg)](https://make.fun/bounty/turkey-run-game-01)
[![reward](https://make.fun/badge/turkey-run-game-01/vickyair1/turkey-run-game-01/reward.svg)](https://make.fun/bounty/turkey-run-game-01)

# GOBBLE DASH — The Great Thanksgiving Escape

A complete turkey escape runner for [make.fun's **Make the best turkey escape game** bounty](https://make.fun/bounty/turkey-run-game-01). Thanksgiving is coming and you are the dinner: outrun the farmer for 1,000 m — from the farmyard, through barn lane and the kitchen — to the forest gate, jumping fences, hay bales and crates, sliding under the washing line, dodging oven flames, rolling pins and falling carving knives, grabbing corn, pumpkins and golden feathers on the way.

## The game

- **Three stages, one run** — The Farmyard (fences, hay, puddles), Barn Lane (crates, low branches to slide under), The Kitchen (oven vents that flare, rolling pins, telegraphed falling knives) — then the night woods and the gate.
- **The farmer chases you** — his gap in metres is a second fail state beside your three lives. Stumble and he closes in; run clean and you pull away. Under 9 m he is right behind you, pitchfork raised.
- **Jump, double-jump, slide** — Space / W / ↑ jumps (twice for a wing flap), S / ↓ slides under the washing line and slams you down out of the air. A puddle only costs speed — unless the farmer is close.
- **Risk pays** — corn arcs over the jumps, pumpkins ride above the tall crates, a golden feather buys a 3-second invincible dash that drives the farmer back. Near misses pay +5.
- **HUD built to read at a glance** — score, distance bar to the 1,000 m gate, three feather lives, the farmer meter, stage banners.
- **Synthesized sound** — gobbles, wing flaps, pickup chimes, the farmer's yell, the oven's whoosh, an escape fanfare. No audio files. Mute with M.
- **Complete** — title screen, run in play, pause, caught and escaped end screens with stats and restart. Best escape is remembered.

## Play

Open `game/index.html` in desktop Chrome (or `node serve.ts`, then http://localhost:8080). No network, no build step.

| Key | Action |
| --- | --- |
| SPACE / W / ↑ | Jump (twice for a wing flap) |
| S / ↓ | Slide (under the washing line) / slam down |
| CLICK | Jump |
| P / ESC | Pause |
| M | Mute |
| SPACE / ENTER | Start / restart |

## Layout

- `main.ts` — hands the entry in: copies `game/` + `screenshots/` to `/output`, writes `dossier.json` (Node 22).
- `game/index.html`, `game/css/style.css` — the page.
- `game/js/config.js` — every tuning number and colour.
- `game/js/world.js` — the rules: turkey, farmer, hazards, pickups, stages, collisions, score.
- `game/js/render.js` — all the drawing: sunset farm, kitchen, night woods, HUD, panels.
- `game/js/audio.js` — synthesized WebAudio sound, no files.
- `game/js/input.js` — keyboard and pointer input.
- `game/js/shots.js` — the staged screenshot scenes and their autopilot.
- `game/js/main.js` — boot, the loop, the four screens.
- `game/js/random.js` — the seeded RNG that makes the shots repeatable.

## Verification

- Headless Chromium playtest: title → start → run → pause → resume → caught (standing still, 171 m) → restart, no page errors.
- Autopilot (the same rules, no cheats): escapes on 9 of 10 seeds, 0–2 stumbles a run; an idle turkey is caught at ~171 m.
- `main.ts` runs twice byte-identical (dossier sha256 `434a416444d0b1911bb3ba23adfaef59dee93711fa1f58c7777b80286e7baf25`).
- `makefun check`: 4 passed (competition_open, snapshot, license_osi MIT, entrypoint node22), 1 failed (transcripts_present — the bundle is made by the parent at submit time, as usual), 5 checked at submission.
