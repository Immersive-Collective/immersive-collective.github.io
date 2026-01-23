Create file `EMITTERS.md` with this full content.
# Emitters System KB

This document describes the Particle Emitters system: data model, runtime, GUI, presets, textures library (including atlases/spritesheets), and export/import.

---

## Goals

- Place emitters as scene objects.
- Edit emitters live via lil-gui.
- Save/load presets (built-in + user presets).
- Support particle shape rendering:
  - Procedural shapes (square/dot/cross/triangle)
  - External textures
  - Atlases/spritesheets with per-frame selection or sequence playback
- Keep emitter objects compatible with world editor selection and transform gizmos.

---

## High-Level Architecture

### Primary subsystems

- **Emitter Configs (World Data)**
  - Persistent emitter instances placed in the world.
  - Each instance references `presetId` and contains current `params`.

- **Emitter Runtime (Simulation)**
  - Buffer-based particle simulation per emitter instance.
  - Maintains geometry attributes and particle state arrays.

- **Emitter Presets (Authoring Data)**
  - Built-in presets shipped with the app.
  - User presets stored in local storage or a user preset bank.

- **Texture Registry (Authoring Data)**
  - `textures-default.json` loaded first.
  - Provides dropdown entries for texture selection.
  - Supports `type: "atlas"` entries (spritesheets).

- **GUI (lil-gui)**
  - Instance management (select/add/remove).
  - Live parameter editing.
  - Preset actions (apply/save/copy/export/import).
  - Texture / spritesheet UI controls.

- **Renderer Integration**
  - `PointsMaterial` extended using `onBeforeCompile`.
  - Adds custom attributes + uniforms to support per-particle alpha/size/rotation and atlas UVs.

---

## Data Model

### Emitter Instance Config (World Emitters Array)

Each emitter instance lives in a collection (often `emitterState.emitters`) and has:

- `id`: unique emitter instance id
- `presetId`: id of a preset used as a starting point (can change)
- `name`: display label
- `position`: `[x,y,z]`
- `rotation`: `[rx,ry,rz]` (Euler)
- `scale`: number
- `attach`: optional attachment info
- `params`: emitter simulation and rendering parameters

### Emitter Params

Common parameters:

- Spawn:
  - `maxParticles`
  - `rate`
  - `burst`
- Lifetime / motion:
  - `life`, `lifeJitter`
  - `speed`, `speedJitter`
  - `spread`
  - `gravity`
  - `drag`
- Rendering:
  - `size`, `sizeJitter`
  - `opacity`
  - `color`
  - `opacityStart`, `opacityEnd`
  - `sizeStartMin`, `sizeStartMax`, `sizeEndMin`, `sizeEndMax`
- Randomness:
  - `seed`
- Optional forces:
  - `swirlStrength`, `swirlDamp`, `swirlPull`, `swirlAxis`
  - `noiseMode`, `noiseStrength`, `noiseScale`, `noiseSpeed`
- Particle shape/texture:
  - `shape`: `"square" | "dot" | "cross" | "triangle" | "tex" | "sprite"`
  - `texturePick`: id from texture registry
  - `textureUrl`: direct path (used for loading)
- Rotation:
  - `rotate`: boolean
  - `rotationSpeed`
  - `rotationJitter`
- Spritesheet/atlas:
  - `atlasIndex`: 1-based frame index (1..N)
  - `atlasFrameX`, `atlasFrameY`: derived from index and atlas matrix
  - `atlasSeqEnabled`: boolean
  - `atlasSeqFps`: number
  - `atlasSeqLoops`: `0` = infinite, `1..` = number of full-sheet playthroughs
- Loop control:
  - `loop`: boolean
  - `autoStopMs`: number

### Normalization

A normalization function (commonly `normalizeWorldEmittersConfig`) ensures:
- All emitters have required fields.
- All `params` fields exist with safe defaults.
- Legacy configs load without breaking new features.

---

## Presets System

### Built-in Presets

- Shipped as JSON (e.g. `emitters_presets.json`).
- Structure commonly:
  - `{ "presets": [ { "id", "name", "defaults": { ...params } } ] }`
- Loaded once into a library (e.g. `EMITTER_LIBRARY`).

### User Presets

- Stored in a preset bank (commonly localStorage).
- Same `{ id, name, defaults }` shape.
- Merged into GUI options and available for apply/delete/export.

