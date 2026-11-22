import { SHAPES } from './sdf.js';
import { MATERIALS } from './materials.js';
import { EMOTIONS, ANIMS } from './animations.js';
import { PALETTE, PRESETS } from './presets.js';
import { createJellySlider } from './jellyslider.js';
import { S, tune, step, settled, register } from './motion.js';

const SHAPE_ICONS = {
  ball: '<circle cx="20" cy="21" r="14"/>',
  drop: '<path d="M20 4C25 11 33 17 33 25a13 13 0 0 1-26 0C7 17 15 11 20 4Z"/>',
  bean: '<rect x="11" y="4" width="18" height="33" rx="9"/>',
  cube: '<rect x="6" y="7" width="28" height="28" rx="8"/>',
  triangle: '<path d="M20 6 35 33H5Z" stroke-width="5" stroke-linejoin="round"/>',
  pin: '<path d="M20 3a6 6 0 0 1 6 6c0 4-3 6-3 9 0 3 9 6 9 12a12 12 0 0 1-24 0c0-6 9-9 9-12 0-3-3-5-3-9a6 6 0 0 1 6-6Z"/>',
  heart: '<path d="M20 35C8 27 4 20 6 13 8 7 16 6 20 12c4-6 12-5 14 1 2 7-2 14-14 22Z"/>',
  cloud: '<circle cx="20" cy="20" r="11"/><circle cx="11" cy="26" r="8"/><circle cx="29" cy="26" r="8"/><circle cx="15" cy="13" r="6"/><circle cx="26" cy="12" r="6"/>',
  star: '<path d="m20 5 4.5 9.5 10.3 1.3-7.6 7.1 2 10.2L20 28l-9.2 5.1 2-10.2-7.6-7.1 10.3-1.3Z" stroke-width="3" stroke-linejoin="round"/>',
  ghost: '<path d="M8 18a12 12 0 0 1 24 0v16l-4-3-4 3-4-3-4 3-4-3-4 3Z"/>',
};

