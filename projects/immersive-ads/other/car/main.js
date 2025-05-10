/*

  Author: Sylwester Mielniczuk sylwester@workwork.fun

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

let carX = 150;
let carY = 430;
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
const ACCELERATION_STEP = 0.2;
const BRAKE_STEP = 0.3;
const FRICTION = 0.02;
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


function updateSurface() {
  const angle = -(carRotation % 360) * (Math.PI / 180);
  const vx = Math.sin(angle) * speed * (1 + CAR_SCALE);
  const vy = Math.cos(angle) * speed * (1 + CAR_SCALE);

  surfaceOffsetX += vx;
  surfaceOffsetY += vy;

  SURFACE.style.backgroundPosition = `${surfaceOffsetX}px ${surfaceOffsetY}px`;
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



// function applyInputLogic() {
//   const joyMag = Math.sqrt(joystickVector.x ** 2 + joystickVector.y ** 2);
//   const usingJoystick = joyMag > 0.05;

//   if (usingJoystick) {
//     // Joystick: analog control
//     const targetAngle = Math.atan2(joystickVector.x, -joystickVector.y) * (180 / Math.PI);
//     const angleDiff = normalizeAngle(targetAngle - carRotation);

//     if (Math.abs(angleDiff) > 1) {
//       carRotation += Math.sign(angleDiff) * TURN_RATE * (speed * TURN_GRIP_FACTOR);
//     }

//     wheelAngle = lerp(wheelAngle, angleDiff, 0.2);
//     acceleration = joyMag * ACCELERATION_STEP;

//   } else {
//     // Arrow keys fallback
//     if (accelerating) {
//       acceleration = ACCELERATION_STEP;
//     } else if (braking) {
//       acceleration = -BRAKE_STEP;
//     } else {
//       acceleration = 0;
//     }

//     if (speed > 0.1) {
//       if (turningLeft) {
//         carRotation -= TURN_RATE * (speed * TURN_GRIP_FACTOR);
//         wheelAngle = lerp(wheelAngle, -20, 0.2);
//       } else if (turningRight) {
//         carRotation += TURN_RATE * (speed * TURN_GRIP_FACTOR);
//         wheelAngle = lerp(wheelAngle, 20, 0.2);
//       } else {
//         wheelAngle = lerp(wheelAngle, 0, 0.2);
//       }
//     } else {
//       wheelAngle = lerp(wheelAngle, 0, 0.3);
//     }
//   }
// }




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








