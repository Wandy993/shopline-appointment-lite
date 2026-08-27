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
  upcomingReminder: { type: Boolean, default: true }
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


const onboardingSchema = new mongoose.Schema({
  quickstartStartedAt: Date,
  quickstartDismissedAt: Date,
  appBlockConfirmedAt: Date,
  themeEditorOpenedAt: Date
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
  onboarding: { type: onboardingSchema, default: () => ({}) },
  installedAt: { type: Date, default: Date.now },
  uninstalledAt: Date
}, { timestamps: true });

export const Shop = mongoose.model('Shop', shopSchema);
