/* D1 · THE CART-ROUTES SHIM — SKINAA enrichment Phase B, Collection unit.
   A client-side layer answering in the captured Shopify shapes against
   SKINAA's OWN cart state. It ADAPTS the site's existing cart logic (the
   catalog's BAG object, vibe build) — it does not fork a second state:
   the single state lives here, persists to localStorage, and every
   surface (cards, steppers, drawer, sticky add, modals) reads/writes it
   through this shim only.

   Captured shapes it answers (Prequel theme.js routes contract):
     window.Shopify.routes = { root, cart_add_url, cart_update_url,
                               cart_change_url, predictive_search_url }
     POST cart_add_url    {items:[{id,quantity}]}   -> cart JSON
     POST cart_update_url {updates:{key:qty}}       -> cart JSON
     GET  predictive_search_url?q=..&resources[type]=product
          &section_id=predictive-search             -> section fragment HTML
     GET  products/<handle>.js-shape feed           -> product JSON shape
   As a static site there is no server; the shim answers these shapes
   in-page (SKINAARoutes.fetch) and keeps the URL strings so donor code
   contracts resolve against them verbatim.

   PRICE LAW: SKUS carry no price in skinaa-data.js today (member pricing
   is a dormant owner input). The shim never invents one: price fields
   answer null and totals answer null until the data layer carries a
   number. Counts and quantities are always real. */
