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

const questionSchema = new mongoose.Schema({
  label: { type: String, required: true, maxlength: 120 },
  required: { type: Boolean, default: false }
}, { _id: true });

const appointmentRuleSchema = new mongoose.Schema({
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true, index: true },
  productId: { type: String, required: true, trim: true },
  productTitle: { type: String, required: true, trim: true, maxlength: 255 },
  productHandle: { type: String, default: '', trim: true },
  duration: { type: Number, required: true, min: 5, max: 480, default: 60 },
  buffer: { type: Number, min: 0, max: 240, default: 0 },
  dateFrom: { type: String, default: '' },
  dateUntil: { type: String, default: '' },
  weeklyAvailability: { type: [weeklySchema], default: [] },
  location: { type: String, default: '', maxlength: 200 },
  staff: { type: String, default: '', maxlength: 200 },
  questionLabel: { type: String, default: 'Anything we should know?', maxlength: 120 },
  customQuestions: { type: [questionSchema], default: [] },
  enabled: { type: Boolean, default: true }
}, { timestamps: true });

appointmentRuleSchema.index({ shopId: 1, productId: 1 }, { unique: true });

export const AppointmentRule = mongoose.model('AppointmentRule', appointmentRuleSchema);
