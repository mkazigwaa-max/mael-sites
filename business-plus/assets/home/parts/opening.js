// Glossy software tiles connect into workflows when clicked; the loader follows scene and font readiness.





export const meta = {id: 'opening', label: 'The opening', addons: ['utils/BufferGeometryUtils.js']};

// The software, as generic icons in the chosen style (no real brands): "b" is the filled body, "k" is detail cut out of
// it, "l" is a line that stays a line. Same drawings and colors as the laptop v3 page's icon section.
const TOOLS = [
  ['Accounting', '<rect class="b" x="5" y="3" width="14" height="18" rx="2.5"/><path class="k" d="M8.5 7.5h7"/><path class="k dots" d="M9 12.5h.01M12 12.5h.01M15 12.5h.01M9 16.5h.01M12 16.5h.01M15 16.5h.01"/>'],
  ['Email', '<rect class="b" x="3" y="6" width="18" height="12" rx="2"/><path class="k" d="M3.8 7.4l8.2 5.8 8.2-5.8"/>'],
  ['Spreadsheets', '<rect class="b" x="4" y="4" width="16" height="16" rx="2"/><path class="k" d="M4 10h16M4 15h16M10 4v16"/>'],
  ['CRM', '<path class="b" d="M5.2 8h13.6l-1 11.4a1.6 1.6 0 0 1-1.6 1.5H7.8a1.6 1.6 0 0 1-1.6-1.5z"/><path class="l" d="M9 8V7a3 3 0 0 1 6 0v1"/><path class="k" d="M9.5 12a2.5 2.5 0 0 0 5 0"/>'],
  ['Payments', '<rect class="b" x="3" y="6" width="18" height="12" rx="2"/><path class="k" d="M3 10h18M6.5 14.5h4"/>'],
  ['Calendar', '<rect class="b" x="4" y="5" width="16" height="15" rx="2"/><path class="k" d="M4 10h16"/><path class="l" d="M8.5 3v4M15.5 3v4"/><path class="k dots" d="M8.5 14h.01M12 14h.01M15.5 14h.01M8.5 17h.01M12 17h.01"/>'],
  ['Customer list', '<circle class="b" cx="9" cy="8.5" r="3"/><path class="b" d="M3.5 19c1-3 3-4.5 5.5-4.5s4.5 1.5 5.5 4.5z"/><circle class="b" cx="17" cy="8.5" r="2.2"/><path class="l" d="M16.5 13.6c2.2 0 3.6 1.1 4.4 3.4"/>'],
  ['Shared files', '<path class="b" d="M3 7.5A2 2 0 0 1 5 5.5h4l2 2h8a2 2 0 0 1 2 2v7.5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path class="k" d="M3.4 10h17.2"/>'],
  ['Dispatch Board', '<path class="b" d="M2.5 7h11v9h-11z"/><path class="b" d="M13.5 10h4l3 3v3h-7z"/><circle class="b ring" cx="6.5" cy="18" r="1.7"/><circle class="b ring" cx="17" cy="18" r="1.7"/>'],
  ['Texts', '<path class="b" d="M4 5h16v11H9.5L5 19.5V16H4z"/><path class="k" d="M8 9.3h8M8 12.3h5"/>'],
  ['Invoicing', '<rect class="b" x="6" y="3" width="12" height="7" rx="1"/><rect class="b" x="3" y="11" width="18" height="9" rx="1.6"/><path class="k" d="M8 15.5h8M9 6.5h6"/>'],
  ['Reviews', '<path class="b" d="M3 8l9-4 9 4v9l-9 4-9-4z"/><path class="k" d="M3 8l9 4 9-4M12 12v9"/>']
];
// one color per tool (email blue, spreadsheets green, accounting a dark calculator slate)
const APP = ['#2f3c68','#808a9d','#5c5f6b','#b79d7a','#808a9d','#2f3c68','#a78464','#d0d2da','#5c5f6b','#b79d7a','#808a9d','#635032'];

// Headline words rise in one by one.
function splitWords(lh){
  if(!lh.querySelector('.wd')) lh.innerHTML = lh.textContent.split(' ').map(w => '<span class="wd">' + w + '</span>').join(' ');
  return lh.querySelectorAll('.wd');
}

