A single-page Three.js/WebGL winter “world” app: snow + drifting terrain simulation, a playable avatar with camera modes, and objects that can be mounted as vehicles. It also includes a lightweight “worlds” layer (save/load via IndexedDB), an in-scene editor (TransformControls + undo/redo), and UI overlays (minimap, prompts, keyboard help, profile). 

## Purpose (what it does)

* **Renders a 3D scene** using Three.js with OrbitControls for camera navigation and a configurable renderer (shadows, pixel ratio, fog, etc.).  
* Implements a **snow simulation / visuals** (particle “snowPoints”, gust parameters, and “sticking snow” decal system). 
* Provides **player/avatar features**: local player profile stored in `localStorage`, avatar catalog selection, camera modes (third/first person + behind/chase behavior), and on-screen joystick for mobile-like movement.   
* Adds **world content management**: world models loaded from JSON, ability to export/import “world models” and manage worlds (local/private/global sections in UI).  
* Supports **vehicles** (GLB-based vehicle instances with driving profiles) and an on-screen “enter/exit vehicle” prompt. 
* Optional **VR mode** via WebXR `VRButton`. 

## Structure (how it’s organized)

### 1) HTML layout (UI + canvases)

* A full-screen container `#app` where the Three.js renderer canvas is injected. 
* UI components layered on top:

  * **World name label** (top-center), **minimap button + map overlay** (canvas). 
  * **Avatar/world buttons** (toggle avatar, view mode, edit mode, worlds, save, inventory, profile). 
  * **Edit stack** (undo/redo/transform/add/duplicate/delete). 
  * **Joystick** (touch input), **vehicle prompt**, **keyboard help**, **profile modal**, **world picker**, **inventory/object pickers**. 

### 2) Styling

* Large embedded CSS defines the HUD/modals, mobile responsiveness, and “glass” UI look. 

### 3) Module imports

* Uses an **import map** for Three.js modules and imports OrbitControls, TransformControls, GLTF/DRACO loaders, VRButton, plus lil-gui for settings.  

### 4) State + persistence utilities

* **Player profile** stored in `localStorage` (id/name/color/avatar/about), validated/sanitized on load. 
* **“Last settings”** persisted to `localStorage` with debouncing for performance. 
* **Presets** stored in **IndexedDB** (save/load/delete/list) with import/export JSON.  

### 5) Scene setup + render plumbing

* `setupScene()` creates `scene`, `camera`, `renderer`, OrbitControls; configures fog and shadows; hooks input events; installs TransformControls; configures lights.   
* Shadow settings are applied via a dedicated function that tracks “last applied” values to avoid churn and forces shadow-map rebuild when needed. 

### 6) World editing subsystem

* Maintains `worldEditState` (enabled + selected object), a selectable set of roots, and a raycaster for picking. 
* TransformControls “dragging-changed” is used to:

  * disable OrbitControls while dragging,
  * push an undo snapshot,
  * on release, sync transforms back into the world’s instance config and rebuild collision/minimap data.  

### 7) Avatar + camera modes

* Stores/restore pre-avatar OrbitControls camera state and supports “behind avatar” camera placement and view-mode switching logic. 

### 8) World models + worlds UI

* Defines a **world models config** (including vehicles) and constants/keys for world storage/selection; the “world picker” UI sections imply multiple sources (local/private/global) and full reload on selection.  





## Avatar steering and movement

### Inputs (keyboard + mobile joystick)

* **Keyboard intent** is tracked in `avatarKeys` (forward/back/left/right/run/jump/jetDown) and converted into a 2D movement intent `avatarState.moveX/moveZ` via `recomputeAvatarMoveFromKeys()` when WASD/arrow keys change.
* **Joystick intent** is tracked in `joystickState.valueX/valueY` and updated by pointer events (`pointerdown/move/up`).
* **Key bindings (core):**

  * Move: `WASD` / arrow keys
  * Run: `Shift`
  * Jump: `Space`
  * Jetpack down: `Q` (only when avatar enabled and not driving)
  * Toggle avatar control: `V`
  * Toggle view (first/third): `C`
  * Chase camera toggle: `B` (third-person avatar / vehicle)

### How the avatar’s direction is computed

`updateAvatarFromInputs(dt)` blends joystick or keyboard intent into a movement vector **relative to the camera**:

* Gets `camForward` from the camera direction, flattens to XZ, normalizes.
* Computes `camRight` from `camForward × worldUp`.
* Builds a desired move direction: `camForward * forwardAmount + camRight * strafeAmount`.
* Target speed = walk or run speed (`AVATAR_WALK_SPEED = 2.4`, `AVATAR_RUN_SPEED = 4.0`) scaled by input magnitude.

### Acceleration / deceleration (feel of steering)

Instead of instantly setting velocity, it eases toward `desiredVel`:

