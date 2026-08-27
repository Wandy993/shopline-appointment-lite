import mongoose from 'mongoose';

const staffReservationSchema = new mongoose.Schema({
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true, index: true },
  staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true, index: true },
  ruleId: { type: mongoose.Schema.Types.ObjectId, ref: 'AppointmentRule', required: true, index: true },
  slotKey: { type: String, required: true },
  date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  bookingMode: { type: String, enum: ['slot', 'all_day', 'multi_slot'], default: 'slot' },
  bucketKeys: { type: [String], default: [] },
  bookingIds: { type: [mongoose.Schema.Types.ObjectId], default: [] }
}, { timestamps: true });

// One shared staff reservation represents one service occurrence. Group-capacity bookings
// for the same service/time reuse this document instead of blocking the same staff repeatedly.
staffReservationSchema.index(
  { shopId: 1, staffId: 1, ruleId: 1, slotKey: 1 },
  { unique: true, name: 'one_staff_reservation_per_service_occurrence' }
);

// Every five-minute bucket may belong to only one staff reservation. Because bookings for
// the same service occurrence reuse one document, this blocks overlapping services without
// preventing group/class capacity on the same service session.
staffReservationSchema.index(
  { shopId: 1, staffId: 1, bucketKeys: 1 },
  { unique: true, name: 'no_overlapping_staff_time_buckets' }
);

staffReservationSchema.index({ staffId: 1, date: 1 });
staffReservationSchema.index({ shopId: 1, staffId: 1, date: 1 }, { name: 'availability_staff_by_shop_staff_date' });
staffReservationSchema.index({ bookingIds: 1 });

export const StaffReservation = mongoose.model('StaffReservation', staffReservationSchema);
