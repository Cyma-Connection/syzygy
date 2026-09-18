# SYZYGY — ORBIT SNAP

Arcade orbital alignment for the [404 Game Jam](https://game.404.xyz/) (closes **25 Sep 2026**). Your craft **auto-orbits** a dying sun — **feel** the alignment, then **SNAP**. Débris = danger. Build combos, clear waves, climb the board.

## Play (live)
https://cyma-connection.github.io/syzygy/

Or serve this folder over HTTP and open `index.html`.

## Pitch (EN)
Last cartographer of a dead orrery: soft-lock the dying sun’s relics into syzygy and SNAP. Arcade urgency, brass/obsidian beauty — Angry Birds clarity meets Subway Surfers pace.

## Pitch (FR)
Dernier cartographe d’un orrery mort : alignez soleils et reliques en **syzygie**, puis **SNAP**. Urgence arcade, esthétique laiton/obsidienne — clarté Angry Birds, rythme Subway Surfers.

## How to play
1. Craft orbits alone — watch sun → object alignment (meter / pulse / tone).
2. **SNAP** at the sweet spot (Perfect / Good / OK). Debris = lose a life.
3. Clear waves, stack combos, grow the sun. 5 hull lives.
4. **7 relic SNAPs** open a **portal** — SNAP the portal to enter a **30s bonus** stage (orbs). Each bonus entry in a run raises **bonus tier** (more points, slightly harder, new look).
5. **3 Perfect** in a row charge **LOCK** — brief **alignment freeze** (~0.6s): craft soft-locks toward the best non-debris syzygy. LOCK does **not** open the bonus.

## Controls
| Input | Action |
|---|---|
| **SNAP** (big button) | Commit alignment |
| **LOCK** / Desktop **Space** | Align freeze (~0.6s) when charged |
| **Pinch** (mobile) / **wheel** | Zoom |
| Corner **♪** | Mute |
| Corner **EN/FR/ES** | Language |

## Screenshots
_Placeholder — add jam screenshots here:_
- `docs/shots/play.png` — orbit + SNAP hot window
- `docs/shots/bonus.png` — portal bonus tier look
- `docs/shots/mobile.png` — one-thumb HUD

## Jam notes
- Telemetry: `window.__READY__`, `window.__START__()`, `window.__GAME__` each frame (`pos`, `fps`, `speed`, `score`, `draws`, `tris`, `state`, `wave`, `lives`, `bonus`, `bonusTier`, …).
- Geometry-as-code (404 recipe) — no downloaded meshes.
- Style lock: amber + cold, brass/obsidian/bone — **no neon magenta**.
- Submit / deposit: see `docs/DEPOSIT.md`.

## Stack
Three.js geometry-as-code assets, procedural space audio, GitHub Pages from `main`.
