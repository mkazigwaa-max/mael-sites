// MAANAA — THE FREQUENCY ROOM v4 — THE LOGO MATTRESS (custom build)
// 15,000 points in the four family colors. Tiled across the whole field,
// the dots form repeated outlines of the brand's wave-ring symbol: the
// ring dots are the bold ones, every other dot sits faint. Each ring
// spins on its own center while the field pulses — and every pulse
// lands the rings in the next brain color (lime, coral, teal, magenta),
// never green alone. The 2.8 Hz shockwave still rolls from the center;
// hovering a constraint card raises that family's whole band.
import * as THREE from './vendor/three.module.js';
const canvas = document.getElementById('field');
if (canvas && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  try {
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(55, 2, 0.1, 100);
    cam.position.set(0, 6.8, 11.5);
    const COLS = 150, ROWS = 100, N = COLS * ROWS;
    const pos = new Float32Array(N * 3), col = new Float32Array(N * 3), fam = new Float32Array(N);
    const palette = [[0.608,0.773,0.239],[1.000,0.420,0.341],[0.055,0.486,0.482],[0.690,0.188,0.478]]; // FUEL lime · GUARD coral · ANCHOR teal · CATALYST magenta
    let i = 0;
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      const px = (x - COLS / 2) * 0.24, pz = (y - ROWS / 2) * 0.24;
      pos[i*3] = px; pos[i*3+1] = 0; pos[i*3+2] = pz;
      const f = Math.min(3, Math.max(0, Math.floor(((px + 18) / 36) * 4)));
      fam[i] = f;
      const c = palette[f];
      col[i*3] = c[0]; col[i*3+1] = c[1]; col[i*3+2] = c[2]; i++;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    geo.setAttribute('aFam', new THREE.BufferAttribute(fam, 1));
    const uniforms = {
      uTime: { value: 0 }, uPx: { value: 0 },
      uPointer: { value: new THREE.Vector2(999, 999) },
      uBoost: { value: new THREE.Vector4(0, 0, 0, 0) }
    };
    const mat = new THREE.ShaderMaterial({
      uniforms, transparent: true, depthWrite: false,
      vertexShader: `
        attribute vec3 aColor; attribute float aFam;
        uniform float uTime; uniform vec2 uPointer; uniform vec4 uBoost; uniform float uPx;
        varying vec3 vColor; varying float vGlow; varying float vFade; varying float vRing;
        varying float vLogo; varying vec3 vLogoColor;
        float boostOf(float f){
          if (f < 0.5) return uBoost.x; if (f < 1.5) return uBoost.y;
          if (f < 2.5) return uBoost.z; return uBoost.w; }
        vec3 brainColor(float idx){
          float m = mod(idx, 4.0);
          if (m < 0.5) return vec3(0.608, 0.773, 0.239);
          if (m < 1.5) return vec3(1.000, 0.420, 0.341);
          if (m < 2.5) return vec3(0.055, 0.486, 0.482);
          return vec3(0.690, 0.188, 0.478); }
        void main(){
          vec3 p = position;
          float d = length(p.xz);
          float t = uTime;
          float h = sin(p.x * 0.32 + t * 0.7) * 0.34 + cos(p.z * 0.42 - t * 0.55) * 0.30
                  + sin((p.x + p.z) * 0.16 + t * 0.4) * 0.22;
          float cyc = fract(t * 2.8);
          float ring = exp(-pow((d - cyc * 19.0) * 1.15, 2.0)) * (1.0 - cyc);
          float cyc2 = fract(t * 1.4 + 0.5);
          float ring2 = exp(-pow((d - cyc2 * 19.0) * 0.9, 2.0)) * (1.0 - cyc2) * 0.55;
          h += ring * 1.3 + ring2 * 0.6;
          vRing = ring;
          // — THE LOGO MATTRESS — wave-ring outlines tiled across the field
          vec2 cellSize = vec2(9.0, 8.0);
          vec2 shifted = p.xz + vec2(18.0, 12.0);
          vec2 cell = floor(shifted / cellSize);
          vec2 local = mod(shifted, cellSize) - cellSize * 0.5;
          float hash = fract(sin(dot(cell, vec2(12.9898, 78.233))) * 43758.5453);
          float ang = atan(local.y, local.x);
          float rot = t * 0.22 + hash * 6.2831;
          float ringR = 3.05 * (1.0 + 0.085 * cos(9.0 * (ang - rot)));
          float logo = smoothstep(0.46, 0.08, abs(length(local) - ringR));
          float pulsePhase = t * 0.7 + hash * 2.0;
          float pulseEnv = 0.5 + 0.5 * sin(pulsePhase * 6.2831);
          float stepIdx = floor(pulsePhase) + hash * 4.0;
          vec3 lc = mix(brainColor(stepIdx), brainColor(stepIdx + 1.0),
                        smoothstep(0.72, 1.0, fract(pulsePhase)));
          vLogo = logo;
          vLogoColor = lc * (0.85 + 0.45 * pulseEnv);
          float logoPulse = 0.75 + 0.45 * pulseEnv;
          h += logo * 0.38 * logoPulse;
          float pd = distance(p.xz, uPointer);
          h += exp(-pd * pd * 0.10) * 0.85;
          float bst = boostOf(aFam);
          h += bst * 0.55 * (0.6 + 0.4 * sin(t * 2.2 + p.x * 0.5));
          p.y += h;
          vGlow = ring * 1.25 + ring2 * 0.6 + exp(-pd * pd * 0.10) * 0.8 + bst * 0.7 + logo * 1.1 * logoPulse;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_PointSize = uPx * (4.3 + vGlow * 5.6) * mix(0.42, 1.45, logo) * (11.0 / -mv.z);
          vFade = smoothstep(26.0, 9.0, length(mv.xyz));
          vColor = aColor;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        varying vec3 vColor; varying float vGlow; varying float vFade; varying float vRing;
        varying float vLogo; varying vec3 vLogoColor;
        void main(){
          vec2 q = gl_PointCoord - 0.5;
          float m = smoothstep(0.5, 0.08, length(q));
          vec3 c = mix(vColor, vec3(1.0), clamp(vRing, 0.0, 1.0) * 0.7);
          c = mix(c, vLogoColor, vLogo);
          c += vec3(0.894, 1.0, 0.592) * clamp(vGlow - vRing, 0.0, 1.0) * 0.22 * (1.0 - vLogo);
          float a = m * (0.88 + vGlow * 0.4) * vFade * mix(0.34, 1.0, vLogo);
          gl_FragColor = vec4(c, a);
        }`
    });
    scene.add(new THREE.Points(geo, mat));
    const boostTarget = [0, 0, 0, 0];
    const cards = document.querySelectorAll('.card');
    const order = ['fuel', 'guard', 'anchor', 'catalyst'];
    cards.forEach(card => {
      const idx = order.findIndex(k => card.classList.contains(k));
      if (idx < 0) return;
      card.addEventListener('pointerenter', () => boostTarget[idx] = 1);
      card.addEventListener('pointerleave', () => boostTarget[idx] = 0);
    });
    function resize() {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (w && h && (canvas.width !== w || canvas.height !== h)) {
        renderer.setSize(w, h, false);
        cam.aspect = w / h; cam.updateProjectionMatrix();
        uniforms.uPx.value = renderer.getPixelRatio() * h / 620;
      }
    }
    const ray = new THREE.Raycaster();
    const planeY0 = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const ndc = new THREE.Vector2(); const hit = new THREE.Vector3();
    let tx = 0, ty = 0;
    addEventListener('pointermove', e => {
      tx = (e.clientX / innerWidth - 0.5); ty = (e.clientY / innerHeight - 0.5);
      const r = canvas.getBoundingClientRect();
      if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) {
        ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
        ray.setFromCamera(ndc, cam);
        if (ray.ray.intersectPlane(planeY0, hit)) uniforms.uPointer.value.set(hit.x, hit.z);
      }
    });
    const clock = new THREE.Clock();
    (function tick() {
      requestAnimationFrame(tick);
      resize();
      const t = clock.getElapsedTime();
      uniforms.uTime.value = t;
      const b = uniforms.uBoost.value;
      b.x += (boostTarget[0] - b.x) * 0.05; b.y += (boostTarget[1] - b.y) * 0.05;
      b.z += (boostTarget[2] - b.z) * 0.05; b.w += (boostTarget[3] - b.w) * 0.05;
      cam.position.x += (tx * 2.4 - cam.position.x) * 0.03;
      cam.position.y += (6.8 - ty * 1.4 - cam.position.y) * 0.03;
      cam.lookAt(0, -0.4, 0);
      renderer.render(scene, cam);
    })();
  } catch (e) { /* static premium design stands on its own */ }
}
