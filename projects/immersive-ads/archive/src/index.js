// src/index.js
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

// Initialize DRACOLoader
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('./'); // Decoder files are in 'dist/'
dracoLoader.setDecoderConfig({ type: 'js' });

// Initialize GLTFLoader and set DRACOLoader
const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);

// Export loaders and THREE as needed
export { THREE, GLTFLoader, DRACOLoader, gltfLoader };
