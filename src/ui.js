import { SHAPES } from './sdf.js';
import { MATERIALS } from './materials.js';
import { EMOTIONS, ANIMS } from './animations.js';
import { PALETTE, PRESETS } from './presets.js';
import { createJellySlider } from './jellyslider.js';
import { createMorphPill } from './morphpill.js';

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

// Emotion icons, drawn in the same flat style as the shape and eye icons:
// an accent-filled face with white features.
const W = 'fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"';
const DOT = (x, y, r = 1.9) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" stroke="none"/>`;
const FACE_BASE = '<circle cx="20" cy="20" r="15"/>';
const HEART = (x, y) => `<path d="M${x} ${y + 2.6}c-2.6-1.7-3.6-3-3.2-4.3.4-1.3 2.1-1.5 3.2-.2 1.1-1.3 2.8-1.1 3.2.2.4 1.3-.6 2.6-3.2 4.3Z" fill="#fff" stroke="none"/>`;
const FACES = {
  neutral:   DOT(14.5, 17.5) + DOT(25.5, 17.5) + `<path ${W} d="M15 25.5h10"/>`,
  happy:     DOT(14.5, 17.5) + DOT(25.5, 17.5) + `<path ${W} d="M14.5 23.5q5.5 5 11 0"/>`,
  joy:       `<path ${W} d="M12 18.5q2.5-3.5 5 0M23 18.5q2.5-3.5 5 0"/><path d="M13.5 22.5h13q-.6 6.5-6.5 6.5t-6.5-6.5Z" fill="#fff" stroke="none"/>`,
  love:      HEART(14.5, 15.5) + HEART(25.5, 15.5) + `<path ${W} d="M15 24q5 4.5 10 0"/>`,
  silly:     `<path ${W} d="M12 18q2.5-3 5 0"/>` + DOT(25.5, 17.5) + `<path ${W} d="M14 23.5q6 4.5 12 0"/><path d="M19 25.5h5v2.5a2.5 2.5 0 0 1-5 0Z" fill="#fff" stroke="none"/>`,
  smug:      `<path ${W} d="M12.5 17.5h5M22.5 17.5h5"/><path ${W} d="M15 25.5q6 1.5 10.5-3"/>`,
  surprised: DOT(14.5, 17, 2.3) + DOT(25.5, 17, 2.3) + `<path ${W} d="M12.5 12.5l4-1.2M27.5 12.5l-4-1.2"/><ellipse cx="20" cy="26" rx="2.8" ry="3.4" fill="#fff" stroke="none"/>`,
  sad:       DOT(14.5, 18) + DOT(25.5, 18) + `<path ${W} d="M12.5 13.5l4 1.5M27.5 13.5l-4 1.5"/><path ${W} d="M15 27q5-4.5 10 0"/><path d="M28.6 21.5c1 1.6 1.6 2.5 1.6 3.2a1.6 1.6 0 0 1-3.2 0c0-.7.6-1.6 1.6-3.2Z" fill="#fff" stroke="none"/>`,
  angry:     DOT(15, 19) + DOT(25, 19) + `<path ${W} d="M12 14l5.5 2.5M28 14l-5.5 2.5"/><path ${W} d="M15.5 26.5q4.5-3 9 0"/>`,
  sleepy:    `<path ${W} d="M12 18q2.5 3 5 0M23 18q2.5 3 5 0"/><circle cx="20" cy="26" r="1.9" fill="#fff" stroke="none"/>`,
  dizzy:     `<path ${W} d="M12.5 15.5l4 4m0-4-4 4M23.5 15.5l4 4m0-4-4 4"/><path ${W} d="M13.5 26q1.6-2 3.2 0t3.3 0 3.3 0 3.2 0"/>`,
};

