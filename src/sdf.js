// Signed distance fields for character bodies.
// Every shape is ~2 units tall, stands on y≈0 and faces +z.
import * as THREE from 'three';

const { sqrt, abs, max, min, floor } = Math;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

/* ---------------- noise (for hand-made clay wobble) ---------------- */
function hash3(i, j, k, s) {
  let h = Math.imul(i, 374761393) ^ Math.imul(j, 668265263) ^ Math.imul(k, 1440662683) ^ Math.imul(s, 2654435761);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return ((h >>> 0) & 0xffff) / 32767.5 - 1;
}
export function noise3(x, y, z, s = 0) {
  const xi = floor(x), yi = floor(y), zi = floor(z);
  let fx = x - xi, fy = y - yi, fz = z - zi;
  fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy); fz = fz * fz * (3 - 2 * fz);
  const a = hash3(xi, yi, zi, s), b = hash3(xi + 1, yi, zi, s);
  const c = hash3(xi, yi + 1, zi, s), d = hash3(xi + 1, yi + 1, zi, s);
  const e = hash3(xi, yi, zi + 1, s), f = hash3(xi + 1, yi, zi + 1, s);
  const g = hash3(xi, yi + 1, zi + 1, s), h = hash3(xi + 1, yi + 1, zi + 1, s);
  const x1 = a + (b - a) * fx, x2 = c + (d - c) * fx, x3 = e + (f - e) * fx, x4 = g + (h - g) * fx;
  const y1 = x1 + (x2 - x1) * fy, y2 = x3 + (x4 - x3) * fy;
  return y1 + (y2 - y1) * fz;
}

/* ---------------- primitives ---------------- */
const smin = (a, b, k) => { const h = max(k - abs(a - b), 0) / k; return min(a, b) - h * h * k * 0.25; };
const sph = (x, y, z, cx, cy, cz, r) => sqrt((x - cx) ** 2 + (y - cy) ** 2 + (z - cz) ** 2) - r;

function capsule(x, y, z, ax, ay, az, bx, by, bz, r) {
  const pax = x - ax, pay = y - ay, paz = z - az, bax = bx - ax, bay = by - ay, baz = bz - az;
  const h = clamp((pax * bax + pay * bay + paz * baz) / (bax * bax + bay * bay + baz * baz), 0, 1);
  return sqrt((pax - bax * h) ** 2 + (pay - bay * h) ** 2 + (paz - baz * h) ** 2) - r;
}

// Inigo Quilez — round cone between a (radius r1) and b (radius r2)
function roundCone(x, y, z, ax, ay, az, bx, by, bz, r1, r2) {
  const bax = bx - ax, bay = by - ay, baz = bz - az;
  const l2 = bax * bax + bay * bay + baz * baz;
  const rr = r1 - r2, a2 = l2 - rr * rr, il2 = 1 / l2;
  const pax = x - ax, pay = y - ay, paz = z - az;
  const yy = pax * bax + pay * bay + paz * baz, zz = yy - l2;
  const qx = pax * l2 - bax * yy, qy = pay * l2 - bay * yy, qz = paz * l2 - baz * yy;
  const x2 = qx * qx + qy * qy + qz * qz, y2 = yy * yy * l2, z2 = zz * zz * l2;
  const k = Math.sign(rr) * rr * rr * x2;
  if (Math.sign(zz) * a2 * z2 > k) return sqrt(x2 + z2) * il2 - r2;
  if (Math.sign(yy) * a2 * y2 < k) return sqrt(x2 + y2) * il2 - r1;
  return (sqrt(x2 * a2 * il2) + yy * rr) * il2 - r1;
}

function roundBox(x, y, z, bx, by, bz, r) {
  const qx = abs(x) - bx + r, qy = abs(y) - by + r, qz = abs(z) - bz + r;
  return sqrt(max(qx, 0) ** 2 + max(qy, 0) ** 2 + max(qz, 0) ** 2) + min(max(qx, max(qy, qz)), 0) - r;
}

