import { config } from '../config.js';
import { publicSubscriptionSnapshot, subscriptionAccessAllowed } from '../services/subscription.js';

export function requireActiveSubscription(req, res, next) {
  if (!config.subscription.enabled || subscriptionAccessAllowed(req.shop)) return next();
  return res.status(402).json({
    error: 'SUBSCRIPTION_REQUIRED',
    message: 'Appointment Lite Pro subscription is required.',
    subscription: publicSubscriptionSnapshot(req.shop)
  });
}

export function publicSubscriptionUnavailable(shop) {
  return config.subscription.enabled && !subscriptionAccessAllowed(shop);
}
