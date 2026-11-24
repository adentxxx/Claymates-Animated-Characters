// 404 page: random ClayMates characters (built with the same generator as the site) rain down,
// bounce and pile up around the big "404". They hold a still Idle pose; only physics moves them.
// Physics: a small 2D solver with circle colliders: gravity, floor, walls, the "404" block
// as a rounded box, character-to-character contacts, friction that makes them roll and tumble.
// Performance: a quality tier picked from the device, characters prebuilt before the rain,
// adaptive resolution, and no rendering at all once everything has come to rest.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Character } from './character.js';
import { DEFAULTS, PALETTE } from './presets.js';
import { SHAPES } from './sdf.js';
import { EMOTIONS } from './animations.js';
import { track } from './analytics.js';
import './notfound.css';

const home = document.getElementById('home');
home.href = import.meta.env.BASE_URL;
track('page_404', { path: location.pathname });
home.addEventListener('click', () => track('404_home_click'));
let pushed = false;

/* ---------- quality tier from what the device reports ---------- */
const cores = navigator.hardwareConcurrency || 4;
const memory = navigator.deviceMemory || 4;                 // GB, Chromium only
const small = Math.min(innerWidth, innerHeight) < 640;
const TIER = cores <= 4 || memory <= 2 ? 'low' : small || cores <= 6 || memory <= 4 ? 'mid' : 'high';
const Q = {
  low:  { count: 6,  dpr: 1,    aa: false, cell: 0.07, materials: ['matte'] },
  mid:  { count: 9,  dpr: 1.5,  aa: true,  cell: 0.06, materials: ['matte', 'matte', 'glass'] },
  high: { count: 13, dpr: 1.75, aa: true,  cell: 0.05, materials: ['matte', 'matte', 'glass', 'glass'] },
}[TIER];

/* ---------- renderer & scene ---------- */
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: Q.aa, alpha: true, powerPreference: TIER === 'low' ? 'low-power' : 'high-performance' });
const MAX_DPR = Math.min(window.devicePixelRatio || 1, Q.dpr);
let dpr = MAX_DPR;
renderer.setPixelRatio(dpr);
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = 1.05;
const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.55;
scene.add(new THREE.HemisphereLight(0xffffff, 0xd6d0e6, 1.1));
const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(2.5, 5, 3.5); scene.add(key);
const rim = new THREE.DirectionalLight(0xdfe6ff, 1.4); rim.position.set(-3, 3, -3); scene.add(rim);
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -100, 100);
camera.position.set(0, 0, 50);

/* ---------- world (1 unit = U css pixels, y up, origin at the screen centre) ---------- */
let U = 90, W = 10, H = 10;
// static rounded boxes the characters land on: the "404" glyphs and the button
const obstacles = [{ x: 0, y: 0, hw: 1, hh: 1, r: 0.3 }, { x: 0, y: 0, hw: 1, hh: 1, r: 0.3 }];
const toWorld = (rect, o, trimY = 0, trimX = 0) => {
  o.x = (rect.left + rect.width / 2 - innerWidth / 2) / U;
  o.y = (innerHeight / 2 - (rect.top + rect.height / 2)) / U;
  o.hw = (rect.width / 2 - trimX) / U;
  o.hh = (rect.height / 2 - trimY) / U;
  o.r = Math.min(o.hh, o.hw, 0.35);
};
function layout() {
  const w = innerWidth, h = innerHeight;
  U = Math.min(110, Math.max(46, Math.min(h / 8.5, w / 7)));
  W = w / U; H = h / U;
  renderer.setSize(w, h, false);
  Object.assign(camera, { left: -W / 2, right: W / 2, top: H / 2, bottom: -H / 2 });
  camera.updateProjectionMatrix();
  // the digits sit inside their line box: trim the empty space above and below them
  const code = document.getElementById('code').getBoundingClientRect();
  toWorld(code, obstacles[0], code.height * 0.12, code.width * 0.02);
  toWorld(home.getBoundingClientRect(), obstacles[1]);   // the button (the text above it may be passed behind)
}
addEventListener('resize', () => { layout(); wake(); });

