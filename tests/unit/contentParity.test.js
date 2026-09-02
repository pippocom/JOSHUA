// Copyright (C) 2025-2026 Marco Iannacone
// SPDX-License-Identifier: AGPL-3.0-only
'use strict';

// EN/IT content-parity guard: both language modules must expose the same
// shape (top-level keys, nested object keys, and array lengths) so a key
// added to one language cannot silently drift out of the other. Values are
// deliberately not compared — wording differences are expected and legitimate.

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

function loadContent() {
  const win = {};
  global.window = win;
  delete require.cache[require.resolve(path.join('..', '..', 'src', 'data', 'content.en.js'))];
  delete require.cache[require.resolve(path.join('..', '..', 'src', 'data', 'content.it.js'))];
  require(path.join('..', '..', 'src', 'data', 'content.en.js'));
  require(path.join('..', '..', 'src', 'data', 'content.it.js'));
  return { en: win.JOSHUA_CONTENT_EN, it: win.JOSHUA_CONTENT_IT };
}

// Returns a description of the first structural mismatch between two content
// shapes, or null if their shapes match. Comparison is bidirectional at every
// level: a key present in either object but missing from the other, an
// array/non-array type mismatch, or a different array length all count.
function firstShapeMismatch(a, b, prefix) {
  const aKeys = Object.keys(a).sort();
  const bKeys = Object.keys(b).sort();
  if (JSON.stringify(aKeys) !== JSON.stringify(bKeys)) {
    return `${prefix} key mismatch: left=[${aKeys.join(',')}] right=[${bKeys.join(',')}]`;
  }
  for (const key of aKeys) {
    const loc = `${prefix}.${key}`;
    const va = a[key];
    const vb = b[key];
    if (Array.isArray(va) !== Array.isArray(vb)) {
      return `${loc}: array/scalar type mismatch`;
    }
    if (Array.isArray(va)) {
      if (va.length !== vb.length) return `${loc}: length mismatch (${va.length} vs ${vb.length})`;
    } else if (va && typeof va === 'object') {
      const sub = firstShapeMismatch(va, vb, loc);
      if (sub) return sub;
    }
  }
  return null;
}

test('EN and IT content modules share the same shape (no key/length drift)', () => {
  const { en, it } = loadContent();
  assert.equal(firstShapeMismatch(en, it, 'content'), null);
});

test('report outcome values and the tic-tac-toe human token are localized', () => {
  const { en, it } = loadContent();
  assert.equal(en.war.reportValues.severe, 'SEVERE');
  assert.equal(en.war.reportValues.degraded, 'DEGRADED');
  assert.equal(en.war.reportValues.failed, 'FAILED');
  assert.equal(it.war.reportValues.severe, 'SEVERO');
  assert.equal(it.war.reportValues.degraded, 'DEGRADATO');
  assert.equal(it.war.reportValues.failed, 'FALLITO');
  assert.equal(en.tic.humanLabel, 'HUMAN');
  assert.equal(it.tic.humanLabel, 'UMANO');
});

test('shape comparison detects an extra or missing nested key in either direction', () => {
  const base = { tic: { move: 'MOVE', drawLabel: 'DRAW' }, war: { none: 'NONE' } };
  // Extra key only on the right.
  assert.match(
    firstShapeMismatch(base, { tic: { move: 'MOVE', drawLabel: 'DRAW', extra: 'X' }, war: { none: 'NONE' } }, 'root'),
    /tic key mismatch/
  );
  // Missing key on the right.
  assert.match(
    firstShapeMismatch(base, { tic: { move: 'MOVE' }, war: { none: 'NONE' } }, 'root'),
    /tic key mismatch/
  );
  // Extra top-level key only on the right.
  assert.match(
    firstShapeMismatch(base, { tic: base.tic, war: base.war, extra: 'X' }, 'root'),
    /root key mismatch/
  );
  // Object/array type mismatch.
  assert.match(
    firstShapeMismatch({ tic: ['a'] }, { tic: { move: 'MOVE' } }, 'root'),
    /array\/scalar type mismatch/
  );
  // Array length mismatch.
  assert.match(
    firstShapeMismatch({ tic: { hiddenFound: ['a', 'b'] } }, { tic: { hiddenFound: ['a'] } }, 'root'),
    /length mismatch/
  );
});
