const $ = selector => document.querySelector(selector);
const ruleId = document.body.dataset.ruleId || '';
const entitlementToken = new URLSearchParams(window.location.search).get('access') || '';
let rule;
let selectedTime = '';
let selectedAllDayDate = '';
let selectedOccurrences = [];
let selectedStaffId = '';
let brand = { name: 'Appointment Lite', accentColor: '#2F6FED' };
const defaultStorefrontSettings = Object.freeze({
  button: { label: 'Book an appointment', backgroundColor: '#2F6FED', textColor: '#FFFFFF', width: 'content', alignment: 'left', borderRadius: 8 },
  modal: { title: 'Book an appointment', accentColor: '#2F6FED', primaryTextColor: '#FFFFFF', showServiceSummary: true, showTimezoneSelector: true, showPhone: true, showNotes: true, showFooterNote: true }
});
let storefront = defaultStorefrontSettings;

function normalizeStorefrontSettings(input = {}) {
  const hex = (value, fallback) => /^#[0-9A-Fa-f]{6}$/.test(String(value || '')) ? String(value).toUpperCase() : fallback;
  const radius = Number(input.button?.borderRadius);
  return {
    button: {
      ...defaultStorefrontSettings.button,
      ...(input.button || {}),
      backgroundColor: hex(input.button?.backgroundColor, defaultStorefrontSettings.button.backgroundColor),
      textColor: hex(input.button?.textColor, defaultStorefrontSettings.button.textColor),
      width: ['content', 'full'].includes(input.button?.width) ? input.button.width : defaultStorefrontSettings.button.width,
      alignment: ['left', 'center', 'right'].includes(input.button?.alignment) ? input.button.alignment : defaultStorefrontSettings.button.alignment,
      borderRadius: Number.isFinite(radius) ? Math.min(24, Math.max(0, Math.round(radius))) : defaultStorefrontSettings.button.borderRadius
    },
    modal: {
      ...defaultStorefrontSettings.modal,
      ...(input.modal || {}),
      accentColor: hex(input.modal?.accentColor, defaultStorefrontSettings.modal.accentColor),
      primaryTextColor: hex(input.modal?.primaryTextColor, defaultStorefrontSettings.modal.primaryTextColor),
      showServiceSummary: input.modal?.showServiceSummary !== false,
      showTimezoneSelector: input.modal?.showTimezoneSelector !== false,
      showPhone: input.modal?.showPhone !== false,
      showNotes: input.modal?.showNotes !== false,
      showFooterNote: input.modal?.showFooterNote !== false
    }
  };
}
let calendarCursor = '';
let selectedDate = '';
let minBookableDate = '';
let maxBookableDate = '';
let serviceTimezone = 'UTC';
let customerTimezone = 'UTC';
const availabilityCache = new Map();
let availabilityRequestId = 0;

const typeLabels = { appointment: 'Appointment', product: 'Appointment', in_store: 'In-store appointment', onsite: 'Home / onsite service', consultation: 'Consultation', class: 'Class / course', other: 'Service appointment' };
const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];

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


function validTimeZone(value) {
  try { new Intl.DateTimeFormat('en', { timeZone: value }).format(new Date()); return true; } catch { return false; }
}

function supportedTimeZones() {
  const common = ['UTC','Asia/Shanghai','Asia/Singapore','Asia/Tokyo','Europe/London','Europe/Paris','America/New_York','America/Chicago','America/Denver','America/Los_Angeles','Australia/Sydney'];
  let values = [];
  try { values = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : []; } catch {}
  return [...new Set([serviceTimezone, customerTimezone, ...common, ...values].filter(validTimeZone))];
}

