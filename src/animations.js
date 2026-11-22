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

export const ANIMS = {
  idle:   { label: 'Покой',      icon: '🫧' },
  bounce: { label: 'Прыжки',     icon: '🦘' },
  wave:   { label: 'Привет',     icon: '👋' },
  dance:  { label: 'Танец',      icon: '💃' },
  walk:   { label: 'Шаг',        icon: '🚶' },
  spin:   { label: 'Кружится',   icon: '🌀' },
  nod:    { label: 'Да-да',      icon: '🙆' },
  shake:  { label: 'Не-а',       icon: '🙅' },
  look:   { label: 'Осмотр',     icon: '👀' },
  talk:   { label: 'Болтает',    icon: '💬' },
  cheer:  { label: 'Ура!',       icon: '🙌' },
  jelly:  { label: 'Желе',       icon: '🍮' },
  shy:    { label: 'Стесняется', icon: '🙈' },
  float:  { label: 'Парит',      icon: '🎈' },
  sleep:  { label: 'Спит',       icon: '💤' },
};

export function computePose(name, t, p) {
  switch (name) {
    case 'idle': {
      const b = sin(t * 2.2);
      p.squash = 1 + 0.025 * b;
      p.pz = 0.03 * sin(t * 1.1);
      p.aZ = 0.08 * b; p.bZ = 0.08 * b;
      p.aE = 0.15; p.bE = 0.15;
      p.lookX = 0.35 * sin(t * 0.45); p.lookY = 0.1 * sin(t * 0.7);
      break;
    }
    case 'bounce': {
      const ph = (t * 1.05) % 1;
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
        p.squash = 1 - 0.22 * exp(-k * 5) * cos(k * 13);
      }
      break;
    }
    case 'wave': {
      p.aZ = 1.85 + 0.1 * sin(t * 3);
      p.aE = 0.7 + 0.55 * sin(t * 9);
      p.bZ = 0.1;
      p.pz = -0.07 + 0.03 * sin(t * 4.5);
      p.squash = 1 + 0.02 * sin(t * 9);
      p.lookX = 0.15;
      break;
    }
    case 'dance': {
      const f = t * TAU * 1.1;
      const b = sin(f);
      p.pz = 0.18 * b;
      p.rootRotY = 0.35 * sin(f * 0.5);
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
      const f = t * TAU * 1.3;
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
      const ph = (t * 0.55) % 1;
      const k = ph < 0.75 ? ease(ph / 0.75) : 1;
      p.rootRotY = k * TAU;
      p.rootY = 0.3 * sin(Math.min(ph / 0.75, 1) * Math.PI);
      p.aZ = p.bZ = 1.1 * sin(Math.min(ph / 0.75, 1) * Math.PI);
      p.squash = 1 + 0.06 * sin(Math.min(ph / 0.75, 1) * Math.PI);
      if (ph > 0.75) p.squash = 1 - 0.12 * exp(-(ph - 0.75) * 18) * cos((ph - 0.75) * 50);
      break;
    }
    case 'nod': {
      const n = max(0, sin(t * TAU * 1.2));
      p.px = 0.2 * n;
      p.squash = 1 - 0.04 * n;
      p.lookY = -0.4 * n;
      break;
    }
    case 'shake': {
      const env = 0.6 + 0.4 * sin(t * 1.3);
      p.py = 0.35 * sin(t * TAU * 1.5) * env;
      p.lookX = -0.6 * sin(t * TAU * 1.5 - 0.6);
      p.squash = 1 + 0.02 * sin(t * TAU * 3);
      break;
    }
    case 'look': {
      p.rootRotY = 0.5 * sin(t * 0.9);
      p.lookX = sin(t * 0.9 + 0.6);
      p.lookY = 0.35 * sin(t * 0.45);
      p.pz = -0.04 * sin(t * 0.9);
      p.squash = 1 + 0.02 * sin(t * 2);
      break;
    }
    case 'talk': {
      p.mouth = 0.45 * (0.5 + 0.5 * sin(t * 15)) * (0.55 + 0.45 * sin(t * 3.1));
      p.aX = -0.7 - 0.3 * sin(t * 2.5); p.aZ = 0.3 + 0.2 * sin(t * 2.5); p.aE = 1.0;
      p.pz = 0.04 * sin(t * 2.2);
      p.squash = 1 + 0.025 * sin(t * 7.5);
      p.lookX = 0.2 * sin(t * 0.7);
      break;
    }
    case 'cheer': {
      const f = t * TAU * 1.5;
      p.aZ = p.bZ = 2.0 + 0.25 * sin(f * 2);
      p.aE = p.bE = 0.2 * sin(f * 2);
      p.rootY = 0.22 * abs(sin(f));
      p.squash = 1 + 0.08 * (abs(sin(f)) - 0.5);
      p.mouth = 0.45;
      p.fx = 'star';
      break;
    }
    case 'jelly': {
      const ph = (t * 0.8) % 1;
      const d = exp(-ph * 4);
      p.squash = 1 + 0.24 * d * sin(ph * 30);
      p.pz = 0.09 * d * sin(ph * 22);
      p.aZ = p.bZ = 0.3 * d * sin(ph * 30);
      break;
    }
    case 'shy': {
      p.pz = 0.08 * sin(t * 1.6);
      p.px = 0.1;
      p.lookY = -0.6; p.lookX = 0.45 * sin(t * 0.8);
      p.aX = p.bX = -0.8; p.aZ = p.bZ = -0.45; p.aE = p.bE = 0.7;
      p.blush = 0.8;
      p.squash = 1 + 0.02 * sin(t * 3);
      break;
    }
    case 'float': {
      p.rootY = 0.35 + 0.1 * sin(t * 1.6);
      p.lA = 0.25 * sin(t * 1.6 + 1); p.lB = 0.25 * sin(t * 1.6 + 2);
      p.aZ = p.bZ = 0.9 + 0.15 * sin(t * 1.6 + 0.5);
      p.pz = 0.06 * sin(t * 0.8);
      p.squash = 1 + 0.03 * sin(t * 1.6 + 1.2);
      break;
    }
    case 'sleep': {
      p.squash = 1 + 0.04 * sin(t * 1.3);
      p.pz = 0.12; p.px = 0.08;
      p.forceEyes = 'sleep';
      p.mouth = 0.12 + 0.06 * sin(t * 1.3);
      p.fx = 'z';
      break;
    }
  }
  return p;
}
