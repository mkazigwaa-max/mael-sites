// MAANAA BUY BOX — PDP plan selector + quantity ladder (Gundry pattern:
// middle tier pre-selected) wired into the existing cart seam
// (window.MaanaaCart.add — unchanged API). Load AFTER maanaa-cart.js.
(function(){
  // Tier pricing is the owner's number to set. 0 = honest math: every unit
  // bills at the authored plan price, no invented ladder discount.
  const LADDER_DISCOUNT = 0;
  if(!window.MaanaaCart) return;
  const CFG = window.MaanaaCart.CFG;
  const money = c => '$' + (c/100).toFixed(2);

  document.querySelectorAll('[data-buybox]').forEach(function(box){
    const id = box.getAttribute('data-buybox');
    const P = CFG.products[id];
    if(!P) return;
    let qty = 2; // ladder defaults to the middle tier (2 units), per Gundry pattern

    const radios = box.querySelectorAll('input[name="plan-' + id + '"]');
    const qtyBtns = box.querySelectorAll('[data-bb-qty]');
    const mathEl = box.querySelector('[data-bb-math]');
    const totalEls = document.querySelectorAll('[data-bb-total-for="' + id + '"]');
    const bar = document.querySelector('[data-stickybar="' + id + '"]');
    const barPrice = bar ? bar.querySelector('[data-sb-price]') : null;

    function plan(){
      const checked = box.querySelector('input[name="plan-' + id + '"]:checked');
      return checked ? checked.value : 'once';
    }
    function unit(){ return plan() === 'sub' ? P.subPrice : P.price; }
    function total(){ return Math.round(unit() * qty * (1 - LADDER_DISCOUNT)); }

    function paint(){
      qtyBtns.forEach(b => b.classList.toggle('is-on', +b.getAttribute('data-bb-qty') === qty));
      if(mathEl) mathEl.textContent = qty + ' × ' + money(unit()) + (qty > 1 ? ' · ' + money(unit()) + ' each' : '');
      totalEls.forEach(el => { el.textContent = money(total()); });
      if(barPrice) barPrice.textContent = plan() === 'sub'
        ? money(P.subPrice) + ' on subscription'
        : 'One-time ' + money(P.price);
    }
    function doAdd(){
      for(let i = 0; i < qty - 1; i++) window.MaanaaCart.add(id, plan(), false);
      window.MaanaaCart.add(id, plan(), true);
    }

    radios.forEach(r => r.addEventListener('change', paint));
    qtyBtns.forEach(b => b.addEventListener('click', function(){
      qty = +b.getAttribute('data-bb-qty'); paint();
    }));
    box.querySelectorAll('[data-bb-add]').forEach(b => b.addEventListener('click', doAdd));
    if(bar){
      bar.querySelectorAll('[data-sb-add]').forEach(b => b.addEventListener('click', doAdd));
      if('IntersectionObserver' in window){
        const anchor = box.querySelector('[data-bb-add]') || box;
        new IntersectionObserver(function(entries){
          const e = entries[0];
          bar.hidden = e.isIntersecting || e.boundingClientRect.top > 0;
        }, { threshold: 0 }).observe(anchor);
      }
    }
    paint();
  });
})();
