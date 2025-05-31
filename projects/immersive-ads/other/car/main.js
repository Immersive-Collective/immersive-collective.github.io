/*

  Author: Sylwester Mielniczuk sylwester@workwork.fun
  Sat 10th May 2025
  Project: Car Game

*/


const CAR = document.getElementById('car');
const BODY = document.getElementById('car-body');

const WHEEL_TL = document.getElementById('wheel-tl');
const WHEEL_TR = document.getElementById('wheel-tr');
const WHEEL_BL = document.getElementById('wheel-bl');
const WHEEL_BR = document.getElementById('wheel-br');

const SURFACE = document.getElementById('surface');

const TEXTURE_WIDTH = 550;
const TEXTURE_HEIGHT = 852;
const CAR_SCALE = 0.15;

let carX = 350;
let carY = 450;
let carRotation = 0;
let wheelAngle = 0;

let speed = 0;
let acceleration = 0;

let surfaceOffsetX = 0;
let surfaceOffsetY = 0;

let carVerticalOffset = 0;
let targetVerticalOffset = 0;


let turningLeft = false;
let turningRight = false;
let accelerating = false;
let braking = false;

// Control values
const MAX_SPEED = 10;
const ACCELERATION_STEP = 0.2; // 0.2
const BRAKE_STEP = 0.3;
const FRICTION = 0.05; // 0.02
const TURN_RATE = 0.5;
const TURN_GRIP_FACTOR = 0.4;

const scaledWidth = TEXTURE_WIDTH * CAR_SCALE;
const scaledHeight = TEXTURE_HEIGHT * CAR_SCALE;

CAR.style.width = scaledWidth + 'px';
CAR.style.height = scaledHeight + 'px';
CAR.style.position = 'absolute';
CAR.style.transformOrigin = 'center center';

BODY.style.width = '100%';
BODY.style.height = '100%';

function setElement(el, x, y, width, height) {
  const w = width * CAR_SCALE;
  const h = height * CAR_SCALE;
  el.style.width = w + 'px';
  el.style.height = h + 'px';
  el.style.left = (x * CAR_SCALE - w / 2) + 'px';
  el.style.top = (y * CAR_SCALE - h / 2) + 'px';
}

const CAT = document.getElementById('cat');
const CAT_TAIL = document.getElementById('cat-tail');
const GABBY = document.getElementById('gabby');
const HAND_L = document.getElementById('hand-l');
const HAND_R = document.getElementById('hand-r');
const STEERING = document.getElementById('steering');

const BRAKE_LIGHT = document.getElementById('brake-light');


// Position all elements
setElement(CAT, 160, 400, 154, 279);
setElement(CAT_TAIL, 80, 480, 171, 146);

setElement(GABBY, 360, 490, 257, 331);        
setElement(HAND_L, 268, 360, 55, 197);

setElement(HAND_R, 445, 360, 55, 197);
setElement(STEERING, 355, 260, 185, 186);

setElement(BRAKE_LIGHT, 275, 763, 497, 87); // adjust as needed


const WHEEL_WIDTH = 60 * CAR_SCALE;
const WHEEL_HEIGHT = 210 * CAR_SCALE;

function setWheel(wheel, x, y) {
  wheel.style.width = WHEEL_WIDTH + 'px';
  wheel.style.height = WHEEL_HEIGHT + 'px';
  wheel.style.left = (x * CAR_SCALE - WHEEL_WIDTH / 2) + 'px';
  wheel.style.top = (y * CAR_SCALE - WHEEL_HEIGHT / 2) + 'px';
  wheel.style.position = 'absolute';
  wheel.style.transformOrigin = 'center center';
}

setWheel(WHEEL_TL, 30, 180);
setWheel(WHEEL_TR, 518, 180);
setWheel(WHEEL_BL, 5, 670);
setWheel(WHEEL_BR, 550, 670);

function enableTextures(enable) {
  const parts = [BODY, WHEEL_TL, WHEEL_TR, WHEEL_BL, WHEEL_BR, CAT, CAT_TAIL, GABBY, HAND_L, HAND_R, STEERING];

  parts.forEach(el => {
    if (enable) {
      el.classList.add('texture');
    } else {
      el.classList.remove('texture');
    }
  });
}

enableTextures(true);

function lerp(current, target, amount) {
  return current + (target - current) * amount;
}

