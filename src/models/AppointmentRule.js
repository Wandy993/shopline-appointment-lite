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


const staffAssignmentSchema = new mongoose.Schema({
  mode: { type: String, enum: ['none', 'any', 'customer_choice', 'fixed'], default: 'none' },
  staffIds: { type: [mongoose.Schema.Types.ObjectId], ref: 'Staff', default: [] }
}, { _id: false });

const questionSchema = new mongoose.Schema({
  label: { type: String, required: true, maxlength: 120 },
  required: { type: Boolean, default: false }
}, { _id: true });

const appointmentRuleSchema = new mongoose.Schema({
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true, index: true },

  // v0.3.1: booking channel is independent from the kind of service.
  // sourceType remains as a compatibility field for older records and clients.
  bookingSource: { type: String, enum: ['product', 'direct', 'both'], default: 'product', index: true },
  // v0.6.1: commercial relationship is independent from where the booking entry is rendered.
  // The paid and post-purchase paths are modeled now but remain gated until checkout/order linking is enabled.
  commerceMode: { type: String, enum: ['standalone_free', 'standalone_paid', 'product_pre_purchase', 'product_post_purchase'], default: 'product_pre_purchase', index: true },
  sourceType: { type: String, enum: ['product', 'standalone'], default: 'product', index: true },
  serviceType: { type: String, enum: ['appointment', 'product', 'in_store', 'onsite', 'consultation', 'class', 'other'], default: 'appointment' },
  bookingMode: { type: String, enum: ['slot', 'all_day', 'multi_slot'], default: 'slot', index: true },
  timezone: { type: String, default: '', trim: true, maxlength: 80 },
  sessionsRequired: { type: Number, min: 1, max: 12, default: 1 },

  serviceTitle: { type: String, required: true, trim: true, maxlength: 255 },
  serviceDescription: { type: String, default: '', trim: true, maxlength: 500 },

  // Optional SHOPLINE product binding. Required only when bookingSource is product or both.
  productId: { type: String, default: '', trim: true },
  productTitle: { type: String, default: '', trim: true, maxlength: 255 },
  productHandle: { type: String, default: '', trim: true },

  duration: { type: Number, required: true, min: 5, max: 480, default: 60 },
  buffer: { type: Number, min: 0, max: 240, default: 0 },
  capacity: { type: Number, min: 1, max: 100, default: 1 },
  minimumNoticeMinutes: { type: Number, min: 0, max: 10080, default: 0 },
  bookingWindowDays: { type: Number, min: 1, max: 365, default: 90 },
  dateFrom: { type: String, default: '' },
  dateUntil: { type: String, default: '' },
  weeklyAvailability: { type: [weeklySchema], default: [] },
  availabilityExceptions: { type: [exceptionSchema], default: [] },
  location: { type: String, default: '', maxlength: 200 },
  // Legacy free-text staff remains for older services. Managed staff uses staffAssignment.
  staff: { type: String, default: '', maxlength: 200 },
  staffAssignment: { type: staffAssignmentSchema, default: () => ({ mode: 'none', staffIds: [] }) },
  questionLabel: { type: String, default: 'Anything we should know?', maxlength: 120 },
  customQuestions: { type: [questionSchema], default: [] },
  enabled: { type: Boolean, default: true }
}, { timestamps: true });

appointmentRuleSchema.index(
  { shopId: 1, productId: 1 },
  { unique: true, partialFilterExpression: { productId: { $gt: '' } }, name: 'one_appointment_service_per_product' }
);

export const AppointmentRule = mongoose.model('AppointmentRule', appointmentRuleSchema);
