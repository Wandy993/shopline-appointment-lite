import { Router } from 'express';
import { config } from '../config.js';
import { AppointmentRule } from '../models/AppointmentRule.js';
import { Booking } from '../models/Booking.js';
import { BookingReservation } from '../models/BookingReservation.js';
import { PostPurchaseEntitlement } from '../models/PostPurchaseEntitlement.js';
import { Staff } from '../models/Staff.js';
import { StaffReservation } from '../models/StaffReservation.js';
import { CalendarConnection } from '../models/CalendarConnection.js';
import { validateAdminBookingInput, validateBookingStatus, validateRuleInput, validateStaffInput } from '../lib/validation.js';
import { requireAdmin, requireCsrf } from '../middleware/auth.js';
import { requireAdminSubscriptionAccess } from '../middleware/subscription.js';
import { ensureBookingCommerceWebhooks, reauthorizationUrlForShop, shoplineGet, shoplineLocationAccessStatus, shoplineOrderAccessStatus, syncShopMetadata } from '../services/shopline.js';
import { getProductVariants, syncProductCatalog } from '../services/product-catalog.js';
import { cancelBookingByMerchant, deleteBookingByMerchant, setBookingStatusByMerchant, updateBookingByMerchant } from '../services/bookings.js';
import { emailStatus, sendTestEmail } from '../services/email.js';
import { zonedNow } from '../lib/slots.js';
import { normalizeEmailSettings, validateEmailSettings, validateTestEmailRecipient } from '../lib/email-settings.js';
import { normalizeStorefrontSettings, validateStorefrontSettings } from '../lib/storefront-settings.js';
import { buildThemeAppBlockDeepLink } from '../lib/theme-deep-link.js';
import { accessTokenForConnection, decryptGoogleRefreshToken, googleCalendarAuthorizationUrl, googleCalendarConfigured, listOwnedGoogleCalendars, publicConnection, revokeGoogleRefreshToken } from '../services/google-calendar.js';
import { queueUpcomingGoogleCalendarBookingsForBusiness, syncUpcomingGoogleCalendarBookingsForBusiness } from '../services/calendar-sync.js';
import { reconcileRecentCommerceOrdersForShop } from '../services/paid-bookings.js';
import { formatLocationSnapshot, listShoplineLocations, resolveShoplineLocation } from '../services/locations.js';
import { incrementOpsUsage } from '../services/ops-hub.js';
import { createSubscriptionCheckout, ensureFreshSubscriptionForShop, publicSubscriptionSnapshot, subscriptionNeedsRecoverySync, syncSubscriptionForShop } from '../services/subscription.js';

export const adminRouter = Router();
adminRouter.use(requireAdmin, requireCsrf);
adminRouter.use((req, res, next) => {
  void incrementOpsUsage(req.shop, 'app_api_admin_requests', 1);
  next();
});

async function adminSubscriptionState(req, { force = false } = {}) {
  let subscription = publicSubscriptionSnapshot(req.shop);
  let syncError = '';
  const previousMode = subscription.adminMode;
  const recoveryNeeded = config.subscription.enabled && subscriptionNeedsRecoverySync(req.shop);
  if (!config.subscription.enabled) {
    return { subscription, syncError, recovery: { attempted: false, recovered: false, fromMode: previousMode, toMode: subscription.adminMode } };
  }
  try {
    const result = force
      ? await syncSubscriptionForShop(req.shop, { source: recoveryNeeded ? 'admin_force_recovery_sync' : 'admin_force_sync' })
      : await ensureFreshSubscriptionForShop(req.shop);
    if (result.shop) req.shop = result.shop;
    subscription = result.subscription || publicSubscriptionSnapshot(req.shop);
    return {
      subscription,
      syncError,
      recovery: {
        attempted: Boolean(force || recoveryNeeded || result.recoverySync),
        recovered: previousMode !== 'full' && subscription.adminMode === 'full',
        fromMode: previousMode,
        toMode: subscription.adminMode
      }
    };
  } catch (error) {
    syncError = String(error.message || error);
    subscription = publicSubscriptionSnapshot(req.shop);
    return {
      subscription,
      syncError,
      recovery: { attempted: Boolean(force || recoveryNeeded), recovered: false, fromMode: previousMode, toMode: subscription.adminMode }
    };
  }
}

