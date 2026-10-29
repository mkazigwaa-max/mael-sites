/* SKINAA 2.0 chrome — AP-1 authority bar + header + footer on every 2.0 page,
   and the AP-7 exit-intent mini-intake. Injected, so the approved homepage
   keeps its own header untouched. */
(function(){
  var path = location.pathname.split("/").pop() || "index.html";
  function here(p){ return path === p ? ' class="here"' : ""; }
  var bar = document.createElement("div");
  bar.className = "authbar";
  bar.innerHTML = "\u{1F3E5} <b>Co-Founded by Board-Certified Dermatologists</b> &nbsp;|&nbsp; Official Esthetic Standard";
  document.body.insertBefore(bar, document.body.firstChild);
  var hdr = document.createElement("div");
  hdr.className = "hdr";
  hdr.innerHTML = '<header class="site">'
    + '<a href="index.html"><img src="assets/skinaa-wordmark.png" alt="SKINAA"></a>'
    + '<nav class="site">'
    + '<a href="assessment.html"' + here("assessment.html") + '>The Intake</a>'
    + '<a href="catalog.html"' + here("catalog.html") + '>Catalog</a>'
    + '<a href="vault.html"' + here("vault.html") + '>The Vault</a>'
    + '<a href="stacks.html"' + here("stacks.html") + '>Stacks</a>'
    + '<a href="unboxing.html"' + here("unboxing.html") + '>Unboxing</a>'
    + '<a href="portal.html"' + here("portal.html") + '>Ascension Plus</a>'
    + '<a href="guide-male.html"' + here("guide-male.html") + '>Guides</a>'
    + '</nav>'
    + '<a class="pill small" href="assessment.html">Start Your Intake</a>'
    + '</header>';
  bar.after(hdr);
  var ftr = document.createElement("footer");
  ftr.className = "site";
  ftr.innerHTML = '<span class="brand">SKINAA by Maanaa — Clinical Dermatology Meets Facial Architecture. Cycles run 30 days, anchored on the 28th. Days 1\u201314: the full Attack Stack. Day 15: the iteration gate.</span>'
    + '<div class="fl"><a href="assessment.html">Virtual Clinical Intake</a><a href="catalog.html">Catalog</a><a href="vault.html">Visual Vault</a><a href="stacks.html">Attack Stacks</a><a href="portal.html">Ascension Plus Portal</a><a href="guide-female.html">Softmaxing Guide</a></div>';
  document.body.appendChild(ftr);

  /* AP-7 — exit-intent 3-step mini-intake (once per session). */
  if (sessionStorage.getItem("skinaa_exit_seen")) return;
  var veil = document.createElement("div");
  veil.id = "exitveil";
  veil.innerHTML = '<div class="box"><button class="x" aria-label="Close">\u00D7</button>'
    + '<div class="kicker" style="color:#B08D57">60-second mini intake</div>'
    + '<h3>Unsure which phenotype you match?</h3>'
    + '<p class="note" style="margin-top:10px">Take our 60-second 3-step mini intake to unlock your matched Before &amp; After model benchmark.</p>'
    + '<div class="opts" id="exitOpts"></div></div>';
  document.body.appendChild(veil);
  var steps = [
    { q:"1 of 3 — Your presentation:", a:["Male","Female"] },
    { q:"2 of 3 — The loudest signal:", a:["Jawline bloat","Dullness / no glow","Dark marks","Hairline / beard","Breakouts / razor bumps"] },
    { q:"3 of 3 — Your goal:", a:["Sharper jawline","Glass skin","Clearer eyes","Denser hairline","Even tone"] }
  ];
  var picks = [], si = 0;
  function drawStep(){
    var box = document.getElementById("exitOpts");
    if (si >= steps.length) {
      box.innerHTML = '<a class="pill dark" style="display:block;text-align:center" href="assessment.html">Unlock my matched benchmark \u2014 start the 28-step intake \u2192</a>';
      return;
    }
    box.innerHTML = '<p style="font-weight:700;font-size:14px">' + steps[si].q + '</p>'
      + steps[si].a.map(function(a){ return '<button data-a="' + a + '">' + a + '</button>'; }).join("");
    box.querySelectorAll("button[data-a]").forEach(function(b){
      b.onclick = function(){ picks.push(b.dataset.a); si++; drawStep(); };
    });
  }
  drawStep();
  veil.querySelector(".x").onclick = function(){ veil.classList.remove("open"); };
  veil.addEventListener("click", function(e){ if (e.target === veil) veil.classList.remove("open"); });
  document.addEventListener("mouseout", function(e){
    if (!e.relatedTarget && e.clientY < 8 && !sessionStorage.getItem("skinaa_exit_seen")) {
      sessionStorage.setItem("skinaa_exit_seen", "1");
      veil.classList.add("open");
    }
  });
})();
