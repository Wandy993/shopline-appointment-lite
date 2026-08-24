import { Router } from 'express';
import { config } from '../config.js';
import { AppointmentRule } from '../models/AppointmentRule.js';
import { Booking } from '../models/Booking.js';
import { validateAdminBookingInput, validateRuleInput } from '../lib/validation.js';
import { requireAdmin, requireCsrf } from '../middleware/auth.js';
import { limitsFor } from '../services/plans.js';
import { shoplineGet, syncShopMetadata } from '../services/shopline.js';
import { cancelBookingByMerchant, updateBookingByMerchant } from '../services/bookings.js';
import { emailStatus, sendTestEmail } from '../services/email.js';
import { zonedNow } from '../lib/slots.js';
import { normalizeEmailSettings, validateEmailSettings } from '../lib/email-settings.js';

export const adminRouter = Router();
adminRouter.use(requireAdmin, requireCsrf);

adminRouter.get('/bootstrap', async (req, res) => {
  if (!req.shop.shoplineStoreId) {
    try {
      const metadata = await syncShopMetadata(req.shop._id);
      Object.assign(req.shop, metadata);
    } catch (error) { console.warn('Could not refresh shop metadata:', error.message); }
  }
  const storeNow = zonedNow(req.shop.timezone || 'UTC');
  const upcomingFilter = { shopId: req.shop._id, status: 'confirmed', $or: [{ date: { $gt: storeNow.date } }, { date: storeNow.date, time: { $gt: storeNow.time } }] };
  const [ruleCount, activeRuleCount, bookingCount, upcomingCount, nextBookings] = await Promise.all([
    AppointmentRule.countDocuments({ shopId: req.shop._id }),
    AppointmentRule.countDocuments({ shopId: req.shop._id, enabled: true }),
    Booking.countDocuments({ shopId: req.shop._id }),
    Booking.countDocuments(upcomingFilter),
    Booking.find(upcomingFilter)
      .sort({ date: 1, time: 1 }).limit(4).select('productTitle date time timezone location staff customer.name').lean()
  ]);
  res.json({
    shop: { handle: req.shop.handle, storeId: req.shop.shoplineStoreId || '', locale: req.shop.locale, timezone: req.shop.timezone, plan: req.shop.plan, email: req.shop.email || '' },
    email: emailStatus(), emailSettings: normalizeEmailSettings(req.shop.emailSettings || {}), nextBookings,
    limits: { ...limitsFor(req.shop.plan), enforced: config.planLimitsEnabled }, csrfToken: req.csrfToken,
    stats: { ruleCount, activeRuleCount, bookingCount, upcomingCount }
  });
});

adminRouter.get('/products', async (req, res, next) => {
  try {
    const payload = await shoplineGet(req.shop._id, 'products/products.json', { limit: 100, status: 'active', fields: 'id,title,handle,path,status' });
    const products = payload.products || payload.data?.products || payload.data || [];
    res.json({ products: Array.isArray(products) ? products.map(product => ({ id: String(product.id), title: product.title, handle: product.handle || '', path: product.path || '' })) : [] });
  } catch (error) { next(error); }
});

adminRouter.get('/rules', async (req, res) => {
  const rules = await AppointmentRule.find({ shopId: req.shop._id }).sort({ updatedAt: -1 }).lean();
  res.json({ rules });
});

adminRouter.post('/rules', async (req, res, next) => {
  try {
    const { errors, value } = validateRuleInput(req.body);
    if (errors.length) return res.status(422).json({ error: 'VALIDATION_ERROR', message: errors.join(' '), fields: errors });
    const limits = limitsFor(req.shop.plan);
    if (config.planLimitsEnabled && value.enabled && await AppointmentRule.countDocuments({ shopId: req.shop._id, enabled: true }) >= limits.activeRules) {
      return res.status(403).json({ error: 'PLAN_LIMIT', message: `${limits.label} allows ${limits.activeRules} active appointment rule${limits.activeRules === 1 ? '' : 's'}.` });
    }
    const rule = await AppointmentRule.create({ shopId: req.shop._id, ...value });
    res.status(201).json({ rule });
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ error: 'DUPLICATE_PRODUCT', message: 'This product already has an appointment rule.' });
    next(error);
  }
});

