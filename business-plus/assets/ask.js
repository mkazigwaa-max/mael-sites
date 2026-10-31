/* ask.js: the "Ask Us Anything" box (2026-09-30 site look). Same assistant as
   the floating chat bubble (chat.js) - same endpoint (/api/chat), same
   knowledge file, same caps - with a second, inline front end: type a
   question, the answer appears under the box.

   Markup contract (see index.html / faq.html, Task C1/C2):
     <form data-ask>
       <input type="text" name="q" ...>
       <button type="submit">Ask</button>
     </form>
     <div data-ask-answer hidden></div>
   The answer element is found as the nearest following sibling of the form
   that carries data-ask-answer, or inside the form's closest [data-ask-box]
   container - either layout works.

   Loaded as a module (<script type="module" src="/assets/ask.js">) so it can
   import the pure renderer directly rather than duplicating its escaping
   rules. The ?v= on that import is changed by hand whenever ask-render.mjs
   changes: stamp-assets.mjs stamps the pages, not this import, and without it a
   browser could pair the new ask.js with yesterday's renderer for a day. */
import { renderAnswer } from './ask-render.mjs?v=2026-10-09';

const API = (document.body && document.body.getAttribute('data-api')) || '/api';
const MAX_MESSAGES = 20;
const MAX_CHARS = 1500;
const TIMEOUT_MS = 20000;

// Approved copy ("Ask box, above the questions" and "Homepage" blocks of the
// 2026-09-30 website copy). Never edit these strings here - change the copy
// first and this file with it.
const FOOTER_OK =
  'Answered by our AI assistant, from what&rsquo;s on this site. Still unsure? ' +
  '<a href="/book">Book a Call</a>.';
const OFFLINE =
  'Our assistant is done for today. <a href="/book">Book a Call</a>, or email ' +
  '<a href="mailto:hello@getbusinessplus.com">hello@getbusinessplus.com</a>.';

function findAnswerEl(form) {
  let sib = form.nextElementSibling;
  while (sib) {
    if (sib.hasAttribute && sib.hasAttribute('data-ask-answer')) return sib;
    sib = sib.nextElementSibling;
  }
  const box = form.closest('[data-ask-box]');
  return box ? box.querySelector('[data-ask-answer]') : null;
}

function mount(form) {
  const answerEl = findAnswerEl(form);
  const input = form.querySelector('input[type="text"], input:not([type])');
  const button = form.querySelector('button[type="submit"], button');
  if (!answerEl || !input) return;

  let history = [];
  let inFlight = false;
  let disabled = false;

  function setBusy(busy) {
    if (button) button.disabled = busy;
    input.disabled = busy;
  }

  function showAnswer(reply) {
    answerEl.hidden = false;
    answerEl.innerHTML = renderAnswer(reply) + '<p class="ask-note">' + FOOTER_OK + '</p>';
  }

  function showOffline() {
    answerEl.hidden = false;
    answerEl.innerHTML = '<p class="ask-note">' + OFFLINE + '</p>';
  }

  function ask(messages) {
    inFlight = true;
    setBusy(true);

    const controller = ('AbortController' in window) ? new AbortController() : null;
    const timer = setTimeout(() => { if (controller) controller.abort(); }, TIMEOUT_MS);

    fetch(API + '/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // ask + page: the question is kept 90 days with the page it came from
      // (privacy.html), nothing else. The chat bubble sends neither.
      body: JSON.stringify({ messages, ask: true, page: location.pathname }),
      signal: controller ? controller.signal : undefined,
    }).then((r) => {
      clearTimeout(timer);
      if (!r.ok) throw new Error('http ' + r.status);
      return r.json();
    }).then((data) => {
      inFlight = false;
      setBusy(false);
      if (data && data.offline) {
        disabled = true;
        showOffline();
        return;
      }
      if (!data || typeof data.reply !== 'string' || !data.reply) throw new Error('bad shape');
      history.push({ role: 'assistant', content: data.reply });
      if (history.length > MAX_MESSAGES) history = history.slice(-MAX_MESSAGES);
      showAnswer(data.reply);
      input.value = '';
    }).catch(() => {
      clearTimeout(timer);
      inFlight = false;
      setBusy(false);
      showOffline();
    });
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (inFlight || disabled) return;
    let q = (input.value || '').trim();
    if (!q) return;
    if (q.length > MAX_CHARS) q = q.slice(0, MAX_CHARS);
    history.push({ role: 'user', content: q });
    if (history.length > MAX_MESSAGES) history = history.slice(-MAX_MESSAGES);
    ask(history.slice());
  });
}

document.querySelectorAll('[data-ask]').forEach(mount);
