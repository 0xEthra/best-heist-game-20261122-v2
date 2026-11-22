// stealth.js — alarm, exposure, tools, loot, stealth-efficiency bonus.
import { clamp, inCone, dist } from './core.js';
export const TOOLS = [
  { key: '1', name: 'Bellbug', cost: 1, desc: 'Ring: nearest guard stalls 2.5s' },
  { key: '2', name: 'Soot Veil', cost: 2, desc: 'Hidden from cones for 4s' },
  { key: '3', name: 'Clocksplice', cost: 2, desc: 'Freeze guards + cameras 3s' },
];
export class Stealth {
  constructor() {
    this.alarm = 0; this.charges = 5; this.maxCharges = 6; this.score = 0;
    this.veil = 0; this.freeze = 0; this.exposed = false; this.warning = false;
    this.over = false; this.cleared = [false, false, false]; this.lootTaken = [false, false, false];
    this.cachesTaken = new Set(); this.startTick = 0; this.endTick = 0; this.escaped = false;
  }
  // Returns true while any cone currently sees the thief.
  update(dt, actors, obstacles, roomIdx, room) {
    const thief = actors.thief;
    if (this.veil > 0) { this.veil -= dt; thief.hidden = this.veil > 0; }
    if (this.freeze > 0) this.freeze -= dt;
    let seen = false;
    if (!thief.hidden) {
      for (const g of actors.guards) if (inCone(thief.x, thief.y, g.x, g.y, g.dir, g.arc, g.range, obstacles)) { seen = true; break; }
      if (!seen) for (const c of actors.cameras) if (inCone(thief.x, thief.y, c.x, c.y, c.dir, c.arc, c.range, obstacles)) { seen = true; break; }
    }
    this.exposed = seen;
    this.alarm = clamp(this.alarm + (seen ? 18 : -5) * dt, 0, 100);
    this.warning = this.alarm >= 70;
    if (this.alarm >= 100) this.over = true;
    // Loot pickup
    if (!this.lootTaken[roomIdx] && dist(thief.x, thief.y, room.lootPos[0], room.lootPos[1]) < 40) {
      this.lootTaken[roomIdx] = true; this.score += room.loot;
      this.cleared[roomIdx] = true; this.charges = Math.min(this.maxCharges, this.charges + 1);
    }
    room.caches.forEach(([cx, cy], i) => {
      const k = roomIdx + ':' + i;
      if (!this.cachesTaken.has(k) && dist(thief.x, thief.y, cx, cy) < 34) { this.cachesTaken.add(k); this.score += 50; }
    });
    // Escape: reach the hatch after taking this room's loot
    if (this.lootTaken[roomIdx] && dist(thief.x, thief.y, room.hatch[0], room.hatch[1]) < 42) this.escaped = true;
  }
  useTool(idx, actors) {
    const t = TOOLS[idx];
    if (!t || this.charges < t.cost || this.over) return false;
    this.charges -= t.cost;
    if (idx === 0) { // Bellbug: nearest guard stalls
      let best = null, bd = 1e9;
      for (const g of actors.guards) { const d = dist(g.x, g.y, actors.thief.x, actors.thief.y); if (d < bd) { bd = d; best = g; } }
      if (best) { best.stunned = 2.5; best.suspicion = Math.max(0, best.suspicion - 40); }
    } else if (idx === 1) { this.veil = 4; actors.thief.hidden = true; }
    else if (idx === 2) {
      this.freeze = 3;
      for (const g of actors.guards) g.stunned = Math.max(g.stunned, 3);
    }
    return true;
  }
  // Stealth-efficiency bonus: low peak alarm + fast completion. Tool use is never penalized.
  efficiencyBonus(peakAlarm, ticks) {
    const alarmPart = Math.round((100 - peakAlarm) * 2);
    const timePart = Math.max(0, 600 - ticks) > 0 ? Math.round(Math.max(0, (900 - ticks) / 10)) : 0;
    return alarmPart + timePart;
  }
}