function zonedParts(instant, timezone) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(instant).map(part => [part.type, part.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

function wallTimeToInstant(date, time, timezone) {
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  let instant = new Date(Date.UTC(year, month - 1, day, hour, minute));
  for (let i = 0; i < 3; i += 1) {
    const seen = zonedParts(instant, timezone);
    const wanted = Date.UTC(year, month - 1, day, hour, minute);
    const [seenYear, seenMonth, seenDay] = seen.date.split('-').map(Number);
    const [seenHour, seenMinute] = seen.time.split(':').map(Number);
    const seenWall = Date.UTC(seenYear, seenMonth - 1, seenDay, seenHour, seenMinute);
    const delta = wanted - seenWall;
    if (!delta) break;
    instant = new Date(instant.getTime() + delta);
  }
  return instant;
}

function displaySlot(date, time) {
  if (!date || !time || customerTimezone === serviceTimezone) return { date, time, label: time };
  const shown = zonedParts(wallTimeToInstant(date, time, serviceTimezone), customerTimezone);
  const label = shown.date === date ? shown.time : `${new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(dateFromKey(shown.date))} · ${shown.time}`;
  return { ...shown, label };
}

function displayOccurrence(item) {
  const shown = displaySlot(item.date, item.time);
  return customerTimezone === serviceTimezone ? `${item.date} · ${item.time}` : `${shown.date} · ${shown.time}`;
}

function renderTimezoneCopy() {
  const picker = $('#timezonePicker');
  if (bookingMode() === 'all_day') {
    $('#timezoneText').textContent = `Dates use the service time zone: ${serviceTimezone}.`;
    picker?.classList.add('hidden');
    return;
  }
  picker?.classList.remove('hidden');
  $('#timezonePickerValue').textContent = customerTimezone;
  $('#timezoneText').textContent = customerTimezone === serviceTimezone
    ? `Service calendar and times use ${serviceTimezone}.`
    : `Service calendar uses ${serviceTimezone}. Times are displayed in ${customerTimezone}.`;
}

function renderTimezoneOptions(query = '') {
  const root = $('#timezoneOptions');
  if (!root) return;
  const term = query.trim().toLowerCase();
  const values = supportedTimeZones().filter(value => !term || value.toLowerCase().includes(term)).slice(0, 160);
  root.innerHTML = values.length ? values.map(value => `<button type="button" class="timezone-option${value === customerTimezone ? ' selected' : ''}" data-timezone="${escapeHtml(value)}"><span>${escapeHtml(value)}</span><i>${value === customerTimezone ? '✓' : ''}</i></button>`).join('') : '<div class="timezone-empty">No matching time zones.</div>';
  root.querySelectorAll('[data-timezone]').forEach(button => button.addEventListener('click', () => {
    customerTimezone = button.dataset.timezone;
    $('#timezonePickerMenu').classList.add('hidden');
    $('#timezonePickerButton').setAttribute('aria-expanded', 'false');
    clearTimezonePosition();
    renderTimezoneCopy();
    renderTimezoneOptions();
    renderSelectedSessions();
    if (selectedDate && availabilityCache.has(availabilityKey(selectedDate))) renderAvailability(availabilityCache.get(availabilityKey(selectedDate)), selectedDate);
  }));
}

function positionTimezoneMenu() {
  const button = $('#timezonePickerButton'); const menu = $('#timezonePickerMenu');
  if (!button || !menu || menu.classList.contains('hidden') || window.matchMedia('(max-width:620px)').matches) return;
  const rect = button.getBoundingClientRect(); const width = Math.max(260, rect.width); const height = Math.min(286, Math.max(180, menu.scrollHeight || 240));
  const below = window.innerHeight - rect.bottom; const top = below >= height + 18 ? rect.bottom + 6 : Math.max(12, rect.top - height - 6);
  menu.style.left = `${Math.max(12, Math.min(window.innerWidth - width - 12, rect.left))}px`; menu.style.top = `${top}px`; menu.style.width = `${Math.min(width, window.innerWidth - 24)}px`;
}
function clearTimezonePosition(){const menu=$('#timezonePickerMenu');if(menu){menu.style.left='';menu.style.top='';menu.style.width='';}}

function setupTimezonePicker() {
  const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  customerTimezone = storefront.modal.showTimezoneSelector && validTimeZone(browserTimezone) ? browserTimezone : serviceTimezone;
  $('#timezoneNote')?.classList.toggle('hidden', !storefront.modal.showTimezoneSelector);
  renderTimezoneCopy();
  renderTimezoneOptions();
  if (!storefront.modal.showTimezoneSelector) return;
  $('#timezonePickerButton')?.addEventListener('click', () => {
    const menu = $('#timezonePickerMenu');
    const open = menu.classList.toggle('hidden') === false;
    $('#timezonePickerButton').setAttribute('aria-expanded', String(open));
    if (open) { $('#timezoneSearch').value = ''; renderTimezoneOptions(); requestAnimationFrame(positionTimezoneMenu); setTimeout(() => $('#timezoneSearch').focus(), 0); } else clearTimezonePosition();
  });
  $('#timezoneSearch')?.addEventListener('input', event => renderTimezoneOptions(event.target.value));
}

const staffPresetClasses = new Set(['aurora', 'ocean', 'mint', 'peach', 'violet', 'sunset', 'sky', 'rose', 'nova']);
const staffAvatarFiles = { aurora:'staff-1.webp', ocean:'staff-2.webp', mint:'staff-3.webp', peach:'staff-4.webp', violet:'staff-5.webp', sunset:'staff-6.webp', sky:'staff-7.webp', rose:'staff-8.webp', nova:'staff-9.webp' };
function staffPresetImage(preset){const file=staffAvatarFiles[preset]||staffAvatarFiles.aurora;return `<img src="/assets/staff/${file}?v=0.6.10" alt="" loading="lazy" decoding="async">`;}

function staffAvatarMarkup(item, className = '') {
  const avatar = item?.avatar || {};
  const initial = escapeHtml(String(item?.name || '?').trim().slice(0, 1).toUpperCase() || '?');
  if (avatar.kind === 'custom' && /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(String(avatar.value || ''))) {
    return `<span class="staff-avatar customer ${className}"><img src="${escapeHtml(avatar.value)}" alt=""></span>`;
  }
  if (avatar.kind === 'initials') return `<span class="staff-avatar customer initials ${className}">${initial}</span>`;
  const preset = staffPresetClasses.has(avatar.value) ? avatar.value : 'aurora';
  return `<span class="staff-avatar customer preset-${preset} ${className}">${staffPresetImage(preset)}</span>`;
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
    if (selectedDate) await loadAvailability(selectedDate);
  }));
}

