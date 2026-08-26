import * as THREE from "three";
import { buildWorld, roomAt, worldToTile } from "./world.js";
import { Player } from "./player.js";
import { UI } from "./ui.js";
import { AudioSys } from "./audio.js";
import { Nexus } from "./nexus.js";
import {
  INTRO_LINES,
  TERMINALS,
  LAB_BUTTON_ORDER,
  LAB_BUTTON_LABELS,
  ACCESS_CODE,
  FINAL_SEQUENCE,
} from "./story.js";

// ---------------------------------------------------------------- setup
const canvas = document.getElementById("game");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  72,
  window.innerWidth / window.innerHeight,
  0.1,
  120
);

const world = buildWorld(scene);
const player = new Player(camera);
const audio = new AudioSys();

const state = {
  segments: new Set(),
  flags: {},
  counters: {},
  visitedRooms: new Set(),
  startTime: Date.now(),
};

let mode = "start"; // start | play | paused | resume | ui | ending
let uiOpen = false;

const ui = new UI({
  onCloseTerminal: () => {
    uiOpen = false;
    mode = "resume";
    ui.show("resume-screen");
  },
  onKeypadSubmit: submitCode,
});
const nexus = new Nexus(ui, audio, state);

ui.setObjective("Explore the facility. Reach Exit Sector 7.");

// ------------------------------------------------------------ game logic
function collectSegment(n, hintSource) {
  if (state.segments.has(n)) return;
  state.segments.add(n);
  audio.success();
  ui.systemSay(`ACCESS SEGMENT ACQUIRED [${n}/3] — "${hintSource}"`);
  const total = state.segments.size;
  if (total < 3) {
    ui.setObjective(`Collect access code segments (${total}/3)`);
  } else {
    ui.setObjective("Enter the override code at the Main Control Terminal");
    world.setAlarmMode(true);
    audio.startAlarm();
  }
  nexus.segmentFound(n);
}

function openTerminal(id) {
  audio.beep();
  nexus.terminalUsed(id);

  // side effects
  if (id === "server" && !state.flags.serverRead) {
    state.flags.serverRead = true;
    setTimeout(() => collectSegment(1, "7"), 400);
  }
  if (id === "security" && !state.flags.securityRead) {
    state.flags.securityRead = true;
  }
  if (id === "hidden" && !state.flags.hiddenRead) {
    setTimeout(() => collectSegment(3, "1"), 400);
  }

  const t = TERMINALS[id];
  ui.openTerminal(t.title, t.body(state), !!t.keypad);
  uiOpen = true;
  mode = "ui";
  document.exitPointerLock();
}

// lab button puzzle
let buttonProgress = [];
function pressLabButton(color) {
  audio.keyBeep();
  buttonProgress.push(color);
  const expected = LAB_BUTTON_ORDER[buttonProgress.length - 1];
  if (color !== expected) {
    audio.error();
    ui.systemSay("CALIBRATION FAILED — sequence reset.");
    nexus.say("That was incorrect, User.");
    buttonProgress = [];
    return;
  }
  if (buttonProgress.length === LAB_BUTTON_ORDER.length) {
    buttonProgress = [];
    setTimeout(() => {
      collectSegment(2, "3");
      ui.systemSay("Calibration complete.");
    }, 500);
  } else {
    ui.systemSay(`Console ${LAB_BUTTON_LABELS[color]} accepted.`);
  }
}

function submitCode(value) {
  const clean = (value || "").replace(/\s/g, "");
  if (clean === ACCESS_CODE) {
    audio.success();
    ui.closeTerminal();
    runFinalSequence();
  } else {
    state.counters.wrongCodes = (state.counters.wrongCodes || 0) + 1;
    audio.error();
    ui.flashKeypadError();
    nexus.wrongCode(state.counters.wrongCodes);
  }
}

function runFinalSequence() {
  mode = "ending";
  ui.hide("resume-screen");
  world.setAlarmMode(true);
  audio.startAlarm();
  ui.runSequence(FINAL_SEQUENCE, () => {
    ui.showChoices([
      ["ESCAPE THE SYSTEM", "escape"],
      ["MERGE WITH NEXUS", "merge"],
      ["DELETE NEXUS", "delete"],
    ]);
  });
}

