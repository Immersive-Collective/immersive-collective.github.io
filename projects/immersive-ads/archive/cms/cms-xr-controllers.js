/*

// draco_decode.js
// https://play2.s3.amazonaws.com/assets/_f5hQEuDW.js

// draco_decoder.wasm
// https://play2.s3.amazonaws.com/assets/vn4YjGnNY.wasm

// draco_wasm_wrapper.js
// https://play2.s3.amazonaws.com/assets/PTcU1jRMs.js



    <script defer="defer" src="runtime.js"></script>
    <script defer="defer" src="vendors-eaa1e0b2.js"></script>
    <script defer="defer" src="vendors-121455fa.js"></script>
    <script defer="defer" src="vendors-fa926fcc.js"></script>
    <script defer="defer" src="vendors-19c8c233.js"></script>
    <script defer="defer" src="vendors-159b8fc4.js"></script>
    <script defer="defer" src="main.js"></script>

*/


// Here is ThreeJS bundle in chunks
// List of chunk scripts to load in sequence
const chunkScripts = [
  "https://play2.s3.amazonaws.com/assets/BHGpznMRpI.js",
  "https://play2.s3.amazonaws.com/assets/4UwrxTsVIp.js",
  "https://play2.s3.amazonaws.com/assets/3V_WmerJG0.js",
  "https://play2.s3.amazonaws.com/assets/PVnIgHFgXf.js",
  "https://play2.s3.amazonaws.com/assets/IE1aOqWWt.js",
  "https://play2.s3.amazonaws.com/assets/bJ_B6pBwF.js",
  "https://play2.s3.amazonaws.com/assets/iEV-Cqocn.js"
];

// Function to dynamically load each script in sequence
function loadScriptsSequentially(scripts, callback) {
  const head = document.head;

  function loadScript(index) {
    if (index >= scripts.length) {
      if (callback) callback();
      return;
    }

    const script = document.createElement('script');
    script.src = scripts[index];
    script.defer = true;
    script.onload = () => loadScript(index + 1); // Load next script after current finishes
    script.onerror = () => console.error(`Failed to load script: ${scripts[index]}`);
    head.appendChild(script);
  }

  loadScript(0); // Start loading scripts from the first one
}

// Load all scripts and start the application
loadScriptsSequentially(chunkScripts, main);


document.getElementById('fullscreen').addEventListener('click', () => {
  const appElement = document.getElementById('app');

  if (appElement.requestFullscreen) {
    appElement.requestFullscreen();
  } else if (appElement.webkitRequestFullscreen) {
    appElement.webkitRequestFullscreen();  // Safari
  } else if (appElement.mozRequestFullScreen) {
    appElement.mozRequestFullScreen();  // Firefox
  } else if (appElement.msRequestFullscreen) {
    appElement.msRequestFullscreen();  // IE/Edge
  } else {
    console.error('Fullscreen API is not supported by this browser.');
  }
});

document.addEventListener('fullscreenchange', () => {
  if (!document.fullscreenElement) {
    console.log('Exited fullscreen mode');
  }
});


/* Sand Storm */

let sandstormObject = null;

function createSandTexture() {
  const size = 128; // Texture size
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Create circular gradient for the sand particle
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(0, 0, 0, 1)'); // Center (sand-like color)
  gradient.addColorStop(1, 'rgba(0, 10, 17, 0)'); // Transparent edges

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas); // Convert to THREE.js texture
  return texture;
}

function generateSandstorm(scene, count = 2000, radius = 100) {
  const sandGeometry = new THREE.BufferGeometry();
  const sandMaterial = new THREE.PointsMaterial({
    map: createSandTexture(), // Use the gradient texture
    size: 0.02, // Size of the sand particles
    transparent: true, // Allow transparency
    depthWrite: false, // Prevent z-fighting issues
  });

  const positions = new Float32Array(count * 3); // x, y, z for each sand particle
  const speeds = new Float32Array(count); // Speed for each sand particle
  const horizontalDrifts = new Float32Array(count); // Horizontal drift angle

  for (let i = 0; i < count * 3; i += 3) {
    const theta = Math.random() * 2 * Math.PI; // Random horizontal angle
    const r = radius * (0.5 + Math.random() * 0.5); // Spread radius
    const height = -2 + (Math.random() - 0.5) * 10; // Random height variation

    // Initial positions
    positions[i] = r * Math.cos(theta); // X position (circular spread)
    positions[i + 1] = height; // Y position (vertical)
    positions[i + 2] = r * Math.sin(theta); // Z position

    speeds[i / 3] = 0.5 + Math.random() * 0.05; // Faster horizontal speed
    horizontalDrifts[i / 3] = Math.random() * 0.1 + 0.02; // Drift angle for swirling effect
  }

  sandGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  sandstormObject = new THREE.Points(sandGeometry, sandMaterial);
  sandstormObject.userData = { positions, speeds, horizontalDrifts };
  scene.add(sandstormObject);
}

function updateSandstorm() {
  if (!sandstormObject) return; // Ensure sandstormObject exists
  const positions = sandstormObject.geometry.getAttribute('position');
  const speeds = sandstormObject.userData.speeds;
  const horizontalDrifts = sandstormObject.userData.horizontalDrifts;

  for (let i = 0; i < positions.count; i++) {
    let x = positions.getX(i);
    let y = positions.getY(i);
    let z = positions.getZ(i);

    x += speeds[i]; // Horizontal movement
    z += Math.sin(horizontalDrifts[i] * x) * 0.1; // Swirling drift horizontally
    y += Math.sin(horizontalDrifts[i] * z) * 0.05; // Small vertical variance

    // Reset particles when they move out of bounds
    if (x > 50 || x < -50 || z > 50 || z < -50) {
      x = (Math.random() - 0.5) * 100; // Reposition within bounds
      y = (Math.random() - 0.5) * 10; // Reset height
      z = (Math.random() - 0.5) * 100; // Reposition within bounds
    }

    positions.setXYZ(i, x, y, z); // Update position
  }

  positions.needsUpdate = true; // Notify Three.js of updates
}





/* Snow */

let snowObject = null;

