import GUI from "https://cdn.jsdelivr.net/npm/lil-gui@0.20/+esm";

const DEFAULT_PRESET_URL = new URL("settings-20251217-113747.json", import.meta.url).toString();


const canvas = document.getElementById("c");
const gl = canvas.getContext("webgl2", {
  alpha: false,
  antialias: false,
  depth: false,
  stencil: false,
  premultipliedAlpha: false,
  preserveDrawingBuffer: false,
});

function fatal(message, detail) {
  console.error("[ink] FATAL:", message, detail ?? "");
  document.body.style.margin = "0";
  document.body.style.background = "#05060a";
  document.body.innerHTML =
    `<div style="color:#fff;font:14px ui-monospace;padding:16px;white-space:pre-wrap;">${message}\n\n${detail ? String(detail) : ""}</div>`;
  throw new Error(message);
}

if (!gl) fatal("WebGL2 is required.");

const extCBF = gl.getExtension("EXT_color_buffer_float");
const extLin = gl.getExtension("OES_texture_float_linear");
if (!extCBF) fatal("EXT_color_buffer_float is required.");

gl.disable(gl.BLEND);
gl.disable(gl.DEPTH_TEST);
gl.disable(gl.CULL_FACE);
gl.disable(gl.SCISSOR_TEST);

const STORAGE_LAST = "ink:lastSettings:v1";
const IDB_NAME = "ink-presets";
const IDB_STORE = "presets";
const IDB_VERSION = 1;

const params = {
  paused: false,
  debug: true,

  timeScale: 1.0,
  dtMax: 0.020,

  quality: 0.70,

  exposure: 1.10,
  dyeGain: 2.10,
  background: 0.06,

  baseScale: 2.2,
  baseStrength: 0.14,
  baseDrift: 0.06,
  turbulence: 0.55,

  forceStrength: 0.55,
  forceDissipation: 0.9965,
  forceDiffusion: 0.10,
  maxVel: 0.75,

  dyeDissipation: 0.9986,
  dyeDiffusion: 0.12,
  fade: 0.9994,

  radius: 0.0001,
  dyeAmount: 2.6,
  pushGain: 0.12,
  swirlGain: 0.75,

  emitters: 3,
  emitterRate: 1.0,
  emitterPush: 0.06,
  emitterSwirl: 0.35,

  reset: () => reset(true),
};

function nowStamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return (
    d.getFullYear() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    "-" +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds())
  );
}

function safeCloneSettings(src) {
  const out = {};
  for (const k of Object.keys(src)) {
    const v = src[k];
    if (typeof v === "number" || typeof v === "boolean" || typeof v === "string") out[k] = v;
  }
  return out;
}

let persistBlocked = false;
let persistTimer = 0;

function persistLastDebounced() {
  if (persistBlocked) return;
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    persistTimer = 0;
    if (persistBlocked) return;
    try {
      const payload = {
        v: 1,
        savedAt: Date.now(),
        settings: safeCloneSettings(params),
      };
      localStorage.setItem(STORAGE_LAST, JSON.stringify(payload));
      if (params.debug) console.info("[ink] settings persisted (localStorage)");
    } catch (e) {
      console.warn("[ink] persist failed", e);
    }
  }, 200);
}








async function loadDefaultPresetIntoParams() {
  try {
    const res = await fetch(DEFAULT_PRESET_URL, { cache: "no-store" });
    if (!res.ok) return false;

    const json = await res.json();
    if (!json || typeof json !== "object") return false;

    const settings = json.settings && typeof json.settings === "object" ? json.settings : json;
    if (!settings || typeof settings !== "object") return false;

    applySettings(settings, { rebuild: false, log: true, persist: false });
    if (params.debug) console.info("[ink] default preset loaded", DEFAULT_PRESET_URL);
    return true;
  } catch (e) {
    console.warn("[ink] default preset load failed", e);
    return false;
  }
}

function loadLastIntoParams() {
  try {
    const raw = localStorage.getItem(STORAGE_LAST);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || parsed.v !== 1 || !parsed.settings) return false;
    applySettings(parsed.settings, { rebuild: false, log: true, persist: false });
    return true;
  } catch (e) {
    console.warn("[ink] load last failed", e);
    return false;
  }
}

function applySettings(obj, { rebuild, log, persist } = {}) {
  if (!obj || typeof obj !== "object") return;

  const doRebuild = !!rebuild;
  const doLog = !!log;
  const doPersist = persist !== false;

  persistBlocked = true;
  try {
    for (const [k, v] of Object.entries(obj)) {
      if (!(k in params)) continue;
      const t = typeof params[k];
      if (t === "number" && typeof v === "number" && Number.isFinite(v)) params[k] = v;
      if (t === "boolean" && typeof v === "boolean") params[k] = v;
      if (t === "string" && typeof v === "string") params[k] = v;
    }
  } finally {
    persistBlocked = false;
  }

  refreshGuiDisplays();

  if (doRebuild) rebuildAndReset();
  if (!doRebuild && doPersist) persistLastDebounced();

  if (doLog) console.info("[ink] settings applied");
}






function downloadJson(obj, filename) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}



let importInput = null;

function sanitizePresetName(s) {
  const name = String(s ?? "").replace(/\.[a-z0-9]+$/i, "").trim();
  if (!name) return "";
  return name.replace(/\s+/g, " ").slice(0, 96);
}

function deriveImportedPresetName(json, fileName) {
  const candidates = [
    json && typeof json === "object" ? json.name : "",
    json && typeof json === "object" ? json.presetName : "",
    json && typeof json === "object" ? json.title : "",
    fileName || "",
  ];
  for (const c of candidates) {
    const n = sanitizePresetName(c);
    if (n) return n;
  }
  return `preset-${nowStamp()}`;
}