/* ---------- random characters (same recipe as the site's "Random", minus the glow halo) ---------- */
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const rnd = (a, b) => a + Math.random() * (b - a);
const CALM = Object.keys(EMOTIONS).filter((e) => !EMOTIONS[e].fx); // no floating hearts / stars / Zs
function randomState() {
  return {
    ...DEFAULTS,
    shape: pick(Object.keys(SHAPES)), width: rnd(0.85, 1.2), height: rnd(0.85, 1.2), depth: rnd(0.8, 1.15),
    taper: Math.random() < 0.6 ? 0 : rnd(-0.4, 0.5), wobble: rnd(0.1, 0.7), seed: (Math.random() * 1000) | 0,
    color: pick(PALETTE), color2: pick(PALETTE), material: pick(Q.materials), // no plush here: its fur is drawn as many extra layers
    eyes: pick(['dots', 'dots', 'googly', 'ovals', 'lines', 'pixel']), eyeSize: rnd(0.8, 1.3), eyeSpacing: rnd(0.26, 0.5), faceY: rnd(0.45, 0.66),
    arms: pick(['stubby', 'noodle', 'none']), legs: pick(['stubby', 'thin', 'none', 'stubby']),
    head: pick(['none', 'none', 'beret', 'cap', 'party', 'crown', 'sprout', 'antenna', 'bunny', 'cat', 'bow']),
    eyewear: pick(['none', 'none', 'none', 'round', 'sun', 'geek']), neck: pick(['none', 'none', 'tie', 'bowtie', 'scarf']),
    accColor: pick(PALETTE), glassColor: pick(['#1d1d24', '#f4f4f7', '#ffc531', '#ff4757']),
    emotion: pick(CALM),
    // a still Idle pose: no time passes, no blinking, no cursor following
    anim: 'idle', speed: 0, blink: false, follow: false,
  };
}
const noPointer = { x: 0, y: 0, active: false };
const box = new THREE.Box3(), size = new THREE.Vector3(), center = new THREE.Vector3();

function makeCharacter() {
  const st = randomState();
  const ch = new Character();
  ch.buildBody(st, Q.cell);                // coarser mesh than the editor: these are small, and it builds several times faster
  ch.applyMaterial(st);
  ch.buildParts(st);
  for (let i = 0; i < 20; i++) ch.update(1 / 20, st, noPointer); // settle the face into the emotion, then freeze
  ch.root.updateMatrixWorld(true);
  // the pose never changes again: freeze every part's local matrix
  ch.root.traverse((o) => { o.updateMatrix(); o.matrixAutoUpdate = false; });
  box.setFromObject(ch.root); box.getSize(size); box.getCenter(center);
  ch.root.position.sub(center);            // rotate around the middle of the character
  ch.root.rotation.y = rnd(-0.45, 0.45);   // a little turned, so they read as 3D
  ch.root.updateMatrix();
  const pivot = new THREE.Group();
  pivot.add(ch.root);
  const base = innerWidth < 640 ? 1.5 : 1.9;   // smaller on phones so they fit past the "404"
  const scale = rnd(0.72, 1.0) * base / Math.max(size.y, 1.4);
  pivot.scale.setScalar(scale);
  return { pivot, r: 0.5 * Math.max(size.x * 0.92, size.y * 0.96) * scale };
}