function createGradientTexture() {
  const size = 128; // Texture size
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Create circular gradient
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  // gradient.addColorStop(0, 'rgba(255, 255, 255, 1)'); // White in the center
  // gradient.addColorStop(1, 'rgba(255, 255, 255, 0)'); // Transparent edges
  gradient.addColorStop(0, 'rgba(255, 223, 128, 1)'); // Golden center
  gradient.addColorStop(1, 'rgba(255, 182, 77, 0)'); // Transparent peach-orange edges


  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas); // Convert to THREE.js texture
  return texture;
}

function generateSnow(scene, count = 1000, radius = 50) {
  const starGeometry = new THREE.BufferGeometry();
  const starMaterial = new THREE.PointsMaterial({
    map: createGradientTexture(), // Use the gradient texture
    size: 0.05, // Size of the snowflakes
    transparent: true, // Allow transparency
    depthWrite: false, // Prevent z-fighting issues
  });

  const positions = new Float32Array(count * 3); // x, y, z for each snowflake
  const speeds = new Float32Array(count); // Speed for each snowflake
  const angles = new Float32Array(count); // Angle of drift

  for (let i = 0; i < count * 3; i += 3) {
    const theta = Math.random() * 2 * Math.PI; // Random horizontal angle
    const phi = Math.acos(2 * Math.random() - 1); // Random vertical angle

    const r = radius * (0.5 + Math.random() * 0.5); // Spread radius
    positions[i] = r * Math.sin(phi) * Math.cos(theta); // X position
    positions[i + 1] = 10 + Math.random() * 5; // Y position (spawn from the top)
    positions[i + 2] = r * Math.cos(phi); // Z position

    speeds[i / 3] = 0.01 + Math.random() * 0.03; // Falling speed
    angles[i / 3] = Math.random() * 0.02; // Horizontal drift
  }

  starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  snowObject = new THREE.Points(starGeometry, starMaterial);
  snowObject.userData = { positions, speeds, angles };
  scene.add(snowObject);
}

function updateSnowfall() {
  if (!snowObject) return; // Ensure snowObject exists
  const positions = snowObject.geometry.getAttribute('position');
  const speeds = snowObject.userData.speeds;
  const angles = snowObject.userData.angles;

  for (let i = 0; i < positions.count; i++) {
    let y = positions.getY(i);
    let x = positions.getX(i);
    let z = positions.getZ(i);

    y -= speeds[i]; // Falling down
    x += Math.sin(angles[i] * y) * 0.02; // Slight drift sideways
    z += Math.cos(angles[i] * y) * 0.02; // Slight drift forward/backward

    // Reset snowflake if below vanish level
    if (y < -2) {
      y = 10 + Math.random() * 5; // Reset to top
      x = (Math.random() - 0.5) * 30; // Randomize X-position again
      z = (Math.random() - 0.5) * 30; // Randomize Z-position
    }

    positions.setXYZ(i, x, y, z); // Update position
  }

  positions.needsUpdate = true; // Notify Three.js of updates
}



function addFog(scene, color = 0xffffff, near = 0.1, far = 50) {
    // Add linear fog to the scene
    scene.fog = new THREE.Fog(color, near, far);
    // Optionally, set the background color to match the fog
    scene.background = new THREE.Color(color);
}

function addHemisphereLight(scene) {
    // Create a HemisphereLight
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1); // Sky color, ground color, intensity
    hemiLight.position.set(0, 50, 0); // Place light above the scene
    scene.add(hemiLight);
}

function addEnvironmentMap(scene, renderer) {
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    // Load an HDRI texture or similar equirectangular image for lighting
    const loader = new THREE.TextureLoader();
    loader.load(
        'https://play2.s3.amazonaws.com/assets/QvWoAKgFM.jpeg', // Replace with your image
        (texture) => {
            const envMap = pmremGenerator.fromEquirectangular(texture).texture;
            scene.environment = envMap; // Set as environment map for the scene
            scene.background = envMap; // Optionally set as background
            texture.dispose();
            pmremGenerator.dispose();
        },
        undefined,
        (error) => {
            console.error('Error loading environment map:', error);
        }
    );
}

function main() {


    console.log('THREE loaded successfully');

    // No need to create a new DRACOLoader; using the pre-configured one from index.js
    const gltfLoader = new window.GLTFLoader();
    gltfLoader.setDRACOLoader(window.dracoLoader);  // DRACOLoader from the global scope

    console.log('DRACO loader configured with pre-set paths in the bundle.');

    init(gltfLoader); 

    } 


