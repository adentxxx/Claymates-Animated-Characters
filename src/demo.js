// Scripted product demo, for recording a promo video of the site.
//   https://claymates.fun/?demo          plays the tour after the intro (record it with any screen recorder)
//   https://claymates.fun/?demo&record   shows a "Start recording" button: the tab records itself and
//                                        downloads the video when the tour ends (Chrome / Edge)
// The tour: the site opens → the camera zooms into the settings panel → the shape grid lifts and its
// tiles light up one by one → a few shapes are picked (each click with an expanding ring) → the
// Emotion tab → the emotions light up → a few emotions are picked → the camera pulls back.
// Camera, cursor and press use springs from the site's motion engine.
import { S, step, register } from './motion.js';

const app = document.getElementById('app');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------- camera: a transform on the whole app ---------- */
const cam = { s: S(1, [90, 19]), x: S(0, [90, 19]), y: S(0, [90, 19]) };
// fit a screen rectangle (measured with the camera at rest) into the view
function frame(rect, maxScale = 2.2, margin = 0.86) {
  const s = Math.min(maxScale, (innerWidth * margin) / rect.width, (innerHeight * margin) / rect.height);
  cam.s.t = Math.max(1, s);
  cam.x.t = innerWidth / 2 - cam.s.t * (rect.left + rect.width / 2);
  cam.y.t = innerHeight / 2 - cam.s.t * (rect.top + rect.height / 2);
  // never let the edge of the page come into view (behind it is the plain body background, a
  // visible seam next to the stage gradient): the zoomed page always covers the whole frame.
  // Scale and offset ride the same spring, so every in-between frame is covered as well.
  cam.x.t = Math.min(0, Math.max(innerWidth * (1 - cam.s.t), cam.x.t));
  cam.y.t = Math.min(0, Math.max(innerHeight * (1 - cam.s.t), cam.y.t));
}
function rest() { cam.s.t = 1; cam.x.t = 0; cam.y.t = 0; }
// a rectangle as it is laid out, i.e. without the camera transform
function laidOut(el) {
  const r = el.getBoundingClientRect(), s = cam.s.x;
  return { left: (r.left - cam.x.x) / s, top: (r.top - cam.y.x) / s, width: r.width / s, height: r.height / s };
}
const union = (a, b) => {
  const l = Math.min(a.left, b.left), t = Math.min(a.top, b.top);
  return { left: l, top: t, width: Math.max(a.left + a.width, b.left + b.width) - l, height: Math.max(a.top + a.height, b.top + b.height) - t };
};
const pad = (r, p) => ({ left: r.left - p, top: r.top - p, width: r.width + 2 * p, height: r.height + 2 * p });

/* ---------- pointer (an iPadOS-style translucent dot) + click ring ---------- */
const cursor = document.createElement('div');
cursor.className = 'demo-cursor';
document.body.appendChild(cursor);
const cur = { x: S(innerWidth * 0.45, [170, 20]), y: S(innerHeight * 0.6, [170, 20]), o: S(0, [420, 32]), p: S(1, [520, 16]) };

function ring(x, y) {
  const r = document.createElement('div');
  r.className = 'demo-ring';
  r.style.left = x + 'px'; r.style.top = y + 'px';
  document.body.appendChild(r);
  setTimeout(() => r.remove(), 700);
}
const centre = (el) => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
async function moveTo(el, ms = 620) {
  const [x, y] = centre(el);
  cur.x.t = x; cur.y.t = y;
  await wait(ms);
}
async function click(el) {
  await moveTo(el);
  const [x, y] = centre(el);
  cur.p.x = 0.72;                                      // the dot shrinks on the press, then springs back
  ring(x, y);
  el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1, clientX: x, clientY: y }));
}