// Animation icons, same flat style: accent fills and accent strokes (L = line attributes).
const L = 'fill="none" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"';
const BLOB = (x, y, w = 12, h = 16) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${w / 2}"/>`;
const ANIM_ICONS = {
  idle:   BLOB(14, 12, 12, 18) + `<path ${L} d="M9 17q-2 4 0 8M31 17q2 4 0 8"/>`,
  bounce: BLOB(14, 5, 12, 15) + `<path ${L} d="M17 24v3M23 24v3M10 34h20"/>`,
  wave:   BLOB(9, 15, 12, 18) + `<path ${L} d="M19 19l7-8"/><circle cx="27" cy="9.5" r="3"/><path ${L} d="M31 4.5q2.5 2 1.5 5M33.5 11q1.5 2.5-.5 4.5"/>`,
  dance:  `<path ${L} d="M16 29V11l13-3v17"/><ellipse cx="13" cy="29" rx="4" ry="3.2"/><ellipse cx="26" cy="25" rx="4" ry="3.2"/>`,
  walk:   `<ellipse cx="14" cy="24" rx="4.5" ry="6.5" transform="rotate(-12 14 24)"/><ellipse cx="26" cy="15" rx="4.5" ry="6.5" transform="rotate(12 26 15)"/><circle cx="12" cy="13.5" r="1.6"/><circle cx="29" cy="6" r="1.6"/>`,
  spin:   `<path ${L} d="M30 22a10 10 0 1 1-3.2-9.3"/><path d="M24 9.5l6.5 1.2-1 6.4Z"/>`,
  nod:    `<circle cx="20" cy="20" r="8"/><path ${L} d="M20 4.5v4M17.5 7l2.5-2.5L22.5 7M20 35.5v-4M17.5 33l2.5 2.5 2.5-2.5"/>`,
  shake:  `<circle cx="20" cy="20" r="8"/><path ${L} d="M4.5 20h4M7 17.5 4.5 20 7 22.5M35.5 20h-4M33 17.5l2.5 2.5-2.5 2.5"/>`,
  look:   `<circle cx="13" cy="20" r="7.5" fill="#fff" stroke-width="2.4"/><circle cx="27" cy="20" r="7.5" fill="#fff" stroke-width="2.4"/><circle cx="16.5" cy="19" r="3.4" stroke="none"/><circle cx="30.5" cy="19" r="3.4" stroke="none"/>`,
  talk:   `<path d="M9 9h22a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H19l-6.5 5v-5H9a4 4 0 0 1-4-4V13a4 4 0 0 1 4-4Z"/><circle cx="14" cy="18" r="1.8" fill="#fff" stroke="none"/><circle cx="20" cy="18" r="1.8" fill="#fff" stroke="none"/><circle cx="26" cy="18" r="1.8" fill="#fff" stroke="none"/>`,
  cheer:  BLOB(14, 15, 12, 18) + `<path ${L} d="M15.5 19L9 9.5M24.5 19L31 9.5"/><circle cx="8.5" cy="8.5" r="2.4"/><circle cx="31.5" cy="8.5" r="2.4"/>`,
  jelly:  `<path d="M9 31c0-9 3-17 11-17s11 8 11 17c-2.5 1.5-4.5-1-7.3.5-2.7 1.5-5.4-1.4-7.6 0-2.4 1.5-4.6-1.2-7.1-.5Z"/><path ${L} d="M13 8.5q3.5-3 7 0t7 0"/>`,
  shy:    `<circle cx="20" cy="20" r="12"/><path fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" d="M13.5 18q2.2 2.4 4.4 0M22.1 18q2.2 2.4 4.4 0M17.5 25q2.5 1.5 5 0"/><ellipse cx="12.5" cy="23" rx="2.4" ry="1.4" fill="#fff" opacity=".55" stroke="none"/><ellipse cx="27.5" cy="23" rx="2.4" ry="1.4" fill="#fff" opacity=".55" stroke="none"/>`,
  float:  `<ellipse cx="20" cy="15" rx="8.5" ry="10"/><path d="M18 24.5h4L20 27Z"/><path ${L} d="M20 27q-3 3 0 5.5t0 5"/>`,
  sleep:  `<path ${L} d="M8 13h9l-9 11h9M22 9h7l-7 8.5h7M27.5 24h5l-5 6h5"/>`,
};

