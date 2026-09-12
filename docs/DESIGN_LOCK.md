# SYZYGY — design lock v1 (validated 2026-09-12)

## Pitch
You are the last cartographer of a dead orrery. Align celestial relics until their beams lock; each syzygy carves a traversable light tunnel and lights a star. The map you draw becomes the level.

## Loop
- Duration: 6 minutes real-time (sun dies).
- 12 relics on broken orbits + central dying sun.
- Win: 5 syzygys before collapse.
- Lose: sun implodes, silent end, drone drops an octave.
- Secret: 5 locks in spectral order R→V reconstitutes the constellation name (motif, not hidden easter egg).

## Minute 1
1. Start → craft already orbiting, geodesic camera.
2. Amber ghost on first relic + filament hint.
3. First drag moves player ≥ 1 m (gate).
4. First syzygy nearly forced → tunnel + 2 s beam travelling.
5. Then real freedom / difficulty.

## Controls (one hand)
- Drag: push craft on orbit (tangential + light radial).
- Tap relic: tether / untether filament.
- Hold-sun help unlocks after 2nd syzygy only.

## Claims
1. Always both temperatures in frame (amber + cold).
2. Volume above ecliptic never empty.
3. Face-unreadable alignment = fail the round.
4. First drag: `__GAME__.pos` moved ≥ 1 m.
5. After each syzygy: 2 s camera travelling in the beam.

## States
`BOOT` → `ORBIT` → `TETHER` → `LOCK` → `COLLAPSE` / `WIN`

## Telemetry
`window.__READY__`, `window.__START__`, `window.__GAME__` every frame (pos metres, fps real, draws, tris, score, over).
Custom touch gate (recipe playtest is keyboard-forward only).

## Jam
404 Game Jam — geometry via 404 recipe code modules; textures/sky/sound may be files.
