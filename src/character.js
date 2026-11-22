import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { makeSDF, Surface } from './sdf.js';
import { buildBodyGeometry } from './mesher.js';
import { createBodyMaterial, createFurShells, createFaceMaterials, createGlowShell, normalizeMaterial } from './materials.js';
import { EMOTIONS, POSE_KEYS, newPose, computePose } from './animations.js';

const V3 = THREE.Vector3;
const Z = new V3(0, 0, 1), Y = new V3(0, 1, 0);
const clamp = (v, a = -1, b = 1) => Math.max(a, Math.min(b, v));
const wrapPi = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const ease = (x) => x * x * (3 - 2 * x);
const FACE_KEYS = ['open', 'scale', 'brow', 'browLift', 'c', 'mo', 'w', 'smirk', 'wavy', 'tongue', 'blush'];

function mesh(geo, mat) {
  return new THREE.Mesh(geo, mat);
}
function placeOnSurface(obj, hit, off = 0) {
  obj.position.copy(hit.p).addScaledVector(hit.n, off);
  obj.quaternion.setFromUnitVectors(Z, hit.n);
}
function heartShape(s) {
  const sh = new THREE.Shape();
  sh.moveTo(0, -1 * s);
  sh.bezierCurveTo(-0.2 * s, -0.75 * s, -1 * s, -0.35 * s, -1 * s, 0.25 * s);
  sh.bezierCurveTo(-1 * s, 0.8 * s, -0.4 * s, 1.05 * s, 0, 0.6 * s);
  sh.bezierCurveTo(0.4 * s, 1.05 * s, 1 * s, 0.8 * s, 1 * s, 0.25 * s);
  sh.bezierCurveTo(1 * s, -0.35 * s, 0.2 * s, -0.75 * s, 0, -1 * s);
  return sh;
}
function heartGeo(s) {
  const g = new THREE.ExtrudeGeometry(heartShape(s), { depth: s * 0.25, bevelEnabled: true, bevelThickness: s * 0.2, bevelSize: s * 0.15, bevelSegments: 4, curveSegments: 16 });
  g.center();
  return g;
}
function roundedRect(w, h, r) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2 + r, -h / 2);
  s.lineTo(w / 2 - r, -h / 2); s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  s.lineTo(w / 2, h / 2 - r); s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
  s.lineTo(-w / 2 + r, h / 2); s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
  s.lineTo(-w / 2, -h / 2 + r); s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
  return s;
}

