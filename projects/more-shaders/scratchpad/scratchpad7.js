const canvas = document.getElementById("glCanvas");

const gl = canvas.getContext("webgl2", { alpha: true });

const imageLoader = document.getElementById("imageLoader");
const colorPicker = document.getElementById("colorPicker");

//–– Brush switching ––
// List of brush image URLs and storage for loaded textures/aspect ratios.
const brushFiles = ["images/brushes/0.png", "images/brushes/5.png","images/brushes/1.png", "images/brushes/2.png", "images/brushes/3.png", "images/brushes/4.png"];
let brushTextures = [];
let brushAspects = [];
let currentBrushIndex = 0;

//–– Global textures ––
// The background image texture.
let texture = null;
// The currently active brush texture.
let overlayTexture = null;
let brushAspect = 1; // width/height of the current brush

//–– Global image & canvas sizing ––
let imageAspect = 1;
let currentImage = null;

//–– Persistent paint layer (accumulates brush strokes) ––
let paintFBO;
let paintTexture;

//–– Shader programs ––
// quadProgram: draws a full-screen quad with a texture
let quadProgram;
// paintProgram: draws a brush quad that outputs tinted paint using the brush alpha
let paintProgram;
// overlayProgram: draws the brush preview tinted with the selected color
let overlayProgram;

let brushSize = 0.1; // normalized to canvas width
let overlayPosition = [0, 0]; // normalized [x,y] (0–1)

let isDrawing = false;

// The tint color (RGBA as floats, default black)
let tintColor = [0, 0, 0, 1];

/// HELPER: Convert a hex color string (e.g. "#ff0000") to [r,g,b,a] with components in 0..1.
function hexToRGBA(hex) {
  if (hex.charAt(0) === "#") hex = hex.substr(1);
  if (hex.length === 3) hex = hex.split("").map(c => c + c).join("");
  let intVal = parseInt(hex, 16);
  let r = ((intVal >> 16) & 255) / 255;
  let g = ((intVal >> 8) & 255) / 255;
  let b = (intVal & 255) / 255;
  return [r, g, b, 1.0];
}

// Update tintColor when user selects a new color.
colorPicker.addEventListener("input", (e) => {
  tintColor = hexToRGBA(e.target.value);
  drawScene();
});


//–––––––––––––––––––
// SHADER COMPILATION UTILS
//–––––––––––––––––––
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

function createProgram(gl, vertexSource, fragmentSource) {
  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  if (!vertexShader || !fragmentShader) return null;
  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error("Program link error:", gl.getProgramInfoLog(program));
    return null;
  }
  return program;
}

//–––––––––––––––––––
// SHADERS
//–––––––––––––––––––

// Vertex shader for full-screen quads and brush quads (positions in pixel space)
const quadVS = `
  attribute vec2 a_position;
  attribute vec2 a_texCoord;
  uniform vec2 u_resolution;
  uniform float u_flipY; // set to 1.0 for no flip; -1.0 for normal flip
  varying vec2 v_texCoord;
  void main() {
    vec2 zeroToOne = a_position / u_resolution;
    vec2 clipSpace = zeroToOne * 2.0 - 1.0;
    gl_Position = vec4(clipSpace.x, clipSpace.y * u_flipY, 0, 1);
    v_texCoord = a_texCoord;
  }
`;

// Fragment shader for drawing a texture (used for background and the paint layer)
const quadFS = `
  precision mediump float;
  varying vec2 v_texCoord;
  uniform sampler2D u_texture;
  void main() {
    gl_FragColor = texture2D(u_texture, v_texCoord);
  }
`;

// Fragment shader for drawing a brush stroke to the paint layer.
// Now uses u_tint to tint the painted stroke.
const paintFS = `
  precision mediump float;
  varying vec2 v_texCoord;
  uniform sampler2D u_brush;
  uniform vec4 u_tint;
  void main() {
    vec4 brushColor = texture2D(u_brush, v_texCoord);
    gl_FragColor = vec4(u_tint.rgb, brushColor.a);
  }
`;