function init(gltfLoader) {
  const container = document.getElementById('app');
  if (!container) {
    console.error('Container element #app not found.');
    return;
  }

  const scene = new THREE.Scene();
  //scene.background = new THREE.Color(0xa0a0a0);
  scene.background = new THREE.Color(0xffe29a); // Warm desert sky color (soft peach-yellow)


  const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
  camera.position.set(3, 2, 3);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.shadowMap.enabled = true;
  renderer.xr.enabled = true;
  container.appendChild(renderer.domElement);

  // // Select your custom XR button
  // const customXRButton = document.getElementById('entervr');

  // // Remove the default VRButton but keep the logic
  // const hiddenVRButton = window.VRButton.createButton(renderer);
  // hiddenVRButton.style.display = 'none'; // Hide the default button
  // document.body.appendChild(hiddenVRButton); // Keep it for functionality

  // // Add click event to the custom button to trigger XR session
  // customXRButton.addEventListener('click', () => {
  //   hiddenVRButton.click(); // Simulate click on the hidden default button to enter XR mode
  // });




// // XR Controllers
// const controller1 = renderer.xr.getController(0);
// const controller2 = renderer.xr.getController(1);
// scene.add(controller1);
// scene.add(controller2);

// // Add Controller Models and Hand Models
// const controllerModelFactory = new window.XRControllerModelFactory();
// const handModelFactory = new window.XRHandModelFactory();

// // Controller Grip 1
// const controllerGrip1 = renderer.xr.getControllerGrip(0);
// controllerGrip1.add(controllerModelFactory.createControllerModel(controllerGrip1));
// scene.add(controllerGrip1);

// // Controller Grip 2
// const controllerGrip2 = renderer.xr.getControllerGrip(1);
// controllerGrip2.add(controllerModelFactory.createControllerModel(controllerGrip2));
// scene.add(controllerGrip2);

// // Hand 1 and Hand 2
// const hand1 = renderer.xr.getHand(0);
// const hand2 = renderer.xr.getHand(1);
// scene.add(hand1);
// scene.add(hand2);

// // Define available profiles
// const availableHandProfiles = ['mesh', 'boxes', 'spheres'];

// // Function to load the desired hand model
// function loadHandProfile(profileName) {
//   if (!availableHandProfiles.includes(profileName)) {
//     console.error(`Invalid profile "${profileName}". Available profiles: ${availableHandProfiles.join(', ')}`);
//     return;
//   }

//   // Clear previous hand models before adding the new one
//   hand1.clear();
//   hand2.clear();

//   // Add the selected profile to each hand
//   const handModel1 = handModelFactory.createHandModel(hand1, profileName);
//   const handModel2 = handModelFactory.createHandModel(hand2, profileName);
//   hand1.add(handModel1);
//   hand2.add(handModel2);

//   console.log(`Loaded hand model profile: ${profileName}`);
// }

// // Example usage: Load the desired profile (change this string to switch profiles)
// const selectedProfile = 'mesh'; // Change to 'mesh', 'boxes', 'spheres', etc.
// loadHandProfile(selectedProfile);

// // XR Button with Required Features for Hand Tracking
// const sessionInit = {
//   requiredFeatures: ['hand-tracking'], // Ensure that 'hand-tracking' is required for the session
//   optionalFeatures: ['layers', 'local-floor', 'bounded-floor']
// };

// const customXRButton = document.getElementById('entervr');
// customXRButton.addEventListener('click', () => {
//   navigator.xr.requestSession('immersive-vr', sessionInit).then((session) => {
//     renderer.xr.setSession(session);
//     console.log('XR Session started with hand-tracking and floor features.');
//   }).catch((error) => {
//     console.error('Failed to start XR session:', error);
//   });
// });

// // Add Pointer Lines for Controller Interaction
// const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)]);
// const line = new THREE.Line(geometry);
// line.name = 'line';
// line.scale.z = 5;

// controller1.add(line.clone());
// controller2.add(line.clone());

// // Add Event Listeners to Detect Hand and Controller Connection
// hand1.addEventListener('connected', (event) => {
//   console.log('Hand 1 connected:', event.data.hand);
//   hand1.visible = true;
// });
// hand2.addEventListener('connected', (event) => {
//   console.log('Hand 2 connected:', event.data.hand);
//   hand2.visible = true;
// });

// hand1.addEventListener('disconnected', () => {
//   console.log('Hand 1 disconnected.');
//   hand1.visible = false;
// });
// hand2.addEventListener('disconnected', () => {
//   console.log('Hand 2 disconnected.');
//   hand2.visible = false;
// });

// // Detect XR Session Start/End for Proper Initialization
// renderer.xr.addEventListener('sessionstart', () => {
//   console.log('XR Session started. Ensure hands and controllers are active.');
//   hand1.visible = true;
//   hand2.visible = true;
// });
// renderer.xr.addEventListener('sessionend', () => {
//   console.log('XR Session ended. Hide hand models.');
//   hand1.visible = false;
//   hand2.visible = false;
// });



// XR Controllers



// const controller1 = renderer.xr.getController(0);
// const controller2 = renderer.xr.getController(1);
// scene.add(controller1);
// scene.add(controller2);

// // Add Controller Models and Hand Models
// const controllerModelFactory = new window.XRControllerModelFactory();
// const handModelFactory = new window.XRHandModelFactory();

// // Controller Grip 1
// const controllerGrip1 = renderer.xr.getControllerGrip(0);
// controllerGrip1.add(controllerModelFactory.createControllerModel(controllerGrip1));
// scene.add(controllerGrip1);

// // Controller Grip 2
// const controllerGrip2 = renderer.xr.getControllerGrip(1);
// controllerGrip2.add(controllerModelFactory.createControllerModel(controllerGrip2));
// scene.add(controllerGrip2);

// // Hand 1 and Hand 2
// const hand1 = renderer.xr.getHand(0);
// const hand2 = renderer.xr.getHand(1);
// scene.add(hand1);
// scene.add(hand2);

// // Define available profiles (including custom models)
// const availableHandProfiles = {
//   mesh: { type: 'default', profileName: 'mesh' },
//   boxes: { type: 'default', profileName: 'boxes' },
//   spheres: { type: 'default', profileName: 'spheres' },
//   custom: { type: 'custom', left: 'models/hands/left.glb', right: 'models/hands/right.glb' }
// };

// // Load custom GLTF models using pre-configured loader

// function loadCustomHandModel(hand, url) {
//   gltfLoader.load(
//     url,
//     (gltf) => {
//       const customHandModel = gltf.scene;
//       customHandModel.scale.set(0.2, 0.2, 0.2); // Adjust scale
//       customHandModel.position.set(0, -0.1, 0); // Center it
//       customHandModel.rotation.set(0, Math.PI, 0); // Face the right way
//       customHandModel.visible = true; // Ensure it's visible
//       hand.add(customHandModel);
//       console.log(`Custom hand model loaded from: ${url}`);

//       const boxHelper = new THREE.BoxHelper(customHandModel, 0xff0000); // Red wireframe box
//       scene.add(boxHelper);
      

//     },
//     undefined,
//     (error) => {
//       console.error(`Error loading custom hand model from ${url}:`, error);
//     }
//   );
// }




// // Function to load the desired hand model
// function loadHandProfile(profileKey) {
//   const profile = availableHandProfiles[profileKey];

//   if (!profile) {
//     console.error(`Invalid profile "${profileKey}". Available profiles: ${Object.keys(availableHandProfiles).join(', ')}`);
//     return;
//   }

//   // Clear previous hand models before adding the new one
//   hand1.clear();
//   hand2.clear();

//   if (profile.type === 'default') {
//     // Load default hand model profiles
//     hand1.add(handModelFactory.createHandModel(hand1, profile.profileName));
//     hand2.add(handModelFactory.createHandModel(hand2, profile.profileName));
//     console.log(`Loaded default hand model profile: ${profile.profileName}`);

//   } else if (profile.type === 'custom') {
//     console.log('Loaded custom hand models...');
    
//     // Load custom hand models
//     loadCustomHandModel(hand1, profile.left);
//     loadCustomHandModel(hand2, profile.right);
//     console.log('Loaded custom hand models.');
//   }
// }

// // Example usage: Load the default profile or a custom profile
// // const selectedProfile = 'spheres';
// const selectedProfile = 'custom';

//  // Change to 'mesh', 'boxes', 'spheres', or 'custom'
// loadHandProfile(selectedProfile);

// // XR Button with Required Features for Hand Tracking
// const sessionInit = {
//   requiredFeatures: ['hand-tracking'], // Ensure that 'hand-tracking' is required for the session
//   optionalFeatures: ['layers', 'local-floor', 'bounded-floor']
// };

// const customXRButton = document.getElementById('entervr');
// customXRButton.addEventListener('click', () => {
//   navigator.xr.requestSession('immersive-vr', sessionInit).then((session) => {
//     renderer.xr.setSession(session);
//     console.log('XR Session started with hand-tracking and floor features.');
//   }).catch((error) => {
//     console.error('Failed to start XR session:', error);
//   });
// });

// // Add Pointer Lines for Controller Interaction
// const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)]);
// const line = new THREE.Line(geometry);
// line.name = 'line';
// line.scale.z = 5;

// controller1.add(line.clone());
// controller2.add(line.clone());

// // Add Event Listeners to Detect Hand and Controller Connection
// hand1.addEventListener('connected', (event) => {
//   console.log('Hand 1 connected:', event.data.hand);
//   hand1.visible = true;
// });
// hand2.addEventListener('connected', (event) => {
//   console.log('Hand 2 connected:', event.data.hand);
//   hand2.visible = true;
// });

// hand1.addEventListener('disconnected', () => {
//   console.log('Hand 1 disconnected.');
//   hand1.visible = false;
// });
// hand2.addEventListener('disconnected', () => {
//   console.log('Hand 2 disconnected.');
//   hand2.visible = false;
// });

// hand1.addEventListener('pinchstart', () => {
//   hand1.visible = !hand1.visible;
//   console.log('Hand 1 visibility toggled:', hand1.visible);
// });
// hand2.addEventListener('pinchstart', () => {
//   hand2.visible = !hand2.visible;
//   console.log('Hand 2 visibility toggled:', hand2.visible);
// });


// // Detect XR Session Start/End for Proper Initialization
// renderer.xr.addEventListener('sessionstart', () => {
//   console.log('XR Session started. Ensure hands and controllers are active.');
//   hand1.visible = true;
//   hand2.visible = true;
// });
// renderer.xr.addEventListener('sessionend', () => {
//   console.log('XR Session ended. Hide hand models.');
//   hand1.visible = false;
//   hand2.visible = false;
// });


// XR Controllers
const controller1 = renderer.xr.getController(0);
const controller2 = renderer.xr.getController(1);
scene.add(controller1);
scene.add(controller2);

// Add Controller Models and Hand Models
const controllerModelFactory = new window.XRControllerModelFactory();
const handModelFactory = new window.XRHandModelFactory();
handModelFactory.setPath('models/hands/'); // Set base path for hand models

// Controller Grips
const controllerGrip1 = renderer.xr.getControllerGrip(0);
const controllerGrip2 = renderer.xr.getControllerGrip(1);
controllerGrip1.add(controllerModelFactory.createControllerModel(controllerGrip1));
controllerGrip2.add(controllerModelFactory.createControllerModel(controllerGrip2));
scene.add(controllerGrip1);
scene.add(controllerGrip2);

// Hand Instances
const hand1 = renderer.xr.getHand(0);
const hand2 = renderer.xr.getHand(1);
scene.add(hand1);
scene.add(hand2);

// Profiles: Default and Custom Models
const availableHandProfiles = {
  mesh: { type: 'default', profileName: 'mesh' },
  boxes: { type: 'default', profileName: 'boxes' },
  spheres: { type: 'default', profileName: 'spheres' },
  custom: { type: 'custom', left: 'models/hands/left.glb', right: 'models/hands/right.glb' }
};

// Load GLTF Hand Model (Custom)
function loadCustomHandModel(hand, url) {
  gltfLoader.load(
    url,
    (gltf) => {
      const model = gltf.scene.children[0] || gltf.scene; // Ensure correct child or root
      model.scale.set(0.2, 0.2, 0.2); // Adjust scale
      model.position.set(0, -0.05, 0); // Center it
      model.rotation.set(0, Math.PI, 0); // Ensure correct orientation
      model.visible = true; // Ensure it’s visible
      model.frustumCulled = false; // Prevent clipping
      hand.add(model);
      console.log(`Custom hand model loaded from: ${url}`);
    },
    undefined,
    (error) => {
      console.error(`Failed to load custom hand model from ${url}:`, error);
    }
  );
}

// Enhanced Hand Profile Loader
function loadHandProfile(profileKey) {
  const profile = availableHandProfiles[profileKey];

  if (!profile) {
    console.error(`Invalid profile "${profileKey}". Available profiles: ${Object.keys(availableHandProfiles).join(', ')}`);
    return;
  }

  hand1.clear();
  hand2.clear();

  if (profile.type === 'default') {
    hand1.add(handModelFactory.createHandModel(hand1, profile.profileName));
    hand2.add(handModelFactory.createHandModel(hand2, profile.profileName));
    console.log(`Loaded default hand profile: ${profile.profileName}`);
  } else if (profile.type === 'custom') {
    console.log('Loading custom hand models...');
    loadCustomHandModel(hand1, profile.left);
    loadCustomHandModel(hand2, profile.right);
  }
}

// Load Desired Profile
const selectedProfile = 'mesh'; // Change to 'mesh', 'boxes', 'spheres', or 'custom'
loadHandProfile(selectedProfile);

// Ensure the hands are visible during the XR session
renderer.xr.addEventListener('sessionstart', () => {
  console.log('XR session started.');
  hand1.visible = true;
  hand2.visible = true;
});

renderer.xr.addEventListener('sessionend', () => {
  console.log('XR session ended.');
  hand1.visible = false;
  hand2.visible = false;
});

// Add Pointer Lines for Interaction (Raycaster)
const lineGeometry = new THREE.BufferGeometry().setFromPoints([
  new THREE.Vector3(0, 0, 0),
  new THREE.Vector3(0, 0, -1),
]);

const pointerLine = new THREE.Line(lineGeometry);
pointerLine.name = 'line';
pointerLine.scale.z = 5;
controller1.add(pointerLine.clone());
controller2.add(pointerLine.clone());

// Debugging Helper - Adds Bounding Boxes to Visualize Models
function addBoundingBoxHelper(object, color = 0xff0000) {
  const helper = new THREE.BoxHelper(object, color);
  scene.add(helper);
  console.log('Debug bounding box added.');
}

hand1.addEventListener('connected', () => {
  console.log('Hand 1 connected.');
  addBoundingBoxHelper(hand1);
});
hand2.addEventListener('connected', () => {
  console.log('Hand 2 connected.');
  addBoundingBoxHelper(hand2);
});

// Event Listeners for Pinch Gestures (Debugging)
hand1.addEventListener('pinchstart', () => {
  console.log('Hand 1 pinch gesture detected!');
  hand1.visible = !hand1.visible; // Toggle visibility on pinch
});
hand2.addEventListener('pinchstart', () => {
  console.log('Hand 2 pinch gesture detected!');
  hand2.visible = !hand2.visible;
});

// XR Session Init
const sessionInit = {
  requiredFeatures: ['hand-tracking'],
  optionalFeatures: ['layers', 'local-floor', 'bounded-floor'],
};

// XR Button Setup
const customXRButton = document.getElementById('entervr');
customXRButton.addEventListener('click', () => {
  navigator.xr
    .requestSession('immersive-vr', sessionInit)
    .then((session) => {
      renderer.xr.setSession(session);
      console.log('XR session started with hand-tracking.');
    })
    .catch((error) => {
      console.error('Failed to start XR session:', error);
    });
});

// Debugging Tip: Check if GLTF Model is Too Small or Culled
function checkModelVisibility(model) {
  if (!model.visible) {
    console.warn(`Model ${model.name || 'Unnamed'} is invisible.`);
  }
}



/* XR Controls */


  const controls = new window.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;

  // Prevent camera from moving below the ground
  controls.minPolarAngle = 0; // Looking straight forward
  controls.maxPolarAngle = (Math.PI / 2) - 0.1; // Limit to prevent looking below the horizon

  // Limit zoom or distance
  controls.minDistance = 1.7; // Minimum distance the camera can be to the target
  controls.maxDistance = 10; // Maximum distance the camera can be from the target


    // Load the textures
    const textureLoader = new THREE.TextureLoader();

    const diffuseMap = textureLoader.load('https://play2.s3.amazonaws.com/assets/a06Yd7_mB.jpeg'); // Albedo/Diffuse map
    const roughnessMap = textureLoader.load('https://play2.s3.amazonaws.com/assets/VrZVTwidd.png'); // Roughness map
    const normalMap = textureLoader.load('https://play2.s3.amazonaws.com/assets/ZiyZbKPCP.png'); // Normal map
    const displacementMap = textureLoader.load('https://play2.s3.amazonaws.com/assets/4imbF5Eut.png'); // Displacement map
    const translucencyMap = textureLoader.load('https://play2.s3.amazonaws.com/assets/qP24vrGr2.png'); // Translucency map

    // Configure texture wrapping and repeat
    [diffuseMap, roughnessMap, normalMap, displacementMap, translucencyMap].forEach((map) => {
        map.wrapS = THREE.RepeatWrapping;
        map.wrapT = THREE.RepeatWrapping;
        map.repeat.set(100, 100);
    });

    // Create the material
    const floorMaterial = new THREE.MeshStandardMaterial({
        map: diffuseMap,
        roughnessMap: roughnessMap,
        normalMap: normalMap,
        displacementMap: displacementMap,
        displacementScale: 0.3,
        metalness: 0.01,
        roughness: 0.1,
    });

    // Inject the custom shader logic for translucency
    floorMaterial.onBeforeCompile = (shader) => {
        shader.uniforms.translucencyMap = { value: translucencyMap };

        shader.fragmentShader = shader.fragmentShader.replace(
            `#include <map_fragment>`,

            `
            #include <map_fragment>
            #ifdef USE_UV
              vec4 translucencyColor = texture(translucencyMap, vUv);
              gl_FragColor.rgb += translucencyColor.rgb * 0.1; // Adjust translucency intensity
            #endif
            `
        );
    };

    // Create the floor geometry and mesh
    const floorGeometry = new THREE.PlaneGeometry(500, 500, 256, 256);
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;

    // Add to the scene
    scene.add(floor);

    //addHemisphereLight(scene);
    addEnvironmentMap(scene, renderer);

    addFog(scene, 0xfffaf5, 0.1, 30); // Color, near distance, far distance    

  const directionalLight = new THREE.DirectionalLight(0xffdd99, 1);
  directionalLight.position.set(10, 20, 10);
  directionalLight.castShadow = true;
  scene.add(directionalLight);

  const ambientLight = new THREE.AmbientLight(0xffd59e, 0.4); // Light peach ambient light
  scene.add(ambientLight);

  // car model from chunks
  // Parse JSON string

  // let jsonStringFull = `
  // {
  //   "merc-ch__body_black_0": "https://play2.s3.amazonaws.com/assets/bnY3hOe-Uu.glb",
  //   "merc-ch__body_body_0": "https://play2.s3.amazonaws.com/assets/h0F4z29dBW.glb",
  //   "merc-ch__body_bulb red_0": "https://play2.s3.amazonaws.com/assets/hfUJ99PTv.glb",
  //   "merc-ch__body_metallic_0": "https://play2.s3.amazonaws.com/assets/LgpqQOab9i.glb",
  //   "merc-ch__body_interior plastic_0": "https://play2.s3.amazonaws.com/assets/_43xe1cfyg.glb",
  //   "merc-ch__body_glass_0": "https://play2.s3.amazonaws.com/assets/0mo_4ToRTH.glb",
  //   "merc-ch__body_bulb_0": "https://play2.s3.amazonaws.com/assets/T52A-gWyvx.glb",
  //   "merc-ch__body_rear bulb_0": "https://play2.s3.amazonaws.com/assets/PV-iWO7Me.glb",
  //   "merc-ch__body_Material_0": "https://play2.s3.amazonaws.com/assets/7d1Rzvt5I-.glb",
  //   "merc-ch__body_illinoisplatemerc_0": "https://play2.s3.amazonaws.com/assets/t_trah89je.glb",
  //   "merc-ch__suspension_black_0": "https://play2.s3.amazonaws.com/assets/2-Ez3SmkEg.glb",
  //   "merc-ch__wheel1_tyre_0": "https://play2.s3.amazonaws.com/assets/PEMDFu9hOq.glb",
  //   "merc-ch__wheel1_red_0": "https://play2.s3.amazonaws.com/assets/EEQyH1ky_.glb",
  //   "merc-ch__wheel1_tyre_0.001": "https://play2.s3.amazonaws.com/assets/3-IMgmvq93.glb",
  //   "merc-ch__wheel1_red_0.001": "https://play2.s3.amazonaws.com/assets/yuHN_Ud307.glb",
  //   "merc-ch__wheel1_tyre_0.002": "https://play2.s3.amazonaws.com/assets/U-VBlyg9lq.glb",
  //   "merc-ch__wheel1_red_0.002": "https://play2.s3.amazonaws.com/assets/gTYGIhLos6.glb",
  //   "merc-ch__wheel1_tyre_0.003": "https://play2.s3.amazonaws.com/assets/-W1B899DM.glb",
  //   "merc-ch__wheel1_red_0.003": "https://play2.s3.amazonaws.com/assets/7AWK5lShy9.glb",
  //   "merc-ch__body_black plastic_0": "https://play2.s3.amazonaws.com/assets/fhJ60D01F.glb"
  // }
  // `


  // let jsonString = `
  // {

  //   "merc-ch__wheel1_tyre_0": "https://play2.s3.amazonaws.com/assets/PEMDFu9hOq.glb",
  //   "merc-ch__wheel1_red_0": "https://play2.s3.amazonaws.com/assets/EEQyH1ky_.glb",
  //   "merc-ch__wheel1_tyre_0.001": "https://play2.s3.amazonaws.com/assets/3-IMgmvq93.glb",
  //   "merc-ch__wheel1_red_0.001": "https://play2.s3.amazonaws.com/assets/yuHN_Ud307.glb",
  //   "merc-ch__wheel1_tyre_0.002": "https://play2.s3.amazonaws.com/assets/U-VBlyg9lq.glb",
  //   "merc-ch__wheel1_red_0.002": "https://play2.s3.amazonaws.com/assets/gTYGIhLos6.glb",
  //   "merc-ch__wheel1_tyre_0.003": "https://play2.s3.amazonaws.com/assets/-W1B899DM.glb",
  //   "merc-ch__wheel1_red_0.003": "https://play2.s3.amazonaws.com/assets/7AWK5lShy9.glb",
  //   "merc-ch__body_black plastic_0": "https://play2.s3.amazonaws.com/assets/fhJ60D01F.glb"
  // }
  // `

const glbFiles = {
    "merc-ch__body_black_0": "https://play2.s3.amazonaws.com/assets/bnY3hOe-Uu.glb",
    "merc-ch__body_body_0": "https://play2.s3.amazonaws.com/assets/h0F4z29dBW.glb",
    "merc-ch__body_bulb red_0": "https://play2.s3.amazonaws.com/assets/hfUJ99PTv.glb",
    "merc-ch__body_metallic_0": "https://play2.s3.amazonaws.com/assets/LgpqQOab9i.glb",
    "merc-ch__body_interior plastic_0": "https://play2.s3.amazonaws.com/assets/_43xe1cfyg.glb",
    "merc-ch__body_glass_0": "https://play2.s3.amazonaws.com/assets/0mo_4ToRTH.glb",
    "merc-ch__body_bulb_0": "https://play2.s3.amazonaws.com/assets/T52A-gWyvx.glb",
    "merc-ch__body_rear bulb_0": "https://play2.s3.amazonaws.com/assets/PV-iWO7Me.glb",
    "merc-ch__body_Material_0": "https://play2.s3.amazonaws.com/assets/7d1Rzvt5I-.glb",
    "merc-ch__body_illinoisplatemerc_0": "https://play2.s3.amazonaws.com/assets/t_trah89je.glb",
    "merc-ch__suspension_black_0": "https://play2.s3.amazonaws.com/assets/2-Ez3SmkEg.glb",
    "merc-ch__wheel1_red_0": "https://play2.s3.amazonaws.com/assets/EEQyH1ky_.glb",
    "merc-ch__wheel1_red_0.001": "https://play2.s3.amazonaws.com/assets/yuHN_Ud307.glb",
    "merc-ch__wheel1_red_0.002": "https://play2.s3.amazonaws.com/assets/gTYGIhLos6.glb",
    "merc-ch__wheel1_red_0.003": "https://play2.s3.amazonaws.com/assets/7AWK5lShy9.glb",
    "merc-ch__wheel1_tyre_0": "https://play2.s3.amazonaws.com/assets/PEMDFu9hOq.glb",
    "merc-ch__wheel1_tyre_0.001": "https://play2.s3.amazonaws.com/assets/3-IMgmvq93.glb",
    "merc-ch__wheel1_tyre_0.002": "https://play2.s3.amazonaws.com/assets/U-VBlyg9lq.glb",
    "merc-ch__wheel1_tyre_0.003": "https://play2.s3.amazonaws.com/assets/-W1B899DM.glb",
    "merc-ch__body_black plastic_0": "https://play2.s3.amazonaws.com/assets/fhJ60D01F.glb"
}


// tyre front right - merc-ch__wheel1_tyre_0
// tyre front left - merc-ch__wheel1_tyre_0.001
// tyre back right - merc-ch__wheel1_tyre_0.002
// tyre back left - merc-ch__wheel1_tyre_0.003



// Wheel names for reference
const wheelMappings = {
  frontRight: "merc-ch__wheel1_tyre_0",   // Front right wheel
  frontLeft: "merc-ch__wheel1_tyre_0.001", // Front left wheel
  backRight: "merc-ch__wheel1_tyre_0.002", // Back right wheel
  backLeft: "merc-ch__wheel1_tyre_0.003"   // Back left wheel
};

// Store references to wheel meshes
const wheels = {
  frontRight: null,
  frontLeft: null,
  backRight: null,
  backLeft: null
};

// Create a parent container for the vehicle
const vehicleContainer = new THREE.Group(); // Parent container for all car parts
vehicleContainer.name = "VehicleContainer"; // Optional: Name for debugging
scene.add(vehicleContainer); // Add container to the scene

Object.entries(glbFiles).forEach(([modelName, modelUrl]) => {
  gltfLoader.load(
    modelUrl,
    (gltf) => {
      const model = gltf.scene;

      model.traverse((node) => {
        if (node.isMesh) {
          node.castShadow = true;

          // Target the specific mesh for tinting
          if (modelName === "merc-ch__body_body_0" && node.material) {
            const newMaterial = node.material.clone(); // Clone material
            node.material = newMaterial; // Assign cloned material to avoid sharing issues
            targetMesh = node; // Save reference for color change
            console.log(`Loaded and set target material for ${modelName}`);
          }

          // Detect wheels and store references
          if (node.name === wheelMappings.frontRight) wheels.frontRight = node;
          if (node.name === wheelMappings.frontLeft) wheels.frontLeft = node;
          if (node.name === wheelMappings.backRight) wheels.backRight = node;
          if (node.name === wheelMappings.backLeft) wheels.backLeft = node;
        }
      });

      // Add each model to the parent vehicle container
      vehicleContainer.add(model);
      console.log(`Added ${modelName} to vehicle container`);
    },
    undefined,
    (error) => {
      console.error(`Failed to load model ${modelUrl}:`, error);
    }
  );
});

// Velocity for vehicle movement
const vehicleVelocity = new THREE.Vector3(0, 0, 0);
let acceleration = 0.01; // Base acceleration rate
let maxSpeed = 0.1; // Maximum speed for forward/backward movement
let deceleration = 0.005; // Passive deceleration rate when no input
let brakeForce = 0.02; // Stronger deceleration for braking

// Track key presses
const keysPressed = {
  ArrowUp: false, // Forward
  ArrowDown: false // Backward
};

// Listen for key press events
document.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowUp') keysPressed.ArrowUp = true;
  if (event.key === 'ArrowDown') keysPressed.ArrowDown = true;
});

