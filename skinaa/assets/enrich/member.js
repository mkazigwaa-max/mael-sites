/* PHASE B UNIT 4 — THE MEMBER'S ROOM wiring layer.
   Donor JS for these rows lives inside unbanked monoliths/bundles (Prequel
   theme.js popup/tooltip components, FAB theme.min.js meganav/mobile-menu,
   Graymatter Alpine ctr-cart store, Gundry Angular chunks, Bloom Alpine) —
   each function below is a RE-DRIVE against the captured class contract in
   member-extracts.css, named per row. House slots: auth/billing actions post
   to window.SKINAASlots (endpoint slots, no donor backend, no fake success —
   the slot records the request device-locally and says exactly that). */
(function () {
  "use strict";
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---- house endpoint slots (G-23 / G-39) ---- */
  window.SKINAASlots = window.SKINAASlots || {
    post: function (kind, payload) {
      try {
        var log = JSON.parse(localStorage.getItem("skinaa-slots") || "[]");
        log.push({ kind: kind, payload: payload, at: new Date().toISOString() });
        localStorage.setItem("skinaa-slots", JSON.stringify(log));
      } catch (e) {}
      return Promise.resolve({ slotted: true, kind: kind });
    }
  };

  /* ---- G-37 kinetic signals (copied contract from the landed rooms) ---- */
  window.SKINAAState = {
    toast: function (word, msg) {
      var stack = $(".toast-stack"); if (!stack) return;
      var t = document.createElement("div");
      t.className = "toast toast--success";
      t.innerHTML = '<span class="toast-word"></span><span class="toast-message"></span>';
      t.querySelector(".toast-word").textContent = word;
      t.querySelector(".toast-message").textContent = msg || "";
      stack.appendChild(t);
      setTimeout(function () { t.remove(); }, 3400);
    },
    loading: function (on) {
      var o = $(".loading-overlay"); if (o) o.classList.toggle("show", !!on);
    }
  };

  /* ---- F-20 shell state ---- */
  var header = $("#site-header");
  addEventListener("scroll", function () {
    if (header) header.classList.toggle("is-scrolled", scrollY > 24);
  }, { passive: true });

  /* ---- P-13 site cart drawer (shared shim state; distinct job vs G09) ---- */
  var underlay = $(".drawer__underlay"), cartDrawer = $(".cart-drawer");
  function renderCart() {
    if (!cartDrawer || !window.SKINAA_CART) return;
    Promise.resolve(window.SKINAA_CART.json()).then(function (cart) {
      var box = $(".cart-items", cartDrawer);
      if (box) box.innerHTML = cart.items.length
        ? cart.items.map(function (i) { return '<div class="ci"><span>' + i.title + " × " + i.quantity + '</span></div>'; }).join("")
        : '<p class="note">The tray is empty.</p>';
      var total = $(".cart-total", cartDrawer);
      if (total) total.textContent = cart.item_count + " in the tray";
      $$(".cart-count").forEach(function (n) { n.textContent = cart.item_count; });
    });
  }
  function openCart() {
    if (!cartDrawer) return;
    renderCart();
    cartDrawer.classList.add("open"); cartDrawer.setAttribute("aria-hidden", "false");
    if (underlay) underlay.classList.add("show");
    document.body.classList.add("drawer-open");
    if (window.SKINAAState) SKINAAState.toast("tray", " — the Collection tray");
  }
  function closeDrawers() {
    if (cartDrawer) { cartDrawer.classList.remove("open"); cartDrawer.setAttribute("aria-hidden", "true"); }
    var so = $(".ctr-cart-drawer"); if (so) so.classList.remove("is-open");
    if (underlay) underlay.classList.remove("show");
    document.body.classList.remove("drawer-open");
  }
  $$("[data-cart-open]").forEach(function (b) { b.addEventListener("click", openCart); });
  $$(".drawer__close").forEach(function (b) { b.addEventListener("click", closeDrawers); });
  if (underlay) underlay.addEventListener("click", closeDrawers);
  document.addEventListener("skinaa:cart-changed", renderCart);
  renderCart();

  /* ---- F-07 meganav: current pieces from SKUS into the captured tiles ---- */
  (function meganav() {
    var host = $("[data-meganav-pieces]"); if (!host || typeof SKUS === "undefined") return;
    var picks = ["FAB-01", "TOP-17", "MALE-05"].map(function (code) {
      return SKUS.filter(function (s) { return s.code === code; })[0];
    }).filter(Boolean);
    host.innerHTML = picks.map(function (s) {
      var img = s.pic ? (s.pic.pack || s.pic.portrait) : "";
      return '<a class="meganav-promoted-products-item" href="product.html?sku=' + s.code + '">' +
        (img ? '<img src="' + img + '" alt="' + s.code + '">' : "") +
        "<span>" + s.name + "</span><small>" + s.code + " · " + s.line + "</small></a>";
    }).join("");
    $$(".meganav__primary > li.has-secondary > a").forEach(function (a) {
      a.addEventListener("click", function (e) {
        var panel = $(".meganav__secondary", a.parentElement);
        if (panel && matchMedia("(hover: none)").matches) { e.preventDefault(); panel.classList.toggle("is-open"); }
      });
    });
  })();

  /* ---- F-19 mobile menu: template contents render into the panel ---- */
  (function mobileMenu() {
    var menu = $(".mobile-menu"); if (!menu) return;
    var tpl = $("template[data-template-key='mobile-menu-contents']", menu);
    var host = $(".mobile-menu__contents", menu);
    if (tpl && host && !host.children.length) host.appendChild(tpl.content.cloneNode(true));
    $$("[data-mobile-menu-open]").forEach(function (b) {
      b.addEventListener("click", function () { menu.classList.add("is-open", "active"); });
    });
    $$("[data-mobile-menu-close]", menu).forEach(function (b) {
      b.addEventListener("click", function () { menu.classList.remove("is-open", "active"); });
    });
    var ov = $(".mobile-menu__overlay", menu);
    if (ov) ov.addEventListener("click", function () { menu.classList.remove("is-open", "active"); });
  })();

  /* ---- G-02 sidebar: active state follows the member surface (hash) ---- */
  (function sidebar() {
    function mark() {
      var h = location.hash || "#instrument";
      $$(".account-sidebar a.sidebar-text-link").forEach(function (a) {
        a.classList.toggle("is-active", a.getAttribute("href") === h);
      });
    }
    addEventListener("hashchange", mark); mark();
  })();

  /* ---- G01 announcement slider: member notices rotate ---- */
  (function notices() {
    var slides = $$(".announcement__slide"); if (slides.length < 2) return;
    var i = 0, slider = $(".announcement__slider");
    setInterval(function () {
      slides[i].classList.remove("is-active");
      i = (i + 1) % slides.length;
      slides[i].classList.add("is-active");
      if (slider) slider.dataset.active = slides[i].dataset.notice;
    }, 3500);
    if (slider) slider.dataset.active = slides[0].dataset.notice;
  })();

  /* ---- P-31 shared tooltip: one node explains the HUD readouts ---- */
  (function tooltip() {
    var tip = $(".tooltip-default"); if (!tip) return;
    var text = $(".tooltip-default__text", tip);
    $$("[data-tooltip]").forEach(function (el) {
      el.style.pointerEvents = "auto";
      el.addEventListener("mouseenter", function () {
        if (text) text.textContent = el.getAttribute("data-tooltip");
        var r = el.getBoundingClientRect();
        tip.style.left = Math.min(innerWidth - 260, Math.max(8, r.left)) + "px";
        tip.style.top = (r.bottom + 10) + "px";
        tip.classList.add("is-visible");
      });
      el.addEventListener("mouseleave", function () { tip.classList.remove("is-visible"); });
    });
  })();

  /* ---- G19 progression: advances with the member's delta state ---- */
  (function progression() {
    var fill = $(".ctr-progression__fill"), prog = $(".ctr-progression");
    function sync() {
      var mix = window.__skinaaDelta ? window.__skinaaDelta.mix : 0.35;
      var pct = Math.round(mix * 100);
      if (fill) fill.style.width = pct + "%";
      if (prog) prog.dataset.pct = pct + "%";
      var label = $(".ctr-progression__pct");
      if (label) label.textContent = pct + "%";
    }
    setInterval(sync, 600); sync();
  })();

  /* ---- G27 credit artifact: renders the recorded state or nothing ---- */
  (function credit() {
    var el = $(".ctr-credit-artifact"); if (!el) return;
    var recorded = null;
    try { recorded = localStorage.getItem("skinaa-credit-state"); } catch (e) {}
    if (recorded) el.textContent = recorded;
    // dormant by design: no recorded credit state -> the artifact stays empty
  })();

  /* ---- G09 standing-order drawer: lines from the member's stack (BUNDLES
     via the portal feed: the Week 2 member's refill lines are the document's
     M-A refill set), edits re-total from documented bundle prices ---- */
  (function standingOrder() {
    var drawer = $(".ctr-cart-drawer"); if (!drawer || typeof BUNDLES === "undefined") return;
    var bundle = BUNDLES.filter(function (b) { return b.id === "M-A"; })[0];
    var lines = [{ title: bundle.name + " — refill cycle", qty: 1, weekly: bundle.weekly }];
    function render() {
      var host = $(".ctr-cart-items", drawer);
      host.innerHTML = lines.map(function (l, i) {
        return '<div class="ctr-cart-item"><span>' + l.title + " · $" + l.weekly + "/week</span>" +
          '<span class="qty"><button type="button" class="qty-minus" data-i="' + i + '" aria-label="Less">−</button><b>' + l.qty + '</b>' +
          '<button type="button" class="qty-plus" data-i="' + i + '" aria-label="More">+</button></span></div>';
      }).join("");
      var total = lines.reduce(function (a, l) { return a + l.qty * l.weekly; }, 0);
      var t = $(".ctr-cart-total", drawer);
      if (t) t.textContent = "$" + total + "/week";
      $$(".qty-plus", host).forEach(function (b) { b.addEventListener("click", function () { lines[+b.dataset.i].qty++; render(); }); });
      $$(".qty-minus", host).forEach(function (b) { b.addEventListener("click", function () { var l = lines[+b.dataset.i]; if (l.qty > 1) l.qty--; render(); }); });
    }
    render();
    $$("[data-so-open]").forEach(function (b) {
      b.addEventListener("click", function () { drawer.classList.add("is-open"); if (underlay) underlay.classList.add("show"); });
    });
    $$(".ctr-cart-close", drawer).forEach(function (b) {
      b.addEventListener("click", function () { drawer.classList.remove("is-open"); if (underlay) underlay.classList.remove("show"); });
    });
  })();

  /* ---- BL-19 quick-buy: posts through the cart shim ---- */
  $$("[data-quick-buy]").forEach(function (b) {
    b.addEventListener("click", function () {
      if (!window.SKINAARoutes) return;
      var code = b.getAttribute("data-quick-buy");
      var sku = (typeof SKUS !== "undefined") ? SKUS.filter(function (s) { return s.code === code; })[0] : null;
      window.SKINAARoutes.fetch(window.Shopify.routes.cart_add_url, {
        method: "POST", body: JSON.stringify({ items: [{ id: code, quantity: 1, title: sku ? sku.name : code }] })
      }).then(function () {
        renderCart();
        if (window.SKINAAState) SKINAAState.toast("added", " — " + code + " is in the tray");
      });
    });
  });

  /* ---- G-23 passwordless login: issues via the house auth slot ---- */
  (function login() {
    var btn = $("[data-passwordless-login]"); if (!btn) return;
    btn.addEventListener("click", function () {
      var email = ($("[data-login-email]") || {}).value || "";
      var msg = $("[data-login-msg]");
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        if (msg) msg.textContent = "Enter the email on your membership first.";
        return;
      }
      window.SKINAASlots.post("passwordless-login", { email: email }).then(function () {
        if (msg) msg.textContent = "Sign-in link requested for " + email + " — recorded at the house auth slot; the link issues from the house endpoint when it is live.";
      });
    });
  })();

  /* ---- G-39 rebill card-confirm modal: confirms via the house slot ---- */
  (function rebill() {
    var modal = $(".subsciption-rebill-card-confirm-modal"); if (!modal) return;
    $$("[data-rebill-open]").forEach(function (b) { b.addEventListener("click", function () { modal.classList.add("is-open"); }); });
    $$("[data-rebill-cancel]", modal).forEach(function (b) { b.addEventListener("click", function () { modal.classList.remove("is-open"); }); });
    var confirm = $("[data-rebill-confirm]", modal);
    if (confirm) confirm.addEventListener("click", function () {
      window.SKINAASlots.post("rebill-card-confirm", {}).then(function () {
        var msg = $("[data-rebill-msg]");
        if (msg) msg.textContent = "Card confirmation recorded at the house billing slot — no charge is taken by this page.";
        setTimeout(function () { modal.classList.remove("is-open"); }, 900);
      });
    });
  })();
})();
