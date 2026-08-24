import { AppointmentRule } from '../models/AppointmentRule.js';
import { Booking } from '../models/Booking.js';
import { slotKey, slotsForDate } from '../lib/slots.js';
import { sendBookingNotifications } from './email.js';
import { findInstalledShop } from './shops.js';

export class SlotConflictError extends Error { constructor() { super('This time was just booked. Please choose another slot.'); this.code = 'SLOT_CONFLICT'; } }

export async function createBookingAtomic({ shop, rule, input, BookingModel = Booking, notify = sendBookingNotifications }) {
  if (!rule.enabled || !slotsForDate(rule, input.date).includes(input.time)) throw Object.assign(new Error('The selected time is not available.'), { code: 'SLOT_UNAVAILABLE' });
  for (const question of rule.customQuestions || []) {
    if (question.required && !input.answers.find(answer => answer.question === question.label && answer.answer)) {
      throw Object.assign(new Error(`Please answer: ${question.label}`), { code: 'VALIDATION_ERROR' });
    }
  }
  let booking;
  try {
    booking = await BookingModel.create({
      shopId: shop._id, ruleId: rule._id, productId: rule.productId, productTitle: rule.productTitle,
      date: input.date, time: input.time, slotKey: slotKey(input.date, input.time), duration: rule.duration,
      buffer: rule.buffer, timezone: shop.timezone || 'UTC', location: rule.location, staff: rule.staff,
      customer: input.customer, note: input.note, answers: input.answers, status: 'confirmed'
    });
  } catch (error) {
    if (error?.code === 11000) throw new SlotConflictError();
    throw error;
  }
  Promise.resolve(notify(booking, shop.email)).catch(error => console.error('Email notification failed', error.message));
  return booking;
}

export async function createBookingForStore({ shopId, handle, productId, input }) {
  const shop = await findInstalledShop({ shopId, shop: handle });
  if (!shop) throw Object.assign(new Error('Store is not available.'), { code: 'NOT_FOUND' });
  const rule = await AppointmentRule.findOne({ shopId: shop._id, productId, enabled: true });
  if (!rule) throw Object.assign(new Error('Appointments are not enabled for this product.'), { code: 'NOT_FOUND' });
  return createBookingAtomic({ shop, rule, input });
}
