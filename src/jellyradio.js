// Jelly radio — vanilla port of React Bits' <JellyRadio /> (reactbits.dev/micro/jelly-radio).
// A row of chips; the chosen one swells like jelly (wide first, then tall) and its
// neighbours are shoved aside, each one a little later and softer than the one before.
// Same physics as the original: mass springs with damping = 2·√(k·m)·(1 − bounce),
// stiffness falling off with distance, a per-step stagger, and the wide-before-tall split.
import { register } from './motion.js';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

// spring with mass (motion's model) + optional start delay
function spring(x) { return { x, v: 0, t: x, k: 580, c: 40, m: 1, delay: 0 }; }
function tuneTo(s, t, k, m, bounce, delay) {
  s.t = t; s.k = k; s.m = m; s.c = 2 * Math.sqrt(k * m) * (1 - bounce); s.delay = delay;
}
function step(s, dt) {
  if (s.delay > 0) { s.delay -= dt; return; }
  const a = (-s.k * (s.x - s.t) - s.c * s.v) / s.m;
  s.v += a * dt; s.x += s.v * dt;
}
const settled = (s) => s.delay <= 0 && Math.abs(s.x - s.t) < 1e-3 && Math.abs(s.v) < 1e-3;
const moving = (s) => s.delay > 0 || !settled(s);

/**
 * @param {HTMLElement} root  element that becomes the radio group
 * @param {{value:string,label:string}[]} items
 * @param {object} o  value, onChange(value, index), ariaLabel, and the tuning props of the original
 */
export function createJellyRadio(root, items, o = {}) {
  const opt = { gap: 6, swell: 0.2, barge: 6, shrink: 0.05, jelly: 1, bounce: 0.25, stagger: 22, stiffness: 580, ...o };
  root.classList.add('jelly-radio');
  root.setAttribute('role', 'radiogroup');
  root.setAttribute('aria-label', opt.ariaLabel || 'Options');
  root.style.setProperty('--jr-gap', opt.gap + 'px');
  root.innerHTML = '';
  const chips = items.map((it, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'jelly-radio__chip';
    b.setAttribute('role', 'radio');
    b.innerHTML = `<span class="jelly-radio__skin"><span class="jelly-radio__label">${it.label}</span></span>`;
    b.addEventListener('click', (e) => commit(i, e.detail === 0));
    b.addEventListener('keydown', (e) => onKey(e, i));
    root.appendChild(b);
    return { el: b, x: spring(0), sx: spring(1), sy: spring(1) };
  });
  let at = Math.max(0, items.findIndex((it) => it.value === opt.value));
  let widths = [];
  let awake = true;

  function apply(sel, instant) {
    const push = ((widths[sel] || 0) * opt.swell) / 2 + opt.barge;
    chips.forEach((c, i) => {
      const on = i === sel, far = Math.abs(i - sel), dir = Math.sign(i - sel);
      const x = dir * push, s = on ? 1 + opt.swell : 1 - opt.shrink;
      if (instant || reduce) {
        for (const [sp, v] of [[c.x, x], [c.sx, s], [c.sy, s]]) { sp.x = sp.t = v; sp.v = 0; sp.delay = 0; }
        return;
      }
      const k = opt.stiffness * (1 - 0.12 * Math.min(far, 3));
      const inFlight = moving(c.x) || moving(c.sx) || moving(c.sy);
      const delay = inFlight ? 0 : (far * opt.stagger) / 1000;
      const j = opt.jelly;
      tuneTo(c.x, x, k, 0.9, opt.bounce, delay);
      tuneTo(c.sx, s, k * (1 + 0.24 * j), 0.9 - 0.1 * j, Math.min(0.85, opt.bounce + 0.3 * j), delay);
      tuneTo(c.sy, s, k * (1 - 0.14 * j), 0.9 + 0.05 * j, opt.bounce, delay + 0.05 * j);
    });
    chips.forEach((c, i) => {
      c.el.dataset.on = i === sel ? 'true' : 'false';
      c.el.setAttribute('aria-checked', i === sel);
      c.el.tabIndex = i === sel ? 0 : -1;
    });
    awake = true;
  }

  function measure() {
    widths = chips.map((c) => c.el.offsetWidth);
    const chipH = chips[0] ? chips[0].el.offsetHeight : 0;
    const maxW = Math.max(0, ...widths);
    root.style.setProperty('--jr-pad-x', `${Math.ceil((maxW * opt.swell * 1.3) / 2 + opt.barge) + 2}px`);
    root.style.setProperty('--jr-pad-y', `${Math.ceil((chipH * opt.swell) / 2) + 2}px`);
  }
  const settle = () => { measure(); apply(at, true); };

  function commit(i, instant) {
    if (i === at || !items[i]) return;
    at = i;
    apply(i, instant);
    opt.onChange && opt.onChange(items[i].value, i);
  }
  function onKey(e, i) {
    const n = items.length;
    let next = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (i + 1) % n;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (i - 1 + n) % n;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = n - 1;
    if (next === null) return;
    e.preventDefault();
    commit(next, true);
    chips[next].el.focus();
  }

  register({
    sleeping: () => !awake || !root.isConnected || root.offsetParent === null,
    frame(dt) { for (const c of chips) { step(c.x, dt); step(c.sx, dt); step(c.sy, dt); } },
    render() {
      for (const c of chips) c.el.style.transform = `translateX(${c.x.x.toFixed(2)}px) scale(${c.sx.x.toFixed(4)}, ${c.sy.x.toFixed(4)})`;
      if (chips.every((c) => settled(c.x) && settled(c.sx) && settled(c.sy))) awake = false;
    },
  });
  settle();
  new ResizeObserver(settle).observe(root);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(settle);

  return {
    /** change from outside: jumps, like the original's controlled value */
    set(value) {
      const i = items.findIndex((it) => it.value === value);
      if (i < 0 || i === at) return;
      at = i; apply(i, true);
    },
    get value() { return items[at].value; },
    chipEl(value) { const i = items.findIndex((it) => it.value === value); return i < 0 ? null : chips[i].el; },
  };
}
