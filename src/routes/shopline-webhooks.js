import { config } from '../config.js';
import { verifyShoplineWebhookSignature } from '../lib/shopline-webhook.js';
import { Booking } from '../models/Booking.js';
import { WebhookReceipt } from '../models/WebhookReceipt.js';
import { appointmentLiteBookingIdFromOrder } from '../lib/paid-checkout.js';
import { attachPaidOrderToBooking, confirmPaidBooking } from '../services/bookings.js';
import { activatePostPurchaseEntitlementsForOrder, revokePostPurchaseEntitlementsForOrder, upsertPostPurchaseEntitlementsFromOrder } from '../services/post-purchase.js';
import { findInstalledShop } from '../services/shops.js';

const SUPPORTED_TOPICS = new Set(['orders/create', 'order_transactions/create', 'orders/cancelled']);

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

async function paidReceiptExists({ orderId, shoplineStoreId }) {
  if (!orderId) return false;
  return Boolean(await WebhookReceipt.exists({
    topic: 'order_transactions/create', shoplineStoreId, externalId: orderId, status: 'processed'
  }));
}

async function handleOrderCreated({ payload, webhookId, shoplineStoreId, receipt }) {
  const orderId = orderIdOf(payload);
  const financialStatus = financialStatusOf(payload);
  const paid = financialStatus === 'paid' || await paidReceiptExists({ orderId, shoplineStoreId });
  const shop = await findInstalledShop({ shopId: shoplineStoreId });
  const bookingId = appointmentLiteBookingIdFromOrder(payload);
  let paidBooking = { matched: false, confirmed: false, reason: '' };

  if (bookingId) {
    const booking = await Booking.findById(bookingId);
    if (booking?.commerceMode === 'standalone_paid') {
      const bookingShop = await findInstalledShop({ objectId: booking.shopId });
      if (bookingShop && (!shoplineStoreId || String(bookingShop.shoplineStoreId || '') === shoplineStoreId)) {
        await attachPaidOrderToBooking({ bookingId, orderId, orderName: orderNameOf(payload), financialStatus, webhookId });
        const confirmation = paid ? await confirmPaidBooking({
          bookingId, orderId, orderName: orderNameOf(payload), financialStatus: 'paid', webhookId
        }) : null;
        paidBooking = { matched: true, confirmed: Boolean(confirmation?.confirmed), reason: confirmation?.reason || '' };
      }
    }
  }

  const postPurchase = shop
    ? await upsertPostPurchaseEntitlementsFromOrder({ shop, payload, paid, webhookId })
    : { matched: 0, activated: 0, notified: 0, orderId };

  const handled = paidBooking.matched || postPurchase.matched > 0;
  await finishReceipt(receipt, handled ? 'processed' : 'ignored', { externalId: orderId });
  return { ok: true, orderId, paid, paidBooking, postPurchase, ignored: !handled };
}

async function handleOrderPayment({ payload, webhookId, shoplineStoreId, receipt }) {
  const orderId = String(payload.order_id || payload.orderId || '').trim();
  const payStatus = String(payload.pay_status || payload.payStatus || '').trim().toLowerCase();
  if (!orderId || payStatus !== 'paid') {
    await finishReceipt(receipt, 'ignored', { externalId: orderId });
    return { ok: true, ignored: true, reason: payStatus === 'paid' ? 'ORDER_ID_MISSING' : 'PAYMENT_NOT_PAID' };
  }

  const booking = await Booking.findOne({ commerceMode: 'standalone_paid', 'payment.shoplineOrderId': orderId });
  let paidBookingMatched = false;
  if (booking) {
    const bookingShop = await findInstalledShop({ objectId: booking.shopId });
    if (bookingShop && (!shoplineStoreId || String(bookingShop.shoplineStoreId || '') === shoplineStoreId)) {
      await confirmPaidBooking({ bookingId: booking._id, orderId, orderName: booking.payment?.shoplineOrderName || '', financialStatus: 'paid', webhookId });
      paidBookingMatched = true;
    }
  }

  const shop = await findInstalledShop({ shopId: shoplineStoreId });
  const postPurchase = shop
    ? await activatePostPurchaseEntitlementsForOrder({ shop, orderId, webhookId })
    : { matched: 0, activated: 0, notified: 0 };

  // Persist the paid order ID even when orders/create has not arrived yet. The
  // orders/create handler uses this receipt to close both checkout and
  // post-purchase webhook ordering races.
  await finishReceipt(receipt, 'processed', { externalId: orderId });
  return { ok: true, orderId, paidBookingMatched, postPurchase };
}

async function handleOrderCancelled({ payload, webhookId, shoplineStoreId, receipt }) {
  const orderId = orderIdOf(payload);
  const shop = await findInstalledShop({ shopId: shoplineStoreId });
  if (!shop || !orderId) {
    await finishReceipt(receipt, 'ignored', { externalId: orderId });
    return { ok: true, ignored: true, reason: !orderId ? 'ORDER_ID_MISSING' : 'STORE_NOT_FOUND' };
  }
  const postPurchase = await revokePostPurchaseEntitlementsForOrder({ shop, orderId, webhookId });
  await finishReceipt(receipt, postPurchase.revoked > 0 ? 'processed' : 'ignored', { externalId: orderId });
  return { ok: true, orderId, postPurchase };
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
      : topic === 'order_transactions/create'
        ? await handleOrderPayment({ payload, webhookId, shoplineStoreId, receipt })
        : await handleOrderCancelled({ payload, webhookId, shoplineStoreId, receipt });
    return res.status(200).json(result);
  } catch (error) {
    await finishReceipt(receipt, 'failed', { externalId, error: error.message }).catch(() => {});
    console.error('SHOPLINE booking commerce webhook failed', { topic, webhookId, message: error.message });
    return res.status(500).json({ ok: false });
  }
}
