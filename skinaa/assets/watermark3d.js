// SKINAA — THE LIVING WATERMARK (Three.js, custom build)
// The poster's repeating SKINAA writing as a living depth field:
// an almost-imperceptible drift, a soft bend around the pointer,
// and a champagne sheen that follows the touch. One fullscreen quad.
// Falls back silently: the static .wm layer stays if WebGL is absent.
import * as THREE from './vendor/three.module.js';
const canvas = document.getElementById('wm3d');
const fallback = document.querySelector('.wm');
if (canvas && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  try {
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    const scene = new THREE.Scene();
    const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    // Poster texture: charcoal field, watermark-tone writing, staggered rows.
    const tc = document.createElement('canvas'); tc.width = 1024; tc.height = 1024;
    const g = tc.getContext('2d');
    g.fillStyle = '#4B4B4D'; g.fillRect(0, 0, 1024, 1024);
    g.fillStyle = '#515154';
    g.font = '800 168px -apple-system, system-ui, sans-serif';
    g.textBaseline = 'alphabetic';
    for (let r = 0; r < 7; r++) {
      const y = 150 + r * 158, off = (r % 2) ? -260 : 0;
      g.fillText('SKINAA SKINAA', off, y);
    }
    const tex = new THREE.CanvasTexture(tc);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1.6, 1.6);
    const uniforms = {
      uTex: { value: tex },
      uTime: { value: 0 },
      uPtr: { value: new THREE.Vector2(0.5, 0.5) },
      uPtrAmt: { value: 0 }
    };
    const mat = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
      fragmentShader: `
        uniform sampler2D uTex; uniform float uTime; uniform vec2 uPtr; uniform float uPtrAmt;
        varying vec2 vUv;
        void main(){
          vec2 uv = vUv;
          // Living drift: the field breathes sideways, slower than thought.
          uv.x += sin(uv.y * 4.0 + uTime * 0.07) * 0.006;
          uv.y += cos(uv.x * 3.0 + uTime * 0.05) * 0.004;
          // Pointer bend: the writing recedes softly around the touch.
          vec2 d = uv - uPtr; float dist = length(d);
          float bend = exp(-dist * dist * 9.0) * uPtrAmt;
          uv += normalize(d + 0.0001) * bend * 0.035;
          vec3 col = texture2D(uTex, uv).rgb;
          // Champagne sheen following the pointer.
          col += vec3(0.69, 0.55, 0.34) * pow(max(0.0, 1.0 - dist), 3.0) * 0.07 * uPtrAmt;
          // Resting light: a faint warmth that travels the field on its own.
          col += vec3(0.69, 0.55, 0.34) * 0.03 * (0.5 + 0.5 * sin(uTime * 0.11 + uv.y * 2.0));
          gl_FragColor = vec4(col, 1.0);
        }`
    });
    scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat));
    const ptr = new THREE.Vector2(0.5, 0.5), target = new THREE.Vector2(0.5, 0.5);
    let amt = 0, amtT = 0;
    addEventListener('pointermove', e => {
      target.set(e.clientX / innerWidth, 1 - e.clientY / innerHeight); amtT = 1;
    }, { passive: true });
    addEventListener('pointerleave', () => { amtT = 0; });
    function size() { renderer.setSize(innerWidth, innerHeight, false); }
    addEventListener('resize', size); size();
    if (fallback) fallback.style.display = 'none';
    const clock = new THREE.Clock();
    (function loop() {
      requestAnimationFrame(loop);
      if (document.hidden) return;
      ptr.lerp(target, 0.045); amt += (amtT - amt) * 0.03;
      uniforms.uTime.value = clock.getElapsedTime();
      uniforms.uPtr.value.copy(ptr); uniforms.uPtrAmt.value = amt;
      renderer.render(scene, cam);
    })();
  } catch (e) { /* static watermark remains */ }
}
