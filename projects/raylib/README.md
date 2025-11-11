# raylib-web playground — N rotating/draggable squares + bouncing gradient balls

This repo is a tiny **raylib on the web** starter plus a fully-worked interactive demo:

* **Web build** via Emscripten.
* **One-shot build** and **file watcher** scripts.
* **Demo app** (`main.c`) showcasing:

  * Multiple independent squares (drag, rotate, pinch-to-scale on touch).
  * Hundreds/thousands of bouncing balls (no ball-ball interaction) with **gradient colors**.
  * Robust collision with rotating squares, trap detection & safe respawn **outside** all squares.

---



https://github.com/user-attachments/assets/ce664bbc-d88e-4fd9-9b7e-8b31fe5bffea




## What’s inside

```
examples/
  squareballpinchpoli/
    main.c         # the demo (multi-squares, touch/mouse, gradients, respawn-safe)  ← start here
    index.html     # minimal HTML shell for web build
    index.js/.wasm # generated artifacts (after build)
build.sh           # web build script (Emscripten → index.js/wasm)
watch.sh           # watch & rebuild loop for fast iteration
```

* `build.sh` compiles `examples/<name>/main.c` to WebAssembly and writes `index.js/.wasm`, enabling ES6 modularized output and memory growth (key flags prewired) .
* `examples/squareballpinchpoli/main.c` contains the multi-square, multi-ball demo with touch/mouse input and gradient coloring, plus safe respawn outside occupied square areas .

---

## Requirements

* **Emscripten SDK** (for web): `emcc` available on PATH.
* **raylib-web static lib & headers** (your paths set in `build.sh` by default).
* Optional (desktop dev): **clang** and **pkg-config** with `raylib` installed.

---

## Quick start (Web)

1. **Build once**

   ```bash
   ./build.sh examples/squareballpinchpoli
   ```

   Output goes to `examples/squareballpinchpoli/index.js` and `index.wasm` with the options shown in the script (ES6 module, modularize, `ALLOW_MEMORY_GROWTH=1`, etc.) .

2. **Serve locally**

   Any static server works. For example:

   ```bash
   cd examples/squareballpinchpoli
   python3 -m http.server 8000
   # open http://localhost:8000
   ```

3. **Develop with watch**

   ```bash
   ./watch.sh examples/squareballpinchpoli
   ```

   This script rebuilds when sources change (see the script for details).

---

## The demo: controls & behavior

### Mouse & Keyboard (desktop)

* **Drag a square**: Left-click **on** a square and move.
* **Rotate a square**: Right-click **on** a square and move horizontally to rotate.
* **Resize a square**: Mouse wheel over a square (clamped between min/max).
* Balls bounce on the window edges and on all squares. If any ball is detected fully inside a square (rare edge case), it is **killed** and **respawned outside** all squares at a safe distance.

### Touch (mobile)

* **One finger** on a square: drag/translate that square.
* **Two fingers** near/over a square: pinch-to-scale (baseline-relative) and rotate about the two-finger axis.
* Multi-touch is tracked by **pointer IDs** to prevent “jumping” when a finger lifts; transitions are debounced.

---

## Under the hood (highlights)

* **Multiple squares** (parametrized)

  * `Square` struct with `x,y` (center), `half` (half-side), `angle` (degrees). N squares configured at startup, with per-square pinch baselines and input hit-testing order (topmost wins) .

* **Bouncing balls**

  * Simple kinematics per ball (`x,y,vx,vy,r,col`), adaptive substeps to reduce tunneling, collisions resolved against **each** square using local-space closest-point on a rotated AABB + reflection, with a separation bias to avoid sticking .
  * **Trap detection**: if a ball is found **fully inside** a square, it is respawned outside all squares (see `RespawnBallOutsideAllSquares`) .

* **Gradient colors**

  * A small multi-stop gradient sampler. Edit the `GRADIENT_STOPS` array to customize the palette; balls sample a random `t∈[0,1]` at spawn for smooth distribution .

---

## Scripts

### `build.sh`

One-shot web build to `index.js/.wasm` with sensible defaults:

