// Copyright (C) 2025-2026 Marco Iannacone
// SPDX-License-Identifier: AGPL-3.0-only
'use strict';

// Tests 22-26: the speechStartDelayMs values actually wired into
// bootSequence.js and finalSequence.js, plus the post-prelude pause.

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const JoshuaFinalSequence = require(path.join(
  '..', '..', 'src', 'app', 'finalSequence.js'
));
const JoshuaBootSequence = require(path.join(
  '..', '..', 'src', 'app', 'bootSequence.js'
));

const instantSleep = () => Promise.resolve();
function makeTarget() { return { textContent: '' }; }

function capturingSpeech() {
  const calls = [];
  return {
    calls,
    typeSpeak(text, target, delay, opts) {
      calls.push({ text, delay: opts && opts.speechStartDelayMs });
      if (target) target.textContent += text;
      return Promise.resolve();
    }
  };
}

// --- 22/24) STRANGE GAME (0ms) vs THE ONLY WINNING MOVE (1000ms), EN ---

test('22/24) EN: "STRANGE GAME." gets 0ms delay, "THE ONLY WINNING MOVE..." gets 1000ms — text stays identical to the single string', async () => {
  const speech = capturingSpeech();
  const target = makeTarget();
  const mainText = 'STRANGE GAME.\n\nTHE ONLY WINNING MOVE IS NOT TO PLAY.';

  await JoshuaFinalSequence.runFinalMessages({
    target, mainText, chessText: 'HOW ABOUT A NICE GAME OF CHESS?',
    lang: 'en', speech, sleep: instantSleep
  });

  // target is cleared between the main message and the chess line (existing
  // behavior, unrelated to this fix) — only the chess text remains at the end.
  assert.equal(target.textContent, 'HOW ABOUT A NICE GAME OF CHESS?');
  const strangeCall = speech.calls.find((c) => c.text === 'STRANGE GAME.\n\n');
  const winningCall = speech.calls.find((c) => c.text === 'THE ONLY WINNING MOVE IS NOT TO PLAY.');
  assert.ok(strangeCall, 'STRANGE GAME. segment typeSpeak call found');
  assert.ok(winningCall, 'THE ONLY WINNING MOVE... segment typeSpeak call found');
  assert.equal(strangeCall.delay, 0);
  assert.equal(winningCall.delay, 1000);
});

test('22/24) IT: equivalent Italian split uses the same 0ms / 1000ms delays', async () => {
  const speech = capturingSpeech();
  const target = makeTarget();
  const mainText = 'STRANO GIOCO.\n\nL\'UNICA MOSSA PER VINCERE È NON GIOCARE.';

  await JoshuaFinalSequence.runFinalMessages({
    target, mainText, chessText: 'HOW ABOUT A NICE GAME OF CHESS?',
    lang: 'it', speech, sleep: instantSleep
  });

  // target is cleared between the main message and the chess line (existing
  // behavior, unrelated to this fix) — only the chess text remains at the end.
  assert.equal(target.textContent, 'HOW ABOUT A NICE GAME OF CHESS?');
  const strangeCall = speech.calls.find((c) => c.text === 'STRANO GIOCO.\n\n');
  const winningCall = speech.calls.find((c) => c.text === 'L\'UNICA MOSSA PER VINCERE È NON GIOCARE.');
  assert.equal(strangeCall.delay, 0);
  assert.equal(winningCall.delay, 1000);
});

// The chess line is localized per language and shares the same 1000ms delay
// as "THE ONLY WINNING MOVE...".
test('EN: the chess question uses 1000ms delay and stays in English', async () => {
  const speech = capturingSpeech();
  const target = makeTarget();
  await JoshuaFinalSequence.runFinalMessages({
    target, mainText: 'STRANGE GAME.\n\nTHE ONLY WINNING MOVE IS NOT TO PLAY.',
    chessText: 'HOW ABOUT A NICE GAME OF CHESS?',
    lang: 'en', speech, sleep: instantSleep
  });
  const chessCall = speech.calls.find((c) => c.text === 'HOW ABOUT A NICE GAME OF CHESS?');
  assert.ok(chessCall);
  assert.equal(chessCall.delay, 1000);
});

