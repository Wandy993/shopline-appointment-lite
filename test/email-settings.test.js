import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_EMAIL_SETTINGS, interpolateTemplate, normalizeEmailSettings, validateEmailSettings } from '../src/lib/email-settings.js';

test('email settings inherit safe branded defaults for every notification type', () => {
  const settings = normalizeEmailSettings({});
  assert.equal(settings.brandName, 'Appointment Lite');
  assert.equal(settings.accentColor, '#5B5BD6');
  assert.deepEqual(Object.keys(settings.templates), Object.keys(DEFAULT_EMAIL_SETTINGS.templates));
  assert.match(settings.templates.confirmation.subject, /\{\{product_title\}\}/);
});

test('merchant email settings validate URLs, colors, and routing addresses', () => {
  const result = validateEmailSettings({ logoUrl: 'javascript:alert(1)', accentColor: 'red', replyToEmail: 'bad', merchantNotificationEmail: 'also-bad' });
  assert.match(result.errors.join(' '), /Logo URL/);
  assert.match(result.errors.join(' '), /Reply-to email/);
  assert.match(result.errors.join(' '), /Merchant notification email/);
});

test('template variables interpolate known values without evaluating template text', () => {
  const output = interpolateTemplate('Hi {{customer_name}} — {{unknown}}', { customer_name: 'Jamie' });
  assert.equal(output, 'Hi Jamie — {{unknown}}');
});