const TABS = [
  { id: 'shape', label: 'Форма', controls: [
    { key: 'shape', type: 'shapes' },
    { key: 'width', type: 'slider', label: 'Ширина', min: 0.6, max: 1.6, step: 0.01, mesh: true },
    { key: 'height', type: 'slider', label: 'Высота', min: 0.6, max: 1.6, step: 0.01, mesh: true },
    { key: 'depth', type: 'slider', label: 'Объём (толщина)', min: 0.45, max: 1.5, step: 0.01, mesh: true },
    { key: 'taper', type: 'slider', label: 'Сужение кверху', min: -0.8, max: 0.9, step: 0.01, mesh: true },
    { key: 'wobble', type: 'slider', label: 'Ручная лепка', min: 0, max: 1.2, step: 0.01, mesh: true },
  ] },
  { id: 'emotion', label: 'Эмоция', controls: [
    { key: 'emotion', type: 'cards', items: EMOTIONS },
  ] },
  { id: 'material', label: 'Материал', controls: [
    { key: 'material', type: 'choice', label: 'Фактура', options: Object.entries(MATERIALS).map(([v, m]) => ({ v, label: m.label })) },
    { key: 'color', type: 'color', label: 'Цвет тела', palette: PALETTE },
    { key: 'color2', type: 'color', label: 'Второй цвет градиента', palette: PALETTE, showIf: (s) => s.material === 'glow' },
    { key: 'limbSame', type: 'toggle', label: 'Руки и ноги — цветом тела' },
    { key: 'limbColor', type: 'color', label: 'Цвет рук и ног', palette: PALETTE, showIf: (s) => !s.limbSame },
  ] },
  { id: 'face', label: 'Лицо', controls: [
    { key: 'eyes', type: 'choice', label: 'Глаза', options: [
      { v: 'dots', label: '• •' }, { v: 'googly', label: 'Глазастые' }, { v: 'ovals', label: 'Овалы' },
      { v: 'lines', label: '| |' }, { v: 'pixel', label: 'Пиксели' }, { v: 'none', label: 'Нет' }] },
    { key: 'eyeSize', type: 'slider', label: 'Размер глаз', min: 0.5, max: 1.8, step: 0.01 },
    { key: 'eyeSpacing', type: 'slider', label: 'Расстояние между глазами', min: 0.12, max: 0.8, step: 0.01 },
    { key: 'faceY', type: 'slider', label: 'Высота лица', min: 0.2, max: 0.85, step: 0.01 },
    { key: 'mouth', type: 'toggle', label: 'Рот' },
    { key: 'mouthSize', type: 'slider', label: 'Размер рта', min: 0.5, max: 2, step: 0.01, showIf: (s) => s.mouth },
    { key: 'mouthGap', type: 'slider', label: 'Рот ниже / выше', min: 0, max: 1.2, step: 0.01, showIf: (s) => s.mouth },
    { key: 'brows', type: 'choice', label: 'Брови', options: [{ v: 'auto', label: 'По эмоции' }, { v: 'on', label: 'Всегда' }, { v: 'off', label: 'Нет' }] },
    { key: 'shine', type: 'toggle', label: 'Блики в глазах' },
  ] },
  { id: 'body', label: 'Руки/ноги', controls: [
    { key: 'arms', type: 'choice', label: 'Руки', options: [{ v: 'stubby', label: 'Ручки-пухляши' }, { v: 'noodle', label: 'Лапшички' }, { v: 'none', label: 'Нет' }] },
    { key: 'armLength', type: 'slider', label: 'Длина рук', min: 0.5, max: 2, step: 0.01, showIf: (s) => s.arms !== 'none' },
    { key: 'armY', type: 'slider', label: 'Высота плеч', min: 0.15, max: 0.75, step: 0.01, showIf: (s) => s.arms !== 'none' },
    { key: 'legs', type: 'choice', label: 'Ноги', options: [{ v: 'stubby', label: 'Пухлые' }, { v: 'thin', label: 'Тонкие' }, { v: 'none', label: 'Нет' }] },
    { key: 'legLength', type: 'slider', label: 'Длина ног', min: 0.3, max: 2.2, step: 0.01, showIf: (s) => s.legs !== 'none' },
    { key: 'limbThick', type: 'slider', label: 'Толщина конечностей', min: 0.6, max: 1.6, step: 0.01, showIf: (s) => s.legs !== 'none' || s.arms !== 'none' },
  ] },
  { id: 'acc', label: 'Аксессуары', controls: [
    { key: 'head', type: 'choice', label: 'На голове', options: [
      { v: 'none', label: 'Ничего' }, { v: 'beret', label: 'Берет' }, { v: 'cap', label: 'Кепка' }, { v: 'party', label: 'Колпак' },
      { v: 'crown', label: 'Корона' }, { v: 'halo', label: 'Нимб' }, { v: 'bow', label: 'Бантик' }, { v: 'sprout', label: 'Росток' },
      { v: 'antenna', label: 'Антенна' }, { v: 'bunny', label: 'Ушки-зайки' }, { v: 'cat', label: 'Ушки-кошки' }] },
    { key: 'eyewear', type: 'choice', label: 'Очки', options: [{ v: 'none', label: 'Нет' }, { v: 'round', label: 'Круглые' }, { v: 'geek', label: 'Ботаник' }, { v: 'sun', label: 'Солнечные' }] },
    { key: 'neck', type: 'choice', label: 'На шее', options: [{ v: 'none', label: 'Ничего' }, { v: 'tie', label: 'Галстук' }, { v: 'bowtie', label: 'Бабочка' }, { v: 'scarf', label: 'Шарф' }] },
    { key: 'accColor', type: 'color', label: 'Цвет шапки / галстука', palette: PALETTE },
    { key: 'glassColor', type: 'color', label: 'Цвет оправы', palette: PALETTE, showIf: (s) => s.eyewear !== 'none' },
    { key: 'accSize', type: 'slider', label: 'Размер аксессуаров', min: 0.5, max: 1.8, step: 0.01 },
  ] },
];