adminRouter.get('/subscription', async (req, res) => {
  const { subscription, syncError, recovery } = await adminSubscriptionState(req, { force: req.query.refresh === '1' });
  res.set('Cache-Control', 'no-store');
  res.json({ subscription, syncError, recovery });
});

adminRouter.post('/subscription/sync', async (req, res, next) => {
  try {
    const previous = publicSubscriptionSnapshot(req.shop);
    const result = await syncSubscriptionForShop(req.shop, { source: 'admin_manual_sync' });
    if (result.shop) req.shop = result.shop;
    const subscription = result.subscription || publicSubscriptionSnapshot(req.shop);
    res.set('Cache-Control', 'no-store');
    res.json({
      subscription,
      recovery: {
        attempted: true,
        recovered: previous.adminMode !== 'full' && subscription.adminMode === 'full',
        fromMode: previous.adminMode,
        toMode: subscription.adminMode
      }
    });
  } catch (error) { next(error); }
});

adminRouter.post('/subscription/checkout', async (req, res, next) => {
  try {
    // Compatibility endpoint for any stale cached admin client. Never call the
    // Partner checkout API here; simply return SHOPLINE's official package page.
    const checkout = await createSubscriptionCheckout(req.shop);
    res.set('Cache-Control', 'no-store').json(checkout);
  } catch (error) { next(error); }
});

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
  const { subscription, syncError: subscriptionSyncError, recovery: subscriptionRecovery } = await adminSubscriptionState(req, { force: req.query.subscription_return === '1' });
  if (!req.shop.shoplineStoreId) {
    try {
      const metadata = await syncShopMetadata(req.shop._id);
      Object.assign(req.shop, metadata);
    } catch (error) { console.warn('Could not refresh shop metadata:', error.message); }
  }
  if (config.subscription.enabled && subscription.adminMode === 'subscription_required') {
    res.set('Cache-Control', 'no-store');
    return res.json({
      restricted: true,
      accessMode: 'subscription_required',
      archiveMode: false,
      subscription,
      subscriptionSyncError,
      subscriptionRecovery,
      shop: { handle: req.shop.handle, storeId: req.shop.shoplineStoreId || '', locale: req.shop.locale, adminLocale: req.shop.adminLocale || 'en', timezone: req.shop.timezone, email: req.shop.email || '' },
      csrfToken: req.csrfToken
    });
  }
  if (config.subscription.enabled && subscription.adminMode === 'archive') {
    res.set('Cache-Control', 'no-store');
    return res.json({
      restricted: false,
      accessMode: 'archive',
      archiveMode: true,
      subscription,
      subscriptionSyncError,
      subscriptionRecovery,
      shop: { handle: req.shop.handle, storeId: req.shop.shoplineStoreId || '', locale: req.shop.locale, adminLocale: req.shop.adminLocale || 'en', timezone: req.shop.timezone, email: req.shop.email || '' },
      csrfToken: req.csrfToken
    });
  }
  const storeNow = zonedNow(req.shop.timezone || 'UTC');
  const upcomingFilter = {
    shopId: req.shop._id,
    adminDeletedAt: null,
    status: 'confirmed',
    $or: [
      { bookingMode: 'all_day', date: { $gte: storeNow.date } },
      { bookingMode: 'multi_slot', occurrences: { $elemMatch: { $or: [{ date: { $gt: storeNow.date } }, { date: storeNow.date, time: { $gt: storeNow.time } }] } } },
      { bookingMode: 'slot', $or: [{ date: { $gt: storeNow.date } }, { date: storeNow.date, time: { $gt: storeNow.time } }] },
      { bookingMode: { $exists: false }, $or: [{ date: { $gt: storeNow.date } }, { date: storeNow.date, time: { $gt: storeNow.time } }] }
    ]
  };
  const [ruleCount, activeRuleCount, bookingCount, upcomingCount, upcomingCandidates, firstActiveRule, commerceRuleCount] = await Promise.all([
    AppointmentRule.countDocuments({ shopId: req.shop._id }),
    AppointmentRule.countDocuments({ shopId: req.shop._id, enabled: true }),
    Booking.countDocuments({ shopId: req.shop._id, adminDeletedAt: null }),
    Booking.countDocuments(upcomingFilter),
    Booking.find(upcomingFilter)
      .sort({ date: 1, time: 1 }).limit(100).select('productTitle date time bookingMode occurrences timezone location staff customer.name').lean(),
    AppointmentRule.findOne({ shopId: req.shop._id, enabled: true }).sort({ updatedAt: -1 }).select('serviceTitle productTitle productHandle bookingSource sourceType').lean(),
    AppointmentRule.countDocuments({ shopId: req.shop._id, commerceMode: { $in: ['standalone_paid', 'product_post_purchase'] } })
  ]);
  const nextBookings = upcomingCandidates
    .map(booking => ({ booking, occurrence: nextOccurrenceForDashboard(booking, storeNow) }))
    .filter(item => item.occurrence)
    .sort((a, b) => `${a.occurrence.date}T${a.occurrence.time || ''}`.localeCompare(`${b.occurrence.date}T${b.occurrence.time || ''}`))
    .slice(0, 4)
    .map(({ booking, occurrence }) => ({ ...booking, date: occurrence.date, time: occurrence.time }));
  const delivery = emailStatus();
  const orderAccessState = shoplineOrderAccessStatus(req.shop);
  const orderAccess = {
    required: commerceRuleCount > 0,
    granted: orderAccessState.granted,
    authorizationUrl: orderAccessState.granted ? '' : reauthorizationUrlForShop(req.shop),
    reconcileAvailable: orderAccessState.granted
  };
  res.json({
    restricted: false, accessMode: 'full', archiveMode: false, subscription, subscriptionSyncError, subscriptionRecovery,
    shop: { handle: req.shop.handle, storeId: req.shop.shoplineStoreId || '', locale: req.shop.locale, adminLocale: req.shop.adminLocale || 'en', timezone: req.shop.timezone, email: req.shop.email || '' },
    email: { configured: delivery.configured, from: delivery.from || '' }, emailSettings: normalizeEmailSettings(req.shop.emailSettings || {}), storefrontSettings: normalizeStorefrontSettings(req.shop.storefrontSettings || {}), nextBookings, orderAccess,
    onboarding: onboardingStatus(req.shop, { ruleCount, activeRuleCount, bookingCount, firstActiveRule }),
    csrfToken: req.csrfToken,
    stats: { ruleCount, activeRuleCount, bookingCount, upcomingCount }
  });
});

