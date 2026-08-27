import { Booking } from '../models/Booking.js';
import { PostPurchaseEntitlement } from '../models/PostPurchaseEntitlement.js';
import { Shop } from '../models/Shop.js';
import { appointmentLiteBookingIdFromOrder } from '../lib/paid-checkout.js';
import { confirmPaidBooking, expirePendingPaidBookings } from './bookings.js';
import { upsertPostPurchaseEntitlementsFromOrder } from './post-purchase.js';
import { shoplineGet, SHOPLINE_ORDER_SCOPE } from './shopline.js';

function orderList(payload = {}) {
  const rows = payload.orders ?? payload.data?.orders ?? payload.data ?? [];
  return Array.isArray(rows) ? rows : [];
}

export function shoplineOrderIsPaid(order = {}) {
  if (String(order.financial_status || order.financialStatus || '').toLowerCase() === 'paid') return true;
  const payments = Array.isArray(order.payment_details) ? order.payment_details : Array.isArray(order.paymentDetails) ? order.paymentDetails : [];
  return payments.some(item => String(item?.pay_status || item?.payStatus || '').toLowerCase() === 'paid');
}

function hasReadOrders(shop) {
  return (shop?.scopes || []).map(String).includes(SHOPLINE_ORDER_SCOPE);
}

async function confirmStandalonePaidFromOrder({ shop, order, BookingModel = Booking }) {
  const orderId = String(order.id || order.order_id || order.orderId || '').trim();
  if (!orderId || !shoplineOrderIsPaid(order)) return { matched: false, confirmed: false };
  let booking = await BookingModel.findOne({ shopId: shop._id, commerceMode: 'standalone_paid', 'payment.shoplineOrderId': orderId });
  if (!booking) {
    const bookingId = appointmentLiteBookingIdFromOrder(order);
    if (bookingId) booking = await BookingModel.findOne({ _id: bookingId, shopId: shop._id, commerceMode: 'standalone_paid' });
  }
  if (!booking) return { matched: false, confirmed: false };
  const result = await confirmPaidBooking({
    bookingId: booking._id,
    orderId,
    orderName: String(order.name || order.order_number || booking.payment?.shoplineOrderName || ''),
    financialStatus: 'paid',
    webhookId: `reconcile:${orderId}`,
    BookingModel
  });
  return { matched: true, confirmed: Boolean(result?.confirmed), reason: result?.reason || '' };
}

async function reconcileOrdersForShop({ shop, orders, BookingModel = Booking, EntitlementModel = PostPurchaseEntitlement }) {
  let standaloneMatched = 0;
  let standaloneConfirmed = 0;
  let postPurchaseMatched = 0;
  let postPurchaseActivated = 0;
  let postPurchaseNotified = 0;
  for (const order of orders) {
    if (!shoplineOrderIsPaid(order)) continue;
    const standalone = await confirmStandalonePaidFromOrder({ shop, order, BookingModel });
    if (standalone.matched) standaloneMatched += 1;
    if (standalone.confirmed) standaloneConfirmed += 1;
    const postPurchase = await upsertPostPurchaseEntitlementsFromOrder({
      shop,
      payload: order,
      paid: true,
      webhookId: `reconcile:${String(order.id || order.order_id || '')}`,
      EntitlementModel
    });
    postPurchaseMatched += Number(postPurchase.matched || 0);
    postPurchaseActivated += Number(postPurchase.activated || 0);
    postPurchaseNotified += Number(postPurchase.notified || 0);
  }
  return { standaloneMatched, standaloneConfirmed, postPurchaseMatched, postPurchaseActivated, postPurchaseNotified };
}

