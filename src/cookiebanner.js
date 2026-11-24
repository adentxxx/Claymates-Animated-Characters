// Cookie consent banner — port of the "Cookie bite" motion component (designbookmark.com/motion).
// A card with a real cookie on it. Accept and it is eaten in three bites, crumbs and all;
// No thanks and it rolls off the card and drops. Either way the card springs down to a one-line
// note with a check that draws itself, then fades away. Same springs as the original
// (tokens.css: pop 520/16, settle 280/22, soft 260/24, fade 420/32, plus the component's own).
import { S, tune, step, clamp, register } from './motion.js';

const NS = 'http://www.w3.org/2000/svg';
const SPRING = { pop: [520, 16], settle: [280, 22], soft: [260, 24], fade: [420, 32] };

const COOKIE_SVG = `
  <svg class="cb-cookie" viewBox="0 0 64 64" aria-hidden="true">
    <defs>
      <radialGradient id="cb-dough" cx=".34" cy=".26" r=".86"><stop class="d0" offset="0"/><stop class="d1" offset=".5"/><stop class="d2" offset="1"/></radialGradient>
      <radialGradient id="cb-chip" cx=".36" cy=".3" r=".8"><stop class="c0" offset="0"/><stop class="c1" offset="1"/></radialGradient>
      <radialGradient id="cb-dent" cx=".5" cy=".62" r=".6"><stop class="n0" offset="0"/><stop class="n1" offset="1"/></radialGradient>
      <mask id="cb-bites" maskUnits="userSpaceOnUse" x="-8" y="-8" width="80" height="80"><rect class="keep" x="-8" y="-8" width="80" height="80"/><g class="cb-bite-cuts"></g></mask>
    </defs>
    <g mask="url(#cb-bites)">
      <circle class="edge" cx="32" cy="32" r="30"/>
      <circle class="dough" cx="32" cy="31.2" r="29"/>
      <ellipse class="dent" cx="14" cy="27" rx="3.2" ry="2.4"/><ellipse class="dent" cx="34" cy="26" rx="2.6" ry="2"/>
      <ellipse class="dent" cx="50" cy="42" rx="2.8" ry="2.2"/><ellipse class="dent" cx="27" cy="43" rx="2.2" ry="1.7"/>
      <g class="chips">
        <circle cx="22" cy="19" r="4.4"/><circle cx="41" cy="16" r="3.3"/><circle cx="46" cy="31" r="4.2"/>
        <circle cx="30" cy="34" r="3.5"/><circle cx="17" cy="38" r="3.1"/><circle cx="38" cy="48" r="4.4"/><circle cx="24" cy="51" r="2.7"/>
      </g>
    </g>
  </svg>`;

/**
 * @param {{ onChoice: (granted: boolean) => void, onMore?: () => void }} o
 * @returns {{ open: () => void }}
 */