/* ---------- particle sprites ---------- */
let FX_TEX = null;
function fxTextures() {
  if (FX_TEX) return FX_TEX;
  const make = (draw) => {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d'); draw(g);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  };
  FX_TEX = {
    heart: make((g) => {
      g.fillStyle = '#ff4d7d'; g.beginPath(); g.moveTo(64, 112);
      g.bezierCurveTo(10, 75, 6, 40, 30, 24); g.bezierCurveTo(48, 12, 62, 26, 64, 38);
      g.bezierCurveTo(66, 26, 80, 12, 98, 24); g.bezierCurveTo(122, 40, 118, 75, 64, 112); g.fill();
      g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.ellipse(40, 44, 10, 6, -0.6, 0, Math.PI * 2); g.fill();
    }),
    z: make((g) => { g.fillStyle = '#6b74ff'; g.font = '900 100px Unbounded, Arial Black, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('Z', 64, 70); }),
    star: make((g) => {
      g.fillStyle = '#ffc531'; g.beginPath();
      for (let i = 0; i < 10; i++) { const r = i % 2 ? 22 : 56, a = -Math.PI / 2 + i * Math.PI / 5; g.lineTo(64 + Math.cos(a) * r, 64 + Math.sin(a) * r); }
      g.closePath(); g.lineJoin = 'round'; g.lineWidth = 14; g.strokeStyle = '#ffc531'; g.stroke(); g.fill();
    }),
    note: make((g) => { g.fillStyle = '#2b2b3a'; g.font = '900 104px Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('♪', 64, 66); }),
  };
  return FX_TEX;
}

export class Character {
  constructor() {
    this.root = new THREE.Group();
    this.pelvis = new THREE.Group(); this.root.add(this.pelvis);
    this.squash = new THREE.Group(); this.pelvis.add(this.squash);
    this.local = new THREE.Group(); this.squash.add(this.local);
    this.legGroup = new THREE.Group(); this.root.add(this.legGroup);
    this.bodyMesh = new THREE.Mesh(new THREE.BufferGeometry());
    this.local.add(this.bodyMesh);
    this.furGroup = new THREE.Group(); this.local.add(this.furGroup);
    this.halo = null;
    this.glowShell = new THREE.Mesh(new THREE.BufferGeometry()); this.glowShell.visible = false; this.glowShell.renderOrder = 2;
    this.local.add(this.glowShell);
    this.parts = new THREE.Group(); this.local.add(this.parts);
    this.fx = new THREE.Group();
    this.fm = createFaceMaterials();
    this.time = 0;
    this.anim = null;
    this.cur = newPose();
    this.blendFrom = newPose();
    this.blendT = 1;
    this.face = {};
    for (const k of FACE_KEYS) this.face[k] = EMOTIONS.happy[k];
    this.eyeModes = ['base', 'base'];
    this.pendingModes = null;
    this.blinkT = -1; this.blinkClock = 0; this.nextBlink = 2;
    this.particles = []; this.fxTimer = 0;
    this.jiggle = [];
    this.prevY = 0; this.prevPz = 0;
    this.ptr = { x: 0, y: 0 };
    this.baseY = 0;
    this.legH = 0;
    this.arms = []; this.legs = []; this.eyes = []; this.brows = [];
    this.mouthKey = '';
    this.browVis = 0;
    this.faceOff = 0;
  }

  /* ================= building ================= */
  buildBody(st, quality = 'high') {
    const sdf = makeSDF(st);
    const geo = buildBodyGeometry(sdf, quality === 'low' ? 0.07 : 0.032, quality !== 'low');
    this.bodyMesh.geometry.dispose();
    this.bodyMesh.geometry = geo;
    for (const m of this.furGroup.children) m.geometry = geo;
    this.glowShell.geometry = geo;
    this.syncBounds(geo);
    this.sdf = sdf;
    this.box = geo.boundingBox.clone();
    this.surf = new Surface(sdf, this.box);
    this.local.position.y = -this.box.min.y;
  }

  syncBounds(geo) {
    const bb = geo.boundingBox;
    const c = bb.getCenter(new V3());
    for (const mat of [this.bodyMat, this.glowShell.material, this.limbMat, this.partMat]) {
      const u = mat && (mat.userData.uniforms || mat.uniforms);
      if (u && u.uYmin) { u.uYmin.value = bb.min.y; u.uYmax.value = bb.max.y; }
    }
  }

  applyMaterial(st) {
    const kind = normalizeMaterial(st.material);
    this.kind = kind;
    for (const m of [this.bodyMat, this.limbMat, this.partMat]) m && m.dispose();
    for (const s of this.furGroup.children) s.material.dispose();
    if (this.glowShell.material && this.glowShell.material.dispose) this.glowShell.material.dispose();
    this.bodyMat = createBodyMaterial(kind, st.color, true, st.color2);
    this.partMat = createBodyMaterial(kind, st.color, false, st.color2);
    this.limbMat = createBodyMaterial(kind, st.limbSame ? st.color : st.limbColor, false, st.color2);
    this.bodyMesh.material = this.bodyMat;
    this.faceOff = kind === 'plush' ? 0.05 : 0;
    const geo = this.bodyMesh.geometry;

    this.furGroup.clear();
    if (kind === 'plush') for (const m of createFurShells(st.color)) this.furGroup.add(new THREE.Mesh(geo, m));

    // glow: soft halo around the silhouette
    this.glowShell.visible = kind === 'glow';
    this.glowShell.material = kind === 'glow' ? createGlowShell(st.color, st.color2) : new THREE.MeshBasicMaterial();

    // face ink: tinted strokes for the glow look, near-black otherwise
    const ink = kind === 'glow' ? new THREE.Color(st.color).lerp(new THREE.Color(st.color2), 0.3).multiplyScalar(0.55) : new THREE.Color(0x15151c);
    this.fm.black.color.copy(ink);
    this.fm.mouth.color.copy(kind === 'glow' ? ink : new THREE.Color(0x3b1422));
    this.fm.black.transparent = kind === 'glow'; this.fm.black.opacity = kind === 'glow' ? 0.85 : 1;

    if (this.box) this.syncBounds(geo);
    const fix = (o) => {
      if (o.userData.mat === 'limb') o.material = this.limbMat;
      if (o.userData.mat === 'part') o.material = this.partMat;
    };
    this.parts.traverse(fix);
    this.legGroup.traverse(fix);
    this.syncTransmission();
  }

  // A transmissive (glass) body refracts every opaque object around it, which shows a mirrored
  // second copy of the face, limbs and accessories on the glass. three.js leaves transparent
  // objects out of that refraction pass, so for glass the extra parts are flagged transparent.
  syncTransmission() {
    // glass and glow are both transmissive
    const refractive = this.kind === 'glass' || this.kind === 'glow';
    const visit = (o) => {
      if (!o.isMesh || !o.material) return;
      const m = o.material;
      if (m.transmission > 0) return; // transmissive parts are already left out of the pass
      const want = refractive || m.opacity < 1;
      if (m.transparent !== want) { m.transparent = want; m.needsUpdate = true; }
    };
    this.parts.traverse(visit);
    this.legGroup.traverse(visit);
  }

  limbMesh(geo) { const m = mesh(geo, this.limbMat); m.userData.mat = 'limb'; return m; }
  partMesh(geo) { const m = mesh(geo, this.partMat); m.userData.mat = 'part'; return m; }

  buildParts(st) {
    const disposeTree = (g) => g.traverse((o) => { if (o.geometry && o !== this.mouthMesh) o.geometry.dispose(); });
    disposeTree(this.parts); disposeTree(this.legGroup);
    if (this.mouthMesh) this.mouthMesh.geometry.dispose();
    this.parts.clear(); this.legGroup.clear();
    this.jiggle = [];
    const box = this.box, H = box.max.y - box.min.y;
    const L = this.L = {};
    L.es = st.eyeSize;
    L.eyeY = box.min.y + H * st.faceY;
    L.eyeDX = st.eyeSpacing * 0.5;
    L.mouthY = L.eyeY - (0.1 + 0.22 * st.mouthGap) * Math.max(0.85, st.eyeSize * 0.9);
    this.buildEyes(st);
    this.buildBrows(st);
    this.buildMouth(st);
    this.buildArms(st);
    this.buildLegs(st);
    this.buildAccessories(st);
    this.mouthKey = '';
    this.syncTransmission();
  }

  buildEyes(st) {
    const fm = this.fm, s = st.eyeSize;
    this.eyes = [];
    for (const side of [1, -1]) {
      const g = new THREE.Group(); this.parts.add(g);
      const base = new THREE.Group();
      let pupil = null;
      const shine = (parent, x, y, z, r) => {
        if (!st.shine) return;
        const h = mesh(new THREE.SphereGeometry(r, 12, 8), fm.shine, false);
        h.position.set(x, y, z); parent.add(h);
      };
      switch (st.eyes) {
        case 'dots': {
          const m = mesh(new THREE.SphereGeometry(0.066 * s, 28, 18), fm.black, false);
          m.scale.set(1, 1.2, 0.55); base.add(m);
          shine(base, 0.022 * s, 0.035 * s, 0.03 * s, 0.017 * s);
          break;
        }
        case 'googly': {
          const w = mesh(new THREE.SphereGeometry(0.13 * s, 36, 24), fm.white);
          w.scale.set(1, 1.05, 0.6); base.add(w);
          pupil = new THREE.Group();
          const p = mesh(new THREE.SphereGeometry(0.066 * s, 28, 18), fm.black, false);
          p.scale.set(1, 1, 0.5); pupil.add(p);
          shine(pupil, 0.024 * s, 0.026 * s, 0.03 * s, 0.017 * s);
          pupil.position.z = 0.058 * s;
          base.add(pupil);
          break;
        }
        case 'ovals': {
          const m = mesh(new THREE.SphereGeometry(0.068 * s, 28, 18), fm.white, false);
          m.scale.set(0.75, 1.3, 0.45); base.add(m);
          break;
        }
        case 'lines': {
          const m = mesh(new THREE.CapsuleGeometry(0.022 * s, 0.085 * s, 6, 12), fm.black, false);
          m.scale.z = 0.6; base.add(m);
          break;
        }
        case 'pixel': {
          const m = mesh(new RoundedBoxGeometry(0.085 * s, 0.15 * s, 0.04 * s, 3, 0.02 * s), fm.black, false);
          base.add(m);
          shine(base, 0.016 * s, 0.045 * s, 0.022 * s, 0.014 * s);
          break;
        }
      }
      const happy = mesh(new THREE.TorusGeometry(0.055 * s, 0.017 * s, 10, 24, Math.PI), fm.black, false);
      happy.position.y = -0.025 * s;
      const sleep = mesh(new THREE.TorusGeometry(0.055 * s, 0.017 * s, 10, 24, Math.PI), fm.black, false);
      sleep.rotation.z = Math.PI; sleep.position.y = 0.015 * s;
      const heart = mesh(heartGeo(0.075 * s), fm.pink, false);
      heart.position.z = 0.01;
      const x = new THREE.Group();
      for (const a of [Math.PI / 4, -Math.PI / 4]) {
        const c = mesh(new THREE.CapsuleGeometry(0.016 * s, 0.1 * s, 6, 10), fm.black, false);
        c.rotation.z = a; c.scale.z = 0.6; x.add(c);
      }
      g.add(base, happy, sleep, heart, x);
      this.eyes.push({ g, side, base, pupil, modes: { base, happy, sleep, heart, x }, none: st.eyes === 'none' });
    }
  }

  buildBrows(st) {
    this.brows = [];
    for (const side of [1, -1]) {
      const g = new THREE.Group();
      const inner = new THREE.Group();
      const m = mesh(new THREE.CapsuleGeometry(0.018 * st.eyeSize, 0.08 * st.eyeSize, 6, 12), this.fm.black, false);
      m.rotation.z = Math.PI / 2; m.scale.z = 0.6;
      inner.add(m); g.add(inner); this.parts.add(g);
      this.brows.push({ g, inner, side });
    }
  }

  buildMouth(st) {
    this.mouthMesh = new THREE.Mesh(new THREE.BufferGeometry(), this.fm.mouth);
    this.mouthMesh.visible = st.mouth;
    this.parts.add(this.mouthMesh);
    this.tongue = mesh(new THREE.SphereGeometry(0.05, 20, 12), this.fm.tongue, false);
    this.tongue.visible = false;
    this.parts.add(this.tongue);
    this.tear = mesh(new THREE.SphereGeometry(0.028, 16, 12), this.fm.tear, false);
    this.tear.visible = false;
    this.parts.add(this.tear);
  }

  buildArms(st) {
    this.arms = [];
    if (st.arms === 'none') return;
    const cfg = st.arms === 'noodle' ? { r: 0.04, l1: 0.3, l2: 0.27, hand: 0.068 } : { r: 0.095, l1: 0.15, l2: 0.13, hand: 0.115 };
    const r = cfg.r * st.limbThick, l1 = cfg.l1 * st.armLength, l2 = cfg.l2 * st.armLength, hr = cfg.hand * st.limbThick;
    const box = this.box;
    const y = box.min.y + (box.max.y - box.min.y) * st.armY;
    this.armRest = st.arms === "noodle" ? 0.3 : 0.5;
    for (const side of [1, -1]) {
      const hit = this.surf.side(y, side);
      const px = hit ? hit.p.x : side * 0.4;
      const shoulder = new THREE.Group();
      shoulder.position.set(px - side * r * 0.15, y, hit ? hit.p.z * 0.5 : 0);
      const up = this.limbMesh(new THREE.CapsuleGeometry(r, l1, 8, 16)); up.position.y = -l1 / 2;
      const elbow = new THREE.Group(); elbow.position.y = -l1;
      const fore = this.limbMesh(new THREE.CapsuleGeometry(r * 0.95, l2, 8, 16)); fore.position.y = -l2 / 2;
      const hand = this.limbMesh(new THREE.SphereGeometry(hr, 24, 16)); hand.position.y = -l2 - hr * 0.25; hand.scale.set(1, 0.95, 0.85);
      elbow.add(fore, hand);
      const joint = this.limbMesh(new THREE.SphereGeometry(r * 1.12, 20, 14));
      shoulder.add(up, elbow, joint);
      this.parts.add(shoulder);
      this.arms.push({ shoulder, elbow, side });
    }
  }

  buildLegs(st) {
    this.legs = []; this.legH = 0;
    if (st.legs === 'none') return;
    const cfg = st.legs === 'thin' ? { r: 0.052, len: 0.36, foot: [0.1, 0.065, 0.15] } : { r: 0.105, len: 0.24, foot: [0.14, 0.09, 0.19] };
    const t = st.limbThick;
    const r = cfg.r * t;
    const legH = cfg.len * st.legLength;
    this.legH = legH;
    const box = this.box;
    const hw = this.surf.halfWidth(box.min.y + Math.min(0.2, (box.max.y - box.min.y) * 0.12));
    const hipX = Math.max(r * 1.3, Math.min(hw * 0.5, 0.36));
    const footH = cfg.foot[1] * t;
    for (const side of [1, -1]) {
      const hb = this.surf.bottom(side * hipX);
      const yb = hb ? hb.p.y : box.min.y;
      const hipY = legH + (yb - box.min.y) + 0.05;
      const hip = new THREE.Group(); hip.position.set(side * hipX, hipY, 0);
      const len = Math.max(0.02, hipY - footH);
      const leg = this.limbMesh(new THREE.CapsuleGeometry(r, len, 8, 16)); leg.position.y = -len / 2;
      const foot = this.limbMesh(new THREE.SphereGeometry(1, 28, 18));
      foot.scale.set(cfg.foot[0] * t, cfg.foot[1] * t, cfg.foot[2] * t);
      foot.position.set(0, -hipY + footH, cfg.foot[2] * t * 0.25);
      const joint = this.limbMesh(new THREE.SphereGeometry(r * 1.15, 20, 14));
      hip.add(leg, foot, joint);
      this.legGroup.add(hip);
      this.legs.push({ hip, side });
    }
  }

  buildAccessories(st) {
    // accessories use the same material type as the body, each in its own colour
    for (const m of this.accMats || []) m.dispose();
    this.accMats = [];
    const cache = {};
    const accM = (color) => {
      if (cache[color]) return cache[color];
      const m = createBodyMaterial(this.kind || 'matte', color, false, st.color2);
      const u = m.userData.uniforms;
      if (u && u.uYmin) { u.uYmin.value = -0.3; u.uYmax.value = 0.4; }
      this.accMats.push(m);
      return (cache[color] = m);
    };
    const GOLD = accM('#ffc53d'), LEAF = accM('#5ccc4a'), LENS = accM('#24242c');
    const A = accM(st.accColor);
    // double-sided transmissive (glass/glow) parts get drawn into the refraction buffer and
    // show up mirrored on the body, so they stay single-sided
    const twoSided = (m) => { if (!(m.transmission > 0)) m.side = THREE.DoubleSide; return m; };
    twoSided(A);
    const G = accM(st.glassColor);
    const S = this.surf, box = this.box, k = st.accSize, L = this.L, fm = this.fm;
    const top = S.top(0) || { p: new V3(0, box.max.y, 0), n: Y.clone() };
    const hw = S.halfWidth(top.p.y - 0.22);
    const R = Math.max(0.3, Math.min(0.68, hw * 1.05)) * k;
    const onTop = (obj, hit, upBlend = 1.2) => {
      const n = hit.n.clone().addScaledVector(Y, upBlend).normalize();
      obj.position.copy(hit.p);
      obj.quaternion.setFromUnitVectors(Y, n);
      this.parts.add(obj);
    };
    const wobbly = (obj, gain = 1) => { this.jiggle.push({ obj, a: 0, v: 0, gain }); return obj; };

    /* ---- head ---- */
    switch (st.head) {
      case 'beret': {
        const g = new THREE.Group();
        const c = mesh(new THREE.SphereGeometry(R * 1.12, 48, 24), A); c.scale.set(1, 0.36, 1); c.position.y = R * 0.06;
        const nub = mesh(new THREE.SphereGeometry(R * 0.13, 16, 12), A); nub.position.y = R * 0.06 + R * 1.12 * 0.34;
        g.add(c, nub);
        onTop(g, top); g.rotateZ(-0.22); g.rotateX(-0.08);
        break;
      }
      case 'cap': {
        const g = new THREE.Group();
        const dome = mesh(new THREE.SphereGeometry(R * 1.02, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2), A); dome.scale.y = 0.8; dome.position.y = -R * 0.28;
        const brim = mesh(new THREE.CylinderGeometry(R * 0.95, R * 0.95, 0.035, 40), A); brim.scale.set(0.85, 1, 0.8); brim.position.set(0, -R * 0.26, R * 0.72);
        const btn = mesh(new THREE.SphereGeometry(R * 0.1, 16, 12), A); btn.position.y = -R * 0.28 + R * 1.02 * 0.8;
        g.add(dome, brim, btn);
        onTop(g, top); g.rotateY(-0.25);
        break;
      }
      case 'crown': {
        const g = new THREE.Group();
        const gold = twoSided(GOLD);
        const band = mesh(new THREE.CylinderGeometry(R * 0.72, R * 0.78, R * 0.42, 48, 1, true), gold); band.position.y = R * 0.08;
        g.add(band);
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2;
          const sp = mesh(new THREE.ConeGeometry(R * 0.16, R * 0.38, 16), GOLD);
          sp.position.set(Math.sin(a) * R * 0.72, R * 0.08 + R * 0.21 + R * 0.17, Math.cos(a) * R * 0.72);
          const b = mesh(new THREE.SphereGeometry(R * 0.06, 12, 8), GOLD); b.position.copy(sp.position); b.position.y += R * 0.2;
          g.add(sp, b);
        }
        const jewel = mesh(new THREE.SphereGeometry(R * 0.08, 16, 12), accM('#ff3d6e')); jewel.position.set(0, R * 0.08, R * 0.77); jewel.scale.z = 0.6;
        g.add(jewel);
        onTop(g, top); g.rotateZ(0.12);
        break;
      }
      case 'party': {
        const g = new THREE.Group();
        const cone = mesh(new THREE.ConeGeometry(R * 0.55, R * 1.4, 40), A); cone.position.y = R * 0.6;
        const pom = mesh(new THREE.SphereGeometry(R * 0.17, 20, 14), accM('#ffffff')); pom.position.y = R * 1.32;
        g.add(cone, pom);
        onTop(g, top); g.rotateZ(0.18);
        break;
      }
      case 'sprout': {
        const g = new THREE.Group(); const w = new THREE.Group(); g.add(w);
        const curve = new THREE.CatmullRomCurve3([new V3(0, -0.05, 0), new V3(0.02, 0.12, 0), new V3(-0.015, 0.24, 0)].map(v => v.multiplyScalar(k)));
        w.add(mesh(new THREE.TubeGeometry(curve, 16, 0.022 * k, 10), LEAF));
        for (const sd of [1, -1]) {
          const lf = mesh(new THREE.SphereGeometry(0.1 * k, 20, 12), LEAF);
          lf.scale.set(1, 0.22, 0.5); lf.position.set(sd * 0.09 * k, 0.26 * k, 0); lf.rotation.z = sd * 0.45;
          w.add(lf);
        }
        onTop(g, top); wobbly(w, 1.3);
        break;
      }
      case 'antenna': {
        const g = new THREE.Group(); const w = new THREE.Group(); g.add(w);
        const st2 = mesh(new THREE.CylinderGeometry(0.016 * k, 0.016 * k, 0.34 * k, 10), accM('#2a2a33')); st2.position.y = 0.14 * k;
        const ball = mesh(new THREE.SphereGeometry(0.07 * k, 20, 14), A); ball.position.y = 0.33 * k;
        w.add(st2, ball);
        onTop(g, top); wobbly(w, 1.6);
        break;
      }
      case 'bunny': {
        for (const side of [1, -1]) {
          const h = S.top(side * Math.min(0.18, hw * 0.5)) || top;
          const g = new THREE.Group(); const w = new THREE.Group(); g.add(w);
          const ear = this.partMesh(new THREE.CapsuleGeometry(0.085 * k, 0.42 * k, 8, 16)); ear.position.y = 0.24 * k; ear.scale.z = 0.7;
          w.add(ear);
          onTop(g, h, 0.8); g.rotateZ(-side * 0.14);
          wobbly(w, 1);
        }
        break;
      }
      case 'cat': {
        for (const side of [1, -1]) {
          const h = S.top(side * Math.min(0.3, hw * 0.55)) || top;
          const g = new THREE.Group();
          const ear = this.partMesh(new THREE.ConeGeometry(0.15 * k, 0.28 * k, 28)); ear.position.y = 0.1 * k; ear.scale.z = 0.7;
          g.add(ear);
          onTop(g, h, 0.4); g.rotateZ(-side * 0.15);
        }
        break;
      }
      case 'bow': {
        const h = S.top(hw * 0.45) || top;
        const g = new THREE.Group();
        for (const sd of [1, -1]) {
          const lobe = mesh(new THREE.SphereGeometry(0.1 * k, 24, 16), A);
          lobe.scale.set(1.2, 0.75, 0.5); lobe.position.x = sd * 0.11 * k; lobe.rotation.z = sd * 0.35;
          g.add(lobe);
        }
        const knot = mesh(new THREE.SphereGeometry(0.048 * k, 16, 12), A); g.add(knot);
        onTop(g, h, 0.3); g.rotateZ(-0.35); g.translateY(0.03);
        break;
      }
      case 'halo': {
        const g = new THREE.Group();
        const ring = mesh(new THREE.TorusGeometry(R * 0.7, 0.03, 14, 56), GOLD); ring.rotation.x = Math.PI / 2;
        g.add(ring);
        g.position.copy(top.p); g.position.y += 0.25;
        this.parts.add(g);
        this.halo = g; this.haloY = g.position.y;
        break;
      }
    }
    if (st.head !== 'halo') this.halo = null;

    /* ---- eyewear ---- */
    if (st.eyewear !== 'none') {
      const rr = 0.1 * L.es + 0.03;
      const rims = [];
      for (const side of [1, -1]) {
        const hit = S.frontSafe(side * L.eyeDX, L.eyeY);
        const g = new THREE.Group();
        let inner = rr, outer = rr;
        if (st.eyewear === 'round') {
          g.add(mesh(new THREE.TorusGeometry(rr, 0.017, 12, 44), G));
        } else if (st.eyewear === 'sun') {
          g.add(mesh(new THREE.TorusGeometry(rr * 1.08, 0.024, 12, 44), G));
          const lens = mesh(new THREE.CylinderGeometry(rr * 1.08, rr * 1.08, 0.02, 44), LENS); lens.rotation.x = Math.PI / 2;
          g.add(lens);
          inner = outer = rr * 1.08;
        } else if (st.eyewear === 'geek') {
          const w = rr * 2.5, h = rr * 2.0;
          const shp = roundedRect(w, h, rr * 0.5);
          shp.holes.push(roundedRect(w - 0.07, h - 0.07, rr * 0.38));
          const geo = new THREE.ExtrudeGeometry(shp, { depth: 0.02, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.008, bevelSegments: 3, curveSegments: 10 });
          geo.center();
          g.add(mesh(geo, G));
          inner = outer = w / 2;
        }
        placeOnSurface(g, hit, 0.075 + 0.02 * L.es + this.faceOff);
        // keep glasses level
        const fwd = hit.n.clone(); fwd.y *= 0.4; fwd.normalize();
        g.quaternion.setFromUnitVectors(Z, fwd);
        this.parts.add(g);
        rims.push({ g, side, inner, outer });
      }
      const edge = (r, sx) => r.g.position.clone().add(new V3(sx, 0, 0).applyQuaternion(r.g.quaternion));
      const pA = edge(rims[0], -rims[0].inner), pB = edge(rims[1], rims[1].inner);
      const mid = pA.clone().add(pB).multiplyScalar(0.5); mid.z += 0.03; mid.y += 0.02;
      this.parts.add(mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(pA, mid, pB), 12, 0.016, 8), G));
      for (const r of rims) {
        const o = edge(r, r.side * r.outer);
        const sh = S.side(L.eyeY, r.side);
        if (!sh) continue;
        const end = sh.p.clone(); end.x += r.side * 0.012;
        const m1 = o.clone().lerp(end, 0.5); m1.x += r.side * 0.04;
        this.parts.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([o, m1, end]), 16, 0.014, 8), G));
      }
    }

    /* ---- neck ---- */
    const ny = L.mouthY - 0.14 * k;
    if (st.neck === 'tie') {
      const knot = new THREE.Shape();
      knot.moveTo(-0.055, 0); knot.lineTo(0.055, 0); knot.lineTo(0.04, -0.075); knot.lineTo(-0.04, -0.075); knot.closePath();
      const blade = new THREE.Shape();
      blade.moveTo(-0.035, -0.088); blade.lineTo(0.035, -0.088); blade.lineTo(0.075, -0.33); blade.lineTo(0, -0.41); blade.lineTo(-0.075, -0.33); blade.closePath();
      const opts = { depth: 0.02, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 4, curveSegments: 6 };
      const g = new THREE.Group(); const inner = new THREE.Group(); g.add(inner);
      inner.add(mesh(new THREE.ExtrudeGeometry(knot, opts), A), mesh(new THREE.ExtrudeGeometry(blade, opts), A));
      inner.scale.setScalar(k); inner.position.y = 0.2 * k; inner.position.z = -0.016;
      const hit = S.frontSafe(0, ny - 0.2 * k);
      placeOnSurface(g, hit, 0.035);
      this.parts.add(g);
    } else if (st.neck === 'bowtie') {
      const g = new THREE.Group();
      for (const sd of [1, -1]) {
        const c = mesh(new THREE.ConeGeometry(0.075 * k, 0.13 * k, 28), A);
        c.rotation.z = sd * Math.PI / 2; c.position.x = -sd * 0.065 * k; c.scale.z = 0.5;
        g.add(c);
      }
      g.add(mesh(new THREE.SphereGeometry(0.038 * k, 16, 12), A));
      placeOnSurface(g, S.frontSafe(0, ny), 0.035);
      this.parts.add(g);
    } else if (st.neck === 'scarf') {
      const y = ny - 0.02;
      const pts = [];
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2;
        const dir = new V3(Math.sin(a), 0, Math.cos(a));
        const h = S.hit(new V3(dir.x * 3, y, dir.z * 3), dir.clone().negate(), 3.5);
        if (h) pts.push(h.p.addScaledVector(dir, 0.045 * k));
      }
      if (pts.length > 6) {
        const curve = new THREE.CatmullRomCurve3(pts, true);
        this.parts.add(mesh(new THREE.TubeGeometry(curve, 96, 0.075 * k, 14, true), A));
        const tail = mesh(new THREE.CapsuleGeometry(0.06 * k, 0.26 * k, 8, 14), A);
        const p0 = pts[2];
        tail.position.set(p0.x, y - 0.17 * k, p0.z + 0.03); tail.rotation.z = 0.15; tail.scale.z = 0.6;
        this.parts.add(tail);
      }
    }
  }

  /* ================= runtime ================= */
  setAnim(name) {
    if (this.anim === name) return;
    if (this.anim !== null) {
      for (const k of POSE_KEYS) this.blendFrom[k] = this.cur[k];
      this.blendT = 0;
    }
    this.anim = name;
  }

  update(realDt, st, pointer) {
    const dt = Math.min(realDt, 1 / 20);
    this.setAnim(st.anim);
    this.time += dt * st.speed;
    const t = this.time;
    const P = newPose();
    computePose(st.anim, t, P);

    // cursor follow (smoothed)
    const kp = 1 - Math.exp(-dt * 6);
    const tx = st.follow && pointer.active ? pointer.x : 0, ty = st.follow && pointer.active ? pointer.y : 0;
    this.ptr.x += (tx - this.ptr.x) * kp; this.ptr.y += (ty - this.ptr.y) * kp;
    if (st.follow) {
      P.lookX = clamp(P.lookX * 0.35 + this.ptr.x * 1.3);
      P.lookY = clamp(P.lookY * 0.35 + this.ptr.y * 1.1);
      P.rootRotY += this.ptr.x * 0.3;
      P.px -= this.ptr.y * 0.06;
    }

    // blend between animations
    this.blendT = Math.min(1, this.blendT + dt / 0.4);
    const w = ease(this.blendT);
    const c = this.cur;
    for (const k of POSE_KEYS) {
      const a = this.blendFrom[k], b = P[k];
      c[k] = k === 'rootRotY' ? a + wrapPi(b - a) * w : a + (b - a) * w;
    }

    // face targets
    const E = EMOTIONS[st.emotion] || EMOTIONS.neutral;
    const kf = 1 - Math.exp(-dt * 10);
    for (const k of FACE_KEYS) this.face[k] += ((E[k] ?? 0) - this.face[k]) * kf;

    // eye modes & blinking
    const want = P.forceEyes ? [P.forceEyes, P.forceEyes] : E.eyes;
    if ((want[0] !== this.eyeModes[0] || want[1] !== this.eyeModes[1]) && !this.pendingModes) this.pendingModes = want.slice();
    this.blinkClock += realDt;
    if (this.blinkT < 0 && (this.pendingModes || (st.blink && this.blinkClock > this.nextBlink))) this.blinkT = 0;
    let blinkK = 1;
    if (this.blinkT >= 0) {
      this.blinkT += realDt;
      const ph = this.blinkT / 0.17;
      if (ph >= 0.5 && this.pendingModes) { this.eyeModes = this.pendingModes; this.pendingModes = null; }
      blinkK = Math.abs(1 - 2 * Math.min(1, ph));
      if (ph >= 1) { this.blinkT = -1; this.blinkClock = 0; this.nextBlink = 1.8 + Math.random() * 3.5; }
    }

    /* apply skeleton */
    this.root.position.y = this.baseY + c.rootY;
    this.root.rotation.y = c.rootRotY;
    this.pelvis.position.y = this.legH;
    this.pelvis.rotation.set(c.px, c.py, c.pz);
    const s = Math.max(0.5, c.squash);
    this.squash.scale.set(1 / Math.sqrt(s), s, 1 / Math.sqrt(s));
    for (const arm of this.arms) {
      const a = arm.side === 1;
      const z = a ? c.aZ : c.bZ, x = a ? c.aX : c.bX, e = a ? c.aE : c.bE;
      arm.shoulder.rotation.set(x, 0, arm.side * (this.armRest + z));
      const raise = clamp(z / 1.6, 0, 1);
      arm.elbow.rotation.set(-e * (1 - raise), 0, arm.side * e * raise);
    }
    for (const leg of this.legs) leg.hip.rotation.x = leg.side === 1 ? c.lA : c.lB;

    /* face */
    this.updateEyes(st, c, blinkK * c.eyeOpen, t);
    this.updateBrows(st, dt);
    this.updateMouth(st, c);
    this.updateTear(E, t);

    /* secondary motion */
    const wy = this.root.position.y;
    const vy = (wy - this.prevY) / dt, vz = (c.pz - this.prevPz) / dt;
    this.prevY = wy; this.prevPz = c.pz;
    for (const j of this.jiggle) {
      const target = clamp((-vy * 0.25 - vz * 0.25) * j.gain, -0.7, 0.7);
      j.v += ((target - j.a) * 160 - j.v * 10) * dt;
      j.a += j.v * dt;
      j.obj.rotation.x = j.a * 0.8;
      j.obj.rotation.z = -j.a * 0.4 + Math.sin(t * 2.1) * 0.03;
    }
    if (this.halo) this.halo.position.y = this.haloY + Math.sin(t * 2.2) * 0.03;

    this.updateParticles(realDt, P.fx || E.fx);
  }

  updateEyes(st, c, open, t) {
    const L = this.L, s = L.es;
    for (const e of this.eyes) {
      const mode = this.eyeModes[e.side === 1 ? 0 : 1];
      const shift = e.pupil ? 0.012 : 0.028;
      const hit = this.surf.frontSafe(e.side * L.eyeDX + c.lookX * shift, L.eyeY + c.lookY * shift * 0.8);
      placeOnSurface(e.g, hit, 0.004 + this.faceOff);
      for (const k in e.modes) e.modes[k].visible = !e.none && k === mode;
      const sc = this.face.scale;
      if (mode === 'base') e.g.scale.set(sc, sc * Math.max(0.06, this.face.open * open), sc);
      else if (mode === 'heart') e.g.scale.setScalar(1 + 0.1 * Math.sin(t * 9));
      else e.g.scale.set(1, Math.max(0.15, open), 1);
      if (e.pupil) e.pupil.position.set(c.lookX * 0.045 * s, c.lookY * 0.04 * s, 0.058 * s);
    }
  }

  updateBrows(st, dt) {
    const f = this.face, L = this.L;
    const want = st.brows === 'on' ? 1 : st.brows === 'off' ? 0 : (Math.abs(f.brow) > 0.2 || f.browLift > 0.045 ? 1 : 0);
    this.browVis += (want - this.browVis) * (1 - Math.exp(-dt * 10));
    for (const b of this.brows) {
      const hit = this.surf.frontSafe(b.side * (L.eyeDX + 0.01), L.eyeY + 0.125 * L.es * f.scale + f.browLift);
      placeOnSurface(b.g, hit, 0.006 + this.faceOff);
      b.inner.rotation.z = b.side * f.brow;
      b.g.scale.setScalar(Math.max(0.001, this.browVis));
      b.g.visible = this.browVis > 0.02;
    }
  }

  updateMouth(st, c) {
    const f = this.face, L = this.L, ms = st.mouthSize;
    this.mouthMesh.visible = st.mouth;
    if (!st.mouth) { this.tongue.visible = false; return; }
    const mo = clamp(f.mo + c.mouth, 0, 1.1);
    const key = [f.c, mo, f.w, f.smirk, f.wavy].map((v) => v.toFixed(3)).join('|');
    if (key === this.mouthKey) return;
    this.mouthKey = key;
    const N = 28, hw = 0.1 * ms * f.w, th = 0.026 * ms;
    const pos = new Float32Array((N + 1) * 2 * 3);
    let bottomMid = null;
    for (let i = 0; i <= N; i++) {
      const u = -1 + (2 * i) / N;
      const x = u * hw + f.smirk * 0.025 * ms;
      const y = L.mouthY + f.c * 0.055 * ms * (u * u - 0.35) + f.smirk * 0.045 * ms * u + f.wavy * 0.016 * ms * Math.sin(u * Math.PI * 3);
      const env = Math.sqrt(Math.max(0, 1 - u * u));
      const ht = th * 0.5 * Math.max(env, 0.25);
      const open = mo * 0.15 * ms * Math.pow(env, 0.9);
      const yt = y + ht, yb = y - ht - open;
      const zt = this.surf.frontSafe(x, yt).p.z + 0.007 + this.faceOff;
      const zb = this.surf.frontSafe(x, yb).p.z + 0.007 + this.faceOff;
      pos.set([x, yt, zt, x, yb, zb], i * 6);
      if (i === N / 2) bottomMid = [x, yb, y - ht];
    }
    const idx = [];
    for (let i = 0; i < N; i++) {
      const a = 2 * i, b = a + 1, cc = a + 2, d = a + 3;
      idx.push(a, b, cc, cc, b, d);
    }
    const g = this.mouthMesh.geometry;
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    g.computeBoundingSphere();

    const showTongue = f.tongue > 0.5 && mo > 0.2;
    this.tongue.visible = showTongue;
    if (showTongue) {
      const [x, yb, ytop] = bottomMid;
      const ty = yb + (ytop - yb) * 0.32;
      placeOnSurface(this.tongue, this.surf.frontSafe(x + 0.01, ty), 0.012 + this.faceOff);
      const ts = ms * (0.55 + mo * 0.5);
      this.tongue.scale.set(ts * 1.1, ts * 0.75, ts * 0.35);
    }
  }

  updateTear(E, t) {
    if (!E.tear) { this.tear.visible = false; return; }
    const L = this.L;
    const ph = (t * 0.45) % 1;
    const hit = this.surf.frontSafe(L.eyeDX + 0.04 * L.es, L.eyeY - 0.08 * L.es - ph * 0.32);
    placeOnSurface(this.tear, hit, 0.02 + this.faceOff);
    const a = ph < 0.15 ? ph / 0.15 : ph > 0.8 ? (1 - ph) / 0.2 : 1;
    this.tear.scale.set(a, a * 1.35, a * 0.7);
    this.tear.visible = true;
  }

  updateParticles(dt, type) {
    this.fxTimer += dt;
    if (type && this.fxTimer > 0.5) {
      this.fxTimer = 0;
      const tex = fxTextures()[type];
      const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
      const sp = new THREE.Sprite(mat);
      const p = new V3((Math.random() - 0.3) * 0.5, this.box.max.y + 0.05, 0);
      this.local.localToWorld(p);
      sp.position.copy(p);
      sp.userData = { age: 0, life: 2.2, vx: 0.15 + Math.random() * 0.2, ph: Math.random() * 6, s: 0.16 + Math.random() * 0.08 };
      this.fx.add(sp); this.particles.push(sp);
    }
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const sp = this.particles[i], u = sp.userData;
      u.age += dt;
      const k = u.age / u.life;
      sp.position.y += dt * 0.42;
      sp.position.x += dt * u.vx + Math.sin(u.age * 3 + u.ph) * 0.003;
      sp.material.opacity = k < 0.15 ? k / 0.15 : Math.max(0, 1 - (k - 0.15) / 0.85);
      sp.material.rotation = Math.sin(u.age * 2 + u.ph) * 0.3;
      sp.scale.setScalar(u.s * (0.6 + Math.min(1, k * 3) * 0.6));
      if (k >= 1) { this.fx.remove(sp); sp.material.dispose(); this.particles.splice(i, 1); }
    }
  }

  clearParticles() {
    for (const sp of this.particles) { this.fx.remove(sp); sp.material.dispose(); }
    this.particles = [];
  }
}
