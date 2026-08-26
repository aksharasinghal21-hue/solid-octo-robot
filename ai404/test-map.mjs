// Headless map validation: connectivity, object placement, room detection.
import { buildGrid, isWall, roomAt, MAP_W, MAP_H, tileToWorld } from "./src/world.js";

const grid = buildGrid();
const key = (x, z) => `${x},${z}`;

// flood fill from player start (4,4)
const start = [4, 4];
if (isWall(grid, ...start)) {
  console.error("FAIL: player start is inside a wall");
  process.exit(1);
}
const seen = new Set([key(...start)]);
const queue = [start];
while (queue.length) {
  const [x, z] = queue.pop();
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const nx = x + dx, nz = z + dz;
    if (!isWall(grid, nx, nz) && !seen.has(key(nx, nz))) {
      seen.add(key(nx, nz));
      queue.push([nx, nz]);
    }
  }
}

const totalFloor = grid.flat().filter((v) => v === 0).length;
console.log(`floor tiles: ${totalFloor}, reachable: ${seen.size}`);
if (seen.size !== totalFloor) {
  // report unreachable floor tiles
  const unreachable = [];
  for (let z = 0; z < MAP_H; z++)
    for (let x = 0; x < MAP_W; x++)
      if (!grid[z][x] && !seen.has(key(x, z))) unreachable.push(key(x, z));
  console.error("FAIL: unreachable tiles:", unreachable.join(" "));
  process.exit(1);
}
console.log("PASS: all floor tiles reachable from start");

// terminals must sit on/adjacent-to floor with the room detectable nearby
const checks = [
  ["main terminal", 4, 2],
  ["server terminal", 16, 2],
  ["lab terminal", 3, 12],
  ["security terminal", 17, 12],
  ["hidden terminal area", 18, 17],
  ["lab buttons", 5, 15],
];
for (const [name, x, z] of checks) {
  if (isWall(grid, x, z)) {
    console.error(`FAIL: ${name} at ${key(x, z)} is inside a wall`);
    process.exit(1);
  }
  const r = roomAt(x, z);
  console.log(`ok: ${name} -> room "${r}"`);
}
console.log("ALL MAP CHECKS PASSED");