/* ---------- physics ---------- */
const bodies = [];
const G = -26, E = 0.28, ROLL = 0.25;
// Characters are built up front (one per frame while the page is still empty) and their shaders
// compiled in one go, so the rain itself never stalls on meshing or shader compilation.
const ready = [];
const idle = (fn) => (window.requestIdleCallback ? requestIdleCallback(fn, { timeout: 60 }) : setTimeout(fn, 0));
function prepare(count) {
  return new Promise((done) => {
    const next = () => {
      const c = makeCharacter();
      c.pivot.position.set(0, 1e4, -ready.length * 3);   // parked far off screen; stable draw order
      scene.add(c.pivot);
      ready.push(c);
      if (ready.length < count) idle(next);
      else { renderer.compile(scene, camera); done(); }
    };
    next();
  });
}
function spawn() {
  const { pivot, r } = ready[bodies.length];
  // fall from above, anywhere across the screen
  const x = rnd(-W / 2 + r, W / 2 - r);
  bodies.push({ pivot, r, m: r * r, x, y: H / 2 + r + rnd(0.2, 2.5), vx: rnd(-1.5, 1.5), vy: rnd(-2, 0), a: rnd(-0.6, 0.6), w: rnd(-2, 2) });
}
// a contact with a static surface (normal nx,ny pointing out of it, penetration pen)
function hitStatic(b, nx, ny, pen) {
  b.x += nx * pen; b.y += ny * pen;
  const vn = b.vx * nx + b.vy * ny;
  if (vn < 0) {
    const bounce = vn < -2.5 ? E : 0;
    b.vx -= (1 + bounce) * vn * nx; b.vy -= (1 + bounce) * vn * ny;
  }
  // rolling: the spin follows the sliding speed along the surface, sliding loses speed
  const tx = ny, ty = -nx, vt = b.vx * tx + b.vy * ty;
  b.w += (-vt / b.r - b.w) * ROLL;
  b.vx -= tx * vt * 0.04; b.vy -= ty * vt * 0.04;
}
function step(dt) {
  for (const b of bodies) {
    b.vy += G * dt;
    b.vx *= 0.999; b.w *= 0.995;
    b.x += b.vx * dt; b.y += b.vy * dt; b.a += b.w * dt;
  }
  for (let it = 0; it < 3; it++) {
    for (const b of bodies) {
      const floor = -H / 2 + 0.15, L = -W / 2, R = W / 2;   // floor a touch above the edge: tumbled characters stay in view
      if (b.y - b.r < floor) hitStatic(b, 0, 1, floor - (b.y - b.r));
      if (b.x - b.r < L) hitStatic(b, 1, 0, L - (b.x - b.r));
      if (b.x + b.r > R) hitStatic(b, -1, 0, b.x + b.r - R);
      for (const o of obstacles) {
      const qx = Math.max(o.x - o.hw + o.r, Math.min(b.x, o.x + o.hw - o.r));
      const qy = Math.max(o.y - o.hh + o.r, Math.min(b.y, o.y + o.hh - o.r));
      const dx = b.x - qx, dy = b.y - qy, d = Math.hypot(dx, dy), rr = b.r + o.r;
      if (d < rr) {
        const nx = d > 1e-6 ? dx / d : 0, ny = d > 1e-6 ? dy / d : 1;
        hitStatic(b, nx, ny, rr - d);
      }
      }
    }
    for (let i = 0; i < bodies.length; i++) {
      const A = bodies[i];
      for (let j = i + 1; j < bodies.length; j++) {
        const B = bodies[j];
        const dx = B.x - A.x, dy = B.y - A.y, rr = A.r + B.r;
        const d2 = dx * dx + dy * dy;
        if (d2 >= rr * rr) continue;
        const d = Math.sqrt(d2) || 1e-6, nx = dx / d, ny = dy / d, pen = rr - d;
        const ia = 1 / A.m, ib = 1 / B.m, k = pen / (ia + ib);
        A.x -= nx * k * ia; A.y -= ny * k * ia; B.x += nx * k * ib; B.y += ny * k * ib;
        const vn = (B.vx - A.vx) * nx + (B.vy - A.vy) * ny;
        if (vn < 0) {
          const jn = -(1 + E) * vn / (ia + ib);
          A.vx -= jn * nx * ia; A.vy -= jn * ny * ia; B.vx += jn * nx * ib; B.vy += jn * ny * ib;
          // a glancing hit sets them spinning in opposite directions
          const vt = (B.vx - A.vx) * ny - (B.vy - A.vy) * nx;
          A.w += vt * 0.08 / A.r; B.w += vt * 0.08 / B.r;
        }
      }
    }
  }
}

