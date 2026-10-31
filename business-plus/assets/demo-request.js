/* demo-request.js: "Send your problem, get a FREE demo" (2026-09-30 site
   overhaul). Mounts on every [data-demo-request] element and owns everything
   inside it - the recorder, the file picker, the contact fields and Send.

   Two modes, read from the attribute's value:
     <div data-demo-request>           full page (web/start.html)
     <div data-demo-request="compact"> the homepage hero card - record button
                                        and the two "instead" links show
                                        first; the contact fields expand once
                                        there is something to send.
     <div data-demo-request="short">   the FREE demo page since 2026-10-23:
                                        one problem box you
                                        type in, with Record and Attach inside
                                        it, then name, company and email; tools,
                                        phone and website fold under "Add
                                        Details". It also tells the page's 3D
                                        when Send is pressed (booking-send,
                                        booking-saved, booking-fail).

   Talks to the three demo-request routes on our own server:
     POST /api/intake/start  -> {ok, id, finishKey, uploads:[{slot,key}]}
     PUT  /api/intake/upload?id=&slot=&key=  (raw bytes, header X-Size)
     POST /api/intake/finish -> {ok:true}
   Files never go through our own server in a parsed body - each blob is PUT
   straight to the Drive upload session /start already opened, using the
   X-Size header the contract requires (a browser does not always set its own
   Content-Length on a streamed body).

   Every visible string here is the approved copy (the 2026-09-30 website
   copy, "Get a FREE Demo" and the homepage's green-card block), word for
   word. */
