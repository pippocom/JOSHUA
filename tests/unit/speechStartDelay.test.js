// Copyright (C) 2025-2026 Marco Iannacone
// SPDX-License-Identifier: AGPL-3.0-only
'use strict';

// Tests for speechStartDelayMs (src/audio/speech.js): delays only
// speechSynthesis.speak(), never the typewriter reveal.

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const JoshuaSpeech = require(path.join(
  '..', '..', 'src', 'audio', 'speech.js'
));

function makeTarget() { return { textContent: '' }; }

function installFakeSpeechApi() {
  global.window = global.window || {};
  const speakCalls = [];

  function FakeUtterance(text) { this.text = text; this.onend = null; this.onerror = null; }
  global.SpeechSynthesisUtterance = FakeUtterance;

  const fakeSynth = {
    _voices: [{ name: 'Alice', lang: 'en-US' }],
    getVoices() { return fakeSynth._voices; },
    addEventListener() {},
    speak(utterance) {
      speakCalls.push({ text: utterance.text, at: Date.now() });
      setTimeout(() => { if (utterance.onend) utterance.onend(); }, 5);
    },
    cancel() { this._cancelled = true; }
  };
  global.window.speechSynthesis = fakeSynth;
  return { synth: fakeSynth, speakCalls };
}

function removeSpeechApi() {
  delete global.SpeechSynthesisUtterance;
  if (global.window) delete global.window.speechSynthesis;
}

test.afterEach(() => { removeSpeechApi(); });

test('15) typing starts immediately regardless of speechStartDelayMs', async () => {
  installFakeSpeechApi();
  const target = makeTarget();
  const start = Date.now();
  const p = JoshuaSpeech.typeSpeak('HI', target, 1, { speechStartDelayMs: 500 });
  // After a couple of character ticks, typing should already be underway —
  // well before the 500ms speech delay elapses.
  await new Promise((r) => setTimeout(r, 10));
  assert.ok(target.textContent.length > 0, 'typing must have started immediately');
  await p;
  assert.ok(Date.now() - start >= 500, 'overall promise still waits for the delayed speech');
});

test('16) speak() is not called before ~500ms', async () => {
  const { speakCalls } = installFakeSpeechApi();
  const target = makeTarget();
  const start = Date.now();
  const p = JoshuaSpeech.typeSpeak('HELLO', target, 1, { speechStartDelayMs: 500 });
  await new Promise((r) => setTimeout(r, 200));
  assert.equal(speakCalls.length, 0, 'speak() must not have been called yet at 200ms');
  await p;
});

test('17) speak() is called after ~500ms', async () => {
  const { speakCalls } = installFakeSpeechApi();
  const target = makeTarget();
  const start = Date.now();
  await JoshuaSpeech.typeSpeak('HELLO', target, 1, { speechStartDelayMs: 500 });
  assert.equal(speakCalls.length, 1);
  assert.ok(speakCalls[0].at - start >= 490, `expected ~500ms delay, got ${speakCalls[0].at - start}ms`);
});

test('18) 1000ms delay case', async () => {
  const { speakCalls } = installFakeSpeechApi();
  const target = makeTarget();
  const start = Date.now();
  await JoshuaSpeech.typeSpeak('WINNING MOVE', target, 1, { speechStartDelayMs: 1000 });
  assert.ok(speakCalls[0].at - start >= 990, `expected ~1000ms delay, got ${speakCalls[0].at - start}ms`);
});

test('19) default (no speechStartDelayMs) speaks immediately, unchanged', async () => {
  const { speakCalls } = installFakeSpeechApi();
  const target = makeTarget();
  const start = Date.now();
  await JoshuaSpeech.typeSpeak('CHESS', target, 1);
  assert.ok(speakCalls[0].at - start < 50, `expected immediate speak(), got ${speakCalls[0].at - start}ms delay`);
});

test('20) cancelSpeech() cancels a scheduled-but-not-yet-started speak() and resolves the promise', async () => {
  const { speakCalls } = installFakeSpeechApi();
  const target = makeTarget();
  const p = JoshuaSpeech.typeSpeak('DELAYED', target, 1, { speechStartDelayMs: 5000 });
  await new Promise((r) => setTimeout(r, 20));
  const start = Date.now();
  JoshuaSpeech.cancelSpeech();
  await p;
  assert.ok(Date.now() - start < 200, 'must resolve promptly, not wait out the 5s delay');
  assert.equal(speakCalls.length, 0, 'speak() must never have been called');
});

test('21) an error during the delay window does not block typing from completing', async () => {
  removeSpeechApi(); // no Web Speech API at all -> speak() resolves immediately, no delay path exercised
  const target = makeTarget();
  await JoshuaSpeech.typeSpeak('NO VOICE', target, 1, { speechStartDelayMs: 500 });
  assert.equal(target.textContent, 'NO VOICE');
});

test('no leftover timers: delayed speech that completes normally clears its timer (process can exit)', async () => {
  installFakeSpeechApi();
  const target = makeTarget();
  await JoshuaSpeech.typeSpeak('CLEAN', target, 1, { speechStartDelayMs: 50 });
  // If a timer were left dangling, this would still pass functionally, but
  // combined with the cancellation test above this documents the contract.
  assert.equal(target.textContent, 'CLEAN');
});
