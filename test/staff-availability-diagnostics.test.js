import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('availability API distinguishes service schedule closure from staff unavailability', async () => {
  const source = await readFile(new URL('../src/routes/public.js', import.meta.url), 'utf8');
  assert.match(source, /reason = 'SERVICE_CLOSED'/);
  assert.match(source, /reason = 'STAFF_UNAVAILABLE'/);
  assert.match(source, /slotsForDate\(result\.rule, date\)/);
});

test('storefronts explain that staff special hours do not open a closed service date', async () => {
  const [hosted, theme] = await Promise.all([
    readFile(new URL('../public/book/app.js', import.meta.url), 'utf8'),
    readFile(new URL('../theme-extension-source/public/appointment-lite.js', import.meta.url), 'utf8')
  ]);
  for (const source of [hosted, theme]) {
    assert.match(source, /SERVICE_CLOSED/);
    assert.match(source, /Staff special hours do not open a closed service date/);
    assert.match(source, /STAFF_UNAVAILABLE/);
  }
});

test('staff editor warns that staff exceptions still intersect with the service schedule', async () => {
  const [view, admin] = await Promise.all([
    readFile(new URL('../src/views/admin.js', import.meta.url), 'utf8'),
    readFile(new URL('../public/admin/app.js', import.meta.url), 'utf8')
  ]);
  assert.match(view, /Staff exceptions do not open a service date that is closed in the service schedule/);
  assert.match(admin, /员工特殊排班不会自动开放服务本身关闭的日期/);
});
