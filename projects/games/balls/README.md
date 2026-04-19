# Pink Ball Fluid

Interactive Three.js + Rapier browser experience combining a glossy physics toy with a lightweight arcade loop.

## What it is

This project renders a container full of transmissive floating geometries inside a stylized pink scene. The experience mixes:

- real-time physics simulation
- click / tap popping interactions
- a draggable black sphere that physically pushes other bodies
- a moving yellow interception cube for score-based play
- generated WebAudio sound effects
- live visual tuning through lil-gui

## Core experience

### Fluid object field

A population of mixed geometries is spawned inside a bounded 3D container.

Supported geometry sources:

- primitives: sphere, cube, pyramid, octa, icosa, dodeca
- optional GLB-driven instanced entries:
  - `assets/models/work2.glb`
  - `assets/models/fun2.glb`

Objects use `MeshPhysicalMaterial` with transmission-based glass styling, configurable roughness, clearcoat, opacity, environment intensity, tone mapping, and dispersion.

### Pop interaction

Clicking or tapping a regular geometry pops it.

Pop behavior:

- removes the selected object
- spawns a short visual pop shell
- pushes nearby bodies using `popImpulse`
- respawns a replacement above the visible top edge
- plays a synthesized pop sound

### Black interactive sphere

A dedicated black sphere exists in the simulation as a real physics body.

Behavior:

- desktop: pointer drag
- mobile: touch drag through the same pointer event flow
- while dragged, the sphere becomes kinematic so it can be moved directly
- while released, it becomes dynamic again and behaves like the rest of the physics objects
- carried momentum is restored on release
- collisions with it can mark other objects for scoring

### Yellow target cube

A yellow cube flies slowly left-to-right and right-to-left along the top lane of the scene.

Behavior:

- moves continuously between scene edges
- rotates while moving
- scales with the active simulation size range
- acts as the scoring target

### Score / interception loop

The black sphere enables the game layer.

Loop:

1. push or bounce objects with the black sphere
2. recently hit objects become eligible for interception
3. if an eligible object reaches the moving yellow cube, it is intercepted
4. intercepted objects shrink to zero and are removed
5. score increments and the overlay updates

Only recently black-sphere-touched objects can score.

### Audio

WebAudio is generated at runtime. No external audio files are required.

Included cues:

- pop
- bounce
- intercept
- point / score

Audio is lazily unlocked on user interaction.

## Controls

### Scene controls

- **click / tap regular object** → pop it
- **drag black sphere** → push and bounce other objects
- **restart button** → rebuild the scene and reset score

### GUI controls

lil-gui exposes live controls for:

- simulation density and size
- gravity, spawn height, pop impulse
- colors and color mode
- roughness, clearcoat, opacity, dispersion, env map intensity
- renderer output color space and tone mapping
- environment rotation and speed
- lighting colors and intensities
- mono / mixed geometry selection and weights
- config export / import / save / reset

## Mobile behavior

On mobile / coarse pointers, the GUI is hidden by default.

UI buttons:

- **bottom-right cog** → toggles lil-gui visibility
- **bottom-left restart** → resets scene state and score

Both controls use SVG assets and are designed to keep dark icon strokes/fills visible inside compact round buttons.

Expected icon assets:

- `assets/icons/cog.svg`
- `assets/icons/restart.svg`

## Configuration flow

Startup load order:

1. built-in hardcoded defaults
2. `config/default.json`
3. locally saved config from `localStorage`
4. newer config snapshot from `IndexedDB`

This lets the repo ship a default authored look while still restoring the most recent local user state.

### Config persistence

The current config is persisted to:

- `localStorage`
- `IndexedDB`

The GUI also supports:

- export to JSON
- import from JSON
- manual save
- reset to bundled defaults

## Visual UI

The experience includes:

- full-window canvas scene
- fallback overlay when WebGL is unavailable
- score HUD in the top-left corner
- mobile GUI toggle in the bottom-right corner
- restart control in the bottom-left corner

## Tech stack

- **Three.js** for rendering
- **Rapier** for physics
- **lil-gui** for runtime controls
- **WebAudio API** for synthesized SFX
- **GLTFLoader / DRACOLoader** for optional model-based geometry

## Running locally

Serve the repo through a local web server.

Examples:

```bash
npx serve .
```

or

```bash
python3 -m http.server 8000
```

Do not open the HTML file directly from disk if you expect:

- `config/default.json` loading
- GLB asset loading
- DRACO decoding
- consistent browser module behavior

## Expected repo structure

```text
.
├── config/
│   └── default.json
├── assets/
│   ├── icons/
│   │   ├── cog.svg
│   │   └── restart.svg
│   └── models/
│       ├── work2.glb
│       └── fun2.glb
└── <entry html>
```

## Design intent

The project sits between ambient toy and arcade interaction:

- soft pink glossy fluid-like motion
- tactile popping and pushing
- a single movable “tool” object for player agency
- a clear but lightweight scoring target
- minimal HUD and mobile-friendly controls

## Notes for further work

Natural next additions:

- high score persistence
- combo / streak scoring
- target speed / difficulty scaling
- alternate targets or waves
- multiple audio presets
- dedicated restart / pause / mute states
