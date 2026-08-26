import * as THREE from "three";
import { TILE, MAP_W, MAP_H, isWall, worldToTile } from "./world.js";

const RADIUS = 0.9;   // player collision radius (world units)
const SPEED = 7.5;
const HEAD = 1.8;

export class Player {
  constructor(camera) {
    this.camera = camera;
    this.yaw = 0;            // facing -z initially (toward main terminal)
    this.pitch = 0;
    this.keys = {};
    this.velocity = new THREE.Vector3();

    const startTx = 4, startTz = 4;
    camera.position.set(
      (startTx - MAP_W / 2 + 0.5) * TILE,
      HEAD,
      (startTz - MAP_H / 2 + 0.5) * TILE
    );
  }

  onMouseMove(dx, dy) {
    this.yaw -= dx * 0.0022;
    this.pitch -= dy * 0.0022;
    const lim = Math.PI / 2 - 0.08;
    this.pitch = Math.max(-lim, Math.min(lim, this.pitch));
  }

  _collides(x, z, grid) {
    const pts = [
      [x - RADIUS, z - RADIUS], [x + RADIUS, z - RADIUS],
      [x - RADIUS, z + RADIUS], [x + RADIUS, z + RADIUS],
    ];
    return pts.some(([px, pz]) => {
      const [tx, tz] = worldToTile(px, pz);
      return isWall(grid, tx, tz);
    });
  }

  update(dt, grid) {
    // f: forward(+1=W / -1=S), s: strafe(+1=D / -1=A)
    let f = 0, s = 0;
    if (this.keys["KeyW"]) f += 1;
    if (this.keys["KeyS"]) f -= 1;
    if (this.keys["KeyD"]) s += 1;
    if (this.keys["KeyA"]) s -= 1;

    const moving = f !== 0 || s !== 0;
    if (moving) {
      const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
      const dx = f * -sin + s * cos;
      const dz = f * -cos + s * -sin;

      const nx = this.camera.position.x + dx * SPEED * dt;
      const nz = this.camera.position.z + dz * SPEED * dt;
      if (!this._collides(nx, this.camera.position.z, grid))
        this.camera.position.x = nx;
      if (!this._collides(this.camera.position.x, nz, grid))
        this.camera.position.z = nz;
    }

    this.camera.rotation.order = "YXZ";
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
    // subtle head bob
    this.camera.position.y =
      HEAD + (moving ? Math.sin(performance.now() * 0.011) * 0.05 : 0);

    return [this.camera.position.x, this.camera.position.z];
  }
}
