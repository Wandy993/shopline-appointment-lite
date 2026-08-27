import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema({
  name: { type: String, default: '', maxlength: 120 },
  email: { type: String, default: '', lowercase: true, maxlength: 254 },
  phone: { type: String, default: '', maxlength: 40 }
}, { _id: false });


const addressSchema = new mongoose.Schema({
  name: { type: String, default: '', maxlength: 120 },
  address1: { type: String, default: '', maxlength: 200 },
  address2: { type: String, default: '', maxlength: 200 },
  city: { type: String, default: '', maxlength: 120 },
  province: { type: String, default: '', maxlength: 120 },
  country: { type: String, default: '', maxlength: 120 },
  countryCode: { type: String, default: '', maxlength: 8 },
  zip: { type: String, default: '', maxlength: 40 },
  phone: { type: String, default: '', maxlength: 60 }
}, { _id: false });

const postPurchaseEntitlementSchema = new mongoose.Schema({
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true, index: true },
  ruleId: { type: mongoose.Schema.Types.ObjectId, ref: 'AppointmentRule', required: true, index: true },
  productId: { type: String, required: true, trim: true, index: true },
  orderId: { type: String, required: true, trim: true, maxlength: 100, index: true },
  orderName: { type: String, default: '', trim: true, maxlength: 100 },
  orderCreatedAt: Date,
  eligibleQuantity: { type: Number, min: 1, max: 100, default: 1 },
  usedBookings: { type: Number, min: 0, max: 100, default: 0 },
  bookingIds: { type: [mongoose.Schema.Types.ObjectId], ref: 'Booking', default: [] },
  customer: { type: customerSchema, default: () => ({}) },
  shippingAddress: { type: addressSchema, default: () => ({}) },
  financialStatus: { type: String, default: '', trim: true, maxlength: 40 },
  orderStatus: { type: String, default: '', trim: true, maxlength: 40 },
  status: { type: String, enum: ['pending_payment', 'active', 'exhausted', 'revoked'], default: 'pending_payment', index: true },
  tokenHash: { type: String, default: '', select: false, maxlength: 64 },
  notificationSentAt: Date,
  notificationClaimedAt: Date,
  notificationLastAttemptAt: Date,
  notificationError: { type: String, default: '', maxlength: 500 },
  lastWebhookId: { type: String, default: '', maxlength: 120 },
  adminDeletedAt: { type: Date, default: null, index: true },
  revokedAt: Date,
  revocationReason: { type: String, default: '', maxlength: 240 }
}, { timestamps: true });

postPurchaseEntitlementSchema.index(
  { shopId: 1, ruleId: 1, orderId: 1 },
  { unique: true, name: 'one_post_purchase_entitlement_per_order_rule' }
);

export const PostPurchaseEntitlement = mongoose.model('PostPurchaseEntitlement', postPurchaseEntitlementSchema);
