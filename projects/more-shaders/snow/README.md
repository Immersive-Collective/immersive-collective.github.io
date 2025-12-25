# WebXR Snowdrifts – VR Snow Simulation (Three.js)

Single-file Three.js experiment that simulates heavy snowfall with gusts, snow drifts, sticking snow on geometry, volumetric-style clouds, procedural forest, imported GLB models, presets, and minimal WebAudio – all running in the browser and ready for WebXR (Quest 3). 

---

## Features

- **WebXR / VR ready**
  - `renderer.xr.enabled` + `VRButton` for entering immersive VR (e.g. Quest 3 browser).   
  - Same scene works on desktop with OrbitControls and auto-rotate when idle. :contentReference[oaicite:2]{index=2}  

- **Snow simulation**
  - GPU point-sprite flakes with jitter, per-flake seeds and gust influence. :contentReference[oaicite:3]{index=3}  
  - Base wind + local gusts + updrafts; gusts feed into both visual flakes and drifts.   

- **Drifts and sticking snow**
  - Heightfield (“driftGrid”) snow surface with diffusion, advection and obstacle shaping. :contentReference[oaicite:5]{index=5}  
  - “Settlers” that collide with colliders and deposit snow as decals + height gains on the ground. :contentReference[oaicite:6]{index=6}  

- **Scene content**
  - Ground plane + snow mesh, procedural **forest** of cones (count/radius/seed/jitter adjustable). :contentReference[oaicite:7]{index=7}  
  - GLTF / DRACO models (gingerbread man, trees, snowman, cars) with per-instance “stick” flag for snow. :contentReference[oaicite:8]{index=8}  
  - Snowman following a closed Catmull-Rom curve path (snail-slow wander, always facing direction of travel). :contentReference[oaicite:9]{index=9}  

- **Volumetric-style clouds**
  - Instanced planes with custom vertex/fragment shaders (FBM noise, density, softness, edge + height fading). :contentReference[oaicite:10]{index=10}  
  - Tunable color, sky color, opacity, altitude, radius, slice count, movement speed and density. :contentReference[oaicite:11]{index=11}  

- **Fog and color**
  - Fog near/far and fog color controlled via parameters; background color is tied to fog color. :contentReference[oaicite:12]{index=12}  

- **Presets and persistence**
  - **JSON file presets** loaded from `presets/*.json` (built-in list). :contentReference[oaicite:13]{index=13}  
  - **Saved presets** stored in IndexedDB with simple list/select/delete flow. :contentReference[oaicite:14]{index=14}  
  - Last session settings auto-saved to `localStorage` and restored on reload. :contentReference[oaicite:15]{index=15}  

- **WebAudio**
  - Minimal WebAudio graph: background loop from `audio/letitsnow.webm` + simple gust whoosh FX tied to gust strength.   

- **GUI**
  - lil-gui structure with folders for simulation, wind, drifts, sticking, fog, snowman, forest, clouds, presets, etc. :contentReference[oaicite:17]{index=17}  
  - Mobile-friendly sizing and scrollable panel via CSS media queries. :contentReference[oaicite:18]{index=18}  

---

## How it works (short)

- Scene and camera are built in `setupScene()`, with WebXR enabled on the renderer and a VR button injected into the DOM.   
- Snow surface is a plane geometry whose Y vertices are driven by a drift heightfield; settlers and gusts deposit/remove snow into this field. :contentReference[oaicite:20]{index=20}  
- Flakes are rendered as a large point cloud with a custom vertex shader that handles fall speed, jitter, wrapping, gust fields and simple lift. :contentReference[oaicite:21]{index=21}  
- Gusts are small objects with center/radius/strength/swirl/updraft/ttl; they are iterated on CPU and packed into uniforms for the flake shader, and they also modify drifts near obstacles.   
- Clouds are instanced planes driven by a shader that samples multi-octave noise and maps it through density/softness/opacity into alpha and color. :contentReference[oaicite:23]{index=23}  
- Every parameter change goes through `applySettings()`, which clamps ranges, rebuilds world/forest/clouds when requested, refreshes GUI display and persists state. :contentReference[oaicite:24]{index=24}  

---

## Project structure

- `index.html` – main and only entry point: scene, shaders, GUI, presets, WebXR and audio. :contentReference[oaicite:25]{index=25}  
- `models/` – GLB assets (DRACO compressed) used in `MODEL_CONFIG` (gingerbread man, trees, snowman, cars). :contentReference[oaicite:26]{index=26}  
- `presets/` – JSON presets (`snow-*.json`) containing serialized `settings` payloads. :contentReference[oaicite:27]{index=27}  
- `audio/letitsnow.webm` – looping background track, loaded by the minimal WebAudio helper.   

No bundler is required; Three.js and lil-gui are loaded from CDNs via `<script type="importmap">`.   

---

## Controls

- **Desktop**
  - Mouse drag – orbit  
  - Mouse wheel – zoom  
  - Right-drag – pan  
  - `F` – toggle fullscreen  
  - `Esc` – show/hide GUI and HUD :contentReference[oaicite:30]{index=30}  

- **VR (Quest 3)**
  - Open the page in the Quest browser and hit “Enter VR” (WebXR button).  
  - Head movement controls the camera; OrbitControls are disabled while in XR.   

---

## Running locally

1. Serve the repo via any static HTTP server (no build step needed), for example:
   - `npx serve .`  
   - `python -m http.server 8080`
2. Open `http://localhost:8080/index.html` on desktop.
3. For WebXR on Quest:
   - Make sure the server is reachable from the headset (LAN/IP or HTTPS).
   - Open the URL in Meta Quest Browser and press the “Enter VR” button.

Assets in `models/`, `presets/` and `audio/` must be accessible under the paths hard-coded in `MODEL_CONFIG`, `FILE_PRESET_URLS` and `MUSIC_URL`. :contentReference[oaicite:32]{index=32}  

---

## Roadmap ideas

- **Interaction and input**
  - Simple XR controller interactions (e.g. poke/heat gusts, grab objects, toggle presets from VR).
  - Optional hand-tracked UI for preset selection and weather modes.

- **Weather and visuals**
  - Additional weather types (rain, sleet, dust) based on the same infrastructure.
  - Night/day cycle, moonlight, emissive lights, more advanced sky/atmosphere.

- **Performance and scalability**
  - Dynamic LOD for flakes and drifts, resolution auto-tuning based on device.
  - Pre-baked collider bounds or BVH for more complex imported scenes.

- **Audio**
  - Parameter-driven ambience (linking gust strength, snowfall intensity, and footsteps to sound layers).
  - Optional spatialized point sources (e.g. wind through trees, car, house).

- **Tooling**
  - Export/import of presets as URL hashes for quick sharing.
  - Small UI for mapping new GLB models and marking them as snow-catchers without editing code.

