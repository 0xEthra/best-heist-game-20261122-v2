// core.js — shared math, palette, and the one radial raycast used by guards + cameras.
export const W = 960, H = 640, HUD = 40, PLAY_TOP = 40, PLAY_H = 600;
export const PAL = {
  navy: '#102A35', ink: '#071820', teal: '#1E5960', mint: '#79D8B5',
  brass: '#D9AA56', cream: '#F4E8C8', orange: '#F2A541', coral: '#E8795B',
  red: '#F04F4F', green: '#3FB97A', slate: '#274B57', gold: '#E8C66A',
};
export const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
export const dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
export const angNorm = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };

// --- segment / shape tests (obstacles: AABB rects {x,y,w,h} or convex polys {pts:[[x,y]...]}) ---
export function segHitsRect(ax, ay, bx, by, r) {
  // returns t in [0,1] of first hit or -1
  let t0 = 0, t1 = 1; const dx = bx - ax, dy = by - ay;
  const slabs = [[ax, dx, r.x, r.x + r.w], [ay, dy, r.y, r.y + r.h]];
  for (const [o, d, mn, mx] of slabs) {
    if (Math.abs(d) < 1e-9) { if (o < mn || o > mx) return -1; continue; }
    let ta = (mn - o) / d, tb = (mx - o) / d; if (ta > tb) [ta, tb] = [tb, ta];
    t0 = Math.max(t0, ta); t1 = Math.min(t1, tb); if (t0 > t1) return -1;
  }
  return t0;
}
export function segHitsPoly(ax, ay, bx, by, pts) {
  let best = -1;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], q = pts[(i + 1) % pts.length];
    const d = (bx - ax) * (q[1] - p[1]) - (by - ay) * (q[0] - p[0]);
    if (Math.abs(d) < 1e-9) continue;
    const t = ((p[0] - ax) * (q[1] - p[1]) - (p[1] - ay) * (q[0] - p[0])) / d;
    const u = ((p[0] - ax) * (by - ay) - (p[1] - ay) * (bx - ax)) / d;
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1 && (best < 0 || t < best)) best = t;
  }
  return best;
}
export function segHitsObstacle(ax, ay, bx, by, ob) {
  return ob.pts ? segHitsPoly(ax, ay, bx, by, ob.pts) : segHitsRect(ax, ay, bx, by, ob);
}
export function rayDist(ox, oy, ang, obstacles, maxD) {
  const tx = ox + Math.cos(ang) * maxD, ty = oy + Math.sin(ang) * maxD;
  let best = maxD;
  for (const ob of obstacles) {
    const t = segHitsObstacle(ox, oy, tx, ty, ob);
    if (t >= 0) best = Math.min(best, t * maxD);
  }
  return best;
}
// One shared radial raycast: cast toward every obstacle vertex (angle +/- 0.001),
// sort hits by angle, return the triangle-fan polygon for a vision cone.
// dir = centre angle, arc = total cone angle, range = cone length.
export function visionFan(ox, oy, dir, arc, range, obstacles) {
  const angles = new Set([dir - arc / 2, dir + arc / 2]);
  for (const ob of obstacles) {
    const verts = ob.pts || [[ob.x, ob.y], [ob.x + ob.w, ob.y], [ob.x + ob.w, ob.y + ob.h], [ob.x, ob.y + ob.h]];
    for (const [vx, vy] of verts) {
      const a = Math.atan2(vy - oy, vx - ox);
      if (Math.abs(angNorm(a - dir)) <= arc / 2 + 0.05) { angles.add(a - 0.001); angles.add(a); angles.add(a + 0.001); }
    }
  }
  const sorted = [...angles].sort((a, b) => a - b);
  const fan = [[ox, oy]];
  for (const a of sorted) {
    const d = rayDist(ox, oy, a, obstacles, range);
    fan.push([ox + Math.cos(a) * d, oy + Math.sin(a) * d]);
  }
  return fan;
}
// True when nothing blocks the line of sight between two points.
export function hasLineOfSight(ax, ay, bx, by, obstacles) {
  for (const ob of obstacles) if (segHitsObstacle(ax, ay, bx, by, ob) >= 0) return false;
  return true;
}
// Is point inside a vision fan (angle + range + LOS)? Used for exposure tests.
export function inCone(px, py, ox, oy, dir, arc, range, obstacles) {
  const d = dist(px, py, ox, oy);
  if (d > range) return false;
  if (Math.abs(angNorm(Math.atan2(py - oy, px - ox) - dir)) > arc / 2) return false;
  return hasLineOfSight(ox, oy, px, py, obstacles);
}
export function pointInRect(px, py, r) { return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h; }
