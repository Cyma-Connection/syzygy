# SYZYGY — Deposit / jam submission sheet

**Live URL:** https://cyma-connection.github.io/syzygy/  
**Repo:** https://github.com/Cyma-Connection/syzygy  
**Jam:** [404 Game Jam](https://game.404.xyz/) — deadline **25 Sep 2026, 23:59 UTC**  
**Author:** Julien Debournou (Cyma-Connection)

---

## Pitch court (FR) — recommandé
**SYZYGY ORBIT SNAP** — dernier cartographe d’un orrery mort. Votre craft orbite seul autour d’un soleil mourant : **sentez** l’alignement Soleil→Objet, puis **SNAP**. Débris = danger. Combos, vagues, **LOCK** (gel d’alignement), portail bonus après 4 reliques. Arcade addictive, esthétique laiton / obsidienne / ambre+froid.

## Short pitch (EN)
**SYZYGY ORBIT SNAP** — last cartographer of a dead orrery. Your craft auto-orbits a dying sun: **feel** sun→object alignment, then **SNAP**. Debris hurts. Combos, waves, **LOCK** (brief align freeze), portal bonus after 4 relics. Arcade-addictive; brass/obsidian; amber + cold — not neon cyberpunk.

---

## How to play
1. Watch alignment (meter, SNAP pulse, rising tone).
2. Tap **SNAP** on Perfect / Good / OK. Avoid **debris**.
3. Clear 5 snaps per wave; sun grows; difficulty ramps (gentle early, clearer after wave 5–8).
4. **4 relic SNAPs** → geometric **portal** appears → **SNAP portal** = 30s bonus orbs (tiers stack each entry).
5. **3 Perfect** → **LOCK** charged → tap LOCK or press **Space** = ~0.6s alignment freeze (soft-lock toward best non-debris). Does **not** open bonus.

## Controls
- **SNAP** — primary thumb button  
- **LOCK** / **Space** (desktop) — align freeze when charged  
- **Pinch** / mouse **wheel** — zoom  
- Mute + language chips (EN / FR / ES)

## Jam rules / telemetry
Respect 404 geometry recipe (code modules only for 3D). Expose `__READY__`, `__START__`, `__GAME__` (fps from real dt, pos in metres, draws/tris). Relative paths; public Pages URL.

## Submission path
Fork `404-game-jam`, add `entries/syzygy.json`, then paste the verdict from `jam.mjs` into `entries/syzygy.VERDICT.md` before depositing.

## Screenshots
Phone portrait captures (Jam dossier, optional for organizers):

- [x] Orbit SNAP / alignment — `docs/screenshots/01-syzygy-alignment.jpeg`
- [x] Bonus ALT WORLDS — `docs/screenshots/02-alt-worlds-perfect.jpeg`
- [x] Mobile one-thumb HUD — `docs/screenshots/03-hud-wave3-good.jpeg`

## Out of scope (locked)
No black-hole DODGE return. LOCK does not open bonus. Bonus entry = SNAP portal only.
