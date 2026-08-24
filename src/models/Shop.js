import mongoose from 'mongoose';

const emailTemplateSchema = new mongoose.Schema({
  subject: { type: String, maxlength: 180 },
  heading: { type: String, maxlength: 120 },
  body: { type: String, maxlength: 3000 }
}, { _id: false });

const emailSettingsSchema = new mongoose.Schema({
  brandName: { type: String, maxlength: 80, default: 'Appointment Lite' },
  logoUrl: { type: String, maxlength: 500, default: '' },
  accentColor: { type: String, match: /^#[0-9a-f]{6}$/i, default: '#5B5BD6' },
  replyToEmail: { type: String, maxlength: 254, default: '' },
  merchantNotificationEmail: { type: String, maxlength: 254, default: '' },
  templates: {
    confirmation: { type: emailTemplateSchema, default: () => ({}) },
    rescheduled: { type: emailTemplateSchema, default: () => ({}) },
    merchantUpdated: { type: emailTemplateSchema, default: () => ({}) },
    cancelled: { type: emailTemplateSchema, default: () => ({}) },
    merchantNewBooking: { type: emailTemplateSchema, default: () => ({}) }
  }
}, { _id: false });

const shopSchema = new mongoose.Schema({
  handle: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  shoplineStoreId: { type: String, unique: true, sparse: true, trim: true, index: true },
  primaryDomain: { type: String, default: '', lowercase: true, trim: true },
  accessToken: { type: String, required: true, select: false },
  refreshToken: { type: String, default: '', select: false },
  tokenExpiresAt: Date,
  scopes: [String],
  locale: { type: String, default: 'en' },
  timezone: { type: String, default: 'UTC' },
  email: { type: String, default: '' },
  emailSettings: { type: emailSettingsSchema, default: () => ({}) },
  plan: { type: String, enum: ['free', 'pro'], default: 'free' },
  installedAt: { type: Date, default: Date.now },
  uninstalledAt: Date
}, { timestamps: true });

export const Shop = mongoose.model('Shop', shopSchema);
