document.getElementById('fullscreen').addEventListener('click', () => {
  const appElement = document.getElementById('app');

  if (appElement.requestFullscreen) {
    appElement.requestFullscreen();
  } else if (appElement.webkitRequestFullscreen) {
    appElement.webkitRequestFullscreen();
  } else if (appElement.mozRequestFullScreen) {
    appElement.mozRequestFullScreen();
  } else if (appElement.msRequestFullscreen) {
    appElement.msRequestFullscreen();
  } else {
    console.error('Fullscreen API is not supported by this browser.');
  }
});

// Optional: Exit fullscreen using `Esc` key
document.addEventListener('fullscreenchange', () => {
  if (!document.fullscreenElement) {
    console.log('Exited fullscreen mode');
  }
});

function main() {
  const script = document.createElement('script');
  script.onload = function () {
    if (typeof THREE === 'undefined') {
      console.error('THREE is not defined');
      return;
    }
    console.log('THREE loaded successfully');
    const dracoLoader = window.dracoLoader;
    if (dracoLoader) {
      console.log('DRACO loader configured for inline decoding.');
    } else {
      console.error('DRACO loader is not available on window.');
    }
    init(); // Call to initialize the 3D scene
  };
  script.onerror = function () {
    console.error('Failed to load the Three.js bundle. Check the URL or network.');
  };
  script.src = 'https://play2.s3.amazonaws.com/assets/uLK51PlDI.js'; // Replace with the actual bundle URL
  document.head.appendChild(script);
}

function init() {
  const container = document.getElementById('app');
  if (!container) {
    console.error('Container element #app not found in the DOM.');
    return;
  }

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xa0a0a0); // Light grey background

  const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
  camera.position.set(3, 3, 5);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.shadowMap.enabled = true; // Enable shadows
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.xr.enabled = true; // Enable WebXR
  container.appendChild(renderer.domElement);

  // Add VR button
  document.body.appendChild(window.VRButton.createButton(renderer));

  const controls = new window.OrbitControls(camera, renderer.domElement); // Ensure OrbitControls is referenced from `window`
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;

  // Floor
  const floorGeometry = new THREE.PlaneGeometry(10, 10);
  const floorMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2; // Rotate floor to lay flat
  floor.receiveShadow = true;
  scene.add(floor);

  // Pink cube
  const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
  const cubeMaterial = new THREE.MeshStandardMaterial({ color: 0xff69b4 }); // Pink color
  const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
  cube.position.set(0, 0.5, 0);
  cube.castShadow = true;
  scene.add(cube);

  // Lights
  const ambientLight = new THREE.AmbientLight(0x404040, 1); // Soft ambient light
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
  directionalLight.position.set(5, 10, 5);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 2048;
  directionalLight.shadow.mapSize.height = 2048;
  scene.add(directionalLight);

  // XR Controllers and Hand Models
  const controller1 = renderer.xr.getController(0);
  const controller2 = renderer.xr.getController(1);

  const controllerModelFactory = new window.XRControllerModelFactory();
  const handModelFactory = new window.XRHandModelFactory();

  const controllerGrip1 = renderer.xr.getControllerGrip(0);
  const controllerGrip2 = renderer.xr.getControllerGrip(1);

  controllerGrip1.add(controllerModelFactory.createControllerModel(controllerGrip1));
  controllerGrip2.add(controllerModelFactory.createControllerModel(controllerGrip2));

  scene.add(controller1, controller2, controllerGrip1, controllerGrip2);

  // Hand model
  const hand1 = renderer.xr.getHand(0);
  const hand2 = renderer.xr.getHand(1);
  hand1.add(handModelFactory.createHandModel(hand1));
  hand2.add(handModelFactory.createHandModel(hand2));

  scene.add(hand1, hand2);

  window.addEventListener('resize', () => {
    const width = container.clientWidth;
    const height = container.clientHeight;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  });

  renderer.setAnimationLoop(() => {
    controls.update();
    renderer.render(scene, camera);
  });
}

main();
