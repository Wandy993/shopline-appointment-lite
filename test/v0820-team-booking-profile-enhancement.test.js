import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { DEFAULT_STOREFRONT_SETTINGS, normalizeStorefrontSettings, validateStorefrontSettings } from '../src/lib/storefront-settings.js';
const read = path => readFile(new URL(path, import.meta.url), 'utf8');

test('Team Booking copy has backward-compatible defaults, service placeholder, and validation', () => {
  const defaults = normalizeStorefrontSettings({});
  assert.equal(defaults.teamBooking.label, 'Team Booking');
  assert.equal(defaults.teamBooking.description, 'Select a team member for {{service}}, then continue to their available calendar.');
  assert.deepEqual(defaults, JSON.parse(JSON.stringify(DEFAULT_STOREFRONT_SETTINGS)));
  const custom = normalizeStorefrontSettings({ teamBooking: { label: 'Meet our experts', description: 'Choose a specialist for {{service}} and book a time.' } });
  assert.equal(custom.teamBooking.label, 'Meet our experts');
  assert.equal(custom.teamBooking.description, 'Choose a specialist for {{service}} and book a time.');
  assert.deepEqual(normalizeStorefrontSettings({ teamBooking: { label: '', description: '' } }).teamBooking, defaults.teamBooking);
  const invalid = validateStorefrontSettings({ teamBooking: { label: 'L'.repeat(49), description: 'D'.repeat(241) } });
  assert.match(invalid.errors.join(' '), /Team booking label/);
  assert.match(invalid.errors.join(' '), /Team booking description/);
});

test('Team Booking settings persist per shop and are exposed to existing public responses', async () => {
  const [model, settings, adminRoute, publicRoute] = await Promise.all([read('../src/models/Shop.js'), read('../src/lib/storefront-settings.js'), read('../src/routes/admin.js'), read('../src/routes/public.js')]);
  assert.match(model, /storefrontTeamBookingSettingsSchema/);
  assert.match(model, /teamBooking:\s*\{ type: storefrontTeamBookingSettingsSchema/);
  assert.match(settings, /teamBooking:\s*\{/);
  assert.match(adminRoute, /adminRouter\.put\('\/storefront\/settings'/);
  assert.match(adminRoute, /validateStorefrontSettings\(req\.body\)/);
  assert.match(publicRoute, /storefront: normalizeStorefrontSettings\(result\.shop\.storefrontSettings \|\| \{\}\)/);
});

test('Merchant admin edits and saves both Team Booking text fields', async () => {
  const [view, app] = await Promise.all([read('../src/views/admin.js'), read('../public/admin/app.js')]);
  assert.match(view, /id="storefrontTeamBookingLabel"/);
  assert.match(view, /id="storefrontTeamBookingDescription"/);
  assert.match(view, /\{\{service\}\}/);
  assert.match(app, /teamBooking: Object\.freeze/);
  assert.match(app, /storefrontTeamBookingLabel/);
  assert.match(app, /storefrontTeamBookingDescription/);
  assert.match(app, /api\('\/storefront\/settings', \{ method: 'PUT'/);
});

test('Public Staff Directory renders Expertise and Profile description with privacy filtering intact', async () => {
  const [staffing, appBlock, pageBlock, modalCss, pageCss] = await Promise.all([read('../src/services/staffing.js'), read('../theme-extension-source/public/appointment-lite.js'), read('../theme-extension-source/public/appointment-lite-page.js'), read('../theme-extension-source/public/appointment-lite.css'), read('../theme-extension-source/public/appointment-lite-page.css')]);
  assert.match(staffing, /staff\.filter\(item => item\.publicProfile === true\)/);
  assert.match(staffing, /expertise: publicProfileText\(item\.expertise\)/);
  assert.match(staffing, /bio: publicProfileText\(item\.bio\)/);
  assert.doesNotMatch(staffing, /email: item\.email[\s\S]*publicStaffDirectory/);
  assert.doesNotMatch(staffing, /phone: item\.phone[\s\S]*publicStaffDirectory/);
  assert.match(appBlock, /teamBooking\.description/);
  assert.match(appBlock, /item\.expertise/);
  assert.match(appBlock, /item\.bio/);
  assert.match(pageBlock, /teamBookingCopy\(storefront/);
  assert.match(pageBlock, /item\.expertise/);
  assert.match(pageBlock, /item\.bio/);
  assert.match(modalCss, /\.al-directory-expertise/);
  assert.match(modalCss, /\.al-directory-bio/);
  assert.match(pageCss, /\.al-dir-bio/);
});
