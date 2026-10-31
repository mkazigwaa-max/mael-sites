// The frame of the real-3D homepage: ONE WebGL renderer on one canvas fixed behind the page, and the parts drawn into
// it, each in its own stage's rectangle (the three.js "multiple elements / scissor" technique).
//
// A part plugs in from index.html alone, never from this file: a <section data-part="<id>" data-module="<module URL>">
// with its stage inside marked data-stage (or the section itself is the stage). The module's shape:
//
//   export const meta = { id, label, addons: ['loaders/GLTFLoader.js', ...], prMax: {lite: 3, high: 2} }
//                                     // addons: optional, paths under three/addons/; prMax: optional, see Sharpness below
//   export async function createPart(host) -> { scene, camera, update(dt, p, now), render(renderer, vp), resize(w, h, dpr),
//                                               setTier(tier), pointer(e), dispose(), ease?, warm? }
//                                               (warm: [[scene, camera], ...], its other scenes; see The first draw)
//   export function flat(host)       // optional: draws the flat version (no WebGL, a failed build, a lost context)
//
//   host = { THREE, addons, renderer, tier, reduce, section, stage, dbg, load, loaded }
//
// What the host does for every part:
// - Never holds the page: it scrolls from the first paint (2026-10-26: holding it until all seven parts were built
//   froze a phone for 7 s on slow 4G and 2.4 s on Wi-Fi). Downloads the first part's files first and the others once
//   it has drawn, so on a slow connection they never compete with it. Builds the first part at once; its count
//   (host.load = { f, done }) waits only for the fonts, so it runs at its own pace (host.loaded() is kept for the
//   parts that call it). Every other part then builds in the background, one at a time, as soon as the first is up,
//   so they are ready before most visitors scroll to them (2026-10-26: waiting for the opening's intro first left
//   them building under a visitor who scrolled at once, and each build froze the scrolling 3D for a moment). A later
//   part waits for the scrolling to pause (300 ms still), unless its section is within one screen of view. Once
//   built, its shaders finish
//   compiling on the GPU (compileAsync, hidden objects included) before it is first drawn, so that first frame never
//   stalls on them. While a part on screen plays a timed film (part.busy), later builds wait for it (see quiet()).
// - The first draw: an iPhone does a one-time setup the first time each object is really drawn (shapes sent to the
//   graphics chip, the drawing set up for that exact screen), which compiling ahead doesn't cover: 10 to 23 ms per part
//   in the simulator, about 60 ms on a phone, mid-scroll. So each built part is drawn once, everything in it shown,
//   into the one pixel at the canvas's top left (at the very top), shadows left alone, one part per frame, in the
//   background; a part counts as built only after it.
// - Each frame, for each built part whose stage is on screen (below the fixed menu bar: a stage showing only under the
//   bar, such as the laptop's last screen once the desk has scrolled up to the bar, is hidden by it and skipped): eases its scroll progress (p += (target - p) *
//   (1 - exp(-dt * ease)), ease 6.5 unless the part sets its own), calls update(dt, p, now), then sets the viewport to the
//   stage's whole rectangle and the scissor to the part of it that is on screen, and calls render(renderer, vp).
//   vp = { x, y, w, h } is that viewport in drawing-buffer pixels (GL origin, bottom left), for parts that sample
//   gl_FragCoord. Because the viewport is the whole stage (it may run past the canvas edge), a part's camera math is
//   the same as on its own page and nothing squashes while a stage is half on screen.
// - Keeps the canvas in step with the page while it scrolls. A phone scrolls the page itself, ahead of the page's
//   script; a canvas fixed to the screen then shows the 3D where it was a frame or two ago, so a stage that scrolls
//   looks stuck and then jumps. So the canvas rides with the page (absolute, moved to the current scroll each frame,
//   as three.js's own multiple-elements example does) and goes back to fixed only while a sticky stage on screen is
//   pinned (the laptop, the chat), which the phone holds still. It reaches GLM px past the top and bottom of the screen,
//   so a stage scrolling in has its 3D drawn before it shows; near the bottom of the page it stops at the content's
//   end, so it never makes the page longer.
// - Clears the canvas once per frame; never resizes the renderer for a part. Renderer state every part can count on:
//   output sRGB, NeutralToneMapping, exposure reset to 1.05 before each part, autoClear off (a part that renders into
//   its own render target clears it, a Color background does that), shadow maps on with VSMShadowMap (never change the
//   type: switching it makes every shadow map rebuild), shadow updates per light (light.shadow.autoUpdate/needsUpdate).
// - Routes pointermove, pointerdown, pointerup and click to the part whose stage is under the pointer, with e.localX and
//   e.localY added, and sends a 'pointerleave' (with the pointer's id) when the pointer leaves that stage (or goes over
//   the menu bar). A stage that holds the pointer (stage.setPointerCapture, as the stickers do while one is dragged) gets
//   that pointer's events wherever it goes until it lets go, as on its own page; a 'pointercancel' goes to that stage,
//   or else to the stage the pointer was over.
// - Sharpness: every part has its own pixel ratio, starting at its cap: meta.prMax for this tier ({lite, high}, or one
//   number for both) if the part asks for one, else 2 on Macs and 1.5 on phones; never above the screen's own ratio.
//   The canvas draws each frame at the highest ratio among the parts on screen, so a part is never drawn less sharp than
//   its cap (a neighbor sharing the screen with it for a moment is drawn as sharp as it). When the median frame over 2 s
//   is slower than 55 fps (unless it is a steady browser cap, tested as the frame explains), the parts that set that ratio during those 2 s step down by .25, never back up and never
//   below 1.25 on Macs and 1 on phones (windows with a build or a ratio change in them are ignored). A step only
//   records the part's new ratio; the next frame applies it at its start (setPixelRatio and the canvas size, which
//   clears the canvas), then resizes the parts on screen and draws them, so no frame is ever shown blank. A change in
//   the canvas's own size is applied the same way, at the start of the next frame.
// - No WebGL, a lost context that does not come back, or a part that throws: that part (or all of them) shows flat().
// - Test hooks: window.__frames counts rendered frames; window.__dbg = { parts: { <id>: what the part writes into
//   host.dbg }, tier, dpr (the ratio drawn now), prs (each part's ratio), drawn (the parts drawn last frame), built,
//   failed }. A key the top level lacks is looked up in the parts (so __dbg.boomT works). Speed test mode: see
//   window.__perfOn below.

