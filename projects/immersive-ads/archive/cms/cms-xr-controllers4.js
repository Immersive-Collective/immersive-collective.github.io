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
        appElement.webkitRequestFullscreen(); // Safari
    } else if (appElement.mozRequestFullScreen) {
        appElement.mozRequestFullScreen(); // Firefox
    } else if (appElement.msRequestFullscreen) {
        appElement.msRequestFullscreen(); // IE/Edge
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

    for (let i = 0; i < amount; i++) {
        // Create a cube geometry with a random size (up to 1.7 units)
        const size = 2 + Math.random() * 8; // Random size between 0 and 1.7
        const cubeGeometry = new THREE.BoxGeometry(size, 40, size);

        // Random color for the obstacle
        const randomColor = new THREE.Color(Math.random(), Math.random(), Math.random());
        const cubeMaterial = new THREE.MeshStandardMaterial({ color: randomColor });

        // Create the mesh
        const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
        cube.castShadow = true; // Allow the cube to cast shadows
        cube.receiveShadow = true; // Allow cube to receive shadows

        // Random position within the defined area
        cube.position.x = (Math.random() - 0.5) * area; // Spread in x-direction within the area
        cube.position.z = (Math.random() - 0.5) * area; // Spread in z-direction within the area
        cube.position.y = size / 2; // Elevate to sit on the floor

        // Add cube to the obstacle group
        obstacleGroup.add(cube);
    }

    // Add the group of obstacles to the scene
    scene.add(obstacleGroup);
    console.log(`${amount} obstacles added within an area of ${area} units.`);
}



function addFog(scene, color = 0xffffff, near = 30, far = 200) {
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
    gltfLoader.setDRACOLoader(window.dracoLoader); // DRACOLoader from the global scope
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
    

    window.wscene = scene; 


    /* XR Controllers */

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




    /* Controls */
    
    const controls = new window.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    // Prevent camera from moving below the ground
    controls.minPolarAngle = 0; // Looking straight forward
    controls.maxPolarAngle = (Math.PI / 2) - 0.1; // Limit to prevent looking below the horizon
    // Limit zoom or distance
    controls.minDistance = 1.7; // Minimum distance the camera can be to the target
    controls.maxDistance = 50; // Maximum distance the camera can be from the target
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
        map.repeat.set(10, 5);
    });




  const FLOOR_SIZE = 100; // Size of one floor tile
  const TILE_COUNT = 3; // 3x3 grid of floor tiles
  const FLOOR_LEVEL = -0.13;

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
          floorTile.position.set(x * FLOOR_SIZE, FLOOR_LEVEL, z * FLOOR_SIZE);
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
              floorTiles[index].position.set(centerX + x * FLOOR_SIZE, FLOOR_LEVEL, centerZ + z * FLOOR_SIZE);
              index++;
          }
      }
  }

    
    //addHemisphereLight(scene);
    addEnvironmentMap(scene, renderer);
    
    addFog(scene, 0xa89ebc, 10, 100); // Color, near distance, far distance    

    const directionalLight = new THREE.DirectionalLight(0xffdd99, 1);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    scene.add(directionalLight);
    const ambientLight = new THREE.AmbientLight(0xffd59e, 0.4); // Light peach ambient light
    scene.add(ambientLight);
    

    /* Sandstorm */


    generateSandstorm(scene, 60000, 40);

    addObstacles(scene, 200, 500);



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

// Listen for key press events
document.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowUp') keysPressed.ArrowUp = true;
    if (event.key === 'ArrowDown') keysPressed.ArrowDown = true;
    if (event.key === 'ArrowLeft') keysPressed.ArrowLeft = true;
    if (event.key === 'ArrowRight') keysPressed.ArrowRight = true;
    if (event.key.toLowerCase() === 'b') keysPressed.b = true; // Brake key
});

