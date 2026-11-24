import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Character } from './character.js';
import { createUI, STAGES } from './ui.js';
import { createStageBar } from './stagebar.js';
import { createActionMenu } from './exportmenu.js';
import { createEmbedModal } from './embedmodal.js';
import { createHalo } from './halo.js';
import { createAbout } from './about.js';
import { track, trackSetting, characterSummary } from './analytics.js';
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
const state = loadFromHash() || presetState(0); // opens with the first preset (Кубик)
// embed mode (?embed): only the character, transparent background — used by the <iframe> code
const EMBED = new URLSearchParams(location.search).has('embed');
if (EMBED) document.body.classList.add('embed');
// the bare embed view should not show up in search results
if (EMBED) { const m = document.createElement('meta'); m.name = 'robots'; m.content = 'noindex'; document.head.appendChild(m); document.querySelector('meta[name="robots"][content^="index"]')?.remove(); }
state.material = normalizeMaterial(state.material);

/* ---------------- renderer & scene ---------------- */
const stage = document.getElementById('stage');
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: false, powerPreference: 'high-performance' });
// adaptive resolution: start at the screen's density (max 2) and step down if frames get slow
const MAX_DPR = Math.min(window.devicePixelRatio || 1, 2);
let dpr = MAX_DPR;
renderer.setPixelRatio(dpr);
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
if (EMBED) controls.enableZoom = false; // the wheel must keep scrolling the host page
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

// soft screen-space halo for the glow material (same on screen, in PNG and in video)
const halo = createHalo(renderer);
scene.add(halo.mesh);
function draw() {
  halo.prepare(scene, camera, { on: state.material === 'glow', c1: state.color, c2: state.color2, hide: [hero.fx] });
  renderer.render(scene, camera);
}

/* ---------------- rebuild pipeline ---------------- */
const MESH_KEYS = new Set(['shape', 'width', 'height', 'depth', 'taper', 'wobble', 'seed']);
const MAT_KEYS = new Set(['color', 'color2', 'accColor', 'glassColor', 'material', 'limbSame', 'limbColor']);
const RUNTIME_KEYS = new Set(['emotion', 'anim', 'speed', 'blink', 'follow']);
const SCENE_KEYS = new Set();
const pending = { mesh: null, mat: false, parts: false, scene: false };

function onChange(k, live) {
  if (MESH_KEYS.has(k)) pending.mesh = live ? (pending.mesh === 'high' ? 'high' : 'low') : 'high';
  else if (MAT_KEYS.has(k)) { pending.mat = true; pending.parts = true; } // limbs & accessories share the body material
  else if (SCENE_KEYS.has(k)) pending.scene = true;
  else if (!RUNTIME_KEYS.has(k)) pending.parts = true;
  saveHashSoon();
  trackSetting(k, state[k]);
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
const SITE_BG = EMBED ? null : bgTex; // embeds stay transparent
scene.background = SITE_BG;
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
  if (EMBED) {
    // small square frame: fit the whole character (headwear and arms included) with a margin
    const H = hero.baseY + hero.legH + (b.max.y - b.min.y) + (state.head !== 'none' ? 0.45 * state.accSize : 0);
    const W = (b.max.x - b.min.x) + (state.arms !== 'none' ? 0.7 * state.armLength : 0.2);
    const half = Math.max(H, W / Math.max(camera.aspect, 0.01)) * 0.6;
    const d = half / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const dir = camera.position.clone().sub(controls.target).normalize();
    controls.target.set(0, H / 2, 0);
    camera.position.copy(controls.target).addScaledVector(dir, d);
    return;
  }
  const top = hero.baseY + hero.legH + (b.max.y - b.min.y) + (state.head !== 'none' ? 0.35 : 0);
  const ty = Math.max(0.6, top * 0.4);
  const d = ty - controls.target.y;
  controls.target.y += d; camera.position.y += d;
}

/* ---------------- UI ---------------- */
const ui = createUI({
  state,
  onChange,
  onRandom: () => { randomize(); track('random_character', characterSummary(state)); },
  onTab: (tab) => track('tab_open', { tab }),
  onPreset: (i) => { track('preset_select', { preset: PRESETS[i].name }); Object.assign(state, presetState(i)); hero.clearParticles(); rebuildAll(); ui.refresh(); saveHashSoon(); },
});