function emptyAvailabilityMessage(payload = {}) {
  const reason = String(payload.reason || '');
  if (reason === 'SERVICE_CLOSED') return 'This service is not available on this date. Staff special hours do not open a closed service date.';
  if (reason === 'POLICY_BLOCKED') return 'This date is outside the booking notice or booking window.';
  if (reason === 'CAPACITY_FULL') return 'This date is fully booked.';
  if (reason === 'STAFF_UNAVAILABLE') return "The selected staff member is not available on this date.";
  if (reason === 'STAFF_SELECTION_REQUIRED') return 'Choose a staff member to see availability.';
  return 'No times available on this date.';
}

function bookingMode() { return ['slot', 'all_day', 'multi_slot'].includes(rule?.bookingMode) ? rule.bookingMode : 'slot'; }
function occurrenceKey(item) { return `${item.date}T${item.time}`; }

function formatBookingWhen(booking) {
  const mode = booking.bookingMode || bookingMode();
  const occurrences = booking.occurrences || [];
  if (mode === 'all_day') return `${booking.date} · All day · ${serviceTimezone}`;
  if (mode === 'multi_slot') return occurrences.map(displayOccurrence).join(' · ');
  const shown = displaySlot(booking.date, booking.time);
  return customerTimezone === serviceTimezone ? `${booking.date} at ${booking.time}` : `${shown.date} at ${shown.time} (${customerTimezone})`;
}

function dateFromKey(key) {
  const [year, month, day] = String(key || '').split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12));
}

