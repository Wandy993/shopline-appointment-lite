import { Resend } from 'resend';
import { config } from '../config.js';
import { DEFAULT_EMAIL_SETTINGS, interpolateTemplate, merchantNotificationRecipients, normalizeEmailSettings, templateVariables } from '../lib/email-settings.js';
import { calendarLinksForBooking } from '../lib/calendar-links.js';
import { Shop } from '../models/Shop.js';
import { Staff } from '../models/Staff.js';
import { incrementOpsUsage, queueHealthEvent } from './ops-hub.js';

let aliyunSdk;
let aliyunClient;
let resendClient;

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char]);
}

function selectedProvider() {
  const aliyunConfigured = Boolean(config.email.aliyun.accessKeyId && config.email.aliyun.accessKeySecret && config.email.aliyun.accountName);
  const resendConfigured = Boolean(config.email.resendKey);
  if (config.email.provider === 'none') return { provider: 'none', configured: false, reason: 'EMAIL_PROVIDER is none' };
  if (config.email.provider === 'aliyun') return { provider: 'aliyun', configured: aliyunConfigured, reason: aliyunConfigured ? '' : 'Aliyun DirectMail credentials or sender are incomplete' };
  if (config.email.provider === 'resend') return { provider: 'resend', configured: resendConfigured, reason: resendConfigured ? '' : 'RESEND_API_KEY is not configured' };
  if (aliyunConfigured) return { provider: 'aliyun', configured: true, reason: '' };
  if (resendConfigured) return { provider: 'resend', configured: true, reason: '' };
  return { provider: 'none', configured: false, reason: 'No email provider is configured' };
}

export function emailStatus() {
  const status = selectedProvider();
  return {
    ...status,
    from: status.provider === 'aliyun' ? config.email.aliyun.accountName : status.provider === 'resend' ? config.email.from : '',
    transport: status.provider === 'aliyun' ? 'HTTPS OpenAPI' : status.provider === 'resend' ? 'HTTPS API' : 'disabled'
  };
}

async function loadAliyunSdk() {
  if (aliyunSdk) return aliyunSdk;
  const [dmModule, openApiModule, teaUtilModule] = await Promise.all([
    import('@alicloud/dm20151123'),
    import('@alicloud/openapi-client'),
    import('@alicloud/tea-util')
  ]);
  aliyunSdk = {
    DmClient: dmModule.default.default,
    SingleSendMailRequest: dmModule.SingleSendMailRequest,
    OpenApiConfig: openApiModule.Config,
    RuntimeOptions: teaUtilModule.RuntimeOptions
  };
  return aliyunSdk;
}

async function directMail() {
  if (aliyunClient) return aliyunClient;
  const { DmClient, OpenApiConfig } = await loadAliyunSdk();
  const options = {
    accessKeyId: config.email.aliyun.accessKeyId,
    accessKeySecret: config.email.aliyun.accessKeySecret,
    endpoint: config.email.aliyun.endpoint,
    regionId: config.email.aliyun.regionId
  };
  if (config.email.aliyun.securityToken) options.securityToken = config.email.aliyun.securityToken;
  aliyunClient = new DmClient(new OpenApiConfig(options));
  return aliyunClient;
}

async function deliverWithAliyun(message) {
  const { SingleSendMailRequest, RuntimeOptions } = await loadAliyunSdk();
  const request = new SingleSendMailRequest({
    accountName: config.email.aliyun.accountName,
    addressType: 1,
    replyToAddress: config.email.aliyun.replyToAddress,
    toAddress: message.to,
    subject: message.subject,
    htmlBody: message.html,
    fromAlias: message.fromName || config.email.aliyun.fromAlias,
    ...(message.replyTo ? { replyAddress: message.replyTo, replyAddressAlias: message.fromName || config.email.aliyun.fromAlias } : {}),
    ...(config.email.aliyun.tagName ? { tagName: config.email.aliyun.tagName } : {})
  });
  const client = await directMail();
  const response = await client.singleSendMailWithOptions(request, new RuntimeOptions({}));
  return { provider: 'aliyun', requestId: response?.body?.requestId || '' };
}

