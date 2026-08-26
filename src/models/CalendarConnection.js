import mongoose from 'mongoose';

const calendarConnectionSchema = new mongoose.Schema({
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true, index: true },
  staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true, index: true },
  provider: { type: String, enum: ['google'], default: 'google', required: true },
  accountLabel: { type: String, default: '', trim: true, maxlength: 254 },
  calendarId: { type: String, default: '', trim: true, maxlength: 1024 },
  calendarName: { type: String, default: '', trim: true, maxlength: 500 },
  calendarTimeZone: { type: String, default: '', trim: true, maxlength: 120 },
  refreshTokenEncrypted: { type: String, required: true, select: false },
  scopes: { type: [String], default: [] },
  status: { type: String, enum: ['connected', 'error', 'revoked'], default: 'connected', index: true },
  lastError: { type: String, default: '', maxlength: 500 },
  connectedAt: { type: Date, default: Date.now },
  lastVerifiedAt: Date
}, { timestamps: true });

calendarConnectionSchema.index({ shopId: 1, staffId: 1, provider: 1 }, { unique: true, name: 'one_calendar_connection_per_staff_provider' });

export const CalendarConnection = mongoose.model('CalendarConnection', calendarConnectionSchema);
