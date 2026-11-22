import { S, tune, step, clamp } from './motion.js';

// Stage switcher: a small icon tab bar at the bottom centre with one morphing tooltip.
// Ported from the "Morph tooltip" motion component (designbookmark.com/motion).
// The tooltip never hides between tabs: the edge facing the new tab rides a stiff
// spring and the other edge a soft one, so it stretches across and settles at the
// new label's width. Spring stiffness/damping values are the original ones.

const SPRING = {
  lead: [620, 36],   // edge facing the move
  trail: [190, 19],  // lagging edge, makes the stretch
  tail: [300, 22],   // little pointer under the tooltip
  show: [420, 24],   // tooltip appear / disappear
  fade: [420, 32],   // label cross-fade
  pop: [520, 16],    // icon pop on select
};
const BW = 52, GAP = 4, PAD = 6, SEP = 9; // SEP: divider before the action button (1px + 4px margins)


const ICONS = {
  // palette
  design: '<path d="M12 22a1 1 0 0 1 0-20 10 9 0 0 1 10 9 5 5 0 0 1-5 5h-2.25a1.75 1.75 0 0 0-1.4 2.8l.3.4a1.75 1.75 0 0 1-1.4 2.8z"/><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/>',
  // play inside motion lines
  anim: '<path d="M9 7.5v9l7-4.5z"/><path d="M3.5 9a9 9 0 0 1 2.2-3.6M3.5 15a9 9 0 0 0 2.2 3.6M20.5 9a9 9 0 0 0-2.2-3.6M20.5 15a9 9 0 0 1-2.2 3.6"/>',
  // arrow into tray
  download: '<path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5"/><path d="M5 19h14"/>',
};
const svg = (p) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;

