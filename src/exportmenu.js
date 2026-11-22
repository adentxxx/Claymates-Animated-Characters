// Export split button: the left part runs the current action ("Скачать PNG" by default),
// the chevron opens a menu with the other actions. Picking a row runs it at once and
// makes it the button's action.
// Motion is ported from the "Spring dropdown" component (designbookmark.com/motion):
// the menu height is a spring that drops with a little overshoot, rows fall in one after
// another, the hover highlight stretches between rows (stiff leading edge, soft trailing
// edge), the pick draws a check and rolls the new label into the button.
// Keys on the chevron: Enter/Space/↓ open, arrows move, Enter picks, Escape closes.
import { S, tune, step, clamp, settled, register } from './motion.js';

const SPRING = {
  height: [300, 23], chev: [300, 18], fade: [400, 34], press: [500, 18], roll: [340, 26],
  row: [300, 24], tick: [260, 26], lead: [620, 36], trail: [200, 20], hl: [400, 32],
};
const ROW = 40, PAD = 6;

const svg = (p, sw = 1.9) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
const TICK = '<svg class="xp-tick" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
const CHEV = svg('<path d="m6 9 6 6 6-6"/>', 2);

export function createExportMenu(root, items, { onRun, up = false }) {
  root.classList.add('xp');
  root.innerHTML = `
    <div class="xp-split">
      <button class="xp-main" type="button">
        <span class="xp-val">
          <span class="xp-slot">${svg(items[0].icon)}<b>${items[0].label}</b></span>
          <span class="xp-slot">${svg(items[0].icon)}<b></b></span>
        </span>
      </button>
      <i class="xp-div"></i>
      <button class="xp-more" type="button" aria-haspopup="menu" aria-expanded="false" aria-label="Другие способы сохранить">${CHEV}</button>
    </div>
    <div class="xp-menu${up ? ' up' : ''}" role="menu"><div class="xp-inner">
      <i class="xp-hl"></i>
      ${items.map((it, i) => `<div class="xp-opt" role="menuitemradio" id="xp-o${i}" aria-checked="${i === 0}">${svg(it.icon)}<b>${it.label}</b>${TICK}</div>`).join('')}
    </div></div>`;
  const q = (s) => root.querySelector(s);
  const main = q('.xp-main'), more = q('.xp-more'), menu = q('.xp-menu'), hl = q('.xp-hl'), chev = more.firstElementChild;
  const slots = [...root.querySelectorAll('.xp-slot')];
  const opts = [...root.querySelectorAll('.xp-opt')].map((el, i) => ({
    el, i, tick: el.querySelector('.xp-tick path'), s: S(0, SPRING.row), k: S(i === 0 ? 1 : 0, SPRING.tick),
  }));
  const MH = PAD * 2 + ROW * items.length;
  const H = S(0, SPRING.height), C = S(0, SPRING.chev), O = S(0, SPRING.fade);
  const TS = S(1, SPRING.press), R = S(1, SPRING.roll);
  const HT = S(PAD, SPRING.lead), HB = S(PAD + ROW, SPRING.lead), HO = S(0, SPRING.hl);
  let open = false, sel = 0, hov = -1, front = 0, awake = true;
  const wake = () => { awake = true; };

  const timers = [];
  const after = (sec, fn) => { timers.push({ t: sec, fn }); wake(); };

  function hover(i, snap) {
    if (i === hov || i < 0 || i >= opts.length) return;
    const top = PAD + i * ROW;
    if (snap || hov < 0) { HT.x = HT.t = top; HB.x = HB.t = top + ROW; HT.v = HB.v = 0; }
    else {
      const down = i > hov;
      tune(down ? HB : HT, SPRING.lead); tune(down ? HT : HB, SPRING.trail);
      HT.t = top; HB.t = top + ROW;
    }
    hov = i; HO.t = 1;
    more.setAttribute('aria-activedescendant', opts[i].el.id);
    wake();
  }
  function setOpen(o) {
    if (open === o) return;
    open = o;
    more.setAttribute('aria-expanded', o);
    root.classList.toggle('open', o);
    H.t = o ? MH : 0; C.t = o ? 1 : 0; O.t = o ? 1 : 0;
    const n = opts.length;
    // rows nearest the button come first (bottom row when the menu opens upwards)
    opts.forEach((p, i) => { const r = up ? n - 1 - i : i; after(o ? 0.05 + r * 0.045 : (n - 1 - r) * 0.02, () => { p.s.t = open ? 1 : 0; }); });
    if (o) hover(sel, true);
    else { hov = -1; HO.t = 0; more.removeAttribute('aria-activedescendant'); }
    wake();
  }
  function pick(i) {
    if (i !== sel) {
      sel = i; front ^= 1;
      const s = slots[front];
      s.firstElementChild.outerHTML = svg(items[i].icon);
      s.lastElementChild.textContent = items[i].label;
      R.x = 0; R.v = 0; R.t = 1;
    }
    opts.forEach((p) => { p.k.t = p.i === sel ? 1 : 0; p.el.setAttribute('aria-checked', p.i === sel); });
    TS.x = 0.955;
    after(0.24, () => setOpen(false));
    onRun(items[i].id);
    wake();
  }

  main.addEventListener('click', () => { TS.x = 0.955; wake(); if (open) setOpen(false); onRun(items[sel].id); });
  more.addEventListener('click', () => { setOpen(!open); });
  opts.forEach((p) => {
    p.el.addEventListener('pointerenter', () => { if (open) hover(p.i); });
    p.el.addEventListener('pointermove', () => { if (open) hover(p.i); });
    p.el.addEventListener('click', () => { if (open) pick(p.i); });
  });
  // a press anywhere else closes it
  addEventListener('pointerdown', (e) => { if (open && !e.composedPath().includes(root)) setOpen(false); });
  more.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) setOpen(true); else hover(hov + (e.key === 'ArrowDown' ? 1 : -1));
    } else if ((e.key === 'Enter' || e.key === ' ') && open && hov > -1) { e.preventDefault(); pick(hov); }
    else if (e.key === 'Escape' && open) { setOpen(false); }
  });

  const all = () => [H, C, O, TS, R, HT, HB, HO, ...opts.flatMap((p) => [p.s, p.k])];
  register({
    sleeping: () => !awake,
    frame(dt) {
      for (let i = timers.length - 1; i >= 0; i--) if ((timers[i].t -= dt) <= 0) timers.splice(i, 1)[0].fn();
      all().forEach((s) => step(s, dt));
    },
    render() {
      main.style.transform = `scale(${TS.x.toFixed(4)})`;
      chev.style.transform = `rotate(${(180 * C.x).toFixed(2)}deg)`;
      const h = Math.max(0, H.x), o = clamp(O.x, 0, 1);
      menu.style.height = h.toFixed(2) + 'px';
      menu.style.opacity = o.toFixed(3);
      menu.style.visibility = h < 1 ? 'hidden' : 'visible';
      menu.style.pointerEvents = open ? 'auto' : 'none';
      menu.style.transform = `scaleX(${(0.9 + 0.1 * clamp(H.x / MH, 0, 1.06)).toFixed(4)})`;
      opts.forEach((p) => {
        const s = clamp(p.s.x, 0, 1);
        p.el.style.opacity = s.toFixed(3);
        p.el.style.transform = `translateY(${((p.s.x - 1) * 14 * (up ? -1 : 1)).toFixed(2)}px)`;
        p.tick.style.strokeDashoffset = (22 * (1 - clamp(p.k.x, 0, 1))).toFixed(2);
      });
      hl.style.opacity = (clamp(HO.x, 0, 1) * o).toFixed(3);
      const ht = clamp(Math.min(HT.x, HB.x - 16), PAD, MH - PAD - 16), hb = clamp(HB.x, ht + 16, MH - PAD);
      hl.style.height = (hb - ht).toFixed(2) + 'px';
      hl.style.transform = `translateY(${(ht - PAD).toFixed(2)}px)`; // inside the padded inner box
      const r = R.x, a = slots[front], b = slots[front ^ 1];
      a.style.opacity = clamp(r, 0, 1).toFixed(3);
      a.style.transform = `translateY(${((1 - r) * 18).toFixed(2)}px)`;
      b.style.opacity = clamp(1 - r, 0, 1).toFixed(3);
      b.style.transform = `translateY(${(-r * 18).toFixed(2)}px)`;
      if (!timers.length && all().every((s) => settled(s, 0.002))) awake = false;
    },
  });

  return {
    // recording in progress: the main part pulses and ignores clicks
    setBusy(on) { root.classList.toggle('busy', on); main.disabled = on; },
  };
}