// Fragment shader for drawing the brush overlay (preview) tinted.
const overlayFS = `
  precision mediump float;
  varying vec2 v_texCoord;
  uniform sampler2D u_brush;
  uniform vec4 u_tint;
  void main() {
    vec4 brushColor = texture2D(u_brush, v_texCoord);
    gl_FragColor = vec4(u_tint.rgb, brushColor.a);
  }
`;

//–––––––––––––––––––
// INITIALIZATION
//–––––––––––––––––––
function initGL() {
  if (!gl) {
    console.error("WebGL not supported.");
    return;
  }
  quadProgram = createProgram(gl, quadVS, quadFS);
  paintProgram = createProgram(gl, quadVS, paintFS);
  overlayProgram = createProgram(gl, quadVS, overlayFS);
}

// Create (or recreate) the persistent paint layer matching canvas size.
function initPaintLayer() {
  if (paintTexture) { gl.deleteTexture(paintTexture); paintTexture = null; }
  if (paintFBO) { gl.deleteFramebuffer(paintFBO); paintFBO = null; }
  paintTexture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, paintTexture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, canvas.width, canvas.height,
                0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  paintFBO = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, paintFBO);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, paintTexture, 0);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

//–––––––––––––––––––
// IMAGE & BRUSH LOADING
//–––––––––––––––––––

// Load a texture from an image. For background images, no flip; for brushes, flip Y and pre-multiply alpha.
function createTextureFromImage(image, isOverlay = false) {
  if (!image) { console.error("Image is null or undefined."); return; }
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  if (isOverlay) {
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
  } else {
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  }
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  if (isOverlay) { 
    overlayTexture = tex;
    brushAspect = image.width / image.height;
  } else {
    texture = tex;
  }
  drawScene();
}

// function loadDefaultImage() {
//   const img = new Image();
//   img.crossOrigin = "anonymous";
//   img.onload = () => {
//     currentImage = img;
//     updateCanvasSize(img);
//     createTextureFromImage(img);
//   };
//   img.onerror = () => console.error("Failed to load default image.");
//   img.src = "images/image1.png";
// }


function initPaintLayerFixed() {
  if (paintTexture) { gl.deleteTexture(paintTexture); paintTexture = null; }
  if (paintFBO) { gl.deleteFramebuffer(paintFBO); paintFBO = null; }
  paintTexture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, paintTexture);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    fixedFBOWidth,
    fixedFBOHeight,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    null
  );
  // Use NEAREST filtering to ensure a 1:1 copy.
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  paintFBO = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, paintFBO);
  gl.framebufferTexture2D(
    gl.FRAMEBUFFER,
    gl.COLOR_ATTACHMENT0,
    gl.TEXTURE_2D,
    paintTexture,
    0
  );
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}


function loadDefaultImage() {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => {
    currentImage = img;
    // Set the fixed resolution to the image's dimensions.
    fixedFBOWidth = img.width;
    fixedFBOHeight = img.height;
    // Initialize the persistent paint layer with fixed dimensions.
    initPaintLayerFixed();
    // Update the canvas size (this scales the view but the FBO remains at the image's size).
    updateCanvasSize(img);
    createTextureFromImage(img);
  };
  img.onerror = () => console.error("Failed to load default image.");
  img.src = "images/image1.png";
}


function loadBrushes() {
  brushFiles.forEach((brushUrl, index) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      brushTextures[index] = tex;
      brushAspects[index] = img.width / img.height;
      if (index === 0) {
        overlayTexture = tex;
        brushAspect = img.width / img.height;
      }
      drawScene();
    };
    img.onerror = () => console.error("Failed to load brush image:", brushUrl);
    img.src = brushUrl;
  });
}

//–––––––––––––––––––
// CANVAS RESIZING
//–––––––––––––––––––

