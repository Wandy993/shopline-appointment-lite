import { Router } from 'express';
import { config } from '../config.js';
import { AppointmentRule } from '../models/AppointmentRule.js';
import { Booking } from '../models/Booking.js';
import { BookingReservation } from '../models/BookingReservation.js';
import { Staff } from '../models/Staff.js';
import { StaffReservation } from '../models/StaffReservation.js';
import { validateAdminBookingInput, validateBookingStatus, validateRuleInput, validateStaffInput } from '../lib/validation.js';
import { requireAdmin, requireCsrf } from '../middleware/auth.js';
import { limitsFor } from '../services/plans.js';
import { shoplineGet, syncShopMetadata } from '../services/shopline.js';
import { syncProductCatalog } from '../services/product-catalog.js';
import { cancelBookingByMerchant, setBookingStatusByMerchant, updateBookingByMerchant } from '../services/bookings.js';
import { emailStatus, sendTestEmail } from '../services/email.js';
import { zonedNow } from '../lib/slots.js';
import { normalizeEmailSettings, validateEmailSettings, validateTestEmailRecipient } from '../lib/email-settings.js';
import { buildThemeAppBlockDeepLink } from '../lib/theme-deep-link.js';

export const adminRouter = Router();
adminRouter.use(requireAdmin, requireCsrf);

function bookingSnapshot(booking) {
  return { date: booking.date, time: booking.time, location: booking.location || '', staff: booking.staff || '', status: booking.status };
}

function withBookingHistory(booking) {
  if (booking.events?.length) return booking;
  return {
    ...booking,
    events: [{ type: 'created', actor: 'customer', at: booking.createdAt, to: bookingSnapshot(booking), legacy: true }]
  };
}

function storefrontFallbackUrl(handle) {
  return `https://${handle}.myshopline.com/admin/online-store/themes`;
}


