import * as THREE from 'three';

/* Procedural clay micro-surface: fingerprints, dents and grain,
   applied as derivative bump mapping in object space (no UVs needed). */
const CLAY_GLSL = /* glsl */`
uniform float uBump;
uniform float uFreq;
varying vec3 vObjPos;
float clayHash(vec3 p){ p = fract(p*0.3183099 + 0.1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float clayNoise(vec3 x){
  vec3 i = floor(x); vec3 f = fract(x); f = f*f*(3.0-2.0*f);
  return mix(mix(mix(clayHash(i), clayHash(i+vec3(1,0,0)), f.x), mix(clayHash(i+vec3(0,1,0)), clayHash(i+vec3(1,1,0)), f.x), f.y),
             mix(mix(clayHash(i+vec3(0,0,1)), clayHash(i+vec3(1,0,1)), f.x), mix(clayHash(i+vec3(0,1,1)), clayHash(i+vec3(1,1,1)), f.x), f.y), f.z);
}
float clayHeight(vec3 p){
  float n = clayNoise(p*uFreq)*0.5 + clayNoise(p*uFreq*2.6)*0.28 + clayNoise(p*uFreq*7.1)*0.14;
  float dent = clayNoise(p*uFreq*0.33 + 3.7);
  n -= smoothstep(0.58, 0.85, dent) * 0.9;
  return n;
}
vec3 clayPerturb(vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float fd){
  vec3 vSigmaX = dFdx(surf_pos);
  vec3 vSigmaY = dFdy(surf_pos);
  vec3 R1 = cross(vSigmaY, surf_norm);
  vec3 R2 = cross(surf_norm, vSigmaX);
  float fDet = dot(vSigmaX, R1) * fd;
  vec3 vGrad = sign(fDet) * (dHdxy.x * R1 + dHdxy.y * R2);
  return normalize(abs(fDet) * surf_norm - vGrad);
}
`;

function addClaySurface(mat, bump, freq) {
  const uniforms = { uBump: { value: bump }, uFreq: { value: freq } };
  mat.userData.uniforms = uniforms;
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vObjPos;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvObjPos = position;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\n' + CLAY_GLSL)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        if (uBump > 0.0) {
          float hC = clayHeight(vObjPos);
          normal = clayPerturb(-vViewPosition, normal, vec2(dFdx(hC), dFdy(hC)) * uBump, faceDirection);
        }`);
  };
  mat.customProgramCacheKey = () => 'clay-surface';
  return mat;
}

export const MATERIALS = {
  clay:   { label: 'Пластилин' },
  vinyl:  { label: 'Винил' },
  glossy: { label: 'Глянец' },
  plush:  { label: 'Плюш' },
};

export function createBodyMaterial(kind, color, vertexColors = true) {
  const c = new THREE.Color(color);
  let m;
  switch (kind) {
    case 'vinyl':
      m = new THREE.MeshPhysicalMaterial({ color: c, vertexColors, roughness: 0.4, clearcoat: 0.4, clearcoatRoughness: 0.3, sheen: 0.3, sheenRoughness: 0.5, sheenColor: new THREE.Color(0xffffff) });
      return addClaySurface(m, 0.0012, 6);
    case 'glossy':
      m = new THREE.MeshPhysicalMaterial({ color: c, vertexColors, roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.06, iridescence: 0.08 });
      return addClaySurface(m, 0, 1);
    case 'plush':
      m = new THREE.MeshPhysicalMaterial({ color: c.clone().multiplyScalar(0.8), vertexColors, roughness: 1, sheen: 1, sheenRoughness: 0.45, sheenColor: c.clone().lerp(new THREE.Color(0xffffff), 0.45) });
      return addClaySurface(m, 0.006, 60);
    case 'clay':
    default:
      m = new THREE.MeshPhysicalMaterial({ color: c, vertexColors, roughness: 0.6, clearcoat: 0.12, clearcoatRoughness: 0.55, sheen: 0.35, sheenRoughness: 0.8, sheenColor: c.clone().lerp(new THREE.Color(0xffffff), 0.6) });
      return addClaySurface(m, 0.0045, 7);
  }
}

/* Fur shells for the plush material */
const FUR_GLSL = /* glsl */`
uniform float uLayer;
uniform float uDensity;
varying vec3 vObjPos;
float furHash(vec3 p){ p = fract(p*0.3183099 + 0.1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
`;
export function createFurShells(color, count = 16, length = 0.065) {
  const c = new THREE.Color(color);
  const mats = [];
  for (let i = 1; i <= count; i++) {
    const layer = i / count;
    const m = new THREE.MeshStandardMaterial({ color: c, roughness: 1, vertexColors: true });
    const uniforms = { uLayer: { value: layer }, uLen: { value: length }, uDensity: { value: 110 } };
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, uniforms);
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nuniform float uLayer; uniform float uLen; varying vec3 vObjPos;')
        .replace('#include <begin_vertex>', `#include <begin_vertex>
          vObjPos = position;
          transformed += normal * uLayer * uLen;
          transformed.y -= uLayer * uLayer * uLen * 0.35;`);
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\n' + FUR_GLSL)
        .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
          {
            vec3 fp = vObjPos * uDensity;
            vec3 cell = floor(fp);
            vec3 f = fract(fp) - 0.5;
            float rnd = furHash(cell);
            float r = (1.0 - uLayer) * (0.55 + 0.5 * rnd);
            if (length(f) > r || rnd < uLayer * 0.35) discard;
          }`)
        .replace('#include <color_fragment>', `#include <color_fragment>
          diffuseColor.rgb *= mix(0.55, 1.12, uLayer);`);
    };
    m.customProgramCacheKey = () => 'fur-shell';
    mats.push(m);
  }
  return mats;
}

