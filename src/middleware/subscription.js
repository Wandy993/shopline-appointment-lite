import { config } from '../config.js';
import { publicSubscriptionSnapshot, subscriptionAccessAllowed, subscriptionAdminMode } from '../services/subscription.js';

export function requireActiveSubscription(req, res, next) {
  if (!config.subscription.enabled || subscriptionAccessAllowed(req.shop)) return next();
  return res.status(402).json({
    error: 'SUBSCRIPTION_REQUIRED',
    message: 'Appointment Lite Pro subscription is required.',
    subscription: publicSubscriptionSnapshot(req.shop)
  });
}

export function requireAdminSubscriptionAccess(req, res, next) {
  if (!config.subscription.enabled || subscriptionAccessAllowed(req.shop)) return next();

  const adminMode = subscriptionAdminMode(req.shop);
  const archiveReadOnlyRequest = adminMode === 'archive' && req.method === 'GET' && req.path === '/bookings';
  if (archiveReadOnlyRequest) return next();

  return res.status(402).json({
    error: adminMode === 'archive' ? 'SUBSCRIPTION_ARCHIVE_READ_ONLY' : 'SUBSCRIPTION_REQUIRED',
    message: adminMode === 'archive'
      ? 'Appointment Lite is in read-only archive mode. Only booking records and CSV export are available until the SHOPLINE subscription is renewed.'
      : 'Appointment Lite Pro subscription is required.',
    subscription: publicSubscriptionSnapshot(req.shop)
  });
}

export function publicSubscriptionUnavailable(shop) {
  return config.subscription.enabled && !subscriptionAccessAllowed(shop);
}
