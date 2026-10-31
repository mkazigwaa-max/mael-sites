/* READING WIRING — Phase B unit 7 (the Reading Rooms).
   Chrome copied from the landed Vault build (F-20 scroll state, P-13 drawer
   via cart-shim, G-37 toast). Room systems: G-15 TOC active marking, P-19
   tag-chip filter, F-06 slider (the fetched FAB scroll-slider.js is an ES
   module riding unbanked imports — its selector contract is re-driven
   here, named in build-reading.md), G20 counters, P-30/S-12 expanders,
   S-11 escape-close (scken pattern; the banked auto-close-details.js IIFE
   ships alongside bodily), S-22 rte table contract, BL-30 library search
   over the page's own bound entries. */
(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };

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
  renderCart();

  /* ---------- G-15 TOC rail: active chapter marking -------------------- */
  var tocLinks = $$(".toc-item a");
  var sections = tocLinks.map(function (a) { return $(a.getAttribute("href")); }).filter(Boolean);
  if ("IntersectionObserver" in window && sections.length) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) tocLinks.forEach(function (a) {
          a.parentElement.classList.toggle("is-active", a.getAttribute("href") === "#" + e.target.id);
        });
      });
    }, { rootMargin: "-30% 0px -55% 0px" });
    sections.forEach(function (s) { io.observe(s); });
  }

  /* ---------- P-19 tag chips + S-12 show-more: ONE visibility state ----
     Fix pass (Unit 11): the two systems used to write competing state —
     the chip handler set inline display, the expander's is-collapsed
     class rule outvoted it, and filtered tail entries stayed invisible.
     Now both handlers write one state pair (activeTag, expanded) and a
     single render pass applies it, so computed visibility always equals
     the filter's verdict: an entry shows iff it matches the active tag
     AND (the expander is open OR it is not a collapsed tail entry).
     Selecting a chip opens the expander (the entries a tag selects live
     in the tail); the S-12 button then folds the tail back, exactly its
     captured behaviour. The render keeps class and inline style in
     agreement — is-collapsed mirrors the expander state on tail items
     only, and the inline display carries the combined verdict — so
     neither mechanism can outvote the other in any click order. */
  var chips = $$(".tag-chip"), entries = $$(".ingredient-log .article");
  var activeTag = "all", expanded = false;
  var tailEntries = entries.filter(function (en) { return en.classList.contains("is-collapsed"); });
  function renderEntries() {
    entries.forEach(function (en) {
      var match = activeTag === "all" || (en.getAttribute("data-tags") || "").indexOf(activeTag) > -1;
      var isTail = tailEntries.indexOf(en) > -1;
      en.classList.toggle("is-collapsed", isTail && !expanded);
      en.style.display = (match && (expanded || !isTail)) ? "" : "none";
    });
    $$("[data-show-more]").forEach(function (btn) {
      btn.textContent = expanded ? "Show fewer entries" : "Show more entries";
      btn.setAttribute("data-open", expanded ? "true" : "false");
    });
  }
  chips.forEach(function (chip) {
    chip.addEventListener("click", function () {
      chips.forEach(function (c) { c.classList.toggle("is-active", c === chip); });
      activeTag = chip.getAttribute("data-filter");
      expanded = true;
      renderEntries();
      var log = $("#ingredient-log"); if (log) log.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
  $$("[data-show-more]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      expanded = !expanded;
      renderEntries();
    });
  });

  /* ---------- F-06 scroll slider (contract re-drive) ------------------- */
  $$("scroll-slider-component").forEach(function (comp) {
    var slider = $(".scroll-slider__slider", comp); if (!slider) return;
    var slides = slider.children, cur = $(".scroll-slider__counter--current", comp),
        tot = $(".scroll-slider__counter--total", comp), dots = $$("[data-scroll-slider-page-dot]", comp);
    if (tot) tot.textContent = slides.length;
    function mark() {
      var i = Math.round(slider.scrollLeft / (slides[0].offsetWidth + 14));
      i = Math.max(0, Math.min(slides.length - 1, i));
      if (cur) cur.textContent = i + 1;
      dots.forEach(function (d, j) { d.classList.toggle("is-selected", j === i); });
      comp.setAttribute("data-current", i + 1);
    }
    var prev = $("[data-scroll-slider-prev-button]", comp), next = $("[data-scroll-slider-next-button]", comp);
    if (prev) prev.addEventListener("click", function () { slider.scrollBy({ left: -(slides[0].offsetWidth + 14), behavior: "smooth" }); });
    if (next) next.addEventListener("click", function () { slider.scrollBy({ left: slides[0].offsetWidth + 14, behavior: "smooth" }); });
    slider.addEventListener("scroll", mark, { passive: true }); mark();
  });

  /* ---------- G20 counters: animate to documented values --------------- */
  var counters = $$(".stat-counter__value[data-count]");
  if ("IntersectionObserver" in window && counters.length) {
    var cio = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return; cio.unobserve(e.target);
        var end = parseFloat(e.target.getAttribute("data-count")), t0 = null;
        function step(ts) {
          if (!t0) t0 = ts; var p = Math.min(1, (ts - t0) / 900);
          e.target.textContent = Math.round(end * p);
          if (p < 1) requestAnimationFrame(step); else e.target.setAttribute("data-done", end);
        }
        requestAnimationFrame(step);
      });
    }, { threshold: .4 });
    counters.forEach(function (c) { cio.observe(c); });
  }

  /* ---------- P-30 toggle-ellipsis + S-12 show-more -------------------- */
  $$("toggle-ellipsis").forEach(function (el) {
    var btn = document.createElement("button");
    btn.type = "button"; btn.className = "toggle-ellipsis__btn"; btn.textContent = "Read the full configuration";
    btn.setAttribute("aria-expanded", "false");
    btn.addEventListener("click", function () {
      var open = el.classList.toggle("expanded");
      btn.setAttribute("aria-expanded", open); btn.textContent = open ? "Fold the configuration" : "Read the full configuration";
    });
    el.after(btn);
  });
  /* S-12 show-more: handler lives with the P-19 chips above — both write
     the one shared visibility state (Unit 11 fix); see renderEntries(). */

  /* ---------- S-11 escape-close (pairs with S-25 auto-close file) ------ */
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    $$("details[data-close-with-escape][open]").forEach(function (d) { d.open = false; });
    closeCart(); closeSearch();
  });

  /* ---------- S-22 rte table contract (formatter re-drive) ------------- */
  $$(".rte").forEach(function (rte) {
    $$("table", rte).forEach(function (table) {
      if (table.parentElement.classList.contains("rte-table-wrapper")) return;
      var w = document.createElement("div"); w.className = "rte-table-wrapper";
      table.parentNode.insertBefore(w, table); w.appendChild(table);
    });
  });

  /* ---------- BL-30 library search -------------------------------------- */
  var overlay = $(".b__search");
  var index = [];
  $$(".ingredient-log .article").forEach(function (a) {
    index.push({ title: $(".article__title", a).textContent, meta: $(".article__meta", a).textContent, href: "#ingredient-log", id: a.id });
  });
  $$(".reading-main section.blk[id]").forEach(function (s) {
    var h = $("h2", s); if (h) index.push({ title: h.textContent, meta: "Chapter", href: "#" + s.id });
  });
  function closeSearch() { if (overlay) overlay.hidden = true; }
  function openSearch() {
    if (!overlay) return; overlay.hidden = false;
    var inp = $("input", overlay); if (inp) { inp.value = ""; inp.focus(); }
    renderResults("");
  }
  function renderResults(q) {
    var host = $(".b__search__results", overlay), status = $(".b__search__status", overlay);
    if (!host) return;
    q = q.trim().toLowerCase();
    var hits = index.filter(function (it) { return !q || (it.title + " " + it.meta).toLowerCase().indexOf(q) > -1; });
    host.innerHTML = hits.map(function (it) {
      return '<a class="b__search__panel__results__item" href="' + esc(it.href) + '" data-target="' + esc(it.id || it.href.slice(1)) + '"><span class="b__search__panel__results__item__title">' + esc(it.title) + "</span> — " + esc(it.meta) + "</a>";
    }).join("") || '<p class="b__search__status">No bound entry matches.</p>';
    if (status) status.textContent = hits.length + " of " + index.length + " bound entries";
    $$(".b__search__panel__results__item", host).forEach(function (a) {
      a.addEventListener("click", function () { closeSearch(); });
    });
  }
  $$("[data-library-search]").forEach(function (b) { b.addEventListener("click", openSearch); });
  if (overlay) {
    var inp = $("input", overlay);
    if (inp) inp.addEventListener("input", function () { renderResults(inp.value); });
    var bd = $(".b__search__backdrop", overlay); if (bd) bd.addEventListener("click", closeSearch);
    var cl = $(".b__search__panel__close", overlay); if (cl) cl.addEventListener("click", closeSearch);
  }
})();
