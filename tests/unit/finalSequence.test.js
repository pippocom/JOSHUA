// Copyright (C) 2025-2026 Marco Iannacone
// SPDX-License-Identifier: AGPL-3.0-only
'use strict';

// Tests for JoshuaFinalSequence (src/app/finalSequence.js): guarantees that
// the closing beat of GLOBAL THERMONUCLEAR WAR ("STRANGE GAME..." then the
// chess invitation) always completes, regardless of how the injected speech
// implementation behaves. Uses a fake `speech` object and an instant `sleep`
// so no real DOM or Web Speech API is needed.

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const JoshuaFinalSequence = require(path.join(
  '..', '..', 'src', 'app', 'finalSequence.js'
));

const instantSleep = () => Promise.resolve();

function makeTarget() {
  return { textContent: '' };
}

test('5/6) well-behaved speech: reaches and types the chess message', async () => {
  const calls = [];
  const speech = {
    typeSpeak(text, target) { calls.push(text); if (target) target.textContent = text; return Promise.resolve(); },
    cancelSpeech() { calls.push('cancel'); }
  };
  const target = makeTarget();

  await JoshuaFinalSequence.runFinalMessages({
    target, mainText: 'MAIN MESSAGE', chessText: 'HOW ABOUT A NICE GAME OF CHESS?',
    lang: 'en', speech, sleep: instantSleep
  });

  assert.deepEqual(calls, ['MAIN MESSAGE', 'cancel', 'HOW ABOUT A NICE GAME OF CHESS?']);
  assert.equal(target.textContent, 'HOW ABOUT A NICE GAME OF CHESS?');
});

test('5) speech.typeSpeak throws synchronously for the main message: chess message is still reached', async () => {
  const speech = {
    typeSpeak(text, target) {
      if (text === 'MAIN MESSAGE') throw new Error('synthetic failure');
      target.textContent = text;
      return Promise.resolve();
    }
  };
  const target = makeTarget();

  await JoshuaFinalSequence.runFinalMessages({
    target, mainText: 'MAIN MESSAGE', chessText: 'HOW ABOUT A NICE GAME OF CHESS?',
    lang: 'en', speech, sleep: instantSleep
  });

  assert.equal(target.textContent, 'HOW ABOUT A NICE GAME OF CHESS?');
});

test('5) speech.typeSpeak rejects for the chess message: sequence still resolves, text is complete', async () => {
  const speech = {
    typeSpeak(text, target) {
      if (text === 'HOW ABOUT A NICE GAME OF CHESS?') return Promise.reject(new Error('tts down'));
      target.textContent = text;
      return Promise.resolve();
    }
  };
  const target = makeTarget();

  await assert.doesNotReject(JoshuaFinalSequence.runFinalMessages({
    target, mainText: 'MAIN MESSAGE', chessText: 'HOW ABOUT A NICE GAME OF CHESS?',
    lang: 'en', speech, sleep: instantSleep
  }));

  assert.equal(target.textContent, 'HOW ABOUT A NICE GAME OF CHESS?');
});

// ---- timing: pause before chess vs. typing speed vs. chess TTS delay ----
// Records every sleep()/typeSpeak() call, in order, with its actual argument
// values — not a source-code grep — so the four concerns the spec asks to
// keep distinct (pause before chess, typing speed, chess TTS start delay,
// and what happens after) are each verified against real injected timing
// dependencies instead of a hardcoded number.
function makeInstrumentedDeps() {
  const events = [];
  const speech = {
    typeSpeak(text, target, delay, opts) {
      events.push({ type: 'typeSpeak', text, delay, opts: opts || {} });
      if (target) target.textContent = (opts && opts.append ? target.textContent : '') + text;
      return Promise.resolve();
    },
    cancelSpeech() { events.push({ type: 'cancelSpeech' }); }
  };
  const sleep = (ms) => { events.push({ type: 'sleep', ms }); return Promise.resolve(); };
  return { events, speech, sleep };
}

