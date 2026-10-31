/* SKINAA enrichment — Door re-drive layer (Phase B Unit 1).
   Bodily donor JS loads separately (P-04 ticker/announcement, P-05 parallax/
   rellax, G03 ctr-usp-bar + Swiper). The interactions below re-drive the
   CAPTURED markup/class contracts whose donor JS lives inside unbanked
   monoliths/bundles — named per element in the room report:
   P-14 slider-component (Prequel theme.js/Flickity), P-15/P-16 header
   components (theme.js), BL-23 drawer (Bloom Alpine store), G-26 accordion
   (Gundry builder runtime), S-02 dialog (sckenofficial @theme chain),
   S-05 slideshow (sckenofficial @theme module chain), F-20 scroll state,
   G-35 search popdown trigger, G31 loader resolve, G-37 state signals. */
(function(){
  "use strict";
  var $ = function(s, c){ return (c||document).querySelector(s); };
  var $$ = function(s, c){ return Array.prototype.slice.call((c||document).querySelectorAll(s)); };

  /* G-37 — site-wide state signals: toast + loading overlay.
     Azure is reserved to the single-word state text inside them. */
  var toastStack = $(".toast-stack");
  function toast(word, message){
    if(!toastStack) return;
    var t = document.createElement("div");
    t.className = "toast toast--neutral";
    t.setAttribute("role","status");
    t.innerHTML = '<span class="toast-word"></span><span class="toast-message"></span>';
    t.querySelector(".toast-word").textContent = word;
    t.querySelector(".toast-message").textContent = message;
    toastStack.appendChild(t);
    setTimeout(function(){ t.remove(); }, 4200);
  }
  var overlay = $(".loading-overlay");
  function loading(word, on){
    if(!overlay) return;
    if(word) overlay.querySelector(".kinetic-word").textContent = word;
    overlay.classList.toggle("show", !!on);
  }
  window.SKINAAState = { toast: toast, loading: loading };

  /* G31 — the loader resolves as the arrival renders */
  function resolveLoader(){ document.body.classList.add("is-loaded"); }
  if(document.readyState === "complete") resolveLoader();
  else window.addEventListener("load", resolveLoader);
  setTimeout(resolveLoader, 2600); /* captured behaviour: the held breath is brief */

  /* S-02 — the entry dialog on the house's own door: entry resolves to the Door */
  var gate = $(".password-gate"), dialog = $(".password-dialog");
  var openBtn = $(".password-footer__button");
  if(openBtn && dialog && dialog.showModal) openBtn.addEventListener("click", function(){ dialog.showModal(); });
  var closeBtn = $(".password-dialog__close-button");
  if(closeBtn && dialog) closeBtn.addEventListener("click", function(){ dialog.close(); });
  var pwForm = $(".storefront-password-form");
  if(pwForm) pwForm.addEventListener("submit", function(e){
    e.preventDefault();
    if(dialog && dialog.open) dialog.close();
    document.body.classList.add("gate-open");
    var arrival = $(".arrival");
    if(arrival) arrival.scrollIntoView({behavior:"smooth"});
    toast("entered", "The Door is open.");
  });

  /* F-20 — sticky header shell: transparent→regular logo swap on scroll */
  var header = $(".header");
  function onScrollHeader(){
    if(!header) return;
    header.classList.toggle("is-scrolled", window.scrollY > 40);
    header.closest(".hdr") && header.closest(".hdr").classList.toggle("is-scrolled", window.scrollY > 40);
  }
  window.addEventListener("scroll", onScrollHeader, {passive:true}); onScrollHeader();

  /* BL-23 — the Door's full drawer directory */
  var drawer = $(".navbar-drawer"), backdrop = null;
  function openDrawer(){
    if(!drawer) return;
    drawer.classList.add("active"); drawer.setAttribute("aria-hidden","false");
    backdrop = document.createElement("div"); backdrop.className = "navbar-drawer-backdrop";
    backdrop.addEventListener("click", closeDrawer); document.body.appendChild(backdrop);
    toast("directory", "Every room in the house.");
  }
  function closeDrawer(){
    if(!drawer) return;
    drawer.classList.remove("active"); drawer.setAttribute("aria-hidden","true");
    if(backdrop){ backdrop.remove(); backdrop = null; }
  }
  var drawerBtn = $(".drawer-open");
  if(drawerBtn) drawerBtn.addEventListener("click", openDrawer);
  var drawerClose = $(".navbar-drawer .drawer-close");
  if(drawerClose) drawerClose.addEventListener("click", closeDrawer);

  /* G-35 — header search button: a trigger that opens the P-06 popdown surface */
  var popdown = $(".search-popdown");
  var searchBtn = $(".header__icon-touch--search");
  if(searchBtn && popdown) searchBtn.addEventListener("click", function(){
    var open = popdown.classList.toggle("open");
    if(open){ var inp = $("input", popdown); if(inp) inp.focus(); }
  });
  var searchForm = $(".predictive-search");
  if(searchForm) searchForm.addEventListener("submit", function(e){
    e.preventDefault();
    var status = $("[data-search-status]");
    var q = $("input", searchForm).value.trim();
    if(status) status.textContent = q ? ("Rooms and pieces answer to \u201C" + q + "\u201D in the Collection.") : "";
  });

  /* mobile menu toggle, P-16 sliderule panels, G-26 accordion */
  var menuBtn = $(".menu-toggle"), mobileMenu = $(".mobile-menu");
  if(menuBtn && mobileMenu) menuBtn.addEventListener("click", function(){ mobileMenu.classList.toggle("open"); });
  $$("[data-sliderule-forward]").forEach(function(row){
    row.addEventListener("click", function(){
      var target = document.getElementById(row.getAttribute("data-sliderule-forward"));
      $$(".sliderule__panel").forEach(function(p){ p.classList.remove("current"); });
      if(target) target.classList.add("current");
    });
  });
  $$("[data-sliderule-close]").forEach(function(row){
    row.addEventListener("click", function(){
      $$(".sliderule__panel").forEach(function(p){ p.classList.remove("current"); });
      var first = $(".sliderule__panel"); if(first) first.classList.add("current");
    });
  });
  $$(".mobile-nav-accordion > button").forEach(function(btn){
    btn.addEventListener("click", function(){
      var acc = btn.parentElement;
      var open = acc.classList.toggle("is-open");
      var content = $(".mobile-nav-accordion-content", acc);
      if(content) content.classList.toggle("is-open", open);
    });
  });

  /* P-14 — hero slideshow: auto-advance + drag (slider-component contract) */
  var slides = $$(".slideshow__slide");
  if(slides.length > 1){
    var cur = 0, timer = null;
    function go(n){
      slides[cur].classList.remove("is-selected");
      cur = (n + slides.length) % slides.length;
      slides[cur].classList.add("is-selected");
    }
    function auto(){ timer = setInterval(function(){ go(cur + 1); }, 5000); }
    auto();
    var slider = $("slider-component"), startX = null;
    if(slider){
      slider.addEventListener("pointerdown", function(e){ startX = e.clientX; clearInterval(timer); });
      slider.addEventListener("pointerup", function(e){
        if(startX === null) return;
        var dx = e.clientX - startX; startX = null;
        if(Math.abs(dx) > 40) go(cur + (dx < 0 ? 1 : -1));
        auto();
      });
    }
  }

  /* MOBILE FIRST-SCREEN (2026-10-31) — on a phone the authority trio is
     proof, not a first screen: the bar is re-homed below the product
     preview, where proof belongs. Desktop DOM is untouched. */
  if(window.matchMedia && window.matchMedia("(max-width:749px)").matches){
    var uspBar = $(".ctr-usp-bar"), previewSec = $(".preview");
    if(uspBar && previewSec && previewSec.parentNode){
      previewSec.parentNode.insertBefore(uspBar, previewSec.nextSibling);
      uspBar.classList.add("usp-relocated");
    }
  }

  /* P-39 — video-background: poster swaps to the player on view/interaction.
     The player carries no house film file yet (named GAP in the room report);
     the poster state is the captured pre-play state. */
  var vb = $(".video-background");
  if(vb){
    var poster = $(".video__poster", vb), player = $(".video__player", vb);
    function tryPlay(){
      if(player && player.getAttribute("src")){
        poster.style.display = "none"; player.style.display = "block";
        if(player.play) player.play();
      }
    }
    vb.addEventListener("click", tryPlay);
    if("IntersectionObserver" in window && player && player.getAttribute("src")){
      new IntersectionObserver(function(en, ob){ if(en[0].isIntersecting){ tryPlay(); ob.disconnect(); } }).observe(vb);
    }
  }

  /* S-05 — boardroom scroller slideshow: advances with scroll position */
  var track = $(".s05-track"), s05slides = $$(".s05-slide");
  if(track && s05slides.length > 1){
    var s05 = $(".s05-slideshow");
    function advance(){
      var r = s05.getBoundingClientRect();
      var progress = Math.min(1, Math.max(0, (window.innerHeight - r.top) / (window.innerHeight + r.height)));
      var idx = Math.min(s05slides.length - 1, Math.floor(progress * s05slides.length));
      track.style.transform = "translateX(" + (-idx * 100) + "%)";
    }
    window.addEventListener("scroll", advance, {passive:true}); advance();
  }
})();
