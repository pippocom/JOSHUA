// Copyright (C) 2025-2026 Marco Iannacone
// SPDX-License-Identifier: AGPL-3.0-only
'use strict';

// Tests for JoshuaBootSequence (src/app/bootSequence.js): the narrated part
// of boot() — the technical prelude, greeting, and play-prompt — verifying
// that typing, the init noise, and narration are orchestrated so the menu
// never appears before they complete.

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const JoshuaBootSequence = require(path.join(
  '..', '..', 'src', 'app', 'bootSequence.js'
));

const instantSleep = () => Promise.resolve();

function makeTarget() {
  return { textContent: '' };
}

function makeRecordingDeps(overrides) {
  const calls = [];
  const greetingTarget = makeTarget();
  const playPromptTarget = makeTarget();
  const speech = {
    typeSpeak(text, target) {
      calls.push('speech:' + text);
      if (target) target.textContent = text;
      return Promise.resolve();
    }
  };
  const deps = {
    typePrelude: () => { calls.push('prelude'); return Promise.resolve(); },
    playBootNoise: () => { calls.push('noise'); return Promise.resolve(); },
    greetingTarget,
    playPromptTarget,
    greetingText: 'GREETING TEXT',
    playPromptText: 'PLAY PROMPT TEXT',
    lang: 'en',
    speech,
    sleep: instantSleep
  };
  return Object.assign(deps, { calls, greetingTarget, playPromptTarget }, overrides || {});
}

test('1) order: noise+prelude -> pause -> greeting -> pause -> playPrompt -> resolves (menu not included)', async () => {
  const deps = makeRecordingDeps();
  await JoshuaBootSequence.runBootMessages(deps);
  // prelude and noise both start before either spoken message
  const preludeIdx = deps.calls.indexOf('prelude');
  const noiseIdx = deps.calls.indexOf('noise');
  const greetingIdx = deps.calls.indexOf('speech:GREETING TEXT');
  const promptIdx = deps.calls.indexOf('speech:PLAY PROMPT TEXT');
  assert.ok(preludeIdx < greetingIdx);
  assert.ok(noiseIdx < greetingIdx);
  assert.ok(greetingIdx < promptIdx);
  assert.equal(deps.greetingTarget.textContent, 'GREETING TEXT');
  assert.equal(deps.playPromptTarget.textContent, 'PLAY PROMPT TEXT');
});

test('2/3) Web Audio unavailable or noise generation errors: sequence still completes', async () => {
  const deps = makeRecordingDeps({
    playBootNoise: () => Promise.resolve() // simulates "unavailable" resolving immediately
  });
  await assert.doesNotReject(JoshuaBootSequence.runBootMessages(deps));
  assert.equal(deps.greetingTarget.textContent, 'GREETING TEXT');
  assert.equal(deps.playPromptTarget.textContent, 'PLAY PROMPT TEXT');
});

test('3) a well-behaved (never-rejecting) noise player errors internally but still resolves: sequence completes', async () => {
  // The real JoshuaAudioManager.playBootNoise() catches every internal error
  // and always resolves (see audioManager.test.js). This test documents and
  // exercises that contract from the boot-sequence orchestration side.
  const noiseThatFailedInternally = () => Promise.resolve();
  const deps = makeRecordingDeps({ playBootNoise: noiseThatFailedInternally });
  await assert.doesNotReject(JoshuaBootSequence.runBootMessages(deps));
  assert.equal(deps.greetingTarget.textContent, 'GREETING TEXT');
  assert.equal(deps.playPromptTarget.textContent, 'PLAY PROMPT TEXT');
});

test('4) TTS error on greeting: playPrompt and end-of-sequence are still reached', async () => {
  const greetingTarget = makeTarget();
  const playPromptTarget = makeTarget();
  const speech = {
    typeSpeak(text, target) {
      if (text === 'GREETING TEXT') return Promise.reject(new Error('tts down'));
      target.textContent = text;
      return Promise.resolve();
    }
  };
  const deps = makeRecordingDeps({ greetingTarget, playPromptTarget, speech });

  await assert.doesNotReject(JoshuaBootSequence.runBootMessages(deps));
  assert.equal(greetingTarget.textContent, 'GREETING TEXT', 'fallback still writes full text');
  assert.equal(playPromptTarget.textContent, 'PLAY PROMPT TEXT');
});

test('5) TTS error on playPrompt: sequence still resolves (menu can be shown by the caller)', async () => {
  const greetingTarget = makeTarget();
  const playPromptTarget = makeTarget();
  const speech = {
    typeSpeak(text, target) {
      if (text === 'PLAY PROMPT TEXT') throw new Error('tts crashed synchronously');
      target.textContent = text;
      return Promise.resolve();
    }
  };
  const deps = makeRecordingDeps({ greetingTarget, playPromptTarget, speech });

  await assert.doesNotReject(JoshuaBootSequence.runBootMessages(deps));
  assert.equal(playPromptTarget.textContent, 'PLAY PROMPT TEXT');
});

test('6) the menu text is never passed to speech.typeSpeak', async () => {
  const deps = makeRecordingDeps();
  await JoshuaBootSequence.runBootMessages(deps);
  const spokenTexts = deps.calls.filter((c) => c.startsWith('speech:'));
  assert.deepEqual(spokenTexts.sort(), ['speech:GREETING TEXT', 'speech:PLAY PROMPT TEXT'].sort());
  assert.ok(!spokenTexts.some((c) => /SELECT OPTION|SELEZIONA OPZIONE/.test(c)));
});

test('7) EN and IT texts both flow through unchanged', async () => {
  for (const [lang, greeting, prompt] of [
    ['en', 'GREETINGS PROFESSOR FALKEN.', 'SHALL WE PLAY A GAME?'],
    ['it', 'SALVE PROFESSOR FALKEN.', 'VOGLIAMO FARE UNA PARTITA?']
  ]) {
    const greetingTarget = makeTarget();
    const playPromptTarget = makeTarget();
    const deps = makeRecordingDeps({
      lang, greetingTarget, playPromptTarget, greetingText: greeting, playPromptText: prompt
    });
    await JoshuaBootSequence.runBootMessages(deps);
    assert.equal(greetingTarget.textContent, greeting);
    assert.equal(playPromptTarget.textContent, prompt);
  }
});

test('createGreetingTarget/createPlayPromptTarget factories are used when provided (just-in-time DOM creation)', async () => {
  const created = [];
  const deps = makeRecordingDeps({
    createGreetingTarget: () => { const t = makeTarget(); created.push('greeting'); return t; },
    createPlayPromptTarget: () => { const t = makeTarget(); created.push('playPrompt'); return t; }
  });
  await JoshuaBootSequence.runBootMessages(deps);
  assert.deepEqual(created, ['greeting', 'playPrompt']);
});
