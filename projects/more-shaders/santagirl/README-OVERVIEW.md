# Three.js Winter Scene — Snowdrifts, Gusts, Sticking Snow, Avatar & Vehicles

## Overview

A single-page Three.js experience that renders a winter environment with:

* GPU snowfall with base wind and gust/turbulence controls
* A snowdrift heightfield (ground deformation) with obstacle shaping and redeposition
* “Sticking snow” decals and ground/track stamping from moving entities
* A toggleable avatar controller with collisions and first/third-person camera
* Drivable/interactable vehicles with proximity prompt UI and an outline box helper
* Presets + persistence (last-used settings + named presets) and JSON import/export

## Interaction & Controls

### Camera (OrbitControls)

* Left-drag: orbit
* Wheel: zoom
* Right-drag: pan

### Keyboard

* **V**: toggle avatar control on/off
* **C**: toggle avatar camera view (third ↔ first) when avatar is enabled
* **W/A/S/D** or **Arrow keys**: move avatar (and drive vehicles when mounted)
* **Shift**: run (avatar)
* **Space**: jump (avatar)
* **E**: enter nearest vehicle / exit current vehicle
* **I**: enter nearest vehicle (only when near and not already driving)
* **O**: exit vehicle (only when driving)
* **F**: toggle fullscreen
* **Esc**: exit fullscreen (if active)

### On-screen UI

* **Avatar: OFF/ON** button toggles avatar control
* **View: Behind** button toggles avatar camera view
* Mobile joystick for movement input
* Vehicle prompt panel with **Get in/on**, **Exit**, **Close**

## Core Systems

### Snowfall + Wind + Gusts

* A high-count visual snow field controlled by parameters such as flake count, size, fall speed/jitter, and wind strength/speed.
* Gusts are spawned over time and influence snow motion and drift evolution (including scour + redeposition).

### Drifts (Ground Heightfield)

* A grid-based drift surface is evolved over time.
* Drift shaping accounts for obstacles and supports periodic normal updates for lighting.
* Height sampling is used for aligning/placing entities against the snow surface.

### Sticking Snow + Tracks

* A sticking/decal system deposits snow onto surfaces.
* The avatar and vehicles can stamp/mark snow (footprints/tracks) into the drift/decal systems during motion.

### Avatar

* Loads a GLTF avatar model and provides a movement controller.
* Collision resolution is performed against collider bounds/OBBs to keep movement constrained.
* Camera modes: first-person and third-person (behind avatar).

### Vehicles

* Vehicles are registered as interactables and detected by proximity checks.
* Enter/exit flow updates drive state and UI prompt visibility.
* Driving uses the same movement key state (WASD/arrows) while mounted.
* Includes a vehicle tuning state exposed through lil-gui (per-vehicle profile/tuning).

### Persistence + Presets

* **Last-used settings** are stored in `localStorage` under `snow:lastSettings:v1`.
* **Named presets** are stored in IndexedDB:

  * DB: `snow-presets`
  * Store: `presets`
* Presets support JSON import/export via a hidden file input.

## Included Assets (relative paths)

GLTF/GLB assets referenced by default:

* `models/ready/santagirl.glb` (avatar)
* `models/gingerbread_man-c.glb`
* `models/trees/trees.glb`
* `models/buildings/house.glb`
* `models/christmas_tree_polycraft-c.glb`
* `models/snowman-c.glb`
* `models/car-c.glb`
* `models/vehicles/flying/plane.glb`
* `models/vehicles/ski_patrol1.glb`
* `models/vehicles/snowcar.glb`

Audio helpers exist in code (e.g., `./audio/song.mp3` loader and gust noise generator), but the gust SFX call is currently commented out and music start/stop is not invoked by default.

## How to Run

Serve the project directory as static files (required for ES modules + asset fetch). Open `index.html` through the local server URL.