* If no input: decelerates toward zero using `avatarMotionConfig.maxDecel`.
* If input: accelerates/decelerates toward the target using `maxAccel` / `maxDecel`.
* Stops tiny drift using `stopEps`.

### Collision and sliding (XZ)

After applying movement, it resolves overlaps against colliders and slides along them (prevents sticking/tunneling patterns):

* Movement is applied, then `resolveAvatarXZCollisions(avatar.position)` is called.
* There’s also a more detailed swept/slide implementation (`moveAvatarXZWithCollisions`) for ray-based sliding behavior.

### Facing (yaw) rules

* **Third-person:** yaw turns toward the actual movement direction (lerped via `yawLerpThird`).
* **First-person:** camera pins to head; avatar yaw follows camera look direction (lerped via `yawLerpFirst`).

### Jump vs jetpack vertical motion

`updateAvatarJump(dt)`:

* Normal jump: uses `initialVelocity` and gravity; lands when reaching surface height.
* If equipped item is a **jetpack** (`meta.action/type == "jetpack"`), then `Space` (up) and `Q` (down) apply thrust + gravity + drag, with clamped vertical speeds.

## Interactions with objects (vehicles + equipment)

### Interaction discovery: proximity queries

Two interactable registries exist:

* `vehicleInteractables` for vehicles
* `equipmentInteractables` for equipment
  Both are populated when world instances load (e.g., `registerVehicleInstance`, `registerEquipmentInstance`).

Nearby checks:

* `findNearbyVehicle()` / `findNearbyEquipment()` compute the nearest item within reach using avatar radius + object radius + a small buffer. 

### Prompt + highlight

`tickVehicleProximity()` decides what the player is “near” each frame (when not driving):

1. If already holding equipment → show that prompt.
2. Else if near a vehicle → prompt + outline highlight.
3. Else if near equipment → prompt.
4. Else close prompt + clear outline.

### Equip / unequip equipment

* Equip: `equipItem(near)` attaches the equipment object to an avatar bone (resolved by `getAvatarEquipAttachmentNode(boneName)`), rescales for stable attachment, switches avatar action, and keeps the prompt updated.
* Unequip: `unequipItem()` restores the object to the scene, restores original transform/visibility, and drops it **in front of the avatar** so it can be re-picked up. 

### Enter / drive / exit vehicles

**Entering a vehicle**

* `enterVehicle(v)` enables `vehicleDriveState`, seeds yaw (vehicle rotation + optional `yawOffset`), resets steering/pitch/roll, switches animation (`drive` if available), enables vehicle chase cam, resets joystick.

**Vehicle simulation / steering**
`tickVehicle(dt)`:

* Reads forward/steer from joystick, otherwise keyboard left/right and forward/back.
* Smoothly approaches a target speed using accel/brake; coasts to 0 when no input.
* Smooths steering angle toward `desiredSteer` with separate response/return rates.
* Converts steer angle to a turn radius using wheelbase/tan(steerAngle), clamps with `minTurnRadius`, and applies yaw rate = speed/radius.
* Moves vehicle forward by `speed * dt` and resolves vehicle XZ collisions.

**Ground vs plane**

* If the vehicle profile indicates plane mode, it adds airborne lift/attitude (pitch/roll) behavior and reduces turning in air (`airTurnScale`).

**Exiting a vehicle**

* `exitVehicle()` places the avatar beside the vehicle using `vehicleDriveState.yaw` (so slope tilt doesn’t break placement), resets drive state, returns to idle, clears prompt/outline, resets joystick.

### Interaction keys and UI buttons

* `E`:

  * If driving → exit vehicle
  * Else if holding equipment → unequip
  * Else if near equipment → equip
  * Else if near vehicle → enter
* `O`: exit vehicle (when driving). 
* The prompt panel also has click handlers for enter/exit/close.





### Two independent “collision” systems are running

#### 1) Horizontal collision (XZ) against obstacles (trees/rocks/cars)

* The avatar is treated as a **circle in XZ** (radius `avatarCollision.radius`) with a small buffer `skin`. 
* Each frame, horizontal intent is computed in `updateAvatarFromInputs(dt)` and then the avatar is moved in XZ and **pushed out of overlaps** by `resolveAvatarXZCollisions(pos)`. 
* `resolveAvatarXZCollisions` does:

  * **Clamp to playable bounds** (so you can’t leave the snow area). 
  * **Broadphase** via a spatial hash grid built from `colliderBounds` (sphere bounds for “forest/rocks + stick meshes”). 
  * For each overlapping collider sphere: pushes the avatar out, and removes the component of `avatarVelocity` going *into* the obstacle (so it slides). 
  * Also resolves overlaps against **OBB colliders** (cars etc.) in `avatarModelColliderOBBs`, again pushing out and removing into-normal velocity.

So: **XZ obstacle collision is “overlap then push-out”** (not true swept collision), which is why corner pop/tunneling can happen on fast movement or large `dt` spikes.

#### 2) Vertical “ground / terrain” collision (Y) via sampled surface height

