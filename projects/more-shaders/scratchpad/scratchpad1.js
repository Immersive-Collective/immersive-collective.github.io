const canvas = document.getElementById("glCanvas");
const gl = canvas.getContext("webgl");
const imageLoader = document.getElementById("imageLoader");

let texture, overlayTexture, program, positionBuffer, texCoordBuffer, imageAspect;
let overlayPosition = [0, 0];
let canvasSize = { width: 1, height: 1 };

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

    const fragmentShaderSource = `
        precision mediump float;
        varying vec2 v_texCoord;
        uniform sampler2D u_texture;
        uniform sampler2D u_overlay;
        uniform vec2 u_overlayPos;
        
        void main() {
            vec4 baseColor = texture2D(u_texture, v_texCoord);
            vec2 overlayUV = v_texCoord - u_overlayPos + vec2(0.1, 0.1); 
            
            if (overlayUV.x >= 0.0 && overlayUV.x <= 0.2 &&
                overlayUV.y >= 0.0 && overlayUV.y <= 0.2) {
                vec4 overlayColor = texture2D(u_overlay, overlayUV * 5.0);
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

    canvasSize.width = canvas.width;
    canvasSize.height = canvas.height;
    
    gl.viewport(0, 0, canvas.width, canvas.height);
    drawScene();
}

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

window.addEventListener("resize", () => {
    if (imageAspect) updateCanvasSize(texture);
});

function loadDefaultImage() {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
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