function updateCarTransform() {
  const offsetX = scaledWidth / 2;
  const offsetY = scaledHeight / 2;

  const finalLeft = carX - offsetX;
  
  //const finalTop = carY - offsetY;
  const finalTop = carY - offsetY + carVerticalOffset;


  CAR.style.left = finalLeft + 'px';
  CAR.style.top = finalTop + 'px';
  CAR.style.transform = `rotate(${carRotation}deg)`;

  WHEEL_TL.style.transform = `rotate(${wheelAngle}deg)`;
  WHEEL_TR.style.transform = `rotate(${wheelAngle}deg)`;
  STEERING.style.transform = `rotate(${wheelAngle}deg)`;

  const handOffset = wheelAngle / 4; // smaller factor for subtle movement

  HAND_L.style.transform = `translateY(${-handOffset}px)`;
  HAND_R.style.transform = `translateY(${handOffset}px)`;

}


let startWorldX = 0;
let startWorldY = 0;

const START_BADGE = document.getElementById('start-badge');

// function initializeStartPosition() {
//   const startObstacle = MAP_DATA.obstacles.find(o => o.type === 'start');
//   if (startObstacle) {
//     startWorldX = surfaceOffsetX - startObstacle.x;
//     startWorldY = surfaceOffsetY - startObstacle.y;
//   } else {
//     // fallback to center
//     startWorldX = surfaceOffsetX;
//     startWorldY = surfaceOffsetY;
//   }
// }

function initializeStartPosition() {
  const startObstacle = MAP_DATA.obstacles.find(o => o.type === 'start');
  if (startObstacle) {
    surfaceOffsetX = startObstacle.x;
    surfaceOffsetY = startObstacle.y;
    startWorldX = 0;
    startWorldY = 0;
  } else {
    surfaceOffsetX = 0;
    surfaceOffsetY = 0;
    startWorldX = 0;
    startWorldY = 0;
  }
}




function updateStartBadge() {
  const screenX = surfaceOffsetX - startWorldX + carX;
  const screenY = surfaceOffsetY - startWorldY + carY;
  START_BADGE.style.left = `${screenX}px`;
  START_BADGE.style.top = `${screenY}px`;
}


const CHARACTER_DATA = JSON.parse(`[
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

]`);


const MAP_DATA = JSON.parse(`

{
  "mapName": "untitled",
  "cols": 25,
  "rows": 25,
  "origin": {
    "x": 12,
    "y": 12
  },
  "obstacles": [
    {
      "x": 1200,
      "y": 1200,
      "type": "gabby"
    },
    {
      "x": -200,
      "y": 1200,
      "type": "pandy-paws"
    },
    {
      "x": 500,
      "y": 1200,
      "type": "cakey-cat"
    },
    {
      "x": 900,
      "y": 700,
      "type": "catrat"
    },
    {
      "x": -1000,
      "y": 200,
      "type": "mercat"
    },
    {
      "x": -200,
      "y": -700,
      "type": "dj-catnip"
    },
    {
      "x": 1000,
      "y": -200,
      "type": "kitty-fairy"
    },
    {
      "x": 600,
      "y": -600,
      "type": "pillow-cat"
    },
    {
      "x": -1200,
      "y": -1100,
      "type": "carlita"
    },
    {
      "x": 1200,
      "y": 400,
      "type": "baby-box"
    },
    {
      "x": 200,
      "y": 900,
      "type": "marty-the-party-cat"
    },
    {
      "x": 0,
      "y": 300,
      "type": "start"
    },
    {
      "x": 600,
      "y": 500,
      "type": "red"
    },
    {
      "x": -1000,
      "y": 800,
      "type": "blue"
    },
    {
      "x": 400,
      "y": -200,
      "type": "green"
    }
  ]
}

`);

initializeStartPosition();


const OBSTACLES = MAP_DATA.obstacles.map((data, i) => {
  const el = document.createElement('div');
  el.className = `obstacle type-${data.type}`;
  el.id = `obstacle-${i}`;
  el.style.position = 'absolute';

  const char = CHARACTER_DATA.find(c => c.type === data.type);
  if (char) {
    const img = document.createElement('img');
    img.src = char.image;
    img.alt = data.type;
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'contain';
    el.appendChild(img);
  }

  SURFACE.appendChild(el);
  return el;
});


function updateObstacles() {
  for (let i = 0; i < OBSTACLES.length; i++) {
    const worldX = startWorldX + MAP_DATA.obstacles[i].x;
    const worldY = startWorldY + MAP_DATA.obstacles[i].y;
    const screenX = surfaceOffsetX - worldX + carX;
    const screenY = surfaceOffsetY - worldY + carY;
    OBSTACLES[i].style.left = `${screenX}px`;
    OBSTACLES[i].style.top = `${screenY}px`;
  }
}

function updateSurface() {
  const angle = -(carRotation % 360) * (Math.PI / 180);
  const vx = Math.sin(angle) * speed * (1 + CAR_SCALE);
  const vy = Math.cos(angle) * speed * (1 + CAR_SCALE);

  surfaceOffsetX += vx;
  surfaceOffsetY += vy;

  SURFACE.style.backgroundPosition = `${surfaceOffsetX}px ${surfaceOffsetY}px`;

  updateStartBadge();
  updateObstacles();
}



