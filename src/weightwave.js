// Weight wave — port of the "Weight wave" motion component (designbookmark.com/motion), plus a
// blur-in reveal. Each letter's weight is a spring pulled toward a bell curve around the pointer,
// so a swell of bold rolls through the word as you move; with nobody pointing, the swell sweeps
// back and forth by itself. Springs as in the original: weight 260/22, swell position 150/22;
// the reveal uses the shared "soft" spring 260/24. Needs a variable font (here: Unbounded 200–900).
// The gradient fill is split across the letters (each one shows its own slice of the same
// gradient), so per-letter opacity and blur still work with background-clip: text.
import { S, step, clamp, register } from './motion.js';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * @param {HTMLElement} el  element whose text becomes the wave
 * @param {{ light?: number, bold?: number, spread?: number, gradient?: string, delay?: number, stagger?: number }} o
 */
export function weightWave(el, o = {}) {
  const LIGHT = o.light ?? 300, BOLD = o.bold ?? 820, SPREAD = o.spread ?? 0.13;
  const text = el.textContent;
  el.textContent = '';
  el.classList.add('ww');
  if (getComputedStyle(el).position === 'static') el.style.position = 'relative';   // offsets are measured from the word
  const letters = [...text].map((ch, i) => {
    const span = document.createElement('span');
    span.className = 'ww-ch';
    span.textContent = ch;
    if (o.gradient) span.style.backgroundImage = o.gradient;
    el.appendChild(span);
    // reveal: each letter blurs in a moment after the previous one
    return { el: span, w: S(LIGHT, [260, 22]), a: S(0, [260, 24]), at: (o.delay ?? 0.25) + i * (o.stagger ?? 0.22), g: 0 };
  });

  const focus = S(-0.2, [150, 22]);   // where the swell is: 0 = left end of the word, 1 = right end
  let hover = false, t = 0, clock = 0;
  addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    const r = el.getBoundingClientRect();
    hover = true;
    focus.t = (e.clientX - r.left) / r.width;
  });
  document.documentElement.addEventListener('pointerleave', () => { hover = false; t = 0; });

  register({
    sleeping: () => document.hidden,
    frame(dt) {
      clock += dt;
      if (!hover) {
        t += dt;
        // the swell sweeps across the word and back every 4.6 s (still, if the visitor prefers less motion)
        focus.t = reduce ? 0.5 : -0.06 + 1.12 * (0.5 - 0.5 * Math.cos((t * Math.PI * 2) / 4.6));
      }
      step(focus, dt);
      for (const l of letters) {
        if (clock >= l.at) l.a.t = 1;
        step(l.w, dt); step(l.a, dt);
      }
    },
    render() {
      // read every position first, then write, so the line lays out once a frame
      const total = el.offsetWidth || 1;
      const boxes = letters.map((l) => [l.el.offsetLeft, l.el.offsetWidth]);
      letters.forEach((l, k) => {
        const [left, width] = boxes[k];
        const d = ((left + width / 2) / total - focus.x) / SPREAD;
        l.g = Math.exp(-d * d);
        l.w.t = LIGHT + (BOLD - LIGHT) * l.g;
        const a = clamp(l.a.x, 0, 1.2);
        const weightLight = 0.42 + 0.58 * clamp((l.w.x - LIGHT) / (BOLD - LIGHT), 0, 1);
        const s = l.el.style;
        s.fontWeight = clamp(l.w.x, 100, 900).toFixed(1);
        s.opacity = (weightLight * clamp(a, 0, 1)).toFixed(3);
        s.filter = a < 0.995 ? `blur(${((1 - clamp(a, 0, 1)) * 22).toFixed(2)}px)` : 'none';
        s.transform = `translateY(${((1 - a) * 18).toFixed(2)}px) scale(${(0.9 + 0.1 * a).toFixed(4)})`;
        // this letter's slice of the word-wide gradient
        s.backgroundSize = `${total}px 100%`;
        s.backgroundPosition = `${-left}px 0`;
      });
    },
  });
}
