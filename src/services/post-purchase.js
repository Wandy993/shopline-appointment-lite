import { createHash, randomBytes } from 'node:crypto';
import { AppointmentRule } from '../models/AppointmentRule.js';
import { Shop } from '../models/Shop.js';
import { PostPurchaseEntitlement } from '../models/PostPurchaseEntitlement.js';
import { sendPostPurchaseScheduleNotification } from './email.js';
import { normalizeProductId } from '../lib/product-catalog.js';
import { subscriptionAccessAllowed } from './subscription.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NOTIFICATION_CLAIM_STALE_MS = 15 * 60 * 1000;
const NOTIFICATION_RETRY_MS = 5 * 60 * 1000;

export function hashPostPurchaseToken(token) {
  return createHash('sha256').update(String(token || '')).digest('hex');
}

function validAccessToken(token) {
  return /^[A-Za-z0-9_-]{43}$/.test(String(token || ''));
}

function cleanText(value, max = 255) {
  return String(value ?? '').trim().slice(0, max);
}

function orderIdOf(payload = {}) {
  return cleanText(payload.id || payload.order_id || payload.orderId, 100);
}

function orderNameOf(payload = {}) {
  return cleanText(payload.name || payload.order_number || payload.orderNumber, 100);
}

function orderCreatedAtOf(payload = {}) {
  const raw = payload.created_at || payload.createdAt || payload.order_created_at || payload.orderCreatedAt;
  if (!raw) return undefined;
  const value = new Date(raw);
  return Number.isNaN(value.getTime()) ? undefined : value;
}

function orderStatusOf(payload = {}) {
  return cleanText(payload.status || (payload.cancelled_at ? 'cancelled' : ''), 40).toLowerCase();
}

function financialStatusOf(payload = {}) {
  return cleanText(payload.financial_status || payload.financialStatus, 40).toLowerCase();
}

function orderCustomer(payload = {}) {
  const customer = payload.customer || {};
  const shipping = payload.shipping_address || {};
  const billing = payload.billing_address || {};
  const email = cleanText(payload.email || customer.email, 254).toLowerCase();
  const name = cleanText(
    customer.name || [customer.first_name, customer.last_name].filter(Boolean).join(' ') ||
    shipping.name || [shipping.first_name, shipping.last_name].filter(Boolean).join(' ') ||
    billing.name || [billing.first_name, billing.last_name].filter(Boolean).join(' ') || 'Customer',
    120
  );
  const phone = cleanText(payload.phone || customer.phone || shipping.phone || billing.phone, 40);
  return { name, email: EMAIL_PATTERN.test(email) ? email : '', phone };
}

function orderShippingAddress(payload = {}) {
  const source = payload.shipping_address || payload.shippingAddress || {};
  return {
    name: cleanText(source.name || [source.first_name, source.last_name].filter(Boolean).join(' '), 120),
    address1: cleanText(source.address1 || source.address_1, 200),
    address2: cleanText(source.address2 || source.address_2, 200),
    city: cleanText(source.city, 120),
    province: cleanText(source.province || source.state, 120),
    country: cleanText(source.country, 120),
    countryCode: cleanText(source.country_code || source.countryCode, 8),
    zip: cleanText(source.zip || source.postal_code || source.postalCode, 40),
    phone: cleanText(source.phone, 60)
  };
}

function lineItems(payload = {}) {
  return Array.isArray(payload.line_items) ? payload.line_items : [];
}

function productQuantityMap(payload = {}) {
  const quantities = new Map();
  for (const item of lineItems(payload)) {
    const productId = normalizeProductId(cleanText(item.product_id || item.productId, 200));
    const quantity = Math.max(0, Math.min(100, Number(item.quantity || 0)));
    if (!productId || !Number.isFinite(quantity) || quantity <= 0) continue;
    quantities.set(productId, Math.min(100, Number(quantities.get(productId) || 0) + quantity));
  }
  return quantities;
}

export function publicPostPurchaseEntitlement(entitlement) {
  const eligibleQuantity = Number(entitlement?.eligibleQuantity || 0);
  const usedBookings = Number(entitlement?.usedBookings || 0);
  return {
    id: entitlement?._id ? String(entitlement._id) : '',
    orderName: entitlement?.orderName || '',
    productId: entitlement?.productId || '',
    eligibleQuantity,
    usedBookings,
    remainingBookings: Math.max(0, eligibleQuantity - usedBookings),
    status: entitlement?.status || '',
    customer: {
      name: entitlement?.customer?.name || '',
      email: entitlement?.customer?.email || '',
      phone: entitlement?.customer?.phone || ''
    },
    shippingAddress: {
      name: entitlement?.shippingAddress?.name || '',
      address1: entitlement?.shippingAddress?.address1 || '',
      address2: entitlement?.shippingAddress?.address2 || '',
      city: entitlement?.shippingAddress?.city || '',
      province: entitlement?.shippingAddress?.province || '',
      country: entitlement?.shippingAddress?.country || '',
      countryCode: entitlement?.shippingAddress?.countryCode || '',
      zip: entitlement?.shippingAddress?.zip || '',
      phone: entitlement?.shippingAddress?.phone || ''
    }
  };
}

