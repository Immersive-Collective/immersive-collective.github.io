import * as THREE from 'https://unpkg.com/three/build/three.module.js';
import * as poseDetection from 'https://cdn.jsdelivr.net/npm/@tensorflow-models/pose-detection';
import 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.20.0/dist/tf.min.js';
import 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-webgl@4.20.0/dist/tf-backend-webgl.min.js';
import 'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js';

const Camera = window.Camera;

document.addEventListener('DOMContentLoaded', () => {
    tf.setBackend('webgl').then(async () => {
        await tf.ready();
        console.log('Backend set to WebGL');
        initPoseDetection();
    });
});

const video = document.getElementById("webcam");
const canvasElement = document.getElementById("output_canvas");
const canvasCtx = canvasElement.getContext("2d");

// Three.js setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 5;

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const geometry = new THREE.SphereGeometry(0.1, 32, 32);
const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
const particles = [];

for (let i = 0; i < 21; i++) {
    const particle = new THREE.Mesh(geometry, material);
    scene.add(particle);
    particles.push(particle);
}

// TensorFlow.js setup
let detector;
async function initPoseDetection() {
    const detectorConfig = {
        modelType: poseDetection.SupportedModels.MoveNet, // Ensure this is correct
        modelConfig: {}
    };
    detector = await poseDetection.createDetector(detectorConfig.modelType, detectorConfig.modelConfig);
    const enableWebcamButton = document.getElementById('webcamButton');
    enableWebcamButton.addEventListener('click', enableCam);
}

async function enableCam(event) {
    const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
    });

    video.srcObject = stream;
    video.addEventListener("loadeddata", predictWebcam);
}

let lastVideoTime = -1;
async function predictWebcam() {
    canvasElement.style.height = video.videoHeight + "px";
    video.style.height = video.videoHeight + "px";
    canvasElement.style.width = video.videoWidth + "px";
    video.style.width = video.videoWidth + "px";

    let startTimeMs = performance.now();
    if (lastVideoTime !== video.currentTime) {
        lastVideoTime = video.currentTime;
        const poses = await detector.estimatePoses(video, { flipHorizontal: false });
        canvasCtx.save();
        canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

        if (poses.length > 0) {
            const keypoints = poses[0].keypoints;
            keypoints.forEach((keypoint, index) => {
                if (keypoint.score > 0.5) {
                    particles[index].position.x = keypoint.x / 100 - 3.2; // scale and adjust position
                    particles[index].position.y = -keypoint.y / 100 + 2.4; // scale and adjust position
                }
            });
        }

        canvasCtx.restore();
    }

    window.requestAnimationFrame(predictWebcam);
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

animate(); // Moved to be called immediately
