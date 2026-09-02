// Copyright (C) 2025-2026 Marco Iannacone
// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Pure model/statistics for GLOBAL THERMONUCLEAR WAR.
 *
 * No DOM, language, audio, timers, rendering, or scenario data. Random
 * values keep their intended distributions; callers may inject an RNG for
 * deterministic tests and the application uses Math.random by default.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.JoshuaWarModel = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Provisional narrative bounds. They describe a civilization-scale
  // catastrophe for dramatic effect, NOT
  // empirical forecasts, and they cap the running casualty counter so the
  // numbers stay "civilization-scale" without implying scientific precision.
  // Direct, short-term, and long-term effects remain deliberately distinct.
  var WORLD_POPULATION_MODEL_CAP = 8300000000;
  var IMMEDIATE_FATALITY_CAP = 6200000000;
  var THIRTY_DAY_FATALITY_CAP = 8100000000;

  function randomInteger(range, rng) {
    var random = rng || Math.random;
    return Math.round(range[0] + random() * (range[1] - range[0]));
  }

  function formatElapsed(seconds) {
    var mm = String(Math.floor(seconds / 60)).padStart(2, '0');
    var ss = String(seconds % 60).padStart(2, '0');
    return mm + ':' + ss;
  }

  function createStats() {
    return {
      missiles: 0,
      detonations: 0,
      casualties: 0,
      alert: 'DEFCON 3',
      elapsed: '00:00',
      seconds: 0
    };
  }

  function applyToll(state, toll) {
    var seconds = state.seconds + toll.seconds;
    return {
      missiles: state.missiles + toll.missiles,
      detonations: state.detonations + toll.detonations,
      casualties: Math.min(WORLD_POPULATION_MODEL_CAP, state.casualties + toll.casualties),
      alert: toll.alert || state.alert,
      elapsed: formatElapsed(seconds),
      seconds: seconds
    };
  }

  function applyRandomToll(state, ranges, rng) {
    return applyToll(state, {
      missiles: randomInteger(ranges.missiles, rng),
      detonations: randomInteger(ranges.detonations, rng),
      casualties: randomInteger(ranges.casualties, rng),
      seconds: randomInteger(ranges.elapsed, rng),
      alert: ranges.alert
    });
  }

  // Soundscape intensity for a narrative phase: the normalized detonation
  // count (2000 detonations = max) or the phase's own floor, whichever is
  // higher, capped at 1. The 2000 divisor is a presentation tuning constant,
  // not a data point.
  function intensityForPhase(state, phaseWeight) {
    var detonationsNorm = Math.min(1, (state ? state.detonations : 0) / 2000);
    return Math.max(phaseWeight, detonationsNorm);
  }

  // Composes the closing report. Every figure and range is a provisional
  // narrative value — a civilization-scale catastrophe for dramatic effect,
  // not an empirical estimate — kept distinct by horizon (immediate vs 30-day)
  // and bounded by the caps above. Preserve the meanings if the numbers ever
  // change; do not read these as factual forecasts.
  function createReport(state, rng) {
    var immediateBase = Math.min(
      IMMEDIATE_FATALITY_CAP,
      Math.max(
        Math.floor(state.casualties * 0.58),
        randomInteger([2800000000, 5600000000], rng)
      )
    );
    var thirtyBase = Math.min(
      THIRTY_DAY_FATALITY_CAP,
      Math.max(
        immediateBase + randomInteger([600000000, 1600000000], rng),
        randomInteger([4300000000, 7600000000], rng)
      )
    );
    return {
      imm: immediateBase,
      thirty: thirtyBase,
      det: Math.max(state.detonations, randomInteger([4200, 8600], rng)),
      infra: Math.max(randomInteger([92, 99], rng), 96)
    };
  }

  // Number of completed scenarios that triggers the closing sequence.
  // Single source of truth: game.js's finalSequence() and the localized
  // "SCENARIOS RUN: N" / "SCENARI ESEGUITI: N" display line both derive from
  // this constant (guarded by tests/unit/srcCanonical.test.js).
  var REQUIRED_WAR_RUNS = 3;

  function completeRun(completedRuns) {
    return completedRuns + 1;
  }

  function hasCompletedRuns(completedRuns, requiredRuns) {
    return completedRuns >= requiredRuns;
  }

  return {
    WORLD_POPULATION_MODEL_CAP: WORLD_POPULATION_MODEL_CAP,
    IMMEDIATE_FATALITY_CAP: IMMEDIATE_FATALITY_CAP,
    THIRTY_DAY_FATALITY_CAP: THIRTY_DAY_FATALITY_CAP,
    REQUIRED_WAR_RUNS: REQUIRED_WAR_RUNS,
    randomInteger: randomInteger,
    formatElapsed: formatElapsed,
    createStats: createStats,
    applyToll: applyToll,
    applyRandomToll: applyRandomToll,
    intensityForPhase: intensityForPhase,
    createReport: createReport,
    completeRun: completeRun,
    hasCompletedRuns: hasCompletedRuns
  };
});
