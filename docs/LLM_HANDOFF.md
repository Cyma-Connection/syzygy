# SYZYGY SNAP — Full game handoff for another LLM

**Purpose of this document:** give another LLM (or coding agent) everything needed to understand, extend, or ambitiously rebuild the game without prior chat context.

**Last updated:** 2026-09-18  
**Current live build:** https://cyma-connection.github.io/syzygy/  
**Source repo:** https://github.com/Cyma-Connection/syzygy  
**Latest known commit family:** Micro-bonus portal (7 relics → geometric bonus stage) + prior LOCK/mobile pack  
**Jam:** [404 Game Jam](https://game.404.xyz/) — closes **25 Sep 2026, 23:59 UTC**

---

## 1. One-sentence pitch

**SYZYGY ORBIT SNAP** is a mobile-first Three.js arcade game: your craft **auto-orbits** a dying sun; you **feel** alignment (meter / pulse / rising tone) then **SNAP** — multi-object rings (relic/planet/star/debris), waves, combos, lives, LOCK short reverse (3 Perfect → one charge), pinch-zoom.

Fantasy skin: you are the last cartographer of a dead orrery (observatory of a dead future civilisation). Keep the fiction; the *feel* must stay arcade-addictive (Angry Birds clarity / Subway Surfers urgency), not contemplative simulation.

---

## 2. Design history (important)

1. **Original concept (contemplative):** free-orbit orrery — drag craft, tether two relics, lock when aligned through the sun within ~4°, light constellation stars in 6 minutes. Strong “nobody else tried” angle, weak addiction.
2. **Player feedback:** pretty but not addictive enough; wanted Angry Birds / Mechameleon / Subway Surfers energy; visible easy→hard progression; score + global leaderboard; more dynamic; catchy discreet futuristic music; **keep alignment**; **pinch zoom**; better graphics; rebuild on solid foundations.
3. **Current ship — SYZYGY SNAP:** rebuilt around a single addictive verb: **SNAP** at the sweet spot of an alignment meter while relics sweep past the aim line.

Do **not** revert to the contemplative tether loop unless explicitly asked. Alignment stays; pacing must stay arcade.

---

## 2b. ORBIT SNAP (current core — 2026-09-12)

**Verb:** feel alignment on an auto-orbit, then SNAP.

| Piece | Behavior |
|---|---|
| Auto-orbit | Craft angle advances continuously; `orbitSpeed` rises each wave (+ slight within-wave). Exposed as `__GAME__.speed`. |
| World objects | Multiple on rings: **relic** (asset pool), **planet** (banded sphere), **star** (spiky cold), **debris** (jagged amber/bone — danger). |
| Alignment | Best angular align craft↔object through sun origin; meter + SNAP pulse/glow + rising audio tone. |
| SNAP | Debris → lose life + bad FX. Else Perfect/Good/OK × combo × wave; **stack bonus** if planet/star also near same ray. Weak/nothing → life loss. |
| Wave clear | N successful non-debris snaps → wave++; **sun scale + emissive/brightness persist** for the run. |
| LOCK (`#btnAutoAlign`) | One charge after 3 "Perfect". Short reverse ~16° on orbit (not auto-snap). Charge bar fills with streak. Label LOCK/REV. Coach screen 4. |
| Game over | **5 lives**; lives 0 → big geometric shatter (sun + system) + camera punch, then OVER UI. |
| Coach | 3 screens: ORBIT / FEEL ALIGN / SNAP (debris danger). Flag `syzygy_coach_v1`. |
| Extras | Near-miss sparks, heat amber trail, boss every 5 waves (denser debris + big relic), Perfect slow-mo. |

Primary files: `main.js`, `objects.js`, `audio.js`, `index.html`, `spacefx.js` (`growSun`), `vfx.js`, `i18n.js`.


### Micro-bonus portal (2026-09-18)
- Count successful **relic** SNAPs (`relicsCollected`). At `BONUS_RELICS_NEED` (7) spawn one `KIND.PORTAL` on an inner orbit.
- SNAP portal → enter ~30s bonus stage (`STATE.BONUS` / `bonusActive`): geometric teal planet, 4 bright orbs, denser VFX, fog/sky tint. Double flat points per bonus snap; +1 life once if ≥3 snaps (cap 5). Auto-exit on timer or clear.
- Exit restores sun scene, same wave progress, `relicsCollected = 0`. Portal clears if unused after ~1 wave. No free black-hole DODGE. LOCK unchanged.
- Files: `main.js`, `objects.js` (`createPortal` / `createBonusPlanet` / `createBonusOrb`), `i18n.js`, `vfx.js`, `index.html` (`#bonusTimer`, `?v=b01bonus`).

### Layout / HUD chrome (2026-09-18)
- Corner `#btnHelp` then `#btnMute` (♪/🔇 ~44px) top-left; `#btnLang` top-right — **in-game only** (`body.menu-open` hides them on start/coach/board/over/load).
- Mute must **not** sit bottom-left (it overlapped LOCK on smartphones).
- `#btnAutoAlign` (LOCK) kept; slightly smaller on narrow screens; SNAP remains primary control.
- Recommended future: auto-fire LOCK after 3 Perfect (remove manual LOCK button) — product note only, not done yet.
- Start menu language: chips `#lang_en/#lang_fr/#lang_es` with pointerdown/touchend/click; `setLang` + `localStorage syzygy_lang`.
- Dress: parallax layers in `spacefx.js`, sun corona rings + pulse, craft trail (vfx) + near-syzygy sun→object→craft guide, cut-corner menu frames, softer `#fx` vignette. Corridor HUD still only alignment meter between sun and craft.


Do **not** revert to free-aim drag as primary control. Pinch zoom remains.


---

## 3. Core fantasy & tone

- **Setting:** dead orrery around a dying amber sun; brass / obsidian / bone instruments; archaeology of the future (**not** magenta cyberpunk neon).
- **Fantasy role:** last cartographer — every SNAP writes a star into the map.
- **Tone:** tense, rhythmic, readable on a phone in one hand; juice on success, sting on miss.

### Style lock (must keep)

> Observatory instruments of a dead future civilisation: brass and obsidian bodies with bone-pale inlays, matte metal finish, engraved graduations, no neon — archaeology of the future, not cyberpunk.

| role | hex | use |
|---|---|---|
| amber sun | `0xe8a04a` | sun, warm filaments, SNAP accents |
| cold star | `0x6b8cff` | ice light, beams, UI cold |
| brass | `0xb08d57` | relic shells, craft |
| brass dark | `0x7a5c38` | recesses |
| obsidian | `0x1a1a1e` | void panels |
| bone | `0xe6dcc8` | inlays / ticks |
| ember deep | `0x8b3a1a` | dying sun |
| void | `0x04050a` / `0x0b0b10` | background |

Always keep **two colour temperatures** in frame (amber + cold). No glyph/printed text as 3D mesh decoration (404 recipe limitation).

---

## 4. Legacy SNAP mechanics (superseded by §2b ORBIT SNAP — kept for history)

> Authoritative loop is **§2b**. Below describes the previous free-aim SNAP build.

### 4.1 Player verbs

| Input | Effect |
|---|---|
| **Drag** (one finger) | Rotates aim angle `aimTheta` around the sun (filament aim line). |
| **SNAP** button | Commits a lock attempt against the current relic using current `align` quality. |
| **Pinch** | Zooms camera (`zoom` 0.55–1.85 → `camDist`). |

### 4.2 World model

- Central **dying sun** at origin.
- Player **craft** placed on an orbit ring at `aimTheta`, radius ~95.
- Amber **aim line** from sun through aim direction.
- One **active relic** at a time from a pool of stub assets (hollow moon, broken ring, fossil comet, neutron heart, gravity bell, observatory oculus).
- Relic spawns offset in angle from aim, then **sweeps toward** the aim line at wave-scaled speed.
- Relic has a **lifetime** (`targetMaxLife`); if it expires without a successful SNAP → miss / lose a life.

### 4.3 Alignment meter

- `align ∈ [0,1]` from angular difference between `aimTheta` and `targetTheta`.
- Softness from `waveParams(wave).window`.
- SNAP button gets `.hot` (green pulse) when `align >= goodBand(wave)`.

Bands (wave-scaled, clamped):

- **Perfect:** `align >= perfectBand(w)` (~0.92–0.985)
- **Good:** `align >= goodBand(w)` (~0.78–0.92)
- **OK:** `align >= 0.55`
- Below → miss (“TOO EARLY / OFF”)

### 4.4 Scoring & combo

On successful SNAP:

- Perfect → base **1000**, combo++
- Good → base **500**, combo++
- OK → base **200**, combo reset to 0

Final points that snap:

```text
floor(base * max(1, combo) * (1 + (wave - 1) * 0.08))
```

Miss / timeout → lose 1 life, combo = 0.

### 4.5 Lives, waves, run end

- Start: **3 lives**, wave **1**, score **0**.
- **5 successful snaps** per wave → `wave++`, snaps counter resets, brief WAVE banner.
- Wave scaling (`waveParams`):
  - `speed: 0.45 + wave * 0.08`
  - `window: max(0.08, 0.28 - wave * 0.015)` (tighter alignment)
  - `targetMaxLife: max(1.6, 4.2 - wave * 0.18)` (less time)
  - `decoyChance` exists in params but is **not fully implemented** yet.
- Lives → 0: **RUN OVER** → enter name → save score.

### 4.6 Juice / feedback

- Screen flash (success) / miss flash
- Combo / grade popup (`PERFECT xN`)
- Procedural audio: ~112 BPM pad + kick/hat/arp; lock sting; miss sting; tension rises with wave
- VFX module: craft ion trail, sparks, shooting stars, solar wisps, alignment pulses, lock bursts, optional warp (from earlier build)
- Space backdrop: nebula shader sky, layered starfields, sun glow, ACES tonemapping

---

## 5. Meta systems

### 5.1 Leaderboard

- **Local (reliable):** `localStorage` key `syzygy_snap_local_v1` — top 15 `{name, score, wave, at}`.
- **Global (best-effort):** [scores.keithcirkel.co.uk](https://scores.keithcirkel.co.uk/) game id `ssZMSzhQlPvi`  
  - Submit: POST `/token` then POST form-urlencoded `token&name&score`  
  - Fetch: GET `/g/ssZMSzhQlPvi.json`  
  - **Known issue:** remote board often stays empty from this environment; client falls back to showing local scores under GLOBAL. Treat global as fragile; prefer improving or replacing the backend.
- Player tag cached in `localStorage` key `syzygy_tag`.

### 5.2 Jam telemetry (hard requirements)

Expose for 404 harness / gate:

```js
window.__READY__ = true;           // when startable
window.__START__ = () => { ... };  // begin run (also PLAY button)
window.__GAME__ = {                // every frame
  pos: [x, z],                     // metres (craft xz)
  fps,                             // from REAL dt, never clamped denominator
  speed, score, over,
  draws, tris,
  state, wave, lives
};
```

Gate expectations (jam): ready ≤20s on 4G profile, real tap/click start, player moves ≥1 m under finger, &lt;10 MB transfer, ≤900 draw calls, ≤1.5 M triangles peak, public URL, relative paths only.

### 5.3 404 geometry recipe (hard constraints)

- Every 3D object = Three.js **code module**: `export default function (THREE) { return Group }`
- No downloaded meshes, no asset store, no hand-modelled binary meshes, no huge vertex dumps
- Prefer 404-Repo/404-game-recipe loop: reference → 3 candidates → `verify.mjs` → pick by eye
- Current assets under `assets/` are **stubs** (primitives meeting contract), not final verified 404 assets
- Textures / sky / sound **may** be files; 3D may not
- Recipe repo: https://github.com/404-Repo/404-game-recipe  
- Jam repo (submit PR): https://github.com/404-Repo/404-game-jam

---

## 6. Repository layout

```text
syzygy/
  index.html          # SNAP HUD, menus, leaderboard UI, vignette
  main.js             # arcade loop (authoritative gameplay)
  audio.js            # procedural arcade bed (~112 BPM)
  spacefx.js          # nebula sky + starfields + sun glow
  vfx.js              # trails, meteors, pulses, bursts
  leaderboard.js      # local + global score IO
  assetlib.js         # from 404 recipe harness
  surfaces.js         # from 404 recipe harness
  assets/*.js         # 8 stub relics + dying_sun + craft (+ .expect.json)
  docs/
    LLM_HANDOFF.md    # this file
    STYLE_LOCK.md
    DESIGN_LOCK.md
    ASSETS.md         # form-not-function briefs for real 404 assets
  NOTES.md
  README.md
```

Self-contained static site; GitHub Pages from `main` `/` root.

---

## 7. What players asked for (product goals)

Keep these as north stars for the next ambitious pass:

1. **Addictive** simple loop (one clear verb, immediate feedback)
2. **Visible progression** easy → hard
3. **Score + classement général** (global board must actually work)
4. **Dynamic / stimulating** camera and pacing
5. **Catchy discreet futuristic music** (rhythmic, earworm, not loud)
6. **Alignment fantasy preserved**
7. **Pinch zoom**
8. **Stronger graphics / spatial spectacle**
9. Ambition level of a jam winner on phone playtests (40% “good to play”, 30% “looks made”, 20% “nobody else tried”, 10% craft receipts)

---

## 8. Known gaps / debts

- Global leaderboard persistence unreliable
- `decoyChance` not implemented
- Contemplative features removed (multi-tether, constellation secret 404-AURIGA, 6-min sun collapse win condition) — may return as **meta/prestige** layers, not as core loop
- Assets still stubs — need real 404 recipe verify loop
- No custom `jam.mjs` touch gate yet (recipe keyboard playtest is useless for SNAP)
- Tutorial is thin (coach aside + hints); first-minute onboarding can be stronger
- No haptics, limited particles budget discipline vs jam draw/tri caps
- Cloud Agents unavailable on user’s Cursor plan — edits were done manually and pushed with GH token

---

## 9. Suggested ambitious directions (non-binding)

Useful if the next prompt asks to “go further” without abandoning SNAP:

- **One-thumb perfection:** SNAP anywhere on canvas during hot window; drag only for aim micro-adjust
- **Heat / streak meters,** near-miss sparks, screen shake tiers
- **Boss relics** every N waves (slow huge body, multi-SNAP phases)
- **Daily seed / ghost rival** for global competition
- Replace remote scores with a working board (Firebase/Supabase/own worker)
- Full 404 asset regeneration with style lock + measurable visual claims
- Audio: short motif that evolves with wave; silent mode toggle
- Keep under jam budgets; phone 390×844 first

---

## 10. Non-goals (unless user overrides)

- Desktop-only keyboard controls as primary
- Complex inventory / RPG trees before the verb feels addictive
- Neon cyberpunk palette
- Downloaded GLTF/GLB hero meshes
- Reverting to slow free-roam tether as the only mode

---

## 11. People / context

- Owner/player: **Julien Debournou** (org **Cyma-Connection**)
- Prefers communication in **French**; mark recommended option when presenting choices
- Cannot use Cursor Pro / cloud agents — local edit + git push workflow
- Wants handoff docs so **another LLM** can take a more ambitious instruction next

---

## 12. Quick “resume coding” checklist

1. Clone/pull `Cyma-Connection/syzygy`
2. Serve static root over HTTP (Pages or `python -m http.server`)
3. Read `main.js` (gameplay), `docs/STYLE_LOCK.md`, this handoff
4. Respect 404 geometry rules and jam telemetry
5. Prefer improving SNAP addiction/juice/progression/global ranks over rewriting fiction
6. Push to `main` for Pages auto-deploy; hard-refresh to test

---

*End of handoff.*
