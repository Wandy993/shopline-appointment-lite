import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('v0.8.1.1 removes service type cards from the primary wizard and keeps category optional in Details', async () => {
  const view = await source('src/views/admin.js');
  assert.doesNotMatch(view, /id="serviceTypeGrid"/);
  assert.match(view, /data-rule-step="3"[\s\S]*Service category <span>optional<\/span>/);
  assert.match(view, /id="serviceType"[\s\S]*General appointment/);
  assert.match(view, /Optional classification only\. It does not change booking, payment, placement, or availability logic\./);
});

test('v0.8.1.1 wizard order is booking model, placement, availability, then details', async () => {
  const view = await source('src/views/admin.js');
  assert.match(view, /data-rule-step-button="0"[^>]*><span>1<\/span>Booking model/);
  assert.match(view, /data-rule-step-button="1"[^>]*><span>2<\/span>Placement/);
  assert.match(view, /data-rule-step-button="2"[^>]*><span>3<\/span>Availability/);
  assert.match(view, /data-rule-step-button="3"[^>]*><span>4<\/span>Details/);
  assert.match(view, /data-rule-step="1"[\s\S]*id="storefrontPlacementFieldset"/);
  assert.match(view, /data-rule-step="2"[\s\S]*id="bookingModeGrid"[\s\S]*id="weeklySchedule"/);
});

test('v0.8.1.1 uses lightweight decision, payment, and placement controls', async () => {
  const [view, css] = await Promise.all([source('src/views/admin.js'), source('public/admin/styles.css')]);
  assert.match(view, /booking-decision-grid/);
  assert.match(view, /payment-segmented/);
  assert.match(view, /placement-card-grid/);
  assert.match(view, /placement-card-wide/);
  assert.match(css, /\.decision-card\.selected \.selection-mark/);
  assert.match(css, /\.payment-segmented\{/);
  assert.match(css, /\.placement-card:has\(input:checked\)/);
  assert.match(css, /\.storefront-placement-fieldset\.purchase-triggered\{display:none\}/);
});

test('v0.8.1.1 validates placement in step 2 and booking timing plus schedule in step 3', async () => {
  const admin = await source('public/admin/app.js');
  assert.match(admin, /if \(step === 1 && bookingType === 'standalone'\)[\s\S]*placementPayload\(\)/);
  assert.match(admin, /if \(step === 2 && mode !== 'all_day'/);
  assert.match(admin, /if \(step === 2\) \{[\s\S]*weeklyOpen/);
  assert.doesNotMatch(admin, /serviceTypeGrid/);
  assert.match(admin, /\$\('#serviceType'\)\?\.addEventListener\('change'/);
});

test('v0.8.1.1 admin cache and health build identify the wizard polish release', async () => {
  const [view, app, release] = await Promise.all([source('src/views/admin.js'), source('src/app.js'), source('scripts/build-release.sh')]);
  assert.match(view, /styles\.css\?v=0\.8\.1&build=0\.8\.1\.2/);
  assert.match(view, /app\.js\?v=0\.8\.1&build=0\.8\.1\.2/);
  assert.match(app, /build: '0\.8\.1\.2-service-wizard-simplification-ui-polish\.1'/);
  assert.match(app, /release: 'v0\.8\.1\.2-service-wizard-simplification-ui-polish'/);
  assert.match(release, /RELEASE_LABEL="0\.8\.1\.2"/);
  assert.match(release, /appointment-lite-v\$\{RELEASE_LABEL\}-service-wizard-simplification-ui-polish/);
});
