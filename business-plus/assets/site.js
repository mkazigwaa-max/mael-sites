/* Small shared behaviour for the site pages.

   1. The "Watch it Work" video windows (homepage and Our Work).

   - A video and its still picture load only when its window opens, so a
     visitor who never presses Watch never downloads them.
   - Opening plays it (no sound in any of them); closing pauses it, however
     it is closed: the Close button, Escape, or a click outside.
   - The browser's own <dialog> keeps keyboard focus inside the window and
     returns it to the button that opened it.

   2. The AI Concierge Monthly / Annual price switch (homepage and the
      AI Concierge page).

   3. The menu button on phones and tablets: opens and closes the links,
      closes on Escape, on a link, or on a tap outside. */
(function () {
  'use strict';
  // 0. Which of our own links brought them. Every form sends the three campaign
  // tags "from this address, or remembered for the visit", but only a page that
  // sent a form ever remembered them, so a visitor who landed on one page with
  // tags and sent a form from another arrived with none (bug hunt 2026-10-09).
  // Remembered here, on arrival, in this tab only, and nothing else is kept.
  try {
    var tags = {}, qs = new URLSearchParams(location.search);
    ['utm_source', 'utm_medium', 'utm_campaign'].forEach(function (k) { var v = qs.get(k); if (v) tags[k] = v.slice(0, 80); });
    if (Object.keys(tags).length) sessionStorage.setItem('bo-utm', JSON.stringify(tags));
  } catch (e) { /* storage off: the forms fall back to the address, as before */ }
  // The two bios on the homepage open on "Read more" and close on "Read less".
  // The page arrives with both bios open and the button hidden, so without
  // this script nothing is lost; the script folds them shut and shows the button.
  document.querySelectorAll('.bio-toggle').forEach(function (btn) {
    var more = document.getElementById(btn.getAttribute('aria-controls'));
    if (!more) return;
    function set(open) {
      more.hidden = !open;
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.textContent = open ? 'Read less' : 'Read more';
    }
    set(false);
    btn.hidden = false;
    btn.addEventListener('click', function () { set(more.hidden); });
  });
  function load(video) {
    if (!video) return;
    var poster = video.getAttribute('data-poster');
    var src = video.getAttribute('data-src');
    if (poster && !video.getAttribute('poster')) video.setAttribute('poster', poster);
    if (src && !video.getAttribute('src')) video.setAttribute('src', src);
  }
  // Moving covers on the Our Work cards: a two-second silent loop of each video's key moment. It
  // starts only while the card is on screen; the still underneath stays for reduced motion and for no JavaScript.
  var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var covers = document.querySelectorAll('.pf-shot[data-src]');
  if (!still && covers.length && 'IntersectionObserver' in window) {
    var seen = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var v = e.target.querySelector('video');
        if (e.isIntersecting) {
          if (!v) {
            v = document.createElement('video');
            v.muted = true; v.loop = true; v.playsInline = true;
            v.setAttribute('muted', ''); v.setAttribute('playsinline', ''); v.setAttribute('aria-hidden', 'true');
            v.src = e.target.getAttribute('data-src');
            e.target.appendChild(v);
          }
          var p = v.play(); if (p && p.catch) p.catch(function () { /* the still stays */ });
        } else if (v) v.pause();
      });
    }, { rootMargin: '150px' });
    covers.forEach(function (b) { seen.observe(b); });
  }
  document.querySelectorAll('[data-open-dialog]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var dlg = document.getElementById(btn.getAttribute('data-open-dialog'));
      if (!dlg || typeof dlg.showModal !== 'function') return;
      var video = dlg.querySelector('video');
      load(video);
      dlg.showModal();
      if (video) {
        var p = video.play();
        // A video still loading can start playing after its window has been
        // closed; if so, stop it the moment it starts.
        if (p && p.then) p.then(function () { if (!dlg.open) video.pause(); }, function () { /* the controls are there */ });
      }
    });
  });
  // Chapters under each video: tap one to jump there; the current one is lit.
  var fmt = function (t) { t = Math.floor(t); return Math.floor(t / 60) + ':' + (t % 60 < 10 ? '0' : '') + (t % 60); };
  document.querySelectorAll('dialog.video-dialog video[data-chapters]').forEach(function (video) {
    var list; try { list = JSON.parse(video.getAttribute('data-chapters')); } catch (e) { return; }
    var ol = document.createElement('ol'); ol.className = 'chapters';
    list.forEach(function (c, i) {
      var li = document.createElement('li'), b = document.createElement('button');
      b.type = 'button'; b.setAttribute('data-t', c[0]);
      b.innerHTML = '<span class="ch-t"></span><span class="ch-n"></span>';
      b.querySelector('.ch-t').textContent = fmt(c[0]); b.querySelector('.ch-n').textContent = c[1];
      b.addEventListener('click', function () { video.currentTime = c[0]; var p = video.play(); if (p && p.catch) p.catch(function () {}); });
      li.appendChild(b); ol.appendChild(li);
    });
    video.insertAdjacentElement('afterend', ol);
    video.addEventListener('timeupdate', function () {
      var at = -1; list.forEach(function (c, i) { if (video.currentTime >= c[0] - 0.05) at = i; });
      ol.querySelectorAll('button').forEach(function (b, i) { b.classList.toggle('on', i === at); });
    });
  });

  document.querySelectorAll('dialog.video-dialog').forEach(function (dlg) {
    var close = dlg.querySelector('[data-close]');
    var stop = function () { var v = dlg.querySelector('video'); if (v) v.pause(); };
    if (close) close.addEventListener('click', function () { stop(); dlg.close(); });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) { stop(); dlg.close(); } });
    dlg.addEventListener('cancel', stop);  // Escape
    dlg.addEventListener('close', stop);
  });

  document.querySelectorAll('[data-concierge]').forEach(function (box) {
    var btns = box.querySelectorAll('.switch-btn');
    var scope = box.querySelector('[data-term-amount]') ? box : (box.closest('[data-concierge-scope]') || box.parentElement);
    btns.forEach(function (b) {
      b.addEventListener('click', function () {
        btns.forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        scope.querySelectorAll('[data-term-amount]').forEach(function (p) {
          p.hidden = p.getAttribute('data-term-amount') !== b.getAttribute('data-term');
        });
      });
    });
  });

  var nav = document.querySelector('header.nav'), toggle = nav && nav.querySelector('.nav-toggle');
  if (toggle) {
    var setOpen = function (open) { nav.classList.toggle('open', open); toggle.setAttribute('aria-expanded', open ? 'true' : 'false'); };
    toggle.addEventListener('click', function () { setOpen(!nav.classList.contains('open')); });
    nav.querySelectorAll('.nav-links a').forEach(function (a) { a.addEventListener('click', function () { setOpen(false); }); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && nav.classList.contains('open')) { setOpen(false); toggle.focus(); } });
    document.addEventListener('click', function (e) { if (nav.classList.contains('open') && !nav.contains(e.target)) setOpen(false); });
  }

  // Our Work: filter the portfolio by what a tool helps with, or by search.
  var grid = document.querySelector('[data-pf-grid]');
  if (grid) {
    var search = document.querySelector('[data-pf-search]'), chips = document.querySelectorAll('[data-pf-chips] button');
    var empty = document.querySelector('[data-pf-empty]'), tag = '';
    var apply = function () {
      var q = (search.value || '').trim().toLowerCase(), shown = 0;
      grid.querySelectorAll('.portfolio-card').forEach(function (c) {
        var ok = (!tag || c.getAttribute('data-tag') === tag) && (!q || c.textContent.toLowerCase().indexOf(q) !== -1);
        c.hidden = !ok; if (ok) shown++;
      });
      if (empty) empty.hidden = shown > 0;
    };
    chips.forEach(function (b) { b.addEventListener('click', function () {
      tag = b.getAttribute('data-tag') || '';
      chips.forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      apply();
    }); });
    search.addEventListener('input', apply);
  }
})();
