import DmPackage, { SingleSendMailRequest } from '@alicloud/dm20151123';
import { Config as OpenApiConfig } from '@alicloud/openapi-client';
import { RuntimeOptions } from '@alicloud/tea-util';
import { Resend } from 'resend';
import { config } from '../config.js';

const DmClient = DmPackage.default;
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

function directMail() {
  if (aliyunClient) return aliyunClient;
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
  const request = new SingleSendMailRequest({
    accountName: config.email.aliyun.accountName,
    addressType: 1,
    replyToAddress: config.email.aliyun.replyToAddress,
    toAddress: message.to,
    subject: message.subject,
    htmlBody: message.html,
    fromAlias: config.email.aliyun.fromAlias,
    ...(config.email.aliyun.tagName ? { tagName: config.email.aliyun.tagName } : {})
  });
  const response = await directMail().singleSendMailWithOptions(request, new RuntimeOptions({}));
  return { provider: 'aliyun', requestId: response?.body?.requestId || '' };
}

async function deliverWithResend(message) {
  resendClient ||= new Resend(config.email.resendKey);
  const response = await resendClient.emails.send({ from: config.email.from, ...message });
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

function appointmentCard(booking) {
  return `<div style="padding:16px;border:1px solid #d1fae5;border-radius:10px;background:#f0fdf4"><strong>${escapeHtml(booking.productTitle)}</strong><p style="margin:8px 0 0">${escapeHtml(booking.date)} at ${escapeHtml(booking.time)}</p><p style="margin:4px 0 0">Location: ${escapeHtml(booking.location || 'To be confirmed')}</p><p style="margin:4px 0 0">Staff: ${escapeHtml(booking.staff || 'To be confirmed')}</p></div>`;
}

function emailDocument(title, body) {
  return `<!doctype html><html><body style="margin:0;background:#f6f7f9;color:#1f2937;font-family:Arial,sans-serif"><div style="max-width:620px;margin:0 auto;padding:28px 18px"><div style="background:#fff;border-radius:12px;padding:26px"><h1 style="font-size:24px;margin:0 0 18px">${escapeHtml(title)}</h1>${body}<p style="margin:24px 0 0;color:#6b7280;font-size:13px">Appointment Lite</p></div></div></body></html>`;
}

function manageButton(url) {
  return url ? `<p style="margin:22px 0 0"><a href="${escapeHtml(url)}" style="display:inline-block;padding:12px 18px;border-radius:8px;background:#166534;color:#fff;text-decoration:none;font-weight:bold">Manage appointment</a></p><p style="font-size:12px;color:#6b7280">This private link grants access to your appointment. Do not forward it.</p>` : '';
}

async function sendMany(messages) {
  const results = await Promise.all(messages.map(deliverEmail));
  return {
    skipped: results.every(result => result.skipped),
    provider: results.find(result => !result.skipped)?.provider || results[0]?.provider || 'none',
    attempted: results.filter(result => !result.skipped).length,
    failed: results.filter(result => result.failed).length,
    results
  };
}

export async function sendBookingNotifications(booking, merchantEmail = '', managementToken = '') {
  const link = managementLinkFor(booking, managementToken);
  const customerHtml = emailDocument('Appointment confirmed', `${appointmentCard(booking)}${manageButton(link)}`);
  const messages = [{ to: booking.customer?.email, subject: `Appointment confirmed: ${booking.productTitle}`, html: customerHtml }];
  const merchantTo = merchantEmail || config.email.merchantTo;
  if (merchantTo) messages.push({ to: merchantTo, subject: `New appointment: ${booking.productTitle} — ${booking.date} at ${booking.time}`, html: emailDocument('New appointment', appointmentCard(booking)) });
  return sendMany(messages);
}

export async function sendBookingChangedNotification(booking) {
  return deliverEmail({
    to: booking.customer?.email,
    subject: `Appointment updated: ${booking.productTitle}`,
    html: emailDocument('Your appointment was updated by the store', `${appointmentCard(booking)}<p>If you have questions or need another change, please contact the store.</p>`)
  });
}

export async function sendCustomerRescheduledNotification(booking, managementToken) {
  return deliverEmail({
    to: booking.customer?.email,
    subject: `Appointment changed: ${booking.productTitle}`,
    html: emailDocument('Appointment changed', `${appointmentCard(booking)}<p>Your one online change has been used. Contact the store if you need another change.</p>${manageButton(managementLinkFor(booking, managementToken))}`)
  });
}

export async function sendBookingCancelledNotification(booking) {
  return deliverEmail({
    to: booking.customer?.email,
    subject: `Appointment cancelled: ${booking.productTitle}`,
    html: emailDocument('Appointment cancelled', `${appointmentCard(booking)}<p>This appointment is no longer active and the reserved time has been released.</p>`)
  });
}

export async function sendTestEmail(to) {
  return deliverEmail({
    to,
    subject: 'Appointment Lite email test',
    html: emailDocument('Email delivery is working', '<p>Your configured Appointment Lite email provider successfully delivered this test message.</p>')
  });
}
