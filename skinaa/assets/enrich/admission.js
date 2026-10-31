/* ADMISSION wiring — Phase B Unit 3.
   The quiz script in assessment.html is FROZEN except the one listed BL-26
   hook (window.__skinaaIntake). Everything here decorates the rendered
   screens from outside: it never rewrites a question, option, or score.
   L-05's dialog behaviour and S-15's scroll-lock are HOUSE BUILDS (the donor
   runtimes are not banked) — flagged here and in the census, never donor code.
   S-23's text-component is the sckenofficial utilities.js contract
   (text-component with a shimmer state), re-driven against that contract. */
(function () {
  "use strict";
  var stage = document.getElementById("stage");
  var sheetHome = document.querySelector(".sheet-home");
  var loviSheet = document.getElementById("CybotCookiebotDialog");
  var pulsar = document.getElementById("pulsar-veil");
  var modal = document.getElementById("admission-modal");
  var saveDialog = document.getElementById("save-dialog");
  var resumeBar = document.getElementById("resume-bar");
  var BLOCKS = ["Phenotype & Structural", "Fluid & Sebum", "Barrier & Sensitivity", "Goals + Photo"];
  var BLOCK_SUB = [
    "How the board reads your structure first.",
    "Fluid, sebum and shine, read by the hour.",
    "What your barrier tolerates — and what it refuses.",
    "The goal the board optimizes for, and your photograph."
  ];
  // Concern-step (second front) + goal-step decoration data: house macro
  // photography in the donor crop grammar (existing site assets only).
  var CONCERN_IMG = ["assets/tex/palewing-c.jpg", "assets/products/fab-03.webp", "assets/products/fab-02.webp", "assets/tex/wing-a.jpg"];
  var lastScreen = null, pulsarTimer = null;

  /* ---------- G-37 kinetic signals (azure single word only) ---------- */
  window.SKINAAState = {
    toast: function (word) {
      var stack = document.querySelector(".toast-stack"); if (!stack) return;
      var t = document.createElement("div"); t.className = "toast";
      t.innerHTML = '<span class="toast-word"></span>';
      t.querySelector(".toast-word").textContent = word;
      stack.appendChild(t); setTimeout(function () { t.remove(); }, 2600);
    },
    loading: function (on) {
      var o = document.querySelector(".loading-overlay"); if (o) o.classList.toggle("show", !!on);
    }
  };

  /* ---------- chrome: F-20 scroll state + P-13 drawer over the shim ---------- */
  var header = document.getElementById("site-header");
  addEventListener("scroll", function () { if (header) header.classList.toggle("is-scrolled", scrollY > 24); }, { passive: true });
  function cartCount() {
    try { var c = JSON.parse(localStorage.getItem("skinaa-cart-v1") || "{}"); return (c.items || []).reduce(function (n, i) { return n + (i.quantity || 0); }, 0); }
    catch (_) { return 0; }
  }
  function paintCart() {
    var n = cartCount();
    document.querySelectorAll(".cart-count").forEach(function (el) { el.textContent = n; });
    var items = document.querySelector(".cart-items"), total = document.querySelector(".cart-total");
    if (items) {
      var c = {}; try { c = JSON.parse(localStorage.getItem("skinaa-cart-v1") || "{}"); } catch (_) {}
      items.innerHTML = (c.items && c.items.length)
        ? c.items.map(function (i) { return '<div class="cart-line"><span>' + i.title + '</span><span>× ' + i.quantity + "</span></div>"; }).join("")
        : "<p>Nothing in the tray yet — the Collection dispenses from its room.</p>";
    }
    if (total) total.textContent = n + " in the tray";
  }
  function openDrawer() { paintCart(); document.body.classList.add("drawer-open"); SKINAAState.toast("tray"); }
  function closeDrawer() { document.body.classList.remove("drawer-open"); }
  document.querySelectorAll("[data-cart-open]").forEach(function (b) { b.addEventListener("click", openDrawer); });
  document.querySelectorAll(".drawer__close").forEach(function (b) { b.addEventListener("click", closeDrawer); });
  var underlay = document.querySelector(".underlay"); if (underlay) underlay.addEventListener("click", closeDrawer);
  paintCart();

  /* ---------- F-22 modal shell + S-15 scroll-lock chassis (house build) ---------- */
  function openModal(which, html) {
    var m = which === "save" ? saveDialog : modal;
    if (which !== "save") modal.querySelector(".modal__body").innerHTML = html;
    m.hidden = false; document.body.classList.add("dialog-open"); // S-15: scroll locks while a dialog is open
  }
  function closeModal(m) { m.hidden = true; if (modal.hidden && saveDialog.hidden) document.body.classList.remove("dialog-open"); }
  [modal, saveDialog].forEach(function (m) {
    var c = m.querySelector(".modal__close"); if (c) c.addEventListener("click", function () { closeModal(m); });
    m.addEventListener("click", function (e) { if (e.target === m) closeModal(m); });
  });
  addEventListener("keydown", function (e) { if (e.key === "Escape") { closeModal(modal); closeModal(saveDialog); } });

  /* ---------- G-38 consent dialogs (document policy words only) ---------- */
  var GDPR_HTML = "<h3>Photograph consent</h3>" +
    "<p>The reading happens entirely in this browser, on this device. Your photo is never uploaded, never saved, and leaves with you when you close the page.</p>" +
    "<p>I consent to my photograph being read on this device, for this reading only.</p>" +
    '<button class="cta" data-consent-record="photograph">Record this consent</button><p class="consent-choice" hidden>Consent recorded on this device, before the picture gate.</p>';
  var COOKIE_HTML = "<h3>Cookie policy</h3>" +
    "<p>[NAMED SLOT — the master document carries no cookie-policy text; no policy words are invented for this dialog. The slot closes when the document supplies them.]</p>" +
    '<button class="cta" data-consent-record="cookie">Record this choice</button><p class="consent-choice" hidden>Choice recorded on this device.</p>';
  document.addEventListener("click", function (e) {
    var rec = e.target.closest("[data-consent-record]");
    if (rec) {
      try { var s = JSON.parse(localStorage.getItem("skinaa-consents") || "{}"); s[rec.dataset.consentRecord] = new Date().toISOString(); localStorage.setItem("skinaa-consents", JSON.stringify(s)); } catch (_) {}
      var note = rec.parentElement.querySelector(".consent-choice"); if (note) note.hidden = false;
      rec.disabled = true; return;
    }
    var gate = e.target.closest("[data-gate-dialog]");
    if (gate) openModal("gate", gate.dataset.gateDialog === "cookie" ? COOKIE_HTML : GDPR_HTML);
  });

  /* ---------- BL-26 save-and-resume (exit intent, this page only) ---------- */
  function savedProgress() { try { return JSON.parse(localStorage.getItem("skinaa-intake-progress") || "null"); } catch (_) { return null; } }
  document.getElementById("save-progress").addEventListener("click", function () {
    var st = window.__skinaaIntake && window.__skinaaIntake.getState();
    if (st) { try { localStorage.setItem("skinaa-intake-progress", JSON.stringify({ idx: st.idx, picked: st.picked, at: new Date().toISOString() })); } catch (_) {} }
    closeModal(saveDialog); SKINAAState.toast("saved");
  });
  document.getElementById("save-dismiss").addEventListener("click", function () { closeModal(saveDialog); });
  document.addEventListener("mouseleave", function (e) {
    if (e.clientY > 0) return;
    var st = window.__skinaaIntake && window.__skinaaIntake.getState();
    if (st && st.phase === "quiz" && saveDialog.hidden) openModal("save");
  });
  function paintResume() { var s = savedProgress(); if (resumeBar) resumeBar.hidden = !s; }
  document.getElementById("resume-btn").addEventListener("click", function () {
    var s = savedProgress(); if (!s) return;
    window.__skinaaIntake.resume(s.idx, s.picked); resumeBar.hidden = true; SKINAAState.toast("resumed");
  });
  document.getElementById("resume-clear").addEventListener("click", function () {
    try { localStorage.removeItem("skinaa-intake-progress"); } catch (_) {} resumeBar.hidden = true;
  });
  paintResume();

  /* ---------- P-20 correspondence line (End Card) ---------- */
  var nl = document.querySelector("[data-newsletter-form]");
  if (nl) nl.addEventListener("submit", function (e) {
    e.preventDefault();
    var em = nl.querySelector("input[type=email]");
    if (!em.value || em.value.indexOf("@") < 1) { em.focus(); return; }
    try { localStorage.setItem("skinaa-correspondence", em.value); } catch (_) {}
    nl.classList.add("has-success"); SKINAAState.toast("correspondence");
  });

  /* ---------- F-18 section-footer-component: countChildren re-drive
     (the fetched section-footer.js is an ES module chained to unbanked
     rollup helpers; its counting contract is re-driven here, named). ---------- */
  var sfc = document.querySelector("section-footer-component");
  if (sfc) {
    var kids = sfc.querySelectorAll(":scope > *"), above = 0, below = 0;
    kids.forEach(function (k) { if (!k.className.includes("hidden")) { above++; below++; } });
    sfc.setAttribute("data-children-visible-above-720", above);
    sfc.setAttribute("data-children-visible-below-720", below);
  }

  /* ---------- screen decoration (runs on every ceremony render) ---------- */
  function showPulsar(ms) {
    pulsar.hidden = false;
    clearTimeout(pulsarTimer);
    pulsarTimer = setTimeout(function () { pulsar.hidden = true; }, ms || 500);
  }
  function decorate(screen) {
    if (!screen || screen === lastScreen) return;
    lastScreen = screen;
    var startBtn = screen.querySelector("#start");
    var isQuiz = !!screen.querySelector(".opts");
    var isConsent = !!screen.querySelector(".consent");
    var isAnalyzing = !!screen.querySelector(".steps");
    var isResult = screen.classList.contains("result");

    if (isQuiz || isAnalyzing) showPulsar(isAnalyzing ? 1200 : 450); // L-02 at transitions + the gate
    if (isAnalyzing) { // S-23: shimmer while the step resolves
      var tc = document.createElement("text-component");
      tc.className = "shimmering"; tc.textContent = "Reading…";
      tc.style.cssText = "display:block;text-align:center;font-size:13px;letter-spacing:.18em;text-transform:uppercase;margin-top:14px;color:rgba(25,8,14,.6)";
      screen.appendChild(tc);
    }
    if (startBtn && !screen.querySelector(".ceremony-head")) {
      // BL-12 numbered circles + G13 process row — the ceremony head (intro only)
      var head = document.createElement("div"); head.className = "ceremony-head";
      head.innerHTML =
        '<div class="rewards-container"><div class="rewards-container__steps steps-responsive-row-center">' +
        BLOCKS.map(function (b, i) {
          return '<div class="rewards-container__steps__step"><span class="rewards-container__steps__step__circle"><span class="rewards-container__steps__step__circle__number">' + (i + 1) + '</span></span><span class="rewards-container__steps__step__title">' + b + "</span></div>";
        }).join("") + "</div></div>" +
        '<div class="how_bright_mind_works"><div class="how_bright_mind_works-title">How the intake works</div><div class="how_bright_mind_works-content">' +
        BLOCKS.map(function (b, i) {
          return '<div class="how_bright_mind_works-content-item"><span class="how_bright_mind_works-content-item-number">0' + (i + 1) + '</span><span><span class="how_bright_mind_works-content-item-title">' + b + '</span><br><span class="how_bright_mind_works-content-item-description">' + BLOCK_SUB[i] + "</span></span></div>";
        }).join("") + '</div><div class="how_bright_mind_works-progress-track" style="height:6px;border-radius:99px;margin-top:16px"><div class="how_bright_mind_works-progress-fill" style="width:100%;height:100%"></div></div></div>';
      startBtn.parentElement.insertBefore(head, startBtn);
    }
    if (isQuiz) {
      var q = screen.querySelector("h2.q");
      var opts = screen.querySelector(".opts");
      if (q && opts && q.textContent.indexOf("primary goal") > -1) {
        // G-03 goal tiles at the goal step (decoration only; the .opt click path is untouched)
        opts.classList.add("tiles");
        opts.querySelectorAll(".opt").forEach(function (b, i) {
          b.classList.add("goal-tile");
          if (!b.querySelector(".goal-chip")) { var c = document.createElement("span"); c.className = "goal-chip"; c.textContent = "Goal 0" + (i + 1); b.prepend(c); }
        });
      }
      if (q && opts && q.textContent.indexOf("second front") > -1) {
        // P-17 concern picker: circle-cropped macro tiles replace the radio-list presentation
        opts.classList.add("picker");
        opts.querySelectorAll(".opt").forEach(function (b, i) {
          b.classList.add("picker-tile", "column__inner");
          if (!b.querySelector(".column__image")) {
            var w = document.createElement("span");
            w.className = "column__image column__image--circle column__image--blob-" + ["one", "two", "three", "one"][i];
            w.innerHTML = '<span class="image-wrapper" style="display:block;width:100%;height:100%"><img src="' + CONCERN_IMG[i] + '" alt="" style="width:100%;height:100%;object-fit:cover"></span>';
            b.prepend(w);
          }
        });
      }
    }
    if (isConsent) {
      // G-38 dialog triggers mount at the gate, beside the ceremony's own consent
      var box = screen.querySelector(".consent");
      if (box && !box.querySelector(".gate-dialogs")) {
        var row = document.createElement("div"); row.className = "gate-dialogs";
        row.innerHTML = '<button type="button" data-gate-dialog="gdpr">Photograph consent</button><button type="button" data-gate-dialog="cookie">Cookie policy</button>';
        box.appendChild(row);
      }
      // L-05: the consent block moves into the 450px bottom sheet for the gate
      if (box && sheetHome && !sheetHome.contains(box)) { sheetHome.appendChild(box); loviSheet.hidden = false; }
      showPulsar(600);
    } else if (loviSheet) { loviSheet.hidden = true; }
    if (isResult && !screen.querySelector(".correspondence")) {
      // S-03 (PROVENANCE-CLEAN labels) in G-42's gh-input/styled-input field treatment
      var form = document.createElement("form");
      form.className = "correspondence email-signup";
      form.innerHTML = '<div class="nk">Correspondence</div>' +
        '<p class="sub" style="margin-top:8px">Join the weekly drip — one line, every seven days, with your Dual Rx note.</p>' +
        '<span class="input-group"><gh-input class="email-input styled-input"><input class="field__input" type="email" required placeholder="Your email" aria-label="Your email"></gh-input><button type="submit">Join</button></span>' +
        '<p class="msg" hidden>Received — your correspondence begins with the next weekly drip.</p>';
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var em = form.querySelector("input[type=email]");
        if (!em.value || em.value.indexOf("@") < 1) { em.focus(); return; }
        try { localStorage.setItem("skinaa-correspondence", em.value); } catch (_) {}
        form.classList.add("has-success"); form.querySelector(".msg").hidden = false; SKINAAState.toast("joined");
      });
      var firstCard = screen.querySelector(".refcard");
      if (firstCard) firstCard.parentElement.insertBefore(form, firstCard); else screen.appendChild(form);
    }
  }
  new MutationObserver(function () { decorate(stage.querySelector(".screen.live")); })
    .observe(stage, { childList: true, subtree: false });
  decorate(stage.querySelector(".screen.live"));
})();
