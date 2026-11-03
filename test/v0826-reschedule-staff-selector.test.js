import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');

test('customer reschedule renders a staff selector and preselects the existing assigned employee', async () => {
  const asset = await read('../theme-extension-source/public/appointment-lite.js');
  const start = asset.indexOf('function openReschedule(');
  const end = asset.indexOf('\n  function open(', start);
  const source = asset.slice(start, end);
  assert.ok(start >= 0 && end > start);
  assert.match(source, /staffMode === 'customer_choice'/);
  assert.match(source, /class="al-reschedule-staff"/);
  assert.match(source, /data-staff-id/);
  assert.match(source, /receipt\.staffId \|\| occurrenceStaffId/);
  assert.match(source, /staffOptions\.find\(item => String\(item\.name/);
  assert.match(source, /staffTrigger\.addEventListener\('click'/);
  assert.match(source, /if \(dateInput\.value\) await loadAvailability\(\)/);
});

test('managed availability and reschedule requests send the selected staff ID through private booking endpoints', async () => {
  const [asset, route, service] = await Promise.all([
    read('../theme-extension-source/public/appointment-lite.js'),
    read('../src/routes/public.js'),
    read('../src/services/bookings.js')
  ]);
  assert.match(asset, /apiUrl\(\x60\/api\/public\/bookings\/\$\{receipt\.id\}\/availability\x60\)/);
  assert.match(asset, /managementToken: receipt\.managementToken, date: dateInput\.value, staffId: requestedStaffId/);
  assert.match(asset, /rescheduleInput\.staffId = selectedStaffId/);
  assert.match(route, /requestedStaffId: String\(req\.body\.staffId \|\| ''\)\.trim\(\)/);
  assert.match(route, /staffId: String\(req\.body\.staffId \|\| ''\)\.trim\(\)/);
  assert.match(service, /requestedStaffId = ''/);
  assert.match(service, /requestedStaffId: selectedStaffId/);
  assert.match(service, /staffId = ''/);
});

test('booking receipts retain staff identity for future rescheduling, including occurrence-based bookings', async () => {
  const asset = await read('../theme-extension-source/public/appointment-lite.js');
  assert.match(asset, /staffId: String\(booking\.staffId \|\| booking\.occurrences\?\.find\(item => item\?\.staffId\)\?\.staffId \|\| ''\)/);
  assert.match(asset, /staffId: String\(item\.staffId \|\| ''\), staffName: String\(item\.staffName \|\| ''\)/);
});

test('reschedule staff picker reuses the existing customer booking staff styles', async () => {
  const css = await read('../theme-extension-source/public/appointment-lite.css');
  assert.match(css, /\.al-reschedule-staff\{margin:0 0 10px\}/);
  assert.match(css, /\.al-reschedule-staff \.al-staff-trigger\{min-height:44px\}/);
  assert.match(css, /\.al-reschedule-staff \.al-staff-menu\{max-height:220px;overflow:auto\}/);
});
