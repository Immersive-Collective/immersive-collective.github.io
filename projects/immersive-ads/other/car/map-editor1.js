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
const copyBtn = document.getElementById('copyBtn');

let cols = DEFAULT_COLS;
let rows = DEFAULT_ROWS;
let placedObstacles = [];
let currentMapName = DEFAULT_MAP_NAME;
let mapOrigin = { ...DEFAULT_ORIGIN };

// Enhancements
let activeType = null;
let selectedCell = null;
let undoStack = [];
let redoStack = [];

function pushUndo() {
  undoStack.push(JSON.stringify(placedObstacles));
  if (undoStack.length > 100) undoStack.shift();
  redoStack = [];
}

function updateLiveExport() {
  const centerX = Math.floor(cols / 2);
  const centerY = Math.floor(rows / 2);

  const obstacles = placedObstacles.map(p => ({
    x: (centerX - p.x) * 100,
    y: (centerY - p.y) * 100,
    type: p.type
  }));

  const exportData = {
    mapName: currentMapName,
    cols,
    rows,
    origin: { x: centerX, y: centerY },
    obstacles
  };

  output.value = JSON.stringify(exportData, null, 2);
}

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

  try {
    const data = JSON.parse(stored);
    cols = data.cols || DEFAULT_COLS;
    rows = data.rows || DEFAULT_ROWS;
    currentMapName = data.mapName || DEFAULT_MAP_NAME;
    mapOrigin = data.origin || { x: Math.floor(cols / 2), y: Math.floor(rows / 2) };
    placedObstacles = Array.isArray(data.obstacles)
      ? data.obstacles.map(o => ({
          x: (o.x / 100) + mapOrigin.x,
          y: mapOrigin.y - (o.y / 100),
          type: o.type || 'red'
        }))
      : [];

    document.getElementById('cols').value = cols;
    document.getElementById('rows').value = rows;
    document.getElementById('mapName').value = currentMapName;
  } catch {
    placedObstacles = [];
  }
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

      cell.addEventListener('click', () => {
        selectedCell = cell;
        document.querySelectorAll('.cell').forEach(c => c.classList.remove('selected'));
        cell.classList.add('selected');

        const hasObstacle = placedObstacles.some(p => p.x == x && p.y == y);

        if (!hasObstacle && activeType) {
          pushUndo();
          if (activeType === 'start') {
            placedObstacles = placedObstacles.filter(p => p.type !== 'start');
          }
          placedObstacles.push({ x, y, type: activeType });
          renderGrid();
        }

      });

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

      const character = CHARACTER_DATA.find(c => c.type === o.type);
      if (character) {
        obs.style.backgroundImage = `url(${character.image})`;
        obs.style.backgroundSize = 'cover';
        obs.style.backgroundPosition = 'center';
      }

      if (
        selectedCell &&
        parseInt(selectedCell.dataset.x) === o.x &&
        parseInt(selectedCell.dataset.y) === o.y
      ) {
        obs.style.border = '2px solid black';
      }

      obs.addEventListener('dragstart', ev => {
        ev.dataTransfer.setData('type', o.type);
        ev.dataTransfer.setData('fromX', o.x);
        ev.dataTransfer.setData('fromY', o.y);
      });

      cell.appendChild(obs);


    }



  });

  saveSessionState();
  updateLiveExport();
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
      pushUndo();
      placedObstacles[i].x = x;
      placedObstacles[i].y = y;
    }
  } else {
    pushUndo();
    if (type === 'start') {
      placedObstacles = placedObstacles.filter(p => p.type !== 'start');
    }
    placedObstacles.push({ x, y, type });
  }

  renderGrid();
}

document.querySelectorAll('.palette-item').forEach(item => {
  item.addEventListener('click', () => {
    document.querySelectorAll('.palette-item').forEach(i => i.classList.remove('selected'));
    item.classList.add('selected');
    activeType = item.dataset.type;
  });

  item.addEventListener('dragstart', e => {
    e.dataTransfer.setData('type', item.dataset.type);
  });
});

