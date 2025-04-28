const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const GRID_SIZE = 20;
const COLS = canvas.width / GRID_SIZE;
const ROWS = canvas.height / GRID_SIZE;

let grid = Array.from({ length: ROWS }, () => Array(COLS).fill(1));
let start = null;
let destination = null;
let path = [];
let courier = { x: 0, y: 0, path: [], angle: 0 };
let moving = false;
let speedDelay = 8;
let frameCounter = 0;
let lastPath = [];
let imageInput = document.getElementById("imageInput");

// Speed presets
const speedPresets = {
  1: "Very Slow",
  3: "Slow",
  5: "Medium Slow",
  8: "Medium",
  10: "Fast",
  12: "Very Fast",
  15: "Extreme"
};

function updateSpeed() {
  const slider = document.getElementById("speedSlider");
  speedDelay = 16 - parseInt(slider.value); // Invert so higher values = faster
  
  // Update speed display
  const speedValue = document.getElementById("speedValue");
  const presetValue = 16 - speedDelay;
  speedValue.textContent = speedPresets[presetValue] || "Custom";
}

function updatePathLength() {
  document.getElementById("pathLength").textContent = lastPath.length;
}

function updateStatus(status) {
  const badge = document.getElementById("statusBadge");
  if (status === "running") {
    badge.innerHTML = '<i class="fas fa-play mr-1"></i> Running';
    badge.className = 'status-badge bg-green-100 text-green-800';
  } else {
    badge.innerHTML = '<i class="fas fa-pause mr-1"></i> Paused';
    badge.className = 'status-badge bg-gray-100 text-gray-800';
  }
}

function drawGrid() {
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      ctx.fillStyle = grid[y][x] === 1 ? "#fff" : "#f3f4f6";
      ctx.fillRect(x * GRID_SIZE, y * GRID_SIZE, GRID_SIZE, GRID_SIZE);
      ctx.strokeStyle = "#e5e7eb";
      ctx.strokeRect(x * GRID_SIZE, y * GRID_SIZE, GRID_SIZE, GRID_SIZE);
    }
  }
}

function randomPosition() {
  const roads = [];
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (grid[y][x] === 0) roads.push({ x, y });
    }
  }
  return roads.length ? roads[Math.floor(Math.random() * roads.length)] : { x: 0, y: 0 };
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
      (gScore[`${a.x},${a.y}`] + heuristic(a, goal)) - (gScore[`${b.x},${b.y}`] + heuristic(b, goal))
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

    for (let [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
      const neighbor = { x: current.x + dx, y: current.y + dy };
      if (
        neighbor.x >= 0 && neighbor.x < COLS &&
        neighbor.y >= 0 && neighbor.y < ROWS &&
        grid[neighbor.y][neighbor.x] === 0
      ) {
        const tentativeG = gScore[`${current.x},${current.y}`] + 1;
        if (
          !(`${neighbor.x},${neighbor.y}` in gScore) ||
          tentativeG < gScore[`${neighbor.x},${neighbor.y}`]
        ) {
          cameFrom[`${neighbor.x},${neighbor.y}`] = current;
          gScore[`${neighbor.x},${neighbor.y}`] = tentativeG;
          openSet.push(neighbor);
        }
      }
    }
  }
  return [];
}

function drawCourier() {
  const centerX = courier.x * GRID_SIZE + GRID_SIZE / 2;
  const centerY = courier.y * GRID_SIZE + GRID_SIZE / 2;
  const angle = courier.angle;
  
  // Draw courier body
  ctx.fillStyle = "#10b981";
  ctx.beginPath();
  ctx.arc(centerX, centerY, GRID_SIZE/3, 0, Math.PI * 2);
  ctx.fill();
  
  // Draw courier direction indicator
  ctx.fillStyle = "#047857";
  ctx.beginPath();
  ctx.moveTo(centerX + GRID_SIZE/3 * Math.cos(angle), centerY + GRID_SIZE/3 * Math.sin(angle));
  ctx.lineTo(centerX + GRID_SIZE/4 * Math.cos(angle + 2.4), centerY + GRID_SIZE/4 * Math.sin(angle + 2.4));
  ctx.lineTo(centerX + GRID_SIZE/4 * Math.cos(angle - 2.4), centerY + GRID_SIZE/4 * Math.sin(angle - 2.4));
  ctx.closePath();
  ctx.fill();
}

