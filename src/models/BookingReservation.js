import mongoose from 'mongoose';

const bookingReservationSchema = new mongoose.Schema({
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true, index: true },
  ruleId: { type: mongoose.Schema.Types.ObjectId, ref: 'AppointmentRule', required: true, index: true },
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
  bookingMode: { type: String, enum: ['slot', 'all_day', 'multi_slot'], default: 'slot' },
  date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  time: { type: String, default: '' },
  slotKey: { type: String, required: true },
  slotPosition: { type: Number, required: true, min: 0 }
}, { timestamps: true });

bookingReservationSchema.index(
  { shopId: 1, ruleId: 1, slotKey: 1, slotPosition: 1 },
  { unique: true, name: 'one_active_reservation_per_capacity_position' }
);

bookingReservationSchema.index({ ruleId: 1, date: 1 });
bookingReservationSchema.index({ shopId: 1, ruleId: 1, date: 1 }, { name: 'availability_reservations_by_shop_rule_date' });

export const BookingReservation = mongoose.model('BookingReservation', bookingReservationSchema);
