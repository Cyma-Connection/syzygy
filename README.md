# SYZYGY — ORBIT SNAP

Arcade orbital alignment for the [404 Game Jam](https://game.404.xyz/). Your craft **auto-orbits** a dying sun — **feel** the alignment, then **SNAP**. Débris = danger. Build combos, clear waves, climb the board.

## Play
https://cyma-connection.github.io/syzygy/

Or serve this folder over HTTP and open `index.html`.

## Controls
- **SNAP** — lock when alignment peaks  
- **LOCK** — unlock after 3 Perfect (brief auto-align)  
- **Pinch** — zoom  
- **Mute** — top-right  

## Jam telemetry
`window.__READY__`, `window.__START__()`, `window.__GAME__` each frame (`pos`, `fps`, `speed`, `score`, `draws`, `tris`, `state`, `wave`, `lives`, …).

## Stack
Three.js geometry-as-code assets, procedural space audio, Pages hosting.
