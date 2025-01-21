/*

  Author: sylwester@workwork.fun
  Date: Jan 2025

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

let devMode = 'local'
//let devMode = 'cms'


// Here is ThreeJS bundle in chunks
// List of chunk scripts to load in sequence
const chunkScriptsCMS = [
  "https://play2.s3.amazonaws.com/assets/BHGpznMRpI.js",
  "https://play2.s3.amazonaws.com/assets/4UwrxTsVIp.js",
  "https://play2.s3.amazonaws.com/assets/3V_WmerJG0.js",
  "https://play2.s3.amazonaws.com/assets/PVnIgHFgXf.js",
  "https://play2.s3.amazonaws.com/assets/IE1aOqWWt.js",
  "https://play2.s3.amazonaws.com/assets/bJ_B6pBwF.js",
  "https://play2.s3.amazonaws.com/assets/iEV-Cqocn.js"
];

const chunkScriptsLocal = [
  "dist/runtime.js",
  "dist/vendors-eaa1e0b2.js",
  "dist/vendors-121455fa.js",
  "dist/vendors-fa926fcc.js",
  "dist/vendors-19c8c233.js",
  "dist/vendors-159b8fc4.js",
  "dist/main.js"
];

// Add check to prevent redeclaration
// Directly initialize without any redundant checks
const chunkScriptsArray = devMode === 'cms' ? chunkScriptsCMS : chunkScriptsLocal;

function loadScriptsSequentially(scripts, callback) {
  const head = document.head;

  function loadScript(index) {
    if (index >= scripts.length) {
      if (callback) callback();  // All scripts loaded, call main()
      return;
    }

    const script = document.createElement('script');
    script.src = scripts[index];
    script.defer = true;
    script.onload = () => loadScript(index + 1);  // Load the next script after the current one finishes
    script.onerror = () => console.error(`Failed to load script: ${scripts[index]}`);
    head.appendChild(script);
  }

  loadScript(0);  // Start loading from the first script
}

// Call to load scripts
loadScriptsSequentially(chunkScriptsArray, main);




// document.getElementById('fullscreen').addEventListener('click', () => {
//   const appElement = document.getElementById('app');

//   if (appElement.requestFullscreen) {
//     appElement.requestFullscreen();
//   } else if (appElement.webkitRequestFullscreen) {
//     appElement.webkitRequestFullscreen();  // Safari
//   } else if (appElement.mozRequestFullScreen) {
//     appElement.mozRequestFullScreen();  // Firefox
//   } else if (appElement.msRequestFullscreen) {
//     appElement.msRequestFullscreen();  // IE/Edge
//   } else {
//     console.error('Fullscreen API is not supported by this browser.');
//   }
// });

// document.addEventListener('fullscreenchange', () => {
//   if (!document.fullscreenElement) {
//     console.log('Exited fullscreen mode');
//   }
// });


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




function addFog(scene, color = 0xffffff, near = 0.1, far = 50) {
  // Add linear fog to the scene
  scene.fog = new THREE.Fog(color, near, far);
  // Optionally, set the background color to match the fog
  scene.background = new THREE.Color(color);
}

function addHemisphereLight(scene) {
  // Create a HemisphereLight
  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 3); // Sky color, ground color, intensity
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

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.shadowMap.enabled = true;
  renderer.xr.enabled = true;
  container.appendChild(renderer.domElement);




  /* Orbit Controls */

  const controls = new window.OrbitControls(camera, renderer.domElement);

  // controls.enableDamping = true;
  // controls.dampingFactor = 0.05;

  // Prevent camera from moving below the ground
  controls.minPolarAngle = 0; // Looking straight forward
  controls.maxPolarAngle = (Math.PI / 2) - 0.1; // Limit to prevent looking below the horizon

  // Limit zoom or distance
  controls.minDistance = 0.2; // Minimum distance the camera can be to the target
  controls.maxDistance = 10; // Maximum distance the camera can be from the target

  // Function to disable follow mode when user interacts with the orbit controls
  // controls.addEventListener("start", () => {
  //     console.log("orbit camera - start")
  // });

  // controls.addEventListener("end", () => {
  //     console.log("orbit camera - end")

  //  const cameraAndControlsState = {
  //       cameraPosition: {
  //           x: camera.position.x,
  //           y: camera.position.y,
  //           z: camera.position.z
  //       },
  //       orbitTarget: {
  //           x: controls.target.x,
  //           y: controls.target.y,
  //           z: controls.target.z
  //       },
  //       zoom: camera.zoom,  // if using perspective zoom
  //       fov: camera.fov     // Field of View
  //   };

  //   console.log("Captured camera and controls settings:", cameraAndControlsState);

  // });



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
    map.repeat.set(3, 3);
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
    displacementScale: 3,
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
      floorTile.position.set(x * FLOOR_SIZE, -2, z * FLOOR_SIZE);
      floorTile.receiveShadow = true;
      scene.add(floorTile);
      floorTiles.push(floorTile);
    }
  }



  addHemisphereLight(scene);

  addEnvironmentMap(scene, renderer);

  addFog(scene, 0xa89ebc, 10, 100)

  // Create a parent container for the vehicle
  const vehicleContainer = new THREE.Group(); // Parent container for all car parts
  vehicleContainer.name = "VehicleContainer"; // Optional: Name for debugging
  scene.add(vehicleContainer); // Add container to the scene

  vehicleContainer.position.set(0, 0.5, 0)



  // Array to store all clones for rotation
  const clonesArray = [];

  function cloneModel(clones = 10, spreadRadius = 5, minDistance = 2) {
    if (!stickLoaded || !vehicleContainer.children.length) {
      console.error("No model loaded to clone.");
      return;
    }

    const originalModel = vehicleContainer.children[0];
    const clonePositions = [];

    for (let i = 0; i < clones; i++) {
      let positionValid = false;
      let newPosition;

      for (let attempts = 0; attempts < 50; attempts++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * spreadRadius;
        const heightOffset = Math.random() * 4;

        newPosition = new THREE.Vector3(
          Math.cos(angle) * distance,
          0.5 + heightOffset,
          Math.sin(angle) * distance
        );

        if (clonePositions.every((pos) => pos.distanceTo(newPosition) > minDistance)) {
          positionValid = true;
          break;
        }
      }

      if (!positionValid) {
        console.warn(`Could not place clone ${i + 1} without overlap.`);
        continue;
      }

      const cloneGroup = new THREE.Group();
      const clone = originalModel.clone();

      clone.traverse((node) => {
        if (node.isMesh) {
          node.geometry.center();
          node.material = node.material.clone();
        }
      });

      cloneGroup.add(clone);
      cloneGroup.position.copy(newPosition);

      // Add unique initial rotations and speeds
      
      cloneGroup.userData = {
        rotationOffset: new THREE.Vector3(
          Math.random() * Math.PI * 2, // Full 360° random offset for X
          Math.random() * Math.PI * -2, // Full 360° random offset for Y
          Math.random() * Math.PI * -1.2  // Full 360° random offset for Z
        ),
        rotationSpeedMultiplier: new THREE.Vector3(
          0.2 + Math.random() * 2.0 * (Math.random() < 0.5 ? 0.2 : 1.0), // Some clones rotate slower in X
          0.1 + Math.random() * 1.8 * (Math.random() < 0.7 ? 0.5 : 1.2), // Introduce more bias in Y-axis rotation
          0.3 + Math.random() * 1.5 * (Math.random() < 0.3 ? 1.5 : 0.8)  // Some Z rotations spin faster
        )
      };


      scene.add(cloneGroup);
      clonesArray.push(cloneGroup);
    }

    console.log(`${clonePositions.length} clones placed without overlaps.`);
  }

  function rotateClones(timeDelta) {
    const baseSpeed = 0.13; // Base speed for all axes

    clonesArray.forEach((cloneGroup) => {
      const { rotationSpeedMultiplier } = cloneGroup.userData;

      // Increment rotation values smoothly
      cloneGroup.rotation.x += timeDelta * baseSpeed * rotationSpeedMultiplier.x;
      cloneGroup.rotation.y += timeDelta * baseSpeed * rotationSpeedMultiplier.y;
      cloneGroup.rotation.z += timeDelta * baseSpeed * rotationSpeedMultiplier.z;
    });
  }




  /* Loading model */

  const glbFiles = {
    "stick_1": "https://play2.s3.amazonaws.com/assets/ySVF-0mjI.glb",
    "logo_1": "https://play2.s3.amazonaws.com/assets/kArrRDksB.glb"
  }

  const glbFilesLocal = {
    "stick_1": "models/sorbet-stick-new3.glb",
    "logo_1": "models/hd-logo2.glb"
  }


  let stickLoaded = false;


  // Select the correct set of GLB files based on devMode
  const glbFilesArray = devMode === 'cms' ? glbFiles : glbFilesLocal;


  // Object.entries(glbFilesArray).forEach(([modelName, modelUrl]) => {
  //   gltfLoader.load(
  //     modelUrl,
  //     (gltf) => {
  //       const model = gltf.scene;
  //       model.traverse((node) => {
  //         if (node.isMesh) {
  //           node.castShadow = true;
  //         }
  //       });

  //       // Add the model to the container
  //       vehicleContainer.add(model);
  //       console.log(`Added ${modelName} to vehicle container`);

  //       // Set the flag to indicate that the model is loaded
  //       stickLoaded = true;

  //       // Now that the model is loaded, clone it
  //       cloneModel(1500, 60); // Clone after the model is loaded
  //     },
  //     undefined,
  //     (error) => {
  //       console.error(`Failed to load model ${modelUrl}:`, error);
  //     }
  //   );
  // });


