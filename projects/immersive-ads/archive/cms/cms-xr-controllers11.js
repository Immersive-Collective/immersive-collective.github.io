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


// Function to add random obstacles (cubes) to the scene
function addObstacles(scene, amount, area) {
    const obstacleGroup = new THREE.Group(); // Group to hold all obstacles for better control
    obstacleGroup.name = "ObstacleGroup"; // Optional: Name for debugging

    for (let i = 0; i < amount; i++) {
        const size = 5 + Math.random() * 20; // Random size between 5 and 25
        const cubeGeometry = new THREE.BoxGeometry(size, 60, size);
        const grayShade = Math.random() * 0.5 + 0.2; // Shades of gray for the obstacle
        //const cubeMaterial = new THREE.MeshStandardMaterial({ color: new THREE.Color(grayShade, grayShade, grayShade) });
        const cubeMaterial = new THREE.MeshStandardMaterial({
            color: new THREE.Color(grayShade, grayShade, grayShade), // Pink color (Hot Pink)
            metalness: 1, // Adjust reflectivity
            roughness: 0.8, // Adjust surface roughness
            envMapIntensity: 1.0 // Make it more reactive to environment maps
        });


        const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
        cube.castShadow = true;
        cube.receiveShadow = true;

        cube.position.x = (Math.random() - 0.5) * area;
        cube.position.z = (Math.random() - 0.5) * area;
        cube.position.y = size / 2; // Elevate the obstacle

        // Add bounding box for collision detection
        cube.userData.boundingBox = new THREE.Box3().setFromObject(cube); 

        obstacleGroup.add(cube);
    }

    scene.add(obstacleGroup);
    console.log(`${amount} obstacles added within an area of ${area} units.`);
}




// // Function to add random obstacles (cubes) to the scene
// function addObstacles(scene, amount, area) {
//     const obstacleGroup = new THREE.Group(); // Group to hold all obstacles for better control

//     for (let i = 0; i < amount; i++) {
//         // Create a cube geometry with a random size (up to 1.7 units)
//         const size = 2 + Math.random() * 8; // Random size between 0 and 1.7
//         const cubeGeometry = new THREE.BoxGeometry(size, 40, size);

//         // Random color for the obstacle
//         const randomColor = new THREE.Color(Math.random(), Math.random(), Math.random());
//         const cubeMaterial = new THREE.MeshStandardMaterial({ color: randomColor });

//         // Create the mesh
//         const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
//         cube.castShadow = true; // Allow the cube to cast shadows
//         cube.receiveShadow = true; // Allow cube to receive shadows

//         // Random position within the defined area
//         cube.position.x = (Math.random() - 0.5) * area; // Spread in x-direction within the area
//         cube.position.z = (Math.random() - 0.5) * area; // Spread in z-direction within the area
//         cube.position.y = size / 2; // Elevate to sit on the floor

//         // Add cube to the obstacle group
//         obstacleGroup.add(cube);
//     }

//     // Add the group of obstacles to the scene
//     scene.add(obstacleGroup);
//     console.log(`${amount} obstacles added within an area of ${area} units.`);
// }



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






/* Sound FX */

/* Sound FX */

// Initialize Web Audio context
let audioContext = null;
let lowPassFilter, engineLowOscillator, engineMidOscillator, engineHighOscillator, gainNode;
let engineInitialized = false;

// Engine control variables
let enginePower = 0; // Represents the throttle level (0 to 1)
let isThrottlePressed = false;
let isBrakePressed = false;
let isDecelerating = false;
//let collisionDetected = false; // For collision sound control

// Engine dynamics constants
const accelerationRate = 0.01; // Rate at which engine power increases when throttle is pressed
const decelerationRate = 0.005; // Rate at which engine power decreases when not accelerating
const brakeDeceleration = 0.02; // Deceleration when braking

// Initialize engine sound components only after user interaction
function initAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        initEngineSound();
        console.log("Audio context initialized on user interaction.");
    }
}

function initEngineSound() {
    if (engineInitialized || !audioContext) return;

    // Low-RPM oscillator (low-frequency rumble)
    engineLowOscillator = audioContext.createOscillator();
    engineLowOscillator.type = "triangle"; // Smooth low rumble
    engineLowOscillator.frequency.setValueAtTime(50, audioContext.currentTime);

    // Mid-RPM oscillator (mid-range hum)
    engineMidOscillator = audioContext.createOscillator();
    engineMidOscillator.type = "square"; // Adds some texture to mid-range
    engineMidOscillator.frequency.setValueAtTime(100, audioContext.currentTime);

    // High-RPM oscillator (high-frequency whine)
    engineHighOscillator = audioContext.createOscillator();
    engineHighOscillator.type = "sawtooth"; // High-pitched whine
    engineHighOscillator.frequency.setValueAtTime(200, audioContext.currentTime);

    // Gain node to control volume
    gainNode = audioContext.createGain();
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);

    // Low-pass filter to muffle sound at low speeds
    lowPassFilter = audioContext.createBiquadFilter();
    lowPassFilter.type = "lowpass";
    lowPassFilter.frequency.setValueAtTime(1000, audioContext.currentTime);

    // Connect oscillators to filter and gain
    engineLowOscillator.connect(lowPassFilter);
    engineMidOscillator.connect(lowPassFilter);
    engineHighOscillator.connect(lowPassFilter);
    lowPassFilter.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Start oscillators
    engineLowOscillator.start();
    engineMidOscillator.start();
    engineHighOscillator.start();
    engineInitialized = true;
}

function adjustEngineSound(enginePower) {
    const lowFrequency = 50 + enginePower * 200; // Low rumble for slow speeds
    const midFrequency = 100 + enginePower * 800; // Mid-range hum for medium speeds
    const highFrequency = 200 + enginePower * 1500; // High-pitched whine for fast speeds
    const filterCutoff = 500 + enginePower * 3000; // Adjust muffling dynamically

    engineLowOscillator.frequency.setValueAtTime(lowFrequency, audioContext.currentTime);
    engineMidOscillator.frequency.setValueAtTime(midFrequency, audioContext.currentTime);
    engineHighOscillator.frequency.setValueAtTime(highFrequency, audioContext.currentTime);
    lowPassFilter.frequency.setValueAtTime(filterCutoff, audioContext.currentTime);

    gainNode.gain.setValueAtTime(0.1 + enginePower * 0.6, audioContext.currentTime); // Control gain dynamically
}

function adjustSoundForCollision(speed) {
    if (collisionDetected && speed < 0.1) {
        gainNode.gain.setValueAtTime(0.01, audioContext.currentTime); // Muffle volume
        lowPassFilter.frequency.setValueAtTime(200, audioContext.currentTime); // Heavy muffling
        engineLowOscillator.frequency.setValueAtTime(30, audioContext.currentTime); // Very low rumble
        engineMidOscillator.frequency.setValueAtTime(60, audioContext.currentTime);
        engineHighOscillator.frequency.setValueAtTime(100, audioContext.currentTime); // Almost silent whine
        console.log("Collision detected: sound dampened.");
    } else {
        adjustEngineSound(enginePower); // Resume normal engine sound
    }
}