export async function createPart(host){
  const {THREE, renderer, reduce} = host;
  const {mergeVertices} = host.addons;
  const hero = host.section, hc = hero.querySelector('.hero-copy'), ctr = hero.querySelector('[data-ctr]');
  const nEl = hero.querySelector('[data-n]');
  const lh = hero.querySelector('h1'), lsub = hero.querySelector('.sub');
  const coarse = matchMedia('(pointer: coarse)').matches;
  // Phones and touch screens get the lighter build: fewer pixels, a smaller shadow map, simpler bevels, no mouse camera.
  let lite = host.tier === 'lite';
  const lwords = splitWords(lh);

  let disposed = false, lrun = 0;
  const textures = [];
  let scene = null, envTex = null, key = null;
  function disposeAll(){
    disposed = true; lrun++;
    if(scene) scene.traverse(o => {
      if(o.geometry) o.geometry.dispose();
      const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
      ms.forEach(m => { if(m.map) m.map.dispose(); m.dispose(); });
    });
    textures.forEach(t => t.dispose());
    if(envTex) envTex.dispose();
    if(key && key.shadow) key.shadow.dispose();
  }

  try {
    // ---------- the scene: studio reflections, one soft key light that casts shadows, a mint light from below ----------
    scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    // A dark studio with a few soft boxes: the glossy tiles pick up crisp highlight streaks instead of a white wash.
    function studio(){
      const s = new THREE.Scene();
      s.add(new THREE.Mesh(new THREE.SphereGeometry(60, 32, 16), new THREE.MeshBasicMaterial({color: 0x18211e, side: THREE.BackSide})));
      const box = (w, h, x, y, z, c, k) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h),
        new THREE.MeshBasicMaterial({color: new THREE.Color(c).multiplyScalar(k), side: THREE.DoubleSide})); m.position.set(x, y, z); m.lookAt(0, 0, 0); s.add(m); };
      box(22, 6, -8, 32, 4, 0xffffff, 2.6);       // soft box overhead: the bevels catch it, flat faces rarely do
      box(3.5, 30, 36, 2, 4, 0xffffff, 1.5);      // tall strip on the right
      box(24, 4, 4, -24, 24, 0x3EE0A6, 1.0);      // mint bounce from below
      box(40, 26, 0, 4, 46, 0x0d3024, .8);        // behind the camera: deep green, so faces stay dark
      return s;
    }
    const studioScene = studio();
    envTex = pmrem.fromScene(studioScene, 0.02).texture;
    studioScene.traverse(o => { if(o.geometry) o.geometry.dispose(); if(o.material) o.material.dispose(); });
    scene.environment = envTex;
    scene.environmentIntensity = 1;
    pmrem.dispose();

    const FOV = 24, camera = new THREE.PerspectiveCamera(FOV, 1, 1, 10000);
    // The key light is mostly here for the shadows (their darkness is set on the ground, not by this light), so it stays
    // dim: a bright one flashes whole flat faces grey when a tile tips toward it.
    key = new THREE.DirectionalLight(0xffffff, 0.5);
    key.castShadow = true;
    function shadowQuality(){
      key.shadow.mapSize.set(lite ? 512 : 1024, lite ? 512 : 1024);
      key.shadow.radius = lite ? 7 : 12; key.shadow.blurSamples = lite ? 10 : 18; key.shadow.bias = -0.0006;
    }
    shadowQuality();
    scene.add(key, key.target);
    const rim = new THREE.DirectionalLight(0x3EE0A6, 1.7);
    scene.add(rim);
    scene.add(new THREE.HemisphereLight(0xffffff, 0xd9ebe3, 0.9));

    // the page itself catches the tiles' shadows, tinted a little green
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShadowMaterial({color: 0x0b3326, opacity: 0.16}));
    ground.receiveShadow = true;
    scene.add(ground);

    // ---------- the tile: a beveled rounded square, glossy, in its own color, with a clear coat ----------
    function tileGeometry(){
      const b = 0.06, h = 0.5 - b, r = 0.2, s = new THREE.Shape();
      s.moveTo(-h + r, -h); s.lineTo(h - r, -h); s.quadraticCurveTo(h, -h, h, -h + r); s.lineTo(h, h - r); s.quadraticCurveTo(h, h, h - r, h);
      s.lineTo(-h + r, h); s.quadraticCurveTo(-h, h, -h, h - r); s.lineTo(-h, -h + r); s.quadraticCurveTo(-h, -h, -h + r, -h);
      let g = new THREE.ExtrudeGeometry(s, {depth: 0.16, bevelEnabled: true, bevelThickness: 0.07, bevelSize: b,
        bevelSegments: lite ? 4 : 7, curveSegments: lite ? 8 : 14});
      g.center(); g.deleteAttribute('uv'); g.deleteAttribute('normal');
      const g0 = g; g = mergeVertices(g, 1e-4); g0.dispose(); g.computeVertexNormals();
      // the glossy finish: each tile's own color, lighter at the top and deeper at the bottom (multiplies the body color)
      const pos = g.attributes.position, col = new Float32Array(pos.count*3);
      for(let i = 0; i < pos.count; i++){ const k = Math.min(1, Math.max(0, pos.getY(i) + .5)), v = .6 + .7*Math.pow(k, 1.3); col[i*3] = col[i*3 + 1] = col[i*3 + 2] = v; }
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      return g;
    }
    const TILE_GEO = tileGeometry(), FACE_Z = 0.15;
    const ICON_GEO = new THREE.PlaneGeometry(0.56, 0.56);
    const C_BLACK = new THREE.Color(0, 0, 0);

    // the icon: white filled shapes, details cut out (see-through to the tile's color), a soft shadow under it
    function iconTexture(i){
      const svgOf = (keep, fill) => {
        const d = new DOMParser().parseFromString('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="256" height="256" fill="none" stroke-linecap="round" stroke-linejoin="round">' + TOOLS[i][1] + '</svg>', 'image/svg+xml');
        d.querySelectorAll('svg > *').forEach(n => {
          const c = n.classList; if(!keep(c)){ n.remove(); return; }
          n.setAttribute('stroke', fill); n.setAttribute('stroke-width', c.contains('dots') ? 1.7*1.35 : 1.7);
          if(c.contains('b')) n.setAttribute('fill', fill);
        });
        return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(d));
      };
      const load = src => new Promise(r => { const im = new Image(); im.onload = () => r(im); im.src = src; });
      return Promise.all([load(svgOf(c => !c.contains('k'), '#ece8e9')), load(svgOf(c => c.contains('k'), '#130606'))]).then(([body, cutout]) => {
        const S = 256, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
        const m = document.createElement('canvas'); m.width = m.height = S; const mg = m.getContext('2d');
        mg.drawImage(body, 0, 0, S, S); mg.globalCompositeOperation = 'destination-out'; mg.drawImage(cutout, 0, 0, S, S);
        g.shadowColor = 'rgba(0,0,0,.28)'; g.shadowBlur = 8; g.shadowOffsetY = 4; g.drawImage(m, 0, 0);
        const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = renderer.capabilities.getMaxAnisotropy(); return t;
      });
    }

    const tiles = TOOLS.map((tool, i) => {
      const base = new THREE.Color(APP[i]);
      const body = new THREE.MeshPhysicalMaterial({color: base.clone(), vertexColors: true, roughness: 0.38, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05,
        emissive: C_BLACK.clone(), envMapIntensity: 1});
      const mesh = new THREE.Mesh(TILE_GEO, body); mesh.castShadow = true;
      const iconMat = new THREE.MeshStandardMaterial({color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.55, roughness: 0.45,
        transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, visible: false});
      const icon = new THREE.Mesh(ICON_GEO, iconMat); icon.position.z = FACE_Z + 0.004; mesh.add(icon);
      mesh.scale.setScalar(0.001); scene.add(mesh);
      return {i, mesh, body, base, iconMat, slot: 0, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, z0: 0,
        rx: 0, ry: 0, rz: 0, ax: 0, ay: 0, az: 0, rot: 0, s: 0, sv: 0, sT: 0, lit: 0, litT: 0,
        hx: 0, hy: 0, tx: 0, ty: 0, ph: Math.random()*6.28, jx: Math.random() - .5, jy: Math.random() - .5,
        wa: Math.random()*6.28, sp: .8 + Math.random()*.7, spin: (Math.random() - .5)*40};
    });
    [...tiles.keys()].sort(() => Math.random() - .5).forEach((s, i) => { tiles[i].slot = s; tiles[i].z0 = (Math.random() - .5)*1.3; });
    Promise.all(TOOLS.map((_, i) => iconTexture(i))).then(ts => {
      if(disposed){ ts.forEach(t => t.dispose()); return; }
      ts.forEach((t, i) => { tiles[i].iconMat.map = t; tiles[i].iconMat.visible = true; tiles[i].iconMat.needsUpdate = true; });
    });

    // Each tile's name, drawn into the scene just under it, with a soft white halo so a thread never cuts through the letters.
    function addLabels(){
      if(disposed) return;
      tiles.forEach(t => {
        const k = 4, fs = 11*k, c = document.createElement('canvas'), g = c.getContext('2d'), font = '500 ' + fs + 'px Inter, system-ui, sans-serif';
        g.font = font; const w = Math.ceil(g.measureText(TOOLS[t.i][0]).width) + 16*k, h = fs + 14*k;
        c.width = w; c.height = h; g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.shadowColor = 'rgba(236,232,233,.95)'; g.shadowBlur = 5*k; g.fillStyle = 'rgba(236,232,233,.9)';
        g.beginPath(); g.roundRect(6*k, 6*k, w - 12*k, h - 12*k, (h - 12*k)/2); g.fill();
        g.shadowBlur = 0; g.fillStyle = '#5f5647'; g.fillText(TOOLS[t.i][0], w/2, h/2 + k*.5);
        const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
        const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({map: tex, transparent: true, depthWrite: false, toneMapped: false}));
        m.renderOrder = 3; m.userData.wh = [w/k, h/k]; scene.add(m); t.label = m;
      });
      sizeLabels();
    }
    function sizeLabels(){
      tiles.forEach(t => { if(t.label) t.label.visible = W > 520; });
    }
    (document.fonts ? document.fonts.load('500 11px Inter').then(() => document.fonts.ready) : Promise.resolve()).then(addLabels, addLabels);

    // ---------- threads: soft mint lines with real depth, drawn as screen-facing ribbons ----------
    const MAXSEG = 90;
    const rGeo = new THREE.InstancedBufferGeometry();
    rGeo.setAttribute('position', new THREE.Float32BufferAttribute([0,-1,0, 1,-1,0, 0,1,0, 1,1,0], 3));
    rGeo.setIndex([0, 1, 2, 2, 1, 3]);
    const iA = new THREE.InstancedBufferAttribute(new Float32Array(MAXSEG*3), 3), iB = new THREE.InstancedBufferAttribute(new Float32Array(MAXSEG*3), 3);
    const iAl = new THREE.InstancedBufferAttribute(new Float32Array(MAXSEG*2), 2);
    rGeo.setAttribute('iA', iA); rGeo.setAttribute('iB', iB); rGeo.setAttribute('iAl', iAl); rGeo.instanceCount = 0;
    const rMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: {res: {value: new THREE.Vector2(1, 1)}, hw: {value: 1.6}, color: {value: new THREE.Color('#635032')}},
      vertexShader: `
        uniform vec2 res; uniform float hw; attribute vec3 iA; attribute vec3 iB; attribute vec2 iAl;
        varying float vA; varying float vS;
        void main(){
          vec4 a = projectionMatrix*modelViewMatrix*vec4(iA, 1.0), b = projectionMatrix*modelViewMatrix*vec4(iB, 1.0);
          vec2 d = (b.xy/b.w - a.xy/a.w)*res; vec2 n = normalize(vec2(-d.y, d.x) + 1e-6);
          vec4 p = mix(a, b, position.x);
          p.xy += n*position.y*hw*2.0/res*p.w;
          gl_Position = p; vA = mix(iAl.x, iAl.y, position.x); vS = position.y*hw;
        }`,
      fragmentShader: `
        uniform float hw; uniform vec3 color; varying float vA; varying float vS;
        void main(){ gl_FragColor = vec4(color, vA*clamp(hw - abs(vS), 0.0, 1.0)); }`
    });
    // the color uniform is written straight to the screen, so give it the brand value as is
    rMat.uniforms.color.value.convertLinearToSRGB();
    const ribbons = new THREE.Mesh(rGeo, rMat); ribbons.frustumCulled = false; ribbons.renderOrder = 2; scene.add(ribbons);
    let nSeg = 0;
    function seg(a, b, al0, al1){
      if(nSeg >= MAXSEG) return;
      iA.array.set([a.x, a.y, a.z], nSeg*3); iB.array.set([b.x, b.y, b.z], nSeg*3); iAl.array.set([al0, al1], nSeg*2); nSeg++;
    }

    // pulses that run along the snapped workflow line
    function glowTexture(){
      const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, 'rgba(236,232,233,1)'); gr.addColorStop(.35, 'rgba(236,232,233,.45)'); gr.addColorStop(1, 'rgba(236,232,233,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c);
    }
    const GLOW = glowTexture(); textures.push(GLOW);
    const pulses = [0, 1, 2].map(() => {
      const dot = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), new THREE.MeshBasicMaterial({color: '#635032', toneMapped: false}));
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({map: GLOW, color: '#b79d7a', transparent: true, opacity: .75, depthWrite: false, toneMapped: false}));
      dot.add(halo); halo.scale.setScalar(7); dot.visible = false; scene.add(dot); return dot;
    });
    // the idle "ghost" cursor that wanders when nobody is moving the mouse
    const ghostRing = new THREE.Mesh(new THREE.RingGeometry(5, 6.4, 40), new THREE.MeshBasicMaterial({color: '#130606', transparent: true, opacity: .35, depthWrite: false}));
    ghostRing.visible = false; scene.add(ghostRing);

    // ---------- layout: one world unit is one CSS pixel on the page's plane ----------
    let W = 1, H = 1, D = 1, ts = 50, region = [.06, .5, .94, .86];
    function heroRegion(done){
      const top = (hc.offsetTop + hc.offsetHeight + 22)/(H || 1);
      return [.06, Math.min(.7, Math.max(.3, top)), .94, done ? .95 : .86];
    }
    function homes(){
      const r = region, cw = (r[2]-r[0])*W/4, rh = (r[3]-r[1])*H/3;
      tiles.forEach(t => { const c = t.slot % 4, w = Math.floor(t.slot/4);
        t.hx = r[0]*W + (c + .5)*cw + t.jx*cw*.45; t.hy = r[1]*H + (w + .5)*rh + t.jy*rh*.28; });
    }
    function targets(){
      const r = region, x0 = r[0]*W, y0 = r[1]*H, w = (r[2]-r[0])*W, h = (r[3]-r[1])*H;
      tiles.forEach((t, i) => { const row = Math.floor(i/4), k = i % 4, c = row % 2 ? 3 - k : k; t.tx = x0 + (c + .5)*w/4; t.ty = y0 + (row + .5)*h/3; });
    }
    function setRegion(r){ region = r; homes(); targets(); }
    let placed = false;
    // the stage's CSS size comes from the host; the renderer and canvas are the host's, never resized here
    function layout(w, h){
      W = w; H = h; if(!W || !H) return;
      camera.aspect = W/H; D = H/2/Math.tan(FOV/2*Math.PI/180);
      camera.near = D*.35; camera.far = D*3; camera.position.set(0, 0, D); camera.lookAt(0, 0, 0); camera.updateProjectionMatrix();
      ts = Math.max(30, Math.min(66, W*(W < 720 ? .1 : .05)));
      ground.position.z = -ts*1.7; ground.scale.set(W*3, H*3, 1);
      key.position.set(-ts*2.5, ts*7, ts*20); key.target.position.set(0, 0, 0);
      const sc = key.shadow.camera; sc.left = -W*.8; sc.right = W*.8; sc.top = H*.8; sc.bottom = -H*.8; sc.near = 1; sc.far = ts*40; sc.updateProjectionMatrix();
      rim.position.set(W*.15, -H*.6, -ts*2);
      rMat.uniforms.res.value.set(W, H); rMat.uniforms.hw.value = W < 720 ? 1.3 : 1.6;
      pulses.forEach(p => p.scale.setScalar(ts*.075));
      sizeLabels();
      setRegion(heroRegion(!loading));
      if(!placed){ placed = true; tiles.forEach(t => { const r = region;
        t.x = (r[0] + (r[2]-r[0])*Math.random())*W; t.y = (r[1] + (r[3]-r[1])*Math.random())*H; t.z = t.z0*ts; }); }
    }

    // ---------- pointer: real mouse, touch taps, and the wandering ghost when idle (events routed here by the host) ----------
    let cx = -1e4, cy = -1e4, lastReal = -1e9, pvx = 0, pvy = 0, lastMove = 0, touchUntil = 0;
    const ray = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), hit = new THREE.Vector3(), ndc = new THREE.Vector2();
    let gx = -1e4, gy = -1e4;   // the pointer on the tiles' plane, in page pixels
    function pointer(e){
      if(e.type === 'pointermove'){
        const x = e.localX, y = e.localY, now = performance.now(), dt = Math.max(8, now - lastMove);
        if(cx > -1e3){ pvx = pvx*.6 + (x - cx)/dt*1000*.4; pvy = pvy*.6 + (y - cy)/dt*1000*.4; }
        cx = x; cy = y; lastMove = now; lastReal = now;
      } else if(e.type === 'pointerdown'){
        if(e.pointerType !== 'mouse'){ cx = e.localX; cy = e.localY; lastReal = performance.now(); touchUntil = lastReal + 700;
          tap = {id: e.pointerId, x: e.localX, y: e.localY, t: lastReal}; }
      } else if(e.type === 'pointerup'){
        // a touch tap snaps here: an iPhone never sends the click for a tap on the hero
        if(tap && tap.id === e.pointerId && Math.hypot(e.localX - tap.x, e.localY - tap.y) < 14 && performance.now() - tap.t < 600){
          tapAt = performance.now(); toggleSnap();
        }
        tap = null;
      } else if(e.type === 'pointerleave' || e.type === 'pointercancel'){
        if(e.type === 'pointerleave'){ cx = cy = -1e4; lastReal = -1e9; pvx = pvy = 0; }
        tap = null;
      } else if(e.type === 'click'){
        if(performance.now() - tapAt < 800) return;     // the click a tap already snapped for (other phones send both)
        toggleSnap();
      }
    }
    let tap = null, tapAt = -1e9;
    function toggleSnap(){ if(loading) return; snapped = !snapped; kick(); applyExtras(); }
    function pointerToPlane(x, y){
      ndc.set(x/W*2 - 1, -(y/H*2 - 1)); ray.setFromCamera(ndc, camera);
      if(!ray.ray.intersectPlane(plane, hit)) return false;
      gx = hit.x + W/2; gy = H/2 - hit.y; return true;
    }

    // ---------- state: loading, threads, snapped ----------
    let loading = true, snapped = false, dodge = false, threads = false, ghost = false, links = [];
    function applyExtras(){ threads = !loading; ghost = threads; }
    function kick(){ tiles.forEach(t => { t.ax += (Math.random() - .5)*7; t.ay += (Math.random() - .5)*7; t.az += (Math.random() - .5)*4; }); }

    // ---------- one step of the physics, in page pixels ----------
    const tmpV = new THREE.Vector3();
    function spring(v, x, target, k, c, dt){ return v + ((target - x)*k - v*c)*dt; }
    function step(dt, now){
      let px = -1e4, py = -1e4, ghosting = false;
      if(cx > -1e3 && pointerToPlane(cx, cy)){ px = gx; py = gy; }
      if(touchUntil && now > touchUntil && coarse){ touchUntil = 0; cx = cy = -1e4; }
      if(ghost && now - lastReal > 1500){ const r = region; ghosting = true;
        px = (r[0] + (r[2]-r[0])*(.5 + .42*Math.sin(now/1700)))*W; py = (r[1] + (r[3]-r[1])*(.5 + .4*Math.sin(now/1100 + 1)))*H; }
      pvx *= Math.pow(.02, dt); pvy *= Math.pow(.02, dt);
      const R = ts*2.4, R1 = R*1.2, R2 = ts*3.6, r = region, m = ts*.7, x0 = r[0]*W + m, x1 = r[2]*W - m, y0 = r[1]*H + m, y1 = r[3]*H - m;

      tiles.forEach(t => {
        let rxT, ryT, rzT, zT;
        if(snapped){
          t.vx = spring(t.vx, t.x, t.tx, 90, 13, dt); t.vy = spring(t.vy, t.y, t.ty, 90, 13, dt);
          t.x += t.vx*dt; t.y += t.vy*dt; rxT = ryT = rzT = 0; zT = 0;
        } else if(reduce){
          t.x = Math.min(x1, Math.max(x0, t.hx)); t.y = Math.min(y1, Math.max(y0, t.hy)); rxT = ryT = 0; rzT = 0; zT = t.z0*ts;
        } else {
          // wander on its own heading, keep clear of the others, get shoved by the pointer, bounce off the edges
          t.wa += (Math.random() - .5)*4.2*dt + Math.sin(now/900 + t.ph)*.9*dt;
          const want = ts*(1.5 + 1.1*Math.sin(now/2100 + t.ph*3))*t.sp, k = Math.min(1, dt*1.6);
          t.vx += (Math.cos(t.wa)*want - t.vx)*k; t.vy += (Math.sin(t.wa)*want - t.vy)*k;
          tiles.forEach(u => { if(u === t) return; const dx = t.x - u.x, dy = t.y - u.y, d = Math.hypot(dx, dy) || 1, g = ts*1.6;
            if(d < g){ const f = (1 - d/g)*ts*18*dt; t.vx += dx/d*f; t.vy += dy/d*f; } });
          zT = t.z0*ts + Math.sin(now/1800 + t.ph)*ts*.3;
          if(dodge && px > -1e3){ const dx = t.x - px, dy = t.y - py, d = Math.hypot(dx, dy) || 1;
            if(d < R1){ const p = (1 - d/R1)*(ghosting ? .45 : 1), f = p*ts*40*dt; t.vx += dx/d*f; t.vy += dy/d*f; t.wa = Math.atan2(dy, dx);
              // a shove also tips the tile away from the pointer and pushes it back into the page
              t.ax += dy/d*p*22*dt + pvy/ts*p*.9*dt; t.ay -= dx/d*p*22*dt - pvx/ts*p*.9*dt; t.az += (pvx*dy - pvy*dx)/(d*ts)*p*.5*dt;
              t.vz -= p*ts*26*dt; } }
          const v = Math.hypot(t.vx, t.vy), vmax = ts*7; if(v > vmax){ t.vx *= vmax/v; t.vy *= vmax/v; }
          t.x += t.vx*dt; t.y += t.vy*dt;
          if(t.x < x0 && t.vx < 0){ t.vx = -t.vx; t.wa = Math.PI - t.wa; t.az += .8; } if(t.x > x1 && t.vx > 0){ t.vx = -t.vx; t.wa = Math.PI - t.wa; t.az -= .8; }
          if(t.y < y0 && t.vy < 0){ t.vy = -t.vy; t.wa = -t.wa; t.ax -= .8; } if(t.y > y1 && t.vy > 0){ t.vy = -t.vy; t.wa = -t.wa; t.ax += .8; }
          if(t.x < x0 - ts) t.x += (x0 - t.x)*.1; if(t.x > x1 + ts) t.x += (x1 - t.x)*.1;
          if(t.y < y0 - ts) t.y += (y0 - t.y)*.1; if(t.y > y1 + ts) t.y += (y1 - t.y)*.1;
          t.rot = t.vx/ts*5 + Math.sin(now/1700 + t.ph)*16 + t.spin*Math.sin(now/3100 + t.ph);
          rzT = t.rot*Math.PI/180;
          rxT = Math.max(-.4, Math.min(.4, -t.vy/ts*.04 + Math.sin(now/1900 + t.ph*2)*.2));
          ryT = Math.max(-.4, Math.min(.4, t.vx/ts*.04 + Math.cos(now/2300 + t.ph)*.24));
        }
        // springs for depth, tilt and scale: a little overshoot reads as weight
        t.vz = spring(t.vz, t.z, zT, 14, 5, dt); t.z += t.vz*dt;
        t.ax = spring(t.ax, t.rx, rxT, 42, 6.5, dt); t.rx = Math.max(-.85, Math.min(.85, t.rx + t.ax*dt));
        t.ay = spring(t.ay, t.ry, ryT, 42, 6.5, dt); t.ry = Math.max(-.85, Math.min(.85, t.ry + t.ay*dt));
        t.az = spring(t.az, t.rz, rzT, 30, 6, dt); t.rz += t.az*dt;
        t.sv = spring(t.sv, t.s, t.sT, 140, 11, dt); t.s += t.sv*dt;
        t.lit += (t.litT - t.lit)*Math.min(1, dt*9);

        t.mesh.position.set(t.x - W/2, H/2 - t.y, t.z);
        t.mesh.rotation.set(t.rx, t.ry, t.rz);
        t.mesh.scale.setScalar(Math.max(.001, ts*t.s));
        // a little self-light keeps the color bright in the dark studio; lit (connecting) glows in its own color
        t.body.emissive.copy(t.base).multiplyScalar(.12 + .38*t.lit);
        if(t.label){ const [lw, lh] = t.label.userData.wh, sc = Math.max(.001, Math.min(1, t.s));
          t.label.position.set(t.x - W/2, H/2 - t.y - ts*.5*t.s - lh*.42, t.z + ts*.05); t.label.scale.set(lw*sc, lh*sc, 1); }
      });

      // threads: the workflow line when snapped, else lines near the pointer; links while loading
      nSeg = 0;
      const P = tiles.map(t => t.mesh.position);
      if(snapped){ for(let i = 0; i < 11; i++) seg(P[i], P[i+1], .9, .9); }
      else if(threads && px > -1e3){
        tmpV.set(px - W/2, H/2 - py, 0);
        const near = tiles.filter(t => Math.hypot(t.x - px, t.y - py) < R2);
        for(let a = 0; a < near.length; a++){
          const da = Math.hypot(near[a].x - px, near[a].y - py);
          seg(tmpV, near[a].mesh.position, 0, .38*(1 - da/R2));
          for(let b = a + 1; b < near.length; b++){ const db = Math.hypot(near[b].x - px, near[b].y - py);
            const al = .85*(1 - Math.max(da, db)/R2); seg(near[a].mesh.position, near[b].mesh.position, al, al); }
        }
      }
      links.forEach(l => seg(P[l[0]], P[l[1]], .7, .7));
      rGeo.instanceCount = nSeg; iA.needsUpdate = iB.needsUpdate = iAl.needsUpdate = true;

      pulses.forEach((d, n) => {
        d.visible = snapped && !reduce;
        if(!d.visible) return;
        const s = (now/650 + n*3.7) % 11, k = Math.floor(s), f = s - k;
        d.position.lerpVectors(P[k], P[k+1], f);
      });
      ghostRing.visible = ghosting && !snapped && threads;
      if(ghostRing.visible) ghostRing.position.set(px - W/2, H/2 - py, 0);

      // the camera leans a little toward the mouse, and sways slowly on its own
      let lx = Math.sin(now/5200)*W*.006, ly = Math.cos(now/6100)*H*.006;
      if(!lite && cx > -1e3){ lx += (cx/W - .5)*W*.035; ly -= (cy/H - .5)*H*.03; }
      if(reduce){ lx = ly = 0; }
      camera.position.x += (lx - camera.position.x)*Math.min(1, dt*2.5);
      camera.position.y += (ly - camera.position.y)*Math.min(1, dt*2.5);
      camera.lookAt(0, 0, 0);

      host.dbg.loading = loading; host.dbg.snapped = snapped; host.dbg.lit = tiles.filter(t => t.litT > 0).length;
    }

    // ---------- the load: tiles pop in grey, and each one lights and links to its nearest lit neighbor as the rest of
    // the page really gets ready (host.load, the later parts' build steps), never faster than one per stepMs; at 12 the
    // links let go, the headline rises and the page is free to scroll (host.loaded()) ----------
    const stepMs = reduce ? 0 : 25, startMs = 0;
    let ld = null;
    function runLoader(){
      const my = ++lrun;
      loading = true; snapped = false; dodge = false; links = []; applyExtras();
      ctr.hidden = false; nEl.textContent = '0';
      setRegion(heroRegion(false));
      tiles.forEach((t, i) => { t.litT = 0; setTimeout(() => { if(my === lrun) t.sT = 1; }, reduce ? 0 : 120 + i*45); });
      lwords.forEach(w => { w.style.transitionDelay = '0s'; }); lh.classList.add('hide'); lh.getBoundingClientRect();
      lsub.classList.add('hide');
      ld = {my, t0: performance.now(), next: 0, shown: 0, lit: [], order: tiles.map((_, i) => i).sort(() => Math.random() - .5), endAt: 0};
    }
    // called each frame from update(): moves the count toward what is really ready
    function loaderStep(now){
      if(!ld || ld.my !== lrun || !loading) return;
      const L = host.load, want = !L || L.done ? 12 : Math.min(11, Math.floor(L.f*12));
      while(ld.shown < want && now - ld.t0 >= startMs && now >= ld.next){
        const ti = ld.order[ld.shown], t = tiles[ti];
        t.litT = 1; t.az += (Math.random() - .5)*3; t.sv += 2.5;
        if(ld.lit.length){ let best = ld.lit[0], bd = 1e9;
          ld.lit.forEach(j => { const d = Math.hypot(tiles[j].x - t.x, tiles[j].y - t.y); if(d < bd){ bd = d; best = j; } });
          links.push([best, ti]); }
        ld.lit.push(ti); ld.shown++; nEl.textContent = ld.shown;
        ld.next = now + stepMs;
        if(stepMs) break;
      }
      if(ld.shown === 12 && !ld.endAt) ld.endAt = now;
      if(ld.endAt && now >= ld.endAt) finishLoader();
    }
    function finishLoader(){
      const my = ld.my; ld = null;
      links = []; tiles.forEach((t, i) => setTimeout(() => { if(my === lrun) t.litT = 0; }, reduce ? 0 : i*45));
      ctr.hidden = true; setRegion(heroRegion(true)); dodge = true;
      loading = false; applyExtras();
      lwords.forEach((w, i) => { w.style.transitionDelay = (reduce ? 0 : i*.075).toFixed(3) + 's'; });
      lh.classList.remove('hide');
      setTimeout(() => { if(my === lrun) lsub.classList.remove('hide'); }, reduce ? 0 : lwords.length*75 + 350);
      if(host.loaded) host.loaded();
    }

    layout(hero.clientWidth, hero.clientHeight);
    runLoader();

    return {
      scene, camera,
      update(dt, p, now){ loaderStep(now); step(dt, now); },
      render(r){ r.render(scene, camera); },
      resize(w, h){ layout(w, h); },
      setTier(t){
        const l = t === 'lite'; if(l === lite) return;
        lite = l; shadowQuality(); if(key.shadow.map){ key.shadow.map.dispose(); key.shadow.map = null; }
      },
      pointer,
      dispose(){
        disposeAll();
        // leave the words readable for whatever replaces the 3D
        lh.classList.remove('hide'); lsub.classList.remove('hide'); ctr.hidden = true;
        if(host.loaded) host.loaded();
      }
    };
  } catch(err) {
    disposeAll();
    throw err;
  }
}

