/* SKINAA vibe chrome — the house frame on every room: Story A header
   (hazelnut ground, ivory type, dusty-blue hover) and the Story E end card
   (plum-black, ivory, one scarlet stamp). Nav and footer follow
   SITEMAP-SYNTHESIS.md. Club rules: no pop-ups, no chasing a visitor
   to the door — the AP-7 mini-intake block is deleted outright. */
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
    + '<a href="catalog.html"' + here("catalog.html") + '>The Collection</a>'
    + '<a href="vault.html"' + here("vault.html") + '>The Vault</a>'
    + '<a href="index.html#board"' + here("index.html") + '>The Board</a>'
    + '<a href="guide-female.html"' + here("guide-female.html") + '>Female Guide</a>'
    + '<a href="guide-male.html"' + here("guide-male.html") + '>Male Guide</a>'
    + '<a href="portal.html"' + here("portal.html") + ">Member's Room</a>"
    + '</nav>'
    + '<a class="pill small" href="assessment.html">The Skin Reading</a>'
    + '</header>';
  bar.after(hdr);
  var ftr = document.createElement("footer");
  ftr.className = "site";
  ftr.innerHTML = '<span class="brand">SKINAA by Maanaa \u2014 Clinical Dermatology Meets Facial Architecture.</span>'
    + '<div class="fl">'
    + '<div class="fcol"><h4>The Collection</h4>'
    + '<a href="catalog.html">All 40</a>'
    + '<a href="catalog.html">FAB \u2014 Barrier &amp; Prettymaxing</a>'
    + '<a href="catalog.html">TOP \u2014 Clinical Actives</a>'
    + '<a href="catalog.html">MALE \u2014 Tactical Optimization</a>'
    + '<a href="catalog.html">Hardware</a>'
    + '<a href="catalog.html">Digital</a></div>'
    + '<div class="fcol"><h4>The Rooms</h4>'
    + '<a href="assessment.html">Virtual Clinical Intake</a>'
    + '<a href="catalog.html">Catalog</a>'
    + '<a href="stacks.html">Attack Stacks</a>'
    + '<a href="vault.html">Visual Vault</a>'
    + '<a href="portal.html">Ascension Plus Portal</a>'
    + '<a href="guide-female.html">Female Guide</a>'
    + '<a href="guide-male.html">Male Guide</a>'
    + '<a href="unboxing.html">Unboxing</a></div>'
    + '<div class="fcol"><h4>House Service</h4>'
    + '<a href="portal.html">Ascension Plus Portal</a>'
    + '<a href="portal.html">Manage the drip</a>'
    + '<a href="assessment.html">Virtual Clinical Intake</a></div>'
    + '</div>'
    + '<div class="fend"><span class="fname">SKINAA by Maanaa</span>'
    + '<span class="fcycle">Cycles run 30 days, anchored on the 28th. Days 1\u201314: the full Attack Stack. Day 15: the iteration gate.</span>'
    + '<span class="footer-stamp">Official Esthetic Standard</span></div>';
  document.body.appendChild(ftr);
})();
