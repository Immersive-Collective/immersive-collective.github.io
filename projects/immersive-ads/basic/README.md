```markdown
# Basic Three.js Webpack Project

This project is a minimal setup for running a Three.js-based web application using Webpack, Babel, and WebAssembly. It includes support for custom GLTF loading, DRACO decoding, and raw asset inlining. The setup is optimized for development with hot reloading and production-ready builds.

## Features

- Three.js 3D rendering
- WebAssembly (WASM) support
- DRACO decoder integration
- Babel for ES6+ transpilation
- HTML templating with `html-webpack-plugin`
- Webpack Dev Server with auto-open
- Automatic cleanup of port 8080 before start
- Production-ready bundling with Webpack

## Project Structure

```
basic/
├── public/              # Static files served during development
├── src/
│   ├── index.js         # Main entry point
│   ├── index.html       # HTML template
│   └── draco_decoder.js # DRACO decoder (raw inlined)
├── dist/                # Production build output
├── package.json         # Dependencies and scripts
└── webpack.config.js    # Webpack configuration
```

## Requirements

- Node.js (v16 or higher recommended)
- npm

## Install

```bash
npm install
```

## Run (Development)

```bash
npm start
```

This will:
- Kill any process on port 8080
- Start the Webpack Dev Server
- Open the project in your default browser at `http://localhost:8080/`

## Build (Production)

```bash
npm run build
```

This will:
- Compile all source files
- Inline assets (e.g., `draco_decoder.js`, `.wasm`)
- Output to `dist/`
- Minify and optimize the bundle

> **Note:**  
> The generated `bundle.js` is large (~1.41 MiB) and exceeds Webpack's recommended performance limits.  
> Consider using `import()` to code-split and lazy load modules to improve initial load performance.

## Output

After build:
- `dist/index.html` — HTML entry point with auto-injected script tag
- `dist/bundle.js` — Minified Webpack bundle ready for deployment
```