// Icons for the remaining option groups (same flat accent style; L = line attributes).
const BODY = '<rect x="13" y="9" width="14" height="20" rx="7"/>';
const OPT_ICONS = {
  // brows
  browAuto: '<circle cx="14" cy="23" r="3.2"/><circle cx="26" cy="23" r="3.2"/>' + `<path ${L} stroke-width="3.2" d="M8.5 15.5q4-4.5 9-1.5M31.5 12.5l-8.5 4"/><path d="M31.5 26.5l1.2 2.8 2.8 1.2-2.8 1.2-1.2 2.8-1.2-2.8-2.8-1.2 2.8-1.2Z"/>`,
  browOn:   '<circle cx="14" cy="24" r="3.2"/><circle cx="26" cy="24" r="3.2"/>' + `<path ${L} stroke-width="3.2" d="M9 15.5h9.5M21.5 15.5h9.5"/>`,
  // arms
  armsStubby: BODY + '<ellipse cx="9.5" cy="21" rx="3.6" ry="5" transform="rotate(20 9.5 21)"/><ellipse cx="30.5" cy="21" rx="3.6" ry="5" transform="rotate(-20 30.5 21)"/>',
  armsNoodle: BODY + `<path ${L} d="M13 17q-5 5-7 11M27 17q5 5 7 11"/><circle cx="6" cy="29" r="2.2"/><circle cx="34" cy="29" r="2.2"/>`,
  // legs
  legsStubby: '<rect x="12" y="5" width="16" height="20" rx="8"/><rect x="13.5" y="22" width="5" height="9" rx="2.5"/><rect x="21.5" y="22" width="5" height="9" rx="2.5"/><ellipse cx="15.5" cy="32.5" rx="4" ry="2.5"/><ellipse cx="24.5" cy="32.5" rx="4" ry="2.5"/>',
  legsThin:   '<rect x="12" y="4" width="16" height="18" rx="8"/>' + `<path ${L} d="M16.5 21v11M23.5 21v11"/><ellipse cx="15.5" cy="33" rx="3.4" ry="2"/><ellipse cx="24.5" cy="33" rx="3.4" ry="2"/>`,
  // head
  beret:   '<ellipse cx="20" cy="22" rx="14" ry="6.5"/><circle cx="21" cy="14" r="2.4"/>',
  cap:     '<path d="M8 25a12 12 0 0 1 24 0Z"/><path d="M8 24.5h26a3 3 0 0 1-3 3H8Z"/><circle cx="20" cy="12" r="1.8"/>',
  party:   '<path d="M20 7l9 23H11Z"/><circle cx="20" cy="6.5" r="3"/>',
  crown:   '<path d="M8 28l-1-15 7 6 6-9 6 9 7-6-1 15Z"/><rect x="8" y="29" width="24" height="3.5" rx="1.5"/>',
  halo:    `<ellipse cx="20" cy="20" rx="13" ry="5.5" ${L} stroke-width="3.2"/>`,
  bow:     '<path d="M19 20L8 13.5v13Z M21 20l11-6.5v13Z"/><circle cx="20" cy="20" r="3.4"/>',
  sprout:  `<path ${L} d="M20 33V18"/><path d="M20 19c-1-6-6-9-12-8 0 6 5 9 12 8Z"/><path d="M20 15c1-5 5-8 11-7 0 5-4 8-11 7Z"/>`,
  antenna: `<path ${L} d="M20 33V13"/><circle cx="20" cy="9.5" r="4.5"/>`,
  bunny:   '<rect x="11" y="5" width="7" height="27" rx="3.5" transform="rotate(-10 14.5 18.5)"/><rect x="22" y="5" width="7" height="27" rx="3.5" transform="rotate(10 25.5 18.5)"/>',
  cat:     '<path d="M7 31l3.5-20L20 27Z"/><path d="M33 31l-3.5-20L20 27Z"/>',
  // eyewear
  round:   `<circle cx="12.5" cy="20" r="6.5" ${L}/><circle cx="27.5" cy="20" r="6.5" ${L}/><path ${L} d="M19 19q1-1.5 2 0M6 19l-2.5-2M34 19l2.5-2"/>`,
  geek:    `<rect x="5" y="14" width="13" height="11" rx="3" ${L}/><rect x="22" y="14" width="13" height="11" rx="3" ${L}/><path ${L} d="M18 18.5h4"/>`,
  sun:     '<circle cx="12.5" cy="20" r="7"/><circle cx="27.5" cy="20" r="7"/>' + `<path ${L} d="M19 18.5q1-1.5 2 0"/>`,
  // neck
  tie:     '<path d="M16.5 7h7l-1.5 5h-4Z"/><path d="M18 13h4l3.5 15-5.5 5-5.5-5Z"/>',
  bowtie:  '<path d="M18 20L6 13v14Z M22 20l12-7v14Z"/><rect x="17" y="16.5" width="6" height="7" rx="2"/>',
  scarf:   '<path d="M7 13q13 7 26 0v6q-13 7-26 0Z"/><path d="M23 21l5 .5-1 12.5-5.5-1.5Z"/>',
};