/* ---------------- stage bar: Дизайн / Анимация ---------------- */
const stageItems = STAGES.map((st, i) => ({ id: st.id, title: st.title, key: String(i + 1) }));
const stageBar = createStageBar(document.getElementById('stagebar'), stageItems, {
  initial: ui.stage,
  onSelect: (id) => { ui.setStage(id); track('stage_open', { stage: id, via: 'click' }); },
  action: { id: 'download', title: 'Download', onClick: () => track('download_menu_open') }, // opens the action menu below
});
window.addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const t = e.target;
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
  const item = stageItems.find((it) => it.key === e.key);
  if (!item || item.id === ui.stage) return;
  ui.setStage(item.id);
  stageBar.select(item.id);
  track('stage_open', { stage: item.id, via: 'keyboard' });
});

// pasting another character link into the address bar switches to it without a reload
// (our own history.replaceState does not fire hashchange)
window.addEventListener('hashchange', () => {
  const next = loadFromHash();
  if (!next) return;
  Object.assign(state, next);
  state.material = normalizeMaterial(state.material);
  hero.clearParticles(); rebuildAll(); ui.refresh();
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
function randomize() {
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
}

/* exports: download icon in the stage tab bar + spring menu */
const ICON = {
  // photo: frame with a sun and hills
  png: '<rect x="3" y="4.5" width="18" height="15" rx="3"/><circle cx="8.5" cy="9.5" r="1.6"/><path d="m3.5 17 5-5 3.5 3.5 2.5-2.5 6 5.5"/>',
  video: '<rect x="3" y="6" width="13" height="12" rx="3"/><path d="m16 10 5-3v10l-5-3"/>',
  embed: '<path d="m8.5 8-4.5 4 4.5 4M15.5 8l4.5 4-4.5 4M13.5 5.5l-3 13"/>',
  link: '<path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1"/><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1"/>',
};
// the download icon in the stage tab bar opens this menu
const exportMenu = createActionMenu(document.getElementById('export-menu'), [
  { id: 'png', label: 'Download PNG', icon: ICON.png },
  { id: 'webm', label: 'Download WebM video', icon: ICON.video },
  { id: 'mp4', label: 'Download MP4 video', icon: ICON.video },
  { id: 'link', label: 'Copy link', icon: ICON.link },
  { id: 'embed', label: 'Export code', icon: ICON.embed, soon: true }, // enabled once the site is published
], { trigger: stageBar.actionEl, up: true, onSoon: (id) => track('soon_click', { item: id }), onRun: (id) => ({ png: exportPNG, webm: () => exportVideo('webm'), mp4: () => exportVideo('mp4'), link: copyLink, embed: () => embedModal.open() })[id]() });
createAbout(document.getElementById('about'));

const embedModal = createEmbedModal({
  getUrl: () => `${location.origin}${location.pathname}?embed#${encodeState()}`,
  getTitle: () => 'ClayMates animated character',
  toast,
});

// Exports are square and rendered at a fixed, doubled resolution (independent of the window):
// the drawing buffer is switched to the export size for one frame, copied out, then restored.
const PNG_SIZE = 2048, VIDEO_SIZE = 1440;
function renderSquare(size, ctx, transparent) {
  const savedDpr = renderer.getPixelRatio();
  renderer.setPixelRatio(1);
  renderer.setSize(size, size, false);
  camera.aspect = 1;
  camera.fov = 32;                       // the site's base field of view: same character size as on screen
  camera.clearViewOffset();              // centred, no shift for the settings panel
  camera.updateProjectionMatrix();
  scene.background = transparent ? null : SITE_BG;
  draw();
  ctx.clearRect(0, 0, size, size);
  ctx.drawImage(canvas, 0, 0, size, size);
  // back to the on-screen view
  scene.background = SITE_BG;
  renderer.setPixelRatio(savedDpr);
  resize();
  draw();
}
function squareCanvas(size) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return [c, c.getContext('2d')];
}
function exportPNG() {
  track('export_png', characterSummary(state));
  const [out, ctx] = squareCanvas(PNG_SIZE);
  renderSquare(PNG_SIZE, ctx, true);
  out.toBlob((blob) => download(blob, 'claymate.png'), 'image/png');
  toast(`PNG ${PNG_SIZE}×${PNG_SIZE} with transparent background saved`);
}
function download(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
let recording = false;
// Seamless loop export. The clip is not a live recording: the character is switched to a
// deterministic loop mode, warmed up over whole loops, then rendered frame by frame at a fixed
// step and handed to the encoder one frame at a time. The clip covers whole animation
// periods, so its last frame runs straight into its first.
let paused = false;
const LOOP_FPS = 30, MIN_CLIP = 2.5;
// WebM (VP9/VP8) keeps the alpha channel: transparent background.
// MP4 (H.264) has no alpha, so it is recorded on the site's background — plays everywhere.
const VIDEO_TYPES = {
  webm: ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'],
  mp4: ['video/mp4;codecs=avc1.640028', 'video/mp4;codecs=avc1.42E01E', 'video/mp4;codecs=avc1', 'video/mp4'],
};
async function exportVideo(format = 'webm') {
  if (recording) return;
  const type = window.MediaRecorder && VIDEO_TYPES[format].find((t) => MediaRecorder.isTypeSupported(t));
  if (!type) {
    track('export_video_unsupported', { format });
    toast(format === 'mp4' ? 'This browser can’t record MP4. Open the site in Chrome, Edge or Safari' : 'This browser can’t record WebM. Open the site in Chrome, Edge or Firefox');
    return;
  }
  const transparent = format === 'webm';
  track('export_video', { format, ...characterSummary(state) });
  recording = true;
  exportMenu.setBusy(true);

  const P = (ANIMS[state.anim] || ANIMS.idle).period;            // loop length, animation seconds
  const cycles = Math.max(1, Math.ceil((MIN_CLIP * state.speed) / P)); // whole loops, at least MIN_CLIP long
  const D = P * cycles;                                             // clip, animation seconds
  const real = D / state.speed;                                     // clip, video seconds
  const frames = Math.max(2, Math.round(real * LOOP_FPS));
  const stepReal = real / frames, stepAnim = D / frames;
  const noPointer = { x: 0, y: 0, active: false };

  paused = true;
  hero.beginLoop(state, D);
  // warm-up over whole clips so springy parts (ears, antennas) settle into the loop
  const warm = D * Math.max(1, Math.ceil(3 / D));
  // (stops one step short, so the first captured frame is the next step, not a repeat:
  // a repeated moment would read as zero velocity to the springs and kink the seam)
  hero.time = 0;
  for (let i = 0, n = Math.round(warm / stepAnim) - 1; i < n; i++) hero.update(stepReal, state, noPointer);
  hero.time = warm - stepAnim; // trims float drift; the first captured frame lands on the loop start

  // Each video frame is rendered square at VIDEO_SIZE into a hidden canvas, and then the
  // normal view is drawn again, so the screen never jumps during export.
  const [out, octx] = squareCanvas(VIDEO_SIZE);
  const renderFrame = () => renderSquare(VIDEO_SIZE, octx, transparent);
  const stream = out.captureStream(0);
  const track = stream.getVideoTracks()[0];
  const rec = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 24e6 });
  const chunks = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const stopped = new Promise((r) => { rec.onstop = r; });
  rec.start();
  const t0 = performance.now();
  try {
    for (let k = 0; k < frames; k++) {
      hero.update(stepReal, state, noPointer);
      controls.update();
      renderFrame();
      track.requestFrame();
      if (k % 10 === 0) toast(`Rendering loop… ${Math.round((k / frames) * 100)}%`);
      // frames go out at video speed so the encoder timestamps match the clip
      const wait = t0 + (k + 1) * stepReal * 1000 - performance.now();
      await new Promise((r) => setTimeout(r, Math.max(0, wait)));
    }
  } finally {
    rec.stop();
    await stopped;
    track.stop();
    hero.endLoop();
    scene.background = SITE_BG;
    applyViewShift();
    paused = false;
    recording = false;
    exportMenu.setBusy(false);
  }
  download(new Blob(chunks, { type: type.split(';')[0] }), `claymate-${state.anim}-loop.${format}`);
  toast(`${real.toFixed(1)} s loop ready${transparent ? ', transparent background' : ''}`);
}
async function copyLink() {
  history.replaceState(null, '', '#' + encodeState());
  track('copy_link', characterSummary(state));
  try { await navigator.clipboard.writeText(location.href); toast('Character link copied'); }
  catch { toast('The link is in the address bar'); }
}

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
// The floating panel covers the right part of the stage, so the view is shifted to keep the
// character centred in the visible part. Exports drop the shift and come out centred.
const panelEl = document.getElementById('panel');
let viewShift = 0;
function panelSpace() {
  if (EMBED) return 0;
  if (innerWidth <= 860 || !document.body.classList.contains('panel-open')) return 0;
  return panelEl.offsetWidth + 16;
}
function applyViewShift() {
  const w = stage.clientWidth, h = stage.clientHeight;
  if (Math.abs(viewShift) < 0.5) camera.clearViewOffset();
  else camera.setViewOffset(w, h, viewShift / 2, 0, w, h);
}
function resize() {
  const w = stage.clientWidth, h = stage.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  // tall, narrow stages (phones, especially during the intro before the sheet opens):
  // keep the horizontal field of view from shrinking so the character never spills off the sides
  const BASE_FOV = 32, MIN_ASPECT = 0.9;
  camera.fov = camera.aspect >= MIN_ASPECT ? BASE_FOV
    : THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(BASE_FOV / 2)) * MIN_ASPECT / camera.aspect));
  viewShift = panelSpace();
  applyViewShift();
  camera.updateProjectionMatrix();
  // resizing clears the canvas; draw again right away so it never shows an empty frame
  // (on phones the stage shrinks every frame while the settings sheet rises)
  if (!paused && hero.box) draw();
}
new ResizeObserver(resize).observe(stage);