// 2D shapes
function tri2(px, py, r) {
  const k = sqrt(3);
  px = abs(px) - r; py = py + r / k;
  if (px + k * py > 0) { const nx = (px - k * py) / 2, ny = (-k * px - py) / 2; px = nx; py = ny; }
  px -= clamp(px, -2 * r, 0);
  return -sqrt(px * px + py * py) * Math.sign(py);
}
function star2(px, py, r, rf) {
  const k1x = 0.809016994375, k1y = -0.587785252292, k2x = -k1x, k2y = k1y;
  px = abs(px);
  let d = 2 * max(k1x * px + k1y * py, 0); px -= d * k1x; py -= d * k1y;
  d = 2 * max(k2x * px + k2y * py, 0); px -= d * k2x; py -= d * k2y;
  px = abs(px); py -= r;
  const bax = rf * -k1y, bay = rf * k1x - 1;
  const h = clamp((px * bax + py * bay) / (bax * bax + bay * bay), 0, r);
  return sqrt((px - bax * h) ** 2 + (py - bay * h) ** 2) * Math.sign(py * bax - px * bay);
}
function seg2(px, py, ax, ay, bx, by, r) {
  const pax = px - ax, pay = py - ay, bax = bx - ax, bay = by - ay;
  const h = clamp((pax * bax + pay * bay) / (bax * bax + bay * bay), 0, 1);
  return sqrt((pax - bax * h) ** 2 + (pay - bay * h) ** 2) - r;
}
// Turn a 2D outline into a soft "inflated" pillow.
// Thickness comes from a pre-blurred interior-distance map, so there are no medial-axis creases.
const THICK = new Map();
function thicknessMap(key, f2) {
  if (THICK.has(key)) return THICK.get(key);
  const x0 = -1.9, y0 = -0.7, st = 0.025, nx = 153, ny = 145;
  let a = new Float32Array(nx * ny), b = new Float32Array(nx * ny);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) a[j * nx + i] = max(-f2(x0 + i * st, y0 + j * st), 0);
  const R = 9;
  for (let pass = 0; pass < 3; pass++) {
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      let sum = 0;
      for (let k = -R; k <= R; k++) { const ii = i + k; if (ii >= 0 && ii < nx) sum += a[j * nx + ii]; }
      b[j * nx + i] = sum / (2 * R + 1);
    }
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      let sum = 0;
      for (let k = -R; k <= R; k++) { const jj = j + k; if (jj >= 0 && jj < ny) sum += b[jj * nx + i]; }
      a[j * nx + i] = sum / (2 * R + 1);
    }
  }
  const sample = (x, y) => {
    const fx = (x - x0) / st, fy = (y - y0) / st;
    const i = floor(fx), j = floor(fy);
    if (i < 0 || j < 0 || i >= nx - 1 || j >= ny - 1) return 0;
    const tx = fx - i, ty = fy - j, o = j * nx + i;
    return (a[o] * (1 - tx) + a[o + 1] * tx) * (1 - ty) + (a[o + nx] * (1 - tx) + a[o + nx + 1] * tx) * ty;
  };
  THICK.set(key, sample);
  return sample;
}
function inflate(key, f2, x, y, z, h0, infl, rr) {
  const d2 = f2(x, y);
  const inner = d2 < 0.1 ? thicknessMap(key, f2)(x, y) : 0;
  const h = h0 + infl * sqrt(inner);
  const wx = d2, wy = abs(z) - h;
  return min(max(wx, wy), 0) + sqrt(max(wx, 0) ** 2 + max(wy, 0) ** 2) - rr;
}

const tri2b = (x, y) => tri2(x, y - 0.8, 0.9);
const star2b = (x, y) => star2(x, y - 0.95, 0.88, 0.5);
const boomer2 = (x, y) => smin(tri2(x - 0.15, y - 0.62, 0.6), seg2(x, y, 0.05, 0.8, -0.72, 1.9, 0.2), 0.35);

/* ---------------- shape catalogue ---------------- */
export const SHAPES = {
  ball:     { label: 'Шарик',     depth: 1,    f: (x, y, z) => sph(x, y, z, 0, 0.95, 0, 0.95) },
  drop:     { label: 'Капля',     depth: 1,    f: (x, y, z) => roundCone(x, y, z, 0, 0.75, 0, 0, 1.82, 0, 0.75, 0.16) },
  bean:     { label: 'Фасолина',  depth: 1,    f: (x, y, z) => capsule(x, y, z, 0, 0.6, 0, 0, 1.42, 0, 0.6) },
  cube:     { label: 'Кубик',     depth: 1,    f: (x, y, z) => roundBox(x, y - 0.8, z, 0.82, 0.8, 0.82, 0.3) },
  triangle: { label: 'Треугольник', depth: 1,  f: (x, y, z) => inflate('tri', tri2b, x, y, z, 0.12, 0.42, 0.3) },
  pin:      { label: 'Кегля',     depth: 1,    f: (x, y, z) => smin(sph(x, y, z, 0, 0.68, 0, 0.68), sph(x, y, z, 0, 1.72, 0, 0.4), 0.55) },
  heart:    { label: 'Сердце',    depth: 0.8,  f: (x, y, z) => smin(
    roundCone(x, y, z, -0.46, 1.32, 0, 0, 0.22, 0, 0.52, 0.14),
    roundCone(x, y, z, 0.46, 1.32, 0, 0, 0.22, 0, 0.52, 0.14), 0.12) },
  cloud:    { label: 'Облачко',   depth: 0.9,  f: (x, y, z) => {
    let d = sph(x, y, z, 0, 0.92, 0, 0.7);
    d = smin(d, sph(x, y, z, -0.62, 0.6, 0, 0.5), 0.28);
    d = smin(d, sph(x, y, z, 0.62, 0.6, 0, 0.5), 0.28);
    d = smin(d, sph(x, y, z, -0.38, 1.42, 0, 0.42), 0.28);
    d = smin(d, sph(x, y, z, 0.4, 1.46, 0, 0.38), 0.28);
    return d;
  } },
  star:     { label: 'Звезда',    depth: 1,    f: (x, y, z) => inflate('star', star2b, x, y, z, 0.12, 0.5, 0.22) },
  boomerang:{ label: 'Бумеранг',  depth: 1,    f: (x, y, z) => {
    return inflate('boom', boomer2, x, y, z, 0.12, 0.45, 0.24);
  } },
  ghost:    { label: 'Призрак',   depth: 0.95, f: (x, y, z) => {
    let d = capsule(x, y, z, 0, 0.75, 0, 0, 1.25, 0, 0.72);
    // wavy hem
    const hem = 0.25 + 0.07 * Math.cos(x * 9);
    d = max(d, -(y - hem));
    return d - 0.02;
  } },
};