// Material icons: a ball rendered the way each material looks.
const MATERIAL_ICONS = {
  matte: '<circle cx="20" cy="20" r="13"/>',
  glass: '<circle cx="20" cy="20" r="13"/><path fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" d="M12.5 17a8.5 8.5 0 0 1 6-6"/><circle cx="25.5" cy="13.5" r="1.7" fill="#fff" stroke="none"/><path fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="2" stroke-linecap="round" d="M27 27.5a8.5 8.5 0 0 1-4 2.2"/>',
  glow:  '<circle cx="20" cy="20" r="16.5" opacity=".18" stroke="none"/><circle cx="20" cy="20" r="13.5" opacity=".3" stroke="none"/><circle cx="20" cy="20" r="10"/><circle cx="20" cy="20" r="5" fill="#fff" opacity=".6" stroke="none"/>',
  plush: '<path stroke-linejoin="round" stroke-width="1.6" d="M33.2 20.0 L31.1 22.5 L31.9 25.7 L28.9 27.1 L28.2 30.3 L24.9 30.3 L22.9 32.9 L20.0 31.4 L17.1 32.9 L15.1 30.3 L11.8 30.3 L11.1 27.1 L8.1 25.7 L8.9 22.5 L6.8 20.0 L8.9 17.5 L8.1 14.3 L11.1 12.9 L11.8 9.7 L15.1 9.7 L17.1 7.1 L20.0 8.6 L22.9 7.1 L24.9 9.7 L28.2 9.7 L28.9 12.9 L31.9 14.3 L31.1 17.5Z"/>',
};