document.addEventListener('keyup', (event) => {
  if (event.key === 'ArrowUp') keysPressed.ArrowUp = false;
  if (event.key === 'ArrowDown') keysPressed.ArrowDown = false;
});

// Function to rotate wheels based on speed
function rotateWheels(deltaTime) {
  const rotationSpeedFactor = 2 * Math.PI; // Controls wheel rotation speed based on speed

  Object.entries(wheels).forEach(([key, wheel]) => {
    if (wheel) {
      const rotationAmount = (vehicleVelocity.z * deltaTime * rotationSpeedFactor) / 0.3; // Assume 0.3 meters per rotation
      wheel.rotation.x += rotationAmount; // Rotate around x-axis
    } else {
      console.warn(`Wheel ${key} not found or not loaded.`);
    }
  });
}

// Function to update vehicle movement based on velocity
function updateVehicleMovement(deltaTime) {
  if (keysPressed.ArrowUp) {
    // Apply acceleration forward
    vehicleVelocity.z -= acceleration * deltaTime;
    if (vehicleVelocity.z < -maxSpeed) vehicleVelocity.z = -maxSpeed; // Limit to max speed
  }

  if (keysPressed.ArrowDown) {
    // Apply braking force
    vehicleVelocity.z += brakeForce * deltaTime;
    if (vehicleVelocity.z > maxSpeed) vehicleVelocity.z = maxSpeed; // Limit backward speed
  }

  // Apply passive deceleration when no input
  if (!keysPressed.ArrowUp && !keysPressed.ArrowDown) {
    if (vehicleVelocity.z < 0) vehicleVelocity.z += deceleration * deltaTime; // Decelerate forward
    if (vehicleVelocity.z > 0) vehicleVelocity.z -= deceleration * deltaTime; // Decelerate backward
    if (Math.abs(vehicleVelocity.z) < 0.001) vehicleVelocity.z = 0; // Stop completely at low speeds
  }

  // Update vehicleContainer's position
  vehicleContainer.position.z += vehicleVelocity.z;

  // Rotate wheels
  rotateWheels(deltaTime);
}






