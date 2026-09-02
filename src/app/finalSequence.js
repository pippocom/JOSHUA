// Copyright (C) 2025-2026 Marco Iannacone
// SPDX-License-Identifier: AGPL-3.0-only
/**
 * JoshuaFinalSequence — the "STRANGE GAME / chess" closing beat of the
 * GLOBAL THERMONUCLEAR WAR simulation. It runs against injected (mockable)
 * dependencies instead of the live DOM/Web Speech API.
 *
 * This module owns only the *ordering* of the closing messages. It does not
 * know how speech or typing actually happen — that is `speech.typeSpeak`.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./presentation.js'));
  } else {
    root.JoshuaFinalSequence = factory(root.JoshuaPresentation);
  }
})(typeof self !== 'undefined' ? self : this, function (Presentation) {
  'use strict';

  // Runs speech.typeSpeak but guarantees the target ends up holding the
  // full text even if the speech implementation throws synchronously or
  // returns a rejected promise. The closing sequence must never stall or
  // skip a message because of a TTS failure.
  function safeTypeSpeak(speech, text, target, delay, opts) {
    function writeFallback() {
      if (!target) return;
      var full = String(text == null ? '' : text);
      target.textContent = (opts && opts.append ? target.textContent : '') + full;
    }
    var result;
    try {
      result = speech.typeSpeak(text, target, delay, opts);
    } catch (err) {
      writeFallback();
      return Promise.resolve();
    }
    return Promise.resolve(result).catch(function () {
      writeFallback();
    });
  }

  // C.finalMain is one string ("STRANGE GAME.\n\nTHE ONLY WINNING MOVE IS NOT
  // TO PLAY." / equivalent in Italian). Splitting on the blank line lets each
  // half get its own speechStartDelayMs while the two calls still compose into
  // the exact same displayed string (the second call appends instead of
  // clearing) — no change to the text itself, its order, or the chess line.
  function splitFinalMain(mainText) {
    var text = String(mainText == null ? '' : mainText);
    var idx = text.indexOf('\n\n');
    if (idx === -1) return { first: text, rest: '' };
    return { first: text.slice(0, idx + 2), rest: text.slice(idx + 2) };
  }

  /**
   * @param {object} deps
   * @param {{textContent:string}} deps.target - element the messages are typed into
   * @param {string} deps.mainText - C.finalMain
   * @param {string} deps.chessText - C.chess (display text — localized per language)
   * @param {string} [deps.chessSpokenText] - sentence-case text actually spoken (falls back to chessText if absent)
   * @param {string} [deps.lang] - 'en' | 'it'
   * @param {number} [deps.speed] - presentationSpeed (see presentation.js); default 1 (no scaling)
   * @param {{typeSpeak:Function, cancelSpeech?:Function}} deps.speech
   * @param {(ms:number)=>Promise<void>} deps.sleep
   */
  // Fixed, unscaled TTS start delays (ms) — not affected by presentationSpeed.
  // "STRANGE GAME." (the first half of mainText) stays at 0. "THE ONLY
  // WINNING MOVE..." (the second half) and the chess question share the same
  // 1000ms delay.
  var STRANGE_GAME_SPEECH_START_DELAY_MS = 0;
  var WINNING_MOVE_SPEECH_START_DELAY_MS = 1000;
  var CHESS_SPEECH_START_DELAY_MS = 1000;

  function runFinalMessages(deps) {
    var target = deps.target;
    var mainText = deps.mainText;
    var chessText = deps.chessText;
    var lang = deps.lang;
    var speech = deps.speech;
    var sleep = deps.sleep;
    var speed = deps.speed;

    var typingDelay = Presentation.scaleDelay(60, speed);
    var pauseAfterMain = Presentation.scaleDelay(3000, speed);
    var pauseBlank = Presentation.scaleDelay(2000, speed);
    var pauseBeforeChess = Presentation.scaleDelay(300, speed);
    var mainRate = Presentation.scaleRate(0.65, speed);
    var chessRate = Presentation.scaleRate(0.72, speed);

    var mainParts = splitFinalMain(mainText);

    return safeTypeSpeak(speech, mainParts.first, target, typingDelay, { rate: mainRate, pitch: 0.38, lang: lang, speechStartDelayMs: STRANGE_GAME_SPEECH_START_DELAY_MS })
      .then(function () {
        if (!mainParts.rest) return undefined;
        return safeTypeSpeak(speech, mainParts.rest, target, typingDelay, { rate: mainRate, pitch: 0.38, lang: lang, speechStartDelayMs: WINNING_MOVE_SPEECH_START_DELAY_MS, append: true });
      })
      .then(function () { return sleep(pauseAfterMain); })
      .then(function () {
        if (target) target.textContent = '';
        return sleep(pauseBlank);
      })
      .then(function () {
        if (speech.cancelSpeech) {
          try { speech.cancelSpeech(); } catch (err) { /* no-op */ }
        }
        return sleep(pauseBeforeChess);
      })
      .then(function () {
        return safeTypeSpeak(speech, chessText, target, typingDelay, { rate: chessRate, pitch: 0.50, lang: lang, speechStartDelayMs: CHESS_SPEECH_START_DELAY_MS, spokenText: deps.chessSpokenText });
      });
  }

  return { runFinalMessages: runFinalMessages };
});