async function deliverWithResend(message) {
  resendClient ||= new Resend(config.email.resendKey);
  const { fromName, replyTo, ...payload } = message;
  const address = config.email.from.match(/<([^>]+)>/)?.[1] || config.email.from;
  const from = fromName ? `${fromName.replace(/[<>]/g, '')} <${address}>` : config.email.from;
  const response = await resendClient.emails.send({ from, ...(replyTo ? { replyTo } : {}), ...payload });
  if (response.error) throw new Error(response.error.message || 'Resend rejected the email');
  return { provider: 'resend', id: response.data?.id || '' };
}

export async function deliverEmail(message) {
  if (!message?.to) return { skipped: true, provider: selectedProvider().provider, reason: 'Recipient email is missing' };
  const status = selectedProvider();
  if (!status.configured) return { skipped: true, provider: status.provider, reason: status.reason };
  try {
    const result = status.provider === 'aliyun' ? await deliverWithAliyun(message) : await deliverWithResend(message);
    return { skipped: false, attempted: 1, failed: 0, ...result };
  } catch (error) {
    console.error(`${status.provider} email delivery failed`, error.message);
    return { skipped: false, attempted: 1, failed: 1, provider: status.provider, reason: error.message };
  }
}

export function managementLinkFor(booking, managementToken) {
  if (!managementToken) return '';
  return `${config.appUrl}/manage?booking=${encodeURIComponent(String(booking._id))}&access=${encodeURIComponent(managementToken)}`;
}

function appointmentCard(booking, settings) {
  const row = (label, value, extra = '') => `<tr><td style="padding:10px 12px;color:#8A98AA;font-size:12px;font-weight:600;vertical-align:top;border-bottom:1px solid #EEF2F6;width:110px">${escapeHtml(label)}</td><td style="padding:10px 12px;color:#344861;font-size:13px;font-weight:600;line-height:1.45;border-bottom:1px solid #EEF2F6">${escapeHtml(value)}${extra}</td></tr>`;
  const mode = booking.bookingMode || 'slot';
  const occurrences = Array.isArray(booking.occurrences) && booking.occurrences.length ? booking.occurrences : [{ date: booking.date, time: booking.time }];
  const when = mode === 'all_day'
    ? row('Date', `${booking.date} · All day`, `<div style="margin-top:3px;color:#98A5B5;font-size:11px;font-weight:400">${escapeHtml(booking.timezone || 'UTC')}</div>`)
    : mode === 'multi_slot'
      ? row('Sessions', occurrences.map(item => `${item.date} · ${item.time}`).join(' | '), `<div style="margin-top:3px;color:#98A5B5;font-size:11px;font-weight:400">${escapeHtml(booking.timezone || 'UTC')}</div>`)
      : row('Date & time', `${booking.date} · ${booking.time}`, `<div style="margin-top:3px;color:#98A5B5;font-size:11px;font-weight:400">${escapeHtml(booking.timezone || 'UTC')}</div>`);
  const providerName = ({ zoom: 'Zoom', google_meet: 'Google Meet', teams: 'Microsoft Teams', custom: 'Online meeting' }[booking.onlineMeeting?.provider] || 'Online meeting');
  const defaultMeetingLabel = ({ zoom: 'Join Zoom', google_meet: 'Join Google Meet', teams: 'Join Microsoft Teams', custom: 'Join meeting' }[booking.onlineMeeting?.provider] || 'Join meeting');
  const meetingLabel = String(booking.onlineMeeting?.label || '').trim() || defaultMeetingLabel;
  const meeting = booking.status === 'confirmed' && /^https:\/\/[^\s]+$/i.test(String(booking.onlineMeeting?.url || ''))
    ? row('Online meeting', providerName, `<div style="margin-top:8px"><a href="${escapeHtml(booking.onlineMeeting.url)}" style="display:inline-block;padding:9px 13px;border-radius:8px;background:${settings.accentColor};color:#fff;font-size:12px;font-weight:700;text-decoration:none">${escapeHtml(meetingLabel)}</a></div>`)
    : '';
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:separate;border-spacing:0;border:1px solid #E3E9F1;border-radius:12px;overflow:hidden;background:#FBFCFE;font-family:'Poppins','PingFang SC','Hiragino Sans GB','Microsoft YaHei',Arial,Helvetica,sans-serif">${row('Service', booking.productTitle)}${when}${row('Location', booking.location || 'To be confirmed')}${meeting}${row('Staff', booking.staff || 'To be confirmed')}</table>`;
}