function updateEngine(deltaTime) {
    if (!engineInitialized) return;

    if (isThrottlePressed) {
        enginePower = Math.min(enginePower + accelerationRate * deltaTime, 1);
    } else if (isBrakePressed) {
        enginePower = Math.max(enginePower - brakeDeceleration * deltaTime, 0);
    } else if (isDecelerating) {
        enginePower = Math.max(enginePower - decelerationRate * deltaTime, 0);
    } else {
        enginePower = Math.max(enginePower - decelerationRate * deltaTime, 0.1);
    }

    adjustEngineSound(enginePower);
}

let userInteracted = false;
document.addEventListener('keydown', (event) => {
    if (!userInteracted) {
        initAudioContext(); // Start audio context on first interaction
        userInteracted = true;
    }

    switch (event.key) {
        case 'ArrowUp':
            isThrottlePressed = true;
            break;
        case 'b': // Brake key
            isBrakePressed = true;
            break;
        case 'ArrowDown':
            isDecelerating = true;
            break;
    }
});

document.addEventListener('keyup', (event) => {
    switch (event.key) {
        case 'ArrowUp':
            isThrottlePressed = false;
            break;
        case 'b':
            isBrakePressed = false;
            break;
        case 'ArrowDown':
            isDecelerating = false;
            break;
    }
});





/* -------------------------------- */

/* XR Controllers */





// XR Controllers
const controller1 = renderer.xr.getController(0);
const controller2 = renderer.xr.getController(1);
scene.add(controller1);
scene.add(controller2);

// Add Controller Models and Hand Models
const controllerModelFactory = new window.XRControllerModelFactory();
const handModelFactory = new window.XRHandModelFactory();

// Controller Grip 1
const controllerGrip1 = renderer.xr.getControllerGrip(0);
controllerGrip1.add(controllerModelFactory.createControllerModel(controllerGrip1));
scene.add(controllerGrip1);

// Controller Grip 2
const controllerGrip2 = renderer.xr.getControllerGrip(1);
controllerGrip2.add(controllerModelFactory.createControllerModel(controllerGrip2));
scene.add(controllerGrip2);

// Hand 1 and Hand 2
const hand1 = renderer.xr.getHand(0);
const hand2 = renderer.xr.getHand(1);
scene.add(hand1);
scene.add(hand2);

// Define available profiles (including custom models)
const availableHandProfiles = {
  mesh: { type: 'default', profileName: 'mesh' },
  boxes: { type: 'default', profileName: 'boxes' },
  spheres: { type: 'default', profileName: 'spheres' },
  custom: { type: 'custom', left: 'https://play2.s3.amazonaws.com/assets/yBs18OtQu.glb', right: 'https://play2.s3.amazonaws.com/assets/kypMY672k.glb' }
};

// Load custom GLTF models using pre-configured loader

function loadCustomHandModel(hand, url) {
  gltfLoader.load(
    url,
    (gltf) => {
      const customHandModel = gltf.scene;
      customHandModel.scale.set(0.01, 0.01, 0.01); // Adjust scale as needed
      hand.add(customHandModel);
      console.log(`Custom hand model loaded from: ${url}`);
    },
    undefined,
    (error) => {
      console.error(`Error loading custom hand model from ${url}:`, error);
    }
  );
}

// Function to load the desired hand model
function loadHandProfile(profileKey) {
  const profile = availableHandProfiles[profileKey];

  if (!profile) {
    console.error(`Invalid profile "${profileKey}". Available profiles: ${Object.keys(availableHandProfiles).join(', ')}`);
    return;
  }

  // Clear previous hand models before adding the new one
  hand1.clear();
  hand2.clear();

  if (profile.type === 'default') {
    // Load default hand model profiles
    hand1.add(handModelFactory.createHandModel(hand1, profile.profileName));
    hand2.add(handModelFactory.createHandModel(hand2, profile.profileName));
    console.log(`Loaded default hand model profile: ${profile.profileName}`);
  } else if (profile.type === 'custom') {
    // Load custom hand models
    loadCustomHandModel(hand1, profile.left);
    loadCustomHandModel(hand2, profile.right);
    console.log('Loaded custom hand models.');
  }
}

// Example usage: Load the default profile or a custom profile
const selectedProfile = 'mesh'; // Change to 'mesh', 'boxes', 'spheres', or 'custom'
loadHandProfile(selectedProfile);

// XR Button with Required Features for Hand Tracking
const sessionInit = {
  requiredFeatures: ['hand-tracking'], // Ensure that 'hand-tracking' is required for the session
  optionalFeatures: ['layers', 'local-floor', 'bounded-floor']
};

const customXRButton = document.getElementById('entervr');
customXRButton.addEventListener('click', () => {
  navigator.xr.requestSession('immersive-vr', sessionInit).then((session) => {
    renderer.xr.setSession(session);
    console.log('XR Session started with hand-tracking and floor features.');
  }).catch((error) => {
    console.error('Failed to start XR session:', error);
  });
});

// Add Pointer Lines for Controller Interaction
const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)]);
const line = new THREE.Line(geometry);
line.name = 'line';
line.scale.z = 5;

controller1.add(line.clone());
controller2.add(line.clone());

// Add Event Listeners to Detect Hand and Controller Connection
hand1.addEventListener('connected', (event) => {
  console.log('Hand 1 connected:', event.data.hand);
  hand1.visible = true;
});
hand2.addEventListener('connected', (event) => {
  console.log('Hand 2 connected:', event.data.hand);
  hand2.visible = true;
});

hand1.addEventListener('disconnected', () => {
  console.log('Hand 1 disconnected.');
  hand1.visible = false;
});
hand2.addEventListener('disconnected', () => {
  console.log('Hand 2 disconnected.');
  hand2.visible = false;
});

// Detect XR Session Start/End for Proper Initialization
renderer.xr.addEventListener('sessionstart', () => {
  console.log('XR Session started. Ensure hands and controllers are active.');
  hand1.visible = true;
  hand2.visible = true;
});
renderer.xr.addEventListener('sessionend', () => {
  console.log('XR Session ended. Hide hand models.');
  hand1.visible = false;
  hand2.visible = false;
});




/* Orbit Controls */


  const controls = new window.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;

  // Prevent camera from moving below the ground
  controls.minPolarAngle = 0; // Looking straight forward
  controls.maxPolarAngle = (Math.PI / 2) - 0.1; // Limit to prevent looking below the horizon

  // Limit zoom or distance
  controls.minDistance = 1.7; // Minimum distance the camera can be to the target
  controls.maxDistance = 60; // Maximum distance the camera can be from the target

    // Function to disable follow mode when user interacts with the orbit controls
    controls.addEventListener("start", () => {
        if (isCameraFollowingCar) {
            isCameraFollowingCar = false; // Disable follow mode
            console.log("Follow mode disabled due to manual interaction.");
            updateFollowButtonStyle(); // Update the follow button style to reflect the change
        }
    });

