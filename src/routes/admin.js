import { Router } from 'express';
import { AppointmentRule } from '../models/AppointmentRule.js';
import { Booking } from '../models/Booking.js';
import { validateRuleInput } from '../lib/validation.js';
import { requireAdmin, requireCsrf } from '../middleware/auth.js';
import { limitsFor } from '../services/plans.js';
import { shoplineGet } from '../services/shopline.js';

export const adminRouter = Router();
adminRouter.use(requireAdmin, requireCsrf);

adminRouter.get('/bootstrap', async (req, res) => {
  const [ruleCount, activeRuleCount, bookingCount, upcomingCount] = await Promise.all([
    AppointmentRule.countDocuments({ shopId: req.shop._id }),
    AppointmentRule.countDocuments({ shopId: req.shop._id, enabled: true }),
    Booking.countDocuments({ shopId: req.shop._id }),
    Booking.countDocuments({ shopId: req.shop._id, status: 'confirmed', date: { $gte: new Date().toISOString().slice(0, 10) } })
  ]);
  res.json({ shop: { handle: req.shop.handle, locale: req.shop.locale, timezone: req.shop.timezone, plan: req.shop.plan }, limits: limitsFor(req.shop.plan), csrfToken: req.csrfToken, stats: { ruleCount, activeRuleCount, bookingCount, upcomingCount } });
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
    if (value.enabled && await AppointmentRule.countDocuments({ shopId: req.shop._id, enabled: true }) >= limits.activeRules) {
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
    if (!rule.enabled && value.enabled) {
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

adminRouter.post('/bookings/:id/cancel', async (req, res) => {
  const booking = await Booking.findOneAndUpdate(
    { _id: req.params.id, shopId: req.shop._id, status: 'confirmed' },
    { status: 'cancelled', cancelledAt: new Date() },
    { new: true }
  );
  if (!booking) return res.status(404).json({ error: 'NOT_FOUND', message: 'Confirmed booking not found.' });
  res.json({ booking });
});
