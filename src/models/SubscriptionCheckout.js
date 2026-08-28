import mongoose from 'mongoose';

const subscriptionCheckoutSchema = new mongoose.Schema({
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true, index: true },
  outTradeNo: { type: String, required: true, unique: true, trim: true, maxlength: 120 },
  spuKey: { type: String, required: true, trim: true, maxlength: 160 },
  status: { type: String, enum: ['created', 'pending', 'paid', 'cancelled', 'failed'], default: 'created', index: true },
  checkoutUrl: { type: String, default: '', maxlength: 2000 },
  subId: { type: String, default: '', trim: true, maxlength: 180 },
  paymentStatusCode: Number,
  completedAt: Date,
  lastError: { type: String, default: '', maxlength: 500 }
}, { timestamps: true });

subscriptionCheckoutSchema.index({ shopId: 1, createdAt: -1 });

export const SubscriptionCheckout = mongoose.model('SubscriptionCheckout', subscriptionCheckoutSchema);
