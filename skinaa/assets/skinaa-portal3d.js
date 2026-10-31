/* ASCENSION PLUS — the clinical delta instrument (AP-11, the portal's main
   activation point, clinical-max pass 2026-10-30).

   The scene is a measuring instrument, not an illustration:
   - a structured parametric visage field (grid-sampled, feature-shaped:
     brow, sockets, nose, cheeks, lips, chin, tapered jaw), each point
     carrying its Day 0 and current positions from the master document's
     three delta metrics — facial width reduction, under-eye darkness
     clearance, light reflection;
   - the Day 0 baseline rendered as a faint ghost field underneath, so the
     delta is literally visible, the way the document specifies the portal:
     a 3D overlay comparing the Day 0 baseline with the current week;
   - topographic contour banding that resolves as the delta resolves;
   - an active scan plane sweeping the field at constant velocity with
     instrument holds, lighting the points it crosses in the signal color;
   - jaw calipers that track the morph — measurement made visible;
   - a HUD wired to the member's own slider values (never invented data),
     plus live instrument chrome: scan position, field size, measured FPS.
   Motion is measured throughout: constant velocities, damped turns, no
   bounce. Three.js, one scene, no assets. */
import * as THREE from "./vendor/three.module.js";

function smoothstep(x, a, b) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}
const gauss = (d, w) => Math.exp(-(d * d) / (w * w));

const canvas = document.getElementById("delta3d");
const frame = document.getElementById("scanframe");
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

if (canvas && !reduced) {
  try { init(); }
  catch (e) { if (frame) frame.classList.add("off"); else canvas.style.display = "none"; }
} else if (frame) { frame.classList.add("off"); }
else if (canvas) { canvas.style.display = "none"; }