import * as THREE from 'three';

const canvas = document.querySelector('[data-gl]');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse = matchMedia('(pointer: coarse)').matches;
// Phones and touch screens get the lighter build, chosen once at load.
const tier = innerWidth < 720 || coarse ? 'lite' : 'high';
const DPR = devicePixelRatio || 1;
// a part's pixel-ratio cap unless its meta.prMax asks for another, and the floor the step-down never goes under
const PR_DEF = Math.min(DPR, tier === 'lite' ? 1.5 : 2);
const PR_MIN = Math.min(PR_DEF, tier === 'lite' ? 1 : 1.25);
function capOf(mod){
  const m = mod && mod.meta && mod.meta.prMax, v = typeof m === 'number' ? m : (m && m[tier]);
  return v > 0 ? Math.min(DPR, v) : PR_DEF;
}

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));

// ---------- test hooks ----------
const dbgRoot = {parts: {}, tier, dpr: PR_DEF, prs: {}, drawn: [], built: [], failed: [], flat: false};
window.__dbg = new Proxy(dbgRoot, {
  get(t, k){
    if(k in t) return t[k];
    if(k === 'pr') return t.dpr;
    for(const id in t.parts){ const d = t.parts[id]; if(d && k in d) return d[k]; }
    return undefined;
  }
});
window.__frames = 0;

// ---------- the load the opening counts: only the fonts now (the later parts build after its intro, see the header) ----------
const load = {f: 0, done: false};
function finishLoad(){ if(!load.done){ load.f = 1; load.done = true; dbgRoot.load = 1; } }
// host.loaded(): the opening's count is done and its headline is rising (nothing waits on it any more)
function release(){}
dbgRoot.held = false;

// ---------- the parts, in page order ----------
const PARTS = [...document.querySelectorAll('[data-part]')].map((section, i) => ({
  i, id: section.dataset.part, section, src: section.dataset.module,
  stage: section.matches('[data-stage]') ? section : (section.querySelector('[data-stage]') || section),
  mod: null, part: null, state: 'idle', p: 0, active: false, hover: false, sized: '', flat: false, pr: PR_DEF, prMin: PR_MIN, got: 0
}));
function stepDone(P, k){ P.got = Math.max(P.got, k); }

// ---------- the renderer (or the flat page) ----------
let renderer = null, gl = null;
try {
  // Ask for the context ourselves: when WebGL is off this returns null quietly instead of three logging an error.
  gl = canvas.getContext('webgl2', {alpha: true, depth: true, stencil: false, antialias: true, premultipliedAlpha: true,
    preserveDrawingBuffer: false, powerPreference: 'high-performance', failIfMajorPerformanceCaveat: false});
  // A computer with no graphics chip draws WebGL in software: each part then takes seconds to build and the page
  // freezes for close to a minute (measured in headless Chrome, which also has none). It gets the flat page instead.
  // Tests that need the 3D in a browser without one set window.__softGL = true before the page loads.
  if(gl && software(gl) && !window.__softGL) gl = null;
  if(gl) renderer = new THREE.WebGLRenderer({canvas, context: gl, antialias: true, alpha: true, powerPreference: 'high-performance'});
} catch(e) { renderer = null; }
function software(g){
  try {
    const x = g.getExtension('WEBGL_debug_renderer_info');
    return /swiftshader|llvmpipe|softpipe|basic render driver|software/i.test(g.getParameter(x ? x.UNMASKED_RENDERER_WEBGL : g.RENDERER));
  } catch(e) { return false; }
}

