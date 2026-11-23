export const DEFAULTS = {
  // form
  shape: 'drop', width: 1, height: 1, depth: 1, taper: 0, wobble: 0.35, seed: 1,
  // material
  color: '#3d7bff', color2: '#ff7ad9', material: 'matte', limbSame: true, limbColor: '#ffffff',
  // face
  eyes: 'dots', eyeSize: 1, eyeSpacing: 0.36, faceY: 0.55, mouth: true, mouthGap: 0.4, mouthSize: 1,
  brows: 'auto', shine: true,
  // limbs
  arms: 'stubby', armLength: 1, armY: 0.4, legs: 'stubby', legLength: 1, limbThick: 1,
  // accessories
  head: 'none', eyewear: 'none', neck: 'none', accColor: '#1d1d24', glassColor: '#1d1d24', accSize: 1,
  // behaviour
  emotion: 'happy', anim: 'idle', speed: 1, blink: true, follow: true,
};

export const PALETTE = ['#3d7bff', '#5b5cf0', '#8b6cf0', '#ff3fbf', '#ff4757', '#ff6a3d', '#ffc531', '#9be22d', '#2fd14a', '#22c7a9', '#2e8fff', '#a5f0e0', '#f4efe6', '#2b2b35'];

// Ready-made characters. The first one is what the site opens with.
export const PRESETS = [
  { name: 'Кубик', st: { shape: 'cube', wobble: 0.15, color: '#8b6cf0', eyes: 'googly', eyeSize: 1.15, eyeSpacing: 0.38, faceY: 0.58, emotion: 'surprised', anim: 'wave' } },
  { name: 'Бэкендер', st: { shape: 'ghost', width: 1.177, height: 1.002, depth: 1.137, wobble: 0.359, seed: 888, color: '#2b2b35', color2: '#ffc531', material: 'glass', eyes: 'googly', eyeSize: 0.991, eyeSpacing: 0.309, faceY: 0.583, brows: 'on', armLength: 1.92, armY: 0.53, legs: 'thin', legLength: 1.33, head: 'sprout', eyewear: 'geek', accColor: '#ffc531', glassColor: '#f4f4f7', accSize: 1.8, emotion: 'dizzy' } },
  { name: 'Дизайнер', st: { shape: 'star', width: 0.943, height: 1.195, depth: 0.857, wobble: 0.201, seed: 736, color: '#9be22d', color2: '#3d7bff', eyes: 'ovals', eyeSize: 0.844, eyeSpacing: 0.352, faceY: 0.603, mouth: false, arms: 'noodle', legs: 'thin', head: 'antenna', eyewear: 'geek', neck: 'bowtie', accColor: '#2b2b35', emotion: 'surprised' } },
  { name: 'Скглыпа', st: { shape: 'triangle', width: 0.908, height: 0.969, depth: 1.023, taper: 0.9, wobble: 0, seed: 836, color: '#ff4757', color2: '#ff3fbf', material: 'glow', eyes: 'lines', eyeSize: 1.277, eyeSpacing: 0.319, faceY: 0.73, arms: 'noodle', armLength: 1.11, armY: 0.37, eyewear: 'round', neck: 'tie', accColor: '#9be22d', glassColor: '#ff4757', emotion: 'neutral', anim: 'cheer', speed: 0.6 } },
  { name: 'Росток', st: { taper: 0.3, wobble: 0.6, color: '#22c7a9', arms: 'noodle', legs: 'thin', head: 'sprout', anim: 'wave' } },
  { name: 'Арбузик', st: { shape: 'triangle', width: 0.982, height: 0.875, depth: 0.9, wobble: 0.487, seed: 922, color: '#ff4757', color2: '#9be22d', material: 'plush', eyes: 'googly', eyeSize: 0.908, eyeSpacing: 0.417, faceY: 0.497, mouthSize: 0.8, shine: false, armLength: 1.3, legs: 'none', legLength: 1.3, head: 'bow', accColor: '#ff3fbf', glassColor: '#ff4757', emotion: 'neutral', anim: 'cheer', speed: 0.6 } },
  { name: 'Репер', st: { shape: 'star', width: 0.888, height: 0.941, depth: 0.822, taper: 0.202, wobble: 0.216, seed: 565, color: '#2b2b35', color2: '#2fd14a', material: 'glass', eyeSize: 0.927, eyeSpacing: 0.387, faceY: 0.529, arms: 'noodle', head: 'beret', eyewear: 'round', neck: 'tie', accColor: '#2b2b35', emotion: 'neutral', anim: 'dance' } },
  { name: 'Промоутер', st: { shape: 'star', width: 0.87, height: 0.991, depth: 0.908, wobble: 0.138, seed: 512, color: '#ff3fbf', color2: '#2b2b35', eyes: 'googly', eyeSize: 1.256, eyeSpacing: 0.315, faceY: 0.556, head: 'bunny', eyewear: 'round', neck: 'bowtie', accColor: '#2b2b35', glassColor: '#f4f4f7', emotion: 'sleepy', anim: 'walk' } },
  { name: 'Тостер', st: { shape: 'cube', width: 1.014, height: 0.972, depth: 0.979, taper: 0.286, wobble: 0.411, seed: 381, color: '#5b5cf0', color2: '#ffc531', material: 'glass', eyes: 'googly', eyeSize: 1.142, eyeSpacing: 0.325, faceY: 0.597, arms: 'none', head: 'sprout', eyewear: 'sun', accColor: '#ff6a3d', emotion: 'neutral', anim: 'shy' } },
];

export function presetState(i) {
  return { ...DEFAULTS, ...PRESETS[i].st };
}
