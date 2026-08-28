import mongoose from 'mongoose';

const opsUsageDailySchema = new mongoose.Schema({
  date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
  shopHandle: { type: String, default: '', lowercase: true, trim: true },
  counters: { type: Map, of: Number, default: () => ({}) },
  queuedAt: Date,
  expiresAt: { type: Date, required: true }
}, { timestamps: true });

opsUsageDailySchema.index({ date: 1, shopId: 1 }, { unique: true, name: 'one_ops_usage_row_per_shop_day' });
opsUsageDailySchema.index({ queuedAt: 1, date: 1 }, { name: 'ops_usage_snapshot_queue' });
opsUsageDailySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, name: 'ops_usage_ttl' });

export const OpsUsageDaily = mongoose.model('OpsUsageDaily', opsUsageDailySchema);
