// Copyright (C) 2025-2026 Marco Iannacone
// SPDX-License-Identifier: AGPL-3.0-only
'use strict';

// Coverage for the app version number: a single canonical source
// (src/app/version.js), read by the splash screen in both languages, with
// package.json aligned and no hardcoded duplicates elsewhere in src/.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const SRC_DIR = path.join(ROOT, 'src');
const VERSION_JS_PATH = path.join(SRC_DIR, 'app', 'version.js');
const GAME_JS_PATH = path.join(SRC_DIR, 'app', 'game.js');
const INDEX_HTML_PATH = path.join(SRC_DIR, 'index.html');
const PACKAGE_JSON_PATH = path.join(ROOT, 'package.json');

const JoshuaVersion = require(VERSION_JS_PATH);

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

test('version.js is the canonical source: semver 0.69.1, displayVersion "v. 0.69.1"', () => {
  assert.equal(JoshuaVersion.semver, '0.69.1');
  assert.equal(JoshuaVersion.displayVersion, 'v. 0.69.1');
});

test('package.json version is aligned to 0.69.1, private stays true', () => {
  const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf8'));
  assert.equal(pkg.version, '0.69.1');
  assert.equal(pkg.private, true);
});

test('index.html loads app/version.js and does not hardcode the display version in markup', () => {
  const html = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  assert.match(html, /<script src="app\/version\.js"><\/script>/);
  // The splash version element must exist but start empty — the value is
  // injected at runtime from JoshuaVersion, not written into the HTML.
  const el = html.match(/<span id="splashVersion"[^>]*>([^<]*)<\/span>/);
  assert.ok(el, 'expected #splashVersion element in the splash markup');
  assert.equal(el[1], '', '#splashVersion must start empty; the value comes from JoshuaVersion at runtime');
  assert.ok(!/v\.\s*0\.69\.1/.test(html), 'the display version string must not be hardcoded anywhere in index.html');
});

test('game.js reads the display version from window.JoshuaVersion, unconditionally on every splash render (both languages)', () => {
  const gameJs = fs.readFileSync(GAME_JS_PATH, 'utf8');
  const matches = gameJs.match(/splashVersion\.textContent\s*=\s*window\.JoshuaVersion\.displayVersion;/g) || [];
  assert.equal(matches.length, 1, 'expected exactly one assignment, shared by both languages (not duplicated per-language)');
  // initSplash() runs for whichever `lang` was resolved from the query
  // string, so this single, unconditional assignment covers EN and IT.
  const initSplashBody = gameJs.match(/function initSplash\(\)\s*\{[\s\S]*?\n\s*\}/);
  assert.ok(initSplashBody && /splashVersion\.textContent\s*=\s*window\.JoshuaVersion\.displayVersion;/.test(initSplashBody[0]));
});

test('no hardcoded duplicates of the version strings anywhere in src/ outside version.js', () => {
  const files = walk(SRC_DIR).filter((f) => /\.(js|html|css)$/.test(f) && f !== VERSION_JS_PATH);
  const offenders = [];
  for (const f of files) {
    const text = fs.readFileSync(f, 'utf8');
    if (/0\.69\.1/.test(text) || /v\.\s*0\.69\.1/.test(text)) offenders.push(path.relative(SRC_DIR, f));
  }
  assert.deepEqual(offenders, [], 'version strings must only live in src/app/version.js');
});

test('the normal app has no link to the dev-only media-lab page', () => {
  const html = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  assert.ok(!/media-lab/.test(html));
});
