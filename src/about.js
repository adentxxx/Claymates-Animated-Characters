// "i" badge in the bottom-left corner. Hover (or tap / focus) shows a dark tooltip with the
// same look and spring motion as the stage tab bar's morph tooltip: it pops up from its
// tail with a little overshoot. Inside: a link to the GitHub repo and to the developer.
import { S, step, clamp, settled, register } from './motion.js';

const SHOW = [420, 24]; // same spring as the stage bar tooltip
const GITHUB = 'https://github.com/adentxxx/Squish-Animated-Characters';
const DEV = 'https://hereisalex.art/';

// scalloped "cookie" outline: a circle with soft wavy lobes
function scallop(cx, cy, r, amp, lobes, steps = 120) {
  let d = '';
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2 - Math.PI / 2;
    const rr = r + amp * Math.cos(lobes * a);
    d += `${i ? 'L' : 'M'}${(cx + rr * Math.cos(a)).toFixed(2)} ${(cy + rr * Math.sin(a)).toFixed(2)}`;
  }
  return d + 'Z';
}

const GH_ICON = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.54-3.88-1.54-.53-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.78 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.42-2.7 5.4-5.26 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z"/></svg>';
const ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9"/></svg>';
const HEART = '<svg viewBox="0 0 24 24" fill="#ff4d6d" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.6-9.3C.9 8.2 3 4.5 6.6 4.5c2.1 0 3.6 1.2 5.4 3.2 1.8-2 3.3-3.2 5.4-3.2 3.6 0 5.7 3.7 4.2 7.2C19.5 16.4 12 21 12 21Z"/></svg>';

export function createAbout(root) {
  root.innerHTML = `
    <button class="about-btn" type="button" aria-label="О проекте" aria-expanded="false" aria-controls="about-tip">
      <svg viewBox="0 0 28 28" aria-hidden="true">
        <path class="about-badge" d="${scallop(14, 14, 11, 2.2, 7)}"/>
        <circle cx="14" cy="9.4" r="1.6" fill="#fff"/>
        <path d="M14 13v6.4" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/>
      </svg>
    </button>
    <i class="about-tail"></i>
    <div class="about-tip" id="about-tip">
      <a class="about-gh" href="${GITHUB}" target="_blank" rel="noopener">${GH_ICON}<span>Проект на GitHub</span>${ARROW}</a>
      <p class="about-by">Сделано с ${HEART} — <a href="${DEV}" target="_blank" rel="noopener">hereisalex</a></p>
    </div>`;
  const btn = root.querySelector('.about-btn'), tip = root.querySelector('.about-tip'), tail = root.querySelector('.about-tail');
  const A = S(0, SHOW);
  let hideT = null, awake = true, pinned = false;

  function show() { clearTimeout(hideT); hideT = null; A.t = 1; awake = true; btn.setAttribute('aria-expanded', 'true'); }
  function hide(delay = 0.14) {
    clearTimeout(hideT);
    hideT = setTimeout(() => { hideT = null; pinned = false; A.t = 0; awake = true; btn.setAttribute('aria-expanded', 'false'); }, delay * 1000);
  }

  root.addEventListener('pointerenter', (e) => { if (e.pointerType !== 'touch') show(); });
  root.addEventListener('pointerleave', (e) => { if (e.pointerType !== 'touch' && !pinned) hide(); });
  root.addEventListener('focusin', show);
  root.addEventListener('focusout', (e) => { if (!root.contains(e.relatedTarget)) hide(); });
  // touch: a tap toggles it
  btn.addEventListener('click', () => { if (A.t === 1 && pinned) hide(0); else { pinned = true; show(); } });
  addEventListener('pointerdown', (e) => { if (A.t === 1 && !root.contains(e.target)) hide(0); });
  root.addEventListener('keydown', (e) => { if (e.key === 'Escape') { hide(0); btn.focus(); } });

  register({
    sleeping: () => !awake,
    frame(dt) { step(A, dt); },
    render() {
      const a = clamp(A.x, 0, 1.15), op = clamp(A.x, 0, 1);
      tip.style.opacity = op.toFixed(3);
      tip.style.visibility = op < 0.01 ? 'hidden' : 'visible';
      tip.style.pointerEvents = A.t === 1 ? 'auto' : 'none';
      tip.style.transform = `translateY(${((1 - a) * 6).toFixed(2)}px) scale(${(0.72 + 0.28 * a).toFixed(4)})`;
      tail.style.opacity = op.toFixed(3);
      tail.style.transform = `translateY(${((1 - a) * 8).toFixed(2)}px) rotate(45deg) scale(${a.toFixed(3)})`;
      btn.querySelector('svg').style.transform = `scale(${(1 + 0.08 * op).toFixed(4)}) rotate(${(op * 20).toFixed(2)}deg)`;
      if (settled(A, 0.002)) awake = false;
    },
  });
}
