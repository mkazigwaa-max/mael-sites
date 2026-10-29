// MAANAA — THE LIVE LOGO. The pulsating wave-ring from the Frequency Room
// field (assets/field.js v4) as a shared component: one dotted 9-lobe ring
// that spins slowly, breathes with the pulse, and lands in the next family
// color at every pulse — lime -> coral -> teal -> magenta, never static.
// Markup: <span class="live-logo" data-size="32"></span> for rings,
// <div class="live-field"></div> inside a .ll-sec section for the dotted
// field + edge-ring background treatment. One shared rAF loop drives every
// instance; offscreen instances sleep; DPR capped at 1.75 like the field.
(function () {
  'use strict';
  var PAL = [[155, 197, 61], [255, 107, 87], [14, 124, 123], [176, 48, 122]]; // FUEL lime · GUARD coral · ANCHOR teal · CATALYST magenta (field.js palette x255)
  var TAU = Math.PI * 2, DOTS = 90;
  var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var DPR = Math.min(window.devicePixelRatio || 1, 1.75);
  var insts = [], rafOn = false;

  function sstep(a, b, x) { x = Math.min(1, Math.max(0, (x - a) / (b - a))); return x * x * (3 - 2 * x); }
  function mixc(c1, c2, f) { return [c1[0] + (c2[0] - c1[0]) * f, c1[1] + (c2[1] - c1[1]) * f, c1[2] + (c2[2] - c1[2]) * f]; }
  // The field's color law: pulsePhase = t*0.7 + phase; each pulse crosses to
  // the next family color, crossfading at the pulse's end (0.72 -> 1.0).
  function ringColor(t, ph) {
    var pp = t * 0.7 + ph * 2.0, fl = Math.floor(pp), fr = pp - fl;
    var idx = fl + Math.floor(ph * 4.0); // integer palette offset per instance (fractional ph made PAL[idx] undefined -> mixc threw -> the shared rAF loop died on frame 1)
    var c = mixc(PAL[((idx % 4) + 4) % 4], PAL[(((idx + 1) % 4) + 4) % 4], sstep(0.72, 1.0, fr));
    var env = 0.5 + 0.5 * Math.sin(pp * TAU);
    return { c: c, env: env };
  }
  function drawRing(ctx, cx, cy, R, t, ph, alphaMul, speed) {
    var st = ringColor(t * speed, ph);
    var rot = t * 0.22 * speed + ph * TAU;
    var breathe = 1 + 0.03 * Math.sin((t * 0.7 * speed + ph * 2.0) * TAU);
    var dr = Math.max(1.0, R * 0.085) * (0.8 + 0.45 * st.env);
    var a = alphaMul * (0.74 + 0.26 * st.env);
    ctx.fillStyle = 'rgba(' + (st.c[0] | 0) + ',' + (st.c[1] | 0) + ',' + (st.c[2] | 0) + ',' + a.toFixed(3) + ')';
    ctx.beginPath();
    for (var i = 0; i < DOTS; i++) {
      var th = (i / DOTS) * TAU;
      var r = R * breathe * (1 + 0.085 * Math.cos(9 * (th - rot)));
      var x = cx + r * Math.cos(th), y = cy + r * Math.sin(th);
      ctx.moveTo(x + dr, y);
      ctx.arc(x, y, dr, 0, TAU);
    }
    ctx.fill();
  }
  function drawStaticRing(ctx, cx, cy, R, alphaMul) {
    ctx.fillStyle = 'rgba(155,197,61,' + (0.9 * alphaMul).toFixed(3) + ')';
    var dr = Math.max(1.0, R * 0.085);
    ctx.beginPath();
    for (var i = 0; i < DOTS; i++) {
      var th = (i / DOTS) * TAU;
      var r = R * (1 + 0.085 * Math.cos(9 * th));
      var x = cx + r * Math.cos(th), y = cy + r * Math.sin(th);
      ctx.moveTo(x + dr, y);
      ctx.arc(x, y, dr, 0, TAU);
    }
    ctx.fill();
  }

  function makeCanvas(w, h) {
    var cv = document.createElement('canvas');
    cv.width = Math.max(2, Math.round(w * DPR)); cv.height = Math.max(2, Math.round(h * DPR));
    cv.style.width = w + 'px'; cv.style.height = h + 'px';
    cv.setAttribute('aria-hidden', 'true');
    var ctx = cv.getContext('2d');
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    return { cv: cv, ctx: ctx };
  }

  function initLogo(el) {
    if (el.getAttribute('data-ll-on')) return;
    el.setAttribute('data-ll-on', '1');
    var size = parseFloat(el.getAttribute('data-size')) || 30;
    var ph = el.hasAttribute('data-canonical') ? 0 :
      (parseFloat(el.getAttribute('data-phase')) || ((insts.length * 0.61803) % 1));
    var wm = el.getAttribute('data-variant') === 'watermark';
    var m = makeCanvas(size, size);
    el.textContent = '';
    el.appendChild(m.cv);
    var inst = { kind: 'ring', ctx: m.ctx, w: size, h: size, ph: ph, on: true,
                 alpha: wm ? 0.16 : 1, speed: wm ? 0.45 : 1 };
    insts.push(inst);
    if (reduced) drawStaticRing(m.ctx, size / 2, size / 2, size / 2 - Math.max(1.2, size * 0.045) - 1, inst.alpha);
    watch(inst, el);
  }

  function initField(el) {
    if (el.getAttribute('data-ll-on')) return;
    el.setAttribute('data-ll-on', '1');
    var host = el.parentElement;
    var rect = host.getBoundingClientRect();
    var w = Math.max(50, rect.width), h = Math.max(50, rect.height);
    var m = makeCanvas(w, h);
    el.appendChild(m.cv);
    var inst = { kind: 'field', ctx: m.ctx, w: w, h: h, ph: (insts.length * 0.61803) % 1, on: true, alpha: 1, speed: 1, host: host };
    insts.push(inst);
    if (reduced) drawField(inst, 0);
    watch(inst, el);
    if (window.ResizeObserver) {
      new ResizeObserver(function () {
        var r = host.getBoundingClientRect();
        if (Math.abs(r.width - inst.w) > 4 || Math.abs(r.height - inst.h) > 4) {
          inst.w = Math.max(50, r.width); inst.h = Math.max(50, r.height);
          m.cv.width = Math.round(inst.w * DPR); m.cv.height = Math.round(inst.h * DPR);
          m.cv.style.width = inst.w + 'px'; m.cv.style.height = inst.h + 'px';
          m.ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
          if (reduced) drawField(inst, 0);
        }
      }).observe(host);
    }
  }

  var FIELD_RINGS = [[0.06, 0.46, 0.15], [0.95, 0.28, 0.21], [0.90, 0.86, 0.12], [0.10, 0.90, 0.10]];
  function drawField(inst, t) {
    var ctx = inst.ctx, w = inst.w, h = inst.h;
    ctx.clearRect(0, 0, w, h);
    var sp = 27;
    for (var x = sp / 2; x < w; x += sp) {
      var f = Math.min(3, Math.max(0, Math.floor((x / w) * 4)));
      var c = PAL[f];
      for (var y = sp / 2; y < h; y += sp) {
        var tw = reduced ? 0.26 : 0.20 + 0.10 * (0.5 + 0.5 * Math.sin(t * 0.9 + x * 0.045 + y * 0.06));
        ctx.fillStyle = 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + tw.toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(x, y, 1.5, 0, TAU); ctx.fill();
      }
    }
    var md = Math.min(w, h);
    for (var i = 0; i < FIELD_RINGS.length; i++) {
      var g = FIELD_RINGS[i];
      if (reduced) drawStaticRing(ctx, g[0] * w, g[1] * h, g[2] * md, 0.55);
      else drawRing(ctx, g[0] * w, g[1] * h, g[2] * md, t, inst.ph + i * 0.37, 0.62, 1);
    }
  }

  function watch(inst, el) {
    if (!window.IntersectionObserver || reduced) return;
    new IntersectionObserver(function (es) {
      for (var i = 0; i < es.length; i++) if (es[i].target === el) inst.on = es[i].isIntersecting;
    }, { rootMargin: '80px' }).observe(el);
  }

  function frame(now) {
    var t = now / 1000;
    for (var i = 0; i < insts.length; i++) {
      var inst = insts[i];
      if (!inst.on) continue;
      if (inst.kind === 'ring') {
        inst.ctx.clearRect(0, 0, inst.w, inst.h);
        drawRing(inst.ctx, inst.w / 2, inst.h / 2, inst.w / 2 - Math.max(1.2, inst.w * 0.045) - 1, t, inst.ph, inst.alpha, inst.speed);
      } else drawField(inst, t);
    }
    if (!document.hidden) requestAnimationFrame(frame);
    else rafOn = false;
  }
  function start() {
    if (rafOn || reduced || !insts.length) return;
    rafOn = true;
    requestAnimationFrame(frame);
  }
  document.addEventListener('visibilitychange', function () { if (!document.hidden) start(); });

  function scan(root) {
    var list = [];
    if (root && root.nodeType === 1 && root.matches && root.matches('.live-logo, .live-field')) list.push(root);
    var q = (root || document).querySelectorAll('.live-logo:not([data-ll-on]), .live-field:not([data-ll-on])');
    for (var i = 0; i < q.length; i++) list.push(q[i]);
    for (var j = 0; j < list.length; j++) {
      var el = list[j];
      if (el.getAttribute('data-ll-on')) continue;
      if (el.classList.contains('live-field')) initField(el); else initLogo(el);
    }
    start();
  }
  scan(document);
  if (window.MutationObserver) {
    new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++)
        for (var j = 0; j < muts[i].addedNodes.length; j++) {
          var n = muts[i].addedNodes[j];
          if (n.nodeType === 1) scan(n);
        }
    }).observe(document.body, { childList: true, subtree: true });
  }
  window.MaanaaLogo = { scan: scan };
})();
