// Jelly slider — ported from the "Jelly slider" motion component (designbookmark.com/motion).
// The thumb follows the pointer through a spring and stretches with its speed. While dragging,
// a value drop rises out of the thumb; both sit in one goo layer, so the drop peels off like
// liquid and melts back in on release. Dragging past either end meets rubber resistance.
// Springs keep the original stiffness/damping values.
import { S, tune, step, clamp, settled, register } from './motion.js';

const SPRING = {
  follow: [900, 50],   // thumb following the pointer
  bubble: [420, 22],   // value drop rising out of the thumb
  release: [300, 14],  // snap back after over-drag
  glide: [420, 34],    // keyboard / value set from outside
  lean: [260, 18],     // drop x lags behind => it leans
  press: [520, 16],    // thumb hover / press scale
};
const GOO_BLUR = 8;
// R thumb radius, TR drawn thumb half size (the goo filter eats ~2px), D drop radius,
// OX/OY goo layer offset, CY track centre inside the rail
const R = 12, TR = 14, D = 18, OX = 40, OY = 80, CY = 16, RISE = -38, REST_DROP = 0.5;

function ensureGooFilter() {
  if (document.getElementById('jelly-goo')) return;
  const ns = 'http://www.w3.org/2000/svg';
  const svgEl = document.createElementNS(ns, 'svg');
  svgEl.setAttribute('width', '0'); svgEl.setAttribute('height', '0'); svgEl.setAttribute('aria-hidden', 'true');
  svgEl.style.position = 'absolute';
  svgEl.innerHTML = `<filter id="jelly-goo" x="-50%" y="-50%" width="200%" height="200%">
    <feGaussianBlur in="SourceGraphic" stdDeviation="${GOO_BLUR}" result="b"/>
    <feColorMatrix in="b" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -10" result="g"/>
    <feComposite in="SourceGraphic" in2="g" operator="atop"/>
  </filter>`;
  document.body.appendChild(svgEl);
}

const rubber = (x, min, max, d = 18) =>
  x < min ? min - (1 - 1 / ((min - x) * 0.55 / d + 1)) * d :
  x > max ? max + (1 - 1 / ((x - max) * 0.55 / d + 1)) * d : x;

/**
 * @param {object} o  { label, min, max, step, value, format(v), onInput(v), onChange(v) }
 */
