import mongoose from 'mongoose';

const webhookReceiptSchema = new mongoose.Schema({
  webhookId: { type: String, required: true, unique: true, index: true, maxlength: 120 },
  topic: { type: String, required: true, maxlength: 120, index: true },
  shoplineStoreId: { type: String, default: '', maxlength: 80, index: true },
  externalId: { type: String, default: '', maxlength: 120, index: true },
  status: { type: String, enum: ['processing', 'processed', 'ignored', 'failed'], default: 'processing', index: true },
  lastError: { type: String, default: '', maxlength: 500 },
  processedAt: Date
}, { timestamps: true });

webhookReceiptSchema.index({ topic: 1, shoplineStoreId: 1, externalId: 1, status: 1 }, { name: 'webhook_external_lookup' });

export const WebhookReceipt = mongoose.model('WebhookReceipt', webhookReceiptSchema);
