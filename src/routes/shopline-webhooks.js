import { config } from '../config.js';
import { verifyShoplineWebhookSignature } from '../lib/shopline-webhook.js';
import { Booking } from '../models/Booking.js';
import { WebhookReceipt } from '../models/WebhookReceipt.js';
import { appointmentLiteBookingIdFromOrder } from '../lib/paid-checkout.js';
import { attachPaidOrderToBooking, confirmPaidBooking } from '../services/bookings.js';
import { findInstalledShop } from '../services/shops.js';

const SUPPORTED_TOPICS = new Set(['orders/create', 'order_transactions/create']);

function header(req, name) {
  return String(req.get(name) || '').trim();
}

async function startReceipt({ webhookId, topic, shoplineStoreId, externalId = '' }) {
  try {
    return { receipt: await WebhookReceipt.create({ webhookId, topic, shoplineStoreId, externalId, status: 'processing' }), duplicate: false };
  } catch (error) {
    if (error?.code !== 11000) throw error;
    return { receipt: await WebhookReceipt.findOne({ webhookId }), duplicate: true };
  }
}

async function finishReceipt(receipt, status, { externalId = '', error = '' } = {}) {
  if (!receipt?._id) return;
  await WebhookReceipt.updateOne({ _id: receipt._id }, { $set: {
    status,
    ...(externalId ? { externalId: String(externalId) } : {}),
    lastError: String(error || '').slice(0, 500),
    processedAt: new Date()
  } });
}

function orderIdOf(payload = {}) {
  return String(payload.id || payload.order_id || payload.orderId || '').trim();
}

function orderNameOf(payload = {}) {
  return String(payload.name || payload.order_number || payload.orderNumber || '').trim();
}

function financialStatusOf(payload = {}) {
  return String(payload.financial_status || payload.financialStatus || '').trim().toLowerCase();
}

async function handleOrderCreated({ payload, webhookId, shoplineStoreId, receipt }) {
  const orderId = orderIdOf(payload);
  const bookingId = appointmentLiteBookingIdFromOrder(payload);
  if (!bookingId) {
    await finishReceipt(receipt, 'ignored', { externalId: orderId });
    return { ok: true, ignored: true, reason: 'NO_APPOINTMENT_LITE_BOOKING' };
  }

  const booking = await Booking.findById(bookingId);
  if (!booking || booking.commerceMode !== 'standalone_paid') {
    await finishReceipt(receipt, 'ignored', { externalId: orderId });
    return { ok: true, ignored: true, reason: 'BOOKING_NOT_FOUND' };
  }
  const shop = await findInstalledShop({ objectId: booking.shopId });
  if (!shop || (shoplineStoreId && String(shop.shoplineStoreId || '') !== shoplineStoreId)) {
    await finishReceipt(receipt, 'ignored', { externalId: orderId, error: 'Store identity mismatch.' });
    return { ok: true, ignored: true, reason: 'STORE_MISMATCH' };
  }

  const financialStatus = financialStatusOf(payload);
  await attachPaidOrderToBooking({ bookingId, orderId, orderName: orderNameOf(payload), financialStatus, webhookId });
  const paymentReceipt = orderId ? await WebhookReceipt.exists({
    topic: 'order_transactions/create', shoplineStoreId, externalId: orderId, status: 'processed'
  }) : null;
  const paid = financialStatus === 'paid' || Boolean(paymentReceipt);
  const confirmation = paid ? await confirmPaidBooking({
    bookingId, orderId, orderName: orderNameOf(payload), financialStatus: 'paid', webhookId
  }) : null;
  await finishReceipt(receipt, 'processed', { externalId: orderId });
  return { ok: true, bookingId, paid, confirmed: Boolean(confirmation?.confirmed), confirmationReason: confirmation?.reason || '' };
}

async function handleOrderPayment({ payload, webhookId, shoplineStoreId, receipt }) {
  const orderId = String(payload.order_id || payload.orderId || '').trim();
  const payStatus = String(payload.pay_status || payload.payStatus || '').trim().toLowerCase();
  if (!orderId || payStatus !== 'paid') {
    await finishReceipt(receipt, 'ignored', { externalId: orderId });
    return { ok: true, ignored: true, reason: payStatus === 'paid' ? 'ORDER_ID_MISSING' : 'PAYMENT_NOT_PAID' };
  }

  const booking = await Booking.findOne({ commerceMode: 'standalone_paid', 'payment.shoplineOrderId': orderId });
  if (booking) {
    const shop = await findInstalledShop({ objectId: booking.shopId });
    if (!shop || (shoplineStoreId && String(shop.shoplineStoreId || '') !== shoplineStoreId)) {
      await finishReceipt(receipt, 'ignored', { externalId: orderId, error: 'Store identity mismatch.' });
      return { ok: true, ignored: true, reason: 'STORE_MISMATCH' };
    }
    await confirmPaidBooking({ bookingId: booking._id, orderId, orderName: booking.payment?.shoplineOrderName || '', financialStatus: 'paid', webhookId });
  }
  // Persist the paid order ID even when orders/create has not arrived yet. The
  // orders/create handler uses this receipt to close the webhook ordering race.
  await finishReceipt(receipt, 'processed', { externalId: orderId });
  return { ok: true, orderId, matched: Boolean(booking) };
}

export async function shoplinePaidBookingWebhook(req, res) {
  const topic = header(req, 'X-Shopline-Topic');
  const webhookId = header(req, 'X-Shopline-Webhook-Id');
  const shoplineStoreId = header(req, 'X-Shopline-Shop-Id');
  const signature = header(req, 'X-Shopline-Hmac-Sha256');

  if (!verifyShoplineWebhookSignature(req.body, signature, config.shopline.appSecret)) return res.status(401).json({ ok: false });
  if (!webhookId || !topic) return res.status(400).json({ ok: false });
  if (!SUPPORTED_TOPICS.has(topic)) return res.status(200).json({ ok: true, ignored: true });

  let payload;
  try { payload = JSON.parse(req.body.toString('utf8')); }
  catch { return res.status(400).json({ ok: false }); }

  const externalId = topic === 'order_transactions/create'
    ? String(payload.order_id || payload.orderId || '')
    : orderIdOf(payload);
  const { receipt, duplicate } = await startReceipt({ webhookId, topic, shoplineStoreId, externalId });
  if (duplicate && receipt?.status !== 'failed') return res.status(200).json({ ok: true, duplicate: true });

  try {
    const result = topic === 'orders/create'
      ? await handleOrderCreated({ payload, webhookId, shoplineStoreId, receipt })
      : await handleOrderPayment({ payload, webhookId, shoplineStoreId, receipt });
    return res.status(200).json(result);
  } catch (error) {
    await finishReceipt(receipt, 'failed', { externalId, error: error.message }).catch(() => {});
    console.error('SHOPLINE paid booking webhook failed', { topic, webhookId, message: error.message });
    return res.status(500).json({ ok: false });
  }
}
