import mongoose from 'mongoose';
import { config } from './config.js';
import { AppointmentRule } from './models/AppointmentRule.js';
import { Booking } from './models/Booking.js';
import { BookingReservation } from './models/BookingReservation.js';
import { Staff } from './models/Staff.js';
import { StaffReservation } from './models/StaffReservation.js';
import { CalendarConnection } from './models/CalendarConnection.js';

async function dropIndexIfPresent(collection, name) {
  const indexes = await collection.indexes();
  if (indexes.some(index => index.name === name)) await collection.dropIndex(name);
}

export async function ensureOperationalIndexes() {
  // v0.3.0 compatibility fields.
  await AppointmentRule.updateMany({ sourceType: { $exists: false } }, { $set: { sourceType: 'product' } });
  await Booking.updateMany({ slotPosition: { $exists: false } }, { $set: { slotPosition: 0 } });
  await Booking.updateMany({ sourceType: { $exists: false } }, { $set: { sourceType: 'product' } });

  // v0.3.1: service type and booking channel are independent.
  await AppointmentRule.updateMany(
    { bookingSource: { $exists: false }, sourceType: 'standalone' },
    { $set: { bookingSource: 'direct' } }
  );
  await AppointmentRule.updateMany(
    { bookingSource: { $exists: false } },
    { $set: { bookingSource: 'product' } }
  );
  await AppointmentRule.updateMany(
    { $or: [{ serviceTitle: { $exists: false } }, { serviceTitle: '' }] },
    [{ $set: { serviceTitle: '$productTitle' } }]
  );
  // In v0.3.0 productTitle doubled as the standalone service title. After copying it
  // into serviceTitle, clear product metadata for direct-only services.
  await AppointmentRule.updateMany(
    { bookingSource: 'direct', productId: { $in: ['', null] } },
    { $set: { productTitle: '', productHandle: '' } }
  );
  await AppointmentRule.updateMany({ serviceType: 'product' }, { $set: { serviceType: 'appointment' } });

  await Booking.updateMany(
    { bookingSource: { $exists: false }, sourceType: 'standalone' },
    { $set: { bookingSource: 'direct' } }
  );
  await Booking.updateMany(
    { bookingSource: { $exists: false } },
    { $set: { bookingSource: 'product' } }
  );
  await Booking.updateMany({ serviceType: 'product' }, { $set: { serviceType: 'appointment' } });

  // v0.5.0: staff management is opt-in so legacy free-text specialists keep working.
  await AppointmentRule.updateMany({ staffAssignment: { $exists: false } }, { $set: { staffAssignment: { mode: 'none', staffIds: [] } } });

  // v0.4.0: explicit booking modes and occurrence reservations. Existing bookings remain minute/hour appointments.
  await AppointmentRule.updateMany({ bookingMode: { $exists: false } }, { $set: { bookingMode: 'slot', sessionsRequired: 1 } });
  // v0.5.0-hotfix.1: non-multi booking modes represent exactly one occurrence.
  await AppointmentRule.updateMany({ bookingMode: { $ne: 'multi_slot' }, sessionsRequired: { $ne: 1 } }, { $set: { sessionsRequired: 1 } });
  await Booking.updateMany({ bookingMode: { $exists: false } }, { $set: { bookingMode: 'slot' } });
  const legacyConfirmed = await Booking.find({ status: 'confirmed' }).select('_id shopId ruleId bookingMode date time slotKey slotPosition occurrences').lean();
  for (const booking of legacyConfirmed) {
    const occurrences = Array.isArray(booking.occurrences) && booking.occurrences.length
      ? booking.occurrences
      : [{ date: booking.date, time: booking.time, slotKey: booking.slotKey || `${booking.date}T${booking.time}`, slotPosition: Number(booking.slotPosition || 0) }];
    for (const occurrence of occurrences) {
      if (!occurrence?.date || !occurrence?.slotKey) continue;
      await BookingReservation.updateOne(
        { shopId: booking.shopId, ruleId: booking.ruleId, slotKey: occurrence.slotKey, slotPosition: Number(occurrence.slotPosition || 0) },
        { $setOnInsert: { bookingId: booking._id, bookingMode: booking.bookingMode || 'slot', date: occurrence.date, time: occurrence.time || '' } },
        { upsert: true }
      ).catch(error => { if (error?.code !== 11000) throw error; });
    }
    if (!Array.isArray(booking.occurrences) || !booking.occurrences.length) {
      await Booking.updateOne({ _id: booking._id }, { $set: { occurrences } });
    }
  }

  await dropIndexIfPresent(AppointmentRule.collection, 'shopId_1_productId_1');
  await dropIndexIfPresent(AppointmentRule.collection, 'one_rule_per_product');
  await dropIndexIfPresent(AppointmentRule.collection, 'one_appointment_service_per_product');
  await AppointmentRule.collection.createIndex(
    { shopId: 1, productId: 1 },
    { unique: true, partialFilterExpression: { productId: { $gt: '' } }, name: 'one_appointment_service_per_product' }
  );

  await dropIndexIfPresent(Booking.collection, 'one_confirmed_booking_per_slot');
  await dropIndexIfPresent(Booking.collection, 'shopId_1_ruleId_1_slotKey_1');
  await Booking.collection.createIndex(
    { shopId: 1, ruleId: 1, slotKey: 1, slotPosition: 1 },
    { unique: true, partialFilterExpression: { status: 'confirmed' }, name: 'capacity_position_per_slot' }
  );
  await BookingReservation.syncIndexes();
  await Staff.syncIndexes();
  await StaffReservation.syncIndexes();
  await CalendarConnection.syncIndexes();
}

export async function connectDatabase() {
  mongoose.set('strictQuery', true);
  await mongoose.connect(config.mongoUri, {
    dbName: config.mongoDbName,
    serverSelectionTimeoutMS: 10000,
    maxPoolSize: 10,
    minPoolSize: 0
  });
  await ensureOperationalIndexes();
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
}