adminRouter.put('/rules/:id', async (req, res, next) => {
  try {
    const rule = await AppointmentRule.findOne({ _id: req.params.id, shopId: req.shop._id });
    if (!rule) return res.status(404).json({ error: 'NOT_FOUND', message: 'Rule not found.' });
    const { errors, value } = validateRuleInput(req.body);
    if (errors.length) return res.status(422).json({ error: 'VALIDATION_ERROR', message: errors.join(' '), fields: errors });
    if (config.planLimitsEnabled && !rule.enabled && value.enabled) {
      const limits = limitsFor(req.shop.plan);
      if (await AppointmentRule.countDocuments({ shopId: req.shop._id, enabled: true }) >= limits.activeRules) return res.status(403).json({ error: 'PLAN_LIMIT', message: `${limits.label} plan active-rule limit reached.` });
    }
    Object.assign(rule, value);
    await rule.save();
    res.json({ rule });
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ error: 'DUPLICATE_PRODUCT', message: 'This product already has an appointment rule.' });
    next(error);
  }
});

adminRouter.delete('/rules/:id', async (req, res) => {
  const hasBookings = await Booking.exists({ ruleId: req.params.id, shopId: req.shop._id });
  if (hasBookings) return res.status(409).json({ error: 'RULE_HAS_BOOKINGS', message: 'This rule has booking history. Disable it instead of deleting it.' });
  const result = await AppointmentRule.deleteOne({ _id: req.params.id, shopId: req.shop._id });
  if (!result.deletedCount) return res.status(404).json({ error: 'NOT_FOUND', message: 'Rule not found.' });
  res.status(204).end();
});

adminRouter.get('/bookings', async (req, res) => {
  const filter = { shopId: req.shop._id };
  if (req.query.status && ['confirmed', 'cancelled'].includes(req.query.status)) filter.status = req.query.status;
  const bookings = await Booking.find(filter).sort({ date: -1, time: -1 }).limit(500).lean();
  res.json({ bookings });
});

adminRouter.put('/bookings/:id', async (req, res, next) => {
  try {
    const { errors, value } = validateAdminBookingInput(req.body);
    if (errors.length) return res.status(422).json({ error: 'VALIDATION_ERROR', message: errors.join(' '), fields: errors });
    const result = await updateBookingByMerchant({ shopObjectId: req.shop._id, bookingId: req.params.id, input: value });
    res.json(result);
  } catch (error) { next(error); }
});

adminRouter.post('/bookings/:id/cancel', async (req, res, next) => {
  try {
    const result = await cancelBookingByMerchant({ shopObjectId: req.shop._id, bookingId: req.params.id });
    res.json(result);
  } catch (error) { next(error); }
});

adminRouter.put('/email/settings', async (req, res) => {
  const { errors, value } = validateEmailSettings(req.body);
  if (errors.length) return res.status(422).json({ error: 'VALIDATION_ERROR', message: errors.join(' '), fields: errors });
  req.shop.emailSettings = value;
  await req.shop.save();
  res.json({ settings: normalizeEmailSettings(req.shop.emailSettings) });
});

adminRouter.post('/email/test', async (req, res) => {
  const settings = normalizeEmailSettings(req.shop.emailSettings || {});
  const to = settings.merchantNotificationEmail || req.shop.email || config.email.merchantTo;
  if (!to) return res.status(422).json({ error: 'EMAIL_REQUIRED', message: 'Add a store email or MERCHANT_NOTIFICATION_EMAIL before sending a test.' });
  const result = await sendTestEmail(to, settings);
  if (result.skipped) return res.status(422).json({ error: 'EMAIL_NOT_CONFIGURED', message: result.reason, result });
  if (result.failed) return res.status(502).json({ error: 'EMAIL_FAILED', message: result.reason || 'Email provider rejected the test.', result });
  res.json({ to, result });
});
