const canvas = document.getElementById("glCanvas");
const gl = canvas.getContext("webgl");
const imageLoader = document.getElementById("imageLoader");

// Add an event listener to the imageLoader input element
imageLoader.addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                currentImage = img; // Update the current image
                updateCanvasSize(img); // Update canvas size
                createTexture(img); // Create and bind the new texture
            };
            img.onerror = () => console.error("Failed to load selected image.");
            img.src = e.target.result; // Set the image source to the file data
        };
        reader.onerror = () => console.error("Failed to read file.");
        reader.readAsDataURL(file); // Read the file as a data URL
    }
});

let texture, overlayTexture, program, positionBuffer, texCoordBuffer, imageAspect;
let overlayPosition = [0, 0];
let canvasSize = { width: 1, height: 1 };
let currentImage = null; // Store the current image globally

if (!gl) {
    console.error("WebGL not supported.");
}

function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error("Shader compile error:", gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

function initGL() {
    const vertexShaderSource = `
        attribute vec2 a_position;
        attribute vec2 a_texCoord;
        varying vec2 v_texCoord;
        void main() {
            gl_Position = vec4(a_position, 0, 1);
            v_texCoord = a_texCoord;
        }
    `;

    // Updated fragment shader: compute overlay brush UVs in pixel space using u_resolution
    const fragmentShaderSource = `
        precision mediump float;
        varying vec2 v_texCoord;
        uniform sampler2D u_texture;
        uniform sampler2D u_overlay;
        uniform vec2 u_overlayPos;
        uniform float u_brushSize;
        uniform float u_brushAspect; // Brush's original aspect ratio
        uniform vec2 u_resolution;   // Canvas resolution in pixels

        void main() {
            vec4 baseColor = texture2D(u_texture, v_texCoord);

            // Convert normalized coordinates to pixel space
            vec2 pos = v_texCoord * u_resolution;
            vec2 overlayCenter = u_overlayPos * u_resolution;
            vec2 diff = pos - overlayCenter;

            // Determine brush size in pixels; brush size is relative to canvas width
            vec2 brushSizePixels = vec2(u_brushSize * u_resolution.x, (u_brushSize * u_resolution.x) / u_brushAspect);
            vec2 overlayUV = diff / brushSizePixels + vec2(0.5);

            if (overlayUV.x >= 0.0 && overlayUV.x <= 1.0 &&
                overlayUV.y >= 0.0 && overlayUV.y <= 1.0) {
                vec4 overlayColor = texture2D(u_overlay, overlayUV);
                gl_FragColor = mix(baseColor, overlayColor, overlayColor.a);
            } else {
                gl_FragColor = baseColor;
            }
        }
    `;

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    if (!vertexShader || !fragmentShader) {
        console.error("Failed to create shaders.");
        return;
    }

    program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error("Program link error:", gl.getProgramInfoLog(program));
        return;
    }
    gl.useProgram(program);

    positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -1, -1,  1, -1,  -1, 1,
        -1, 1,  1, -1,  1, 1,
    ]), gl.STATIC_DRAW);

    texCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        0, 1,  1, 1,  0, 0,
        0, 0,  1, 1,  1, 0,
    ]), gl.STATIC_DRAW);
}

let brushAspect = 1; // Aspect ratio of the brush

function createTexture(image, isOverlay = false) {
    if (!image) {
        console.error("Image is null or undefined.");
        return;
    }

    let tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    if (isOverlay) {
        overlayTexture = tex;
        brushAspect = image.width / image.height; // Store brush aspect ratio
    } else {
        texture = tex;
    }

    drawScene();
}

function updateCanvasSize(image) {
    if (!image) return;
    
    const windowAspect = window.innerWidth / window.innerHeight;
    imageAspect = image.width / image.height;

    if (imageAspect > windowAspect) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerWidth / imageAspect;
    } else {
        canvas.height = window.innerHeight;
        canvas.width = window.innerHeight * imageAspect;
    }

    gl.viewport(0, 0, canvas.width, canvas.height);
    
    drawScene();
}

let brushSize = 0.2;

document.addEventListener("keydown", (event) => {
    if (event.key === "[") {
        brushSize = Math.max(0.05, brushSize - 0.02);
    } else if (event.key === "]") {
        brushSize = Math.min(1.0, brushSize + 0.02);
    }
    drawScene();
});

function drawScene() {
    if (!texture || !overlayTexture) {
        return;
    }

    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(program);

    const positionLocation = gl.getAttribLocation(program, "a_position");
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    const texCoordLocation = gl.getAttribLocation(program, "a_texCoord");
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.enableVertexAttribArray(texCoordLocation);
    gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 0, 0);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(gl.getUniformLocation(program, "u_texture"), 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, overlayTexture);
    gl.uniform1i(gl.getUniformLocation(program, "u_overlay"), 1);

    let overlayPosLocation = gl.getUniformLocation(program, "u_overlayPos");
    gl.uniform2f(overlayPosLocation, overlayPosition[0], overlayPosition[1]);

    let brushSizeLocation = gl.getUniformLocation(program, "u_brushSize");
    gl.uniform1f(brushSizeLocation, brushSize);

    let brushAspectLocation = gl.getUniformLocation(program, "u_brushAspect");
    gl.uniform1f(brushAspectLocation, brushAspect);

    // Pass the canvas resolution (in pixels) to the shader
    let resolutionLocation = gl.getUniformLocation(program, "u_resolution");
    gl.uniform2f(resolutionLocation, canvas.width, canvas.height);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
    requestAnimationFrame(drawScene);
}

function mapMouseToCanvas(event) {
    const rect = canvas.getBoundingClientRect();

    let scaleX = canvas.width / rect.width;
    let scaleY = canvas.height / rect.height;

    let x = ((event.clientX - rect.left) * scaleX / canvas.width);
    let y = ((event.clientY - rect.top) * scaleY / canvas.height);

    overlayPosition = [x, y];
}

canvas.addEventListener("mousemove", mapMouseToCanvas);

canvas.addEventListener("touchstart", (event) => {
    event.preventDefault();
    mapMouseToCanvas(event.touches[0]);
});

canvas.addEventListener("touchmove", (event) => {
    event.preventDefault();
    mapMouseToCanvas(event.touches[0]);
});

window.addEventListener("resize", () => {
    if (currentImage) updateCanvasSize(currentImage);
});

function loadDefaultImage() {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
        currentImage = img; // Store the current image
        updateCanvasSize(img);
        createTexture(img);
    };
    img.onerror = () => console.error("Failed to load default image.");
    img.src = "images/image1.png";
}

function loadOverlayImage() {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
        createTexture(img, true);
    };
    img.onerror = () => console.error("Failed to load overlay image.");
    img.src = "images/brushes/2.png";
}

initGL();
loadDefaultImage();
loadOverlayImage();
