(() => {
  const CACHE_TTL = 5 * 60 * 1000;
  const widgets = document.querySelectorAll('[data-appointment-lite]:not([data-al-ready])');
  widgets.forEach(init);

  function text(value) { return String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'})[char]); }
  function url(base, path, params = {}) {
    const target = new URL(path, base.endsWith('/') ? base : `${base}/`);
    Object.entries(params).forEach(([key, value]) => target.searchParams.set(key, value));
    return target;
  }
  async function json(target, options) {
    const response = await fetch(target, options);
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw Object.assign(new Error(payload.message || 'Request failed'), { status: response.status });
    return payload;
  }
  function cachedRule(base, shop, productId) {
    const key = `al-rule:${shop}:${productId}`;
    try { const hit = JSON.parse(localStorage.getItem(key)); if (hit && Date.now() - hit.at < CACHE_TTL) return hit.value; } catch {}
    return json(url(base, '/api/public/rule', { shop, productId })).then(value => { try { localStorage.setItem(key, JSON.stringify({ at: Date.now(), value })); } catch {} return value; });
  }

  async function init(widget) {
    widget.dataset.alReady = 'true';
    const base = widget.dataset.apiBase?.replace(/\/$/, '');
    const shop = widget.dataset.shopHandle?.trim().toLowerCase();
    const productId = widget.dataset.productId?.trim();
    if (!/^https:\/\//.test(base || '') || !shop || !productId) return;
    try {
      const payload = await cachedRule(base, shop, productId);
      widget.style.setProperty('--al-accent', widget.dataset.accentColor || '#166534');
      widget.hidden = false;
      widget.querySelector('.al-trigger').addEventListener('click', () => open(widget, payload.rule, { base, shop, productId }));
    } catch (error) {
      if (error.status !== 404) widget.querySelector('.al-live').textContent = 'Appointments are temporarily unavailable.';
    }
  }

  function open(widget, rule, context) {
    const dialog = document.createElement('dialog'); dialog.className = 'al-dialog';
    const today = new Date().toISOString().slice(0, 10);
    const minDate = rule.dateFrom && rule.dateFrom > today ? rule.dateFrom : today;
    dialog.innerHTML = `<div class="al-head"><div><h2>${text(widget.dataset.heading || 'Book an appointment')}</h2><p>${text(rule.productTitle)}</p></div><button class="al-close" type="button" aria-label="Close">×</button></div><form class="al-form"><div class="al-meta">${rule.duration} minutes${rule.location ? ` · ${text(rule.location)}` : ''}${rule.staff ? ` · ${text(rule.staff)}` : ''}</div><div class="al-grid"><div class="al-field"><label for="al-date">Date</label><input id="al-date" name="date" type="date" min="${minDate}" ${rule.dateUntil ? `max="${rule.dateUntil}"` : ''} required></div><div><span class="al-legend">Time</span><div class="al-times"><span class="al-muted">Choose a date first.</span></div></div></div><div class="al-grid"><div class="al-field"><label for="al-name">Name</label><input id="al-name" name="name" autocomplete="name" maxlength="120" required></div><div class="al-field"><label for="al-email">Email</label><input id="al-email" name="email" type="email" autocomplete="email" maxlength="254" required></div></div><div class="al-field"><label for="al-phone">Phone (optional)</label><input id="al-phone" name="phone" type="tel" autocomplete="tel" maxlength="40"></div><div class="al-field"><label for="al-note">${text(rule.questionLabel || 'Anything we should know?')}</label><textarea id="al-note" name="note" maxlength="2000"></textarea></div><div class="al-questions"></div><div class="al-error" hidden role="alert"></div><button class="al-submit" type="submit">Confirm booking</button></form>`;
    const questions = dialog.querySelector('.al-questions');
    (rule.customQuestions || []).forEach((question, index) => { questions.insertAdjacentHTML('beforeend', `<div class="al-field"><label for="al-q-${index}">${text(question.label)}</label><input id="al-q-${index}" data-question="${text(question.label)}" maxlength="1000" ${question.required ? 'required' : ''}></div>`); });
    document.body.append(dialog); dialog.showModal();
    dialog.querySelector('.al-close').addEventListener('click', () => dialog.close());
    dialog.addEventListener('close', () => dialog.remove());
    dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
    const dateInput = dialog.querySelector('[name=date]'); const times = dialog.querySelector('.al-times'); let selectedTime = '';
    dateInput.addEventListener('change', async () => {
      selectedTime = ''; times.innerHTML = '<span class="al-muted">Loading times…</span>';
      try {
        const payload = await json(url(context.base, '/api/public/availability', { shop: context.shop, productId: context.productId, date: dateInput.value }));
        times.innerHTML = payload.slots.length ? payload.slots.map(time => `<button type="button" class="al-time" data-time="${time}" aria-pressed="false">${time}</button>`).join('') : '<span class="al-muted">No times available on this date.</span>';
        times.querySelectorAll('.al-time').forEach(button => button.addEventListener('click', () => { selectedTime = button.dataset.time; times.querySelectorAll('.al-time').forEach(item => item.setAttribute('aria-pressed', String(item === button))); }));
      } catch (error) { times.innerHTML = '<span class="al-muted">Could not load times. Please try another date.</span>'; }
    });
    dialog.querySelector('form').addEventListener('submit', async event => {
      event.preventDefault(); const errorBox = dialog.querySelector('.al-error'); errorBox.hidden = true;
      if (!selectedTime) { errorBox.textContent = 'Please select a time.'; errorBox.hidden = false; return; }
      const form = new FormData(event.currentTarget); const submit = dialog.querySelector('.al-submit'); submit.disabled = true; submit.textContent = 'Confirming…';
      const body = { shop: context.shop, productId: context.productId, date: form.get('date'), time: selectedTime, customer: { name: form.get('name'), email: form.get('email'), phone: form.get('phone') }, note: form.get('note'), answers: [...dialog.querySelectorAll('[data-question]')].map(input => ({ question: input.dataset.question, answer: input.value })) };
      try {
        const payload = await json(url(context.base, '/api/public/bookings'), { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) });
        dialog.querySelector('.al-form').innerHTML = `<div class="al-success"><h3>Appointment confirmed</h3><p>${text(payload.booking.date)} at ${text(payload.booking.time)}</p>${payload.booking.location ? `<p>${text(payload.booking.location)}</p>` : ''}<button class="al-submit" type="button">Done</button></div>`;
        dialog.querySelector('.al-submit').addEventListener('click', () => dialog.close());
      } catch (error) {
        errorBox.textContent = error.status === 409 ? 'That time was just booked. Please choose another time.' : error.message; errorBox.hidden = false;
        if (error.status === 409) dateInput.dispatchEvent(new Event('change')); submit.disabled = false; submit.textContent = 'Confirm booking';
      }
    });
  }
})();
