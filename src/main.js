import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Character } from './character.js';
import { createUI } from './ui.js';
import { DEFAULTS, PRESETS, PALETTE, presetState } from './presets.js';
import { SHAPES } from './sdf.js';
import { normalizeMaterial } from './materials.js';
import { EMOTIONS, ANIMS } from './animations.js';
import './style.css';

/* ---------------- state ---------------- */
function loadFromHash() {
  try {
    if (location.hash.length > 2) {
      const json = decodeURIComponent(escape(atob(location.hash.slice(1))));
      return { ...DEFAULTS, ...JSON.parse(json) };
    }
  } catch { /* ignore broken links */ }
  return null;
}
const state = loadFromHash() || presetState(3);
state.material = normalizeMaterial(state.material);

/* ---------------- renderer & scene ---------------- */
const stage = document.getElementById('stage');
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.55;

const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
camera.position.set(0.7, 1.6, 8.2);
const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 0.78, 0);
controls.enableDamping = true;
controls.enablePan = false;
controls.minDistance = 2.6;
controls.maxDistance = 11;
controls.maxPolarAngle = Math.PI * 0.53;

const hemi = new THREE.HemisphereLight(0xffffff, 0xd6d0e6, 1.1);
scene.add(hemi);
const key = new THREE.DirectionalLight(0xffffff, 2.2);
key.position.set(2.5, 5, 3.5);
scene.add(key);
const rim = new THREE.DirectionalLight(0xdfe6ff, 1.4);
rim.position.set(-3, 3, -3);
scene.add(rim);


const hero = new Character();
scene.add(hero.root, hero.fx);

/* ---------------- rebuild pipeline ---------------- */
const MESH_KEYS = new Set(['shape', 'width', 'height', 'depth', 'taper', 'wobble', 'seed']);
const MAT_KEYS = new Set(['color', 'color2', 'accColor', 'glassColor', 'material', 'limbSame', 'limbColor', 'filling']);
const RUNTIME_KEYS = new Set(['emotion', 'anim', 'speed', 'blink', 'follow']);
const SCENE_KEYS = new Set();
const pending = { mesh: null, mat: false, parts: false, scene: false };

function onChange(k, live) {
  if (MESH_KEYS.has(k)) pending.mesh = live ? (pending.mesh === 'high' ? 'high' : 'low') : 'high';
  else if (MAT_KEYS.has(k)) { pending.mat = true; pending.parts = true; } // limbs & accessories share the body material
  else if (SCENE_KEYS.has(k)) pending.scene = true;
  else if (!RUNTIME_KEYS.has(k)) pending.parts = true;
  saveHashSoon();
}
function flush() {
  if (pending.mesh) {
    hero.buildBody(state, pending.mesh);
    pending.parts = true;
    if (pending.mesh === 'low') { clearTimeout(flush.t); flush.t = setTimeout(() => { pending.mesh = 'high'; }, 220); }
    pending.mesh = null;
  }
  if (pending.mat) { hero.applyMaterial(state); pending.mat = false; }
  if (pending.parts) { hero.buildParts(state); pending.parts = false; frameCharacter(); }
  if (pending.scene) { applyScene(); pending.scene = false; }
}
// Fixed on-screen background, rendered inside WebGL so glass / glow can refract it.
// Exports (PNG and video) always drop it and come out with a transparent background.
const BG = '#eef0f6';
const bgCanvas = document.createElement('canvas'); bgCanvas.width = bgCanvas.height = 512;
const bgTex = new THREE.CanvasTexture(bgCanvas); bgTex.colorSpace = THREE.SRGBColorSpace;
{
  const g = bgCanvas.getContext('2d');
  const gr = g.createRadialGradient(256, 200, 0, 256, 200, 380);
  gr.addColorStop(0, '#fbfbfe'); gr.addColorStop(0.55, BG); gr.addColorStop(1, '#e1e3eb');
  g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
}
scene.background = bgTex;
function applyScene() {
  hero.baseY = 0;
}
function rebuildAll() {
  hero.buildBody(state, 'high');
  hero.applyMaterial(state);
  hero.buildParts(state);
  applyScene();
  frameCharacter();
}
// keep the whole character in view (slightly above the bottom dock)
function frameCharacter() {
  const b = hero.box;
  const top = hero.baseY + hero.legH + (b.max.y - b.min.y) + (state.head !== 'none' ? 0.35 : 0);
  const ty = Math.max(0.6, top * 0.4);
  const d = ty - controls.target.y;
  controls.target.y += d; camera.position.y += d;
}

/* ---------------- UI ---------------- */
const ui = createUI({
  state,
  onChange,
  onPreset: (i) => { Object.assign(state, presetState(i)); hero.clearParticles(); rebuildAll(); ui.refresh(); saveHashSoon(); },
});