// Function to disable follow mode and enable OrbitControls
const disableFollowMode = () => {
    if (isCameraFollowingCar) {
        isCameraFollowingCar = false; // Disable follow mode
        console.log("Follow mode disabled due to manual interaction.");
        updateFollowButtonStyle(); // Update the follow button style to reflect the change
        controls.enabled = true; // Re-enable OrbitControls for manual input
    }
};

// Listen to various user interaction events to disable follow mode and enable OrbitControls
controls.addEventListener("start", disableFollowMode); // When OrbitControls detects interaction
window.addEventListener("pointerdown", disableFollowMode); // For pointer-based input (mouse, pen, touch)
window.addEventListener("wheel", disableFollowMode); // For trackpad/mouse wheel interaction
window.addEventListener("touchstart", disableFollowMode); // For touch input (mobile, trackpad gestures)


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
        map.repeat.set(2, 1);
    });



  const FLOOR_SIZE = 150; // Size of one floor tile
  const TILE_COUNT = 3; // 3x3 grid of floor tiles

  // Create floor tiles
  const floorTiles = [];
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


  for (let x = -1; x <= 1; x++) {
      for (let z = -1; z <= 1; z++) {
          const floorGeometry = new THREE.PlaneGeometry(FLOOR_SIZE, FLOOR_SIZE, 64, 64);
          const floorTile = new THREE.Mesh(floorGeometry, floorMaterial);
          floorTile.rotation.x = -Math.PI / 2; // Make it horizontal
          floorTile.position.set(x * FLOOR_SIZE, 0, z * FLOOR_SIZE);
          floorTile.receiveShadow = true;
          scene.add(floorTile);
          floorTiles.push(floorTile);
      }
  }

  // Function to update floor positions to create seamless looping
  function updateFloorPosition() {
      const carWorldPosition = new THREE.Vector3();
      vehicleContainer.getWorldPosition(carWorldPosition);

      const centerX = Math.round(carWorldPosition.x / FLOOR_SIZE) * FLOOR_SIZE;
      const centerZ = Math.round(carWorldPosition.z / FLOOR_SIZE) * FLOOR_SIZE;

      let index = 0;
      for (let x = -1; x <= 1; x++) {
          for (let z = -1; z <= 1; z++) {
              floorTiles[index].position.set(centerX + x * FLOOR_SIZE, 0, centerZ + z * FLOOR_SIZE);
              index++;
          }
      }
  }


    //addHemisphereLight(scene);
    addEnvironmentMap(scene, renderer);

  addFog(scene, 0xa89ebc, 10, 100)


let healthPoints = 0; // Store health points

// Function to add special pink sphere obstacles
function addSpecialObstacles(scene, amount, area) {
    const specialObstacleGroup = new THREE.Group(); // Group for special obstacles
    specialObstacleGroup.name = "SpecialObstacleGroup"; // Name for debugging

    for (let i = 0; i < amount; i++) {
        const radius = 1.5 + Math.random() * 0; // Random size between 2 and 5
        const sphereGeometry = new THREE.SphereGeometry(radius, 32, 32);
        //const sphereMaterial = new THREE.MeshStandardMaterial({ color: 0xff69b4 }); // Pink color (Hot Pink)
        const sphereMaterial = new THREE.MeshStandardMaterial({
            color: 0xff69b4, // Pink color (Hot Pink)
            metalness: 0.8, // Adjust reflectivity
            roughness: 0.1, // Adjust surface roughness
            envMapIntensity: 1.0 // Make it more reactive to environment maps
        });


        const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
        sphere.castShadow = true;
        sphere.receiveShadow = true;

        sphere.position.x = (Math.random() - 0.5) * area;
        sphere.position.z = (Math.random() - 0.5) * area;
        sphere.position.y = radius; // Elevate to sit on the floor

        // Add bounding box for collision detection
        sphere.userData.boundingBox = new THREE.Box3().setFromObject(sphere);

        specialObstacleGroup.add(sphere);
    }

    scene.add(specialObstacleGroup);
    console.log(`${amount} special obstacles (pink spheres) added within an area of ${area} units.`);
}

addSpecialObstacles(scene, 100, 1000)






// Store active dust emitters globally
const activeDustEmitters = [];

// Create dust particle texture
function createDustParticleTexture() {
    const canvas = document.createElement('canvas');
    const size = 128;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.1)'); // White at the center
    gradient.addColorStop(1, 'rgba(250, 250, 250, 0)'); // Dark gray at the edges, fully transparent

    ctx.fillStyle = gradient;

    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
}

const dustParticleTexture = createDustParticleTexture();


function addDustEmitter(position) {
    const count = 100; // Number of dust particles
    const particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const lifetimes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
        const spreadFactor = 2.5; // Increase spread factor to make it wider
        const offsetX = (Math.random() - 0.5) * spreadFactor; // Spread along X-axis (wider)
        const offsetY = (Math.random() < 0.5) ? Math.random() * 0.2 : 0.3 + Math.random() * 0.5; // Height variation
        const offsetZ = (Math.random() - 0.5) * spreadFactor; // Spread along Z-axis (wider)

        positions[i * 3] = position.x + offsetX;
        positions[i * 3 + 1] = position.y + offsetY; // Add the height variation
        positions[i * 3 + 2] = position.z + offsetZ;

        lifetimes[i] = 500 + Math.random() * 1000; // Lifetime per particle
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute('lifetime', new THREE.BufferAttribute(lifetimes, 1));

    const material = new THREE.PointsMaterial({
        map: dustParticleTexture,
        size: 0.3,
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
    });

    const points = new THREE.Points(particleGeometry, material);
    points.userData = {
        startTime: performance.now(),
        lifetimes,
        initialPositions: positions.slice(),
    };

    scene.add(points);
    activeDustEmitters.push(points);
}


// Update dust particles' positions and opacity
function updateDustEmitters(deltaTime) {
    const currentTime = performance.now();
    for (let i = activeDustEmitters.length - 1; i >= 0; i--) {
        const points = activeDustEmitters[i];
        const geometry = points.geometry;
        const positions = geometry.getAttribute('position');
        const lifetimes = points.userData.lifetimes;
        const initialPositions = points.userData.initialPositions;

        let allParticlesDead = true;

        for (let j = 0; j < positions.count; j++) {
            const elapsedTime = currentTime - points.userData.startTime;

            if (elapsedTime < lifetimes[j]) {
                allParticlesDead = false;

                // Move particles backward and apply upward drift
                const backwardSpeed = 0.2;
                const upwardDrift = 0.02;

                const x = initialPositions[j * 3];
                const y = initialPositions[j * 3 + 1] + upwardDrift * elapsedTime * 0.001;
                const z = initialPositions[j * 3 + 2] - backwardSpeed * elapsedTime * 0.001;

                positions.setXYZ(j, x, y, z);

                // Fade out particles based on lifetime
                const fadeFactor = 1 - elapsedTime / lifetimes[j];
                points.material.opacity = fadeFactor * 0.8;
            }
        }

        positions.needsUpdate = true;

        if (allParticlesDead) {
            scene.remove(points);
            geometry.dispose();
            points.material.dispose();
            activeDustEmitters.splice(i, 1);
        }
    }
}


