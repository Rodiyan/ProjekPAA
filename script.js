const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let mapImage = new Image();
let mapLoaded = false;
let startPos = { x: 0, y: 0 };
let goalPos = { x: 0, y: 0 };
let running = false;

function loadMap() {
  const file = document.getElementById('fileInput').files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    mapImage.onload = () => {
      ctx.drawImage(mapImage, 0, 0, canvas.width, canvas.height);
      mapLoaded = true;
    };
    mapImage.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function getPixel(x, y) {
  const imgData = ctx.getImageData(x, y, 1, 1).data;
  return { r: imgData[0], g: imgData[1], b: imgData[2] };
}

function isPath(x, y) {
  const p = getPixel(x, y);
  return p.r > 200 && p.g > 200 && p.b > 200; // putih
}

function drawFlag(x, y, color) {
  ctx.beginPath();
  ctx.arc(x, y, 5, 0, 2 * Math.PI);
  ctx.fillStyle = color;
  ctx.fill();
}

function randomizePositions() {
  if (!mapLoaded) return;
  let foundStart = false, foundGoal = false;
  while (!foundStart || !foundGoal) {
    let x = Math.floor(Math.random() * canvas.width);
    let y = Math.floor(Math.random() * canvas.height);
    if (isPath(x, y)) {
      if (!foundStart) {
        startPos = { x, y };
        foundStart = true;
      } else {
        goalPos = { x, y };
        foundGoal = true;
      }
    }
  }
  ctx.drawImage(mapImage, 0, 0, canvas.width, canvas.height);
  drawFlag(startPos.x, startPos.y, "green");
  drawFlag(goalPos.x, goalPos.y, "red");
}

function bfs(start, goal) {
  let queue = [start];
  let visited = new Set();
  let parent = {};

  const key = (pt) => `${pt.x},${pt.y}`;
  visited.add(key(start));

  const dirs = [
    { x: 1, y: 0 }, { x: -1, y: 0 },
    { x: 0, y: 1 }, { x: 0, y: -1 }
  ];

  while (queue.length > 0) {
    let current = queue.shift();
    if (Math.abs(current.x - goal.x) < 3 && Math.abs(current.y - goal.y) < 3)
      break;

    for (let d of dirs) {
      let nx = current.x + d.x, ny = current.y + d.y;
      let np = { x: nx, y: ny };
      let k = key(np);
      if (!visited.has(k) && isPath(nx, ny)) {
        queue.push(np);
        visited.add(k);
        parent[k] = current;
      }
    }
  }

  // reconstruct path
  let path = [];
  let cur = goal;
  while (key(cur) !== key(start)) {
    path.push(cur);
    cur = parent[key(cur)];
    if (!cur) break;
  }
  return path.reverse();
}

let path = [];
function start() {
  if (!mapLoaded) return;
  path = bfs(startPos, goalPos);
  running = true;
  animate();
}

function stop() {
  running = false;
}

function replay() {
  if (!mapLoaded) return;
  ctx.drawImage(mapImage, 0, 0, canvas.width, canvas.height);
  drawFlag(startPos.x, startPos.y, "green");
  drawFlag(goalPos.x, goalPos.y, "red");
  start();
}

let index = 0;
function animate() {
  if (!running || index >= path.length) return;
  let pos = path[index++];
  ctx.drawImage(mapImage, 0, 0, canvas.width, canvas.height);
  drawFlag(startPos.x, startPos.y, "green");
  drawFlag(goalPos.x, goalPos.y, "red");

  ctx.beginPath();
  ctx.arc(pos.x, pos.y, 4, 0, 2 * Math.PI);
  ctx.fillStyle = "blue";
  ctx.fill();

  requestAnimationFrame(animate);
}
