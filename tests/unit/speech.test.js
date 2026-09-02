// Copyright (C) 2025-2026 Marco Iannacone
// SPDX-License-Identifier: AGPL-3.0-only
'use strict';

// Tests for JoshuaSpeech (src/audio/speech.js). Pure Node, no runtime
// dependencies: the Web Speech API is mocked by hand for each scenario.
//
// Bug being regression-tested: joshua.js used to call a `typeSpeak()`
// function that was never defined anywhere in the codebase. Any call in the
// GLOBAL THERMONUCLEAR WAR closing sequence threw a ReferenceError, which
// silently aborted `finalSequence()` after the countdown readout — the
// "STRANGE GAME..." message, the chess invitation and the return link never
// appeared. Reproduction (manual, pre-fix): boot the game, GAMES, run any
// war scenario three times, watch the final screen stop after the numbered
// summary lines with a ReferenceError: typeSpeak is not defined in the
// console.

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const JoshuaSpeech = require(path.join(
  '..', '..', 'src', 'audio', 'speech.js'
));

function makeTarget() {
  return { textContent: '' };
}

// Minimal fake SpeechSynthesisUtterance / speechSynthesis pair. `behavior`
// controls what happens after `speak()` is called: 'end' | 'error' | 'hang'.
function installFakeSpeechApi(behavior) {
  global.window = global.window || {};

  function FakeUtterance(text) {
    this.text = text;
    this.onend = null;
    this.onerror = null;
  }
  global.SpeechSynthesisUtterance = FakeUtterance;

  const fakeSynth = {
    _voices: [
      { name: 'Alice', lang: 'en-US' },
      { name: 'Alice-IT', lang: 'it-IT' }
    ],
    getVoices() { return fakeSynth._voices; },
    addEventListener() { /* voices already present synchronously above */ },
    speak(utterance) {
      if (behavior === 'hang') return; // never call onend/onerror
      setTimeout(() => {
        if (behavior === 'error' && utterance.onerror) utterance.onerror(new Error('synthetic TTS error'));
        else if (utterance.onend) utterance.onend();
      }, 5);
    },
    cancel() { this._cancelled = true; }
  };
  global.window.speechSynthesis = fakeSynth;
  return fakeSynth;
}

function removeSpeechApi() {
  delete global.SpeechSynthesisUtterance;
  if (global.window) delete global.window.speechSynthesis;
}

test.afterEach(() => {
  removeSpeechApi();
});

test('1) speechSynthesis available: resolves and types the full text', async () => {
  installFakeSpeechApi('end');
  const target = makeTarget();
  await JoshuaSpeech.typeSpeak('HELLO', target, 1, { lang: 'en' });
  assert.equal(target.textContent, 'HELLO');
});

test('2) Web Speech API absent: still resolves and types the full text', async () => {
  removeSpeechApi();
  const target = makeTarget();
  await JoshuaSpeech.typeSpeak('NO VOICE HERE', target, 1, { lang: 'en' });
  assert.equal(target.textContent, 'NO VOICE HERE');
});

test('3) speechSynthesis fires onerror: resolves anyway and text is complete', async () => {
  installFakeSpeechApi('error');
  const target = makeTarget();
  await JoshuaSpeech.typeSpeak('STILL WORKS', target, 1, { lang: 'en' });
  assert.equal(target.textContent, 'STILL WORKS');
});

test('4) onend never fires: safety timeout resolves the promise, text is complete', async () => {
  installFakeSpeechApi('hang');
  const target = makeTarget();
  const start = Date.now();
  await JoshuaSpeech.typeSpeak('TIMEOUT PATH', target, 1, { lang: 'en', speechTimeoutMs: 30 });
  const elapsed = Date.now() - start;
  assert.equal(target.textContent, 'TIMEOUT PATH');
  assert.ok(elapsed < 2000, 'should not hang for anywhere near the real 4-20s default timeout');
});

test('6) target element missing: does not throw, promise still resolves', async () => {
  installFakeSpeechApi('end');
  await assert.doesNotReject(JoshuaSpeech.typeSpeak('NO TARGET', null, 1, { lang: 'en' }));
});

test('cancelSpeech() stops an in-flight utterance without throwing', async () => {
  const synth = installFakeSpeechApi('hang');
  const target = makeTarget();
  const promise = JoshuaSpeech.typeSpeak('CANCEL ME', target, 1, { lang: 'en', speechTimeoutMs: 5000 });
  await new Promise((r) => setTimeout(r, 10));
  assert.doesNotThrow(() => JoshuaSpeech.cancelSpeech());
  assert.equal(synth._cancelled, true);
  await promise; // must still resolve, not hang
});