let pr = PR_DEF, cw = 1, ch = 1, lost = false, lostTimer = 0, needSize = false;
if(renderer){
  renderer.setPixelRatio(pr);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.VSMShadowMap;
  renderer.autoClear = false;
  renderer.setClearColor(0xffffff, 0);
  sizeCanvas();
  // a new canvas size is applied at the start of the next frame (resizing clears the canvas, so doing it here, after
  // the frame has drawn, would show a blank frame)
  new ResizeObserver(() => { needSize = true; }).observe(canvas);
  canvas.addEventListener('webglcontextlost', e => {
    e.preventDefault(); lost = true;
    // Everything on the GPU is gone. Free the parts now, while WebGL ignores the calls (freeing them after the context
    // comes back would aim at the new context and warn), and remember which to rebuild.
    PARTS.forEach(P => { if(P.part){ safeDispose(P); P.part = null; P.state = 'idle'; P.rebuild = true; } });
    // give the browser a moment to give the context back; if it doesn't, the page goes flat
    lostTimer = setTimeout(() => goFlat('context lost'), 3000);
  });
  canvas.addEventListener('webglcontextrestored', () => {
    clearTimeout(lostTimer); if(dbgRoot.flat) return;
    lost = false; drewLast = false;
    PARTS.forEach(P => { if(P.rebuild){ P.rebuild = false; queue(P, true); } });
  });
} else {
  canvas.hidden = true;
  dbgRoot.flat = true;
}

// the bottom of the fixed menu bar (the [data-chrome] bars), in CSS px: a stage must reach below it to be drawn
let chromeBottom = 0;
function measureChrome(){
  chromeBottom = 0;
  document.querySelectorAll('[data-chrome]').forEach(el => {
    if(getComputedStyle(el).position === 'fixed') chromeBottom = Math.max(chromeBottom, el.getBoundingClientRect().bottom);
  });
}
measureChrome();
addEventListener('resize', measureChrome, {passive: true});

function sizeCanvas(){
  cw = canvas.clientWidth || innerWidth; ch = canvas.clientHeight || innerHeight;
  renderer.setSize(cw, ch, false);
}

// ---------- keeping the canvas with the page (see the header) ----------
const GLM = 64;
let glFixed = null, glY = NaN, offY = -GLM, flowEnd = Infinity;
if(renderer){
  canvas.style.height = 'calc(' + (CSS.supports('height', '1lvh') ? '100lvh' : '100vh') + ' + ' + 2*GLM + 'px)';
  canvas.style.willChange = 'transform';
}
// the page's own content (not the canvas, not fixed bars): where it ends is as far down as the canvas may reach;
// measured again whenever any of it changes size
if(renderer){
  const flow = [...document.body.children].filter(el => el !== canvas && !/^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE)$/.test(el.tagName) &&
    !/^(fixed|absolute)$/.test(getComputedStyle(el).position));
  const measureFlow = () => { let end = 0; for(const el of flow) end = Math.max(end, el.getBoundingClientRect().bottom + scrollY); flowEnd = end || Infinity; };
  const ro = new ResizeObserver(measureFlow); flow.forEach(el => ro.observe(el));
  measureFlow();
}
function placeCanvas(fixed){
  if(fixed !== glFixed){ canvas.style.position = fixed ? 'fixed' : 'absolute'; glFixed = fixed; glY = NaN; }
  let y;
  if(fixed) y = -GLM;
  else y = Math.round(Math.min(scrollY - GLM, flowEnd - ch));
  if(y !== glY){ canvas.style.transform = 'translate3d(0,' + y + 'px,0)'; glY = y; }
  offY = fixed ? y : y - scrollY;
}
// a sticky stage the phone is holding still right now
function pinned(P, r){
  if(P.sticky === undefined){ const cs = getComputedStyle(P.stage); P.sticky = cs.position === 'sticky'; P.stickTop = parseFloat(cs.top) || 0; }
  if(!P.sticky || Math.abs(r.top - P.stickTop) > 1) return false;
  const sr = P.section.getBoundingClientRect();
  return sr.top < P.stickTop - .5 && sr.bottom > r.bottom + .5;
}

