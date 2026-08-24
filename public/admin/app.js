const state = {
  csrf: '', shop: null, email: null, emailSettings: null, rules: [], bookings: [], products: [],
  bookingFilter: '', ruleStep: 0, activeTemplate: 'confirmation', emailEditorReady: false
};
const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const viewLabels = {
  dashboard: ['Workspace', 'Overview'], rules: ['Service catalog', 'Services & rules'], bookings: ['Customer schedule', 'Bookings'],
  email: ['Customer communication', 'Email Studio'], setup: ['Configuration', 'Storefront setup']
};
const templateMeta = {
  confirmation: { label: 'Confirmation', manage: true },
  rescheduled: { label: 'Customer changed', manage: true },
  merchantUpdated: { label: 'Store changed', manage: false },
  cancelled: { label: 'Cancelled', manage: false },
  merchantNewBooking: { label: 'Merchant alert', manage: false }
};
const sample = {
  customer_name: 'Jamie Chen', customer_email: 'jamie@example.com', product_title: 'Private design consultation',
  date: '2026-09-08', time: '14:00', timezone: 'Asia/Shanghai', location: 'Main showroom', staff: 'Alex Morgan'
};
const variables = ['customer_name', 'product_title', 'date', 'time', 'timezone', 'location', 'staff', 'store_name'];
const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];

