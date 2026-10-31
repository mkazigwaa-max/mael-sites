/* UNBOXING WIRING — Phase B unit 8 (the Unboxing, the ritual room).
   Chrome copied from the landed Reading Rooms build (F-20 scroll state,
   P-13 drawer via cart-shim, G-37 toast). Room systems:
   BL-03 — Bloom's hero-slider contract re-driven from its banked inline
   script (IntersectionObserver slide detection at 0.5 root threshold,
   goTo via scrollIntoView; the donor runtime is Alpine x-data, which does
   not ship — the CSS scroll-snap substrate in unboxing-extracts.css is the
   donor's own and carries the motion).
   S-17 — sckenofficial video-background contract re-driven: the donor file
   (597 B) copies each source's data-video-source to src and calls load(),
   but imports the unbanked @theme/component chain; here the same contract
   runs gated by an IntersectionObserver so the field loads ONLY on
   approach (poster-first, per the brief). No house film file exists, so
   the component carries no data-video-source: the trigger fires, the
   poster holds, and the slot is named (window.__skinaaFilmSlot). */
(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s).replace(/[&<>\"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };

  /* ---------- chrome: F-20 / P-13 / G-37 ------------------------------ */
  var header = $("#site-header");
  if (header) addEventListener("scroll", function () {
    header.classList.toggle("is-scrolled", scrollY > 40);
  }, { passive: true });
  function toast(word, msg) {
    var host = $(".toast-stack"); if (!host) return;
    var t = document.createElement("div"); t.className = "toast";
    t.innerHTML = '<span class="toast-word">' + esc(word) + "</span> " + esc(msg);
    host.appendChild(t); setTimeout(function () { t.remove(); }, 3200);
  }
  window.SKINAAState = { toast: toast, loading: function (on) {
    var o = $(".loading-overlay"); if (o) o.classList.toggle("show", !!on);
  } };
  var underlay = $(".drawer__underlay"), cartDrawer = $(".cart-drawer");
  function renderCart() {
    if (!cartDrawer || !window.SKINAA_CART) return;
    Promise.resolve(window.SKINAA_CART.json()).then(function (cart) {
      var host = $(".cart-items", cartDrawer);
      var items = (cart && cart.items) || [];
      host.innerHTML = items.length ? items.map(function (it) {
        return '<div class="cart-line"><span><b>' + esc(it.title || it.id) + '</b><br><span class="cart-qty">× ' + it.quantity + "</span></span></div>";
      }).join("") : '<p class="cart-empty">The tray is empty.</p>';
      var total = items.reduce(function (a, it) { return a + (it.quantity || 0); }, 0);
      var t = $(".cart-total", cartDrawer); if (t) t.textContent = total + " in the tray";
      $$(".cart-count").forEach(function (c) { c.textContent = total; });
    });
  }
  function openCart() { renderCart(); if (cartDrawer) cartDrawer.classList.add("open"); if (underlay) underlay.classList.add("open"); document.body.classList.add("drawer-open"); toast("added", "the tray is open"); }
  function closeCart() { if (cartDrawer) cartDrawer.classList.remove("open"); if (underlay) underlay.classList.remove("open"); document.body.classList.remove("drawer-open"); }
  $$("[data-cart-open]").forEach(function (b) { b.addEventListener("click", openCart); });
  $$(".drawer__close").forEach(function (b) { b.addEventListener("click", closeCart); });
  if (underlay) underlay.addEventListener("click", closeCart);
  document.addEventListener("skinaa:open-cart", openCart);
  var searchBtn = $("[data-header-search]"), pop = $(".header-search-popdown");
  if (searchBtn && pop) searchBtn.addEventListener("click", function () {
    var open = pop.style.display !== "none";
    pop.style.display = open ? "none" : "block";
    if (!open) { var i = $("input", pop); if (i) i.focus(); }
  });
  renderCart();

  /* ---------- BL-03 · snap sequence (Bloom heroSlider contract) ------- */
  $$(".image-cta-slider").forEach(function (slider) {
    var track = $(".image-cta-slider__container--scroll-snap", slider);
    if (!track) return;
    var slides = $$("[data-slide-index]", track);
    var bullets = $$(".image-cta-slider__bullet", slider);
    var state = { currentSlide: 0, slideCount: slides.length };
    function setActive(i) {
      state.currentSlide = i;
      bullets.forEach(function (b, j) { b.classList.toggle("image-cta-slider__bullet--active", j === i); });
      slider.setAttribute("data-current-slide", String(i));
    }
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          var idx = parseInt(entry.target.getAttribute("data-slide-index"), 10);
          if (!isNaN(idx)) setActive(idx);
        }
      });
    }, { root: track, threshold: 0.5 });
    slides.forEach(function (s) { observer.observe(s); });
    function goTo(index) {
      var target = index;
      if (target < 0) target = state.slideCount - 1;
      else if (target >= state.slideCount) target = 0;
      var slide = track.querySelector('[data-slide-index="' + target + '"]');
      if (slide) slide.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
    }
    bullets.forEach(function (b, j) { b.addEventListener("click", function () { goTo(j); }); });
    var prev = $(".image-cta-slider__nav--prev", slider), next = $(".image-cta-slider__nav--next", slider);
    if (prev) prev.addEventListener("click", function () { goTo(state.currentSlide - 1); });
    if (next) next.addEventListener("click", function () { goTo(state.currentSlide + 1); });
    slider.__heroSlider = { state: state, goTo: goTo };
    setActive(0);
  });

  /* ---------- S-17 · lazy film field (loads on approach only) --------- */
  window.__skinaaFilmSlot = { approached: false, loaded: false, slot: "house-film-unboxing" };
  $$("video-background-component").forEach(function (comp) {
    var video = $("video", comp);
    function approach() {
      window.__skinaaFilmSlot.approached = true;
      comp.setAttribute("data-approached", "true");
      var field = comp.closest(".film-field"); if (field) field.classList.add("is-approached");
      /* donor contract: data-video-source -> src, then load() */
      var any = false;
      $$("source", comp).forEach(function (source) {
        var src = source.getAttribute("data-video-source");
        if (src) { source.setAttribute("src", src); any = true; }
      });
      if (any && video) {
        video.load(); video.style.display = "block";
        var p = video.play(); if (p && p.catch) p.catch(function () {});
        window.__skinaaFilmSlot.loaded = true;
      }
      /* no data-video-source anywhere = the NAMED SLOT: poster holds */
    }
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { approach(); io.disconnect(); } });
      }, { rootMargin: "400px 0px" });
      io.observe(comp);
    } else { approach(); }
    comp.__approach = approach;
  });
})();