test('IT: the chess question is localized (displayed AND spoken in Italian) and uses 1000ms delay', async () => {
  const speech = capturingSpeech();
  const target = makeTarget();
  await JoshuaFinalSequence.runFinalMessages({
    target, mainText: 'STRANO GIOCO.\n\nL\'UNICA MOSSA PER VINCERE È NON GIOCARE.',
    chessText: 'CHE NE PENSI DI UNA BELLA PARTITA A SCACCHI?',
    lang: 'it', speech, sleep: instantSleep
  });
  assert.equal(target.textContent, 'CHE NE PENSI DI UNA BELLA PARTITA A SCACCHI?');
  const chessCall = speech.calls.find((c) => c.text === 'CHE NE PENSI DI UNA BELLA PARTITA A SCACCHI?');
  assert.ok(chessCall, 'the Italian display text was passed to typeSpeak, not the English one');
  assert.equal(chessCall.delay, 1000);
});

// --- 23) boot greeting/playPrompt use 500ms, EN and IT ---

test('23) EN: greeting and playPrompt both get speechStartDelayMs=500', async () => {
  const speech = capturingSpeech();
  const greetingTarget = makeTarget();
  const playPromptTarget = makeTarget();

  await JoshuaBootSequence.runBootMessages({
    typePrelude: () => Promise.resolve(),
    playBootNoise: () => Promise.resolve(),
    greetingTarget, playPromptTarget,
    greetingText: 'GREETINGS PROFESSOR FALKEN.',
    playPromptText: 'SHALL WE PLAY A GAME?',
    lang: 'en', speech, sleep: instantSleep
  });

  const greetingCall = speech.calls.find((c) => c.text === 'GREETINGS PROFESSOR FALKEN.');
  const promptCall = speech.calls.find((c) => c.text === 'SHALL WE PLAY A GAME?');
  assert.equal(greetingCall.delay, 500);
  assert.equal(promptCall.delay, 500);
});

test('23) IT: greeting and playPrompt both get speechStartDelayMs=500', async () => {
  const speech = capturingSpeech();
  const greetingTarget = makeTarget();
  const playPromptTarget = makeTarget();

  await JoshuaBootSequence.runBootMessages({
    typePrelude: () => Promise.resolve(),
    playBootNoise: () => Promise.resolve(),
    greetingTarget, playPromptTarget,
    greetingText: 'SALVE PROFESSOR FALKEN.',
    playPromptText: 'VOGLIAMO FARE UNA PARTITA?',
    lang: 'it', speech, sleep: instantSleep
  });

  const greetingCall = speech.calls.find((c) => c.text === 'SALVE PROFESSOR FALKEN.');
  const promptCall = speech.calls.find((c) => c.text === 'VOGLIAMO FARE UNA PARTITA?');
  assert.equal(greetingCall.delay, 500);
  assert.equal(promptCall.delay, 500);
});

// --- 25/26) postPreludePauseMs set to 1000, greeting still reached ---

test('25) the post-prelude pause is 1000ms (base, before presentationSpeed scaling), not 2000ms', async () => {
  const sleeps = [];
  const speech = capturingSpeech();
  await JoshuaBootSequence.runBootMessages({
    typePrelude: () => Promise.resolve(),
    playBootNoise: () => Promise.resolve(),
    greetingTarget: makeTarget(), playPromptTarget: makeTarget(),
    greetingText: 'G', playPromptText: 'P',
    lang: 'en', speech,
    speed: 1, // no scaling, so the sleep value is exactly the base constant
    sleep: (ms) => { sleeps.push(ms); return Promise.resolve(); }
  });
  // First sleep() call in the sequence is the post-prelude pause.
  assert.equal(sleeps[0], 1000, `expected postPreludePauseMs=1000 at speed=1, got ${sleeps[0]}`);
});

test('26) greeting is still reached even with initial audio pending/blocked, using the new 1000ms pause', async () => {
  const speech = capturingSpeech();
  const greetingTarget = makeTarget();
  const playPromptTarget = makeTarget();
  const start = Date.now();

  await JoshuaBootSequence.runBootMessages({
    typePrelude: () => Promise.resolve(),
    playBootNoise: () => new Promise(() => {}), // pending forever, exactly the Safari failure mode
    greetingTarget, playPromptTarget,
    greetingText: 'GREETINGS PROFESSOR FALKEN.',
    playPromptText: 'SHALL WE PLAY A GAME?',
    lang: 'en', speech,
    sleep: () => Promise.resolve(),
    noiseTimeoutMs: 100 // keep the test fast; production default ~4.5s
  });

  assert.ok(Date.now() - start < 2000);
  assert.equal(greetingTarget.textContent, 'GREETINGS PROFESSOR FALKEN.');
  assert.equal(playPromptTarget.textContent, 'SHALL WE PLAY A GAME?');
});