//   // const glbFiles = JSON.parse(jsonString);

// // Create a parent container for the vehicle
// const vehicleContainer = new THREE.Group(); // Parent container for all car parts
// vehicleContainer.name = "VehicleContainer"; // Optional: Name for debugging
// scene.add(vehicleContainer); // Add container to the scene

// Object.entries(glbFiles).forEach(([modelName, modelUrl]) => {
//   gltfLoader.load(
//     modelUrl,
//     (gltf) => {
//       const model = gltf.scene;

//       model.traverse((node) => {
//         if (node.isMesh) {
//           node.castShadow = true;

//           // Target the specific mesh for tinting
//           if (modelName === "merc-ch__body_body_0" && node.material) {
//             const newMaterial = node.material.clone(); // Clone material
//             node.material = newMaterial; // Assign cloned material to avoid sharing issues
//             targetMesh = node; // Save reference for color change
//             console.log(`Loaded and set target material for ${modelName}`);
//           }
//         }
//       });

//       // Add each model to the parent vehicle container
//       vehicleContainer.add(model);
//       console.log(`Added ${modelName} to vehicle container`);
//     },
//     undefined,
//     (error) => {
//       console.error(`Failed to load model ${modelUrl}:`, error);
//     }
//   );
// });



// // Velocity for vehicle movement
// const vehicleVelocity = new THREE.Vector3(0, 0, 0);
// let acceleration = 0.01; // Base acceleration rate
// let maxSpeed = 0.1; // Maximum speed for forward/backward movement
// let deceleration = 0.005; // Passive deceleration rate when no input
// let brakeForce = 0.02; // Stronger deceleration for braking

