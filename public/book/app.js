const $ = selector => document.querySelector(selector);
const ruleId = document.body.dataset.ruleId || '';
let rule;
let selectedTime = '';
let selectedAllDayDate = '';
let selectedOccurrences = [];
let selectedStaffId = '';
let brand = { name: 'Appointment Lite', accentColor: '#2F6FED' };

const typeLabels = { appointment: 'Appointment', product: 'Appointment', in_store: 'In-store appointment', onsite: 'Home / onsite service', consultation: 'Consultation', class: 'Class / course', other: 'Service appointment' };
const modeLabels = { slot: 'Minute / hour', all_day: 'All day', multi_slot: 'Multiple sessions' };

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

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char]);
}

const staffPresetClasses = new Set(['aurora', 'ocean', 'mint', 'peach', 'violet', 'sunset', 'sky', 'rose']);
const staffAvatarPalettes = { aurora:['#edf3ff','#5a8dff','#3e4a67','#ffd7bf'],ocean:['#e9f8ff','#25a6d9','#23455d','#f1c8ad'],mint:['#ecfbf5','#3bb89b','#385a4d','#f0c6aa'],peach:['#fff2ed','#ed7e66','#6a4038','#f4c7aa'],violet:['#f5efff','#8d73ef','#4c3d62','#e9c1ad'],sunset:['#fff4e9','#e98a45','#5d4535','#efc6a8'],sky:['#edf8ff','#57b8ef','#36536b','#f0c7ae'],rose:['#fff0f5','#ed6f91','#5b3c4d','#efc4ac'] };
function staffPresetSvg(preset){const [bg,shirt,hair,skin]=staffAvatarPalettes[preset]||staffAvatarPalettes.aurora;return `<svg viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="18" fill="${bg}"/><path d="M12 64c2-15 10-23 20-23s18 8 20 23" fill="${shirt}"/><circle cx="32" cy="27" r="13" fill="${skin}"/><path d="M19 27c0-10 5-17 14-17 7 0 13 5 13 14-5-1-9-4-12-8-3 5-8 8-15 8z" fill="${hair}"/><circle cx="27" cy="28" r="1.2" fill="#43505f"/><circle cx="37" cy="28" r="1.2" fill="#43505f"/><path d="M28 34c2.5 2 5.5 2 8 0" stroke="#a36c5b" stroke-width="1.4" stroke-linecap="round" fill="none"/></svg>`;}

function staffAvatarMarkup(item, className = '') {
  const avatar = item?.avatar || {};
  const initial = escapeHtml(String(item?.name || '?').trim().slice(0, 1).toUpperCase() || '?');
  if (avatar.kind === 'custom' && /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(String(avatar.value || ''))) {
    return `<span class="staff-avatar customer ${className}"><img src="${escapeHtml(avatar.value)}" alt=""></span>`;
  }
  if (avatar.kind === 'initials') return `<span class="staff-avatar customer initials ${className}">${initial}</span>`;
  const preset = staffPresetClasses.has(avatar.value) ? avatar.value : 'aurora';
  return `<span class="staff-avatar customer preset-${preset} ${className}">${staffPresetSvg(preset)}</span>`;
}

function setStaffPickerValue(item = null) {
  const value = $('#staffPickerValue');
  if (!value) return;
  value.innerHTML = item
    ? `${staffAvatarMarkup(item, 'small')}<span><strong>${escapeHtml(item.name)}</strong><small>Selected staff member</small></span>`
    : `<span class="staff-avatar customer small initials">?</span><span><strong>Choose staff</strong><small>Select a team member</small></span>`;
}

