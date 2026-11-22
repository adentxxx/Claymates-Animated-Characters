// Emotions (face targets) and animation presets (pose generators).

export const EMOTIONS = {
  neutral:   { label: 'Спокойно',   icon: '😐', eyes: ['base', 'base'], open: 1, scale: 1, brow: 0, browLift: 0, c: 0.1, mo: 0, w: 0.8, smirk: 0, wavy: 0, tongue: 0, blush: 0.2 },
  happy:     { label: 'Радость',    icon: '🙂', eyes: ['base', 'base'], open: 1, scale: 1, brow: -0.05, browLift: 0.02, c: 1, mo: 0.05, w: 1, smirk: 0, wavy: 0, tongue: 0, blush: 0.6 },
  joy:       { label: 'Восторг',    icon: '😄', eyes: ['happy', 'happy'], open: 1, scale: 1, brow: -0.1, browLift: 0.05, c: 1, mo: 0.75, w: 1.15, smirk: 0, wavy: 0, tongue: 0, blush: 1, fx: 'star' },
  love:      { label: 'Любовь',     icon: '😍', eyes: ['heart', 'heart'], open: 1, scale: 1, brow: -0.1, browLift: 0.03, c: 1, mo: 0.3, w: 0.9, smirk: 0, wavy: 0, tongue: 0, blush: 1, fx: 'heart' },
  silly:     { label: 'Дурачусь',   icon: '😜', eyes: ['happy', 'base'], open: 1, scale: 1, brow: 0.15, browLift: 0.03, c: 1, mo: 0.5, w: 1, smirk: 0.2, wavy: 0, tongue: 1, blush: 0.6 },
  smug:      { label: 'Хитрый',     icon: '😏', eyes: ['base', 'base'], open: 0.5, scale: 1, brow: 0.25, browLift: 0.0, c: 0.45, mo: 0, w: 0.8, smirk: 0.8, wavy: 0, tongue: 0, blush: 0.2 },
  surprised: { label: 'Удивление',  icon: '😮', eyes: ['base', 'base'], open: 1.1, scale: 1.3, brow: -0.15, browLift: 0.09, c: 0, mo: 0.95, w: 0.42, smirk: 0, wavy: 0, tongue: 0, blush: 0 },
  sad:       { label: 'Грусть',     icon: '😢', eyes: ['base', 'base'], open: 0.8, scale: 1, brow: -0.5, browLift: 0.03, c: -0.9, mo: 0.05, w: 0.75, smirk: 0, wavy: 0, tongue: 0, blush: 0, tear: 1 },
  angry:     { label: 'Злость',     icon: '😠', eyes: ['base', 'base'], open: 0.75, scale: 0.95, brow: 0.6, browLift: -0.02, c: -0.7, mo: 0.15, w: 0.85, smirk: 0, wavy: 0, tongue: 0, blush: 0.4 },
  sleepy:    { label: 'Сонный',     icon: '😴', eyes: ['sleep', 'sleep'], open: 1, scale: 1, brow: -0.1, browLift: 0, c: 0.1, mo: 0.18, w: 0.45, smirk: 0, wavy: 0, tongue: 0, blush: 0.3, fx: 'z' },
  dizzy:     { label: 'Головокружение', icon: '😵', eyes: ['x', 'x'], open: 1, scale: 1, brow: -0.2, browLift: 0.04, c: -0.2, mo: 0.25, w: 0.7, smirk: 0, wavy: 1, tongue: 0, blush: 0 },
};

export const POSE_KEYS = ['rootY', 'rootRotY', 'px', 'py', 'pz', 'squash', 'aZ', 'aX', 'aE', 'bZ', 'bX', 'bE', 'lA', 'lB', 'lookX', 'lookY', 'mouth', 'blush', 'eyeOpen'];

export function newPose() {
  const p = {};
  for (const k of POSE_KEYS) p[k] = 0;
  p.squash = 1; p.eyeOpen = 1; p.forceEyes = null; p.fx = null;
  return p;
}

const TAU = Math.PI * 2;
const { sin, cos, abs, exp, max } = Math;
const ease = (x) => x * x * (3 - 2 * x);

