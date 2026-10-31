/* COLLECTION WIRING — Phase B unit 2. Shared chrome rollout (F-20 shell
   states, P-13 cart drawer inside P-28's framework, G-37 kinetic signals,
   P-06 predictive search) copied in contract from the Door's landed build
   (build-door.md) and re-driven here, because the donors' JS lives in
   unbanked monoliths (Prequel theme.js, FAB theme.min.js contracts are
   answered through assets/enrich/cart-shim.js instead). Named re-drives
   are listed in build-collection.md — never described as bodily moves. */
(function () {
  "use strict";
  /* ---- G-37 kinetic signals: toast + loading overlay ---- */
  window.SKINAAState = {
    toast: function (word, msg) {
      var stack = document.querySelector(".toast-stack"); if (!stack) return;
      var t = document.createElement("div");
      t.className = "toast toast--success";
      t.innerHTML = '<span class="toast-message"><span class="toast-word"></span> </span>';
      t.querySelector(".toast-word").textContent = word;
      t.querySelector(".toast-message").appendChild(document.createTextNode(msg || ""));
      stack.appendChild(t);
      setTimeout(function () { t.remove(); }, 3200);
    },
    loading: function (on) {
      var o = document.querySelector(".loading-overlay"); if (!o) return;
      o.classList.toggle("show", !!on);
      o.setAttribute("aria-hidden", on ? "false" : "true");
    }
  };

  /* ---- F-20 header shell: sticky + dual-logo swap on scroll ---- */
  var header = document.getElementById("site-header");
  if (header) {
    var onScroll = function () { header.classList.toggle("is-scrolled", window.scrollY > 40); };
    addEventListener("scroll", onScroll, { passive: true }); onScroll();
  }

  /* ---- P-28 drawer framework + P-13 cart drawer ---- */
  var drawer = document.querySelector(".cart-drawer.drawer");
  var underlay = document.querySelector(".drawer__underlay");
  function openDrawer() {
    if (!drawer) return;
    renderCart();
    drawer.classList.add("open"); drawer.setAttribute("aria-hidden", "false");
    if (underlay) underlay.classList.add("open");
    document.body.classList.add("drawer-open");
    window.SKINAAState.toast("cart", " — the collection tray is open");
  }
  function closeDrawer() {
    if (!drawer) return;
    drawer.classList.remove("open"); drawer.setAttribute("aria-hidden", "true");
    if (underlay) underlay.classList.remove("open");
    document.body.classList.remove("drawer-open");
  }
  window.SKINAAOpenCart = openDrawer;
  document.addEventListener("skinaa:open-cart", openDrawer);
  document.querySelectorAll("[data-cart-open]").forEach(function (b) {
    b.addEventListener("click", function (e) { e.preventDefault(); openDrawer(); });
  });
  document.querySelectorAll(".drawer__close").forEach(function (b) {
    b.addEventListener("click", closeDrawer);
  });
  if (underlay) underlay.addEventListener("click", closeDrawer);
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeDrawer(); });

  function money(cents) { return cents === null ? "" : " $" + (cents / 100).toFixed(2); }
  function renderCart() {
    var host = document.querySelector(".cart-drawer .cart-items");
    if (!host || !window.SKINAA_CART) return;
    var cart = window.SKINAA_CART.json();
    if (!cart.items.length) {
      host.innerHTML = '<p class="cart-empty">The tray is empty. Pieces are prescribed through the intake, and collected here when added.</p>';
    } else {
      host.innerHTML = cart.items.map(function (l) {
        return '<div class="cart-line"><img src="' + l.image + '" alt="">'
          + '<div><div><b>' + l.title + '</b></div>'
          + '<div class="cart-line__price">' + money(l.final_price) + '</div></div>'
          + '<span class="quantity-input">'
          + '<button class="quantity-input__button" data-cart-dec="' + l.key + '" aria-label="Remove one">−</button>'
          + '<span class="quantity-input__input">' + l.quantity + '</span>'
          + '<button class="quantity-input__button" data-cart-inc="' + l.key + '" aria-label="Add one">+</button>'
          + '</span></div>';
      }).join("");
    }
    var foot = document.querySelector(".cart-drawer .drawer__foot .cart-total");
    if (foot) foot.textContent = cart.item_count + " in the tray" + money(cart.total_price);
  }
  window.SKINAARenderCart = renderCart;
  document.addEventListener("skinaa:cart-changed", renderCart);
  document.addEventListener("click", function (e) {
    var inc = e.target.closest("[data-cart-inc]"), dec = e.target.closest("[data-cart-dec]");
    if (inc) window.SKINAA_CART.update(inc.getAttribute("data-cart-inc"),
      window.SKINAA_CART.quantityOf(inc.getAttribute("data-cart-inc")) + 1);
    if (dec) { var c = dec.getAttribute("data-cart-dec");
      window.SKINAA_CART.update(c, window.SKINAA_CART.quantityOf(c) - 1); }
  });

  /* ---- S-08 fly-to-cart arc (re-drive: sckenofficial's banked
         fly-to-cart.js imports the unbanked @theme chain) ---- */
  window.SKINAAFly = function (imgEl) {
    var target = document.querySelector(".header__cart-link-count");
    if (!imgEl || !target) return;
    var r1 = imgEl.getBoundingClientRect(), r2 = target.getBoundingClientRect();
    var clone = imgEl.cloneNode();
    clone.className = "fly-clone";
    clone.style.cssText = "left:" + r1.left + "px;top:" + r1.top + "px;width:" + r1.width + "px;height:" + r1.height + "px";
    document.body.appendChild(clone);
    clone.animate([
      { transform: "translate(0,0) scale(1)", opacity: 1 },
      { transform: "translate(" + (r2.left - r1.left) + "px," + (r2.top - r1.top) + "px) scale(.08)", opacity: .6 }
    ], { duration: 650, easing: "cubic-bezier(.25,.46,.45,.94)" }).onfinish = function () { clone.remove(); };
  };

  /* ---- P-06 predictive search popdown (header) ---- */
  var pop = document.querySelector(".header-search-popdown");
  document.querySelectorAll(".header__icon-touch--search").forEach(function (b) {
    b.addEventListener("click", function () {
      if (!pop) return;
      var open = pop.hidden;
      pop.hidden = !open;
      if (open) { var i = pop.querySelector("input"); if (i) i.focus(); }
    });
  });
  if (pop) {
    var input = pop.querySelector("input"), results = pop.querySelector(".predictive-search"),
        status = pop.querySelector(".search-status");
    if (input) input.addEventListener("input", function () {
      var q = input.value;
      window.SKINAARoutes.fetch(window.Shopify.routes.predictive_search_url + "?q=" + encodeURIComponent(q))
        .then(function (res) {
          if (results) results.innerHTML = res.fragment;
          if (status) status.textContent = q ? res.resources.results.products.length + " pieces for “" + q + "”" : "";
        });
    });
  }
  document.addEventListener("DOMContentLoaded", renderCart);
})();
