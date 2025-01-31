

# Halftone Video Effect with lil-gui

# Live Demo
https://immersive-collective.org/projects/more-shaders/halftone/index.html



https://github.com/user-attachments/assets/dbd55c2e-79d8-4361-994a-f17256410d2c



This project is a WebGL-based halftone video effect that allows you to apply a customizable halftone pattern to a video in real-time. Using WebGL shaders, you can modify the dot size and color scheme dynamically via an interactive GUI powered by lil-gui.

### **Concept: Halftone Video Effect Shader**
This **WebGL shader** creates a **halftone effect** on a video by sampling pixel brightness and rendering dots of varying sizes based on intensity.

---

### **Implementation:**
1. **Vertex Shader**  
   - Defines screen-space coordinates and texture mapping.
   - Fixes texture Y-flip issue.

2. **Fragment Shader (Halftone Effect)**  
   - Samples video texture and converts it to grayscale using **luminance**.
   - Divides the image into a **dot grid** based on `u_dotSize`.
   - Computes **circle radius per grid cell** (larger for dark areas, smaller for bright areas).
   - Uses **mix() function** to interpolate colors between `u_color1` and `u_color2`.
   - Outputs the final color per fragment.

---

### **Key Uniforms:**
- `u_dotSize`: Controls dot spacing.
- `u_color1`, `u_color2`: Define the color gradient.
- `u_image`: The video texture.
- `u_resolution`: Canvas resolution.

---

### **Rendering Pipeline:**
1. **WebGL initializes the video as a texture.**
2. **Shader computes dot sizes dynamically based on pixel brightness.**
3. **The effect is drawn frame-by-frame, creating a real-time halftone filter on video.**


## Features

- Real-time halftone video processing using a WebGL fragment shader.
- Interactive controls with lil-gui for adjusting effect parameters.
- Customizable dot size and colors.
- Save and load configurations as JSON files.
- Auto-load configuration file on startup.

## Demo

To see the effect in action, open `index.html` in a web browser.

---

## Setup & Usage

### 1. Clone the Repository

```sh
git clone https://github.com/YOUR_USERNAME/Halftone-Video-Effect.git
cd Halftone-Video-Effect
```

### 2. Serve Locally

Since the project loads videos and JSON files, some browsers block local file access. Use a simple HTTP server:

- With Python 3:

  ```sh
  python -m http.server 8080
  ```

- With Node.js (http-server package):

  ```sh
  npx http-server -p 8080
  ```

Then open `http://localhost:8080` in your browser.

### 3. Add Your Own Video

Replace `videos/northface-we-play-different.mp4` with your own MP4 or WebM video inside the `videos/` folder.

---

## Configuration

### Customization via GUI

Modify these settings dynamically via the GUI:

- `Dot Size`: Controls the halftone dot size.
- `Color 1`: The primary background color.
- `Color 2`: The color of the halftone dots.

### Save & Load Configurations

1. **Save Configuration**  
   Click "Save Config," and a JSON file will be downloaded.

2. **Load Configuration**  
   Click "Load Config" and select a previously saved JSON file.

### Load Config Automatically

By default, the script attempts to load a preset config file on startup:

```js
loadConfigFromURL("presets/halftone_default.json", params, gui);
```

To use a custom preset, change the file path inside `index.html` and create your JSON file in `presets/`.

Example `halftone_default.json`:

```json
{
  "dotSize": 15,
  "color1": "#222222",
  "color2": "#ff5500"
}
```

---

## File Structure

```
Halftone-Video-Effect
 ├── videos                # Video files for processing
 ├── presets               # JSON configuration files
 ├── index.html            # Main application
 ├── README.md             # Project documentation
 ├── package.json          # (optional) Node dependencies
```

---

## Dependencies

- WebGL
- lil-gui (Lightweight GUI library)
```
