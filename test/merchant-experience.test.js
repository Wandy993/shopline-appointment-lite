import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('Email Studio test send asks the merchant for a recipient address', async () => {
  const view = await readFile(new URL('../src/views/admin.js', import.meta.url), 'utf8');
  const asset = await readFile(new URL('../public/admin/app.js', import.meta.url), 'utf8');
  const route = await readFile(new URL('../src/routes/admin.js', import.meta.url), 'utf8');
  assert.match(view, /id="testEmailDialog"/);
  assert.match(view, /id="testEmailRecipient" type="email"/);
  assert.match(asset, /JSON\.stringify\(\{ to: input\.value\.trim\(\) \}\)/);
  assert.match(route, /validateTestEmailRecipient\(req\.body\?\.to\)/);
  assert.doesNotMatch(route, /settings\.merchantNotificationEmail \|\| req\.shop\.email \|\| config\.email\.merchantTo/);
});

test('first-install quickstart presents App Block first without blocking direct-booking service creation', async () => {
  const view = await readFile(new URL('../src/views/admin.js', import.meta.url), 'utf8');
  const asset = await readFile(new URL('../public/admin/app.js', import.meta.url), 'utf8');
  const model = await readFile(new URL('../src/models/Shop.js', import.meta.url), 'utf8');
  const route = await readFile(new URL('../src/routes/admin.js', import.meta.url), 'utf8');
  const blockIndex = view.indexOf('Enable the Appointment Lite App Block');
  const serviceIndex = view.indexOf('Create your first appointment service');
  assert.ok(blockIndex >= 0 && serviceIndex > blockIndex);
  assert.match(view, /id="quickstartDialog"/);
  assert.match(view, /id="quickstartThemeEditor"/);
  assert.match(view, /id="quickstartConfirmBlock"/);
  assert.match(model, /quickstartStartedAt: Date/);
  assert.match(model, /appBlockConfirmedAt: Date/);
  assert.match(route, /const eligible = quickstartStarted \|\| \(ruleCount === 0 && bookingCount === 0\)/);
  assert.match(route, /shouldShowQuickstart: !onboarding\.quickstartDismissedAt && eligible/);
  assert.match(asset, /payload\.onboarding\?\.shouldShowQuickstart/);
  assert.match(asset, /start-quickstart/);
  assert.match(asset, /confirm-app-block/);
  assert.match(asset, /locked: index === 2 && !serviceDone/);
  assert.match(view, /Direct-booking-only services can continue directly to Step 2/);
});