const deleteBtn = document.getElementById('deleteBtn');
if (deleteBtn) {
  deleteBtn.addEventListener('click', () => {
    if (!selectedCell) return;

    const x = parseInt(selectedCell.dataset.x);
    const y = parseInt(selectedCell.dataset.y);
    const i = placedObstacles.findIndex(p => p.x == x && p.y == y);

    if (i !== -1) {
      pushUndo();
      placedObstacles.splice(i, 1);
      renderGrid();
    }
  });
}

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
  const blob = new Blob([output.value], { type: 'application/json' });
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:T]/g, '-').split('.')[0];
  const name = document.getElementById('mapName').value.trim() || DEFAULT_MAP_NAME;
  const filename = `${name}-${timestamp}.json`;

  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
});

copyBtn.addEventListener('click', () => {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(output.value).then(() => {
      alert('Copied to clipboard!');
    }).catch(() => {
      fallbackCopy(output.value);
    });
  } else {
    fallbackCopy(output.value);
  }
});

function fallbackCopy(text) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  try {
    document.execCommand('copy');
    //alert('Copied (fallback method)');
    console.log('Copied (fallback method)');
  } catch (err) {
    alert('Copy failed');
  }
  document.body.removeChild(textarea);
}


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

const clearBtn = document.getElementById('clearBtn');
if (clearBtn) {
  clearBtn.addEventListener('click', () => {
    if (confirm('Clear all obstacles from the map?')) {
      pushUndo();
      placedObstacles = [];
      renderGrid();
    }
  });
}


document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'z') {
    if (undoStack.length > 0) {
      redoStack.push(JSON.stringify(placedObstacles));
      placedObstacles = JSON.parse(undoStack.pop());
      renderGrid();
    }
    e.preventDefault();
  } else if (e.ctrlKey && e.key === 'y') {
    if (redoStack.length > 0) {
      undoStack.push(JSON.stringify(placedObstacles));
      placedObstacles = JSON.parse(redoStack.pop());
      renderGrid();
    }
    e.preventDefault();
  }
});