Object.entries(glbFilesArray).forEach(([modelName, modelUrl]) => {
  gltfLoader.load(
    modelUrl,
    (gltf) => {
      const model = gltf.scene;
      model.traverse((node) => {
        if (node.isMesh) {
          node.castShadow = true;
        }
      });

      if (modelName === "logo_1") {
        
        // Place the logo in the center of the scene (without cloning)
        model.position.set(0, 0, 0);  // Centered at Y = 1.5 for visibility
        
        model.scale.set(4, 4, 4); // Optional: Adjust logo scale
        
        model.rotation.x = -Math.PI / 2;  //


        scene.add(model);               // Add logo directly to the scene (not vehicleContainer)
        console.log(`Added ${modelName} to scene as the logo.`);
      } else if (modelName === "stick_1") {
        // Add the stick model and enable cloning
        vehicleContainer.add(model);    // Add the original stick to the container
        stickLoaded = true;             // Set flag to true
        console.log(`Added ${modelName} to vehicle container`);

        // Clone the stick model
        cloneModel(1500, 60);  // Clone the stick model
      }
    },
    undefined,
    (error) => {
      console.error(`Failed to load model ${modelUrl}:`, error);
    }
  );
});






  //  // Easing functions
  //   const easeInOutQuad = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  //   // const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
  //   // const easeInOutCubic = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  //   // Choose easing function

  //   const easingFunction = easeInOutQuad; // Change this to `easeOutCubic` or `easeInOutCubic` for different effects
  //   /* Camera Positions */
  //   const positions = {
  //       front: { x: 0, y: 1.3, z: 5, label: "Front" },
  //       back: { x: 0, y: 2, z: -5, label: "Back" },
  //       left: { x: -5, y: 2, z: 0, label: "Left" },
  //       right: { x: 5, y: 2, z: 0, label: "Right" },
  //       top: { x: 0.1, y: 5, z: 0.1, label: "Top" },
  //       inside: { x: 0.2, y: 1.1, z: 0.1, label: "Inside" }
  //   };

  //   let isCameraFollowingCar = false;

  //   let targetCameraPosition = null;
  //   let initialCameraPosition = null;
  //   let transitionProgress = 0;
  //   const transitionSpeed = 0.025;

  // let isCameraMoving = false;
  // let isFlying = false; // FLYCAM toggle
  // let orbitAngle = 0;
  // const flySpeed = 0.01; // Speed of FLYCAM orbiting
  // const center = new THREE.Vector3(0, 0, 0); // The center the camera looks at




  // const toggleFlying = () => {
  //   const vehiclePosition = new THREE.Vector3();
  //   vehicleContainer.getWorldPosition(vehiclePosition); // Get the current vehicle position

  //   if (!isFlying) {
  //     // Prepare for starting flying around the car
  //     center.copy(vehiclePosition); // Set the center point to the vehicle's current position
  //     const dx = camera.position.x - center.x;
  //     const dz = camera.position.z - center.z;
  //     orbitAngle = Math.atan2(dz, dx); // Use current angle relative to the center
  //     currentDistance = camera.position.distanceTo(center); // Use current distance
  //     isFlying = true;
  //     console.log("Flycam started around the vehicle.");
  //   } else {
  //     // Stop flying smoothly
  //     isFlying = false;
  //     console.log("Flycam stopped.");
  //   }
  // };

  // const updateFlyCam = () => {
  //   if (isFlying) {
  //     const vehiclePosition = new THREE.Vector3();
  //     vehicleContainer.getWorldPosition(vehiclePosition); // Continuously get the vehicle's current position
  //     center.copy(vehiclePosition); // Update the center position to follow the car

  //     orbitAngle += flySpeed; // Increment the orbit angle
  //     const height = camera.position.y - center.y; // Maintain current height relative to the center
  //     const x = center.x + currentDistance * Math.cos(orbitAngle); // X position in orbit
  //     const z = center.z + currentDistance * Math.sin(orbitAngle); // Z position in orbit

  //     camera.position.set(x, center.y + height, z); // Update camera position in orbit
  //     camera.lookAt(center); // Keep looking at the vehicle
  //   }
  // };

  // const disableFlying = () => {
  //   if (isFlying) {
  //     isFlying = false;
  //     console.log("Flycam disabled due to manual interaction.");
  //     controls.enabled = true; // Re-enable OrbitControls
  //   }
  // };

  // /* Colour Picker */
  // // Reference to the button
  // const colorPickerButton = document.getElementById('colorpick');
  // // Attach the event listener to the button
  // colorPickerButton.addEventListener('click', () => {
  //   openColorPicker(); // Open color picker when button is clicked
  // });
  // // Native color picker function
  // function openColorPicker() {
  //   const colorInput = document.createElement('input');
  //   colorInput.type = 'color'; // Create color picker input
  //   colorInput.style.position = 'absolute';
  //   colorInput.style.opacity = 0; // Hide the element visually
  //   document.body.appendChild(colorInput);
  //   // Listen for the color change event
  //   colorInput.addEventListener('input', (event) => {
  //     const selectedColor = event.target.value;
  //     if (targetMesh && targetMesh.material) {
  //       targetMesh.material.color.set(selectedColor); // Update mesh color
  //       console.log(`Applied color: ${selectedColor}`);
  //     }
  //   });
  //   // Automatically trigger the color picker
  //   colorInput.click();
  //   // Remove the input element after use
  //   colorInput.addEventListener('change', () => {
  //     document.body.removeChild(colorInput);
  //   });
  // }


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



  // generateSandstorm(scene, 10000, 40);
  // generateSnow(scene, 30000, 10);
  //  addObstacles(scene, 100, 100)



  let savedState =

  {
    "cameraPosition": {
      "x": -0.07792187246103734,
      "y": 0.6234335151536547,
      "z": -0.612917822064331
    },
    "orbitTarget": {
      "x": -0.008210920944935174,
      "y": 0.5486348170628462,
      "z": 0.12930771363775723
    },
    "zoom": 1,
    "fov": 75
  }

  // camera.position.set(0.2, 0.5, -0.2);

  camera.position.set(savedState.cameraPosition.x, savedState.cameraPosition.y, savedState.cameraPosition.z);
  controls.target.set(savedState.orbitTarget.x, savedState.orbitTarget.y, savedState.orbitTarget.z);
  camera.fov = savedState.fov || camera.fov;
  camera.updateProjectionMatrix();


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

  // const customXRButton = document.getElementById('entervr');
  // customXRButton.addEventListener('click', () => {
  //   navigator.xr.requestSession('immersive-vr', sessionInit).then((session) => {
  //     renderer.xr.setSession(session);
  //     console.log('XR Session started with hand-tracking and floor features.');
  //   }).catch((error) => {
  //     console.error('Failed to start XR session:', error);
  //   });
  // });

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




