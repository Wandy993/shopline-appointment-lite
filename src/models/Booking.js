import mongoose from 'mongoose';

const answerSchema = new mongoose.Schema({
  question: { type: String, required: true, maxlength: 120 },
  answer: { type: String, default: '', maxlength: 1000 }
}, { _id: false });


const locationSnapshotSchema = new mongoose.Schema({
  name: { type: String, default: '', maxlength: 160 },
  address1: { type: String, default: '', maxlength: 200 },
  address2: { type: String, default: '', maxlength: 200 },
  city: { type: String, default: '', maxlength: 120 },
  province: { type: String, default: '', maxlength: 120 },
  provinceCode: { type: String, default: '', maxlength: 40 },
  country: { type: String, default: '', maxlength: 120 },
  countryCode: { type: String, default: '', maxlength: 8 },
  zip: { type: String, default: '', maxlength: 40 },
  phone: { type: String, default: '', maxlength: 60 },
  isDefault: { type: Boolean, default: false }
}, { _id: false });

const occurrenceSchema = new mongoose.Schema({
  date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  time: { type: String, default: '' },
  slotKey: { type: String, required: true },
  slotPosition: { type: Number, default: 0, min: 0 },
  staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', default: null },
  staffName: { type: String, default: '' }
}, { _id: false });

const bookingSnapshotSchema = new mongoose.Schema({
  date: { type: String, default: '' },
  time: { type: String, default: '' },
  locationMode: { type: String, enum: ['shopline_location', 'customer_address', 'online', 'custom'], default: 'custom' },
  shoplineLocationId: { type: String, default: '', maxlength: 100 },
  locationSnapshot: { type: locationSnapshotSchema, default: undefined },
  location: { type: String, default: '' },
  staff: { type: String, default: '' },
  staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', default: null },
  staffEmail: { type: String, default: '' },
  status: { type: String, enum: ['pending_payment', 'confirmed', 'cancelled', 'completed', 'no_show', 'payment_expired', 'payment_conflict'], default: 'confirmed' }
}, { _id: false });

const bookingEventSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['payment_started', 'payment_confirmed', 'payment_expired', 'payment_conflict', 'created', 'customer_rescheduled', 'merchant_updated', 'customer_cancelled', 'merchant_cancelled', 'merchant_completed', 'merchant_no_show'],
    required: true
  },
  actor: { type: String, enum: ['customer', 'merchant', 'system'], required: true },
  at: { type: Date, default: Date.now },
  from: { type: bookingSnapshotSchema, default: undefined },
  to: { type: bookingSnapshotSchema, default: undefined }
}, { _id: true });


const calendarEventSchema = new mongoose.Schema({
  provider: { type: String, enum: ['google'], default: 'google' },
  connectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'CalendarConnection', default: null },
  connectionType: { type: String, enum: ['business', 'staff'], default: 'staff' },
  staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', default: null },
  calendarId: { type: String, default: '', maxlength: 1024 },
  occurrenceKey: { type: String, default: '', maxlength: 300 },
  eventId: { type: String, default: '', maxlength: 1024 },
  htmlLink: { type: String, default: '', maxlength: 2000 },
  customerInvited: { type: Boolean, default: false },
  status: { type: String, enum: ['synced', 'error', 'deleted', 'orphaned'], default: 'synced' },
  lastError: { type: String, default: '', maxlength: 500 },
  lastSyncedAt: Date
}, { _id: false });


const postPurchaseSchema = new mongoose.Schema({
  entitlementId: { type: mongoose.Schema.Types.ObjectId, ref: 'PostPurchaseEntitlement', default: null },
  shoplineOrderId: { type: String, default: '', maxlength: 100 },
  shoplineOrderName: { type: String, default: '', maxlength: 100 }
}, { _id: false });

