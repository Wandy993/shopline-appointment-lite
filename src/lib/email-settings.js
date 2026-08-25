const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;

export const EMAIL_TEMPLATE_KEYS = Object.freeze([
  'confirmation',
  'rescheduled',
  'merchantUpdated',
  'cancelled',
  'merchantNewBooking'
]);

export const DEFAULT_EMAIL_SETTINGS = Object.freeze({
  brandName: 'Appointment Lite',
  logoUrl: '',
  accentColor: '#2F6FED',
  replyToEmail: '',
  merchantNotificationEmail: '',
  templates: Object.freeze({
    confirmation: Object.freeze({
      subject: 'Your appointment is confirmed — {{product_title}}',
      heading: 'Appointment confirmed',
      body: 'Hi {{customer_name}},\n\nYour appointment is confirmed. Review the details below and keep this email for your records.'
    }),
    rescheduled: Object.freeze({
      subject: 'Your appointment has changed — {{product_title}}',
      heading: 'Appointment changed',
      body: 'Hi {{customer_name}},\n\nYour appointment has been moved to the new time below. Your one online change has now been used.'
    }),
    merchantUpdated: Object.freeze({
      subject: 'The store updated your appointment — {{product_title}}',
      heading: 'Your appointment was updated',
      body: 'Hi {{customer_name}},\n\nThe store updated your appointment details. Please review the latest information below.'
    }),
    cancelled: Object.freeze({
      subject: 'Your appointment was cancelled — {{product_title}}',
      heading: 'Appointment cancelled',
      body: 'Hi {{customer_name}},\n\nThis appointment has been cancelled and the reserved time has been released.'
    }),
    merchantNewBooking: Object.freeze({
      subject: 'New appointment — {{product_title}} · {{date}} {{time}}',
      heading: 'New appointment received',
      body: '{{customer_name}} booked an appointment. Review the details below and follow up if needed.'
    })
  })
});

function text(value, max) {
  return String(value ?? '').trim().slice(0, max);
}

function templateValue(input, fallback) {
  return {
    subject: text(input?.subject || fallback.subject, 180),
    heading: text(input?.heading || fallback.heading, 120),
    body: text(input?.body || fallback.body, 3000)
  };
}

export function normalizeEmailSettings(input = {}) {
  const templates = {};
  for (const key of EMAIL_TEMPLATE_KEYS) templates[key] = templateValue(input.templates?.[key], DEFAULT_EMAIL_SETTINGS.templates[key]);
  return {
    brandName: text(input.brandName || DEFAULT_EMAIL_SETTINGS.brandName, 80),
    logoUrl: text(input.logoUrl, 500),
    accentColor: HEX_COLOR_PATTERN.test(String(input.accentColor || '')) ? String(input.accentColor).toUpperCase() : DEFAULT_EMAIL_SETTINGS.accentColor,
    replyToEmail: text(input.replyToEmail, 254).toLowerCase(),
    merchantNotificationEmail: text(input.merchantNotificationEmail, 254).toLowerCase(),
    templates
  };
}

export function validateEmailSettings(input = {}) {
  const value = normalizeEmailSettings(input);
  const errors = [];
  if (!value.brandName) errors.push('Brand name is required.');
  if (value.logoUrl) {
    try {
      const url = new URL(value.logoUrl);
      if (!['http:', 'https:'].includes(url.protocol)) errors.push('Logo URL must use HTTP or HTTPS.');
    } catch { errors.push('Logo URL must be a valid public URL.'); }
  }
  if (input.accentColor && !HEX_COLOR_PATTERN.test(String(input.accentColor))) errors.push('Accent color must be a six-digit hex color.');
  if (value.replyToEmail && !EMAIL_PATTERN.test(value.replyToEmail)) errors.push('Reply-to email is invalid.');
  if (value.merchantNotificationEmail && !EMAIL_PATTERN.test(value.merchantNotificationEmail)) errors.push('Merchant notification email is invalid.');
  for (const key of EMAIL_TEMPLATE_KEYS) {
    if (!value.templates[key].subject) errors.push(`${key} subject is required.`);
    if (!value.templates[key].heading) errors.push(`${key} heading is required.`);
    if (!value.templates[key].body) errors.push(`${key} body is required.`);
  }
  return { errors: [...new Set(errors)], value };
}


export function validateTestEmailRecipient(input) {
  const value = text(input, 254);
  if (!value) return { error: 'Enter an email address for the test message.', value: '' };
  if (!EMAIL_PATTERN.test(value)) return { error: 'Enter a valid email address for the test message.', value };
  return { error: '', value };
}

export function templateVariables(booking = {}, extras = {}) {
  return {
    customer_name: booking.customer?.name || 'Customer',
    customer_email: booking.customer?.email || '',
    product_title: booking.productTitle || 'Consultation',
    date: booking.date || '',
    time: booking.time || '',
    timezone: booking.timezone || 'UTC',
    location: booking.location || 'To be confirmed',
    staff: booking.staff || 'To be confirmed',
    store_name: extras.storeName || 'Appointment Lite'
  };
}

export function interpolateTemplate(template, variables) {
  return String(template || '').replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (match, key) => key in variables ? String(variables[key]) : match);
}
