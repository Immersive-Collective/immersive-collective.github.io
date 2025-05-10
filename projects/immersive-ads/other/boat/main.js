function isInteractiveTarget(target) {
  return target.closest('.button') ||
         target.closest('.restart-button') ||
         target.closest('.ui-overlay') ||
         target.closest('.collision-overlay') ||
         target.closest('.water-container');
}

document.body.addEventListener("click", function (e) {
  if (!isInteractiveTarget(e.target) && e.button !== 2) {
    window.openLink("clickTag1");
  }
});

document.body.addEventListener("touchend", function (e) {
  if (!isInteractiveTarget(e.target)) {
    window.openLink("clickTag1");
  }
});


const playerBoat = document.querySelector('.player-boat');
const waterContainer = document.querySelector('.water-container');
const boyWrapper = document.querySelector('.boy-wrapper');

const totalWidth = 300;
const numberOfLanes = 4;
const laneSpacing = totalWidth / numberOfLanes;
const lanes = Array.from({ length: numberOfLanes }, (_, i) => Math.floor(i * laneSpacing));

const difficulty = 'easy';
const seed = 123;

const difficultySettings = {
  easy:   { spawnRate: 3000, maxObstacles: 1 },
  medium: { spawnRate: 1500, maxObstacles: 2 },
  hard:   { spawnRate: 1000, maxObstacles: 3 }
};

const { spawnRate, maxObstacles } = difficultySettings[difficulty];

function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(seed);

let currentLane = 2;
let targetX = lanes[currentLane];
let currentX = targetX;
let boatY = 400;
let targetY = boatY;

function updateBoatAndTailPosition() {
  playerBoat.style.left = `${currentX}px`;
  playerBoat.style.top = `${boatY}px`;
}

updateBoatAndTailPosition();

let gameRunning = false;
let timer = 60;
let spawnInterval, timerInterval, moveAnimationFrame, verticalMoveFrame;

let offset = 0;
const scrollSpeed = 2;
let waterAnimationId;

function animateWater() {
  if (!gameRunning) return;
  offset += scrollSpeed;
  const surface = document.querySelector('.water-surface');
  const riverbed = document.querySelector('.riverbed');
  surface.style.backgroundPosition = `0 ${offset}px`;
  riverbed.style.backgroundPosition = `0 ${offset}px`;
  waterAnimationId = requestAnimationFrame(animateWater);
}


function animateBoatSlide() {
  if (!gameRunning) return;
  const dx = targetX - currentX;
  if (Math.abs(dx) < 1) {
    currentX = targetX;
    updateBoatAndTailPosition();
    return;
  }
  currentX += dx * 0.1;
  updateBoatAndTailPosition();
  moveAnimationFrame = requestAnimationFrame(animateBoatSlide);
}

function animateVerticalMove() {
  if (!gameRunning) return;
  const dy = targetY - boatY;
  if (Math.abs(dy) < 1) {
    boatY = targetY;
    updateBoatAndTailPosition();
    return;
  }
  boatY += dy * 0.1;
  updateBoatAndTailPosition();
  verticalMoveFrame = requestAnimationFrame(animateVerticalMove);
}

window.addEventListener('keydown', (e) => {
  if (e.key === 'p' || e.key === 'P') {
    gameRunning = !gameRunning;
    if (gameRunning) {
      animateWater();
      animateBoatSlide();
      animateVerticalMove();
      spawnInterval = setInterval(spawnObstacleWave, spawnRate);
      timerInterval = setInterval(updateTimer, 1000);
    } else {
      clearInterval(spawnInterval);
      clearInterval(timerInterval);
      cancelAnimationFrame(waterAnimationId);
      cancelAnimationFrame(moveAnimationFrame);
      cancelAnimationFrame(verticalMoveFrame);
    }
    return;
  }

  if (!gameRunning) return;

  let direction = null;
  if (e.key === 'ArrowLeft' && currentLane > 0) {
    currentLane--;
    direction = 'left';
  } else if (e.key === 'ArrowRight' && currentLane < lanes.length - 1) {
    currentLane++;
    direction = 'right';
  } else if (e.key === 'ArrowUp') {
    targetY = Math.max(300, boatY - 20);
    cancelAnimationFrame(verticalMoveFrame);
    animateVerticalMove();
  } else if (e.key === 'ArrowDown') {
    targetY = Math.min(500, boatY + 20);
    cancelAnimationFrame(verticalMoveFrame);
    animateVerticalMove();
  }

  if (direction !== null) {
    const rotateDeg = direction === 'left' ? -10 : 10;
    targetX = lanes[currentLane];
    cancelAnimationFrame(moveAnimationFrame);
    animateBoatSlide();
    playerBoat.style.transform = `rotate(${rotateDeg}deg)`;
    setTimeout(() => boyWrapper.style.transform = `rotate(${rotateDeg * 1.2}deg)`, 150);
    setTimeout(() => playerBoat.style.transform = `rotate(0deg)`, 300);
    setTimeout(() => boyWrapper.style.transform = `rotate(0deg)`, 700);
  }
});

document.getElementById('startButton').addEventListener('click', (e) => {
  e.stopPropagation();
  document.getElementById('startScreen').style.display = 'none';
  startGame();
});

