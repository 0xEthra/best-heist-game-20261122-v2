// game.js — loop, room progression, and deterministic ?shot= staging.
import { W, H, HUD, PAL, clamp, inCone } from './core.js';
import { ROOMS, obstaclesOf } from './maps.js';
import { makeActors } from './actors.js';
import { Stealth } from './stealth.js';
import { Input } from './input.js';
import { drawHUD, drawRoom } from './render.js';

const params = new URLSearchParams(location.search);
const SHOT = params.get('shot');
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

class Game {
  constructor() {
    this.roomIdx = 0; this.tick = 0; this.peakAlarm = 0; this.won = false;
    this.stealth = new Stealth();
    this.loadRoom(0);
    this.input = new Input(canvas, i => this.stealth.useTool(i, this.actors), () => this.reset());
    this.dock = [];
  }
  loadRoom(i) {
    this.roomIdx = i; this.room = ROOMS[i];
    this.obstacles = obstaclesOf(this.room);
    this.actors = makeActors(this.room);
    this.stealth.escaped = false;
  }
  reset() {
    this.tick = 0; this.peakAlarm = 0; this.won = false;
    this.stealth = new Stealth(); this.loadRoom(0);
  }
  update(dt) {
    this.tick++;
    const frozen = this.stealth.freeze > 0;
    if (!frozen) for (const g of this.actors.guards) g.update(dt, this.actors.thief, this.obstacles, inCone);
    if (!frozen) for (const c of this.actors.cameras) c.update(dt);
    const [dx, dy] = this.input.moveVec();
    if (dx || dy) this.actors.thief.move(dx, dy, this.room.walls);
    this.stealth.update(dt, this.actors, this.obstacles, this.roomIdx, this.room);
    this.peakAlarm = Math.max(this.peakAlarm, this.stealth.alarm);
    if (this.stealth.escaped && !this.won) {
      if (this.roomIdx < 2) this.loadRoom(this.roomIdx + 1);
      else { this.won = true; this.stealth.endTick = this.tick; }
    }
  }
  render() {
    const s = this.stealth;
    drawHUD(ctx, this.room, s, this.tick);
    const opts = {
      lootTaken: s.lootTaken[this.roomIdx],
      cachesTaken: new Set([...s.cachesTaken].filter(k => k.startsWith(this.roomIdx + ':')).map(k => Number(k.split(':')[1]))),
      hatchOpen: s.lootTaken[this.roomIdx],
      escaped: this.won,
      score: s.score, caches: s.cachesTaken.size, peak: Math.round(this.peakAlarm),
      ticks: this.tick, bonus: s.efficiencyBonus(Math.round(this.peakAlarm), this.tick), dock: this.dock,
    };
    drawRoom(ctx, this.room, this.actors, s, opts);
    this.input.dock = this.dock;
    if (s.over && !this.won) {
      ctx.fillStyle = 'rgba(7,24,32,0.85)'; ctx.fillRect(0, HUD, W, H - HUD);
      ctx.fillStyle = PAL.red; ctx.font = 'bold 44px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('CAUGHT!', W / 2, 300);
      ctx.fillStyle = PAL.cream; ctx.font = 'bold 22px sans-serif';
      ctx.fillText('The alarm hit 100%. Press R to try again.', W / 2, 350);
      ctx.textAlign = 'left';
    }
  }
  loop() {
    if (this.stealth.over || this.won) { this.render(); return; }
    this.update(1 / 60);
    this.render();
    requestAnimationFrame(() => this.loop());
  }
}
// ---- deterministic shot staging: one frozen frame, no animation loop ----
function stageShot(name) {
  const g = new Game();
  const s = g.stealth;
  if (name === 'cover') {
    g.loadRoom(0);
    g.actors.thief.x = 150; g.actors.thief.y = 335; // crouched behind mint-edge cover
    const gd = g.actors.guards[0]; gd.x = 380; gd.y = 330; gd.dir = Math.PI; gd.suspicion = 40;
    const gd2 = g.actors.guards[1]; gd2.x = 800; gd2.y = 300; gd2.dir = -Math.PI / 2;
    for (const c of g.actors.cameras) c.t = 1.2, c.update(0);
    s.alarm = 22; s.score = 0;
  } else if (name === 'patrol') {
    g.loadRoom(0);
    g.actors.guards[0].x = 380; g.actors.guards[0].y = 340; g.actors.guards[0].dir = Math.PI / 2;
    g.actors.guards[1].x = 880; g.actors.guards[1].y = 340; g.actors.guards[1].dir = Math.PI;
    g.actors.thief.x = 120; g.actors.thief.y = 560;
    for (const c of g.actors.cameras) c.t = 1.2, c.update(0);
    s.alarm = 8;
  } else if (name === 'alarm') {
    g.loadRoom(1);
    g.actors.thief.x = 480; g.actors.thief.y = 320;
    const gd = g.actors.guards[0]; gd.x = 560; gd.y = 320; gd.dir = Math.PI; gd.suspicion = 100; gd.chase = true; gd.spotted = 1.2;
    g.actors.guards[1].x = 640; g.actors.guards[1].y = 200; g.actors.guards[1].dir = Math.PI * 0.75; g.actors.guards[1].suspicion = 78;
    for (const c of g.actors.cameras) c.t = 0.8, c.update(0);
    s.alarm = 72; s.score = 300;
  } else if (name === 'escape') {
    g.loadRoom(2);
    g.tick = 420; // autopilot locked to tick 420
    s.lootTaken = [true, true, true]; s.score = 1600;
    s.cachesTaken = new Set(['0:0', '0:1', '1:0', '2:1']); s.score += 200;
    g.peakAlarm = 34; g.won = true; s.endTick = 420;
    g.actors.thief.x = 890; g.actors.thief.y = 585; // inside the open service hatch
    for (const gd of g.actors.guards) { gd.x = 400; gd.y = 120; gd.dir = 0; gd.suspicion = 0; }
    for (const c of g.actors.cameras) c.t = 2.0, c.update(0);
  }
  g.render();
}

if (SHOT && ['cover', 'patrol', 'alarm', 'escape'].includes(SHOT)) stageShot(SHOT);
else { const g = new Game(); g.loop(); }
