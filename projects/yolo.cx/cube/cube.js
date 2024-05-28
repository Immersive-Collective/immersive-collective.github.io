
// https://immersive-collective.org/projects/yolo.cx/cube/cube.js


import * as THREE from 'https://unpkg.com/three@0.137.5/build/three.module.js';

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

    window.customUpdate = function(delta) {
        window.customUpdateFunctions.forEach(func => func(delta));
    };
}


