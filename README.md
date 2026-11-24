# ClayMates — 3D Character Maker with Animations

**Live:** https://adentxxx.github.io/Claymates-Animated-Characters/

A browser-based maker for cute, chunky 3D characters. Pick a shape, material, face, emotion, limbs and accessories, and the character comes alive with ready-made animations.

![three.js](https://img.shields.io/badge/three.js-r170-black) ![vite](https://img.shields.io/badge/vite-5-646cff)

## Features

- **10 body shapes**: ball, drop, bean, cube, triangle, pin, heart, cloud, star, ghost. Every shape is an SDF (signed distance field), so it can be reshaped smoothly: width, height, depth, taper and a "hand-sculpted" wobble.
- **4 materials**: matte, glossy, glow (two-colour gradient with a soft halo) and plush (real fur via shell rendering).
- **Face**: 6 eye styles, brows, mouth, blush, eye shine; the eyes follow the cursor and blink.
- **11 emotions** with smooth transitions, from happy and silly to sleepy and dizzy.
- **15 animations**: idle, bounce, wave, dance, walk, spin, nod, nope, look around, talk, cheer, jelly, shy, float, sleep.
- **Accessories**: beret, cap, party hat, crown, halo, bow, sprout, antenna, bunny and cat ears; three kinds of glasses; tie, bow tie, scarf. Ears, antennas and sprouts sway with inertia.
- **Export**: square PNG 2048×2048 with a transparent background, seamless looping video 1440×1440 as WebM (transparent) or MP4, and a shareable link (the whole character lives in the URL).
- 9 ready-made characters and a "Random" button.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:5173.

- Production build: `npm run build` (output in `dist/`).
- Publish to GitHub Pages: `npm run deploy` (builds and pushes `dist/` to the `gh-pages` branch).

## How it works

| File | What's inside |
|---|---|
| `src/sdf.js` | SDF primitives, shape catalogue, deformations, surface tracing to place the face and accessories |
| `src/mesher.js` | Surface Nets: turns the SDF into a smooth mesh, gradient normals, baked ambient occlusion |
| `src/materials.js` | Shader materials: matte, glossy, glow, plush fur |
| `src/halo.js` | Screen-space glow halo for the glow material |
| `src/character.js` | Character assembly: body, eyes, mouth, arms, legs, accessories, blinking, particles |
| `src/animations.js` | Emotions and pose generators for the animations |
| `src/ui.js`, `src/presets.js` | Settings panel and ready-made characters |
| `src/main.js` | Renderer, camera, exports, URL state |
