function main() {
    const script = document.createElement('script');

    script.onload = function() {
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

        init();
    }

    script.onerror = function() {
        console.error('Failed to load the Three.js bundle. Check the URL or network.');
    }

    script.src = 'https://play2.s3.amazonaws.com/assets/3sMC9aCzk.js';
    document.head.appendChild(script);
}

function init() {
    const container = document.getElementById('app');

    if (!container) {
        console.error('Container element #app not found in the DOM.');
        return;
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf75602);

    const camera = new THREE.PerspectiveCamera(75,
        container.clientWidth / container.clientHeight,
        0.1,
        1000);
    camera.position.set(0, 1, 8);

    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true; // Enable shadows
    container.appendChild(renderer.domElement);

    const light = new THREE.DirectionalLight(0xffffff, 1.5);
    light.position.set(10, 10, 10);
    light.castShadow = true; // Enable shadow casting for light
    scene.add(light);

    const floorGeometry = new THREE.PlaneGeometry(20, 20);

    const floorMaterial = new THREE.MeshStandardMaterial({
            color: 0x808080
        }

    )

    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2; // Rotate floor to lie flat
    floor.receiveShadow = true; // Floor receives shadows
    scene.add(floor);
    floor.position.y = -0.3 // const geometry = new THREE.BoxGeometry();
    // const material = new THREE.MeshBasicMaterial({ color: 0xff69b4 });
    // const cube = new THREE.Mesh(geometry, material);
    // scene.add(cube);

    let model = null;

    const loader = window.gltfLoader;

    loader.load('https://play2.s3.amazonaws.com/assets/XHCm2gx6H7.glb',
        (gltf) => {
            model = gltf.scene;

            model.traverse((node) => {
                    if (node.isMesh) {
                        node.castShadow = true; // Enable shadow casting for the model
                    }
                }

            );
            scene.add(model);
            model.position.y = 2.5
        }

        ,
        undefined,
        (error) => {
            console.error('Failed to load model:', error);
        }

    );

    window.addEventListener('resize', () => {
            const width = container.clientWidth;
            const height = container.clientHeight;

            renderer.setSize(width, height);
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
        }

    );

    function animate() {
        requestAnimationFrame(animate);

        if (model) {
            model.rotation.x += 0.01;
            model.rotation.y += 0.01;
        }

        renderer.render(scene, camera);
    }

    animate();
}

main();

// function main() {
//   const script = document.createElement('script');

//   script.onload = function () {
//     if (typeof THREE === 'undefined') {
//       console.error('THREE is not defined');
//       return;
//     }

//     console.log('THREE loaded successfully');

//     const dracoLoader = window.dracoLoader;
//     if (dracoLoader) {
//       console.log('DRACO loader configured for inline decoding.');
//     } else {
//       console.error('DRACO loader is not available on window.');
//     }

//     init();
//   };

//   script.onerror = function () {
//     console.error('Failed to load the Three.js bundle. Check the URL or network.');
//   };

//   script.src = 'https://play2.s3.amazonaws.com/assets/3sMC9aCzk.js';
//   document.head.appendChild(script);
// }

// function init() {
//   const container = document.getElementById('app');

//   if (!container) {
//     console.error('Container element #app not found in the DOM.');
//     return;
//   }

//   const scene = new THREE.Scene();
//   const camera = new THREE.PerspectiveCamera(
//     75,
//     container.clientWidth / container.clientHeight,
//     0.1,
//     1000
//   );
//   camera.position.set(0, 1, 8);

//   const renderer = new THREE.WebGLRenderer();
//   renderer.setSize(container.clientWidth, container.clientHeight);
//   container.appendChild(renderer.domElement);

//   const light = new THREE.DirectionalLight(0xffffff, 1.5);
//   light.position.set(10, 10, 10);
//   scene.add(light);

//   // const geometry = new THREE.BoxGeometry();
//   // const material = new THREE.MeshBasicMaterial({ color: 0xff69b4 });
//   // const cube = new THREE.Mesh(geometry, material);
//   // scene.add(cube);

//   let model = null;

//   const loader = window.gltfLoader;

//   loader.load(
//     'https://play2.s3.amazonaws.com/assets/XHCm2gx6H7.glb',
//     (gltf) => {
//       model = gltf.scene;
//       scene.add(model);
//     },
//     undefined,
//     (error) => {
//       console.error('Failed to load model:', error);
//     }
//   );

//   window.addEventListener('resize', () => {
//     const width = container.clientWidth;
//     const height = container.clientHeight;

//     renderer.setSize(width, height);
//     camera.aspect = width / height;
//     camera.updateProjectionMatrix();
//   });

//   function animate() {

//     requestAnimationFrame(animate);

//     //   cube.rotation.x += 0.01;
//     //   cube.rotation.y += 0.01;

//     if (model) {
//       model.rotation.x += 0.01;
//       model.rotation.y += 0.01;
//     }

//     renderer.render(scene, camera);
//   }

//   animate();
// }

// main();