function ensureImportInput() {
  if (importInput) return importInput;

  importInput = document.createElement("input");
  importInput.type = "file";
  importInput.accept = "application/json,.json";
  importInput.style.position = "fixed";
  importInput.style.left = "-9999px";
  importInput.style.top = "-9999px";

  importInput.addEventListener("change", async () => {
    const file = importInput.files && importInput.files[0];
    importInput.value = "";
    if (!file) return;

    try {
      const text = await file.text();
      const json = JSON.parse(text);
      if (!json || typeof json !== "object") throw new Error("Invalid JSON");

      const settings = json.settings && typeof json.settings === "object" ? json.settings : json;
      if (!settings || typeof settings !== "object") throw new Error("Invalid settings");

      const baseName = deriveImportedPresetName(json, file.name);
      const name = await ensureUniquePresetName(baseName);

      applySettings(settings, { rebuild: true, log: true });

      await idbPutPreset(name, safeCloneSettings(params));
      presetState.selected = name;
      presetState.presetName = name;
      await refreshPresetList();
      refreshGuiDisplays();

      console.info("[ink] imported preset:", name);
    } catch (e) {
      console.error("[ink] import failed", e);
    }
  });

  document.body.appendChild(importInput);
  return importInput;
}





function idbOpen() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE, { keyPath: "name" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbPutPreset(name, settings) {
  const db = await idbOpen();
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readwrite");
      tx.onerror = () => reject(tx.error);
      const store = tx.objectStore(IDB_STORE);
      store.put({ name, savedAt: Date.now(), settings });
      tx.oncomplete = () => resolve();
    });
  } finally {
    db.close();
  }
}

async function idbGetPreset(name) {
  const db = await idbOpen();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readonly");
      tx.onerror = () => reject(tx.error);
      const store = tx.objectStore(IDB_STORE);
      const req = store.get(name);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

async function idbDeletePreset(name) {
  const db = await idbOpen();
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readwrite");
      tx.onerror = () => reject(tx.error);
      tx.objectStore(IDB_STORE).delete(name);
      tx.oncomplete = () => resolve();
    });
  } finally {
    db.close();
  }
}

async function idbListPresetNames() {
  const db = await idbOpen();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readonly");
      tx.onerror = () => reject(tx.error);
      const store = tx.objectStore(IDB_STORE);
      const req = store.getAllKeys();
      req.onsuccess = () => resolve((req.result || []).map(String).sort());
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

async function ensureUniquePresetName(baseName) {
  const base = sanitizePresetName(baseName) || `preset-${nowStamp()}`;
  let name = base;
  let i = 2;
  while (true) {
    const existing = await idbGetPreset(name);
    if (!existing) return name;
    name = `${base}-${i++}`;
  }
}


console.groupCollapsed("[ink] caps");
console.log("WebGL:", gl.getParameter(gl.VERSION));
console.log("GLSL:", gl.getParameter(gl.SHADING_LANGUAGE_VERSION));
console.log("Renderer:", gl.getParameter(gl.RENDERER));
console.log("EXT_color_buffer_float:", !!extCBF);
console.log("OES_texture_float_linear:", !!extLin);
console.groupEnd();

/* Fullscreen quad with explicit UVs. */
const quadVao = gl.createVertexArray();
gl.bindVertexArray(quadVao);

const quadVbo = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, quadVbo);
gl.bufferData(
  gl.ARRAY_BUFFER,
  new Float32Array([
    -1, -1, 0, 0,
     1, -1, 1, 0,
     1,  1, 1, 1,
    -1, -1, 0, 0,
     1,  1, 1, 1,
    -1,  1, 0, 1,
  ]),
  gl.STATIC_DRAW
);
gl.enableVertexAttribArray(0);
gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 16, 0);
gl.enableVertexAttribArray(1);
gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 16, 8);

gl.bindVertexArray(null);
gl.bindBuffer(gl.ARRAY_BUFFER, null);

function compileShader(type, source, label) {
  const s = gl.createShader(type);
  gl.shaderSource(s, source);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(s);
    console.error(`[ink] shader compile failed (${label}):\n`, log, "\n--- source ---\n", source);
    gl.deleteShader(s);
    fatal(`Shader compile failed: ${label}`, log);
  }
  return s;
}

function createProgram(vsSource, fsSource, label) {
  const p = gl.createProgram();
  gl.attachShader(p, compileShader(gl.VERTEX_SHADER, vsSource, `${label}:VS`));
  gl.attachShader(p, compileShader(gl.FRAGMENT_SHADER, fsSource, `${label}:FS`));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(p);
    console.error(`[ink] program link failed (${label}):\n`, log);
    gl.deleteProgram(p);
    fatal(`Program link failed: ${label}`, log);
  }
  return p;
}

function uLoc(p, name, label) {
  const loc = gl.getUniformLocation(p, name);
  if (loc === null) fatal(`Uniform not found: ${name} (${label})`);
  return loc;
}

function glCheck(label) {
  if (!params.debug) return;
  const err = gl.getError();
  if (err !== gl.NO_ERROR) console.warn("[ink] gl error", err, "during", label);
}

const VS = `#version 300 es
precision highp float;
layout(location=0) in vec2 aPos;
layout(location=1) in vec2 aUv;
out vec2 vUv;
void main() {
  vUv = aUv;
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

const FS_CLEAR = `#version 300 es
precision highp float;
out vec4 o;
uniform vec4 uColor;
void main(){ o = uColor; }
`;

const GLSL_NOISE = `
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash12(i);
  float b = hash12(i + vec2(1.0, 0.0));
  float c = hash12(i + vec2(0.0, 1.0));
  float d = hash12(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = m * p;
    a *= 0.5;
  }
  return v;
}
`;

const FS_ADVECT_FORCE = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 o;

uniform sampler2D uForce;
uniform vec2 texelSize;
uniform float dt;

uniform float baseScale;
uniform float baseStrength;
uniform float baseDrift;
uniform float turbulence;

uniform float forceStrength;
uniform float forceDissipation;
uniform float forceDiffusion;

uniform float maxVel;
uniform float time;
uniform float simAspect;

${GLSL_NOISE}

vec2 metricUv(vec2 uv) {
  if (simAspect > 1.0) {
    return vec2((uv.x - 0.5) * simAspect + 0.5, uv.y);
  }
  return vec2(uv.x, (uv.y - 0.5) / max(simAspect, 1e-6) + 0.5);
}

float psi(vec2 uv) {
  vec2 muv = metricUv(uv);
  vec2 p = muv * baseScale;
  p += vec2(0.07, -0.04) * time * baseDrift;
  float n = fbm(p);
  float m = fbm(p * 2.0 + 17.3);
  return mix(n, m, turbulence);
}

vec2 baseVel(vec2 uv) {
  float dx = texelSize.x;
  float dy = texelSize.y;

  float pL = psi(uv - vec2(dx, 0.0));
  float pR = psi(uv + vec2(dx, 0.0));
  float pB = psi(uv - vec2(0.0, dy));
  float pT = psi(uv + vec2(0.0, dy));

  float dpsidx = (pR - pL) / (2.0 * dx);
  float dpsidy = (pT - pB) / (2.0 * dy);

  return vec2(dpsidy, -dpsidx) * baseStrength;
}

void main() {
  vec2 fC = texture(uForce, vUv).xy;
  vec2 v = baseVel(vUv) + fC * forceStrength;

  float m = length(v);
  if (m > maxVel) v *= (maxVel / max(m, 1e-6));

  vec2 backUV = vUv - dt * v;
  vec2 lo = texelSize * 0.5;
  vec2 hi = vec2(1.0) - lo;
  backUV = clamp(backUV, lo, hi);

  vec2 adv = texture(uForce, backUV).xy * forceDissipation;

  vec2 L = texture(uForce, vUv - vec2(texelSize.x, 0.0)).xy;
  vec2 R = texture(uForce, vUv + vec2(texelSize.x, 0.0)).xy;
  vec2 B = texture(uForce, vUv - vec2(0.0, texelSize.y)).xy;
  vec2 T = texture(uForce, vUv + vec2(0.0, texelSize.y)).xy;
  vec2 lap = (L + R + B + T - 4.0 * fC);

  vec2 outF = adv + lap * forceDiffusion;
  o = vec4(outF, 0.0, 1.0);
}
`;