const GOOGLE_G_ICON_URL = 'https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg';

function emailBrandHeader(settings) {
  const initial = escapeHtml(settings.brandName.slice(0, 1).toUpperCase() || 'A');
  const logo = settings.logoUrl
    ? `<img src="${escapeHtml(settings.logoUrl)}" width="40" height="40" alt="" style="display:block;width:40px;height:40px;border-radius:10px;object-fit:cover">`
    : `<div style="width:40px;height:40px;border-radius:10px;background:${settings.accentColor};color:#fff;font-size:18px;font-weight:800;line-height:40px;text-align:center">${initial}</div>`;
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;font-family:'Poppins','PingFang SC','Hiragino Sans GB','Microsoft YaHei',Arial,Helvetica,sans-serif"><tr><td width="40" valign="middle" style="width:40px;vertical-align:middle">${logo}</td><td width="14" style="width:14px;font-size:1px;line-height:1px">&nbsp;</td><td valign="middle" style="vertical-align:middle;color:#344861;font-size:15px;font-weight:700;line-height:20px">${escapeHtml(settings.brandName)}</td></tr></table>`;
}

function emailDocument(title, body, settings) {
  const fontBase = String(config.appUrl || '').replace(/\/$/, '');
  const webFonts = `@font-face{font-family:'Jost';font-style:normal;font-display:swap;font-weight:600;src:url('${fontBase}/customer-fonts/jost/jost-latin-600-normal.woff2') format('woff2')}@font-face{font-family:'Jost';font-style:normal;font-display:swap;font-weight:700;src:url('${fontBase}/customer-fonts/jost/jost-latin-700-normal.woff2') format('woff2')}@font-face{font-family:'Poppins';font-style:normal;font-display:swap;font-weight:400;src:url('${fontBase}/customer-fonts/poppins/poppins-latin-400-normal.woff2') format('woff2')}@font-face{font-family:'Poppins';font-style:normal;font-display:swap;font-weight:500;src:url('${fontBase}/customer-fonts/poppins/poppins-latin-500-normal.woff2') format('woff2')}@font-face{font-family:'Poppins';font-style:normal;font-display:swap;font-weight:600;src:url('${fontBase}/customer-fonts/poppins/poppins-latin-600-normal.woff2') format('woff2')}@font-face{font-family:'Poppins';font-style:normal;font-display:swap;font-weight:700;src:url('${fontBase}/customer-fonts/poppins/poppins-latin-700-normal.woff2') format('woff2')}`;
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${webFonts}body,table,td,div,p,a,span,strong{font-family:'Poppins','PingFang SC','Hiragino Sans GB','Microsoft YaHei',Arial,Helvetica,sans-serif!important}h1,h2{font-family:'Jost','Poppins','PingFang SC','Hiragino Sans GB','Microsoft YaHei',Arial,Helvetica,sans-serif!important}</style></head><body style="margin:0;background:#F3F6FA;color:#172033;font-family:'Poppins','PingFang SC','Hiragino Sans GB','Microsoft YaHei',Arial,Helvetica,sans-serif"><div style="max-width:620px;margin:0 auto;padding:34px 16px;font-family:'Poppins','PingFang SC','Hiragino Sans GB','Microsoft YaHei',Arial,Helvetica,sans-serif"><div style="background:#fff;border:1px solid #E2E8F0;border-radius:16px;overflow:hidden"><div style="padding:20px 26px;border-bottom:1px solid #EEF2F6;font-family:'Poppins','PingFang SC','Hiragino Sans GB','Microsoft YaHei',Arial,Helvetica,sans-serif">${emailBrandHeader(settings)}</div><div style="padding:28px 26px 26px;font-family:'Poppins','PingFang SC','Hiragino Sans GB','Microsoft YaHei',Arial,Helvetica,sans-serif"><h1 style="font-family:'Jost','Poppins','PingFang SC','Hiragino Sans GB','Microsoft YaHei',Arial,Helvetica,sans-serif;font-size:24px;line-height:1.3;margin:0 0 14px;color:#263A56;font-weight:600">${escapeHtml(title)}</h1>${body}<p style="margin:28px 0 0;padding-top:16px;border-top:1px solid #EEF2F6;color:#98A5B5;font-size:11px;font-family:'Poppins','PingFang SC','Hiragino Sans GB','Microsoft YaHei',Arial,Helvetica,sans-serif">Sent by ${escapeHtml(settings.brandName)}</p></div></div></div></body></html>`;
}

function manageButton(url, settings) {
  return url ? `<p style="margin:24px 0 0"><a href="${escapeHtml(url)}" style="display:inline-block;padding:12px 18px;border-radius:9px;background:${settings.accentColor};color:#fff;text-decoration:none;font-weight:bold">Manage appointment</a></p><p style="font-size:12px;color:#8A94A6">This private link grants access to your appointment. Do not forward it.</p>` : '';
}

function calendarButtons(booking, settings, { includeGoogle = true } = {}) {
  if (!booking?._id || booking.status === 'cancelled') return '';
  const links = calendarLinksForBooking(booking);
  if (!includeGoogle || !links.google) return '';
  const google = `<a href="${escapeHtml(links.google)}" style="display:inline-block;padding:10px 14px;border:1px solid #DADCE0;border-radius:8px;background:#FFFFFF;color:#3C4043;text-decoration:none;font-size:13px;font-weight:600;line-height:20px;box-shadow:0 1px 2px rgba(60,64,67,.08)"><img src="${GOOGLE_G_ICON_URL}" width="18" height="18" alt="Google" style="display:inline-block;width:18px;height:18px;margin:0 10px 0 0;vertical-align:middle;border:0"><span style="display:inline-block;vertical-align:middle">Add to Google Calendar</span></a>`;
  return `<div style="margin:22px 0 0;padding:16px;border-radius:12px;background:#F7F9FC;border:1px solid #E3E9F1"><strong style="display:block;margin:0 0 10px;color:#344861;font-size:13px">Add to calendar</strong>${google}</div>`;
}

function merchantMessage(booking, settings, key) {
  const calendar = booking.status === 'confirmed' ? calendarButtons(booking, settings) : '';
  return messageFor(booking, settings, key, `${staffCustomerSummary(booking)}${calendar}`);
}

function templateFor(settings, key, booking) {
  const template = settings.templates[key] || DEFAULT_EMAIL_SETTINGS.templates[key];
  const variables = templateVariables(booking, { storeName: settings.brandName });
  return {
    subject: interpolateTemplate(template.subject, variables),
    heading: interpolateTemplate(template.heading, variables),
    body: escapeHtml(interpolateTemplate(template.body, variables)).replace(/\n/g, '<br>')
  };
}

async function bookingEmailContext(booking, suppliedSettings = null) {
  if (suppliedSettings) return { settings: normalizeEmailSettings(suppliedSettings), shopEmail: '' };
  const shop = await Shop.findById(booking.shopId).select('email emailSettings').lean();
  return { settings: normalizeEmailSettings(shop?.emailSettings || {}), shopEmail: shop?.email || '' };
}

function messageFor(booking, settings, key, extraHtml = '') {
  const template = templateFor(settings, key, booking);
  const intro = `<p style="margin:0 0 20px;color:#475467;line-height:1.65">${template.body}</p>`;
  return {
    subject: template.subject,
    html: emailDocument(template.heading, `${intro}${appointmentCard(booking, settings)}${extraHtml}`, settings),
    fromName: settings.brandName,
    replyTo: settings.replyToEmail || ''
  };
}

function reportEmailOutcome(shop, result, operation = 'email_delivery', metadata = {}) {
  if (!shop || !result) return result;
  const attempted = Number(result.attempted || (result.skipped ? 0 : 1));
  const failed = Number(result.failed || 0);
  const sent = Math.max(0, attempted - failed);
  if (sent) void incrementOpsUsage(shop, 'external_emails_sent', sent);
  if (failed) {
    void incrementOpsUsage(shop, 'external_email_failures', failed);
    void queueHealthEvent('email.send.failed', {
      shop, severity: 'error', category: 'email',
      message: 'One or more appointment emails could not be delivered.',
      metadata: { ...metadata, operation, count: failed, providerStatus: String(result.provider || 'unknown') }
    });
  }
  return result;
}

async function sendMany(messages, { shop = null, operation = 'email_delivery', metadata = {} } = {}) {
  const results = await Promise.all(messages.map(deliverEmail));
  const summary = {
    skipped: results.every(result => result.skipped),
    provider: results.find(result => !result.skipped)?.provider || results[0]?.provider || 'none',
    attempted: results.filter(result => !result.skipped).length,
    failed: results.filter(result => result.failed).length,
    results
  };
  return reportEmailOutcome(shop, summary, operation, metadata);
}

export async function sendBookingNotifications(booking, merchantEmail = '', managementToken = '', suppliedSettings = null) {
  const { settings, shopEmail } = await bookingEmailContext(booking, suppliedSettings);
  const messages = [];
  if (settings.customerNotifications?.confirmation !== false) {
    const link = managementLinkFor(booking, managementToken);
    messages.push({ to: booking.customer?.email, ...messageFor(booking, settings, 'confirmation', `${manageButton(link, settings)}${calendarButtons(booking, settings)}`) });
  }
  if (settings.merchantNotifications?.newBooking !== false) {
    for (const to of merchantNotificationRecipients(settings, merchantEmail || shopEmail || config.email.merchantTo)) messages.push({ to, ...merchantMessage(booking, settings, 'merchantNewBooking') });
  }
  return sendMany(messages, { shop: booking.shopId, operation: 'booking_confirmation' });
}

export async function sendBookingChangedNotification(booking, suppliedSettings = null) {
  const { settings, shopEmail } = await bookingEmailContext(booking, suppliedSettings);
  const messages = [];
  if (settings.customerNotifications?.bookingChanged !== false) messages.push({ to: booking.customer?.email, ...messageFor(booking, settings, 'merchantUpdated', calendarButtons(booking, settings)) });
  if (settings.merchantNotifications?.bookingChanged !== false) for (const to of merchantNotificationRecipients(settings, shopEmail || config.email.merchantTo)) messages.push({ to, ...merchantMessage(booking, settings, 'merchantBookingUpdated') });
  return sendMany(messages, { shop: booking.shopId, operation: 'booking_changed' });
}

export async function sendCustomerRescheduledNotification(booking, managementToken, suppliedSettings = null) {
  const { settings, shopEmail } = await bookingEmailContext(booking, suppliedSettings);
  const messages = [];
  if (settings.customerNotifications?.bookingChanged !== false) messages.push({ to: booking.customer?.email, ...messageFor(booking, settings, 'rescheduled', `${manageButton(managementLinkFor(booking, managementToken), settings)}${calendarButtons(booking, settings)}`) });
  if (settings.merchantNotifications?.bookingChanged !== false) for (const to of merchantNotificationRecipients(settings, shopEmail || config.email.merchantTo)) messages.push({ to, ...merchantMessage(booking, settings, 'merchantBookingUpdated') });
  return sendMany(messages, { shop: booking.shopId, operation: 'booking_rescheduled' });
}

export async function sendBookingCancelledNotification(booking, suppliedSettings = null) {
  const { settings, shopEmail } = await bookingEmailContext(booking, suppliedSettings);
  const messages = [];
  if (settings.customerNotifications?.bookingCancelled !== false) messages.push({ to: booking.customer?.email, ...messageFor(booking, settings, 'cancelled') });
  if (settings.merchantNotifications?.bookingCancelled !== false) for (const to of merchantNotificationRecipients(settings, shopEmail || config.email.merchantTo)) messages.push({ to, ...merchantMessage(booking, settings, 'merchantBookingCancelled') });
  return sendMany(messages, { shop: booking.shopId, operation: 'booking_cancelled' });
}

export async function sendCustomerUpcomingReminder(booking, suppliedSettings = null) {
  const { settings } = await bookingEmailContext(booking, suppliedSettings);
  if (settings.customerNotifications?.upcomingReminder === false) return { skipped: true, provider: selectedProvider().provider, reason: 'Customer reminder is disabled' };
  const result = await deliverEmail({ to: booking.customer?.email, ...messageFor(booking, settings, 'reminder', calendarButtons(booking, settings)) });
  return reportEmailOutcome(booking.shopId, result, 'customer_reminder', { audience: 'customer' });
}

export async function sendMerchantUpcomingReminder(booking, suppliedSettings = null, merchantEmail = '') {
  const { settings, shopEmail } = await bookingEmailContext(booking, suppliedSettings);
  if (settings.merchantNotifications?.upcomingReminder === false) return { skipped: true, provider: selectedProvider().provider, reason: 'Merchant reminder is disabled' };
  const recipients = merchantNotificationRecipients(settings, merchantEmail || shopEmail || config.email.merchantTo);
  if (!recipients.length) return { skipped: true, provider: selectedProvider().provider, reason: 'Merchant reminder recipient is missing' };
  return sendMany(recipients.map(to => ({ to, ...merchantMessage(booking, settings, 'merchantReminder') })), { shop: booking.shopId, operation: 'merchant_reminder', metadata: { audience: 'merchant' } });
}


export async function sendPostPurchaseScheduleNotification({ entitlement, rule, shop, token }) {
  if (!entitlement?.customer?.email || !rule?._id || !token) return { skipped: true, provider: selectedProvider().provider, reason: 'Post-purchase scheduling recipient is missing' };
  const settings = normalizeEmailSettings(shop?.emailSettings || {});
  if (settings.customerNotifications?.postPurchaseScheduleLink === false) {
    return { skipped: true, suppressed: true, provider: selectedProvider().provider, reason: 'POST_PURCHASE_NOTIFICATION_DISABLED' };
  }
  const remaining = Math.max(0, Number(entitlement.eligibleQuantity || 0) - Number(entitlement.usedBookings || 0));
  const scheduleUrl = `${config.appUrl}/book/${encodeURIComponent(String(rule._id))}?access=${encodeURIComponent(token)}`;
  const orderLabel = entitlement.orderName ? `Order ${entitlement.orderName}` : 'Your order';
  const quantityCopy = remaining > 1 ? `${remaining} appointments are available from this purchase.` : 'One appointment is available from this purchase.';
  const intro = `<p style="margin:0 0 18px;color:#475467;line-height:1.65">Hi ${escapeHtml(entitlement.customer.name || 'there')},</p><p style="margin:0 0 20px;color:#475467;line-height:1.65">${escapeHtml(orderLabel)} includes <strong>${escapeHtml(rule.serviceTitle || rule.productTitle || 'an appointment service')}</strong>. ${escapeHtml(quantityCopy)} Choose a convenient time using the private scheduling link below.</p>`;
  const orderCard = `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:separate;border-spacing:0;border:1px solid #E3E9F1;border-radius:12px;overflow:hidden;background:#FBFCFE"><tr><td style="padding:10px 12px;color:#8A98AA;font-size:12px;font-weight:600;border-bottom:1px solid #EEF2F6;width:110px">Order</td><td style="padding:10px 12px;color:#344861;font-size:13px;font-weight:600;border-bottom:1px solid #EEF2F6">${escapeHtml(entitlement.orderName || entitlement.orderId || '')}</td></tr><tr><td style="padding:10px 12px;color:#8A98AA;font-size:12px;font-weight:600;width:110px">Service</td><td style="padding:10px 12px;color:#344861;font-size:13px;font-weight:600">${escapeHtml(rule.serviceTitle || rule.productTitle || 'Appointment')}</td></tr></table>`;
  const button = `<p style="margin:24px 0 0"><a href="${escapeHtml(scheduleUrl)}" style="display:inline-block;padding:12px 18px;border-radius:9px;background:${settings.accentColor};color:#fff;text-decoration:none;font-weight:bold">Schedule appointment</a></p><p style="font-size:12px;color:#8A94A6;line-height:1.55">This private link is connected to your paid order. Do not forward it.</p>`;
  const result = await deliverEmail({
    to: entitlement.customer.email,
    subject: `Schedule your ${rule.serviceTitle || rule.productTitle || 'appointment'} — ${entitlement.orderName || 'order confirmed'}`,
    html: emailDocument('Schedule your appointment', `${intro}${orderCard}${button}`, settings),
    fromName: settings.brandName,
    replyTo: settings.replyToEmail || ''
  });
  return reportEmailOutcome(shop?._id || entitlement.shopId, result, 'post_purchase_schedule_link', { audience: 'customer' });
}