/* ---------------- build an SDF from character state ---------------- */
export function makeSDF(st) {
  const S = SHAPES[st.shape] || SHAPES.drop;
  const sx = st.width, sy = st.height, sz = st.depth * S.depth;
  const lean = st.lean, taper = st.taper, wob = st.wobble, seed = st.seed | 0;
  const ks = min(sx, sy, sz);
  return (x, y, z) => {
    const py = y / sy;
    let wf = 1 - taper * (py - 0.9) * 0.5;
    if (wf < 0.3) wf = 0.3;
    const px = (x - lean * py * py * 0.35) / (sx * wf);
    const pz = z / (sz * wf);
    let d = S.f(px, py, pz) * ks * min(wf, 1);
    if (wob > 0 && d < 0.3 && d > -0.3) {
      d += wob * 0.055 * (noise3(x * 2.1, y * 2.1, z * 2.1, seed) + 0.45 * noise3(x * 4.7, y * 4.7, z * 4.7, seed + 7));
    }
    return d;
  };
}

/* ---------------- surface queries (sphere tracing) ---------------- */
export class Surface {
  constructor(sdf, box) { this.sdf = sdf; this.box = box; }
  march(ox, oy, oz, dx, dy, dz, maxT) {
    let t = 0;
    for (let i = 0; i < 200; i++) {
      const d = this.sdf(ox + dx * t, oy + dy * t, oz + dz * t);
      if (d < 0.0008) return t;
      t += max(d * 0.6, 0.002);
      if (t > maxT) break;
    }
    return -1;
  }
  normal(x, y, z, out = new THREE.Vector3()) {
    const e = 0.003, f = this.sdf;
    return out.set(
      f(x + e, y, z) - f(x - e, y, z),
      f(x, y + e, z) - f(x, y - e, z),
      f(x, y, z + e) - f(x, y, z - e)).normalize();
  }
  hit(o, dir, maxT) {
    const t = this.march(o.x, o.y, o.z, dir.x, dir.y, dir.z, maxT);
    if (t < 0) return null;
    const p = o.clone().addScaledVector(dir, t);
    return { p, n: this.normal(p.x, p.y, p.z) };
  }
  // point on the front (+z) of the body at (x, y)
  front(x, y) {
    const oz = this.box.max.z + 0.3;
    return this.hit(new THREE.Vector3(x, y, oz), new THREE.Vector3(0, 0, -1), oz - this.box.min.z + 0.6);
  }
  frontSafe(x, y) {
    for (let k = 1; k >= 0; k -= 0.2) {
      const h = this.front(x * k, y);
      if (h) return h;
    }
    const cy = (this.box.min.y + this.box.max.y) / 2;
    return this.front(0, cy) || { p: new THREE.Vector3(x, y, 0.5), n: new THREE.Vector3(0, 0, 1) };
  }
  side(y, dirSign, z = 0) {
    const ox = dirSign * (Math.max(abs(this.box.max.x), abs(this.box.min.x)) + 0.3);
    return this.hit(new THREE.Vector3(ox, y, z), new THREE.Vector3(-dirSign, 0, 0), abs(ox) + 0.5);
  }
  top(x, z = 0) {
    const oy = this.box.max.y + 0.3;
    return this.hit(new THREE.Vector3(x, oy, z), new THREE.Vector3(0, -1, 0), oy - this.box.min.y + 0.5);
  }
  bottom(x, z = 0) {
    const oy = this.box.min.y - 0.3;
    return this.hit(new THREE.Vector3(x, oy, z), new THREE.Vector3(0, 1, 0), this.box.max.y - oy + 0.5);
  }
  halfWidth(y) {
    const h = this.side(y, 1);
    const g = this.side(y, -1);
    if (!h || !g) return 0.15;
    return (h.p.x - g.p.x) / 2;
  }
}
