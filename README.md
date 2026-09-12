# SYZYGY

A spatial alignment game in Three.js: you orbit a dying sun and drag broken relics into syzygy. Each lock carves a light tunnel and lights a star. Built for the [404 Game Jam](https://game.404.xyz/) — geometry as code.

## Play (local)

Serve the repo root over HTTP (modules + import map):

```bash
# using the 404 recipe harness (recommended)
git clone https://github.com/404-Repo/404-game-recipe.git
cd 404-game-recipe && npm install && npm run selftest
node harness/serve.mjs /path/to/syzygy
```

Or any static server from this directory:

```bash
npx --yes serve -p 5173
```

Open the printed URL. Tap **BEGIN**, then drag to move.

## Jam telemetry

- `window.__READY__` — scene loaded and startable
- `window.__START__()` — begin play (also bound to BEGIN)
- `window.__GAME__` — per frame: `pos` (metres xz), `fps` (real dt), `speed`, `score`, `over`, `draws`, `tris`, `state`

## 404 recipe

3D assets are Three.js modules under `assets/` following [404-game-recipe](https://github.com/404-Repo/404-game-recipe) (`docs/asset-contract.md`). Current meshes are **stubs**; replace via reference → 3 candidates → `verify.mjs` → pick by eye. Style lock: `docs/STYLE_LOCK.md`.

## Status

Scaffold: orbit drag, sun + craft + placeholder relics, dual-temperature lighting, jam hooks. Full syzygy win loop and custom touch gate still to come — see `NOTES.md`.