function storefrontHost(shop) {
  const primary = String(shop.primaryDomain || '').trim().replace(/^https?:\/\//i, '').replace(/\/$/, '');
  return primary || `${shop.handle}.myshopline.com`;
}

function nextOccurrenceForDashboard(booking, storeNow) {
  const mode = booking.bookingMode || 'slot';
  if (mode === 'all_day') return booking.date >= storeNow.date ? { date: booking.date, time: '' } : null;
  const occurrences = mode === 'multi_slot' && Array.isArray(booking.occurrences) && booking.occurrences.length
    ? booking.occurrences
    : [{ date: booking.date, time: booking.time }];
  return occurrences
    .filter(item => item?.date > storeNow.date || (item?.date === storeNow.date && String(item.time || '') > storeNow.time))
    .sort((a, b) => `${a.date}T${a.time || ''}`.localeCompare(`${b.date}T${b.time || ''}`))[0] || null;
}

function onboardingStatus(shop, { ruleCount = 0, activeRuleCount = 0, bookingCount = 0, firstActiveRule = null } = {}) {
  const onboarding = shop.onboarding || {};
  const firstBookingSource = firstActiveRule?.bookingSource || (firstActiveRule?.sourceType === 'standalone' ? 'direct' : 'product');
  const previewUrl = ['product', 'both'].includes(firstBookingSource) && firstActiveRule?.productHandle
    ? `https://${storefrontHost(shop)}/products/${encodeURIComponent(firstActiveRule.productHandle)}`
    : ['direct', 'both'].includes(firstBookingSource) ? `${config.appUrl}/book/${firstActiveRule?._id}` : '';
  const quickstartStarted = Boolean(onboarding.quickstartStartedAt);
  const appBlockConfirmed = Boolean(onboarding.appBlockConfirmedAt) || firstBookingSource === 'direct';
  const serviceCreated = activeRuleCount > 0;
  const testBookingCompleted = bookingCount > 0;
  const eligible = quickstartStarted || (ruleCount === 0 && bookingCount === 0);
  return {
    quickstartStarted,
    quickstartDismissed: Boolean(onboarding.quickstartDismissedAt),
    appBlockConfirmed,
    themeEditorOpened: Boolean(onboarding.themeEditorOpenedAt),
    shouldShowQuickstart: !onboarding.quickstartDismissedAt && eligible && !(appBlockConfirmed && serviceCreated && testBookingCompleted),
    serviceCreated,
    testBookingCompleted,
    previewUrl
  };
}


async function validateManagedStaffSelection(shopId, ruleValue) {
  const assignment = ruleValue.staffAssignment || { mode: 'none', staffIds: [] };
  if (assignment.mode === 'none') return null;
  const staff = await Staff.find({ _id: { $in: assignment.staffIds }, shopId, status: 'active' }).select('_id name').lean();
  if (staff.length !== assignment.staffIds.length) return 'Choose active staff members from this store.';
  return null;
}

adminRouter.get('/bootstrap', async (req, res) => {
  if (!req.shop.shoplineStoreId) {
    try {
      const metadata = await syncShopMetadata(req.shop._id);
      Object.assign(req.shop, metadata);
    } catch (error) { console.warn('Could not refresh shop metadata:', error.message); }
  }
  const storeNow = zonedNow(req.shop.timezone || 'UTC');
  const upcomingFilter = {
    shopId: req.shop._id,
    status: 'confirmed',
    $or: [
      { bookingMode: 'all_day', date: { $gte: storeNow.date } },
      { bookingMode: 'multi_slot', occurrences: { $elemMatch: { $or: [{ date: { $gt: storeNow.date } }, { date: storeNow.date, time: { $gt: storeNow.time } }] } } },
      { bookingMode: 'slot', $or: [{ date: { $gt: storeNow.date } }, { date: storeNow.date, time: { $gt: storeNow.time } }] },
      { bookingMode: { $exists: false }, $or: [{ date: { $gt: storeNow.date } }, { date: storeNow.date, time: { $gt: storeNow.time } }] }
    ]
  };
  const [ruleCount, activeRuleCount, bookingCount, upcomingCount, upcomingCandidates, firstActiveRule] = await Promise.all([
    AppointmentRule.countDocuments({ shopId: req.shop._id }),
    AppointmentRule.countDocuments({ shopId: req.shop._id, enabled: true }),
    Booking.countDocuments({ shopId: req.shop._id }),
    Booking.countDocuments(upcomingFilter),
    Booking.find(upcomingFilter)
      .sort({ date: 1, time: 1 }).limit(100).select('productTitle date time bookingMode occurrences timezone location staff customer.name').lean(),
    AppointmentRule.findOne({ shopId: req.shop._id, enabled: true }).sort({ updatedAt: -1 }).select('serviceTitle productTitle productHandle bookingSource sourceType').lean()
  ]);
  const nextBookings = upcomingCandidates
    .map(booking => ({ booking, occurrence: nextOccurrenceForDashboard(booking, storeNow) }))
    .filter(item => item.occurrence)
    .sort((a, b) => `${a.occurrence.date}T${a.occurrence.time || ''}`.localeCompare(`${b.occurrence.date}T${b.occurrence.time || ''}`))
    .slice(0, 4)
    .map(({ booking, occurrence }) => ({ ...booking, date: occurrence.date, time: occurrence.time }));
  const delivery = emailStatus();
  res.json({
    shop: { handle: req.shop.handle, storeId: req.shop.shoplineStoreId || '', locale: req.shop.locale, adminLocale: req.shop.adminLocale || 'en', timezone: req.shop.timezone, plan: req.shop.plan, email: req.shop.email || '' },
    email: { configured: delivery.configured, from: delivery.from || '' }, emailSettings: normalizeEmailSettings(req.shop.emailSettings || {}), nextBookings,
    onboarding: onboardingStatus(req.shop, { ruleCount, activeRuleCount, bookingCount, firstActiveRule }),
    limits: { ...limitsFor(req.shop.plan), enforced: config.planLimitsEnabled }, csrfToken: req.csrfToken,
    stats: { ruleCount, activeRuleCount, bookingCount, upcomingCount }
  });
});

adminRouter.get('/products', async (req, res, next) => {
  try {
    const { products, diagnostics } = await syncProductCatalog(req.shop._id);
    if (diagnostics.reconciled) {
      console.warn('SHOPLINE product sources returned different selectable counts; merged both sources.', {
        shop: req.shop.handle,
        restCount: diagnostics.restCount,
        graphqlCount: diagnostics.graphqlCount,
        mergedCount: diagnostics.mergedCount
      });
    }
    res.set('Cache-Control', 'no-store');
    res.json({ products, diagnostics, syncedAt: new Date().toISOString() });
  } catch (error) { next(error); }
});


adminRouter.get('/staff', async (req, res) => {
  const [staff, rules] = await Promise.all([
    Staff.find({ shopId: req.shop._id }).sort({ status: 1, name: 1 }).lean(),
    AppointmentRule.find({ shopId: req.shop._id, 'staffAssignment.staffIds': { $exists: true, $ne: [] } }).select('serviceTitle productTitle staffAssignment').lean()
  ]);
  const servicesByStaff = new Map();
  for (const rule of rules) {
    for (const staffId of rule.staffAssignment?.staffIds || []) {
      const key = String(staffId);
      if (!servicesByStaff.has(key)) servicesByStaff.set(key, []);
      servicesByStaff.get(key).push({ id: String(rule._id), title: rule.serviceTitle || rule.productTitle || 'Service' });
    }
  }
  res.json({ staff: staff.map(item => ({ ...item, assignedServices: servicesByStaff.get(String(item._id)) || [] })) });
});

adminRouter.get('/staff/operations', async (req, res, next) => {
  try {
    const timezone = req.shop.timezone || 'UTC';
    const requestedDate = String(req.query.date || '').trim();
    const date = /^\d{4}-\d{2}-\d{2}$/.test(requestedDate) ? requestedDate : zonedNow(timezone).date;
    const [staff, managedRules] = await Promise.all([
      Staff.find({ shopId: req.shop._id, status: 'active' }).sort({ name: 1 }).lean(),
      AppointmentRule.find({ shopId: req.shop._id, 'staffAssignment.mode': { $in: ['any', 'customer_choice', 'fixed'] } }).select('_id').lean()
    ]);
    const managedRuleIds = managedRules.map(rule => rule._id);
    const bookings = managedRuleIds.length ? await Booking.find({
      shopId: req.shop._id,
      ruleId: { $in: managedRuleIds },
      status: 'confirmed',
      $or: [{ date }, { 'occurrences.date': date }]
    }).sort({ date: 1, time: 1 }).select('ruleId productTitle customer.name date time bookingMode occurrences location staff staffId').lean() : [];
    const assignments = [];
    for (const booking of bookings) {
      const mode = booking.bookingMode || 'slot';
      const occurrences = Array.isArray(booking.occurrences) && booking.occurrences.length
        ? booking.occurrences.filter(item => item.date === date)
        : booking.date === date ? [{ date: booking.date, time: mode === 'all_day' ? '' : booking.time, staffId: booking.staffId, staffName: booking.staff }] : [];
      for (const occurrence of occurrences) {
        assignments.push({
          bookingId: String(booking._id),
          staffId: occurrence.staffId ? String(occurrence.staffId) : (booking.staffId ? String(booking.staffId) : ''),
          staffName: occurrence.staffName || booking.staff || '',
          serviceTitle: booking.productTitle || 'Service',
          customerName: booking.customer?.name || 'Customer',
          time: mode === 'all_day' ? '' : (occurrence.time || booking.time || ''),
          bookingMode: mode,
          location: booking.location || ''
        });
      }
    }
    res.set('Cache-Control', 'no-store');
    res.json({
      date, timezone,
      staff: staff.map(item => ({
        id: String(item._id), name: item.name, avatar: item.avatar || { kind: 'preset', value: 'aurora' },
        assignments: assignments.filter(row => row.staffId === String(item._id)).sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'))
      })),
      unassigned: assignments.filter(row => !row.staffId)
    });
  } catch (error) { next(error); }
});

adminRouter.post('/staff', async (req, res, next) => {
  try {
    const { errors, value } = validateStaffInput(req.body);
    if (errors.length) return res.status(422).json({ error: 'VALIDATION_ERROR', message: errors.join(' '), fields: errors });
    const staff = await Staff.create({ shopId: req.shop._id, ...value });
    res.status(201).json({ staff });
  } catch (error) { next(error); }
});

adminRouter.put('/staff/:id', async (req, res, next) => {
  try {
    const staff = await Staff.findOne({ _id: req.params.id, shopId: req.shop._id });
    if (!staff) return res.status(404).json({ error: 'NOT_FOUND', message: 'Staff member not found.' });
    const { errors, value } = validateStaffInput(req.body);
    if (errors.length) return res.status(422).json({ error: 'VALIDATION_ERROR', message: errors.join(' '), fields: errors });
    if (value.status === 'inactive') {
      const [activeBookings, assignedServices] = await Promise.all([
        Booking.countDocuments({ shopId: req.shop._id, staffId: staff._id, status: 'confirmed' }),
        AppointmentRule.countDocuments({ shopId: req.shop._id, 'staffAssignment.staffIds': staff._id })
      ]);
      if (activeBookings > 0) return res.status(409).json({ error: 'STAFF_HAS_ACTIVE_BOOKINGS', message: `This staff member still has ${activeBookings} confirmed booking${activeBookings === 1 ? '' : 's'}. Reassign or finish them before making the staff member inactive.` });
      if (assignedServices > 0) return res.status(409).json({ error: 'STAFF_ASSIGNED_TO_SERVICES', message: `This staff member is still assigned to ${assignedServices} service${assignedServices === 1 ? '' : 's'}. Remove the staff member from those services before making them inactive.` });
    }
    Object.assign(staff, value);
    await staff.save();
    res.json({ staff });
  } catch (error) { next(error); }
});

adminRouter.delete('/staff/:id', async (req, res, next) => {
  try {
    const staff = await Staff.findOne({ _id: req.params.id, shopId: req.shop._id }).select('_id name');
    if (!staff) return res.status(404).json({ error: 'NOT_FOUND', message: 'Staff member not found.' });
    const [activeBookings, assignedServices] = await Promise.all([
      Booking.countDocuments({ shopId: req.shop._id, staffId: staff._id, status: 'confirmed' }),
      AppointmentRule.countDocuments({ shopId: req.shop._id, 'staffAssignment.staffIds': staff._id })
    ]);
    if (activeBookings > 0) return res.status(409).json({ error: 'STAFF_HAS_ACTIVE_BOOKINGS', message: `This staff member still has ${activeBookings} confirmed booking${activeBookings === 1 ? '' : 's'}. Reassign or finish them before deleting the staff member.` });
    if (assignedServices > 0) return res.status(409).json({ error: 'STAFF_ASSIGNED_TO_SERVICES', message: `This staff member is still assigned to ${assignedServices} service${assignedServices === 1 ? '' : 's'}. Remove the staff member from those services before deleting the staff member.` });
    await Promise.all([
      StaffReservation.deleteMany({ shopId: req.shop._id, staffId: staff._id }),
      Staff.deleteOne({ _id: staff._id, shopId: req.shop._id })
    ]);
    res.json({ deleted: true });
  } catch (error) { next(error); }
});

adminRouter.get('/rules', async (req, res) => {
  const [rules, bookingCounts] = await Promise.all([
    AppointmentRule.find({ shopId: req.shop._id }).sort({ updatedAt: -1 }).lean(),
    Booking.aggregate([
      { $match: { shopId: req.shop._id } },
      { $group: {
        _id: '$ruleId',
        count: { $sum: 1 },
        confirmedCount: { $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] } }
      } }
    ])
  ]);
  const counts = new Map(bookingCounts.map(item => [String(item._id), { count: Number(item.count || 0), confirmedCount: Number(item.confirmedCount || 0) }]));
  res.json({ rules: rules.map(rule => {
    const bookingSource = rule.bookingSource || (rule.sourceType === 'standalone' ? 'direct' : 'product');
    return {
      ...rule,
      bookingSource,
      serviceTitle: rule.serviceTitle || rule.productTitle,
      bookingCount: counts.get(String(rule._id))?.count || 0,
      confirmedBookingCount: counts.get(String(rule._id))?.confirmedCount || 0,
      bookingUrl: ['direct', 'both'].includes(bookingSource) ? `${config.appUrl}/book/${rule._id}` : ''
    };
  }) });
});

