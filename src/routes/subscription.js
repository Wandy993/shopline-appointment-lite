import { Router } from 'express';
import { requireAdmin } from '../middleware/auth.js';
import { SubscriptionCheckout } from '../models/SubscriptionCheckout.js';
import { querySubscriptionChargeStatus, syncSubscriptionForShop } from '../services/subscription.js';

export const subscriptionRouter = Router();

subscriptionRouter.get('/return', requireAdmin, async (req, res) => {
  const trade = String(req.query.trade || '').trim();
  if (trade) {
    const attempt = await SubscriptionCheckout.findOne({ shopId: req.shop._id, outTradeNo: trade });
    if (attempt) {
      try {
        const charge = await querySubscriptionChargeStatus(trade);
        const code = Number(charge?.data?.status ?? charge?.status);
        const status = code === 200 ? 'paid' : code === 300 ? 'cancelled' : code === 400 ? 'failed' : attempt.status;
        await SubscriptionCheckout.updateOne({ _id: attempt._id }, { $set: { status, paymentStatusCode: Number.isFinite(code) ? code : undefined, completedAt: [200,300,400].includes(code) ? new Date() : undefined } });
      } catch (error) {
        console.warn('Could not query SHOPLINE subscription charge status after checkout return:', error.message);
      }
    }
  }
  try {
    await syncSubscriptionForShop(req.shop, { source: 'checkout_return' });
  } catch (error) {
    console.warn('Could not sync SHOPLINE subscription after checkout return:', error.message);
  }
  res.redirect(302, '/app?subscription=return');
});
