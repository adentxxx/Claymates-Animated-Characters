import * as THREE from 'three';

// Screen-space glow for the "Свечение" material.
// Each frame the character's silhouette is drawn into a small offscreen texture, blurred with
// a wide Gaussian (two separable passes, twice), and drawn behind the character as a soft
// two-colour halo. Being an image-space blur it is smooth regardless of mesh density, scales
// with the picture, and ends up in transparent PNG / WebM exports exactly as on screen.
const FS_VERT = 'varying vec2 vUv; void main(){ vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }';

export function createHalo(renderer) {
  const opts = { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: true };
  // one set of targets per output size (screen + export), so switching sizes does not reallocate
  const sets = new Map();
  function targets(w, h) {
    const key = w + 'x' + h;
    let t = sets.get(key);
    if (!t) {
      if (sets.size >= 2) { const [k0, old] = sets.entries().next().value; Object.values(old).forEach((r) => r.dispose()); sets.delete(k0); }
      t = { mask: new THREE.WebGLRenderTarget(w, h, opts), a: new THREE.WebGLRenderTarget(w, h, { ...opts, depthBuffer: false }), b: new THREE.WebGLRenderTarget(w, h, { ...opts, depthBuffer: false }) };
      sets.set(key, t);
    } else { sets.delete(key); sets.set(key, t); } // most recently used last
    return t;
  }
  const maskMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

  // full-screen triangle-pair + camera for the blur passes
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
  quad.frustumCulled = false;
  const quadScene = new THREE.Scene(); quadScene.add(quad);
  const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const blurMat = new THREE.ShaderMaterial({
    uniforms: { uTex: { value: null }, uDir: { value: new THREE.Vector2() } },
    vertexShader: FS_VERT,
    fragmentShader: `
      uniform sampler2D uTex; uniform vec2 uDir; varying vec2 vUv;
      void main(){
        // 13 taps, Gaussian weights (sigma ~ 3 taps); uDir already holds the tap spacing
        float w[7]; w[0]=0.1370; w[1]=0.1299; w[2]=0.1107; w[3]=0.0848; w[4]=0.0584; w[5]=0.0361; w[6]=0.0200;
        float s = texture2D(uTex, vUv).r * w[0];
        for (int i = 1; i < 7; i++) {
          vec2 o = uDir * float(i);
          s += (texture2D(uTex, vUv + o).r + texture2D(uTex, vUv - o).r) * w[i];
        }
        gl_FragColor = vec4(s / 0.9138, 0.0, 0.0, 1.0);
      }`,
    depthTest: false, depthWrite: false,
  });
  quad.material = blurMat;

  // the halo itself: a full-screen layer drawn first, behind everything else in the scene
  const haloMat = new THREE.ShaderMaterial({
    uniforms: { uTex: { value: null }, uC1: { value: new THREE.Color() }, uC2: { value: new THREE.Color() }, uStrength: { value: 0.8 } },
    // sits on the far plane: depth-tested, so it only shows where nothing else is drawn
    vertexShader: 'varying vec2 vUv; void main(){ vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.9999, 1.0); }',
    fragmentShader: `
      uniform sampler2D uTex; uniform vec3 uC1; uniform vec3 uC2; uniform float uStrength; varying vec2 vUv;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      void main(){
        float m = clamp(texture2D(uTex, vUv).r, 0.0, 1.0);
        float a = uStrength * m * m * (3.0 - 2.0 * m);           // smooth falloff
        a += (hash(gl_FragCoord.xy) - 0.5) / 255.0;              // dither: no 8-bit banding in the gradient
        vec3 col = mix(mix(uC1, uC2, clamp(vUv.y * 1.2 - 0.1, 0.0, 1.0)), vec3(1.0), 0.3);
        gl_FragColor = vec4(col, clamp(a, 0.0, 1.0));
        #include <colorspace_fragment>
      }`,
    transparent: true, depthTest: true, depthWrite: false,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), haloMat);
  mesh.frustumCulled = false;
  mesh.renderOrder = -100;
  mesh.visible = false;

  const size = new THREE.Vector2(), clear = new THREE.Color();
  function blurPass(src, dst, dx, dy) {
    blurMat.uniforms.uTex.value = src.texture;
    blurMat.uniforms.uDir.value.set(dx, dy);
    renderer.setRenderTarget(dst);
    renderer.render(quadScene, quadCam);
  }

  return {
    mesh,
    /** call right before renderer.render(scene, camera); hides itself when off */
    prepare(scene, camera, { on, c1, c2, hide = [] }) {
      mesh.visible = on;
      if (!on) return;
      haloMat.uniforms.uC1.value.set(c1);
      haloMat.uniforms.uC2.value.set(c2);
      renderer.getDrawingBufferSize(size);
      const w = Math.max(16, Math.round(size.x / 4)), h = Math.max(16, Math.round(size.y / 4));
      const { mask: rtMask, a: rtA, b: rtB } = targets(w, h);
      haloMat.uniforms.uTex.value = rtB.texture;

      // 1) silhouette: everything in the scene in flat white, no background, no particles
      const bg = scene.background, ov = scene.overrideMaterial;
      const prevTarget = renderer.getRenderTarget(), prevAlpha = renderer.getClearAlpha();
      renderer.getClearColor(clear);
      const hidden = hide.filter((o) => o.visible);
      hidden.forEach((o) => { o.visible = false; });
      mesh.visible = false;
      scene.background = null; scene.overrideMaterial = maskMat;
      renderer.setRenderTarget(rtMask);
      renderer.setClearColor(0x000000, 0);
      renderer.clear();
      renderer.render(scene, camera);
      scene.background = bg; scene.overrideMaterial = ov;
      hidden.forEach((o) => { o.visible = true; });
      mesh.visible = true;

      // 2) wide blur: two rounds of horizontal + vertical; spread scales with the picture height
      const px = 1 / w, py = 1 / h, k = Math.max(1, h / 150);
      blurPass(rtMask, rtA, px * k, 0); blurPass(rtA, rtB, 0, py * k);
      blurPass(rtB, rtA, px * k * 1.8, 0); blurPass(rtA, rtB, 0, py * k * 1.8);

      renderer.setRenderTarget(prevTarget);
      renderer.setClearColor(clear, prevAlpha);
    },
  };
}
