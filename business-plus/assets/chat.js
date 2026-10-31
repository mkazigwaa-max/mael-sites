/* Business + chat widget. One file, no frameworks, same-origin /api/* only.
   Model replies never go through innerHTML — text nodes + a fixed link allowlist.
   Nothing runs before first paint but the floating button. */
(function () {
'use strict';
if (document.getElementById('bo-chat-root')) return;

var LOADED_AT = Date.now();
var API = (document.body && document.body.getAttribute('data-api')) || '/api';
var STORE_KEY = 'bo-chat';
var MAX_MESSAGES = 20;
var MAX_MSG_CHARS = 1500;
var CHAT_TIMEOUT_MS = 20000;
var LEAD_TIMEOUT_MS = 15000;
var LEAD_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
var LINK_RE = /\/(?:book|privacy|terms)\.html/g;
var HELLO_EMAIL = 'hello@getbusinessplus.com';
var CHIPS = ['What do you do?', 'How much does it cost?', 'How do I get started?'];

function el(tag, attrs, kids) {
  var n = document.createElement(tag);
  for (var k in attrs) if (Object.prototype.hasOwnProperty.call(attrs, k)) {
    if (k === 'class') n.className = attrs[k];
    else if (k === 'text') n.textContent = attrs[k];
    else n.setAttribute(k, attrs[k]);
  }
  (kids || []).forEach(function (c) { if (c) n.appendChild(c); });
  return n;
}

var style = document.createElement('style');
style.textContent =
'#bo-chat-root{all:initial;position:fixed;right:18px;bottom:18px;z-index:2147483000}' +
'#bo-chat-root,#bo-chat-root *{box-sizing:border-box;font-family:var(--sans)}' +
'#bo-chat-root button{cursor:pointer}' +
'.cT{width:58px;height:58px;border-radius:999px;border:0;background:var(--accent);color:#ece8e9;' +
  'box-shadow:0 10px 24px -8px rgba(16,22,20,.5);display:flex;align-items:center;justify-content:center}' +
'.cT:hover{background:var(--accent-lift)}.cT:active{transform:scale(.96)}' +
'.cT:focus-visible{outline:3px solid var(--accent);outline-offset:3px}.cT svg{width:26px;height:26px}' +
// Steps aside (slides down, fades) while a button or link is underneath it; see stepAside below.
// Still reachable with Tab while away: focusing it brings it straight back.
'.cT{transition:transform .3s cubic-bezier(.2,.8,.2,1),opacity .25s}' +
'#bo-chat-root.cAway .cT{transform:translateY(96px);opacity:0;pointer-events:none}' +
'@media (prefers-reduced-motion:reduce){.cT,#bo-chat-root.cAway .cT{transition:none}#bo-chat-root.cAway .cT{transform:none}}' +
'.cP{display:none;position:fixed;right:18px;bottom:86px;width:min(380px,calc(100vw - 32px));' +
  'max-height:min(600px,calc(100vh - 120px));flex-direction:column;background:var(--paper);border:1px solid var(--border);' +
  'border-radius:var(--r-panel);box-shadow:0 24px 60px -20px rgba(16,22,20,.5);overflow:hidden}' +
'.cH{background:var(--accent);color:#ece8e9;padding:14px 16px;display:flex;align-items:flex-start;' +
  'justify-content:space-between;gap:10px;flex:0 0 auto}' +
'.cH h2{font-size:1rem;font-weight:700;margin:0}.cH p{font-size:.76rem;opacity:.85;margin:4px 0 0;line-height:1.4}' +
'.cX{background:none;border:0;color:#ece8e9;padding:4px;line-height:0;border-radius:6px}' +
'.cX:focus-visible{outline:2px solid #ece8e9;outline-offset:2px}.cX svg{width:18px;height:18px;display:block}' +
'.cLog{flex:1 1 auto;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px;background:var(--paper-deep);' +
  'font-size:.92rem;line-height:1.5;color:var(--ink-soft);min-height:120px}' +
'.cM{max-width:86%;padding:9px 12px;border-radius:12px;white-space:pre-wrap;word-wrap:break-word}' +
'.cM a{color:inherit;text-decoration:underline}' +
'.cMu{align-self:flex-end;background:var(--accent);color:#ece8e9;border-bottom-right-radius:3px}' +
'.cMb{align-self:flex-start;background:var(--paper);border:1px solid var(--border-soft);color:var(--ink-soft);' +
  'border-bottom-left-radius:3px}' +
'.cMn{align-self:flex-start;background:var(--tint);border:1px solid var(--border-soft);color:var(--ink-soft)}' +
'.cMn a{color:var(--accent)}' +
'.cTy{align-self:flex-start;display:flex;gap:4px;padding:10px 12px}' +
'.cTy span{width:6px;height:6px;border-radius:999px;background:var(--ink-soft);opacity:.4;animation:cBlink 1.1s infinite}' +
'.cTy span:nth-child(2){animation-delay:.15s}.cTy span:nth-child(3){animation-delay:.3s}' +
'@keyframes cBlink{0%,80%,100%{opacity:.25}40%{opacity:.8}}' +
'.cIb{align-self:flex-start;background:none;border:1px solid var(--accent);color:var(--accent);' +
  'border-radius:999px;padding:6px 12px;font-size:.82rem;font-weight:600}' +
'.cIb:hover{background:var(--accent-wash)}' +
'.cChips{display:flex;flex-wrap:wrap;gap:8px;padding:0 14px 12px}' +
'.cChip{border:1px solid var(--border);background:var(--paper);color:var(--ink);border-radius:999px;padding:7px 12px;' +
  'font-size:.82rem;text-align:left}' +
'.cChip:hover{border-color:var(--accent);color:var(--accent)}' +
'.cForm{flex:0 0 auto;border-top:1px solid var(--border-soft);padding:10px 12px;display:flex;gap:8px}' +
'.cIn,.cLead input,.cLead textarea{border:1px solid var(--border);border-radius:var(--r-field);padding:10px 12px;' +
  'font-size:.92rem;color:var(--ink);background:var(--paper);width:100%}' +
'.cIn{flex:1 1 auto}.cIn:focus-visible,.cLead input:focus-visible,.cLead textarea:focus-visible{' +
  'outline:2px solid var(--accent);outline-offset:1px}' +
'.cSend{flex:0 0 auto;border:0;border-radius:var(--r-field);background:var(--accent);color:#ece8e9;padding:0 16px;' +
  'font-weight:600;font-size:.9rem}' +
'.cSend:hover{background:var(--accent-lift)}.cSend:disabled,.cIn:disabled{opacity:.55;cursor:not-allowed}' +
'.cFoot{flex:0 0 auto;text-align:center;padding:6px 0 10px;font-size:.78rem}' +
'.cFoot button{background:none;border:0;color:var(--accent);text-decoration:underline;font-size:.78rem}' +
'.cLead{padding:14px;display:flex;flex-direction:column;gap:10px;overflow-y:auto}' +
'.cLead label{font-size:.82rem;font-weight:700;color:var(--ink);display:block;margin-bottom:4px}' +
'.cLead textarea{min-height:70px;resize:vertical}' +
'.cErr{color:var(--warn);font-size:.8rem;min-height:1em}' +
'.cRow{display:flex;gap:8px;justify-content:flex-end;margin-top:2px}' +
'.cBack{background:none;border:0;color:var(--ink-soft);text-decoration:underline;font-size:.85rem}' +
'.cTrap{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}' +
'@media (max-width:420px){.cP{right:10px;left:10px;width:auto;bottom:80px}#bo-chat-root{right:12px;bottom:12px}}';
document.head.appendChild(style);

var root = el('div', { id: 'bo-chat-root' });
var toggle = el('button', { class: 'cT', type: 'button', 'aria-label': 'Chat with us', 'aria-expanded': 'false' });
toggle.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" ' +
  'stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9' +
  'L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>';
root.appendChild(toggle);
document.body.appendChild(root);

var panel = null, panelOpen = false, panelBuilt = false;
var els = {};
var messages = null;
var chatDisabled = false;
var inFlight = false;
var lastUserText = '';
var prevFocus = null;

function loadMessages() {
  if (messages) return messages;
  try {
    var parsed = JSON.parse(sessionStorage.getItem(STORE_KEY));
    messages = (parsed && Array.isArray(parsed.messages)) ? parsed.messages : [];
  } catch (e) { messages = []; }
  return messages;
}

function saveMessages() {
  try { sessionStorage.setItem(STORE_KEY, JSON.stringify({ messages: messages.slice(-MAX_MESSAGES) })); }
  catch (e) { /* storage unavailable — widget still works, just won't survive reload */ }
}

function appendTextWithBreaks(container, text) {
  var parts = text.split('\n');
  parts.forEach(function (part, i) {
    if (part) container.appendChild(document.createTextNode(part));
    if (i < parts.length - 1) container.appendChild(el('br', {}));
  });
}

function renderRichText(container, text) {
  var last = 0, m;
  LINK_RE.lastIndex = 0;
  while ((m = LINK_RE.exec(text))) {
    appendTextWithBreaks(container, text.slice(last, m.index));
    container.appendChild(el('a', { href: m[0], text: m[0] }));
    last = m.index + m[0].length;
  }
  appendTextWithBreaks(container, text.slice(last));
}

function scrollLog() { els.log.scrollTop = els.log.scrollHeight; }

function appendUserBubble(text) {
  var b = el('div', { class: 'cM cMu' });
  b.textContent = text;
  els.log.appendChild(b);
  scrollLog();
}

function appendBotBubble(text) {
  var b = el('div', { class: 'cM cMb' });
  renderRichText(b, text);
  els.log.appendChild(b);
  if (/leave a message/i.test(text)) {
    var btn = el('button', { class: 'cIb', type: 'button', text: 'Leave a message' });
    btn.addEventListener('click', showLeadForm);
    els.log.appendChild(btn);
  }
  scrollLog();
}

/* kind: 'lead-ok' | 'fail'. retryFn, if given, adds a Retry button. */
function appendNotice(kind, retryFn) {
  var b = el('div', { class: 'cM cMn' });
  if (kind === 'lead-ok') {
    b.textContent = 'Sent — Joe or Fritz will reply by email.';
  } else {
    b.appendChild(document.createTextNode('Sorry — that did not go through. You can '));
    b.appendChild(el('a', { href: '/book.html', text: 'book a call' }));
    b.appendChild(document.createTextNode(' or email '));
    b.appendChild(el('a', { href: 'mailto:' + HELLO_EMAIL, text: HELLO_EMAIL }));
    b.appendChild(document.createTextNode('.'));
  }
  els.log.appendChild(b);
  if (retryFn) {
    var btn = el('button', { class: 'cIb', type: 'button', text: 'Retry' });
    btn.addEventListener('click', function () { btn.remove(); retryFn(); });
    els.log.appendChild(btn);
  }
  scrollLog();
}

var typingEl = null;
function showTyping() {
  typingEl = el('div', { class: 'cTy', 'aria-hidden': 'true' }, [el('span', {}), el('span', {}), el('span', {})]);
  els.log.appendChild(typingEl);
  scrollLog();
}
function hideTyping() {
  if (typingEl && typingEl.parentNode) typingEl.parentNode.removeChild(typingEl);
  typingEl = null;
}

function renderChips() {
  if (els.chips) { els.chips.remove(); els.chips = null; }
  if (loadMessages().length) return;
  els.chips = el('div', { class: 'cChips' });
  CHIPS.forEach(function (text) {
    var chip = el('button', { class: 'cChip', type: 'button', text: text });
    chip.addEventListener('click', function () { sendMessage(text); });
    els.chips.appendChild(chip);
  });
  els.log.parentNode.insertBefore(els.chips, els.log.nextSibling);
}

function renderHistory() {
  loadMessages().forEach(function (m) {
    if (m.role === 'user') appendUserBubble(m.content); else appendBotBubble(m.content);
  });
}

function setDisabled(disabled) {
  els.input.disabled = disabled;
  els.send.disabled = disabled;
}

function sendMessage(text) {
  text = (text || '').trim();
  if (!text || inFlight || chatDisabled) return;
  if (text.length > MAX_MSG_CHARS) text = text.slice(0, MAX_MSG_CHARS);

  if (els.chips) { els.chips.remove(); els.chips = null; }
  lastUserText = text;
  var list = loadMessages();
  list.push({ role: 'user', content: text });
  saveMessages();
  appendUserBubble(text);
  els.input.value = '';

  doSend(list.slice(-MAX_MESSAGES));
}

function doSend(payloadMessages) {
  inFlight = true;
  setDisabled(true);
  showTyping();

  var controller = ('AbortController' in window) ? new AbortController() : null;
  var timer = setTimeout(function () { if (controller) controller.abort(); }, CHAT_TIMEOUT_MS);

  fetch(API + '/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: payloadMessages }),
    signal: controller ? controller.signal : undefined,
  }).then(function (r) {
    clearTimeout(timer);
    hideTyping();
    if (!r.ok) throw new Error('http ' + r.status);
    return r.json();
  }).then(function (data) {
    inFlight = false;
    if (data && data.offline) {
      chatDisabled = true;
      appendNotice('fail');
      setDisabled(true);
      return;
    }
    if (!data || typeof data.reply !== 'string' || !data.reply) throw new Error('bad shape');
    var list = loadMessages();
    list.push({ role: 'assistant', content: data.reply });
    saveMessages();
    appendBotBubble(data.reply);
    setDisabled(false);
    els.input.focus();
  }).catch(function () {
    clearTimeout(timer);
    hideTyping();
    inFlight = false;
    setDisabled(false);
    appendNotice('fail', function () { doSend(payloadMessages); });
    els.input.focus();
  });
}

function buildLeadForm() {
  var name = el('input', { id: 'bo-lf-name', type: 'text', autocomplete: 'name' });
  var email = el('input', { id: 'bo-lf-email', type: 'email', required: 'required', autocomplete: 'email' });
  var msg = el('textarea', { id: 'bo-lf-msg', required: 'required' });
  var err = el('p', { class: 'cErr', role: 'alert' });
  var trap = el('input', { id: 'bo-lf-website', type: 'text', tabindex: '-1', autocomplete: 'off' });

  var back = el('button', { class: 'cBack', type: 'button', text: '← Back to chat' });
  back.addEventListener('click', showChatView);
  var submit = el('button', { class: 'cSend', type: 'submit', text: 'Send' });

  var form = el('form', { class: 'cLead', 'aria-label': 'Leave a message' }, [
    back,
    el('div', {}, [el('label', { for: 'bo-lf-name', text: 'Name (optional)' }), name]),
    el('div', {}, [el('label', { for: 'bo-lf-email', text: 'Email' }), email]),
    el('div', {}, [el('label', { for: 'bo-lf-msg', text: 'Message' }), msg]),
    el('div', { class: 'cTrap', 'aria-hidden': 'true' }, [
      el('label', { for: 'bo-lf-website', text: 'Do not fill this in' }), trap,
    ]),
    err,
    el('div', { class: 'cRow' }, [submit]),
  ]);

  function handleLeadSubmit(e) {
    e.preventDefault();
    err.textContent = '';
    var emailVal = email.value.trim();
    var msgVal = msg.value.trim();
    if (!LEAD_EMAIL_RE.test(emailVal)) { err.textContent = 'Enter a valid email address.'; email.focus(); return; }
    if (!msgVal) { err.textContent = 'Enter a message.'; msg.focus(); return; }
    submitLead({ name: name.value.trim(), email: emailVal, message: msgVal, website: trap.value }, submit);
  }
  form.addEventListener('submit', handleLeadSubmit);
  /* Native implicit submit-on-Enter for a single-line field isn't reliable
     everywhere (some browsers/virtual keyboards skip it) — handle it directly. */
  [name, email].forEach(function (input) {
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') handleLeadSubmit(e); });
  });

  els.leadName = name; els.leadEmail = email; els.leadMsg = msg; els.leadForm = form;
  return form;
}

/* The campaign tags of the link that brought them, as every other form sends
   them (2026-10-09): from this address, or remembered for the visit. */
function utmTags() {
  var o = {};
  try {
    var p = new URLSearchParams(location.search);
    ['utm_source', 'utm_medium', 'utm_campaign'].forEach(function (k) { var v = p.get(k); if (v) o[k] = v.slice(0, 80); });
    if (Object.keys(o).length) sessionStorage.setItem('bo-utm', JSON.stringify(o));
    else o = JSON.parse(sessionStorage.getItem('bo-utm') || '{}') || {};
  } catch (e) { o = {}; }
  return o;
}

function submitLead(data, submitBtn) {
  submitBtn.disabled = true;
  var body = {
    contact: data.name ? { name: data.name, email: data.email } : { email: data.email },
    answers: { question: data.message, source: 'chat' },
    loadedAt: LOADED_AT,
    website: data.website || '',
    source: utmTags(),
  };

  var controller = ('AbortController' in window) ? new AbortController() : null;
  var timer = setTimeout(function () { if (controller) controller.abort(); }, LEAD_TIMEOUT_MS);

  function done(ok) {
    clearTimeout(timer);
    submitBtn.disabled = false;
    showChatView();
    appendNotice(ok ? 'lead-ok' : 'fail');
  }

  fetch(API + '/lead', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: controller ? controller.signal : undefined,
  }).then(function (r) { done(r.ok); }).catch(function () { done(false); });
}