* `-DPLATFORM_WEB`, `-s WASM=1`, `-s EXPORT_ES6=1`, `-s MODULARIZE=1`
* `-s ENVIRONMENT=web`, `-s ALLOW_MEMORY_GROWTH=1`, `-s ASYNCIFY`, `-O2`
* Includes/links controlled by `RAYLIB_INCLUDE` and `RAYLIB_WEB_LIB` env vars (auto-set to repo defaults; override if needed) .

Usage:

```bash
./build.sh examples/some-example
```

### `watch.sh`

Simple watcher loop that re-invokes `build.sh` when files change (see script for exact detection strategy).

---

## Desktop build (optional)

A quick **macOS** build (if `pkg-config --cflags --libs raylib` works):

```bash
clang -std=c99 -O2 main.c \
  $(pkg-config --cflags --libs raylib) \
  -framework Cocoa -framework IOKit -framework CoreVideo \
  -o squareballpinchpoli
./squareballpinchpoli
```

> Tip: For a reusable desktop target, add a tiny `CMakeLists.txt` and use `cmake --build` as usual.

---

## Customize

* **Change counts**: `NUM_BALLS`, `NUM_SQUARES`.
* **Square sizes**: `SQUARE_SIZE_DEFAULT`, `SQUARE_MIN_SIDE`, `SQUARE_MAX_SIDE`.
* **Ball speeds & radii**: `SPEED_MIN/MAX`, `BALL_RADIUS_MIN/MAX`.
* **Colors**: adjust `GRADIENT_STOPS` to any Colors (or add a compile-time HEX→Color macro if preferred).
* **Background**: `ClearBackground(...)` in the draw pass controls canvas color (look for `ClearBackground(WHITE)` in `main.c`) .

---

## Common pitfalls & fixes

* **“expected identifier or '(' … PI”**
  raylib defines `PI` as a macro; use a distinct name like `PI_F` for floats.

* **“initializer element is not a compile-time constant” when using functions in `static const`**
  Use **constant expressions** only in file-scope `static const` initializers. For Colors, prefer literal structs (e.g., `(Color){r,g,b,a}`) instead of runtime helpers.

* **`RuntimeError: memory access out of bounds` in web build**
  Usually from too many balls or recursion/stack use. This template enables `ALLOW_MEMORY_GROWTH`. If pushing limits, reduce `NUM_BALLS`, radii, or substeps, or raise the initial memory via Emscripten flags in `build.sh` (e.g., `-s INITIAL_MEMORY=...`) .

* **Perf drops**
  Lower `NUM_BALLS`, reduce `MAX_SUBSTEPS`, prefer `DrawPixelV` for very small balls (as already done), or skip far-away collision checks (already coarse-culled by hull distance).

---

## What raylib brings

* Cross-platform, single-file-friendly C API for **windows, input, drawing, audio, textures, meshes, shaders**.
* Ideal for quick interactive toys, tools, UI prototypes, and games.
* With Emscripten, the **same C code** runs in the browser as WebAssembly.

Explore more at [raylib’s examples and cheatsheets] — then drop code straight into this project’s pattern.

---

## Suggested next steps

* Add **UI toggles** (counts, speeds, color themes) via simple keybinds.
* Implement **ball pooling** for dynamic spawn/despawn.
* Add **scenes**: pause, reset, presets for N squares and palettes.
* Export a **desktop** build target alongside web.

---

## License

Follow raylib’s license for the linked library; project code can be MIT/Unlicense—adjust to your needs.

---

### Appendix: key code entry points

* **Squares + input**: creation & per-square gesture handling, wheel resize, drag/rotate, and touch pinch logic live in the `main.c` “INPUT” section and helpers (`TopSquareAt`, `UpdateTrackedTouches`) .
* **Ball spawning & safety**: `RespawnBallOutsideAllSquares` guarantees new balls do **not** spawn inside any square; it also pushes candidates outside each square’s circumscribed hull before accepting them .
* **Collision**: `ResolveCircleVsSquare` performs local-space closest-point tests with reflection and a small separation bias to prevent sticking on rotating edges .
