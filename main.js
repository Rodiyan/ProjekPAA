// Setup canvas
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

const GRID_SIZE = 5;
const COLS = canvas.width / GRID_SIZE;
const ROWS = canvas.height / GRID_SIZE;

let grid = Array.from({ length: ROWS }, () => Array(COLS).fill(1));
let start = null, pickup = null, destination = null;
let courier = { x: 0, y: 0, path: [], angle: 0 };
let moving = false, paused = false, speedDelay = 8, frameCounter = 0;
let loadedImage = null;
let step = 1;
let lastPath = [];
let toPickupPath = [], toDestPath = [];

let courierImage = new Image();
courierImage.src = 'Kurir.png';

// DOM Elements
const imageInput = document.getElementById("imageInput");
const loadMapBtn = document.getElementById("loadMapBtn");
const randomizeBtn = document.getElementById("randomizeBtn");
const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");
const replayBtn = document.getElementById("replayBtn");
const speedSlider = document.getElementById("speedSlider");

const speedPresets = {
  1: "Very Slow", 3: "Slow", 5: "Medium Slow",
  8: "Medium", 10: "Fast", 12: "Very Fast", 15: "Extreme"
};

loadMapBtn.addEventListener("click", loadMap);
randomizeBtn.addEventListener("click", randomize);
startBtn.addEventListener("click", startCourier);
pauseBtn.addEventListener("click", pauseCourier);
replayBtn.addEventListener("click", replayCourier);
speedSlider.addEventListener("input", updateSpeed);
updateSpeed();

function isValidPosition(x, y) {
  return x >= 0 && x < COLS && y >= 0 && y < ROWS && grid[y][x] === 0;
}

function isPathValid(path) {
  return path.length > 0 && path.every(p => isValidPosition(p.x, p.y));
}

function loadMap() {
  const file = imageInput.files[0];
  if (!file) return alert("Pilih gambar peta terlebih dahulu.");

  const img = new Image();
  const reader = new FileReader();
  reader.onload = e => {
    img.onload = () => {
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tempCtx = tempCanvas.getContext("2d");
      tempCtx.drawImage(img, 0, 0, tempCanvas.width, tempCanvas.height);
      const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height).data;

      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          const px = Math.floor(x * GRID_SIZE + GRID_SIZE / 2);
          const py = Math.floor(y * GRID_SIZE + GRID_SIZE / 2);
          const idx = (py * tempCanvas.width + px) * 4;
          const r = imageData[idx], g = imageData[idx + 1], b = imageData[idx + 2];
          const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
          const isGrayish = Math.abs(r - g) < 15 && Math.abs(g - b) < 15;
const isLikelyRoad =
  r >= 30 && r <= 150 &&
  g >= 30 && g <= 150 &&
  b >= 30 && b <= 150 &&
  Math.abs(r - g) < 40 &&
  Math.abs(g - b) < 40;

grid[y][x] = isLikelyRoad ? 0 : 1;

        }
      }

      loadedImage = img;
      alert("Peta berhasil dimuat!");
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function heuristic(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function aStar(start, goal) {
  const openSet = [start];
  const cameFrom = {};
  const gScore = { [`${start.x},${start.y}`]: 0 };

  while (openSet.length) {
    openSet.sort((a, b) =>
      gScore[`${a.x},${a.y}`] + heuristic(a, goal) - gScore[`${b.x},${b.y}`] - heuristic(b, goal)
    );
    const current = openSet.shift();
    if (current.x === goal.x && current.y === goal.y) {
      const path = [];
      let node = goal;
      while (`${node.x},${node.y}` in cameFrom) {
        path.push(node);
        node = cameFrom[`${node.x},${node.y}`];
      }
      return path.reverse();
    }

    for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
      const nx = current.x + dx, ny = current.y + dy;
      if (!isValidPosition(nx, ny)) continue;
      const neighbor = { x: nx, y: ny };
      const tentativeG = gScore[`${current.x},${current.y}`] + 1;
      const key = `${neighbor.x},${neighbor.y}`;
      if (!(key in gScore) || tentativeG < gScore[key]) {
        cameFrom[key] = current;
        gScore[key] = tentativeG;
        openSet.push(neighbor);
      }
    }
  }

  return [];
}

function randomPosition() {
  const valid = [];
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (isValidPosition(x, y)) valid.push({ x, y });
    }
  }
  return valid.length ? valid[Math.floor(Math.random() * valid.length)] : null;
}