async function api(path, options = {}) {
  const response = await fetch(`/api/admin${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(state.csrf ? { 'X-CSRF-Token': state.csrf } : {}), ...(options.headers || {}) }
  });
  if (response.status === 204) return null;
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(payload.message || 'Request failed'), { status: response.status, payload });
  return payload;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char]);
}

function toast(message, type = 'success') {
  const item = document.createElement('div');
  item.className = `toast ${type}`;
  item.textContent = message;
  $('#toastRegion').append(item);
  setTimeout(() => item.remove(), 4500);
}

function showError(error) { toast(error.message || String(error), 'error'); }

function switchView(name) {
  $$('.view').forEach(view => view.classList.add('hidden'));
  $(`#${name}View`).classList.remove('hidden');
  $$('.nav-item').forEach(button => button.classList.toggle('active', button.dataset.view === name));
  $('#pageEyebrow').textContent = viewLabels[name]?.[0] || 'Workspace';
  $('#pageTitle').textContent = viewLabels[name]?.[1] || 'Appointment Lite';
  if (name === 'rules') loadRules();
  if (name === 'bookings') loadBookings();
  if (name === 'email') renderEmailStudio();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function formatDateParts(date) {
  const parsed = new Date(`${date}T12:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return { day: '--', month: '---' };
  return { day: String(parsed.getUTCDate()).padStart(2, '0'), month: parsed.toLocaleString('en', { month: 'short', timeZone: 'UTC' }) };
}

function renderDashboard(payload) {
  $('#activeRuleCount').textContent = payload.stats.activeRuleCount;
  $('#bookingCount').textContent = payload.stats.bookingCount;
  $('#upcomingCount').textContent = payload.stats.upcomingCount;
  $('#planName').textContent = payload.limits.enforced ? payload.limits.label : 'Unlimited';
  $('#ruleCountNote').textContent = `${payload.stats.ruleCount} total service rule${payload.stats.ruleCount === 1 ? '' : 's'}`;

  const upcoming = payload.nextBookings || [];
  $('#upcomingList').innerHTML = upcoming.length ? upcoming.map(booking => {
    const date = formatDateParts(booking.date);
    return `<div class="timeline-item"><div class="timeline-date"><strong>${date.day}</strong><span>${date.month}</span></div><div><strong>${escapeHtml(booking.productTitle)}</strong><span>${escapeHtml(booking.customer?.name || 'Customer')}${booking.staff ? ` · ${escapeHtml(booking.staff)}` : ''}</span></div><time>${escapeHtml(booking.time)}</time></div>`;
  }).join('') : '<div class="empty-compact">No upcoming appointments yet. Your next confirmed booking will appear here.</div>';

  const checks = [
    { done: Boolean(payload.shop.storeId), label: 'SHOPLINE store connected' },
    { done: payload.stats.activeRuleCount > 0, label: 'At least one active service rule' },
    { done: payload.email.configured, label: 'Email delivery configured' },
    { done: Boolean(payload.emailSettings?.brandName), label: 'Customer communication branded' }
  ];
  const completed = checks.filter(item => item.done).length;
  const percent = Math.round(completed / checks.length * 100);
  $('#setupPercent').textContent = `${percent}%`;
  $('#setupProgress').style.width = `${percent}%`;
  $('#setupChecklist').innerHTML = checks.map(item => `<div class="check-item ${item.done ? 'done' : ''}"><i>✓</i><span>${escapeHtml(item.label)}</span></div>`).join('');
}

function renderSchedule(values = []) {
  $('#weeklySchedule').innerHTML = days.map((day, weekday) => {
    const current = values.find(value => value.weekday === weekday);
    const window = current?.windows?.[0] || { start: '09:00', end: '17:00' };
    const enabled = Boolean(current?.enabled);
    return `<div class="schedule-row ${enabled ? 'enabled' : ''}" data-weekday="${weekday}"><label><input type="checkbox" ${enabled ? 'checked' : ''}>${day}</label><input type="time" value="${escapeHtml(window.start)}" aria-label="${day} start"><input type="time" value="${escapeHtml(window.end)}" aria-label="${day} end"></div>`;
  }).join('');
  $$('.schedule-row input[type=checkbox]').forEach(input => input.addEventListener('change', () => input.closest('.schedule-row').classList.toggle('enabled', input.checked)));
}

function addQuestion(question = {}) {
  if ($$('.question-row').length >= 5) return toast('You can add up to five custom questions.', 'error');
  const row = document.createElement('div');
  row.className = 'question-row';
  row.innerHTML = `<input type="text" maxlength="120" placeholder="Question shown to customers" value="${escapeHtml(question.label || '')}"><label><input type="checkbox" ${question.required ? 'checked' : ''}> Required</label><button type="button" class="secondary small">Remove</button>`;
  row.querySelector('button').addEventListener('click', () => row.remove());
  $('#questions').append(row);
}

function renderProductOptions(query = '') {
  const normalized = query.trim().toLowerCase();
  const matches = state.products.filter(product => !normalized || product.title.toLowerCase().includes(normalized));
  $('#productOptions').innerHTML = matches.length ? matches.map(product => `<button type="button" class="select-option ${$('#productSelect').value === product.id ? 'selected' : ''}" role="option" data-product-id="${escapeHtml(product.id)}">${escapeHtml(product.title)}</button>`).join('') : '<div class="empty-compact">No matching products</div>';
  $$('.select-option').forEach(button => button.addEventListener('click', () => selectProduct(button.dataset.productId)));
}

function selectProduct(productId) {
  const product = state.products.find(item => item.id === productId);
  $('#productSelect').value = productId || '';
  $('#productPickerLabel').textContent = product?.title || 'Select a product';
  $('#productPickerButton').classList.toggle('has-value', Boolean(product));
  $('#productPickerMenu').classList.add('hidden');
  $('#productPickerButton').setAttribute('aria-expanded', 'false');
  renderProductOptions($('#productSearch').value);
}

async function ensureProducts() {
  if (state.products.length) return;
  $('#productOptions').innerHTML = '<div class="loading">Loading products…</div>';
  try {
    state.products = (await api('/products')).products;
    renderProductOptions();
  } catch (error) {
    $('#productOptions').innerHTML = '<div class="empty-compact">Could not load products</div>';
    showError(error);
  }
}

function setRuleStep(step) {
  state.ruleStep = Math.max(0, Math.min(2, step));
  $$('[data-rule-step]').forEach(panel => panel.classList.toggle('hidden', Number(panel.dataset.ruleStep) !== state.ruleStep));
  $$('[data-rule-step-button]').forEach(button => button.classList.toggle('active', Number(button.dataset.ruleStepButton) === state.ruleStep));
  $('#ruleBack').classList.toggle('hidden', state.ruleStep === 0);
  $('#ruleNext').classList.toggle('hidden', state.ruleStep === 2);
  $('#saveRule').classList.toggle('hidden', state.ruleStep !== 2);
  const subtitles = ['Start with the product customers will book.', 'Set the store-local schedule customers can choose from.', 'Finish the customer-facing details and activate the service.'];
  $('#ruleDialogSubtitle').textContent = subtitles[state.ruleStep];
  $('#formError').classList.add('hidden');
}

function validateRuleStep(step) {
  let message = '';
  if (step === 0 && !$('#productSelect').value) message = 'Select a SHOPLINE product before continuing.';
  if (step === 0 && (!$('#duration').checkValidity() || !$('#buffer').checkValidity())) message = 'Enter a valid duration and buffer.';
  if (step === 1 && !$$('.schedule-row input[type=checkbox]').some(input => input.checked)) message = 'Enable at least one weekday.';
  if (message) {
    $('#formError').textContent = message;
    $('#formError').classList.remove('hidden');
    return false;
  }
  return true;
}

async function openRule(rule = null) {
  $('#ruleForm').reset();
  $('#ruleId').value = rule?._id || '';
  $('#ruleDialogTitle').textContent = rule ? 'Edit service rule' : 'New service rule';
  $('#questions').innerHTML = '';
  $('#productSearch').value = '';
  renderSchedule(rule?.weeklyAvailability || [1, 2, 3, 4, 5].map(weekday => ({ weekday, enabled: true, windows: [{ start: '09:00', end: '17:00' }] })));
  await ensureProducts();
  if (rule && !state.products.some(product => product.id === rule.productId)) state.products.push({ id: rule.productId, title: rule.productTitle, handle: rule.productHandle || '' });
  selectProduct(rule?.productId || '');
  if (rule) {
    $('#duration').value = rule.duration;
    $('#buffer').value = rule.buffer;
    $('#dateFrom').value = rule.dateFrom || '';
    $('#dateUntil').value = rule.dateUntil || '';
    $('#location').value = rule.location || '';
    $('#staff').value = rule.staff || '';
    $('#questionLabel').value = rule.questionLabel || 'Anything we should know?';
    $('#enabled').checked = rule.enabled;
    (rule.customQuestions || []).forEach(addQuestion);
  }
  setRuleStep(0);
  $('#ruleDialog').showModal();
}

function rulePayload() {
  const product = state.products.find(item => item.id === $('#productSelect').value);
  return {
    productId: product?.id || '', productTitle: product?.title || '', productHandle: product?.handle || '',
    duration: Number($('#duration').value), buffer: Number($('#buffer').value), dateFrom: $('#dateFrom').value, dateUntil: $('#dateUntil').value,
    weeklyAvailability: $$('.schedule-row').map(row => ({ weekday: Number(row.dataset.weekday), enabled: row.querySelector('input[type=checkbox]').checked, windows: [{ start: row.querySelectorAll('input[type=time]')[0].value, end: row.querySelectorAll('input[type=time]')[1].value }] })),
    location: $('#location').value, staff: $('#staff').value, questionLabel: $('#questionLabel').value, enabled: $('#enabled').checked,
    customQuestions: $$('.question-row').map(row => ({ label: row.querySelector('input[type=text]').value, required: row.querySelector('input[type=checkbox]').checked }))
  };
}

async function saveRule(event) {
  event.preventDefault();
  if (![0, 1, 2].every(validateRuleStep)) return;
  const id = $('#ruleId').value;
  const button = $('#saveRule');
  button.disabled = true;
  $('#formError').classList.add('hidden');
  try {
    await api(id ? `/rules/${id}` : '/rules', { method: id ? 'PUT' : 'POST', body: JSON.stringify(rulePayload()) });
    $('#ruleDialog').close();
    toast(id ? 'Service rule updated.' : 'Service rule created.');
    await Promise.all([loadRules(), loadBootstrap()]);
  } catch (error) {
    $('#formError').textContent = error.message;
    $('#formError').classList.remove('hidden');
  } finally { button.disabled = false; }
}

function renderRules() {
  const query = $('#ruleSearch').value.trim().toLowerCase();
  const rules = state.rules.filter(rule => !query || [rule.productTitle, rule.staff, rule.location].some(value => String(value || '').toLowerCase().includes(query)));
  $('#ruleResultCount').textContent = `${rules.length} service${rules.length === 1 ? '' : 's'}`;
  const root = $('#rulesList');
  if (!rules.length) {
    root.innerHTML = `<div class="panel empty"><strong>${state.rules.length ? 'No services match your search' : 'No service rules yet'}</strong><span>${state.rules.length ? 'Try a different keyword.' : 'Create a rule to make a SHOPLINE product bookable.'}</span></div>`;
    return;
  }
  root.innerHTML = rules.map(rule => `<article class="panel service-card"><div class="service-head"><div class="service-identity"><div class="service-avatar">${escapeHtml(rule.productTitle.slice(0, 1).toUpperCase())}</div><div><strong>${escapeHtml(rule.productTitle)}</strong><span>${rule.duration} min appointment · ${rule.buffer} min buffer</span></div></div><span class="status-badge ${rule.enabled ? 'enabled' : 'disabled'}">${rule.enabled ? 'Active' : 'Paused'}</span></div><div class="service-meta"><div><span>Specialist</span><strong>${escapeHtml(rule.staff || 'Any staff')}</strong></div><div><span>Location</span><strong>${escapeHtml(rule.location || 'Not set')}</strong></div><div><span>Questions</span><strong>${(rule.customQuestions || []).length} custom</strong></div></div><div class="service-actions"><button class="secondary small" data-edit="${rule._id}">Edit service</button><button class="secondary small" data-delete="${rule._id}">Delete</button></div></article>`).join('');
  $$('[data-edit]').forEach(button => button.addEventListener('click', () => openRule(state.rules.find(rule => rule._id === button.dataset.edit))));
  $$('[data-delete]').forEach(button => button.addEventListener('click', () => confirmAction('Delete this service rule?', 'Rules with booking history cannot be deleted. If customers have booked it before, pause the service instead.', 'Delete rule', async () => {
    await api(`/rules/${button.dataset.delete}`, { method: 'DELETE' });
    toast('Service rule deleted.');
    await Promise.all([loadRules(), loadBootstrap()]);
  })));
}

async function loadRules() {
  try { state.rules = (await api('/rules')).rules; renderRules(); }
  catch (error) { showError(error); }
}

function openBooking(booking) {
  $('#bookingId').value = booking._id;
  $('#bookingDate').value = booking.date;
  $('#bookingTime').value = booking.time;
  $('#bookingLocation').value = booking.location || '';
  $('#bookingStaff').value = booking.staff || '';
  $('#bookingDialogSummary').textContent = `${booking.productTitle} · ${booking.customer.name} · ${booking.customer.email}`;
  $('#bookingEditTimezone').textContent = `All date and time values use ${booking.timezone || state.shop?.timezone || 'UTC'}.`;
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
    const payload = await api(`/bookings/${id}`, { method: 'PUT', body: JSON.stringify({ date: $('#bookingDate').value, time: $('#bookingTime').value, location: $('#bookingLocation').value, staff: $('#bookingStaff').value }) });
    $('#bookingDialog').close();
    toast(payload.notification?.skipped ? 'Booking updated. Email delivery is not configured.' : payload.notification?.failed ? 'Booking updated, but the customer email failed.' : 'Booking updated and customer email sent.', payload.notification?.failed ? 'error' : 'success');
    await Promise.all([loadBookings(), loadBootstrap()]);
  } catch (error) {
    $('#bookingFormError').textContent = error.message;
    $('#bookingFormError').classList.remove('hidden');
  } finally { button.disabled = false; }
}

function renderBookings() {
  const query = $('#bookingSearch').value.trim().toLowerCase();
  const bookings = state.bookings.filter(booking => !query || [booking.productTitle, booking.customer?.name, booking.customer?.email, booking.staff, booking.location].some(value => String(value || '').toLowerCase().includes(query)));
  const root = $('#bookingsList');
  if (!bookings.length) {
    root.innerHTML = `<div class="empty"><strong>No bookings found</strong><span>${state.bookings.length ? 'Try another search.' : 'Confirmed appointments will appear here.'}</span></div>`;
    return;
  }
  root.innerHTML = bookings.map(booking => `<div class="booking-row"><div class="booking-primary"><strong>${escapeHtml(booking.productTitle)}</strong><span>${escapeHtml(booking.customer.name)} · ${escapeHtml(booking.customer.email)}</span></div><div class="booking-cell"><strong>${escapeHtml(booking.date)}</strong><span>${escapeHtml(booking.time)} · ${escapeHtml(booking.timezone || state.shop?.timezone || 'UTC')}</span></div><div class="booking-cell"><strong>${escapeHtml(booking.staff || 'Any staff')}</strong><span>${escapeHtml(booking.location || 'No location')}</span></div><span class="status-badge ${booking.status}">${escapeHtml(booking.status)}</span><div class="row-actions">${booking.status === 'confirmed' ? `<button class="secondary small" data-edit-booking="${booking._id}">Edit</button><button class="secondary small" data-cancel="${booking._id}">Cancel</button>` : ''}</div></div>`).join('');
  $$('[data-edit-booking]').forEach(button => button.addEventListener('click', () => openBooking(state.bookings.find(booking => booking._id === button.dataset.editBooking))));
  $$('[data-cancel]').forEach(button => button.addEventListener('click', () => confirmAction('Cancel this appointment?', 'The time will be released immediately. The customer will be emailed when delivery is configured.', 'Cancel booking', async () => {
    const payload = await api(`/bookings/${button.dataset.cancel}/cancel`, { method: 'POST', body: '{}' });
    toast(payload.notification?.skipped ? 'Booking cancelled. Email delivery is not configured.' : payload.notification?.failed ? 'Booking cancelled, but the customer email failed.' : 'Booking cancelled and customer email sent.', payload.notification?.failed ? 'error' : 'success');
    await Promise.all([loadBookings(), loadBootstrap()]);
  })));
}

async function loadBookings() {
  try {
    state.bookings = (await api(`/bookings${state.bookingFilter ? `?status=${state.bookingFilter}` : ''}`)).bookings;
    renderBookings();
  } catch (error) { showError(error); }
}

function clone(value) { return JSON.parse(JSON.stringify(value)); }

function storeCurrentTemplate() {
  if (!state.emailEditorReady || !state.emailSettings?.templates?.[state.activeTemplate]) return;
  state.emailSettings.templates[state.activeTemplate] = { subject: $('#templateSubject').value, heading: $('#templateHeading').value, body: $('#templateBody').value };
}

function interpolate(value) {
  const values = { ...sample, store_name: state.emailSettings?.brandName || 'Appointment Lite' };
  return String(value || '').replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (match, key) => key in values ? values[key] : match);
}

function selectTemplate(key) {
  storeCurrentTemplate();
  state.activeTemplate = key;
  $$('#templateTabs button').forEach(button => button.classList.toggle('active', button.dataset.template === key));
  const template = state.emailSettings.templates[key];
  $('#templateSubject').value = template.subject;
  $('#templateHeading').value = template.heading;
  $('#templateBody').value = template.body;
  $('#previewTemplateLabel').textContent = templateMeta[key].label;
  state.emailEditorReady = true;
  renderEmailPreview();
}

function renderTemplateTabs() {
  $('#templateTabs').innerHTML = Object.entries(templateMeta).map(([key, item]) => `<button type="button" role="tab" data-template="${key}">${escapeHtml(item.label)}</button>`).join('');
  $$('[data-template]').forEach(button => button.addEventListener('click', () => selectTemplate(button.dataset.template)));
  $('#variableChips').innerHTML = variables.map(variable => `<button type="button" data-variable="${variable}">{{${variable}}}</button>`).join('');
  $$('[data-variable]').forEach(button => button.addEventListener('click', () => {
    const input = $('#templateBody');
    const token = `{{${button.dataset.variable}}}`;
    const start = input.selectionStart;
    input.value = `${input.value.slice(0, start)}${token}${input.value.slice(input.selectionEnd)}`;
    input.focus();
    input.setSelectionRange(start + token.length, start + token.length);
    storeCurrentTemplate();
    renderEmailPreview();
  }));
}

function renderEmailPreview() {
  if (!state.emailSettings) return;
  storeCurrentTemplate();
  state.emailSettings.brandName = $('#emailBrandName').value || 'Appointment Lite';
  state.emailSettings.logoUrl = $('#emailLogoUrl').value;
  state.emailSettings.accentColor = /^#[0-9a-f]{6}$/i.test($('#emailAccentHex').value) ? $('#emailAccentHex').value.toUpperCase() : '#5B5BD6';
  const template = state.emailSettings.templates[state.activeTemplate];
  const brandName = state.emailSettings.brandName;
  const accent = state.emailSettings.accentColor;
  const logo = state.emailSettings.logoUrl ? `<img src="${escapeHtml(state.emailSettings.logoUrl)}" alt="">` : escapeHtml(brandName.slice(0, 1).toUpperCase() || 'A');
  $('#emailPreview').innerHTML = `<div class="preview-brand"><div class="preview-logo" style="background:${accent}">${logo}</div><strong>${escapeHtml(brandName)}</strong></div><div class="preview-email-card"><h2>${escapeHtml(interpolate(template.heading))}</h2><p>${escapeHtml(interpolate(template.body))}</p><div class="preview-appointment" style="border-color:${accent}33;background:${accent}0D"><strong>${escapeHtml(sample.product_title)}</strong><span class="when" style="color:${accent}">${sample.date} at ${sample.time}</span><span>Time zone: ${sample.timezone}</span><span>Location: ${sample.location}</span><span>Staff: ${sample.staff}</span></div>${templateMeta[state.activeTemplate].manage ? `<div class="preview-email-button" style="background:${accent}">Manage appointment</div>` : ''}<div class="preview-footer">Sent by ${escapeHtml(brandName)}</div></div>`;
  $('.mini-avatar').textContent = brandName.slice(0, 1).toUpperCase() || 'A';
  $('.mini-avatar').style.background = accent;
}

function renderEmailStudio() {
  if (!state.emailSettings) return;
  state.emailEditorReady = false;
  $('#emailBrandName').value = state.emailSettings.brandName;
  $('#emailLogoUrl').value = state.emailSettings.logoUrl;
  $('#emailAccentColor').value = state.emailSettings.accentColor;
  $('#emailAccentHex').value = state.emailSettings.accentColor;
  $('#emailReplyTo').value = state.emailSettings.replyToEmail;
  $('#merchantNotificationEmail').value = state.emailSettings.merchantNotificationEmail;
  selectTemplate(state.activeTemplate);
}

function emailSettingsPayload() {
  storeCurrentTemplate();
  return {
    brandName: $('#emailBrandName').value,
    logoUrl: $('#emailLogoUrl').value,
    accentColor: $('#emailAccentHex').value,
    replyToEmail: $('#emailReplyTo').value,
    merchantNotificationEmail: $('#merchantNotificationEmail').value,
    templates: state.emailSettings.templates
  };
}

async function saveEmailSettings({ silent = false } = {}) {
  const button = $('#saveEmailSettings');
  button.disabled = true;
  try {
    const payload = await api('/email/settings', { method: 'PUT', body: JSON.stringify(emailSettingsPayload()) });
    state.emailSettings = clone(payload.settings);
    renderEmailStudio();
    if (!silent) toast('Email branding and templates saved.');
    return true;
  } catch (error) {
    showError(error);
    return false;
  } finally { button.disabled = false; }
}

async function sendTest() {
  const button = $('#sendTestEmail');
  button.disabled = true;
  try {
    if (!await saveEmailSettings({ silent: true })) return;
    const payload = await api('/email/test', { method: 'POST', body: '{}' });
    toast(`Test email sent to ${payload.to}.`);
  } catch (error) { showError(error); }
  finally { button.disabled = !state.email?.configured; }
}

let pendingConfirm = null;
function confirmAction(title, message, actionLabel, action) {
  $('#confirmTitle').textContent = title;
  $('#confirmMessage').textContent = message;
  $('#confirmYes').textContent = actionLabel;
  pendingConfirm = action;
  $('#confirmDialog').showModal();
}

async function loadBootstrap() {
  const payload = await api('/bootstrap');
  state.csrf = payload.csrfToken;
  state.shop = payload.shop;
  state.email = payload.email;
  state.emailSettings = clone(payload.emailSettings);
  $('#shopBadge').textContent = `${payload.shop.handle}.myshopline.com`;
  $('#timezoneBadge').textContent = payload.shop.timezone || 'UTC';
  $('#bookingTimezone').textContent = payload.shop.timezone || 'UTC';
  $('#storeAvatar').textContent = payload.shop.handle.slice(0, 1).toUpperCase();
  $('#setupStoreId').textContent = payload.shop.storeId ? `Store ID: ${payload.shop.storeId}` : 'Store ID is waiting to sync';
  const statusLabel = payload.email.configured ? 'Email delivery ready' : 'Email delivery needs attention';
  $('#emailStatusTitle').textContent = statusLabel;
  $('#emailStatusText').textContent = `${payload.email.provider} · ${payload.email.transport}${payload.email.reason ? ` · ${payload.email.reason}` : ''}`;
  $('#emailFromText').textContent = payload.email.from || 'No sender configured';
  $('#emailStatusDot').classList.toggle('ready', payload.email.configured);
  $('#sidebarProvider').textContent = payload.email.configured ? `${payload.email.provider} email ready` : 'Email not configured';
  $('#sendTestEmail').disabled = !payload.email.configured;
  renderDashboard(payload);
  renderEmailStudio();
}

function bind() {
  renderTemplateTabs();
  $$('.nav-item').forEach(button => button.addEventListener('click', () => switchView(button.dataset.view)));
  $$('[data-go-view]').forEach(button => button.addEventListener('click', () => switchView(button.dataset.goView)));
  $$('[data-new-rule]').forEach(button => button.addEventListener('click', () => openRule()));
  $$('[data-close-dialog]').forEach(button => button.addEventListener('click', () => $('#ruleDialog').close()));
  $$('[data-close-booking-dialog]').forEach(button => button.addEventListener('click', () => $('#bookingDialog').close()));
  $('#ruleForm').addEventListener('submit', saveRule);
  $('#bookingForm').addEventListener('submit', saveBooking);
  $('#addQuestion').addEventListener('click', () => addQuestion());
  $('#ruleNext').addEventListener('click', () => { if (validateRuleStep(state.ruleStep)) setRuleStep(state.ruleStep + 1); });
  $('#ruleBack').addEventListener('click', () => setRuleStep(state.ruleStep - 1));
  $$('[data-rule-step-button]').forEach(button => button.addEventListener('click', () => {
    const target = Number(button.dataset.ruleStepButton);
    if (target <= state.ruleStep || validateRuleStep(state.ruleStep)) setRuleStep(target);
  }));
  $('#productPickerButton').addEventListener('click', async () => {
    await ensureProducts();
    const menu = $('#productPickerMenu');
    menu.classList.toggle('hidden');
    $('#productPickerButton').setAttribute('aria-expanded', String(!menu.classList.contains('hidden')));
    if (!menu.classList.contains('hidden')) $('#productSearch').focus();
  });
  $('#productSearch').addEventListener('input', event => renderProductOptions(event.target.value));
  document.addEventListener('click', event => {
    if (!$('#productPicker').contains(event.target)) {
      $('#productPickerMenu').classList.add('hidden');
      $('#productPickerButton').setAttribute('aria-expanded', 'false');
    }
  });
  $('#ruleSearch').addEventListener('input', renderRules);
  $('#bookingSearch').addEventListener('input', renderBookings);
  $$('[data-booking-filter]').forEach(button => button.addEventListener('click', () => {
    state.bookingFilter = button.dataset.bookingFilter;
    $$('[data-booking-filter]').forEach(item => item.classList.toggle('active', item === button));
    loadBookings();
  }));
  $('#confirmNo').addEventListener('click', () => { pendingConfirm = null; $('#confirmDialog').close(); });
  $('#confirmYes').addEventListener('click', async () => {
    const action = pendingConfirm;
    pendingConfirm = null;
    $('#confirmDialog').close();
    if (action) try { await action(); } catch (error) { showError(error); }
  });
  $('#saveEmailSettings').addEventListener('click', () => saveEmailSettings());
  $('#sendTestEmail').addEventListener('click', sendTest);
  ['emailBrandName', 'emailLogoUrl', 'templateSubject', 'templateHeading', 'templateBody'].forEach(id => $(`#${id}`).addEventListener('input', renderEmailPreview));
  $('#emailAccentColor').addEventListener('input', event => { $('#emailAccentHex').value = event.target.value.toUpperCase(); renderEmailPreview(); });
  $('#emailAccentHex').addEventListener('input', event => { if (/^#[0-9a-f]{6}$/i.test(event.target.value)) $('#emailAccentColor').value = event.target.value; renderEmailPreview(); });
}

bind();
loadBootstrap().catch(showError);
