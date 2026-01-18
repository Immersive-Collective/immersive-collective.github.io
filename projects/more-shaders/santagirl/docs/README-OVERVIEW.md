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
- Snow is rendered as a high-count GPU particle field (`snowPoints`) with per-flake drift, jitter, and near-ground fading.
- Base wind is combined with **gust volumes** that add swirl + radial push + optional updraft; gust influence tapers with distance and height above snow.
- Gusts also drive **terrain change** via scour + redeposition (removing snow near gust centers and depositing downwind). :contentReference[oaicite:0]{index=0}

### Drifts (Ground Heightfield)
- The ground “snow” is a grid-based heightfield (“drifts”) evolved over time.
- Entities sample the drift surface for placement/grounding (e.g., moving props placed onto snow height).
- Drift writes are also used for visible deformation and for keeping surface normals updated for lighting. :contentReference[oaicite:1]{index=1}

### Sticking Snow + Tracks
- “Sticking snow” uses a decal/instancing system to deposit snow onto surfaces (and can be disposed/rebuilt as needed).
- Motion can stamp surface marks:
  - Avatar footprints (when enabled) and
  - Vehicle tracks / wet trail marks (vehicle-sized width/length parameters).
- This is visual feedback layered on top of the drift/terrain systems. :contentReference[oaicite:2]{index=2}

### Avatar (movement + camera)
- Avatar input comes from keyboard + on-screen joystick:
  - Keyboard state is stored in `avatarKeys`
  - Joystick supplies continuous `valueX/valueY`
- Movement is computed relative to camera forward/right on the XZ plane, with accel/decel smoothing (not instant velocity).
- Facing rules:
  - Third-person: yaw turns toward movement direction
  - First-person: yaw follows camera look direction
- Vertical motion:
  - Jump uses gravity + landing snap to “ground surface”
  - Jetpack (when equipped) uses thrust up/down + gravity + drag (Space up, Q down). 

### Objects as Vehicles (enter/drive/exit)
- “Vehicle” is an object instance with `vehicle` metadata (type/description/seatLocal/yawOffset/profile).
- Vehicles are registered as interactables and discovered via proximity checks; the UI prompt shows when near.
- Enter vehicle:
  - Enables `vehicleDriveState`, seeds yaw, switches avatar animation/state, and can enable chase camera.
- Drive vehicle (`tickVehicle(dt)`):
  - Reads forward/steer from joystick or keyboard
  - Smooths speed with accel/brake/coast
  - Smooths steering and converts steer angle → turn radius → yaw rate
  - Applies movement and resolves vehicle XZ collisions
- Vehicle modes:
  - Ground vehicles use turn radius + grip-ish tuning
  - Plane profiles add lift/attitude behavior and reduce turning in air (`airTurnScale`). 

### Collision Detection (how movement stays believable)
Two collision layers run in parallel:

1) Horizontal collision (XZ) for obstacles:
- Avatar is treated as a circle in XZ and resolves overlaps by push-out + sliding.
- Broadphase uses a spatial hash grid over collider sphere-bounds, plus optional OBB colliders for model instances (cars/vehicles/etc.).
- This is “overlap then push-out” (not fully swept collision), so extreme dt spikes can still cause corner pop/tunneling. 

2) Vertical collision (Y) for “grounding”:
- Vertical grounding uses `getWorldSurfaceY(x,z)`:
  - drift/snow surface height sampling, plus
  - highest hit from downward raycasts against meshes flagged as ground (`worldGroundMeshes`).
- To make an object landable (stand on top), it must be included in the ground-ray set (flagged `ground:true`), because landing is driven by surface sampling + ground raycasts, not by the XZ obstacle colliders. 

### WebXR / VR
- Optional VR is enabled via WebXR; OrbitControls are disabled in XR to avoid fighting head pose. :contentReference[oaicite:7]{index=7}


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