/* Minimap */

const MINIMAP = document.getElementById('minimap');
const MM_CTX = MINIMAP.getContext('2d');
const MM_SIZE = 150;

// Optional: based on map bounds, but for now assume known range
const MM_SCALE = 0.05;

function drawMinimap() {
  MM_CTX.clearRect(0, 0, MM_SIZE, MM_SIZE);

  // Draw all obstacles
  MAP_DATA.obstacles.forEach(obs => {
    const x = MM_SIZE / 2 + obs.x * MM_SCALE;
    const y = MM_SIZE / 2 + obs.y * MM_SCALE;

    MM_CTX.fillStyle = obs.type === "start" ? "#ff0" : "#999";
    MM_CTX.fillRect(x - 2, y - 2, 4, 4);
  });

  // Draw car as green dot
  const carWorldX = surfaceOffsetX;
  const carWorldY = surfaceOffsetY;
  const cx = MM_SIZE / 2 + -carWorldX * MM_SCALE;
  const cy = MM_SIZE / 2 + -carWorldY * MM_SCALE;

  MM_CTX.fillStyle = "#0f0";
  MM_CTX.beginPath();
  MM_CTX.arc(cx, cy, 3, 0, Math.PI * 2);
  MM_CTX.fill();
}




/* Collision */

function checkCollision() {
  const carLeft = carX - (scaledWidth / 2);
  const carTop = carY - (scaledHeight / 2);
  const carRight = carLeft + scaledWidth;
  const carBottom = carTop + scaledHeight;

  for (let i = 0; i < MAP_DATA.obstacles.length; i++) {
    const worldX = startWorldX + MAP_DATA.obstacles[i].x;
    const worldY = startWorldY + MAP_DATA.obstacles[i].y;

    const obsLeft = surfaceOffsetX - worldX + carX;
    const obsTop = surfaceOffsetY - worldY + carY;
    const obsRight = obsLeft + 40;
    const obsBottom = obsTop + 40;

    if (
      carRight > obsLeft &&
      carLeft < obsRight &&
      carBottom > obsTop &&
      carTop < obsBottom
    ) {
      const info = document.getElementById('collision-info');
      info.textContent = `Collision with ${MAP_DATA.obstacles[i].type} obstacle`;
      info.style.display = 'block';
      return;
    }
  }

  document.getElementById('collision-info').style.display = 'none';
}





/* Mobile Steering */

const JOYSTICK = document.getElementById('joystick');
const HANDLE = document.getElementById('joystick-handle');

let joystickVector = { x: 0, y: 0 };
let joyRadius = 40;

JOYSTICK.addEventListener('touchstart', handleTouch);
JOYSTICK.addEventListener('touchmove', handleTouch);
JOYSTICK.addEventListener('touchend', resetJoystick);



function handleTouch(e) {
  e.preventDefault();

  const touch = e.touches[0];
  const rect = JOYSTICK.getBoundingClientRect();
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;

  const x = touch.clientX - rect.left;
  const y = touch.clientY - rect.top;

  const dx = x - centerX;
  const dy = y - centerY;

  const distance = Math.min(Math.sqrt(dx * dx + dy * dy), joyRadius);
  const norm = distance / joyRadius;

  const angle = Math.atan2(dy, dx);
  joystickVector.x = Math.cos(angle) * norm;
  joystickVector.y = Math.sin(angle) * norm;

  // Move handle visually
  const handleX = centerX + joystickVector.x * joyRadius;
  const handleY = centerY + joystickVector.y * joyRadius;

  HANDLE.style.left = `${handleX - 10}px`;
  HANDLE.style.top = `${handleY - 10}px`;
}

function resetJoystick() {
  joystickVector = { x: 0, y: 0 };

  const rect = JOYSTICK.getBoundingClientRect();
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;

  HANDLE.style.left = `${centerX - 10}px`;
  HANDLE.style.top = `${centerY - 10}px`;
}


function normalizeAngle(angle) {
  return ((angle + 180) % 360) - 180;
}


