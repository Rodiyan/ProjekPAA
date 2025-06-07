// Setup canvas
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

const GRID_SIZE = 20;
const COLS = canvas.width / GRID_SIZE;
const ROWS = canvas.height / GRID_SIZE;

let grid = Array.from({ length: ROWS }, () => Array(COLS).fill(1));
let start = null, destination = null, path = [];
let courier = { x: 0, y: 0, path: [], angle: 0 };
let moving = false, paused = false, speedDelay = 8, frameCounter = 0, lastPath = [];
let loadedImage = null;

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
          const isGray = r >= 90 && r <= 150 && g >= 90 && g <= 150 && b >= 90 && b <= 150 &&
                         Math.abs(r - g) < 5 && Math.abs(g - b) < 5;
          grid[y][x] = isGray ? 0 : 1;
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
  destination = randomPosition();
  path = aStar(start, destination);

  if (!isPathValid(path)) {
    alert("Jalur tidak valid, coba ulangi.");
    return;
  }

  courier = {
    x: start.x,
    y: start.y,
    path: [...path],
    angle: 0
  };
  lastPath = [...path];

  moving = false;
  paused = true; // ✅ supaya bisa langsung tekan start tanpa klik pause dulu
  updateStatus("paused");
  updatePathLength();
}

function startCourier() {
  if (!start || !destination) {
    alert("Tentukan posisi awal dan tujuan terlebih dahulu!");
    return;
  }

  if (paused && courier.path.length > 0) {
    moving = true;
    paused = false;
    updateStatus("running");
    return;
  }

  if (courier.path.length === 0 && lastPath.length > 0) {
    courier = {
      x: start.x,
      y: start.y,
      path: [...lastPath],
      angle: 0
    };
    moving = true;
    paused = false;
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
  if (!start || !destination || !isPathValid(lastPath)) {
    alert("Jalur tidak valid untuk replay.");
    return;
  }
  courier = { x: start.x, y: start.y, path: [...lastPath], angle: 0 };
  moving = true;
  paused = false;
  updateStatus("running");
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

  ctx.fillStyle = "#10b981";
  ctx.beginPath();
  ctx.arc(cx, cy, GRID_SIZE / 3, 0, 2 * Math.PI);
  ctx.fill();

  ctx.fillStyle = "#047857";
  ctx.beginPath();
  ctx.moveTo(cx + GRID_SIZE / 3 * Math.cos(courier.angle), cy + GRID_SIZE / 3 * Math.sin(courier.angle));
  ctx.lineTo(cx + GRID_SIZE / 4 * Math.cos(courier.angle + 2.4), cy + GRID_SIZE / 4 * Math.sin(courier.angle + 2.4));
  ctx.lineTo(cx + GRID_SIZE / 4 * Math.cos(courier.angle - 2.4), cy + GRID_SIZE / 4 * Math.sin(courier.angle - 2.4));
  ctx.closePath();
  ctx.fill();
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
  if (loadedImage) {
    ctx.drawImage(loadedImage, 0, 0, canvas.width, canvas.height);
  }
}

function loop() {
  requestAnimationFrame(loop);
  drawGrid();

  if (lastPath.length > 0) {
    ctx.strokeStyle = "rgba(59, 130, 246, 0.5)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(start.x * GRID_SIZE + GRID_SIZE / 2, start.y * GRID_SIZE + GRID_SIZE / 2);
    lastPath.forEach(p => {
      ctx.lineTo(p.x * GRID_SIZE + GRID_SIZE / 2, p.y * GRID_SIZE + GRID_SIZE / 2);
    });
    ctx.stroke();
  }

  if (start) drawFlag(start.x, start.y, "#f59e0b");
  if (destination) drawFlag(destination.x, destination.y, "#ef4444");

  if (moving && courier.path.length > 0) {
    frameCounter++;
    if (frameCounter >= speedDelay) {
      const next = courier.path[0];
      if (isValidPosition(next.x, next.y)) {
        courier.path.shift();
        courier.angle = Math.atan2(next.y - courier.y, next.x - courier.x);
        courier.x = next.x;
        courier.y = next.y;
      } else {
        moving = false;
        paused = false;
        updateStatus("paused");
        alert(`Kurir keluar jalur di (${next.x}, ${next.y})`);
      }
      frameCounter = 0;
    }
  }

  drawCourier();
}
loop();