/* Fly around */

let isOrbitingAroundVehicle = true; // Toggle for vehicle orbit mode
let orbitAroundRadius = 3; // Initial distance from the vehicle (increased to avoid close fly-through)
let orbitAroundHeight = 1.25; // Initial height of the orbit
let orbitAroundSpeed = 0.2; // Speed of orbit
let minHeightAboveVehicle = 0.5; // Minimum height to avoid colliding with the ice cream

// New variables for dynamic changes
let minOrbitRadius = 5; // Minimum orbit distance (safe distance from the model)
let maxOrbitRadius = 15; // Maximum orbit distance
let heightVariationSpeed = 0.1; // Speed of height change
let radiusOscillationSpeed = 0.2; // Speed of radius change

// Toggle function for orbit-around mode
function toggleOrbitAroundVehicle() {
  isOrbitingAroundVehicle = !isOrbitingAroundVehicle;

  if (isOrbitingAroundVehicle) {
    controls.enabled = false; // Disable manual controls during orbit
    console.log("Vehicle orbit mode enabled.");
  } else {
    controls.enabled = true; // Re-enable manual controls when orbit stops
    console.log("Vehicle orbit mode disabled.");
    controls.update();
  }
}

// Event listener to toggle orbit-around with "O" key
document.addEventListener('keydown', (event) => {
  if (event.key.toLowerCase() === 'o') { // Press "O" to toggle orbit mode
    toggleOrbitAroundVehicle();
  }
});