// // Track key presses
// const keysPressed = {
//   ArrowUp: false, // Forward
//   ArrowDown: false // Backward
// };

// // Listen for key press events
// document.addEventListener('keydown', (event) => {
//   if (event.key === 'ArrowUp') keysPressed.ArrowUp = true;
//   if (event.key === 'ArrowDown') keysPressed.ArrowDown = true;
// });

// document.addEventListener('keyup', (event) => {
//   if (event.key === 'ArrowUp') keysPressed.ArrowUp = false;
//   if (event.key === 'ArrowDown') keysPressed.ArrowDown = false;
// });

// // Function to update vehicle movement based on velocity
// function updateVehicleMovement(deltaTime) {
//   if (keysPressed.ArrowUp) {
//     // Apply acceleration forward
//     vehicleVelocity.z -= acceleration * deltaTime;
//     if (vehicleVelocity.z < -maxSpeed) vehicleVelocity.z = -maxSpeed; // Limit to max speed
//   }

//   if (keysPressed.ArrowDown) {
//     // Apply braking force
//     vehicleVelocity.z += brakeForce * deltaTime;
//     if (vehicleVelocity.z > maxSpeed) vehicleVelocity.z = maxSpeed; // Limit backward speed
//   }

//   // Apply passive deceleration when no input
//   if (!keysPressed.ArrowUp && !keysPressed.ArrowDown) {
//     if (vehicleVelocity.z < 0) vehicleVelocity.z += deceleration * deltaTime; // Decelerate forward
//     if (vehicleVelocity.z > 0) vehicleVelocity.z -= deceleration * deltaTime; // Decelerate backward
//     if (Math.abs(vehicleVelocity.z) < 0.001) vehicleVelocity.z = 0; // Stop completely at low speeds
//   }