function emitDustIfAccelerating() {
    // Check if the car is accelerating (moving forward)
    if (vehicleVelocity.z > 0.1) {
        const backWheelOffset = new THREE.Vector3(0, 0.2, -2); // Position relative to the car’s pivot (back of the car)
        
        // Get the car’s world position and rotation
        const carWorldPosition = new THREE.Vector3();
        vehicleContainer.getWorldPosition(carWorldPosition);
        
        const carQuaternion = new THREE.Quaternion();
        vehicleContainer.getWorldQuaternion(carQuaternion);
        
        // Transform the local offset to world space based on the car's rotation
        const worldBackPosition = backWheelOffset.applyQuaternion(carQuaternion).add(carWorldPosition);
        
        // Add dust emitter at the back of the car
        addDustEmitter(worldBackPosition);
    }
}


function applyDamageToMesh(mesh, damageLevel) {
    if (!mesh.geometry.isBufferGeometry) return;

    const positionAttribute = mesh.geometry.attributes.position; // Vertex positions
    const vertexCount = positionAttribute.count; // Total vertices

    for (let i = 0; i < vertexCount; i++) {
        const randomDisplacement = (Math.random() - 0.5) * damageLevel * 0.1; // Random displacement factor
        const x = positionAttribute.getX(i) + randomDisplacement;
        const y = positionAttribute.getY(i) + randomDisplacement * 0.5;
        const z = positionAttribute.getZ(i) + randomDisplacement;

        // Apply changes to vertices
        positionAttribute.setXYZ(i, x, y, z);
    }

    positionAttribute.needsUpdate = true; // Mark as needing update
    mesh.geometry.computeVertexNormals(); // Recalculate normals for proper lighting
}




// Store damage points and collision count
let damagePoints = 0;
let collisionCount = 0;
// Track obstacles already counted for collisions
let countedCollisions = new Set();

/* Smoke */

// Store active smoke emitters globally
const activeSmokeEmitters = [];


// Create smoke particle texture using canvas
function createSmokeParticleTexture() {
    const canvas = document.createElement('canvas');
    const size = 128;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0.5)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;

    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
}

const smokeParticleTexture = createSmokeParticleTexture();

// Add a smoke particle emitter at the collision point
// Add a smoke particle emitter slightly in front of the collision point
function addSmokeEmitter(collisionPoint) {
    const count = 200; // Number of smoke particles per emitter
    const particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3); // x, y, z positions
    const lifetimes = new Float32Array(count); // Track individual particle lifetime

    // Offset to place smoke slightly forward along the Z-axis
    const offsetForward = new THREE.Vector3(0, 0.5, -1.5); // Adjust to control how far in front
    collisionPoint.add(offsetForward);

    for (let i = 0; i < count; i++) {
        const offsetX = (Math.random() - 0.5) * 2.0; // Spread along X-axis
        const offsetY = Math.random() * 1; // Slightly upward initially
        const offsetZ = (Math.random() - 0.5) * 2.0; // Spread along Z-axis

        positions[i * 3] = collisionPoint.x + offsetX;
        positions[i * 3 + 1] = collisionPoint.y + offsetY; // Raise above car
        positions[i * 3 + 2] = collisionPoint.z + offsetZ;

        lifetimes[i] = 1000 + Math.random() * 2000; // Lifetime (in ms) per particle
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute('lifetime', new THREE.BufferAttribute(lifetimes, 1));

    const material = new THREE.PointsMaterial({
        map: smokeParticleTexture,
        size: 0.5, // Size of each particle
        transparent: true,
        opacity: 0.6,
        depthWrite: false,
    });

    const points = new THREE.Points(particleGeometry, material);
    points.userData = {
        startTime: performance.now(),
        lifetimes,
        initialPositions: positions.slice(),
    };

    scene.add(points);
    activeSmokeEmitters.push(points);
}


// Update the smoke particles' positions and opacity
function updateSmokeEmitters(deltaTime) {
    const currentTime = performance.now();
    for (let i = activeSmokeEmitters.length - 1; i >= 0; i--) {
        const points = activeSmokeEmitters[i];
        const geometry = points.geometry;
        const positions = geometry.getAttribute('position');
        const lifetimes = points.userData.lifetimes;
        const initialPositions = points.userData.initialPositions;

        let allParticlesDead = true;

        for (let j = 0; j < positions.count; j++) {
            const elapsedTime = currentTime - points.userData.startTime;

            if (elapsedTime < lifetimes[j]) {
                allParticlesDead = false;

                // Move particles upward and apply random drift
                const riseSpeed = 0.1;
                const drift = 0.05;

                const x = initialPositions[j * 3] + (Math.random() - 0.5) * drift;
                const y = initialPositions[j * 3 + 1] + riseSpeed * elapsedTime * 0.001;
                const z = initialPositions[j * 3 + 2] + (Math.random() - 0.5) * drift;

                positions.setXYZ(j, x, y, z);

                // Fade out particles based on lifetime
                const fadeFactor = 1 - elapsedTime / lifetimes[j];
                points.material.opacity = fadeFactor * 0.7;
            }
        }

        positions.needsUpdate = true;

        if (allParticlesDead) {
            scene.remove(points);
            geometry.dispose();
            points.material.dispose();
            activeSmokeEmitters.splice(i, 1);
        }
    }
}


// Track if collision occurred to reset speed and prevent continuous collision
let collisionDetected = false;