// Every animation is periodic: all its motions repeat exactly after `period` seconds
// (at speed 1), so an exported video loops without a seam.
export const ANIMS = {
  idle:   { label: 'Покой',      icon: '🫧', period: 6 },
  bounce: { label: 'Прыжки',     icon: '🦘', period: 1 },
  wave:   { label: 'Привет',     icon: '👋', period: TAU / 1.5 },
  dance:  { label: 'Танец',      icon: '💃', period: 2 / 1.1 },
  walk:   { label: 'Шаг',        icon: '🚶', period: 1 / 1.3 },
  spin:   { label: 'Кружится',   icon: '🌀', period: 1 / 0.55 },
  nod:    { label: 'Да-да',      icon: '🙆', period: 1 / 1.2 },
  shake:  { label: 'Не-а',       icon: '🙅', period: 2 },
  look:   { label: 'Осмотр',     icon: '👀', period: 8 },
  talk:   { label: 'Болтает',    icon: '💬', period: 4 },
  cheer:  { label: 'Ура!',       icon: '🙌', period: 1 / 1.5 },
  jelly:  { label: 'Желе',       icon: '🍮', period: 1.25 },
  shy:    { label: 'Стесняется', icon: '🙈', period: TAU / 0.8 },
  float:  { label: 'Парит',      icon: '🎈', period: TAU / 0.8 },
  sleep:  { label: 'Спит',       icon: '💤', period: TAU / 1.3 },
};