/* Face & accessory materials */
export function createFaceMaterials() {
  return {
    black: new THREE.MeshPhysicalMaterial({ color: 0x15151c, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.08 }),
    white: new THREE.MeshPhysicalMaterial({ color: 0xfafafa, roughness: 0.32, clearcoat: 0.6, clearcoatRoughness: 0.2 }),
    shine: new THREE.MeshBasicMaterial({ color: 0xffffff }),
    mouth: new THREE.MeshStandardMaterial({ color: 0x3b1422, roughness: 0.55, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
    tongue: new THREE.MeshPhysicalMaterial({ color: 0xff6f8e, roughness: 0.45, clearcoat: 0.5 }),
    pink: new THREE.MeshPhysicalMaterial({ color: 0xff3d6e, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.1 }),
    blush: new THREE.MeshStandardMaterial({ color: 0xff6f9c, roughness: 1, transparent: true, opacity: 0.5, depthWrite: false }),
    tear: new THREE.MeshPhysicalMaterial({ color: 0x8fd3ff, roughness: 0.05, clearcoat: 1, transparent: true, opacity: 0.85 }),
  };
}

export function createAccMaterial(color) {
  return addClaySurface(new THREE.MeshPhysicalMaterial({ color: new THREE.Color(color), roughness: 0.5, clearcoat: 0.3, clearcoatRoughness: 0.4, sheen: 0.3, sheenColor: new THREE.Color(0xffffff) }), 0.003, 7);
}
export const GOLD = new THREE.MeshPhysicalMaterial({ color: 0xffc53d, metalness: 1, roughness: 0.25, clearcoat: 0.6 });
export const LENS = new THREE.MeshPhysicalMaterial({ color: 0x101016, roughness: 0.05, clearcoat: 1, metalness: 0.2 });
export const LEAF = addClaySurface(new THREE.MeshPhysicalMaterial({ color: 0x5ccc4a, roughness: 0.5, clearcoat: 0.2 }), 0.003, 7);
