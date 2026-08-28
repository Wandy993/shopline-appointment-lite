import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TinyTtlCache, createSingleFlight } from '../src/lib/runtime-cache.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = relative => readFile(path.join(root, relative), 'utf8');

test('v0.6.16 runtime cache expires entries and single-flight coalesces identical work', async () => {
  const cache = new TinyTtlCache({ ttlMs: 20, maxEntries: 2 });
  cache.set('a', 1);
  assert.equal(cache.get('a'), 1);
  await new Promise(resolve => setTimeout(resolve, 25));
  assert.equal(cache.get('a'), undefined);

  const singleFlight = createSingleFlight();
  let runs = 0;
  const work = () => singleFlight('same', async () => {
    runs += 1;
    await new Promise(resolve => setTimeout(resolve, 10));
    return 42;
  });
  const values = await Promise.all([work(), work(), work()]);
  assert.deepEqual(values, [42, 42, 42]);
  assert.equal(runs, 1);
});

test('v0.6.16 public availability reuses hot rule context and coalesces duplicate requests', async () => {
  const route = await source('src/routes/public.js');
  assert.match(route, /new TinyTtlCache\(\{ ttlMs: 4000/);
  assert.match(route, /createSingleFlight\(\)/);
  assert.match(route, /runAvailabilitySingleFlight\(flightKey/);
  assert.match(route, /Server-Timing/);
  assert.match(route, /X-Appointment-Availability-Ms/);
  assert.match(route, /Choose a valid appointment date/);
  assert.match(route, /status: 'confirmed', adminDeletedAt: null/);
});

test('v0.6.16 adds compound indexes used by availability reads', async () => {
  const [booking, reservations, staffReservations, db] = await Promise.all([
    source('src/models/Booking.js'),
    source('src/models/BookingReservation.js'),
    source('src/models/StaffReservation.js'), source('src/db.js')
  ]);
  assert.match(booking, /availability_legacy_booking_lookup/);
  assert.match(reservations, /availability_reservations_by_shop_rule_date/);
  assert.match(staffReservations, /availability_staff_by_shop_staff_date/);
  assert.match(db, /availability_legacy_booking_lookup/);
});

test('v0.6.16 storefront availability GETs time out, retry transient failures, and avoid loader flashes', async () => {
  const [hosted, theme] = await Promise.all([source('public/book/app.js'), source('theme-extension-source/public/appointment-lite.js')]);
  for (const text of [hosted, theme]) {
    assert.match(text, /const attempts = method === 'GET' \? 2 : 1/);
    assert.match(text, /setTimeout\(\(\) => controller\.abort\(\), 8000\)/);
    assert.match(text, /response\.status === 429 \|\| response\.status >= 500/);
    assert.match(text, /180\)/);
  }
});

test('v0.6.16 SHOPLINE recovery isolates failures and periodically sweeps recent orders', async () => {
  const paid = await source('src/services/paid-bookings.js');
  assert.match(paid, /reconcileRecentCommerceOrdersForActiveShops/);
  assert.match(paid, /recoverySweepEveryMs = 15 \* 60_000/);
  assert.match(paid, /Recent SHOPLINE order recovery sweep failed for a shop/);
  assert.match(paid, /Pending SHOPLINE order reconciliation failed for a shop/);
  assert.match(paid, /errors: 0/);
});

test('v0.6.16 retries transient SHOPLINE reads and Google Calendar sync without blocking booking creation', async () => {
  const [shopline, calendar, bookings] = await Promise.all([
    source('src/services/shopline.js'),
    source('src/services/calendar-sync.js'),
    source('src/services/bookings.js')
  ]);
  assert.match(shopline, /SHOPLINE_TRANSIENT_STATUSES = new Set\(\[429, 500, 502, 503, 504\]\)/);
  assert.match(shopline, /shoplineFetchWithRetry/);
  assert.match(calendar, /CALENDAR_RETRY_DELAYS_MS = \[0, 1500, 5000\]/);
  assert.match(calendar, /reconcileBookingGoogleCalendarWithRetry/);
  assert.match(calendar, /Google Calendar booking sync failed after retries/);
  assert.match(bookings, /queueBookingGoogleCalendarSync\(booking\._id, 'created'\)/);
});

test('v0.6.16 release version stays aligned', async () => {
  const pkg = JSON.parse(await source('package.json'));
  const [app, admin, book, theme, release] = await Promise.all([
    source('src/app.js'), source('src/views/admin.js'), source('src/views/book.js'),
    source('theme-extension-source/public/appointment-lite.js'), source('scripts/build-release.sh')
  ]);
  assert.equal(pkg.version, '0.7.0');
  assert.match(app, /version: '0.7.0'/);
  assert.match(admin, /styles\.css\?v=0.7.0/);
  assert.match(book, /app\.js\?v=0.7.0/);
  assert.match(theme, /const VERSION = '0.7.0'/);
  assert.match(release, /appointment-lite-v\$\{RELEASE_VERSION\}-shopline-subscription-integration/);
});
