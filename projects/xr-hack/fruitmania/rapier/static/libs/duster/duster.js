import * as THREE from 'three';

const dustersMap = new Map();
const storedDusters = [];

const dustParams = {
    dustCount: 256 * 2,
    dustSpeedY: 0.02,
    dustSpeedX: 0.01,
    dustSpeedZ: 0.03,
    dustSizeFac: 4,
    dustTopFloor: 10,
    dustFloor: -10,
    dustArea: 20
};

function createGeometry(size) {
    const geometries = [
        new THREE.BoxGeometry(size.x, size.y, size.z),
        new THREE.CircleGeometry(size.x, 6),
        new THREE.ConeGeometry(size.x, size.y * 2, 6),
        new THREE.TetrahedronGeometry(size.x),
        new THREE.RingGeometry(size.x / 2, size.x, 6)
    ];
    return geometries[Math.floor(Math.random() * geometries.length)];
}

function initDuster({ id, params, scene }) {
    const duster = {
        id,
        params,
        dusts: [],
        isActive: false,
        init() {
            for (let i = 0; i < this.params.dustCount; i++) {
                let randomSize = { x: Math.random() * 0.025 * this.params.dustSizeFac, y: Math.random() * 0.025 * this.params.dustSizeFac, z: Math.random() * 0.01 * this.params.dustSizeFac };
                const geometry = createGeometry(randomSize);
                const material = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide });
                const dust = new THREE.Mesh(geometry, material);
                dust.position.set((Math.random() - 0.5) * this.params.dustArea, (Math.random() - 0.5) * (this.params.dustTopFloor - this.params.dustFloor) + this.params.dustFloor, (Math.random() - 0.5) * this.params.dustArea);
                dust.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
                scene.add(dust);
                this.dusts.push(dust);
            }
        },
        update() {
            if (!this.isActive) return;
            this.dusts.forEach(dust => {
                dust.position.y += this.params.dustSpeedY;
                dust.position.x += this.params.dustSpeedX;
                dust.position.z += this.params.dustSpeedZ;
                dust.rotation.x += 0.01;
                dust.rotation.y += 0.001;
                if (dust.position.y > this.params.dustTopFloor) {
                    dust.position.set((Math.random() - 0.5) * this.params.dustArea, this.params.dustFloor, (Math.random() - 0.5) * this.params.dustArea);
                }
            });
        },
        remove() {
            this.dusts.forEach(dust => scene.remove(dust));
            this.dusts = [];
        },
        start() {
            this.isActive = true;
        },
        pause() {
            this.isActive = false;
        },
        restart() {
            this.remove();
            this.init();
            this.start();
        },
        getParams() {
            return this.params;
        }
    };
    duster.init();
    dustersMap.set(id, duster);
    return duster;
}

function exportDustOptions(dustParams) {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dustParams));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "dustOptions.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

function importDustOptions(scene, guiInstances) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = event => {
        const file = event.target.files[0];
        const reader = new FileReader();
        reader.onload = function(e) {
            const content = e.target.result;
            const importedOptions = JSON.parse(content);
            createDusterFromImport(importedOptions, scene, guiInstances);
        };
        reader.readAsText(file);
    };

    input.click();
}

function createDusterFromImport(importedOptions, scene, guiInstances) {
    const dusterId = `duster-${Math.random().toString(36).substr(2, 9)}`;
    const duster = initDuster({ id: dusterId, params: importedOptions, scene });
    const gui = guiInstances.get('dustEditGUI');
    if (gui) {
        createDusterFolder(gui, dusterId, duster, scene);
    }
}