// ---------- building ----------
let firstUp = null; const firstUpP = new Promise(r => { firstUp = r; });
const buildQ = []; let pumping = false, buildingSince = 0;

// later parts build in a pause in the scrolling, or at once when their section is within one screen of view
let lastScroll = -1e9;
addEventListener('scroll', () => { lastScroll = performance.now(); }, {passive: true});
function near(P){ const r = P.section.getBoundingClientRect(); return r.top < innerHeight*2 && r.bottom > -innerHeight; }
function settled(P){
  return new Promise(res => { (function check(){
    if(lost || dbgRoot.flat || near(P) || performance.now() - lastScroll > 300) res(); else setTimeout(check, 50);
  })(); });
}
// wait, without blocking, for the GPU to finish compiling a new part's shaders (hidden objects too, as the parts' own
// warm-up does), with a cap so a driver without parallel compiling never holds a part back for long
async function shadersReady(part){
  if(!renderer.compileAsync || !part.scene || !part.camera) return;
  const hidden = []; let wait;
  try {
    part.scene.traverse(o => { if(!o.visible){ hidden.push(o); o.visible = true; } });
    wait = renderer.compileAsync(part.scene, part.camera);
  } catch(e) { wait = null; } finally { hidden.forEach(o => { o.visible = false; }); }
  if(wait) await Promise.race([wait, new Promise(r => setTimeout(r, 3000))]);
  uploadTextures(part);
}
// send a new part's pictures to the GPU now, while it is still being built, instead of on the first frame it is drawn:
// on an iPhone that first frame otherwise stalls on the uploads mid-scroll
function uploadTextures(part){
  if(!renderer.initTexture) return;
  const seen = new Set(), add = t => { if(t && t.isTexture && !t.isRenderTargetTexture && t.image && !seen.has(t)) seen.add(t); };
  try {
    add(part.scene.background); add(part.scene.environment);
    part.scene.traverse(o => {
      (Array.isArray(o.material) ? o.material : o.material ? [o.material] : []).forEach(m => {
        for(const k in m) add(m[k]);
        if(m.uniforms) for(const k in m.uniforms) add(m.uniforms[k] && m.uniforms[k].value);
      });
    });
  } catch(e) {}
  seen.forEach(t => { try { renderer.initTexture(t); } catch(e) {} });
}

// a part on screen that is playing a timed film (part.busy, the chat) holds back the next builds, so building never
// costs the film a frame: until it ends, or the waiting part's section is about to show (within a tenth of a screen of
// the bottom edge), or 7 s have gone by (a film left half played off screen stops counting)
function quiet(P){
  const t0 = performance.now();
  return new Promise(res => { (function check(){
    const busy = PARTS.some(Q => Q !== P && Q.part && Q.active && Q.part.busy);
    if(!busy || lost || dbgRoot.flat || P.section.getBoundingClientRect().top < innerHeight*1.1 || performance.now() - t0 > 7000) res();
    else setTimeout(check, 100);
  })(); });
}
function queue(P, front){
  if(P.state !== 'idle' || P.flat) return;
  P.state = 'queued';
  if(front) buildQ.unshift(P); else buildQ.push(P);
  buildQ.sort((a, b) => a.i - b.i);
  pump();
}
async function pump(){
  if(pumping) return; pumping = true;
  while(buildQ.length){
    const P = buildQ.shift();
    if(P.i !== 0){ await firstUpP; await settled(P); await quiet(P); }
    if(lost || dbgRoot.flat) break;
    buildingSince = performance.now();
    await build(P);
    buildingSince = 0;
    // let a frame or two draw between builds
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  }
  pumping = false;
}
async function loadModule(P){
  if(!P.mod){
    P.mod = await import(new URL(P.src, document.baseURI).href);
    P.pr = capOf(P.mod); P.prMin = Math.min(PR_MIN, P.pr); dbgRoot.prs[P.id] = P.pr;
  }
  return P.mod;
}
async function build(P){
  P.state = 'building';
  const dbg = dbgRoot.parts[P.id] = {};
  try {
    const mod = await loadModule(P);
    stepDone(P, 1);
    const addons = {};
    (await Promise.all(((mod.meta && mod.meta.addons) || []).map(a => import('three/addons/' + a)))).forEach(m => Object.assign(addons, m));
    const part = await mod.createPart({THREE, addons, renderer, tier, reduce, section: P.section, stage: P.stage, dbg, load, loaded: release});
    if(lost || dbgRoot.flat){ try { part.dispose(); } catch(e) {} P.state = 'idle'; return; }
    // sized (the parts compile their shaders as they size), then not drawn until the GPU has finished those shaders
    P.part = part; P.state = 'warming'; P.active = false; P.sized = '';
    stepDone(P, 2);
    P.p = target(P);
    resizePart(P);
    await shadersReady(part);
    if(lost || dbgRoot.flat || P.part !== part) return;
    await firstDraw(P);
    if(lost || dbgRoot.flat || P.part !== part) return;
    P.state = 'built';
    stepDone(P, 3);
    if(!dbgRoot.built.includes(P.id)) dbgRoot.built.push(P.id);
  } catch(err) {
    // createPart frees what it made before it rethrows; the host shows the flat version in its place
    console.error('3D part "' + P.id + '" failed to build:', err);
    P.part = null; P.state = 'failed'; dbgRoot.failed.push(P.id);
    stepDone(P, 3);
    if(P.i === 0){ finishLoad(); release(); }
    showFlat(P);
  }
}
function safeDispose(P){ try { P.part && P.part.dispose(); } catch(e) {} }

