import * as THREE from "three";

export const TILE = 4;
export const MAP_W = 22;
export const MAP_H = 22;

// room rects: [x, y, w, h] in tiles
const ROOMS = {
  control: [2, 2, 7, 6],
  server: [13, 2, 7, 6],
  lab: [2, 12, 7, 8],
  security: [13, 12, 6, 6],
};

const CORRIDORS = [
  [4, 9, 14, 2],   // main horizontal
  [5, 8, 1, 1],    // control -> corridor
  [16, 8, 1, 1],   // server -> corridor
  [5, 10, 1, 2],   // corridor -> lab
  [15, 10, 1, 2],  // corridor -> security
  [20, 5, 1, 15],  // exit corridor (vertical)
  [19, 14, 1, 1],  // security -> exit corridor
];

export function buildGrid() {
  const g = Array.from({ length: MAP_H }, () => Array(MAP_W).fill(1));
  const carve = ([x, y, w, h]) => {
    for (let j = y; j < y + h; j++)
      for (let i = x; i < x + w; i++)
        if (i >= 0 && i < MAP_W && j >= 0 && j < MAP_H) g[j][i] = 0;
  };
  Object.values(ROOMS).forEach(carve);
  CORRIDORS.forEach(carve);
  return g;
}

export function tileToWorld(tx, tz) {
  return [(tx - MAP_W / 2 + 0.5) * TILE, (tz - MAP_H / 2 + 0.5) * TILE];
}

export function worldToTile(x, z) {
  return [
    Math.floor(x / TILE + MAP_W / 2),
    Math.floor(z / TILE + MAP_H / 2),
  ];
}

export function isWall(grid, tx, tz) {
  if (tx < 0 || tz < 0 || tx >= MAP_W || tz >= MAP_H) return true;
  return grid[tz][tx] === 1;
}

export function roomAt(tx, tz) {
  for (const [id, [x, y, w, h]] of Object.entries(ROOMS)) {
    if (tx >= x && tx < x + w && tz >= y && tz < y + h) return id;
  }
  const inExit = tx === 20 && tz >= 5 && tz < 20;
  if (inExit) return "exitcorridor";
  if (
    CORRIDORS.some(([x, y, w, h]) => tx >= x && tx < x + w && tz >= y && tz < y + h)
  )
    return "corridor";
  return null;
}