// Function to update orbiting around the vehicle
function updateOrbitAroundVehicle(time) {
  if (isOrbitingAroundVehicle && stickLoaded) {
    const vehiclePosition = new THREE.Vector3();
    vehicleContainer.getWorldPosition(vehiclePosition);

    // Oscillate radius and height over time for a dynamic orbit effect
    const oscillatedRadius =
      THREE.MathUtils.clamp(
        orbitAroundRadius + (Math.sin(time * radiusOscillationSpeed) * (maxOrbitRadius - minOrbitRadius)) / 2,
        minOrbitRadius,
        maxOrbitRadius
      );

    const oscillatedHeight =
      Math.max(
        orbitAroundHeight + Math.sin(time * heightVariationSpeed) * 0.3,
        minHeightAboveVehicle // Prevent dipping below the ice cream
      );

    const x = vehiclePosition.x + oscillatedRadius * Math.cos(time * orbitAroundSpeed);
    const z = vehiclePosition.z + oscillatedRadius * Math.sin(time * orbitAroundSpeed);

    // Ensure safe orbit height to prevent intersection
    const y = vehiclePosition.y + oscillatedHeight;

    camera.position.set(x, y, z);

    // Look ahead by offsetting the target slightly in the orbit direction
    const lookAheadX = vehiclePosition.x + 0.2 * Math.cos(time * orbitAroundSpeed + 0.1);
    const lookAheadZ = vehiclePosition.z + 0.2 * Math.sin(time * orbitAroundSpeed + 0.1);
    camera.lookAt(lookAheadX, vehiclePosition.y + 0.5, lookAheadZ);
  }
}