export function createCookieBanner({ onChoice, onMore }) {
  const banner = document.createElement('div');
  banner.className = 'cb';
  banner.setAttribute('role', 'region');
  banner.setAttribute('aria-label', 'Cookie consent');
  banner.hidden = true;
  banner.innerHTML = `
    <div class="cb-body">
      <div class="cb-top">
        <div class="cb-plate">${COOKIE_SVG}<i class="cb-crumbs"></i></div>
        <div class="cb-copy">
          <h3>Cookies, freshly baked</h3>
          <p>We use analytics cookies to see which characters people make. No ads. <button class="cb-more" type="button">Learn more</button></p>
        </div>
      </div>
      <div class="cb-row">
        <button class="cb-btn cb-no" type="button">No thanks</button>
        <button class="cb-btn cb-yes" type="button">Accept</button>
      </div>
    </div>
    <div class="cb-done" aria-live="polite"><svg viewBox="0 0 24 24" aria-hidden="true"><path pathLength="1" d="M6 12.5l4 4 8-9"/></svg><span></span></div>`;
  document.body.appendChild(banner);

  const q = (s) => banner.querySelector(s);
  const body = q('.cb-body'), cookie = q('.cb-cookie'), bitesG = q('.cb-bite-cuts'), crumbsEl = q('.cb-crumbs');
  const yes = q('.cb-yes'), no = q('.cb-no'), done = q('.cb-done'), msg = q('.cb-done span'), tick = q('.cb-done path');

  // three bites, each a round cut on the rim with three teeth marks on its inner edge
  const BITES = [-42, 28, 196].map((deg) => {
    const r = (deg * Math.PI) / 180, cx = 32 + Math.cos(r) * 30, cy = 32 + Math.sin(r) * 30;
    const parts = [[cx, cy, 13]];
    [-52, 0, 52].forEach((t) => { const a = r + Math.PI + (t * Math.PI) / 180; parts.push([cx + Math.cos(a) * 11.5, cy + Math.sin(a) * 11.5, 5.2]); });
    const els = parts.map(() => bitesG.appendChild(document.createElementNS(NS, 'circle')));
    return { parts, els, s: S(0, [700, 22]), x: cx, y: cy };
  });
  const crumbs = Array.from({ length: 18 }, () => ({ el: crumbsEl.appendChild(document.createElement('i')), life: 0, x: 0, y: 0, vx: 0, vy: 0, r: 0, vr: 0 }));
  let ci = 0;

  const M = S(0, SPRING.soft);                       // 0 card, 1 note
  const WW = S(0, SPRING.soft), HH = S(0, [230, 22]);
  const CS = S(1, SPRING.pop);                       // cookie scale
  const CR = S(0, [190, 9]);                         // cookie wobble
  const CY = S(-46, SPRING.settle);                  // cookie dropping onto the plate
  const PY = S(1, SPRING.pop), PN = S(1, SPRING.pop);   // button presses
  const TK = S(0, [160, 20]);                        // the check drawing itself
  const SHOW = S(0, SPRING.fade);                    // whole banner in / out
  const springs = [M, WW, HH, CS, CR, CY, PY, PN, TK, SHOW, ...BITES.map((b) => b.s)];

  let W0 = 0, H0 = 0, W1 = 0, busy = false, flick = null, awake = false, visible = false;
  const timers = [];
  const after = (sec, fn) => { timers.push({ t: sec, fn }); awake = true; };

  function measure() {
    W0 = Math.min(340, innerWidth - 32);
    body.style.width = W0 + 'px';
    H0 = body.offsetHeight; W1 = done.offsetWidth;
    WW.t = M.t ? W1 : W0; HH.t = M.t ? 44 : H0;
    if (!WW.x) { WW.x = WW.t; HH.x = HH.t; }
    awake = true;
  }
  addEventListener('resize', () => { if (visible) measure(); });

  function spray(x, y, n, power) {                   // crumbs, in the cookie's own 64 box
    for (let i = 0; i < n; i++) {
      const c = crumbs[ci++ % crumbs.length], a = Math.random() * Math.PI * 2;
      c.life = 0.75 + Math.random() * 0.35; c.x = x - 32; c.y = y - 32;
      c.vx = Math.cos(a) * power * (0.4 + Math.random()); c.vy = -Math.abs(Math.sin(a)) * power * (0.6 + Math.random()) - 40;
      c.r = 0; c.vr = (Math.random() - 0.5) * 900;
    }
  }
  function bite(i) {
    const b = BITES[i];
    b.s.t = 1; CR.v += (i % 2 ? -1 : 1) * 520; CS.x = 0.86;
    spray(b.x, b.y, 5, 150);
  }
  function fold(text, ok) {
    msg.textContent = text; done.classList.toggle('is-yes', ok);
    W1 = done.offsetWidth;
    M.t = 1; WW.t = W1; HH.t = 44; TK.x = 0; TK.t = 0;
    after(0.28, () => { TK.t = 1; });
    after(1.9, () => { SHOW.t = 0; });                 // the note leaves on its own
    after(2.4, () => { banner.hidden = true; visible = false; });
  }
  function accept() {
    if (busy) return; busy = true; PY.x = 0.92;
    onChoice(true);
    [0, 1, 2].forEach((i) => after(0.1 + i * 0.27, () => bite(i)));
    after(0.1 + 3 * 0.27, () => { tune(CS, [600, 34]); CS.t = 0; spray(32, 32, 6, 110); });
    after(1.2, () => { tune(CS, SPRING.pop); fold('Thanks! Enjoy the cookie', true); });
  }
  function decline() {
    if (busy) return; busy = true; PN.x = 0.92;
    onChoice(false);
    flick = { x: 0, y: 0, vx: -60, vy: 0 };            // rolls off the left edge of the card, then drops
    after(0.8, () => fold('Essentials only', false));
  }
  yes.addEventListener('click', accept);
  q('.cb-more').addEventListener('click', () => onMore && onMore());
  no.addEventListener('click', decline);

  function open() {
    // a fresh cookie dropped onto the plate
    BITES.forEach((b) => { b.s.x = b.s.t = 0; b.s.v = 0; });
    crumbs.forEach((c) => { c.life = 0; });
    flick = null; busy = false;
    tune(CS, SPRING.pop); CS.x = 0.4; CS.t = 1; CS.v = 0; CR.x = CR.v = 0; CY.x = -46; CY.v = 0; CY.t = 0;
    M.x = M.t = 0; M.v = 0;
    banner.hidden = false; visible = true;
    WW.x = 0; measure();
    SHOW.x = 0; SHOW.t = 1;
    awake = true;
  }

  register({
    sleeping: () => !awake,
    frame(dt) {
      for (let i = timers.length - 1; i >= 0; i--) if ((timers[i].t -= dt) <= 0) timers.splice(i, 1)[0].fn();
      springs.forEach((s) => step(s, dt));
      if (flick) {
        flick.vx -= 620 * dt; flick.x += flick.vx * dt;
        if (flick.x < -46) { flick.vy += 1500 * dt; flick.y += flick.vy * dt; }
      }
      crumbs.forEach((c) => {
        if (c.life <= 0) return;
        c.life -= dt; c.vy += 900 * dt; c.x += c.vx * dt; c.y += c.vy * dt; c.r += c.vr * dt;
      });
    },
    render() {
      const m = clamp(M.x, 0, 1), show = clamp(SHOW.x, 0, 1);
      banner.style.width = WW.x.toFixed(1) + 'px'; banner.style.height = HH.x.toFixed(1) + 'px';
      banner.style.borderRadius = Math.min(20, HH.x / 2).toFixed(1) + 'px';
      banner.style.opacity = show.toFixed(3);
      banner.style.setProperty('--cb-y', ((1 - show) * 14).toFixed(2) + 'px');
      banner.style.setProperty('--cb-w', WW.x.toFixed(1) + 'px');
      body.style.opacity = clamp(1 - m * 2.2, 0, 1).toFixed(3);
      body.style.transform = `translate(${((WW.x - W0) / 2).toFixed(1)}px,${((HH.x - H0) / 2).toFixed(1)}px)`;
      body.style.pointerEvents = m > 0.1 ? 'none' : 'auto';
      // open, the cookie and its crumbs may leave the card; folding, nothing may
      banner.style.overflow = M.t || m > 0.01 ? 'hidden' : 'visible';
      const d = clamp(m * 2.2 - 1.2, 0, 1);
      done.style.opacity = d.toFixed(3);
      done.style.transform = `translate(-50%,-50%) translateY(${((1 - d) * 8).toFixed(2)}px)`;
      tick.style.strokeDashoffset = (1 - clamp(TK.x, 0, 1)).toFixed(4);
      BITES.forEach((b) => b.parts.forEach((p, i) => {
        const k = Math.max(0, b.s.x);
        b.els[i].setAttribute('cx', p[0].toFixed(2)); b.els[i].setAttribute('cy', p[1].toFixed(2)); b.els[i].setAttribute('r', (p[2] * k).toFixed(2));
      }));
      const fx = flick ? flick.x : 0, fy = flick ? flick.y : 0;
      cookie.style.transform = `translate(${fx.toFixed(1)}px,${(fy + CY.x).toFixed(1)}px) rotate(${(CR.x * 0.012 + fx / 28).toFixed(4)}rad) scale(${Math.max(0, CS.x).toFixed(4)})`;
      crumbs.forEach((c) => {
        const o = c.life <= 0 ? 0 : Math.min(1, c.life * 3);
        c.el.style.opacity = o.toFixed(2);
        if (o) c.el.style.transform = `translate(${(32 + c.x).toFixed(1)}px,${(32 + c.y).toFixed(1)}px) rotate(${c.r.toFixed(0)}deg)`;
      });
      yes.style.transform = `scale(${PY.x.toFixed(4)})`; no.style.transform = `scale(${PN.x.toFixed(4)})`;
      // asleep once everything has settled and nothing is scheduled
      const crumbing = crumbs.some((c) => c.life > 0);
      if (!timers.length && !flick && !crumbing && springs.every((s) => Math.abs(s.x - s.t) < 1e-3 && Math.abs(s.v) < 1e-3)) awake = false;
      if (flick && flick.y > 600) flick = null;
    },
  });

  return { open };
}