function createDusterFolder(gui, dusterId, duster, scene) {
    const folder = gui.addFolder(`Duster ${dusterId}`);
    folder.add(duster.params, 'dustCount', 256, 512).name('Dust Count').onChange(value => { duster.params.dustCount = value; duster.remove(); duster.init(scene); });
    folder.add(duster.params, 'dustSpeedY', 0.01, 0.1).name('Dust Speed Y').onChange(value => duster.params.dustSpeedY = value);
    folder.add(duster.params, 'dustSpeedX', 0.01, 0.1).name('Dust Speed X').onChange(value => duster.params.dustSpeedX = value);
    folder.add(duster.params, 'dustSpeedZ', 0.01, 0.1).name('Dust Speed Z').onChange(value => duster.params.dustSpeedZ = value);
    folder.add(duster.params, 'dustSizeFac', 1, 10).name('Dust Size Factor').onChange(value => { duster.params.dustSizeFac = value; duster.remove(); duster.init(scene); });
    folder.add(duster.params, 'dustTopFloor', 1, 10).name('Dust Top Floor').onChange(value => duster.params.dustTopFloor = value);
    folder.add(duster.params, 'dustFloor', -10, 0).name('Dust Floor').onChange(value => duster.params.dustFloor = value);
    folder.add(duster.params, 'dustArea', 10, 100).name('Dust Area').onChange(value => duster.params.dustArea = value);
    folder.add({ start: () => duster.start() }, 'start').name('Start');
    folder.add({ pause: () => duster.pause() }, 'pause').name('Pause');
    folder.add({ restart: () => duster.restart() }, 'restart').name('Restart');
    folder.add({ removeDuster: () => removeDuster(dusterId, folder) }, 'removeDuster').name('Remove Duster');
}

function removeDuster(id, folder) {
    const duster = dustersMap.get(id);
    if (!duster) return;

    duster.remove();
    dustersMap.delete(id);

    if (folder) {
        folder.close();
        folder.domElement.remove();
    }
}

function exportAllDusters() {
    const dustersArray = Array.from(dustersMap.values()).map(duster => ({
        id: duster.id,
        params: duster.getParams()
    }));
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dustersArray));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "dusters.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

function importAllDusters(scene, guiInstances) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = event => {
        const file = event.target.files[0];
        const reader = new FileReader();
        reader.onload = function(e) {
            const content = e.target.result;
            const importedDusters = JSON.parse(content);
            importedDusters.forEach(dusterData => {
                createDusterFromImport(dusterData.params, scene, guiInstances);
            });
        };
        reader.readAsText(file);
    };

    input.click();
}

// Functions to control dusters without GUI
function startDuster(id) {
    const duster = dustersMap.get(id);
    if (duster) {
        duster.start();
    }
}

function pauseDuster(id) {
    const duster = dustersMap.get(id);
    if (duster) {
        duster.pause();
    }
}

function restartDuster(id) {
    const duster = dustersMap.get(id);
    if (duster) {
        duster.restart();
    }
}

function removeDusterById(id) {
    const duster = dustersMap.get(id);
    if (duster) {
        duster.remove();
        dustersMap.delete(id);
    }
}

function setDusterParams(id, newParams) {
    const duster = dustersMap.get(id);
    if (duster) {
        Object.assign(duster.params, newParams);
        duster.remove();
        duster.init();
    }
}

async function loadDusters(path) {
    try {
        const response = await fetch(path);
        const data = await response.json();

        if (Array.isArray(data)) {
            data.forEach(dusterData => {
                const dusterId = `duster-${Math.random().toString(36).substr(2, 9)}`;
                const duster = initDuster({ id: dusterId, params: dusterData, scene: window.scene });
                storedDusters.push(duster);
            });
        } else if (typeof data === 'object' && data !== null) {
            const dusterId = `duster-${Math.random().toString(36).substr(2, 9)}`;
            const duster = initDuster({ id: dusterId, params: data, scene: window.scene });
            storedDusters.push(duster);
        } else {
            console.error('Invalid duster data format');
        }
    } catch (error) {
        console.error('Error loading dusters:', error);
    }
}

// Additional methods for external control
function listDusterIds() {
    return Array.from(dustersMap.keys());
}

function triggerDustersArrayById(ids, action) {
    ids.forEach(id => {
        triggerDusterById(id, action);
    });
}

function triggerDusterById(id, action) {
    const duster = dustersMap.get(id);
    if (!duster) {
        console.error(`Duster with ID ${id} not found.`);
        return;
    }
    switch (action) {
        case 'start':
            duster.start();
            break;
        case 'pause':
            duster.pause();
            break;
        case 'reset':
            duster.restart();
            break;
        case 'restart':
            duster.restart();
            break;
        default:
            console.error(`Invalid action: ${action}`);
    }
}

// Exporting functions for external use
export {
    dustParams,
    initDuster,
    exportDustOptions,
    importDustOptions,
    exportAllDusters,
    importAllDusters,
    startDuster,
    pauseDuster,
    restartDuster,
    removeDusterById,
    setDusterParams,
    dustersMap, // Exporting dustersMap for use in other modules
    loadDusters, // Exporting the function to load and start a duster from JSON without GUI
    listDusterIds,
    triggerDustersArrayById,
    triggerDusterById
};