function updateCanvasSize(image) {
  if (!image) return;

  // Compute new canvas dimensions (for display) based on the window and image.
  const windowAspect = window.innerWidth / window.innerHeight;
  imageAspect = image.width / image.height;
  let newWidth, newHeight;
  if (imageAspect > windowAspect) {
    newWidth = window.innerWidth;
    newHeight = window.innerWidth / imageAspect;
  } else {
    newHeight = window.innerHeight;
    newWidth = window.innerHeight * imageAspect;
  }

  // Save the current paint layer FBO/texture.
  const oldPaintFBO = paintFBO;
  const oldPaintTexture = paintTexture;

  // Update the canvas size and viewport.
  canvas.width = newWidth;
  canvas.height = newHeight;
  gl.viewport(0, 0, newWidth, newHeight);

  // Create a new paint texture and FBO at the fixed (loaded image) resolution.
  const newPaintTexture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, newPaintTexture);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    fixedFBOWidth,
    fixedFBOHeight,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    null
  );
  // Use NEAREST to avoid interpolation
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  const newPaintFBO = gl.createFramebuffer();
  gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, newPaintFBO);
  gl.framebufferTexture2D(
    gl.DRAW_FRAMEBUFFER,
    gl.COLOR_ATTACHMENT0,
    gl.TEXTURE_2D,
    newPaintTexture,
    0
  );

  // If an old paint layer exists, copy it 1:1 using GPU-side blit.
  if (oldPaintFBO && fixedFBOWidth > 0 && fixedFBOHeight > 0) {
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, oldPaintFBO);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, newPaintFBO);
    gl.blitFramebuffer(
      0, 0, fixedFBOWidth, fixedFBOHeight, // source: fixed space
      0, 0, fixedFBOWidth, fixedFBOHeight, // destination: fixed space
      gl.COLOR_BUFFER_BIT,
      gl.NEAREST
    );
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
    gl.deleteTexture(oldPaintTexture);
    gl.deleteFramebuffer(oldPaintFBO);
  }
  gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);

  // Update global paint layer references.
  paintTexture = newPaintTexture;
  paintFBO = newPaintFBO;

  drawScene();
}


window.addEventListener("resize", () => {
  if (currentImage) updateCanvasSize(currentImage);
});

//–––––––––––––––––––
// MOUSE/TOUCH HANDLING
//–––––––––––––––––––
function getMousePos(event) {
  const rect = canvas.getBoundingClientRect();
  let x, y;
  if (event.offsetX !== undefined && event.offsetY !== undefined) {
    x = event.offsetX;
    y = event.offsetY;
  } else {
    x = (event.clientX - rect.left) * (canvas.width / rect.width);
    y = (event.clientY - rect.top) * (canvas.height / rect.height);
  }
  return { x, y };
}

canvas.addEventListener("mousedown", (event) => {
  isDrawing = true;
  const pos = getMousePos(event);
  overlayPosition = [pos.x / canvas.width, pos.y / canvas.height];
  drawBrushStrokeToPaintLayer(pos.x, pos.y);
});


canvas.addEventListener("mousemove", (event) => {
  const pos = getMousePos(event);
  // If we already have a previous position, update the angle.
  if (lastX !== null && lastY !== null) {
    const dx = pos.x - lastX;
    const dy = pos.y - lastY;
    if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
      currentAngle = Math.atan2(dy, dx);
    }
  }
  // Update lastX/lastY regardless of painting state.
  lastX = pos.x;
  lastY = pos.y;
  
  // Update the brush overlay position.
  overlayPosition = [pos.x / canvas.width, pos.y / canvas.height];
  
  // If painting, draw the stroke.
  if (isDrawing) {
    drawBrushStrokeToPaintLayer(pos.x, pos.y);
  }
});



canvas.addEventListener("mouseup", () => { isDrawing = false; });
canvas.addEventListener("mouseleave", () => { isDrawing = false; });