document.addEventListener('keyup', (event) => {
    if (event.key === 'ArrowUp') keysPressed.ArrowUp = false;
    if (event.key === 'ArrowDown') keysPressed.ArrowDown = false;
    if (event.key === 'ArrowLeft') keysPressed.ArrowLeft = false;
    if (event.key === 'ArrowRight') keysPressed.ArrowRight = false;
    if (event.key.toLowerCase() === 'b') keysPressed.b = false; // Release brake key
});

// Updated movement constants for a more responsive feel
let acceleration = 8.0; // Increased acceleration for faster start
let maxSpeed = 280.0 / 3.6; // Higher max speed to simulate realistic car motion
let deceleration = 3; // Passive deceleration for smooth stopping
let brakeForce = 15.0; // Stronger braking for quick stops

const myspeedometer = document.getElementById("myspeed")

// Wheel radius in meters (should match the actual 3D model's dimensions)
const wheelRadius = 0.3; // Wheel radius in meters
const wheelCircumference = 2 * Math.PI * wheelRadius; // Calculate wheel circumference

// Function to update vehicle movement based on velocity
function updateVehicleMovement(deltaTime) {
    if (keysPressed.ArrowUp) {
        // Move forward (positive Z axis)
        vehicleVelocity.z += acceleration * deltaTime;
        if (vehicleVelocity.z > maxSpeed) vehicleVelocity.z = maxSpeed;
    }

    if (keysPressed.ArrowDown) {
        // Move backward (negative Z axis)
        vehicleVelocity.z -= acceleration * deltaTime;
        if (vehicleVelocity.z < -maxSpeed) vehicleVelocity.z = -maxSpeed;
    }

    if (keysPressed.b) {
        // Apply strong braking force to decelerate to 0 but not reverse
        if (vehicleVelocity.z > 0) {
            vehicleVelocity.z -= brakeForce * deltaTime; // Apply brake force
            if (vehicleVelocity.z < 0) vehicleVelocity.z = 0; // Clamp to 0
        }
    } else if (!keysPressed.ArrowUp && !keysPressed.ArrowDown) {
        // Apply passive deceleration when no input
        if (vehicleVelocity.z > 0) vehicleVelocity.z -= deceleration * deltaTime; // Decelerate forward
        if (vehicleVelocity.z < 0) vehicleVelocity.z += deceleration * deltaTime; // Decelerate backward
        if (Math.abs(vehicleVelocity.z) < 0.01) vehicleVelocity.z = 0; // Stop completely at low speeds
    }

    // Update steering based on input
    if (keysPressed.ArrowLeft) {
        steeringAngle -= steeringSpeed * deltaTime; // Turn left
        if (steeringAngle < -maxSteeringAngle) steeringAngle = -maxSteeringAngle;
    } else if (keysPressed.ArrowRight) {
        steeringAngle += steeringSpeed * deltaTime; // Turn right
        if (steeringAngle > maxSteeringAngle) steeringAngle = maxSteeringAngle;
    } else {
        // Reset steering angle gradually when no left/right input
        if (steeringAngle > 0) steeringAngle -= steeringSpeed * deltaTime;
        if (steeringAngle < 0) steeringAngle += steeringSpeed * deltaTime;
        if (Math.abs(steeringAngle) < 0.01) steeringAngle = 0;
    }

    // Update wheel steering
    if (wheels.frontLeft) wheels.frontLeft.rotation.y = -steeringAngle;
    if (wheels.frontRight) wheels.frontRight.rotation.y = -steeringAngle;

    // Update vehicle position and direction
    if (steeringAngle !== 0 && Math.abs(vehicleVelocity.z) > 0) {
        const turnRadius = wheelRadius / Math.sin(Math.abs(steeringAngle));
        const angularVelocity = vehicleVelocity.z / turnRadius;
        vehicleContainer.rotation.y += (steeringAngle > 0 ? -1 : 1) * angularVelocity * deltaTime; // Rotate the vehicle
    }

    vehicleContainer.translateZ(vehicleVelocity.z * deltaTime);

    const speedInKmH = Math.abs(vehicleVelocity.z) * 3.6; // Convert to km/h
    myspeedometer.innerHTML = `${speedInKmH.toFixed(2)} km/h`;

    // Rotate wheels based on distance traveled
    rotateWheels(deltaTime);
}
// Function to rotate wheels based on the distance traveled
function rotateWheels(deltaTime) {
    const distanceTraveled = Math.abs(vehicleVelocity.z * deltaTime); // Calculate linear distance traveled
    const rotationAmount = (distanceTraveled / wheelCircumference) * (2 * Math.PI); // Convert distance to radians

    Object.entries(wheels).forEach(([key, wheel]) => {
        if (wheel) {
            // Invert wheel rotation direction for correct visual effect
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



// Follow car variables
let isCameraFollowingCar = false;
let followModeLastCameraPosition = new THREE.Vector3();    // store camera position
let followModeLastCameraQuaternion = new THREE.Quaternion(); // store camera rotation
let initialFollowOffset = new THREE.Vector3();             // offset between camera & car when follow starts
const cameraLookAtOffset = new THREE.Vector3(0, 0, 0);    // where camera aims above the car

document.addEventListener('keydown', (event) => {
    if (event.key === 'f') {
        isCameraFollowingCar = !isCameraFollowingCar;
        controls.enabled = !isCameraFollowingCar;

        if (isCameraFollowingCar) {
            const carWorldPosition = new THREE.Vector3();
            vehicleContainer.getWorldPosition(carWorldPosition);
            initialFollowOffset.copy(camera.position).sub(carWorldPosition);
            console.log("Follow mode ON: computed offset from car.");
        } else {
            followModeLastCameraPosition.copy(camera.position);
            camera.getWorldQuaternion(followModeLastCameraQuaternion);
            console.log("Follow mode OFF: storing camera position & orientation.");
        }
    }
});



// Function to update the camera's position (with smoothing) while following the car
function updateCameraFollow(deltaTime) {
    if (isCameraFollowingCar && !isCameraMoving && !isFlying) {
        // === FOLLOW MODE ON ===
        const carWorldPos = new THREE.Vector3();
        vehicleContainer.getWorldPosition(carWorldPos);

        // Calculate target position behind and above the car based on direction
        const carDirection = new THREE.Vector3();
        vehicleContainer.getWorldDirection(carDirection);
        carDirection.normalize(); // Ensure unit vector

        // Calculate the desired follow offset behind the car
        const desiredOffset = carDirection.multiplyScalar(-5); // Distance behind the car
        desiredOffset.y += 2; // Raise the camera above the car

        const targetPosition = carWorldPos.clone().add(desiredOffset);

        // Smoothly interpolate the camera position to create inertia effect
        const lerpFactor = Math.min(0.02 + (Math.abs(vehicleVelocity.z) / maxSpeed) * 0.3, 0.1); // Control speed-based lerp
        camera.position.lerp(targetPosition, lerpFactor);

        // Smooth look-at position with slight offset to focus slightly ahead of the car
        const lookAtPos = carWorldPos.clone();
        lookAtPos.add(new THREE.Vector3(0, 1, vehicleVelocity.z > 0 ? 2 : -2)); // Slightly forward or backward depending on speed

        camera.lookAt(lookAtPos);
    } else {
        // === FOLLOW MODE OFF ===
        // Do not change the camera's current position
        const lastCameraPosition = camera.position.clone();
        const lastCameraQuaternion = camera.quaternion.clone();

        // Set orbit control's center to the last position of the car
        const lastCarPosition = new THREE.Vector3();
        vehicleContainer.getWorldPosition(lastCarPosition);
        controls.target.copy(lastCarPosition);

        // Keep the camera's current position and orientation after follow mode is toggled off
        camera.position.copy(lastCameraPosition);
        camera.quaternion.copy(lastCameraQuaternion);

        // Enable controls and update their target to the new center
        controls.enabled = true;
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
        updateSandstorm();
        updateFloorPosition();

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





