// render.js — all drawing: HUD, art-deco floor, wall-occluded cones, actors, dock, banners.
import { W, H, HUD, PAL, clamp, visionFan } from './core.js';
import { THIEF_R, GUARD_R } from './actors.js';
import { TOOLS } from './stealth.js';
function rr(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
export function drawHUD(ctx, room, stealth, tick) {
  ctx.fillStyle = PAL.ink; ctx.fillRect(0, 0, W, HUD);
  ctx.fillStyle = PAL.brass; ctx.fillRect(0, HUD - 3, W, 3);
  ctx.fillStyle = PAL.cream; ctx.font = 'bold 20px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText(room.name, 14, HUD / 2 + 1);
  // Alarm meter: 260x26, bright bold overlay text >= 22px
  const bx = 300, by = 7, bw = 260, bh = 26;
  ctx.fillStyle = '#000'; ctx.fillRect(bx - 2, by - 2, bw + 4, bh + 4);
  ctx.fillStyle = '#3A1518'; ctx.fillRect(bx, by, bw, bh);
  const a = stealth.alarm / 100;
  ctx.fillStyle = a >= 0.7 ? PAL.red : a >= 0.4 ? PAL.orange : PAL.green;
  ctx.fillRect(bx, by, Math.round(bw * a), bh);
  ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('ALARM: ' + Math.round(stealth.alarm) + '%', bx + bw / 2, by + bh / 2 + 1);
  ctx.textAlign = 'right'; ctx.font = 'bold 19px sans-serif'; ctx.fillStyle = PAL.cream;
  ctx.fillText('SCORE ' + stealth.score + '   T+' + Math.floor(tick / 60) + 's', W - 14, HUD / 2 + 1);
  ctx.textAlign = 'left';
}
function drawFloor(ctx, room) {
  ctx.fillStyle = PAL.navy; ctx.fillRect(0, HUD, W, H - HUD);
  ctx.strokeStyle = PAL.teal; ctx.lineWidth = 1;
  for (const [x, y, r] of room.decor.rings) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke(); }
  const [rx, ry] = room.decor.rose;
  ctx.strokeStyle = PAL.brass; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(rx, ry, 26, 0, Math.PI * 2); ctx.stroke();
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4;
    ctx.beginPath(); ctx.moveTo(rx + Math.cos(a) * 26, ry + Math.sin(a) * 26);
    ctx.lineTo(rx + Math.cos(a) * 44, ry + Math.sin(a) * 44); ctx.stroke();
  }
  ctx.strokeStyle = PAL.brass; ctx.lineWidth = 2;
  for (const [x1, y1, x2, y2] of room.decor.lines) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
  ctx.fillStyle = PAL.slate;
  for (const [x, y, w, h] of room.walls) ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = PAL.brass; ctx.lineWidth = 2;
  for (const [x, y, w, h] of room.walls) ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
}
function drawCone(ctx, fan, color) {
  ctx.beginPath(); ctx.moveTo(fan[0][0], fan[0][1]);
  for (let i = 1; i < fan.length; i++) ctx.lineTo(fan[i][0], fan[i][1]);
  ctx.closePath(); ctx.fillStyle = color; ctx.fill();
  ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke();
}
export function drawRoom(ctx, room, actors, stealth, opts) {
  drawFloor(ctx, room);
  const obstacles = room.walls.map(([x, y, w, h]) => ({ x, y, w, h }));
  // Patrol routes (readable dotted paths)
  ctx.setLineDash([4, 6]); ctx.strokeStyle = 'rgba(244,232,200,0.5)'; ctx.lineWidth = 2;
  for (const g of actors.guards) {
    ctx.beginPath(); ctx.moveTo(g.wp[0][0], g.wp[0][1]);
    for (const [x, y] of g.wp) ctx.lineTo(x, y);
    ctx.closePath(); ctx.stroke();
  }
  ctx.setLineDash([]);
  // Cover blocks with mint edge
  for (const [x, y, w, h] of room.cover) {
    ctx.fillStyle = PAL.teal; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = PAL.mint; ctx.fillRect(x, y, w, 5); ctx.fillRect(x, y + h - 5, w, 5);
    ctx.strokeStyle = PAL.brass; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  }
  // Loot + caches + hatch
  if (!opts.lootTaken) {
    ctx.fillStyle = PAL.gold; ctx.beginPath(); ctx.arc(room.lootPos[0], room.lootPos[1], 16, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = PAL.ink; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = PAL.ink; ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('$' + room.loot, room.lootPos[0], room.lootPos[1] - 26);
  }
  ctx.fillStyle = PAL.brass;
  room.caches.forEach(([cx, cy], i) => {
    if (opts.cachesTaken.has(i)) return;
    ctx.beginPath(); ctx.arc(cx, cy, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = PAL.ink; ctx.font = 'bold 13px sans-serif'; ctx.fillText('$50', cx, cy - 16); ctx.fillStyle = PAL.brass;
  });
  ctx.fillStyle = opts.hatchOpen ? PAL.green : PAL.slate;
  ctx.fillRect(room.hatch[0] - 26, room.hatch[1] - 18, 52, 36);
  ctx.strokeStyle = PAL.brass; ctx.lineWidth = 2; ctx.strokeRect(room.hatch[0] - 26, room.hatch[1] - 18, 52, 36);
  ctx.fillStyle = PAL.cream; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('HATCH', room.hatch[0], room.hatch[1] + 30);
  // Vision cones (wall-occluded, shared raycast)
  for (const g of actors.guards) {
    const fan = visionFan(g.x, g.y, g.dir, g.arc, g.range, obstacles);
    drawCone(ctx, fan, g.chase || g.suspicion > 60 ? 'rgba(240,79,79,0.30)' : 'rgba(242,165,65,0.28)');
  }
  for (const c of actors.cameras) {
    const fan = visionFan(c.x, c.y, c.dir, c.arc, c.range, obstacles);
    drawCone(ctx, fan, 'rgba(232,121,91,0.28)');
  }
  // Cameras
  for (const c of actors.cameras) {
    ctx.fillStyle = PAL.coral; ctx.beginPath(); ctx.arc(c.x, c.y, 9, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = PAL.cream; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(c.x + Math.cos(c.dir) * 16, c.y + Math.sin(c.dir) * 16); ctx.stroke();
  }
  // Guards with suspicion ring
  for (const g of actors.guards) {
    ctx.fillStyle = g.chase ? PAL.red : PAL.orange; ctx.beginPath(); ctx.arc(g.x, g.y, GUARD_R, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#071820'; ctx.beginPath(); ctx.arc(g.x + Math.cos(g.dir) * 7, g.y + Math.sin(g.dir) * 7, 5, 0, Math.PI * 2); ctx.fill();
    if (g.suspicion > 5) {
      ctx.fillStyle = g.suspicion > 60 ? PAL.red : PAL.orange;
      ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('!' + Math.round(g.suspicion) + '%', g.x, g.y - 24);
      if (g.spotted > 0) { ctx.font = 'bold 17px sans-serif'; ctx.fillText('SPOTTED', g.x, g.y - 42); }
    }
  }
  // Thief
  const t = actors.thief;
  ctx.fillStyle = t.hidden ? 'rgba(121,216,181,0.55)' : PAL.mint;
  ctx.beginPath(); ctx.arc(t.x, t.y, THIEF_R, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = PAL.ink; ctx.beginPath(); ctx.arc(t.x - 4, t.y - 3, 2.5, 0, Math.PI * 2); ctx.arc(t.x + 4, t.y - 3, 2.5, 0, Math.PI * 2); ctx.fill();
  // Tool dock (floating, y=580). All labels drawn inside the 48px buttons.
  const SHORT = ['Bell', 'Soot', 'Clock'];
  opts.dock = [];
  TOOLS.forEach((tool, i) => {
    const x = 408 + i * 64, y = 580, w = 48, h = 48;
    opts.dock.push({ x, y, w, h, idx: i });
    const afford = stealth.charges >= tool.cost;
    ctx.fillStyle = afford ? PAL.navy : '#222'; rr(ctx, x, y, w, h, 8); ctx.fill();
    ctx.strokeStyle = afford ? PAL.brass : '#555'; ctx.lineWidth = 2; rr(ctx, x, y, w, h, 8); ctx.stroke();
    ctx.fillStyle = afford ? PAL.cream : '#888'; ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(tool.key, x + w / 2, y + 17);
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText(SHORT[i], x + w / 2, y + 31);
    ctx.fillStyle = PAL.mint; ctx.font = 'bold 12px sans-serif';
    ctx.fillText('x' + tool.cost, x + w / 2, y + 44);
  });
  ctx.fillStyle = PAL.cream; ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'left';
  ctx.fillText('KIT: ' + stealth.charges + '/' + stealth.maxCharges, 408, 572);
  // Warning banner (derived from alarm so staged scenes show it too)
  if (stealth.alarm >= 70 && !opts.escaped) {
    ctx.fillStyle = PAL.red; ctx.fillRect(0, HUD, W, 30);
    ctx.fillStyle = '#FFF'; ctx.font = 'bold 20px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('WARNING!', W / 2, HUD + 21);
  }
  // Escape banner + scorecard
  if (opts.escaped) {
    ctx.fillStyle = PAL.green; ctx.fillRect(0, HUD, W, 34);
    ctx.fillStyle = '#071820'; ctx.font = 'bold 21px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('AIRLOCK SEALED / GETAWAY SUCCESSFUL', W / 2, HUD + 24);
    const sx = 640, sy = 120, sw = 290, sh = 190;
    ctx.fillStyle = 'rgba(7,24,32,0.92)'; rr(ctx, sx, sy, sw, sh, 10); ctx.fill();
    ctx.strokeStyle = PAL.brass; ctx.lineWidth = 2; rr(ctx, sx, sy, sw, sh, 10); ctx.stroke();
    ctx.fillStyle = PAL.cream; ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'left';
    const lines = ['SCORECARD', 'Loot: $' + opts.score, 'Caches: ' + opts.caches, 'Peak alarm: ' + opts.peak + '%', 'Time: ' + Math.floor(opts.ticks / 60) + 's', 'Efficiency bonus: +' + opts.bonus, 'TOTAL: ' + (opts.score + opts.bonus)];
    lines.forEach((L, i) => ctx.fillText(L, sx + 16, sy + 28 + i * 24));
  }
  ctx.textAlign = 'left';
}
