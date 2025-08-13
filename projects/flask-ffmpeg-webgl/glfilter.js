// node glfilter.js <width> <height> <fps> <frag_path>
const fs = require('fs');
const createGL = require('gl');

const W = +process.argv[2] || 720;
const H = +process.argv[3] || 1280;
const FPS = +process.argv[4] || 120;
const FRAG_PATH = process.argv[5] || null;
const BYTES = W * H * 4;

const PARAMS = (() => {
  try { return JSON.parse(process.env.GL_PARAMS_JSON || "{}"); }
  catch { return {}; }
})();

const gl = createGL(W, H, { preserveDrawingBuffer: true });
if (!gl) { console.error('Failed to create WebGL context'); process.exit(1); }

const vs = `
attribute vec2 aPos; varying vec2 vUV;
void main(){ vUV=0.5*(aPos+1.0); gl_Position=vec4(aPos,0.0,1.0); }`;

let fsSource;
if (FRAG_PATH && fs.existsSync(FRAG_PATH)) {
  fsSource = fs.readFileSync(FRAG_PATH, 'utf8');
} else {
  // fallback default shader
  fsSource = `
precision mediump float; varying vec2 vUV;
uniform sampler2D uTex; uniform float uTime;
uniform float warpAmp; uniform float chroma; uniform float grain; uniform float flicker;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
float noise(vec2 p){ vec2 i=floor(p),f=fract(p);
  float a=hash(i),b=hash(i+vec2(1.,0.)),c=hash(i+vec2(0.,1.)),d=hash(i+vec2(1.,1.));
  vec2 u=f*f*(3.-2.*f); return mix(mix(a,b,u.x),mix(c,d,u.x),u.y); }
void main(){
  vec2 uv=vUV; float t=uTime;
  float w = warpAmp*(sin(6.2831*(uv.y*2.0 + t*0.9)) + 0.6*sin(6.2831*(uv.x*3.0 - t*1.3)));
  uv += vec2(w,-w);
  vec2 cs = chroma * vec2(0.0025*sin(t*1.7), -0.0025*cos(t*1.1));
  vec3 col;
  col.r = texture2D(uTex, uv+cs).r;
  col.g = texture2D(uTex, uv).g;
  col.b = texture2D(uTex, uv-cs).b;
  float g = (noise(uv*1024.0 + t*60.0) - 0.5) * grain;
  float fl = flicker * sin(t*9.0 + uv.x*20.0);
  col += g + fl;
  gl_FragColor = vec4(clamp(col,0.0,1.0),1.0);
}`.trim();
}

function compile(type, src){
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPLETE_STATUS) && !gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(s)); process.exit(1);
  }
  return s;
}
const prog = gl.createProgram();
gl.attachShader(prog, compile(gl.VERTEX_SHADER, vs));
gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, fsSource));
gl.linkProgram(prog);
if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
  console.error(gl.getProgramInfoLog(prog)); process.exit(1);
}
gl.useProgram(prog);

// quad
const quad = new Float32Array([-1,-1, 1,-1, -1,1,  -1,1, 1,-1, 1,1]);
const vbo = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);
const aPos = gl.getAttribLocation(prog, 'aPos'); gl.enableVertexAttribArray(aPos);
gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

// texture + uniforms
const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
const uTex = gl.getUniformLocation(prog, 'uTex');
const uTime = gl.getUniformLocation(prog, 'uTime');
gl.uniform1i(uTex, 0);

// optional param uniforms
const uniformCache = {};
for (const k of Object.keys(PARAMS)) {
  uniformCache[k] = gl.getUniformLocation(prog, k);
}

let t = 0, dt = 1 / FPS;
const OUT = Buffer.allocUnsafe(BYTES);

function setParams(){
  for (const [k, v] of Object.entries(PARAMS)) {
    const loc = uniformCache[k];
    if (!loc) continue;
    if (typeof v === 'number') gl.uniform1f(loc, v);
    else if (Array.isArray(v)) {
      if (v.length === 2) gl.uniform2f(loc, v[0], v[1]);
      else if (v.length === 3) gl.uniform3f(loc, v[0], v[1], v[2]);
      else if (v.length === 4) gl.uniform4f(loc, v[0], v[1], v[2], v[3]);
    }
  }
}
setParams();

process.stdin.on('readable', () => {
  while (true) {
    const chunk = process.stdin.read(BYTES);
    if (!chunk) break;

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, W, H, 0, gl.RGBA, gl.UNSIGNED_BYTE, chunk);

    gl.viewport(0, 0, W, H);
    gl.uniform1f(uTime, t);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, OUT);
    process.stdout.write(OUT);

    t += dt;
  }
});
process.stdin.on('end', () => process.stdout.end());
