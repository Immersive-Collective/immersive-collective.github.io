# Ink Flow Playground (WebGL2) — Technical README

This repo is a self-contained WebGL2 playground that simulates **slow “ink-in-fluid” motion** by advecting two GPU fields:

- **Force field** (`force`): a 2-channel vector texture that stores *user-injected momentum* (and is also used as a driver for dye advection).
- **Dye field** (`dye`): an RGB texture containing “ink” that gets transported, diffused, and slowly dissipated.

A **procedural divergence-free base flow** (generated from a stream function) is added every frame to create continuous vortices and gentle circulation. Pointer interaction injects additional swirl and dye at the cursor.

The implementation is designed to be:
- minimal: one HTML, one JS module;
- stable: velocity clamping and dt limiting to avoid blow-ups;
- tweakable: lil-gui binds everything in real time;
- reproducible: settings persistence + JSON import/export + IndexedDB presets.

---

## Runtime Architecture

### Core data structures

#### `params`
A single settings object containing:
- simulation controls (`timeScale`, `dtMax`, `quality`)
- base flow controls (`baseScale`, `baseStrength`, `baseDrift`, `turbulence`)
- force field controls (`forceStrength`, `forceDissipation`, `forceDiffusion`, `maxVel`)
- dye controls (`dyeDissipation`, `dyeDiffusion`, `fade`, `dyeGain`, `exposure`, `background`)
- interaction controls (`radius`, `dyeAmount`, `pushGain`, `swirlGain`)
- auto emitter controls (`emitters`, `emitterRate`, `emitterPush`, `emitterSwirl`)
- utilities (`reset`, preset + import/export UI callbacks)

Only scalar primitives are persisted/exported (numbers/booleans/strings). Function members are excluded.

#### `DoubleFBO`
Ping-pong framebuffer wrapper:

- `readTex`, `readFBO`
- `writeTex`, `writeFBO`
- `swap()` exchanges read/write each pass
- `clear(r,g,b,a)` clears both read and write buffers to ensure deterministic resets

This avoids read/write hazards and keeps each shader pass single-input → single-output.

#### `sim`
Holds the active simulation buffers and resolution:

- `w`, `h`
- `texel = [1/w, 1/h]`
- `force: DoubleFBO`
- `dye: DoubleFBO`

Resolution is rebuilt on resize or when `quality` changes.

---

## GPU Pipeline (Per Frame)

Each frame runs these steps (unless paused):

1. **Optional emitter injections**
   Small periodic splats inject:
   - swirling force into `force`
   - small amounts of dye into `dye`
   This provides motion even without interaction.

2. **Advect + evolve force field**
   Shader: `FS_ADVECT_FORCE`

   Inputs:
   - `uForce` (current force)
   - `dt`, `texelSize`
   - base-flow parameters
   - force evolution parameters

   What it does:
   - Computes **base velocity** `baseVel(uv)` from a **stream function** `psi(uv)`:
     - `psi` is built from `fbm()` over value noise.
     - `baseVel = (∂psi/∂y, -∂psi/∂x)` → divergence-free swirling flow.
   - Combines velocities:
     - `v = baseVel + force * forceStrength`
   - Clamps velocity magnitude to `maxVel` (prevents “teleport advection”).
   - Semi-Lagrangian advection of force:
     - `backUV = uv - dt * v`
     - sample `uForce(backUV)` and multiply by `forceDissipation`
   - Adds simple diffusion using a Laplacian:
     - `(L + R + B + T - 4*C) * forceDiffusion`

   Output:
   - next force texture (ping-ponged)

3. **Advect + evolve dye field**
   Shader: `FS_ADVECT_DYE`

   Inputs:
   - `uDye` and `uForce`
   - same `baseVel` and combined velocity `v`

   What it does:
   - Advection of dye with the same total velocity:
     - `c = dye(backUV) * dyeDissipation`
   - Adds dye diffusion via Laplacian:
     - `c += laplacian(dye) * dyeDiffusion`
   - Clamps to non-negative

   Output:
   - next dye texture (ping-ponged)

4. **Global fade**
   Shader: `FS_FADE`
   - Multiplies dye by `fade` each frame.
   - This is a gentle “energy loss” layer separate from advection dissipation.