function renderStaffPicker(options = []) {
  const menu = $('#staffPickerMenu');
  if (!menu) return;
  menu.innerHTML = options.length ? options.map(item => `<button type="button" class="staff-picker-option" role="option" data-staff-id="${escapeHtml(item.id)}">${staffAvatarMarkup(item, 'small')}<span><strong>${escapeHtml(item.name)}</strong><small>View this staff member's availability</small></span><i>✓</i></button>`).join('') : '<div class="staff-picker-empty">No staff available for this service.</div>';
  menu.querySelectorAll('[data-staff-id]').forEach(button => button.addEventListener('click', async () => {
    const item = options.find(option => String(option.id) === button.dataset.staffId);
    selectedStaffId = item?.id || '';
    $('#staffSelect').value = selectedStaffId;
    selectedTime = '';
    selectedAllDayDate = '';
    selectedOccurrences = [];
    renderSelectedSessions();
    setStaffPickerValue(item || null);
    menu.classList.add('hidden');
    $('#staffPickerButton').setAttribute('aria-expanded', 'false');
    menu.querySelectorAll('[data-staff-id]').forEach(option => option.classList.toggle('selected', option.dataset.staffId === selectedStaffId));
    if ($('#bookingDate').value) await loadAvailability($('#bookingDate').value);
  }));
}

function emptyAvailabilityMessage(payload = {}) {
  const reason = String(payload.reason || '');
  if (reason === 'SERVICE_CLOSED') return 'This service is not available on this date. Staff special hours do not open a closed service date.';
  if (reason === 'POLICY_BLOCKED') return 'This date is outside the service booking notice or booking window.';
  if (reason === 'CAPACITY_FULL') return 'This date is fully booked.';
  if (reason === 'STAFF_UNAVAILABLE') return "The selected staff member is not available during this service's bookable times on this date.";
  if (reason === 'STAFF_SELECTION_REQUIRED') return 'Choose a staff member to see availability.';
  return 'No times available on this date.';
}

function bookingMode() { return ['slot', 'all_day', 'multi_slot'].includes(rule?.bookingMode) ? rule.bookingMode : 'slot'; }
function occurrenceKey(item) { return `${item.date}T${item.time}`; }

function formatBookingWhen(booking) {
  const mode = booking.bookingMode || bookingMode();
  const occurrences = booking.occurrences || [];
  if (mode === 'all_day') return `${booking.date} · All day`;
  if (mode === 'multi_slot') return occurrences.map(item => `${item.date} ${item.time}`).join(' · ');
  return `${booking.date} at ${booking.time}`;
}

function renderSelectedSessions() {
  const root = $('#selectedSessions');
  if (bookingMode() !== 'multi_slot') { root.classList.add('hidden'); return; }
  root.classList.remove('hidden');
  const required = Number(rule.sessionsRequired || 3);
  root.innerHTML = `<div class="selected-session-head"><strong>Selected sessions</strong><span>${selectedOccurrences.length} / ${required}</span></div><div class="selected-session-list">${selectedOccurrences.length ? selectedOccurrences.map(item => `<button type="button" class="selected-session" data-remove-session="${escapeHtml(occurrenceKey(item))}"><span>${escapeHtml(item.date)} · ${escapeHtml(item.time)}</span><i>×</i></button>`).join('') : '<span class="muted">Choose dates and time slots until your package is complete.</span>'}</div>`;
  root.querySelectorAll('[data-remove-session]').forEach(button => button.addEventListener('click', () => {
    selectedOccurrences = selectedOccurrences.filter(item => occurrenceKey(item) !== button.dataset.removeSession);
    renderSelectedSessions();
    renderCurrentTimeSelection();
  }));
}