//   // Update vehicleContainer's position
//   vehicleContainer.position.z += vehicleVelocity.z;
// }





  generateSandstorm(scene, 60000, 40);



// Easing functions
const easeInOutQuad = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
// const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
// const easeInOutCubic = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

// Choose easing function
const easingFunction = easeInOutQuad; // Change this to `easeOutCubic` or `easeInOutCubic` for different effects

/* Camera Positions */
const positions = {
  front: { x: 0, y: 1.3, z: 5, label: "Front" },
  back: { x: 0, y: 2, z: -5, label: "Back" },
  left: { x: -5, y: 2, z: 0, label: "Left" },
  right: { x: 5, y: 2, z: 0, label: "Right" },
  top: { x: 0.1, y: 5, z: 0.1, label: "Top" },
  inside: { x: 0.2, y: 1.1, z: 0.1, label: "Inside" }
};

let targetCameraPosition = null;
let initialCameraPosition = null;
let transitionProgress = 0;
const transitionSpeed = 0.025;
let isCameraMoving = false;
let isFlying = false; // FLYCAM toggle
let orbitAngle = 0;
const flySpeed = 0.01; // Speed of FLYCAM orbiting
const center = new THREE.Vector3(0, 0, 0); // The center the camera looks at

// Create buttons for each camera position
const createButtons = (positions) => {
  const buttonContainer = document.getElementsByClassName('cam-buttons')[0]; 
  if (!buttonContainer) {
    console.error("Camera buttons container not found.");
    return;
  }

  Object.keys(positions).forEach((key) => {
    const btn = document.createElement("button");
    btn.textContent = positions[key].label; // Button label (e.g., "Front")
    btn.className = "bts";
    btn.onclick = () => {
      disableFlying(); // Disable flying if manual button clicked
      if (!isCameraMoving) {
        initialCameraPosition = camera.position.clone(); // Store current camera position
        targetCameraPosition = new THREE.Vector3(positions[key].x, positions[key].y, positions[key].z);
        transitionProgress = 0;
        isCameraMoving = true;
        controls.enabled = false; // Disable manual orbit controls during animation
        controls.enableDamping = false;
      }
    };
    buttonContainer.appendChild(btn); // Add button to container
  });
};

