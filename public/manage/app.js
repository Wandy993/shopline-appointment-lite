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
$('#newDate').min = new Date().toISOString().slice(0, 10);

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

function render() {
  $('#loading').classList.add('hidden');
  $('#errorView').classList.add('hidden');
  $('#bookingView').classList.remove('hidden');
  $('#productTitle').textContent = booking.productTitle;
  $('#statusBadge').textContent = booking.status;
  $('#bookingWhen').textContent = `${booking.date} at ${booking.time}`;
  $('#bookingDetails').textContent = [booking.location, booking.staff].filter(Boolean).join(' · ');
  const active = booking.status === 'confirmed';
  $('#mainActions').classList.toggle('hidden', !active);
  $('#limitNotice').classList.toggle('hidden', !active);
  $('#changeButton').classList.toggle('hidden', !booking.customerCanReschedule);
  $('#limitNotice').innerHTML = booking.customerCanReschedule
    ? '<strong>One online change available</strong><span>You can change this appointment once. After that, contact the store.</span>'
    : active ? '<strong>Online change already used</strong><span>Please contact the store if you need another change.</span>' : '';
  if (!active) $('#statusBadge').style.cssText = 'background:#f3f4f6;color:#6b7280';
}

async function load() {
  if (!/^[a-f\d]{24}$/i.test(bookingId) || !/^[A-Za-z0-9_-]{43}$/.test(managementToken)) return showError('This management link is invalid or incomplete. Open the original link from your appointment email.');
  try {
    booking = (await api('/status')).booking;
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