export async function reconcilePendingCommercePayments({
  limit = 100,
  BookingModel = Booking,
  EntitlementModel = PostPurchaseEntitlement,
  ShopModel = Shop,
  shoplineGetFn = shoplineGet
} = {}) {
  const [pendingBookings, pendingEntitlements] = await Promise.all([
    BookingModel.find({ commerceMode: 'standalone_paid', status: 'pending_payment', 'payment.shoplineOrderId': { $nin: ['', null] } })
      .select('shopId payment.shoplineOrderId').limit(limit).lean(),
    EntitlementModel.find({ status: 'pending_payment', orderId: { $nin: ['', null] } })
      .select('shopId orderId').limit(limit).lean()
  ]);
  const byShop = new Map();
  for (const row of [...pendingBookings.map(item => ({ shopId: item.shopId, orderId: item.payment?.shoplineOrderId })), ...pendingEntitlements]) {
    const shopId = String(row.shopId || '');
    const orderId = String(row.orderId || '');
    if (!shopId || !orderId) continue;
    if (!byShop.has(shopId)) byShop.set(shopId, new Set());
    byShop.get(shopId).add(orderId);
  }

  const summary = { shops: 0, ordersChecked: 0, confirmed: 0, activated: 0, notified: 0, skippedNoPermission: 0 };
  for (const [shopId, orderIds] of byShop) {
    const shop = await ShopModel.findOne({ _id: shopId, uninstalledAt: null }).lean();
    if (!shop) continue;
    if (!hasReadOrders(shop)) { summary.skippedNoPermission += 1; continue; }
    summary.shops += 1;
    const ids = [...orderIds];
    for (let index = 0; index < ids.length; index += 100) {
      const chunk = ids.slice(index, index + 100);
      const payload = await shoplineGetFn(shop._id, 'orders.json', { ids: chunk.join(','), status: 'any', limit: String(chunk.length) });
      const orders = orderList(payload);
      summary.ordersChecked += orders.length;
      const result = await reconcileOrdersForShop({ shop, orders, BookingModel, EntitlementModel });
      summary.confirmed += result.standaloneConfirmed;
      summary.activated += result.postPurchaseActivated;
      summary.notified += result.postPurchaseNotified;
    }
  }
  return summary;
}

export async function reconcileRecentPaidOrdersForShop({
  shop,
  days = 7,
  limit = 100,
  BookingModel = Booking,
  EntitlementModel = PostPurchaseEntitlement,
  shoplineGetFn = shoplineGet
} = {}) {
  if (!shop?._id || !hasReadOrders(shop)) return { skipped: true, reason: 'READ_ORDERS_REQUIRED', ordersChecked: 0 };
  const createdAtMin = new Date(Date.now() - Math.max(1, Number(days || 7)) * 24 * 60 * 60 * 1000).toISOString();
  const payload = await shoplineGetFn(shop._id, 'orders.json', {
    financial_status: 'paid',
    status: 'any',
    created_at_min: createdAtMin,
    limit: String(Math.max(1, Math.min(100, Number(limit || 100))))
  });
  const orders = orderList(payload).filter(shoplineOrderIsPaid);
  const result = await reconcileOrdersForShop({ shop, orders, BookingModel, EntitlementModel });
  return { skipped: false, ordersChecked: orders.length, ...result };
}

export function startPaidBookingScheduler({ intervalMs = 45_000, initialDelayMs = 8_000 } = {}) {
  let stopped = false;
  let running = false;
  let timer;

  const run = async () => {
    if (stopped || running) return;
    running = true;
    try {
      const reconciliation = await reconcilePendingCommercePayments();
      if (reconciliation.confirmed || reconciliation.activated || reconciliation.notified) console.info('Reconciled SHOPLINE paid orders', reconciliation);
      const result = await expirePendingPaidBookings();
      if (result.expired) console.log('Expired paid booking holds', result);
    } catch (error) {
      console.error('Paid booking scheduler failed', error.message);
    } finally {
      running = false;
    }
  };

  const startTimer = setTimeout(() => {
    run();
    timer = setInterval(run, intervalMs);
    timer.unref?.();
  }, initialDelayMs);
  startTimer.unref?.();

  return {
    stop() {
      stopped = true;
      clearTimeout(startTimer);
      if (timer) clearInterval(timer);
    },
    run
  };
}
