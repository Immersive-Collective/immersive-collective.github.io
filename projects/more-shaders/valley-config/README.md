### **README.md**


## **Demo**

Live (Github Pages)

https://immersive-collective.org/projects/more-shaders/valley-config/index2.html
---
https://github.com/user-attachments/assets/33c145af-3b76-4d1b-8f26-f3014524f817

You can explore the shader on a live canvas and interact with its settings. The GUI allows you to adjust various properties such as hue, saturation, and animation speed.


---

# **Shader with lil-gui – Extended Terrain & Save/Load Configuration**

This project is an interactive WebGL-based terrain shader using `three.js` and `lil-gui` for parameter customization. The shader provides customizable controls for animation and color through a graphical user interface (GUI), which can also be toggled off for presentation purposes. Configuration can be saved and loaded from JSON files for easy reproduction of visual settings.

---

## **Table of Contents**

- [Demo](#demo)
- [Features](#features)
- [Modes](#modes)
- [Installation and Usage](#installation-and-usage)
- [Configuration](#configuration)
- [Saving and Loading Configurations](#saving-and-loading-configurations)
- [Notes on Shader Projection in 3D Scene](#notes-on-shader-projection-in-3d-scene)
- [Contributing](#contributing)
- [License](#license)

---

## **Demo**

Live (Github Pages)
https://immersive-collective.org/projects/more-shaders/valley-config/index2.html




You can explore the shader on a live canvas and interact with its settings. The GUI allows you to adjust various properties such as hue, saturation, and animation speed.

---

## **Features**

- Interactive **GUI** for real-time shader parameter customization
- Save and load configurations in `.json` format
- Four operational modes:
  - **"default"** – Loads preset shader parameters
  - **"config"** – Loads shader parameters from a predefined JSON file
  - **"edit"** – Displays the GUI with all available sliders and controls
  - **"demo"** – Hides the GUI for presentation purposes
- Responsive canvas that adjusts to window resizing
- Supports **customizable animations**, including sine wave patterns and hue shifts

---

## **Modes**

Modify the following line in the script to change the operational mode:

```javascript
const mode = "edit"; // Available modes: "default", "config", "demo", "edit"
```

- **`default`** – Uses the hardcoded default configuration values.
- **`config`** – Loads parameters from a `.json` file located at the specified path (update the `configFilePath`):
  ```javascript
  const configFilePath = "./configs/shader-config-soap.json"; // Path to configuration file
  ```
- **`edit`** – Displays the GUI with all adjustable parameters.
- **`demo`** – Hides the GUI, useful for clean presentations.

---

## **Installation and Usage**

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd <repository-folder>
   ```

2. Install a local server if needed (for `fetch` requests):
   ```bash
   npx http-server
   ```
   Alternatively, use any local HTTP server of your choice.

3. Open the `index.html` file in your browser:
   - In "config" mode, ensure the `.json` configuration file exists at the specified path.

---

## **Configuration**

The shader parameters are customizable via the GUI or a pasted configuration object. The default configuration structure is as follows:

```json
{
  "baseHue": 0.3,
  "saturation": 1,
  "valueFactor": 0.53,
  "rgbMultR": 0.92,
  "rgbMultG": 0.6,
  "rgbMultB": 0.28,
  "brightness": 0.41,
  "speedOfAnimation": 0.6,
  "sinAmplitude": 1.45,
  "sinFrequency": 4.4,
  "iterationCount": 61,
  "innerLoopMax": 100,
  "wavePhase": -3.45,
  "waveOffset": -1
}
```

### **Editing Configuration:**
- Modify values directly via the GUI in "edit" mode.
- Alternatively, paste a configuration object:
  ```javascript
  let defaultConfig = {
    "baseHue": 0.18,
    "saturation": 0.64,
    ...
  };
  ```

---

## **Saving and Loading Configurations**

### **Saving a Configuration:**
1. Click the "Save Config" button in the GUI.
2. The current parameters will be downloaded as a `.json` file.

### **Loading a Configuration:**
- In "config" mode, set the path to your configuration file:
  ```javascript
  const configFilePath = "./configs/shader-config.json";
  ```
- Alternatively, click "Load Config" in the GUI and upload a JSON file.

---

## **Notes on Shader Projection in 3D Scene**

To project the shader onto 3D geometry:
1. Render the shader to a `WebGLRenderTarget` and apply it as a texture:
   ```javascript
   const renderTarget = new THREE.WebGLRenderTarget(512, 512);
   const shaderTexture = renderTarget.texture;
   const material = new THREE.MeshBasicMaterial({ map: shaderTexture });
   ```
2. Alternatively, apply the shader as a `ShaderMaterial` directly to the geometry:
   ```javascript
   const material = new THREE.ShaderMaterial({
     vertexShader: vertexShaderSource,
     fragmentShader: fragmentShaderSource,
     uniforms: { time: { value: 0.0 }, resolution: { value: new THREE.Vector2() } }
   });
   ```

---

## **Contributing**

Contributions are welcome! Please submit issues or pull requests for improvements.

---

## **License**

This project is licensed under the MIT License.

---

This README explains how to use and configure the shader project. Let me know if you'd like any adjustments or additional details!
