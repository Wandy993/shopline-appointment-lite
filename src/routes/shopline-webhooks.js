import { config } from '../config.js';
import { verifyShoplineWebhookSignature } from '../lib/shopline-webhook.js';
import { Booking } from '../models/Booking.js';
import { WebhookReceipt } from '../models/WebhookReceipt.js';
import { Shop } from '../models/Shop.js';
import { appointmentLiteBookingIdFromOrder } from '../lib/paid-checkout.js';
import { attachPaidOrderToBooking, confirmPaidBooking } from '../services/bookings.js';
import { activatePostPurchaseEntitlementsForOrder, revokePostPurchaseEntitlementsForOrder, upsertPostPurchaseEntitlementsFromOrder } from '../services/post-purchase.js';
import { findInstalledShop } from '../services/shops.js';
import { incrementOpsUsage, queueHealthEvent, queueShopInstalled, queueShopUninstalled } from '../services/ops-hub.js';
import { applySubscriptionActivatedWebhook, applySubscriptionExpiredWebhook, recordSubscriptionPaymentWebhook, subscriptionAccessAllowed, syncSubscriptionForShop } from '../services/subscription.js';

const LIFECYCLE_TOPIC = 'apps/installed_uninstalled';
const SUBSCRIPTION_CREATED_TOPIC = 'appsubscription/create';
const SUBSCRIPTION_EXPIRED_TOPIC = 'appsubscription/expiration';
const SUBSCRIPTION_PAID_TOPIC = 'appsubscription/paid';
const SUBSCRIPTION_TOPICS = new Set([SUBSCRIPTION_CREATED_TOPIC, SUBSCRIPTION_EXPIRED_TOPIC, SUBSCRIPTION_PAID_TOPIC]);
const SUPPORTED_TOPICS = new Set(['orders/create', 'orders/paid', 'order_transactions/create', 'orders/cancelled', LIFECYCLE_TOPIC, ...SUBSCRIPTION_TOPICS]);

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

function lifecycleActionOf(payload = {}) {
  const values = [payload.operation, payload.action, payload.status, payload.event, payload.type, payload.event_type, payload.eventType]
    .map(value => String(value || '').trim().toLowerCase())
    .filter(Boolean);
  const combined = values.join(' ');
  if (/uninstall|uninstalled|remove|removed/.test(combined)) return 'uninstalled';
  if (/install|installed/.test(combined)) return 'installed';
  return '';
}

async function opsShopForWebhook(shoplineStoreId, payload = {}) {
  const handle = String(payload.handle || payload.shop_handle || payload.shopHandle || '').trim().toLowerCase();
  if (shoplineStoreId) {
    const shop = await Shop.findOne({ shoplineStoreId: String(shoplineStoreId) });
    if (shop) return shop;
  }
  if (handle) return Shop.findOne({ handle });
  return null;
}

export function orderPayloadIsPaid(payload = {}) {
  if (financialStatusOf(payload) === 'paid') return true;
  if (String(payload.pay_status || payload.payStatus || '').trim().toLowerCase() === 'paid') return true;
  const payments = Array.isArray(payload.payment_details) ? payload.payment_details : Array.isArray(payload.paymentDetails) ? payload.paymentDetails : [];
  return payments.some(item => String(item?.pay_status || item?.payStatus || '').trim().toLowerCase() === 'paid');
}

async function paidReceiptExists({ orderId, shoplineStoreId }) {
  if (!orderId) return false;
  return Boolean(await WebhookReceipt.exists({
    topic: { $in: ['orders/paid', 'order_transactions/create'] }, shoplineStoreId, externalId: orderId, status: 'processed'
  }));
}