const OFF_ICON = '<circle cx="20" cy="20" r="11" fill="none" stroke-width="3"/><path d="M12.5 12.5l15 15" fill="none" stroke-width="3" stroke-linecap="round"/>';

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
    { key: 'emotion', type: 'iconGrid', options: Object.entries(EMOTIONS).map(([v, e]) => ({ v, label: e.label, icon: FACE_BASE + (FACES[v] || '') })) },
  ] },
  { id: 'material', label: 'Материал', controls: [
    { key: 'material', type: 'iconGrid', options: Object.entries(MATERIALS).map(([v, m]) => ({ v, label: m.label, icon: MATERIAL_ICONS[v] || '' })) },
    { key: 'color', type: 'color', label: 'Цвет тела', palette: PALETTE },
    { key: 'color2', type: 'color', label: 'Второй цвет градиента', palette: PALETTE, showIf: (s) => s.material === 'glow' },
    { key: 'limbSame', type: 'toggle', label: 'Руки и ноги — цветом тела' },
    { key: 'limbColor', type: 'color', label: 'Цвет рук и ног', palette: PALETTE, showIf: (s) => !s.limbSame },
  ] },
  { id: 'face', label: 'Лицо', controls: [
    { key: 'eyes', type: 'iconGrid', label: 'Глаза', options: [
      { v: 'none', label: 'Нет', icon: OFF_ICON },
      { v: 'dots', label: 'Точки', icon: '<ellipse cx="13.5" cy="20" rx="4.6" ry="5.6"/><ellipse cx="26.5" cy="20" rx="4.6" ry="5.6"/>' },
      { v: 'googly', label: 'Глазастые', icon: '<circle cx="12.5" cy="20" r="8.5" fill="#fff" stroke-width="2.4"/><circle cx="27.5" cy="20" r="8.5" fill="#fff" stroke-width="2.4"/><circle cx="14.2" cy="21.2" r="4" stroke="none"/><circle cx="29.2" cy="21.2" r="4" stroke="none"/>' },
      { v: 'ovals', label: 'Овалы', icon: '<ellipse cx="13.5" cy="20" rx="4.8" ry="8.5"/><ellipse cx="26.5" cy="20" rx="4.8" ry="8.5"/>' },
      { v: 'lines', label: 'Палочки', icon: '<rect x="11" y="10" width="5.5" height="20" rx="2.75"/><rect x="23.5" y="10" width="5.5" height="20" rx="2.75"/>' },
      { v: 'pixel', label: 'Пиксели', icon: '<rect x="8.5" y="9.5" width="9" height="21" rx="2.5"/><rect x="22.5" y="9.5" width="9" height="21" rx="2.5"/>' }] },
    { key: 'eyeSize', type: 'slider', label: 'Размер глаз', min: 0.5, max: 1.8, step: 0.01 },
    { key: 'eyeSpacing', type: 'slider', label: 'Расстояние между глазами', min: 0.12, max: 0.8, step: 0.01 },
    { key: 'faceY', type: 'slider', label: 'Высота лица', min: 0.2, max: 0.85, step: 0.01 },
    { key: 'mouth', type: 'toggle', label: 'Рот' },
    { key: 'mouthSize', type: 'slider', label: 'Размер рта', min: 0.5, max: 2, step: 0.01, showIf: (s) => s.mouth },
    { key: 'mouthGap', type: 'slider', label: 'Рот ниже / выше', min: 0, max: 1.2, step: 0.01, showIf: (s) => s.mouth },
    { key: 'brows', type: 'iconGrid', label: 'Брови', options: [{ v: 'off', label: 'Нет', icon: OFF_ICON }, { v: 'auto', label: 'По эмоции', icon: OPT_ICONS.browAuto }, { v: 'on', label: 'Всегда', icon: OPT_ICONS.browOn }] },
    { key: 'blush', type: 'toggle', label: 'Румянец' },
    { key: 'shine', type: 'toggle', label: 'Блики в глазах' },
  ] },
  { id: 'body', label: 'Руки/ноги', controls: [
    { key: 'arms', type: 'iconGrid', label: 'Руки', options: [{ v: 'none', label: 'Нет', icon: OFF_ICON }, { v: 'stubby', label: 'Пухляши', icon: OPT_ICONS.armsStubby }, { v: 'noodle', label: 'Лапшички', icon: OPT_ICONS.armsNoodle }] },
    { key: 'armLength', type: 'slider', label: 'Длина рук', min: 0.5, max: 2, step: 0.01, showIf: (s) => s.arms !== 'none' },
    { key: 'armY', type: 'slider', label: 'Высота плеч', min: 0.15, max: 0.75, step: 0.01, showIf: (s) => s.arms !== 'none' },
    { key: 'legs', type: 'iconGrid', label: 'Ноги', options: [{ v: 'none', label: 'Нет', icon: OFF_ICON }, { v: 'stubby', label: 'Пухлые', icon: OPT_ICONS.legsStubby }, { v: 'thin', label: 'Тонкие', icon: OPT_ICONS.legsThin }] },
    { key: 'legLength', type: 'slider', label: 'Длина ног', min: 0.3, max: 2.2, step: 0.01, showIf: (s) => s.legs !== 'none' },
    { key: 'limbThick', type: 'slider', label: 'Толщина конечностей', min: 0.6, max: 1.6, step: 0.01, showIf: (s) => s.legs !== 'none' || s.arms !== 'none' },
  ] },
  { id: 'acc', label: 'Аксессуары', controls: [
    { key: 'head', type: 'iconGrid', label: 'На голове', options: [
      { v: 'none', label: 'Ничего', icon: OFF_ICON }, { v: 'beret', label: 'Берет', icon: OPT_ICONS.beret }, { v: 'cap', label: 'Кепка', icon: OPT_ICONS.cap },
      { v: 'party', label: 'Колпак', icon: OPT_ICONS.party }, { v: 'crown', label: 'Корона', icon: OPT_ICONS.crown }, { v: 'halo', label: 'Нимб', icon: OPT_ICONS.halo },
      { v: 'bow', label: 'Бантик', icon: OPT_ICONS.bow }, { v: 'sprout', label: 'Росток', icon: OPT_ICONS.sprout }, { v: 'antenna', label: 'Антенна', icon: OPT_ICONS.antenna },
      { v: 'bunny', label: 'Ушки-зайки', icon: OPT_ICONS.bunny }, { v: 'cat', label: 'Ушки-кошки', icon: OPT_ICONS.cat }] },
    { key: 'eyewear', type: 'iconGrid', label: 'Очки', options: [{ v: 'none', label: 'Нет', icon: OFF_ICON }, { v: 'round', label: 'Круглые', icon: OPT_ICONS.round }, { v: 'geek', label: 'Ботаник', icon: OPT_ICONS.geek }, { v: 'sun', label: 'Солнечные', icon: OPT_ICONS.sun }] },
    { key: 'neck', type: 'iconGrid', label: 'На шее', options: [{ v: 'none', label: 'Ничего', icon: OFF_ICON }, { v: 'tie', label: 'Галстук', icon: OPT_ICONS.tie }, { v: 'bowtie', label: 'Бабочка', icon: OPT_ICONS.bowtie }, { v: 'scarf', label: 'Шарф', icon: OPT_ICONS.scarf }] },
    { key: 'accColor', type: 'color', label: 'Цвет шапки / галстука', palette: PALETTE },
    { key: 'glassColor', type: 'color', label: 'Цвет оправы', palette: PALETTE, showIf: (s) => s.eyewear !== 'none' },
    { key: 'accSize', type: 'slider', label: 'Размер аксессуаров', min: 0.5, max: 1.8, step: 0.01 },
  ] },
];

