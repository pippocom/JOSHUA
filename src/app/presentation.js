// Copyright (C) 2025-2026 Marco Iannacone
// SPDX-License-Identifier: AGPL-3.0-only
/**
 * JoshuaPresentation — the single "presentation speed" factor shared by every
 * typed+spoken sequence (boot greeting/play-prompt, final "STRANGE GAME" /
 * chess messages). Governs typing delay, TTS rate and presentation-only
 * pauses. Must never be used for simulation timing, war animations or game
 * rules — those keep their own independent pacing (see `fastDev` in game.js).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.JoshuaPresentation = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // 0.5 = half speed (double per-character delay, proportionally lower TTS rate).
  var DEFAULT_SPEED = 0.5;
  var MIN_SPEED = 0.1;
  var MAX_SPEED = 2;

  // Resolves a `?presentationSpeed=` query value to a safe finite number.
  // Anything missing, non-finite or out of range falls back to `fallback`
  // (or DEFAULT_SPEED) — never throws, never returns 0/Infinity/NaN.
  function resolveSpeed(raw, fallback) {
    var fallbackSpeed = typeof fallback === 'number' && isFinite(fallback) && fallback > 0 ? fallback : DEFAULT_SPEED;
    if (raw === undefined || raw === null || raw === '') return fallbackSpeed;
    var n = parseFloat(raw);
    if (!isFinite(n) || n < MIN_SPEED || n > MAX_SPEED) return fallbackSpeed;
    return n;
  }

  // speed 0.5 -> delay roughly doubles; speed 1 -> unchanged.
  function scaleDelay(baseMs, speed) {
    var s = (typeof speed === 'number' && isFinite(speed) && speed > 0) ? speed : 1;
    return Math.max(1, Math.round(baseMs / s));
  }

  // speed 0.5 -> rate roughly halves; speed 1 -> unchanged.
  function scaleRate(baseRate, speed) {
    var s = (typeof speed === 'number' && isFinite(speed) && speed > 0) ? speed : 1;
    return Math.max(0.1, Math.min(10, +(baseRate * s).toFixed(3)));
  }

  return {
    DEFAULT_SPEED: DEFAULT_SPEED,
    MIN_SPEED: MIN_SPEED,
    MAX_SPEED: MAX_SPEED,
    resolveSpeed: resolveSpeed,
    scaleDelay: scaleDelay,
    scaleRate: scaleRate
  };
});
