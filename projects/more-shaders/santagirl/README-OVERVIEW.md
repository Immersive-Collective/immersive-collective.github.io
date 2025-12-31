# Three.js Winter Mini-Metaverse — Snowdrifts, Gusts, Sticking Snow, Worlds, Editor, Avatar & Vehicles

A single-page Three.js experience that renders a winter environment with snow simulation, a playable avatar + vehicles, and a lightweight “mini metaverse” layer: **worlds**, **in-scene editing**, and **local player profile**.

---

## What’s Included

### Visual + Simulation Systems
- **GPU snowfall** with base wind plus gust/turbulence controls.
- **Snowdrift heightfield** (ground deformation) with obstacle shaping, scour + redeposition.
- **“Sticking snow” decals** and ground/track stamping from moving entities.
- **Fog controls** (near/far/color) and background color.
- **Volumetric clouds** with adjustable height, density/softness, scroll speed, and color/opacity.
- **Procedural environment scattering**:
  - **Forest** (tree cones) controls: count/radius/seed/scale/randomness.
  - **Rocks** controls: count/radius/seed/scale/randomness.
- **Snowman path animation** (optional) with radius + speed controls.
- **Minimal WebAudio hooks** (background music buffer + gust FX helpers).

### Gameplay / Interaction
- **Toggleable avatar controller** with collisions and first/third-person camera.
- **Drivable/interactable vehicles** with proximity prompt UI and an outline helper.
- **Chase camera mode** for staying “locked” behind the avatar while still using OrbitControls.
- **Pause/resume** for the simulation time step.

### “Mini Metaverse” Layer
- **Worlds system (IndexedDB):**
  - Save the current world (model transforms + selected settings) into a world record (with thumbnail).
  - Browse, load, export, delete, and import worlds.
  - Active world selection persists and reloads the page to fully swap loaded models.
- **World editor mode (TransformControls):**
  - Select and transform placed GLTF instances in-scene (translate/rotate/scale).
  - Undo/redo + duplicate/delete actions.
  - Action toast notifications for editor operations.
- **Local Player Profile:**
  - Persisted player ID, name, color, and “about” metadata.

---

## Interaction & Controls

### Camera (OrbitControls)
- Left-drag: orbit  
- Wheel: zoom  
- Right-drag: pan  