function renderCurrentTimeSelection() {
  if (bookingMode() !== 'multi_slot') return;
  $('#timeSlots').querySelectorAll('.time-slot').forEach(button => {
    const key = `${$('#bookingDate').value}T${button.dataset.time}`;
    button.setAttribute('aria-pressed', String(selectedOccurrences.some(item => occurrenceKey(item) === key)));
  });
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
  const mode = bookingMode();
  $('#timezoneText').textContent = mode === 'all_day' ? `Dates use ${payload.timezone}.` : `All times use ${payload.timezone}.`;
  $('#noteLabel').textContent = rule.questionLabel || 'Anything we should know?';
  const modeMeta = mode === 'all_day' ? 'All-day booking' : mode === 'multi_slot' ? `${rule.sessionsRequired || 3} sessions per booking` : `${rule.duration} min`;
  const staffMode = rule.staffAssignment?.mode || 'none';
  const staffOptions = Array.isArray(rule.staffOptions) ? rule.staffOptions : [];
  const managedStaffMeta = staffMode === 'fixed' && staffOptions[0] ? staffOptions[0].name : staffMode === 'any' ? 'Assigned automatically' : '';
  const meta = [modeMeta, rule.location, managedStaffMeta || rule.staff, rule.capacity > 1 ? `${rule.capacity} ${mode === 'all_day' ? 'bookings per day' : 'spots per time'}` : '', formatNotice(rule.minimumNoticeMinutes)].filter(Boolean);
  $('#serviceMeta').innerHTML = meta.map(value => `<span>${escapeHtml(value)}</span>`).join('');
  const today = payload.storeDate || new Date().toISOString().slice(0, 10);
  $('#bookingDate').min = rule.dateFrom && rule.dateFrom > today ? rule.dateFrom : today;
  const maxByWindow = rule.bookingWindowUntil || '';
  const maxDate = [rule.dateUntil, maxByWindow].filter(Boolean).sort()[0] || '';
  if (maxDate) $('#bookingDate').max = maxDate;
  $('#customQuestions').innerHTML = (rule.customQuestions || []).map(question => `<label class="field"><span>${escapeHtml(question.label)}${question.required ? ' *' : ''}</span><input data-question="${escapeHtml(question.label)}" maxlength="1000" ${question.required ? 'required' : ''}></label>`).join('');
  const staffField = $('#staffField');
  const staffSelect = $('#staffSelect');
  staffField.classList.toggle('hidden', staffMode !== 'customer_choice');
  selectedStaffId = '';
  staffSelect.value = '';
  setStaffPickerValue(null);
  renderStaffPicker(staffOptions);

  if (mode === 'all_day') {
    $('#scheduleHeading').textContent = 'Choose a day';
    $('#timeLabel').textContent = 'Availability';
    $('#timeSlots').innerHTML = '<span class="muted">Choose a date to check availability.</span>';
  } else if (mode === 'multi_slot') {
    $('#scheduleHeading').textContent = `Choose ${rule.sessionsRequired || 3} sessions`;
    $('#timeLabel').textContent = 'Available times';
    $('#timeSlots').innerHTML = '<span class="muted">Choose a date, then add a session.</span>';
    renderSelectedSessions();
  }
  $('#loading').classList.add('hidden');
  $('#bookingView').classList.remove('hidden');
}

async function loadAvailability(date) {
  const root = $('#timeSlots');
  root.innerHTML = `<span class="muted">${bookingMode() === 'all_day' ? 'Checking date…' : 'Loading times…'}</span>`;
  try {
    const staffQuery = selectedStaffId ? `&staffId=${encodeURIComponent(selectedStaffId)}` : '';
    const selectedQuery = bookingMode() === 'multi_slot' && selectedOccurrences.length ? `&selected=${encodeURIComponent(selectedOccurrences.map(item => `${item.date}T${item.time}`).join(','))}` : '';
    const payload = await api(`/api/public/availability?ruleId=${encodeURIComponent(ruleId)}&date=${encodeURIComponent(date)}${staffQuery}${selectedQuery}`);
    if (payload.requiresStaffSelection) { root.innerHTML = '<span class="muted">Choose a staff member first.</span>'; return; }
    if (bookingMode() === 'all_day') {
      selectedAllDayDate = payload.available ? date : '';
      root.innerHTML = payload.available
        ? `<div class="all-day-available"><strong>Available all day</strong><span>${payload.remaining > 1 ? `${payload.remaining} bookings remaining` : 'This date can be booked'}</span></div>`
        : `<span class="muted">${escapeHtml(emptyAvailabilityMessage(payload))}</span>`;
      return;
    }
    root.innerHTML = payload.slots.length ? payload.slots.map(time => `<button type="button" class="time-slot" data-time="${time}" aria-pressed="false">${time}</button>`).join('') : `<span class="muted">${escapeHtml(emptyAvailabilityMessage(payload))}</span>`;
    root.querySelectorAll('.time-slot').forEach(button => button.addEventListener('click', async () => {
      if (bookingMode() === 'multi_slot') {
        const item = { date, time: button.dataset.time };
        const key = occurrenceKey(item);
        const exists = selectedOccurrences.some(current => occurrenceKey(current) === key);
        if (exists) selectedOccurrences = selectedOccurrences.filter(current => occurrenceKey(current) !== key);
        else if (selectedOccurrences.length < Number(rule.sessionsRequired || 3)) selectedOccurrences.push(item);
        selectedOccurrences.sort((a, b) => occurrenceKey(a).localeCompare(occurrenceKey(b)));
        renderSelectedSessions();
        renderCurrentTimeSelection();
        await loadAvailability(date);
      } else {
        selectedTime = button.dataset.time;
        root.querySelectorAll('.time-slot').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
      }
    }));
    renderCurrentTimeSelection();
  } catch (error) { root.innerHTML = `<span class="muted">${escapeHtml(error.message)}</span>`; }
}

