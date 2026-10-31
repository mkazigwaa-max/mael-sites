/* form-start.js: tells our own program, once per page load per form, that
   somebody started filling a form in, so the partners can see how many start
   each form beside how many send it (2026-10-09). The message is the form's
   name and nothing else: no answer, no id, no cookie.

   "Started" means the visitor's first real interaction inside the form: a tap
   on an answer, a chip or the record button, a keystroke, a slider moved.
   Opening the page, scrolling past the form, or clicking into an empty box is
   not a start. Events a script makes (isTrusted false) never count.

   Which form: the nearest [data-form-start="<name>"] around what was touched;
   the FREE demo form ([data-demo-request]) and the Ask box ([data-ask]) are
   recognized by their own markers, so their markup needs nothing extra. The
   quiz counts its start from its own start event, not from here.

   Never in the way: one listener on the document, sendBeacon (fetch as the
   fallback), nothing waited on, every failure silent. Book a Call's design
   preview (?demo=1) sends nothing, like the rest of that page. */
(function () {
  'use strict';
  var FORMS = ['demo', 'book', 'missed-calls', 'late-invoices', 'ai-visibility', 'ask'];
  try { if (new URLSearchParams(location.search).get('demo') === '1') return; } catch (e) { return; }
  var API = (document.body && document.body.getAttribute('data-api')) || '/api';
  var sent = {};

  function formOf(el) {
    var root = el && el.closest ? el.closest('[data-form-start],[data-demo-request],[data-ask]') : null;
    if (!root) return null;
    var name = root.getAttribute('data-form-start') || (root.hasAttribute('data-demo-request') ? 'demo' : 'ask');
    return FORMS.indexOf(name) >= 0 ? name : null;
  }

  function send(name) {
    var body = JSON.stringify({ form: name });
    try {
      if (navigator.sendBeacon && navigator.sendBeacon(API + '/forms/start', new Blob([body], { type: 'text/plain' }))) return;
    } catch (e) { /* fall through to fetch */ }
    try {
      fetch(API + '/forms/start', { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: body, keepalive: true }).catch(function () {});
    } catch (e) { /* silent */ }
  }

  function onEvent(e) {
    if (!e.isTrusted) return;
    var t = e.target;
    // A click counts only on something you press; typing, ticking and sliding
    // arrive as input or change events.
    if (e.type === 'click' && !(t && t.closest && t.closest('button,[role=button],[role=radio],[role=checkbox]'))) return;
    var name = formOf(t);
    if (!name || sent[name]) return;
    sent[name] = true;
    send(name);
  }

  document.addEventListener('click', onEvent, true);
  document.addEventListener('input', onEvent, true);
  document.addEventListener('change', onEvent, true);
})();
