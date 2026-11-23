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

/* Fresnel rim light (bright glassy edge). */
function addRim(mat, color, strength, power) {
  const uniforms = { uRimColor: { value: color }, uRim: { value: strength }, uRimPow: { value: power } };
  mat.userData.uniforms = uniforms;
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>' + String.fromCharCode(10) + 'uniform vec3 uRimColor; uniform float uRim; uniform float uRimPow;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        totalEmissiveRadiance += uRimColor * pow(1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0), uRimPow) * uRim;`);
  };
  mat.customProgramCacheKey = () => 'rim';
  return mat;
}

/* Candy plastic: saturated core, translucent lighter edges (light passing through the
   thin rim), soft inner glow. Added on top of normal PBR shading. */
function addCandy(mat, color) {
  const edge = new THREE.Color().setHSL(0, 0, 0).copy(color).lerp(new THREE.Color(0x9fe8ff), 0.35).lerp(new THREE.Color(0xffffff), 0.25);
  const hsl = {}; color.getHSL(hsl);
  const deep = new THREE.Color().setHSL(hsl.h, Math.min(1, hsl.s * 1.1), hsl.l * 0.42);
  const uniforms = { uEdge: { value: edge }, uDeep: { value: deep }, uBase: { value: color.clone() } };
  mat.userData.uniforms = uniforms;
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>' + String.fromCharCode(10) + 'uniform vec3 uEdge; uniform vec3 uDeep; uniform vec3 uBase;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        {
          float facing = clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0);
          float fr = 1.0 - facing;
          // deeper colour where the body is "thick" (facing the camera), lighter at the rim
          diffuseColor.rgb = mix(uDeep, uBase, smoothstep(0.05, 0.75, fr));
          totalEmissiveRadiance += uBase * 0.12 * pow(facing, 2.0) + uEdge * pow(fr, 2.0) * 1.05;
        }`);
  };
  mat.customProgramCacheKey = () => 'candy';
  return mat;
}

export const MATERIALS = {
  matte: { label: 'Матовый' },
  glass: { label: 'Стекло' },
  glow:  { label: 'Свечение' },
  plush: { label: 'Плюш' },
};
const LEGACY = { vinyl: 'matte', glossy: 'glass', clay: 'matte' };
export const normalizeMaterial = (k) => LEGACY[k] || (MATERIALS[k] ? k : 'matte');

/* Soft gradient glow: two-colour vertical gradient emitted from inside and a bright
   fresnel rim. No transmission: the look must not depend on what is behind the body,
   otherwise transparent PNG/video exports came out dark and see-through. */
