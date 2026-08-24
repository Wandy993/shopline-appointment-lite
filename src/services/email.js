import { Resend } from 'resend';
import { config } from '../config.js';

let client;
function resend() {
  if (!config.email.resendKey) return null;
  client ||= new Resend(config.email.resendKey);
  return client;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char]);
}

export async function sendBookingNotifications(booking, merchantEmail = '') {
  const mailer = resend();
  if (!mailer) return { skipped: true, reason: 'RESEND_API_KEY is not configured' };
  const summary = `${booking.productTitle} — ${booking.date} at ${booking.time}`;
  const html = `<h2>Appointment confirmed</h2><p>${escapeHtml(summary)}</p><p>Location: ${escapeHtml(booking.location || 'To be confirmed')}</p><p>Staff: ${escapeHtml(booking.staff || 'To be confirmed')}</p>`;
  const recipients = [{ to: booking.customer.email, subject: `Appointment confirmed: ${booking.productTitle}` }];
  const merchantTo = merchantEmail || config.email.merchantTo;
  if (merchantTo) recipients.push({ to: merchantTo, subject: `New appointment: ${summary}` });
  const results = await Promise.allSettled(recipients.map(message => mailer.emails.send({ from: config.email.from, html, ...message })));
  const failed = results.filter(result => result.status === 'rejected');
  if (failed.length) console.error('Email notification partially failed', failed.map(item => item.reason?.message));
  return { skipped: false, attempted: results.length, failed: failed.length };
}