adminRouter.use(requireAdminSubscriptionAccess);

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

adminRouter.get('/products/:productId/variants', async (req, res, next) => {
  try {
    const variants = await getProductVariants(req.shop._id, req.params.productId);
    res.set('Cache-Control', 'no-store');
    res.json({ variants });
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
    }).sort({ date: 1, time: 1 }).select('ruleId productTitle customer.name date time bookingMode occurrences duration buffer location staff staffId').lean() : [];
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
          duration: Number(booking.duration || 60),
          buffer: Number(booking.buffer || 0),
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
        Booking.countDocuments({ shopId: req.shop._id, staffId: staff._id, status: { $in: ['confirmed', 'pending_payment'] } }),
        AppointmentRule.countDocuments({ shopId: req.shop._id, 'staffAssignment.staffIds': staff._id })
      ]);
      if (activeBookings > 0) return res.status(409).json({ error: 'STAFF_HAS_ACTIVE_BOOKINGS', message: `This staff member still has ${activeBookings} active booking${activeBookings === 1 ? '' : 's'} or payment hold${activeBookings === 1 ? '' : 's'}. Reassign, finish, or wait for pending checkout holds to expire first.` });
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
      Booking.countDocuments({ shopId: req.shop._id, staffId: staff._id, status: { $in: ['confirmed', 'pending_payment'] } }),
      AppointmentRule.countDocuments({ shopId: req.shop._id, 'staffAssignment.staffIds': staff._id })
    ]);
    if (activeBookings > 0) return res.status(409).json({ error: 'STAFF_HAS_ACTIVE_BOOKINGS', message: `This staff member still has ${activeBookings} active booking${activeBookings === 1 ? '' : 's'} or payment hold${activeBookings === 1 ? '' : 's'}. Reassign, finish, or wait for pending checkout holds to expire first.` });
    if (assignedServices > 0) return res.status(409).json({ error: 'STAFF_ASSIGNED_TO_SERVICES', message: `This staff member is still assigned to ${assignedServices} service${assignedServices === 1 ? '' : 's'}. Remove the staff member from those services before deleting the staff member.` });
    await Promise.all([
      StaffReservation.deleteMany({ shopId: req.shop._id, staffId: staff._id }),
      CalendarConnection.deleteMany({ shopId: req.shop._id, staffId: staff._id }),
      Staff.deleteOne({ _id: staff._id, shopId: req.shop._id })
    ]);
    res.json({ deleted: true });
  } catch (error) { next(error); }
});