// Readable fallback for unavailable WebGL or a lost graphics context.


const FLAT_TOOLS = [
  ['Accounting','<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h3"/>'],
  ['Email','<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3.5 7l8.5 6 8.5-6"/>'],
  ['Spreadsheets','<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 10h16M4 15h16M10 4v16"/>'],
  ['CRM','<path d="M3 5h3l2 10h10l2-7H7"/><circle cx="10" cy="19" r="1.4"/><circle cx="17" cy="19" r="1.4"/>'],
  ['Payments','<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18M6.5 14.5h4"/>'],
  ['Calendar','<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M8.5 3v4M15.5 3v4"/>'],
  ['Customer list','<circle cx="9" cy="9" r="3"/><path d="M3.5 19c1-3 3-4.5 5.5-4.5s4.5 1.5 5.5 4.5"/><circle cx="17" cy="8.5" r="2.2"/><path d="M16 13.6c2.2 0 3.8 1.1 4.6 3.4"/>'],
  ['Shared files','<path d="M3 7.5A2 2 0 0 1 5 5.5h4l2 2h8a2 2 0 0 1 2 2v7.5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'],
  ['Dispatch Board','<path d="M2.5 7h11v9h-11zM13.5 10h4l3 3v3h-7"/><circle cx="6.5" cy="18" r="1.6"/><circle cx="17" cy="18" r="1.6"/>'],
  ['Texts','<path d="M4 5h16v11H9.5L5 19.5V16H4z"/>'],
  ['Invoicing','<rect x="6" y="3" width="12" height="7" rx="1"/><rect x="3" y="11" width="18" height="9" rx="1.6"/><path d="M8 15.5h8"/>'],
  ['Reviews','<path d="M3 8l9-4 9 4v9l-9 4-9-4z"/><path d="M3 8l9 4 9-4M12 12v9"/>']
];
const FLAT_CSS = `
  .hero .fl-cv{position:absolute;inset:0;display:block;}
  .hero .fl-layer{position:absolute;inset:0;pointer-events:none;}
  .hero{container-type:inline-size;}
  .fl-tile{position:absolute;left:0;top:0;width:var(--ts,40px);height:var(--ts,40px);margin:calc(var(--ts,40px) / -2) 0 0 calc(var(--ts,40px) / -2);
    border-radius:24%;background:linear-gradient(155deg,#39291f 0%,#130606 55%,#130606 100%);border:1px solid rgba(183,157,122,.24);
    box-shadow:inset 0 1px 0 rgba(236,232,233,.14),0 10px 22px rgba(19,6,6,.28);display:grid;place-items:center;color:#bfb8b5;
    transition:color .35s;will-change:transform;}
  .fl-tile::before{content:"";position:absolute;inset:-1px;border-radius:inherit;background:linear-gradient(155deg,#bfb8b5,#a78464);opacity:0;transition:opacity .35s;}
  .fl-tile.lit{color:#130606;}
  .fl-tile.lit::before{opacity:1;}
  .fl-tile svg{position:relative;width:54%;height:54%;}
  .fl-tl{position:absolute;top:100%;left:50%;transform:translateX(-50%);margin-top:4px;font:500 10px/1 var(--sans);color:var(--muted);white-space:nowrap;transition:opacity .3s;}
  @container (max-width:520px){ .fl-tl{display:none;} }`;

