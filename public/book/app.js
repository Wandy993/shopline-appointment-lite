const $ = selector => document.querySelector(selector);
const ruleId = document.body.dataset.ruleId || '';
let rule;
let selectedTime = '';
let brand = { name: 'Appointment Lite', accentColor: '#2F6FED' };

const typeLabels = { appointment: 'Appointment', product: 'Appointment', in_store: 'In-store appointment', onsite: 'Home / onsite service', consultation: 'Consultation', class: 'Class / course', other: 'Service appointment' };

async function api(path, options = {}) {
  const response = await fetch(path, options);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(payload.message || 'Request failed.'), { status: response.status, payload });
  return payload;
}

function showError(message) {
  $('#loading').classList.add('hidden');
  $('#bookingView').classList.add('hidden');
  $('#successView').classList.add('hidden');
  $('#errorMessage').textContent = message;
  $('#errorView').classList.remove('hidden');
}

function formatNotice(minutes) {
  if (!minutes) return '';
  if (minutes % 1440 === 0) return `Book at least ${minutes / 1440} day${minutes === 1440 ? '' : 's'} ahead`;
  if (minutes % 60 === 0) return `Book at least ${minutes / 60} hour${minutes === 60 ? '' : 's'} ahead`;
  return `Book at least ${minutes} minutes ahead`;
}

function renderService(payload) {
  rule = payload.rule;
  brand = payload.brand || brand;
  document.documentElement.style.setProperty('--brand', brand.accentColor || '#2F6FED');
  document.documentElement.style.setProperty('--brand-soft', `color-mix(in srgb,${brand.accentColor || '#2F6FED'} 9%,white)`);
  $('#brandName').textContent = brand.name || 'Appointment Lite';
  $('#brandMark').textContent = (brand.name || 'A').slice(0, 1).toUpperCase();
  $('#serviceType').textContent = typeLabels[rule.serviceType] || typeLabels.other;
  $('#serviceTitle').textContent = rule.serviceTitle;
  $('#serviceDescription').textContent = rule.serviceDescription || '';
  $('#serviceDescription').classList.toggle('hidden', !rule.serviceDescription);
  $('#timezoneText').textContent = `All times use ${payload.timezone}.`;
  $('#noteLabel').textContent = rule.questionLabel || 'Anything we should know?';
  const meta = [`${rule.duration} min`, rule.location, rule.staff, rule.capacity > 1 ? `${rule.capacity} spots per time` : '', formatNotice(rule.minimumNoticeMinutes)].filter(Boolean);
  $('#serviceMeta').innerHTML = meta.map(value => `<span>${escapeHtml(value)}</span>`).join('');
  const today = payload.storeDate || new Date().toISOString().slice(0, 10);
  $('#bookingDate').min = rule.dateFrom && rule.dateFrom > today ? rule.dateFrom : today;
  const maxByWindow = rule.bookingWindowUntil || '';
  const maxDate = [rule.dateUntil, maxByWindow].filter(Boolean).sort()[0] || '';
  if (maxDate) $('#bookingDate').max = maxDate;
  $('#customQuestions').innerHTML = (rule.customQuestions || []).map((question, index) => `<label class="field"><span>${escapeHtml(question.label)}${question.required ? ' *' : ''}</span><input data-question="${escapeHtml(question.label)}" maxlength="1000" ${question.required ? 'required' : ''}></label>`).join('');
  $('#loading').classList.add('hidden');
  $('#bookingView').classList.remove('hidden');
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char]);
}

$('#bookingDate').addEventListener('change', async event => {
  selectedTime = '';
  const root = $('#timeSlots');
  root.innerHTML = '<span class="muted">Loading times…</span>';
  try {
    const payload = await api(`/api/public/availability?ruleId=${encodeURIComponent(ruleId)}&date=${encodeURIComponent(event.target.value)}`);
    root.innerHTML = payload.slots.length ? payload.slots.map(time => `<button type="button" class="time-slot" data-time="${time}" aria-pressed="false">${time}</button>`).join('') : '<span class="muted">No times available on this date.</span>';
    root.querySelectorAll('.time-slot').forEach(button => button.addEventListener('click', () => {
      selectedTime = button.dataset.time;
      root.querySelectorAll('.time-slot').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    }));
  } catch (error) { root.innerHTML = `<span class="muted">${escapeHtml(error.message)}</span>`; }
});

$('#bookingForm').addEventListener('submit', async event => {
  event.preventDefault();
  const errorBox = $('#formError');
  if (!selectedTime) { errorBox.textContent = 'Please select a time.'; errorBox.classList.remove('hidden'); return; }
  const form = new FormData(event.currentTarget);
  const submit = $('#submitBooking');
  submit.disabled = true;
  submit.textContent = 'Confirming…';
  errorBox.classList.add('hidden');
  try {
    const payload = await api('/api/public/bookings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
      ruleId, date: form.get('date'), time: selectedTime,
      customer: { name: form.get('name'), email: form.get('email'), phone: form.get('phone') },
      note: form.get('note'),
      answers: [...document.querySelectorAll('[data-question]')].map(input => ({ question: input.dataset.question, answer: input.value }))
    }) });
    $('#bookingView').classList.add('hidden');
    $('#successTitle').textContent = `${rule.serviceTitle} is confirmed.`;
    $('#successWhen').textContent = `${payload.booking.date} at ${payload.booking.time}`;
    $('#successDetails').textContent = [payload.booking.location, payload.booking.staff, payload.booking.timezone].filter(Boolean).join(' · ');
    $('#manageBooking').href = `/manage?booking=${encodeURIComponent(payload.booking.id)}#token=${encodeURIComponent(payload.booking.managementToken)}`;
    $('#successView').classList.remove('hidden');
  } catch (error) {
    errorBox.textContent = error.status === 409 ? 'That time just reached capacity. Please choose another time.' : error.message;
    errorBox.classList.remove('hidden');
    if (error.status === 409) $('#bookingDate').dispatchEvent(new Event('change'));
  } finally { submit.disabled = false; submit.textContent = 'Confirm booking'; }
});

(async () => {
  if (!/^[a-f\d]{24}$/i.test(ruleId)) return showError('This booking link is invalid.');
  try { renderService(await api(`/api/public/service?ruleId=${encodeURIComponent(ruleId)}`)); }
  catch (error) { showError(error.status === 404 ? 'This service is unavailable or paused.' : error.message); }
})();