const ANIM_TABS = [
  { id: 'motion', label: 'Анимация', controls: [
    { key: 'anim', type: 'cards', items: ANIMS },
    { key: 'speed', type: 'slider', label: 'Скорость анимации', min: 0.2, max: 2.5, step: 0.05, format: (v) => v.toFixed(2).replace(/0$/, '').replace('.', ',') + '×' },
    { key: 'follow', type: 'toggle', label: 'Следить за курсором' },
    { key: 'blink', type: 'toggle', label: 'Моргать' },
  ] },
];

// Two stages of building a character: first how it looks, then how it moves.
export const STAGES = [
  { id: 'design', title: 'Дизайн', sub: 'Форма, эмоция, материал и детали', tabs: TABS },
  { id: 'anim', title: 'Анимация', sub: 'Как персонаж двигается', tabs: ANIM_TABS },
];

const DICE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="3.5" width="17" height="17" rx="4.5"/><circle cx="8.5" cy="8.5" r=".9" fill="currentColor"/><circle cx="15.5" cy="15.5" r=".9" fill="currentColor"/><circle cx="15.5" cy="8.5" r=".9" fill="currentColor"/><circle cx="8.5" cy="15.5" r=".9" fill="currentColor"/><circle cx="12" cy="12" r=".9" fill="currentColor"/></svg>';
const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

