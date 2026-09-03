const $ = selector => document.querySelector(selector);
const query = new URLSearchParams(location.search);
const bookingId = query.get('booking') || '';
const tokenKey = `appointment-lite:manage:${bookingId}`;
const hashToken = new URLSearchParams(location.hash.slice(1)).get('token') || '';
const queryToken = query.get('access') || '';
const incomingToken = hashToken || queryToken;
if (incomingToken) {
  sessionStorage.setItem(tokenKey, incomingToken);
  history.replaceState(null, '', `${location.pathname}?booking=${encodeURIComponent(bookingId)}`);
}
const managementToken = sessionStorage.getItem(tokenKey) || '';
let booking;
let selectedTime = '';
const ZOOM_BRAND_SVG = `<svg class="zoom-brand-svg" viewBox="0 8 24 8" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg"><path fill="#0B5CFF" d="M5.033 14.649H.743a.74.74 0 0 1-.686-.458.74.74 0 0 1 .16-.808L3.19 10.41H1.06A1.06 1.06 0 0 1 0 9.35h3.957c.301 0 .57.18.686.458a.74.74 0 0 1-.161.808L1.51 13.59h2.464c.585 0 1.06.475 1.06 1.06zM24 11.338c0-1.14-.927-2.066-2.066-2.066-.61 0-1.158.265-1.537.686a2.061 2.061 0 0 0-1.536-.686c-1.14 0-2.066.926-2.066 2.066v3.311a1.06 1.06 0 0 0 1.06-1.06v-2.251a1.004 1.004 0 0 1 2.013 0v2.251c0 .586.474 1.06 1.06 1.06v-3.311a1.004 1.004 0 0 1 2.012 0v2.251c0 .586.475 1.06 1.06 1.06zM16.265 12a2.728 2.728 0 1 1-5.457 0 2.728 2.728 0 0 1 5.457 0zm-1.06 0a1.669 1.669 0 1 0-3.338 0 1.669 1.669 0 0 0 3.338 0zm-4.82 0a2.728 2.728 0 1 1-5.458 0 2.728 2.728 0 0 1 5.457 0zm-1.06 0a1.669 1.669 0 1 0-3.338 0 1.669 1.669 0 0 0 3.338 0z"/></svg>`;

function renderMeetingBrandIcon(element, meeting) {
  if (!element) return;
  element.replaceChildren();
  element.classList.toggle('meeting-brand-icon--zoom', meeting?.provider === 'zoom');
  if (meeting?.provider === 'zoom') {
    element.innerHTML = ZOOM_BRAND_SVG;
    return;
  }
  element.textContent = String(meeting?.providerName || 'Online').slice(0, 2).toUpperCase();
}