async function showFlat(P){
  if(P.flat) return; P.flat = true;
  try {
    const mod = await loadModule(P);
    if(mod.flat) mod.flat({section: P.section, stage: P.stage, tier, reduce});
  } catch(e) { console.error('Flat version of "' + P.id + '" failed:', e); }
}
function goFlat(why){
  if(dbgRoot.flat) return;
  dbgRoot.flat = why || true;
  PARTS.forEach(P => { safeDispose(P); P.part = null; showFlat(P); });
  canvas.hidden = true;
  finishLoad(); release();
}

// the first part at once; every other part in the background once the opening's intro has played, one at a time, in
// pauses in the scrolling: a build stalls an iPhone for a fifth to half a second (its browser compiles shaders and
// uploads pictures in one go) and a Mac for a moment. (The section observer stays as a backstop, for a part that was
// skipped.)
if(renderer){
  const prefetch = P => loadModule(P).then(m => {
    ((m.meta && m.meta.addons) || []).forEach(a => import('three/addons/' + a).catch(() => {}));
    if(typeof m.prefetch === 'function') m.prefetch();
  }).catch(() => {});
  // the first part's files now; the rest once it has drawn, so they never slow it down on a slow connection
  if(PARTS[0]) prefetch(PARTS[0]);
  if(document.fonts) document.fonts.ready.then(finishLoad, finishLoad); else finishLoad();
  firstUpP.then(() => {
    PARTS.slice(1).forEach(prefetch);
    PARTS.forEach(P => queue(P));
    // the safety cap: whatever the opening is doing, its count finishes
    setTimeout(finishLoad, 3000);
  });
  const io = new IntersectionObserver(es => es.forEach(e => {
    const P = PARTS.find(q => q.section === e.target);
    if(P && e.isIntersecting) queue(P);
  }), {rootMargin: '150% 0px 150% 0px'});
  PARTS.forEach((P, i) => { if(i === 0) queue(P); else io.observe(P.section); });
} else {
  finishLoad();
  PARTS.forEach(showFlat);
}

// ---------- scroll progress, size ----------
function target(P){
  const r = P.section.getBoundingClientRect(), span = P.section.offsetHeight - P.stage.clientHeight;
  return span > 0 ? clamp(-r.top/span) : clamp(-r.top/(r.height || 1));
}
function resizePart(P){
  const w = P.stage.clientWidth, h = P.stage.clientHeight, key = w + 'x' + h + '@' + pr;
  if(key === P.sized || !w || !h) return;
  P.sized = key;
  P.part.resize(w, h, pr);
}

// ---------- the first draw (see the header): queued here, done at the end of a frame ----------
const drawQ = [];
function firstDraw(P){ return new Promise(res => { drawQ.push([P, res]); setTimeout(res, 3000); }); }
function drawPending(){
  if(!drawQ.length || !renderer || lost || dbgRoot.flat) return;
  const [P, res] = drawQ.shift(), part = P.part;
  if(!part || !part.scene || !part.camera){ res(); return; }
  const shown = [], culled = [], offMats = new Set(), sm = renderer.shadowMap, smA = sm.autoUpdate, smN = sm.needsUpdate;
  const scenes = [[part.scene, part.camera]].concat(part.warm || []);
  try {
    for(const [sc] of scenes) sc.traverse(o => {
      if(!o.visible){ shown.push(o); o.visible = true; }
      if(o.frustumCulled){ culled.push(o); o.frustumCulled = false; }
      (Array.isArray(o.material) ? o.material : o.material ? [o.material] : []).forEach(m => { if(!m.visible){ offMats.add(m); m.visible = true; } });
    });
    sm.autoUpdate = false; sm.needsUpdate = false;
    renderer.setRenderTarget(null);
    renderer.setViewport(0, 0, cw, ch);
    renderer.setScissor(0, ch - 1/pr, 1/pr, 1/pr);
    renderer.setScissorTest(true);
    for(const [sc, cam] of scenes) renderer.render(sc, cam);
  } catch(e) { /* drawing ahead is only an optimization */ }
  finally {
    shown.forEach(o => { o.visible = false; }); culled.forEach(o => { o.frustumCulled = true; }); offMats.forEach(m => { m.visible = false; });
    sm.autoUpdate = smA; sm.needsUpdate = smN;
    renderer.setScissorTest(false);
  }
  res();
}

