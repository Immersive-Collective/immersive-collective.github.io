const fs = require("fs");
const path = require("path");

const distDir = path.join(__dirname, "dist");
const outputPath = path.join(__dirname, "main-template.js");

// Patterns to scan for inside each JS file to guess origin
const hints = [
  { keyword: 'draco_decoder.js', comment: 'Includes DRACO decoder' },
  { keyword: 'draco_decoder.wasm', comment: 'Includes DRACO WASM binary reference' },
  { keyword: 'draco_wasm_wrapper.js', comment: 'Includes DRACO WASM wrapper' },
  { keyword: 'OrbitControls', comment: 'Includes OrbitControls' },
  { keyword: 'GLTFLoader', comment: 'Includes GLTFLoader' },
  { keyword: 'XRControllerModelFactory', comment: 'Includes WebXR controller support' },
  { keyword: 'XRHandModelFactory', comment: 'Includes WebXR hand model support' },
  { keyword: 'three', comment: 'Includes Three.js core or modules' },
  { keyword: 'src/index.js', comment: 'Compiled application entry (index.js)' }
];

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");
  const matches = hints.filter(h => content.includes(h.keyword)).map(h => h.comment);
  return matches.length ? `Contains: ${matches.join(", ")}` : "No identifiable source content";
}

function generate() {
  const files = fs.readdirSync(distDir).filter(f => f.endsWith(".js")).sort((a, b) => {
    if (a === "runtime.js") return -1;
    if (b === "runtime.js") return 1;
    if (a === "main.js") return 1;
    if (b === "main.js") return -1;
    return a.localeCompare(b);
  });

  const lines = ["const chunkScriptsLocal = ["];

  for (const file of files) {
    const fullPath = path.join(distDir, file);
    const comment = scanFile(fullPath);
    lines.push(`  "dist/${file}", // ${comment}`);
  }

  lines.push("];");

  fs.writeFileSync(outputPath, lines.join("\n") + "\n", "utf8");
  console.log("✅ main-template.js written based on actual file contents.");
}

generate();