5. **Display**
   Shader: `FS_DISPLAY`
   - Samples `uDye` directly in screen UVs.
   - Adds a subtle background gradient and vignette.
   - Applies an exponential tonemap and gamma.

---

## Shaders & Math Notes

### Divergence-free base flow
The base flow is not a full Navier–Stokes solver. It is a stable, cheap way to get convincing vortices:

- Build a scalar stream function `psi(uv)` from FBM noise.
- Compute derivatives by finite difference with `texelSize`.
- Convert to velocity with:
  - `v = (dpsi/dy, -dpsi/dx)`

This guarantees ∇·v ≈ 0 (up to discretization), giving “circulation” without pressure solves.

### Force field meaning
The `force` texture stores a 2D vector per pixel. It is treated as a momentum-like field that:
- is advected and diffused over time,
- decays via `forceDissipation`,
- drives the dye advection when multiplied by `forceStrength`.

Pointer interaction adds to this texture, so dragging is effectively “stirring” the flow.

### Stability controls
- `dtMax` caps frame delta time to prevent huge advection steps on slow frames.
- `maxVel` clamps the velocity used for backtracing.
- `forceDiffusion` and `dyeDiffusion` provide smoothing that reduces aliasing and noise spikes.

---

## Input & Interaction

### Pointer injection
On pointer drag:

1. Convert pointer position → normalized UV.
2. Compute pointer velocity from previous position and time:
   - `vx = dx / dt`, `vy = dy / dt` (UV/sec)
3. Build injection terms:
   - `push = (vx, vy) * pushGain`
   - `swirl` scales tangential force (cursor-centered rotation)
4. Run two splat passes:
   - `FS_SPLAT_FORCE` adds force into `force`
   - `FS_SPLAT_DYE` adds RGB ink into `dye`

The dye color is chosen from an HSV ramp that changes slowly over time.

### Keyboard shortcuts
- `F`: toggle fullscreen on the canvas element (`requestFullscreen` / `exitFullscreen`)
- `S`: save PNG screenshot by reading back the default framebuffer (`gl.readPixels`) and vertically flipping rows before encoding
- `Esc`: hide/show the lil-gui element (`gui.domElement.style.display`)

Key handling ignores events when focus is inside editable elements.

---

## Persistence & Presets

### Last settings (localStorage)
- Key: `ink:lastSettings:v1`
- Saved payload:
  ```json
  { "v": 1, "savedAt": 1700000000000, "settings": { ... } }
````

* Debounced writes (~200ms) to avoid spamming storage while dragging sliders.
* On load, settings are applied before rebuilding the sim.

### JSON export/import

* Export:

  * Generates `settings-YYYYMMDD-HHMMSS.json`
  * Content is the same shape as the localStorage payload (with `settings`)
* Import:

  * Accepts either:

    * `{ settings: {...} }` payloads, or
    * raw `{...}` settings objects
  * Applies settings and rebuilds the sim when necessary.

### IndexedDB presets

* DB: `ink-presets`
* Object store: `presets` with keyPath `name`
* Record shape:

  ```json
  { "name": "MyPreset", "savedAt": 1700000000000, "settings": { ... } }
  ```
* GUI provides:

  * name input
  * dropdown list of stored presets
  * save/load/delete actions

All preset operations are async and log success/failure to the console when debug is enabled.

---

## Debugging Aids

When `params.debug` is enabled:

* Logs:

  * WebGL caps/extensions
  * canvas resize events
  * sim rebuild resolution + texel size
  * pointer events and injection magnitudes
  * periodic tick logs
* Optional readback sampling (`sample(label, x, y)`):

  * reads one pixel from `dye` and `force` to confirm the simulation is evolving numerically

If the browser/device cannot allocate float render targets, startup fails with a visible fatal screen.

---

## Performance Notes

* Uses WebGL2 + float render targets (RGBA16F + HALF_FLOAT) for smooth accumulation and wide dynamic range.
* Force is stored with NEAREST sampling; dye uses LINEAR when supported (`OES_texture_float_linear`).
* Simulation resolution is decoupled from canvas resolution via `quality`.

---

## Files

* `index.html`

  * full-viewport canvas + module script entrypoint
* `fluid.js`

  * WebGL setup, shaders, ping-pong framebuffers
  * per-frame simulation passes
  * lil-gui bindings
  * localStorage persistence + IndexedDB presets
  * keyboard shortcuts + screenshot export

