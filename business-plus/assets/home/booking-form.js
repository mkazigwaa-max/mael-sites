// Form lines chosen 2026-10-23.
const COPY = {
  done: "Got it. Now pick a time that works.",
  pick: "Pick a Time",
  fail: "That didn't go through. Try again, or email hello@getbusinessplus.com.",
};

const LOADED_AT = performance.timeOrigin || Date.now();
const LEAD_TIMEOUT_MS = 15000;
const bound = new WeakSet();
// The booking page fills its own boxes from this, so nobody types the same three things twice.
// This tab's sessionStorage only: personal details never go in the address.
const CARRY_KEY = 'bo-home-contact';

// Independent of the graphics host, so the same form works without WebGL or the 3D CDN.
export function bindBookingForm(form) {
  if (!form || bound.has(form)) return;
  bound.add(form);
  const button = form.querySelector('[data-send]');
  const status = form.querySelector('[data-sent]');
  const API = document.body.getAttribute('data-api') || '/api';
  let sending = false, saved = false;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (sending || saved || !form.reportValidity()) return;
    sending = true;
    button.disabled = true;
    status.replaceChildren();
    const value = (name) => form.elements.namedItem(name).value;
    const body = {
      contact: { name: value('name').trim(), email: value('email').trim(), company: value('business').trim() },
      answers: { software: value('software').trim(), source: 'homepage' },
      website: value('website'),
      loadedAt: LOADED_AT,
    };
    const controller = new AbortController();
    let timer;
    try {
      // Race the timeout as well as aborting: even an unresponsive transport releases the button.
      const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => { controller.abort(); reject(new Error('lead timeout')); }, LEAD_TIMEOUT_MS);
      });
      form.dispatchEvent(new CustomEvent('booking-send'));
      const response = await Promise.race([fetch(API + '/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      }), timeout]);
      if (!response.ok) throw new Error('lead refused');
      saved = true;
      try { sessionStorage.setItem(CARRY_KEY, JSON.stringify(body.contact)); } catch {}
      form.dispatchEvent(new CustomEvent('booking-saved'));
      const message = document.createElement('span');
      message.textContent = COPY.done;
      const link = document.createElement('a');
      link.className = 'pick';
      link.href = '/book';
      link.textContent = COPY.pick;
      status.replaceChildren(message, document.createElement('br'), link);
    } catch {
      form.dispatchEvent(new CustomEvent('booking-fail'));
      status.textContent = COPY.fail;
    } finally {
      clearTimeout(timer);
      sending = false;
      button.disabled = saved;
    }
  });
}

bindBookingForm(document.querySelector('#contact [data-form]'));