### Keyboard (General)
- **⌘/Ctrl + /**: toggle keyboard shortcuts overlay
- **V**: toggle avatar control on/off
- **C**: toggle avatar camera view (third ↔ first) when avatar is enabled
- **B**: toggle avatar chase camera (keeps camera target locked to avatar in 3rd-person)
- **P**: pause / resume simulation
- **W/A/S/D** or **Arrow keys**: move avatar (and drive vehicles when mounted)
- **Shift**: run (avatar)
- **Space**: jump (avatar)
- **E**: enter nearest vehicle / exit current vehicle
- **I**: enter nearest vehicle (only when near and not already driving)
- **O**: exit vehicle (only when driving)
- **⌘/Ctrl + S**: save current world
- **F**: toggle fullscreen
- **Esc**: exit fullscreen (if active)

### World Editor (when **Edit World: ON**)
> Editor mode enables clicking scene models to select them and use TransformControls for editing.

Common shortcuts (matching Three.js TransformControls conventions):
- **W**: translate
- **E**: rotate
- **R**: scale
- **Q**: toggle local/world space (if enabled)
- **Shift + D**: duplicate selected instance
- **X**: delete selected instance
- **⌘/Ctrl + Z**: undo
- **⌘/Ctrl + Y** (or **⌘/Ctrl + Shift + Z**): redo

### On-screen UI
Top-left button strip:
- **Avatar: OFF/ON** — toggle avatar controller
- **View: Behind** — third/first person view
- **Edit World: OFF/ON** — enable world editor mode
- **Worlds** — open world browser overlay
- **Save World** — save current world
- **Profile** — open local player profile overlay

Other UI:
- **World name label** at top center (updates when a world is loaded/active).
- Mobile **joystick** for movement input.
- Vehicle prompt panel with **Get in/on**, **Exit**, **Close**.

---

## Worlds & Persistence

### Settings + Presets
- **Last-used settings** are stored in `localStorage` under `snow:lastSettings:v1`.
- **Named presets** are stored in IndexedDB:
  - DB: `snow-presets`
  - Store: `presets`
- Presets support JSON import/export via a hidden file input.

### Worlds (Saved scenes)
Worlds are stored in IndexedDB:
- DB: `snow-worlds`
- Store: `worlds`
- Active world id persisted in `localStorage` key `snow:activeWorldId:v1`

Each world record stores:
- `title`, `description`
- `thumbnail` (captured from the renderer)
- `models` (scene model configuration snapshot)
- `settings` (a compact subset of current sim/gui settings)

World overlay actions:
- **Save Current**: creates a new world entry from current scene state
- **Import JSON**: import a previously exported `.world.json` file
- For each saved world: **Load**, **Export**, **Delete**

> Loading a world triggers a page reload to fully swap loaded models.

### World model config load priority
World model placement/config is loaded in this priority order:
1) Active world from IndexedDB (`snow-worlds` / `worlds`, keyed by `snow:activeWorldId:v1`)  
2) Legacy localStorage override (`snow:worldModelsOverride:v1`)  
3) `worlds/default_model.json` (if present)  
4) Baked `MODEL_CONFIG` fallback  

---

## Core Systems (High Level)

### Snowfall + Wind + Gusts
A high-count visual snow field controlled by parameters such as flake count, size, fall speed/jitter, and wind strength/speed.
Gusts are spawned over time and influence snow motion and drift evolution (including scour + redeposition).

### Drifts (Ground Heightfield)
A grid-based drift surface is evolved over time. Drift shaping accounts for obstacles and supports periodic normal updates for lighting.
Height sampling is used for aligning/placing entities against the snow surface.

### Sticking Snow + Tracks
A sticking/decal system deposits snow onto surfaces. The avatar and vehicles can stamp/mark snow (footprints/tracks) into the drift/decal systems during motion.

### Avatar
Loads a GLTF avatar model and provides a movement controller with collision resolution (bounds/OBBs).
Supports first-person and third-person camera, plus optional chase camera behavior.

### Vehicles
Vehicles are registered as interactables and detected by proximity checks. Enter/exit flow updates drive state and UI prompt visibility.
Driving uses the same movement key state (WASD/arrows) while mounted. Vehicle tuning/state is exposed through lil-gui.

### WebXR / VR
A WebXR **Enter VR** button is shown on XR-capable browsers (Quest/Pico/Vive etc.). OrbitControls are disabled while in XR to avoid fighting head pose.

---

## Included Assets (relative paths)

GLTF/GLB assets referenced by default:
- `models/ready/santagirl.glb` (avatar)
- `models/gingerbread_man-c.glb`
- `models/trees/trees.glb`
- `models/buildings/house.glb`
- `models/christmas_tree_polycraft-c.glb`
- `models/snowman-c.glb`
- `models/car-c.glb`
- `models/vehicles/flying/plane.glb`
- `models/vehicles/ski_patrol1.glb`
- `models/vehicles/snowcar.glb`

Audio helpers exist in code (e.g., `./audio/song.mp3` loader and gust noise generator). Music start/stop is not invoked by default.

---

## How to Run

Serve the project directory as static files (required for ES modules + asset fetch), then open `index.html` from the server URL.

Examples:
- `python -m http.server 8080`
- `npx serve .`

---

## Dev Notes

- Vehicle debugging bridge is installed on the renderer canvas for quick inspection during development.
- Exported worlds use the filename pattern: `<title>.world.json`.
- World editor changes are applied to the world model configuration; saving a world persists those transforms in IndexedDB.