canvas.addEventListener("touchstart", (event) => {
  event.preventDefault();
  const pos = getMousePos(event.touches[0]);
  isDrawing = true;
  overlayPosition = [pos.x / canvas.width, pos.y / canvas.height];
  drawBrushStrokeToPaintLayer(pos.x, pos.y);
});

canvas.addEventListener("touchmove", (event) => {
  event.preventDefault();
  const pos = getMousePos(event.touches[0]);
  if (lastX !== null && lastY !== null) {
    const dx = pos.x - lastX;
    const dy = pos.y - lastY;
    if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
      currentAngle = Math.atan2(dy, dx);
    }
  }
  lastX = pos.x;
  lastY = pos.y;
  overlayPosition = [pos.x / canvas.width, pos.y / canvas.height];
  if (isDrawing) {
    drawBrushStrokeToPaintLayer(pos.x, pos.y);
  }
});


canvas.addEventListener("touchend", () => { isDrawing = false; });

//–––––––––––––––––––
// BRUSH SWITCHING (keys 1,2,3 …)
//–––––––––––––––––––
document.addEventListener("keydown", (event) => {
  if (event.key === "[") {
    brushSize = Math.max(0.01, brushSize - 0.02);
  } else if (event.key === "]") {
    brushSize = Math.min(1.0, brushSize + 0.02);
  } else if (!isNaN(event.key)) {
    let index = parseInt(event.key) - 1;
    if (index >= 0 && index < brushTextures.length) {
      currentBrushIndex = index;
      overlayTexture = brushTextures[index];
      brushAspect = brushAspects[index];
    }
  }
  drawScene();
});

//–––––––––––––––––––
// DRAWING FUNCTIONS
//–––––––––––––––––––

// Draw a brush stroke into the persistent paint layer (offscreen).
// x and y are in pixel coordinates (with (0,0) at top left).


let lastX = null, lastY = null;
let currentAngle = 0;


function drawBrushStrokeToPaintLayer(x, y) {
  // Convert canvas coordinates (x, y) to fixed-space coordinates.
  const scaleX = fixedFBOWidth / canvas.width;
  const scaleY = fixedFBOHeight / canvas.height;
  const fx = x * scaleX;
  const fy = y * scaleY;

  // Update dynamic rotation using canvas coordinates.
  if (lastX !== null && lastY !== null) {
    const dx = x - lastX;
    const dy = y - lastY;
    if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
      currentAngle = Math.atan2(dy, dx);
    }
  }
  lastX = x;
  lastY = y;

  // Bind the fixed-resolution FBO.
  gl.bindFramebuffer(gl.FRAMEBUFFER, paintFBO);
  gl.viewport(0, 0, fixedFBOWidth, fixedFBOHeight);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.useProgram(paintProgram);

  // In the FBO pass, do not flip Y.
  let flipLoc = gl.getUniformLocation(paintProgram, "u_flipY");
  gl.uniform1f(flipLoc, 1.0);
  let resLoc = gl.getUniformLocation(paintProgram, "u_resolution");
  gl.uniform2f(resLoc, fixedFBOWidth, fixedFBOHeight);
  let tintLoc = gl.getUniformLocation(paintProgram, "u_tint");
  gl.uniform4fv(tintLoc, tintColor);

  // Compute brush quad dimensions in fixed-space.
  const brushW = brushSize * fixedFBOWidth;
  const brushH = brushW / brushAspect;
  const halfW = brushW / 2;
  const halfH = brushH / 2;

  // Define the four corner offsets (unrotated).
  const offsets = [
    { x: -halfW, y: -halfH },
    { x:  halfW, y: -halfH },
    { x: -halfW, y:  halfH },
    { x:  halfW, y:  halfH }
  ];
  const cosA = Math.cos(currentAngle);
  const sinA = Math.sin(currentAngle);
  function rotateOffset(off) {
    return {
      x: off.x * cosA - off.y * sinA,
      y: off.x * sinA + off.y * cosA
    };
  }
  const rotated = offsets.map(rotateOffset);
  // Compute final vertices in fixed-space using (fx, fy) as the center.
  const v0 = { x: fx + rotated[0].x, y: fy + rotated[0].y };
  const v1 = { x: fx + rotated[1].x, y: fy + rotated[1].y };
  const v2 = { x: fx + rotated[2].x, y: fy + rotated[2].y };
  const v3 = { x: fx + rotated[3].x, y: fy + rotated[3].y };

  const vertices = new Float32Array([
    v0.x, v0.y, 0, 0,
    v1.x, v1.y, 1, 0,
    v2.x, v2.y, 0, 1,
    v2.x, v2.y, 0, 1,
    v1.x, v1.y, 1, 0,
    v3.x, v3.y, 1, 1
  ]);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STREAM_DRAW);

  let posLoc = gl.getAttribLocation(paintProgram, "a_position");
  gl.enableVertexAttribArray(posLoc);
  gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 16, 0);
  let texLoc = gl.getAttribLocation(paintProgram, "a_texCoord");
  gl.enableVertexAttribArray(texLoc);
  gl.vertexAttribPointer(texLoc, 2, gl.FLOAT, false, 16, 8);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, overlayTexture);
  const brushUniform = gl.getUniformLocation(paintProgram, "u_brush");
  gl.uniform1i(brushUniform, 0);

  gl.drawArrays(gl.TRIANGLES, 0, 6);
  gl.deleteBuffer(buffer);
  gl.disableVertexAttribArray(posLoc);
  gl.disableVertexAttribArray(texLoc);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}



