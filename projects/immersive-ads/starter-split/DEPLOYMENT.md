## ✅ Build & Deploy Workflow (Step-by-Step)

### 1. **Local Build**

Run the build to generate Webpack chunks in `dist/`:

```bash
npm run build
```

This will:
- Compile your Three.js project
- Split chunks (including `draco_decoder.js`)
- Run `replace.js` to update hardcoded URLs
- Generate `main-template.js` with accurate chunk info

---

### 2. **Upload DRACO Decoder Files to S3**

Upload these local source files to your S3 bucket:
- `src/draco_decoder.js`
- `src/draco_decoder.wasm`
- `src/draco_wasm_wrapper.js`

S3 will generate **randomized filenames** like:
```
https://play2.s3.amazonaws.com/assets/vn4YjGnNY.wasm
https://play2.s3.amazonaws.com/assets/PTcU1jRMs.js
https://play2.s3.amazonaws.com/assets/_f5hQEuDW.js
```

---

### 3. **Update `replace.js`**

Edit the `to` array in `replace.js` with those S3 URLs:

```js
to: [
  'https://play2.s3.amazonaws.com/assets/vn4YjGnNY.wasm',
  'https://play2.s3.amazonaws.com/assets/PTcU1jRMs.js',
  'https://play2.s3.amazonaws.com/assets/_f5hQEuDW.js',
],
```

This ensures your final JS chunks will point to the hosted versions of the DRACO decoder components.

---

### 4. **Re-run Build (with Replacement)**

Run the build again to ensure:
- All `draco_*` references are replaced
- `main-template.js` is regenerated correctly

```bash
npm run build
```

---

### 5. **Upload the Final Chunk Files to S3 (Optional)**

From the `dist/` folder, upload these files to S3:

```text
runtime.js
vendors-xxxx.js
main.js
...
```

S3 will randomize these filenames too.

If using in a CMS context, store these randomized S3 URLs in your CMS and update the loader (main runtime) accordingly.

---

### 6. **Use `main-template.js` as Loader Reference**

This file contains the full ordered list of chunks and inline comments on what they include:

```js
const chunkScriptsLocal = [
  "dist/runtime.js", // Webpack runtime
  "dist/vendors-xxxx.js", // Includes Three.js core, etc.
  ...
  "dist/main.js", // Main logic
];
```

Use this to load chunks locally or mirror it to reflect CMS-hosted filenames.