(function () {
  "use strict";
  var LS_KEY = "skinaa-cart-v1";
  var state = { items: [] }; /* [{code, quantity}] — the ONE cart state */
  try {
    var saved = JSON.parse(localStorage.getItem(LS_KEY) || "null");
    if (saved && Array.isArray(saved.items)) state = saved;
  } catch (e) { /* fresh state */ }

  function sku(code) {
    return (typeof skuByCode === "function") ? skuByCode(code) : null;
  }
  function persist() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch (e) {}
    document.dispatchEvent(new CustomEvent("skinaa:cart-changed", { detail: cartJSON() }));
    syncCounts();
  }
  function syncCounts() {
    var n = state.items.reduce(function (a, i) { return a + i.quantity; }, 0);
    document.querySelectorAll(".cart-count, .header__cart-link-count").forEach(function (el) {
      el.textContent = String(n);
    });
  }
  function lineFor(item) {
    var s = sku(item.code);
    if (!s) return null;
    var price = (typeof s.price === "number") ? Math.round(s.price * 100) : null;
    return {
      id: item.code, key: item.code, title: s.code + " — " + s.name,
      quantity: item.quantity, price: price,
      final_price: (price === null ? null : price * item.quantity),
      image: s.pic ? s.pic.pack : null, url: "product.html?sku=" + item.code,
      properties: {}, variant_title: s.component || null
    };
  }
  function cartJSON() {
    var lines = state.items.map(lineFor).filter(Boolean);
    var priced = lines.every(function (l) { return l.price !== null; });
    return {
      items: lines,
      item_count: lines.reduce(function (a, l) { return a + l.quantity; }, 0),
      items_subtotal_price: priced ? lines.reduce(function (a, l) { return a + l.final_price; }, 0) : null,
      total_price: priced ? lines.reduce(function (a, l) { return a + l.final_price; }, 0) : null,
      currency: "USD", requires_shipping: true
    };
  }
  function add(code, qty) {
    qty = qty || 1;
    var found = state.items.find(function (i) { return i.code === code; });
    if (found) found.quantity += qty; else state.items.push({ code: code, quantity: qty });
    persist();
    return cartJSON();
  }
  function update(code, qty) {
    if (qty <= 0) state.items = state.items.filter(function (i) { return i.code !== code; });
    else {
      var found = state.items.find(function (i) { return i.code === code; });
      if (found) found.quantity = qty; else state.items.push({ code: code, quantity: qty });
    }
    persist();
    return cartJSON();
  }
  function quantityOf(code) {
    var found = state.items.find(function (i) { return i.code === code; });
    return found ? found.quantity : 0;
  }
  /* predictive search — the captured fragment shape: result rows as
     sckenofficial predictive-search-results__card (S-26 skin) inside the
     predictive-search section the P-06/F-13 surfaces mount. */
  function searchResults(q) {
    q = (q || "").trim().toLowerCase();
    if (!q || typeof SKUS === "undefined") return [];
    return SKUS.filter(function (s) {
      return (s.code + " " + s.name + " " + s.detail + " " + s.concerns).toLowerCase().indexOf(q) >= 0;
    }).slice(0, 8);
  }
  function searchFragment(q) {
    var rows = searchResults(q).map(function (s) {
      return '<a class="predictive-search-results__card" href="product.html?sku=' + s.code + '">'
        + '<img src="' + (s.pic ? s.pic.pack : "") + '" alt="">'
        + '<span class="predictive-search-results__card-title">' + s.code + " — " + s.name + "</span></a>";
    }).join("");
    return '<div class="predictive-search-results">' + (rows ||
      '<p class="predictive-search-results__empty">No pieces match that reading.</p>') + "</div>";
  }
  function productFeed(code) { /* products/<handle>.js shape */
    var s = sku(code);
    if (!s) return null;
    return {
      id: s.code, title: s.name, handle: s.code.toLowerCase(),
      description: s.detail, vendor: "SKINAA",
      price: (typeof s.price === "number") ? Math.round(s.price * 100) : null,
      images: s.pic ? [s.pic.pack, s.pic.portrait] : [],
      variants: [{ id: s.code, title: s.component || "Default", available: true,
                   price: (typeof s.price === "number") ? Math.round(s.price * 100) : null }]
    };
  }
  /* fetch-shaped adapter: donor contracts call these URLs; the shim
     answers them in-page in exactly the captured response shapes. */
  function fetchShim(url, opts) {
    opts = opts || {};
    var body = {};
    try { body = JSON.parse(opts.body || "{}"); } catch (e) {}
    if (url.indexOf("/cart/add") >= 0) {
      (body.items || []).forEach(function (i) { add(i.id, i.quantity || 1); });
      return Promise.resolve(cartJSON());
    }
    if (url.indexOf("/cart/update") >= 0 || url.indexOf("/cart/change") >= 0) {
      Object.keys(body.updates || {}).forEach(function (k) { update(k, body.updates[k]); });
      if (body.id) update(body.id, body.quantity || 0);
      return Promise.resolve(cartJSON());
    }
    if (url.indexOf("/search/suggest") >= 0) {
      var q = new URLSearchParams(url.split("?")[1] || "").get("q") || "";
      return Promise.resolve({ resources: { results: { products: searchResults(q).map(function (s) {
        return { id: s.code, title: s.name, url: "product.html?sku=" + s.code,
                 image: s.pic ? s.pic.pack : null }; }) } },
        fragment: searchFragment(q) });
    }
    var m = url.match(/products\/([a-z0-9-]+)\.js/);
    if (m) return Promise.resolve(productFeed(m[1].toUpperCase()));
    return Promise.resolve(null);
  }

  window.Shopify = window.Shopify || {};
  window.Shopify.routes = {
    root: "/",
    cart_add_url: "/cart/add.js",
    cart_update_url: "/cart/update.js",
    cart_change_url: "/cart/change.js",
    predictive_search_url: "/search/suggest.json"
  };
  window.SKINAARoutes = { fetch: fetchShim };
  window.SKINAA_CART = {
    add: add, update: update, quantityOf: quantityOf, json: cartJSON,
    searchResults: searchResults, searchFragment: searchFragment, productFeed: productFeed
  };
  /* S-24 · standard-actions cart bridge: any element carrying the
     standard add action targets P-13's drawer instead of navigating. */
  document.addEventListener("click", function (e) {
    var t = e.target.closest("[data-standard-add]");
    if (!t) return;
    e.preventDefault();
    add(t.getAttribute("data-standard-add"), 1);
    document.dispatchEvent(new CustomEvent("skinaa:open-cart"));
  });
  /* S-18 · RecentlyViewed utility (sckenofficial, re-driven: the banked
     file imports the unbanked @theme chain — see build report).
     Max 4, newest first; clearProducts() empties it. */
  var RV_KEY = "skinaa-recently-viewed";
  window.RecentlyViewed = {
    get: function () { try { return JSON.parse(localStorage.getItem(RV_KEY) || "[]"); } catch (e) { return []; } },
    addProduct: function (code) {
      var list = this.get().filter(function (c) { return c !== code; });
      list.unshift(code);
      try { localStorage.setItem(RV_KEY, JSON.stringify(list.slice(0, 4))); } catch (e) {}
      document.dispatchEvent(new CustomEvent("skinaa:recently-viewed"));
    },
    clearProducts: function () { try { localStorage.removeItem(RV_KEY); } catch (e) {} }
  };
  document.addEventListener("DOMContentLoaded", syncCounts);
})();
