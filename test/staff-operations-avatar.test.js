import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('staff schedule list and calendar use the same full staff avatar renderer as the directory', async () => {
  const app = await readFile(new URL('../public/admin/app.js', import.meta.url), 'utf8');
  assert.match(app, /function staffOperationsAvatarMarkup\(staff = \{\}, unassigned = false\)/);
  assert.match(app, /return staffAvatarMarkup\(\{/);
  assert.match(app, /staffOperationsAvatarMarkup\(item\.staffMember, item\.unassigned\)/);
  assert.match(app, /staffOperationsAvatarMarkup\(member, group\.unassigned\)/);
  assert.doesNotMatch(app, /staffAvatarMarkup\(item\.staffMember,'small'\)/);
  assert.doesNotMatch(app, /staffAvatarMarkup\(member,'small'\)/);
});

test('mobile private appointment date input is constrained to its parent width', async () => {
  const styles = await readFile(new URL('../public/manage/styles.css', import.meta.url), 'utf8');
  assert.match(styles, /#newDate\{[^}]*width:100%/);
  assert.match(styles, /#newDate\{[^}]*min-width:0/);
  assert.match(styles, /#newDate\{[^}]*max-width:100%/);
  assert.match(styles, /#newDate\{[^}]*box-sizing:border-box/);
});
