// Copyright (C) 2025-2026 Marco Iannacone
// SPDX-License-Identifier: AGPL-3.0-only
'use strict';

// Tests for JoshuaPresentation (src/app/presentation.js): the single speed
// factor shared by boot greeting/play-prompt and the final STRANGE GAME/chess
// messages. Covers minor-fix test cases 15-17.

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const Presentation = require(path.join(
  '..', '..', 'src', 'app', 'presentation.js'
));

test('default speed is 0.5 when no override is given', () => {
  assert.equal(Presentation.resolveSpeed(undefined), 0.5);
  assert.equal(Presentation.resolveSpeed(null), 0.5);
  assert.equal(Presentation.resolveSpeed(''), 0.5);
});

test('15) presentationSpeed=0.5 roughly doubles typing delay and roughly halves TTS rate', () => {
  const speed = Presentation.resolveSpeed('0.5');
  assert.equal(speed, 0.5);
  assert.equal(Presentation.scaleDelay(60, speed), 120);
  assert.equal(Presentation.scaleRate(0.65, speed), 0.325);
});

test('16) presentationSpeed=0.75 produces an intermediate value between 0.5 and 1', () => {
  const speed = Presentation.resolveSpeed('0.75');
  assert.equal(speed, 0.75);
  const delayAt05 = Presentation.scaleDelay(60, 0.5);
  const delayAt075 = Presentation.scaleDelay(60, 0.75);
  const delayAt1 = Presentation.scaleDelay(60, 1);
  assert.ok(delayAt075 < delayAt05, 'faster than half speed');
  assert.ok(delayAt075 > delayAt1, 'still slower than full speed');
});

test('17) invalid/out-of-range values fall back to the safe default', () => {
  assert.equal(Presentation.resolveSpeed('not-a-number'), 0.5);
  assert.equal(Presentation.resolveSpeed('0'), 0.5);
  assert.equal(Presentation.resolveSpeed('-1'), 0.5);
  assert.equal(Presentation.resolveSpeed('999'), 0.5);
  assert.equal(Presentation.resolveSpeed('NaN'), 0.5);
  assert.equal(Presentation.resolveSpeed('Infinity'), 0.5);
});

test('scaleDelay/scaleRate never produce non-finite or non-positive results', () => {
  assert.ok(isFinite(Presentation.scaleDelay(60, 0)));
  assert.ok(isFinite(Presentation.scaleDelay(60, -5)));
  assert.ok(isFinite(Presentation.scaleDelay(60, NaN)));
  assert.ok(Presentation.scaleDelay(60, 0) > 0);
  assert.ok(isFinite(Presentation.scaleRate(0.65, 0)));
  assert.ok(Presentation.scaleRate(0.65, 0) > 0);
});
