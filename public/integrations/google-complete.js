(() => {
  let payload = { type: 'appointment-lite:google-calendar', status: 'error', message: 'Google Calendar connection finished.' };
  try { payload = JSON.parse(document.body.dataset.googleResult || '{}'); } catch {}
  try { window.opener?.postMessage(payload, window.location.origin); } catch {}
  document.querySelector('#closeWindow')?.addEventListener('click', () => window.close());
  if (payload.status === 'connected') setTimeout(() => window.close(), 900);
})();