export async function getPostPurchaseEntitlement({ ruleId, token, EntitlementModel = PostPurchaseEntitlement }) {
  if (!validAccessToken(token)) return null;
  const entitlement = await EntitlementModel.findOne({ ruleId, tokenHash: hashPostPurchaseToken(token) });
  if (!entitlement) return null;
  return entitlement;
}

async function sendScheduleLinkIfNeeded({ entitlement, rule, shop, now = new Date(), EntitlementModel = PostPurchaseEntitlement }) {
  if (!entitlement?._id || entitlement.status !== 'active' || entitlement.notificationSentAt) return { skipped: true };
  if (!entitlement.customer?.email) {
    await EntitlementModel.updateOne({ _id: entitlement._id }, { $set: { notificationError: 'The order does not include a valid customer email.' } });
    return { skipped: true, reason: 'CUSTOMER_EMAIL_MISSING' };
  }

  const staleClaim = new Date(now.getTime() - NOTIFICATION_CLAIM_STALE_MS);
  const claimed = await EntitlementModel.findOneAndUpdate(
    {
      _id: entitlement._id, status: 'active', notificationSentAt: null,
      $or: [{ notificationClaimedAt: null }, { notificationClaimedAt: { $lt: staleClaim } }]
    },
    { $set: { notificationClaimedAt: now, notificationLastAttemptAt: now, notificationError: '' } },
    { new: true }
  );
  if (!claimed) return { skipped: true, reason: 'ALREADY_CLAIMED' };

  const token = randomBytes(32).toString('base64url');
  claimed.tokenHash = hashPostPurchaseToken(token);
  await claimed.save();
  const result = await sendPostPurchaseScheduleNotification({ entitlement: claimed, rule, shop, token });
  if (result?.suppressed) {
    await EntitlementModel.updateOne({ _id: claimed._id }, { $set: { notificationSentAt: now, notificationClaimedAt: null, notificationError: '' } });
    return result;
  }
  if (result?.failed || result?.skipped) {
    await EntitlementModel.updateOne({ _id: claimed._id }, { $set: {
      notificationClaimedAt: null,
      notificationError: cleanText(result?.reason || 'Could not send the scheduling email.', 500)
    } });
    return result;
  }
  await EntitlementModel.updateOne({ _id: claimed._id }, { $set: { notificationSentAt: now, notificationClaimedAt: null, notificationError: '' } });
  return result;
}

