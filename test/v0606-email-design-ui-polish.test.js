import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');

test('v0.6.0.6 Email Studio notification controls use structured readable option cards', async () => {
  const [view, styles] = await Promise.all([
    read('../src/views/admin.js'),
    read('../public/admin/styles.css')
  ]);
  const start = view.indexOf('<div class="notification-preferences">');
  const end = view.indexOf('</article>', start);
  assert.ok(start > -1 && end > start);
  const section = view.slice(start, end);

  assert.match(section, /notification-preferences-head/);
  assert.match(section, /class="notification-option"/);
  assert.match(section, /class="notification-option-copy"/);
  assert.match(section, /class="reminder-select-wrap"/);
  assert.doesNotMatch(section, /calendar-sync-toggle/);

  assert.match(styles, /\.notification-option\{[^}]*display:grid[^}]*grid-template-columns:17px minmax\(0,1fr\)/);
  assert.match(styles, /\.notification-option-copy strong,\.notification-option-copy small\{display:block\}/);
  assert.match(styles, /\.notification-toggle-grid\.four\{[^}]*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(styles, /@media\(max-width:720px\)\{[^}]*\.notification-toggle-grid\.four\{grid-template-columns:1fr\}/);
});

test('v0.6.0.6 Email Studio Chinese copy stays concise and fully localized', async () => {
  const admin = await read('../public/admin/app.js');
  for (const [english, chinese] of [
    ['Choose where appointment emails are delivered and which updates each audience receives.', '设置预约邮件的收件地址，并选择客户和商家分别接收哪些通知。'],
    ['Turn each message on or off. Staff assignment emails are managed from Staff.', '可单独开启或关闭每类邮件；员工分配通知请在“员工”中设置。'],
    ['Emails sent to the customer who made the appointment.', '发送给提交预约的客户。'],
    ['Store-wide updates sent to the merchant inboxes above.', '发送到上方设置的商家通知邮箱。'],
    ['Send after a booking is created.', '预约创建后发送确认邮件。'],
    ['Used for both customer and merchant pre-appointment reminders.', '同时用于客户和商家的履约前提醒。']
  ]) {
    assert.ok(admin.includes(`'${english}': '${chinese}'`));
  }
});

test('v0.6.0.6 runtime cache markers match the package release version', async () => {
  const [pkgText, adminView, bookView, adminAsset, bookAsset, theme, app] = await Promise.all([
    read('../package.json'), read('../src/views/admin.js'), read('../src/views/book.js'), read('../public/admin/app.js'), read('../public/book/app.js'), read('../theme-extension-source/public/appointment-lite.js'), read('../src/app.js')
  ]);
  const version = JSON.parse(pkgText).version;
  assert.ok(adminView.includes(`/admin/styles.css?v=${version}`));
  assert.ok(adminView.includes(`/admin/app.js?v=${version}`));
  assert.ok(bookView.includes(`/book/assets/styles.css?v=${version}`));
  assert.ok(bookView.includes(`/book/assets/app.js?v=${version}`));
  assert.ok(adminAsset.includes(`?v=${version}`));
  assert.ok(bookAsset.includes(`?v=${version}`));
  assert.ok(theme.includes(`const VERSION = '${version}'`));
  assert.ok(app.includes(`version: '${version}'`));
});
