import mongoose from 'mongoose';

const answerSchema = new mongoose.Schema({
  question: { type: String, required: true, maxlength: 120 },
  answer: { type: String, default: '', maxlength: 1000 }
}, { _id: false });

const bookingSnapshotSchema = new mongoose.Schema({
  date: { type: String, default: '' },
  time: { type: String, default: '' },
  location: { type: String, default: '' },
  staff: { type: String, default: '' },
  status: { type: String, enum: ['confirmed', 'cancelled', 'completed', 'no_show'], default: 'confirmed' }
}, { _id: false });

const bookingEventSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['created', 'customer_rescheduled', 'merchant_updated', 'customer_cancelled', 'merchant_cancelled', 'merchant_completed', 'merchant_no_show'],
    required: true
  },
  actor: { type: String, enum: ['customer', 'merchant', 'system'], required: true },
  at: { type: Date, default: Date.now },
  from: { type: bookingSnapshotSchema, default: undefined },
  to: { type: bookingSnapshotSchema, default: undefined }
}, { _id: true });

const bookingSchema = new mongoose.Schema({
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true, index: true },
  ruleId: { type: mongoose.Schema.Types.ObjectId, ref: 'AppointmentRule', required: true, index: true },
  bookingSource: { type: String, enum: ['product', 'direct', 'both'], default: 'product' },
  sourceType: { type: String, enum: ['product', 'standalone'], default: 'product' },
  serviceType: { type: String, enum: ['appointment', 'product', 'in_store', 'onsite', 'consultation', 'class', 'other'], default: 'appointment' },
  productId: { type: String, default: '' },
  productTitle: { type: String, required: true },
  date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  time: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
  slotKey: { type: String, required: true },
  slotPosition: { type: Number, default: 0, min: 0 },
  duration: { type: Number, required: true },
  buffer: { type: Number, default: 0 },
  timezone: { type: String, default: 'UTC' },
  location: { type: String, default: '' },
  staff: { type: String, default: '' },
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
  status: { type: String, enum: ['confirmed', 'cancelled', 'completed', 'no_show'], default: 'confirmed', index: true },
  cancelledAt: Date,
  completedAt: Date,
  noShowAt: Date,
  merchantEditedAt: Date
}, { timestamps: true });

bookingSchema.index(
  { shopId: 1, ruleId: 1, slotKey: 1, slotPosition: 1 },
  { unique: true, partialFilterExpression: { status: 'confirmed' }, name: 'capacity_position_per_slot' }
);

export const Booking = mongoose.model('Booking', bookingSchema);