function applyInputLogic() {
  const joyMag = Math.sqrt(joystickVector.x ** 2 + joystickVector.y ** 2);
  const usingJoystick = joyMag > 0.05;

  if (usingJoystick) {
    const targetAngle = Math.atan2(joystickVector.x, -joystickVector.y) * (180 / Math.PI);
    const angleDiff = normalizeAngle(targetAngle - carRotation);

    if (Math.abs(angleDiff) > 1) {
      carRotation += Math.sign(angleDiff) * TURN_RATE * (speed * TURN_GRIP_FACTOR);
    }

    // Clamp the visual wheel angle to max ±20 deg
    const visualWheel = Math.max(-20, Math.min(20, angleDiff));
    wheelAngle = lerp(wheelAngle, visualWheel, 0.2);

    acceleration = joyMag * ACCELERATION_STEP;

  } else {
    if (accelerating) {
      acceleration = ACCELERATION_STEP;
    } else if (braking) {
      acceleration = -BRAKE_STEP;
    } else {
      acceleration = 0;
    }

    if (speed > 0.1) {
      if (turningLeft) {
        carRotation -= TURN_RATE * (speed * TURN_GRIP_FACTOR);
        wheelAngle = lerp(wheelAngle, -20, 0.2);
      } else if (turningRight) {
        carRotation += TURN_RATE * (speed * TURN_GRIP_FACTOR);
        wheelAngle = lerp(wheelAngle, 20, 0.2);
      } else {
        wheelAngle = lerp(wheelAngle, 0, 0.2);
      }
    } else {
      wheelAngle = lerp(wheelAngle, 0, 0.3);
    }
  }
}

const toggleBtn = document.getElementById('joystick-toggle');
const joystick = document.getElementById('joystick');

toggleBtn.addEventListener('click', () => {
  const isHidden = getComputedStyle(joystick).display === 'none';
  joystick.style.display = isHidden ? 'block' : 'none';
});


function applyFriction() {
  if (!accelerating && !braking && speed > 0) {
    speed = Math.max(0, speed - FRICTION);
  }
}


/* Cats Tail */
let tailAngle = 0;
let tailDirection = 1;
let tailTimer = 0;

function animateTail() {
  tailTimer--;
  if (tailTimer <= 0) {
    tailDirection *= -1;
    tailTimer = 30 + Math.floor(Math.random() * 40); // random delay between 30–70 frames
  }

  tailAngle = lerp(tailAngle, tailDirection * 10, 0.05);
  CAT_TAIL.style.transformOrigin = '90% 90%';
  CAT_TAIL.style.transform = `rotate(${tailAngle}deg)`;
}

/* Gabby turns*/
let gabbyAngle = 0;
let gabbyTargetAngle = 0;
let gabbyTimer = 0;

function animateGabby() {
  gabbyTimer--;
  if (gabbyTimer <= 0) {
    gabbyTargetAngle = (Math.random() < 0.5 ? -1 : 1) * 3; // ±8 deg turn
    gabbyTimer = 30 + Math.floor(Math.random() * 30); // every ~2–4 sec
  }

  gabbyAngle = lerp(gabbyAngle, gabbyTargetAngle, 0.03);
  GABBY.style.transform = `rotate(${gabbyAngle}deg)`;
}

function updateFinalTop() {
  if (acceleration > 0) {
    targetVerticalOffset = -10; // lift car slightly when speeding
  } else if (acceleration < 0) {
    targetVerticalOffset = 10;  // dip when braking
  } else {
    targetVerticalOffset = 0;   // neutral
  }

  carVerticalOffset = lerp(carVerticalOffset, targetVerticalOffset, 0.05);  
}


function renderLoop() {

  applyInputLogic();

  speed += acceleration;
  speed = Math.max(0, Math.min(speed, MAX_SPEED));
  
  BRAKE_LIGHT.style.opacity = braking && speed > 0 ? '1' : '0';
  
  applyFriction();
  updateFinalTop();
  updateCarTransform();
  updateSurface();
  animateTail();
  animateGabby();
  updateStartBadge();
  checkCollision();
  drawMinimap();
  
  requestAnimationFrame(renderLoop);

}

renderLoop();




window.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft') turningLeft = true;
  if (e.key === 'ArrowRight') turningRight = true;
  if (e.key === 'ArrowUp') accelerating = true;
  if (e.key === 'ArrowDown') braking = true;
});

window.addEventListener('keyup', (e) => {
  if (e.key === 'ArrowLeft') turningLeft = false;
  if (e.key === 'ArrowRight') turningRight = false;
  if (e.key === 'ArrowUp') accelerating = false;
  if (e.key === 'ArrowDown') braking = false;
});


function hideJoystickIfNotTouch() {
  const joystick = document.getElementById('joystick');

  // Modern touch support detection
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  if (!isTouchDevice) {
    joystick.style.display = 'none';
  } else {
    // Extra fallback: hide joystick if no touch happens within 3 seconds
    let touched = false;
    window.addEventListener('touchstart', () => touched = true, { once: true });

    setTimeout(() => {
      if (!touched) {
        joystick.style.display = 'none';
      }
    }, 3000);
  }
}

// Call this at load
hideJoystickIfNotTouch();



