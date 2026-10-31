/* END CARDS wiring (Phase B unit 9). House slots are named, never invented:
   SKINAA_HOUSE.availability — the attending state for G-36 (null = unset,
   renders nothing); SKINAA_HOUSE.authenticity — the verification registry
   slot for G-20 (null = no registry; a check against it says exactly that);
   SKINAA_HOUSE.endpoint — the house service endpoint slot for the contact
   and wholesale-login forms (null = device-local record + slot message). */
(function () {
  "use strict";
  window.SKINAA_HOUSE = window.SKINAA_HOUSE || {
    availability: null, /* e.g. { attending: true } when the house sets it */
    authenticity: null, /* registry object when the house sets it */
    endpoint: null,     /* service endpoint URL when the house sets it */
    locale: { country_code: "US", locale_code: "en", currency: "USD" }
  };
  var H = window.SKINAA_HOUSE;

  /* ---------- F-18 · section-footer-component countChildren re-drive
     (same contract as the Admission landing: the fetched section-footer.js
     is an ES module chained to unbanked rollup helpers) ---------- */
  var sfc = document.querySelector("section-footer-component");
  if (sfc) {
    var groups = sfc.querySelectorAll(".footer__group");
    sfc.setAttribute("data-children-visible-above-720", String(groups.length));
    sfc.setAttribute("data-children-visible-below-720", String(groups.length));
  }

  /* ---------- P-20 · the single correspondence line ---------- */
  var nl = document.querySelector("[data-newsletter-form]");
  if (nl && !window.__skinaaIntake) { /* assessment keeps admission.js's own binding */
    nl.addEventListener("submit", function (e) {
      e.preventDefault();
      var em = nl.querySelector("input[type=email]");
      if (!em || em.value.indexOf("@") < 0) { if (em) em.focus(); return; }
      try { localStorage.setItem("skinaa_correspondence", em.value); } catch (_) {}
      nl.classList.add("has-success");
    });
  }

  /* ---------- S-13 · overflow list (behaviour re-drive: the donor's
     overflow-list.js imports the unbanked @theme/component chain; its CSS
     family moves bodily in endcards-extracts.css. At mobile widths, links
     past the fit collapse behind the control.) ---------- */
  var ov = document.querySelector(".supporting-overflow");
  if (ov) {
    var more = ov.querySelector(".supporting-more");
    if (more) more.addEventListener("click", function () {
      var open = ov.classList.toggle("is-expanded");
      more.textContent = open ? "Fewer rooms" : "More rooms";
      more.setAttribute("aria-expanded", String(open));
    });
  }

  /* ---------- BL-24 + G-34 · localization (one function, two surfaces:
     the currency modal in every register; the locale dropdown in the
     service-page registers). Choice submits the localization form shape
     to the house slot: stored on-device + status line, no invented
     rates or locales beyond the house's own US · en · USD default. --- */
  function applyLocalization(form, statusEl) {
    var fd = new FormData(form);
    var loc = {
      country_code: fd.get("country_code") || H.locale.country_code,
      locale_code: fd.get("locale_code") || H.locale.locale_code,
      currency: fd.get("currency") || H.locale.currency
    };
    H.locale = loc;
    try { localStorage.setItem("skinaa_locale", JSON.stringify(loc)); } catch (_) {}
    document.querySelectorAll("[data-locale-label]").forEach(function (el) {
      el.textContent = loc.country_code + " · " + loc.currency;
    });
    if (statusEl) statusEl.textContent = "Locale set on this device: " +
      loc.country_code + " · " + loc.locale_code + " · " + loc.currency +
      ". (House localization slot — no rates are converted until the house sets them.)";
    return loc;
  }
  var modalRoot = document.querySelector("modal-currency-root");
  if (modalRoot) {
    var modal = modalRoot.querySelector(".currency-modal");
    document.querySelectorAll(".currency-open").forEach(function (b) {
      b.addEventListener("click", function () {
        modal.classList.add("is-open"); document.body.classList.add("overflow-hidden");
      });
    });
    var close = function () { modal.classList.remove("is-open"); document.body.classList.remove("overflow-hidden"); };
    modalRoot.querySelectorAll(".currency-modal__close-btn,.close_modal").forEach(function (b) { b.addEventListener("click", close); });
    modal.addEventListener("click", function (e) { if (e.target === modal) close(); });
    var frontForm = modalRoot.querySelector("form[id=modal--localization][modal-side=front]");
    var backForm = modalRoot.querySelector("form[id=modal--localization][modal-side=back]");
    var status = modalRoot.querySelector(".localization-status");
    if (frontForm) frontForm.addEventListener("submit", function (e) {
      e.preventDefault(); applyLocalization(frontForm, status); modal.classList.add("show-back");
    });
    if (backForm) backForm.addEventListener("submit", function (e) {
      e.preventDefault(); applyLocalization(backForm, status);
    });
  }
  document.querySelectorAll("locale-selector").forEach(function (sel) {
    var toggle = sel.querySelector("[data-qa=locale-dropdown-toggle]");
    var dd = sel.querySelector("locale-dropdown");
    if (!toggle || !dd) return;
    toggle.addEventListener("click", function () { dd.hidden = !dd.hidden; });
    var form = sel.querySelector("form.locale-form");
    if (form) form.addEventListener("submit", function (e) {
      e.preventDefault(); applyLocalization(form, sel.querySelector(".localization-status"));
      dd.hidden = true;
    });
  });

  /* ---------- G-14 · categorized help accordion: folds by category,
     one category open at a time (Gundry contact-capture pattern) ------ */
  var accs = document.querySelectorAll(".accordions .accordion");
  accs.forEach(function (acc) {
    var title = acc.querySelector(".accordion__title");
    if (!title) return;
    title.addEventListener("click", function () {
      var was = acc.classList.contains("open");
      accs.forEach(function (a) { a.classList.remove("open"); });
      if (!was) acc.classList.add("open");
    });
  });

  /* ---------- G-20 · authenticity check against the house slot -------- */
  var authForm = document.getElementById("auth-form");
  if (authForm) {
    authForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var code = authForm.querySelector("input").value.trim();
      var out = document.getElementById("auth-result");
      if (!code) { out.textContent = "Enter a code to check it."; return; }
      if (!H.authenticity) {
        out.textContent = "Unresolved: the house verification registry carries no entry for “" +
          code + "” — the registry slot is unset, so no code can be confirmed from this page yet.";
        return;
      }
      var hit = H.authenticity[code.toUpperCase()];
      out.textContent = hit ? ("Verified against the house registry: " + hit)
        : ("Unresolved: the house verification registry carries no entry for “" + code + "”.");
    });
  }

  /* ---------- G33 · wholesale login → house slot ---------------------- */
  var wl = document.getElementById("wholesale-login-form");
  if (wl) wl.addEventListener("submit", function (e) {
    e.preventDefault();
    var st = document.getElementById("wholesale-login-status");
    if (!H.endpoint) {
      st.textContent = "The trade login posts to the house endpoint slot, which is unset — no account was signed in and no credentials were sent anywhere.";
    }
  });

  /* ---------- G34 · gm-* contact form → house endpoint slot ----------- */
  var gm = document.getElementById("gm-contact-form");
  if (gm) gm.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!H.endpoint) {
      try { localStorage.setItem("skinaa_contact_draft", new Date().toISOString()); } catch (_) {}
      gm.classList.add("is-sent");
      var sent = gm.querySelector(".gm-sent");
      if (sent) sent.textContent = "Held on this device: the form submits to the house endpoint slot, which is unset — nothing was sent. The correspondence line in the register below is the house's live channel.";
    }
  });

  /* ---------- G-36 · speak-to-agent: renders ONLY in the available
     state. Absent/unset state renders nothing. -------------------------- */
  var agentSlot = document.querySelector("[data-agent-slot]");
  if (agentSlot && H.availability && H.availability.attending === true) {
    var a = document.createElement("a");
    a.className = "speak-to-agent-btn"; a.href = "contact.html";
    a.setAttribute("data-qa", "speak-to-agent-btn");
    a.innerHTML = "<span class=\"agent-dot\"></span>Speak to the house";
    agentSlot.appendChild(a);
  }
})();