document.querySelector('.restart-button').addEventListener('click', (e) => {
  e.stopPropagation(); 
  location.reload();
});

function startGame() {
  gameRunning = true;
  animateWater();
  spawnInterval = setInterval(spawnObstacleWave, spawnRate);
  timerInterval = setInterval(updateTimer, 1000);
}

function updateTimer() {
  timer--;
  document.getElementById('gameTimer').textContent = `Time: ${timer}`;
  if (timer <= 0) endGame();
}

function endGame() {
  gameRunning = false;
  clearInterval(spawnInterval);
  clearInterval(timerInterval);
  const overlay = document.getElementById('collisionOverlay');
  overlay.classList.add('show');
  overlay.querySelector('.message').setAttribute('data-status', 'end');
}

function showCollisionOverlay() {
  gameRunning = false;
  clearInterval(spawnInterval);
  clearInterval(timerInterval);
  cancelAnimationFrame(waterAnimationId);
  cancelAnimationFrame(moveAnimationFrame);
  cancelAnimationFrame(verticalMoveFrame);
  playerBoat.classList.add('hit');
  waterContainer.classList.add('shake');
  setTimeout(() => {
    waterContainer.classList.remove('shake');
    const overlay = document.getElementById('collisionOverlay');
    overlay.classList.add('show');
    overlay.querySelector('.message').setAttribute('data-status', 'collision');
  }, 300);
}

function spawnObstacleWave() {
  const numObstacles = Math.floor(rng() * maxObstacles) + 1;
  const shuffled = [...lanes].sort(() => rng() - 0.5);
  const selectedLanes = shuffled.slice(0, numObstacles);
  selectedLanes.forEach((x) => spawnObstacle(x));
}

function spawnObstacle(x) {
  const el = document.createElement('div');
  el.className = 'obstacle';
  el.style.left = `${x}px`;
  el.style.top = `-50px`;

  const size = 35 + Math.floor(rng() * 50);
  el.style.width = `${size}px`;
  el.style.height = `${size}px`;

  const wrapper = document.createElement('div');
  wrapper.className = 'obstacle-mask';

  const img = document.createElement('img');
  const textures = [
    'https://play2.s3.amazonaws.com/assets/akluR57XK.webp',
    'https://play2.s3.amazonaws.com/assets/Oc_SZz4y4.webp',
    'https://play2.s3.amazonaws.com/assets/gdqkNRW7X.webp'
  ];
  img.src = textures[Math.floor(rng() * textures.length)];
  img.draggable = false;

  wrapper.appendChild(img);
  el.appendChild(wrapper);
  waterContainer.appendChild(el);
  animateObstacle(el);
}

function animateObstacle(el) {
  let y = -50;
  const fallSpeed = 2;
  function move() {
    if (!gameRunning) return;
    y += fallSpeed;
    el.style.top = `${y}px`;
    const boatRect = playerBoat.getBoundingClientRect();
    const obsRect = el.getBoundingClientRect();
    const verticalAligned = (
      obsRect.top < boatRect.bottom - 10 &&
      obsRect.bottom > boatRect.top + 10
    );
    const horizontalOverlap = !(
      obsRect.right < boatRect.left || obsRect.left > boatRect.right
    );
    const collided = verticalAligned && horizontalOverlap;
    if (collided) {
      el.style.filter = 'hue-rotate(-100deg) brightness(1.2)';
      el.style.transform = 'rotate(15deg)';
      showCollisionOverlay();
    }
    if (y < 600) {
      requestAnimationFrame(move);
    } else {
      el.remove();
    }
  }
  move();
}

function setupTouchControls() {
  waterContainer.addEventListener('touchstart', (e) => {
    if (!gameRunning || e.touches.length !== 1) return;
    const touch = e.touches[0];
    const touchX = touch.clientX;
    const touchY = touch.clientY;
    const boatRect = playerBoat.getBoundingClientRect();
    const boatCenterX = boatRect.left + boatRect.width / 2;
    const boatCenterY = boatRect.top + boatRect.height / 2;
    const dx = touchX - boatCenterX;
    const dy = touchY - boatCenterY;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    if (absDx > absDy) {
      if (dx < 0 && currentLane > 0) simulateKeyPress('ArrowLeft');
      else if (dx > 0 && currentLane < lanes.length - 1) simulateKeyPress('ArrowRight');
    } else {
      if (dy < 0) simulateKeyPress('ArrowUp');
      else simulateKeyPress('ArrowDown');
    }
  });
}

function simulateKeyPress(key) {
  const event = new KeyboardEvent('keydown', { key });
  window.dispatchEvent(event);
}

setupTouchControls();

function createTailTrail() {
  const trail = document.createElement('div');
  trail.className = 'trail-instance';

  const boatRect = playerBoat.getBoundingClientRect();
  const containerRect = waterContainer.getBoundingClientRect();

  const trailX = boatRect.left + boatRect.width / 2 - containerRect.left;
  const trailY = boatRect.top + boatRect.height - containerRect.top - 20;

  trail.style.left = `${trailX}px`;
  trail.style.top = `${trailY}px`;

  waterContainer.appendChild(trail);

  setTimeout(() => {
    trail.remove();
  }, 3000);
}

setInterval(() => {
  if (gameRunning) createTailTrail();
}, 180);