(function () {
  'use strict';

  var API = (document.body && document.body.getAttribute('data-api')) || '/api';
  var LOADED_AT = Date.now();
  var TS_KEY = (document.body && document.body.getAttribute('data-turnstile')) || '';
  var TS_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

  var MAX_REC_MS = 5 * 60 * 1000;      // auto-stop; matches DEMO_REQ.maxMemoBytes's "about 5 minutes"
  var MAX_FILES = 3;                   // matches DEMO_REQ.maxFiles
  var MAX_FILE_BYTES = 10 * 1024 * 1024;  // matches DEMO_REQ.maxFileBytes
  var SEND_TIMEOUT_MS = 30000;
  var TS_WAIT_MS = 10000;              // how long Send waits for the bot check to finish before trying anyway
  var UPLOAD_TIMEOUT_MS = 180000;      // a 12 MB memo on a slow phone connection
  var mountCount = 0;

  // ---------------------------------------------------------------- copy
  // Every string below is quoted from the approved copy doc. Do not edit a
  // string here without changing the copy doc first.
  var COPY = {
    tag: 'FREE Demo - 24 Hours or Less',
    // One approved sentence pair, shown as two paragraphs (2026-10-01).
    wayLine: "Send a voice memo or detailed message explaining your problem, and we'll send you a FREE demo fixing it.",
    wayLine2: 'The only limitation is your imagination. Seriously, dream big here.',
    recLabel: 'Tap to Record',
    typeInstead: 'Type it Instead',
    attachFile: 'Attach a File',
    recLimit: 'Up to 5 minutes',   // the full page, under the timer (2026-10-04, pick 4A; was "Tap to Record (up to 5 minutes)")
    step1Heading: 'Tell us where it leaks',
    step1Body: 'Explain it like you would to a new hire: what the task is, who does it, how long it takes, and what goes wrong.',
    step2Heading: 'Add a File (Optional)',
    step2Body: "A screenshot or a sample spreadsheet lets us build the demo around your real layout. Up to 3 files, 10 MB each. Take out anything you'd rather we didn't see.",
    // The contact step (2026-10-01): an optional phone, the approved heading
    // above the boxes. One Name box replaced First Name and Last Name on
    // 2026-10-08 (added to the copy doc, pending review).
    contactHeading: 'Where Should We Send Your Demo?',
    fieldName: 'Name',
    fieldPhone: 'Phone (optional)',
    fieldEmail: 'Work Email',
    fieldCompany: 'Business Name',
    // Was "Company Website (optional)"; shortened 2026-10-01 so it fits on one line beside Company.
    fieldWebsite: 'Website (optional)',
    // "What do you use for this today?" (2026-10-08, added to the copy doc,
    // pending review). Optional, pick any; the keys in TOOLS below must
    // match DEMO_REQ.tools in the server's demo-request rules (a test checks).
    toolsQuestion: 'What do you use for this today?',
    toolsOptional: 'Optional',
    toolExcel: 'Excel or Sheets',
    toolQuickBooks: 'QuickBooks',
    toolEmail: 'Email',
    toolCrm: 'A CRM',
    toolPaper: 'Paper',
    toolOther: 'Other',
    send: 'Send',
    fine: "We'll only use this to send your demo and follow up about it.",
    doneHeading: 'Got It.',
    doneHeadingName: 'Got It, {first}.',
    receiptMemo: 'Voice memo, {time}',
    receiptMessage: 'Message',
    receiptFile: '1 file',
    receiptFiles: '{n} files',
    arrivesBy: 'Your demo arrives by',
    doneQuestion: "If anything's unclear, we'll email you a question first.",
    bookCall: 'Book a Call',
    seeWork: "See What We've Built",
    recordAgain: 'Record Again',
    playMemo: 'Play your recording',
    pauseMemo: 'Pause your recording',
    doneBody: "Your demo will be in your inbox within 24 hours. If anything's unclear, we'll email you a question first.",
    errNetwork: 'That didn’t send. Check your connection and press Send again. Your recording is still here.',
    errTooLong: 'Your recording is over 5 minutes. Keep the first 5 minutes, or record a shorter one.',
    errTooBig: 'That file is over 10 MB. Try a smaller one, or send a screenshot.',
    dayLimit: "We're at today's limit for demos. Book a call and we'll build yours from the conversation.",
    pickATime: 'Pick a Time',
    // A refusal (bot check, too many from one network) is not a dropped
    // connection, so pressing Send again would only fail again (2026-10-04, pick 3A).
    refused: "That didn't go through. Book a Call instead, or email it to hello@getbusinessplus.com.",
    emailUs: 'Email Us',
    // Bug hunt 2026-10-09, NOT YET IN THE APPROVED COPY: the booking page's own
    // sentence for a mistyped email, and its twin for a phone number.
    badEmail: 'We still need an email address that looks right.',
    badPhone: 'We still need a phone number that looks right, or leave it blank.',
    // NOT YET IN THE APPROVED COPY - holding wording until the real line is written.
    // The recorder used to say "Recording. Tap to send." and, once stopped,
    // "Sent. Your demo arrives within 24 hours." - neither was true (tapping
    // stops the recording; nothing is sent until the visitor presses Send).
    recording: 'Recording. Tap to stop.',
    recorded: 'Recorded. Tap to record again.',
    // The short form (2026-10-23). NOT YET IN THE APPROVED COPY - holding
    // wording until the real lines are chosen.
    moreDetails: 'Add Details',
    fieldPhoneShort: 'Phone',
    fieldWebsiteShort: 'Website',
  };

  // The only answers the server keeps, in the order the chips show.
  var TOOLS = [['excel', COPY.toolExcel], ['quickbooks', COPY.toolQuickBooks], ['email', COPY.toolEmail], ['crm', COPY.toolCrm], ['paper', COPY.toolPaper], ['other', COPY.toolOther]];

  // ---------------------------------------------------------------- helpers
  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    for (var k in attrs) if (Object.prototype.hasOwnProperty.call(attrs, k)) {
      var v = attrs[k];
      if (v === null || v === undefined) continue; // e.g. a conditional `hidden` left unset
      if (k === 'class') n.className = v;
      else if (k === 'text') n.textContent = v;
      else if (k === 'html') n.innerHTML = v;
      else n.setAttribute(k, v);
    }
    (kids || []).forEach(function (c) { if (c) n.appendChild(c); });
    return n;
  }

  function fmtTime(sec) {
    sec = Math.max(0, Math.floor(sec));
    var m = Math.floor(sec / 60), s = sec % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  // Which of our own links brought them, if any - same three campaign tags,
  // same session storage key, as book.html.
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

  // Handed over by the Diagnostic result's "Get a FREE Demo Built for This"
  // button (2026-10-09): the visitor's own words for the problem. It travels
  // in this tab's sessionStorage, never in the address, and is removed the
  // moment it is read, so a reload or a later visit starts with an empty form.
  var PREFILL_KEY = 'bo-demo-prefill';
  var PREFILL_MAX_AGE_MS = 6 * 3600 * 1000;
  function takePrefill() {
    try {
      var raw = sessionStorage.getItem(PREFILL_KEY);
      if (raw === null) return null;
      sessionStorage.removeItem(PREFILL_KEY);
      var p = JSON.parse(raw);
      if (!p || typeof p.message !== 'string' || !p.message.trim()) return null;
      var age = Date.now() - Number(p.at);
      if (!(age >= -60000 && age <= PREFILL_MAX_AGE_MS)) return null;
      return { message: p.message.slice(0, 6000), via: p.via === 'diagnostic' ? 'diagnostic' : '' };
    } catch (e) { return null; }
  }

  function pickMimeType() {
    if (!window.MediaRecorder) return '';
    var prefer = ['audio/webm;codecs=opus', 'audio/mp4'];
    for (var i = 0; i < prefer.length; i++) {
      try { if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(prefer[i])) return prefer[i]; } catch (e) { /* ignore */ }
    }
    return ''; // let the browser pick its own default
  }

  // ---------------------------------------------------------- turnstile
  // Loaded once, shared by every widget on the page (there may be more than
  // one - the homepage's compact card and, in principle, another instance).
  var tsScriptRequested = false, tsReady = false, tsWaiters = [];
  function whenTurnstileReady(cb) {
    if (!TS_KEY) return; // no key set: booking-style graceful no-op, see book.html
    if (tsReady) { cb(); return; }
    tsWaiters.push(cb);
    if (tsScriptRequested) return;
    tsScriptRequested = true;
    var sc = document.createElement('script');
    sc.id = 'ts-script';
    sc.src = TS_SRC; sc.async = true; sc.defer = true;
    sc.onload = function () {
      if (!window.turnstile || typeof window.turnstile.render !== 'function') {
        if (window.console) console.error('Turnstile API did not load - demo requests will be refused');
        return;
      }
      tsReady = true;
      tsWaiters.forEach(function (fn) { fn(); });
      tsWaiters = [];
    };
    document.head.appendChild(sc);
  }

  // ---------------------------------------------------------------- mount
  function mount(container) {
    var compact = container.getAttribute('data-demo-request') === 'compact';
    var short = container.getAttribute('data-demo-request') === 'short';
    var more = null;   // the short form's Add Details fold
    var uid = 'dr' + (++mountCount);

    var state = {
      memoBlob: null,
      recording: false,
      recTimer: null,
      recSeconds: 0,
      mediaRecorder: null,
      mediaStream: null,
      chunks: [],
      files: [],           // File objects, in attach order
      sending: false,
      // Set once /start succeeds; cleared once /finish succeeds (or the memo
      // or file list changes under it). Lets a retry after a dropped request
      // or a dropped response resume the SAME server-side request instead of
      // calling /start again - which would make a second Drive folder and,
      // worse, a second pair of emails if the first /finish actually reached
      // the server and only its response was what got lost.
      pending: null,       // { id, finishKey, uploads:[{slot,key}], done:{} }
      dayLimitHit: false,
      tsWidgetId: null,
      contactShown: !compact,
    };

    container.innerHTML = '';
    container.classList.add('dr');
    if (short) container.classList.add('dr-short');
    // A real <form> so the browser's own required/type=email validation
    // fires on Send (a type="submit" button) without any copy of our own -
    // no custom "please fill this in" text to invent.
    var form = el('form', {});
    container.appendChild(form);

    // ---- honeypot + hidden bookkeeping (never shown; worker.js's
    // looksAutomated reads these two fields by name, same as book.html) ----
    var trap = el('input', {
      type: 'text', name: 'website', tabindex: '-1', autocomplete: 'off', 'aria-hidden': 'true',
      style: 'position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden',
    });

    // ---- step 1: the problem ----
    var recLabelEl = el('span', { class: 'rec-label', text: COPY.recLabel });
    var recTimeEl = el('span', { class: 'rec-time', text: '0:00' });
    var recBtn, recWrap;
    if (short) {
      // one mint button inside the problem box: microphone, words, and the timer while it records
      recBtn = el('button', { class: 'dr-mic', type: 'button', 'aria-label': COPY.recLabel }, [
        el('span', { class: 'dr-mic-ico', 'aria-hidden': 'true', html: '<svg viewBox="0 0 24 24" width="18" height="18"><rect x="9" y="3" width="6" height="11" rx="3" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>' }),
        recLabelEl, recTimeEl]);
      recWrap = el('div', { class: 'rec dr-rec' }, [recBtn]);
    } else {
      recBtn = el('button', { class: 'rec-btn', type: 'button', 'aria-label': COPY.recLabel });
      var recMeta = [recLabelEl, recTimeEl];
      if (!compact) recMeta.push(el('span', { class: 'rec-limit', text: COPY.recLimit }));
      recWrap = el('div', { class: 'rec' }, [recBtn, el('div', { class: 'rec-meta' }, recMeta)]);
    }
    // Once a recording exists it becomes a little player the visitor can hear
    // back, with "Record Again" under it (pick 1A).
    var playBtn = el('button', { class: 'memo-play', type: 'button', 'aria-label': COPY.playMemo });
    var bars = el('span', { class: 'memo-wave', 'aria-hidden': 'true' });
    [6, 12, 8, 16, 10, 14, 6, 12, 17, 8, 11, 15, 7, 10, 13, 6, 12, 9, 15, 8, 11, 6, 13, 9].forEach(function (h) { bars.appendChild(el('i', { style: 'height:' + h + 'px' })); });
    var memoTime = el('span', { class: 'memo-time', text: '0:00' });
    var redoBtn = el('button', { class: 'memo-redo', type: 'button', text: COPY.recordAgain });
    var memoWrap = el('div', { class: 'memo', hidden: 'hidden' }, [el('div', { class: 'memo-row' }, [playBtn, bars, memoTime]), redoBtn]);
    var audio = null, audioUrl = null;

    // Real buttons with an icon each (2026-10-01).
    var icon = function (name) {
      var p = { type: 'M3 6h18v12H3zM7 10h.01M11 10h.01M15 10h.01M7 14h10', clip: 'M21 11l-8.5 8.5a5 5 0 0 1-7-7L14 4a3.5 3.5 0 0 1 5 5l-8.5 8.5a2 2 0 0 1-3-3L15 7' }[name];
      return el('span', { class: 'chip-ico', 'aria-hidden': 'true', html: '<svg viewBox="0 0 24 24" width="18" height="18"><path d="' + p + '" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' });
    };
    var typeToggle = el('button', { type: 'button', class: 'chip' }, [icon('type'), document.createTextNode(COPY.typeInstead)]);
    var attachToggle = short
      ? el('button', { type: 'button', class: 'dr-clip', 'aria-label': COPY.attachFile }, [icon('clip'), el('span', { class: 'dr-clip-t', text: COPY.attachFile })])
      : el('button', { type: 'button', class: 'chip' }, [icon('clip'), document.createTextNode(COPY.attachFile)]);
    var altLine = compact
      ? el('div', { class: 'alt' }, [typeToggle, attachToggle])
      : el('div', { class: 'dr-sub' }, [typeToggle]);

    var messageBox = short
      ? el('textarea', { class: 'dr-message', rows: '4', id: uid + '-message', placeholder: COPY.step1Body })
      : el('textarea', { class: 'dr-message', rows: '3', 'aria-label': COPY.step1Heading, hidden: 'hidden' });

    // "What do you use for this today?" One tap per answer, any number, never
    // required. Toggle buttons (aria-pressed), so nothing here can block Send.
    // The homepage card shows it with the contact boxes, once there is
    // something to send, so the card's first screen stays as it was.
    var toolChips = TOOLS.map(function (t) {
      var b = el('button', { type: 'button', class: 'chip dr-tool', 'aria-pressed': 'false', 'data-tool': t[0], text: t[1] });
      b.addEventListener('click', function () { b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') === 'true' ? 'false' : 'true'); });
      return b;
    });
    var toolsBox = el('fieldset', { class: 'dr-tools', hidden: compact ? 'hidden' : null }, [
      el('legend', {}, [document.createTextNode(COPY.toolsQuestion + ' '), el('span', { class: 'dr-opt', text: COPY.toolsOptional })]),
      el('div', { class: 'dr-tool-chips' }, toolChips),
    ]);
    function pickedTools() {
      return toolChips.filter(function (b) { return b.getAttribute('aria-pressed') === 'true'; }).map(function (b) { return b.getAttribute('data-tool'); });
    }

    var step1Kids = compact
      ? [el('p', { class: 'tag', text: COPY.tag }), el('div', { class: 'way' }, [el('p', { class: 'way-line', text: COPY.wayLine }), el('p', { class: 'way-line2', text: COPY.wayLine2 })]), recWrap, memoWrap, altLine, messageBox, toolsBox]
      : [el('h2', { text: COPY.step1Heading }), el('p', { text: COPY.step1Body }), recWrap, memoWrap, altLine, messageBox, toolsBox];
    var step1 = el('section', { class: 'dr-step dr-step-1' }, step1Kids);

    // ---- step 2: files (full mode: its own section; compact: the "Attach a
    // File" link above reveals the same file input inline) ----
    // Both modes keep the browser's own file box hidden and open it from the
    // "Attach a File" chip, so the full page no longer shows a grey "Choose
    // Files / No file chosen" control beside our own buttons (2026-10-04).
    var fileInput = el('input', { type: 'file', multiple: 'multiple', 'aria-label': COPY.step2Heading, hidden: 'hidden' });
    var fileList = el('ul', { class: 'dr-files' });
    var step2Kids = compact
      ? [fileInput, fileList]
      : [el('h2', { text: COPY.step2Heading }), el('p', { text: COPY.step2Body }), attachToggle, fileInput, fileList];
    var step2 = el(compact ? 'div' : 'section', { class: compact ? 'dr-files-wrap' : 'dr-step dr-step-2' }, step2Kids);

    // ---- step 3: where to send it ----
    function field(key, labelText, inputAttrs) {
      // The label is tied to its box by id, so a screen reader names the box
      // and a tap on the label puts the cursor in it.
      inputAttrs.id = uid + '-' + key;
      inputAttrs.name = key;
      var input = el('input', inputAttrs);
      return { row: el('div', { class: 'dr-field' }, [el('label', { text: labelText, for: inputAttrs.id }), input]), input: input };
    }
    var nameF = field('name', COPY.fieldName, { type: 'text', required: 'required', autocomplete: 'name', maxlength: '120' });
    var emailF = field('email', COPY.fieldEmail, { type: 'email', required: 'required', autocomplete: 'email', inputmode: 'email', maxlength: '300' });
    // pattern: the browser's own "match the requested format" check, so no words of ours
    var phoneF = field('phone', short ? COPY.fieldPhoneShort : COPY.fieldPhone, { type: 'tel', autocomplete: 'tel', inputmode: 'tel', maxlength: '30', pattern: '[0-9+\\(\\)\\.\\- ]{7,30}' });
    var companyF = field('company', COPY.fieldCompany, { type: 'text', required: 'required', autocomplete: 'organization', maxlength: '300' });
    var websiteF = field('site', short ? COPY.fieldWebsiteShort : COPY.fieldWebsite, { type: 'text', autocomplete: 'url', inputmode: 'url', maxlength: '300' });

    var tsBox = el('div', { class: 'dr-turnstile' });
    var noteEl = el('p', { class: 'dr-note', role: 'alert', hidden: 'hidden' });
    var sendBtn = short
      ? el('button', { class: 'send', type: 'submit', disabled: 'disabled', 'data-send': '' }, [el('span', { class: 'send-t', text: COPY.send }), el('span', { class: 'send-a', 'aria-hidden': 'true' })])
      : el('button', { class: 'btn btn-primary', type: 'submit', disabled: 'disabled', text: COPY.send });
    var fineEl = el('p', { class: 'dr-fine', text: COPY.fine });

    var pair = function (a, b) { return el('div', { class: 'dr-pair' }, [a.row, b.row]); };
    var contactKids = [el('h3', { class: 'dr-contact-h', text: COPY.contactHeading }), nameF.row, pair(companyF, emailF), pair(phoneF, websiteF), tsBox, sendBtn, fineEl, noteEl];
    var step3 = compact
      ? el('div', { class: 'dr-contact', hidden: 'hidden' }, contactKids)
      : el('section', { class: 'dr-step dr-step-3' }, contactKids);

    form.appendChild(trap);
    if (short) {
      // The short form: the problem box (typing, with Record and Attach in its bottom bar, the recording's player in
      // place of the typing once there is one), then name, company and email, the rest folded under Add Details.
      var probBox = el('div', { class: 'dr-box' }, [messageBox, memoWrap, el('div', { class: 'dr-bar' }, [recWrap, attachToggle])]);
      more = el('details', { class: 'dr-more' }, [
        el('summary', {}, [document.createTextNode(COPY.moreDetails + ' '), el('span', { class: 'dr-opt', text: COPY.toolsOptional })]),
        toolsBox, pair(phoneF, websiteF)]);
      [el('label', { class: 'dr-lab', for: uid + '-message', text: COPY.step1Heading }), probBox, fileInput, fileList,
        nameF.row, pair(companyF, emailF), more, tsBox, sendBtn, fineEl, noteEl].forEach(function (n) { form.appendChild(n); });
      step3 = form;   // the bot check starts when the visitor reaches any box (see below)
      // A box that fails the browser's own check inside the closed Add Details (a phone number like "12345") could
      // not be shown, so Send did nothing and said nothing: open the fold first, so the browser's bubble appears.
      form.addEventListener('invalid', function (e) { if (!more.open && e.target && more.contains && more.contains(e.target)) more.open = true; }, true);
    } else {
      form.appendChild(step1);
      form.appendChild(step2);
      form.appendChild(step3);
    }
    // noteEl lives inside step3 in both modes - beside Send, right where the
    // visitor is looking when something goes wrong.

    // -------------------------------------------------- reveal the contact step
    function revealContact() {
      if (state.contactShown) return;
      state.contactShown = true;
      step3.hidden = false;
      toolsBox.hidden = false;
      renderTurnstile();
      guideToContact();
    }
    // On a phone the name and email boxes opened below the bottom of the
    // screen, with nothing saying they had (2026-10-04, pick 2A). When they
    // appear off screen, ease the page up so what the visitor just did (the
    // typing box, the recording, the files) sits at the top with the first
    // boxes under it.
    function guideToContact() {
      var first = nameF.input;
      var go = function () {
        var fb = first.getBoundingClientRect();
        if (fb.bottom <= window.innerHeight - 8) return;
        var anchor = !messageBox.hidden ? messageBox : (!memoWrap.hidden ? memoWrap : (state.files.length ? fileList : altLine));
        var top = anchor.getBoundingClientRect().top;
        var calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        window.scrollTo({ top: Math.max(0, window.scrollY + top - 96), behavior: calm ? 'auto' : 'smooth' });
      };
      if (window.requestAnimationFrame) requestAnimationFrame(function () { requestAnimationFrame(go); }); else go();
    }

    // -------------------------------------------------- turnstile
    function renderTurnstile() {
      if (!TS_KEY || state.tsWidgetId !== null) return;
      whenTurnstileReady(function () {
        if (state.tsWidgetId !== null) return;
        try { state.tsWidgetId = window.turnstile.render(tsBox, { sitekey: TS_KEY, action: 'demo', appearance: 'interaction-only' }); }
        catch (e) { if (window.console) console.error('turnstile render failed:', e); }
      });
    }
    function turnstileToken() {
      if (!TS_KEY || !window.turnstile || state.tsWidgetId === null) return '';
      try { return window.turnstile.getResponse(state.tsWidgetId) || ''; } catch (e) { return ''; }
    }
    // Resolves with a token once the widget has one, or with '' after the
    // wait runs out (the server then decides, exactly as before).
    function turnstileTokenWhenReady(maxMs) {
      if (!TS_KEY) return Promise.resolve('');
      renderTurnstile();
      var waited = 0;
      return new Promise(function (resolve) {
        (function poll() {
          var t = turnstileToken();
          if (t || waited >= maxMs) { resolve(t); return; }
          waited += 200;
          setTimeout(poll, 200);
        })();
      });
    }
    function turnstileReset() {
      if (!TS_KEY || !window.turnstile || state.tsWidgetId === null) return;
      try { window.turnstile.reset(state.tsWidgetId); } catch (e) { /* ignore */ }
    }
    // Lazy, like book.html's own widget: load Cloudflare's script and render
    // the checkbox only once the visitor actually reaches the contact
    // fields, not the moment the page (or, in compact mode, the card) opens.
    step3.addEventListener('focusin', renderTurnstile);
    // Start the bot check as soon as the visitor touches the form at all
    // (record, type, attach), not only once they reach the contact fields:
    // Cloudflare needs a moment, and a Send pressed before it finishes was
    // refused by the server and shown as "check your connection" (2026-10-04).
    // (The homepage card keeps its contact fields hidden until there is
    // something to send; the widget is drawn when they appear, never into a
    // hidden box.)
    function renderTurnstileEarly() { if (state.contactShown) renderTurnstile(); }
    form.addEventListener('pointerdown', renderTurnstileEarly);
    form.addEventListener('focusin', renderTurnstileEarly);

    // -------------------------------------------------- recording
    function setRecUi() {
      var hasMemo = !state.recording && !!state.memoBlob;
      recWrap.hidden = hasMemo;
      memoWrap.hidden = !hasMemo;
      container.classList.toggle('has-memo', hasMemo);
      if (hasMemo) { memoTime.textContent = fmtTime(state.recSeconds); }
      else if (audio) { audio.pause(); }
      recWrap.classList.toggle('is-rec', state.recording);
      recWrap.classList.toggle('is-done', !state.recording && !!state.memoBlob);
      recLabelEl.textContent = state.recording ? COPY.recording : (state.memoBlob ? COPY.recorded : COPY.recLabel);
      recBtn.setAttribute('aria-label', recLabelEl.textContent);
      recBtn.setAttribute('aria-pressed', state.recording ? 'true' : 'false');
      recTimeEl.textContent = fmtTime(state.recSeconds);
      updateSendEnabled();
    }

    function stopRecording(discard) {
      if (state.recTimer) { clearInterval(state.recTimer); state.recTimer = null; }
      if (state.mediaRecorder && state.mediaRecorder.state !== 'inactive') {
        try { state.mediaRecorder.stop(); } catch (e) { /* ignore */ }
      }
      if (state.mediaStream) {
        state.mediaStream.getTracks().forEach(function (t) { t.stop(); });
        state.mediaStream = null;
      }
      if (discard) { state.memoBlob = null; state.recSeconds = 0; }
      state.recording = false;
    }

    function startRecording() {
      if (!window.MediaRecorder || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        // Unsupported entirely: quietly offer typing, no error shown (per spec).
        showTextarea();
        return;
      }
      navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
        state.mediaStream = stream;
        state.chunks = [];
        var mimeType = pickMimeType();
        var opts = mimeType ? { mimeType: mimeType } : undefined;
        var rec;
        try { rec = new MediaRecorder(stream, opts); }
        catch (e) { stream.getTracks().forEach(function (t) { t.stop(); }); showTextarea(); return; }
        state.mediaRecorder = rec;
        rec.ondataavailable = function (e) { if (e.data && e.data.size) state.chunks.push(e.data); };
        rec.onstop = function () {
          var type = rec.mimeType || mimeType || 'audio/webm';
          var blob = new Blob(state.chunks, { type: type });
          state.chunks = [];
          if (state.recSeconds > 300) {
            // Safety net: the auto-stop timer below should always land on
            // time, but never trust a client-side timer with the limit alone.
            state.memoBlob = null;
            showNote(COPY.errTooLong);
          } else {
            state.memoBlob = blob;
            state.pending = null; // a new memo invalidates any slot plan the server already has
            noteEl.hidden = true;
          }
          setRecUi();
          if (state.memoBlob) revealContact();
        };
        rec.start();
        state.recording = true;
        state.recSeconds = 0;
        setRecUi();
        var started = Date.now();
        state.recTimer = setInterval(function () {
          state.recSeconds = Math.round((Date.now() - started) / 1000);
          recTimeEl.textContent = fmtTime(state.recSeconds);
          if (Date.now() - started >= MAX_REC_MS) stopRecording(false);
        }, 250);
      }).catch(function () {
        // Mic refused or unavailable: offer typing, no error (per spec).
        showTextarea();
      });
    }

    function memoAudio() {
      if (audio && audio.__blob === state.memoBlob) return audio;
      if (audio) { audio.pause(); }
      if (audioUrl) { URL.revokeObjectURL(audioUrl); }
      audioUrl = URL.createObjectURL(state.memoBlob);
      audio = new Audio(audioUrl);
      audio.__blob = state.memoBlob;
      var setPlaying = function (on) { memoWrap.classList.toggle('is-playing', on); playBtn.setAttribute('aria-label', on ? COPY.pauseMemo : COPY.playMemo); };
      audio.addEventListener('play', function () { setPlaying(true); });
      audio.addEventListener('pause', function () { setPlaying(false); });
      audio.addEventListener('ended', function () { setPlaying(false); for (var i = 0; i < bars.children.length; i++) bars.children[i].classList.remove('on'); memoTime.textContent = fmtTime(state.recSeconds); });
      audio.addEventListener('timeupdate', function () {
        var d = isFinite(audio.duration) && audio.duration > 0 ? audio.duration : state.recSeconds || 1;
        var lit = Math.round(Math.min(1, audio.currentTime / d) * bars.children.length);
        for (var i = 0; i < bars.children.length; i++) bars.children[i].classList.toggle('on', i < lit);
        memoTime.textContent = fmtTime(Math.round(audio.currentTime) || state.recSeconds);
      });
      return audio;
    }
    playBtn.addEventListener('click', function () {
      if (!state.memoBlob) return;
      var a = memoAudio();
      if (a.paused) { var p = a.play(); if (p && p.catch) p.catch(function () { /* the browser refused; nothing to say */ }); } else { a.pause(); }
    });
    redoBtn.addEventListener('click', function () {
      if (state.sending) return;
      state.memoBlob = null; state.recSeconds = 0; state.pending = null; setRecUi();
      startRecording();
    });

    recBtn.addEventListener('click', function () {
      if (state.sending) return;
      if (state.recording) { stopRecording(false); return; }
      if (state.memoBlob) {
        // Tap again after a finished recording: start a new one.
        state.memoBlob = null; state.recSeconds = 0; state.pending = null; setRecUi();
      }
      startRecording();
    });

    // -------------------------------------------------- typing instead
    function showTextarea() {
      messageBox.hidden = false;
      try { messageBox.focus({ preventScroll: compact }); } catch (e) { messageBox.focus(); }
      if (compact) revealContact();
    }
    typeToggle.addEventListener('click', function (e) { e.preventDefault(); showTextarea(); });
    messageBox.addEventListener('input', function () {
      updateSendEnabled();
      if (messageBox.value.trim() && compact) revealContact();
    });

    // -------------------------------------------------- files
    function renderFileList() {
      fileList.innerHTML = '';
      state.files.forEach(function (f, i) {
        var kb = f.size >= 1048576 ? (f.size / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(f.size / 1024)) + ' KB';
        var rm = el('button', { type: 'button', 'aria-label': 'Remove ' + f.name, text: '×' });
        rm.addEventListener('click', function () { state.files.splice(i, 1); state.pending = null; renderFileList(); });
        fileList.appendChild(el('li', {}, [document.createTextNode(f.name + ' (' + kb + ') '), rm]));
      });
    }
    function addFiles(list) {
      var tooBig = false;
      for (var i = 0; i < list.length && state.files.length < MAX_FILES; i++) {
        var f = list[i];
        if (f.size > MAX_FILE_BYTES) { tooBig = true; continue; }
        if (f.size < 1) continue;
        state.files.push(f);
        state.pending = null;
      }
      renderFileList();
      if (tooBig) showNote(COPY.errTooBig); else noteEl.hidden = true;
      if (state.files.length && compact) revealContact();
      updateSendEnabled();
    }
    fileInput.addEventListener('change', function () { addFiles(fileInput.files); fileInput.value = ''; });
    attachToggle.addEventListener('click', function (e) {
      e.preventDefault();
      fileInput.click();   // the browser's own file box stays hidden; chosen files list underneath
    });

    // -------------------------------------------------- send
    function updateSendEnabled() {
      var hasSomethingToSay = !!state.memoBlob || !!messageBox.value.trim();
      sendBtn.disabled = state.sending || !hasSomethingToSay;
    }

    function showNote(text) { noteEl.textContent = text; noteEl.hidden = false; }
    // The page's 3D (the tiles round the short form) plays its send moment from these; nothing else listens.
    function tell(name) { if (short) container.dispatchEvent(new CustomEvent(name, { bubbles: true })); }

    // The receipt (pick 2B): their first name, what arrived, and the time the
    // 24 hours runs out on the visitor's own clock.
    function dueLocal() {
      var due = new Date(Date.now() + 24 * 3600000);
      try {
        var day = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(due);
        var time = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(due).replace(/\s?([AP])M$/i, function (m, ap) { return ' ' + ap.toLowerCase() + 'm'; });
        return day + ', ' + time;
      } catch (e) { return ''; }
    }
    function showDone() {
      var first = nameF.input.value.trim().split(/\s+/)[0];   // "Got It, Dana." from "Dana Reyes"
      var memoSecs = state.sentMemoSeconds, typed = state.sentMessage, nFiles = state.sentFiles || 0;
      if (audio) { audio.pause(); }
      container.innerHTML = '';
      container.classList.add('dr-receipt');
      container.appendChild(el('span', { class: 'done-check', 'aria-hidden': 'true' }));
      var h = el('h2', { text: first ? COPY.doneHeadingName.replace('{first}', first) : COPY.doneHeading, tabindex: '-1', class: 'dr-done' });
      container.appendChild(h);
      var got = [];
      if (memoSecs) got.push(COPY.receiptMemo.replace('{time}', fmtTime(memoSecs)));
      if (typed) got.push(COPY.receiptMessage);
      if (nFiles) got.push(nFiles === 1 ? COPY.receiptFile : COPY.receiptFiles.replace('{n}', nFiles));
      if (got.length) container.appendChild(el('ul', { class: 'done-got' }, got.map(function (t) { return el('li', { text: t }); })));
      var when = dueLocal();
      container.appendChild(when
        ? el('div', { class: 'done-when' }, [el('small', { text: COPY.arrivesBy }), el('b', { text: when }), el('span', { text: COPY.doneQuestion })])
        : el('p', { text: COPY.doneBody }));
      container.appendChild(el('div', { class: 'done-btns' }, [
        el('a', { class: 'btn btn-primary', href: 'book.html', text: COPY.bookCall }),
        el('a', { class: 'btn btn-ghost', href: 'work.html', text: COPY.seeWork }),
      ]));
      // Move focus to the confirmation, so a keyboard or screen-reader user
      // hears it instead of being left on a button that no longer exists.
      try { h.focus({ preventScroll: true }); } catch (e) { h.focus(); }
      // The card shrinks to the receipt, which on a phone left it above the
      // screen: the visitor saw the next section and no sign it sent (2026-10-04).
      var top = container.getBoundingClientRect().top;
      if (top < 80 || top > window.innerHeight * 0.6) {
        var calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        window.scrollTo({ top: Math.max(0, window.scrollY + top - 96), behavior: calm ? 'auto' : 'smooth' });
      }
    }

    function showDayLimit() {
      noteEl.textContent = '';
      var p = el('p', { text: COPY.dayLimit });
      var btn = el('a', { class: 'btn btn-ghost', href: '/book', text: COPY.pickATime });
      noteEl.hidden = false;
      noteEl.innerHTML = '';
      noteEl.appendChild(p);
      noteEl.appendChild(btn);
    }

    function showRefused() {
      noteEl.innerHTML = '';
      noteEl.appendChild(el('p', { text: COPY.refused }));
      noteEl.appendChild(el('div', { class: 'dr-note-btns' }, [
        el('a', { class: 'btn btn-ghost', href: '/book', text: COPY.pickATime }),
        el('a', { class: 'btn btn-ghost', href: 'mailto:hello@getbusinessplus.com', text: COPY.emailUs }),
      ]));
      noteEl.hidden = false;
    }

    function postJson(path, body) {
      var controller = ('AbortController' in window) ? new AbortController() : null;
      var timer = setTimeout(function () { if (controller) controller.abort(); }, SEND_TIMEOUT_MS);
      return fetch(API + path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller ? controller.signal : undefined,
      }).then(function (r) {
        clearTimeout(timer);
        return r.json().catch(function () { return {}; }).then(function (data) { return { status: r.status, data: data }; });
      }, function (err) {
        clearTimeout(timer);
        throw err;
      });
    }

    function putBytes(path, blob) {
      var controller = ('AbortController' in window) ? new AbortController() : null;
      var timer = setTimeout(function () { if (controller) controller.abort(); }, UPLOAD_TIMEOUT_MS);
      return fetch(API + path, {
        method: 'PUT',
        headers: { 'X-Size': String(blob.size) },
        body: blob,
        signal: controller ? controller.signal : undefined,
      }).then(function (r) { clearTimeout(timer); return r.status; }, function (err) { clearTimeout(timer); throw err; });
    }

    function send() {
      if (state.sending) return;
      var message = messageBox.value.trim();
      if (!state.memoBlob && !message) return; // nothing to go on; Send stays disabled for this anyway

      var contact = {
        name: nameF.input.value.trim(),
        email: emailF.input.value.trim(),
        phone: phoneF.input.value.trim(),
        company: companyF.input.value.trim(),
        website: websiteF.input.value.trim(),
      };
      // The form's own required/type=email fields already stopped a blank or
      // malformed submit before this ever runs (see the submit handler
      // below); this is the belt-and-suspenders check for anything that slips
      // through in an older browser.
      if (!contact.name || !contact.email || !contact.company) return;
      // The server's own rules for the two boxes the browser checks more loosely
      // (bug hunt 2026-10-09): "dana@harbor" passes type=email, and "(813) 555"
      // passes the phone pattern, and both were refused as a "connection" problem.
      // The browser's own bubble shows the message, under the box it is about.
      var phoneDigits = contact.phone.replace(/\D/g, '').length;
      var bad = !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(contact.email) ? [emailF.input, COPY.badEmail]
        : (contact.phone && (phoneDigits < 7 || phoneDigits > 20)) ? [phoneF.input, COPY.badPhone] : null;
      if (bad) {
        if (short && more && !more.open && more.contains && more.contains(bad[0])) more.open = true;   // same reason as above
        bad[0].setCustomValidity(bad[1]);
        bad[0].reportValidity();
        bad[0].addEventListener('input', function clear() { bad[0].setCustomValidity(''); bad[0].removeEventListener('input', clear); });
        return;
      }

      var slotsPlan = [];
      var memoMeta = null;
      if (state.memoBlob) { memoMeta = { type: state.memoBlob.type.split(';')[0], size: state.memoBlob.size }; slotsPlan.push({ blob: state.memoBlob }); }
      var filesMeta = state.files.map(function (f) { return { name: f.name, type: f.type || 'application/octet-stream', size: f.size }; });
      state.files.forEach(function (f) { slotsPlan.push({ blob: f }); });

      state.sending = true;
      sendBtn.disabled = true;
      noteEl.hidden = true;
      tell('booking-send');

      // Resume a request that already reached /start (a prior press of Send
      // that failed only AFTER that point) instead of starting a brand new
      // one. Two reasons this matters: a fresh /start would open a second
      // Drive folder for the same visitor, and - the one that actually loses
      // money - if the first /finish call reached the server and only its
      // RESPONSE got lost (a dropped connection does that far more often
      // than it drops the request itself), the server already marked that
      // request finished and sent both emails. Starting over would finish a
      // second, brand new request and send both emails again. /finish is
      // itself safe to call twice for the SAME id (the server no-ops a
      // second call), so resuming is always the right move once we have one.
      // ...but only while the words and details are the ones that request carries
      // (bug hunt 2026-10-09): a visitor who fixes a mistyped email or rewrites the
      // message after a failed Send gets a new request with what they see now.
      var sentShape = JSON.stringify([contact, message, pickedTools(), via]);
      if (state.pending && state.pending.shape !== sentShape) state.pending = null;
      var resuming = !!state.pending;
      var startPromise = resuming
        ? Promise.resolve({ status: 200, data: { ok: true, id: state.pending.id, finishKey: state.pending.finishKey, uploads: state.pending.uploads } })
        : turnstileTokenWhenReady(TS_WAIT_MS).then(function (token) {
          return postJson('/demo-request/start', {
            contact: contact,
            message: message,
            memo: memoMeta,
            files: filesMeta,
            tools: pickedTools(),
            turnstile: token,
            website: trap.value,
            loadedAt: LOADED_AT,
            source: sourceTags(),
          });
        });

      startPromise.then(function (res) {
        if (res.status === 429) { state.sending = false; turnstileReset(); tell('booking-fail'); showDayLimit(); return; }
        // 400: something in the request the server will never take (an old page, a
        // rule the browser missed). Pressing Send again cannot help, so it gets the
        // refusal note with its two ways out, not "check your connection".
        if (res.status === 403 || res.status === 400) { state.sending = false; turnstileReset(); updateSendEnabled(); tell('booking-fail'); showRefused(); return; }
        if (res.status !== 200 || !res.data || !res.data.ok) throw new Error('start ' + res.status);

        var id = res.data.id, finishKey = res.data.finishKey, uploads = res.data.uploads || [];
        if (!resuming) state.pending = { id: id, finishKey: finishKey, uploads: uploads, done: {}, shape: sentShape };
        var pending = state.pending;

        var puts = uploads.map(function (u) {
          if (pending.done[u.slot]) return Promise.resolve(); // this slot already made it up on an earlier attempt
          var plan = slotsPlan[u.slot];
          if (!plan) return Promise.resolve();
          return putBytes('/demo-request/upload?id=' + encodeURIComponent(id) + '&slot=' + u.slot + '&key=' + encodeURIComponent(u.key), plan.blob)
            .then(function (status) { if (status === 200) pending.done[u.slot] = true; })
            .catch(function (err) { if (window.console) console.error('demo upload failed:', err); });
        });

        return Promise.all(puts).then(function () {
          // A memo or file that did not make it up is not silently dropped:
          // the visitor is told and Send tries again, re-sending only what is
          // missing. If it fails a second time the request is finished anyway,
          // so we still get their name, email and message, and the email to
          // admin@ lists what did not arrive - better than a visitor stuck on
          // an error with nothing reaching us at all.
          var missing = uploads.filter(function (u) { return slotsPlan[u.slot] && !pending.done[u.slot]; });
          if (missing.length) {
            pending.misses = (pending.misses || 0) + 1;
            if (pending.misses < 2) throw new Error('upload ' + missing.length + ' missing');
          }
          return postJson('/demo-request/finish', { id: id, finishKey: finishKey });
        }).then(function (fin) {
          if (fin.status !== 200 || !fin.data || !fin.data.ok) throw new Error('finish ' + fin.status);
          state.pending = null;
          state.sent = true;
          state.sentMemoSeconds = state.memoBlob ? state.recSeconds : 0;
          state.sentMessage = !!messageBox.value.trim();
          state.sentFiles = state.files.length;
          tell('booking-saved');
          showDone();
        });
      }).catch(function (err) {
        if (window.console) console.error('demo request failed:', err);
        state.sending = false;
        turnstileReset();
        updateSendEnabled();
        tell('booking-fail');
        showNote(COPY.errNetwork);
      });
    }

    // Leaving mid-send, or with a recording that was never sent, asks first
    // (the browser's own "Leave site?" box; no words of ours).
    window.addEventListener('beforeunload', function (e) {
      if (state.sent) return;
      if (state.sending || state.recording || state.memoBlob) { e.preventDefault(); e.returnValue = ''; }
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault(); // a submit event here already passed the browser's own field validation
      send();
    });

    // Arrived from the Diagnostic result: open "Type it Instead" with their
    // words already in it (the full page only; the homepage card never reads it).
    var via = '';
    function sourceTags() { var s = utmTags(); if (via) s.via = via; return s; }
    if (!compact) {
      var handed = takePrefill();
      if (handed) {
        messageBox.value = handed.message;
        messageBox.rows = 9;   // room to read what was handed over without scrolling the box
        messageBox.hidden = false;
        via = handed.via;
        updateSendEnabled();
        // On a phone the box sits below the first screen: bring their words into view.
        var show = function () { try { messageBox.scrollIntoView({ block: 'center' }); } catch (e) { messageBox.scrollIntoView(); } };
        if (window.requestAnimationFrame) requestAnimationFrame(function () { requestAnimationFrame(show); }); else show();
      }
    }
  }

  document.querySelectorAll('[data-demo-request]').forEach(mount);
})();
