(() => {
  const VERSION = '0.1.1';
  const API_BASE = 'https://shopline-appointment-lite-production.up.railway.app';
  const CACHE_TTL = 5 * 60 * 1000;
  const SELECTOR = '[data-appointment-lite]:not([data-al-ready])';
  const PREFIX = '[Appointment Lite]';

  if (window.AppointmentLiteDebug?.scan) {
    console.info(PREFIX, 'Asset executed again; rescanning.', { version: window.AppointmentLiteDebug.version });
    window.AppointmentLiteDebug.scan(document);
    return;
  }

  const debug = window.AppointmentLiteDebug = {
    version: VERSION,
    apiBase: API_BASE,
    designMode: Boolean(window.Shopline?.designMode),
    widgets: [],
    scan: null,
    observer: null
  };
  const info = (message, details) => console.info(PREFIX, message, details ?? '');
  const warn = (message, details) => console.warn(PREFIX, message, details ?? '');
  const failure = (message, details) => console.error(PREFIX, message, details ?? '');

  info('Theme asset loaded.', {
    version: VERSION,
    apiBase: API_BASE,
    designMode: debug.designMode,
    globalStoreId: String(window.Shopline?.storeId || '')
  });

  function text(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char]);
  }

  function apiUrl(path, params = {}) {
    const target = new URL(path, `${API_BASE}/`);
    Object.entries(params).forEach(([key, value]) => target.searchParams.set(key, value));
    return target;
  }

  async function requestJson(target, options = {}, label = 'request') {
    const method = options.method || 'GET';
    info(`${label}: request started.`, { method, url: target.toString() });
    let response;
    try {
      response = await fetch(target, options);
    } catch (error) {
      failure(`${label}: network or CORS failure.`, { url: target.toString(), message: error.message });
      throw error;
    }
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = Object.assign(new Error(payload.message || `Request failed with HTTP ${response.status}`), { status: response.status, payload });
      warn(`${label}: API rejected the request.`, { status: response.status, error: payload.error, message: error.message, url: target.toString() });
      throw error;
    }
    info(`${label}: request succeeded.`, { status: response.status, url: target.toString() });
    return payload;
  }

  function contextFor(widget) {
    return {
      shopId: String(widget.dataset.shopId || window.Shopline?.storeId || '').trim(),
      productId: String(widget.dataset.productId || '').trim()
    };
  }

  function cachedRule(context) {
    const key = `al-rule:${context.shopId}:${context.productId}`;
    try {
      const hit = JSON.parse(localStorage.getItem(key));
      if (hit && Date.now() - hit.at < CACHE_TTL) {
        info('Rule cache hit.', { ...context, ageMs: Date.now() - hit.at });
        return Promise.resolve(hit.value);
      }
    } catch (error) {
      warn('Rule cache read failed; continuing without cache.', { message: error.message });
    }
    info('Rule cache miss.', context);
    return requestJson(apiUrl('/api/public/rule', context), {}, 'rule').then(value => {
      try { localStorage.setItem(key, JSON.stringify({ at: Date.now(), value })); }
      catch (error) { warn('Rule cache write failed.', { message: error.message }); }
      return value;
    });
  }

  function showEditorDiagnostic(widget, message) {
    if (!window.Shopline?.designMode) return;
    widget.hidden = false;
    const trigger = widget.querySelector('.al-trigger');
    if (trigger) trigger.hidden = true;
    const live = widget.querySelector('.al-live');
    if (live) live.textContent = `${PREFIX} ${message} Open the preview console for details.`;
  }

  async function init(widget) {
    widget.dataset.alReady = 'true';
    widget.dataset.alStatus = 'initializing';
    const context = contextFor(widget);
    debug.widgets.push({ element: widget, ...context });
    info('Initializing App Block.', { ...context, element: widget });

    if (!/^\d{3,32}$/.test(context.shopId)) {
      widget.dataset.alStatus = 'missing-shop-id';
      failure('App Block stopped: SHOPLINE store ID is missing or invalid.', {
        ...context,
        blockShopId: widget.dataset.shopId,
        globalStoreId: window.Shopline?.storeId
      });
      showEditorDiagnostic(widget, 'Store ID is missing.');
      return;
    }
    if (!context.productId) {
      widget.dataset.alStatus = 'missing-product-id';
      failure('App Block stopped: product.id was not rendered.', context);
      showEditorDiagnostic(widget, 'Product ID is missing.');
      return;
    }

    try {
      const payload = await cachedRule(context);
      widget.style.setProperty('--al-accent', '#166534');
      widget.hidden = false;
      widget.dataset.alStatus = 'ready';
      const trigger = widget.querySelector('.al-trigger');
      trigger.hidden = false;
      trigger.addEventListener('click', () => open(widget, payload.rule, context));
      info('App Block is visible and ready.', { ...context, ruleId: payload.rule.id, productTitle: payload.rule.productTitle });
    } catch (error) {
      widget.dataset.alStatus = error.status === 404 ? 'no-rule' : 'error';
      if (error.status === 404 && error.payload?.message === 'Store not found.') {
        warn('App Block remains hidden: this store ID is not linked to an installed app record yet.', context);
        showEditorDiagnostic(widget, 'Store metadata is not synchronized yet. Open the app admin once, then refresh this preview.');
      } else if (error.status === 404) {
        info('App Block remains hidden: no enabled rule matches this product.', context);
        showEditorDiagnostic(widget, `No enabled appointment rule matches product ${context.productId}.`);
      } else {
        failure('App Block remains hidden because initialization failed.', { ...context, status: error.status, message: error.message });
        showEditorDiagnostic(widget, 'Initialization failed.');
      }
    }
  }

  function scan(root = document) {
    const widgets = [];
    if (root instanceof Element && root.matches(SELECTOR)) widgets.push(root);
    if (root.querySelectorAll) widgets.push(...root.querySelectorAll(SELECTOR));
    if (widgets.length) info('Scanning newly rendered theme content.', { widgetCount: widgets.length });
    widgets.forEach(widget => init(widget));
  }

  debug.scan = scan;
  scan(document);

  document.addEventListener('shopline:section:load', event => {
    info('Theme editor section re-rendered; rescanning.', { detail: event.detail });
    scan(event.target);
  });
  document.addEventListener('shopline:block:select', event => {
    info('Theme editor selected a block; rescanning.', { detail: event.detail });
    scan(event.target);
  });

  debug.observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) scan(node);
      }
    }
  });
  debug.observer.observe(document.documentElement, { childList: true, subtree: true });

  function open(widget, rule, context) {
    info('Booking dialog opened.', { ...context, ruleId: rule.id });
    const dialog = document.createElement('dialog');
    dialog.className = 'al-dialog';
    const today = new Date().toISOString().slice(0, 10);
    const minDate = rule.dateFrom && rule.dateFrom > today ? rule.dateFrom : today;
    dialog.innerHTML = `<div class="al-head"><div><h2>Book an appointment</h2><p>${text(rule.productTitle)}</p></div><button class="al-close" type="button" aria-label="Close">×</button></div><form class="al-form"><div class="al-meta">${rule.duration} minutes${rule.location ? ` · ${text(rule.location)}` : ''}${rule.staff ? ` · ${text(rule.staff)}` : ''}</div><div class="al-grid"><div class="al-field"><label for="al-date">Date</label><input id="al-date" name="date" type="date" min="${minDate}" ${rule.dateUntil ? `max="${rule.dateUntil}"` : ''} required></div><div><span class="al-legend">Time</span><div class="al-times"><span class="al-muted">Choose a date first.</span></div></div></div><div class="al-grid"><div class="al-field"><label for="al-name">Name</label><input id="al-name" name="name" autocomplete="name" maxlength="120" required></div><div class="al-field"><label for="al-email">Email</label><input id="al-email" name="email" type="email" autocomplete="email" maxlength="254" required></div></div><div class="al-field"><label for="al-phone">Phone (optional)</label><input id="al-phone" name="phone" type="tel" autocomplete="tel" maxlength="40"></div><div class="al-field"><label for="al-note">${text(rule.questionLabel || 'Anything we should know?')}</label><textarea id="al-note" name="note" maxlength="2000"></textarea></div><div class="al-questions"></div><div class="al-error" hidden role="alert"></div><button class="al-submit" type="submit">Confirm booking</button></form>`;
    const questions = dialog.querySelector('.al-questions');
    (rule.customQuestions || []).forEach((question, index) => {
      questions.insertAdjacentHTML('beforeend', `<div class="al-field"><label for="al-q-${index}">${text(question.label)}</label><input id="al-q-${index}" data-question="${text(question.label)}" maxlength="1000" ${question.required ? 'required' : ''}></div>`);
    });
    document.body.append(dialog);
    dialog.showModal();
    dialog.querySelector('.al-close').addEventListener('click', () => dialog.close());
    dialog.addEventListener('close', () => dialog.remove());
    dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
    const dateInput = dialog.querySelector('[name=date]');
    const times = dialog.querySelector('.al-times');
    let selectedTime = '';

    dateInput.addEventListener('change', async () => {
      selectedTime = '';
      times.innerHTML = '<span class="al-muted">Loading times…</span>';
      info('Loading availability.', { ...context, date: dateInput.value });
      try {
        const payload = await requestJson(apiUrl('/api/public/availability', { ...context, date: dateInput.value }), {}, 'availability');
        times.innerHTML = payload.slots.length ? payload.slots.map(time => `<button type="button" class="al-time" data-time="${time}" aria-pressed="false">${time}</button>`).join('') : '<span class="al-muted">No times available on this date.</span>';
        times.querySelectorAll('.al-time').forEach(button => button.addEventListener('click', () => {
          selectedTime = button.dataset.time;
          times.querySelectorAll('.al-time').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
        }));
        info('Availability rendered.', { ...context, date: dateInput.value, slotCount: payload.slots.length });
      } catch (error) {
        times.innerHTML = '<span class="al-muted">Could not load times. Please try another date.</span>';
        failure('Availability could not be rendered.', { ...context, date: dateInput.value, status: error.status, message: error.message });
      }
    });

    dialog.querySelector('form').addEventListener('submit', async event => {
      event.preventDefault();
      const errorBox = dialog.querySelector('.al-error');
      errorBox.hidden = true;
      if (!selectedTime) {
        errorBox.textContent = 'Please select a time.';
        errorBox.hidden = false;
        return;
      }
      const form = new FormData(event.currentTarget);
      const submit = dialog.querySelector('.al-submit');
      submit.disabled = true;
      submit.textContent = 'Confirming…';
      const body = {
        shopId: context.shopId,
        productId: context.productId,
        date: form.get('date'),
        time: selectedTime,
        customer: { name: form.get('name'), email: form.get('email'), phone: form.get('phone') },
        note: form.get('note'),
        answers: [...dialog.querySelectorAll('[data-question]')].map(input => ({ question: input.dataset.question, answer: input.value }))
      };
      info('Submitting booking.', { ...context, date: body.date, time: body.time });
      try {
        const payload = await requestJson(apiUrl('/api/public/bookings'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }, 'booking');
        dialog.querySelector('.al-form').innerHTML = `<div class="al-success"><h3>Appointment confirmed</h3><p>${text(payload.booking.date)} at ${text(payload.booking.time)}</p>${payload.booking.location ? `<p>${text(payload.booking.location)}</p>` : ''}<button class="al-submit" type="button">Done</button></div>`;
        dialog.querySelector('.al-submit').addEventListener('click', () => dialog.close());
        info('Booking confirmed.', { ...context, bookingId: payload.booking.id, date: payload.booking.date, time: payload.booking.time });
      } catch (error) {
        errorBox.textContent = error.status === 409 ? 'That time was just booked. Please choose another time.' : error.message;
        errorBox.hidden = false;
        if (error.status === 409) dateInput.dispatchEvent(new Event('change'));
        submit.disabled = false;
        submit.textContent = 'Confirm booking';
        failure('Booking submission failed.', { ...context, date: body.date, time: body.time, status: error.status, message: error.message });
      }
    });
  }
})();
