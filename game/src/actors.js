// actors.js — thief, guards (patrol + suspicion + 1.2s grace), rotating cameras.
import { clamp, angNorm, dist } from './core.js';
export const THIEF_R = 14, GUARD_R = 16;
export class Thief {
  constructor(x, y) { this.x = x; this.y = y; this.vx = 0; this.vy = 0; this.hidden = false; }
  move(dx, dy, walls) {
    const sp = 3.1;
    const nx = clamp(this.x + dx * sp, 20, 940), ny = clamp(this.y + dy * sp, 56, 624);
    if (!walls.some(w => nx + THIEF_R > w.x && nx - THIEF_R < w.x + w.w && ny + THIEF_R > w.y && ny - THIEF_R < w.y + w.h)) this.x = nx;
    if (!walls.some(w => this.x + THIEF_R > w.x && this.x - THIEF_R < w.x + w.w && ny + THIEF_R > w.y && ny - THIEF_R < w.y + w.h)) this.y = ny;
  }
}
export class Guard {
  constructor(waypoints) {
    this.wp = waypoints; this.i = 0; this.x = waypoints[0][0]; this.y = waypoints[0][1];
    this.dir = 0; this.speed = 1.1; this.range = 200; this.arc = 1.25; // ~72 deg
    this.suspicion = 0; this.spotted = 0; this.chase = false; this.stunned = 0;
  }
  update(dt, thief, obstacles, inConeFn) {
    if (this.stunned > 0) { this.stunned -= dt; return; }
    const [tx, ty] = this.wp[this.i];
    const d = dist(this.x, this.y, tx, ty);
    if (d < 4) { this.i = (this.i + 1) % this.wp.length; }
    else {
      const a = Math.atan2(ty - this.y, tx - this.x);
      this.dir = a; this.x += Math.cos(a) * this.speed; this.y += Math.sin(a) * this.speed;
    }
    const seen = !thief.hidden && inConeFn(thief.x, thief.y, this.x, this.y, this.dir, this.arc, this.range, obstacles);
    if (seen) {
      this.suspicion = clamp(this.suspicion + dt * 55, 0, 100);
      if (this.suspicion >= 100 && this.spotted <= 0) { this.spotted = 1.2; this.chase = true; }
    } else {
      this.suspicion = clamp(this.suspicion - dt * 22, 0, 100);
      if (this.suspicion <= 0) this.chase = false;
    }
    if (this.spotted > 0) this.spotted -= dt;
    if (this.chase) {
      const a = Math.atan2(thief.y - this.y, thief.x - this.x);
      this.dir = a; this.x += Math.cos(a) * 1.9; this.y += Math.sin(a) * 1.9;
    }
  }
}
export class Camera {
  constructor(x, y, base, sweepDeg, speed) {
    this.x = x; this.y = y; this.base = base; this.sweep = sweepDeg * Math.PI / 180;
    this.speed = speed; this.t = Math.random() * 6; this.dir = base; this.range = 230; this.arc = 0.96;
  }
  update(dt) { this.t += dt * this.speed; this.dir = this.base + Math.sin(this.t) * this.sweep / 2; }
}
export function makeActors(room) {
  return {
    thief: new Thief(room.spawn[0], room.spawn[1]),
    guards: room.patrols.map(p => new Guard(p)),
    cameras: room.cameras.map(c => new Camera(c[0], c[1], c[2], c[3], c[4])),
  };
}
