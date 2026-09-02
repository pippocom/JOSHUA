// Copyright (C) 2025-2026 Marco Iannacone
// SPDX-License-Identifier: AGPL-3.0-only
'use strict';

// Tests for the displayText/spokenText separation (some TTS voices misread
// all-caps sentences) and the Italian localization of the final chess
// question.

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const JoshuaSpeech = require(path.join('..', '..', 'src', 'audio', 'speech.js'));
const JoshuaBootSequence = require(path.join('..', '..', 'src', 'app', 'bootSequence.js'));
const JoshuaFinalSequence = require(path.join('..', '..', 'src', 'app', 'finalSequence.js'));

const CONTENT_EN = requireContentModule('content.en.js', 'JOSHUA_CONTENT_EN');
const CONTENT_IT = requireContentModule('content.it.js', 'JOSHUA_CONTENT_IT');

function requireContentModule(file, globalName) {
  const fs = require('node:fs');
  const filePath = path.join(__dirname, '..', '..', 'src', 'data', file);
  const source = fs.readFileSync(filePath, 'utf8');
  const sandbox = {};
  // These content files are `window.X = {...}` global assignments — evaluate
  // them against a fake `window` to pull out the object without executing
  // them as real browser scripts.
  const fn = new Function('window', source + `\nreturn window.${globalName};`);
  return fn(sandbox);
}

function makeTarget() { return { textContent: '' }; }
const instantSleep = () => Promise.resolve();

function installFakeSpeechApi() {
  global.window = global.window || {};
  const speakCalls = [];

  function FakeUtterance(text) {
    this.text = text;
    this.onend = null;
    this.onerror = null;
    this.lang = undefined;
    this.voice = undefined;
  }
  global.SpeechSynthesisUtterance = FakeUtterance;

  const voices = [
    { name: 'Samantha', lang: 'en-US' },
    { name: 'Daniel', lang: 'en-GB' },
    { name: 'Alice', lang: 'it-IT' }
  ];
  const fakeSynth = {
    getVoices() { return voices; },
    addEventListener() {},
    speak(utterance) {
      speakCalls.push(utterance);
      setTimeout(() => { if (utterance.onend) utterance.onend(); }, 5);
    },
    cancel() {}
  };
  global.window.speechSynthesis = fakeSynth;
  return { speakCalls, voices };
}

function removeSpeechApi() {
  delete global.SpeechSynthesisUtterance;
  if (global.window) delete global.window.speechSynthesis;
}

test.afterEach(() => removeSpeechApi());

// --- 1) displayText stays uppercase ---

test('1) displayText for the four optimized questions stays retro uppercase', () => {
  assert.equal(CONTENT_EN.playPrompt, 'SHALL WE PLAY A GAME?');
  assert.equal(CONTENT_IT.playPrompt, 'VOGLIAMO FARE UNA PARTITA?');
  assert.equal(CONTENT_EN.chess, 'HOW ABOUT A NICE GAME OF CHESS?');
  assert.equal(CONTENT_IT.chess, 'CHE NE PENSI DI UNA BELLA PARTITA A SCACCHI?');
});

// --- 2) spokenText uses sentence case ---

test('2) spokenText for the four optimized questions uses sentence case, not all-caps', () => {
  const cases = [
    CONTENT_EN.playPromptSpoken,
    CONTENT_IT.playPromptSpoken,
    CONTENT_EN.chessSpoken,
    CONTENT_IT.chessSpoken
  ];
  for (const s of cases) {
    assert.ok(s, `spokenText missing: ${s}`);
    assert.notEqual(s, s.toUpperCase(), `${s} looks like it is still all-caps`);
    assert.match(s, /^[A-ZÀ-Ý]/, `${s} should start with a capital letter`);
    // Not ALL-CAPS: at least one lowercase letter must be present.
    assert.match(s, /[a-zà-ÿ]/, `${s} has no lowercase letters at all`);
  }
});

test('exact expected spokenText strings', () => {
  assert.equal(CONTENT_EN.playPromptSpoken, 'Shall we play a game?');
  assert.equal(CONTENT_IT.playPromptSpoken, 'Vogliamo fare una partita?');
  assert.equal(CONTENT_EN.chessSpoken, 'How about a nice game of chess?');
  assert.equal(CONTENT_IT.chessSpoken, 'Che ne pensi di una bella partita a scacchi?');
});

// --- 3/4) exact lang, en-US / it-IT ---

