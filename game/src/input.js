// input.js — keyboard + dock clicks. No network, no storage.
export class Input {
  constructor(canvas, onTool, onRestart) {
    this.keys = new Set();
    this.onTool = onTool; this.onRestart = onRestart;
    this.dock = []; // filled by render: [{x,y,w,h,idx}]
    window.addEventListener('keydown', e => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
      this.keys.add(e.key.length === 1 ? e.key.toLowerCase() : e.key);
      if (e.key === '1' || e.key === '2' || e.key === '3') onTool(Number(e.key) - 1);
      if (e.key === 'r' || e.key === 'R') onRestart();
    });
    window.addEventListener('keyup', e => this.keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key));
    canvas.addEventListener('pointerdown', e => {
      const r = canvas.getBoundingClientRect();
      const x = (e.clientX - r.left) * (canvas.width / r.width), y = (e.clientY - r.top) * (canvas.height / r.height);
      for (const b of this.dock) if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) { onTool(b.idx); return; }
    });
  }
  moveVec() {
    let dx = 0, dy = 0;
    if (this.keys.has('a') || this.keys.has('ArrowLeft')) dx -= 1;
    if (this.keys.has('d') || this.keys.has('ArrowRight')) dx += 1;
    if (this.keys.has('w') || this.keys.has('ArrowUp')) dy -= 1;
    if (this.keys.has('s') || this.keys.has('ArrowDown')) dy += 1;
    if (dx && dy) { dx *= 0.7071; dy *= 0.7071; }
    return [dx, dy];
  }
}
