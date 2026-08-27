import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = relative => readFile(path.join(root, relative), 'utf8');

test('v0.6.6 replaces the purchase-first explanation block with the compact design card', async () => {
  const [view, css] = await Promise.all([source('src/views/admin.js'), source('public/admin/styles.css')]);
  assert.match(view, /post-purchase-entry-card/);
  assert.match(view, /post-purchase-entry-meta/);
  assert.match(css, /\.post-purchase-entry-card/);
  assert.match(css, /\.post-purchase-entry-meta/);
});

test('v0.6.6 uses an Appointment Lite location picker instead of the browser native select', async () => {
  const [view, admin, css] = await Promise.all([source('src/views/admin.js'), source('public/admin/app.js'), source('public/admin/styles.css')]);
  assert.doesNotMatch(view, /<select id="shoplineLocationId"/);
  assert.match(view, /id="shoplineLocationPicker"/);
  assert.match(view, /class="location-picker-trigger"/);
  assert.match(view, /id="shoplineLocationOptions"/);
  assert.match(admin, /setLocationPickerValue/);
  assert.match(admin, /data-location-id/);
  assert.match(css, /\.location-picker-menu/);
  assert.match(css, /\.location-picker-option/);
});

test('v0.6.6 keeps payment and appointment status after date and assignment in booking records', async () => {
  const [view, admin] = await Promise.all([source('src/views/admin.js'), source('public/admin/app.js')]);
  assert.match(view, />Booking details<\/span><span>Payment<\/span><span>Appointment<\/span>/);
  assert.match(admin, /booking-schedule-cell[\s\S]*booking-status-cell[\s\S]*booking-status-cell[\s\S]*row-actions/);
});

test('v0.6.6 sorts order-backed booking records by order creation time instead of mutable updated time', async () => {
  const [entitlement, postPurchase, route] = await Promise.all([
    source('src/models/PostPurchaseEntitlement.js'), source('src/services/post-purchase.js'), source('src/routes/admin.js')
  ]);
  assert.match(entitlement, /orderCreatedAt:\s*Date/);
  assert.match(postPurchase, /orderCreatedAtOf/);
  assert.match(postPurchase, /created_at/);
  assert.match(route, /recordSortAt:\s*entitlement\.orderCreatedAt \|\| entitlement\.createdAt/);
  assert.match(route, /bookingRecordTimestamp\(b\) - bookingRecordTimestamp\(a\)/);
  assert.doesNotMatch(route, /String\(b\.updatedAt \|\| b\.createdAt/);
});

test('v0.6.6 supports soft deletion with a custom second confirmation for booking and order lifecycle records', async () => {
  const [booking, entitlement, service, route, admin] = await Promise.all([
    source('src/models/Booking.js'), source('src/models/PostPurchaseEntitlement.js'), source('src/services/bookings.js'), source('src/routes/admin.js'), source('public/admin/app.js')
  ]);
  assert.match(booking, /adminDeletedAt/);
  assert.match(entitlement, /adminDeletedAt/);
  assert.match(service, /deleteBookingByMerchant/);
  assert.match(service, /reconcileBookingGoogleCalendar/);
  assert.match(route, /adminRouter\.delete\('\/bookings\/lifecycle\/:id'/);
  assert.match(route, /adminRouter\.delete\('\/bookings\/:id'/);
  assert.match(route, /adminDeletedAt:\s*null/);
  assert.match(admin, /data-delete-booking/);
  assert.match(admin, /confirmAction\([\s\S]*Delete record/);
});

test('v0.6.6 release version is aligned', async () => {
  const pkg = JSON.parse(await source('package.json'));
  assert.equal(pkg.version, '0.6.9');
});

test('v0.6.6 deleting an active booking soft-deletes it and releases it from active status', async () => {
  const { deleteBookingByMerchant } = await import('../src/services/bookings.js');
  const now = new Date('2026-08-27T06:00:00.000Z');
  const current = {
    _id: 'booking-1', shopId: 'shop-1', ruleId: 'rule-1', status: 'confirmed',
    date: '2026-08-31', time: '10:30', slotKey: '2026-08-31T10:30',
    location: 'Main showroom', staff: 'Sarah', staffId: null,
    commerceMode: 'standalone_free'
  };
  let updateSeen = null;
  const BookingModel = {
    findOne: async () => current,
    findOneAndUpdate: async (_filter, update) => {
      updateSeen = update;
      return { ...current, ...update.$set, events: [update.$push.events] };
    }
  };
  let notified = 0;
  const result = await deleteBookingByMerchant({
    shopObjectId: 'shop-1', bookingId: 'booking-1', BookingModel,
    ReservationModel: null, StaffReservationModel: null, now,
    notify: async () => { notified += 1; return { attempted: 1, failed: 0 }; }
  });
  assert.equal(result.deleted, true);
  assert.equal(result.booking.status, 'cancelled');
  assert.equal(result.booking.adminDeletedAt, now);
  assert.equal(updateSeen.$push.events.type, 'merchant_cancelled');
  assert.equal(notified, 1);
});
