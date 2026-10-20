const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '../supabase/email-templates/confirm-signup.html'), 'utf8');

test('signup email preserves both confirmation links', () => {
  assert.equal((html.match(/href="\{\{ \.ConfirmationURL \}\}"/g) || []).length, 2);
});

test('signup email uses current red branding without orange or image dependencies', () => {
  const css = fs.readFileSync(path.join(__dirname, '../app/globals.css'), 'utf8');
  assert.match(css, /--magma-red:\s*#E12120/i);
  assert.match(html, /background-color:#E12120;color:#FFFFFF/);
  assert.doesNotMatch(html, /#ff5638|#ff826b|#ff967f|REPLACE-WITH|<img|<script/i);
});
