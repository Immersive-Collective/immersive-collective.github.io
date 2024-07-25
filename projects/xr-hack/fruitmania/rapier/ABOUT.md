## WebXR Emitters Documentation

### Overview

This repository provides a comprehensive implementation of a particle emitter system in a WebXR Three.js scene. The system supports various geometries and allows for dynamic creation, manipulation, and animation of emitters. The emitters can be controlled via a GUI or programmatically, making it versatile for different use cases.

### Geometry Configuration

The emitter system supports multiple geometries. Each geometry has its own set of parameters and a method to create the geometry.

```javascript
const geometryConfig = {
    BoxGeometry: {
        defaultParams: { sx: 1, sy: 1, sz: 1 },
        params: [
            { name: 'sx', min: 0.01, max: 3 },
            { name: 'sy', min: 0.01, max: 3 },
            { name: 'sz', min: 0.01, max: 3 }
        ],
        create: params => new THREE.BoxGeometry(params.sx, params.sy, params.sz)
    },
    // Other geometries follow a similar structure...
};
```

### Emitter Functions

#### Creating an Emitter

```javascript
function cubeEmitter({ x = 0, y = 3, z = 0, id, delay = 0, count = 0, speedFactor = 1, direction = { x: 0, y: -1, z: 0 }, density = 1, ...params } = {}, interTime = 2000) {
    // Emitter implementation...
}
```

- **start()**: Begins the emission process.
- **pause()**: Pauses the emission process.
- **reset()**: Resets the emitter and removes all produced objects.
- **restart()**: Restarts the emission process.
- **setPosition(newPosition)**: Sets the position of the emitter.
- **setGeometryParams(newParams)**: Sets the geometry parameters.
- **setGeometryType(type)**: Sets the type of geometry.
- **setIntervalTime(newIntervalTime)**: Sets the interval time for emissions.
- **setRandomSizes(value)**: Sets whether the emitted objects should have random sizes.
- **setCount(newCount)**: Sets the number of objects to emit.
- **setDelay(newDelay)**: Sets the delay before starting the emission.
- **setDirection(newDirection)**: Sets the direction of emission.
- **setDensity(newDensity)**: Sets the density of the emitted objects.
- **setSpeedFactor(newSpeedFactor)**: Sets the speed factor for the emitted objects.
- **getParams()**: Returns the current parameters of the emitter.

#### Managing Emitters

```javascript
const storedEmitters = [];
const emittersMap = new Map();
```

- **listEmitterIds()**: Returns an array of all emitter IDs.
- **triggerEmittersArrayById(ids, action)**: Triggers an action ('start', 'pause', 'reset', 'restart') on an array of emitters by their IDs.
- **startAllEmitters()**: Starts all emitters.
- **stopAllEmitters()**: Stops all emitters.
- **removeAllEmitters()**: Removes all emitters and their associated objects.
- **triggerEmitterById(id, action)**: Triggers an action on a specific emitter by ID.
- **removeEmitterById(id)**: Removes a specific emitter by ID.

### GUI Integration

The system includes a GUI for controlling emitters. This GUI can be toggled and customized.

```javascript
function initEmittersEdit(guiKey, loadedEmitters = []) {
    // GUI implementation...
}

function toggleEmittersEditGUI() {
    if (guiInstances.has('emittersEditGUI')) {
        guiInstances.get('emittersEditGUI').destroy();
        guiInstances.delete('emittersEditGUI');
    } else {
        initEmittersEdit('emittersEditGUI', storedEmitters);
    }
}
```

### Importing and Exporting Emitters

#### Import from URL

```javascript
function loadEmitters(url) {
    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (Array.isArray(data)) {
                data.forEach(emitterData => {
                    if (typeof emitterData === 'object' && emitterData !== null) {
                        createEmitter(emitterData);
                    } else {
                        console.error('Invalid emitter data format');
                    }
                });
            } else {
                console.error('Invalid emitters data format');
            }
        })
        .catch(error => console.error('Error loading emitters:', error));
}
```

#### Import from JSON String

```javascript
function loadEmittersFromJSONString(jsonString) {
    try {
        const data = JSON.parse(jsonString);
        if (Array.isArray(data)) {
            data.forEach(emitterData => {
                if (typeof emitterData === 'object' && emitterData !== null) {
                    createEmitter(emitterData);
                } else {
                    console.error('Invalid emitter data format');
                }
            });
        } else {
            console.error('Invalid emitters data format');
        }
    } catch (error) {
        console.error('Error parsing emitters JSON:', error);
    }
}
```

### Example Usage

```javascript
const jsonString = '[{"id":"controller1","x":0,"y":0,"z":0,"sx":0.1,"sy":0.3,"sz":0.1,"geometryType":"BoxGeometry","interval":150,"randomSizes":false,"directionX":0,"directionY":0,"directionZ":0,"delay":0,"count":8,"speedFactor":100,"density":5},{"id":"controller2","x":0,"y":0,"z":0,"sx":0.1,"sy":0.3,"sz":0.1,"geometryType":"BoxGeometry","interval":150,"randomSizes":false,"directionX":0,"directionY":0,"directionZ":0,"delay":0,"count":8,"speedFactor":50,"density":10}]';

loadEmittersFromJSONString(jsonString);
```

### Running Emitters with Values and Deviations

```javascript
function runEmitterValues(emitterId, newPosition, newDirection) {
    // Run emitter with new position and direction...
}

function runEmitterDev(emitterId, positionDeviation = { x: 0, y: 0, z: 0 }, directionDeviation = { x: 0, y: 0, z: 0 }, speedFactorDeviation = 0, densityDeviation = 0) {
    // Run emitter with deviations...
}
```

### Integration with WebXR Controllers

The emitter system can be integrated with WebXR controllers to emit particles based on controller interactions.

```javascript
function shootBallFromController(controller) {
    const emitterId = listEmitterIds()[0];
    // Use controller position and direction to run the emitter...
}

function updateEmitterFromController(controller) {
    const emitterId = listEmitterIds()[0];
    // Use controller position and direction to update the emitter...
}
```

### Summary

This emitter system provides a versatile and extensible way to manage particle emissions in a WebXR Three.js scene. It supports various geometries, can be controlled via a GUI, and integrates seamlessly with WebXR controllers for dynamic interactions.