// import * as THREE from 'three';
// import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
// import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
// import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
// import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
// import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory.js';
// import { XRHandModelFactory } from 'three/examples/jsm/webxr/XRHandModelFactory.js';

// // Expose THREE globally
// window.THREE = THREE;
// window.GLTFLoader = GLTFLoader;
// window.DRACOLoader = DRACOLoader;
// window.OrbitControls = OrbitControls;
// window.VRButton = VRButton;
// window.XRControllerModelFactory = XRControllerModelFactory;
// window.XRHandModelFactory = XRHandModelFactory;

// // Inline DRACO loader with runtime paths
// const dracoLoader = new DRACOLoader();

// // This will be set later by the CMS script
// dracoLoader.setDecoderPath(''); // Default path placeholder, CMS will override

// // Attach to global for use in your app
// window.dracoLoader = dracoLoader;

// export default THREE;

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory.js';
import { XRHandModelFactory } from 'three/examples/jsm/webxr/XRHandModelFactory.js';

// Expose THREE globally
window.THREE = THREE;
window.GLTFLoader = GLTFLoader;
window.DRACOLoader = DRACOLoader;  // Expose DRACOLoader globally
window.OrbitControls = OrbitControls;
window.VRButton = VRButton;
window.XRControllerModelFactory = XRControllerModelFactory;
window.XRHandModelFactory = XRHandModelFactory;

// Create DRACOLoader instance with placeholders
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderConfig({
  jsSource: '__DRACO_JS__',  // Placeholder for JS decoder
  wasmBinaryPath: '__DRACO_WASM__',  // Placeholder for WASM binary
  wasmWrapperPath: '__DRACO_WRAPPER__',  // Placeholder for WASM wrapper
});
dracoLoader.preload();  // Preload decoder to avoid delays

// Expose for runtime use in CMS
window.dracoLoader = dracoLoader;

export default THREE;