export async function upsertPostPurchaseEntitlementsFromOrder({ shop, payload, paid = false, webhookId = '', RuleModel = AppointmentRule, EntitlementModel = PostPurchaseEntitlement }) {
  const orderId = orderIdOf(payload);
  if (!shop?._id || !orderId) return { matched: 0, activated: 0, notified: 0, orderId };
  if (!subscriptionAccessAllowed(shop)) return { matched: 0, activated: 0, notified: 0, orderId, skipped: true, reason: 'SUBSCRIPTION_INACTIVE' };
  const quantities = productQuantityMap(payload);
  if (!quantities.size) return { matched: 0, activated: 0, notified: 0, orderId };

  const productIds = [...quantities.keys()];
  const rules = await RuleModel.find({
    shopId: shop._id,
    commerceMode: 'product_post_purchase',
    enabled: true,
    $or: [
      { 'purchaseTrigger.products.id': { $in: productIds } },
      { productId: { $in: productIds } }
    ]
  });
  let activated = 0;
  let notified = 0;
  const customer = orderCustomer(payload);
  const shippingAddress = orderShippingAddress(payload);
  const financialStatus = financialStatusOf(payload);
  const orderStatus = orderStatusOf(payload);
  const orderCreatedAt = orderCreatedAtOf(payload);

  for (const rule of rules) {
    const triggerIds = (rule.purchaseTrigger?.products || []).map(item => String(item.id || '')).filter(Boolean);
    if (!triggerIds.length && rule.productId) triggerIds.push(String(rule.productId));
    const matchedTriggerIds = triggerIds.filter(id => quantities.has(id));
    if (!matchedTriggerIds.length) continue;
    const eligibleQuantity = Math.max(1, matchedTriggerIds.reduce((sum, id) => sum + Number(quantities.get(id) || 0), 0));
    const entitlementProductId = matchedTriggerIds[0];
    let entitlement = await EntitlementModel.findOneAndUpdate(
      { shopId: shop._id, ruleId: rule._id, orderId },
      {
        $setOnInsert: { shopId: shop._id, ruleId: rule._id, productId: entitlementProductId, orderId, usedBookings: 0, bookingIds: [] },
        $set: {
          orderName: orderNameOf(payload), eligibleQuantity, customer, shippingAddress,
          financialStatus: paid ? 'paid' : financialStatus,
          orderStatus,
          ...(orderCreatedAt ? { orderCreatedAt } : {}),
          lastWebhookId: cleanText(webhookId, 120)
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    if (orderStatus === 'cancelled') {
      entitlement = await EntitlementModel.findOneAndUpdate(
        { _id: entitlement._id },
        { $set: { status: 'revoked', revokedAt: new Date(), revocationReason: 'SHOPLINE order was cancelled.' } },
        { new: true }
      );
      continue;
    }

    if (paid && entitlement.status !== 'revoked') {
      const nextStatus = Number(entitlement.usedBookings || 0) >= eligibleQuantity ? 'exhausted' : 'active';
      entitlement = await EntitlementModel.findOneAndUpdate(
        { _id: entitlement._id },
        { $set: { status: nextStatus, financialStatus: 'paid', revokedAt: null, revocationReason: '' } },
        { new: true }
      );
      if (nextStatus === 'active') {
        activated += 1;
        const result = await sendScheduleLinkIfNeeded({ entitlement, rule, shop, EntitlementModel });
        if (!result?.skipped && !result?.failed) notified += 1;
      }
    } else if (entitlement.status !== 'revoked') {
      await EntitlementModel.updateOne({ _id: entitlement._id }, { $set: { status: 'pending_payment' } });
    }
  }
  return { matched: rules.length, activated, notified, orderId };
}

export async function activatePostPurchaseEntitlementsForOrder({ shop, orderId, webhookId = '', EntitlementModel = PostPurchaseEntitlement, RuleModel = AppointmentRule }) {
  if (!shop?._id || !orderId) return { matched: 0, activated: 0, notified: 0 };
  if (!subscriptionAccessAllowed(shop)) return { matched: 0, activated: 0, notified: 0, skipped: true, reason: 'SUBSCRIPTION_INACTIVE' };
  const entitlements = await EntitlementModel.find({ shopId: shop._id, orderId, status: { $in: ['pending_payment', 'active', 'exhausted'] } });
  let activated = 0;
  let notified = 0;
  for (let entitlement of entitlements) {
    const rule = await RuleModel.findOne({ _id: entitlement.ruleId, shopId: shop._id, commerceMode: 'product_post_purchase', enabled: true });
    if (!rule) continue;
    const nextStatus = Number(entitlement.usedBookings || 0) >= Number(entitlement.eligibleQuantity || 1) ? 'exhausted' : 'active';
    entitlement = await EntitlementModel.findOneAndUpdate(
      { _id: entitlement._id, status: { $ne: 'revoked' } },
      { $set: { status: nextStatus, financialStatus: 'paid', lastWebhookId: cleanText(webhookId, 120) } },
      { new: true }
    );
    if (!entitlement) continue;
    if (nextStatus === 'active') {
      activated += 1;
      const result = await sendScheduleLinkIfNeeded({ entitlement, rule, shop, EntitlementModel });
      if (!result?.skipped && !result?.failed) notified += 1;
    }
  }
  return { matched: entitlements.length, activated, notified };
}

export async function revokePostPurchaseEntitlementsForOrder({ shop, orderId, reason = 'SHOPLINE order was cancelled.', webhookId = '', EntitlementModel = PostPurchaseEntitlement }) {
  if (!shop?._id || !orderId) return { revoked: 0 };
  const result = await EntitlementModel.updateMany(
    { shopId: shop._id, orderId, status: { $ne: 'revoked' } },
    { $set: { status: 'revoked', revokedAt: new Date(), revocationReason: cleanText(reason, 240), lastWebhookId: cleanText(webhookId, 120) } }
  );
  return { revoked: Number(result.modifiedCount || 0) };
}

export async function claimPostPurchaseEntitlement({ entitlementId, EntitlementModel = PostPurchaseEntitlement }) {
  const entitlement = await EntitlementModel.findOneAndUpdate(
    {
      _id: entitlementId,
      status: 'active',
      $expr: { $lt: ['$usedBookings', '$eligibleQuantity'] }
    },
    { $inc: { usedBookings: 1 } },
    { new: true }
  );
  if (!entitlement) return null;
  if (Number(entitlement.usedBookings || 0) >= Number(entitlement.eligibleQuantity || 1)) {
    entitlement.status = 'exhausted';
    await entitlement.save();
  }
  return entitlement;
}


export async function releasePostPurchaseEntitlementClaim({ entitlementId, EntitlementModel = PostPurchaseEntitlement }) {
  const entitlement = await EntitlementModel.findById(entitlementId);
  if (!entitlement) return null;
  entitlement.usedBookings = Math.max(0, Number(entitlement.usedBookings || 0) - 1);
  if (entitlement.status !== 'revoked') entitlement.status = entitlement.usedBookings >= entitlement.eligibleQuantity ? 'exhausted' : 'active';
  await entitlement.save();
  return entitlement;
}

export async function attachBookingToPostPurchaseEntitlement({ entitlementId, bookingId, EntitlementModel = PostPurchaseEntitlement }) {
  return EntitlementModel.updateOne({ _id: entitlementId }, { $addToSet: { bookingIds: bookingId } });
}

export async function restorePostPurchaseEntitlementForBooking(booking, { EntitlementModel = PostPurchaseEntitlement } = {}) {
  const entitlementId = booking?.postPurchase?.entitlementId;
  if (!entitlementId) return null;
  const entitlement = await EntitlementModel.findById(entitlementId);
  if (!entitlement) return null;
  if ((entitlement.bookingIds || []).every(id => String(id) !== String(booking._id))) return entitlement;
  entitlement.bookingIds = (entitlement.bookingIds || []).filter(id => String(id) !== String(booking._id));
  entitlement.usedBookings = Math.max(0, Number(entitlement.usedBookings || 0) - 1);
  if (entitlement.status !== 'revoked') entitlement.status = entitlement.usedBookings >= entitlement.eligibleQuantity ? 'exhausted' : 'active';
  await entitlement.save();
  return entitlement;
}


export async function processPostPurchaseScheduleNotifications({
  now = new Date(), limit = 100, EntitlementModel = PostPurchaseEntitlement, RuleModel = AppointmentRule, ShopModel = Shop
} = {}) {
  const staleAttempt = new Date(now.getTime() - NOTIFICATION_RETRY_MS);
  const staleClaim = new Date(now.getTime() - NOTIFICATION_CLAIM_STALE_MS);
  const entitlements = await EntitlementModel.find({
    status: 'active',
    notificationSentAt: null,
    $and: [
      { $or: [{ notificationClaimedAt: null }, { notificationClaimedAt: { $lt: staleClaim } }] },
      { $or: [{ notificationLastAttemptAt: null }, { notificationLastAttemptAt: { $lt: staleAttempt } }] }
    ]
  }).limit(Math.max(1, Math.min(500, Number(limit || 100))));

  let sent = 0;
  let failed = 0;
  for (const entitlement of entitlements) {
    const [rule, shop] = await Promise.all([
      RuleModel.findOne({ _id: entitlement.ruleId, shopId: entitlement.shopId, commerceMode: 'product_post_purchase', enabled: true }),
      ShopModel.findOne({ _id: entitlement.shopId, uninstalledAt: null }).lean()
    ]);
    if (!rule || !shop) {
      await EntitlementModel.updateOne({ _id: entitlement._id }, { $set: {
        notificationError: !rule ? 'The post-purchase appointment service is no longer active.' : 'The store is no longer installed.',
        notificationLastAttemptAt: now
      } });
      failed += 1;
      continue;
    }
    if (!subscriptionAccessAllowed(shop)) continue;
    const result = await sendScheduleLinkIfNeeded({ entitlement, rule, shop, now, EntitlementModel });
    if (!result?.skipped && !result?.failed) sent += 1;
    else if (result?.failed || result?.reason) failed += 1;
  }
  return { scanned: entitlements.length, sent, failed };
}

export function startPostPurchaseNotificationScheduler({ intervalMs = 2 * 60_000, initialDelayMs = 20_000 } = {}) {
  let stopped = false;
  let running = false;
  let interval = null;
  const run = async () => {
    if (stopped || running) return;
    running = true;
    try {
      const result = await processPostPurchaseScheduleNotifications();
      if (result.sent || result.failed) console.info('Post-purchase scheduling email retry.', result);
    } catch (error) {
      console.error('Post-purchase scheduling email retry failed', error.message);
    } finally {
      running = false;
    }
  };
  const initial = setTimeout(() => {
    run();
    interval = setInterval(run, intervalMs);
    interval.unref?.();
  }, initialDelayMs);
  initial.unref?.();
  return {
    run,
    stop() {
      stopped = true;
      clearTimeout(initial);
      if (interval) clearInterval(interval);
    }
  };
}