rebuildAll();
resize();

const clock = new THREE.Clock();
/* ---------------- intro ----------------
   On load the character pops up in the middle of the screen (UI hidden, panel closed),
   then glides to its usual place while the panel, presets and tab bar come in with it. */
const INTRO = !matchMedia('(prefers-reduced-motion: reduce)').matches;
const easeOutBack = (k) => { const c = 1.9; return 1 + (c + 1) * (k - 1) ** 3 + c * (k - 1) ** 2; };
let introT = INTRO ? 0 : -1, revealed = false;
// the character glides to its place while the panel, presets and tab bar come in
function revealUI() {
  revealed = true;
  document.body.classList.add('panel-open');
  document.body.classList.remove('intro');
}
hero.root.scale.setScalar(INTRO ? 0.001 : 1);
if (!INTRO) revealUI();

// embeds: don't draw while the iframe is scrolled out of view
let onScreen = true;
if (EMBED && 'IntersectionObserver' in window) {
  new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; }).observe(document.body);
}
// frame-time watchdog: if the average frame is slow for ~2 s, render fewer pixels
const perf = { t: 0, n: 0, sum: 0 };
function watchFrameTime(dt) {
  if (introT >= 0 || recording || document.hidden) return;
  perf.t += dt; perf.n++; perf.sum += Math.min(dt, 0.1);
  if (perf.t < 2) return;
  const avg = perf.sum / perf.n;
  perf.t = perf.n = perf.sum = 0;
  let next = dpr;
  if (avg > 1 / 40 && dpr > 1) next = Math.max(1, dpr - 0.25);              // < 40 fps: step down
  else if (avg < 1 / 75 && dpr < MAX_DPR) next = Math.min(MAX_DPR, dpr + 0.25); // plenty of headroom: step back up
  if (next !== dpr) { dpr = next; renderer.setPixelRatio(dpr); resize(); }
}