register({
  frame(dt) { for (const s of [cam.s, cam.x, cam.y, cur.x, cur.y, cur.o, cur.p]) step(s, dt); },
  render() {
    // during the demo the transform is never removed: dropping it and adding it back makes the
    // browser rebuild and repaint the whole page layer (~0.27 s stall at the start of each camera move)
    app.style.transformOrigin = '0 0';
    app.style.transform = document.body.classList.contains('demo')
      ? `translate(${cam.x.x.toFixed(2)}px,${cam.y.x.toFixed(2)}px) scale(${cam.s.x.toFixed(4)})` : '';
    cursor.style.opacity = Math.max(0, Math.min(1, cur.o.x)).toFixed(3);
    cursor.style.transform = `translate(${cur.x.x.toFixed(1)}px,${cur.y.x.toFixed(1)}px) scale(${cur.p.x.toFixed(3)})`;
  },
});

/* ---------- highlight a grid: it lifts and glows, its tiles light up in turn ---------- */
async function showcase(grid) {
  grid.classList.add('demo-group');
  await wait(450);
  for (const tile of grid.querySelectorAll('.shape-btn')) {
    tile.classList.add('demo-pulse');
    setTimeout(() => tile.classList.remove('demo-pulse'), 320);
    await wait(95);
  }
  await wait(650);
  grid.classList.remove('demo-group');
  await wait(250);
}

const chip = (label) => [...document.querySelectorAll('#tabs .jelly-radio__chip')].find((c) => c.textContent.trim() === label);
const visibleGrid = () => [...document.querySelectorAll('#controls .shape-grid')].find((g) => g.offsetParent !== null);
const tile = (grid, label) => [...grid.querySelectorAll('.shape-btn')].find((b) => b.textContent.trim() === label);

const TOUR_SHAPES = ['Heart', 'Star', 'Cloud', 'Ghost', 'Bean', 'Cube'];
const TOUR_EMOTIONS = ['Joy', 'Love', 'Surprised', 'Sleepy', 'Silly', 'Happy'];

// builds every shape and emotion of the tour once (meshes are cached, effect textures uploaded)
async function warmUp() {
  while (document.body.classList.contains('intro')) await wait(100);
  if (document.body.dataset.stage !== 'design') document.querySelector('.sb-tool')?.click();
  chip('Shape')?.click(); await wait(250);
  let grid = visibleGrid();
  const shape0 = grid.querySelector('.shape-btn.on');
  for (const n of TOUR_SHAPES) { tile(grid, n)?.click(); await wait(80); }
  shape0?.click(); await wait(80);
  chip('Emotion')?.click(); await wait(250);
  grid = visibleGrid();
  const emo0 = grid.querySelector('.shape-btn.on');
  for (const n of TOUR_EMOTIONS) { tile(grid, n)?.click(); await wait(300); }
  emo0?.click(); await wait(200);
  chip('Shape')?.click(); await wait(400);
}

// turns the recording into an MP4 (H.264, steady 60 fps) and drops its first `seconds` (the warm-up)
async function toMp4(blob, seconds) {
  try {
    const mb = await import('mediabunny');
    const input = new mb.Input({ source: new mb.BlobSource(blob), formats: mb.ALL_FORMATS });
    const output = new mb.Output({ format: new mb.Mp4OutputFormat({ fastStart: 'in-memory' }), target: new mb.BufferTarget() });
    const conversion = await mb.Conversion.init({
      input, output, trim: { start: seconds },
      video: { codec: 'avc', quality: mb.QUALITY_VERY_HIGH, frameRate: 60 },
    });
    if (!conversion.isValid) return null;
    await conversion.execute();
    return new Blob([output.target.buffer], { type: 'video/mp4' });
  } catch {
    return null;   // keep the raw recording rather than nothing
  }
}

