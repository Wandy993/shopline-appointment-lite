import mongoose from 'mongoose';

const windowSchema = new mongoose.Schema({
  start: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
  end: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ }
}, { _id: false });

const weeklySchema = new mongoose.Schema({
  weekday: { type: Number, min: 0, max: 6, required: true },
  enabled: { type: Boolean, default: false },
  windows: { type: [windowSchema], default: [] }
}, { _id: false });

const exceptionSchema = new mongoose.Schema({
  date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  closed: { type: Boolean, default: true },
  windows: { type: [windowSchema], default: [] }
}, { _id: true });

const avatarSchema = new mongoose.Schema({
  kind: { type: String, enum: ['preset', 'custom', 'initials'], default: 'preset' },
  value: { type: String, default: 'aurora', maxlength: 50000 }
}, { _id: false });

const notificationSchema = new mongoose.Schema({
  emailEnabled: { type: Boolean, default: false }
}, { _id: false });

const staffSchema = new mongoose.Schema({
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  email: { type: String, default: '', trim: true, lowercase: true, maxlength: 254 },
  phone: { type: String, default: '', trim: true, maxlength: 40 },
  roleTitle: { type: String, default: '', trim: true, maxlength: 120 },
  region: { type: String, default: '', trim: true, maxlength: 120 },
  expertise: { type: String, default: '', trim: true, maxlength: 180 },
  supportedServices: { type: [{ type: String, trim: true, maxlength: 120 }], default: [] },
  bio: { type: String, default: '', trim: true, maxlength: 800 },
  publicProfile: { type: Boolean, default: false, index: true },
  avatar: { type: avatarSchema, default: () => ({ kind: 'preset', value: 'aurora' }) },
  notifications: { type: notificationSchema, default: () => ({ emailEnabled: false }) },
  status: { type: String, enum: ['active', 'inactive'], default: 'active', index: true },
  weeklyAvailability: { type: [weeklySchema], default: [] },
  availabilityExceptions: { type: [exceptionSchema], default: [] }
}, { timestamps: true });

staffSchema.index({ shopId: 1, status: 1, name: 1 });

export const Staff = mongoose.model('Staff', staffSchema);
