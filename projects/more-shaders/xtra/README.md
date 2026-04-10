# Reactive WebGL DNA Waves

https://github.com/user-attachments/assets/dcb2d784-45a5-4c1a-9355-d9681ae3d84a



A single-file **WebGL background** that renders animated **DNA-like wave / helix bands** across the full screen and reacts to mouse or touch movement.

At rest, the scene stays mostly in a dark gray / metallic range. As the pointer moves, the shader receives a trail of motion samples and turns that motion into:

- turbulence
- swirl
- helix distortion
- brighter bridge glow
- gray-to-rainbow color bursts

The file is designed as a **live visual background**, not as a UI-heavy app. The lil-gui panel is there to tune the effect in real time and store looks as reusable presets.

---

## What it does

The program draws a fullscreen animated field of repeated **double-strand wave bands** that resemble abstract DNA helices.

### Visual behavior

- **Idle state:** dark atmospheric helix waves with subtle drift and glow
- **Pointer movement:** injects force, direction, and spin into the field
- **Fast movement:** creates stronger turbulence, more visible color shifts, and more energetic deformation
- **Touch support:** the same interaction logic works on touch devices

### Built-in controls

The top-right panel is **actual lil-gui** and lets you change the live shader parameters, including:

- overall scale
- animation speed
- turbulence
- mouse force
- drift / swirl / bridge glow
- helix A frequency / amplitude / width
- helix B frequency / amplitude / width
- rainbow strength / hue shift / saturation
- base / glow / fog colors
- trail life
- idle motion

### Presets and persistence

The panel also supports:

- automatic restore on refresh
- named presets
- preset save / overwrite
- load selected preset
- delete selected preset
- export selected preset to JSON
- import a preset JSON file back into the app
- remembering open / closed GUI state and folder state

---

## How it works

## 1. Single-file structure

Everything lives in one `index.html` file:

- HTML for the canvas and hidden JSON file input
- CSS for fullscreen layout and lil-gui styling
- JavaScript for WebGL setup, pointer tracking, GUI, persistence, import/export, and animation
- GLSL shaders for the visual effect itself

The only external dependency is **lil-gui**, loaded from a CDN.

---

## 2. Rendering pipeline

The renderer uses **plain WebGL** with a fullscreen quad.

### Vertex shader

The vertex shader is minimal. It only:

- draws two triangles that fill the viewport
- converts clip-space positions into UV coordinates

This means nearly all of the visual work happens in the **fragment shader**.

### Fragment shader

The fragment shader computes the image per pixel. It combines several layers:

#### A. Helix field generation

A helper function builds repeated strand pairs across the screen. Each lane contains:

- one strand on one side
- one strand on the opposite side
- a bridge-like glow between them

Two differently parameterized helix layers are blended together:

- **Helix A**
- **Helix B**

This is what creates the dense, woven DNA-like appearance instead of a single flat sine wave.

#### B. Procedural noise and warping

The shader uses small procedural noise helpers:

- hash
- noise
- fbm (fractal Brownian motion)

These add:

- grain
- fog
- soft irregularity
- flow distortion

Without these, the effect would look too clean and synthetic.

#### C. Pointer-driven flow field

JavaScript sends a short history of pointer samples into the shader as uniform arrays.
Each sample contains:

- position
- age
- speed
- velocity vector
- spin value

The shader loops over those points and accumulates their influence. That influence becomes:

- directional push
- swirl around the trail
- increased local activity
- stronger color response

The faster the pointer moves, the stronger the effect.

#### D. Color mixing

The base image starts from three configurable colors:

- `grayBase`
- `grayLight`
- `shadowTint`

When pointer activity rises, a palette function generates a rainbow based on motion direction and spatial variation. That rainbow is mixed into the grayscale field according to interaction strength.

So the effect behaves roughly like this:

- low activity -> moody gray helix field
- high activity -> rainbow energy blooms through the waves

---

## 3. Pointer interaction model

The program does not just read the current mouse position.
It stores a **trail of recent movement samples**.

### What gets recorded

On mousemove or touchmove, the code calculates:

- normalized pointer position
- movement delta
- time delta
- velocity
- derived spin value

That sample is pushed into a capped list of recent points.

### Why this matters

Because the shader receives a trail instead of one point, the interaction feels fluid:

- motion leaves a wake
- color changes persist briefly
- the field appears to swirl around recent movement
- fast gestures create stronger, longer disturbances

### Trail lifetime

Each point ages out after `trailLife` seconds. Older points are removed, which keeps the effect responsive and prevents buildup.

