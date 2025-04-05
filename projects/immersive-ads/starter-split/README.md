# Starter Split Webpack Build

This project is a production-focused Webpack setup designed for bundling a Three.js-based application with optimized output splitting and post-processing URL replacement for CDN hosting. It includes automatic chunk splitting, external resource replacement, and support for WebAssembly.

## Purpose

- **Split production bundles** using `splitChunks` for optimized loading.
- **Post-process output** by replacing internal URLs (e.g., for WASM and decoder files) with CDN-hosted paths using a custom `replace.js` script.
- **Deploy-ready** output with static file naming (no hashes) for deterministic CDN referencing.
- **Supports Three.js**, WebAssembly modules, and Babel transpilation.

## Features

- Three.js rendering
- Code splitting for vendor and app chunks
- Babel for ES6+ compatibility
- WebAssembly support
- Post-build URL rewriting for remote resource loading
- Static output file naming
- Path polyfill for browser environments

## Project Structure

```
starter-split/
├── dist/                # Output folder (created on build)
├── node_modules/
├── src/
│   ├── index.js         # Application entry point
│   └── index.html       # Template HTML file
├── package.json         # NPM metadata and scripts
├── package-lock.json
├── replace.js           # Post-build script to replace URLs in output
└── webpack.config.js    # Webpack production config
```

## Requirements

- Node.js v16+
- npm

## Install

```bash
npm install
```

## Build

```bash
npm run build
```

This will:
- Bundle the project using Webpack in production mode.
- Create `dist/` with chunked output files (`[name].js`, `[name].chunk.js`).
- Replace DRACO-related internal references (`.wasm`, `.js`) in the output files with predefined CDN URLs.

## Custom URL Replacement

The `replace.js` script is automatically executed after each build and replaces these patterns in the final JavaScript bundles:

| Original Reference             | Replaced With                                               |
|-------------------------------|-------------------------------------------------------------|
| `draco_decoder.wasm`          | `https://play2.s3.amazonaws.com/assets/vn4YjGnNY.wasm`      |
| `draco_wasm_wrapper.js`       | `https://play2.s3.amazonaws.com/assets/PTcU1jRMs.js`        |
| `draco_decoder.js`            | `https://play2.s3.amazonaws.com/assets/_f5hQEuDW.js`        |

This is useful when hosting decoder binaries on an external CDN for performance or caching reasons.

## Output

After build and replacement:
- `dist/` will contain `main.js`, `vendors.js`, other chunk files, and `index.html`.
- Scripts will reference external URLs for DRACO assets.

## Notes

- No content hashes used in filenames — ideal for CDN pinning.
- Uses `path-browserify` for Node.js `path` module compatibility in browser.
- Optimized for controlled, static deployments (e.g., embedded apps, CDN, iframes).