$('#staffPickerButton').addEventListener('click', () => {
  const menu = $('#staffPickerMenu');
  const open = menu.classList.toggle('hidden') === false;
  $('#staffPickerButton').setAttribute('aria-expanded', String(open));
});

document.addEventListener('click', event => {
  const picker = $('#staffPicker');
  if (picker && !picker.contains(event.target)) {
    $('#staffPickerMenu').classList.add('hidden');
    $('#staffPickerButton').setAttribute('aria-expanded', 'false');
  }
});

$('#bookingDate').addEventListener('change', async event => {
  selectedTime = '';
  if (bookingMode() === 'all_day') selectedAllDayDate = '';
  await loadAvailability(event.target.value);
});

$('#bookingForm').addEventListener('submit', async event => {
  event.preventDefault();
  const errorBox = $('#formError');
  const mode = bookingMode();
  if ((rule.staffAssignment?.mode || 'none') === 'customer_choice' && !selectedStaffId) { errorBox.textContent = 'Please choose a staff member.'; errorBox.classList.remove('hidden'); return; }
  if (mode === 'slot' && !selectedTime) { errorBox.textContent = 'Please select a time.'; errorBox.classList.remove('hidden'); return; }
  if (mode === 'all_day' && !selectedAllDayDate) { errorBox.textContent = 'Please choose an available date.'; errorBox.classList.remove('hidden'); return; }
  if (mode === 'multi_slot' && selectedOccurrences.length !== Number(rule.sessionsRequired || 3)) { errorBox.textContent = `Please select exactly ${rule.sessionsRequired || 3} sessions.`; errorBox.classList.remove('hidden'); return; }
  const form = new FormData(event.currentTarget);
  const submit = $('#submitBooking');
  submit.disabled = true;
  submit.textContent = 'Confirming…';
  errorBox.classList.add('hidden');
  try {
    const body = {
      ruleId,
      staffId: selectedStaffId,
      date: mode === 'multi_slot' ? selectedOccurrences[0]?.date : form.get('date'),
      time: mode === 'slot' ? selectedTime : '',
      occurrences: mode === 'multi_slot' ? selectedOccurrences : [],
      customer: { name: form.get('name'), email: form.get('email'), phone: form.get('phone') },
      note: form.get('note'),
      answers: [...document.querySelectorAll('[data-question]')].map(input => ({ question: input.dataset.question, answer: input.value }))
    };
    const payload = await api('/api/public/bookings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    $('#bookingView').classList.add('hidden');
    $('#successTitle').textContent = `${rule.serviceTitle} is confirmed.`;
    $('#successWhen').textContent = formatBookingWhen(payload.booking);
    $('#successDetails').textContent = [payload.booking.location, payload.booking.staff, payload.booking.timezone].filter(Boolean).join(' · ');
    $('#manageBooking').href = `/manage?booking=${encodeURIComponent(payload.booking.id)}#token=${encodeURIComponent(payload.booking.managementToken)}`;
    $('#successView').classList.remove('hidden');
  } catch (error) {
    errorBox.textContent = error.status === 409 ? 'One of those selections was just booked. Please choose again.' : error.message;
    errorBox.classList.remove('hidden');
    if (error.status === 409) {
      if (mode === 'multi_slot') {
        selectedOccurrences = [];
        renderSelectedSessions();
      }
      if ($('#bookingDate').value) loadAvailability($('#bookingDate').value);
    }
  } finally { submit.disabled = false; submit.textContent = 'Confirm booking'; }
});

(async function load() {
  try {
    const payload = await api(`/api/public/service?ruleId=${encodeURIComponent(ruleId)}`);
    renderService(payload);
  } catch (error) { showError(error.message); }
})();
