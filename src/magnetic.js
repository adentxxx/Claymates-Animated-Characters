// Magnetic button — port of the "Magnetic button" motion component (designbookmark.com/motion).
// Inside a pull radius the button moves a share of the way toward the cursor and its label a
// little more, so it feels like it has depth; outside the radius both spring back. Pressing
// squeezes it. Springs as in the original: button 170/13, label 220/15, scale 400/18.
// (The original's idle "ghost cursor" dot is a demo device and is left out.)
import { S, step, register } from './motion.js';

/**
 * @param {HTMLElement} btn    the button (moved and scaled)
 * @param {HTMLElement} label  its content (moves a bit further)
 * @param {{ radius?: number }} o
 */
export function magnetic(btn, label, o = {}) {
  const R = o.radius ?? 130;
  const bx = S(0, [170, 13]), by = S(0, [170, 13]);
  const lx = S(0, [220, 15]), ly = S(0, [220, 15]);
  const sc = S(1, [400, 18]);
  const springs = [bx, by, lx, ly, sc];
  let px = null, py = null, pressed = false, awake = true;
  const wake = () => { awake = true; };

  addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    px = e.clientX; py = e.clientY; wake();
  });
  document.documentElement.addEventListener('pointerleave', () => { px = null; wake(); });
  btn.addEventListener('pointerdown', () => { pressed = true; sc.t = 0.94; wake(); });
  const release = () => { if (!pressed) return; pressed = false; sc.t = 1; sc.v = 3; wake(); };
  btn.addEventListener('pointerup', release);
  btn.addEventListener('pointerleave', release);

  register({
    sleeping: () => !awake,
    frame(dt) {
      // the button's resting centre (its layout box, without our own transform)
      const r = btn.getBoundingClientRect();
      const cx = r.left + r.width / 2 - bx.x, cy = r.top + r.height / 2 - by.x;
      let pull = 0, dx = 0, dy = 0;
      if (px !== null) {
        dx = px - cx; dy = py - cy;
        const d = Math.hypot(dx, dy);
        pull = d < R ? 1 - (d / R) * 0.35 : 0;
      }
      bx.t = dx * 0.32 * pull; by.t = dy * 0.38 * pull;
      lx.t = dx * 0.14 * pull; ly.t = dy * 0.18 * pull;
      if (!pressed) sc.t = 1 + 0.06 * pull;
      springs.forEach((s) => step(s, dt));
    },
    render() {
      btn.style.transform = `translate(${bx.x.toFixed(2)}px,${by.x.toFixed(2)}px) scale(${sc.x.toFixed(4)})`;
      label.style.transform = `translate(${lx.x.toFixed(2)}px,${ly.x.toFixed(2)}px)`;
      // rest once everything has settled; the next pointer move wakes it
      if (springs.every((s) => Math.abs(s.x - s.t) < 0.01 && Math.abs(s.v) < 0.01)) awake = false;
    },
  });
}