let hashTimer = 0;
function diffState() {
  const d = {};
  for (const k in DEFAULTS) if (state[k] !== DEFAULTS[k]) d[k] = state[k];
  return d;
}
function encodeState() { return btoa(unescape(encodeURIComponent(JSON.stringify(diffState())))); }
function saveHashSoon() {
  clearTimeout(hashTimer);
  hashTimer = setTimeout(() => history.replaceState(null, '', '#' + encodeState()), 400);
}

function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2200);
}

/* random character */
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const rnd = (a, b) => a + Math.random() * (b - a);
document.getElementById('btn-random').onclick = () => {
  Object.assign(state, {
    shape: pick(Object.keys(SHAPES)), width: rnd(0.85, 1.2), height: rnd(0.85, 1.2), depth: rnd(0.8, 1.15),
    taper: Math.random() < 0.6 ? 0 : rnd(-0.4, 0.5), wobble: rnd(0.1, 0.7), seed: (Math.random() * 1000) | 0,
    color: pick(PALETTE), material: pick(['matte', 'glass', 'glass', 'glow', 'plush']), color2: pick(PALETTE),
    eyes: pick(['dots', 'dots', 'googly', 'ovals', 'lines', 'pixel']), eyeSize: rnd(0.8, 1.3), eyeSpacing: rnd(0.26, 0.5), faceY: rnd(0.45, 0.66),
    arms: pick(['stubby', 'noodle', 'none']), legs: pick(['stubby', 'thin', 'none', 'stubby']),
    head: pick(['none', 'none', 'beret', 'cap', 'party', 'crown', 'sprout', 'antenna', 'bunny', 'cat', 'bow', 'halo']),
    eyewear: pick(['none', 'none', 'none', 'round', 'sun', 'geek']), neck: pick(['none', 'none', 'tie', 'bowtie', 'scarf']),
    accColor: pick(PALETTE), glassColor: pick(['#1d1d24', '#f4f4f7', '#ffc531', '#ff4757']),
    emotion: pick(Object.keys(EMOTIONS)), anim: pick(Object.keys(ANIMS)),
  });
  hero.clearParticles(); rebuildAll(); ui.refresh(); saveHashSoon();
};

/* exports */
document.getElementById('btn-png').onclick = () => {
  scene.background = null;
  renderer.render(scene, camera);
  scene.background = bgTex;
  canvas.toBlob((blob) => download(blob, 'claymate.png'), 'image/png');
  toast('PNG с прозрачным фоном сохранён');
};
function download(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
let recording = false;
document.getElementById('btn-video').onclick = () => {
  if (recording || !window.MediaRecorder) return;
  recording = true;
  const btn = document.getElementById('btn-video');
  btn.classList.add('rec');
  // WebM VP9/VP8 keep the alpha channel; MP4 cannot, so it is not offered
  const type = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find((t) => MediaRecorder.isTypeSupported(t));
  if (!type) { recording = false; btn.classList.remove('rec'); toast('Браузер не умеет записывать WebM'); return; }
  scene.background = null; // transparent video
  const rec = new MediaRecorder(canvas.captureStream(60), { mimeType: type, videoBitsPerSecond: 10e6 });
  const chunks = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  rec.onstop = () => {
    scene.background = bgTex;
    recording = false; btn.classList.remove('rec');
    download(new Blob(chunks, { type }), 'claymate.webm');
    toast('Видео с прозрачным фоном готово');
  };
  rec.start();
  toast('Записываю 4 секунды с прозрачным фоном…');
  setTimeout(() => rec.stop(), 4000);
};
document.getElementById('btn-link').onclick = async () => {
  history.replaceState(null, '', '#' + encodeState());
  try { await navigator.clipboard.writeText(location.href); toast('Ссылка на персонажа скопирована'); }
  catch { toast('Ссылка в адресной строке'); }
};
document.getElementById('btn-panel').onclick = () => document.body.classList.toggle('panel-open');

/* ---------------- pointer ---------------- */
const pointer = { x: 0, y: 0, active: false, last: 0 };
window.addEventListener('pointermove', (e) => {
  const r = canvas.getBoundingClientRect();
  // look target relative to the character's face position on screen
  const face = new THREE.Vector3(0, 1.2, 0).project(camera);
  const fx = r.left + (face.x * 0.5 + 0.5) * r.width;
  const fy = r.top + (-face.y * 0.5 + 0.5) * r.height;
  pointer.x = Math.max(-1, Math.min(1, (e.clientX - fx) / (r.width * 0.45)));
  pointer.y = Math.max(-1, Math.min(1, -(e.clientY - fy) / (r.height * 0.45)));
  pointer.active = true; pointer.last = performance.now();
});
document.addEventListener('pointerleave', () => { pointer.active = false; });

/* ---------------- loop ---------------- */
function resize() {
  const w = stage.clientWidth, h = stage.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(stage);

rebuildAll();
resize();

const clock = new THREE.Clock();
function frame() {
  const dt = clock.getDelta();
  flush();
  if (performance.now() - pointer.last > 4000) pointer.active = false;
  hero.update(dt, state, pointer);
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
frame();

window.__claymates = { state, hero, renderer, scene, camera };