// Function to check collisions
function checkCollisions() {
    const carBoundingBox = new THREE.Box3().setFromObject(vehicleContainer); // Update car bounding box
    const obstacleGroup = scene.getObjectByName("ObstacleGroup"); // Regular obstacles group
    const specialObstacleGroup = scene.getObjectByName("SpecialObstacleGroup"); // Special obstacles group (pink spheres)

    if (!obstacleGroup && !specialObstacleGroup) return;

    let hasCollided = false; // Track if collision happened this frame

    // Check regular obstacles (damage and collision count)
    obstacleGroup?.children.forEach((obstacle) => {
        const obstacleBoundingBox = obstacle.userData.boundingBox;
        if (carBoundingBox.intersectsBox(obstacleBoundingBox)) {
            console.log("Collision detected! Stopping vehicle.");
            damagePoints += 10;

            if (!collisionDetected) {
                vehicleVelocity.set(0, 0, 0); // Stop the vehicle completely
                steeringAngle = 0; // Reset the wheels to straight
                collisionDetected = true; // Prevent continuous resetting
                damagePoints += 10; // Add damage points

                // Only count a single hit if not already counted
                if (!countedCollisions.has(obstacle.uuid)) {
                    collisionCount += 1; // Increment collision count for a new collision
                    countedCollisions.add(obstacle.uuid); // Add to the counted collisions set
                    console.log(`New collision recorded with obstacle: ${obstacle.uuid}`);
                }

                // Flash only the car body (targetMesh) red for feedback
                if (targetMesh && targetMesh.material) {
                    const originalColor = targetMesh.material.color.clone(); // Save the original body color
                    targetMesh.material.color.set(0xff0000); // Flash red

                    setTimeout(() => {
                        targetMesh.material.color.copy(originalColor); // Reset to original body color
                    }, 1000); // Flash duration (1 second)
                }

                // Apply visual damage to the car body
                vehicleContainer.traverse((node) => {
                    if (node.isMesh && node.name.includes("body")) {
                        applyMeshDisplacement(node, 2); // Displace vertices for visual damage
                    }
                });

                // Smoke emitter at collision point
                const collisionPoint = vehicleContainer.position.clone();
                addSmokeEmitter(collisionPoint);

                // Ensure sound components are defined before adjustment
                if (gainNode && lowPassFilter && engineLowOscillator && engineMidOscillator && engineHighOscillator) {
                    // Set sound to indicate collision
                    engineLowOscillator.frequency.setValueAtTime(30, audioContext.currentTime); // Very low rumble
                    engineMidOscillator.frequency.setValueAtTime(60, audioContext.currentTime); // Mid hum
                    engineHighOscillator.frequency.setValueAtTime(100, audioContext.currentTime); // Muffled whine
                    lowPassFilter.frequency.setValueAtTime(200, audioContext.currentTime); // Heavily muffle sound
                    gainNode.gain.setValueAtTime(0.02, audioContext.currentTime); // Lower volume for collision

                    console.log("Collision sound effect applied.");
                } else {
                    console.warn("Audio nodes are undefined. Ensure audio context is initialized.");
                }

                // Reset collision sound after 1 second
                setTimeout(() => {
                    collisionDetected = false; // Allow future collisions
                    adjustEngineSound(enginePower); // Resume normal engine sound
                }, 1000);
            }

            hasCollided = true; // Mark that the car is colliding
        }
    });

    // Reset collisionDetected flag when car leaves the obstacle
    if (!hasCollided) {
        collisionDetected = false; // Allow for future collisions
    }

    // Remove from countedCollisions if the car is no longer colliding with the obstacle
    countedCollisions.forEach((uuid) => {
        const obstacle = obstacleGroup?.children.find((obj) => obj.uuid === uuid);
        if (obstacle && !carBoundingBox.intersectsBox(obstacle.userData.boundingBox)) {
            countedCollisions.delete(uuid); // Allow re-collision tracking if the car leaves and re-enters
        }
    });

    // Check special pink spheres (health points)
    const spheresToRemove = [];
    specialObstacleGroup?.children.forEach((sphere) => {
        const sphereBoundingBox = sphere.userData.boundingBox;
        if (carBoundingBox.intersectsBox(sphereBoundingBox)) {
            console.log("Health sphere collected!");
            healthPoints += 1; // Add health point
            spheresToRemove.push(sphere); // Mark sphere for removal
            updateUI(); // Update UI for health points
        }
    });

    // Remove collected spheres
    spheresToRemove.forEach((sphere) => {
        specialObstacleGroup.remove(sphere);
        sphere.geometry.dispose(); // Clean up memory
        sphere.material.dispose();
    });

    updateUI(); // Ensure the UI for damage and health is always updated
}




// // Function to check collisions
// function checkCollisions() {
//     const carBoundingBox = new THREE.Box3().setFromObject(vehicleContainer); // Update car bounding box
//     const obstacleGroup = scene.getObjectByName("ObstacleGroup"); // Regular obstacles group
//     const specialObstacleGroup = scene.getObjectByName("SpecialObstacleGroup"); // Special obstacles group (pink spheres)

//     if (!obstacleGroup && !specialObstacleGroup) return;

//     let hasCollided = false; // Track if collision happened this frame

//     // Check regular obstacles (damage and collision count)
//     obstacleGroup?.children.forEach((obstacle) => {
//         const obstacleBoundingBox = obstacle.userData.boundingBox;
//         if (carBoundingBox.intersectsBox(obstacleBoundingBox)) {
//             console.log("Collision detected! Stopping vehicle.");
//             damagePoints += 10;

//             if (!collisionDetected) {
//                 vehicleVelocity.set(0, 0, 0); // Stop the vehicle completely
//                 steeringAngle = 0; // Reset the wheels to straight
//                 collisionDetected = true; // Prevent continuous resetting
//                 damagePoints += 10; // Add damage points

//                 // Only count a single hit if not already counted
//                 if (!countedCollisions.has(obstacle.uuid)) {
//                     collisionCount += 1; // Increment collision count for a new collision
//                     countedCollisions.add(obstacle.uuid); // Add to the counted collisions set
//                     console.log(`New collision recorded with obstacle: ${obstacle.uuid}`);
//                 }

//                 // Flash only the car body (targetMesh) red for feedback
//                 if (targetMesh && targetMesh.material) {
//                     const originalColor = targetMesh.material.color.clone(); // Save the original body color
//                     targetMesh.material.color.set(0xff0000); // Flash red

//                     setTimeout(() => {
//                         targetMesh.material.color.copy(originalColor); // Reset to original body color
//                     }, 1000); // Flash duration (1 second)
//                 }

//                 // Apply visual damage to the car body
//                 vehicleContainer.traverse((node) => {
//                     if (node.isMesh && node.name.includes("body")) {
//                         applyMeshDisplacement(node, 2); // Displace vertices for visual damage
//                     }
//                 });

//                 // Smoke emitter at collision point
//                 const collisionPoint = vehicleContainer.position.clone();
//                 addSmokeEmitter(collisionPoint);
//             }

//             hasCollided = true; // Mark that the car is colliding
//         }
//     });

//     // Reset collisionDetected flag when car leaves the obstacle
//     if (!hasCollided) {
//         collisionDetected = false; // Allow for future collisions
//     }




//     const currentSpeed = vehicleVelocity.length();
//     adjustSoundForCollision(currentSpeed); // Adjust sound based on speed and collision

//     // Remove from countedCollisions if the car is no longer colliding with the obstacle
//     countedCollisions.forEach((uuid) => {
//         const obstacle = obstacleGroup?.children.find((obj) => obj.uuid === uuid);
//         if (obstacle && !carBoundingBox.intersectsBox(obstacle.userData.boundingBox)) {
//             countedCollisions.delete(uuid); // Allow re-collision tracking if the car leaves and re-enters
//         }
//     });

