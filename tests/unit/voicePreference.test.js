// Copyright (C) 2025-2026 Marco Iannacone
// SPDX-License-Identifier: AGPL-3.0-only
'use strict';

// Tests for the Alice (it*) / Daniel (en*) voice-name preference in
// speech.js's pickVoice().

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const JoshuaSpeech = require(path.join('..', '..', 'src', 'audio', 'speech.js'));

function makeTarget() { return { textContent: '' }; }

function installFakeSpeechApi(voices) {
  global.window = global.window || {};
  const speakCalls = [];
  function FakeUtterance(text) { this.text = text; this.onend = null; this.onerror = null; }
  global.SpeechSynthesisUtterance = FakeUtterance;
  const fakeSynth = {
    getVoices() { return voices; },
    addEventListener() {},
    speak(u) { speakCalls.push(u); setTimeout(() => u.onend && u.onend(), 5); },
    cancel() {}
  };
  global.window.speechSynthesis = fakeSynth;
  return { speakCalls, synth: fakeSynth };
}

function removeSpeechApi() {
  delete global.SpeechSynthesisUtterance;
  if (global.window) delete global.window.speechSynthesis;
}

test.afterEach(() => removeSpeechApi());

// --- 5) Alice chosen for it-IT when available ---

test('5) Alice is chosen for it-IT when available', async () => {
  const { speakCalls } = installFakeSpeechApi([
    { name: 'Alice', lang: 'it-IT' },
    { name: 'Federica', lang: 'it-IT' }
  ]);
  const target = makeTarget();
  await JoshuaSpeech.typeSpeak('Test', target, 1, { lang: 'it' });
  assert.equal(speakCalls[0].voice.name, 'Alice');
});

// --- 6) Daniel chosen for English when available ---

test('6) Daniel is chosen for lang "en" when available', async () => {
  const { speakCalls } = installFakeSpeechApi([
    { name: 'Samantha', lang: 'en-US' },
    { name: 'Daniel', lang: 'en-GB' }
  ]);
  const target = makeTarget();
  await JoshuaSpeech.typeSpeak('Test', target, 1, { lang: 'en' });
  assert.equal(speakCalls[0].voice.name, 'Daniel');
});

test('6) Daniel is chosen the same way for lang "en-US" and "en-GB" requests', async () => {
  for (const lang of ['en-US', 'en-GB']) {
    const { speakCalls } = installFakeSpeechApi([
      { name: 'Samantha', lang: 'en-US' },
      { name: 'Daniel', lang: 'en-GB' }
    ]);
    const target = makeTarget();
    await JoshuaSpeech.typeSpeak('Test', target, 1, { lang });
    assert.equal(speakCalls[0].voice.name, 'Daniel', `expected Daniel for requested lang "${lang}"`);
    removeSpeechApi();
  }
});

// --- 7) case-insensitive name comparison ---

test('7) name comparison is case-insensitive: "DANIEL", "daniel", "DaNiEl" all match', async () => {
  for (const name of ['DANIEL', 'daniel', 'DaNiEl']) {
    const { speakCalls } = installFakeSpeechApi([
      { name, lang: 'en-GB' },
      { name: 'Samantha', lang: 'en-US' }
    ]);
    const target = makeTarget();
    await JoshuaSpeech.typeSpeak('Test', target, 1, { lang: 'en' });
    assert.equal(speakCalls[0].voice.name, name, `expected "${name}" to be matched case-insensitively`);
    removeSpeechApi();
  }
});

test('7) case-insensitive matching also applies to Alice for Italian', async () => {
  const { speakCalls } = installFakeSpeechApi([{ name: 'ALICE', lang: 'it-IT' }]);
  const target = makeTarget();
  await JoshuaSpeech.typeSpeak('Test', target, 1, { lang: 'it' });
  assert.equal(speakCalls[0].voice.name, 'ALICE');
});

// --- 8) language fallback when the preferred name is missing ---

test('8) falls back to a compatible-language voice when Alice/Daniel are not installed', async () => {
  const { speakCalls } = installFakeSpeechApi([{ name: 'Federica', lang: 'it-IT' }]);
  const target = makeTarget();
  await JoshuaSpeech.typeSpeak('Test', target, 1, { lang: 'it' });
  assert.equal(speakCalls[0].voice.name, 'Federica');
});