function drawFlag(x, y, color) {
  const px = x * GRID_SIZE + GRID_SIZE / 2;
  const py = y * GRID_SIZE + GRID_SIZE / 2;
  
  // Draw flag pole
  ctx.fillStyle = "#4b5563";
  ctx.fillRect(px - 1, py - 12, 2, 24);
  
  // Draw flag
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(px + 1, py - 10);
  ctx.lineTo(px + 14, py - 5);
  ctx.lineTo(px + 1, py);
  ctx.closePath();
  ctx.fill();
  
  // Draw flag pole top
  ctx.fillStyle = "#1f2937";
  ctx.beginPath();
  ctx.arc(px, py - 12, 2, 0, Math.PI * 2);
  ctx.fill();
}

function loop() {
  requestAnimationFrame(loop);
  drawGrid();
  
  // Draw path if exists
  if (lastPath.length > 0) {
    ctx.strokeStyle = "rgba(59, 130, 246, 0.5)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(
      start.x * GRID_SIZE + GRID_SIZE / 2,
      start.y * GRID_SIZE + GRID_SIZE / 2
    );
    
    lastPath.forEach(point => {
      ctx.lineTo(
        point.x * GRID_SIZE + GRID_SIZE / 2,
        point.y * GRID_SIZE + GRID_SIZE / 2
      );
    });
    
    ctx.stroke();
  }
  
  if (start) drawFlag(start.x, start.y, "#f59e0b");
  if (destination) drawFlag(destination.x, destination.y, "#ef4444");
  
  if (moving && courier.path.length > 0) {
    frameCounter++;
    if (frameCounter >= speedDelay) {
      const next = courier.path.shift();
      const dx = next.x - courier.x;
      const dy = next.y - courier.y;
      courier.angle = Math.atan2(dy, dx);
      courier.x = next.x;
      courier.y = next.y;
      frameCounter = 0;
    }
  }
  drawCourier();
}
loop();

function loadMap() {
  const file = imageInput.files[0];
  if (!file) {
    alert("Please select an image file first!");
    return;
  }
  const img = new Image();
  const reader = new FileReader();
  reader.onload = function (e) {
    img.onload = function () {
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = COLS;
      tempCanvas.height = ROWS;
      const tempCtx = tempCanvas.getContext("2d");
      tempCtx.drawImage(img, 0, 0, COLS, ROWS);
      const imageData = tempCtx.getImageData(0, 0, COLS, ROWS).data;
      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          const index = (y * COLS + x) * 4;
          const brightness = imageData[index]; // grayscale
          grid[y][x] = brightness < 128 ? 0 : 1;
        }
      }
      alert("Map loaded successfully! Now randomize positions or set them manually.");
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function randomize() {
  start = randomPosition();
  destination = randomPosition();
  path = aStar(start, destination);
  courier = { x: start.x, y: start.y, path: [...path], angle: 0 };
  lastPath = [...path];
  moving = false;
  updatePathLength();
  updateStatus("paused");
}

function startCourier() {
  if (!start || !destination) {
    alert("Please set start and destination positions first!");
    return;
  }
  if (courier.path.length === 0) {
    courier.path = [...lastPath];
  }
  moving = true;
  updateStatus("running");
}

function pauseCourier() {
  moving = false;
  updateStatus("paused");
}

function replayCourier() {
  if (!start || !destination) {
    alert("Please set start and destination positions first!");
    return;
  }
  courier = { x: start.x, y: start.y, path: [...lastPath], angle: 0 };
  moving = true;
  updateStatus("running");
}

function startGame() {
  alert("Hide & Seek functionality will be implemented here");
}

// Initialize
updateSpeed();