const ANIM_TABS = [
  { id: 'motion', label: 'Анимация', controls: [
    { key: 'anim', type: 'iconGrid', options: Object.entries(ANIMS).map(([v, a]) => ({ v, label: a.label, icon: ANIM_ICONS[v] || '' })) },
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
  // morphing pill under the active tab (same springs as the stage tab bar)
  const tabPill = createMorphPill(tabsEl, 'morph-pill tab-pill');
  let curTab = null;
  const placePill = (snap) => tabPill.moveTo(tabBtns[curTab], snap);

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
        const pill = createMorphPill(grid, 'morph-pill morph-pill--outline');
        refreshFn = () => grid.querySelectorAll('.shape-btn').forEach((b) => {
          const on = b.dataset.v === state.shape; b.classList.toggle('on', on); if (on) pill.moveTo(b);
        });
        break;
      }
      case 'iconGrid': {
        // same tiles as the shape grid: icon + caption
        const grid = h('div', 'shape-grid');
        for (const o of c.options) {
          const off = o.v === 'none' || o.v === 'off';
          // the "off" option (Нет / Ничего) is a grey tile so it stands apart from real choices
          const b = h('button', 'shape-btn' + (off ? ' tile-off' : ''), `<svg viewBox="0 0 40 40">${o.icon}</svg><span>${o.label}</span>`);
          b.dataset.v = o.v; b.onclick = () => set(c.key, o.v);
          grid.appendChild(b);
        }
        wrap.appendChild(grid);
        const pill = createMorphPill(grid, 'morph-pill morph-pill--outline');
        refreshFn = () => grid.querySelectorAll('.shape-btn').forEach((b) => {
          const on = b.dataset.v === state[c.key]; b.classList.toggle('on', on); if (on) pill.moveTo(b);
        });
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
