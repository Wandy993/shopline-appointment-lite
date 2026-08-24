const state = { csrf: '', shop: null, email: null, rules: [], bookings: [], products: [] };
const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];

async function api(path, options = {}) {
  const response = await fetch(`/api/admin${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(state.csrf ? { 'X-CSRF-Token': state.csrf } : {}), ...(options.headers || {}) }
  });
  if (response.status === 204) return null;
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || 'Request failed');
  return payload;
}

function escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'})[char]); }
function toast(message, type = 'success') {
  const item = document.createElement('div'); item.className = `toast ${type}`; item.textContent = message;
  $('#toastRegion').append(item); setTimeout(() => item.remove(), 4500);
}
function showError(error) { toast(error.message || String(error), 'error'); }

function switchView(name) {
  $$('.view').forEach(view => view.classList.add('hidden'));
  $(`#${name}View`).classList.remove('hidden');
  $$('.nav-item').forEach(button => button.classList.toggle('active', button.dataset.view === name));
  if (name === 'rules') loadRules();
  if (name === 'bookings') loadBookings();
}

function renderSchedule(values = []) {
  $('#weeklySchedule').innerHTML = days.map((day, weekday) => {
    const current = values.find(value => value.weekday === weekday);
    const window = current?.windows?.[0] || { start: '09:00', end: '17:00' };
    return `<div class="schedule-row" data-weekday="${weekday}"><label><input type="checkbox" ${current?.enabled ? 'checked' : ''}>${day}</label><input type="time" value="${escapeHtml(window.start)}" aria-label="${day} start"><input type="time" value="${escapeHtml(window.end)}" aria-label="${day} end"></div>`;
  }).join('');
}

function addQuestion(question = {}) {
  if ($$('.question-row').length >= 5) return;
  const row = document.createElement('div'); row.className = 'question-row';
  row.innerHTML = `<input type="text" maxlength="120" placeholder="Question" value="${escapeHtml(question.label || '')}"><label><input type="checkbox" ${question.required ? 'checked' : ''}> Required</label><button type="button" class="secondary small">Remove</button>`;
  row.querySelector('button').addEventListener('click', () => row.remove()); $('#questions').append(row);
}

async function ensureProducts() {
  if (state.products.length) return;
  const select = $('#productSelect');
  try {
    const payload = await api('/products'); state.products = payload.products;
    select.innerHTML = '<option value="">Select a product</option>' + state.products.map(product => `<option value="${escapeHtml(product.id)}" data-title="${escapeHtml(product.title)}" data-handle="${escapeHtml(product.handle)}">${escapeHtml(product.title)}</option>`).join('');
  } catch (error) { select.innerHTML = '<option value="">Could not load products</option>'; showError(error); }
}

async function openRule(rule = null) {
  $('#ruleForm').reset(); $('#ruleId').value = rule?._id || ''; $('#ruleDialogTitle').textContent = rule ? 'Edit appointment rule' : 'New appointment rule';
  $('#questions').innerHTML = ''; $('#formError').classList.add('hidden');
  renderSchedule(rule?.weeklyAvailability || [{weekday:1,enabled:true,windows:[{start:'09:00',end:'17:00'}]},{weekday:2,enabled:true,windows:[{start:'09:00',end:'17:00'}]},{weekday:3,enabled:true,windows:[{start:'09:00',end:'17:00'}]},{weekday:4,enabled:true,windows:[{start:'09:00',end:'17:00'}]},{weekday:5,enabled:true,windows:[{start:'09:00',end:'17:00'}]}]);
  await ensureProducts();
  if (rule) {
    if (![...$('#productSelect').options].some(option => option.value === rule.productId)) {
      const option = new Option(rule.productTitle, rule.productId); option.dataset.title = rule.productTitle; option.dataset.handle = rule.productHandle || ''; $('#productSelect').add(option);
    }
    $('#productSelect').value = rule.productId; $('#duration').value = rule.duration; $('#buffer').value = rule.buffer;
    $('#dateFrom').value = rule.dateFrom || ''; $('#dateUntil').value = rule.dateUntil || ''; $('#location').value = rule.location || ''; $('#staff').value = rule.staff || '';
    $('#questionLabel').value = rule.questionLabel || 'Anything we should know?'; $('#enabled').checked = rule.enabled; (rule.customQuestions || []).forEach(addQuestion);
  }
  $('#ruleDialog').showModal();
}

function rulePayload() {
  const option = $('#productSelect').selectedOptions[0];
  return {
    productId: option?.value || '', productTitle: option?.dataset.title || option?.textContent || '', productHandle: option?.dataset.handle || '',
    duration: Number($('#duration').value), buffer: Number($('#buffer').value), dateFrom: $('#dateFrom').value, dateUntil: $('#dateUntil').value,
    weeklyAvailability: $$('.schedule-row').map(row => ({ weekday: Number(row.dataset.weekday), enabled: row.querySelector('input[type=checkbox]').checked, windows: [{ start: row.querySelectorAll('input[type=time]')[0].value, end: row.querySelectorAll('input[type=time]')[1].value }] })),
    location: $('#location').value, staff: $('#staff').value, questionLabel: $('#questionLabel').value, enabled: $('#enabled').checked,
    customQuestions: $$('.question-row').map(row => ({ label: row.querySelector('input[type=text]').value, required: row.querySelector('input[type=checkbox]').checked }))
  };
}

async function saveRule(event) {
  event.preventDefault(); const id = $('#ruleId').value; const button = $('#saveRule'); button.disabled = true; $('#formError').classList.add('hidden');
  try {
    await api(id ? `/rules/${id}` : '/rules', { method: id ? 'PUT' : 'POST', body: JSON.stringify(rulePayload()) });
    $('#ruleDialog').close(); toast(id ? 'Rule updated.' : 'Rule created.'); await Promise.all([loadRules(), loadBootstrap()]);
  } catch (error) { $('#formError').textContent = error.message; $('#formError').classList.remove('hidden'); }
  finally { button.disabled = false; }
}

function renderRules() {
  const root = $('#rulesList');
  if (!state.rules.length) { root.innerHTML = '<div class="empty"><strong>No appointment rules yet</strong><p>Create one to make a product bookable.</p></div>'; return; }
  root.innerHTML = state.rules.map(rule => `<div class="list-row"><div><strong>${escapeHtml(rule.productTitle)}</strong><div class="sub">${rule.duration} min · ${rule.buffer} min buffer</div></div><span>${escapeHtml(rule.staff || 'Any staff')}</span><span>${escapeHtml(rule.location || 'No location')}</span><span class="status ${rule.enabled ? 'enabled' : 'disabled'}">${rule.enabled ? 'Enabled' : 'Disabled'}</span><div class="row-actions"><button class="secondary small" data-edit="${rule._id}">Edit</button><button class="secondary small" data-delete="${rule._id}">Delete</button></div></div>`).join('');
  $$('[data-edit]').forEach(button => button.addEventListener('click', () => openRule(state.rules.find(rule => rule._id === button.dataset.edit))));
  $$('[data-delete]').forEach(button => button.addEventListener('click', () => confirmAction('Delete this rule?', 'Rules with booking history cannot be deleted. This action cannot be undone.', async () => { await api(`/rules/${button.dataset.delete}`, { method:'DELETE' }); toast('Rule deleted.'); await Promise.all([loadRules(), loadBootstrap()]); })));
}

async function loadRules() { try { state.rules = (await api('/rules')).rules; renderRules(); } catch (error) { showError(error); } }

function openBooking(booking) {
  $('#bookingId').value = booking._id;
  $('#bookingDate').value = booking.date;
  $('#bookingTime').value = booking.time;
  $('#bookingLocation').value = booking.location || '';
  $('#bookingStaff').value = booking.staff || '';
  $('#bookingDialogSummary').textContent = `${booking.productTitle} · ${booking.customer.name} · ${booking.customer.email}`;
  $('#bookingFormError').classList.add('hidden');
  $('#bookingDialog').showModal();
}

async function saveBooking(event) {
  event.preventDefault();
  const id = $('#bookingId').value;
  const button = $('#saveBooking');
  button.disabled = true;
  $('#bookingFormError').classList.add('hidden');
  try {
    const payload = await api(`/bookings/${id}`, { method: 'PUT', body: JSON.stringify({
      date: $('#bookingDate').value,
      time: $('#bookingTime').value,
      location: $('#bookingLocation').value,
      staff: $('#bookingStaff').value
    }) });
    $('#bookingDialog').close();
    toast(payload.notification?.skipped ? 'Booking updated. Email delivery is not configured.' : payload.notification?.failed ? 'Booking updated, but the customer email failed.' : 'Booking updated and customer email sent.', payload.notification?.failed ? 'error' : 'success');
    await Promise.all([loadBookings(), loadBootstrap()]);
  } catch (error) {
    $('#bookingFormError').textContent = error.message;
    $('#bookingFormError').classList.remove('hidden');
  } finally { button.disabled = false; }
}

function renderBookings() {
  const root = $('#bookingsList');
  if (!state.bookings.length) { root.innerHTML = '<div class="empty"><strong>No bookings found</strong><p>Confirmed appointments will appear here.</p></div>'; return; }
  root.innerHTML = state.bookings.map(booking => `<div class="list-row"><div><strong>${escapeHtml(booking.productTitle)}</strong><div class="sub">${escapeHtml(booking.customer.name)} · ${escapeHtml(booking.customer.email)}</div></div><span>${escapeHtml(booking.date)}<div class="sub">${escapeHtml(booking.time)}</div></span><span>${escapeHtml(booking.staff || 'Any staff')}</span><span class="status ${booking.status}">${escapeHtml(booking.status)}</span><div class="row-actions">${booking.status === 'confirmed' ? `<button class="secondary small" data-edit-booking="${booking._id}">Edit</button><button class="secondary small" data-cancel="${booking._id}">Cancel</button>` : ''}</div></div>`).join('');
  $$('[data-edit-booking]').forEach(button => button.addEventListener('click', () => openBooking(state.bookings.find(booking => booking._id === button.dataset.editBooking))));
  $$('[data-cancel]').forEach(button => button.addEventListener('click', () => confirmAction('Cancel this booking?', 'The slot will become available again and the customer will be notified when email delivery is configured.', async () => {
    const payload = await api(`/bookings/${button.dataset.cancel}/cancel`, { method:'POST', body:'{}' });
    toast(payload.notification?.skipped ? 'Booking cancelled. Email delivery is not configured.' : payload.notification?.failed ? 'Booking cancelled, but the customer email failed.' : 'Booking cancelled and customer email sent.', payload.notification?.failed ? 'error' : 'success');
    await Promise.all([loadBookings(), loadBootstrap()]);
  })));
}

async function loadBookings() { try { const filter = $('#bookingFilter').value; state.bookings = (await api(`/bookings${filter ? `?status=${filter}` : ''}`)).bookings; renderBookings(); } catch (error) { showError(error); } }

let pendingConfirm = null;
function confirmAction(title, message, action) { $('#confirmTitle').textContent = title; $('#confirmMessage').textContent = message; pendingConfirm = action; $('#confirmDialog').showModal(); }

async function loadBootstrap() {
  const payload = await api('/bootstrap'); state.csrf = payload.csrfToken; state.shop = payload.shop; state.email = payload.email;
  $('#shopBadge').textContent = `${payload.shop.handle}.myshopline.com`;
  $('#activeRuleCount').textContent = payload.stats.activeRuleCount; $('#bookingCount').textContent = payload.stats.bookingCount; $('#upcomingCount').textContent = payload.stats.upcomingCount; $('#planName').textContent = payload.limits.enforced ? payload.limits.label : 'Unlimited';
  const statusLabel = payload.email.configured ? 'Configured' : 'Not configured';
  $('#emailStatusText').textContent = `${statusLabel} · ${payload.email.provider} · ${payload.email.transport}${payload.email.reason ? ` · ${payload.email.reason}` : ''}`;
  $('#emailFromText').textContent = payload.email.from ? `Sender: ${payload.email.from}` : 'No sender address is configured.';
  $('#sendTestEmail').disabled = !payload.email.configured;
}

function bind() {
  $$('.nav-item').forEach(button => button.addEventListener('click', () => switchView(button.dataset.view)));
  $$('[data-new-rule]').forEach(button => button.addEventListener('click', () => openRule()));
  $$('[data-close-dialog]').forEach(button => button.addEventListener('click', () => $('#ruleDialog').close()));
  $$('[data-close-booking-dialog]').forEach(button => button.addEventListener('click', () => $('#bookingDialog').close()));
  $('#bookingForm').addEventListener('submit', saveBooking);
  $('#addQuestion').addEventListener('click', () => addQuestion()); $('#ruleForm').addEventListener('submit', saveRule); $('#bookingFilter').addEventListener('change', loadBookings);
  $('#confirmNo').addEventListener('click', () => { pendingConfirm = null; $('#confirmDialog').close(); });
  $('#confirmYes').addEventListener('click', async () => { const action = pendingConfirm; pendingConfirm = null; $('#confirmDialog').close(); if (action) try { await action(); } catch (error) { showError(error); } });
  $('#sendTestEmail').addEventListener('click', async () => {
    const button = $('#sendTestEmail'); button.disabled = true;
    try { const payload = await api('/email/test', { method: 'POST', body: '{}' }); toast(`Test email sent to ${payload.to}.`); }
    catch (error) { showError(error); }
    finally { button.disabled = !state.email?.configured; }
  });
}

bind(); loadBootstrap().catch(showError);