function dateKey(date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

function monthKey(dateString) {
  const date = dateFromKey(dateString);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-01`;
}

function shiftMonth(cursor, amount) {
  const date = dateFromKey(cursor);
  date.setUTCMonth(date.getUTCMonth() + amount, 1);
  return dateKey(date);
}

function serviceOpenOnDate(date) {
  if (!rule) return false;
  if (rule.dateFrom && date < rule.dateFrom) return false;
  if (rule.dateUntil && date > rule.dateUntil) return false;
  const exception = (rule.availabilityExceptions || []).find(item => item.date === date);
  if (exception) return !exception.closed && (bookingMode() === 'all_day' || (exception.windows || []).length > 0);
  const weekday = dateFromKey(date).getUTCDay();
  const schedule = (rule.weeklyAvailability || []).find(item => Number(item.weekday) === weekday);
  return Boolean(schedule?.enabled && (bookingMode() === 'all_day' || (schedule.windows || []).length > 0));
}

function withinCalendarRange(date) {
  if (minBookableDate && date < minBookableDate) return false;
  if (maxBookableDate && date > maxBookableDate) return false;
  return true;
}

function calendarSessionCount(date) {
  if (bookingMode() !== 'multi_slot') return 0;
  return selectedOccurrences.filter(item => item.date === date).length;
}

function renderCalendar() {
  const root = $('#calendarGrid');
  if (!root || !calendarCursor) return;
  const cursor = dateFromKey(calendarCursor);
  $('#calendarTitle').textContent = `${monthNames[cursor.getUTCMonth()]} ${cursor.getUTCFullYear()}`;
  const first = new Date(cursor);
  first.setUTCDate(1 - first.getUTCDay());
  const monthIndex = cursor.getUTCMonth();
  const today = rule?.storeDate || minBookableDate;
  const cells = [];
  for (let i = 0; i < 42; i += 1) {
    const current = new Date(first);
    current.setUTCDate(first.getUTCDate() + i);
    const key = dateKey(current);
    const outside = current.getUTCMonth() !== monthIndex;
    const open = !outside && withinCalendarRange(key) && serviceOpenOnDate(key);
    const selected = key === selectedDate;
    const sessionCount = calendarSessionCount(key);
    cells.push(`<button type="button" class="calendar-day${outside ? ' outside' : ''}${selected ? ' selected' : ''}${key === today ? ' today' : ''}${!open ? ' unavailable' : ''}" data-date="${key}" ${open ? '' : 'disabled'} aria-pressed="${selected ? 'true' : 'false'}" aria-label="${key}${open ? '' : ', unavailable'}"><span>${current.getUTCDate()}</span>${sessionCount ? `<i>${sessionCount}</i>` : ''}</button>`);
  }
  root.innerHTML = cells.join('');
  root.querySelectorAll('[data-date]:not(:disabled)').forEach(button => { button.addEventListener('click', () => selectDate(button.dataset.date)); button.addEventListener('mouseenter', () => prefetchAvailability(button.dataset.date), { once: true }); button.addEventListener('focus', () => prefetchAvailability(button.dataset.date), { once: true }); });
  const prevCursor = shiftMonth(calendarCursor, -1);
  const nextCursor = shiftMonth(calendarCursor, 1);
  const prevEnd = `${prevCursor.slice(0, 7)}-31`;
  $('#calendarPrev').disabled = Boolean(minBookableDate && prevEnd < minBookableDate.slice(0, 7) + '-01');
  $('#calendarNext').disabled = Boolean(maxBookableDate && nextCursor > monthKey(maxBookableDate));
}

async function selectDate(date, { keepMonth = false } = {}) {
  selectedDate = date;
  $('#bookingDate').value = date;
  $('#selectedDateLabel').textContent = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(dateFromKey(date));
  if (!keepMonth) calendarCursor = monthKey(date);
  selectedTime = '';
  if (bookingMode() === 'all_day') selectedAllDayDate = '';
  renderCalendar();
  await loadAvailability(date);
}

function findInitialDate(start) {
  let current = dateFromKey(start);
  for (let i = 0; i < 366; i += 1) {
    const key = dateKey(current);
    if ((!maxBookableDate || key <= maxBookableDate) && withinCalendarRange(key) && serviceOpenOnDate(key)) return key;
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return start;
}

function renderSelectedSessions() {
  const root = $('#selectedSessions');
  if (bookingMode() !== 'multi_slot') { root.classList.add('hidden'); return; }
  root.classList.remove('hidden');
  const required = Number(rule.sessionsRequired || 3);
  root.innerHTML = `<div class="selected-session-head"><strong>Selected sessions</strong><span>${selectedOccurrences.length} / ${required}</span></div><div class="selected-session-list">${selectedOccurrences.length ? selectedOccurrences.map(item => `<button type="button" class="selected-session" data-remove-session="${escapeHtml(occurrenceKey(item))}"><span>${escapeHtml(displayOccurrence(item))}</span><i>×</i></button>`).join('') : '<span class="muted">Choose dates and time slots until your package is complete.</span>'}</div>`;
  root.querySelectorAll('[data-remove-session]').forEach(button => button.addEventListener('click', async () => {
    selectedOccurrences = selectedOccurrences.filter(item => occurrenceKey(item) !== button.dataset.removeSession);
    renderSelectedSessions();
    renderCalendar();
    renderCurrentTimeSelection();
    if (selectedDate) await loadAvailability(selectedDate);
  }));
}

function renderCurrentTimeSelection() {
  if (bookingMode() !== 'multi_slot') return;
  $('#timeSlots').querySelectorAll('.time-slot').forEach(button => {
    const key = `${selectedDate}T${button.dataset.time}`;
    button.setAttribute('aria-pressed', String(selectedOccurrences.some(item => occurrenceKey(item) === key)));
  });
}

function renderService(payload) {
  rule = { ...payload.rule, storeDate: payload.storeDate || '' };
  serviceTimezone = payload.timezone || rule.timezone || 'UTC';
  rule.timezone = serviceTimezone;
  brand = payload.brand || brand;
  storefront = normalizeStorefrontSettings(payload.storefront || {});
  const storefrontAccent = storefront.modal.accentColor || '#2F6FED';
  document.documentElement.style.setProperty('--brand', storefrontAccent);
  document.documentElement.style.setProperty('--brand-soft', `color-mix(in srgb,${storefrontAccent} 9%,white)`);
  document.documentElement.style.setProperty('--brand-text', storefront.modal.primaryTextColor || '#FFFFFF');
  $('#brandName').textContent = brand.name || 'Appointment Lite';
  $('#brandMark').textContent = (brand.name || 'A').slice(0, 1).toUpperCase();
  $('#serviceType').textContent = typeLabels[rule.serviceType] || typeLabels.other;
  $('#serviceTitle').textContent = rule.serviceTitle;
  $('#serviceDescription').textContent = rule.serviceDescription || '';
  $('#serviceDescription').classList.toggle('hidden', !rule.serviceDescription);
  const mode = bookingMode();
  setupTimezonePicker();
  $('#noteLabel').textContent = rule.questionLabel || 'Anything we should know?';
  const modeMeta = mode === 'all_day' ? 'All-day booking' : mode === 'multi_slot' ? `${rule.sessionsRequired || 3} sessions` : `${rule.duration} minutes`;
  const staffMode = rule.staffAssignment?.mode || 'none';
  const staffOptions = Array.isArray(rule.staffOptions) ? rule.staffOptions : [];
  const managedStaffMeta = staffMode === 'fixed' && staffOptions[0] ? staffOptions[0].name : staffMode === 'any' ? 'Staff assigned automatically' : '';
  const orderMeta = payload.postPurchase?.orderName ? `Order ${payload.postPurchase.orderName} verified` : '';
  const meta = [modeMeta, orderMeta, rule.location, managedStaffMeta || rule.staff, rule.capacity > 1 ? `${rule.capacity} ${mode === 'all_day' ? 'bookings per day' : 'spots per time'}` : '', formatNotice(rule.minimumNoticeMinutes)].filter(Boolean);
  $('#serviceMeta').innerHTML = meta.map(value => `<span>${escapeHtml(value)}</span>`).join('');
  $('#serviceMeta').classList.toggle('hidden', !storefront.modal.showServiceSummary);
  $('#phoneField')?.classList.toggle('hidden', !storefront.modal.showPhone);
  $('#notesField')?.classList.toggle('hidden', !storefront.modal.showNotes);
  $('#bookingFooterNote')?.classList.toggle('hidden', !storefront.modal.showFooterNote);
  const today = payload.storeDate || new Date().toISOString().slice(0, 10);
  minBookableDate = rule.dateFrom && rule.dateFrom > today ? rule.dateFrom : today;
  const maxByWindow = rule.bookingWindowUntil || '';
  maxBookableDate = [rule.dateUntil, maxByWindow].filter(Boolean).sort()[0] || '';
  $('#customQuestions').innerHTML = (rule.customQuestions || []).map(question => `<label class="field"><span>${escapeHtml(question.label)}${question.required ? ' *' : ''}</span><input data-question="${escapeHtml(question.label)}" maxlength="1000" ${question.required ? 'required' : ''}></label>`).join('');
  if (payload.postPurchase?.customer) {
    const nameInput = $('#bookingForm [name="name"]');
    const emailInput = $('#bookingForm [name="email"]');
    const phoneInput = $('#bookingForm [name="phone"]');
    if (nameInput && payload.postPurchase.customer.name) nameInput.value = payload.postPurchase.customer.name;
    if (emailInput && payload.postPurchase.customer.email) { emailInput.value = payload.postPurchase.customer.email; emailInput.readOnly = true; }
    if (phoneInput && payload.postPurchase.customer.phone) phoneInput.value = payload.postPurchase.customer.phone;
  }
  const serviceAddressField = $('#serviceAddressField');
  const serviceAddressInput = $('#bookingForm [name="serviceAddress"]');
  const needsCustomerAddress = rule.locationMode === 'customer_address';
  serviceAddressField?.classList.toggle('hidden', !needsCustomerAddress);
  if (serviceAddressInput) {
    serviceAddressInput.required = needsCustomerAddress;
    if (needsCustomerAddress && payload.postPurchase?.shippingAddress) {
      const address = [payload.postPurchase.shippingAddress.address1, payload.postPurchase.shippingAddress.address2, payload.postPurchase.shippingAddress.city, payload.postPurchase.shippingAddress.province, payload.postPurchase.shippingAddress.zip, payload.postPurchase.shippingAddress.country].filter(Boolean).join(', ');
      if (address) serviceAddressInput.value = address;
    }
  }
  const staffField = $('#staffField');
  const staffSelect = $('#staffSelect');
  staffField.classList.toggle('hidden', staffMode !== 'customer_choice');
  selectedStaffId = '';
  staffSelect.value = '';
  setStaffPickerValue(null);
  renderStaffPicker(staffOptions);
  $('#timeLabel').textContent = mode === 'all_day' ? 'Availability' : mode === 'multi_slot' ? 'Available sessions' : 'Available time slots';
  const paid = rule.commerceMode === 'standalone_paid';
  const postPurchase = rule.commerceMode === 'product_post_purchase';
  $('#submitBooking').textContent = paid ? 'Continue to checkout' : 'Confirm booking';
  const actionNote = document.querySelector('.booking-actions p');
  if (actionNote) actionNote.textContent = paid
    ? `Your selected time will be held for ${Number(rule.payment?.holdMinutes || 15)} minutes while you complete payment.`
    : postPurchase
      ? `This appointment is included with ${payload.postPurchase?.orderName ? `order ${payload.postPurchase.orderName}` : 'your paid order'}.`
      : 'You can reschedule or cancel your appointment later.';
  if (mode === 'multi_slot') renderSelectedSessions();
  const initial = findInitialDate(minBookableDate);
  calendarCursor = monthKey(initial);
  $('#loading').classList.add('hidden');
  $('#bookingView').classList.remove('hidden');
  renderCalendar();
  selectDate(initial, { keepMonth: true });
}

function availabilityKey(date) {
  return `${date}|${selectedStaffId}|${bookingMode() === 'multi_slot' ? selectedOccurrences.map(occurrenceKey).sort().join(',') : ''}`;
}

function availabilityUrl(date) {
  const staffQuery = selectedStaffId ? `&staffId=${encodeURIComponent(selectedStaffId)}` : '';
  const selectedQuery = bookingMode() === 'multi_slot' && selectedOccurrences.length ? `&selected=${encodeURIComponent(selectedOccurrences.map(item => `${item.date}T${item.time}`).join(','))}` : '';
  const accessQuery = entitlementToken ? `&access=${encodeURIComponent(entitlementToken)}` : '';
  return `/api/public/availability?ruleId=${encodeURIComponent(ruleId)}&date=${encodeURIComponent(date)}${staffQuery}${selectedQuery}${accessQuery}`;
}

function setAvailabilityLoading(loading) {
  const root = $('#timeSlots');
  root.classList.toggle('is-loading', loading);
  root.setAttribute('aria-busy', String(loading));
  root.querySelectorAll('button').forEach(button => { button.disabled = loading; });
  let overlay = root.querySelector('.slots-loading-overlay');
  if (loading && !overlay) {
    overlay = document.createElement('div'); overlay.className = 'slots-loading-overlay'; overlay.innerHTML = '<i></i><i></i><i></i>'; root.appendChild(overlay);
  }
  if (!loading) overlay?.remove();
}

function renderAvailability(payload, date) {
  const root = $('#timeSlots');
  if (payload.requiresStaffSelection) { root.innerHTML = '<span class="muted availability-empty">Choose a staff member to see available times.</span>'; return; }
  if (bookingMode() === 'all_day') {
    selectedAllDayDate = payload.available ? date : '';
    root.innerHTML = payload.available ? `<div class="all-day-available"><strong>Available all day</strong><span>${payload.remaining > 1 ? `${payload.remaining} bookings remaining` : 'This date can be booked'}</span></div>` : `<span class="muted availability-empty">${escapeHtml(emptyAvailabilityMessage(payload))}</span>`;
    return;
  }
  root.innerHTML = payload.slots.length ? payload.slots.map(time => { const shown = displaySlot(date, time); return `<button type="button" class="time-slot" data-time="${time}" aria-pressed="false"><span>${escapeHtml(shown.label)}</span></button>`; }).join('') : `<span class="muted availability-empty">${escapeHtml(emptyAvailabilityMessage(payload))}</span>`;
  root.querySelectorAll('.time-slot').forEach(button => button.addEventListener('click', async () => {
    if (bookingMode() === 'multi_slot') {
      const item = { date, time: button.dataset.time };
      const key = occurrenceKey(item);
      const exists = selectedOccurrences.some(current => occurrenceKey(current) === key);
      if (exists) selectedOccurrences = selectedOccurrences.filter(current => occurrenceKey(current) !== key);
      else if (selectedOccurrences.length < Number(rule.sessionsRequired || 3)) selectedOccurrences.push(item);
      selectedOccurrences.sort((a, b) => occurrenceKey(a).localeCompare(occurrenceKey(b)));
      renderSelectedSessions(); renderCalendar(); await loadAvailability(date);
    } else {
      selectedTime = button.dataset.time;
      root.querySelectorAll('.time-slot').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    }
  }));
  renderCurrentTimeSelection();
}

async function fetchAvailability(date) {
  const key = availabilityKey(date);
  if (availabilityCache.has(key)) return availabilityCache.get(key);
  const payload = await api(availabilityUrl(date)); availabilityCache.set(key, payload); return payload;
}

function prefetchAvailability(date) {
  if (!date || ((rule.staffAssignment?.mode || 'none') === 'customer_choice' && !selectedStaffId)) return;
  fetchAvailability(date).catch(() => {});
}

async function loadAvailability(date) {
  const key = availabilityKey(date);
  const requestId = ++availabilityRequestId;
  selectedTime = '';
  if (bookingMode() === 'all_day') selectedAllDayDate = '';
  if (availabilityCache.has(key)) { setAvailabilityLoading(false); renderAvailability(availabilityCache.get(key), date); return; }
  setAvailabilityLoading(true);
  try {
    const payload = await fetchAvailability(date);
    if (requestId !== availabilityRequestId || selectedDate !== date) return;
    renderAvailability(payload, date);
  } catch (error) {
    if (requestId !== availabilityRequestId || selectedDate !== date) return;
    $('#timeSlots').innerHTML = `<span class="muted availability-empty">${escapeHtml(error.message)}</span>`;
  } finally { if (requestId === availabilityRequestId) setAvailabilityLoading(false); }
}

$('#calendarPrev').addEventListener('click', () => { calendarCursor = shiftMonth(calendarCursor, -1); renderCalendar(); });
$('#calendarNext').addEventListener('click', () => { calendarCursor = shiftMonth(calendarCursor, 1); renderCalendar(); });

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
  const timezonePicker = $('#timezonePicker');
  if (timezonePicker && !timezonePicker.contains(event.target)) { $('#timezonePickerMenu').classList.add('hidden'); $('#timezonePickerButton').setAttribute('aria-expanded', 'false'); clearTimezonePosition(); }
});

$('#bookingForm').addEventListener('submit', async event => {
  event.preventDefault();
  const errorBox = $('#formError');
  const mode = bookingMode();
  if ((rule.staffAssignment?.mode || 'none') === 'customer_choice' && !selectedStaffId) { errorBox.textContent = 'Please choose a staff member.'; errorBox.classList.remove('hidden'); return; }
  if (!selectedDate) { errorBox.textContent = 'Please choose a date.'; errorBox.classList.remove('hidden'); return; }
  if (mode === 'slot' && !selectedTime) { errorBox.textContent = 'Please select a time.'; errorBox.classList.remove('hidden'); return; }
  if (mode === 'all_day' && !selectedAllDayDate) { errorBox.textContent = 'Please choose an available date.'; errorBox.classList.remove('hidden'); return; }
  if (mode === 'multi_slot' && selectedOccurrences.length !== Number(rule.sessionsRequired || 3)) { errorBox.textContent = `Please select exactly ${rule.sessionsRequired || 3} sessions.`; errorBox.classList.remove('hidden'); return; }
  const form = new FormData(event.currentTarget);
  const submit = $('#submitBooking');
  submit.disabled = true;
  const paid = rule.commerceMode === 'standalone_paid';
  const postPurchase = rule.commerceMode === 'product_post_purchase';
  submit.textContent = paid ? 'Holding your time…' : 'Confirming…';
  errorBox.classList.add('hidden');
  try {
    const body = {
      ruleId,
      staffId: selectedStaffId,
      date: mode === 'multi_slot' ? selectedOccurrences[0]?.date : selectedDate,
      time: mode === 'slot' ? selectedTime : '',
      occurrences: mode === 'multi_slot' ? selectedOccurrences : [],
      customer: { name: form.get('name'), email: form.get('email'), phone: form.get('phone') },
      serviceAddress: form.get('serviceAddress') || '',
      note: form.get('note'),
      answers: [...document.querySelectorAll('[data-question]')].map(input => ({ question: input.dataset.question, answer: input.value })),
      ...(postPurchase ? { entitlementToken } : {})
    };
    const endpoint = paid ? '/api/public/paid-bookings' : postPurchase ? '/api/public/post-purchase-bookings' : '/api/public/bookings';
    const payload = await api(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (paid) {
      submit.textContent = 'Opening secure checkout…';
      window.location.assign(payload.checkoutUrl);
      return;
    }
    $('#bookingView').classList.add('hidden');
    $('#successTitle').textContent = `${rule.serviceTitle} is confirmed.`;
    $('#successWhen').textContent = formatBookingWhen(payload.booking);
    $('#successDetails').innerHTML = [payload.booking.staff ? `<span><b>Staff</b>${escapeHtml(payload.booking.staff)}</span>` : '', payload.booking.location ? `<span><b>Location</b>${escapeHtml(payload.booking.location)}</span>` : '', `<span><b>Service time zone</b>${escapeHtml(payload.booking.timezone || serviceTimezone)}</span>`].filter(Boolean).join('');
    $('#manageBooking').href = `/manage?booking=${encodeURIComponent(payload.booking.id)}#token=${encodeURIComponent(payload.booking.managementToken)}`;
    const googleCalendar = $('#addGoogleCalendar');
    if (payload.booking.calendar?.google) { googleCalendar.href = payload.booking.calendar.google; googleCalendar.classList.remove('hidden'); } else googleCalendar.classList.add('hidden');
    $('#successView').classList.remove('hidden');
  } catch (error) {
    errorBox.textContent = error.status === 409 ? 'One of those selections was just booked. Please choose again.' : error.message;
    errorBox.classList.remove('hidden');
    if (error.status === 409) {
      if (mode === 'multi_slot') {
        selectedOccurrences = [];
        renderSelectedSessions();
        renderCalendar();
      }
      if (selectedDate) loadAvailability(selectedDate);
    }
  } finally {
    if (document.visibilityState === 'visible') {
      submit.disabled = false;
      submit.textContent = paid ? 'Continue to checkout' : 'Confirm booking';
    }
  }
});

(async function load() {
  try {
    const accessQuery = entitlementToken ? `&access=${encodeURIComponent(entitlementToken)}` : '';
    const payload = await api(`/api/public/service?ruleId=${encodeURIComponent(ruleId)}${accessQuery}`);
    renderService(payload);
  } catch (error) { showError(error.message); }
})();
