import { SHAPES } from './sdf.js';
import { MATERIALS } from './materials.js';
import { EMOTIONS, ANIMS } from './animations.js';
import { PALETTE, PRESETS } from './presets.js';

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

export const TABS = [
  { id: 'shape', label: 'Форма', controls: [
    { key: 'shape', type: 'shapes' },
    { key: 'width', type: 'slider', label: 'Ширина', min: 0.6, max: 1.6, step: 0.01, mesh: true },
    { key: 'height', type: 'slider', label: 'Высота', min: 0.6, max: 1.6, step: 0.01, mesh: true },
    { key: 'depth', type: 'slider', label: 'Объём (толщина)', min: 0.45, max: 1.5, step: 0.01, mesh: true },
    { key: 'taper', type: 'slider', label: 'Сужение кверху', min: -0.8, max: 0.9, step: 0.01, mesh: true },
    { key: 'wobble', type: 'slider', label: 'Ручная лепка', min: 0, max: 1.2, step: 0.01, mesh: true },
    { key: 'seed', type: 'button', label: '🎲 Перемешать неровности' },
  ] },
  { id: 'material', label: 'Материал', controls: [
    { key: 'material', type: 'choice', label: 'Фактура', options: Object.entries(MATERIALS).map(([v, m]) => ({ v, label: m.label })) },
    { key: 'color', type: 'color', label: 'Цвет тела', palette: PALETTE },
    { key: 'color2', type: 'color', label: 'Второй цвет градиента', palette: PALETTE, showIf: (s) => s.material === 'glow' },
    { key: 'filling', type: 'toggle', label: 'Пушистая начинка внутри', showIf: (s) => s.material === 'glass' },
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
  { id: 'scene', label: 'Поведение', controls: [
    { key: 'follow', type: 'toggle', label: 'Следить за курсором' },
    { key: 'blink', type: 'toggle', label: 'Моргать' },
    { key: 'speed', type: 'slider', label: 'Скорость анимации', min: 0.2, max: 2.5, step: 0.01 },
  ] },
];

const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

export function createUI({ state, onChange, onPreset }) {
  const tabsEl = document.getElementById('tabs');
  const ctrlEl = document.getElementById('controls');
  const refreshers = [];
  let activeTab = 'shape';
  try { activeTab = localStorage.getItem('claymates.tab') || 'shape'; } catch {}

  /* ---- tabs ---- */
  const tabBtns = {};
  const panes = {};
  for (const tab of TABS) {
    const b = h('button', 'tab', tab.label);
    b.onclick = () => select(tab.id);
    tabsEl.appendChild(b); tabBtns[tab.id] = b;
    const pane = h('div', 'pane');
    panes[tab.id] = pane; ctrlEl.appendChild(pane);
    for (const c of tab.controls) pane.appendChild(control(c));
  }
  function select(id) {
    activeTab = id;
    try { localStorage.setItem('claymates.tab', id); } catch {}
    for (const k in tabBtns) { tabBtns[k].classList.toggle('on', k === id); panes[k].hidden = k !== id; }
  }
  select(TABS.some((t) => t.id === activeTab) ? activeTab : 'shape');

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
        const row = h('div', 'slider-row');
        const inp = h('input'); inp.type = 'range'; inp.min = c.min; inp.max = c.max; inp.step = c.step;
        const val = h('span', 'val');
        inp.oninput = () => { val.textContent = (+inp.value).toFixed(2); set(c.key, +inp.value, true); };
        inp.onchange = () => set(c.key, +inp.value, false);
        inp.ondblclick = () => { /* reset handled by caller */ };
        row.append(inp, val); wrap.appendChild(row);
        refreshFn = () => {
          if (document.activeElement !== inp) inp.value = state[c.key];
          val.textContent = (+state[c.key]).toFixed(2);
          inp.style.setProperty('--p', ((state[c.key] - c.min) / (c.max - c.min)) * 100 + '%');
        };
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

  /* ---- dock: emotions + animations ---- */
  const emoRow = document.getElementById('emotions');
  for (const [k, e] of Object.entries(EMOTIONS)) {
    const b = h('button', 'dock-chip', `<b>${e.icon}</b><span>${e.label}</span>`);
    b.dataset.v = k; b.onclick = () => set('emotion', k);
    emoRow.appendChild(b);
  }
  const animRow = document.getElementById('anims');
  for (const [k, a] of Object.entries(ANIMS)) {
    const b = h('button', 'dock-chip', `<b>${a.icon}</b><span>${a.label}</span>`);
    b.dataset.v = k; b.onclick = () => set('anim', k);
    animRow.appendChild(b);
  }
  refreshers.push(() => {
    emoRow.querySelectorAll('.dock-chip').forEach((b) => b.classList.toggle('on', b.dataset.v === state.emotion));
    animRow.querySelectorAll('.dock-chip').forEach((b) => b.classList.toggle('on', b.dataset.v === state.anim));
  });

  /* ---- presets ---- */
  const presetsEl = document.getElementById('presets');
  PRESETS.forEach((p, i) => {
    const b = h('button', 'preset', `<i style="--c:${p.st.color}"></i><span>${p.name}</span>`);
    b.onclick = () => onPreset(i);
    presetsEl.appendChild(b);
  });

  function refresh() { for (const r of refreshers) r(); }
  refresh();
  return { refresh };
}