//     // Check special pink spheres (health points)
//     const spheresToRemove = [];
//     specialObstacleGroup?.children.forEach((sphere) => {
//         const sphereBoundingBox = sphere.userData.boundingBox;
//         if (carBoundingBox.intersectsBox(sphereBoundingBox)) {
//             console.log("Health sphere collected!");
//             healthPoints += 1; // Add health point
//             spheresToRemove.push(sphere); // Mark sphere for removal
//             updateUI(); // Update UI for health points
//         }
//     });

//     // Remove collected spheres
//     spheresToRemove.forEach((sphere) => {
//         specialObstacleGroup.remove(sphere);
//         sphere.geometry.dispose(); // Clean up memory
//         sphere.material.dispose();
//     });

//     updateUI(); // Ensure the UI for damage and health is always updated
// }


// Function to apply visual damage effect (displacement) and handle part removal
function applyMeshDisplacement(mesh, intensity) {
    if (!mesh.geometry.isBufferGeometry) return;

    const positionAttribute = mesh.geometry.attributes.position;
    const vertexCount = positionAttribute.count;

    // Apply random displacement to vertices
    for (let i = 0; i < vertexCount; i++) {
        const randomDirection = new THREE.Vector3(
            (Math.random() - 0.015) * intensity, // X direction
            (Math.random() - 0.015) * intensity * 0.05, // Y direction
            (Math.random() - 0.015) * intensity // Z direction
        );

        const x = positionAttribute.getX(i) + randomDirection.x * 0.002; // Subtle displacement
        const y = positionAttribute.getY(i) + randomDirection.y * 0.002;
        const z = positionAttribute.getZ(i) + randomDirection.z * 0.002;

        positionAttribute.setXYZ(i, x, y, z);
    }

    positionAttribute.needsUpdate = true;
    mesh.geometry.computeVertexNormals(); // Update normals for correct lighting

    // Handle progressive part removal based on damage intensity
    const damageThresholds = {
        20: ["merc-ch__body_black_0", "merc-ch__body_bulb red_0"],
        40: ["merc-ch__body_metallic_0", "merc-ch__body_interior plastic_0"],
        60: ["merc-ch__body_glass_0"],
        80: ["merc-ch__body_illinoisplatemerc_0", "merc-ch__body_rear bulb_0"]
    };

    // Check for part removal
    Object.entries(damageThresholds).forEach(([threshold, partsToRemove]) => {
        if (intensity >= parseInt(threshold)) {
            partsToRemove.forEach((partName) => {
                const part = vehicleContainer.getObjectByName(partName);
                if (part) {
                    console.log(`Removing part ${partName} due to damage intensity ${intensity}`);
                    vehicleContainer.remove(part); // Remove part from container
                    part.geometry.dispose(); // Free up memory
                    part.material.dispose();
                }
            });
        }
    });
}



function updateUI() {
    const damageDisplay = document.getElementById("damage");
    const collisionDisplay = document.getElementById("collisions");
    const healthDisplay = document.getElementById("health");

    if (damageDisplay) {
        damageDisplay.textContent = `Damage Points: ${damagePoints}`;
    }
    if (collisionDisplay) {
        collisionDisplay.textContent = `Collisions: ${collisionCount}`;
    }
    if (healthDisplay) {
        healthDisplay.textContent = `Health Points: ${healthPoints}`;
    }
}




// Call `checkCollisions` in the update loop
function updateScene() {
    const deltaTime = clock.getDelta();

    if (isCameraMoving) {
        updateCameraPosition(); 
    } else if (isFlying) {
        updateFlyCam();
    } else if (isCameraFollowingCar) {
        updateCameraFollow(deltaTime);
    } else {
        controls.update();
    }

    updateVehicleMovement(deltaTime);
    updateSandstorm();
    updateFloorPosition();
    checkCollisions(); // Check for collisions in each frame

    renderer.render(scene, camera);
}



  addObstacles(scene, 200, 500);


  const directionalLight = new THREE.DirectionalLight(0xffdd99, 1);
  directionalLight.position.set(10, 20, 10);
  directionalLight.castShadow = true;
  scene.add(directionalLight);

  const ambientLight = new THREE.AmbientLight(0xffd59e, 0.4); // Light peach ambient light
  scene.add(ambientLight);


    generateSandstorm(scene, 60000, 40);






    /* Loading model */

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


// Wheel names for reference (actual node names)
const wheelMappings = {
    frontRight: "merc-ch__wheel1_tyre_0", // Front right wheel
    frontLeft: "merc-ch__wheel1_tyre_0001", // Front left wheel
    backRight: "merc-ch__wheel1_tyre_0002", // Back right wheel
    backLeft: "merc-ch__wheel1_tyre_0003" // Back left wheel
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

// Function to get references to wheel nodes once everything is loaded
function getWheelNodes() {
    wheels.frontRight = scene.getObjectByName(wheelMappings.frontRight);
    wheels.frontLeft = scene.getObjectByName(wheelMappings.frontLeft);
    wheels.backRight = scene.getObjectByName(wheelMappings.backRight);
    wheels.backLeft = scene.getObjectByName(wheelMappings.backLeft);

    Object.entries(wheels).forEach(([key, wheel]) => {
        if (!wheel) {
            console.warn(`Warning: Wheel "${key}" not found in the scene.`);
        } else {
            console.log(`Wheel "${key}" successfully loaded: ${wheel.name}`);
        }
    });
}

// Call this after all models are loaded
setTimeout(getWheelNodes, 1000); // Delay to ensure all GLB files are loaded


// Velocity for vehicle movement and rotation
const vehicleVelocity = new THREE.Vector3(0, 0, 0);
let steeringAngle = 0; // Current steering angle
let maxSteeringAngle = Math.PI / 8; // Max steering angle (radians)
let steeringSpeed = Math.PI / 32; // Steering speed per frame

// Track key presses
const keysPressed = {
    ArrowUp: false, // Forward
    ArrowDown: false, // Backward
    ArrowLeft: false, // Turn left
    ArrowRight: false, // Turn right
    b: false // Brake key
};

document.addEventListener('keydown', (event) => {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) {
        if (!isCameraFollowingCar) {
            isCameraFollowingCar = true; // Enable follow mode
            const carWorldPosition = new THREE.Vector3();
            vehicleContainer.getWorldPosition(carWorldPosition);
            initialFollowOffset.copy(camera.position).sub(carWorldPosition); // Set follow offset
            console.log("Follow mode ON: activated due to arrow key press.");
            controls.enabled = false; // Disable OrbitControls during follow mode
            updateFollowButtonStyle(); // Update the follow button to indicate follow mode is on
        }
    }

    // Handle specific arrow keys for vehicle movement
    if (event.key === 'ArrowUp') keysPressed.ArrowUp = true;
    if (event.key === 'ArrowDown') keysPressed.ArrowDown = true;
    if (event.key === 'ArrowLeft') keysPressed.ArrowLeft = true;
    if (event.key === 'ArrowRight') keysPressed.ArrowRight = true;
    if (event.key.toLowerCase() === 'b') keysPressed.b = true; // Brake key
});

