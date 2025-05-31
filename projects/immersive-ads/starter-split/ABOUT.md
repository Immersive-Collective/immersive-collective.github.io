# ABOUT.md

## Overview

This project is a production-grade Webpack build system for preparing and deploying Three.js-based applications in two primary environments:

- **Local Development** with static chunk names and predictable output in `dist/`.
- **CMS/External Deployment** where output files are renamed (e.g., by S3 or asset pipeline), requiring explicit manual loading of JS chunks via a runtime loader script.

The system supports WebXR, GLTF+DRACO asset pipelines, and CDN-based decoder delivery using dynamic replacement post-build. It is designed for environments where bundlers aren't available or desired at runtime.

---

## Source Composition

The entry point of the project is `src/index.js`, which:

- Imports and initializes core Three.js modules (`three`, `GLTFLoader`, `OrbitControls`, `WebXR`, etc.).
- Instantiates and preloads a `DRACOLoader` with **placeholder values**:
  ```js
  jsSource: '__DRACO_JS__',
  wasmBinaryPath: '__DRACO_WASM__',
  wasmWrapperPath: '__DRACO_WRAPPER__',
  ```
- Exposes all components (`THREE`, loaders, controls) globally via `window` to enable use in non-module execution contexts (e.g., iframes or script tag chains).
- Avoids direct WebAssembly loading; everything goes through CDN placeholders.

This source file is intended for maximum compatibility and modular runtime embedding.

---

## Build Process (`npm run build`)

The build is a two-phase operation:

### 1. Webpack Compilation (`webpack.config.js`)

Running:
```bash
npm run build
```
Triggers:
- `webpack --mode production`
- Babel transpilation (`@babel/preset-env`)
- Tree-shaking and optimization
- Code-splitting via `optimization.splitChunks`
- Fixed-name chunk output (`[name].js`, `[name].chunk.js`) for deterministic control

Example output:
- `runtime.js`
- `vendors-*.js` (multiple automatically split chunks)
- `main.js`
- `index.html`

### 2. Post-Processing (`replace.js`)

Automatically triggered by the `postbuild` script:

```bash
node replace.js
```

What it does:
- Locates all `.js` files in `dist/`
- Scans for DRACO decoder placeholders
- Replaces:
  - `__DRACO_JS__` → `https://play2.s3.amazonaws.com/assets/_f5hQEuDW.js`
  - `__DRACO_WASM__` → `https://play2.s3.amazonaws.com/assets/vn4YjGnNY.wasm`
  - `__DRACO_WRAPPER__` → `https://play2.s3.amazonaws.com/assets/PTcU1jRMs.js`

This makes the final `dist` output completely independent of local decoder binaries and ready for CDN-first delivery.

---

## Deployment Strategy

### Problem: Randomized Filenames on S3

When chunked JS files are uploaded to a remote storage or CDN (like S3), they may be:
- Hashed
- Renamed
- Compressed or bundled differently

This breaks Webpack’s default dynamic chunk resolution, making `<script src="main.js">` insufficient.

### Solution: Manual Chunk Loader

A custom script loader is included that conditionally selects between local and remote chunk sources.

```js
let devMode = 'local';
// let devMode = 'cms';
```

If `devMode === 'local'`:
```js
const chunkScriptsLocal = [
  "dist/runtime.js",
  "dist/vendors-eaa1e0b2.js",
  ...
];
```

If `devMode === 'cms'`:
```js
const chunkScriptsCMS = [
  "https://play2.s3.amazonaws.com/assets/BHGpznMRpI.js",
  ...
];
```

These are fed into:
```js
loadScriptsSequentially(chunkScriptsArray, main);
```

Which:
- Injects each script tag into `<head>`
- Waits (`onload`) for each to finish
- Proceeds to `main()` only after all scripts are loaded and ready

This ensures perfect runtime initialization regardless of whether filenames are static or randomized.

---

## Runtime Expectations

At runtime:
- All Three.js modules are attached to `window`
- DRACO decoder URLs point to pre-patched CDN paths
- Chunked JS files are loaded dynamically in strict sequence
- Final application logic is triggered explicitly via `main()`

No module loader, no Webpack runtime, no dependency on Node or CLI tools. This works in raw HTML, CMS fields, or browser-injected contexts.

---

## Final Output (Post-Build)

After build + replace:
- `dist/` contains:
  - `runtime.js`
  - `main.js`
  - multiple `vendors-*.js`
  - `index.html` (optional, template)
- All DRACO paths are external and CDN-safe
- Project is fully decoupled from the original source repo

---

## Use Cases

- Hosting 3D experiences in CMS platforms with zero build tooling
- Embedding Three.js scenes in iframe-based ad units or microsites
- Delivering WebXR-enabled applications from remote, cacheable URLs
- Controlling asset load and execution sequence in S3/CDN deployments

This structure is stable, scalable, and intentionally file-based with full manual loading control. It prioritizes compatibility over convenience, performance over automation.