let previousTime = performance.now();
let accumulatedDelta = 0;

function updateScene() {
  const currentTime = performance.now();
  let deltaTime = (currentTime - previousTime) / 1000; // Convert ms to seconds

  // Ignore frames with near-zero time deltas
  if (deltaTime < 0.0001) deltaTime = 0.016; // Assume ~60 FPS (1/60 seconds)

  // Smooth out jumps
  deltaTime = Math.min(deltaTime, 0.033); // Cap at ~1/30th of a second (to avoid large jumps)
  accumulatedDelta += deltaTime; // Accumulate for consistent updates

  previousTime = currentTime;

  updateOrbitAroundVehicle(accumulatedDelta); // Use accumulatedDelta for smoother movement
  updateSandstorm(); // Update visual effects
  updateSnowfall();
  rotateClones(deltaTime); // Smooth rotation

  renderer.render(scene, camera);
}

window.addEventListener("resize", () => {
  renderer.setSize(container.clientWidth, container.clientHeight);
  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix();
});

renderer.setAnimationLoop(() => {
  updateScene();
});







  // /* Fly around */

  // let isOrbitingAroundVehicle = true; // Toggle for vehicle orbit mode
  // let orbitAroundRadius = 0.6; // Initial distance from the vehicle
  // let orbitAroundHeight = 0.25; // Initial height of the orbit
  // let orbitAroundSpeed = 0.4; // Speed of orbit

  // // New variables for dynamic changes
  // let minOrbitRadius = 3; // Minimum orbit distance
  // let maxOrbitRadius = 10; // Maximum orbit distance
  // let heightVariationSpeed = 0.1; // Speed of height change
  // let radiusOscillationSpeed = 0.2; // Speed of radius change

  // // Toggle function for orbit-around mode
  // function toggleOrbitAroundVehicle() {
  //   isOrbitingAroundVehicle = !isOrbitingAroundVehicle;

  //   if (isOrbitingAroundVehicle) {
  //     // Disable conflicting modes
  //     isFlying = false;
  //     isCameraFollowingCar = false;
  //     controls.enabled = false; // Disable manual controls during orbit
  //     console.log("Vehicle orbit mode enabled.");
  //   } else {
  //     controls.enabled = true; // Re-enable manual controls when orbit stops
  //     console.log("Vehicle orbit mode disabled.");
  //     controls.update();
  //   }
  // }

  // // Event listener to toggle orbit-around with "O" key
  // document.addEventListener('keydown', (event) => {
  //   if (event.key.toLowerCase() === 'o') { // Press "O" to toggle orbit mode
  //     toggleOrbitAroundVehicle();
  //   }
  // });

  // // Function to update orbiting around the vehicle
  // function updateOrbitAroundVehicle(time) {
  //   if (isOrbitingAroundVehicle && stickLoaded) {
  //     const vehiclePosition = new THREE.Vector3();
  //     vehicleContainer.getWorldPosition(vehiclePosition);

  //     // Oscillate radius and height over time for a dynamic orbit effect
  //     const oscillatedRadius =
  //       orbitAroundRadius +
  //       (Math.sin(time * radiusOscillationSpeed) * (maxOrbitRadius - minOrbitRadius)) / 2;
  //     const oscillatedHeight =
  //       orbitAroundHeight + Math.sin(time * heightVariationSpeed) * 0.3;

  //     const x = vehiclePosition.x + oscillatedRadius * Math.cos(time * orbitAroundSpeed);
  //     const z = vehiclePosition.z + oscillatedRadius * Math.sin(time * orbitAroundSpeed);

  //     //console.log('New camera position:', x, vehiclePosition.y + oscillatedHeight, z);
  //     camera.position.set(x, vehiclePosition.y + oscillatedHeight, z);

  //     camera.lookAt(vehiclePosition.x, vehiclePosition.y + 0.5, vehiclePosition.z);
  //   }
  // }

  // // const clock = new THREE.Clock();

  // let previousTime = performance.now();
  // let accumulatedDelta = 0;

  // function updateScene() {
  //   const currentTime = performance.now();
  //   let deltaTime = (currentTime - previousTime) / 1000; // Convert ms to seconds

  //   // Ignore frames with near-zero time deltas
  //   if (deltaTime < 0.0001) deltaTime = 0.016; // Assume ~60 FPS (1/60 seconds)

  //   // Smooth out jumps
  //   deltaTime = Math.min(deltaTime, 0.033); // Cap at ~1/30th of a second (to avoid large jumps)
  //   accumulatedDelta += deltaTime; // Accumulate for consistent updates

  //   previousTime = currentTime;

  //   updateOrbitAroundVehicle(accumulatedDelta); // Use accumulatedDelta for smoother movement
  //   updateSandstorm(); // Update visual effects
  //   updateSnowfall();
  //   rotateClones(deltaTime); // Smooth rotation

  //   renderer.render(scene, camera);
  // }

  // window.addEventListener("resize", () => {
  //   renderer.setSize(container.clientWidth, container.clientHeight);
  //   camera.aspect = container.clientWidth / container.clientHeight;
  //   camera.updateProjectionMatrix();
  // });

  // renderer.setAnimationLoop(() => {
  //   updateScene();
  // });




}

