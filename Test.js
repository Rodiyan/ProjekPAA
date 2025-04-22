const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const gameInfo = document.getElementById("gameInfo");
const gameResult = document.getElementById("gameResult");
const replayHideSeekBtn = document.getElementById("replayHideSeekBtn");

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

// Hide & Seek variables
let hideAndSeekMode = false;
let seeker = { x: 0, y: 0, angle: 0, path: [] };
let hider = { x: 0, y: 0, angle: 0, path: [] };
let gameStartTime = 0;
let gameEndTime = 0;
let gameInterval;
let animationFrameId;
const SEEKER_SPEED = 5; // Higher is slower
const HIDER_SPEED = 4; // Higher is slower
let gameOver = false;
let initialSeekerPos = null;
let initialHiderPos = null;

function drawGrid() {
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      ctx.fillStyle = grid[y][x] === 1 ? "#fff" : "#999";
      ctx.fillRect(x * GRID_SIZE, y * GRID_SIZE, GRID_SIZE, GRID_SIZE);
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

function drawArrow(x, y, angle, color) {
  const centerX = x * GRID_SIZE + GRID_SIZE / 2;
  const centerY = y * GRID_SIZE + GRID_SIZE / 2;
  
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(centerX + 10 * Math.cos(angle), centerY + 10 * Math.sin(angle));
  ctx.lineTo(centerX + 5 * Math.cos(angle + 2.4), centerY + 5 * Math.sin(angle + 2.4));
  ctx.lineTo(centerX + 5 * Math.cos(angle - 2.4), centerY + 5 * Math.sin(angle - 2.4));
  ctx.closePath();
  ctx.fill();
}

function drawCourier() {
  drawArrow(courier.x, courier.y, courier.angle, "green");
}

function updateGameInfo() {
  const currentTime = Math.floor((Date.now() - gameStartTime) / 1000);
  gameInfo.textContent = `Hide & Seek - Time: ${currentTime}s`;
}

function checkCollision(char1, char2) {
  return char1.x === char2.x && char1.y === char2.y;
}

function gameLoop() {
  drawGrid();
  
  if (hideAndSeekMode && !gameOver) {
    // Update seeker position if it has a path
    if (seeker.path.length > 0 && frameCounter % SEEKER_SPEED === 0) {
      const next = seeker.path[0];
      seeker.angle = Math.atan2(next.y - seeker.y, next.x - seeker.x);
      seeker.x = next.x;
      seeker.y = next.y;
      seeker.path.shift();
    }
    
    // Update hider position if it has a path
    if (hider.path.length > 0 && frameCounter % HIDER_SPEED === 0) {
      const next = hider.path[0];
      hider.angle = Math.atan2(next.y - hider.y, next.x - hider.x);
      hider.x = next.x;
      hider.y = next.y;
      hider.path.shift();
    }
    
    // Draw both characters
    drawArrow(seeker.x, seeker.y, seeker.angle, "red");
    drawArrow(hider.x, hider.y, hider.angle, "blue");
    
    // Update game info
    updateGameInfo();
    
    // Check for collision
    if (checkCollision(seeker, hider)) {
      endHideSeekGame();
      return;
    }
  } else if (hideAndSeekMode && gameOver) {
    // Draw final positions when game is over
    drawArrow(seeker.x, seeker.y, seeker.angle, "red");
    drawArrow(hider.x, hider.y, hider.angle, "blue");
  } else {
    // Original courier mode
    if (start) drawFlag(start.x, start.y, "yellow");
    if (destination) drawFlag(destination.x, destination.y, "red");
    if (moving && courier.path.length > 0) {
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
  
  frameCounter++;
  animationFrameId = requestAnimationFrame(gameLoop);
}

function drawFlag(x, y, color) {
  const px = x * GRID_SIZE + GRID_SIZE / 2;
  const py = y * GRID_SIZE + GRID_SIZE / 2;
  ctx.fillStyle = "black";
  ctx.fillRect(px, py - 10, 3, 20);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(px + 3, py - 10);
  ctx.lineTo(px + 13, py - 5);
  ctx.lineTo(px + 3, py);
  ctx.closePath();
  ctx.fill();
}

function loadMap() {
  const file = imageInput.files[0];
  if (!file) return;
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
          const brightness = imageData[index];
          grid[y][x] = brightness < 128 ? 0 : 1;
        }
      }
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
}

function startCourier() {
  if (hideAndSeekMode) return;
  moving = true;
}

function pauseCourier() {
  moving = false;
}

function replayCourier() {
  if (hideAndSeekMode) return;
  courier = { x: start.x, y: start.y, path: [...lastPath], angle: 0 };
  moving = true;
}

function startHideSeek() {
  // Reset game state
  hideAndSeekMode = true;
  gameOver = false;
  gameStartTime = Date.now();
  gameResult.textContent = "";
  frameCounter = 0;
  replayHideSeekBtn.style.display = "none";
  
  // Initialize seeker (red arrow)
  seeker = {
    x: Math.floor(Math.random() * COLS),
    y: Math.floor(Math.random() * ROWS),
    angle: 0,
    path: []
  };
  
  // Make sure seeker is on a road
  while (grid[seeker.y][seeker.x] !== 0) {
    seeker.x = Math.floor(Math.random() * COLS);
    seeker.y = Math.floor(Math.random() * ROWS);
  }
  
  // Initialize hider (blue arrow)
  hider = {
    x: Math.floor(Math.random() * COLS),
    y: Math.floor(Math.random() * ROWS),
    angle: 0,
    path: []
  };
  
  // Make sure hider is on a road and not too close to seeker
  while (grid[hider.y][hider.x] !== 0 || 
         heuristic(hider, seeker) < 15) {
    hider.x = Math.floor(Math.random() * COLS);
    hider.y = Math.floor(Math.random() * ROWS);
  }
  
  // Save initial positions for replay
  initialSeekerPos = { x: seeker.x, y: seeker.y };
  initialHiderPos = { x: hider.x, y: hider.y };
  
  // Start pathfinding updates
  gameInterval = setInterval(() => {
    if (!gameOver) {
      // Update seeker path to chase hider
      seeker.path = aStar({x: seeker.x, y: seeker.y}, {x: hider.x, y: hider.y});
      
      // Update hider path to escape seeker
      const oppositeDirection = findEscapePath(hider, seeker);
      hider.path = oppositeDirection;
    }
  }, 500); // Update paths twice per second
}

function findEscapePath(hider, seeker) {
  // Find the position that maximizes distance from seeker
  let bestDistance = 0;
  let bestPosition = {x: hider.x, y: hider.y};
  
  // Check positions 3 steps away in all directions
  for (let [dx, dy] of [[0, -3], [3, 0], [0, 3], [-3, 0]]) {
    const targetX = hider.x + dx;
    const targetY = hider.y + dy;
    
    if (targetX >= 0 && targetX < COLS && targetY >= 0 && targetY < ROWS) {
      const path = aStar({x: hider.x, y: hider.y}, {x: targetX, y: targetY});
      if (path.length > 0) {
        const distance = heuristic({x: path[path.length-1].x, y: path[path.length-1].y}, seeker);
        if (distance > bestDistance) {
          bestDistance = distance;
          bestPosition = {x: targetX, y: targetY};
        }
      }
    }
  }
  
  return aStar({x: hider.x, y: hider.y}, bestPosition);
}

function endHideSeekGame() {
  gameOver = true;
  clearInterval(gameInterval);
  gameEndTime = Date.now();
  const duration = Math.floor((gameEndTime - gameStartTime) / 1000);
  gameResult.textContent = `Game Over! Hider caught in ${duration} seconds!`;
  replayHideSeekBtn.style.display = "inline-block";
}

function stopHideSeek() {
  hideAndSeekMode = false;
  gameOver = true;
  clearInterval(gameInterval);
  gameResult.textContent = "Game Stopped";
  replayHideSeekBtn.style.display = "inline-block";
}

function replayHideSeek() {
  if (!initialSeekerPos || !initialHiderPos) return;
  
  // Reset to initial positions
  seeker = {
    x: initialSeekerPos.x,
    y: initialSeekerPos.y,
    angle: 0,
    path: []
  };
  
  hider = {
    x: initialHiderPos.x,
    y: initialHiderPos.y,
    angle: 0,
    path: []
  };
  
  // Start new game
  startHideSeek();
}

// Start the main game loop
gameLoop();