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

/* ---------- cursor + click ring ---------- */
const cursor = document.createElement('div');
cursor.className = 'demo-cursor';
cursor.innerHTML = '<svg viewBox="0 0 28 28" aria-hidden="true"><path d="M5 3.5 22.5 15l-8 1.6 4.6 8.1-3.3 1.8-4.6-8.1-6 5.5Z"/></svg>';
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
  cur.p.x = 0.8;                                       // the cursor dips, then springs back
  ring(x, y);
  el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1, clientX: x, clientY: y }));
}

register({
  frame(dt) { for (const s of [cam.s, cam.x, cam.y, cur.x, cur.y, cur.o, cur.p]) step(s, dt); },
  render() {
    const moving = Math.abs(cam.s.x - 1) > 1e-3 || Math.abs(cam.x.x) > 0.1 || Math.abs(cam.y.x) > 0.1;
    app.style.transformOrigin = '0 0';
    app.style.transform = moving ? `translate(${cam.x.x.toFixed(2)}px,${cam.y.x.toFixed(2)}px) scale(${cam.s.x.toFixed(4)})` : '';
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
  for (const name of ['Heart', 'Star', 'Cloud', 'Ghost', 'Bean', 'Cube']) {
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
  for (const name of ['Joy', 'Love', 'Surprised', 'Sleepy', 'Silly', 'Happy']) {
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
    const type = ['video/mp4;codecs=avc1.640028', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm'].find((t) => MediaRecorder.isTypeSupported(t));
    const rec = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 20e6 });
    const chunks = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    const stopped = new Promise((r) => { rec.onstop = r; });
    gate.remove();
    await wait(400);                     // let the sharing prompt disappear from the picture
    replayIntro();
    rec.start();
    await playTour();
    rec.stop();
    await stopped;
    stream.getTracks().forEach((t) => t.stop());
    const blob = new Blob(chunks, { type: type.split(';')[0] });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `claymates-demo.${type.includes('mp4') ? 'mp4' : 'webm'}`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  });
}