// ---------- speed test mode (window.__perfOn set before the page loads; draws nothing different) ----------
// Per part: frames drawn, CPU ms in update and in render (submitting the draw calls), GPU ms (where the browser offers
// a GPU timer), draw calls and triangles. window.__perf.read() returns and clears the totals.
const perf = !!window.__perfOn && !!renderer;
const perfAcc = {};
let gpuQ = null, gpuPending = [];
function perfOf(P){ return perfAcc[P.id] || (perfAcc[P.id] = {frames: 0, upd: 0, ren: 0, gpu: 0, gpuN: 0, calls: 0, tris: 0}); }
if(perf){
  try { gpuQ = gl.getExtension('EXT_disjoint_timer_query_webgl2'); } catch(e) { gpuQ = null; }
  renderer.info.autoReset = false;
  window.__perf = {gpuTimer: !!gpuQ, renderer, part: id => { const P = PARTS.find(q => q.id === id); return P && P.part; }, read(){ pollGpu(); const out = JSON.parse(JSON.stringify(perfAcc)); for(const k in perfAcc) delete perfAcc[k]; return out; }};
}
function pollGpu(){
  if(!gpuQ) return;
  const disjoint = gl.getParameter(gpuQ.GPU_DISJOINT_EXT);
  gpuPending = gpuPending.filter(([q, id]) => {
    if(!gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE)) return true;
    if(!disjoint){ const a = perfAcc[id] || (perfAcc[id] = {frames: 0, upd: 0, ren: 0, gpu: 0, gpuN: 0, calls: 0, tris: 0}); a.gpu += gl.getQueryParameter(q, gl.QUERY_RESULT)/1e6; a.gpuN++; }
    gl.deleteQuery(q); return false;
  });
}
// __perfOn === 'calls': the GPU time is split by render call and shadow pass instead (labels part:call#:main|shadow|rt)
const segMode = perf && window.__perfOn === 'calls';
let segQ = null, segPart = '', segCall = 0;
function seg(label){
  if(!gpuQ) return;
  if(segQ){ gl.endQuery(gpuQ.TIME_ELAPSED_EXT); segQ = null; }
  if(label && gpuPending.length < 400){ segQ = gl.createQuery(); gl.beginQuery(gpuQ.TIME_ELAPSED_EXT, segQ); gpuPending.push([segQ, label]); }
}
if(segMode){
  const R = renderer.render.bind(renderer), SM = renderer.shadowMap.render.bind(renderer.shadowMap);
  renderer.render = function(scene, cam){
    const n = segCall++, tag = segPart + ':' + n + (renderer.getRenderTarget() ? ':rt' : ':main');
    seg(tag); const r = R(scene, cam); seg(null); return r;
  };
  renderer.shadowMap.render = function(lights, scene, cam){
    const n = segCall - 1; seg(segPart + ':' + n + ':shadow'); const r = SM(lights, scene, cam);
    seg(segPart + ':' + n + (renderer.getRenderTarget() ? ':rt' : ':main') + '+'); return r;
  };
}
function perfRender(P){
  const a = perfOf(P); a.frames++;
  renderer.info.reset();
  let q = null;
  if(segMode){ segPart = P.id; segCall = 0; }
  else if(gpuQ && gpuPending.length < 60){ q = gl.createQuery(); gl.beginQuery(gpuQ.TIME_ELAPSED_EXT, q); }
  const t = performance.now();
  try { P.part.render(renderer, vp); }
  finally {
    const d = performance.now() - t; a.ren += d; if(d > (a.renMax || 0)){ a.renMax = d; a.renMaxY = scrollY; }
    if(q){ gl.endQuery(gpuQ.TIME_ELAPSED_EXT); gpuPending.push([q, P.id]); }
    a.calls += renderer.info.render.calls; a.tris += renderer.info.render.triangles;
  }
  pollGpu();
}