createButtons(positions);

const toggleFlying = () => {
  if (!isFlying) {
    // Prepare for starting flying
    const dx = camera.position.x - center.x;
    const dz = camera.position.z - center.z;
    orbitAngle = Math.atan2(dz, dx); // Use current angle relative to the center
    currentDistance = camera.position.distanceTo(center); // Use current distance
    isFlying = true;
  } else {
    // Stop flying smoothly
    isFlying = false;
  }
};

const updateFlyCam = () => {
  if (isFlying) {
    orbitAngle += flySpeed; // Increment the orbit angle
    const height = camera.position.y - center.y; // Maintain current height

    // Calculate new position based on the current distance
    const x = center.x + currentDistance * Math.cos(orbitAngle);
    const z = center.z + currentDistance * Math.sin(orbitAngle);

    camera.position.set(x, center.y + height, z);
    camera.lookAt(center); // Keep looking at the center
  }
};

const disableFlying = () => {
  if (isFlying) {
    isFlying = false;
    console.log("FLYCAM disabled due to manual interaction.");
    controls.enabled = true; // Re-enable OrbitControls
  }
};

/* Colour Picker */

// Reference to the button
const colorPickerButton = document.getElementById('colorpick');

// Attach the event listener to the button
colorPickerButton.addEventListener('click', () => {
  openColorPicker(); // Open color picker when button is clicked
});

// Native color picker function
function openColorPicker() {
  const colorInput = document.createElement('input');
  colorInput.type = 'color'; // Create color picker input
  colorInput.style.position = 'absolute';
  colorInput.style.opacity = 0; // Hide the element visually
  document.body.appendChild(colorInput);

  // Listen for the color change event
  colorInput.addEventListener('input', (event) => {
    const selectedColor = event.target.value;
    if (targetMesh && targetMesh.material) {
      targetMesh.material.color.set(selectedColor); // Update mesh color
      console.log(`Applied color: ${selectedColor}`);
    }
  });

  // Automatically trigger the color picker
  colorInput.click();

  // Remove the input element after use
  colorInput.addEventListener('change', () => {
    document.body.removeChild(colorInput);
  });
}


const updateCameraPosition = () => {
  if (targetCameraPosition && initialCameraPosition && transitionProgress < 1) {
    transitionProgress += transitionSpeed;
    let t = Math.min(transitionProgress, 1);

    // Apply easing function to t
    t = easingFunction(t);

    const interpolatedPosition = initialCameraPosition.clone().lerp(targetCameraPosition, t);

    camera.position.copy(interpolatedPosition);
    camera.up.set(0, 1, 0);
    camera.lookAt(center);
    controls.target.set(0, 0, 0);

    if (t === 1) {
      isCameraMoving = false;
      controls.enabled = true;
      controls.enableDamping = true;
      controls.update();
    }
  }
};


// Create a THREE.Clock instance to track time
const clock = new THREE.Clock();


const updateScene = () => {

  const deltaTime = clock.getDelta(); // Get time since last frame


  if (!isCameraMoving && !isFlying) {
    controls.update(); // Allow manual controls only if not moving or flying
  }
  updateCameraPosition(); // Smooth transitions for button clicks
  updateFlyCam(); // Handle automatic orbiting

  updateVehicleMovement(deltaTime);

  //updateSandstorm(); // Ensure the sandstorm effect runs smoothly

};

const flyCamBtn = document.getElementById("flycam");
flyCamBtn.onclick = () => toggleFlying();

window.addEventListener("resize", () => {
  renderer.setSize(container.clientWidth, container.clientHeight);
  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix();
});

renderer.setAnimationLoop(() => {
  updateScene();
  renderer.render(scene, camera);
});

controls.addEventListener("start", disableFlying); // Disable flying when using OrbitControls


}