* Vertical collision is not done with the obstacle colliders above. It uses a separate “what is the ground under (x,z)?” query: `getWorldSurfaceY(x,z)`. 
* `getWorldSurfaceY` returns:

  * The snow/terrain height (`getSnowSurfaceY` → `sampleSnowHeight` etc.), **plus**
  * The highest hit from a **downward raycast** against `worldGroundMeshes` (instances flagged `ground:true`). 

So: avatar Y is “snapped / landed” onto the **highest traversable surface** at the current XZ.

### How jumping + landing works

* Jump starts in `requestAvatarJump()` by setting `avatarJumpState.vy` and marking `active=true`, `grounded=false`. 
* Each frame `updateAvatarJump(dt)`:

  * Recomputes `groundY = getWorldSurfaceY(avatar.position.x, avatar.position.z)` (so moving while airborne changes the target landing height).
  * If not jumping, it keeps the avatar grounded and **sets `avatar.position.y = groundY`**.
  * If jumping, it integrates `vy` with gravity, updates `avatar.position.y`, and **lands when `y <= groundY`**, snapping to `groundY` and clearing the jump state. 

### Important implication (common cause of “jumping feels wrong on objects”)

To “land on top” of an object, that object must be included in `worldGroundMeshes` (i.e., be an instance mesh flagged `ground:true`), because **landing is driven by `getWorldSurfaceY`**, not by the XZ obstacle colliders. 

If you point to one example object where landing/jumping is wrong (tree? rock? car roof? custom model), it’s possible to say immediately which list it’s in (`colliderBounds` vs `worldGroundMeshes`) and why the avatar either lands correctly or falls through/bumps.




### Why Composer was a bad assumption for your case (WebXR default)

* **WebXR renders to an XR-controlled framebuffer** (often multiview / special swapchain). Classic post chains (`EffectComposer` + offscreen render targets) are **not guaranteed XR-safe** and commonly end up **disabled in XR** or require **XR-specific handling**.
* In a WebXR-default app, the safest baseline is:

  * `renderer.xr.enabled = true`
  * `renderer.setAnimationLoop(loop)`
  * Render directly to the XR framebuffer (no composer in the critical path)

### Correct mental model for “PP” in a WebXR-default app

* **XR path (default):** keep it “native renderer” (toneMapping, exposure, fog, lights, materials). If extra effects are needed, use **XR-compatible** approaches (very selective; often custom single-pass shader or renderer-level options).
* **Non-XR path (fallback / desktop preview):** optional post stack can exist, but must never define core visuals.

### What “decent understanding” looks like for your app (overview)

* **Avatar**: joystick/keys → camera-relative movement on XZ, yaw rules depend on camera mode, vertical grounding uses surface sampling/raycast set.
* **Vehicles**: objects have `vehicle` metadata; entering sets drive state; driving integrates speed/steer and resolves XZ collisions; exiting restores avatar.
* **Snow / Gusts / Drifts**: GPU snowfall visuals + gust volumes; gusts also affect drift heightfield; drift surface feeds grounding and placement.
* **Collision**: XZ push-out against collider set + Y grounding against drift + “ground meshes” raycast set; “standable” requires being in the ground-ray set.
* **JSON-loaded profiles/presets**: app behavior is driven by preset JSON (rendering, environment, avatar/vehicle tunings), so docs must describe “systems + which JSON keys control them.”

### Next concrete doc change (no code)

If the goal is “enhance PP”, the docs should define **PP = XR-safe renderer look controls**, not composer stacks.

Say which doc to update first:

* `README-OVERVIEW.md` (system overview), or
* `KB.md` (how-to / tuning keys), or
* both (overview + key reference)

And “pp” here should be treated as:

* tone mapping / exposure / fog / sky / bloom-like *material* tricks (XR-safe),
* not EffectComposer chains.







### Vehicle tuning cheat sheet (quick)

**If it’s too fast**

* `maxSpeed` ↓ (likely m/s; 30 ≈ 108 km/h)
* `accel` ↓ (slower to reach max)
* `coastDecel` ↑ (slows down when not throttling)
* `brake` ↑ (stops faster)

**If it turns too fast / too twitchy**

* `turnRate` ↓ (primary “steer strength”)
* `minTurnRadius` ↑ (bigger = wider turns)
* `steerResponse` ↓ (less twitch on input)
* `lateralGrip` ↓ (less “bite”, more drift/slide)

**If it won’t return to straight**

* `steerReturn` ↑

**Good starting ranges (car-like)**

* `maxSpeed`: **20–35**
* `maxReverse`: **3–6**
* `turnRate`: **0.15–0.35**
* `minTurnRadius`: **5–9**
* `steerResponse`: **3–6**
* `steerReturn`: **5–9**
* `lateralGrip`: **6–9**

**One-line fix for your current profile**

* Change `maxSpeed: 111` → **30.8** (if you meant 111 km/h)