export function createJellySlider(o) {
  ensureGooFilter();
  const root = document.createElement('div');
  root.className = 'jelly';
  root.innerHTML = `
    <div class="jelly-rail">
      <div class="jelly-track"><div class="jelly-fill"></div></div>
      <div class="jelly-goo"><div class="jelly-blob jelly-drop"></div><div class="jelly-blob jelly-thumb"></div></div>
      <div class="jelly-label"></div>
      <div class="jelly-hit" role="slider" tabindex="0"></div>
    </div>
    <div class="jelly-marks" aria-hidden="true"></div>`;
  const q = (s) => root.querySelector(s);
  const rail = q('.jelly-rail'), fill = q('.jelly-fill'), thumb = q('.jelly-thumb'), drop = q('.jelly-drop');
  const dropLabel = q('.jelly-label'), hit = q('.jelly-hit');
  hit.setAttribute('aria-label', o.label || '');
  hit.setAttribute('aria-valuemin', o.min); hit.setAttribute('aria-valuemax', o.max);

  // scale under the track (no numbers): a mark every 5%, a taller one every 25%; passed ones light up
  const marks = [];
  for (let p = 0; p <= 100; p += 5) {
    const m = document.createElement('i');
    m.style.setProperty('--p', p / 100);
    if (p % 25 === 0) m.className = 'major';
    q('.jelly-marks').appendChild(m); marks.push(m);
  }
  let litPct = -1;
  const lightScale = (pct) => {
    const v = Math.round(pct / 5) * 5;
    if (v === litPct) return; litPct = v;
    marks.forEach((m, i) => m.classList.toggle('on', i * 5 <= v && v > 0));
  };

  const fmt = o.format || ((v) => String(+v.toFixed(2)).replace('.', ','));
  const snap = (v) => { const s = o.step || 0.01; return clamp(Math.round((v - o.min) / s) * s + o.min, o.min, o.max); };
  // width is 0 while the panel is hidden, so the position is kept as a ratio
  let Wd = 0, ratio = (o.value - o.min) / (o.max - o.min), emitted = o.value;
  const span = () => Math.max(Wd - 2 * R, 1);
  const toX = (r) => R + r * span();
  const toR = (x) => clamp((x - R) / span(), 0, 1);
  const valueOf = (x) => snap(o.min + toR(x) * (o.max - o.min));

  const X = S(toX(ratio), SPRING.follow);
  const DX = S(X.x, SPRING.lean);
  const DY = S(CY, SPRING.bubble);
  const DS = S(REST_DROP, SPRING.bubble);
  const PS = S(1, SPRING.press);

  let dragging = false, hover = false, lifted = false, awake = true;
  const wake = () => { awake = true; };
  function sync() {
    const up = dragging || lifted;
    DY.t = up ? CY + RISE : CY;
    DS.t = up ? 1 : REST_DROP;
    PS.t = dragging ? 1.16 : hover ? 1.08 : 1;
    wake();
  }
  function emit(final) {
    const v = valueOf(clamp(X.t, R, Wd - R));
    if (v !== emitted) { emitted = v; o.onInput && o.onInput(v); }
    if (final) o.onChange && o.onChange(v);
  }
  const localX = (e) => e.clientX - rail.getBoundingClientRect().left;

  rail.addEventListener('pointerdown', (e) => {
    e.preventDefault(); // no text selection while dragging
    dragging = true; try { rail.setPointerCapture(e.pointerId); } catch {}
    tune(X, SPRING.follow);
    X.t = rubber(localX(e), R, Wd - R);
    sync(); emit(false);
    hit.focus({ preventScroll: true });
    window.getSelection && window.getSelection().removeAllRanges();
  });
  rail.addEventListener('pointermove', (e) => { if (dragging) { X.t = rubber(localX(e), R, Wd - R); wake(); emit(false); } });
  const end = () => {
    if (!dragging) return;
    dragging = false;
    tune(X, SPRING.release); X.t = clamp(X.t, R, Wd - R);
    sync(); emit(true);
  };
  rail.addEventListener('pointerup', end);
  rail.addEventListener('pointercancel', end);
  rail.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') { hover = true; sync(); } });
  rail.addEventListener('pointerleave', () => { hover = false; sync(); });

  // keyboard: the drop stays up while the thumb has keyboard focus, so the value is its focus state
  hit.addEventListener('keydown', (e) => {
    const d = { ArrowRight: 5, ArrowUp: 5, ArrowLeft: -5, ArrowDown: -5, PageUp: 10, PageDown: -10 }[e.key];
    const abs = { Home: 0, End: 100 }[e.key];
    if (d === undefined && abs === undefined) return;
    e.preventDefault();
    const pct = abs !== undefined ? abs : clamp(Math.round(toR(X.t) * 100) + d, 0, 100);
    tune(X, SPRING.glide); X.t = toX(pct / 100);
    lifted = true; sync(); emit(true);
  });
  hit.addEventListener('focus', () => { if (hit.matches(':focus-visible')) { lifted = true; sync(); } });
  hit.addEventListener('blur', () => { lifted = false; sync(); });

  new ResizeObserver(() => {
    const w = rail.clientWidth; if (!w || w === Wd) return;
    Wd = w; X.x = X.t = DX.x = DX.t = toX(ratio); X.v = DX.v = 0; wake();
  }).observe(rail);

  register({
    // sleep while hidden or at rest, so a panel full of sliders costs nothing
    sleeping() {
      if (!rail.isConnected || rail.offsetParent === null) return true;
      if (!awake) return true;
      return false;
    },
    frame(dt) {
      DX.t = X.x;
      if (Wd > 2 * R) ratio = toR(X.t);
      step(X, dt); step(DX, dt); step(DY, dt); step(DS, dt); step(PS, dt);
    },
    render() {
      const x = X.x;
      const st = 1 + Math.min(Math.abs(X.v) / 2400, 0.4); // stretch with speed, area preserving
      thumb.style.transform = `translate(${x - TR + OX}px,${CY - TR + OY}px) scale(${st * PS.x},${PS.x / st})`;
      const tilt = clamp((DX.x - X.x) * 0.9, -28, 28);      // drop leans the way it is dragged from
      const dTr = `translate(${DX.x - D}px,${DY.x - D}px) rotate(${tilt}deg) scale(${DS.x})`;
      drop.style.transform = `translate(${OX}px,${OY}px) ` + dTr;
      dropLabel.style.transform = dTr;
      dropLabel.style.opacity = clamp((DS.x - 0.7) / 0.25, 0, 1);
      const v = valueOf(x);
      dropLabel.textContent = fmt(v);
      fill.style.width = clamp(x, 0, Math.max(Wd, 0)) * clamp((x - R) / R, 0, 1) + 'px';
      hit.style.left = x - R + 'px';
      hit.setAttribute('aria-valuenow', v);
      hit.setAttribute('aria-valuetext', fmt(v));
      lightScale(toR(x) * 100);
      if (!dragging && [X, DX, DY, DS, PS].every((s) => settled(s, 0.005))) awake = false;
    },
  });

  return {
    el: root,
    // value changed from outside (preset, random): glide there unless the user is dragging
    set(v) {
      if (dragging) return;
      const r = (clamp(v, o.min, o.max) - o.min) / (o.max - o.min);
      emitted = v;
      if (!Wd) { ratio = r; return; }
      if (Math.abs(r - toR(X.t)) < 1e-4) return;
      tune(X, SPRING.glide); X.t = toX(r); wake();
    },
  };
}