test('8) a "Daniel" voice in the wrong language is never picked for a different language request', async () => {
  // A voice named Daniel but tagged as Italian must not be selected for an
  // English request — the name preference is always paired with a language
  // check on that same voice.
  const { speakCalls } = installFakeSpeechApi([
    { name: 'Daniel', lang: 'it-IT' },
    { name: 'Samantha', lang: 'en-US' }
  ]);
  const target = makeTarget();
  await JoshuaSpeech.typeSpeak('Test', target, 1, { lang: 'en' });
  assert.equal(speakCalls[0].voice.name, 'Samantha');
});

// --- 9) browser-default fallback when getVoices() is empty ---

test('9) no voices at all: browser default is used (no voice assigned), text/TTS still completes', async () => {
  const { speakCalls } = installFakeSpeechApi([]);
  const target = makeTarget();
  await JoshuaSpeech.typeSpeak('SHALL WE PLAY A GAME?', target, 1, { lang: 'en', spokenText: 'Shall we play a game?' });
  assert.equal(speakCalls.length, 1);
  assert.equal(speakCalls[0].voice, undefined);
  assert.equal(target.textContent, 'SHALL WE PLAY A GAME?');
});

// --- 10) voiceschanged cannot block indefinitely ---

test('10) getVoices() starts empty and never fires voiceschanged: TTS still resolves via the internal timeout, not hanging', async () => {
  global.window = global.window || {};
  function FakeUtterance(text) { this.text = text; this.onend = null; this.onerror = null; }
  global.SpeechSynthesisUtterance = FakeUtterance;
  const speakCalls = [];
  global.window.speechSynthesis = {
    getVoices() { return []; }, // always empty — voiceschanged is registered but never fires
    addEventListener() {}, // deliberately never invokes the listener
    speak(u) { speakCalls.push(u); setTimeout(() => u.onend && u.onend(), 5); },
    cancel() {}
  };
  const target = makeTarget();
  const start = Date.now();
  await JoshuaSpeech.typeSpeak('Test', target, 1, { lang: 'en' });
  const elapsed = Date.now() - start;
  assert.ok(elapsed < 1000, `expected the internal ~300ms voice-load timeout to apply, got ${elapsed}ms`);
  assert.equal(speakCalls.length, 1);
});

test('10) getVoices() populates only after voiceschanged fires — the preference still applies once voices exist', async () => {
  global.window = global.window || {};
  function FakeUtterance(text) { this.text = text; this.onend = null; this.onerror = null; }
  global.SpeechSynthesisUtterance = FakeUtterance;
  const speakCalls = [];
  let voices = [];
  let changedHandler = null;
  global.window.speechSynthesis = {
    getVoices() { return voices; },
    addEventListener(type, fn) { if (type === 'voiceschanged') changedHandler = fn; },
    speak(u) { speakCalls.push(u); setTimeout(() => u.onend && u.onend(), 5); },
    cancel() {}
  };
  const target = makeTarget();
  const promise = JoshuaSpeech.typeSpeak('Test', target, 1, { lang: 'it' });
  // Simulate the voice list arriving asynchronously, well inside the internal timeout.
  setTimeout(() => {
    voices = [{ name: 'Alice', lang: 'it-IT' }];
    if (changedHandler) changedHandler();
  }, 20);
  await promise;
  assert.equal(speakCalls[0].voice.name, 'Alice');
});

// --- 11) media-lab explicit override takes precedence ---

test('11) an explicit opts.voice override always wins over the automatic Alice/Daniel preference', async () => {
  const explicitVoice = { name: 'Some Other Voice', lang: 'en-US' };
  const { speakCalls } = installFakeSpeechApi([
    { name: 'Daniel', lang: 'en-GB' },
    { name: 'Samantha', lang: 'en-US' }
  ]);
  const target = makeTarget();
  await JoshuaSpeech.typeSpeak('Test', target, 1, { lang: 'en', voice: explicitVoice });
  assert.equal(speakCalls[0].voice, explicitVoice);
});
