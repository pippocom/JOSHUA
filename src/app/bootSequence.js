// Copyright (C) 2025-2026 Marco Iannacone
// SPDX-License-Identifier: AGPL-3.0-only
/**
 * JoshuaBootSequence — the narrated portion of boot(): the technical
 * "prelude" lines (typed only, no TTS) running alongside the initialization
 * noise, followed by the greeting and play-prompt lines (typed + spoken).
 *
 * Does NOT show the menu — the menu is plain, un-narrated text and stays the
 * caller's responsibility once this promise resolves. It runs against
 * injected fakes, so it is testable without the live DOM/Web Audio/Web Speech
 * APIs.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./presentation.js'));
  } else {
    root.JoshuaBootSequence = factory(root.JoshuaPresentation);
  }
})(typeof self !== 'undefined' ? self : this, function (Presentation) {
  'use strict';

  // Real-timer safety net (see audioManager.js for the same pattern applied
  // to audio): resolves within `ms` no matter what `promiseFactory` does —
  // throws synchronously, rejects, or never settles at all. A silently
  // pending promise (no error, ever) is exactly the class of bug that froze
  // boot() on Safari, so catching rejections alone is not enough here.
  function withRealTimeout(promiseFactory, ms, onTimeout) {
    return new Promise(function (resolve) {
      var settled = false;
      function finish() {
        if (settled) return;
        settled = true;
        resolve();
      }
      var timer = setTimeout(function () {
        if (onTimeout) { try { onTimeout(); } catch (err) { /* no-op */ } }
        finish();
      }, ms);
      var p;
      try {
        p = promiseFactory();
      } catch (err) {
        clearTimeout(timer);
        if (onTimeout) { try { onTimeout(); } catch (err2) { /* no-op */ } }
        finish();
        return;
      }
      Promise.resolve(p).then(
        function () { clearTimeout(timer); finish(); },
        function () { clearTimeout(timer); if (onTimeout) { try { onTimeout(); } catch (err) { /* no-op */ } } finish(); }
      );
    });
  }

  // A broken or indefinitely-pending TTS implementation must never stop a
  // message from ending up fully written on screen, nor block the sequence.
  function safeTypeSpeak(speech, text, target, delay, opts, timeoutMs) {
    var writeFullText = function () { if (target) target.textContent = String(text == null ? '' : text); };
    return withRealTimeout(function () { return speech.typeSpeak(text, target, delay, opts); }, timeoutMs, writeFullText);
  }

  // Generous but bounded: comfortably longer than the deterministic typing
  // time at any presentationSpeed, so it only ever fires when TTS itself is
  // stuck — never as a false positive against normal (slow) typing.
  function ttsTimeoutFor(text, typingDelay) {
    return Math.max(5000, String(text || '').length * typingDelay + 4000);
  }

  /**
   * @param {object} deps
   * @param {()=>(Promise<void>|void)} deps.typePrelude - types the technical prelude lines (no TTS)
   * @param {()=>(Promise<void>|void)} deps.playBootNoise - resolves once the init noise finishes/unavailable
   * @param {{textContent:string}} [deps.greetingTarget]
   * @param {()=>{textContent:string}} [deps.createGreetingTarget] - preferred: creates the line element just-in-time
   * @param {{textContent:string}} [deps.playPromptTarget]
   * @param {()=>{textContent:string}} [deps.createPlayPromptTarget]
   * @param {string} deps.greetingText
   * @param {string} deps.playPromptText
   * @param {string} [deps.playPromptSpokenText] - sentence-case text actually spoken (falls back to playPromptText if absent)
   * @param {string} [deps.lang]
   * @param {number} [deps.speed] - presentationSpeed, see presentation.js
   * @param {{typeSpeak:Function}} deps.speech
   * @param {(ms:number)=>Promise<void>} deps.sleep
   * @param {number} [deps.noiseTimeoutMs] - independent hard cap for playBootNoise (default 6s, safely above the ~5s boot noise duration so it never truncates it under normal operation)
   * @returns {Promise<void>} resolves once the play-prompt has finished typing/speaking — menu not shown yet
   */
  // Pause after the technical prelude ("WOPR SIMULATION INTERFACE" / "STRATEGIC
  // GAME MODULE ONLINE" and their Italian equivalents), before the greeting.
  // The initial synthesized noise remains a separate, known limitation on
  // Safari (cross-document navigation) and is not addressed by this constant.
  var POST_PRELUDE_PAUSE_MS = 1000;

  // Fixed, unscaled TTS start delays (ms) — not affected by presentationSpeed.
  var GREETING_SPEECH_START_DELAY_MS = 500;
  var PLAY_PROMPT_SPEECH_START_DELAY_MS = 500;

  function runBootMessages(deps) {
    var speed = deps.speed;
    var typingDelay = Presentation.scaleDelay(60, speed);
    var pauseAfterNoise = Presentation.scaleDelay(POST_PRELUDE_PAUSE_MS, speed);
    var pauseBetweenMessages = Presentation.scaleDelay(700, speed);
    var pauseBeforeMenu = Presentation.scaleDelay(700, speed);
    var greetingRate = Presentation.scaleRate(0.72, speed);
    var playPromptRate = Presentation.scaleRate(0.78, speed);
    var noiseTimeoutMs = deps.noiseTimeoutMs || 6000;

    // Independent second safety net around the noise player itself: even if
    // JoshuaAudioManager.playBootNoise() has its own bug and never settles,
    // boot() cannot be held hostage by it — the prelude and the noise attempt
    // may run together, but this whole step is capped at ~4-4.5s total either
    // way.
    var noisePromise = withRealTimeout(function () { return deps.playBootNoise(); }, noiseTimeoutMs);

    return Promise.all([
      Promise.resolve(deps.typePrelude()),
      noisePromise
    ])
      .then(function () { return deps.sleep(pauseAfterNoise); })
      .then(function () {
        var target = deps.createGreetingTarget ? deps.createGreetingTarget() : deps.greetingTarget;
        return safeTypeSpeak(deps.speech, deps.greetingText, target, typingDelay, { rate: greetingRate, pitch: 0.40, lang: deps.lang, speechStartDelayMs: GREETING_SPEECH_START_DELAY_MS }, ttsTimeoutFor(deps.greetingText, typingDelay));
      })
      .then(function () { return deps.sleep(pauseBetweenMessages); })
      .then(function () {
        var target = deps.createPlayPromptTarget ? deps.createPlayPromptTarget() : deps.playPromptTarget;
        return safeTypeSpeak(deps.speech, deps.playPromptText, target, typingDelay, { rate: playPromptRate, pitch: 0.42, lang: deps.lang, speechStartDelayMs: PLAY_PROMPT_SPEECH_START_DELAY_MS, spokenText: deps.playPromptSpokenText }, ttsTimeoutFor(deps.playPromptText, typingDelay));
      })
      .then(function () { return deps.sleep(pauseBeforeMenu); });
  }

  return { runBootMessages: runBootMessages };
});