function drawBrushOverlay() {
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.useProgram(overlayProgram);

  // When drawing to screen, flip Y.
  let flipLoc = gl.getUniformLocation(overlayProgram, "u_flipY");
  gl.uniform1f(flipLoc, -1.0);
  let resLoc = gl.getUniformLocation(overlayProgram, "u_resolution");
  gl.uniform2f(resLoc, canvas.width, canvas.height);
  let tintLoc = gl.getUniformLocation(overlayProgram, "u_tint");
  gl.uniform4fv(tintLoc, tintColor);

  // Use the same rotation as the last computed currentAngle.
  const posX = overlayPosition[0] * canvas.width;
  const posY = overlayPosition[1] * canvas.height;
  const brushW = brushSize * canvas.width;
  const brushH = brushW / brushAspect;
  const halfW = brushW / 2;
  const halfH = brushH / 2;
  const offsets = [
    { x: -halfW, y: -halfH },
    { x:  halfW, y: -halfH },
    { x: -halfW, y:  halfH },
    { x:  halfW, y:  halfH }
  ];
  const cosA = Math.cos(currentAngle);
  const sinA = Math.sin(currentAngle);
  function rotateOffset(off) {
    return {
      x: off.x * cosA - off.y * sinA,
      y: off.x * sinA + off.y * cosA
    };
  }
  const rotated = offsets.map(rotateOffset);
  const v0 = { x: posX + rotated[0].x, y: posY + rotated[0].y };
  const v1 = { x: posX + rotated[1].x, y: posY + rotated[1].y };
  const v2 = { x: posX + rotated[2].x, y: posY + rotated[2].y };
  const v3 = { x: posX + rotated[3].x, y: posY + rotated[3].y };

  const vertices = new Float32Array([
    v0.x, v0.y, 0, 0,
    v1.x, v1.y, 1, 0,
    v2.x, v2.y, 0, 1,
    v2.x, v2.y, 0, 1,
    v1.x, v1.y, 1, 0,
    v3.x, v3.y, 1, 1
  ]);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STREAM_DRAW);

  let posLocOverlay = gl.getAttribLocation(overlayProgram, "a_position");
  gl.enableVertexAttribArray(posLocOverlay);
  gl.vertexAttribPointer(posLocOverlay, 2, gl.FLOAT, false, 16, 0);
  let texLocOverlay = gl.getAttribLocation(overlayProgram, "a_texCoord");
  gl.enableVertexAttribArray(texLocOverlay);
  gl.vertexAttribPointer(texLocOverlay, 2, gl.FLOAT, false, 16, 8);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, overlayTexture);
  const brushUniform = gl.getUniformLocation(overlayProgram, "u_brush");
  gl.uniform1i(brushUniform, 0);

  gl.drawArrays(gl.TRIANGLES, 0, 6);
  gl.deleteBuffer(buffer);
  gl.disableVertexAttribArray(posLocOverlay);
  gl.disableVertexAttribArray(texLocOverlay);
}