function showLeadForm() {
  if (!els.leadForm) els.panel.appendChild(buildLeadForm());
  els.leadMsg.value = lastUserText || '';
  els.leadEmail.value = ''; els.leadName.value = '';
  var errEl = els.leadForm.querySelector('.cErr'); if (errEl) errEl.textContent = '';
  els.chatView.style.display = 'none';
  els.leadForm.style.display = 'flex';
  els.leadEmail.focus();
}

function showChatView() {
  if (els.leadForm) els.leadForm.style.display = 'none';
  els.chatView.style.display = 'flex';
  els.input.focus();
}

function buildPanel() {
  els.log = el('div', { class: 'cLog', role: 'log', 'aria-live': 'polite', 'aria-label': 'Conversation' });

  els.input = el('input', {
    class: 'cIn', type: 'text', 'aria-label': 'Message', placeholder: 'Type a message…',
    maxlength: String(MAX_MSG_CHARS), autocomplete: 'off',
  });
  els.send = el('button', { class: 'cSend', type: 'submit', text: 'Send' });
  var form = el('form', { class: 'cForm' }, [els.input, els.send]);
  function handleChatSubmit(e) { e.preventDefault(); sendMessage(els.input.value); }
  form.addEventListener('submit', handleChatSubmit);
  /* Belt-and-suspenders: implicit submit-on-Enter isn't consistent across
     browsers/virtual keyboards for a lone text input, so handle it directly. */
  els.input.addEventListener('keydown', function (e) { if (e.key === 'Enter') handleChatSubmit(e); });

  var leaveLink = el('button', { type: 'button', text: 'Leave a message' });
  leaveLink.addEventListener('click', showLeadForm);
  var footer = el('div', { class: 'cFoot' }, [leaveLink]);

  els.chatView = el('div', { style: 'display:flex;flex-direction:column;min-height:0;flex:1 1 auto' }, [els.log, form, footer]);

  els.close = el('button', { class: 'cX', type: 'button', 'aria-label': 'Close chat' });
  els.close.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" ' +
    'aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  els.close.addEventListener('click', closePanel);

  var head = el('div', { class: 'cH' }, [
    el('div', {}, [el('h2', { text: 'Business + assistant' }), el('p', { text: 'AI assistant — it can get things wrong.' })]),
    els.close,
  ]);

  panel = el('div', { class: 'cP', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Business + assistant chat' },
    [head, els.chatView]);
  els.panel = panel;

  panel.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { closePanel(); return; }
    if (e.key === 'Tab') trapTab(e);
  });

  root.appendChild(panel);
  renderHistory();
  renderChips();
  if (chatDisabled) setDisabled(true);
  panelBuilt = true;
}