// `action` (optional): one extra button after a divider, e.g. { id: 'download', title: 'Скачать', onClick(el) }.
// It shares the hover highlight and the morphing tooltip but is not a tab.
export function createStageBar(root, items, { initial, onSelect, action = null }) {
  const n = items.length;
  const W = PAD * 2 + n * BW + (n - 1) * GAP + (action ? 2 * GAP + SEP + BW : 0);
  root.style.width = W + 'px';
  const all = action ? [...items, action] : items;
  root.innerHTML = `
    <i class="sb-tail"></i>
    <div class="sb-tip" role="tooltip">${all.map((it) => `<span class="sb-lab${it.key ? '' : ' sb-lab--plain'}">${it.title}${it.key ? `<kbd>${it.key}</kbd>` : ''}</span>`).join('')}</div>
    <div class="sb-bar" role="tablist" aria-label="Этапы настройки">
      <i class="sb-hl"></i>
      ${items.map((it) => `<button class="sb-tool" role="tab" aria-label="${it.title}, клавиша ${it.key}">${svg(ICONS[it.id])}</button>`).join('')}
      ${action ? `<i class="sb-sep"></i><button class="sb-tool sb-action" aria-haspopup="menu" aria-expanded="false" aria-label="${action.title}">${svg(ICONS[action.id])}</button>` : ''}
    </div>`;
  const q = (sel) => root.querySelector(sel);
  const tip = q('.sb-tip'), tail = q('.sb-tail'), hl = q('.sb-hl'), bar = q('.sb-bar');
  const tools = [...root.querySelectorAll('.sb-tool:not(.sb-action)')].map((el) => ({ el, ic: el.firstElementChild, p: S(1, SPRING.pop) }));
  const actionBtn = action ? { el: q('.sb-action'), ic: q('.sb-action').firstElementChild, p: S(1, SPRING.pop) } : null;
  const labs = [...root.querySelectorAll('.sb-lab')].map((el) => ({ el, o: S(0, SPRING.fade), dir: 0, w: 96 }));
  const cx = (i) => (i < n ? PAD + i * (BW + GAP) : PAD + n * (BW + GAP) + SEP + GAP) + BW / 2;

  const TL = S(0, SPRING.lead), TR = S(0, SPRING.lead), TX = S(0, SPRING.tail); // tooltip edges, tail centre
  const HL = S(0, SPRING.lead), HR = S(0, SPRING.lead);                         // hover highlight edges
  const A = S(0, SPRING.show);                                                  // shown amount
  let cur = -1, hideT = null, active = -1;

  // timers on the spring clock
  const timers = [];
  const after = (sec, fn) => { const t = { t: sec, fn }; timers.push(t); return t; };
  const cancel = (t) => { const i = timers.indexOf(t); if (i > -1) timers.splice(i, 1); };

  function place(i, snap) {
    const c = cx(i), half = labs[i].w / 2;
    [[TL, c - half], [TR, c + half], [TX, c], [HL, c - BW / 2], [HR, c + BW / 2]].forEach(([s, v]) => {
      s.t = v; if (snap) { s.x = v; s.v = 0; }
    });
  }
  const measure = () => { labs.forEach((l) => { l.w = l.el.offsetWidth || l.w; }); if (cur > -1) place(cur, false); };
  measure();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);

  function point(i) {
    if (hideT) { cancel(hideT); hideT = null; }
    if (i === cur) { A.t = 1; return; }
    const dir = cur < 0 ? 0 : Math.sign(i - cur);
    if (A.x < 0.3) {
      place(i, true); // nothing on screen yet: appear where it is needed
      labs.forEach((l, k) => { l.o.x = l.o.t = k === i ? 1 : 0; l.o.v = 0; l.dir = 0; });
    } else {
      const right = dir >= 0;
      [TR, HR].forEach((s) => tune(s, right ? SPRING.lead : SPRING.trail));
      [TL, HL].forEach((s) => tune(s, right ? SPRING.trail : SPRING.lead));
      place(i, false);
      labs.forEach((l, k) => {
        if (k === i) { l.dir = dir; l.o.t = 1; }
        else if (l.o.t === 1) { l.dir = -dir; l.o.t = 0; }
      });
    }
    cur = i; A.t = 1;
  }
  function leave(delay = 0.14) {
    if (hideT) cancel(hideT);
    hideT = after(delay, () => { hideT = null; A.t = 0; cur = -1; });
  }
  function select(i, notify = true) {
    if (i === active) return;
    active = i;
    tools.forEach((t, k) => { t.el.setAttribute('aria-selected', k === i); t.el.tabIndex = k === i ? 0 : -1; });
    tools[i].p.x = 0.78; A.x = Math.min(A.x, 0.9);
    if (notify) onSelect(items[i].id);
  }

  tools.forEach((t, i) => {
    t.el.addEventListener('pointerenter', () => point(i));
    t.el.addEventListener('focus', () => point(i));
    t.el.addEventListener('blur', () => leave());
    t.el.addEventListener('click', () => { point(i); select(i); });
  });
  if (actionBtn) {
    actionBtn.el.addEventListener('pointerenter', () => point(n));
    actionBtn.el.addEventListener('focus', () => point(n));
    actionBtn.el.addEventListener('blur', () => leave());
    actionBtn.el.addEventListener('click', () => { actionBtn.p.x = 0.78; leave(0); action.onClick(actionBtn.el); });
  }
  bar.addEventListener('pointerleave', () => leave());
  bar.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    const i = (active + (e.key === 'ArrowRight' ? 1 : -1) + items.length) % items.length;
    tools[i].el.focus(); select(i);
  });

  select(Math.max(0, items.findIndex((it) => it.id === initial)), false);

  let last = performance.now();
  function loop(now) {
    const dt = Math.min((now - last) / 1000, 1 / 30); last = now;
    for (let i = timers.length - 1; i >= 0; i--) if ((timers[i].t -= dt) <= 0) timers.splice(i, 1)[0].fn();
    for (let k = 0; k < 4; k++) {
      const h = dt / 4;
      [TL, TR, TX, HL, HR, A].forEach((s) => step(s, h));
      labs.forEach((l) => step(l.o, h));
      tools.forEach((t) => step(t.p, h));
      if (actionBtn) step(actionBtn.p, h);
    }
    render();
    requestAnimationFrame(loop);
  }
  function render() {
    const a = clamp(A.x, 0, 1.15), op = clamp(A.x, 0, 1);
    const l = Math.min(TL.x, TR.x - 30), w = TR.x - l;
    tip.style.width = w.toFixed(2) + 'px';
    tip.style.opacity = op.toFixed(3);
    tip.style.transform = `translate(${l.toFixed(2)}px,${((1 - a) * 6).toFixed(2)}px) scale(${(0.72 + 0.28 * a).toFixed(4)})`;
    const tx = clamp(TX.x, l + 12, l + w - 12);
    tail.style.opacity = op.toFixed(3);
    tail.style.transform = `translate(${(tx - 6).toFixed(2)}px,${((1 - a) * 8).toFixed(2)}px) rotate(45deg) scale(${a.toFixed(3)})`;
    hl.style.opacity = op.toFixed(3);
    const hx = clamp(Math.min(HL.x, HR.x - 20), PAD, W - PAD - 20), hr = clamp(HR.x, hx + 20, W - PAD);
    hl.style.width = (hr - hx).toFixed(2) + 'px';
    hl.style.transform = `translateX(${hx.toFixed(2)}px)`;
    labs.forEach((lb) => {
      const o = clamp(lb.o.x, 0, 1);
      lb.el.style.opacity = o.toFixed(3);
      lb.el.style.transform = `translateX(calc(-50% + ${(lb.dir * (1 - o) * 14).toFixed(2)}px))`;
      lb.el.style.filter = o > 0.02 && o < 0.98 ? `blur(${((1 - o) * 3).toFixed(2)}px)` : 'none';
    });
    tools.forEach((t) => { t.ic.style.transform = `scale(${t.p.x.toFixed(4)})`; });
    if (actionBtn) actionBtn.ic.style.transform = `scale(${actionBtn.p.x.toFixed(4)})`;
  }
  requestAnimationFrame(loop);

  return {
    actionEl: actionBtn ? actionBtn.el : null,
    // switch from outside (keyboard shortcut): flash the tooltip over the new tab
    select(id) {
      const i = items.findIndex((it) => it.id === id);
      if (i < 0) return;
      point(i); select(i, false); leave(0.9);
    },
  };
}