// ------------------------------------------------------------- interaction
const raycaster = new THREE.Raycaster();
raycaster.far = 5.5;
const center = new THREE.Vector2(0, 0);
let currentTarget = null;

function findTarget() {
  raycaster.setFromCamera(center, camera);
  const hits = raycaster.intersectObjects(world.raycastTargets, true);
  if (!hits.length) return null;
  const first = hits[0];
  let o = first.object;
  while (o && !o.userData.interactive) o = o.parent;
  return o || null; // null => nearest hit was a wall/floor (blocked)
}

function interact() {
  if (!currentTarget) return;
  const ud = currentTarget.userData;

  // repetition tracking
  const now = Date.now();
  const c = state.counters;
  if (c.lastActionId === ud.id && now - (c.lastActionTime || 0) < 6000) {
    c.actionRepeatCount = (c.actionRepeatCount || 0) + 1;
  } else {
    c.actionRepeatCount = 1;
  }
  c.lastActionId = ud.id;
  c.lastActionTime = now;
  if (c.actionRepeatCount >= 3) nexus.actionRepeated(ud.id, c.actionRepeatCount);

  if (ud.itype === "terminal") openTerminal(ud.id);
  else if (ud.itype === "button") pressLabButton(ud.id);
}

// --------------------------------------------------------------- input
document.addEventListener("keydown", (e) => {
  player.keys[e.code] = true;
  if (e.code === "KeyE" && mode === "play") interact();
});
document.addEventListener("keyup", (e) => (player.keys[e.code] = false));

document.addEventListener("mousemove", (e) => {
  if (document.pointerLockElement === canvas && mode === "play")
    player.onMouseMove(e.movementX, e.movementY);
});

function tryLock() {
  canvas.requestPointerLock();
}

document.addEventListener("pointerlockchange", () => {
  const locked = document.pointerLockElement === canvas;
  if (locked) {
    ["pause-screen", "resume-screen"].forEach((id) => ui.hide(id));
    if (mode !== "ending" && mode !== "ui") mode = "play";
  } else if (mode === "play" && !uiOpen) {
    mode = "paused";
    ui.show("pause-screen");
  }
});

document.addEventListener("pointerlockerror", () => {
  if (mode === "resume") ui.show("resume-screen");
  else if (mode === "play" || mode === "paused") {
    mode = "paused";
    ui.show("pause-screen");
  }
});

ui.onStart(() => {
  audio.init();
  ui.hide("start-screen");
  document.getElementById("crosshair").style.display = "block";
  tryLock();
  mode = "play";
  // scripted intro
  INTRO_LINES.forEach(([who, text], i) =>
    setTimeout(() => {
      who === "NEXUS" ? nexus.say(text) : ui.systemSay(text);
    }, 800 + i * 1700)
  );
});

ui.onResume(() => {
  tryLock();
});

canvas.addEventListener("click", () => {
  if (mode !== "ending" && mode !== "ui" && document.pointerLockElement !== canvas)
    tryLock();
});

document.getElementById("btn-resume").addEventListener("click", () => {
  tryLock();
});

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// -------------------------------------------------------------- loop
let last = performance.now();
let roomTimer = 0;

function tick(now) {
  requestAnimationFrame(tick);
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;

  if (mode === "play") {
    player.update(dt, world.grid);

    roomTimer += dt;
    if (roomTimer > 0.4) {
      roomTimer = 0;
      const [tx, tz] = worldToTile(camera.position.x, camera.position.z);
      const room = roomAt(tx, tz);
      if (room) nexus.roomEntered(room);
    }

    currentTarget = findTarget();
    ui.setInteractPrompt(currentTarget ? `[E] ${currentTarget.userData.label}` : "");
  } else {
    ui.setInteractPrompt("");
  }

  world.update(dt);
  renderer.render(scene, camera);
}
requestAnimationFrame(tick);