const FS_ADVECT_DYE = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 o;

uniform sampler2D uDye;
uniform sampler2D uForce;
uniform vec2 texelSize;
uniform float dt;

uniform float baseScale;
uniform float baseStrength;
uniform float baseDrift;
uniform float turbulence;

uniform float forceStrength;
uniform float dyeDissipation;
uniform float dyeDiffusion;
uniform float maxVel;
uniform float time;
uniform float simAspect;

${GLSL_NOISE}

vec2 metricUv(vec2 uv) {
  if (simAspect > 1.0) {
    return vec2((uv.x - 0.5) * simAspect + 0.5, uv.y);
  }
  return vec2(uv.x, (uv.y - 0.5) / max(simAspect, 1e-6) + 0.5);
}

float psi(vec2 uv) {
  vec2 muv = metricUv(uv);
  vec2 p = muv * baseScale;
  p += vec2(0.07, -0.04) * time * baseDrift;
  float n = fbm(p);
  float m = fbm(p * 2.0 + 17.3);
  return mix(n, m, turbulence);
}

vec2 baseVel(vec2 uv) {
  float dx = texelSize.x;
  float dy = texelSize.y;

  float pL = psi(uv - vec2(dx, 0.0));
  float pR = psi(uv + vec2(dx, 0.0));
  float pB = psi(uv - vec2(0.0, dy));
  float pT = psi(uv + vec2(0.0, dy));

  float dpsidx = (pR - pL) / (2.0 * dx);
  float dpsidy = (pT - pB) / (2.0 * dy);

  return vec2(dpsidy, -dpsidx) * baseStrength;
}

void main() {
  vec2 f = texture(uForce, vUv).xy;
  vec2 v = baseVel(vUv) + f * forceStrength;

  float m = length(v);
  if (m > maxVel) v *= (maxVel / max(m, 1e-6));

  vec2 backUV = vUv - dt * v;
  vec2 lo = texelSize * 0.5;
  vec2 hi = vec2(1.0) - lo;
  backUV = clamp(backUV, lo, hi);

  vec4 c = texture(uDye, backUV) * dyeDissipation;

  vec4 L = texture(uDye, vUv - vec2(texelSize.x, 0.0));
  vec4 R = texture(uDye, vUv + vec2(texelSize.x, 0.0));
  vec4 B = texture(uDye, vUv - vec2(0.0, texelSize.y));
  vec4 T = texture(uDye, vUv + vec2(0.0, texelSize.y));
  vec4 C = texture(uDye, vUv);
  vec4 lap = (L + R + B + T - 4.0 * C);

  c += lap * dyeDiffusion;
  o = vec4(max(c.rgb, 0.0), 1.0);
}
`;


const FS_SPLAT_FORCE = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 o;

uniform sampler2D uForce;
uniform vec2 point;
uniform vec2 push;
uniform float swirl;
uniform float radius;
uniform float aspect;
uniform float maxVel;

void main() {
  vec2 p = vUv - point;
  p.x *= aspect;

  float d2 = dot(p, p);
  float w = exp(-d2 / max(1e-6, radius));

  vec2 tang = vec2(-p.y, p.x);
  vec2 add = (push + tang * swirl) * w;

  vec2 f = texture(uForce, vUv).xy + add;

  float m = length(f);
  if (m > maxVel) f *= (maxVel / max(m, 1e-6));

  o = vec4(f, 0.0, 1.0);
}
`;

const FS_SPLAT_DYE = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 o;

uniform sampler2D uDye;
uniform vec2 point;
uniform vec3 color;
uniform float radius;
uniform float aspect;

void main() {
  vec2 p = vUv - point;
  p.x *= aspect;

  float d2 = dot(p, p);
  float w = exp(-d2 / max(1e-6, radius));

  vec3 base = texture(uDye, vUv).rgb;
  o = vec4(base + color * w, 1.0);
}
`;

const FS_FADE = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 o;
uniform sampler2D uTex;
uniform float uMul;
void main(){ o = vec4(texture(uTex, vUv).rgb * uMul, 1.0); }
`;

/* Aspect-correct display: sim domain is square, letterboxed on non-square canvas. */
const FS_DISPLAY = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 o;

uniform sampler2D uDye;
uniform float exposure;
uniform float dyeGain;
uniform float background;

vec3 tonemap(vec3 x){
  x = max(x, 0.0);
  return 1.0 - exp(-x * exposure);
}