adminRouter.post('/rules', async (req, res, next) => {
  try {
    const { errors, value } = validateRuleInput(req.body);
    if (errors.length) return res.status(422).json({ error: 'VALIDATION_ERROR', message: errors.join(' '), fields: errors });
    const staffError = await validateManagedStaffSelection(req.shop._id, value);
    if (staffError) return res.status(422).json({ error: 'VALIDATION_ERROR', message: staffError });
    const limits = limitsFor(req.shop.plan);
    if (config.planLimitsEnabled && value.enabled && await AppointmentRule.countDocuments({ shopId: req.shop._id, enabled: true }) >= limits.activeRules) {
      return res.status(403).json({ error: 'PLAN_LIMIT', message: `${limits.label} allows ${limits.activeRules} active appointment rule${limits.activeRules === 1 ? '' : 's'}.` });
    }
    const rule = await AppointmentRule.create({ shopId: req.shop._id, ...value });
    res.status(201).json({ rule });
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ error: 'DUPLICATE_PRODUCT', message: 'This product is already linked to another appointment service.' });
    next(error);
  }
});

adminRouter.put('/rules/:id', async (req, res, next) => {
  try {
    const rule = await AppointmentRule.findOne({ _id: req.params.id, shopId: req.shop._id });
    if (!rule) return res.status(404).json({ error: 'NOT_FOUND', message: 'Rule not found.' });
    const { errors, value } = validateRuleInput(req.body);
    if (errors.length) return res.status(422).json({ error: 'VALIDATION_ERROR', message: errors.join(' '), fields: errors });
    const staffError = await validateManagedStaffSelection(req.shop._id, value);
    if (staffError) return res.status(422).json({ error: 'VALIDATION_ERROR', message: staffError });
    if (config.planLimitsEnabled && !rule.enabled && value.enabled) {
      const limits = limitsFor(req.shop.plan);
      if (await AppointmentRule.countDocuments({ shopId: req.shop._id, enabled: true }) >= limits.activeRules) return res.status(403).json({ error: 'PLAN_LIMIT', message: `${limits.label} plan active-rule limit reached.` });
    }
    Object.assign(rule, value);
    await rule.save();
    res.json({ rule });
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ error: 'DUPLICATE_PRODUCT', message: 'This product is already linked to another appointment service.' });
    next(error);
  }
});