document.addEventListener('keyup', (event) => {
    // Handle key release for movement
    if (event.key === 'ArrowUp') keysPressed.ArrowUp = false;
    if (event.key === 'ArrowDown') keysPressed.ArrowDown = false;
    if (event.key === 'ArrowLeft') keysPressed.ArrowLeft = false;
    if (event.key === 'ArrowRight') keysPressed.ArrowRight = false;
    if (event.key.toLowerCase() === 'b') keysPressed.b = false; // Release brake key
});


//isThrottlePressed



// Updated movement constants for a more balanced steering feel
let acceleration = 8.0;
let maxSpeed = 90.0 / 3.6; // Convert to m/s
let deceleration = 3;
let brakeForce = 15.0;

const myspeedometer = document.getElementById("myspeed");

const wheelRadius = 0.5; // Wheel radius in meters
const wheelCircumference = 2 * Math.PI * wheelRadius;

function updateVehicleMovement(deltaTime) {
    if (keysPressed.ArrowUp) {
        vehicleVelocity.z += acceleration * deltaTime;
        if (vehicleVelocity.z > maxSpeed) vehicleVelocity.z = maxSpeed;
    }

    if (keysPressed.ArrowDown) {
        vehicleVelocity.z -= acceleration * deltaTime;
        if (vehicleVelocity.z < -maxSpeed / 2) vehicleVelocity.z = -maxSpeed / 2; // Limit reverse speed
    }

    if (keysPressed.b) {
        if (vehicleVelocity.z > 0) {
            vehicleVelocity.z -= brakeForce * deltaTime;
            if (vehicleVelocity.z < 0) vehicleVelocity.z = 0;
        }
    } else if (!keysPressed.ArrowUp && !keysPressed.ArrowDown) {
        if (vehicleVelocity.z > 0) vehicleVelocity.z -= deceleration * deltaTime;
        if (vehicleVelocity.z < 0) vehicleVelocity.z += deceleration * deltaTime;
        if (Math.abs(vehicleVelocity.z) < 0.01) vehicleVelocity.z = 0;
    }

    const speed = Math.abs(vehicleVelocity.z);
    const speedRatio = speed / maxSpeed;

    // New steering logic: responsive at low speeds, gradual restriction at higher speeds
    const minSteeringAngle = Math.PI / 18; // ~10 degrees at high speeds
    const maxSteeringAngle = Math.PI / 2;  // ~36 degrees at low speeds
    const dynamicSteeringAngle = THREE.MathUtils.lerp(maxSteeringAngle, minSteeringAngle, Math.sqrt(speedRatio)); // Smoother transition

    if (keysPressed.ArrowLeft) {
        steeringAngle -= steeringSpeed * deltaTime;
        if (steeringAngle < -dynamicSteeringAngle) steeringAngle = -dynamicSteeringAngle;
    } else if (keysPressed.ArrowRight) {
        steeringAngle += steeringSpeed * deltaTime;
        if (steeringAngle > dynamicSteeringAngle) steeringAngle = dynamicSteeringAngle;
    } else {
        if (steeringAngle > 0) steeringAngle -= steeringSpeed * deltaTime * 0.5; // Gradually reset to center
        if (steeringAngle < 0) steeringAngle += steeringSpeed * deltaTime * 0.5;
        if (Math.abs(steeringAngle) < 0.01) steeringAngle = 0;
    }


    if (wheels.frontLeft) {
        wheels.frontLeft.rotation.order = "YXZ"; // Apply Y-axis (steering) first
        wheels.frontLeft.rotation.y = -steeringAngle;
    }
    if (wheels.frontRight) {
        wheels.frontRight.rotation.order = "YXZ"; // Apply Y-axis (steering) first
        wheels.frontRight.rotation.y = -steeringAngle;
    }



    // Handle vehicle rotation only when there's movement
    if (steeringAngle !== 0 && speed > 0.1) {
        const turnRadius = Math.max(3, wheelRadius / Math.sin(Math.abs(steeringAngle))); // Prevent tiny radii
        const angularVelocity = vehicleVelocity.z / turnRadius;

        // Gradually reduce rotation effect based on speed
        const rotationFactor = 1 - Math.min(0.8, speed / (maxSpeed / 2)); // Reduce turning power at high speed
        vehicleContainer.rotation.y += (steeringAngle > 0 ? -1 : 1) * angularVelocity * deltaTime * rotationFactor;
    }

    vehicleContainer.translateZ(vehicleVelocity.z * deltaTime);

    const speedInKmH = speed * 3.6;
    myspeedometer.innerHTML = `${speedInKmH.toFixed(2)} km/h`;

    rotateWheels(deltaTime);
}

function rotateWheels(deltaTime) {
    const distanceTraveled = Math.abs(vehicleVelocity.z * deltaTime);
    const rotationAmount = (distanceTraveled / wheelCircumference) * (2 * Math.PI);

    Object.entries(wheels).forEach(([key, wheel]) => {
        if (wheel) {
            wheel.rotation.x += vehicleVelocity.z > 0 ? rotationAmount : -rotationAmount;
        }
    });
}






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
            disableFlying(); // Disable flying mode when using button
            if (isCameraFollowingCar) {
                isCameraFollowingCar = false; // Disable follow mode
                console.log("Follow mode disabled due to camera button click.");
            }

            if (!isCameraMoving) {
                const vehiclePosition = new THREE.Vector3();
                vehicleContainer.getWorldPosition(vehiclePosition); // Get the vehicle's world position

                const vehicleQuaternion = new THREE.Quaternion();
                vehicleContainer.getWorldQuaternion(vehicleQuaternion); // Get vehicle orientation

                // Convert relative position to world coordinates based on vehicle's rotation
                const relativePosition = new THREE.Vector3(
                    positions[key].x,
                    positions[key].y,
                    positions[key].z
                );

                relativePosition.applyQuaternion(vehicleQuaternion); // Rotate the relative offset by vehicle orientation

                initialCameraPosition = camera.position.clone(); // Store the current camera position
                targetCameraPosition = vehiclePosition.clone().add(relativePosition); // Offset by vehicle position and orientation
                transitionProgress = 0;
                isCameraMoving = true;
                controls.enabled = false; // Disable OrbitControls temporarily
                controls.enableDamping = false;
            }
        };

        buttonContainer.appendChild(btn); // Add button to container
    });
};


createButtons(positions);