test('3) EN spokenText is sent to the utterance with lang exactly "en-US"', async () => {
  const { speakCalls } = installFakeSpeechApi();
  const target = makeTarget();
  await JoshuaSpeech.typeSpeak(CONTENT_EN.playPrompt, target, 1, { lang: 'en', spokenText: CONTENT_EN.playPromptSpoken });
  assert.equal(speakCalls.length, 1);
  assert.equal(speakCalls[0].text, CONTENT_EN.playPromptSpoken);
  assert.equal(speakCalls[0].lang, 'en-US');
});

test('4) IT spokenText is sent to the utterance with lang exactly "it-IT"', async () => {
  const { speakCalls } = installFakeSpeechApi();
  const target = makeTarget();
  await JoshuaSpeech.typeSpeak(CONTENT_IT.playPrompt, target, 1, { lang: 'it', spokenText: CONTENT_IT.playPromptSpoken });
  assert.equal(speakCalls.length, 1);
  assert.equal(speakCalls[0].text, CONTENT_IT.playPromptSpoken);
  assert.equal(speakCalls[0].lang, 'it-IT');
});

test('displayText (typed) and spokenText (spoken) differ and are both correct, in the same call', async () => {
  const { speakCalls } = installFakeSpeechApi();
  const target = makeTarget();
  await JoshuaSpeech.typeSpeak(CONTENT_EN.chess, target, 1, { lang: 'en', spokenText: CONTENT_EN.chessSpoken });
  assert.equal(target.textContent, CONTENT_EN.chess, 'typed text is the uppercase display text');
  assert.equal(speakCalls[0].text, CONTENT_EN.chessSpoken, 'spoken text is the sentence-case version');
});

// --- 5/6) delays: boot question 500ms, final question 1000ms (via real content) ---

test('5) boot question (EN/IT) is spoken after 500ms, using the correct spokenText', async () => {
  for (const [lang, content] of [['en', CONTENT_EN], ['it', CONTENT_IT]]) {
    const { speakCalls } = installFakeSpeechApi();
    const greetingTarget = makeTarget();
    const playPromptTarget = makeTarget();
    const start = Date.now();
    await JoshuaBootSequence.runBootMessages({
      typePrelude: () => Promise.resolve(),
      playBootNoise: () => Promise.resolve(),
      greetingTarget, playPromptTarget,
      greetingText: content.greeting,
      playPromptText: content.playPrompt,
      playPromptSpokenText: content.playPromptSpoken,
      lang, speech: JoshuaSpeech, sleep: instantSleep
    });
    const elapsed = Date.now() - start;
    assert.ok(elapsed >= 490, `expected ~500ms delay for ${lang}, got ${elapsed}ms`);
    const promptCall = speakCalls.find((u) => u.text === content.playPromptSpoken);
    assert.ok(promptCall, `expected an utterance with spokenText "${content.playPromptSpoken}"`);
    removeSpeechApi();
  }
});

test('6) final chess question (EN/IT) is spoken after 1000ms, using the correct spokenText', async () => {
  for (const [lang, content] of [['en', CONTENT_EN], ['it', CONTENT_IT]]) {
    const { speakCalls } = installFakeSpeechApi();
    const target = makeTarget();
    const start = Date.now();
    await JoshuaFinalSequence.runFinalMessages({
      target,
      mainText: content.finalMain,
      chessText: content.chess,
      chessSpokenText: content.chessSpoken,
      lang, speech: JoshuaSpeech, sleep: instantSleep
    });
    const elapsed = Date.now() - start;
    assert.ok(elapsed >= 990, `expected ~1000ms total (incl. STRANGE GAME/WINNING MOVE delays), got ${elapsed}ms`);
    const chessCall = speakCalls.find((u) => u.text === content.chessSpoken);
    assert.ok(chessCall, `expected an utterance with spokenText "${content.chessSpoken}"`);
    removeSpeechApi();
  }
});

// --- 7) STRANGE GAME unchanged ---

test('7) STRANGE GAME. is unaffected — no spokenText override, spoken as its own display text, 0ms delay', async () => {
  const { speakCalls } = installFakeSpeechApi();
  const target = makeTarget();
  await JoshuaFinalSequence.runFinalMessages({
    target, mainText: CONTENT_EN.finalMain, chessText: CONTENT_EN.chess, chessSpokenText: CONTENT_EN.chessSpoken,
    lang: 'en', speech: JoshuaSpeech, sleep: instantSleep
  });
  const strangeGameCall = speakCalls.find((u) => u.text.indexOf('Strange game') === 0 || u.text.indexOf('STRANGE GAME') === 0);
  assert.ok(strangeGameCall, 'STRANGE GAME. was spoken as-is (its own text, no separate spokenText field)');
});