function init() {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  cam.position.set(0, 0.1, 5.4);

  const group = new THREE.Group();
  scene.add(group);

  /* ---- the visage field ------------------------------------------------
     Grid-sampled over the front of an ellipsoid, then shaped. Two states
     per point: Day 0 (position) and current (aPos1). */
  const small = Math.min(innerWidth, canvas.clientWidth || innerWidth) < 640;
  const NU = small ? 88 : 126, NV = small ? 110 : 150;
  const N = NU * NV;
  const RX = 1.52, RY = 2.02, RZ = 1.46;
  const pos0 = new Float32Array(N * 3), pos1 = new Float32Array(N * 3);
  const seed = new Float32Array(N * 3), eyeA = new Float32Array(N), reliefA = new Float32Array(N);
  let p = 0;
  for (let j = 0; j < NV; j++) {
    const polar = (0.16 + 0.76 * (j / (NV - 1))) * Math.PI;      // top -> under chin
    const sp = Math.sin(polar), cp = Math.cos(polar);
    for (let i = 0; i < NU; i++, p++) {
      const lon = ((i / (NU - 1)) * 2 - 1) * 1.42;               // front sweep
      let x = RX * sp * Math.sin(lon);
      let y = RY * cp;
      let z = RZ * sp * Math.cos(lon);
      const ax = Math.abs(x);
      const zBase = z;
      // feature shaping (Day-0 and current share the anatomy)
      z += 0.055 * gauss(y - 0.62, 0.17);                                    // brow ridge
      z -= 0.085 * gauss(ax - 0.52, 0.21) * gauss(y - 0.34, 0.17);           // eye sockets
      z += 0.16 * gauss(x, 0.16) * gauss(y - 0.02, 0.34);                    // nose ridge
      z += 0.13 * gauss(x, 0.13) * gauss(y + 0.18, 0.13);                    // nose tip
      z += 0.045 * gauss(ax - 0.88, 0.30) * gauss(y - 0.02, 0.30);           // cheekbones
      z += 0.035 * gauss(x, 0.30) * gauss(y + 0.66, 0.07);                   // lips
      z += 0.05 * gauss(x, 0.24) * gauss(y + 1.28, 0.16);                    // chin
      const rlf = (z - zBase) * 3.2;                                         // signed relief, for shading
      reliefA[p] = Math.max(-1, Math.min(1, rlf < 0 ? rlf * 1.7 : rlf));     // recesses shade deeper
      if (y < -0.55) {                                                       // jaw taper
        const t = smoothstep(-y, 0.55, 1.5);
        x *= 1 - 0.16 * t; z -= 0.10 * t;
      }
      // delta masks
      const jawT = gauss(y + 0.95, 0.5);                                     // submental band
      const cheekM = gauss(ax - 0.95, 0.28) * gauss(y - 0.10, 0.30);
      const eyeM = gauss(ax - 0.52, 0.26) * gauss(y - 0.22, 0.15);
      const glowM = Math.min(1, cheekM + gauss(y - 0.62, 0.17) * 0.8 + gauss(x, 0.12) * gauss(y - 0.30, 0.50));
      // Day 0: jaw wider, cheeks hollowed. Current: narrowed, sharpened, under-eye lifted.
      pos0.set([x * (1 + 0.14 * jawT), y, z - cheekM * 0.04], p * 3);
      pos1.set([x * (1 - 0.06 * jawT), y + eyeM * 0.045, z + cheekM * 0.10 + eyeM * 0.03], p * 3);
      seed.set([Math.random(), jawT, glowM], p * 3);
      eyeA[p] = eyeM;
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos0, 3));
  geo.setAttribute("aPos1", new THREE.BufferAttribute(pos1, 3));
  geo.setAttribute("aSeed", new THREE.BufferAttribute(seed, 3));
  geo.setAttribute("aEye", new THREE.BufferAttribute(eyeA, 1));
  geo.setAttribute("aRelief", new THREE.BufferAttribute(reliefA, 1));

  const uniforms = {
    uMix: { value: 0.35 },       // Day 0 -> current blend (width slider)
    uDark: { value: 0.4 },       // under-eye darkness clearance 0..1
    uGlow: { value: 0.45 },      // light reflection score 0..1
    uTime: { value: 0 },
    uScan: { value: 2.2 },       // scan plane height (world y)
    uPx: { value: renderer.getPixelRatio() }
  };
  const vertHead = `
    attribute vec3 aPos1; attribute vec3 aSeed; attribute float aEye; attribute float aRelief;
    uniform float uMix; uniform float uDark; uniform float uGlow;
    uniform float uTime; uniform float uScan; uniform float uPx;
    varying vec3 vC; varying float vA;`;
  const mat = new THREE.ShaderMaterial({
    uniforms, transparent: true, depthWrite: false,
    vertexShader: vertHead + `
      void main(){
        vec3 p = mix(position, aPos1, uMix);
        p.x += sin(uTime * 0.6 + aSeed.x * 17.0) * 0.008;
        p.y += cos(uTime * 0.5 + aSeed.x * 23.0) * 0.008;
        float depth = clamp((p.z + 1.6) / 3.2, 0.0, 1.0);
        // ivory field, shaded by depth AND signed relief — raised anatomy
        // (nose, brow, cheeks, chin) catches light; recessed anatomy shades down
        vec3 col = vec3(0.925, 0.906, 0.918) * (0.40 + 0.60 * depth) * (1.0 + aRelief * 0.55);
        // under-eye: darkness clears with the metric — plum-black lifts to ivory
        col = mix(col, vec3(0.098, 0.031, 0.055), clamp(aEye * (1.0 - uDark) * 1.15, 0.0, 1.0));
        col += aEye * uDark * vec3(0.10, 0.10, 0.09);
        // light reflection on the high points, in ivory
        col += vec3(0.925, 0.906, 0.918) * aSeed.z * uGlow * 0.65;
        // topographic contours (iso-height), resolving as the delta resolves
        float d = abs(fract(p.y / 0.24 + 0.5) - 0.5) * 0.24;
        float line = smoothstep(0.030, 0.0, d) * (0.25 + 0.75 * uMix);
        col = mix(col, vec3(0.925, 0.906, 0.918), line * 0.75);
        // the scan plane reads the field
        float scan = smoothstep(0.09, 0.0, abs(p.y - uScan));
        col = mix(col, vec3(0.749, 0.208, 0.200), scan * 0.9);
        vC = col;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        float sz = 4.3 + aSeed.z * uGlow * 1.8 + line * 2.2 + aEye * uDark * 0.6 + scan * 2.8;
        gl_PointSize = sz * uPx * (3.6 / -mv.z);
        vA = max(0.50 + 0.50 * depth + line * 0.5, scan * 0.95);
      }`,
    fragmentShader: `
      varying vec3 vC; varying float vA;
      void main(){
        vec2 q = gl_PointCoord - 0.5;
        float a = smoothstep(0.5, 0.12, length(q)) * vA;
        gl_FragColor = vec4(vC, a);
      }`
  });
  const pts = new THREE.Points(geo, mat);
  group.add(pts);

  /* Day 0 ghost — the frozen baseline under the current scan. */
  const ghostMat = new THREE.ShaderMaterial({
    uniforms: { uPx: uniforms.uPx }, transparent: true, depthWrite: false,
    vertexShader: `
      uniform float uPx; varying float vA;
      void main(){
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = 1.7 * uPx * (3.6 / -mv.z);
        vA = 0.10 + 0.08 * clamp((position.z + 1.6) / 3.2, 0.0, 1.0);
      }`,
    fragmentShader: `
      varying float vA;
      void main(){
        vec2 q = gl_PointCoord - 0.5;
        float a = smoothstep(0.5, 0.12, length(q)) * vA;
        gl_FragColor = vec4(vec3(0.925, 0.906, 0.918), a);
      }`
  });
  group.add(new THREE.Points(geo, ghostMat));

  /* Scan light-sheet + bright core line, riding the scan plane. */
  const sheet = new THREE.Mesh(
    new THREE.PlaneGeometry(3.9, 0.16),
    new THREE.MeshBasicMaterial({ color: 0xBF3533, transparent: true, opacity: 0.10, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })
  );
  const core = new THREE.Mesh(
    new THREE.PlaneGeometry(3.9, 0.014),
    new THREE.MeshBasicMaterial({ color: 0xBF3533, transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide })
  );
  group.add(sheet, core);

  /* Jaw calipers — verticals + inward ticks + base connector, x tracks the morph. */
  const calGeo = new THREE.BufferGeometry();
  const calPos = new Float32Array(7 * 2 * 3);
  calGeo.setAttribute("position", new THREE.BufferAttribute(calPos, 3));
  const calipers = new THREE.LineSegments(calGeo, new THREE.LineBasicMaterial({ color: 0xECE7EA, transparent: true, opacity: 0.85 }));
  group.add(calipers);
  function setCalipers(cx) {
    const yT = -0.42, yB = -1.62, tk = 0.14;
    const seg = [
      -cx, yT, 0.9, -cx, yB, 0.9,   cx, yT, 0.9, cx, yB, 0.9,          // verticals
      -cx, yT, 0.9, -cx + tk, yT, 0.9,   cx, yT, 0.9, cx - tk, yT, 0.9, // top ticks
      -cx, yB, 0.9, -cx + tk, yB, 0.9,   cx, yB, 0.9, cx - tk, yB, 0.9, // bottom ticks
      -cx, yB, 0.9, cx, yB, 0.9                                          // base connector
    ];
    calPos.set(seg); calGeo.attributes.position.needsUpdate = true;
  }

  /* ---- state + HUD ---------------------------------------------------- */
  const state = { mix: 0.35, dark: 0.4, glow: 0.45 };
  window.__skinaaDelta = state;
  const $ = id => document.getElementById(id);
  const hudScan = $("hudScan"), hudDelta = $("hudDelta"), hudPts = $("hudPts"), hudFps = $("hudFps");
  if (hudPts) hudPts.textContent = "FIELD " + (N * 2).toLocaleString("en-US") + " PTS";
  function refreshHud(scanPct, fps) {
    if (hudScan) hudScan.textContent = "SCAN " + String(scanPct).padStart(3, "0") + "%";
    if (hudDelta) hudDelta.textContent = Math.round(state.mix * 100) + "%";
    if (hudFps) hudFps.textContent = fps + " FPS";
    const w = $("rWidth"), d = $("rDark"), g = $("rGlow");
    if (w && $("hudW")) $("hudW").textContent = "−" + w.value + "%";
    if (d && $("hudD")) $("hudD").textContent = d.value + "%";
    if (g && $("hudL")) $("hudL").textContent = "+" + Math.round(g.value * 0.4) + "%";
  }

  function resize() {
    const w = canvas.clientWidth || 640, h = canvas.clientHeight || 520;
    renderer.setSize(w, h, false);
    cam.aspect = w / h;
    // fit the full instrument (face + calipers) inside narrow viewports
    cam.position.z = Math.max(5.4, 3.7 / (2 * Math.tan(THREE.MathUtils.degToRad(21)) * cam.aspect));
    cam.updateProjectionMatrix();
  }
  resize(); addEventListener("resize", resize);

  let mx = 0, my = 0;
  canvas.addEventListener("pointermove", e => {
    const r = canvas.getBoundingClientRect();
    mx = ((e.clientX - r.left) / r.width - 0.5) * 0.7;
    my = ((e.clientY - r.top) / r.height - 0.5) * 0.4;
  });

  /* Scan cycle: constant velocity down 6.4s, hold 0.7s, return 6.4s, hold 0.7s. */
  const SCAN_TOP = 2.2, SCAN_BOT = -2.2, SWEEP = 6.4, HOLD = 0.7, CYCLE = SWEEP * 2 + HOLD * 2;
  function scanY(t) {
    const c = t % CYCLE;
    if (c < SWEEP) return SCAN_TOP + (SCAN_BOT - SCAN_TOP) * (c / SWEEP);
    if (c < SWEEP + HOLD) return SCAN_BOT;
    if (c < SWEEP * 2 + HOLD) return SCAN_BOT + (SCAN_TOP - SCAN_BOT) * ((c - SWEEP - HOLD) / SWEEP);
    return SCAN_TOP;
  }

  const clock = new THREE.Clock();
  let frames = 0, lastHudT = 0, fps = 0;
  (function tick() {
    requestAnimationFrame(tick);
    const t = clock.getElapsedTime();
    uniforms.uTime.value = t;
    uniforms.uMix.value += (state.mix - uniforms.uMix.value) * 0.05;
    uniforms.uDark.value += (state.dark - uniforms.uDark.value) * 0.05;
    uniforms.uGlow.value += (state.glow - uniforms.uGlow.value) * 0.05;
    const sy = scanY(t);
    uniforms.uScan.value = sy;
    sheet.position.y = sy; core.position.y = sy;
    setCalipers(1.23 * (1 + 0.14 - 0.20 * uniforms.uMix.value) + 0.05);
    group.rotation.y += ((mx + Math.sin(t * 0.22) * 0.16) - group.rotation.y) * 0.04;
    group.rotation.x += (my * 0.5 - group.rotation.x) * 0.04;
    renderer.render(scene, cam);
    frames++;
    if (t - lastHudT >= 0.5) {           // honest measured frame rate, 2 ticks/sec
      fps = Math.round(frames / (t - lastHudT));
      frames = 0; lastHudT = t;
      refreshHud(Math.round((SCAN_TOP - sy) / (SCAN_TOP - SCAN_BOT) * 100), fps);
    }
  })();
}