function drawScene() {
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(1, 1, 1, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  
  //–– Draw background image using quadProgram.
  gl.useProgram(quadProgram);
  let flipLoc = gl.getUniformLocation(quadProgram, "u_flipY");
  gl.uniform1f(flipLoc, -1.0); // apply vertical flip for screen drawing
  let resLoc = gl.getUniformLocation(quadProgram, "u_resolution");
  gl.uniform2f(resLoc, canvas.width, canvas.height);
  const quadVertices = new Float32Array([
    0, 0,              0, 0,
    canvas.width, 0,   1, 0,
    0, canvas.height,  0, 1,
    0, canvas.height,  0, 1,
    canvas.width, 0,   1, 0,
    canvas.width, canvas.height,  1, 1
  ]);
  let buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, quadVertices, gl.STATIC_DRAW);
  let posLoc = gl.getAttribLocation(quadProgram, "a_position");
  gl.enableVertexAttribArray(posLoc);
  gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 16, 0);
  let texLoc = gl.getAttribLocation(quadProgram, "a_texCoord");
  gl.enableVertexAttribArray(texLoc);
  gl.vertexAttribPointer(texLoc, 2, gl.FLOAT, false, 16, 8);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  const texUniform = gl.getUniformLocation(quadProgram, "u_texture");
  gl.uniform1i(texUniform, 0);
  gl.drawArrays(gl.TRIANGLES, 0, 6);
  gl.deleteBuffer(buffer);
  
  //–– Draw the persistent paint layer (FBO texture) on top.
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.useProgram(quadProgram);
  flipLoc = gl.getUniformLocation(quadProgram, "u_flipY");
  gl.uniform1f(flipLoc, -1.0);
  buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, quadVertices, gl.STATIC_DRAW);
  posLoc = gl.getAttribLocation(quadProgram, "a_position");
  gl.enableVertexAttribArray(posLoc);
  gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 16, 0);
  texLoc = gl.getAttribLocation(quadProgram, "a_texCoord");
  gl.enableVertexAttribArray(texLoc);
  gl.vertexAttribPointer(texLoc, 2, gl.FLOAT, false, 16, 8);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, paintTexture);
  gl.uniform1i(texUniform, 0);
  gl.drawArrays(gl.TRIANGLES, 0, 6);
  gl.deleteBuffer(buffer);
  gl.disable(gl.BLEND);
  
  //–– Draw the brush overlay (preview) using overlayProgram.
  gl.useProgram(overlayProgram);
  flipLoc = gl.getUniformLocation(overlayProgram, "u_flipY");
  gl.uniform1f(flipLoc, -1.0);
  resLoc = gl.getUniformLocation(overlayProgram, "u_resolution");
  gl.uniform2f(resLoc, canvas.width, canvas.height);
  drawBrushOverlay();
  
  requestAnimationFrame(drawScene);
}

//–––––––––––––––––––
// FILE LOADER (for background image)
//–––––––––––––––––––
imageLoader.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        currentImage = img;
        updateCanvasSize(img);
        createTextureFromImage(img);
      };
      img.onerror = () => console.error("Failed to load selected image.");
      img.src = e.target.result;
    };
    reader.onerror = () => console.error("Failed to read file.");
    reader.readAsDataURL(file);
  }
});

//–––––––––––––––––––
// INITIALIZE & START
//–––––––––––––––––––
initGL();
loadDefaultImage();
loadBrushes();
drawScene();