const toggleFlying = () => {
    const vehiclePosition = new THREE.Vector3();
    vehicleContainer.getWorldPosition(vehiclePosition); // Get the current vehicle position

    if (!isFlying) {
        // Prepare for starting flying around the car
        center.copy(vehiclePosition); // Set the center point to the vehicle's current position
        const dx = camera.position.x - center.x;
        const dz = camera.position.z - center.z;
        orbitAngle = Math.atan2(dz, dx); // Use current angle relative to the center
        currentDistance = camera.position.distanceTo(center); // Use current distance
        isFlying = true;
        console.log("Flycam started around the vehicle.");
    } else {
        // Stop flying smoothly
        isFlying = false;
        console.log("Flycam stopped.");
    }
};

const updateFlyCam = () => {
    if (isFlying) {
        const vehiclePosition = new THREE.Vector3();
        vehicleContainer.getWorldPosition(vehiclePosition); // Continuously get the vehicle's current position
        center.copy(vehiclePosition); // Update the center position to follow the car

        orbitAngle += flySpeed; // Increment the orbit angle
        const height = camera.position.y - center.y; // Maintain current height relative to the center
        const x = center.x + currentDistance * Math.cos(orbitAngle); // X position in orbit
        const z = center.z + currentDistance * Math.sin(orbitAngle); // Z position in orbit

        camera.position.set(x, center.y + height, z); // Update camera position in orbit
        camera.lookAt(center); // Keep looking at the vehicle
    }
};

const disableFlying = () => {
    if (isFlying) {
        isFlying = false;
        console.log("Flycam disabled due to manual interaction.");
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
        t = easingFunction(t); // Apply easing
        const interpolatedPosition = initialCameraPosition.clone().lerp(targetCameraPosition, t);
        camera.position.copy(interpolatedPosition);
        camera.lookAt(controls.target);

        if (t === 1) {
            isCameraMoving = false;
            controls.enabled = true; // Re-enable manual controls
            controls.enableDamping = true;
            controls.update();
        }
    }
};


// Follow car variables
let isCameraFollowingCar = false;
let followModeLastCameraPosition = new THREE.Vector3();    // store camera position
let followModeLastCameraQuaternion = new THREE.Quaternion(); // store camera rotation
let initialFollowOffset = new THREE.Vector3();             // offset between camera & car when follow starts
const cameraLookAtOffset = new THREE.Vector3(0, 0, 0);    // where camera aims above the car

document.addEventListener('keydown', (event) => {
    if (event.key === 'f') {
        isCameraFollowingCar = !isCameraFollowingCar;

        if (isCameraFollowingCar) {
            const carWorldPosition = new THREE.Vector3();
            vehicleContainer.getWorldPosition(carWorldPosition);
            initialFollowOffset.copy(camera.position).sub(carWorldPosition);
            console.log("Follow mode ON: computed offset from car.");
            controls.enabled = false; // Disable direct manual control
        } else {
            console.log("Follow mode OFF: Orbit control re-enabled.");
            controls.enabled = true; // Re-enable manual control
        }
    }
});


// Get the Follow button element
const followButton = document.getElementById('follow');

const updateFollowButtonStyle = () => {
    if (isCameraFollowingCar) {
        followButton.style.backgroundColor = "#ffffff"; // Green for ON
        followButton.style.color = "black"; // White text when active
    } else {
        followButton.style.backgroundColor = "#ffffff50"; // Grey for OFF
        followButton.style.color = "white"; // Black text when inactive
    }
};

// Add event listener to the Follow button
followButton.addEventListener('click', () => {
    isCameraFollowingCar = !isCameraFollowingCar;

    if (isCameraFollowingCar) {
        const carWorldPosition = new THREE.Vector3();
        vehicleContainer.getWorldPosition(carWorldPosition);
        initialFollowOffset.copy(camera.position).sub(carWorldPosition);
        console.log("Follow mode ON: computed offset from car.");
        controls.enabled = false; // Disable direct manual control
    } else {
        console.log("Follow mode OFF: Orbit control re-enabled.");
        controls.enabled = true; // Re-enable manual control
    }

    updateFollowButtonStyle(); // Update the button style based on the state
});

// Update the button's style initially
updateFollowButtonStyle();



function updateCameraFollow(deltaTime) {
    if (isCameraFollowingCar && !isCameraMoving && !isFlying) {
        const carWorldPos = new THREE.Vector3();
        vehicleContainer.getWorldPosition(carWorldPos);

        // Update OrbitControls target to track the car's position
        controls.target.copy(carWorldPos);

        // Maintain the relative offset
        const relativeOffset = initialFollowOffset.clone();
        const carRotation = new THREE.Quaternion();
        vehicleContainer.getWorldQuaternion(carRotation);

        // Apply car rotation to the offset
        relativeOffset.applyQuaternion(carRotation);

        // Adjust follow distance based on speed, with a clamped maximum value
        const speed = vehicleVelocity.length();
        const distanceAdjustment = Math.min(speed * 0.2, 2); // Max extra distance is 5 units
        const adjustedOffset = new THREE.Vector3(relativeOffset.x, relativeOffset.y, relativeOffset.z - distanceAdjustment);

        // Calculate the target camera position
        const targetPosition = carWorldPos.clone().add(adjustedOffset);

        // Smooth interpolation for the camera position
        const lerpFactor = Math.min(0.1, deltaTime * 2); // Smooth and responsive
        camera.position.lerp(targetPosition, lerpFactor);

        // Maintain focus on the car with a slight upward look
        const lookAtOffset = new THREE.Vector3(0, 1.5, 0); // Raise the look target above the car
        const lookAtPosition = carWorldPos.clone().add(lookAtOffset);
        camera.lookAt(lookAtPosition);

        controls.update(); // Ensure controls stay updated
    } else {
        // === FOLLOW MODE OFF ===
        controls.target.copy(controls.target);
        controls.enabled = true; // Re-enable manual orbit control
        controls.update();
    }
}



    const clock = new THREE.Clock();

    function updateScene() {
        const deltaTime = clock.getDelta();

        // Priority of modes
        if (isCameraMoving) {
            updateCameraPosition();  // your existing transition code
        } else if (isFlying) {
            updateFlyCam();
        } else if (isCameraFollowingCar) {
            updateCameraFollow(deltaTime);
        } else {
            controls.update();
        }

        updateVehicleMovement(deltaTime);
        updateSmokeEmitters(deltaTime);

        emitDustIfAccelerating();  
        updateDustEmitters(deltaTime);

        updateSandstorm();
        updateFloorPosition();
        checkCollisions();

        updateEngine(deltaTime);

        renderer.render(scene, camera);
    }


    
    const flyCamBtn = document.getElementById("flycam");
    flyCamBtn.onclick = () => toggleFlying();
    
    window.addEventListener("resize", () => {
        renderer.setSize(container.clientWidth, container.clientHeight);
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
    });

    renderer.setAnimationLoop(() => {
        updateScene();
    });
    
    controls.addEventListener("start", disableFlying); 


}

