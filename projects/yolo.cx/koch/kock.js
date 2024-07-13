import * as THREE from 'three';
import Spell from './Spell';

const defaultCenterColor = new THREE.Color("black");
const defaultOuterColor = new THREE.Color("red");

// Vertex Shader
const vertexShader = `
  varying vec3 vPosition;
  void main() {
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Fragment Shader
const fragmentShader = `
  varying vec3 vPosition;
  uniform vec3 uCenterColor;
  uniform vec3 uOuterColor;

  void main() {
    float distanceFromCenter = length(vPosition - vec3(0, 0, 0));
    float gradient = distanceFromCenter; // Adjust the divisor to control the gradient effect
    vec3 color = mix(uCenterColor, uOuterColor, gradient);
    gl_FragColor = vec4(color, 1.0);
  }
`;

function create3DKochFractal(points, angle, fractalQueue, iterations, length, start, end, directions) {
    if (iterations === 0) {
        points.push(start.x, start.y, start.z, end.x, end.y, end.z);
        return;
    }

    const direction = end.clone().sub(start).normalize();
    const distance = start.distanceTo(end) / 3;
    const angleRad = THREE.MathUtils.degToRad(angle);

    const p1 = start.clone().add(direction.clone().multiplyScalar(distance));
    const p2 = p1.clone().add(new THREE.Vector3(
        Math.cos(angleRad) * distance,
        Math.sin(angleRad) * distance,
        Math.sin(angleRad) * distance
    ));
    const p3 = start.clone().add(direction.clone().multiplyScalar(2 * distance));
    const p4 = end;

    fractalQueue.push({ iterations: iterations - 1, length: length / 3, start: start, end: p1, directions: directions });
    fractalQueue.push({ iterations: iterations - 1, length: length / 3, start: p1, end: p2, directions: directions });
    fractalQueue.push({ iterations: iterations - 1, length: length / 3, start: p2, end: p3, directions: directions });
    fractalQueue.push({ iterations: iterations - 1, length: length / 3, start: p3, end: p4, directions: directions });

    directions.forEach(dir => {
        const offset = new THREE.Vector3(...dir).multiplyScalar(distance);
        const p1_alt = p1.clone().add(offset);
        const p2_alt = p2.clone().add(offset);
        const p3_alt = p3.clone().add(offset);
        const p4_alt = p4.clone().add(offset);

        fractalQueue.push({ iterations: iterations - 1, length: length / 3, start: p1, end: p1_alt, directions: directions });
        fractalQueue.push({ iterations: iterations - 1, length: length / 3, start: p2, end: p2_alt, directions: directions });
        fractalQueue.push({ iterations: iterations - 1, length: length / 3, start: p3, end: p3_alt, directions: directions });
        fractalQueue.push({ iterations: iterations - 1, length: length / 3, start: p4, end: p4_alt, directions: directions });
    });
}

class Koch extends THREE.Object3D {
    constructor(angle = 90, iterations = 1, centerColor = defaultCenterColor, outerColor = defaultOuterColor, directions = [[1, 0, 0], [0, 1, 0], [0, 0, 1]]) {
        super();

        this.fractalQueue = [];
        this.points = [];

        this.angle = angle;
        const positions = new Float32Array(100000 * 3 * 2);
        this.geometry = new THREE.BufferGeometry();
        this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        // Convert colors to arrays of floats
        const centerColorArray = centerColor.toArray();
        const outerColorArray = outerColor.toArray();

        console.log(centerColorArray, outerColorArray)

        const material = new THREE.ShaderMaterial({
            vertexShader,
            fragmentShader,
            uniforms: {
                uCenter: { value: new THREE.Vector3(0, 0, 0) },
                uCenterColor: { value: centerColorArray },
                uOuterColor: { value: outerColorArray }
            }
        });

        const line = new THREE.LineSegments(this.geometry, material);
        this.add(line);

        this.fractalQueue.push({
            iterations: iterations,
            length: 10,
            start: new THREE.Vector3(0, 0, 0),
            end: new THREE.Vector3(0, 0, 1),
            directions: directions
        });
    }

    #processFractalQueue() {

        if (this.fractalQueue.length > 0) {
            const task = this.fractalQueue.shift();
            create3DKochFractal(this.points, this.angle, this.fractalQueue, task.iterations, task.length, task.start, task.end, task.directions);
            this.#updateGeometry();
        }
    }

    #updateGeometry() {
        const positions = this.geometry.attributes.position.array;
        for (let i = 0; i < this.points.length; i++) {
            positions[i] = this.points[i];
        }
        this.geometry.attributes.position.needsUpdate = true;
    }

    update() {
        this.#processFractalQueue();
    }
}

class Koch4D extends THREE.Group {
    constructor(centerColor = defaultCenterColor, outerColor = defaultOuterColor) {
        super();

        const angle = 180 * Math.random()

        this.koch_1 = new Koch(angle, 3, centerColor, outerColor, [[-1, 0, 0], [0, 1, 0], [0, 0, -1]]);
        this.koch_2 = new Koch(angle, 3, centerColor, outerColor, [[1, 0, 0], [0, -1, 0], [0, 0, 1]]);
        this.koch_1.position.z = -0.75;
        this.koch_2.position.z = -0.75;
        this.add(this.koch_1, this.koch_2);
    }

    animate(time) {

        this.koch_1.update();
        this.koch_2.update();

        this.rotation.x = Math.sin(time / 20);
        this.rotation.y = Math.cos(time / 20);
        this.rotation.z = Math.sin(time / 20);
    }
}

export function initWidget(scene) {

    if (window.koch) {
        scene.remove(window.koch);
    }

    const koch = new Koch4D();

    scene.add(koch);
    window.koch = koch;

    if (!window.customUpdateFunctions) {
        window.customUpdateFunctions = [];
    }

    window.customUpdateFunctions.push((delta) => {
        koch.animate(delta);
    });

    window.customUpdate = function (delta) {
        window.customUpdateFunctions.forEach(func => func(delta));
    };
}