function getFocusable() {
  var nodes = panel.querySelectorAll('button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])');
  return Array.prototype.filter.call(nodes, function (n) { return !n.disabled && n.offsetParent !== null; });
}

function trapTab(e) {
  var f = getFocusable();
  if (!f.length) return;
  var first = f[0], last = f[f.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}

function openPanel() {
  if (!panelBuilt) buildPanel();
  prevFocus = document.activeElement;
  panel.style.display = 'flex';
  toggle.setAttribute('aria-expanded', 'true');
  panelOpen = true;
  (els.input.disabled ? els.close : els.input).focus();
}

function closePanel() {
  panel.style.display = 'none';
  toggle.setAttribute('aria-expanded', 'false');
  panelOpen = false;
  if (prevFocus && prevFocus.focus) prevFocus.focus(); else toggle.focus();
}

toggle.addEventListener('click', function () { if (panelOpen) closePanel(); else openPanel(); });

/* STEP ASIDE (2026-10-08). The bubble is fixed to the corner, so anything on
   the page can pass under it: on a phone it sat on the homepage's "Pick a
   Time" button ("Pick a Ti") and on the full-width Send. While a button, link
   or form box is under any part of it, the bubble slides out of the way, and
   it comes back once that spot has been clear for a moment. Never while the
   chat is open or the bubble itself has keyboard focus. */
var AWAY_SEL = 'a[href],button,input,select,textarea,label,summary,[role="button"],.btn';
var SPOTS = [[0.5, 0.5], [0.18, 0.18], [0.82, 0.18], [0.18, 0.82], [0.82, 0.82]];
var awayQueued = false, backTimer = null;
function controlUnderBubble() {
  var r = root.getBoundingClientRect();   // the bubble's resting place; its own slide does not move this box
  if (!r.width || !document.elementsFromPoint) return false;
  for (var i = 0; i < SPOTS.length; i++) {
    var stack = document.elementsFromPoint(r.left + r.width * SPOTS[i][0], r.top + r.height * SPOTS[i][1]);
    for (var j = 0; j < stack.length; j++) {
      if (root.contains(stack[j])) continue;
      if (stack[j].closest && stack[j].closest(AWAY_SEL)) return true;
      break;   // only the topmost thing under the bubble counts
    }
  }
  return false;
}
function stepAside() {
  awayQueued = false;
  var away = !panelOpen && !root.contains(document.activeElement) && controlUnderBubble();
  if (away) { clearTimeout(backTimer); backTimer = null; root.classList.add('cAway'); }
  else if (root.classList.contains('cAway') && !backTimer) {
    backTimer = setTimeout(function () { backTimer = null; if (!controlUnderBubble() || panelOpen) root.classList.remove('cAway'); }, 220);
  }
}
function queueStepAside() {
  if (awayQueued) return;
  awayQueued = true;
  (window.requestAnimationFrame || setTimeout)(stepAside);
}
window.addEventListener('scroll', queueStepAside, { passive: true });
window.addEventListener('resize', queueStepAside);
// Forms that open more boxes (the demo card) move things under the bubble without a scroll.
if (window.ResizeObserver) new ResizeObserver(queueStepAside).observe(document.body);
toggle.addEventListener('focus', function () { root.classList.remove('cAway'); });
queueStepAside();

document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape' && panelOpen && !panel.contains(document.activeElement)) closePanel();
});
}());
