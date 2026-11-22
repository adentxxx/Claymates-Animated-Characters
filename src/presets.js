export const DEFAULTS = {
  // form
  shape: 'drop', width: 1, height: 1, depth: 1, taper: 0, lean: 0, wobble: 0.35, seed: 1,
  // material
  color: '#3d7bff', color2: '#ff7ad9', material: 'clay', filling: true, limbSame: true, limbColor: '#ffffff',
  // face
  eyes: 'dots', eyeSize: 1, eyeSpacing: 0.36, faceY: 0.55, mouth: true, mouthGap: 0.4, mouthSize: 1,
  brows: 'auto', blush: true, shine: true,
  // limbs
  arms: 'stubby', armLength: 1, armY: 0.4, legs: 'stubby', legLength: 1, limbThick: 1,
  // accessories
  head: 'none', eyewear: 'none', neck: 'none', accColor: '#1d1d24', glassColor: '#1d1d24', accSize: 1,
  // behaviour
  emotion: 'happy', anim: 'idle', speed: 1, blink: true, follow: true,
  // scene
  bg: '#eef0f6', pedestal: false, autoRotate: false,
};

export const PALETTE = ['#3d7bff', '#5b5cf0', '#8b6cf0', '#ff3fbf', '#ff4757', '#ff6a3d', '#ffc531', '#9be22d', '#2fd14a', '#22c7a9', '#2e8fff', '#a5f0e0', '#f4efe6', '#2b2b35'];
export const BG_PALETTE = ['#eef0f6', '#ffffff', '#fdf1e7', '#e9f7f2', '#eae7ff', '#ffe9f3', '#d8f3ff', '#fff6cf', '#1b1b22', '#0d0d12'];

export const PRESETS = [
  { name: 'Менеджер', st: { shape: 'triangle', color: '#5b5cf0', eyes: 'none', neck: 'tie', accColor: '#f4f4f7', arms: 'none', legs: 'stubby', depth: 0.75, emotion: 'neutral', mouth: false, blush: false, pedestal: true } },
  { name: 'Дизайнер', st: { shape: 'boomerang', color: '#ff4757', eyes: 'ovals', eyeSpacing: 0.2, faceY: 0.32, eyeSize: 0.8, mouth: false, arms: 'none', legs: 'stubby', depth: 0.8, emotion: 'neutral', pedestal: true } },
  { name: 'Кодер', st: { shape: 'drop', color: '#2fd14a', eyes: 'dots', eyewear: 'geek', glassColor: '#f4f4f7', eyeSize: 0.8, faceY: 0.62, arms: 'none', legs: 'thin', legLength: 0.7, emotion: 'neutral', mouth: false, pedestal: true } },
  { name: 'Кубик', st: { shape: 'cube', color: '#8b6cf0', eyes: 'googly', eyeSpacing: 0.38, eyeSize: 1.15, faceY: 0.58, arms: 'stubby', legs: 'stubby', emotion: 'surprised', anim: 'wave', material: 'matte', wobble: 0.15 } },
  { name: 'Фасолька', st: { shape: 'bean', color: '#ff6a3d', eyes: 'lines', eyeSpacing: 0.3, head: 'bunny', arms: 'none', legs: 'none', emotion: 'smug', material: 'matte', wobble: 0.1, anim: 'jelly' } },
  { name: 'Облачко', st: { shape: 'cloud', color: '#2e8fff', material: 'glass', eyes: 'dots', eyeSize: 1.35, head: 'beret', accColor: '#1d1d24', arms: 'none', legs: 'none', emotion: 'happy', faceY: 0.45, anim: 'float', bg: '#1b1b22' } },
  { name: 'Лягуш', st: { shape: 'ball', color: '#9be22d', material: 'glass', eyes: 'googly', eyeSpacing: 0.5, eyeSize: 1.2, faceY: 0.72, height: 0.85, arms: 'stubby', legs: 'stubby', emotion: 'silly', anim: 'bounce', bg: '#1b1b22' } },
  { name: 'Сердечко', st: { shape: 'heart', color: '#ff3fbf', material: 'glass', eyes: 'dots', eyewear: 'sun', glassColor: '#1d1d24', faceY: 0.6, arms: 'noodle', legs: 'thin', emotion: 'love', anim: 'dance', bg: '#1b1b22' } },
  { name: 'Звезда', st: { shape: 'star', color: '#ffc531', eyes: 'dots', faceY: 0.5, head: 'crown', accSize: 1.1, arms: 'none', legs: 'stubby', emotion: 'joy', anim: 'cheer', bg: '#eae7ff' } },
  { name: 'Кегля', st: { shape: 'pin', color: '#f4efe6', eyes: 'dots', eyewear: 'sun', glassColor: '#ffc531', head: 'cap', accColor: '#ff4757', faceY: 0.74, eyeSpacing: 0.3, eyeSize: 0.8, arms: 'noodle', legs: 'thin', emotion: 'smug', anim: 'walk', bg: '#d8f3ff', material: 'matte' } },
  { name: 'Призрак', st: { shape: 'ghost', color: '#f4efe6', eyes: 'pixel', arms: 'stubby', legs: 'none', emotion: 'surprised', anim: 'float', bg: '#1b1b22', material: 'glass' } },
  { name: 'Росток', st: { shape: 'drop', color: '#22c7a9', eyes: 'dots', head: 'sprout', arms: 'noodle', legs: 'thin', emotion: 'happy', anim: 'wave', taper: 0.3, wobble: 0.6 } },
  { name: 'Мармелад', st: { shape: 'ball', width: 1.2, height: 0.85, color: '#3fe07a', color2: '#b07cff', material: 'glow', wobble: 0, eyes: 'dots', eyeSize: 1.15, eyeSpacing: 0.5, shine: false, faceY: 0.6, head: 'cat', accSize: 0.7, arms: 'none', legs: 'none', emotion: 'silly', anim: 'jelly', bg: '#c9c6ff', blush: false } },
  { name: 'Мечтатель', st: { shape: 'ball', width: 1.15, height: 0.95, color: '#7fb3ff', color2: '#f2f6ff', material: 'glow', wobble: 0, eyes: 'lines', eyeSize: 1.1, eyeSpacing: 0.5, shine: false, faceY: 0.6, head: 'party', accSize: 0.55, accColor: '#a5f0e0', arms: 'none', legs: 'none', emotion: 'sleepy', anim: 'float', bg: '#d8d6ff', blush: false } },
  { name: 'Человечек', st: { shape: 'bean', height: 1.15, color: '#ff6a2a', material: 'matte', wobble: 0, eyes: 'dots', eyeSize: 0.55, eyeSpacing: 0.42, shine: false, faceY: 0.62, mouthSize: 0.8, blush: false, arms: 'noodle', armLength: 1.3, legs: 'thin', legLength: 1.3, emotion: 'neutral', anim: 'cheer', bg: '#ffffff' } },
];

export function presetState(i) {
  return { ...DEFAULTS, ...PRESETS[i].st };
}