adminRouter.get('/locations', async (req, res, next) => {
  try {
    const access = shoplineLocationAccessStatus(req.shop);
    if (!access.granted) return res.json({ locations: [], access: { ...access, authorizationUrl: reauthorizationUrlForShop(req.shop) } });
    const locations = await listShoplineLocations(req.shop._id);
    res.json({ locations, access: { ...access, authorizationUrl: '' } });
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
    const commerceMode = rule.commerceMode || (bookingSource === 'direct' && !rule.productId ? 'standalone_free' : 'product_pre_purchase');
    return {
      ...rule,
      bookingSource, commerceMode,
      serviceTitle: rule.serviceTitle || rule.productTitle,
      bookingCount: counts.get(String(rule._id))?.count || 0,
      confirmedBookingCount: counts.get(String(rule._id))?.confirmedCount || 0,
      bookingUrl: commerceMode !== 'product_post_purchase' && ['direct', 'both'].includes(bookingSource) ? `${config.appUrl}/book/${rule._id}` : ''
    };
  }) });
});


function locationAccessRequiredResponse(req, res) {
  return res.status(409).json({
    error: 'LOCATION_ACCESS_REQUIRED',
    message: 'Authorize SHOPLINE location access before selecting a store location.',
    authorizationUrl: reauthorizationUrlForShop(req.shop)
  });
}

async function canonicalizeRuleLocation(shop, value) {
  const mode = value.locationMode || 'custom';
  if (mode === 'online') return { ...value, shoplineLocationId: '', locationSnapshot: undefined, location: 'Online', onlineMeeting: value.onlineMeeting?.url ? value.onlineMeeting : undefined };
  if (mode === 'customer_address') return { ...value, shoplineLocationId: '', locationSnapshot: undefined, location: 'Customer address' };
  if (mode !== 'shopline_location') return { ...value, shoplineLocationId: '', locationSnapshot: undefined, location: String(value.location || '').trim().slice(0, 300) };
  if (!shoplineLocationAccessStatus(shop).granted) throw Object.assign(new Error('Authorize SHOPLINE location access before selecting a store location.'), { code: 'LOCATION_ACCESS_REQUIRED' });
  const location = await resolveShoplineLocation(shop._id, value.shoplineLocationId);
  if (!location) throw Object.assign(new Error('The selected SHOPLINE location is no longer available. Refresh locations and choose another one.'), { code: 'SHOPLINE_LOCATION_NOT_FOUND' });
  return {
    ...value,
    shoplineLocationId: location.id,
    locationSnapshot: location,
    location: formatLocationSnapshot(location)
  };
}

function paymentStatusForBooking(booking = {}) {
  const mode = booking.commerceMode || '';
  if (!['standalone_paid', 'product_post_purchase'].includes(mode)) return 'not_required';
  const financial = String(booking.payment?.financialStatus || '').toLowerCase();
  if (mode === 'product_post_purchase') return 'paid';
  if (financial === 'paid' || booking.payment?.confirmedAt) return 'paid';
  if (booking.status === 'payment_expired') return 'expired';
  if (booking.status === 'payment_conflict') return 'needs_review';
  return 'unpaid';
}

function appointmentStatusForBooking(booking = {}) {
  if (booking.status === 'pending_payment') return 'waiting_payment';
  if (booking.status === 'payment_expired') return 'payment_expired';
  if (booking.status === 'payment_conflict') return 'needs_review';
  if (booking.status === 'confirmed') return 'scheduled';
  return booking.status || 'scheduled';
}

function bookingRecordTimestamp(record = {}) {
  const value = record.recordSortAt || record.createdAt;
  const parsed = value ? new Date(value).getTime() : 0;
  return Number.isFinite(parsed) ? parsed : 0;
}