/** Plays the whole tour once. */
export async function playTour() {
  document.body.classList.add('demo');
  // wait for the intro to finish (the site "opening" is part of the video)
  while (document.body.classList.contains('intro')) await wait(100);
  await wait(1400);

  // start from Design → Shape
  if (document.body.dataset.stage !== 'design') document.querySelector('.sb-tool')?.click();
  const shapeChip = chip('Shape');
  if (shapeChip && shapeChip.dataset.on !== 'true') shapeChip.click();
  await wait(300);

  const stage = laidOut(document.getElementById('stage'));
  const character = { left: stage.left + stage.width * 0.22, top: stage.top + stage.height * 0.2, width: stage.width * 0.4, height: stage.height * 0.55 };

  // 1) zoom into the panel: tabs + shape grid
  let grid = visibleGrid();
  cur.o.t = 1;
  frame(pad(union(laidOut(document.getElementById('tabs')), laidOut(grid)), 18));
  await wait(1300);
  await showcase(grid);

  // 2) pull back to see the character, then try a few shapes
  frame(pad(union(character, laidOut(grid)), 40), 1.5, 0.92);
  await wait(900);
  for (const name of TOUR_SHAPES) {
    const t = tile(grid, name);
    if (!t) continue;
    await click(t);
    await wait(900);
  }

  // 3) the Emotion tab
  await click(chip('Emotion'));
  await wait(700);
  grid = visibleGrid();
  frame(pad(union(laidOut(document.getElementById('tabs')), laidOut(grid)), 18));
  await wait(1300);
  await showcase(grid);

  // 4) pull back and try a few emotions
  frame(pad(union(character, laidOut(grid)), 40), 1.5, 0.92);
  await wait(900);
  for (const name of TOUR_EMOTIONS) {
    const t = tile(grid, name);
    if (!t) continue;
    await click(t);
    await wait(1150);
  }

  // 5) back to the full view
  cur.o.t = 0;
  rest();
  await wait(2200);
  document.body.classList.remove('demo');
}

/* ---------- in-tab recording (?demo&record) ---------- */
export function setupRecording(replayIntro) {
  document.body.classList.add('demo');
  const gate = document.createElement('div');
  gate.className = 'demo-gate';
  gate.innerHTML = `<div class="demo-gate-card">
      <b>Record the ClayMates demo</b>
      <p>Press Start, then choose <b>this tab</b> in the browser's sharing window. The tour plays from the very beginning and the video downloads when it ends.</p>
      <button type="button">Start recording</button>
    </div>`;
  document.body.appendChild(gate);
  gate.querySelector('button').addEventListener('click', async () => {
    let stream;
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 60, displaySurface: 'browser' }, audio: false,
        preferCurrentTab: true, selfBrowserSurface: 'include', surfaceSwitching: 'exclude',
      });
    } catch {
      return;   // sharing was cancelled: keep the button
    }
    // WebM is the most reliable thing Chrome records; it is turned into an MP4 at the end
    const type = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4'].find((t) => MediaRecorder.isTypeSupported(t));
    const rec = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 20e6 });
    const chunks = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    const stopped = new Promise((r) => { rec.onstop = r; });
    const card = gate.querySelector('.demo-gate-card');
    card.innerHTML = '<b>Getting ready…</b>';
    rec.start();
    const t0 = performance.now();
    // pre-roll (cut later): the capture and the encoder warm up while every shape and emotion of
    // the tour is built once behind the card, so nothing stalls on camera
    await warmUp();
    await wait(600);
    const cut = (performance.now() - t0) / 1000;
    gate.style.display = 'none';
    replayIntro();
    await playTour();
    rec.stop();
    await stopped;
    stream.getTracks().forEach((t) => t.stop());
    const raw = new Blob(chunks, { type: type.split(';')[0] });
    gate.style.display = '';
    card.innerHTML = '<b>Preparing the video…</b>';
    const blob = (await toMp4(raw, cut)) || raw;
    window.__demoVideo = { blob, type: blob.type };   // also kept for automated recording scripts
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `claymates-demo.${blob.type.includes('mp4') ? 'mp4' : 'webm'}`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    gate.remove();
  });
}