adminRouter.delete('/rules/:id', async (req, res) => {
  const rule = await AppointmentRule.findOne({ _id: req.params.id, shopId: req.shop._id }).select('_id');
  if (!rule) return res.status(404).json({ error: 'NOT_FOUND', message: 'Rule not found.' });
  const [bookingCount, confirmedBookingCount] = await Promise.all([
    Booking.countDocuments({ ruleId: rule._id, shopId: req.shop._id }),
    Booking.countDocuments({ ruleId: rule._id, shopId: req.shop._id, status: 'confirmed' })
  ]);
  if (confirmedBookingCount > 0) {
    return res.status(409).json({
      error: 'RULE_HAS_ACTIVE_BOOKINGS',
      message: `This service still has ${confirmedBookingCount} confirmed booking${confirmedBookingCount === 1 ? '' : 's'}. Cancel, complete, or mark them as no-show before deleting the service.`
    });
  }
  await Promise.all([
    AppointmentRule.deleteOne({ _id: rule._id, shopId: req.shop._id }),
    BookingReservation.deleteMany({ ruleId: rule._id, shopId: req.shop._id }),
    StaffReservation.deleteMany({ ruleId: rule._id, shopId: req.shop._id })
  ]);
  res.json({ deleted: true, preservedBookingCount: bookingCount });
});

