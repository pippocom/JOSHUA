// Copyright (C) 2025-2026 Marco Iannacone
// SPDX-License-Identifier: AGPL-3.0-only
'use strict';

// Coverage for the first-draft project documentation: presence of the
// required files, no leftover summary.txt in the public tree, no media-lab
// link from the normal app, no claim that pippo.com's general terminal is
// included, and mutual EN/IT README links.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const SRC_DIR = path.join(ROOT, 'src');

const REQUIRED_DOCS = [
  'README.md',
  'README.it.md',
  'PLAYING.md',
  'PLAYING.it.md',
  'CONTRIBUTING.md',
  'TRIBUTE.md',
  'CREDITS.md',
  'CHANGELOG.md',
  'LICENSE',
  'NOTICE'
];

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

test('all required first-draft documentation files exist at the repository root', () => {
  for (const name of REQUIRED_DOCS) {
    const p = path.join(ROOT, name);
    assert.ok(fs.existsSync(p) && fs.statSync(p).isFile(), `expected ${name} to exist`);
    assert.ok(fs.statSync(p).size > 0, `expected ${name} to be non-empty`);
  }
});

test('LICENSE is the official AGPL-3.0 text (verbatim, not paraphrased)', () => {
  const license = fs.readFileSync(path.join(ROOT, 'LICENSE'), 'utf8');
  assert.match(license, /GNU AFFERO GENERAL PUBLIC LICENSE/);
  assert.match(license, /Version 3, 19 November 2007/);
  assert.match(license, /END OF TERMS AND CONDITIONS/);
});

test('no summary.txt anywhere under the public src/ tree', () => {
  const files = walk(SRC_DIR);
  assert.ok(!files.some((f) => path.basename(f) === 'summary.txt'));
});

test('the normal app has no link to the dev-only media-lab page', () => {
  const html = fs.readFileSync(path.join(SRC_DIR, 'index.html'), 'utf8');
  assert.ok(!/media-lab/.test(html));
});

test('README.md documents media-lab as a development-only page, not linked from the app', () => {
  const readme = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8');
  assert.match(readme, /media-lab/);
  assert.match(readme, /not.*linked from the app/i);
});

test('README files are explicit that the general pippo.com terminal and the "joshua" shell command are not included', () => {
  const readmeEn = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8');
  const readmeIt = fs.readFileSync(path.join(ROOT, 'README.it.md'), 'utf8');
  assert.match(readmeEn, /does not include pippo\.com's general[- ]purpose terminal/i);
  assert.match(readmeEn, /joshua.*shell command/i);
  assert.match(readmeIt, /non comprende il terminale generale di pippo\.com/i);
  assert.match(readmeIt, /comando shell.*joshua/i);
});

test('README.md and README.it.md link to each other', () => {
  const readmeEn = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8');
  const readmeIt = fs.readFileSync(path.join(ROOT, 'README.it.md'), 'utf8');
  assert.match(readmeEn, /\(README\.it\.md\)/);
  assert.match(readmeIt, /\(README\.md\)/);
});

test('PLAYING.md and PLAYING.it.md do not spoil the closing sequence', () => {
  const playingEn = fs.readFileSync(path.join(ROOT, 'PLAYING.md'), 'utf8');
  const playingIt = fs.readFileSync(path.join(ROOT, 'PLAYING.it.md'), 'utf8');
  for (const text of [playingEn, playingIt]) {
    assert.ok(!/STRANGE GAME/i.test(text));
    assert.ok(!/ONLY WINNING MOVE/i.test(text));
    assert.ok(!/nice game of chess/i.test(text));
    assert.ok(!/partita a scacchi/i.test(text));
  }
});

test('CHANGELOG.md documents 0.69.1, 0.69.0, and an Unreleased section, invents no earlier releases', () => {
  const changelog = fs.readFileSync(path.join(ROOT, 'CHANGELOG.md'), 'utf8');
  assert.match(changelog, /## \[Unreleased\]/);
  assert.match(changelog, /## \[0\.69\.1\] - 2026-09-15/);
  assert.match(changelog, /## \[0\.69\.0\] - 2026-08-29/);
  assert.ok(!/## \[0\.[0-6][0-8]\.\d+\]/.test(changelog), 'no earlier version sections should be invented');
});

test('NOTICE references the license and the tribute, without extra restrictions', () => {
  const notice = fs.readFileSync(path.join(ROOT, 'NOTICE'), 'utf8');
  assert.match(notice, /AGPL-3\.0-only/);
  assert.match(notice, /TRIBUTE\.md/);
  assert.match(notice, /LICENSE/);
});