const bookingSchema = new mongoose.Schema({
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true, index: true },
  ruleId: { type: mongoose.Schema.Types.ObjectId, ref: 'AppointmentRule', required: true, index: true },
  bookingSource: { type: String, enum: ['product', 'direct', 'both'], default: 'product' },
  commerceMode: { type: String, enum: ['standalone_free', 'standalone_paid', 'product_pre_purchase', 'product_post_purchase'], default: 'product_pre_purchase' },
  sourceType: { type: String, enum: ['product', 'standalone'], default: 'product' },
  serviceType: { type: String, enum: ['appointment', 'product', 'in_store', 'onsite', 'consultation', 'class', 'other'], default: 'appointment' },
  bookingMode: { type: String, enum: ['slot', 'all_day', 'multi_slot'], default: 'slot', index: true },
  productId: { type: String, default: '' },
  productVariantId: { type: String, default: '' },
  productTitle: { type: String, required: true },
  date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  time: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
  slotKey: { type: String, required: true },
  slotPosition: { type: Number, default: 0, min: 0 },
  occurrences: { type: [occurrenceSchema], default: [] },
  duration: { type: Number, required: true },
  buffer: { type: Number, default: 0 },
  timezone: { type: String, default: 'UTC' },
  locationMode: { type: String, enum: ['shopline_location', 'customer_address', 'online', 'custom'], default: 'custom' },
  shoplineLocationId: { type: String, default: '', maxlength: 100 },
  locationSnapshot: { type: locationSnapshotSchema, default: undefined },
  location: { type: String, default: '' },
  staff: { type: String, default: '' },
  staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', default: null, index: true },
  staffEmail: { type: String, default: '' },
  customerRescheduleCount: { type: Number, default: 0, min: 0 },
  managementTokenHash: { type: String, required: true, select: false },
  customer: {
    name: { type: String, required: true, maxlength: 120 },
    email: { type: String, required: true, lowercase: true, maxlength: 254 },
    phone: { type: String, default: '', maxlength: 40 }
  },
  note: { type: String, default: '', maxlength: 2000 },
  answers: { type: [answerSchema], default: [] },
  events: { type: [bookingEventSchema], default: [] },
  calendarEvents: { type: [calendarEventSchema], default: [] },
  calendarSyncStatus: { type: String, enum: ['pending', 'synced', 'error', 'paused', 'not_connected'], default: 'pending' },
  calendarSyncError: { type: String, default: '', maxlength: 500 },
  lastCalendarSyncAt: Date,
  postPurchase: { type: postPurchaseSchema, default: undefined },
  payment: {
    holdExpiresAt: Date,
    checkoutStartedAt: Date,
    confirmedAt: Date,
    shoplineOrderId: { type: String, default: '', maxlength: 100 },
    shoplineOrderName: { type: String, default: '', maxlength: 100 },
    financialStatus: { type: String, default: '', maxlength: 40 },
    lastWebhookId: { type: String, default: '', maxlength: 120 },
    failureReason: { type: String, default: '', maxlength: 500 }
  },
  status: { type: String, enum: ['pending_payment', 'confirmed', 'cancelled', 'completed', 'no_show', 'payment_expired', 'payment_conflict'], default: 'confirmed', index: true },
  adminDeletedAt: { type: Date, default: null, index: true },
  cancelledAt: Date,
  completedAt: Date,
  noShowAt: Date,
  merchantEditedAt: Date
}, { timestamps: true });

bookingSchema.index(
  { shopId: 1, ruleId: 1, slotKey: 1, slotPosition: 1 },
  { unique: true, partialFilterExpression: { status: 'confirmed' }, name: 'capacity_position_per_slot' }
);

bookingSchema.index({ 'payment.shoplineOrderId': 1 }, { sparse: true, name: 'paid_booking_order_lookup' });
bookingSchema.index({ status: 1, 'payment.holdExpiresAt': 1 }, { name: 'paid_booking_hold_expiry' });

export const Booking = mongoose.model('Booking', bookingSchema);
