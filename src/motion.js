// Tiny spring engine for UI motion (same model as the designbookmark motion components):
// critically damped when the user asks for reduced motion, one rAF loop with 4 sub-steps.
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

export const S = (x, [k, c]) => ({ x, v: 0, t: x, k, c: reduce ? 2 * Math.sqrt(k) : c });
export const tune = (s, [k, c]) => { s.k = k; s.c = reduce ? 2 * Math.sqrt(k) : c; };
export const step = (s, dt) => { const a = -s.k * (s.x - s.t) - s.c * s.v; s.v += a * dt; s.x += s.v * dt; };
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const settled = (s, eps = 0.01) => Math.abs(s.x - s.t) < eps && Math.abs(s.v) < eps;

const comps = new Set();
let last = performance.now(), running = false;
function loop(now) {
  const dt = Math.min((now - last) / 1000, 1 / 30); last = now;
  for (const c of comps) {
    if (c.sleeping && c.sleeping()) continue;
    for (let k = 0; k < 4; k++) c.frame(dt / 4);
    c.render();
  }
  requestAnimationFrame(loop);
}
export function register(c) {
  comps.add(c);
  if (!running) { running = true; last = performance.now(); requestAnimationFrame(loop); }
  return () => comps.delete(c);
}