async function staffNotificationRecipient(staffId, shopId = null) {
  if (!staffId) return null;
  const filter = { _id: staffId, ...(shopId ? { shopId } : {}) };
  const staff = await Staff.findOne(filter).select('name email notifications status').lean();
  if (!staff?.email || staff.status !== 'active' || staff.notifications?.emailEnabled !== true) return null;
  return staff;
}

function staffCustomerSummary(booking) {
  const customer = booking.customer || {};
  const rows = [
    customer.name ? `<tr><td style="padding:8px 0;color:#8A98AA;font-size:12px;width:110px">Customer</td><td style="padding:8px 0;color:#344861;font-size:13px;font-weight:600">${escapeHtml(customer.name)}</td></tr>` : '',
    customer.email ? `<tr><td style="padding:8px 0;color:#8A98AA;font-size:12px;width:110px">Email</td><td style="padding:8px 0;color:#344861;font-size:13px">${escapeHtml(customer.email)}</td></tr>` : '',
    customer.phone ? `<tr><td style="padding:8px 0;color:#8A98AA;font-size:12px;width:110px">Phone</td><td style="padding:8px 0;color:#344861;font-size:13px">${escapeHtml(customer.phone)}</td></tr>` : ''
  ].filter(Boolean).join('');
  return rows ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:14px;border-collapse:collapse">${rows}</table>` : '';
}

