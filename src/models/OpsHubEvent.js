import mongoose from 'mongoose';

const EVENT_TYPES = [
  'app.heartbeat',
  'shop.installed',
  'shop.uninstalled',
  'shop.active',
  'usage.daily',
  'health.event'
];

const opsHubEventSchema = new mongoose.Schema({
  eventType: { type: String, enum: EVENT_TYPES, required: true, index: true },
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', index: true },
  shopHandle: { type: String, default: '', lowercase: true, trim: true, index: true },
  payload: { type: mongoose.Schema.Types.Mixed, required: true },
  status: { type: String, enum: ['pending', 'sending', 'sent', 'failed'], default: 'pending', index: true },
  attempts: { type: Number, default: 0, min: 0 },
  nextAttemptAt: { type: Date, default: Date.now, index: true },
  lockedAt: Date,
  lastError: { type: String, default: '', maxlength: 1000 },
  lastStatusCode: { type: Number, default: 0 },
  dedupeKey: { type: String, default: '', maxlength: 220, index: true },
  sentAt: Date,
  expiresAt: { type: Date, required: true },
  sourceUsageId: { type: mongoose.Schema.Types.ObjectId, ref: 'OpsUsageDaily' }
}, { timestamps: true });

opsHubEventSchema.index({ status: 1, nextAttemptAt: 1, createdAt: 1 }, { name: 'ops_hub_outbox_delivery' });
opsHubEventSchema.index({ dedupeKey: 1, createdAt: -1 }, { name: 'ops_hub_health_dedupe' });
opsHubEventSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, name: 'ops_hub_outbox_ttl' });

export const OpsHubEvent = mongoose.model('OpsHubEvent', opsHubEventSchema);
