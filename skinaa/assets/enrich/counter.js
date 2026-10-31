/* COUNTER WIRING — Phase B unit 5 · The Prescription Counter (Story D).
   Every surface consumes the ONE cart state in cart-shim.js
   (window.SKINAA_CART / SKINAARoutes) — no second cart state exists here.
   A bundle dispenses the SimpleBundles way (P-02): its component pieces
   post through the shim; bundle sets + the dispensing total are DERIVED
   from the shim lines + documented BUNDLES prices (upfront), never stored.
   Donor JS that lives in unbanked monoliths (Bloom cart-next.js Alpine,
   Graymatter ctr Alpine family, Gundry Angular bundle, sckenofficial
   @theme chain) is re-driven here against the captured class/data-*
   contracts — named per row in build-counter.md. */
(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var CEILING = 3; /* G28: subscriptionQtyLimit's documented per-order limit
                      ("This item is limited to 3 per order." — donor JS) */
  var selectedId = "F-C"; /* the $118 entry stack — the meter's own anchor */
  var cycles = 3;         /* the prescribed default (the page's standing word) */

  function bundle(id) { return BUNDLES.filter(function (b) { return b.id === id; })[0]; }
  function qty(code) { return window.SKINAA_CART ? SKINAA_CART.quantityOf(code) : 0; }
  function setsOf(b) {
    return b.items.reduce(function (m, c) { return Math.min(m, qty(c)); }, Infinity) || 0;
  }
  function derivedTotal() {
    return BUNDLES.reduce(function (t, b) { return t + setsOf(b) * b.upfront; }, 0);
  }
  function money(n) { return "$" + n.toFixed(2); }

  /* ---------------- G-37 kinetic toast + F-23 flash-alert ---------------- */
  function toast(word, msg) {
    var stack = $(".toast-stack"); if (!stack) return;
    var t = document.createElement("div"); t.className = "toast";
    t.innerHTML = '<span class="toast-word"></span> ';
    t.querySelector(".toast-word").textContent = word;
    t.appendChild(document.createTextNode(msg));
    stack.appendChild(t); setTimeout(function () { t.remove(); }, 3200);
  }
  var flashTimer = null;
  function flash(html) {
    var f = $(".flash-alert"); if (!f) return;
    f.innerHTML = html; f.classList.add("show");
    clearTimeout(flashTimer); flashTimer = setTimeout(function () { f.classList.remove("show"); }, 3000);
  }
  window.SKINAA_COUNTER = { flash: flash, toast: toast };

  /* ---------------- chrome: F-20 states, P-13 drawer ---------------- */
  var header = $("#site-header");
  if (header) addEventListener("scroll", function () {
    header.classList.toggle("is-scrolled", scrollY > 24);
  }, { passive: true });
  var underlay = $(".drawer__underlay");
  function openDrawer(sel) {
    var d = $(sel); if (!d) return;
    d.classList.add("open"); d.classList.add("is-open"); d.setAttribute("aria-hidden", "false");
    if (underlay) underlay.classList.add("open"); document.body.classList.add("drawer-open");
  }
  function closeDrawers() {
    $$(".drawer.open, .cart-next.open, .store-availability-drawer.open").forEach(function (d) {
      d.classList.remove("open"); d.classList.remove("is-open"); d.setAttribute("aria-hidden", "true");
    });
    if (underlay) underlay.classList.remove("open"); document.body.classList.remove("drawer-open");
  }
  if (underlay) underlay.addEventListener("click", closeDrawers);
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeDrawers(); });
  $$("[data-cart-open]").forEach(function (b) { b.addEventListener("click", function () { renderSiteCart(); openDrawer(".cart-drawer"); }); });
  document.addEventListener("skinaa:open-cart", function () { renderSiteCart(); openDrawer(".cart-drawer"); });
  $$(".drawer__close").forEach(function (b) { b.addEventListener("click", closeDrawers); });
  $$("[data-tray-open]").forEach(function (b) { b.addEventListener("click", function () { renderTray(); openDrawer(".cart-next"); }); });
  var trayClose = $(".cart-next__close"); if (trayClose) trayClose.addEventListener("click", closeDrawers);
  $$("[data-availability-open]").forEach(function (b) { b.addEventListener("click", function () { renderAvailability(); openDrawer(".store-availability-drawer"); }); });
  var avClose = $(".store-availability-drawer__close"); if (avClose) avClose.addEventListener("click", closeDrawers);

  /* header search (P-06 contract, shared chrome) */
  var searchBtn = $(".header__icon-touch--search"), pop = $(".header-search-popdown");
  if (searchBtn && pop) {
    searchBtn.addEventListener("click", function () { pop.hidden = !pop.hidden; if (!pop.hidden) pop.querySelector("input").focus(); });
    var input = pop.querySelector("input"), status = pop.querySelector(".search-status"), out = pop.querySelector(".predictive-search");
    input.addEventListener("input", function () {
      var res = window.SKINAA_CART.searchResults(input.value);
      out.innerHTML = window.SKINAA_CART.searchFragment(input.value);
      if (status) status.textContent = input.value ? res.length + ' pieces for "' + input.value + '"' : "";
    });
  }

  /* ---------------- P-13 site cart drawer ---------------- */
  function renderSiteCart() {
    var host = $(".cart-drawer .cart-items"); if (!host || !window.SKINAA_CART) return;
    var cart = SKINAA_CART.json();
    if (!cart.items.length) { host.innerHTML = '<p class="cart-empty">The tray is empty — the Collection is open.</p>'; }
    else host.innerHTML = cart.items.map(function (l) {
      return '<div class="cart-line"><img src="' + (l.image || "") + '" alt=""><span>' + l.title + '</span>' +
        '<span class="quantity-input"><button type="button" class="quantity-input__button" data-cart-dec="' + l.key + '" aria-label="Less">−</button><b>' + l.quantity + '</b>' +
        '<button type="button" class="quantity-input__button" data-cart-inc="' + l.key + '" aria-label="More">+</button></span></div>';
    }).join("");
    var foot = $(".cart-drawer .cart-total");
    if (foot) foot.textContent = cart.item_count + " in the tray";
    bindQty(host, "data-cart-inc", "data-cart-dec", function () { renderSiteCart(); renderAll(); });
  }
  function bindQty(root, incAttr, decAttr, after) {
    $$("[" + incAttr + "]", root).forEach(function (b) { b.addEventListener("click", function () {
      var code = b.getAttribute(incAttr); SKINAA_CART.update(code, qty(code) + 1); after(); }); });
    $$("[" + decAttr + "]", root).forEach(function (b) { b.addEventListener("click", function () {
      var code = b.getAttribute(decAttr); SKINAA_CART.update(code, qty(code) - 1); after(); }); });
  }

  /* ---------------- G22 collection view over the bundle grid ---------------- */
  var gridFilter = "All", gridSort = "featured";
  function renderGrid() {
    var host = $("#bundles"); if (!host) return;
    var list = BUNDLES.filter(function (b) { return gridFilter === "All" || b.sex === gridFilter; });
    if (gridSort === "price-asc") list = list.slice().sort(function (a, b) { return a.upfront - b.upfront; });
    if (gridSort === "price-desc") list = list.slice().sort(function (a, b) { return b.upfront - a.upfront; });
    if (gridSort === "weekly-asc") list = list.slice().sort(function (a, b) { return a.weekly - b.weekly; });
    host.innerHTML = list.map(function (b) {
      var pics = b.items.map(function (c) { return skuByCode(c); }).filter(function (x) { return x && x.pic; });
      return '<article class="card"><div class="pad">'
        + '<span class="tag">' + b.sex + ' Protocol</span> <span class="tag red">' + b.flag + '</span>'
        + '<div class="sku-name" style="font-size:21px">' + b.name + '</div>'
        + (pics.length ? '<div class="stack-strip" style="grid-template-columns:repeat(' + pics.length + ',1fr)">' + pics.map(function (x) { return '<a href="product.html?sku=' + x.code + '"><img src="' + x.pic.pack + '" alt="' + x.code + ' — ' + x.name + '"></a>'; }).join("") + '</div>' : '')
        + '<ul class="stack-items">' + b.items.map(function (c) { var s = skuByCode(c); return '<li>→ <a href="product.html?sku=' + c + '">' + (s ? s.name : c) + '</a> <span class="note">(' + c + ')</span></li>'; }).join("") + '</ul>'
        + '<div class="price3"><span>Phase 1 upfront <b>$' + b.upfront + '.00</b></span><span>Ascension Plus <b>$' + b.weekly + ' / week</b></span></div>'
        + '<p class="note" style="margin-top:10px">Phase 2: ' + b.refill + '</p>'
        + '<div class="claimrow"><a class="pill dark" href="assessment.html">Get prescribed this stack</a> '
        + '<button class="pill dark" type="button" data-dispense="' + b.id + '">Dispense this stack</button></div>'
        + '</div></article>';
    }).join("");
    $$("[data-dispense]", host).forEach(function (btn) { btn.addEventListener("click", function () {
      selectBundle(btn.getAttribute("data-dispense"));
      var t = $("#dispense"); if (t) t.scrollIntoView({ behavior: "smooth", block: "start" });
    }); });
  }
  $$(".collection__nav [data-filter]").forEach(function (b) { b.addEventListener("click", function () {
    gridFilter = b.getAttribute("data-filter");
    $$(".collection__nav [data-filter]").forEach(function (x) { x.classList.toggle("current", x === b); });
    renderGrid();
  }); });
  var sortSel = $(".collection__nav [data-sort-select]");
  if (sortSel) sortSel.addEventListener("change", function () { gridSort = sortSel.value; renderGrid(); });

  /* ---------------- P-02 stacked bundle rows ---------------- */
  function renderStacked() {
    var host = $("#stacked-bundles"); if (!host) return;
    host.innerHTML = BUNDLES.map(function (b) {
      return '<div class="product__bundle product__bundle--stacked" data-bundle="' + b.id + '">'
        + '<div class="product-upsell__title">' + b.name + ' — paired dispensing</div>'
        + '<p class="product-upsell__subtitle note">The stack, dispensed in place: every piece posts to the tray as one bundle.</p>'
        + '<ul class="product-upsell__items">' + b.items.map(function (c) { var s = skuByCode(c); return '<li class="product-upsell__item">→ <a href="product.html?sku=' + c + '">' + (s ? s.name : c) + '</a> <span class="note">(' + c + ')</span></li>'; }).join("") + '</ul>'
        + '<div class="quick-add__holder product-bundle-atc"><button type="button" class="product-bundle-atc" data-bundle-add="' + b.id + '">Dispense the stack — $' + b.upfront + '.00 Phase 1</button></div>'
        + '</div>';
    }).join("");
    $$("[data-bundle-add]", host).forEach(function (btn) { btn.addEventListener("click", function () {
      var b = bundle(btn.getAttribute("data-bundle-add"));
      window.SKINAARoutes.fetch(window.Shopify.routes.cart_add_url, {
        method: "POST", body: JSON.stringify({ items: b.items.map(function (c) { return { id: c, quantity: 1 }; }) })
      }).then(function () {
        flash("<b>Dispensed.</b> " + b.name + " is in the tray.");
        toast("dispensed", " — " + b.id + " stack added to the tray");
        renderAll();
      });
    }); });
  }

  /* ---------------- dispensing: G10 tiers + G-05 ladder + G-30 + S-19 ---------------- */
  function selectBundle(id) { selectedId = id; renderAll(); }
  $$(".bundle-picker [data-bundle-pick]").forEach(function (b) { b.addEventListener("click", function () { selectBundle(b.getAttribute("data-bundle-pick")); }); });

  function setSets(b, n) { b.items.forEach(function (c) { SKINAA_CART.update(c, n); }); }

  $$("offer-selector-gmd .offer-selector__option").forEach(function (opt) {
    opt.addEventListener("click", function () { chooseRung(+opt.getAttribute("data-quantity")); });
  });
  function chooseRung(q) {
    cycles = q;
    var b = bundle(selectedId);
    if (setsOf(b) > 0) { setSets(b, q); flash("<b>Cycle set.</b> The tray line now runs " + q + (q === 1 ? " cycle." : " cycles.")); }
    renderAll();
  }
  var dispenseBtn = $("[data-dispense-selected]");
  if (dispenseBtn) dispenseBtn.addEventListener("click", function () {
    var b = bundle(selectedId); setSets(b, cycles);
    flash("<b>Dispensed.</b> " + b.name + " — " + cycles + (cycles === 1 ? " cycle" : " cycles") + " in the tray.");
    toast("dispensed", " — " + b.id + " × " + cycles);
    renderAll(); renderTray(); openDrawer(".cart-next");
  });

  /* S-19 · price-per-item (sckenofficial contract re-driven: the banked file
     imports the unbanked @theme chain). Breaks carry documented BUNDLES
     money: price = upfront × quantity of stacks; text renders in the
     donor's `${atText} <bdi>${price}</bdi>/${eachText}` shape and refreshes
     on quantitySelectorUpdate + cartLinesUpdate, as captured. */
  var ppi = $("price-per-item"), ppiQty = 1;
  function renderPPI() {
    if (!ppi) return;
    var b = bundle(selectedId);
    var breaks = [1, 2, 3].map(function (q) { return { quantity: q, price: money(b.upfront * q) }; });
    ppi.setAttribute("data-price-breaks", JSON.stringify(breaks));
    ppi.setAttribute("data-variant-price", money(b.upfront));
    ppi.setAttribute("data-min-quantity", "1");
    var br = breaks.filter(function (x) { return ppiQty >= x.quantity; }).pop() || breaks[0];
    var txt = ppi.querySelector("[data-ref='pricePerItemText']") || ppi;
    txt.innerHTML = ppi.getAttribute("data-at-text") + " <bdi>" + br.price + "</bdi>/" + ppi.getAttribute("data-each-text");
    var qEl = $("[data-ppi-qty]"); if (qEl) qEl.textContent = String(ppiQty);
    var plus = $("[data-ppi-plus]"); if (plus) plus.disabled = ppiQty >= CEILING;
    var msg = $(".qty-limit-msg"); if (msg) msg.hidden = ppiQty < CEILING;
  }
  var ppiPlus = $("[data-ppi-plus]"), ppiMinus = $("[data-ppi-minus]");
  if (ppiPlus) ppiPlus.addEventListener("click", function () { if (ppiQty < CEILING) { ppiQty++; document.dispatchEvent(new CustomEvent("quantitySelectorUpdate")); renderPPI(); } });
  if (ppiMinus) ppiMinus.addEventListener("click", function () { if (ppiQty > 1) { ppiQty--; document.dispatchEvent(new CustomEvent("quantitySelectorUpdate")); renderPPI(); } });
  document.addEventListener("cartLinesUpdate", function () { renderPPI(); });
  var pieceAdd = $("[data-piece-add]");
  if (pieceAdd) pieceAdd.addEventListener("click", function () {
    var sel = $("[data-piece-select]"); if (!sel) return;
    var code = sel.value;
    for (var i = 0; i < ppiQty; i++) SKINAA_CART.add(code, 1);
    document.dispatchEvent(new CustomEvent("cartLinesUpdate", { detail: { promise: Promise.resolve() } }));
    flash("<b>Dispensed.</b> " + code + " added to the tray.");
    renderAll();
  });

  function renderDispense() {
    var b = bundle(selectedId); if (!b) return;
    $$(".bundle-picker [data-bundle-pick]").forEach(function (x) { x.classList.toggle("current", x.getAttribute("data-bundle-pick") === selectedId); });
    var nameEl = $("[data-selected-bundle-name]"); if (nameEl) nameEl.textContent = b.name;
    /* G-05 rungs: data-* contract re-driven on BUNDLES cycle data */
    $$("offer-selector-gmd .offer-selector__option").forEach(function (opt) {
      var q = +opt.getAttribute("data-quantity");
      opt.setAttribute("data-price", (b.upfront * q).toFixed(2));
      opt.setAttribute("data-variant-id", b.id);
      opt.setAttribute("data-selected", q === cycles ? "true" : "false");
      var radio = opt.querySelector("input[type='radio']"); if (radio) radio.checked = q === cycles;
      var price = opt.querySelector(".offer-selector__price"); if (price) price.textContent = money(b.upfront * q);
    });
    var lp = $(".ladder-price");
    if (lp) lp.innerHTML = "Selected: <b>" + cycles + (cycles === 1 ? " cycle" : " cycles") + " — " + money(b.upfront * cycles) + "</b> · Ascension Plus " + money(b.weekly) + " / week on the standing cycle";
    /* G10 tiers bar: fill + markers follow the selected cycle tier */
    var fill = $(".ctr-tiers-bar__track-fill"); if (fill) fill.style.width = (cycles / 6 * 100) + "%";
    $$(".ctr-tiers-bar__track-marker").forEach(function (m) { m.classList.toggle("is-active", +m.getAttribute("data-tier") <= cycles); });
    var tm = $(".ctr-tiers-bar__message");
    if (tm) tm.textContent = cycles === 3 ? "3 cycles — the prescribed default tier" : cycles + (cycles === 1 ? " cycle tier selected" : " cycle tier selected");
    /* G-30 progress: distinct pieces of the selected stack in the tray */
    var inTray = b.items.filter(function (c) { return qty(c) > 0; }).length;
    var pf = $(".bundle-progress-bar__fill"); if (pf) pf.style.width = (inTray / b.items.length * 100) + "%";
    var pt = $(".bundle-progress-bar__text"); if (pt) pt.textContent = inTray + " of " + b.items.length + " pieces of " + b.id + " in the tray";
    /* S-19 piece options follow the selected stack */
    var sel = $("[data-piece-select]");
    if (sel) sel.innerHTML = b.items.map(function (c) { var s = skuByCode(c); return '<option value="' + c + '">' + c + " — " + (s ? s.name : c) + "</option>"; }).join("");
    renderPPI();
  }

  /* ---------------- BL-28 tray: BL-17 ladder, G11, G28, P-07, BL-04 ---------------- */
  function renderTray() {
    var tray = $(".cart-next"); if (!tray || !window.SKINAA_CART) return;
    var cart = SKINAA_CART.json(), total = derivedTotal(), threshold = SKINAA_CONFIG.freeShipEntry;
    /* P-07 meter */
    var fs = $("[data-free-shipping]", tray);
    if (fs) {
      var pct = Math.min(100, total / threshold * 100);
      fs.classList.toggle("is-success", total >= threshold);
      var bar = $("[data-progress-bar]", fs); if (bar) bar.style.width = pct + "%";
      var ring = $("[data-progress-graph] .free-shipping__graph-progress", fs);
      if (ring) ring.style.strokeDashoffset = String(100 - pct);
      var def = $(".free-shipping__default-message", fs);
      if (def) def.textContent = "You are " + money(Math.max(0, threshold - total)) + " away from free shipping";
      var suc = $(".free-shipping__success-message", fs);
      if (suc) suc.textContent = "Free shipping — the tray is at the Phase 1 entry (" + money(threshold) + ").";
    }
    /* lines */
    var lines = $(".cart-next__lines", tray);
    if (lines) {
      lines.innerHTML = cart.items.length ? cart.items.map(function (l) {
        var atCeil = l.quantity >= CEILING;
        return '<div class="cart-next__line"><img src="' + (l.image || "") + '" alt=""><span>' + l.title + '</span>' +
          '<span class="cart-next__qty"><button type="button" data-tray-dec="' + l.key + '" aria-label="Less">−</button><b>' + l.quantity + '</b>' +
          '<button type="button" data-tray-inc="' + l.key + '" aria-label="More"' + (atCeil ? " disabled" : "") + '>+</button></span></div>' +
          (atCeil ? '<p class="qty-limit-msg">This item is limited to 3 per order.</p>' : "");
      }).join("") : '<p class="cart-empty">The tray is empty — dispense a stack and its pieces land here.</p>';
      bindQty(lines, "data-tray-inc", "data-tray-dec", function () { renderAll(); });
      $$("[data-tray-inc]", lines).forEach(function (btn) { /* G28 ceiling guard (bindQty steps first; clamp here) */
        btn.addEventListener("click", function () { var code = btn.getAttribute("data-tray-inc"); if (qty(code) > CEILING) SKINAA_CART.update(code, CEILING); renderAll(); });
      });
    }
    /* BL-17 in-tray ladder: state follows the selected stack's cycle count */
    var sets = setsOf(bundle(selectedId));
    $$(".cart-next__ladder-rung").forEach(function (r) {
      r.classList.toggle("is-active", +r.getAttribute("data-rung") === (sets > 0 ? sets : cycles));
      r.onclick = function () { chooseRung(+r.getAttribute("data-rung")); renderTray(); };
    });
    var ladNote = $(".cart-next__ladder-note", tray);
    if (ladNote) ladNote.textContent = sets > 0 ? "In the tray: " + sets + (sets === 1 ? " cycle" : " cycles") + " of " + selectedId + " — tierSave calibrates at claim (dormant)." : "No cycle of " + selectedId + " in the tray yet — the ladder arms when it dispenses.";
    /* G11 upgrade row: swaps the tray line to the next cycle */
    var up = $(".ctr-cart-upgrade", tray);
    if (up) {
      var b = bundle(selectedId), cur = setsOf(b);
      var next = cur === 1 ? 3 : cur === 3 ? 6 : null;
      up.hidden = !(cur > 0 && next);
      if (next) {
        var cmp = $(".ctr-cart-upgrade__pricing-compare", up);
        if (cmp) cmp.textContent = "Now: " + cur + (cur === 1 ? " cycle" : " cycles") + " — " + money(b.upfront * cur) + " · Next: " + next + " cycles — " + money(b.upfront * next);
        var btn = $("[data-upgrade]", up);
        if (btn) btn.onclick = function () { cycles = next; setSets(b, next); flash("<b>Upgraded.</b> The tray line now runs " + next + " cycles."); renderAll(); };
      }
    }
    /* G11 sample line: appears on qualifying trays (tray at the entry) */
    var sample = $(".cart-next__samples", tray);
    if (sample) {
      var show = total >= threshold;
      sample.hidden = !show;
      if (show) {
        var s = skuByCode("FAB-13");
        sample.innerHTML = '<div class="sample-line"><img src="' + (s && s.pic ? s.pic.pack : "") + '" alt="" width="40" height="40" style="border-radius:8px;object-fit:cover"><span><b>Included with this dispensing:</b> ' + (s ? s.code + " — " + s.name : "") + ' (house sample line)</span></div>';
      }
    }
    /* recommendations zone: the other stacks, from BUNDLES */
    var recs = $(".cart-next__recs", tray);
    if (recs) recs.innerHTML = "<b>Also prescribed:</b> " + BUNDLES.filter(function (b) { return setsOf(b) === 0; }).slice(0, 2).map(function (b) { return b.id + " — " + b.name; }).join(" · ");
    /* BL-04 ready band */
    var ready = $(".cart-is-ready", tray);
    if (ready) {
      var readyNow = total >= threshold;
      ready.classList.toggle("show", readyNow);
      if (readyNow) {
        var grid = $(".cart-is-ready__grid", ready);
        if (grid) grid.innerHTML = BUNDLES.filter(function (b) { return setsOf(b) > 0; }).map(function (b) {
          var first = skuByCode(b.items[0]);
          return '<div class="cart-is-ready__card"><span class="cart-is-ready__img-wrap"><img src="' + (first && first.pic ? first.pic.pack : "") + '" alt=""></span><span class="cart-is-ready__title">' + b.name + '</span><span class="cart-is-ready__variant">' + setsOf(b) + (setsOf(b) === 1 ? " cycle" : " cycles") + " · " + money(b.upfront * setsOf(b)) + "</span></div>";
        }).join("");
      }
    }
    var foot = $(".cart-next__foot", tray);
    if (foot) foot.innerHTML = "Dispensing total: <b>" + money(total) + "</b> · " + cart.item_count + " pieces in the tray";
  }

  /* ---------------- F-15 availability drawer (house data slot) ---------------- */
  window.SKINAA_HOUSE_SERVICE = window.SKINAA_HOUSE_SERVICE || { locations: [] }; /* the house data slot: the document carries no locations */
  function renderAvailability() {
    var host = $(".store-availability-drawer__body"); if (!host) return;
    var locs = (window.SKINAA_HOUSE_SERVICE && window.SKINAA_HOUSE_SERVICE.locations) || [];
    host.innerHTML = locs.length ? locs.map(function (l) { return '<div class="store-availability-row">' + l + "</div>"; }).join("")
      : '<div class="store-availability-row" data-slot="house-locations"><b>House collection points — named slot.</b><br>The master document carries no locations, so no addresses are shown. When the house sets its collection points, they render here from the house data slot.</div>';
  }

  function renderAll() { renderGrid(); renderDispense(); renderTray(); renderSiteCart(); }
  document.addEventListener("skinaa:cart-changed", function () { renderDispense(); renderTray(); document.dispatchEvent(new CustomEvent("cartLinesUpdate", { detail: { promise: Promise.resolve() } })); });

  renderStacked();
  renderAll();
})();
