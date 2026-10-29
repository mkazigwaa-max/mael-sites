/* ASCENSION PLUS — the living delta scene (AP-11, the portal's main
   activation point). A point-cloud visage built from two states — Day 0 and
   current — morphed by the subscriber's three delta metrics from the master
   document: facial width reduction, under-eye darkness clearance, and light
   reflection (glow). Three.js, one scene, no assets. */
import * as THREE from "./vendor/three.module.js";

const canvas = document.getElementById("delta3d");
if (canvas && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
  try { init(); } catch (e) { canvas.style.display = "none"; }
} else if (canvas) { canvas.style.display = "none"; }

function init() {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  cam.position.set(0, 0.2, 7.2);

  /* Visage point cloud: an ellipsoid head field, denser at the features.
     Each point carries a Day-0 position and a Day-14 position; the morph
     uniform blends them. Width metric narrows x at the jaw band, darkness
     metric lifts the under-eye points' brightness, glow raises point size
     and warmth across the high points (cheekbones, brow, nose bridge). */
  const N = 9000;
  const pos0 = new Float32Array(N * 3), pos1 = new Float32Array(N * 3);
  const seed = new Float32Array(N * 3);
  let i = 0;
  while (i < N) {
    const u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2;
    const r = Math.sqrt(1 - u * u);
    let x = r * Math.cos(th) * 1.55, y = u * 2.05, z = r * Math.sin(th) * 1.5;
    if (z < -0.25) continue; // front hemisphere bias
    // jaw band: Day 0 wider, Day 14 narrower (submental drainage)
    const jaw = THREE.MathUtils.smoothstep(-y, 0.4, 1.5);
    const x0 = x * (1 + 0.16 * jaw), x1 = x * (1 - 0.05 * jaw);
    // cheek hollows sharpen on Day 14
    const cheek = Math.exp(-Math.pow((Math.abs(x) - 0.95), 2) * 3) * Math.exp(-Math.pow(y - 0.15, 2) * 2);
    pos0.set([x0, y, z - cheek * 0.05], i * 3);
    pos1.set([x1, y + cheek * 0.05, z + cheek * 0.12], i * 3);
    seed.set([Math.random(), jaw, cheek], i * 3);
    i++;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos0.slice(), 3));
  geo.setAttribute("aPos1", new THREE.BufferAttribute(pos1, 3));
  geo.setAttribute("aSeed", new THREE.BufferAttribute(seed, 3));
  const uniforms = {
    uMix: { value: 0.35 },       // Day 0 -> current blend
    uDark: { value: 0.4 },       // under-eye darkness clearance 0..1
    uGlow: { value: 0.45 },      // light reflection score 0..1
    uTime: { value: 0 },
    uPx: { value: renderer.getPixelRatio() }
  };
  const mat = new THREE.ShaderMaterial({
    uniforms, transparent: true, depthWrite: false,
    vertexShader: `
      attribute vec3 aPos1; attribute vec3 aSeed;
      uniform float uMix; uniform float uDark; uniform float uGlow; uniform float uTime; uniform float uPx;
      varying vec3 vC; varying float vA;
      void main(){
        vec3 p = mix(position, aPos1, uMix);
        p.x += sin(uTime * 0.6 + aSeed.x * 17.0) * 0.012;
        p.y += cos(uTime * 0.5 + aSeed.x * 23.0) * 0.012;
        // under-eye band: darkness clears -> points brighten and lift
        float eye = exp(-pow((p.y - 0.42), 2.0) * 9.0) * step(0.25, abs(p.x)) * step(abs(p.x), 1.15);
        vec3 base = vec3(0.78, 0.70, 0.62);
        vec3 col = base * (0.55 + 0.45 * (p.z + 1.5) / 3.0);
        col = mix(col, vec3(0.36, 0.30, 0.34), eye * (1.0 - uDark) * 0.85);
        col += vec3(0.98, 0.80, 0.55) * aSeed.z * uGlow * 0.55;      // cheek glow
        col += vec3(0.85, 0.72, 0.50) * uGlow * 0.12;
        vC = col;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        float sz = (1.5 + aSeed.z * 2.2 * uGlow + eye * uDark * 0.8) * uPx;
        gl_PointSize = sz * (3.4 / -mv.z);
        vA = 0.5 + 0.5 * (p.z + 1.5) / 3.0;
      }`,
    fragmentShader: `
      varying vec3 vC; varying float vA;
      void main(){
        vec2 d = gl_PointCoord - 0.5;
        float a = smoothstep(0.5, 0.12, length(d)) * vA;
        gl_FragColor = vec4(vC, a);
      }`
  });
  const pts = new THREE.Points(geo, mat);
  scene.add(pts);

  const state = { mix: 0.35, dark: 0.4, glow: 0.45 };
  window.__skinaaDelta = state;
  function resize() {
    const w = canvas.clientWidth || 640, h = canvas.clientHeight || 520;
    renderer.setSize(w, h, false);
    cam.aspect = w / h; cam.updateProjectionMatrix();
  }
  resize(); addEventListener("resize", resize);
  let mx = 0, my = 0;
  canvas.addEventListener("pointermove", e => {
    const r = canvas.getBoundingClientRect();
    mx = ((e.clientX - r.left) / r.width - 0.5) * 0.7;
    my = ((e.clientY - r.top) / r.height - 0.5) * 0.4;
  });
  const clock = new THREE.Clock();
  (function tick() {
    requestAnimationFrame(tick);
    const t = clock.getElapsedTime();
    uniforms.uTime.value = t;
    uniforms.uMix.value += (state.mix - uniforms.uMix.value) * 0.05;
    uniforms.uDark.value += (state.dark - uniforms.uDark.value) * 0.05;
    uniforms.uGlow.value += (state.glow - uniforms.uGlow.value) * 0.05;
    pts.rotation.y += ((mx + Math.sin(t * 0.22) * 0.16) - pts.rotation.y) * 0.04;
    pts.rotation.x += (my * 0.5 - pts.rotation.x) * 0.04;
    renderer.render(scene, cam);
  })();
}
