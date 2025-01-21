document.getElementById('fullscreen').addEventListener('click', () => {
    const appElement = document.getElementById('app');

    if (appElement.requestFullscreen) {
        appElement.requestFullscreen(); // Standard fullscreen API
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

// Optional: Exit fullscreen using `Esc` key
document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement) {
        console.log('Exited fullscreen mode');
    }
});



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
        'https://play2.s3.amazonaws.com/assets/Vb02rZOh8.jpeg', // Replace with your image
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

let snowObject = null;

function generateSnow(scene, count = 1000, radius = 50) {
    const starGeometry = new THREE.BufferGeometry();
    const starMaterial = new THREE.PointsMaterial({
        color: 0xffffff, // White for snowflakes
        size: 0.05
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
            x = (Math.random() - 0.5) * 10; // Randomize X-position again
            z = (Math.random() - 0.5) * 10; // Randomize Z-position
        }

        positions.setXYZ(i, x, y, z); // Update position
    }

    positions.needsUpdate = true; // Notify Three.js of updates
}

function generateStars(scene, count = 1000, radius = 50) {
    const starGeometry = new THREE.BufferGeometry();
    const starMaterial = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.05
    });
    // Create star positions
    const positions = new Float32Array(count * 3); // x, y, z for each star
    for (let i = 0; i < count * 3; i += 3) {
        const theta = Math.random() * 2 * Math.PI; // Random angle
        const phi = Math.acos(2 * Math.random() - 1); // Random inclination
        const r = radius * Math.random();
        positions[i] = r * Math.sin(phi) * Math.cos(theta); // x
        positions[i + 1] = r * Math.sin(phi) * Math.sin(theta); // y
        positions[i + 2] = r * Math.cos(phi); // z
    }
    starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    // Create star mesh and add to scene
    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);
}