---

## 4. Idle motion

If the pointer has not moved and `idleMotion` is above zero, the program simulates subtle movement internally. This keeps the background alive even when nobody is interacting with it.

That idle motion is deliberately weaker than real pointer motion.

---

## 5. lil-gui control system

The top-right panel is built with **actual lil-gui**.

The controls are grouped into folders:

- **Presets**
- **Motion**
- **Helix A**
- **Helix B**
- **Color**

Each controller is bound directly to the shared `config` object. When a value changes:

1. the config is updated
2. the new values are sent to the shader every frame as uniforms
3. the session state is scheduled for persistence

This means the GUI is not cosmetic. It directly drives the live render.

---

## 6. Persistence: localStorage + IndexedDB

The project uses **two storage layers**.

### localStorage

Used for fast session restore and lightweight state caching.

It stores:

- current config
- selected preset name
- current preset name field
- GUI open / closed state
- folder open / closed state
- cached preset name list

This makes refresh restoration immediate.

### IndexedDB

Used for durable structured storage.

It stores:

- named presets
- session backup metadata
- preset name metadata

Why both are used:

- **localStorage** is simple and quick for instant restore
- **IndexedDB** is better for named records like presets and larger structured state

On startup, the app first reads localStorage and then checks IndexedDB for newer data.
If IndexedDB has a newer session snapshot, it wins.

---

## 7. Preset workflow

### Save / overwrite

Saves the current config under the current preset name.

### Load selected

Loads the chosen preset from IndexedDB and applies it to the live shader.

### Delete selected

Removes the selected preset from IndexedDB and updates the selector.

### Export selected

Exports a JSON file named like:

`preset-name-YYYYMMDD-HHMMSS.json`

The exported JSON contains:

```json
{
  "name": "My Preset",
  "exportedAt": "2026-04-10T12:34:56.000Z",
  "version": 1,
  "data": {
    "helixScale": 1,
    "animationSpeed": 1,
    "...": "..."
  }
}
```

### Import JSON

Imports a preset file, sanitizes the incoming values, saves it as a named preset, applies it immediately, and updates the preset selector.

---

## 8. Main adjustable parameters

## Motion

- **Scale**: zooms the helix field in or out
- **Speed**: global animation speed
- **Turbulence**: amount of procedural flow distortion
- **Mouse force**: how strongly pointer motion affects the field
- **Drift**: slow directional movement in the field
- **Swirl**: rotational response around pointer trails
- **Bridge glow**: intensity of the connector glow between strands
- **Trail life**: how long interaction samples remain active
- **Idle motion**: amount of autonomous motion when untouched

## Helix A / Helix B

Each helix layer has independent:

- **Frequency**: how often wave lanes repeat
- **Amplitude**: how far strands swing left and right
- **Width**: strand thickness

Using two layers with different values is what creates the layered DNA look.

## Color

- **Rainbow**: intensity of reactive rainbow coloration
- **Hue shift**: rotates the rainbow palette
- **Saturation**: how vivid the color response becomes
- **Base**: darkest underlying tone
- **Glow**: bright strand highlight tone
- **Fog**: atmospheric shadow / haze tint

---

## 9. Runtime loop

Every animation frame, the program does this:

1. resize the canvas if needed
2. update idle motion if no real input is happening
3. age and prune old pointer trail samples
4. pack point data into uniform arrays
5. convert GUI colors from hex to RGB
6. send all current values to the GPU
7. draw the fullscreen quad
8. request the next animation frame

This loop is driven by `requestAnimationFrame`.

---

## 10. Error handling / fallback behavior

The file includes basic startup checks:

- if **lil-gui** fails to load, it shows an error message
- if **WebGL** is not available, it shows an error message
- if preset import JSON is invalid, it shows an alert

---

## 11. Limitations

- The GUI depends on an internet connection because lil-gui is loaded from a CDN.
- This is **WebGL 1**, so the shader stays within that compatibility level.
- The visual uses uniform arrays for pointer samples, so the trail length is intentionally capped.
- The app is designed as a background visual, not as a full scene editor.

---

## 12. Good use cases

- interactive landing page backgrounds
- hero section visuals
- installation / projection experiments
- audiovisual mockups
- shader sketching and parameter exploration
- exporting shareable looks as JSON presets

---

## 13. In one sentence

This project is a **single-file interactive WebGL background** that renders **abstract DNA-like wave helices**, reacts to **mouse or touch motion**, and lets you **tune, save, restore, import, and export** visual presets through **lil-gui**.