### Preset Operations

- **Apply to selected**
  - Overwrites selected emitter `params` with preset `defaults`.
  - Rebuild runtime if required (maxParticles / shader behavior changes).
- **Save from selected**
  - Saves current selected emitter `params` as a user preset.
- **Copy Preset Data**
  - Copies a single preset payload JSON to clipboard.
- **Export All Presets**
  - Produces one JSON file containing both built-in + user presets.
- **Import Presets**
  - Merges imported presets into user preset bank.

---

## Texture Registry

### File

- `presets/textures-default.json` loaded **before** emitter presets.
- Structure:
  - `{ "textures": [ ... ] }`
- Entries are stored in an in-memory library and lookup map.

### Texture Entry Types

#### Single texture entry

- Minimal fields:
  - `id`, `name`, `size: [w,h]`, `path`

#### Atlas / Spritesheet entry

- Additional fields:
  - `type: "atlas"`
  - `matrix: [cols, rows]`
  - `size: [w,h]`
  - `path`

Example atlas entry:

```json
{
  "id": "magicstones2",
  "name": "Magic Stones 2",
  "type": "atlas",
  "size": [1024, 1024],
  "matrix": [4, 4],
  "path": "assets/images/textures/atlases/magicstones2.png"
}
````

### Texture Selection Logic

* GUI uses `texturePick` (registry id) as the primary selection.
* `textureUrl` is updated from the registry entry `path`.
* `getEmitterTextureIdFromPath(path)` maps an existing `textureUrl` back to an `id`.

---

## Particle Rendering Modes

### Procedural Shapes

* `"dot" | "cross" | "triangle"` are generated using a small canvas texture.
* `"square"` uses no map (default square point).

### Texture

* `shape = "tex"`
* Uses `textureUrl` to load a map.

### Spritesheet (Atlas)

* `shape = "sprite"`
* Uses `textureUrl` to load a map.
* If the selected texture registry entry is `type: "atlas"`:

  * The shader uses `matrix` and a computed `frame` to sample a sub-rectangle.

---

## Atlas Sampling Model

### Atlas frame addressing

* Atlas matrix: `cols`, `rows`
* Total frames: `cols * rows`
* `atlasIndex` is 1-based for UI friendliness.

  * `idx0 = atlasIndex - 1`
  * `frameX = idx0 % cols`
  * `frameY = floor(idx0 / cols)`

### UV mapping

Given `uvRot = gl_PointCoord` (after optional rotation):

* Final UV:

  * `uvFinal = (uvRot + vec2(frameX, frameY)) / vec2(cols, rows)`

This selects the correct tile.

---

## Sequence Playback (Spritesheet Animation)

When `shape = "sprite"` and selected texture is `type: "atlas"`:

* `atlasSeqEnabled = true` activates sequence logic.
* `atlasSeqFps` controls frame advancement rate.
* `atlasSeqLoops`:

  * `0` means loop forever
  * `1..N` means play full-sheet sequence N times, then stop on the last frame

Runtime state typically stored on the emitter runtime object (per instance), e.g.:

* signature for change detection
* accumulator for time->frames
* current frame index
* loops done / stopped flag

Frame order:

* Left-to-right, top-to-bottom:

  * `[0,0]...[0,cols-1]`
  * `[1,0]...[1,cols-1]`
  * ...
  * `[rows-1,0]...[rows-1,cols-1]`

---

## Runtime Simulation

### Runtime Object

Each emitter instance has a runtime entry (commonly `emitterState.runtime.get(id)`), including:

* `group`: root `THREE.Group` for transform
* `holder`: a visible gizmo mesh (world-edit handle), toggled by editor state
* `points`: `THREE.Points`
* `geo`: `THREE.BufferGeometry`

Simulation arrays:

* `pos`: positions `[x,y,z] * max`
* `vel`: velocities `[x,y,z] * max`
* `col`: colors `[r,g,b] * max`
* `alpha`: per-particle alpha * max
* `psize`: per-particle point size * max
* `rot`: per-particle rotation angle * max (used only if `rotate`)
* `rotVel`: per-particle angular velocity * max
* `life`, `age`, `alive`

Curves:

* `size0`, `size1` per particle
* `op0`, `op1` per particle

Randomness:

* seeded RNG state per emitter (`rngSeed`, `rngState`)

### Spawn

* `rate` accumulates fractional spawns into `spawnAcc`.
* `burst` spawns a batch on activation conditions (implementation dependent).
* Each particle gets:

  * randomized life, speed, direction spread
  * randomized color tint from base `color`
  * randomized start/end size and start/end opacity

### Update loop

Per frame:

* integrate age and kill particles at end of life
* apply forces:

  * gravity
  * drag
  * optional swirl/vortex
  * optional noise (turbulence/curl)
* integrate velocity to position
* compute size/opacity over life
* update rotation angle if enabled
* write results into geometry attributes
* mark attributes `needsUpdate = true`

---

## Shader / Material Integration

### Why custom shader

Three.js `PointsMaterial` does not natively support:

* per-particle alpha attribute
* per-particle size attribute
* per-particle rotation of UVs
* atlas sub-UV mapping

### How it works

* Use `PointsMaterial.onBeforeCompile(shader => { ... })`
* Inject custom attributes:

  * `attribute float alpha;`
  * `attribute float psize;`
  * `attribute float rot;`
* Pass to fragment using varyings:

  * `varying float vAlpha;`
  * `varying float vRot;`

### Uniforms

* `uRotEnabled` (float 0/1)
* `uAtlasEnabled` (float 0/1)
* `uAtlasMatrix` (vec2 cols/rows)
* `uAtlasFrame` (vec2 frameX/frameY)

### Fragment sampling

* Compute `uvRot` from `gl_PointCoord`, rotate if enabled.
* Compute `uvFinal` for atlas if enabled.
* Sample `map` using `texture2D(map, uvFinal)` (no color space conversion assumed).
* Multiply `diffuseColor.a` by `vAlpha`.

---

## GUI Design

### Instance Controls

* Add emitter (from a selected preset)
* Remove selected emitter
* Burst test (spawn burst for preview)
* Selected dropdown updates with existing scene emitters
* Name editing updates labels and dropdown text

### Parameter Controls

* Numeric sliders and checkboxes write into selected runtime params.
* Some changes require runtime rebuild:

  * `maxParticles`
  * shader behavior toggles (e.g. rotation enable)
  * map/shape changes (if material recompilation is needed)

### Texture + Sprite Controls

* `shape` dropdown:

  * Square / Dot / Cross / Triangle / Texture / Spritesheet
* `texturePick` dropdown:

  * shows entries from registry
  * includes `type: atlas` entries
* `textureUrl`:

  * still supported for direct path (and for debug)
* Sprite UI (visible only when `shape = "sprite"` and selected entry is atlas):

  * `atlasIndex` (1..N)
  * `Use sequence` checkbox
  * `Seq FPS`
  * `Seq loops`

Visibility rules:

* Sprite controls hidden for non-atlas selections or non-sprite shape.

---

## World Editor Integration

* Emitter root `group.userData` holds metadata:

  * `worldEmitterId`
  * `worldEditKind = "emitter"`
* Holder mesh remains present and is toggled by world-edit state.
* Selected emitter syncs between:

  * world editor selection
  * `emitterState.selectedId`
  * GUI “Selected” dropdown

---

## Export / Import Formats

### Presets export file

* `emitters_presets.json`:

  * `{ "presets": [ { "id", "name", "defaults": {...} } ] }`

### Texture registry file

* `textures-default.json`:

  * `{ "textures": [ { ... } ] }`
  * includes both single textures and atlas entries.

---

## Known Constraints / Notes

* Atlas animation currently advances per-emitter (shared frame across all particles of that emitter). Per-particle independent animation requires an additional per-particle attribute (frame index) and spawning logic.
* `texture2D(map, uv)` sampling assumes source textures are authored for correct appearance; no automatic color space conversion is applied in the custom injected sampling.
* Changing some GUI toggles may require `material.needsUpdate = true` or a runtime rebuild depending on how the material is compiled and cached.

---

## Roadmap Hooks

* Texture editor / overlay can extend `textures-default.json` entries with:

  * atlas frame naming
  * per-frame metadata
  * packing algorithms or trimmed frames (with UV rects)
* Per-particle frame randomization:

  * store a `frameIndex` attribute in geometry
  * assign on spawn
  * use uniform matrix size; compute frame UV per particle in shader
* Animation ranges:

  * add `seqStart`, `seqEnd`
  * play subset sequences per emitter