export function computePose(name, t, p) {
  const a = ANIMS[name];
  if (!a) return p;
  const w = TAU / a.period;          // base angular frequency: use only integer multiples of it
  const ph = (t / a.period) % 1;     // 0..1 phase within the loop
  switch (name) {
    case 'idle': {
      const b = sin(2 * w * t);
      p.squash = 1 + 0.025 * b;
      p.pz = 0.03 * sin(w * t);
      p.aZ = 0.08 * b; p.bZ = 0.08 * b;
      p.aE = 0.15; p.bE = 0.15;
      p.lookX = 0.35 * sin(w * t + 0.8); p.lookY = 0.1 * cos(w * t);
      break;
    }
    case 'bounce': {
      if (ph < 0.2) { const k = ease(ph / 0.2); p.squash = 1 - 0.2 * k; p.aZ = p.bZ = -0.1 * k; }
      else if (ph < 0.72) {
        const k = (ph - 0.2) / 0.52;
        p.rootY = 0.6 * 4 * k * (1 - k);
        p.squash = 1 + 0.16 * (1 - abs(2 * k - 1) * 0.3) * (abs(2 * k - 1) ** 2);
        p.aZ = p.bZ = 1.3 * sin(k * Math.PI);
        p.lA = p.lB = -0.25 * sin(k * Math.PI);
        p.mouth = 0.25 * sin(k * Math.PI);
      } else {
        const k = (ph - 0.72) / 0.28;
        p.squash = 1 - 0.22 * exp(-k * 5) * cos(k * 13) * (1 - k); // settles to rest by the loop end
      }
      break;
    }
    case 'wave': {
      p.aZ = 1.85 + 0.1 * sin(2 * w * t);
      p.aE = 0.7 + 0.55 * sin(6 * w * t);
      p.bZ = 0.1;
      p.pz = -0.07 + 0.03 * sin(3 * w * t);
      p.squash = 1 + 0.02 * sin(6 * w * t);
      p.lookX = 0.15;
      break;
    }
    case 'dance': {
      const f = 2 * w * t;
      const b = sin(f);
      p.pz = 0.18 * b;
      p.rootRotY = 0.35 * sin(w * t);
      p.rootY = 0.08 * abs(sin(f));
      p.squash = 1 - 0.07 * abs(b);
      p.aZ = 1.3 + 0.9 * sin(f); p.bZ = 1.3 - 0.9 * sin(f);
      p.aE = 0.8; p.bE = 0.8;
      p.lA = -0.3 * max(0, b); p.lB = -0.3 * max(0, -b);
      p.lookX = -0.5 * b;
      p.fx = 'note';
      break;
    }
    case 'walk': {
      const f = w * t;
      p.lA = 0.55 * sin(f); p.lB = -0.55 * sin(f);
      p.aX = -0.55 * sin(f); p.bX = 0.55 * sin(f);
      p.aE = 0.25; p.bE = 0.25;
      p.rootY = 0.045 * abs(cos(f));
      p.pz = 0.06 * sin(f);
      p.px = 0.05;
      p.squash = 1 + 0.03 * cos(2 * f);
      break;
    }
    case 'spin': {
      const k = ph < 0.75 ? ease(ph / 0.75) : 1;
      p.rootRotY = k * TAU;
      p.rootY = 0.3 * sin(Math.min(ph / 0.75, 1) * Math.PI);
      p.aZ = p.bZ = 1.1 * sin(Math.min(ph / 0.75, 1) * Math.PI);
      p.squash = 1 + 0.06 * sin(Math.min(ph / 0.75, 1) * Math.PI);
      if (ph > 0.75) { const q = (ph - 0.75) / 0.25; p.squash = 1 - 0.12 * exp(-q * 4.5) * cos(q * 12.5) * (1 - q); }
      break;
    }
    case 'nod': {
      const n = max(0, sin(w * t));
      p.px = 0.2 * n;
      p.squash = 1 - 0.04 * n;
      p.lookY = -0.4 * n;
      break;
    }
    case 'shake': {
      const env = 0.6 + 0.4 * sin(w * t);
      p.py = 0.35 * sin(3 * w * t) * env;
      p.lookX = -0.6 * sin(3 * w * t - 0.6);
      p.squash = 1 + 0.02 * sin(6 * w * t);
      break;
    }
    case 'look': {
      p.rootRotY = 0.5 * sin(w * t);
      p.lookX = sin(w * t + 0.6);
      p.lookY = 0.35 * sin(2 * w * t);
      p.pz = -0.04 * sin(w * t);
      p.squash = 1 + 0.02 * sin(3 * w * t);
      break;
    }
    case 'talk': {
      p.mouth = 0.45 * (0.5 + 0.5 * sin(10 * w * t)) * (0.55 + 0.45 * sin(2 * w * t));
      p.aX = -0.7 - 0.3 * sin(2 * w * t); p.aZ = 0.3 + 0.2 * sin(2 * w * t); p.aE = 1.0;
      p.pz = 0.04 * sin(w * t);
      p.squash = 1 + 0.025 * sin(5 * w * t);
      p.lookX = 0.2 * sin(w * t);
      break;
    }
    case 'cheer': {
      const f = w * t;
      p.aZ = p.bZ = 2.0 + 0.25 * sin(f * 2);
      p.aE = p.bE = 0.2 * sin(f * 2);
      p.rootY = 0.22 * abs(sin(f));
      p.squash = 1 + 0.08 * (abs(sin(f)) - 0.5);
      p.mouth = 0.45;
      p.fx = 'star';
      break;
    }
    case 'jelly': {
      const d = exp(-ph * 4) * (1 - ph); // fully settled when the loop wraps
      p.squash = 1 + 0.24 * d * sin(ph * 30);
      p.pz = 0.09 * d * sin(ph * 22);
      p.aZ = p.bZ = 0.3 * d * sin(ph * 30);
      break;
    }
    case 'shy': {
      p.pz = 0.08 * sin(2 * w * t);
      p.px = 0.1;
      p.lookY = -0.6; p.lookX = 0.45 * sin(w * t);
      p.aX = p.bX = -0.8; p.aZ = p.bZ = -0.45; p.aE = p.bE = 0.7;
      p.blush = 0.8;
      p.squash = 1 + 0.02 * sin(4 * w * t);
      break;
    }
    case 'float': {
      p.rootY = 0.35 + 0.1 * sin(2 * w * t);
      p.lA = 0.25 * sin(2 * w * t + 1); p.lB = 0.25 * sin(2 * w * t + 2);
      p.aZ = p.bZ = 0.9 + 0.15 * sin(2 * w * t + 0.5);
      p.pz = 0.06 * sin(w * t);
      p.squash = 1 + 0.03 * sin(2 * w * t + 1.2);
      break;
    }
    case 'sleep': {
      p.squash = 1 + 0.04 * sin(w * t);
      p.pz = 0.12; p.px = 0.08;
      p.forceEyes = 'sleep';
      p.mouth = 0.12 + 0.06 * sin(w * t);
      p.fx = 'z';
      break;
    }
  }
  return p;
}