function orderLifecycleRecord(entitlement, rule, handle) {
  const eligible = Math.max(1, Number(entitlement.eligibleQuantity || 1));
  const used = Math.max(0, Number(entitlement.usedBookings || 0));
  const remaining = Math.max(0, eligible - used);
  const paid = String(entitlement.financialStatus || '').toLowerCase() === 'paid' || ['active', 'exhausted'].includes(entitlement.status);
  let appointmentStatus = 'waiting_payment';
  if (entitlement.status === 'revoked') appointmentStatus = 'cancelled';
  else if (paid && used === 0) appointmentStatus = 'awaiting_schedule';
  else if (paid && remaining > 0) appointmentStatus = 'partially_scheduled';
  else if (paid && remaining === 0) appointmentStatus = 'scheduled';
  const orderId = String(entitlement.orderId || '');
  return {
    _id: String(entitlement._id),
    recordType: 'order_lifecycle',
    ruleId: String(entitlement.ruleId || ''),
    commerceMode: 'product_post_purchase',
    productTitle: rule?.serviceTitle || rule?.productTitle || 'Post-purchase appointment',
    productId: entitlement.productId || rule?.productId || '',
    customer: entitlement.customer || { name: 'Customer', email: '', phone: '' },
    date: '', time: '', bookingMode: 'slot', occurrences: [], timezone: '',
    location: rule?.location || '', staff: '', status: appointmentStatus,
    paymentStatus: paid ? 'paid' : 'unpaid', appointmentStatus,
    schedulingProgress: { eligible, used, remaining },
    notificationSentAt: entitlement.notificationSentAt || null,
    orderStatus: entitlement.orderStatus || '',
    recordSortAt: entitlement.orderCreatedAt || entitlement.createdAt,
    createdAt: entitlement.createdAt, updatedAt: entitlement.updatedAt,
    shoplineOrder: orderId ? { id: orderId, name: entitlement.orderName || orderId, adminUrl: `https://${handle}.myshopline.com/admin/orders/${encodeURIComponent(orderId)}` } : null
  };
}

function orderAccessRequiredResponse(req, res) {
  return res.status(409).json({
    error: 'ORDER_ACCESS_REQUIRED',
    message: 'Authorize SHOPLINE order access before enabling paid or post-purchase appointments.',
    authorizationUrl: reauthorizationUrlForShop(req.shop)
  });
}

adminRouter.post('/rules', async (req, res, next) => {
  try {
    const { errors, value } = validateRuleInput(req.body);
    if (errors.length) return res.status(422).json({ error: 'VALIDATION_ERROR', message: errors.join(' '), fields: errors });
    const staffError = await validateManagedStaffSelection(req.shop._id, value);
    if (staffError) return res.status(422).json({ error: 'VALIDATION_ERROR', message: staffError });
    let canonicalValue;
    try { canonicalValue = await canonicalizeRuleLocation(req.shop, value); }
    catch (error) {
      if (error.code === 'LOCATION_ACCESS_REQUIRED') return locationAccessRequiredResponse(req, res);
      if (error.code === 'SHOPLINE_LOCATION_NOT_FOUND') return res.status(422).json({ error: error.code, message: error.message });
      throw error;
    }
    if (['standalone_paid', 'product_post_purchase'].includes(canonicalValue.commerceMode)) {
      if (!shoplineOrderAccessStatus(req.shop).granted) return orderAccessRequiredResponse(req, res);
      const webhookResults = await ensureBookingCommerceWebhooks(req.shop._id);
      if (webhookResults.some(item => !item.ok)) {
        console.warn('Booking commerce webhook subscription needs attention', webhookResults);
        return res.status(503).json({ error: 'COMMERCE_WEBHOOK_SETUP_FAILED', message: 'Could not prepare SHOPLINE order confirmation. Please try saving the service again.' });
      }
    }
    const rule = await AppointmentRule.create({ shopId: req.shop._id, ...canonicalValue });
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
    let canonicalValue;
    try { canonicalValue = await canonicalizeRuleLocation(req.shop, value); }
    catch (error) {
      if (error.code === 'LOCATION_ACCESS_REQUIRED') return locationAccessRequiredResponse(req, res);
      if (error.code === 'SHOPLINE_LOCATION_NOT_FOUND') return res.status(422).json({ error: error.code, message: error.message });
      throw error;
    }
    if (['standalone_paid', 'product_post_purchase'].includes(canonicalValue.commerceMode)) {
      if (!shoplineOrderAccessStatus(req.shop).granted) return orderAccessRequiredResponse(req, res);
      const webhookResults = await ensureBookingCommerceWebhooks(req.shop._id);
      if (webhookResults.some(item => !item.ok)) {
        console.warn('Booking commerce webhook subscription needs attention', webhookResults);
        return res.status(503).json({ error: 'COMMERCE_WEBHOOK_SETUP_FAILED', message: 'Could not prepare SHOPLINE order confirmation. Please try saving the service again.' });
      }
    }
    Object.assign(rule, canonicalValue);
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
    Booking.countDocuments({ ruleId: rule._id, shopId: req.shop._id, status: { $in: ['confirmed', 'pending_payment'] } })
  ]);
  if (confirmedBookingCount > 0) {
    return res.status(409).json({
      error: 'RULE_HAS_ACTIVE_BOOKINGS',
      message: `This service still has ${confirmedBookingCount} active booking${confirmedBookingCount === 1 ? '' : 's'} or payment hold${confirmedBookingCount === 1 ? '' : 's'}. Finish active bookings or wait for pending checkout holds to expire before deleting the service.`
    });
  }
  await Promise.all([
    AppointmentRule.deleteOne({ _id: rule._id, shopId: req.shop._id }),
    BookingReservation.deleteMany({ ruleId: rule._id, shopId: req.shop._id }),
    StaffReservation.deleteMany({ ruleId: rule._id, shopId: req.shop._id })
  ]);
  res.json({ deleted: true, preservedBookingCount: bookingCount });
});

