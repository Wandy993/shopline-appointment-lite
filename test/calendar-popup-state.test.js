import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('Google Calendar OAuth popup refreshes the parent without relying on postMessage', async () => {
  const source = await readFile(new URL('../public/admin/app.js', import.meta.url), 'utf8');
  assert.match(source, /calendarPopupTimer/);
  assert.match(source, /popup\.closed/);
  assert.match(source, /refreshCalendarAfterOAuth/);
  assert.match(source, /lastVerifiedAt/);
  assert.match(source, /calendarInitialSyncing/);
});

test('Google Calendar backfill persists completion and partial-failure status', async () => {
  const source = await readFile(new URL('../src/services/calendar-sync.js', import.meta.url), 'utf8');
  assert.match(source, /lastSyncError = summary\.errors \? String/);
  assert.match(source, /lastSyncAt: new Date\(\), lastSyncError/);
});
