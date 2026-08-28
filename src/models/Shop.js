import mongoose from 'mongoose';

const emailTemplateSchema = new mongoose.Schema({
  subject: { type: String, maxlength: 180 },
  heading: { type: String, maxlength: 120 },
  body: { type: String, maxlength: 3000 }
}, { _id: false });

const customerNotificationSchema = new mongoose.Schema({
  confirmation: { type: Boolean, default: true },
  bookingChanged: { type: Boolean, default: true },
  bookingCancelled: { type: Boolean, default: true },
  upcomingReminder: { type: Boolean, default: true },
  postPurchaseScheduleLink: { type: Boolean, default: true }
}, { _id: false });

const merchantNotificationSchema = new mongoose.Schema({
  newBooking: { type: Boolean, default: true },
  bookingChanged: { type: Boolean, default: true },
  bookingCancelled: { type: Boolean, default: true },
  upcomingReminder: { type: Boolean, default: true }
}, { _id: false });

const emailSettingsSchema = new mongoose.Schema({
  brandName: { type: String, maxlength: 80, default: 'Appointment Lite' },
  logoUrl: { type: String, maxlength: 500, default: '' },
  accentColor: { type: String, match: /^#[0-9a-f]{6}$/i, default: '#2F6FED' },
  replyToEmail: { type: String, maxlength: 254, default: '' },
  merchantNotificationEmail: { type: String, maxlength: 254, default: '' },
  additionalMerchantNotificationEmails: { type: [String], default: [] },
  reminderLeadHours: { type: Number, enum: [3, 6, 12, 24, 48, 72], default: 24 },
  customerNotifications: { type: customerNotificationSchema, default: () => ({}) },
  merchantNotifications: { type: merchantNotificationSchema, default: () => ({}) },
  templates: {
    confirmation: { type: emailTemplateSchema, default: () => ({}) },
    rescheduled: { type: emailTemplateSchema, default: () => ({}) },
    merchantUpdated: { type: emailTemplateSchema, default: () => ({}) },
    cancelled: { type: emailTemplateSchema, default: () => ({}) },
    reminder: { type: emailTemplateSchema, default: () => ({}) },
    merchantNewBooking: { type: emailTemplateSchema, default: () => ({}) },
    merchantBookingUpdated: { type: emailTemplateSchema, default: () => ({}) },
    merchantBookingCancelled: { type: emailTemplateSchema, default: () => ({}) },
    merchantReminder: { type: emailTemplateSchema, default: () => ({}) }
  }
}, { _id: false });



const storefrontButtonSettingsSchema = new mongoose.Schema({
  label: { type: String, maxlength: 60, default: 'Book an appointment' },
  backgroundColor: { type: String, match: /^#[0-9a-f]{6}$/i, default: '#2F6FED' },
  textColor: { type: String, match: /^#[0-9a-f]{6}$/i, default: '#FFFFFF' },
  width: { type: String, enum: ['content', 'full'], default: 'content' },
  alignment: { type: String, enum: ['left', 'center', 'right'], default: 'left' },
  borderRadius: { type: Number, min: 0, max: 24, default: 8 }
}, { _id: false });

const storefrontModalSettingsSchema = new mongoose.Schema({
  title: { type: String, maxlength: 80, default: 'Book an appointment' },
  accentColor: { type: String, match: /^#[0-9a-f]{6}$/i, default: '#2F6FED' },
  primaryTextColor: { type: String, match: /^#[0-9a-f]{6}$/i, default: '#FFFFFF' },
  primaryButtonWidth: { type: String, enum: ['content', 'full'], default: 'content' },
  primaryButtonAlignment: { type: String, enum: ['left', 'center', 'right'], default: 'right' },
  showServiceSummary: { type: Boolean, default: true },
  showTimezoneSelector: { type: Boolean, default: true },
  showPhone: { type: Boolean, default: true },
  showNotes: { type: Boolean, default: true },
  showFooterNote: { type: Boolean, default: true }
}, { _id: false });

const storefrontSettingsSchema = new mongoose.Schema({
  button: { type: storefrontButtonSettingsSchema, default: () => ({}) },
  modal: { type: storefrontModalSettingsSchema, default: () => ({}) }
}, { _id: false });

const onboardingSchema = new mongoose.Schema({
  quickstartStartedAt: Date,
  quickstartDismissedAt: Date,
  appBlockConfirmedAt: Date,
  themeEditorOpenedAt: Date
}, { _id: false });

const subscriptionSchema = new mongoose.Schema({
  spuKey: { type: String, default: '', trim: true, maxlength: 160 },
  subId: { type: String, default: '', trim: true, maxlength: 180 },
  status: { type: String, enum: ['none', 'pending', 'active', 'expired', 'unactive', 'cancelled', 'locked'], default: 'none' },
  type: { type: String, enum: ['', 'trial', 'paid', 'preorder'], default: '' },
  isTrial: { type: Boolean, default: false },
  autoRecurring: { type: Boolean, default: false },
  startedAt: Date,
  expiresAt: Date,
  everActivatedAt: Date,
  expirationType: Number,
  lastSyncedAt: Date,
  lastWebhookAt: Date,
  lastSource: { type: String, default: '', maxlength: 80 },
  lastPaymentStatus: { type: String, enum: ['', 'paid', 'cancelled', 'failed'], default: '' },
  lastPaymentAt: Date,
  lastPaymentTradeNo: { type: String, default: '', maxlength: 120 }
}, { _id: false });

const shopSchema = new mongoose.Schema({
  handle: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  shoplineStoreId: { type: String, unique: true, sparse: true, trim: true, index: true },
  primaryDomain: { type: String, default: '', lowercase: true, trim: true },
  accessToken: { type: String, required: true, select: false },
  tokenExpiresAt: Date,
  scopes: [String],
  locale: { type: String, default: 'en' },
  adminLocale: { type: String, enum: ['en', 'zh-CN'], default: 'en' },
  timezone: { type: String, default: 'UTC' },
  email: { type: String, default: '' },
  emailSettings: { type: emailSettingsSchema, default: () => ({}) },
  storefrontSettings: { type: storefrontSettingsSchema, default: () => ({}) },
  onboarding: { type: onboardingSchema, default: () => ({}) },
  subscription: { type: subscriptionSchema, default: () => ({}) },
  installedAt: { type: Date, default: Date.now },
  uninstalledAt: Date,
  opsHubLastActiveAt: Date
}, { timestamps: true });

export const Shop = mongoose.model('Shop', shopSchema);
