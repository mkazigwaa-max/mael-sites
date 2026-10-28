// MAANAA CART — Bloom's cart system (cart-next drawer pattern + main.js
// /cart/add|change|update semantics) running on a local seam while Maanaa
// lives on a static host. Remove the seam and the same calls hit the real
// storefront endpoints. Prices live ONLY in this config — owner's numbers
// replace them here, nowhere else.
(function(){
  const CFG = {
    freeShipThreshold: 9900,          // owner's $99 basket (GTM Stream H)
    subDiscount: 0,                    // unused — subscription price points are authored per SKU
    consolidateSaving: 875,           // owner's $8.75 — 2+ subscriptions, one parcel
    memberOffer: null,                 // owner's number to set — NO member/account price exists until set; two-price display (one-time / subscribe) only
    products: {
      flow:  { id:'flow',  name:'FLOW',        sub:'Matched to your constraint by the assessment.', img:'assets/flow.jpg',    price:4999, subPrice:2499 },
      spark: { id:'spark', name:'SPARK',       sub:'The catalyst, on its own page.',                  img:'assets/spark.jpg',   price:5999, subPrice:2999 },
      kit:   { id:'kit',   name:'STARTER KIT', sub:'Where Wave 1 begins. FLOW + SPARK.',              img:'assets/lineup.webp', price:10998, subPrice:4999 }
    }
  };
  // asset base derived from this script's own URL, so drawer images resolve
  // from any directory depth (homepage root, /products/, /pages/)
  const BASE=(document.currentScript&&document.currentScript.src||'').replace(/assets\/maanaa-cart\.js(?:\?.*)?$/,'');
  const KEY='maanaa_cart_v1';
  let cart=[]; try{ cart=JSON.parse(localStorage.getItem(KEY)||'[]'); }catch(_){ cart=[]; }
  const $=s=>document.querySelector(s);
  const money=c=>'$'+(c/100).toFixed(2).replace(/\.00$/,'');
  const save=()=>{ try{ localStorage.setItem(KEY, JSON.stringify(cart)); }catch(_){}};

  // ---- drawer DOM (Bloom cart-next pattern: backdrop + right drawer) ----
  const wrap=document.createElement('div');
  wrap.innerHTML=`
  <div class="mn-backdrop" hidden></div>
  <aside class="mn-drawer" aria-hidden="true" aria-label="Your cart">
    <div class="mn-dhead"><span>Your cart</span><button class="mn-close" aria-label="Close cart">✕</button></div>
    <div class="mn-ship"><div class="mn-shipbar"><i></i></div><div class="mn-shipmsg"></div><div class="mn-tier"></div></div>
    <div class="mn-items"></div>
    <div class="mn-recs"></div>
    <div class="mn-dfoot">
      <div class="mn-consol"></div>
      <div class="mn-meter" hidden>
        <div class="mn-mrow"><span>Original price</span><span class="mn-morig"></span></div>
        <div class="mn-mrow"><span>Your price</span><span class="mn-myour"></span></div>
        <div class="mn-mrow save"><span>You save</span><span class="mn-msave"></span></div>
      </div>
      <div class="mn-total"><span>Subtotal</span><b class="mn-subtotal"></b></div>
      <button class="mn-checkout">Checkout</button>
      <div class="mn-note" hidden>Checkout opens at launch — your cart is saved on this device.</div>
    </div>
  </aside>
  <style>
    .mn-backdrop{position:fixed;inset:0;background:rgba(20,46,29,.45);z-index:90;backdrop-filter:blur(2px)}
    .mn-drawer{position:fixed;top:0;right:0;height:100dvh;width:min(430px,94vw);background:#fff;z-index:91;
      transform:translateX(105%);transition:transform .45s cubic-bezier(.32,.72,.24,1);display:flex;flex-direction:column;
      box-shadow:-30px 0 60px rgba(20,46,29,.25);font-family:inherit;color:#142e1d}
    .mn-drawer.open{transform:none}
    .mn-dhead{display:flex;justify-content:space-between;align-items:center;padding:20px 22px;border-bottom:1px solid #d4ead4;
      font-weight:900;font-size:18px}
    .mn-close{background:none;border:none;font-size:16px;cursor:pointer;color:#67836c}
    .mn-ship{padding:16px 22px 4px}
    .mn-shipbar{height:7px;border-radius:99px;background:#eef4e6;overflow:hidden}
    .mn-shipbar i{display:block;height:100%;background:#215b32;border-radius:99px;transition:width .5s ease}
    .mn-shipmsg{font-size:12.5px;color:#67836c;margin-top:8px}
    .mn-tier{font-size:12.5px;color:#215b32;font-weight:700;margin-top:4px}
    .mn-tier:empty{margin-top:0}
    .mn-meter{border-top:1px dashed #d4ead4;padding-top:10px;margin-bottom:12px}
    .mn-mrow{display:flex;justify-content:space-between;font-size:13.5px;color:#67836c;padding:2px 0}
    .mn-mrow.save{color:#215b32;font-weight:800}
    .mn-items{flex:1;overflow-y:auto;padding:8px 22px}
    .mn-line{display:flex;gap:14px;padding:16px 0;border-bottom:1px solid #eef4e6}
    .mn-line img{width:64px;height:64px;object-fit:cover;border-radius:12px;border:1px solid #d4ead4}
    .mn-line .g{flex:1;min-width:0}
    .mn-line .n{font-weight:800;font-size:14.5px}
    .mn-line .plan{font-size:12px;color:#215b32;font-weight:700;margin-top:2px}
    .mn-line .plan.once{color:#67836c;font-weight:600}
    .mn-qty{display:inline-flex;align-items:center;gap:12px;border:1px solid #d4ead4;border-radius:99px;padding:3px 10px;margin-top:9px}
    .mn-qty button{background:none;border:none;font-size:15px;cursor:pointer;color:#215b32;font-weight:800}
    .mn-line .rm{background:none;border:none;color:#67836c;font-size:12px;cursor:pointer;text-decoration:underline;padding:0;margin-left:12px}
    .mn-line .p{font-weight:800;font-size:14.5px;white-space:nowrap}
    .mn-line .p s{color:#67836c;font-weight:600;margin-right:6px;font-size:13px}
    .mn-empty{text-align:center;color:#67836c;padding:44px 10px;font-size:15px;line-height:1.6}
    .mn-recs{padding:14px 22px;border-top:1px solid #eef4e6}
    .mn-recs .t{font-size:11px;font-weight:800;letter-spacing:.22em;text-transform:uppercase;color:#67836c;margin-bottom:10px}
    .mn-rec{display:flex;align-items:center;gap:12px;padding:8px 0}
    .mn-rec img{width:44px;height:44px;border-radius:10px;object-fit:cover;border:1px solid #d4ead4}
    .mn-rec .n{font-weight:800;font-size:13.5px;flex:1}
    .mn-rec button{background:#215b32;color:#fbf1e4;border:none;border-radius:99px;padding:8px 15px;font-weight:700;font-size:12.5px;cursor:pointer}
    .mn-dfoot{border-top:1px solid #d4ead4;padding:18px 22px 22px}
    .mn-consol{font-size:12.5px;color:#215b32;font-weight:700;margin-bottom:8px}
    .mn-total{display:flex;justify-content:space-between;font-size:16px;margin-bottom:14px}
    .mn-checkout{width:100%;background:#215b32;color:#fbf1e4;border:none;border-radius:99px;padding:16px;
      font-size:16px;font-weight:800;cursor:pointer;font-family:inherit}
    .mn-note{margin-top:12px;font-size:12.5px;color:#67836c;text-align:center}
    .mn-count{background:#e4ff97;color:#215b32;border-radius:99px;font-weight:800;font-size:11.5px;padding:2px 8px;margin-left:7px}
  </style>`;
  document.body.appendChild(wrap);
  const drawer=wrap.querySelector('.mn-drawer'), backdrop=wrap.querySelector('.mn-backdrop');

  const linePrice=l=>{ const P=CFG.products[l.id]; return (l.plan==='sub'? P.subPrice : P.price)*l.qty; };
  const subtotal=()=>cart.reduce((a,l)=>a+linePrice(l),0);
  const subCount=()=>cart.filter(l=>l.plan==='sub').length;

  function render(){
    const box=wrap.querySelector('.mn-items');
    const count=cart.reduce((a,l)=>a+l.qty,0);
    document.querySelectorAll('[data-mn-count]').forEach(el=>{ el.textContent=count; el.style.display=count?'':'none'; });
    if(!cart.length){
      box.innerHTML='<div class="mn-empty">Your cart is empty.<br>One constraint, one fix — start with the assessment.</div>';
    } else {
      box.innerHTML=cart.map((l,i)=>{ const P=CFG.products[l.id]; const lp=linePrice(l);
        const full=P.price*l.qty; return `<div class="mn-line">
        <img src="${BASE+P.img}" alt="">
        <div class="g"><div class="n">${P.name}</div>
          <div class="plan ${l.plan==='sub'?'':'once'}">${l.plan==='sub'?'Subscription · every 30 days · $'+(CFG.products[l.id].subPrice/100).toFixed(2)+' a cycle':'One-time'}</div>
          <span class="mn-qty"><button data-dec="${i}">−</button><span>${l.qty}</span><button data-inc="${i}">+</button></span>
          <button class="rm" data-rm="${i}">Remove</button></div>
        <div class="p">${l.plan==='sub'?`<s>${money(full)}</s>`:''}${money(lp)}</div></div>`; }).join('');
    }
    // ---- tiered progress (cart-next pattern, his figures only) ----
    // Tier 1: free shipping at the threshold. Tier 2: subscription consolidation.
    const st=subtotal(), th=CFG.freeShipThreshold;
    wrap.querySelector('.mn-shipbar i').style.width=Math.min(100, st/th*100)+'%';
    wrap.querySelector('.mn-shipmsg').textContent = st>=th ? 'Your basket ships free.' :
      (st>0 ? `${money(th-st)} away from free shipping — baskets over ${money(th)} ship free.` : `Baskets over ${money(th)} ship free.`);
    wrap.querySelector('.mn-tier').textContent =
      (cart.length && subCount()===1) ? `Add one more subscription — subscriptions ride together: one parcel, ${money(CFG.consolidateSaving)} saved each cycle.` : '';
    wrap.querySelector('.mn-consol').textContent = subCount()>=2 ?
      `Subscriptions ride together — one parcel, ${money(CFG.consolidateSaving)} saved each cycle.` : '';
    wrap.querySelector('.mn-subtotal').textContent=money(st);
    // ---- savings meter (Gundry pattern) — real deltas only: one-time price
    // is the anchor; savings exist only where a subscription price beats it.
    const orig=cart.reduce((a,l)=>a+CFG.products[l.id].price*l.qty,0);
    const meter=wrap.querySelector('.mn-meter');
    if(cart.length && orig>st){
      meter.hidden=false;
      wrap.querySelector('.mn-morig').textContent=money(orig);
      wrap.querySelector('.mn-myour').textContent=money(st);
      wrap.querySelector('.mn-msave').textContent=money(orig-st);
    } else { meter.hidden=true; }
    // recommendations: what's not in the cart (Bloom cart-next pattern)
    const missing=Object.values(CFG.products).filter(p=>!cart.some(l=>l.id===p.id));
    wrap.querySelector('.mn-recs').innerHTML = (cart.length && missing.length) ?
      `<div class="t">Complete the loop</div>` + missing.slice(0,2).map(p=>
      `<div class="mn-rec"><img src="${BASE+p.img}" alt=""><span class="n">${p.name} · ${money(p.price)}</span><button data-rec="${p.id}">Add</button></div>`).join('') : '';
    box.querySelectorAll('[data-inc]').forEach(b=>b.onclick=()=>{ cart[+b.dataset.inc].qty++; save(); render(); });
    box.querySelectorAll('[data-dec]').forEach(b=>b.onclick=()=>{ const i=+b.dataset.dec; cart[i].qty--; if(cart[i].qty<1) cart.splice(i,1); save(); render(); });
    box.querySelectorAll('[data-rm]').forEach(b=>b.onclick=()=>{ cart.splice(+b.dataset.rm,1); save(); render(); });
    wrap.querySelectorAll('[data-rec]').forEach(b=>b.onclick=()=>add(b.dataset.rec,'once',false));
  }
  function open(){ render(); backdrop.hidden=false; drawer.classList.add('open'); drawer.setAttribute('aria-hidden','false'); }
  function close(){ backdrop.hidden=true; drawer.classList.remove('open'); drawer.setAttribute('aria-hidden','true'); }
  backdrop.onclick=close; wrap.querySelector('.mn-close').onclick=close;
  wrap.querySelector('.mn-checkout').onclick=()=>{ wrap.querySelector('.mn-note').hidden=false; };

  // ---- the seam: same operations Bloom's main.js performs ----
  function add(id, plan, openAfter=true){
    const ex=cart.find(l=>l.id===id && l.plan===plan);
    if(ex) ex.qty++; else cart.push({id, plan, qty:1});
    save(); render(); if(openAfter) open();
  }
  window.MaanaaCart={ add, open, CFG };

  // wire triggers
  document.querySelectorAll('[data-mn-add]').forEach(b=>{
    b.addEventListener('click',()=>{
      const wrapEl=b.closest('[data-mn-product]')||document;
      const sel=wrapEl.querySelector('input[type=radio]:checked');
      add(b.dataset.mnAdd, sel? sel.value : 'once');
    });
  });
  document.querySelectorAll('[data-mn-open]').forEach(b=>b.addEventListener('click',open));
  render();
  if(new URLSearchParams(location.search).has('demo-cart')){
    if(!cart.length){ cart=[{id:'flow',plan:'sub',qty:1},{id:'kit',plan:'once',qty:1}]; save(); }
    open();
  }
})();