function staffNotificationCopy(kind, booking, recipientName = '') {
  const service = booking.productTitle || 'Appointment';
  const hello = recipientName ? `Hi ${recipientName},` : 'Hello,';
  if (kind === 'cancelled') return {
    subject: `Appointment cancelled: ${service}`,
    heading: 'Appointment cancelled',
    body: `${hello} this appointment has been cancelled and is no longer on your schedule.`
  };
  if (kind === 'reassigned') return {
    subject: `Appointment reassigned: ${service}`,
    heading: 'Appointment reassigned',
    body: `${hello} this appointment has been reassigned and is no longer assigned to you.`
  };
  if (kind === 'updated') return {
    subject: `Appointment updated: ${service}`,
    heading: 'Appointment updated',
    body: `${hello} an appointment assigned to you has changed. Review the latest schedule below.`
  };
  return {
    subject: `New appointment assigned: ${service}`,
    heading: 'New appointment assigned',
    body: `${hello} a new appointment has been assigned to you.`
  };
}

async function deliverStaffNotification(booking, staff, kind, suppliedSettings = null) {
  if (!staff?.email) return { skipped: true, reason: 'Staff notification recipient is missing' };
  const { settings } = await bookingEmailContext(booking, suppliedSettings);
  const copy = staffNotificationCopy(kind, booking, staff.name || '');
  const intro = `<p style="margin:0 0 20px;color:#475467;line-height:1.65">${escapeHtml(copy.body)}</p>`;
  const html = emailDocument(copy.heading, `${intro}${appointmentCard(booking, settings)}${staffCustomerSummary(booking)}${booking.status === 'confirmed' ? calendarButtons(booking, settings) : ''}`, settings);
  const result = await deliverEmail({ to: staff.email, subject: copy.subject, html, fromName: settings.brandName, replyTo: settings.replyToEmail || '' });
  return reportEmailOutcome(booking.shopId, result, `staff_${kind}`, { audience: 'staff' });
}

