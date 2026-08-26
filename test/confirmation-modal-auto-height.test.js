import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('v0.5.4-hotfix.3 compacts the outer confirmation dialog shell', () => {
  const css = fs.readFileSync('theme-extension-source/public/appointment-lite.css', 'utf8');
  const js = fs.readFileSync('theme-extension-source/public/appointment-lite.js', 'utf8');
  assert.match(css, /v0\.5\.4-hotfix\.3 — confirmation dialog auto height/);
  assert.match(css, /:has\(\.al-confirmed\)/);
  assert.match(css, /height:\s*auto\s*!important/);
  assert.match(css, /min-height:\s*0\s*!important/);
  assert.match(css, /max-height:\s*calc\(100dvh - 28px\)\s*!important/);
  assert.match(js, /const VERSION = '0\.6\.0\.4'/);
  assert.match(js, /dialog\.classList\.add\('al-confirmation-dialog-compact'\)/);
  assert.match(css, /v0\.5\.4-hotfix\.3b — deterministic confirmed dialog shrink/);
  assert.match(css, /display:\s*block\s*!important/);
});
