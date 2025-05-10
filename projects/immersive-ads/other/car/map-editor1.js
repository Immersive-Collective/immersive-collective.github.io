/*

  Author: Sylwester Mielniczuk sylwester@workwork.fun
  Sat 10th May 2025

  Project: Map Editor

*/
const DEFAULT_COLS = 15;
const DEFAULT_ROWS = 15;
const DEFAULT_MAP_NAME = 'untitled';
const DEFAULT_ORIGIN = { x: Math.floor(DEFAULT_COLS / 2), y: Math.floor(DEFAULT_ROWS / 2) };

const grid = document.getElementById('grid');
const output = document.getElementById('output');
const applyBtn = document.getElementById('applyGrid');
const exportBtn = document.getElementById('exportBtn');
const loadBtn = document.getElementById('loadBtn');
const savedMaps = document.getElementById('savedMaps');

let cols = DEFAULT_COLS;
let rows = DEFAULT_ROWS;
let placedObstacles = [];
let currentMapName = DEFAULT_MAP_NAME;
let mapOrigin = { ...DEFAULT_ORIGIN };

function saveSessionState() {
  const sessionData = {
    cols,
    rows,
    mapName: currentMapName,
    origin: mapOrigin,
    obstacles: placedObstacles.map(p => ({
      x: (p.x - mapOrigin.x) * 100,
      y: (mapOrigin.y - p.y) * 100,
      type: p.type
    }))
  };
  localStorage.setItem('map_editor_recent', JSON.stringify(sessionData));
}

function loadSessionState() {
  const stored = localStorage.getItem('map_editor_recent');
  if (!stored) {
    cols = DEFAULT_COLS;
    rows = DEFAULT_ROWS;
    mapOrigin = { ...DEFAULT_ORIGIN };
    placedObstacles = [];
    document.getElementById('cols').value = cols;
    document.getElementById('rows').value = rows;
    document.getElementById('mapName').value = DEFAULT_MAP_NAME;
    return;
  }

  let data;
  try {
    data = JSON.parse(stored);
  } catch {
    cols = DEFAULT_COLS;
    rows = DEFAULT_ROWS;
    mapOrigin = { ...DEFAULT_ORIGIN };
    placedObstacles = [];
    return;
  }

  cols = data.cols || DEFAULT_COLS;
  rows = data.rows || DEFAULT_ROWS;
  currentMapName = data.mapName || DEFAULT_MAP_NAME;
  mapOrigin = data.origin || { x: Math.floor(cols / 2), y: Math.floor(rows / 2) };

  document.getElementById('cols').value = cols;
  document.getElementById('rows').value = rows;
  document.getElementById('mapName').value = currentMapName;

  placedObstacles = Array.isArray(data.obstacles)
    ? data.obstacles.map(o => ({
        x: (o.x / 100) + mapOrigin.x,
        y: mapOrigin.y - (o.y / 100),
        type: o.type || 'red'
      }))
    : [];
}

function renderGrid() {
  grid.innerHTML = '';
  grid.style.gridTemplateColumns = `repeat(${cols}, 40px)`;
  grid.style.gridTemplateRows = `repeat(${rows}, 40px)`;

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.x = x;
      cell.dataset.y = y;
      cell.addEventListener('dragover', e => e.preventDefault());
      cell.addEventListener('drop', handleDrop);
      grid.appendChild(cell);
    }
  }

  placedObstacles.forEach(o => {
    const selector = `.cell[data-x='${o.x}'][data-y='${o.y}']`;
    const cell = grid.querySelector(selector);
    if (cell) {
      const obs = document.createElement('div');
      obs.className = `obstacle type-${o.type}`;
      obs.draggable = true;
      obs.addEventListener('dragstart', ev => {
        ev.dataTransfer.setData('type', o.type);
        ev.dataTransfer.setData('fromX', o.x);
        ev.dataTransfer.setData('fromY', o.y);
      });
      cell.appendChild(obs);
    }
  });

  saveSessionState();
}