async function api(path, body = {}) {
  const response = await fetch(`/api/public/bookings/${encodeURIComponent(bookingId)}${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ managementToken, ...body })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(payload.message || 'Request failed.'), { status: response.status, payload });
  return payload;
}

function showError(message) {
  $('#loading').classList.add('hidden');
  $('#bookingView').classList.add('hidden');
  $('#errorMessage').textContent = message;
  $('#errorView').classList.remove('hidden');
}


function bookingWhen(value) {
  const mode = value?.bookingMode || 'slot';
  const occurrences = Array.isArray(value?.occurrences) ? value.occurrences : [];
  if (mode === 'all_day') return `${value.date} · All day`;
  if (mode === 'multi_slot') return occurrences.map(item => `${item.date} · ${item.time}`).join(' | ');
  return `${value.date} at ${value.time}`;
}

function render() {
  $('#loading').classList.add('hidden');
  $('#errorView').classList.add('hidden');
  $('#bookingView').classList.remove('hidden');
  $('#productTitle').textContent = booking.productTitle;
  $('#statusBadge').textContent = booking.status;
  $('#bookingWhen').textContent = bookingWhen(booking);
  $('#bookingDetails').textContent = [booking.location, booking.staff, `Store time zone: ${booking.timezone || 'UTC'}`].filter(Boolean).join(' · ');
  const active = booking.status === 'confirmed';
  const meeting = active && booking.meeting?.url ? booking.meeting : null;
  $('#meetingCard').classList.toggle('hidden', !meeting);
  if (meeting) {
    $('#meetingProvider').textContent = meeting.providerName || 'Online meeting';
    $('#meetingLabel').textContent = meeting.label || 'Join meeting';
    $('#meetingButton').href = meeting.url;
    $('#meetingButton').setAttribute('aria-label', `${meeting.providerName || 'Online meeting'}: ${meeting.label || 'Join meeting'}`);
    renderMeetingBrandIcon($('#meetingBrandIcon'), meeting);
  } else {
    $('#meetingButton').removeAttribute('href');
    $('#meetingButton').removeAttribute('aria-label');
    renderMeetingBrandIcon($('#meetingBrandIcon'), null);
  }
  $('#mainActions').classList.toggle('hidden', !active);
  $('#limitNotice').classList.toggle('hidden', !active);
  $('#changeButton').classList.toggle('hidden', !booking.customerCanReschedule);
  $('#limitNotice').innerHTML = booking.customerCanReschedule
    ? '<strong>One online change available</strong><span>You can change this appointment once. After that, contact the store.</span>'
    : active && (booking.bookingMode || 'slot') !== 'slot'
      ? '<strong>Contact the store to change this booking</strong><span>Online rescheduling is currently available for minute/hour appointments only.</span>'
      : active ? '<strong>Online change already used</strong><span>Please contact the store if you need another change.</span>' : '';
  if (!active) $('#statusBadge').style.cssText = 'background:#f3f4f6;color:#6b7280';
}

async function load() {
  if (!/^[a-f\d]{24}$/i.test(bookingId) || !/^[A-Za-z0-9_-]{43}$/.test(managementToken)) return showError('This management link is invalid or incomplete. Open the original link from your appointment email.');
  try {
    booking = (await api('/status')).booking;
    $('#newDate').min = booking.storeDate || new Date().toISOString().slice(0, 10);
    render();
  } catch (error) { showError(error.status === 404 ? 'This management link is invalid or has expired.' : error.message); }
}

$('#changeButton').addEventListener('click', () => {
  $('#mainActions').classList.add('hidden');
  $('#limitNotice').classList.add('hidden');
  $('#changeForm').classList.remove('hidden');
});
$('#backButton').addEventListener('click', () => { $('#changeForm').classList.add('hidden'); render(); });
$('#newDate').addEventListener('change', async event => {
  selectedTime = '';
  $('#timeSlots').innerHTML = '<span class="muted">Loading times…</span>';
  try {
    const payload = await api('/availability', { date: event.target.value });
    $('#timeSlots').innerHTML = payload.slots.length ? payload.slots.map(time => `<button type="button" class="slot" data-time="${time}" aria-pressed="false">${time}</button>`).join('') : '<span class="muted">No times available on this date.</span>';
    document.querySelectorAll('.slot').forEach(button => button.addEventListener('click', () => {
      selectedTime = button.dataset.time;
      document.querySelectorAll('.slot').forEach(slot => slot.setAttribute('aria-pressed', String(slot === button)));
    }));
  } catch (error) { $('#timeSlots').innerHTML = `<span class="error">${error.message}</span>`; }
});
$('#changeForm').addEventListener('submit', async event => {
  event.preventDefault();
  const errorBox = $('#formError');
  if (!selectedTime) { errorBox.textContent = 'Please select a new time.'; errorBox.classList.remove('hidden'); return; }
  $('#saveButton').disabled = true;
  errorBox.classList.add('hidden');
  try {
    booking = (await api('/reschedule', { date: $('#newDate').value, time: selectedTime })).booking;
    $('#changeForm').classList.add('hidden');
    render();
  } catch (error) {
    errorBox.textContent = error.payload?.error === 'RESCHEDULE_LIMIT' ? 'Your online change has already been used. Please contact the store.' : error.message;
    errorBox.classList.remove('hidden');
  } finally { $('#saveButton').disabled = false; }
});
$('#cancelButton').addEventListener('click', () => { $('#mainActions').classList.add('hidden'); $('#limitNotice').classList.add('hidden'); $('#cancelConfirm').classList.remove('hidden'); });
$('#keepButton').addEventListener('click', () => { $('#cancelConfirm').classList.add('hidden'); render(); });
$('#confirmCancelButton').addEventListener('click', async () => {
  $('#confirmCancelButton').disabled = true;
  try {
    booking = (await api('/cancel')).booking;
    $('#cancelConfirm').classList.add('hidden');
    render();
  } catch (error) { showError(error.message); }
  finally { $('#confirmCancelButton').disabled = false; }
});

load();
