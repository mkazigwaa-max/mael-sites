/* VAULT WIRING — Phase B unit 6 (Story A · hazelnut).
   Every record rendered here comes from MODELS in skinaa-data.js (28
   records; PRESENTED = the same 6 exemplars the rebuild presents).
   Copy = MODELS verbatim fields only. Numbers in the G-08 strip are
   COMPUTED from the MODELS census at runtime. G30 tracks parse only the
   documented percentage deltas written inside MODELS gains fields —
   a record without one renders no track. Named re-drives (donor JS absent
   or Alpine/Angular-bound, per ENRICHMENT-MAP): G02 banner, G05 timeline
   driver (donor: custom.js initProgressScript), G30 tabs/tracks,
   S-04 layered slideshow (banked JS contract re-driven), G-09 carousel. */
(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var lc = function (c) { return c.toLowerCase(); };
  var PRESENTED = ["C01", "C11", "K04", "C05", "K03", "N1"];
  var presented = MODELS.filter(function (m) { return PRESENTED.indexOf(m.code) >= 0; });
  var selected = presented[0];
  function img(code, kind) { return "assets/vault/" + lc(code) + "-" + kind; }
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;"); }

  /* ---------- chrome: F-20 scroll state, P-13 drawer, header search ---- */
  var header = $("#site-header");
  if (header) addEventListener("scroll", function () {
    header.classList.toggle("is-scrolled", scrollY > 24);
  }, { passive: true });
  var underlay = $(".drawer__underlay"), cartDrawer = $(".cart-drawer");
  function renderCart() {
    if (!cartDrawer || !window.SKINAA_CART) return;
    Promise.resolve(window.SKINAA_CART.json()).then(function (cart) {
      var host = $(".cart-items", cartDrawer);
      var items = (cart && cart.items) || [];
      host.innerHTML = items.length ? items.map(function (it) {
        return '<div class="cart-line"><span><b>' + esc(it.title || it.id) + '</b><br><span class="cart-qty">× ' + it.quantity + '</span></span></div>';
      }).join("") : '<p class="cart-empty">The tray is empty.</p>';
      var total = items.reduce(function (a, it) { return a + it.quantity; }, 0);
      var t = $(".cart-total", cartDrawer); if (t) t.textContent = total + " in the tray";
      $$(".cart-count").forEach(function (c) { c.textContent = total; });
    });
  }
  function openCart() { renderCart(); if (cartDrawer) cartDrawer.classList.add("open"); if (underlay) underlay.classList.add("open"); document.body.classList.add("drawer-open"); }
  function closeCart() { if (cartDrawer) cartDrawer.classList.remove("open"); if (underlay) underlay.classList.remove("open"); document.body.classList.remove("drawer-open"); }
  $$("[data-cart-open]").forEach(function (b) { b.addEventListener("click", openCart); });
  $$(".drawer__close").forEach(function (b) { b.addEventListener("click", closeCart); });
  if (underlay) underlay.addEventListener("click", closeCart);
  document.addEventListener("skinaa:open-cart", openCart);
  var pop = $(".header-search-popdown");
  var searchBtn = $(".header__icon-touch--search");
  if (searchBtn && pop) searchBtn.addEventListener("click", function () {
    pop.hidden = !pop.hidden;
    if (!pop.hidden) { var i = $("input", pop); if (i) i.focus(); }
  });
  var popInput = pop ? $("input", pop) : null;
  if (popInput) popInput.addEventListener("input", function () {
    var out = $(".predictive-search", pop); if (!out) return;
    var q = popInput.value.trim();
    if (!q) { out.innerHTML = ""; return; }
    Promise.resolve(window.SKINAA_CART.searchFragment(q)).then(function (html) { out.innerHTML = html || ""; });
  });

  /* ---------- G-08 · computed archive strip --------------------------- */
  (function () {
    var host = $("#archive-strip"); if (!host) return;
    var male = MODELS.filter(function (m) { return m.gender === "M"; }).length;
    var female = MODELS.filter(function (m) { return m.gender === "F"; }).length;
    var concerns = {};
    MODELS.forEach(function (m) { m.tags.forEach(function (t) { concerns[t] = true; }); });
    var stats = [
      [MODELS.length, "Records in the archive"],
      [presented.length, "Presented in the gallery"],
      [male, "Male records"],
      [female, "Female records"],
      [Object.keys(concerns).length, "Documented concerns"]
    ];
    host.innerHTML = stats.map(function (s) {
      return '<div class="stat"><b>' + s[0] + '</b><span>' + s[1] + '</span></div>';
    }).join("");
  })();

  /* ---------- G02 · banner slider over exemplar photography ----------- */
  (function () {
    var wrap = $("#banner-slides"); if (!wrap) return;
    wrap.innerHTML = presented.map(function (m) {
      return '<div class="swiper-slide swiper-slide-center"><div class="slider-box">'
        + '<div class="icon-box"><img src="' + img(m.code, "day14.webp") + '" alt="Model ' + m.n + ' Day 14"></div>'
        + '<div class="content-box"><div class="content-block"><p class="content-block-content-1"><em>Model ' + String(m.n).padStart(2, "0") + ' · ' + m.code + '</em></p>'
        + '<h3>' + esc(m.arch) + '</h3><p>' + esc(m.gains) + '</p></div>'
        + '<div class="btn-block"><button type="button" class="slider-btn-block" data-banner-pick="' + m.code + '">Read the record</button></div>'
        + '</div></div></div>';
    }).join("");
    var idx = 0, label = $("#banner-label");
    function go(i) {
      idx = (i + presented.length) % presented.length;
      wrap.style.transform = "translateX(-" + idx * 100 + "%)";
      if (label) label.textContent = presented[idx].code + " — " + (idx + 1) + " of " + presented.length;
    }
    var prev = $("#banner-prev"), next = $("#banner-next");
    if (prev) prev.addEventListener("click", function () { go(idx - 1); });
    if (next) next.addEventListener("click", function () { go(idx + 1); });
    wrap.addEventListener("click", function (e) {
      var b = e.target.closest("[data-banner-pick]"); if (!b) return;
      selectExemplar(b.getAttribute("data-banner-pick"), true);
    });
    go(0);
  })();

  /* ---------- G07 · the wall (existing card renderer, chassis added) -- */
  var grid = document.getElementById("grid");
  function panel(src, label) {
    return '<figure><img src="' + src + '" alt="' + label + '" onerror="this.parentNode.innerHTML=\'<div class=&quot;panel-missing&quot;>' + label + '<br>panel in generation</div>\'"><figcaption>' + label + '</figcaption></figure>';
  }
  function baSlider(m) {
    return '<div class="ba-wrap"><div class="ba">'
      + '<img src="' + img(m.code, "day0.jpg") + '" alt="Model ' + m.n + ' Day 0">'
      + '<div class="after" style="clip-path:inset(0 0 0 50%)"><img src="' + img(m.code, "day14.webp") + '" alt="Model ' + m.n + ' Day 14" onerror="this.closest(\'.ba\').style.display=\'none\'"></div>'
      + '<span class="lab l">Day 0</span><span class="lab r">Day 14</span>'
      + '<input type="range" min="0" max="100" value="50" aria-label="Before after slider" oninput="this.previousElementSibling.previousElementSibling.previousElementSibling.style.clipPath=\'inset(0 0 0 \'+this.value+\'%)\'">'
      + '</div></div>';
  }
  function cardHTML(m) {
    return '<article class="card vcard reviews__grid-item review review--has-image"><div class="pad review__content">'
      + '<span class="review__quote" aria-hidden="true">&ldquo;</span>'
      + '<span class="tag">Model ' + String(m.n).padStart(2, "0") + ' · ' + m.code + '</span> <span class="tag">' + esc(m.arch) + '</span>'
      + '<div class="panels3" style="margin-top:16px">'
      + panel(img(m.code, "day0.jpg"), "Day 0 — Baseline")
      + panel(img(m.code, "condition.webp"), "Condition Panel")
      + panel(img(m.code, "day14.webp"), "Day 14 — Result")
      + '</div>'
      + baSlider(m)
      + '<div class="vrow"><span class="k">Day 0 — Flaws</span>' + esc(m.flaws) + '</div>'
      + '<div class="vrow"><span class="k g">Day 14 — Gains</span>' + esc(m.gains) + '</div>'
      + '<div class="vrow"><span class="k">Day 28 — Ascension Goal</span>' + esc(m.goal) + '</div>'
      + '<div class="vrow"><span class="k">Phase 1 — Attack Stack</span>' + esc(m.p1) + '</div>'
      + '<div class="vrow"><span class="k">Phase 2 — Weekly Refill</span>' + esc(m.p2) + '</div>'
      + '<div style="margin-top:18px"><a class="pill dark" href="assessment.html">Match my phenotype →</a></div>'
      + '</div></article>';
  }
  function render(f) {
    var list = presented.filter(function (m) {
      return f === "ALL" || (f === "M" || f === "F" ? m.gender === f : m.tags.indexOf(f) >= 0);
    });
    grid.innerHTML = list.map(cardHTML).join("");
  }
  var filters = document.getElementById("filters");
  if (filters) filters.addEventListener("click", function (e) {
    var b = e.target.closest("button"); if (!b) return;
    $$("#filters button").forEach(function (x) { x.classList.toggle("on", x === b); });
    render(b.dataset.f);
  });
  render("ALL");

  /* ---------- selected exemplar: picker, BL-08 split, S-06 gallery ---- */
  function pickerHTML(host) {
    host.innerHTML = presented.map(function (m) {
      return '<button type="button" data-pick="' + m.code + '"' + (m === selected ? ' class="on"' : "") + '>' + m.code + '</button>';
    }).join("");
  }
  $$(".exemplar-picker").forEach(function (host) {
    pickerHTML(host);
    host.addEventListener("click", function (e) {
      var b = e.target.closest("[data-pick]"); if (!b) return;
      selectExemplar(b.getAttribute("data-pick"), false);
    });
  });
  function selectExemplar(code, scroll) {
    var m = MODELS.filter(function (x) { return x.code === code; })[0];
    if (!m) return;
    selected = m;
    $$(".exemplar-picker button").forEach(function (b) { b.classList.toggle("on", b.getAttribute("data-pick") === code); });
    renderSplit(); renderGallery(); renderDeck();
    if (scroll) { var s = $("#split-section"); if (s) s.scrollIntoView({ behavior: "smooth" }); }
  }
  function renderSplit() {
    var host = $("#split-record"); if (!host) return;
    var m = selected;
    $("#split-img").setAttribute("src", img(m.code, "day14.webp"));
    $("#split-img").setAttribute("alt", "Model " + m.n + " Day 14");
    $("#split-sticker").textContent = m.code;
    host.innerHTML = '<span><h3>Model ' + String(m.n).padStart(2, "0") + ' · ' + m.code + ' — ' + esc(m.arch) + '</h3></span>'
      + '<div class="split-records">'
      + '<span class="k">Day 0 — Flaws</span><p>' + esc(m.flaws) + '</p>'
      + '<span class="k">Day 14 — Gains</span><p>' + esc(m.gains) + '</p>'
      + '<span class="k">Day 28 — Ascension Goal</span><p>' + esc(m.goal) + '</p>'
      + '</div>';
  }
  function renderGallery() {
    var host = $("#gallery-grid"); if (!host) return;
    var m = selected;
    var plates = [["day0.jpg", "Day 0 — Baseline"], ["condition.webp", "Condition Panel"], ["day14.webp", "Day 14 — Result"]];
    host.innerHTML = plates.map(function (p) {
      return '<button type="button" class="media-gallery__item" data-zoom="' + img(m.code, p[0]) + '" data-zoom-label="' + m.code + ' — ' + p[1] + '"><img src="' + img(m.code, p[0]) + '" alt="' + m.code + ' ' + p[1] + '"></button>';
    }).join("");
  }
  var dialog = $("#zoom-dialog");
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-zoom]"); if (!b || !dialog) return;
    $("#zoom-img").setAttribute("src", b.getAttribute("data-zoom"));
    $("#zoom-caption").textContent = b.getAttribute("data-zoom-label");
    dialog.showModal();
  });
  var zoomClose = $("#zoom-close");
  if (zoomClose && dialog) zoomClose.addEventListener("click", function () { dialog.close(); });

  /* ---------- S-04 · handled Day deck for the selected exemplar ------- */
  function renderDeck() {
    var host = $("#deck-container"); if (!host) return;
    var m = selected;
    var days = [["day0.jpg", "Day 0", m.flaws], ["condition.webp", "Day 14", m.gains], ["day14.webp", "Day 28", m.goal]];
    host.innerHTML = days.map(function (d, i) {
      return '<div class="layered-slideshow__panel" data-day="' + i + '" style="transform:translateX(' + i * 26 + 'px) translateY(' + i * 10 + 'px);z-index:' + (10 - i) + '">'
        + '<span class="layered-slideshow__tab">' + d[1] + '</span>'
        + '<img src="' + img(m.code, d[0]) + '" alt="' + m.code + ' ' + d[1] + '" draggable="false">'
        + '<h3>' + m.code + ' — ' + d[1] + '</h3><p>' + esc(d[2]) + '</p></div>';
    }).join("");
    wireDeck();
  }
  function wireDeck() {
    var host = $("#deck-container"); if (!host) return;
    $$(".layered-slideshow__panel", host).forEach(function (p) {
      var startX = null, dx = 0;
      p.addEventListener("pointerdown", function (e) { startX = e.clientX; p.setPointerCapture(e.pointerId); });
      p.addEventListener("pointermove", function (e) {
        if (startX === null) return;
        dx = e.clientX - startX;
        var day = +p.getAttribute("data-day");
        p.style.transform = "translateX(" + (day * 26 + dx) + "px) translateY(" + day * 10 + "px)";
      });
      p.addEventListener("pointerup", function () {
        if (startX === null) return;
        var day = +p.getAttribute("data-day");
        if (Math.abs(dx) > 60) {
          /* handled: send this panel to the back of the deck */
          $$(".layered-slideshow__panel", host).forEach(function (q) {
            var z = +q.style.zIndex; if (q !== p && z < +p.style.zIndex) q.style.zIndex = z + 1;
          });
          p.style.zIndex = 1;
          host.setAttribute("data-handled", p.getAttribute("data-day"));
        }
        p.style.transform = "translateX(" + day * 26 + "px) translateY(" + day * 10 + "px)";
        startX = null; dx = 0;
      });
    });
  }

  /* ---------- G-09 · named exemplar carousel --------------------------- */
  (function () {
    var wrap = $("#named-slides"); if (!wrap) return;
    wrap.innerHTML = presented.map(function (m) {
      return '<div class="swiper-slide"><div class="review-card">'
        + '<span class="tag">Model ' + String(m.n).padStart(2, "0") + ' · ' + m.code + '</span> <span class="tag">' + esc(m.arch) + '</span>'
        + '<div class="panels3" style="margin-top:14px">'
        + panel(img(m.code, "day0.jpg"), "Day 0 — Baseline")
        + panel(img(m.code, "condition.webp"), "Condition Panel")
        + panel(img(m.code, "day14.webp"), "Day 14 — Result")
        + '</div>'
        + '<div class="vrow"><span class="k">Day 0 — Flaws</span>' + esc(m.flaws) + '</div>'
        + '<div class="vrow"><span class="k g">Day 14 — Gains</span>' + esc(m.gains) + '</div>'
        + '<div style="margin-top:16px"><button type="button" class="see-more-reviews-arrow-btn" data-carousel-pick="' + m.code + '">Open the full record</button></div>'
        + '</div></div>';
    }).join("");
    var idx = 0, cur = $("#carousel-cur");
    function go(i) {
      idx = (i + presented.length) % presented.length;
      wrap.style.transform = "translateX(-" + idx * 100 + "%)";
      if (cur) cur.textContent = presented[idx].code + " — " + (idx + 1) + " of " + presented.length;
    }
    var prev = $("#carousel-prev"), next = $("#carousel-next");
    if (prev) prev.addEventListener("click", function () { go(idx - 1); });
    if (next) next.addEventListener("click", function () { go(idx + 1); });
    wrap.addEventListener("click", function (e) {
      var b = e.target.closest("[data-carousel-pick]"); if (!b) return;
      selectExemplar(b.getAttribute("data-carousel-pick"), true);
    });
    go(0);
  })();

  /* ---------- G05 · drawing timeline (Day 0 / 14 / 28) ----------------- */
  (function () {
    var box = $("#process-progress"); if (!box) return;
    var stages = [
      ["Day 0", "Baseline — the record opens: " + "flaws documented verbatim for every presented exemplar."],
      ["Day 14", "Transformation peak — gains documented verbatim against the Day 0 baseline."],
      ["Day 28", "Ascension maintenance — the goal each record is held to, verbatim."]
    ];
    box.innerHTML = '<div class="progress_line"><span class="default-line"></span><span class="draw-line" id="draw-line"></span></div>'
      + stages.map(function (s) {
        return '<div class="progressblock"><div class="process-content"><span class="progresstitle">' + s[0] + '</span><p>' + esc(s[1]) + '</p></div></div>';
      }).join("");
    var line = $("#draw-line", box), blocks = $$(".progressblock", box);
    function update() {
      var r = box.getBoundingClientRect();
      var total = r.height, seen = Math.min(Math.max(innerHeight - r.top, 0), total);
      if (line) line.style.height = (total ? (seen / total) * 100 : 0) + "%";
      blocks.forEach(function (b) {
        var br = b.getBoundingClientRect();
        b.classList.toggle("in-view", br.top < innerHeight * 0.75);
      });
      box.setAttribute("data-drawn", line ? Math.round(parseFloat(line.style.height) || 0) : 0);
    }
    addEventListener("scroll", update, { passive: true });
    addEventListener("resize", update);
    update();
  })();

  /* ---------- P-25 · native-scrollbar plate rail (all 28 records) ----- */
  (function () {
    var rail = $("#plate-rail"); if (!rail) return;
    rail.innerHTML = MODELS.map(function (m) {
      return '<div class="plate-rail-item"><img src="' + img(m.code, "day14.webp") + '" alt="' + m.code + ' Day 14" data-zoom="' + img(m.code, "day14.webp") + '" data-zoom-label="' + m.code + ' — Day 14 — Result"><span>' + m.code + '</span></div>';
    }).join("");
    var prev = $("#rail-prev"), next = $("#rail-next");
    function ends() {
      var atStart = rail.scrollLeft <= 4;
      var atEnd = rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 4;
      if (prev) prev.classList.toggle("is-hidden", atStart);
      if (next) next.classList.toggle("is-hidden", atEnd);
      rail.setAttribute("data-at-start", atStart); rail.setAttribute("data-at-end", atEnd);
    }
    function step(dir) {
      var w = rail.clientWidth;
      rail.scrollBy({ left: dir * w, behavior: "smooth" });
      setTimeout(ends, 450);
    }
    if (prev) prev.addEventListener("click", function () { step(-1); });
    if (next) next.addEventListener("click", function () { step(1); });
    rail.addEventListener("scroll", ends, { passive: true });
    ends();
  })();

  /* ---------- G25 · archive search over the static MODELS index ------- */
  (function () {
    var input = $("#archive-q"), out = $("#archive-results"), status = $("#archive-status");
    if (!input || !out) return;
    var popular = $("#archive-popular");
    if (popular) popular.innerHTML = ["debloat", "glass", "hairline", "hyperpigmentation"].map(function (t) {
      return '<button type="button" data-term="' + t + '">' + t + '</button>';
    }).join("") + presented.map(function (m) {
      return '<button type="button" data-term="' + m.code + '">' + m.code + '</button>';
    }).join("");
    if (popular) popular.addEventListener("click", function (e) {
      var b = e.target.closest("[data-term]"); if (!b) return;
      input.value = b.getAttribute("data-term"); run();
    });
    function run() {
      var q = input.value.trim().toLowerCase();
      if (!q) { out.innerHTML = ""; if (status) status.textContent = ""; return; }
      var hits = MODELS.filter(function (m) {
        return (m.code + " " + m.arch + " " + m.flaws + " " + m.gains + " " + m.goal + " " + m.tags.join(" ")).toLowerCase().indexOf(q) >= 0;
      });
      if (status) status.textContent = hits.length + (hits.length === 1 ? " record" : " records") + " in the archive";
      out.innerHTML = hits.map(function (m) {
        return '<button type="button" class="predictive-search__result" data-result-pick="' + m.code + '"><img src="' + img(m.code, "day14.webp") + '" alt=""><span><b>' + m.code + ' — ' + esc(m.arch) + '</b><br>' + esc(m.gains) + '</span></button>';
      }).join("");
    }
    input.addEventListener("input", run);
    out.addEventListener("click", function (e) {
      var b = e.target.closest("[data-result-pick]"); if (!b) return;
      var code = b.getAttribute("data-result-pick");
      if (PRESENTED.indexOf(code) >= 0) selectExemplar(code, true);
      else if (status) status.textContent = code + " is in the archive — not among the six presented exemplars.";
    });
  })();

  /* ---------- G30 · tabulated records with documented-delta tracks ----- */
  (function () {
    var host = $("#ctr-cards"), tabs = $("#ctr-tabs"); if (!host || !tabs) return;
    var sets = [
      ["Presented", presented],
      ["Debloat", MODELS.filter(function (m) { return m.tags.indexOf("debloat") >= 0; })],
      ["Glass Skin", MODELS.filter(function (m) { return m.tags.indexOf("glass") >= 0; })],
      ["Hyperpigmentation", MODELS.filter(function (m) { return m.tags.indexOf("hyperpigmentation") >= 0; })],
      ["Hairline", MODELS.filter(function (m) { return m.tags.indexOf("hairline") >= 0; })]
    ];
    function deltaOf(m) {
      var match = /(\d+)%/.exec(m.gains);
      return match ? +match[1] : null;
    }
    function card(m) {
      var d = deltaOf(m);
      var track = d === null ? "" :
        '<div style="margin-top:12px"><span class="ctr-reviews__track-label">Documented delta — gains</span>'
        + '<div class="ctr-reviews__track"><div class="ctr-reviews__track-fill" style="width:' + d + '%"></div></div>'
        + '<span class="ctr-reviews__track-label">' + d + '% — as written in the record</span></div>';
      return '<div class="ctr-reviews__card"><span class="ctr-reviews__card-code">' + m.code + ' · Model ' + String(m.n).padStart(2, "0") + '</span>'
        + '<p style="margin-top:6px"><b>' + esc(m.arch) + '</b></p>'
        + '<p style="margin-top:8px">' + esc(m.gains) + '</p>' + track + '</div>';
    }
    tabs.innerHTML = sets.map(function (s, i) {
      return '<button type="button" class="ctr-reviews__tab' + (i === 0 ? " is-active" : "") + '" data-set="' + i + '">' + s[0] + ' (' + s[1].length + ')</button>';
    }).join("");
    function show(i) {
      host.innerHTML = sets[i][1].map(card).join("");
      $$(".ctr-reviews__tab", tabs).forEach(function (t, j) { t.classList.toggle("is-active", j === i); });
      host.setAttribute("data-set", sets[i][0]);
    }
    tabs.addEventListener("click", function (e) {
      var b = e.target.closest("[data-set]"); if (!b) return;
      show(+b.getAttribute("data-set"));
    });
    show(0);
  })();

  renderSplit();
  renderGallery();
  renderDeck();
})();
