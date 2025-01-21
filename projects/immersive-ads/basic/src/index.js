// // src/index.js
// import * as THREE from 'three';
// import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
// import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

// import dracoDecoderWasm from './draco_decoder.wasm'; // Inline WASM binary
// import dracoWasmWrapper from '!!raw-loader!./draco_wasm_wrapper.js'; // Inline JS wrapper content

// // Initialize DRACOLoader
// const dracoLoader = new DRACOLoader();
// dracoLoader.setDecoderPath(''); // Decoder path is not needed as we're bundling the assets

// // Pass the inlined WASM binary and JS wrapper to the decoder config
// dracoLoader.setDecoderConfig({
//   wasmBinary: dracoDecoderWasm,
//   jsSource: dracoWasmWrapper, // Provide inlined JS wrapper content
// });

// // Initialize GLTFLoader and set the DRACO loader for decompression
// const gltfLoader = new GLTFLoader();
// gltfLoader.setDRACOLoader(dracoLoader);

// // Expose THREE and loaders globally for use in the browser
// window.THREE = THREE;
// window.dracoLoader = dracoLoader;
// window.gltfLoader = gltfLoader;

// // Export THREE to allow external modules to use it if needed
// export default THREE;


// import * as THREE from 'three';
// import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
// import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

// // Initialize DRACOLoader
// const dracoLoader = new DRACOLoader();

// // Expose a method to dynamically configure DRACO decoder paths
// window.configureDRACO = (decoderPath, wasmBinaryUrl, jsSourceUrl) => {
//   dracoLoader.setDecoderPath(decoderPath || ''); // Set decoder path dynamically
//   dracoLoader.setDecoderConfig({
//     wasmBinary: wasmBinaryUrl || null,
//     jsSource: jsSourceUrl || null,
//   });
// };

// // Initialize GLTFLoader and associate the DRACOLoader
// const gltfLoader = new GLTFLoader();
// gltfLoader.setDRACOLoader(dracoLoader);

// // Expose THREE and loaders globally for use in the browser
// window.THREE = THREE;
// window.dracoLoader = dracoLoader;
// window.gltfLoader = gltfLoader;

// // Export THREE to allow external modules to use it if needed
// export default THREE;


// import * as THREE from 'three';
// import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
// import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

// // Import inlined WASM binary
// import dracoDecoderWasm from './draco_decoder.wasm'; // Webpack inlines this as base64
// // Import DRACO JS wrapper as raw JavaScript
// import dracoDecoderJs from './draco_decoder.js'; // Webpack inlines this as a string

// // Initialize DRACOLoader
// const dracoLoader = new DRACOLoader();

// // Configure DRACO loader with inlined resources
// dracoLoader.setDecoderPath(''); // No external path required
// dracoLoader.setDecoderConfig({
//   wasmBinary: dracoDecoderWasm, // Inlined WASM binary
//   jsSource: dracoDecoderJs,     // Inlined JavaScript decoder
// });

// // Initialize GLTFLoader and associate the DRACO loader
// const gltfLoader = new GLTFLoader();
// gltfLoader.setDRACOLoader(dracoLoader);

// // Expose THREE and loaders globally for use in the browser
// window.THREE = THREE;
// window.dracoLoader = dracoLoader;
// window.gltfLoader = gltfLoader;

// // Export THREE to allow external modules to use it if needed
// export default THREE;



// import * as THREE from 'three';
// import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
// import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

// // Import inlined WASM binary
// import dracoDecoderWasm from './draco_decoder.wasm'; // Inline WASM using Webpack's asset/inline
// // Import DRACO wrapper if needed (JS source can be inlined similarly if required)
// // import dracoWrapper from './draco_wasm_wrapper.js'; // Optional, if used

// // Initialize DRACOLoader
// const dracoLoader = new DRACOLoader();

// // Configure DRACO loader to use inlined WASM
// dracoLoader.setDecoderPath(''); // No external decoder path needed
// dracoLoader.setDecoderConfig({
//   wasmBinary: dracoDecoderWasm, // Pass inlined WASM binary
// });

// // Initialize GLTFLoader and set DRACOLoader for GLTF decompression
// const gltfLoader = new GLTFLoader();
// gltfLoader.setDRACOLoader(dracoLoader);

// // Expose THREE and loaders globally for use in the browser
// window.THREE = THREE;
// window.dracoLoader = dracoLoader;
// window.gltfLoader = gltfLoader;

// // Export THREE for external use
// export default THREE;


import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import dracoDecoderJS from './draco_decoder.js'; // Inline the DRACO decoder as raw text

// Initialize DRACOLoader
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderConfig({
  jsSource: dracoDecoderJS, // Use the inlined JS decoder
  wasmBinary: null,         // Disable WASM
});
dracoLoader.setDecoderPath(''); // No external requests

// Initialize GLTFLoader with the DRACO loader
const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);

// Expose loaders globally for the browser environment
window.THREE = THREE;
window.dracoLoader = dracoLoader;
window.gltfLoader = gltfLoader;

// Export THREE for potential external use
export default THREE;