test('timing: the pause before the chess question is exactly 1000ms shorter than before (3000+2000+300=5300ms), typing speed and the chess TTS start delay are untouched', async () => {
  const { events, speech, sleep } = makeInstrumentedDeps();
  const target = makeTarget();

  await JoshuaFinalSequence.runFinalMessages({
    target,
    mainText: 'STRANGE GAME.\n\nTHE ONLY WINNING MOVE IS NOT TO PLAY.',
    chessText: 'HOW ABOUT A NICE GAME OF CHESS?',
    chessSpokenText: 'How about a nice game of chess?',
    lang: 'en', speech, sleep
    // speed omitted -> Presentation defaults to 1 (no scaling), so the
    // recorded ms values are the raw, unscaled constants.
  });

  const types = events.map((e) => e.type);
  assert.deepEqual(types, [
    'typeSpeak', // "STRANGE GAME."
    'typeSpeak', // "THE ONLY WINNING MOVE..."
    'sleep',     // pauseAfterMain
    'sleep',     // pauseBlank (after clearing the target)
    'cancelSpeech',
    'sleep',     // pauseBeforeChess
    'typeSpeak'  // chess question
  ], 'exact call order must be preserved');

  // 1) Pause before the chess question is displayed: every sleep() between
  // the end of the previous content and the start of typing the chess text,
  // summed.
  const sleeps = events.filter((e) => e.type === 'sleep').map((e) => e.ms);
  assert.deepEqual(sleeps, [3000, 2000, 300], 'pauseAfterMain(3000) + pauseBlank(2000) + pauseBeforeChess(300)');
  const totalPauseBeforeChess = sleeps.reduce((a, b) => a + b, 0);
  assert.equal(totalPauseBeforeChess, 5300);

  // 2) Typing speed: unaffected — every typeSpeak() call (main text AND
  // chess) still gets the same per-character delay.
  const typeSpeakCalls = events.filter((e) => e.type === 'typeSpeak');
  typeSpeakCalls.forEach((e) => assert.equal(e.delay, 60, `typing delay must stay 60ms/char for "${e.text}"`));

  // 3) The chess question's own TTS start delay: still 1000ms, measured
  // from when ITS typing starts (independent of the pause above).
  const chessCall = typeSpeakCalls[typeSpeakCalls.length - 1];
  assert.equal(chessCall.text, 'HOW ABOUT A NICE GAME OF CHESS?');
  assert.equal(chessCall.opts.speechStartDelayMs, 1000);
  assert.equal(chessCall.opts.spokenText, 'How about a nice game of chess?');

  // 4) Pause/behavior AFTER the chess call: runFinalMessages resolves right
  // after scheduling the chess typeSpeak — nothing further is scheduled by
  // this module (the caller decides when the return link reappears).
  assert.equal(events[events.length - 1].type, 'typeSpeak');
  assert.equal(target.textContent, 'HOW ABOUT A NICE GAME OF CHESS?');
});

test('timing: STRANGE GAME keeps 0ms TTS delay, THE ONLY WINNING MOVE keeps 1000ms — both independent of the pause change', async () => {
  const { events, speech, sleep } = makeInstrumentedDeps();
  const target = makeTarget();

  await JoshuaFinalSequence.runFinalMessages({
    target,
    mainText: 'STRANGE GAME.\n\nTHE ONLY WINNING MOVE IS NOT TO PLAY.',
    chessText: 'HOW ABOUT A NICE GAME OF CHESS?',
    lang: 'en', speech, sleep
  });

  const typeSpeakCalls = events.filter((e) => e.type === 'typeSpeak');
  assert.equal(typeSpeakCalls[0].text, 'STRANGE GAME.\n\n');
  assert.equal(typeSpeakCalls[0].opts.speechStartDelayMs, 0);
  assert.equal(typeSpeakCalls[1].text, 'THE ONLY WINNING MOVE IS NOT TO PLAY.');
  assert.equal(typeSpeakCalls[1].opts.speechStartDelayMs, 1000);
  assert.equal(typeSpeakCalls[1].opts.append, true);
});

test('timing: presentationSpeed still scales the pause before chess (and typing speed) together, consistently', async () => {
  const { events, speech, sleep } = makeInstrumentedDeps();
  const target = makeTarget();

  await JoshuaFinalSequence.runFinalMessages({
    target,
    mainText: 'STRANGE GAME.\n\nTHE ONLY WINNING MOVE IS NOT TO PLAY.',
    chessText: 'HOW ABOUT A NICE GAME OF CHESS?',
    lang: 'en', speech, sleep,
    speed: 2 // double speed -> half the delay
  });

  const sleeps = events.filter((e) => e.type === 'sleep').map((e) => e.ms);
  assert.deepEqual(sleeps, [1500, 1000, 150], 'each pause halves under speed=2, same as ?fast=1-style acceleration');
  const typeSpeakCalls = events.filter((e) => e.type === 'typeSpeak');
  typeSpeakCalls.forEach((e) => assert.equal(e.delay, 30, 'typing delay halves too, staying in lockstep with the pause scaling'));
  // The chess TTS start delay is explicitly UNSCALED (fixed ms, see module header).
  assert.equal(typeSpeakCalls[typeSpeakCalls.length - 1].opts.speechStartDelayMs, 1000);
});

test('missing cancelSpeech() on the speech object does not break the sequence', async () => {
  const speech = {
    typeSpeak(text, target) { target.textContent = text; return Promise.resolve(); }
    // no cancelSpeech method at all
  };
  const target = makeTarget();

  await assert.doesNotReject(JoshuaFinalSequence.runFinalMessages({
    target, mainText: 'MAIN MESSAGE', chessText: 'CHESS', lang: 'it', speech, sleep: instantSleep
  }));
  assert.equal(target.textContent, 'CHESS');
});
