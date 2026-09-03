import { AppointmentRule } from '../models/AppointmentRule.js';
import { Booking } from '../models/Booking.js';

const PROVIDERS = new Set(['zoom', 'google_meet', 'teams', 'custom']);

export function normalizeOnlineMeetingSnapshot(value) {
  const url = String(value?.url || '').trim().slice(0, 2000);
  if (!/^https:\/\/[^\s]+$/i.test(url)) return null;
  const provider = PROVIDERS.has(value?.provider) ? value.provider : 'custom';
  return {
    provider,
    label: String(value?.label || '').trim().slice(0, 100),
    url
  };
}

export async function ensureBookingOnlineMeetingSnapshot(booking, { BookingModel = Booking, RuleModel = AppointmentRule } = {}) {
  if (!booking || booking.locationMode !== 'online') return booking;
  if (normalizeOnlineMeetingSnapshot(booking.onlineMeeting)) return booking;
  if (!booking.ruleId || !booking.shopId) return booking;

  const query = RuleModel.findOne({ _id: booking.ruleId, shopId: booking.shopId });
  const selected = typeof query?.select === 'function' ? query.select('locationMode onlineMeeting') : query;
  const rule = typeof selected?.lean === 'function' ? await selected.lean() : await selected;
  if (!rule || rule.locationMode !== 'online') return booking;
  const snapshot = normalizeOnlineMeetingSnapshot(rule.onlineMeeting);
  if (!snapshot) return booking;

  if (typeof BookingModel.findOneAndUpdate === 'function') {
    const updated = await BookingModel.findOneAndUpdate(
      {
        _id: booking._id,
        $or: [
          { onlineMeeting: { $exists: false } },
          { 'onlineMeeting.url': { $exists: false } },
          { 'onlineMeeting.url': '' }
        ]
      },
      { $set: { onlineMeeting: snapshot } },
      { new: true, runValidators: true }
    );
    if (updated) return updated;
  }

  booking.onlineMeeting = snapshot;
  return booking;
}
