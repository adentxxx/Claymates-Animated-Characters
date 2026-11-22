// Action menu that drops out of a trigger button (the download icon in the stage tab bar):
// "Скачать PNG", "Скачать видео", "Скопировать ссылку". Picking a row runs it and closes.
// Motion is ported from the "Spring dropdown" component (designbookmark.com/motion):
// the menu height is a spring that opens with a little overshoot, rows come in one after
// another starting next to the trigger, the hover highlight stretches between rows
// (stiff leading edge, soft trailing edge).
// Keys on the trigger: Enter/Space open, ↑/↓ move, Enter picks, Escape closes.
import { S, tune, step, clamp, settled, register } from './motion.js';

const SPRING = {
  height: [300, 23], fade: [400, 34], row: [300, 24], lead: [620, 36], trail: [200, 20], hl: [400, 32],
};
const ROW = 40, PAD = 6;
const svg = (p, sw = 1.9) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;

export function createActionMenu(root, items, { trigger, onRun, up = true }) {
  root.classList.add('xp');
  root.innerHTML = `
    <div class="xp-menu${up ? ' up' : ''}" role="menu" aria-label="Скачать"><div class="xp-inner">
      <i class="xp-hl"></i>
      ${items.map((it, i) => `<div class="xp-opt" role="menuitem" id="xp-o${i}">${svg(it.icon)}<b>${it.label}</b></div>`).join('')}
    </div></div>`;
  const q = (s) => root.querySelector(s);
  const menu = q('.xp-menu'), hl = q('.xp-hl');
  const opts = [...root.querySelectorAll('.xp-opt')].map((el, i) => ({ el, i, s: S(0, SPRING.row) }));
  const MH = PAD * 2 + ROW * items.length;
  const H = S(0, SPRING.height), O = S(0, SPRING.fade);
  const HT = S(PAD, SPRING.lead), HB = S(PAD + ROW, SPRING.lead), HO = S(0, SPRING.hl);
  let open = false, hov = -1, awake = true;
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
    trigger.setAttribute('aria-activedescendant', opts[i].el.id);
    wake();
  }
  function setOpen(o) {
    if (open === o) return;
    open = o;
    trigger.setAttribute('aria-expanded', o);
    trigger.classList.toggle('open', o);
    H.t = o ? MH : 0; O.t = o ? 1 : 0;
    const n = opts.length;
    // rows nearest the trigger come first (the bottom row when the menu opens upwards)
    opts.forEach((p, i) => { const r = up ? n - 1 - i : i; after(o ? 0.05 + r * 0.045 : (n - 1 - r) * 0.02, () => { p.s.t = open ? 1 : 0; }); });
    if (!o) { hov = -1; HO.t = 0; trigger.removeAttribute('aria-activedescendant'); }
    wake();
  }
  function pick(i) {
    after(0.12, () => setOpen(false));
    onRun(items[i].id);
  }

  trigger.addEventListener('click', () => setOpen(!open));
  opts.forEach((p) => {
    p.el.addEventListener('pointerenter', () => { if (open) hover(p.i); });
    p.el.addEventListener('pointermove', () => { if (open) hover(p.i); });
    p.el.addEventListener('click', () => { if (open) pick(p.i); });
  });
  // a press anywhere else closes it
  addEventListener('pointerdown', (e) => {
    if (open && !e.composedPath().includes(root) && !e.composedPath().includes(trigger)) setOpen(false);
  });
  trigger.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) { setOpen(true); hover(up ? opts.length - 1 : 0, true); }
      else hover(hov < 0 ? 0 : hov + (e.key === 'ArrowDown' ? 1 : -1));
    } else if (e.key === 'Enter' && open && hov > -1) { e.preventDefault(); pick(hov); }
    else if (e.key === 'Escape' && open) { setOpen(false); }
  });

  const all = () => [H, O, HT, HB, HO, ...opts.map((p) => p.s)];
  register({
    sleeping: () => !awake,
    frame(dt) {
      for (let i = timers.length - 1; i >= 0; i--) if ((timers[i].t -= dt) <= 0) timers.splice(i, 1)[0].fn();
      all().forEach((s) => step(s, dt));
    },
    render() {
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
      });
      hl.style.opacity = (clamp(HO.x, 0, 1) * o).toFixed(3);
      const ht = clamp(Math.min(HT.x, HB.x - 16), PAD, MH - PAD - 16), hb = clamp(HB.x, ht + 16, MH - PAD);
      hl.style.height = (hb - ht).toFixed(2) + 'px';
      hl.style.transform = `translateY(${(ht - PAD).toFixed(2)}px)`; // inside the padded inner box
      if (!timers.length && all().every((s) => settled(s, 0.002))) awake = false;
    },
  });

  return {
    // video export in progress: the trigger pulses
    setBusy(on) { trigger.classList.toggle('busy', on); },
  };
}
