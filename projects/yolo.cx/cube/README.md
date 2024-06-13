### Documentation for Cube Functions

#### Function: `seededRandom`

```javascript
function seededRandom(seed) {
    var x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
}
```

**Description**: 
Generates a pseudo-random number based on a seed value.

**Parameters**:
- `seed` (number): The seed value used to generate the random number.

**Returns**: 
- A pseudo-random number between 0 and 1.

#### Function: `addCubes`

```javascript
function addCubes(h = 10, cubesAmount = 4, radius = 5, centerX = 0, centerZ = 0, seed = 12345) {
    const cubeSizes = Array(cubesAmount).fill({x: 0.5, y: 0.15, z: 0.6});
    const cubeColsArr = [0xFDFD95, 0xFFFFFF, 0xFC6C85, 0xFC8EAC, 0xFFD1DC];

    let seedCounter = seed;

    for (let i = 0; i < cubesAmount; i++) {
        let angle = seededRandom(seedCounter++) * Math.PI * 2;
        let distance = Math.sqrt(seededRandom(seedCounter++)) * radius;
        let position = {
            x: centerX + distance * Math.cos(angle),
            y: h + i * 0.15,
            z: centerZ + distance * Math.sin(angle)
        };
        const cols = cubeColsArr;
        const color = cols[i % cols.length];
        addSingleCubeR(cubeSizes[i], position, color);
    }
}

window.addCubes = addCubes;
```

**Description**:
Creates multiple cubes arranged in a circular pattern.

**Parameters**:
- `h` (number, default 10): The base height for the cubes.
- `cubesAmount` (number, default 4): The number of cubes to create.
- `radius` (number, default 5): The radius within which the cubes are arranged.
- `centerX` (number, default 0): The X coordinate of the center point.
- `centerZ` (number, default 0): The Z coordinate of the center point.
- `seed` (number, default 12345): The seed value for random number generation.

**Internal Variables**:
- `cubeSizes` (array): An array defining the size of each cube.
- `cubeColsArr` (array): An array of color values for the cubes.
- `seedCounter` (number): Counter for the seed value.

**Calls**:
- `addSingleCubeR(size, position, color)`: Adds a single cube with specified size, position, and color.

#### Function: `addCubesGrid`

```javascript
function addCubesGrid(rows = 5, cols = 5, cubeSize = { x: 0.6, y: 0.65, z: 0.6 }, spacing = 1, seed = 12345) {
    const cubeColsArr = [0xFDFD95, 0xFFFFFF, 0xFC6C85, 0xFC8EAC, 0xFFD1DC];

    let seedCounter = seed;

    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            let position = {
                x: col * (cubeSize.x + spacing),
                y: 2,
                z: row * (cubeSize.z + spacing),
            };
            const cols = cubeColsArr;
            const color = cols[(row + col) % cols.length];
            addSingleCube(cubeSize, position, color);
        }
    }
}

window.addCubesGrid = addCubesGrid;
```

**Description**:
Creates a grid of cubes with specified rows and columns.

**Parameters**:
- `rows` (number, default 5): The number of rows in the grid.
- `cols` (number, default 5): The number of columns in the grid.
- `cubeSize` (object, default `{ x: 0.6, y: 0.65, z: 0.6 }`): The size of each cube.
- `spacing` (number, default 1): The spacing between the cubes.
- `seed` (number, default 12345): The seed value for random number generation.

**Internal Variables**:
- `cubeColsArr` (array): An array of color values for the cubes.
- `seedCounter` (number): Counter for the seed value.

**Calls**:
- `addSingleCube(size, position, color)`: Adds a single cube with specified size, position, and color.

These functions use the `seededRandom` function for generating pseudo-random numbers to position and color the cubes, ensuring consistent results across different executions with the same seed value. The `addCubes` function arranges cubes in a circular pattern, while the `addCubesGrid` function arranges them in a grid.