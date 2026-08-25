import mongoose from 'mongoose';
import { config } from './config.js';
import { AppointmentRule } from './models/AppointmentRule.js';
import { Booking } from './models/Booking.js';

async function dropIndexIfPresent(collection, name) {
  const indexes = await collection.indexes();
  if (indexes.some(index => index.name === name)) await collection.dropIndex(name);
}

export async function ensureOperationalIndexes() {
  await AppointmentRule.updateMany({ sourceType: { $exists: false } }, { $set: { sourceType: 'product', serviceType: 'product' } });
  await Booking.updateMany({ slotPosition: { $exists: false } }, { $set: { slotPosition: 0 } });
  await Booking.updateMany({ sourceType: { $exists: false } }, { $set: { sourceType: 'product', serviceType: 'product' } });

  await dropIndexIfPresent(AppointmentRule.collection, 'shopId_1_productId_1');
  await AppointmentRule.collection.createIndex(
    { shopId: 1, productId: 1 },
    { unique: true, partialFilterExpression: { sourceType: 'product' }, name: 'one_rule_per_product' }
  );

  await dropIndexIfPresent(Booking.collection, 'one_confirmed_booking_per_slot');
  await dropIndexIfPresent(Booking.collection, 'shopId_1_ruleId_1_slotKey_1');
  await Booking.collection.createIndex(
    { shopId: 1, ruleId: 1, slotKey: 1, slotPosition: 1 },
    { unique: true, partialFilterExpression: { status: 'confirmed' }, name: 'capacity_position_per_slot' }
  );
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