// --- 8/9/10) Italian final localization ---

test('8/9) IT final sequence displays AND speaks the new Italian chess question', async () => {
  const { speakCalls } = installFakeSpeechApi();
  const target = makeTarget();
  await JoshuaFinalSequence.runFinalMessages({
    target, mainText: CONTENT_IT.finalMain, chessText: CONTENT_IT.chess, chessSpokenText: CONTENT_IT.chessSpoken,
    lang: 'it', speech: JoshuaSpeech, sleep: instantSleep
  });
  assert.equal(target.textContent, 'CHE NE PENSI DI UNA BELLA PARTITA A SCACCHI?');
  const chessCall = speakCalls.find((u) => u.text === 'Che ne pensi di una bella partita a scacchi?');
  assert.ok(chessCall, 'Italian spokenText was actually sent to the utterance');
  assert.equal(chessCall.lang, 'it-IT');
});

test('10) EN final sequence remains English (display and spoken)', async () => {
  const { speakCalls } = installFakeSpeechApi();
  const target = makeTarget();
  await JoshuaFinalSequence.runFinalMessages({
    target, mainText: CONTENT_EN.finalMain, chessText: CONTENT_EN.chess, chessSpokenText: CONTENT_EN.chessSpoken,
    lang: 'en', speech: JoshuaSpeech, sleep: instantSleep
  });
  assert.equal(target.textContent, 'HOW ABOUT A NICE GAME OF CHESS?');
  const chessCall = speakCalls.find((u) => u.text === 'How about a nice game of chess?');
  assert.ok(chessCall);
  assert.equal(chessCall.lang, 'en-US');
});

// --- 11) voice preference (see tests/unit/voicePreference.test.js for the
// full Alice/Daniel preference-chain coverage; these two just confirm the
// underlying exact-locale/same-language fallback still works when no
// preferred-name voice is present in the list at all) ---

test('11) prefers an exact locale match over a same-language-different-region voice, when no name-preferred voice exists', async () => {
  global.window = global.window || {};
  function FakeUtterance(text) { this.text = text; this.onend = null; this.onerror = null; }
  global.SpeechSynthesisUtterance = FakeUtterance;
  const calls = [];
  const usVoice = { name: 'Fred', lang: 'en-US' };
  const gbVoice = { name: 'Kate', lang: 'en-GB' };
  global.window.speechSynthesis = {
    getVoices() { return [gbVoice, usVoice]; },
    addEventListener() {},
    speak(u) { calls.push(u); setTimeout(() => u.onend && u.onend(), 5); },
    cancel() {}
  };
  const target = makeTarget();
  await JoshuaSpeech.typeSpeak('Test', target, 1, { lang: 'en' });
  assert.equal(calls[0].voice, usVoice, 'en-US (exact) preferred over en-GB when neither is the preferred name');
});

test('11) falls back to a same-language voice when no exact locale match exists', async () => {
  global.window = global.window || {};
  function FakeUtterance(text) { this.text = text; this.onend = null; this.onerror = null; }
  global.SpeechSynthesisUtterance = FakeUtterance;
  const calls = [];
  const onlyGbVoice = { name: 'Kate', lang: 'en-GB' };
  global.window.speechSynthesis = {
    getVoices() { return [onlyGbVoice]; },
    addEventListener() {},
    speak(u) { calls.push(u); setTimeout(() => u.onend && u.onend(), 5); },
    cancel() {}
  };
  const target = makeTarget();
  await JoshuaSpeech.typeSpeak('Test', target, 1, { lang: 'en' });
  assert.equal(calls[0].voice, onlyGbVoice);
});

// --- 12) no-voice fallback never blocks the text ---

test('12) no voices available at all: text still completes, no blocking', async () => {
  global.window = global.window || {};
  function FakeUtterance(text) { this.text = text; this.onend = null; this.onerror = null; }
  global.SpeechSynthesisUtterance = FakeUtterance;
  global.window.speechSynthesis = {
    getVoices() { return []; },
    addEventListener() {},
    speak(u) { setTimeout(() => u.onend && u.onend(), 5); },
    cancel() {}
  };
  const target = makeTarget();
  await JoshuaSpeech.typeSpeak('SHALL WE PLAY A GAME?', target, 1, { lang: 'en', spokenText: 'Shall we play a game?' });
  assert.equal(target.textContent, 'SHALL WE PLAY A GAME?');
});