export function createUI({ state, onChange, onPreset, onRandom }) {
  const tabsEl = document.getElementById('tabs');
  const ctrlEl = document.getElementById('controls');
  const refreshers = [];
  const store = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch { return null; } };

  /* ---- stages, each with its own tabs ---- */
  const tabBtns = {}, panes = {}, lastTab = {};
  let stage = null;
  for (const st of STAGES) {
    lastTab[st.id] = store('claymates.tab.' + st.id) || st.tabs[0].id;
    for (const tab of st.tabs) {
      const b = h('button', 'tab', tab.label);
      b.dataset.stage = st.id;
      b.onclick = () => select(tab.id);
      tabsEl.appendChild(b); tabBtns[tab.id] = b;
      const pane = h('div', 'pane');
      pane.dataset.stage = st.id;
      panes[tab.id] = pane; ctrlEl.appendChild(pane);
      for (const c of tab.controls) pane.appendChild(control(c));
    }
  }
  /* morphing pill under the active tab — same springs as the stage tab bar:
     the edge facing the move is stiff, the other one lags, so the pill stretches across */
  const LEAD = [620, 36], TRAIL = [190, 19];
  const pill = h('i', 'tab-pill');
  tabsEl.prepend(pill);
  const PL = S(0, LEAD), PR = S(0, LEAD), PT = S(0, LEAD), PO = S(0, [420, 32]);
  let pillAwake = true, curTab = null;
  function placePill(snap) {
    const b = tabBtns[curTab];
    if (!b || b.hidden || tabsEl.hidden) { PO.t = 0; pillAwake = true; return; }
    const x = b.offsetLeft, w = b.offsetWidth, y = b.offsetTop;
    if (snap) { PL.x = PL.t = x; PR.x = PR.t = x + w; PT.x = PT.t = y; PL.v = PR.v = PT.v = 0; }
    else {
      const right = x > PL.t || (x === PL.t && y > PT.t);
      tune(PR, right ? LEAD : TRAIL); tune(PL, right ? TRAIL : LEAD); tune(PT, LEAD);
      PL.t = x; PR.t = x + w; PT.t = y;
    }
    pill.style.height = b.offsetHeight + 'px';
    PO.t = 1; if (snap) PO.x = 1;
    pillAwake = true;
  }
  register({
    sleeping: () => !pillAwake,
    frame(dt) { [PL, PR, PT, PO].forEach((s) => step(s, dt)); },
    render() {
      const l = Math.min(PL.x, PR.x - 20);
      pill.style.width = (PR.x - l).toFixed(2) + 'px';
      pill.style.transform = `translate(${l.toFixed(2)}px, ${PT.x.toFixed(2)}px)`;
      pill.style.opacity = Math.max(0, Math.min(1, PO.x)).toFixed(3);
      if ([PL, PR, PT, PO].every((s) => settled(s, 0.01))) pillAwake = false;
    },
  });
  new ResizeObserver(() => placePill(true)).observe(tabsEl);

  function select(id, snap = false) {
    const prev = curTab;
    lastTab[stage.id] = id;
    store('claymates.tab.' + stage.id, id);
    curTab = id;
    // content slides in from the side the pill is moving to
    const order = stage.tabs.map((t) => t.id);
    const dir = prev && !snap && order.includes(prev) ? Math.sign(order.indexOf(id) - order.indexOf(prev)) : 0;
    for (const k in tabBtns) { tabBtns[k].classList.toggle('on', k === id); panes[k].hidden = k !== id; }
    if (dir) {
      const pane = panes[id];
      pane.style.setProperty('--dx', dir * 18 + 'px');
      pane.classList.remove('pane-in'); void pane.offsetWidth; pane.classList.add('pane-in');
    }
    placePill(snap || !prev);
  }
  function setStage(id) {
    stage = STAGES.find((s) => s.id === id) || STAGES[0];
    store('claymates.stage', stage.id);
    document.body.dataset.stage = stage.id;
    for (const k in tabBtns) tabBtns[k].hidden = tabBtns[k].dataset.stage !== stage.id;
    tabsEl.hidden = stage.tabs.length < 2;
    const tab = stage.tabs.some((t) => t.id === lastTab[stage.id]) ? lastTab[stage.id] : stage.tabs[0].id;
    select(tab, true);
    ctrlEl.scrollTop = 0;
    ctrlEl.classList.remove('enter'); void ctrlEl.offsetWidth; ctrlEl.classList.add('enter');
  }
  setStage(store('claymates.stage') || 'design');

  function set(key, value, live = false) {
    state[key] = value;
    onChange(key, live);
    refresh();
  }

  function control(c) {
    const wrap = h('div', 'ctl');
    const label = c.label ? h('div', 'lbl', c.label) : null;
    if (label) wrap.appendChild(label);
    let refreshFn = () => {};
    switch (c.type) {
      case 'shapes': {
        const grid = h('div', 'shape-grid');
        for (const [k, s] of Object.entries(SHAPES)) {
          const b = h('button', 'shape-btn', `<svg viewBox="0 0 40 40">${SHAPE_ICONS[k] || ''}</svg><span>${s.label}</span>`);
          b.onclick = () => set('shape', k);
          b.dataset.v = k; grid.appendChild(b);
        }
        wrap.appendChild(grid);
        refreshFn = () => grid.querySelectorAll('.shape-btn').forEach((b) => b.classList.toggle('on', b.dataset.v === state.shape));
        break;
      }
      case 'slider': {
        const js = createJellySlider({
          label: c.label, min: c.min, max: c.max, step: c.step, value: state[c.key], format: c.format,
          onInput: (v) => set(c.key, v, true),
          onChange: (v) => set(c.key, v, false),
        });
        wrap.appendChild(js.el);
        refreshFn = () => js.set(state[c.key]);
        break;
      }
      case 'choice': {
        const row = h('div', 'chips');
        for (const o of c.options) {
          const b = h('button', 'chip', o.label);
          b.dataset.v = o.v; b.onclick = () => set(c.key, o.v);
          row.appendChild(b);
        }
        wrap.appendChild(row);
        refreshFn = () => row.querySelectorAll('.chip').forEach((b) => b.classList.toggle('on', b.dataset.v === state[c.key]));
        break;
      }
      case 'color': {
        const row = h('div', 'swatches');
        for (const col of c.palette) {
          const b = h('button', 'sw'); b.style.background = col; b.dataset.v = col; b.title = col;
          b.onclick = () => set(c.key, col);
          row.appendChild(b);
        }
        const pick = h('label', 'sw custom', '<span>+</span>');
        const inp = h('input'); inp.type = 'color';
        inp.oninput = () => set(c.key, inp.value, true);
        inp.onchange = () => set(c.key, inp.value, false);
        pick.appendChild(inp); row.appendChild(pick);
        wrap.appendChild(row);
        refreshFn = () => {
          let found = false;
          row.querySelectorAll('.sw').forEach((b) => { const on = b.dataset.v && b.dataset.v.toLowerCase() === String(state[c.key]).toLowerCase(); b.classList.toggle('on', on); found ||= on; });
          pick.classList.toggle('on', !found);
          if (!found) pick.style.background = state[c.key]; else pick.style.background = '';
          inp.value = state[c.key];
        };
        break;
      }
      case 'cards': {
        const grid = h('div', 'card-grid');
        for (const [k, it] of Object.entries(c.items)) {
          const b = h('button', 'card', `<b>${it.icon}</b><span>${it.label}</span>`);
          b.dataset.v = k; b.onclick = () => set(c.key, k);
          grid.appendChild(b);
        }
        wrap.appendChild(grid);
        refreshFn = () => grid.querySelectorAll('.card').forEach((b) => b.classList.toggle('on', b.dataset.v === state[c.key]));
        break;
      }
      case 'toggle': {
        wrap.classList.add('ctl-toggle');
        const sw = h('button', 'toggle', '<i></i>');
        sw.onclick = () => set(c.key, !state[c.key]);
        wrap.appendChild(sw);
        refreshFn = () => sw.classList.toggle('on', !!state[c.key]);
        break;
      }
      case 'button': {
        const b = h('button', 'btn-soft', c.label);
        b.onclick = () => set(c.key, (state[c.key] | 0) + 1);
        wrap.appendChild(b);
        break;
      }
    }
    refreshers.push(() => { refreshFn(); if (c.showIf) wrap.hidden = !c.showIf(state); });
    return wrap;
  }

  /* ---- presets ---- */
  const presetsEl = document.getElementById('presets');
  // first item: a brand-new random character on every click
  const rnd = h('button', 'preset preset-random', `<i aria-hidden="true">${DICE}</i><span>Случайный</span>`);
  rnd.title = 'Новый случайный персонаж';
  rnd.onclick = () => { onRandom(); rnd.classList.remove('spin'); void rnd.offsetWidth; rnd.classList.add('spin'); };
  presetsEl.appendChild(rnd);
  // fade the edge on each side that still has presets hidden behind it
  const FADE = '40px';
  const updateFade = () => {
    const rest = presetsEl.scrollWidth - presetsEl.clientWidth - presetsEl.scrollLeft;
    presetsEl.style.setProperty('--fl', presetsEl.scrollLeft > 1 ? FADE : '0px');
    presetsEl.style.setProperty('--fr', rest > 1 ? FADE : '0px');
  };
  presetsEl.addEventListener('scroll', updateFade, { passive: true });
  new ResizeObserver(updateFade).observe(presetsEl);
  PRESETS.forEach((p, i) => {
    const b = h('button', 'preset', `<i style="--c:${p.st.color}"></i><span>${p.name}</span>`);
    b.onclick = () => onPreset(i);
    presetsEl.appendChild(b);
  });

  function refresh() { for (const r of refreshers) r(); }
  refresh();
  return { refresh, setStage, get stage() { return stage.id; } };
}