function orderLinkForBooking(booking, handle) {
  const orderId = String(booking?.payment?.shoplineOrderId || booking?.postPurchase?.shoplineOrderId || '').trim();
  const orderName = String(booking?.payment?.shoplineOrderName || booking?.postPurchase?.shoplineOrderName || '').trim();
  if (!orderId) return null;
  return {
    id: orderId,
    name: orderName || orderId,
    adminUrl: `https://${handle}.myshopline.com/admin/orders/${encodeURIComponent(orderId)}`
  };
}

adminRouter.post('/commerce/reconcile', async (req, res, next) => {
  try {
    if (!shoplineOrderAccessStatus(req.shop).granted) return orderAccessRequiredResponse(req, res);
    const webhookResults = await ensureBookingCommerceWebhooks(req.shop._id);
    const failed = webhookResults.filter(item => !item.ok);
    if (failed.length) console.warn('Some SHOPLINE booking webhooks could not be prepared during reconciliation', failed);
    const result = await reconcileRecentCommerceOrdersForShop({ shop: req.shop });
    res.json({ ok: true, result, webhookWarnings: failed.length });
  } catch (error) { next(error); }
});

adminRouter.get('/bookings', async (req, res) => {
  const filter = { shopId: req.shop._id, adminDeletedAt: null };
  if (req.query.status && ['pending_payment', 'confirmed', 'cancelled', 'completed', 'no_show', 'payment_expired', 'payment_conflict'].includes(req.query.status)) filter.status = req.query.status;
  if (req.query.ruleId) filter.ruleId = req.query.ruleId;
  if (req.query.staffId) filter.staffId = req.query.staffId;
  if (req.query.from || req.query.to) {
    filter.date = {};
    if (req.query.from) filter.date.$gte = String(req.query.from).slice(0, 10);
    if (req.query.to) filter.date.$lte = String(req.query.to).slice(0, 10);
  }
  const [bookings, entitlements] = await Promise.all([
    Booking.find(filter).sort({ date: -1, time: -1 }).limit(1000).lean(),
    req.query.staffId ? [] : PostPurchaseEntitlement.find({ shopId: req.shop._id }).sort({ createdAt: -1 }).limit(1000).lean()
  ]);
  const ruleIds = [...new Set(entitlements.map(item => String(item.ruleId || '')).filter(Boolean))];
  const rules = ruleIds.length ? await AppointmentRule.find({ _id: { $in: ruleIds }, shopId: req.shop._id }).select('_id serviceTitle productTitle productId location').lean() : [];
  const ruleMap = new Map(rules.map(rule => [String(rule._id), rule]));
  const entitlementMap = new Map(entitlements.map(item => [String(item._id), item]));
  const bookingRows = bookings.map(booking => {
    const entitlement = booking.postPurchase?.entitlementId ? entitlementMap.get(String(booking.postPurchase.entitlementId)) : null;
    return {
      ...withBookingHistory(booking),
      recordType: 'booking',
      recordSortAt: entitlement?.orderCreatedAt || entitlement?.createdAt || booking.createdAt,
      paymentStatus: paymentStatusForBooking(booking),
      appointmentStatus: appointmentStatusForBooking(booking),
      shoplineOrder: orderLinkForBooking(booking, req.shop.handle)
    };
  });
  const lifecycleRows = entitlements
    .filter(item => {
      if (item.adminDeletedAt) return false;
      const eligible = Math.max(1, Number(item.eligibleQuantity || 1));
      const used = Math.max(0, Number(item.usedBookings || 0));
      return item.status === 'pending_payment' || item.status === 'revoked' || used < eligible;
    })
    .map(item => orderLifecycleRecord(item, ruleMap.get(String(item.ruleId)), req.shop.handle));
  const rows = [...bookingRows, ...lifecycleRows]
    .sort((a, b) => bookingRecordTimestamp(b) - bookingRecordTimestamp(a))
    .slice(0, 1200);
  res.json({ bookings: rows });
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

adminRouter.delete('/bookings/lifecycle/:id', async (req, res, next) => {
  try {
    const now = new Date();
    const entitlement = await PostPurchaseEntitlement.findOneAndUpdate(
      { _id: req.params.id, shopId: req.shop._id, adminDeletedAt: null },
      {
        $set: {
          status: 'revoked',
          adminDeletedAt: now,
          revokedAt: now,
          revocationReason: 'Removed by merchant from booking records.'
        }
      },
      { new: true }
    );
    if (!entitlement) return res.status(404).json({ error: 'NOT_FOUND', message: 'Order scheduling record not found.' });
    res.json({ deleted: true });
  } catch (error) { next(error); }
});

adminRouter.delete('/bookings/:id', async (req, res, next) => {
  try {
    const result = await deleteBookingByMerchant({ shopObjectId: req.shop._id, bookingId: req.params.id });
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

function businessCalendarFilter(shopId) {
  return { shopId, provider: 'google', connectionType: 'business', staffId: null };
}

adminRouter.get('/calendar', async (req, res) => {
  const businessConnection = await CalendarConnection.findOne(businessCalendarFilter(req.shop._id)).lean();
  res.set('Cache-Control', 'no-store');
  res.json({ configured: googleCalendarConfigured(), businessConnection: publicConnection(businessConnection), mode: 'business_calendar' });
});

adminRouter.get('/calendar/google/store/connect', async (req, res, next) => {
  try {
    const authorizationUrl = googleCalendarAuthorizationUrl({ shopId: req.shop._id, connectionType: 'business' });
    res.json({ authorizationUrl });
  } catch (error) { next(error); }
});

adminRouter.get('/calendar/google/store/calendars', async (req, res, next) => {
  let connection;
  try {
    connection = await CalendarConnection.findOne(businessCalendarFilter(req.shop._id)).select('+refreshTokenEncrypted');
    if (!connection) return res.status(404).json({ error: 'NOT_CONNECTED', message: 'Connect a business Google Calendar first.' });
    const accessToken = await accessTokenForConnection(connection);
    const calendars = await listOwnedGoogleCalendars(accessToken);
    connection.status = 'connected'; connection.lastError = ''; connection.lastVerifiedAt = new Date();
    await connection.save();
    res.set('Cache-Control', 'no-store');
    res.json({ calendars, selectedCalendarId: connection.calendarId || '' });
  } catch (error) {
    if (connection) { connection.status = 'error'; connection.lastError = String(error.message || 'Google Calendar verification failed.').slice(0, 500); await connection.save().catch(() => {}); }
    next(error);
  }
});

adminRouter.put('/calendar/google/store', async (req, res, next) => {
  let connection;
  try {
    const calendarId = String(req.body?.calendarId || '').trim();
    if (!calendarId) return res.status(422).json({ error: 'VALIDATION_ERROR', message: 'Choose a Google Calendar.' });
    connection = await CalendarConnection.findOne(businessCalendarFilter(req.shop._id)).select('+refreshTokenEncrypted');
    if (!connection) return res.status(404).json({ error: 'NOT_CONNECTED', message: 'Connect a business Google Calendar first.' });
    const accessToken = await accessTokenForConnection(connection);
    const calendars = await listOwnedGoogleCalendars(accessToken);
    const selected = calendars.find(item => item.id === calendarId);
    if (!selected) return res.status(422).json({ error: 'CALENDAR_NOT_AVAILABLE', message: 'Choose a calendar owned by the connected Google account.' });
    connection.calendarId = selected.id; connection.calendarName = selected.summary; connection.calendarTimeZone = selected.timeZone;
    connection.syncAppointments = true; connection.sendCustomerInvites = false;
    connection.status = 'connected'; connection.lastError = ''; connection.lastVerifiedAt = new Date();
    await connection.save();
    queueUpcomingGoogleCalendarBookingsForBusiness({ shopId: req.shop._id });
    res.json({ connection: publicConnection(connection) });
  } catch (error) {
    if (connection) { connection.status = 'error'; connection.lastError = String(error.message || 'Google Calendar verification failed.').slice(0, 500); await connection.save().catch(() => {}); }
    next(error);
  }
});

adminRouter.patch('/calendar/google/store/settings', async (req, res, next) => {
  try {
    const connection = await CalendarConnection.findOne(businessCalendarFilter(req.shop._id));
    if (!connection) return res.status(404).json({ error: 'NOT_CONNECTED', message: 'Connect a business Google Calendar first.' });
    connection.syncAppointments = true;
    connection.sendCustomerInvites = false;
    await connection.save();
    queueUpcomingGoogleCalendarBookingsForBusiness({ shopId: req.shop._id });
    res.json({ connection: publicConnection(connection) });
  } catch (error) { next(error); }
});

adminRouter.post('/calendar/google/store/sync', async (req, res, next) => {
  try {
    const connection = await CalendarConnection.findOne({ ...businessCalendarFilter(req.shop._id), status: 'connected' });
    if (!connection) return res.status(404).json({ error: 'NOT_CONNECTED', message: 'Connect a business Google Calendar first.' });
    const summary = await syncUpcomingGoogleCalendarBookingsForBusiness({ shopId: req.shop._id });
    res.json({ summary });
  } catch (error) { next(error); }
});

adminRouter.delete('/calendar/google/store', async (req, res, next) => {
  try {
    const connection = await CalendarConnection.findOne(businessCalendarFilter(req.shop._id)).select('+refreshTokenEncrypted');
    if (!connection) return res.json({ disconnected: true });
    try { await revokeGoogleRefreshToken(decryptGoogleRefreshToken(connection.refreshTokenEncrypted)); }
    catch (error) { console.warn('Google Calendar token revoke failed; deleting local business connection anyway:', error.message); }
    await CalendarConnection.deleteOne({ _id: connection._id, shopId: req.shop._id });
    res.json({ disconnected: true });
  } catch (error) { next(error); }
});

function retiredStaffCalendarRoute(req, res) {
  res.status(410).json({
    error: 'STAFF_GOOGLE_CALENDAR_RETIRED',
    message: 'Connect the Business Google Calendar for the store. Staff receive assigned appointment updates by email.'
  });
}

adminRouter.get('/calendar/google/:staffId/connect', retiredStaffCalendarRoute);
adminRouter.get('/calendar/google/:staffId/calendars', retiredStaffCalendarRoute);
adminRouter.put('/calendar/google/:staffId', retiredStaffCalendarRoute);
adminRouter.patch('/calendar/google/:staffId/settings', retiredStaffCalendarRoute);
adminRouter.post('/calendar/google/:staffId/sync', retiredStaffCalendarRoute);
adminRouter.delete('/calendar/google/:staffId', retiredStaffCalendarRoute);


adminRouter.put('/storefront/settings', async (req, res) => {
  const { errors, value } = validateStorefrontSettings(req.body);
  if (errors.length) return res.status(422).json({ error: 'VALIDATION_ERROR', message: errors.join(' '), fields: errors });
  req.shop.storefrontSettings = value;
  await req.shop.save();
  res.set('Cache-Control', 'no-store');
  res.json({ settings: normalizeStorefrontSettings(req.shop.storefrontSettings) });
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
