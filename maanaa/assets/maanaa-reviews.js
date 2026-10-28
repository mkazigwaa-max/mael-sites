// MAANAA REVIEWS — dormant module (Okendo pattern: a reviews section that
// renders from a dataset). The dataset below is EMPTY by design: with no
// real, verified reviews, the section does not render at all — no
// placeholder stars, no counts, no aggregate. When real reviews exist,
// add entries {author, rating (1-5), title, body, date} under the product
// key and the section appears on that product's page; the summary line is
// computed from the actual entries, never typed in.
(function(){
  const REVIEWS = {
    flow: [],
    spark: [],
    kit: []
  };
  document.querySelectorAll('[data-mn-reviews]').forEach(function(mount){
    const list = REVIEWS[mount.getAttribute('data-mn-reviews')] || [];
    if(!list.length) return; // dormant: render nothing
    const avg = list.reduce((a, r) => a + r.rating, 0) / list.length;
    const stars = n => '★★★★★'.slice(0, n) + '☆☆☆☆☆'.slice(0, 5 - n);
    const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
    mount.innerHTML =
      '<section class="mn-reviews"><div class="wrap">' +
      '<p class="eyebrow">Reviews</p>' +
      '<h2 style="margin-top:10px">' + avg.toFixed(1) + ' from ' + list.length + ' verified ' +
        (list.length === 1 ? 'review' : 'reviews') + '</h2>' +
      list.map(r =>
        '<article class="mn-review"><div class="mn-review-stars" aria-label="' + r.rating + ' of 5">' + stars(r.rating) + '</div>' +
        '<h3>' + esc(r.title) + '</h3><p>' + esc(r.body) + '</p>' +
        '<p class="note">' + esc(r.author) + ' · ' + esc(r.date) + '</p></article>'
      ).join('') +
      '</div></section>';
  });
})();