function glowMaterial(c1, c2, vertexColors) {
  const m = new THREE.MeshPhysicalMaterial({
    color: c1.clone().lerp(new THREE.Color(0xffffff), 0.55), vertexColors: false,
    roughness: 0.5, clearcoat: 0.35, clearcoatRoughness: 0.5, dithering: true,
  });
  const uniforms = { uC1: { value: c1.clone() }, uC2: { value: c2.clone() }, uYmin: { value: 0 }, uYmax: { value: 2 } };
  m.userData.uniforms = uniforms;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vObjPos;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvObjPos = position;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uC1; uniform vec3 uC2; uniform float uYmin; uniform float uYmax; varying vec3 vObjPos;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        {
          float gy = clamp((vObjPos.y - uYmin) / max(uYmax - uYmin, 0.001), 0.0, 1.0);
          vec3 grad = mix(uC1, uC2, smoothstep(0.15, 0.85, gy) + 0.15 * sin(vObjPos.x * 2.5 + vObjPos.z * 1.5));
          float facing = clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0);
          float fr = 1.0 - facing;
          diffuseColor.rgb = mix(vec3(1.0), grad, 0.5);
          totalEmissiveRadiance += grad * (1.05 * pow(facing, 1.3)) + vec3(1.0) * pow(fr, 2.6) * 0.95;
        }`);
  };
  m.customProgramCacheKey = () => 'glow-body';
  return m;
}

/* Soft halo around the silhouette (back-face shell pushed along normals). */
export function createGlowShell(c1, c2, width = 0.09) {
  return new THREE.ShaderMaterial({
    uniforms: { uC1: { value: new THREE.Color(c1) }, uC2: { value: new THREE.Color(c2) }, uW: { value: width }, uYmin: { value: 0 }, uYmax: { value: 2 } },
    vertexShader: `
      uniform float uW; varying vec3 vN; varying vec3 vV; varying float vY;
      void main(){
        vec3 p = position + normal * uW;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); vY = position.y;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform vec3 uC1; uniform vec3 uC2; uniform float uYmin; uniform float uYmax;
      varying vec3 vN; varying vec3 vV; varying float vY;
      void main(){
        float d = abs(dot(normalize(vN), normalize(vV)));
        float gy = clamp((vY - uYmin) / max(uYmax - uYmin, 0.001), 0.0, 1.0);
        vec3 col = mix(mix(uC1, uC2, gy), vec3(1.0), 0.35);
        gl_FragColor = vec4(col, pow(d, 1.8) * 0.75);
        #include <colorspace_fragment>
      }`,
    side: THREE.BackSide, transparent: true, depthWrite: false,
  });
}

export function createBodyMaterial(kind, color, vertexColors = true, color2 = '#ff7ad9') {
  kind = normalizeMaterial(kind);
  const c = new THREE.Color(color);
  let m;
  switch (kind) {
    case 'matte':
      // smooth, flowing, no micro-texture
      m = new THREE.MeshPhysicalMaterial({ color: c, vertexColors, roughness: 0.62, sheen: 0.55, sheenRoughness: 0.55, sheenColor: c.clone().lerp(new THREE.Color(0xffffff), 0.5), envMapIntensity: 0.8 });
      return addClaySurface(m, 0, 1);
    case 'glass':
      // glossy candy plastic: saturated body, lighter "see-through" edges and crisp clear-coat
      // highlights, all from shading — no transmission, so exports look exactly like the site
      m = new THREE.MeshPhysicalMaterial({
        color: c, vertexColors: false,
        roughness: 0.05, metalness: 0,
        specularIntensity: 1, specularColor: new THREE.Color(0xffffff),
        clearcoat: 1, clearcoatRoughness: 0.015, envMapIntensity: 2.8, dithering: true,
      });
      return addCandy(m, c);
    case 'glassSolid':
      // limbs & ears of glass characters: glossy candy instead of thin dark refraction
      m = new THREE.MeshPhysicalMaterial({ color: c.clone().lerp(new THREE.Color(0xffffff), 0.1), roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.03, iridescence: 0.3, envMapIntensity: 1.6 });
      return addRim(m, c.clone().lerp(new THREE.Color(0xffffff), 0.6), 0.6, 2.5);
    case 'glow':
      return glowMaterial(c, new THREE.Color(color2), vertexColors);
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
float furNoise(vec3 x){
  vec3 i = floor(x); vec3 f = fract(x); f = f*f*(3.0-2.0*f);
  return mix(mix(mix(furHash(i), furHash(i+vec3(1,0,0)), f.x), mix(furHash(i+vec3(0,1,0)), furHash(i+vec3(1,1,0)), f.x), f.y),
             mix(mix(furHash(i+vec3(0,0,1)), furHash(i+vec3(1,0,1)), f.x), mix(furHash(i+vec3(0,1,1)), furHash(i+vec3(1,1,1)), f.x), f.y), f.z);
}
// fixed, non axis-aligned rotation so the noise grid never lines up with flat faces
const mat3 FUR_ROT = mat3(0.788, -0.418, 0.452, 0.556, 0.787, -0.267, -0.244, 0.454, 0.857);
`;
export function createFurShells(color, count = 16, length = 0.065) {
  const c = new THREE.Color(color);
  const mats = [];
  for (let i = 1; i <= count; i++) {
    const layer = i / count;
    const m = new THREE.MeshStandardMaterial({ color: c, roughness: 1, vertexColors: true, dithering: true });
    const uniforms = { uLayer: { value: layer }, uLen: { value: length }, uDensity: { value: 95 } };
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
            // strands from smooth noise (not a regular lattice): slicing a lattice with a
            // nearly flat surface made moire rings, especially seen through glass
            vec3 fp = FUR_ROT * vObjPos * uDensity;
            float n = furNoise(fp) * 0.62 + furNoise(fp * 2.17 + 7.3) * 0.38;
            if (n < 0.06 + uLayer * 0.82) discard;
          }`)
        .replace('#include <color_fragment>', `#include <color_fragment>
          diffuseColor.rgb *= mix(0.55, 1.12, uLayer);`);
    };
    m.customProgramCacheKey = () => 'fur-shell';
    mats.push(m);
  }
  return mats;
}

// radial falloff used as the blush alpha (green channel), fully transparent at the rim
function blushAlpha() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, '#fff'); gr.addColorStop(0.35, 'rgba(255,255,255,.85)'); gr.addColorStop(0.7, 'rgba(255,255,255,.3)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = '#000'; g.fillRect(0, 0, 128, 128);
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
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
    // painted-on blush: soft red spot with a blurred edge (alpha from a radial gradient)
    blush: new THREE.MeshStandardMaterial({
      color: 0xff2e4d, roughness: 1, transparent: true, opacity: 0.6, alphaMap: blushAlpha(), depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4,
    }),
    tear: new THREE.MeshPhysicalMaterial({ color: 0x8fd3ff, roughness: 0.05, clearcoat: 1, transparent: true, opacity: 0.85 }),
  };
}

export function createAccMaterial(color) {
  return addClaySurface(new THREE.MeshPhysicalMaterial({ color: new THREE.Color(color), roughness: 0.5, clearcoat: 0.3, clearcoatRoughness: 0.4, sheen: 0.3, sheenColor: new THREE.Color(0xffffff) }), 0.003, 7);
}
export const GOLD = new THREE.MeshPhysicalMaterial({ color: 0xffc53d, metalness: 1, roughness: 0.25, clearcoat: 0.6 });
export const LENS = new THREE.MeshPhysicalMaterial({ color: 0x101016, roughness: 0.05, clearcoat: 1, metalness: 0.2 });
export const LEAF = addClaySurface(new THREE.MeshPhysicalMaterial({ color: 0x5ccc4a, roughness: 0.5, clearcoat: 0.2 }), 0.003, 7);
