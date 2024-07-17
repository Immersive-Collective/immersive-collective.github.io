
// https://immersive-collective.org/projects/yolo.cx/cube/cube.js


import * as THREE from 'https://unpkg.com/three/build/three.module.js';

export function initWidget(scene) {

    if (window.newCube) {
        scene.remove(window.newCube);
    }

    const newGeometry = new THREE.BoxGeometry();
    const newMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const newCube = new THREE.Mesh(newGeometry, newMaterial);

    scene.add(newCube);
    window.newCube = newCube;

    function rotateNewCube(delta) {
        newCube.rotation.x += delta * 0.5;
        newCube.rotation.y += delta * 0.5;
    }

    if (!window.customUpdateFunctions) {
        window.customUpdateFunctions = [];
    }

    window.customUpdateFunctions.push(rotateNewCube);

    window.customUpdate = function (delta) {
        window.customUpdateFunctions.forEach(func => func(delta));
    };
}


/*


The provided code initializes a widget with a rotating cube in a Three.js scene. It does not follow the ECS pattern, as it lacks the fundamental aspects of ECS, such as entities, components, and systems operating in a decoupled manner.

Here is a brief explanation of the provided code:

1. Imports the Three.js library.
2. Defines the `initWidget` function that adds a rotating cube to the given `scene`.
3. Removes any existing cube (`window.newCube`) from the scene.
4. Creates a new cube with basic red material and adds it to the scene.
5. Adds a rotation function for the cube (`rotateNewCube`).
6. If `window.customUpdateFunctions` is not already defined, initializes it as an empty array.
7. Pushes the rotation function to `window.customUpdateFunctions`.
8. Defines a `window.customUpdate` function that iterates over `window.customUpdateFunctions` and calls each function with the `delta` parameter.

To make it more ECS-like, you would need to refactor the code to separate the data (components) from the logic (systems) and use entities to link them together.

*/