function randomize() {
  start = randomPosition();
  pickup = randomPosition();
  destination = randomPosition();

  const toPickup = aStar(start, pickup);
  const toDest = aStar(pickup, destination);

  if (!isPathValid(toPickup) || !isPathValid(toDest)) {
    alert("Jalur tidak valid, coba ulangi.");
    return;
  }

  courier = {
    x: start.x,
    y: start.y,
    path: [...toPickup],
    angle: 0
  };

  toPickupPath = [...toPickup];
  toDestPath = [...toDest];
  lastPath = [...toPickup];

  step = 1;
  moving = false;
  paused = true;
  updateStatus("paused");
  updatePathLength();
}

function startCourier() {
  if (!start || !pickup || !destination) {
    alert("Tentukan titik awal, pickup, dan tujuan!");
    return;
  }

  if (paused && courier.path.length > 0) {
    moving = true;
    paused = false;
    updateStatus("running");
    return;
  }

  if (!moving && !paused && courier.path.length === 0 && toPickupPath.length > 0 && toDestPath.length > 0) {
    courier = {
      x: start.x,
      y: start.y,
      path: [...toPickupPath],
      angle: 0
    };
    lastPath = [...toPickupPath];
    step = 1;
    moving = true;
    updateStatus("running");
    return;
  }

  alert("Tidak ada jalur untuk dijalankan.");
}

function pauseCourier() {
  moving = false;
  paused = true;
  updateStatus("paused");
}

function replayCourier() {
  if (!start || !pickup || !destination || toPickupPath.length === 0 || toDestPath.length === 0) {
    alert("Tidak bisa replay. Jalur tidak tersedia.");
    return;
  }

  courier = {
    x: start.x,
    y: start.y,
    path: [...toPickupPath],
    angle: 0
  };

  lastPath = [...toPickupPath];
  step = 1;
  moving = true;
  paused = false;
  updateStatus("running");
  updatePathLength();
}

function updateSpeed() {
  speedDelay = 16 - parseInt(speedSlider.value);
  const preset = speedPresets[16 - speedDelay] || "Custom";
  document.getElementById("speedValue").textContent = preset;
}

function updateStatus(status) {
  const badge = document.getElementById("statusBadge");
  badge.innerHTML = status === "running"
    ? '<i class="fas fa-play mr-1"></i> Running'
    : '<i class="fas fa-pause mr-1"></i> Paused';
  badge.className = status === "running"
    ? 'status-badge bg-green-100 text-green-800'
    : 'status-badge bg-gray-100 text-gray-800';
}

function updatePathLength() {
  document.getElementById("pathLength").textContent = lastPath.length;
}

function drawCourier() {
  const cx = courier.x * GRID_SIZE + GRID_SIZE / 2;
  const cy = courier.y * GRID_SIZE + GRID_SIZE / 2;
  const size = 25;

  if (!courierImage.complete) return;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(courier.angle - Math.PI / 2);
  ctx.drawImage(courierImage, -size / 2, -size / 2, size, size);
  ctx.restore();
}

function drawFlag(x, y, color) {
  const px = x * GRID_SIZE + GRID_SIZE / 2;
  const py = y * GRID_SIZE + GRID_SIZE / 2;
  ctx.fillStyle = "#4b5563";
  ctx.fillRect(px - 1, py - 12, 2, 24);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(px + 1, py - 10);
  ctx.lineTo(px + 14, py - 5);
  ctx.lineTo(px + 1, py);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#1f2937";
  ctx.beginPath();
  ctx.arc(px, py - 12, 2, 0, Math.PI * 2);
  ctx.fill();
}

function drawGrid() {
  if (loadedImage) ctx.drawImage(loadedImage, 0, 0, canvas.width, canvas.height);
}

function loop() {
  requestAnimationFrame(loop);
  drawGrid();

  if (start) drawFlag(start.x, start.y, "#f59e0b");        // Start - Kuning
  if (pickup) drawFlag(pickup.x, pickup.y, "#3b82f6");     // Pickup - Biru
  if (destination) drawFlag(destination.x, destination.y, "#ef4444"); // Tujuan - Merah

  if (moving && courier.path.length > 0) {
    frameCounter++;
    if (frameCounter >= speedDelay) {
      const next = courier.path[0];
      if (isValidPosition(next.x, next.y)) {
        courier.path.shift();
        courier.angle = Math.atan2(next.y - courier.y, next.x - courier.x);
        courier.x = next.x;
        courier.y = next.y;

        if (courier.path.length === 0) {
          if (step === 1) {
            courier.path = [...toDestPath];
            lastPath = [...toDestPath];
            step = 2;
          } else if (step === 2) {
            moving = false;
            paused = true;
            courier.path = [];
            updateStatus("paused");
            alert("Kurir telah sampai ke tujuan!");
          }
        }
      } else {
        moving = false;
        paused = true;
        updateStatus("paused");
        alert(`Kurir keluar jalur di (${next.x}, ${next.y})`);
      }
      frameCounter = 0;
    }
  }

  drawCourier();
}
loop();