export function buildWorld(scene) {
  const grid = buildGrid();
  const interactables = [];
  const occluders = [];
  const roomLights = {};

  // materials
  const wallMat = new THREE.MeshLambertMaterial({ color: 0x141a24 });
  const floorMat = new THREE.MeshLambertMaterial({ color: 0x0b0f16 });
  const ceilMat = new THREE.MeshLambertMaterial({ color: 0x090d13 });
  const frameMat = new THREE.MeshLambertMaterial({ color: 0x1c2733 });

  // floor & ceiling (also occlude interaction rays)
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(MAP_W * TILE, MAP_H * TILE),
    floorMat
  );
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);
  occluders.push(floor);
  const ceil = new THREE.Mesh(
    new THREE.PlaneGeometry(MAP_W * TILE, MAP_H * TILE),
    ceilMat
  );
  ceil.rotation.x = Math.PI / 2;
  ceil.position.y = 4;
  scene.add(ceil);
  occluders.push(ceil);

  // walls (one box per wall tile; fine for this size)
  const wallGeo = new THREE.BoxGeometry(TILE, 4, TILE);
  for (let z = 0; z < MAP_H; z++) {
    for (let x = 0; x < MAP_W; x++) {
      if (!grid[z][x]) continue;
      const m = new THREE.Mesh(wallGeo, wallMat);
      const [wx, wz] = tileToWorld(x, z);
      m.position.set(wx, 2, wz);
      m.userData.occluder = true;
      scene.add(m);
      occluders.push(m);
    }
  }

  // helpers ----------------------------------------------------------

  // Wall-mounted terminal screen facing a direction.
  // dir: '+z' means mounted on north wall, screen faces south (+z world).
  function addTerminal(id, tx, tz, dir) {
    const [wx, wz] = tileToWorld(tx, tz);
    const grp = new THREE.Group();

    const frame = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.7, 0.25), frameMat);
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(2.1, 1.4),
      new THREE.MeshBasicMaterial({ color: 0x39d7ff })
    );
    screen.position.z = 0.14;

    const rot = { "+z": 0, "-z": Math.PI, "+x": -Math.PI / 2, "-x": Math.PI / 2 }[dir];
    grp.rotation.y = rot;

    // offset from wall center so frame/screen sit just PROUD of the wall face
    // (half tile = 2.0 to the face; 2.14 keeps the 0.25-deep frame outside)
    const off = { "+z": [0, TILE * 0.535], "-z": [0, -TILE * 0.535], "+x": [TILE * 0.535, 0], "-x": [-TILE * 0.535, 0] }[dir];
    grp.position.set(wx + off[0], 1.9, wz + off[1]);
    grp.add(frame, screen);
    grp.userData = { interactive: true, itype: "terminal", id, label: `USE TERMINAL` };
    scene.add(grp);
    interactables.push(grp);

    // small light glow from the screen
    const pl = new THREE.PointLight(0x39d7ff, 6, 6);
    pl.position.copy(grp.position);
    scene.add(pl);
    return grp;
  }

  function addLabButton(id, colorHex, tx, tz) {
    const [wx, wz] = tileToWorld(tx, tz);
    const grp = new THREE.Group();
    const pedestal = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 1.1, 1.2),
      frameMat
    );
    pedestal.position.y = 0.55;
    const button = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.35, 0.18, 16),
      new THREE.MeshBasicMaterial({ color: colorHex })
    );
    button.position.y = 1.15;
    button.rotation.x = 0; // top faces up
    grp.add(pedestal, button);
    grp.position.set(wx, 0, wz);
    grp.userData = { interactive: true, itype: "button", id, label: `PRESS ${id.toUpperCase()} CONSOLE`, buttonMesh: button };
    scene.add(grp);
    interactables.push(grp);
  }

  function addSign(text, tx, tz, dir, color) {
    const canvas = document.createElement("canvas");
    canvas.width = 512; canvas.height = 128;
    const c = canvas.getContext("2d");
    c.fillStyle = "#000"; c.fillRect(0, 0, 512, 128);
    c.font = "bold 90px monospace";
    c.fillStyle = color;
    c.textAlign = "center"; c.textBaseline = "middle";
    c.fillText(text, 256, 70);
    const tex = new THREE.CanvasTexture(canvas);
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(3.4, 0.85),
      new THREE.MeshBasicMaterial({ map: tex })
    );
    const [wx, wz] = tileToWorld(tx, tz);
    const rot = { "+z": 0, "-z": Math.PI, "+x": -Math.PI / 2, "-x": Math.PI / 2 }[dir];
    sign.rotation.y = rot;
    const off = { "+z": [0, TILE * 0.52], "-z": [0, -TILE * 0.52], "+x": [TILE * 0.52, 0], "-x": [-TILE * 0.52, 0] }[dir];
    sign.position.set(wx + off[0], 2.9, wz + off[1]);
    scene.add(sign);
    return sign;
  }

  // facility contents -----------------------------------------------

  addTerminal("main", 4, 1, "+z");     // control room, north wall
  addTerminal("server", 16, 1, "+z");  // server room, north wall
  addTerminal("lab", 3, 11, "+z");     // lab, north wall
  addTerminal("security", 17, 11, "+z"); // security cam feed
  addTerminal("hidden", 18, 18, "-z"); // hidden, south-east corner of security

  addLabButton("green", 0x33ff88, 4, 15);
  addLabButton("red", 0xff3344, 5, 15);
  addLabButton("blue", 0x3388ff, 6, 15);

  addSign("EXIT SECTOR 7", 20, 20, "-z", "#ff2244"); // south wall of exit corridor, faces north
  addSign("SERVER", 14, 8, "+z", "#39d7ff");
  addSign("LABORATORY", 7, 11, "+z", "#39d7ff");
  addSign("SECURITY", 13, 11, "+z", "#ffb020");

  // lighting ---------------------------------------------------------
  scene.add(new THREE.AmbientLight(0x30405a, 0.7));

  function roomLight(id, tx, tz, color = 0x9fd8ff, intensity = 30) {
    const [wx, wz] = tileToWorld(tx, tz);
    const l = new THREE.PointLight(color, intensity, 26, 1.6);
    l.position.set(wx, 3.4, wz);
    scene.add(l);
    roomLights[id] = l;
    return l;
  }
  roomLight("control", 5, 4);
  roomLight("server", 16, 4);
  roomLight("lab", 5, 15);
  roomLight("security", 15, 14);
  roomLight("corridor", 10, 9, 0x7fb4d8, 18);
  const exitLight = roomLight("exit", 20, 12, 0xff5566, 16);

  scene.fog = new THREE.FogExp2(0x05070c, 0.028);
  scene.background = new THREE.Color(0x05070c);

  let alarm = false;
  function setAlarmMode(on) {
    alarm = on;
    if (on) {
      for (const l of Object.values(roomLights)) l.color.setHex(0xff3344);
    }
  }

  // flicker update called per-frame
  let t = 0;
  function update(dt) {
    t += dt;
    const flicker = alarm ? 0.75 : 1;
    roomLights.corridor.intensity =
      (alarm ? 22 : 18) * (Math.sin(t * 30) > -0.85 ? flicker : 0.15);
    exitLight.intensity = 16 + Math.sin(t * 2.2) * 4 + (Math.random() < 0.01 ? -12 : 0);
    if (alarm) {
      roomLights.control.intensity = 30 * (Math.sin(t * 6) > 0 ? 1 : 0.55);
    }
  }

  return { grid, interactables, raycastTargets: [...occluders, ...interactables], update, setAlarmMode };
}