void main() {
  vec2 p = vUv - 0.5;
  float r2 = dot(p, p);
  float vign = smoothstep(0.62, 0.10, r2);

  vec3 bg = vec3(0.014, 0.015, 0.022);
  bg += background * vec3(vUv.x, 0.30 + 0.70 * vUv.y, 1.0 - vUv.x);
  bg *= vign;

  vec3 dye = texture(uDye, vUv).rgb * dyeGain;

  vec3 c = bg + dye;
  c = tonemap(c);
  c = pow(c, vec3(1.0 / 2.2));
  o = vec4(c, 1.0);
}
`;



const P = {
  clear: createProgram(VS, FS_CLEAR, "clear"),
  advectForce: createProgram(VS, FS_ADVECT_FORCE, "advectForce"),
  advectDye: createProgram(VS, FS_ADVECT_DYE, "advectDye"),
  splatForce: createProgram(VS, FS_SPLAT_FORCE, "splatForce"),
  splatDye: createProgram(VS, FS_SPLAT_DYE, "splatDye"),
  fade: createProgram(VS, FS_FADE, "fade"),
  display: createProgram(VS, FS_DISPLAY, "display"),
};

const U = {
  clear: { uColor: uLoc(P.clear, "uColor", "clear") },

  advectForce: {
    uForce: uLoc(P.advectForce, "uForce", "advectForce"),
    texelSize: uLoc(P.advectForce, "texelSize", "advectForce"),
    dt: uLoc(P.advectForce, "dt", "advectForce"),
    baseScale: uLoc(P.advectForce, "baseScale", "advectForce"),
    baseStrength: uLoc(P.advectForce, "baseStrength", "advectForce"),
    baseDrift: uLoc(P.advectForce, "baseDrift", "advectForce"),
    turbulence: uLoc(P.advectForce, "turbulence", "advectForce"),
    forceStrength: uLoc(P.advectForce, "forceStrength", "advectForce"),
    forceDissipation: uLoc(P.advectForce, "forceDissipation", "advectForce"),
    forceDiffusion: uLoc(P.advectForce, "forceDiffusion", "advectForce"),
    maxVel: uLoc(P.advectForce, "maxVel", "advectForce"),
    time: uLoc(P.advectForce, "time", "advectForce"),
    simAspect: uLoc(P.advectForce, "simAspect", "advectForce"),
  },



  advectDye: {
    uDye: uLoc(P.advectDye, "uDye", "advectDye"),
    uForce: uLoc(P.advectDye, "uForce", "advectDye"),
    texelSize: uLoc(P.advectDye, "texelSize", "advectDye"),
    dt: uLoc(P.advectDye, "dt", "advectDye"),
    baseScale: uLoc(P.advectDye, "baseScale", "advectDye"),
    baseStrength: uLoc(P.advectDye, "baseStrength", "advectDye"),
    baseDrift: uLoc(P.advectDye, "baseDrift", "advectDye"),
    turbulence: uLoc(P.advectDye, "turbulence", "advectDye"),
    forceStrength: uLoc(P.advectDye, "forceStrength", "advectDye"),
    dyeDissipation: uLoc(P.advectDye, "dyeDissipation", "advectDye"),
    dyeDiffusion: uLoc(P.advectDye, "dyeDiffusion", "advectDye"),
    maxVel: uLoc(P.advectDye, "maxVel", "advectDye"),
    time: uLoc(P.advectDye, "time", "advectDye"),
    simAspect: uLoc(P.advectDye, "simAspect", "advectDye"),
  },

  splatForce: {
    uForce: uLoc(P.splatForce, "uForce", "splatForce"),
    point: uLoc(P.splatForce, "point", "splatForce"),
    push: uLoc(P.splatForce, "push", "splatForce"),
    swirl: uLoc(P.splatForce, "swirl", "splatForce"),
    radius: uLoc(P.splatForce, "radius", "splatForce"),
    aspect: uLoc(P.splatForce, "aspect", "splatForce"),
    maxVel: uLoc(P.splatForce, "maxVel", "splatForce"),
  },

  splatDye: {
    uDye: uLoc(P.splatDye, "uDye", "splatDye"),
    point: uLoc(P.splatDye, "point", "splatDye"),
    color: uLoc(P.splatDye, "color", "splatDye"),
    radius: uLoc(P.splatDye, "radius", "splatDye"),
    aspect: uLoc(P.splatDye, "aspect", "splatDye"),
  },

  fade: {
    uTex: uLoc(P.fade, "uTex", "fade"),
    uMul: uLoc(P.fade, "uMul", "fade"),
  },

  display: {
    uDye: uLoc(P.display, "uDye", "display"),
    exposure: uLoc(P.display, "exposure", "display"),
    dyeGain: uLoc(P.display, "dyeGain", "display"),
    background: uLoc(P.display, "background", "display"),
    // canvasAspect: uLoc(P.display, "canvasAspect", "display"),
  },
};

function createTex(w, h, internalFormat, format, type, filtering) {
  const tex = gl.createTexture();
  if (!tex) fatal("Failed to create texture.");

  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  const filter = filtering ?? (extLin ? gl.LINEAR : gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);

  gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, w, h, 0, format, type, null);

  const err = gl.getError();
  if (err !== gl.NO_ERROR) fatal("Texture allocation failed (gl error " + err + ").");

  gl.bindTexture(gl.TEXTURE_2D, null);
  return tex;
}

function createFBO(tex) {
  const fbo = gl.createFramebuffer();
  if (!fbo) fatal("Failed to create framebuffer.");

  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  gl.drawBuffers([gl.COLOR_ATTACHMENT0]);
  gl.readBuffer(gl.COLOR_ATTACHMENT0);

  const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
  if (status !== gl.FRAMEBUFFER_COMPLETE) fatal("Framebuffer incomplete: " + status.toString(16));

  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  return fbo;
}

class DoubleFBO {
  constructor(w, h, internalFormat, format, type, filtering) {
    this.w = w;
    this.h = h;

    this.texA = createTex(w, h, internalFormat, format, type, filtering);
    this.fboA = createFBO(this.texA);

    this.texB = createTex(w, h, internalFormat, format, type, filtering);
    this.fboB = createFBO(this.texB);

    this.readTex = this.texA;
    this.readFBO = this.fboA;
    this.writeTex = this.texB;
    this.writeFBO = this.fboB;
  }

  swap() {
    [this.readTex, this.writeTex] = [this.writeTex, this.readTex];
    [this.readFBO, this.writeFBO] = [this.writeFBO, this.readFBO];
  }

  clear(r, g, b, a) {
    gl.useProgram(P.clear);
    gl.uniform4f(U.clear.uColor, r, g, b, a);

    gl.bindVertexArray(quadVao);

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.readFBO);
    gl.viewport(0, 0, this.w, this.h);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.writeFBO);
    gl.viewport(0, 0, this.w, this.h);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindVertexArray(null);
  }
}

let sim = null;

function resizeCanvas() {
  const dpr = Math.min(2.0, window.devicePixelRatio || 1);
  const w = Math.max(2, Math.floor(innerWidth * dpr));
  const h = Math.max(2, Math.floor(innerHeight * dpr));
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
    console.info("[ink] canvas resized:", w, "x", h, "dpr", dpr);
  }
}

/* Square sim domain to preserve 1:1; display letterboxes on non-square canvas. */
function rebuild() {
  const w = Math.max(256, Math.round(canvas.width * params.quality));
  const h = Math.max(256, Math.round(canvas.height * params.quality));

  const IF = gl.RGBA16F;
  const F = gl.RGBA;
  const T = gl.HALF_FLOAT;

  sim = {
    w,
    h,
    texel: [1 / w, 1 / h],
    force: new DoubleFBO(w, h, IF, F, T, gl.NEAREST),
    dye: new DoubleFBO(w, h, IF, F, T, extLin ? gl.LINEAR : gl.NEAREST),
  };

  sim.force.clear(0, 0, 0, 1);
  sim.dye.clear(0, 0, 0, 1);

  console.info("[ink] sim rebuilt:", w, "x", h, "texel", sim.texel[0].toFixed(6), sim.texel[1].toFixed(6));
}


function bindTex(unit, tex) {
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, tex);
}

function drawFullscreen(fbo, w, h, label) {
  gl.bindVertexArray(quadVao);
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.viewport(0, 0, w, h);
  gl.drawArrays(gl.TRIANGLES, 0, 6);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.bindVertexArray(null);
  glCheck(label);
}

function hsvToRgb(h, s, v) {
  h = ((h % 1) + 1) % 1;
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  switch (i % 6) {
    case 0: return [v, t, p];
    case 1: return [q, v, p];
    case 2: return [p, v, t];
    case 3: return [p, q, v];
    case 4: return [t, p, v];
    default: return [v, p, q];
  }
}

function splatForce(x, y, pushX, pushY, swirl) {
  const aspect = sim.w / sim.h;
  gl.useProgram(P.splatForce);
  gl.uniform1i(U.splatForce.uForce, 0);
  gl.uniform2f(U.splatForce.point, x, y);
  gl.uniform2f(U.splatForce.push, pushX, pushY);
  gl.uniform1f(U.splatForce.swirl, swirl);
  gl.uniform1f(U.splatForce.radius, params.radius);
  gl.uniform1f(U.splatForce.aspect, aspect);
  gl.uniform1f(U.splatForce.maxVel, params.maxVel);

  bindTex(0, sim.force.readTex);
  drawFullscreen(sim.force.writeFBO, sim.w, sim.h, "splatForce");
  sim.force.swap();
}

function splatDye(x, y, r, g, b) {
  const aspect = sim.w / sim.h;
  gl.useProgram(P.splatDye);
  gl.uniform1i(U.splatDye.uDye, 0);
  gl.uniform2f(U.splatDye.point, x, y);
  gl.uniform3f(U.splatDye.color, r, g, b);
  gl.uniform1f(U.splatDye.radius, params.radius);
  gl.uniform1f(U.splatDye.aspect, aspect);

  bindTex(0, sim.dye.readTex);
  drawFullscreen(sim.dye.writeFBO, sim.w, sim.h, "splatDye");
  sim.dye.swap();
}

function fadeDye() {
  gl.useProgram(P.fade);
  gl.uniform1i(U.fade.uTex, 0);
  gl.uniform1f(U.fade.uMul, params.fade);
  bindTex(0, sim.dye.readTex);
  drawFullscreen(sim.dye.writeFBO, sim.w, sim.h, "fade");
  sim.dye.swap();
}

function advectForce(dt, time) {
  gl.useProgram(P.advectForce);
  gl.uniform1i(U.advectForce.uForce, 0);
  gl.uniform2f(U.advectForce.texelSize, sim.texel[0], sim.texel[1]);
  gl.uniform1f(U.advectForce.dt, dt);

  gl.uniform1f(U.advectForce.simAspect, sim.w / Math.max(1, sim.h));

  gl.uniform1f(U.advectForce.baseScale, params.baseScale);
  gl.uniform1f(U.advectForce.baseStrength, params.baseStrength);
  gl.uniform1f(U.advectForce.baseDrift, params.baseDrift);
  gl.uniform1f(U.advectForce.turbulence, params.turbulence);

  gl.uniform1f(U.advectForce.forceStrength, params.forceStrength);
  gl.uniform1f(U.advectForce.forceDissipation, params.forceDissipation);
  gl.uniform1f(U.advectForce.forceDiffusion, params.forceDiffusion);

  gl.uniform1f(U.advectForce.maxVel, params.maxVel);
  gl.uniform1f(U.advectForce.time, time);

  bindTex(0, sim.force.readTex);
  drawFullscreen(sim.force.writeFBO, sim.w, sim.h, "advectForce");
  sim.force.swap();
}

function advectDye(dt, time) {
  gl.useProgram(P.advectDye);
  gl.uniform1i(U.advectDye.uDye, 0);
  gl.uniform1i(U.advectDye.uForce, 1);
  gl.uniform2f(U.advectDye.texelSize, sim.texel[0], sim.texel[1]);
  gl.uniform1f(U.advectDye.dt, dt);

  gl.uniform1f(U.advectDye.simAspect, sim.w / Math.max(1, sim.h));

  gl.uniform1f(U.advectDye.baseScale, params.baseScale);
  gl.uniform1f(U.advectDye.baseStrength, params.baseStrength);
  gl.uniform1f(U.advectDye.baseDrift, params.baseDrift);
  gl.uniform1f(U.advectDye.turbulence, params.turbulence);

  gl.uniform1f(U.advectDye.forceStrength, params.forceStrength);
  gl.uniform1f(U.advectDye.dyeDissipation, params.dyeDissipation);
  gl.uniform1f(U.advectDye.dyeDiffusion, params.dyeDiffusion);

  gl.uniform1f(U.advectDye.maxVel, params.maxVel);
  gl.uniform1f(U.advectDye.time, time);

  bindTex(0, sim.dye.readTex);
  bindTex(1, sim.force.readTex);
  drawFullscreen(sim.dye.writeFBO, sim.w, sim.h, "advectDye");
  sim.dye.swap();
}

function display() {
  gl.useProgram(P.display);
  gl.uniform1i(U.display.uDye, 0);

  gl.uniform1f(U.display.exposure, params.exposure);
  gl.uniform1f(U.display.dyeGain, params.dyeGain);
  gl.uniform1f(U.display.background, params.background);

  //gl.uniform1f(U.display.canvasAspect, canvas.width / Math.max(1, canvas.height));
  
  bindTex(0, sim.dye.readTex);
  drawFullscreen(null, canvas.width, canvas.height, "display");
}

function sample(label, x, y) {
  if (!params.debug) return;

  const ix = Math.max(0, Math.min(sim.w - 1, (sim.w * x) | 0));
  const iy = Math.max(0, Math.min(sim.h - 1, (sim.h * y) | 0));

  const dye = new Float32Array(4);
  const force = new Float32Array(4);

  gl.bindFramebuffer(gl.FRAMEBUFFER, sim.dye.readFBO);
  gl.readBuffer(gl.COLOR_ATTACHMENT0);
  gl.readPixels(ix, iy, 1, 1, gl.RGBA, gl.FLOAT, dye);

  gl.bindFramebuffer(gl.FRAMEBUFFER, sim.force.readFBO);
  gl.readBuffer(gl.COLOR_ATTACHMENT0);
  gl.readPixels(ix, iy, 1, 1, gl.RGBA, gl.FLOAT, force);

  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  console.info(
    "[ink] sample",
    label,
    "uv",
    x.toFixed(3),
    y.toFixed(3),
    "dye",
    dye[0].toFixed(3),
    dye[1].toFixed(3),
    dye[2].toFixed(3),
    "force",
    force[0].toFixed(3),
    force[1].toFixed(3)
  );
}

let emitterAccum = 0;
let emitterPhase = 0;

function reset(randomize) {
  if (!sim) return;
  sim.force.clear(0, 0, 0, 1);
  sim.dye.clear(0, 0, 0, 1);

  const x = 0.5;
  const y = 0.52;

  splatForce(x, y, 0.0, 0.0, 0.35);

  // splatDye(x, y, 2.5, 0.6, 2.8);
  // splatDye(x + 0.06, y - 0.05, 0.6, 2.6, 2.8);
  // splatDye(x - 0.06, y + 0.05, 2.8, 2.4, 0.6);



  emitterAccum = 0;
  emitterPhase = randomize ? Math.random() * 10 : 0;

  console.info("[ink] reset complete");
  sample("reset", x, y);
}

/* GUI */
const gui = new GUI({ width: 380 });
const guiControllers = [];

function track(c) {
  guiControllers.push(c);
  return c;
}

function refreshGuiDisplays() {
  for (const c of guiControllers) c.updateDisplay();
}

function wirePersist(c, rebuildOnChange) {
  c.onChange(() => {
    if (rebuildOnChange) rebuildAndReset();
    persistLastDebounced();
  });
  return c;
}

track(gui.add(params, "paused").name("Paused").listen());
track(gui.add(params, "debug").name("Debug logs").listen());
track(wirePersist(gui.add(params, "timeScale", 0.05, 2.0, 0.01).name("Time scale").listen(), false));
track(wirePersist(gui.add(params, "dtMax", 0.008, 0.030, 0.001).name("dtMax").listen(), false));
track(wirePersist(gui.add(params, "quality", 0.35, 1.0, 0.01).name("Quality").listen(), true));

const gLook = gui.addFolder("Look");
track(wirePersist(gLook.add(params, "exposure", 0.6, 2.4, 0.01).listen(), false));
track(wirePersist(gLook.add(params, "dyeGain", 0.5, 4.5, 0.01).listen(), false));
track(wirePersist(gLook.add(params, "background", 0.0, 0.25, 0.005).listen(), false));
gLook.open();

const gBase = gui.addFolder("Base flow");
track(wirePersist(gBase.add(params, "baseScale", 0.001, 20.0, 0.001).listen(), false));
track(wirePersist(gBase.add(params, "baseStrength", 0.00, 0.50, 0.005).listen(), false));
track(wirePersist(gBase.add(params, "baseDrift", 0.00, 0.30, 0.005).listen(), false));
track(wirePersist(gBase.add(params, "turbulence", 0.00, 1.00, 0.01).listen(), false));
gBase.open();

const gForce = gui.addFolder("Force field");
track(wirePersist(gForce.add(params, "forceStrength", 0.00, 1.50, 0.01).listen(), false));
track(wirePersist(gForce.add(params, "forceDissipation", 0.985, 0.9999, 0.0001).listen(), false));
track(wirePersist(gForce.add(params, "forceDiffusion", 0.00, 0.50, 0.005).listen(), false));
track(wirePersist(gForce.add(params, "maxVel", 0.01, 10.0, 0.01).listen(), false));
gForce.open();

const gDye = gui.addFolder("Dye");
track(wirePersist(gDye.add(params, "dyeDissipation", 0.001, 1.5, 0.001).listen(), false));
track(wirePersist(gDye.add(params, "dyeDiffusion", 0.00, 0.50, 0.005).listen(), false));
track(wirePersist(gDye.add(params, "fade", 0.990, 0.99999, 0.00001).listen(), false));
gDye.open();

const INPUT_RADIUS = { min: 0.0001, max: 0.100, step: 0.0001, keyStep: 0.0001 };

const gInput = gui.addFolder("Input");
track(wirePersist(gInput.add(params, "radius", INPUT_RADIUS.min, INPUT_RADIUS.max, INPUT_RADIUS.step).listen(), false));
track(wirePersist(gInput.add(params, "dyeAmount", 0.2, 8.0, 0.05).listen(), false));
track(wirePersist(gInput.add(params, "pushGain", 0.00, 0.35, 0.005).listen(), false));
track(wirePersist(gInput.add(params, "swirlGain", 0.00, 2.0, 0.01).listen(), false));
gInput.open();


const gEmit = gui.addFolder("Emitters");
track(wirePersist(gEmit.add(params, "emitters", 0, 10000, 1).listen(), false));
track(wirePersist(gEmit.add(params, "emitterRate", 0.0, 1000.0, 0.01).listen(), false));
track(wirePersist(gEmit.add(params, "emitterPush", 0.0, 0.25, 0.005).listen(), false));
track(wirePersist(gEmit.add(params, "emitterSwirl", 0.0, 1.5, 0.01).listen(), false));
gEmit.open();

track(gui.add(params, "reset").name("Reset"));

/* Presets / import / export (IndexedDB + JSON files) */
const presetState = {
  presetName: "",
  selected: "",
  save: async () => {
    const name = (presetState.presetName || "").trim() || `preset-${nowStamp()}`;
    const settings = safeCloneSettings(params);
    try {
      await idbPutPreset(name, settings);
      presetState.selected = name;
      presetState.presetName = name;
      await refreshPresetList();
      console.info("[ink] preset saved:", name);
    } catch (e) {
      console.error("[ink] preset save failed", e);
    }
  },
  load: async () => {
    const name = (presetState.selected || "").trim();
    if (!name) return;
    try {
      const row = await idbGetPreset(name);
      if (!row || !row.settings) return;
      applySettings(row.settings, { rebuild: true, log: true });
      presetState.presetName = name;
      presetState.selected = name;
      refreshGuiDisplays();
      console.info("[ink] preset loaded:", name);
    } catch (e) {
      console.error("[ink] preset load failed", e);
    }
  },
  delete: async () => {
    const name = (presetState.selected || "").trim();
    if (!name) return;
    try {
      await idbDeletePreset(name);
      presetState.selected = "";
      await refreshPresetList();
      console.info("[ink] preset deleted:", name);
    } catch (e) {
      console.error("[ink] preset delete failed", e);
    }
  },
  exportJson: () => {
    const payload = { v: 1, exportedAt: Date.now(), settings: safeCloneSettings(params) };
    downloadJson(payload, `settings-${nowStamp()}.json`);
    console.info("[ink] exported settings json");
  },
  importJson: () => {
    ensureImportInput().click();
  },
};

const gPresets = gui.addFolder("Presets");
track(gPresets.add(presetState, "presetName").name("Preset name").listen());



let presetSelectCtrl = null;

function setPresetOptions(names) {
  const opts = { "(none)": "" };
  for (const n of names) opts[n] = n;

  if (presetSelectCtrl && typeof presetSelectCtrl.options === "function") {
    presetSelectCtrl.options(opts);
    presetSelectCtrl.updateDisplay();
    return;
  }

  if (presetSelectCtrl && typeof presetSelectCtrl.destroy === "function") presetSelectCtrl.destroy();

  presetSelectCtrl = gPresets.add(presetState, "selected", opts).name("Selected").listen();
  presetSelectCtrl.onChange(() => {
    const name = (presetState.selected || "").trim();
    if (!name) return;
    presetState.load();
  });

  track(presetSelectCtrl);
}

async function refreshPresetList() {
  try {
    const names = await idbListPresetNames();
    setPresetOptions(names);
  } catch (e) {
    console.warn("[ink] preset list failed", e);
    setPresetOptions([]);
  }
}

track(gPresets.add(presetState, "save").name("Save preset"));
track(gPresets.add(presetState, "load").name("Load preset"));
track(gPresets.add(presetState, "delete").name("Delete preset"));
track(gPresets.add(presetState, "exportJson").name("Export settings JSON"));
track(gPresets.add(presetState, "importJson").name("Import settings JSON"));
gPresets.open();


/* Interaction */
let pointerDown = false;
let last = null;

let controlsHidden = false;
const uiDisplayCache = new Map();

function isTypingTarget(el) {
  if (!el) return false;
  const tag = (el.tagName || "").toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") return true;
  if (el.isContentEditable) return true;
  return false;
}

function toggleControlsHidden(force) {
  controlsHidden = typeof force === "boolean" ? force : !controlsHidden;

  const body = document.body;
  if (controlsHidden) {
    uiDisplayCache.clear();

    for (const el of body.children) {
      if (el === canvas) continue;
      uiDisplayCache.set(el, el.style.display);
      el.style.display = "none";
    }

    if (params.debug) console.info("[ink] ui hidden");
    return;
  }

  for (const [el, prev] of uiDisplayCache) {
    el.style.display = prev;
  }
  uiDisplayCache.clear();

  if (params.debug) console.info("[ink] ui shown");
}



async function toggleFullscreen() {
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      if (params.debug) console.info("[ink] fullscreen off");
      return;
    }

    const root = document.documentElement;
    await root.requestFullscreen({ navigationUI: "hide" });
    if (params.debug) console.info("[ink] fullscreen on");
  } catch (e) {
    console.error("[ink] fullscreen toggle failed", e);
  }
}

function saveCanvasPng() {
  try {
    if (!sim) return;

    display();
    gl.finish();

    const w = canvas.width;
    const h = canvas.height;

    const pixels = new Uint8Array(w * h * 4);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

    const out = document.createElement("canvas");
    out.width = w;
    out.height = h;
    const ctx = out.getContext("2d", { willReadFrequently: false });
    if (!ctx) return;

    const img = ctx.createImageData(w, h);
    for (let y = 0; y < h; y++) {
      const srcRow = (h - 1 - y) * w * 4;
      const dstRow = y * w * 4;
      img.data.set(pixels.subarray(srcRow, srcRow + w * 4), dstRow);
    }
    ctx.putImageData(img, 0, 0);

    out.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `ink-${nowStamp()}.png`;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(a.href);
      if (params.debug) console.info("[ink] saved png");
    }, "image/png");
  } catch (e) {
    console.error("[ink] save png failed", e);
  }
}

window.addEventListener(
  "keydown",
  (e) => {
    if (e.repeat) return;
    if (isTypingTarget(e.target)) return;

    const key = e.key || "";
    const k = key.toLowerCase();

    if (k === "f") {
      e.preventDefault();
      toggleFullscreen();
      return;
    }

    if (k === "g") {
      e.preventDefault();
      toggleControlsHidden();
      return;
    }
   

    if (k === "s") {
      e.preventDefault();
      saveCanvasPng();
      return;
    }

    if (k === "r") {
      e.preventDefault();

      pointerDown = false;
      last = null;

      if (typeof emitterAccum === "number") emitterAccum = 0;
      if (typeof emitterPhase === "number") emitterPhase = Math.random() * 10;
      if (typeof t === "number") t = 0;
      if (typeof frame === "number") frame = 0;
      if (typeof lastT === "number") lastT = performance.now();

      reset(true);

      if (params.debug) console.info("[ink] restart");
      return;
    }


    if (k === "escape") {
      e.preventDefault();
      toggleControlsHidden();
      return;
    }

    const isBracketLeft = key === "[" || e.code === "BracketLeft";
    const isBracketRight = key === "]" || e.code === "BracketRight";

    if (isBracketLeft || isBracketRight) {
      e.preventDefault();

    const step = INPUT_RADIUS.keyStep;

    const next = params.radius + (isBracketRight ? step : -step);
    params.radius = Math.min(INPUT_RADIUS.max, Math.max(INPUT_RADIUS.min, next));


      refreshGuiDisplays();
      persistLastDebounced();

      if (params.debug) console.info("[ink] radius", params.radius.toFixed(3));
    }
  },
  { passive: false }
);


function toCanvasUV(e) {
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) / rect.width;
  const y = 1 - (e.clientY - rect.top) / rect.height;
  return [x, y];
}

function canvasUvToSimUv(cx, cy) {
  const x = Math.min(1, Math.max(0, cx));
  const y = Math.min(1, Math.max(0, cy));
  return [x, y];
}


canvas.addEventListener("pointerdown", (e) => {
  pointerDown = true;
  canvas.setPointerCapture(e.pointerId);

  const [cx, cy] = toCanvasUV(e);
  const suv = canvasUvToSimUv(cx, cy);

  last = { cx, cy, t: performance.now() };

  if (params.debug) console.info("[ink] pointerdown canvas", cx.toFixed(3), cy.toFixed(3), "sim", `${suv[0].toFixed(3)} ${suv[1].toFixed(3)}`);
  sample("pointerdown", suv[0], suv[1]);
});

canvas.addEventListener("pointerup", () => {
  pointerDown = false;
  last = null;
  if (params.debug) console.info("[ink] pointerup");
});

canvas.addEventListener("pointermove", (e) => {
  const [cx, cy] = toCanvasUV(e);
  const now = performance.now();
  const prev = last ?? { cx, cy, t: now };
  last = { cx, cy, t: now };

  if (!pointerDown) return;

  const prevSim = canvasUvToSimUv(prev.cx, prev.cy);
  const curSim = canvasUvToSimUv(cx, cy);

  const dt = Math.max(0.001, (now - prev.t) * 0.001);
  const dx = curSim[0] - prevSim[0];
  const dy = curSim[1] - prevSim[1];

  const vx = dx / dt;
  const vy = dy / dt;

  const pushX = vx * params.pushGain;
  const pushY = vy * params.pushGain;

  const speed = Math.min(3.0, Math.hypot(vx, vy));
  const swirl = params.swirlGain * (0.25 + 0.75 * Math.min(1.0, speed * 0.15));

  const hue = (0.12 + now * 0.00016) % 1;
  const rgb = hsvToRgb(hue, 0.92, 1.25);

  splatForce(curSim[0], curSim[1], pushX, pushY, swirl);
  splatDye(curSim[0], curSim[1], rgb[0] * params.dyeAmount, rgb[1] * params.dyeAmount, rgb[2] * params.dyeAmount);

  if ((now | 0) % 450 === 0 && params.debug) {
    console.info("[ink] inject", "push", pushX.toFixed(3), pushY.toFixed(3), "swirl", swirl.toFixed(3));
  }
});

canvas.addEventListener("dblclick", () => {
  if (params.debug) console.info("[ink] dblclick");
  reset(true);
});





/* Boot */
function rebuildAndReset() {
  rebuild();
  reset(true);
}

resizeCanvas();

/* Restore default preset first, then restore last saved settings on top. */
await loadDefaultPresetIntoParams();
loadLastIntoParams();

rebuildAndReset();

window.addEventListener("resize", () => {
  resizeCanvas();
  rebuildAndReset();
});

refreshPresetList().catch(() => {});






/* Main loop */
let lastT = performance.now();
let t = 0;
let frame = 0;

function tick(now) {
  resizeCanvas();

  const rawDt = (now - lastT) * 0.001;
  lastT = now;

  if (!params.paused && sim) {
    const dt = Math.min(params.dtMax, rawDt) * params.timeScale;
    t += dt;

    if (params.emitters > 0 && params.emitterRate > 0) {
      emitterAccum += dt * params.emitterRate;
      while (emitterAccum >= 1.0) {
        emitterAccum -= 1.0;
        emitterPhase += 0.65;

        const k = ((Math.random() * params.emitters) | 0) / Math.max(1, params.emitters);
        const cx = 0.20 + 0.60 * k + 0.06 * Math.sin(emitterPhase * 0.6 + k * 9.0);
        const cy = 0.55 + 0.12 * Math.cos(emitterPhase * 0.5 + k * 7.0);

        const ang = emitterPhase * (0.7 + 0.25 * Math.sin(k * 6.0));
        const pushX = Math.cos(ang) * params.emitterPush;
        const pushY = Math.sin(ang) * params.emitterPush;

        const hue = (0.10 + t * 0.020) % 1;
        const rgb = hsvToRgb(hue + k * 0.22, 0.90, 1.15);

        splatForce(cx, cy, pushX, pushY, params.emitterSwirl);
        splatDye(cx, cy, rgb[0] * params.dyeAmount * 0.30, rgb[1] * params.dyeAmount * 0.30, rgb[2] * params.dyeAmount * 0.30);
      }
    }

    advectForce(dt, t);
    advectDye(dt, t);
    fadeDye();
  }

  display();

  frame++;
  if (params.debug && frame % 240 === 0) {
    console.info("[ink] tick", frame, "dt", (Math.min(params.dtMax, rawDt) * params.timeScale).toFixed(4), "t", t.toFixed(2));
    sample("tick", 0.50, 0.52);
  }

  requestAnimationFrame(tick);
}

requestAnimationFrame(tick);

/* Persist current settings once on startup and then on GUI/input changes. */
persistLastDebounced();
