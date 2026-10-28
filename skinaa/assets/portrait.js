// SKINAA — THE LIVING PORTRAIT v2 (custom build)
// The face breathes: a slow fractal-noise field moves through the
// surface like light under skin. The pointer sends a chromatic ripple
// across her — the image refracts, it never distorts. Champagne dust
// motes drift between viewer and face: real depth, real parallax.
// The master file is never altered; only light moves.
import * as THREE from './vendor/three.module.js';
const canvas = document.getElementById('portrait3d');
if (canvas && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  try {
    const tex = new THREE.TextureLoader().load('assets/skinaa-post-portrait.jpg');
    tex.colorSpace = THREE.SRGBColorSpace;
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(38, 1320 / 1108, 0.1, 50);
    cam.position.z = 3.1;
    const uniforms = {
      uTex: { value: tex }, uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(0.5, 0.5) }, uHover: { value: 0 }
    };
    const NOISE = `
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
      float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
        return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y); }
      float fbm(vec2 p){ float v = 0.0, a = 0.55;
        for(int i = 0; i < 4; i++){ v += a * noise(p); p = p * 2.07 + vec2(11.3, 5.7); a *= 0.55; } return v; }`;
    const mat = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: NOISE + `
        uniform float uTime; uniform vec2 uMouse; uniform float uHover;
        varying vec2 vUv; varying float vRipple;
        void main(){
          vUv = uv;
          vec3 pos = position;
          float win = smoothstep(0.0, 0.14, uv.x) * smoothstep(1.0, 0.86, uv.x)
                    * smoothstep(0.0, 0.14, uv.y) * smoothstep(1.0, 0.86, uv.y);
          float breath = fbm(uv * 3.0 + vec2(uTime * 0.05, uTime * 0.034)) - 0.5;
          float d = distance(uv, uMouse);
          float rip = sin(d * 26.0 - uTime * 3.2) * exp(-d * 3.4) * uHover;
          vRipple = rip;
          pos.z += (breath * 0.055 + rip * 0.045) * win;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }`,
      fragmentShader: `
        uniform sampler2D uTex; uniform float uTime; uniform vec2 uMouse; uniform float uHover;
        varying vec2 vUv; varying float vRipple;
        void main(){
          vec2 shift = vec2(vRipple) * 0.010;
          float r = texture2D(uTex, vUv + shift).r;
          float g = texture2D(uTex, vUv).g;
          float b = texture2D(uTex, vUv - shift).b;
          vec4 c = vec4(r, g, b, 1.0);
          float d = distance(vUv, uMouse);
          c.rgb += vec3(0.98, 0.93, 0.84) * exp(-d * 3.0) * uHover * 0.13;
          c.rgb += vec3(0.10, 0.08, 0.05) * abs(vRipple) * 0.35;
          gl_FragColor = c;
        }`
    });
    scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2.38, 2.0, 110, 92), mat));
    // champagne dust motes — a depth layer between viewer and face
    const MN = 170, mp = new Float32Array(MN * 3), ms = [];
    for (let i = 0; i < MN; i++) {
      mp[i*3] = (Math.random() - 0.5) * 2.6; mp[i*3+1] = (Math.random() - 0.5) * 2.2;
      mp[i*3+2] = 0.25 + Math.random() * 0.65;
      ms.push({ s: 0.3 + Math.random() * 0.9, o: Math.random() * 6.28 });
    }
    const mgeo = new THREE.BufferGeometry();
    mgeo.setAttribute('position', new THREE.BufferAttribute(mp, 3));
    const motes = new THREE.Points(mgeo, new THREE.PointsMaterial({
      color: 0xd8bc8a, size: 0.016, transparent: true, opacity: 0.65,
      depthWrite: false, sizeAttenuation: true }));
    scene.add(motes);
    function resize() {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (w && h && (canvas.width !== w || canvas.height !== h)) renderer.setSize(w, h, false);
    }
    let hover = 0;
    canvas.addEventListener('pointermove', e => {
      const r = canvas.getBoundingClientRect();
      uniforms.uMouse.value.set((e.clientX - r.left) / r.width, 1 - (e.clientY - r.top) / r.height);
      hover = 1;
    });
    canvas.addEventListener('pointerleave', () => { hover = 0; });
    const clock = new THREE.Clock();
    (function tick() {
      requestAnimationFrame(tick);
      resize();
      const t = clock.getElapsedTime();
      uniforms.uTime.value = t;
      uniforms.uHover.value += (hover - uniforms.uHover.value) * 0.05;
      const p = mgeo.attributes.position.array;
      for (let i = 0; i < MN; i++) {
        p[i*3+1] += 0.0009 * ms[i].s;
        p[i*3] += Math.sin(t * 0.3 + ms[i].o) * 0.0006;
        if (p[i*3+1] > 1.15) p[i*3+1] = -1.15;
      }
      mgeo.attributes.position.needsUpdate = true;
      renderer.render(scene, cam);
    })();
    canvas.classList.add('live');
  } catch (e) { /* the still portrait remains */ }
}