export async function sendStaffAssignedNotification(booking, suppliedSettings = null) {
  const staff = await staffNotificationRecipient(booking.staffId, booking.shopId);
  if (!staff) return { skipped: true, reason: 'Assigned staff email notifications are disabled or unavailable' };
  return deliverStaffNotification(booking, staff, 'assigned', suppliedSettings);
}

export async function sendStaffBookingUpdatedNotification(booking, previousBooking = null, suppliedSettings = null) {
  const previousId = previousBooking?.staffId ? String(previousBooking.staffId) : '';
  const nextId = booking?.staffId ? String(booking.staffId) : '';
  const messages = [];
  if (previousId && previousId !== nextId) {
    const previousStaff = await staffNotificationRecipient(previousId, booking?.shopId || previousBooking?.shopId);
    if (previousStaff) messages.push(deliverStaffNotification(previousBooking || booking, previousStaff, 'reassigned', suppliedSettings));
  }
  if (nextId) {
    const nextStaff = await staffNotificationRecipient(nextId, booking?.shopId || previousBooking?.shopId);
    if (nextStaff) messages.push(deliverStaffNotification(booking, nextStaff, previousId && previousId !== nextId ? 'assigned' : 'updated', suppliedSettings));
  }
  if (!messages.length) return { skipped: true, reason: 'No staff notification recipient available' };
  const results = await Promise.all(messages);
  return { skipped: results.every(result => result.skipped), attempted: results.filter(result => !result.skipped).length, failed: results.filter(result => result.failed).length, results };
}

export async function sendStaffCancelledNotification(booking, suppliedSettings = null) {
  const staff = await staffNotificationRecipient(booking.staffId, booking.shopId);
  if (!staff) return { skipped: true, reason: 'Assigned staff email notifications are disabled or unavailable' };
  return deliverStaffNotification(booking, staff, 'cancelled', suppliedSettings);
}

export async function sendTestEmail(to, suppliedSettings = null) {
  const settings = normalizeEmailSettings(suppliedSettings || {});
  const booking = { _id: 'email-template-preview', status: 'confirmed', productTitle: 'Private consultation', date: '2026-09-08', time: '14:00', duration: 60, timezone: 'Asia/Shanghai', location: 'Main showroom', staff: 'Alex', customer: { name: 'Jamie', email: to } };
  const message = messageFor(booking, settings, 'confirmation', calendarButtons(booking, settings));
  return deliverEmail({ to, subject: `[Test] ${message.subject}`, html: message.html, fromName: message.fromName, replyTo: message.replyTo });
}