adminRouter.get('/bookings', async (req, res) => {
  const filter = { shopId: req.shop._id };
  if (req.query.status && ['confirmed', 'cancelled', 'completed', 'no_show'].includes(req.query.status)) filter.status = req.query.status;
  if (req.query.ruleId) filter.ruleId = req.query.ruleId;
  if (req.query.staffId) filter.staffId = req.query.staffId;
  if (req.query.from || req.query.to) {
    filter.date = {};
    if (req.query.from) filter.date.$gte = String(req.query.from).slice(0, 10);
    if (req.query.to) filter.date.$lte = String(req.query.to).slice(0, 10);
  }
  const bookings = await Booking.find(filter).sort({ date: -1, time: -1 }).limit(1000).lean();
  res.json({ bookings: bookings.map(withBookingHistory) });
});

adminRouter.put('/preferences', async (req, res) => {
  const adminLocale = req.body?.adminLocale;
  if (!['en', 'zh-CN'].includes(adminLocale)) return res.status(422).json({ error: 'VALIDATION_ERROR', message: 'Choose a supported language.' });
  req.shop.adminLocale = adminLocale;
  await req.shop.save();
  res.json({ adminLocale });
});

adminRouter.get('/storefront/deep-link', async (req, res) => {
  const fallbackUrl = storefrontFallbackUrl(req.shop.handle);
  if (!config.shopline.themeExtensionUuid) return res.json({ available: false, url: fallbackUrl });
  try {
    const payload = await shoplineGet(req.shop._id, 'themes.json');
    const themes = payload.themes || payload.data?.themes || payload.data || [];
    const published = Array.isArray(themes) ? themes.find(theme => theme.role === 'published' || theme.role === 0) : null;
    if (!published?.id) return res.json({ available: false, url: fallbackUrl });
    res.json({ available: true, url: buildThemeAppBlockDeepLink({ handle: req.shop.handle, themeId: published.id, extensionUuid: config.shopline.themeExtensionUuid, blockHandle: config.shopline.themeBlockHandle }) });
  } catch (error) {
    console.warn('Could not prepare storefront editor link:', error.message);
    res.json({ available: false, url: fallbackUrl });
  }
});

