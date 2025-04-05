# ABOUT.md

## Overview

This project is a modular, production-optimized build system for deploying Three.js applications using Webpack. It supports advanced features like DRACO-compressed GLTF loading, WebXR interaction, and CDN-based asset delivery. The structure is built for performance and portability, enabling lightweight runtime usage while maintaining a powerful rendering pipeline.

---

## What Happens During `npm run build`

The `build` process consists of two steps:

### 1. Webpack Production Compilation

When you run:

```bash
npm run build
```

Webpack performs the following actions:

- **Starts from `src/index.js`** as the entry point.
- **Transpiles** all ES6+ code using Babel via `babel-loader`.
- **Follows all imports** from `index.js` to modules like `GLTFLoader`, `DRACOLoader`, `OrbitControls`, and core Three.js packages.
- **Splits the output** into optimized chunks using `splitChunks`:
  - Shared modules are grouped under `vendors-*.js`
  - The runtime and entry logic are separated into `main.js` and `runtime.js`
- **Minifies** all JS files to reduce bundle size.
- **Emits static filenames** (no hashes) to allow deterministic referencing in downstream platforms (e.g., CDN or iframe apps).

Output files are saved to the `dist/` directory.

---

### 2. Post-Build Asset URL Replacement

After Webpack completes, this command runs automatically:

```bash
node replace.js
```

- It searches all generated `.js` files in `dist/`
- Replaces internal placeholder strings like:
  - `__DRACO_JS__`
  - `__DRACO_WASM__`
  - `__DRACO_WRAPPER__`
- Substitutes them with **predefined CDN URLs**, ensuring the app loads decoder binaries from external sources without bundling them.

---

## Purpose of `src/index.js`

The `index.js` file:

- Imports core Three.js modules and loaders
- Configures and preloads the DRACO decoder
- Exposes all critical Three.js components to `window` for runtime access
- Embeds placeholders for DRACO paths that are patched after build

---

## Deployment Ready

The final result is:

- A clean, split, and minimized `dist/` directory
- Externally hosted decoder assets (via replaced URLs)
- No runtime dependencies or server required for loading DRACO or WebXR modules
- Static script naming for predictable integration into other environments

This setup is ideal for embedded, iframe-based, or CDN-hosted 3D applications.