// Surface Nets polygonizer: SDF -> smooth BufferGeometry with gradient normals
// and baked ambient occlusion (vertex colors).
import * as THREE from 'three';

export function computeBounds(sdf) {
  const step = 0.14;
  const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
  for (let z = -2.6; z <= 2.6; z += step)
    for (let y = -1.0; y <= 4.6; y += step)
      for (let x = -3.4; x <= 3.4; x += step) {
        if (sdf(x, y, z) < step) {
          if (x < mn[0]) mn[0] = x; if (y < mn[1]) mn[1] = y; if (z < mn[2]) mn[2] = z;
          if (x > mx[0]) mx[0] = x; if (y > mx[1]) mx[1] = y; if (z > mx[2]) mx[2] = z;
        }
      }
  const pad = step + 0.08;
  return { min: mn.map(v => v - pad), max: mx.map(v => v + pad) };
}

const C_POS = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]];
const EDGES = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];

export function buildBodyGeometry(sdf, cell = 0.035, ao = true) {
  const b = computeBounds(sdf);
  const [x0, y0, z0] = b.min;
  const nx = Math.ceil((b.max[0] - x0) / cell) + 1;
  const ny = Math.ceil((b.max[1] - y0) / cell) + 1;
  const nz = Math.ceil((b.max[2] - z0) / cell) + 1;
  const F = new Float32Array(nx * ny * nz);
  let o = 0;
  for (let k = 0; k < nz; k++) {
    const z = z0 + k * cell;
    for (let j = 0; j < ny; j++) {
      const y = y0 + j * cell;
      for (let i = 0; i < nx; i++) F[o++] = sdf(x0 + i * cell, y, z);
    }
  }
  const nxy = nx * ny;
  const cOff = [0, 1, nx, nx + 1, nxy, nxy + 1, nxy + nx, nxy + nx + 1];
  const cnx = nx - 1, cny = ny - 1, cnz = nz - 1;
  const cellV = new Int32Array(cnx * cny * cnz).fill(-1);
  const verts = [];
  const v = new Float32Array(8);

  for (let k = 0; k < cnz; k++)
    for (let j = 0; j < cny; j++)
      for (let i = 0; i < cnx; i++) {
        const base = i + nx * (j + ny * k);
        let mask = 0;
        for (let c = 0; c < 8; c++) { v[c] = F[base + cOff[c]]; if (v[c] < 0) mask |= 1 << c; }
        if (mask === 0 || mask === 255) continue;
        let sx = 0, sy = 0, sz = 0, n = 0;
        for (let e = 0; e < 12; e++) {
          const a = EDGES[e][0], bb = EDGES[e][1];
          if (((mask >> a) & 1) === ((mask >> bb) & 1)) continue;
          const t = v[a] / (v[a] - v[bb]);
          const pa = C_POS[a], pb = C_POS[bb];
          sx += pa[0] + (pb[0] - pa[0]) * t;
          sy += pa[1] + (pb[1] - pa[1]) * t;
          sz += pa[2] + (pb[2] - pa[2]) * t;
          n++;
        }
        cellV[i + cnx * (j + cny * k)] = verts.length / 3;
        verts.push(x0 + (i + sx / n) * cell, y0 + (j + sy / n) * cell, z0 + (k + sz / n) * cell);
      }

  const ci = (i, j, k) => cellV[i + cnx * (j + cny * k)];
  const idx = [];
  const quad = (a, b2, c, d) => {
    if (a < 0 || b2 < 0 || c < 0 || d < 0) return;
    idx.push(a, b2, c, a, c, d);
  };
  for (let k = 0; k < nz; k++)
    for (let j = 0; j < ny; j++)
      for (let i = 0; i < nx; i++) {
        const f0 = F[i + nx * (j + ny * k)];
        const in0 = f0 < 0;
        if (i < cnx && j > 0 && k > 0 && j < cny && k < cnz) {
          if (in0 !== (F[i + 1 + nx * (j + ny * k)] < 0)) quad(ci(i, j - 1, k - 1), ci(i, j, k - 1), ci(i, j, k), ci(i, j - 1, k));
        }
        if (j < cny && i > 0 && k > 0 && i < cnx && k < cnz) {
          if (in0 !== (F[i + nx * (j + 1 + ny * k)] < 0)) quad(ci(i - 1, j, k - 1), ci(i - 1, j, k), ci(i, j, k), ci(i, j, k - 1));
        }
        if (k < cnz && i > 0 && j > 0 && i < cnx && j < cny) {
          if (in0 !== (F[i + nx * (j + ny * (k + 1))] < 0)) quad(ci(i - 1, j - 1, k), ci(i, j - 1, k), ci(i, j, k), ci(i - 1, j, k));
        }
      }

  // project vertices onto the surface + gradient normals + AO
  const nv = verts.length / 3;
  const pos = new Float32Array(verts);
  const nor = new Float32Array(nv * 3);
  const col = new Float32Array(nv * 3);
  const e = 0.002;
  for (let q = 0; q < nv; q++) {
    let x = pos[q * 3], y = pos[q * 3 + 1], z = pos[q * 3 + 2];
    let gx = sdf(x + e, y, z) - sdf(x - e, y, z);
    let gy = sdf(x, y + e, z) - sdf(x, y - e, z);
    let gz = sdf(x, y, z + e) - sdf(x, y, z - e);
    let gl = Math.hypot(gx, gy, gz) || 1;
    gx /= gl; gy /= gl; gz /= gl;
    const d = sdf(x, y, z);
    if (Math.abs(d) < cell) { x -= gx * d; y -= gy * d; z -= gz * d; }
    pos[q * 3] = x; pos[q * 3 + 1] = y; pos[q * 3 + 2] = z;
    nor[q * 3] = gx; nor[q * 3 + 1] = gy; nor[q * 3 + 2] = gz;
    let occ = 1;
    if (ao) {
      let sum = 0, w = 1;
      for (let s = 1; s <= 4; s++) {
        const h = 0.035 * s * s * 0.6 + 0.02;
        const dd = sdf(x + gx * h, y + gy * h, z + gz * h);
        sum += (h - dd) * w;
        w *= 0.7;
      }
      occ = Math.min(1, Math.max(0.45, 1 - sum * 2.2));
    }
    col[q * 3] = col[q * 3 + 1] = col[q * 3 + 2] = occ;
  }

  // fix triangle winding to agree with gradient normals
  for (let t = 0; t < idx.length; t += 3) {
    const a = idx[t] * 3, b2 = idx[t + 1] * 3, c = idx[t + 2] * 3;
    const ux = pos[b2] - pos[a], uy = pos[b2 + 1] - pos[a + 1], uz = pos[b2 + 2] - pos[a + 2];
    const wx = pos[c] - pos[a], wy = pos[c + 1] - pos[a + 1], wz = pos[c + 2] - pos[a + 2];
    const fx = uy * wz - uz * wy, fy = uz * wx - ux * wz, fz = ux * wy - uy * wx;
    const ax = nor[a] + nor[b2] + nor[c], ay = nor[a + 1] + nor[b2 + 1] + nor[c + 1], az = nor[a + 2] + nor[b2 + 2] + nor[c + 2];
    if (fx * ax + fy * ay + fz * az < 0) { const tmp = idx[t + 1]; idx[t + 1] = idx[t + 2]; idx[t + 2] = tmp; }
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setIndex(nv > 65535 ? new THREE.Uint32BufferAttribute(idx, 1) : new THREE.Uint16BufferAttribute(idx, 1));
  g.computeBoundingBox();
  g.computeBoundingSphere();
  return g;
}
