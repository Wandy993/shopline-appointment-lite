import mongoose from 'mongoose';

const shopSchema = new mongoose.Schema({
  handle: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  accessToken: { type: String, required: true, select: false },
  refreshToken: { type: String, default: '', select: false },
  tokenExpiresAt: Date,
  scopes: [String],
  locale: { type: String, default: 'en' },
  timezone: { type: String, default: 'UTC' },
  email: { type: String, default: '' },
  plan: { type: String, enum: ['free', 'pro'], default: 'free' },
  installedAt: { type: Date, default: Date.now },
  uninstalledAt: Date
}, { timestamps: true });

export const Shop = mongoose.model('Shop', shopSchema);