function init() {
    const container = document.getElementById('app');
    if (!container) {
        console.error('Container element #app not found in the DOM.');
        return;
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf75602);

    const camera = new THREE.PerspectiveCamera(40,
        container.clientWidth / container.clientHeight,
        0.1,
        1000);
    camera.position.set(0, 1, 8);

    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true; // Enable shadows
    container.appendChild(renderer.domElement);

    //const controls = new THREE.OrbitControls(camera, renderer.domElement);

    const light = new THREE.DirectionalLight(0xffffff, 5);
    light.position.set(10, 14, 10);
    light.castShadow = true;
    light.shadow.mapSize.width = 2048;
    light.shadow.mapSize.height = 2048;
    light.shadow.camera.left = -50;
    light.shadow.camera.right = 50;
    light.shadow.camera.top = 50;
    light.shadow.camera.bottom = -50;
    light.shadow.camera.near = 1;
    light.shadow.camera.far = 100;
    light.shadow.bias = -0.0005;

    // Renderer configuration
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Soft shadows

    scene.add(light);

    // https://play2.s3.amazonaws.com/assets/vkbh_8gJg.jpeg


    // Load the textures
    const textureLoader = new THREE.TextureLoader();

    const diffuseMap = textureLoader.load('https://play2.s3.amazonaws.com/assets/vkbh_8gJg.jpeg'); // Albedo/Diffuse map
    const roughnessMap = textureLoader.load('https://play2.s3.amazonaws.com/assets/R8wVY79G-.jpeg'); // Roughness map
    const normalMap = textureLoader.load('https://play2.s3.amazonaws.com/assets/GGf_DgOaw.null'); // Normal map
    const displacementMap = textureLoader.load('https://play2.s3.amazonaws.com/assets/bS-xj7PMr.png'); // Displacement map
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
        displacementScale: 2,
        metalness: 0.1,
        roughness: 0.8,
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

    floor.position.y = -1.15;


    //scene.environment = null;


    // // Load the snow texture
    // const textureLoader = new THREE.TextureLoader();
    // const snowTexture = textureLoader.load('https://play2.s3.amazonaws.com/assets/vkbh_8gJg.jpeg');

    // const diffuseMap = textureLoader.load('https://play2.s3.amazonaws.com/assets/vkbh_8gJg.jpeg'); // Albedo/Diffuse map
    // const roughnessMap = textureLoader.load('https://play2.s3.amazonaws.com/assets/R8wVY79G-.jpeg'); // Roughness map
    // const normalMap = textureLoader.load('https://play2.s3.amazonaws.com/assets/GGf_DgOaw.null'); // Normal map (OpenEXR support)
    // const displacementMap = textureLoader.load('https://play2.s3.amazonaws.com/assets/bS-xj7PMr.png'); // Displacement/height map
    // const translucencyMap = textureLoader.load('https://play2.s3.amazonaws.com/assets/qP24vrGr2.png'); // Translucency for subtle light scattering

    // snowTexture.wrapS = THREE.RepeatWrapping;
    // snowTexture.wrapT = THREE.RepeatWrapping;
    // snowTexture.repeat.set(5, 5); // Adjust to control tiling

    // // Configure the material with the snow texture
    // const floorMaterial = new THREE.MeshStandardMaterial({
    //   map: snowTexture, // Apply texture map
    //   roughness: 0.8,   // Adjust to make it look more like snow
    //   metalness: 0.1    // Keep it low to avoid metallic shine
    // });

    // // Floor geometry and mesh
    // const floorGeometry = new THREE.PlaneGeometry(500, 500);
    // const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    // floor.rotation.x = -Math.PI / 2; // Rotate floor to lie flat
    // floor.receiveShadow = true; // Floor receives shadows

    // // Add to the scene
    // scene.add(floor);


    // const floorGeometry = new THREE.PlaneGeometry(500, 500);
    // const floorMaterial = new THREE.MeshStandardMaterial({
    //   color: 0x233951
    // })

    // const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    // floor.rotation.x = -Math.PI / 2; // Rotate floor to lie flat
    // floor.receiveShadow = true; // Floor receives shadows
    // scene.add(floor);


    // const material = new THREE.MeshBasicMaterial({ color: 0xff69b4 });
    // const cube = new THREE.Mesh(geometry, material);
    // scene.add(cube);
    let model = null;
    let model2 = null;
    const loader = window.gltfLoader;

    let model_url = "./models/mercedes-pride.glb";
    //let model_url = "https://play2.s3.amazonaws.com/assets/XKeUfLbp4.glb"

    loader.load(model_url,
        (gltf) => {
            model = gltf.scene;
            model.traverse((node) => {
                if (node.isMesh) {
                    node.castShadow = true; // Enable shadow casting for the model
                }
            });
            scene.add(model);
            model.position.y = 0;
            //model.scale.set(1.1, 1.1, 1.1)
        },
        undefined,
        (error) => {
            console.error('Failed to load model:', error);
        }
    );

    /* loader.load('https://play2.s3.amazonaws.com/assets/V_gwgi-EM.glb',
      (gltf) => {
        model2 = gltf.scene;
        model2.traverse((node) => {
          if (node.isMesh) {
            node.castShadow = true; // Enable shadow casting for the model
          }
        });
        scene.add(model2);
        model2.position.set(0, floor.position.y + 2.5, 8);
        let scale = 0.5;
        model2.scale.set(scale, scale, scale)
      },
      undefined,
      (error) => {
        console.error('Failed to load model:', error);
      }
    ); */


    /* const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.src = 'https://play2.s3.amazonaws.com/assets/Kjfd925uS.mp4'; // Replace with your video source
    video.muted = true;
    video.playsInline = true;
    video.disableRemotePlayback = true;
    video.loop = true;
    video.play();
    const videoTexture = new THREE.VideoTexture(video);
    const videoMaterial = new THREE.MeshBasicMaterial({ map: videoTexture });
    const videoPlaneGeometry = new THREE.PlaneGeometry(10, 5);
    const videoPlane = new THREE.Mesh(videoPlaneGeometry, videoMaterial);
    videoPlane.position.set(0, 3, -12);
    scene.add(videoPlane); */

    //generateStars(scene, 1000, 50);

    generateSnow(scene, 200000, 10);

    window.addEventListener('resize', () => {
        const width = container.clientWidth;
        const height = container.clientHeight;
        renderer.setSize(width, height);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
    });

    let angle = 0;

    //addHemisphereLight(scene);
    addEnvironmentMap(scene, renderer);

    addFog(scene, 0xfffaf5, 0.1, 30); // Color, near distance, far distance


    function animate() {
        
        requestAnimationFrame(animate);
        
        // if (model) {
        //     /* model.rotation.x += 0.01;
        //     model.rotation.y += 0.01; */
        //     model.rotation.y += 0.001;
        // }
        
        if (model2) {
            model2.rotation.y = camera.rotation.y;
        }
        
        if (camera) {
            camera.lookAt(0, 0.4, 0);
            angle += 0.002; // Adjust speed of rotation
            const radius = 6;
            let heightVariation = Math.sin(angle * 1.1) * 1.1; // Height oscillation
            // Ensure the camera's height does not go below 0
            camera.position.x = radius * Math.cos(angle);
            camera.position.z = radius * Math.sin(angle);
            camera.position.y = 1.6 + heightVariation; //Math.max(0.2, 0.1 + heightVariation); // Clamp height
        }

        updateSnowfall();

        renderer.render(scene, camera);
    }
    animate();

}
main();