adminRouter.put('/onboarding', async (req, res) => {
  const action = String(req.body?.action || '');
  const now = new Date();
  if (action === 'start-quickstart') req.shop.set('onboarding.quickstartStartedAt', req.shop.onboarding?.quickstartStartedAt || now);
  else if (action === 'confirm-app-block') req.shop.set('onboarding.appBlockConfirmedAt', now);
  else if (action === 'theme-editor-opened') req.shop.set('onboarding.themeEditorOpenedAt', now);
  else if (action === 'dismiss-quickstart') req.shop.set('onboarding.quickstartDismissedAt', now);
  else return res.status(422).json({ error: 'VALIDATION_ERROR', message: 'Choose a supported onboarding action.' });
  await req.shop.save();
  res.json({
    onboarding: {
      quickstartStarted: Boolean(req.shop.onboarding?.quickstartStartedAt),
      quickstartDismissed: Boolean(req.shop.onboarding?.quickstartDismissedAt),
      appBlockConfirmed: Boolean(req.shop.onboarding?.appBlockConfirmedAt),
      themeEditorOpened: Boolean(req.shop.onboarding?.themeEditorOpenedAt)
    }
  });
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

adminRouter.post('/bookings/:id/status', async (req, res, next) => {
  try {
    const { errors, value } = validateBookingStatus(req.body?.status);
    if (errors.length) return res.status(422).json({ error: 'VALIDATION_ERROR', message: errors.join(' '), fields: errors });
    const booking = await setBookingStatusByMerchant({ shopObjectId: req.shop._id, bookingId: req.params.id, status: value.status });
    res.json({ booking });
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
  const recipient = validateTestEmailRecipient(req.body?.to);
  if (recipient.error) return res.status(422).json({ error: 'EMAIL_REQUIRED', message: recipient.error });
  const to = recipient.value;
  const result = await sendTestEmail(to, settings);
  if (result.skipped) return res.status(422).json({ error: 'EMAIL_NOT_CONFIGURED', message: 'Email notifications are not ready. Complete the sending configuration before trying again.' });
  if (result.failed) return res.status(502).json({ error: 'EMAIL_FAILED', message: 'The test email could not be sent. Check the sending configuration and try again.' });
  res.json({ to });
});
