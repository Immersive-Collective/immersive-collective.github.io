# Halftone Video Effect (WebGL) + lil-gui

WebGL real-time video stylisation: halftone shapes, ASCII renderer, gradients (background + dots palette), and a controllable “Mixer” that blends real video bitmap back into the generated dots.

## Live Demo
https://immersive-collective.org/projects/more-shaders/halftone/index.html

https://github.com/user-attachments/assets/dbd55c2e-79d8-4361-994a-f17256410d2c

---

## What It Does

A WebGL fragment shader samples a video texture, converts it to luminance, and renders a grid of procedural shapes whose size is driven by brightness. Colors are fully controllable (solid, gradients, multi-stop palettes), and an optional Mixer can inject the original video bitmap back into the dots using different distribution modes.

---

## Features

- Real-time WebGL halftone rendering from a video texture
- Shape renderer (per-cell):
  - Circle, Square, Cross, Line, Vertical Line, Diagonal Line, Rhomb
- Dot sizing driven by video luminance
- Color pipeline:
  - Background solid color (`Color 1`) + optional **Background Gradient** (linear / radial + direction)
  - Dots:
    - Solid dot color
    - Optional **Dot Gradient** (linear / radial + direction)
    - Multi-stop dot gradient palette (2–8 colors) with Add/Remove color controls
- Image adjustments:
  - Hue
  - Contrast
  - Threshold + Black & White mode
- ASCII Mode:
  - Renders colored ASCII characters from the video (uses the same dot-size as cell size)
- Mixer (video bitmap injection into dots):
  - Enable/Disable
  - Amount (0..1)
  - Mode:
    - Random
    - Dither (Bayer-style thresholding)
    - Seed (stable noise field controlled by seed)
- Video loader:
  - Load a local video file via GUI
- Config workflow:
  - Save current settings to JSON
  - Load settings from JSON
  - Config includes palette + mixer settings
- Fullscreen toggle: press `F`

---

## Setup & Usage

### 1) Clone
```sh
git clone https://github.com/YOUR_USERNAME/Halftone-Video-Effect.git
cd Halftone-Video-Effect
````

### 2) Serve Locally

Browsers block local video/JSON access via `file://`. Use a local server:

**Python**

```sh
python -m http.server 8080
```

**Node**

```sh
npx http-server -p 8080
```

Open:

```txt
http://localhost:8080
```

### 3) Use Your Own Video

* Place a video in `videos/` and update the `<video src="...">` in `index.html`, or
* Use the GUI button **Load Video** and pick a local file

---

## Controls Overview (lil-gui)

### Core

* Dot Size
* Color 1 (background base)
* Color 2 (legacy color control used by some gradient mixes)

### Background Gradient

* Enabled
* Type: Linear / Radial
* Direction (CSS-like directions)

### Dot Colors

* Solid Color

#### Dot Gradient (nested)

* Enabled
* Type: Linear / Radial
* Direction
* Stops (2–8 colors)
* Add Color / Remove Color

### Mixer

* Enabled
* Amount (0..1)
* Mode: Random / Dither / Seed
* Seed (used by Seed mode)

### Image / Output

* Shape
* ASCII Mode
* Hue
* Contrast
* Threshold
* Black & White

### IO

* Load Video
* Save Config
* Load Config

---

## Configuration (JSON)

### Save / Load

* **Save Config** downloads a JSON snapshot of all parameters.
* **Load Config** restores parameters and rebuilds GUI controls.

### Example

```json
{
  "dotSize": 12,
  "color1": "#000000",
  "color2": "#69bef7",

  "gradientEnabled": true,
  "gradientType": "linear",
  "gradientDirection": "top-to-bottom",

  "dotSolidColor": "#69bef7",
  "dotGradientEnabled": true,
  "dotGradientType": "radial",
  "dotGradientDirection": "top-to-bottom",
  "dotGradientColors": ["#69bef7", "#ffffff", "#ff00ff"],

  "mixerEnabled": true,
  "mixerAmount": 0.35,
  "mixerMode": 1,
  "mixerSeed": 1337,

  "shape": 0,
  "hue": 0,
  "contrast": 1,
  "threshold": 0.5,
  "blackAndWhite": false,
  "asciiMode": false
}
```

---

## File Structure

```txt
Halftone-Video-Effect
 ├── videos/               # Video files
 ├── config/               # Optional preset JSON configs (if used)
 ├── index.html            # Main app
 ├── README.md             # Docs
```

---

## Dependencies

* WebGL (runs in modern browsers)
* lil-gui (loaded via CDN import map)