export function flat(host){
  const reduce = host.reduce, sL = host.section, hc = sL.querySelector('.hero-copy'), ctr = sL.querySelector('[data-ctr]');
  if(sL.querySelector('.fl-layer')) return;
  const st = document.createElement('style'); st.textContent = FLAT_CSS; document.head.appendChild(st);
  const cv = document.createElement('canvas'); cv.className = 'fl-cv'; cv.setAttribute('aria-hidden', 'true');
  const layer = document.createElement('div'); layer.className = 'fl-layer';
  sL.insertBefore(layer, sL.firstChild); sL.insertBefore(cv, layer);
  const ctx = cv.getContext('2d');
  const icon = i => '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + FLAT_TOOLS[i][1] + '</svg>';
  function heroRegion(done){
    const H = sL.clientHeight || 1, top = (hc.offsetTop + hc.offsetHeight + 22)/H;
    return [.06, Math.min(.7, Math.max(.42, top)), .94, done ? .95 : .86];
  }
  const o = {tsk: innerWidth < 720 ? .1 : .05, ink: '47,60,104', dot: '#635032', ghostInk: 'rgba(19,6,6,.35)'};
  const E = {tiles: [], W: 0, H: 0, ts: 40, snapped: false, region: heroRegion(false), links: [], threads: false, ghost: false, dodge: false};
  let px = -1e4, py = -1e4, lastReal = -1e9, running = false, raf = 0, lastNow = 0;
  const dpr = Math.min(2, devicePixelRatio || 1);
  const perm = FLAT_TOOLS.map((_, i) => i).sort(() => Math.random() - .5);
  FLAT_TOOLS.forEach((t, i) => {
    const el = document.createElement('div'); el.className = 'fl-tile'; el.innerHTML = icon(i) + '<span class="fl-tl">' + t[0] + '</span>'; layer.appendChild(el);
    E.tiles.push({el, i, slot: perm[i], x: 0, y: 0, rot: 0, hx: 0, hy: 0, tx: 0, ty: 0, ph: Math.random()*6.28, jx: Math.random() - .5, jy: Math.random() - .5,
      vx: 0, vy: 0, wa: Math.random()*6.28, sp: .8 + Math.random()*.7, spin: (Math.random() - .5)*40});
  });
  function homes(){
    const r = E.region, cw = (r[2]-r[0])*E.W/4, rh = (r[3]-r[1])*E.H/3;
    E.tiles.forEach(t => { const c = t.slot % 4, w = Math.floor(t.slot/4);
      t.hx = r[0]*E.W + (c + .5)*cw + t.jx*cw*.45; t.hy = r[1]*E.H + (w + .5)*rh + t.jy*rh*.28; });
  }
  function targets(){
    const r = E.region, x0 = r[0]*E.W, y0 = r[1]*E.H, w = (r[2]-r[0])*E.W, h = (r[3]-r[1])*E.H;
    E.tiles.forEach((t, i) => { const row = Math.floor(i/4), k = i % 4, c = row % 2 ? 3 - k : k; t.tx = x0 + (c + .5)*w/4; t.ty = y0 + (row + .5)*h/3; });
  }
  function size(){
    E.W = sL.clientWidth; E.H = sL.clientHeight; if(!E.W) return;
    cv.width = Math.round(E.W*dpr); cv.height = Math.round(E.H*dpr); cv.style.width = E.W + 'px'; cv.style.height = E.H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    E.ts = Math.max(26, Math.min(58, E.W*o.tsk)); sL.style.setProperty('--ts', E.ts + 'px');
    homes(); targets();
    if(!E.placed){ E.tiles.forEach(t => { const r = E.region; t.x = (r[0] + (r[2]-r[0])*Math.random())*E.W; t.y = (r[1] + (r[3]-r[1])*Math.random())*E.H; }); E.placed = 1; }
    render(performance.now(), true);
  }
  E.setRegion = r => { E.region = r; homes(); targets(); };
  const line = (a, b, c, d, al) => { ctx.strokeStyle = 'rgba(' + o.ink + ',' + al.toFixed(3) + ')'; ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, d); ctx.stroke(); };
  const dot = (x, y) => { ctx.beginPath(); ctx.arc(x, y, 2.6, 0, 6.283); ctx.fill(); };
  function drift(t, now, dt, gx, gy, R){
    const r = E.region, ts = E.ts, m = ts*.7, x0 = r[0]*E.W + m, x1 = r[2]*E.W - m, y0 = r[1]*E.H + m, y1 = r[3]*E.H - m;
    if(reduce){ t.x = Math.min(x1, Math.max(x0, t.x)); t.y = Math.min(y1, Math.max(y0, t.y)); return; }
    t.wa += (Math.random() - .5)*4.2*dt + Math.sin(now/900 + t.ph)*.9*dt;
    const want = ts*(1.5 + 1.1*Math.sin(now/2100 + t.ph*3))*t.sp, k = Math.min(1, dt*1.6);
    t.vx += (Math.cos(t.wa)*want - t.vx)*k; t.vy += (Math.sin(t.wa)*want - t.vy)*k;
    E.tiles.forEach(u => { if(u === t) return; const dx = t.x - u.x, dy = t.y - u.y, d = Math.hypot(dx, dy) || 1, g = ts*1.6;
      if(d < g){ const f = (1 - d/g)*ts*18*dt; t.vx += dx/d*f; t.vy += dy/d*f; } });
    if(E.dodge){ const dx = t.x - gx, dy = t.y - gy, d = Math.hypot(dx, dy) || 1;
      if(d < R*1.2){ const f = (1 - d/(R*1.2))*ts*40*dt; t.vx += dx/d*f; t.vy += dy/d*f; t.wa = Math.atan2(dy, dx); } }
    const v = Math.hypot(t.vx, t.vy), vmax = ts*7; if(v > vmax){ t.vx *= vmax/v; t.vy *= vmax/v; }
    t.x += t.vx*dt; t.y += t.vy*dt;
    if(t.x < x0 && t.vx < 0){ t.vx = -t.vx; t.wa = Math.PI - t.wa; } if(t.x > x1 && t.vx > 0){ t.vx = -t.vx; t.wa = Math.PI - t.wa; }
    if(t.y < y0 && t.vy < 0){ t.vy = -t.vy; t.wa = -t.wa; } if(t.y > y1 && t.vy > 0){ t.vy = -t.vy; t.wa = -t.wa; }
    if(t.x < x0 - ts) t.x += (x0 - t.x)*.1; if(t.x > x1 + ts) t.x += (x1 - t.x)*.1;
    if(t.y < y0 - ts) t.y += (y0 - t.y)*.1; if(t.y > y1 + ts) t.y += (y1 - t.y)*.1;
    t.rot += (t.vx/ts*5 + Math.sin(now/1700 + t.ph)*16 + t.spin*Math.sin(now/3100 + t.ph) - t.rot)*Math.min(1, dt*3);
  }
  function render(now, instant){
    const ts = E.ts, R = ts*2.4, R2 = ts*3.6, T = E.tiles;
    let dt = Math.min(.05, Math.max(0, (now - lastNow)/1000)); lastNow = now;
    let gx = px, gy = py, ghosting = false;
    if(E.ghost && now - lastReal > 1500){ const r = E.region; ghosting = true;
      gx = (r[0] + (r[2]-r[0])*(.5 + .42*Math.sin(now/1700)))*E.W; gy = (r[1] + (r[3]-r[1])*(.5 + .4*Math.sin(now/1100 + 1)))*E.H; }
    T.forEach(t => {
      if(!E.snapped){
        if(instant) dt = 0; drift(t, now, dt, gx, gy, R);
      } else {
        const e = instant || reduce ? 1 : .085;
        t.x += (t.tx - t.x)*e; t.y += (t.ty - t.y)*e; t.rot += (0 - t.rot)*e;
      }
      t.el.style.transform = 'translate(' + t.x.toFixed(1) + 'px,' + t.y.toFixed(1) + 'px) rotate(' + t.rot.toFixed(2) + 'deg)';
    });
    ctx.clearRect(0, 0, E.W, E.H); ctx.lineWidth = 1.4; ctx.fillStyle = o.dot;
    if(E.snapped){
      const edges = [];
      for(let i = 0; i < 11; i++) edges.push([T[i].x, T[i].y, T[i+1].x, T[i+1].y]);
      edges.forEach(g => line(g[0], g[1], g[2], g[3], .8));
      if(!reduce){
        ctx.shadowColor = '#b79d7a'; ctx.shadowBlur = 10;
        for(let n = 0; n < 3; n++){ const s = (now/650 + n*3.7) % 11, k = Math.floor(s), f = s - k, g = edges[k]; dot(g[0] + (g[2]-g[0])*f, g[1] + (g[3]-g[1])*f); }
        ctx.shadowBlur = 0;
      }
    } else if(E.threads && gx > -1e3){
      const near = T.filter(t => Math.hypot(t.x - gx, t.y - gy) < R2);
      for(let a = 0; a < near.length; a++){
        const da = Math.hypot(near[a].x - gx, near[a].y - gy);
        line(gx, gy, near[a].x, near[a].y, .22*(1 - da/R2));
        for(let b = a + 1; b < near.length; b++){ const db = Math.hypot(near[b].x - gx, near[b].y - gy);
          line(near[a].x, near[a].y, near[b].x, near[b].y, .75*(1 - Math.max(da, db)/R2)); }
      }
      if(ghosting){ ctx.strokeStyle = o.ghostInk; ctx.beginPath(); ctx.arc(gx, gy, 6, 0, 6.283); ctx.stroke(); }
    }
    E.links.forEach(l => { const p = T[l[0]], q = T[l[1]]; line(p.x, p.y, q.x, q.y, .65); });
  }
  function frame(now){ if(!running) return; raf = requestAnimationFrame(frame); render(now, false); }
  sL.addEventListener('pointermove', e => { const r = sL.getBoundingClientRect(); px = e.clientX - r.left; py = e.clientY - r.top; lastReal = performance.now(); });
  sL.addEventListener('pointerleave', () => { px = py = -1e4; lastReal = -1e9; });
  new ResizeObserver(size).observe(sL);
  size();
  new IntersectionObserver(es => { const v = es[0].isIntersecting;
    if(v && !running){ running = true; raf = requestAnimationFrame(frame); }
    else if(!v){ running = false; cancelAnimationFrame(raf); } }).observe(sL);

  const lh = sL.querySelector('h1'), lsub = sL.querySelector('.sub'), lwords = splitWords(lh);
  let lrun = 0, lLoading = true;
  const applyExtras = () => { E.threads = !lLoading; E.ghost = E.threads; };
  sL.addEventListener('click', () => { if(lLoading) return; E.snapped = !E.snapped; applyExtras(); });
  new ResizeObserver(() => E.setRegion(heroRegion(!lLoading))).observe(sL);
  (function runLoader(){
    const my = ++lrun, n = sL.querySelector('[data-n]'), step = reduce ? 0 : 190, lit = [];
    lLoading = true; E.snapped = false; applyExtras();
    ctr.hidden = false; E.dodge = false; E.links = []; n.textContent = '0';
    E.tiles.forEach(t => t.el.classList.remove('lit'));
    E.setRegion(heroRegion(false));
    lwords.forEach(w => { w.style.transitionDelay = '0s'; }); lh.classList.add('hide'); lh.getBoundingClientRect();
    lwords.forEach((w, i) => { w.style.transitionDelay = (reduce ? 0 : i*.075).toFixed(3) + 's'; });
    lsub.classList.add('hide');
    setTimeout(() => { if(my === lrun) lh.classList.remove('hide'); }, reduce ? 0 : 250);
    setTimeout(() => { if(my === lrun) lsub.classList.remove('hide'); }, reduce ? 0 : 250 + lwords.length*75 + 450);
    const order = E.tiles.map((_, i) => i).sort(() => Math.random() - .5);
    order.forEach((ti, k) => setTimeout(() => {
      if(my !== lrun) return;
      const t = E.tiles[ti]; t.el.classList.add('lit');
      if(lit.length){ let best = lit[0], bd = 1e9;
        lit.forEach(j => { const d = Math.hypot(E.tiles[j].x - t.x, E.tiles[j].y - t.y); if(d < bd){ bd = d; best = j; } });
        E.links.push([best, ti]); }
      lit.push(ti); n.textContent = k + 1;
    }, (reduce ? 0 : 600) + k*step));
    setTimeout(() => {
      if(my !== lrun) return;
      E.links = []; E.tiles.forEach((t, i) => setTimeout(() => { if(my === lrun) t.el.classList.remove('lit'); }, reduce ? 0 : i*45));
      ctr.hidden = true; E.setRegion(heroRegion(true)); E.dodge = true;
      lLoading = false; applyExtras();
    }, reduce ? 0 : 600 + 12*step + 800);
  })();
}