const CHARACTER_DATA = JSON.parse(`
[

  {
    "type": "gabby",
    "name": "Gabby",
    "image": "https://www.dreamworks.com/storage/cms-uploads/gabby-hero2.png",
    "description": "Meet Gabby, a positive, determined, and just a little bit klutzy, kid who's not afraid to be herself! She loves cats, cooking, pretending, and of c...",
    "url": "https://www.gabbysdollhouse.com/en/characters/gabby"
  },
  {
    "type": "pandy-paws",
    "name": "Pandy Paws",
    "image": "https://www.dreamworks.com/storage/cms-uploads/pandy-hero2.png",
    "description": "Pandy Paws (part panda, part cat of course), is Gabby’s best stuffed animal friend. Always up for adventures, hugs, or snacks, he’s the perfect cat...",
    "url": "https://www.gabbysdollhouse.com/en/characters/pandy-paws"
  },
  {
    "type": "cakey-cat",
    "name": "Cakey Cat",
    "image": "https://www.dreamworks.com/storage/cms-uploads/cakey-hero2.png",
    "description": "Half kitty, half cupcake, Cakey Cat is the easily-excitable cupcake in the kitchen! Spunky yet sensitive, Cakey can go from super happy to really w...",
    "url": "https://www.gabbysdollhouse.com/en/characters/cakey-cat"
  },
  {
    "type": "catrat",
    "name": "CatRat",
    "image": "https://www.dreamworks.com/storage/cms-uploads/catrat-hero3.png",
    "description": "Meet CatRat, the playful, squeezable, collector of all things shiny. Thanks to his delicate bone structure, there’s no space too small for him to s...",
    "url": "https://www.gabbysdollhouse.com/en/characters/catrat"
  },
  {
    "type": "mercat",
    "name": "MerCat",
    "image": "https://www.dreamworks.com/storage/cms-uploads/mercat-hero3.png",
    "description": "MerCat believes there’s nothing more important than feeling good, looking good, and doing good. As the resident scientist, she can always be found ...",
    "url": "https://www.gabbysdollhouse.com/en/characters/mercat"
  },
  {
    "type": "dj-catnip",
    "name": "DJ Catnip",
    "image": "https://www.dreamworks.com/storage/cms-uploads/djcatnip-hero2.png",
    "description": "The hoodie-wearing DJ Catnip is the group’s music specialist. From jamming on instruments to mixing up beats, Catnip uses music to help everyone fi...",
    "url": "https://www.gabbysdollhouse.com/en/characters/dj-catnip"
  },
  {
    "type": "kitty-fairy",
    "name": "Kitty Fairy",
    "image": "https://www.dreamworks.com/storage/cms-uploads/kittyfairy-hero.png",
    "description": "Meet Kitty Fairy, the tiny cat with wings who lives in the Fairy Tail Garden. Very gentle and nurturing, Kitty Fairy likes to keep a caring eye on ...",
    "url": "https://www.gabbysdollhouse.com/en/characters/kitty-fairy"
  },
  {
    "type": "pillow-cat",
    "name": "Pillow Cat",
    "image": "https://www.dreamworks.com/storage/cms-uploads/pillowcat-hero.png",
    "description": "Pillow Cat is the homebody cat that is content to lie around all day. She’s often found sleeping in the bedroom, which is exactly where she stays w...",
    "url": "https://www.gabbysdollhouse.com/en/characters/pillow-cat"
  },
  {
    "type": "carlita",
    "name": "Carlita",
    "image": "https://www.dreamworks.com/storage/cms-uploads/carlita-hero.png",
    "description": "Meet Carlita, part racecar and part cat, she’s charismatic, outgoing, and very confident...as long as she’s doing things she already knows she’s go...",
    "url": "https://www.gabbysdollhouse.com/en/characters/carlita"
  },
  {
    "type": "baby-box",
    "name": "Baby Box",
    "image": "https://www.dreamworks.com/storage/cms-uploads/babybox-hero.png",
    "description": "Baby Box is inventive, hardworking, and creative. Whenever there’s a problem, this resourceful cat can always be counted on to create or invent jus...",
    "url": "https://www.gabbysdollhouse.com/en/characters/baby-box"
  },
  {
    "type": "marty-the-party-cat",
    "name": "Marty the Party Cat",
    "image": "https://www.dreamworks.com/storage/cms-uploads/marty-the-party-cat-hero3.png",
    "description": "Marty the Party Cat is an exuberant goofball with long arms and legs that can stretch and wheels that pop out of his sneakers. His big heart and ab...",
    "url": "https://www.gabbysdollhouse.com/en/characters/marty-the-party-cat"
  }

]
`);

const palette = document.getElementById('palette');
CHARACTER_DATA.forEach(char => {
  const item = document.createElement('div');
  item.className = 'palette-item';
  item.dataset.type = char.type;
  item.title = char.name;
  item.draggable = true;
  item.innerHTML = `<img src="${char.image}" alt="${char.name}" width="40" height="40">`;
  item.addEventListener('click', () => {
    document.querySelectorAll('.palette-item').forEach(i => i.classList.remove('selected'));
    item.classList.add('selected');
    activeType = char.type;
  });
  item.addEventListener('dragstart', e => {
    e.dataTransfer.setData('type', char.type);
  });
  palette.appendChild(item);
});

const themeBtn = document.getElementById('themeToggle');

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
}

function toggleTheme() {
  const current = localStorage.getItem('theme') === 'dark' ? 'light' : 'dark';
  applyTheme(current);
}

themeBtn.addEventListener('click', toggleTheme);

applyTheme(localStorage.getItem('theme') || 'light');


loadSessionState();
loadSavedMaps();
renderGrid();