// ---------- the frame ----------
let last = performance.now(), t0 = last, drewLast = false;
const gaps = [], winSet = new Set(); let winStart = t0, winDirty = false, probe = null, capLock = false;
const vp = {x: 0, y: 0, w: 1, h: 1};
// The host's own JavaScript time for the last two frames.
let jsNow = 0, jsPrev = 0;
function frame(now){
  requestAnimationFrame(frame);
  const j0 = performance.now();
  try { frameBody(now); drawPending(); } finally { jsPrev = jsNow; jsNow = performance.now() - j0; }
}
function frameBody(now){
  const dt = Math.min(1/30, Math.max(0, (now - last)/1000)), gap = now - last; last = now;
  if(!renderer || lost || dbgRoot.flat) return;
  if(needSize){ needSize = false; sizeCanvas(); }

  // which parts are on screen
  const onScreen = [];
  for(const P of PARTS){
    if(!P.part || P.state !== 'built'){ P.active = false; continue; }
    P.seen = true;
    const r = P.stage.getBoundingClientRect();
    const on = r.width > 0 && r.height > 0 && r.bottom > chromeBottom + 1 && r.top < ch - GLM && r.right > 0 && r.left < cw;
    if(!on){ P.active = false; continue; }
    onScreen.push([P, r]);
  }
  // the pixel ratio for this frame: the highest among them (see Sharpness in the header)
  if(onScreen.length){
    let want = 0;
    for(const [P] of onScreen) want = Math.max(want, P.pr);
    if(want !== pr){ pr = want; renderer.setPixelRatio(pr); sizeCanvas(); dbgRoot.dpr = pr; winDirty = true; }
    for(const [P] of onScreen) if(P.pr >= pr) winSet.add(P);
  }
  // update them
  const live = [];
  for(const [P, r] of onScreen){
    try {
      resizePart(P);
      const pdt = P.active ? dt : 0; P.active = true;
      const ease = P.part.ease || 6.5;
      P.p += (target(P) - P.p)*(1 - Math.exp(-pdt*ease));
      if(perf){ const a = performance.now(); P.part.update(pdt, P.p, now); const d = performance.now() - a, o = perfOf(P); o.upd += d; if(d > (o.updMax || 0)){ o.updMax = d; o.updMaxY = scrollY; } }
      else P.part.update(pdt, P.p, now);
      live.push([P, r]);
    } catch(err) { runtimeFail(P, err); }
  }

  if(dbgRoot.drawn.length !== live.length || live.some(([P], i) => dbgRoot.drawn[i] !== P.id)) dbgRoot.drawn = live.map(([P]) => P.id);
  if(!live.length){
    // nothing on screen: clear once so no old picture is left behind, then stay idle
    if(drewLast){ renderer.setScissorTest(false); renderer.setRenderTarget(null); renderer.clear(true, true, true); drewLast = false; }
    gaps.length = 0; winStart = now; winSet.clear();
    return;
  }

  placeCanvas(live.some(([P, r]) => pinned(P, r)));
  renderer.setRenderTarget(null);
  renderer.setScissorTest(false);
  renderer.setClearColor(0xffffff, 0);
  renderer.clear(true, true, true);
  const bw = Math.floor(cw*pr), bh = Math.floor(ch*pr), E = .01;
  for(const [P, r] of live){
    // the stage's whole rectangle in drawing-buffer pixels (GL origin bottom left), and its on-screen part
    const X = Math.round(r.left*pr), T = Math.round((r.top - offY)*pr), W = Math.floor(P.stage.clientWidth*pr), H = Math.floor(P.stage.clientHeight*pr);
    const Y = bh - (T + H);
    const sx = Math.max(0, X), sy = Math.max(0, Y), sw = Math.min(bw, X + W) - sx, sh = Math.min(bh, Y + H) - sy;
    if(sw <= 0 || sh <= 0) continue;
    renderer.setRenderTarget(null);
    renderer.setViewport((X + E)/pr, (Y + E)/pr, (W + E)/pr, (H + E)/pr);
    renderer.setScissor((sx + E)/pr, (sy + E)/pr, (sw + E)/pr, (sh + E)/pr);
    renderer.setScissorTest(true);
    renderer.toneMappingExposure = 1.05;
    vp.x = X; vp.y = Y; vp.w = W; vp.h = H;
    try {
      if(perf) perfRender(P); else P.part.render(renderer, vp);
    } catch(err) { runtimeFail(P, err); }
  }
  renderer.setScissorTest(false);
  drewLast = true;
  window.__frames++;

  // adaptive sharpness: the median frame over 2 s, after the first 3 s, ignoring windows with a build or a ratio change in
  // them; the parts that set the ratio in that window step down (the next frame draws at the new highest)
  if(buildingSince) winDirty = true;
  gaps.push(gap);
  if(now - winStart >= 2000){
    if(!winDirty && now - t0 > 3000 && gaps.length >= 20){
      gaps.sort((a, b) => a - b);
      // Frames at a steady slower beat (every one alike, about 30 a second) are either the browser's cap (iPhone Safari
      // can cap embedded pages at 30 frames per second; so can Low Power
      // Mode) or a page just too slow for 60. So the first time, step down as usual but remember the old ratios; if the
      // next clean window is no faster, it was the cap: put them back (lowering only blurred the page) and step no
      // more while the beat holds.
      const med = gaps[gaps.length >> 1], lo = gaps[Math.floor(gaps.length*.1)], hi = gaps[Math.floor(gaps.length*.9)];
      const steady = lo > 1000/45 && hi - lo < 4;
      if(med <= 1000/55) capLock = false;
      if(probe){
        if(med > 1000/45){ probe.forEach((v, P) => { P.pr = v; dbgRoot.prs[P.id] = v; }); capLock = true; dbgRoot.capped = true; }
        probe = null;
      } else if(med > 1000/55 && !(steady && capLock)){
        const was = steady ? new Map() : null;
        for(const P of winSet) if(P.pr > P.prMin){
          if(was) was.set(P, P.pr);
          P.pr = Math.max(P.prMin, Math.round((P.pr - .25)*100)/100); dbgRoot.prs[P.id] = P.pr;
        }
        if(was && was.size) probe = was;
      }
    }
    gaps.length = 0; winStart = now; winDirty = false; winSet.clear();
  }
}
function runtimeFail(P, err){
  console.error('3D part "' + P.id + '" stopped:', err);
  safeDispose(P); P.part = null; P.state = 'failed'; P.active = false; dbgRoot.failed.push(P.id);
  showFlat(P);
}
requestAnimationFrame(frame);

