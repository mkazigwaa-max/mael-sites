// SKINAA — THE VEIL (custom build)
// Full custom GLSL smoke: domain-warped fbm drifting upward in warm
// taupe and champagne over porcelain. Two octaves of warp; the smoke
// is light itself — no file, no loop, never repeats.
import * as THREE from './vendor/three.module.js';
const canvas = document.getElementById('veil');
if (canvas && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  try {
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    const scene = new THREE.Scene();
    const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const uniforms = { uTime: { value: 0 }, uRes: { value: new THREE.Vector2(1, 1) } };
    const frag = `
      precision highp float;
      uniform float uTime; uniform vec2 uRes;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
      float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
        return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y); }
      float fbm(vec2 p){ float v = 0.0, a = 0.55;
        for(int i = 0; i < 6; i++){ v += a * noise(p); p = p * 2.11 + vec2(13.7, 7.3); a *= 0.55; } return v; }
      void main(){
        vec2 uv = gl_FragCoord.xy / uRes;
        vec2 p = uv; p.x *= uRes.x / uRes.y;
        float t = uTime * 0.028;
        vec2 q = vec2(fbm(p * 1.9 + vec2(0.0, -t * 1.6)), fbm(p * 1.9 + vec2(4.7, 2.9) - t));
        vec2 r = vec2(fbm(p * 2.3 + q * 2.2 + vec2(1.3, 8.1) + vec2(0.0, -t * 2.2)), fbm(p * 2.3 + q * 2.2 + vec2(7.7, 3.4)));
        float f = fbm(p * 2.0 + r * 2.4);
        vec3 taupe = vec3(0.55, 0.55, 0.54);
        vec3 champ = vec3(0.72, 0.72, 0.70);
        vec3 col = mix(taupe, champ, smoothstep(0.4, 0.9, r.x));
        col = mix(col, vec3(0.88, 0.88, 0.86), shaft * 0.5);
        float shaft = exp(-pow((uv.x + uv.y - 1.15 - 0.10 * sin(uTime * 0.11)) * 3.4, 2.0));
        float a = smoothstep(0.52, 0.95, f) * 0.21 + smoothstep(0.6, 1.0, q.y) * 0.09 + shaft * 0.05;
        float topfade = smoothstep(1.05, 0.55, uv.y);
        gl_FragColor = vec4(col, a * topfade);
      }`;
    scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2),
      new THREE.ShaderMaterial({ uniforms, fragmentShader: frag, transparent: true, depthWrite: false,
        vertexShader: 'void main(){ gl_Position = vec4(position.xy, 0.0, 1.0); }' })));
    function resize() {
      const w = innerWidth, h = innerHeight;
      if (canvas.width !== w || canvas.height !== h) { renderer.setSize(w, h, false); uniforms.uRes.value.set(canvas.width, canvas.height); }
    }
    const clock = new THREE.Clock();
    (function tick() { requestAnimationFrame(tick); resize(); uniforms.uTime.value = clock.getElapsedTime(); renderer.render(scene, cam); })();
  } catch (e) { /* static premium design stands on its own */ }
}