function handleDrop(e) {
  const type = e.dataTransfer.getData('type');
  const fromX = e.dataTransfer.getData('fromX');
  const fromY = e.dataTransfer.getData('fromY');
  const cell = e.currentTarget;
  const x = parseInt(cell.dataset.x);
  const y = parseInt(cell.dataset.y);

  if (cell.querySelector('.obstacle')) return;

  if (fromX && fromY) {
    const i = placedObstacles.findIndex(p => p.x == fromX && p.y == fromY);
    if (i !== -1) {
      placedObstacles[i].x = x;
      placedObstacles[i].y = y;
    }
  } else {
    placedObstacles.push({ x, y, type });
  }

  renderGrid();
}

document.querySelectorAll('.palette-item').forEach(item => {
  item.addEventListener('dragstart', e => {
    e.dataTransfer.setData('type', item.dataset.type);
  });
});

applyBtn.addEventListener('click', () => {
  const newCols = parseInt(document.getElementById('cols').value);
  const newRows = parseInt(document.getElementById('rows').value);
  const filtered = placedObstacles.filter(p => p.x < newCols && p.y < newRows);

  cols = newCols;
  rows = newRows;
  currentMapName = document.getElementById('mapName').value.trim() || DEFAULT_MAP_NAME;
  mapOrigin = { x: Math.floor(cols / 2), y: Math.floor(rows / 2) };
  placedObstacles = filtered;

  renderGrid();
});

exportBtn.addEventListener('click', () => {
  const name = document.getElementById('mapName').value.trim();
  if (!name) return;

  const centerX = Math.floor(cols / 2);
  const centerY = Math.floor(rows / 2);

  const obstacles = placedObstacles.map(p => ({
    x: (p.x - centerX) * 100,
    y: (centerY - p.y) * 100,
    type: p.type
  }));

  const metadata = {
    mapName: name,
    cols,
    rows,
    origin: { x: centerX, y: centerY }
  };

  localStorage.setItem(`map_${name}`, JSON.stringify({ ...metadata, obstacles }));

  const formattedObstacles = obstacles.map(o =>
    `{ "x": ${o.x}, "y": ${o.y}, "type": "${o.type}" }`
  ).join(',\n');

  output.value =
    `{ "mapName": "${metadata.mapName}", "cols": ${metadata.cols}, "rows": ${metadata.rows}, "origin": { "x": ${metadata.origin.x}, "y": ${metadata.origin.y} } },\n` +
    formattedObstacles;

  saveSessionState();
});








function loadSavedMaps() {
  savedMaps.innerHTML = '';
  for (let key in localStorage) {
    if (key.startsWith('map_')) {
      const option = document.createElement('option');
      option.value = key;
      option.textContent = key.replace('map_', '');
      savedMaps.appendChild(option);
    }
  }
}

loadBtn.addEventListener('click', () => {
  const selectedKey = savedMaps.value;
  if (!selectedKey) return;

  const data = JSON.parse(localStorage.getItem(selectedKey));
  const { cols: storedCols, rows: storedRows, obstacles, origin, mapName } = data;

  cols = storedCols || DEFAULT_COLS;
  rows = storedRows || DEFAULT_ROWS;
  mapOrigin = origin || { x: Math.floor(cols / 2), y: Math.floor(rows / 2) };
  currentMapName = mapName || selectedKey.replace('map_', '');

  document.getElementById('cols').value = cols;
  document.getElementById('rows').value = rows;
  document.getElementById('mapName').value = currentMapName;

  placedObstacles = Array.isArray(obstacles)
    ? obstacles.map(o => ({
        x: (o.x / 100) + mapOrigin.x,
        y: mapOrigin.y - (o.y / 100),
        type: o.type || 'red'
      }))
    : [];

  renderGrid();
});

loadSessionState();
loadSavedMaps();
renderGrid();