// the first part is "up" once it has drawn a frame, or once it is built while off screen (the page opened scrolled
// down: a reload keeps its place, a link to #book); later parts wait for that
(function waitFirst(){
  const P = PARTS[0];
  if(!P || !renderer){ firstUp(); return; }
  const f0 = window.__frames;
  (function check(){
    if(P.state === 'failed' || dbgRoot.flat || (P.part && (window.__frames > f0 + 1 || (P.seen && !P.active)))) firstUp();
    else requestAnimationFrame(check);
  })();
})();

// ---------- pointer: one listener set, routed to the part under the pointer ----------
function partAt(e){
  if(e.target && e.target.closest && e.target.closest('[data-chrome]')) return null;
  for(const P of PARTS){
    if(!P.part || P.state !== 'built') continue;
    const r = P.stage.getBoundingClientRect();
    if(e.clientX >= r.left && e.clientX < r.right && e.clientY >= r.top && e.clientY < r.bottom) return [P, r];
  }
  return null;
}
// the part whose stage holds this pointer (setPointerCapture), if any
function holder(e){
  if(e.pointerId == null) return null;
  for(const P of PARTS){
    if(!P.part || P.state !== 'built') continue;
    try { if(P.stage.hasPointerCapture(e.pointerId)) return P; } catch(err) {}
  }
  return null;
}
function leave(P, e){
  if(!P.hover) return; P.hover = false;
  if(!P.part) return;
  const ev = new PointerEvent('pointerleave', {clientX: e ? e.clientX : -1e4, clientY: e ? e.clientY : -1e4, pointerType: e ? e.pointerType : 'mouse',
    pointerId: e && e.pointerId != null ? e.pointerId : 1, isPrimary: true});
  ev.localX = ev.localY = -1e4;
  try { P.part.pointer(ev); } catch(err) { runtimeFail(P, err); }
}
function route(e){
  if(!renderer || lost || dbgRoot.flat) return;
  const cap = holder(e);
  let hit = null;
  if(cap) hit = [cap, cap.stage.getBoundingClientRect()];
  else if(e.type === 'pointercancel'){ const P = PARTS.find(q => q.hover && q.part); if(P) hit = [P, P.stage.getBoundingClientRect()]; }
  else hit = partAt(e);
  for(const P of PARTS) if(P.hover && (!hit || hit[0] !== P)) leave(P, e);
  if(!hit) return;
  const [P, r] = hit;
  if(e.type !== 'click') P.hover = true;
  e.localX = e.clientX - r.left; e.localY = e.clientY - r.top;
  try { P.part.pointer(e); } catch(err) { runtimeFail(P, err); }
}
['pointermove', 'pointerdown', 'pointerup', 'pointercancel', 'click'].forEach(t => addEventListener(t, route, {passive: true}));
// the pointer left a stage for something outside it (the menu bar, another window), or a touch lifted
addEventListener('pointerout', e => {
  const to = e.relatedTarget;
  for(const P of PARTS) if(P.hover && (!to || !P.stage.contains(to))) leave(P, e);
}, {passive: true});


