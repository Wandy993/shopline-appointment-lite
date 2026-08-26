import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import mongoose from 'mongoose';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');

function staffModel(rows) {
  return { find() { return { lean: async () => rows }; } };
}

test('public preset staff avatars are embedded so storefronts do not depend on cross-origin image loading', async () => {
  const { publicStaffOptions } = await import('../src/services/staffing.js');
  const staffId = new mongoose.Types.ObjectId();
  const shopId = new mongoose.Types.ObjectId();
  const rule = { shopId, staffAssignment: { mode: 'customer_choice', staffIds: [staffId] } };
  const result = await publicStaffOptions(rule, { StaffModel: staffModel([{ _id: staffId, shopId, status: 'active', name: 'Sarah', avatar: { kind: 'preset', value: 'aurora' } }]) });
  assert.equal(result.options[0].avatar.kind, 'custom');
  assert.match(result.options[0].avatar.value, /^data:image\/webp;base64,/);
  assert.ok(result.options[0].avatar.value.length > 10000);
});

test('built-in staff portraits are higher-resolution production assets', async () => {
  for (let index = 1; index <= 8; index += 1) {
    const info = await stat(new URL(`../public/staff-avatars/staff-${index}.webp`, import.meta.url));
    assert.ok(info.size > 10000, `staff-${index}.webp should not be an aggressively compressed thumbnail`);
  }
});

test('admin locale switching can reverse dynamically captured Chinese text back to English', async () => {
  const admin = await read('../public/admin/app.js');
  assert.match(admin, /const enByZh = new Map/);
  assert.match(admin, /function staticTranslation/);
  assert.match(admin, /const english = enByZh\.get\(trimmed\) \|\| trimmed/);
  assert.match(admin, /if \(state\.staffOperations\?\.date\) renderStaffOperations\(\)/);
});

test('theme cache key includes the release version to evict old public staff metadata', async () => {
  const theme = await read('../theme-extension-source/public/appointment-lite.js');
  assert.match(theme, /const key = `al-rule:\$\{VERSION\}:\$\{context\.shopId\}:\$\{context\.productId\}`/);
});
