// Morphing selection pill: a dark shape under the selected item of a group (tabs, chips,
// grids) that travels to the next selection on springs. The edges facing the move ride a
// stiff spring and the opposite edges a soft one, so the pill stretches across and settles —
// horizontally and vertically, so it also works in wrapping rows and grids.
// Same springs as the stage tab bar (Morph tooltip): lead 620/36, trail 190/19.
import { S, tune, step, settled, register } from './motion.js';

const LEAD = [620, 36], TRAIL = [190, 19], FADE = [420, 32];

export function createMorphPill(container, className = 'morph-pill') {
  const pill = document.createElement('i');
  pill.className = className;
  pill.setAttribute('aria-hidden', 'true');
  container.prepend(pill);
  const L = S(0, LEAD), R = S(0, LEAD), T = S(0, LEAD), B = S(0, LEAD), O = S(0, FADE);
  let target = null, awake = true, placed = false;

  function place(snap) {
    const el = target;
    // hidden (inactive pane) or nothing selected: re-place without motion once visible
    if (!el || el.offsetParent === null || !container.offsetWidth) { O.t = el ? O.t : 0; placed = false; awake = true; return; }
    const x = el.offsetLeft, y = el.offsetTop, w = el.offsetWidth, h = el.offsetHeight;
    if (snap || !placed) {
      L.x = L.t = x; R.x = R.t = x + w; T.x = T.t = y; B.x = B.t = y + h;
      [L, R, T, B].forEach((s) => { s.v = 0; });
      O.x = O.t = 1;
    } else {
      const right = x + w / 2 > (L.t + R.t) / 2, down = y + h / 2 > (T.t + B.t) / 2;
      tune(R, right ? LEAD : TRAIL); tune(L, right ? TRAIL : LEAD);
      tune(B, down ? LEAD : TRAIL); tune(T, down ? TRAIL : LEAD);
      L.t = x; R.t = x + w; T.t = y; B.t = y + h; O.t = 1;
    }
    placed = true; awake = true;
  }

  register({
    sleeping: () => !awake,
    frame(dt) { [L, R, T, B, O].forEach((s) => step(s, dt)); },
    render() {
      const l = Math.min(L.x, R.x - 16), t = Math.min(T.x, B.x - 16);
      pill.style.width = (R.x - l).toFixed(2) + 'px';
      pill.style.height = (B.x - t).toFixed(2) + 'px';
      pill.style.transform = `translate(${l.toFixed(2)}px, ${t.toFixed(2)}px)`;
      pill.style.opacity = Math.max(0, Math.min(1, O.x)).toFixed(3);
      if ([L, R, T, B, O].every((s) => settled(s, 0.01))) awake = false;
    },
  });
  // panel resize, fonts loading, an inactive pane becoming visible: jump into place
  new ResizeObserver(() => place(true)).observe(container);

  return {
    /** move to `el` (animated) or jump there with snap = true */
    moveTo(el, snap = false) {
      if (el === target && placed && !snap) return;
      target = el;
      place(snap);
    },
    hide() { target = null; O.t = 0; awake = true; },
  };
}