function frame() {
  const dt = clock.getDelta();
  if (paused || !onScreen) { requestAnimationFrame(frame); return; } // loop export drives rendering itself
  watchFrameTime(dt);
  flush();
  if (introT >= 0) {
    introT += Math.min(dt, 1 / 30);
    const k = Math.min(1, Math.max(0, (introT - 0.15) / 0.7));   // step 1: pop in at the centre
    hero.root.scale.setScalar(Math.max(0.001, easeOutBack(k)));
    // step 2: the character glides to its place and the UI comes in at the same time
    if (introT > 1.05 && !revealed) revealUI();
    if (k >= 1 && revealed) { hero.root.scale.setScalar(1); introT = -1; }
  }
  if (performance.now() - pointer.last > 4000) pointer.active = false;
  const target = panelSpace();
  if (Math.abs(target - viewShift) > 0.5) {
    viewShift += (target - viewShift) * Math.min(1, dt * 6);
    applyViewShift();
  }
  hero.update(dt, state, pointer);
  controls.update();
  draw();
  requestAnimationFrame(frame);
}
frame();

// analytics: the first drag-to-rotate of the visit, and the character the visitor ends up with
let rotated = false;
controls.addEventListener('start', () => { if (!rotated) { rotated = true; track('character_rotate'); } });
let reported = false;
addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'hidden' || reported || EMBED) return;
  reported = true;
  track('final_character', characterSummary(state));
});

window.__claymates = { state, hero, renderer, scene, camera, exportVideo, draw };