async function handleOrderCreated({ payload, webhookId, shoplineStoreId, receipt }) {
  const orderId = orderIdOf(payload);
  const financialStatus = financialStatusOf(payload);
  const paid = orderPayloadIsPaid(payload) || await paidReceiptExists({ orderId, shoplineStoreId });
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

async function handleOrderPaid({ payload, webhookId, shoplineStoreId, receipt }) {
  const orderId = orderIdOf(payload);
  if (!orderId) {
    await finishReceipt(receipt, 'ignored');
    return { ok: true, ignored: true, reason: 'ORDER_ID_MISSING' };
  }
  const shop = await findInstalledShop({ shopId: shoplineStoreId });
  const bookingId = appointmentLiteBookingIdFromOrder(payload);
  let paidBooking = { matched: false, confirmed: false, reason: '' };

  if (bookingId) {
    const booking = await Booking.findById(bookingId);
    if (booking?.commerceMode === 'standalone_paid') {
      const bookingShop = await findInstalledShop({ objectId: booking.shopId });
      if (bookingShop && (!shoplineStoreId || String(bookingShop.shoplineStoreId || '') === shoplineStoreId)) {
        await attachPaidOrderToBooking({ bookingId, orderId, orderName: orderNameOf(payload), financialStatus: 'paid', webhookId });
        const confirmation = await confirmPaidBooking({ bookingId, orderId, orderName: orderNameOf(payload), financialStatus: 'paid', webhookId });
        paidBooking = { matched: true, confirmed: Boolean(confirmation?.confirmed), reason: confirmation?.reason || '' };
      }
    }
  } else {
    const booking = await Booking.findOne({ commerceMode: 'standalone_paid', 'payment.shoplineOrderId': orderId });
    if (booking) {
      const confirmation = await confirmPaidBooking({ bookingId: booking._id, orderId, orderName: orderNameOf(payload) || booking.payment?.shoplineOrderName || '', financialStatus: 'paid', webhookId });
      paidBooking = { matched: true, confirmed: Boolean(confirmation?.confirmed), reason: confirmation?.reason || '' };
    }
  }

  const postPurchase = shop
    ? await upsertPostPurchaseEntitlementsFromOrder({ shop, payload, paid: true, webhookId })
    : { matched: 0, activated: 0, notified: 0, orderId };
  const handled = paidBooking.matched || postPurchase.matched > 0;
  await finishReceipt(receipt, handled ? 'processed' : 'ignored', { externalId: orderId });
  return { ok: true, orderId, paidBooking, postPurchase, ignored: !handled };
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

async function subscriptionShopForPayload(shoplineStoreId, payload = {}) {
  const handle = String(payload.handle || '').trim().toLowerCase();
  return findInstalledShop({ shopId: shoplineStoreId, shop: handle });
}

function subscriptionPayloadMatchesApp(payload = {}) {
  const appKey = String(payload.appkey || payload.app_key || '').trim();
  return !appKey || appKey === config.shopline.appKey;
}

async function handleSubscriptionCreated({ payload, shoplineStoreId, receipt }) {
  const subId = String(payload.subId || payload.sub_id || '').trim();
  if (!subscriptionPayloadMatchesApp(payload)) {
    await finishReceipt(receipt, 'ignored', { externalId: subId });
    return { ok: true, ignored: true, reason: 'APP_KEY_MISMATCH' };
  }
  const shop = await subscriptionShopForPayload(shoplineStoreId, payload);
  if (!shop) {
    await finishReceipt(receipt, 'ignored', { externalId: subId });
    return { ok: true, ignored: true, reason: 'STORE_NOT_FOUND' };
  }
  await applySubscriptionActivatedWebhook(shop, payload);
  await finishReceipt(receipt, 'processed', { externalId: subId });
  return { ok: true, subscription: 'active', subId };
}

async function handleSubscriptionExpired({ payload, shoplineStoreId, receipt }) {
  const subId = String(payload.subId || payload.sub_id || '').trim();
  if (!subscriptionPayloadMatchesApp(payload)) {
    await finishReceipt(receipt, 'ignored', { externalId: subId });
    return { ok: true, ignored: true, reason: 'APP_KEY_MISMATCH' };
  }
  const shop = await subscriptionShopForPayload(shoplineStoreId, payload);
  if (!shop) {
    await finishReceipt(receipt, 'ignored', { externalId: subId });
    return { ok: true, ignored: true, reason: 'STORE_NOT_FOUND' };
  }
  await applySubscriptionExpiredWebhook(shop, payload);
  // The Partner list endpoint is the final authority. A failed refresh must not
  // make the webhook itself fail because the signed expiration event was valid.
  await syncSubscriptionForShop(shop, { source: 'webhook_expiration_sync' }).catch(error => {
    console.warn('Could not refresh subscription after expiration webhook:', error.message);
  });
  await finishReceipt(receipt, 'processed', { externalId: subId });
  return { ok: true, subscription: 'expired', subId };
}

async function handleSubscriptionPayment({ payload, shoplineStoreId, receipt }) {
  const externalId = String(payload.bizOrderNo || payload.out_trade_no || payload.subId || '').trim();
  if (!subscriptionPayloadMatchesApp(payload)) {
    await finishReceipt(receipt, 'ignored', { externalId });
    return { ok: true, ignored: true, reason: 'APP_KEY_MISMATCH' };
  }
  const shop = await subscriptionShopForPayload(shoplineStoreId, payload);
  if (!shop) {
    await finishReceipt(receipt, 'ignored', { externalId });
    return { ok: true, ignored: true, reason: 'STORE_NOT_FOUND' };
  }
  const payment = await recordSubscriptionPaymentWebhook(shop, payload);
  if (payment.status === 'paid') {
    await syncSubscriptionForShop(shop, { source: 'webhook_payment_sync' }).catch(error => {
      console.warn('Could not refresh subscription after payment webhook:', error.message);
    });
  }
  await finishReceipt(receipt, 'processed', { externalId });
  return { ok: true, payment: payment.status, subId: payment.subId };
}

async function handleLifecycle({ payload, shoplineStoreId, receipt }) {
  const action = lifecycleActionOf(payload);
  const shop = await opsShopForWebhook(shoplineStoreId, payload);
  if (!action || !shop) {
    await finishReceipt(receipt, 'ignored', { externalId: action || '' });
    return { ok: true, ignored: true, reason: !action ? 'LIFECYCLE_ACTION_UNKNOWN' : 'STORE_NOT_FOUND' };
  }

  if (action === 'uninstalled') {
    await Shop.updateOne({ _id: shop._id }, { $set: { uninstalledAt: new Date() } });
    void queueShopUninstalled(shop, { source: 'shopline_webhook' });
  } else {
    await Shop.updateOne({ _id: shop._id }, { $set: { uninstalledAt: null } });
    const current = await Shop.findById(shop._id).lean();
    void queueShopInstalled(current || shop, { source: 'shopline_webhook' });
  }
  await finishReceipt(receipt, 'processed', { externalId: action });
  return { ok: true, action };
}

export async function shoplinePaidBookingWebhook(req, res) {
  const topic = header(req, 'X-Shopline-Topic');
  const webhookId = header(req, 'X-Shopline-Webhook-Id');
  const shoplineStoreId = header(req, 'X-Shopline-Shop-Id');
  const signature = header(req, 'X-Shopline-Hmac-Sha256');

  if (!verifyShoplineWebhookSignature(req.body, signature, config.shopline.appSecret)) {
    void queueHealthEvent('shopline.webhook.invalid_signature', {
      severity: 'warning', category: 'webhook',
      message: 'A SHOPLINE webhook was rejected because its signature was invalid.',
      metadata: { topic, errorCode: 'INVALID_SIGNATURE', operation: 'webhook_verify' }
    });
    return res.status(401).json({ ok: false });
  }
  if (!webhookId || !topic) return res.status(400).json({ ok: false });
  if (!SUPPORTED_TOPICS.has(topic)) return res.status(200).json({ ok: true, ignored: true });

  let payload;
  try { payload = JSON.parse(req.body.toString('utf8')); }
  catch {
    void queueHealthEvent('shopline.webhook.invalid_json', {
      severity: 'warning', category: 'webhook',
      message: 'A signed SHOPLINE webhook contained invalid JSON.',
      metadata: { topic, errorCode: 'INVALID_JSON', operation: 'webhook_parse' }
    });
    return res.status(400).json({ ok: false });
  }

  const opsShop = await opsShopForWebhook(shoplineStoreId, payload).catch(() => null);
  if (opsShop) void incrementOpsUsage(opsShop, 'webhook_received', 1);

  const externalId = SUBSCRIPTION_TOPICS.has(topic)
    ? String(payload.bizOrderNo || payload.out_trade_no || payload.subId || payload.sub_id || '')
    : topic === 'order_transactions/create'
      ? String(payload.order_id || payload.orderId || '')
      : topic === LIFECYCLE_TOPIC ? lifecycleActionOf(payload) : orderIdOf(payload);
  const { receipt, duplicate } = await startReceipt({ webhookId, topic, shoplineStoreId, externalId });
  if (duplicate && receipt?.status !== 'failed') return res.status(200).json({ ok: true, duplicate: true });

  const businessTopic = !SUBSCRIPTION_TOPICS.has(topic) && topic !== LIFECYCLE_TOPIC;
  if (businessTopic && opsShop && !subscriptionAccessAllowed(opsShop)) {
    await finishReceipt(receipt, 'ignored', { externalId });
    return res.status(200).json({ ok: true, ignored: true, reason: 'SUBSCRIPTION_INACTIVE' });
  }

  try {
    const result = topic === 'orders/create'
      ? await handleOrderCreated({ payload, webhookId, shoplineStoreId, receipt })
      : topic === 'orders/paid'
        ? await handleOrderPaid({ payload, webhookId, shoplineStoreId, receipt })
        : topic === 'order_transactions/create'
          ? await handleOrderPayment({ payload, webhookId, shoplineStoreId, receipt })
          : topic === 'orders/cancelled'
            ? await handleOrderCancelled({ payload, webhookId, shoplineStoreId, receipt })
            : topic === SUBSCRIPTION_CREATED_TOPIC
              ? await handleSubscriptionCreated({ payload, webhookId, shoplineStoreId, receipt })
              : topic === SUBSCRIPTION_EXPIRED_TOPIC
                ? await handleSubscriptionExpired({ payload, webhookId, shoplineStoreId, receipt })
                : topic === SUBSCRIPTION_PAID_TOPIC
                  ? await handleSubscriptionPayment({ payload, webhookId, shoplineStoreId, receipt })
                  : await handleLifecycle({ payload, webhookId, shoplineStoreId, receipt });
    return res.status(200).json(result);
  } catch (error) {
    await finishReceipt(receipt, 'failed', { externalId, error: error.message }).catch(() => {});
    if (opsShop) void incrementOpsUsage(opsShop, 'webhook_failures', 1);
    const healthEventType = topic === LIFECYCLE_TOPIC ? 'shopline.webhook.failed' : SUBSCRIPTION_TOPICS.has(topic) ? 'subscription.webhook.failed' : 'order.webhook.failed';
    void queueHealthEvent(healthEventType, {
      shop: opsShop, severity: 'error', category: 'webhook',
      message: topic === LIFECYCLE_TOPIC ? 'SHOPLINE lifecycle webhook processing failed.' : SUBSCRIPTION_TOPICS.has(topic) ? 'SHOPLINE subscription webhook processing failed.' : 'SHOPLINE order webhook processing failed.',
      metadata: { topic, errorCode: String(error?.code || error?.name || 'WEBHOOK_PROCESSING_FAILED'), operation: 'webhook_process' }
    });
    console.error('SHOPLINE booking commerce webhook failed', { topic, webhookId, message: error.message });
    return res.status(500).json({ ok: false });
  }
}