/* ---------- pointer: characters get nudged out of the way ---------- */
const ptr = { x: 0, y: 0, vx: 0, vy: 0, on: false, t: 0 };
addEventListener('pointermove', (e) => {
  const x = (e.clientX - innerWidth / 2) / U, y = (innerHeight / 2 - e.clientY) / U;
  const now = performance.now(), dt = Math.max(0.008, (now - ptr.t) / 1000);
  if (ptr.on) { ptr.vx = (x - ptr.x) / dt; ptr.vy = (y - ptr.y) / dt; }
  Object.assign(ptr, { x, y, on: true, t: now });
  if (bodies.some((b) => Math.hypot(b.x - x, b.y - y) < b.r * 1.2)) wake();
});
addEventListener('pointerleave', () => { ptr.on = false; });
function nudge() {
  if (!ptr.on || performance.now() - ptr.t > 80) return;
  for (const b of bodies) {
    const dx = b.x - ptr.x, dy = b.y - ptr.y, d = Math.hypot(dx, dy);
    if (d < b.r * 1.05) {
      b.vx += (ptr.vx * 0.5 - b.vx) * 0.35 + (dx / (d || 1)) * 2;
      b.vy += (ptr.vy * 0.5 - b.vy) * 0.35 + (dy / (d || 1)) * 2 + 3;
      b.w += (Math.random() - 0.5) * 6;
      if (!pushed) { pushed = true; track('404_character_push'); }
    }
  }
}

/* ---------- loop ---------- */
const COUNT = small ? Math.min(Q.count, 7) : Q.count;
let spawnClock = 0.1, last = 0, raining = false, running = false, still = 0;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
// frame-time watchdog: if frames are slow for ~1.5 s, draw fewer pixels
const perf = { t: 0, n: 0, sum: 0 };
function watch(dt) {
  perf.t += dt; perf.n++; perf.sum += dt;
  if (perf.t < 1.5) return;
  const avg = perf.sum / perf.n;
  perf.t = perf.n = perf.sum = 0;
  if (avg > 1 / 45 && dpr > 0.75) { dpr = Math.max(0.75, dpr - 0.25); renderer.setPixelRatio(dpr); renderer.setSize(innerWidth, innerHeight, false); }
}
function tick(dt) {
  spawnClock -= dt;
  if (raining && bodies.length < COUNT && spawnClock <= 0) { spawn(); spawnClock = reduce ? 0 : rnd(0.25, 0.6); }
  nudge();
  for (let i = 0; i < 3; i++) step(dt / 3);
  for (const b of bodies) { b.pivot.position.x = b.x; b.pivot.position.y = b.y; b.pivot.rotation.z = b.a; }
  renderer.render(scene, camera);
  // everyone has landed and stopped: time to rest
  const moving = bodies.some((b) => Math.abs(b.vx) + Math.abs(b.vy) > 0.06 || Math.abs(b.w) > 0.06);
  still = moving || bodies.length < COUNT ? 0 : still + dt;
  return still < 0.6;
}
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  watch(dt);
  if (tick(dt)) requestAnimationFrame(frame);
  else running = false;                    // asleep: no physics and no rendering until something wakes it
}
function wake() {
  if (running || !raining) return;
  running = true; still = 0;
  requestAnimationFrame((t) => { last = t; frame(t); });
}
window.__nf = { bodies, tick, tier: TIER, get running() { return running; } }; // debugging handle
(document.fonts ? document.fonts.ready : Promise.resolve()).then(async () => {
  layout();
  await prepare(COUNT);
  raining = true;
  wake();
});
