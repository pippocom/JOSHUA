// Copyright (C) 2025-2026 Marco Iannacone
// SPDX-License-Identifier: AGPL-3.0-only
/**
 * JoshuaWarSoundscape — procedural sound layer for the GLOBAL THERMONUCLEAR
 * WAR simulation: missile launches, impacts (normal/large), short automatic-
 * fire bursts, and an optional low ambient bed, all synthesized with Web
 * Audio (no audio files, no external libraries).
 *
 * This module owns none of the session-level concerns — no AudioContext, no
 * master gain, no MUTE/UNMUTE, no cross-effect exclusivity with the boot/
 * crash sounds. Those stay in audioManager.js, which creates exactly one
 * instance of this module and wires its bus into the shared masterGain, so
 * MUTE (masterGain.gain = 0) silences this module for free, with no
 * additional plumbing here.
 *
 * Design principles that shape the API below:
 *  - every play*() call is driven by a REAL visual event (game.js calls
 *    these from the same functions that draw the arc/impact on the map —
 *    see src/app/game.js's drawArcCoords()/impactCoord()). There is no
 *    internal timer that invents events or ramps intensity on its own;
 *    setIntensity() only ever reflects intensity computed from the actual
 *    simulation state (phase, detonation count) by the caller.
 *  - every play*() call is fire-and-forget from the caller's point of view:
 *    it never throws synchronously and its returned Promise never rejects,
 *    so a missing AudioContext or a mid-effect error can never interrupt
 *    the visual animation loop that triggered it.
 *  - "density under load" (many impacts arriving faster than they should be
 *    audible) is handled by two explicit, testable limits rather than by
 *    hoping timings work out: a max-concurrent-voices budget and a minimum
 *    audible-impact interval that tightens as intensity rises. Both are
 *    plain call/skip decisions — nothing here grows unbounded, and nothing
 *    here needs `?fast=1` special-casing, because both limits are measured
 *    in AudioContext time (real seconds of sound), not in how fast the
 *    caller happens to invoke these functions.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.JoshuaWarSoundscape = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function clamp01(v) {
    if (typeof v !== 'number' || !isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
  }
  function lerp(a, b, t) { return a + (b - a) * t; }

  // Bounded [-1, 1] soft-clip curve — same construction as audioManager.js's
  // makeSoftClipCurve(), duplicated here (not imported) because this module
  // must not depend on audioManager.js in either direction; both are leaves
  // wired together only by the code that constructs them (see
  // audioManager.js's integration of this module).
  function makeSoftClipCurve(amount) {
    var n = 256;
    var curve = new Float32Array(n);
    var k = amount > 0 ? amount : 0.5;
    var norm = Math.tanh(k * 3) || 1;
    for (var i = 0; i < n; i++) {
      var x = (i / (n - 1)) * 2 - 1;
      curve[i] = Math.tanh(k * x * 3) / norm;
    }
    return curve;
  }

  function createWarSoundscape(env) {
    env = env || {};
    var getContext = typeof env.getContext === 'function' ? env.getContext : function () { return null; };
    var getDestination = typeof env.getDestination === 'function' ? env.getDestination : function () { return null; };
    var random = typeof env.random === 'function' ? env.random : Math.random;
    var dbg = typeof env.dbg === 'function' ? env.dbg : function () {};
    var setTimeoutFn = typeof env.setTimeout === 'function' ? env.setTimeout : setTimeout;
    var clearTimeoutFn = typeof env.clearTimeout === 'function' ? env.clearTimeout : clearTimeout;

    // One "voice" = one in-flight play*() call (however many oscillators/
    // buffer sources it uses internally counts as a single slot) — the same
    // granularity a synthesizer's polyphony limit works at. Chosen generous
    // enough for the densest moment (globalBlanket's back-to-back impacts)
    // to still feel busy, small enough that a runaway caller can never pile
    // up unbounded nodes.
    var MAX_VOICES = 18;
    var activeVoiceCount = 0;
    var activeVoices = []; // [{ cancel() }] — every in-flight effect, for stop()

    var running = false;
    var intensity = 0;
    var lastAudibleImpactAt = -Infinity; // AudioContext.currentTime of the last impact that actually played
    var bus = null; // GainNode this module's own effects connect through
    var ambient = null; // { source, gain, filter } | null — optional low bed

    function allocateVoice(entry) {
      if (activeVoiceCount >= MAX_VOICES) return false;
      activeVoiceCount++;
      activeVoices.push(entry);
      return true;
    }
    function releaseVoice(entry) {
      var idx = activeVoices.indexOf(entry);
      if (idx !== -1) activeVoices.splice(idx, 1);
      activeVoiceCount = Math.max(0, activeVoiceCount - 1);
    }

    function ensureBus(context) {
      if (bus) return bus;
      var destination = getDestination();
      if (!destination) return null;
      bus = context.createGain();
      bus.gain.value = 0.9; // headroom lives here, not at 1.0, before the shared master/compressor chain
      bus.connect(destination);
      return bus;
    }

    /**
     * Begins a war-soundscape session: creates this module's bus (routed
     * into the shared destination given by env.getDestination(), i.e.
     * audioManager's masterGain) and, unless `opts.ambient === false`, a
     * looping low-noise bed whose level tracks setIntensity() directly
     * (no timer — see module header). Safe to call with no AudioContext;
     * becomes a no-op recording `running = false` in that case, so every
     * other method's "not running" guard still behaves correctly.
     */
    function start(opts) {
      opts = opts || {};
      stop(); // idempotent: never two soundscapes overlapping (e.g. a new scenario starting before the previous one's ABORT/stop ran)
      var context = getContext();
      if (!context) { running = false; return; }
      var b = ensureBus(context);
      if (!b) { running = false; return; }
      running = true;
      intensity = 0;
      lastAudibleImpactAt = -Infinity;
      dbg('warSoundscape started');

      if (opts.ambient === false) return;
      try {
        var dur = 2; // short loopable buffer, not a long recording
        var len = Math.max(1, Math.floor(context.sampleRate * dur));
        var buffer = context.createBuffer(1, len, context.sampleRate);
        var data = buffer.getChannelData(0);
        for (var i = 0; i < len; i++) data[i] = random() * 2 - 1;
        var source = context.createBufferSource();
        source.buffer = buffer;
        source.loop = true;
        var filter = context.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 90;
        filter.Q.value = 0.6;
        var gain = context.createGain();
        gain.gain.value = 0; // setIntensity() raises this — silent until the first real intensity update
        source.connect(filter);
        filter.connect(gain);
        gain.connect(b);
        source.start(context.currentTime);
        ambient = { source: source, gain: gain, filter: filter };
      } catch (err) {
        dbg('ambient bed setup failed —', err && err.message);
        ambient = null;
      }
    }

    /**
     * Sets the 0..1 escalation level. Always clamped — never throws, never
     * accepts anything that would push a derived parameter out of its safe
     * range. Callers are expected to derive this from real simulation state
     * (narrative phase, detonation count, ...); this module has no opinion
     * on where the number comes from, only on what it does with it.
     */
    function setIntensity(level) {
      intensity = clamp01(level);
      if (ambient) {
        // Direct .value assignment (no ramp/timer), same reasoning as
        // audioManager.js's setMuted(): this is a level update driven by an
        // external caller, not a scheduled envelope: instantaneous is
        // exactly correct.
        ambient.gain.gain.value = lerp(0, 0.05, intensity);
        ambient.filter.frequency.value = lerp(70, 140, intensity);
      }
    }

    function minImpactIntervalSec() { return lerp(0.24, 0.06, intensity); }

    // Every scheduled node in an effect shares this cleanup shape: stop/
    // disconnect everything once, release the effect's voice slot, and
    // guarantee it happens even if the effect's own natural end is somehow
    // never reached (context stall, dropped frames) via the safety timer.
    function scheduleCleanup(nodes, durationMs) {
      var settled = false;
      var timer = null;
      var entry = { cancel: finish };
      function finish() {
        if (settled) return;
        settled = true;
        if (timer) clearTimeoutFn(timer);
        nodes.forEach(function (n) {
          try { n.stop && n.stop(); } catch (err) { /* no-op */ }
          try { n.disconnect && n.disconnect(); } catch (err) { /* no-op */ }
        });
        releaseVoice(entry);
      }
      timer = setTimeoutFn(finish, durationMs + 120);
      return { entry: entry, finish: finish };
    }

    /**
     * Missile launch (and, since a separate per-missile flight voice would
     * multiply node count for no perceptual gain, its own short "away"
     * trajectory character in the same call): distant thump, filtered noise
     * rumble sweeping down, short ignition transient. No resonant sweep, no
     * held pitch — deliberately not a laser or a musical note.
     */
    function playMissileLaunch(opts) {
      opts = opts || {};
      if (!running) return Promise.resolve();
      var context = getContext();
      var destination = bus;
      if (!context || !destination) return Promise.resolve();

      var entry = {};
      if (!allocateVoice(entry)) return Promise.resolve();

      try {
        var t0 = context.currentTime;
        var durationSec = 0.42;
        var volume = Math.min(0.5, 0.22 * (0.85 + intensity * 0.3));

        var local = context.createGain();
        local.gain.value = volume;
        local.connect(destination);

        var shaper = context.createWaveShaper();
        shaper.curve = makeSoftClipCurve(0.5);
        shaper.connect(local);

        // Ignition transient: very short broadband click.
        var clickLen = Math.max(1, Math.floor(context.sampleRate * 0.015));
        var clickBuffer = context.createBuffer(1, clickLen, context.sampleRate);
        var clickData = clickBuffer.getChannelData(0);
        for (var i = 0; i < clickLen; i++) clickData[i] = random() * 2 - 1;
        var clickSource = context.createBufferSource();
        clickSource.buffer = clickBuffer;
        var clickGain = context.createGain();
        clickGain.gain.setValueAtTime(0.5, t0);
        clickGain.gain.linearRampToValueAtTime(0, t0 + 0.015);
        clickSource.connect(clickGain);
        clickGain.connect(local);
        clickSource.start(t0);
        clickSource.stop(t0 + 0.02);

        // Grave thump, pitch falling — motion, not a note.
        var osc = context.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(78, t0);
        osc.frequency.linearRampToValueAtTime(42, t0 + durationSec);
        var oscGain = context.createGain();
        oscGain.gain.setValueAtTime(0, t0);
        oscGain.gain.linearRampToValueAtTime(0.8, t0 + 0.02);
        oscGain.gain.linearRampToValueAtTime(0, t0 + durationSec);
        osc.connect(oscGain);
        oscGain.connect(shaper);
        osc.start(t0);
        osc.stop(t0 + durationSec + 0.02);

        // Filtered noise rumble, sweeping down — the "away" trajectory cue.
        var noiseLen = Math.max(1, Math.floor(context.sampleRate * durationSec));
        var noiseBuffer = context.createBuffer(1, noiseLen, context.sampleRate);
        var noiseData = noiseBuffer.getChannelData(0);
        for (var n = 0; n < noiseLen; n++) noiseData[n] = random() * 2 - 1;
        var noiseSource = context.createBufferSource();
        noiseSource.buffer = noiseBuffer;
        var noiseFilter = context.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.setValueAtTime(700, t0);
        noiseFilter.frequency.linearRampToValueAtTime(160, t0 + durationSec);
        noiseFilter.Q.value = 0.8;
        var noiseGain = context.createGain();
        noiseGain.gain.setValueAtTime(0, t0);
        noiseGain.gain.linearRampToValueAtTime(0.5, t0 + 0.03);
        noiseGain.gain.linearRampToValueAtTime(0, t0 + durationSec);
        noiseSource.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(shaper);
        noiseSource.start(t0);
        noiseSource.stop(t0 + durationSec + 0.02);

        var nodes = [local, shaper, clickSource, clickGain, osc, oscGain, noiseSource, noiseFilter, noiseGain];
        var cleanup = scheduleCleanup(nodes, durationSec * 1000);
        entry.cancel = cleanup.finish;
        return new Promise(function (resolve) { setTimeoutFn(resolve, durationSec * 1000 + 30); });
      } catch (err) {
        dbg('playMissileLaunch failed —', err && err.message);
        releaseVoice(entry);
        return Promise.resolve();
      }
    }

    /**
     * Optional, quieter, longer whoosh — exposed for media-lab/testing and
     * for callers that DO want a distinct in-flight cue, but not wired into
     * every drawn arc by default (see game.js: one hook at launch already
     * implies motion via playMissileLaunch's own downward sweep, so a
     * second per-missile voice is not spent unless a caller asks for it).
     */
    function playMissileFlight(opts) {
      opts = opts || {};
      if (!running) return Promise.resolve();
      var context = getContext();
      var destination = bus;
      if (!context || !destination) return Promise.resolve();

      var entry = {};
      if (!allocateVoice(entry)) return Promise.resolve();

      try {
        var t0 = context.currentTime;
        var durationSec = typeof opts.durationSec === 'number' ? Math.min(1.2, Math.max(0.2, opts.durationSec)) : 0.7;
        var volume = 0.12 * (0.8 + intensity * 0.3);

        var len = Math.max(1, Math.floor(context.sampleRate * durationSec));
        var buffer = context.createBuffer(1, len, context.sampleRate);
        var data = buffer.getChannelData(0);
        for (var i = 0; i < len; i++) data[i] = random() * 2 - 1;
        var source = context.createBufferSource();
        source.buffer = buffer;
        var filter = context.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(500, t0);
        filter.frequency.linearRampToValueAtTime(220, t0 + durationSec);
        filter.Q.value = 0.7;
        var gain = context.createGain();
        gain.gain.setValueAtTime(0, t0);
        gain.gain.linearRampToValueAtTime(volume, t0 + 0.08);
        gain.gain.linearRampToValueAtTime(0, t0 + durationSec);
        source.connect(filter);
        filter.connect(gain);
        gain.connect(destination);
        source.start(t0);
        source.stop(t0 + durationSec + 0.02);

        var cleanup = scheduleCleanup([source, filter, gain], durationSec * 1000);
        entry.cancel = cleanup.finish;
        return new Promise(function (resolve) { setTimeoutFn(resolve, durationSec * 1000 + 30); });
      } catch (err) {
        dbg('playMissileFlight failed —', err && err.message);
        releaseVoice(entry);
        return Promise.resolve();
      }
    }

    /**
     * Impact — normal or large (opts.big). Both share the same four-part
     * shape (transient / thump / filtered noise bed / decaying tail); big
     * impacts get a lower thump, more low-frequency noise energy and a
     * longer tail. Throttled by minImpactIntervalSec() so a burst of
     * near-simultaneous visual impacts (strikeStorm/globalBlanket) doesn't
     * produce an unlistenable wall of identical transients — the *visual*
     * impact still always happens; only whether THIS ONE gets its own
     * audible instance is subject to the throttle, exactly the "sampled but
     * correlated" behavior the spec asks for.
     */
    function playWarImpact(opts) {
      opts = opts || {};
      if (!running) return Promise.resolve();
      var context = getContext();
      var destination = bus;
      if (!context || !destination) return Promise.resolve();

      var now = context.currentTime;
      if (now - lastAudibleImpactAt < minImpactIntervalSec()) return Promise.resolve();

      var entry = {};
      if (!allocateVoice(entry)) return Promise.resolve();
      lastAudibleImpactAt = now;

      try {
        var big = !!opts.big;
        var t0 = now;
        var durationSec = big ? 1.15 : (0.55 + intensity * 0.15);
        var tailLen = (big ? 0.9 : 0.5) * (0.6 + intensity * 0.8);
        var totalDur = durationSec + tailLen;
        var peakGain = Math.min(0.6, (big ? 0.42 : 0.3) * (0.85 + intensity * 0.3));

        // A dedicated compressor for this module's impacts specifically —
        // additional insurance against summed peaks when several impacts
        // land close together, on top of audioManager's session-level one.
        // local -> compressor -> destination is the ONLY path; local must
        // not also connect straight to destination, or the dry signal would
        // sum with the compressed one and defeat the limiting entirely.
        var compressor = context.createDynamicsCompressor();
        compressor.connect(destination);
        var local = context.createGain();
        local.gain.value = 1;
        local.connect(compressor);

        var shaper = context.createWaveShaper();
        shaper.curve = makeSoftClipCurve(big ? 0.85 : 0.6);
        shaper.connect(local);

        // Transient: hard, short, broadband — the "crack".
        var clickLen = Math.max(1, Math.floor(context.sampleRate * 0.03));
        var clickBuffer = context.createBuffer(1, clickLen, context.sampleRate);
        var clickData = clickBuffer.getChannelData(0);
        for (var i = 0; i < clickLen; i++) clickData[i] = random() * 2 - 1;
        var clickSource = context.createBufferSource();
        clickSource.buffer = clickBuffer;
        var clickGain = context.createGain();
        clickGain.gain.setValueAtTime(peakGain, t0);
        clickGain.gain.linearRampToValueAtTime(0, t0 + 0.03);
        clickSource.connect(clickGain);
        clickGain.connect(shaper);
        clickSource.start(t0);
        clickSource.stop(t0 + 0.04);

        // Thump: grave oscillator, fast attack, short decay.
        var osc = context.createOscillator();
        osc.type = 'triangle';
        var thumpFreq = big ? 42 : 62;
        osc.frequency.setValueAtTime(thumpFreq * 1.6, t0);
        osc.frequency.linearRampToValueAtTime(thumpFreq, t0 + 0.08);
        var oscGain = context.createGain();
        oscGain.gain.setValueAtTime(0, t0);
        oscGain.gain.linearRampToValueAtTime(peakGain, t0 + 0.015);
        oscGain.gain.linearRampToValueAtTime(0, t0 + durationSec);
        osc.connect(oscGain);
        oscGain.connect(shaper);
        osc.start(t0);
        osc.stop(t0 + durationSec + 0.02);

        // Filtered noise bed under the thump.
        var bedLen = Math.max(1, Math.floor(context.sampleRate * durationSec));
        var bedBuffer = context.createBuffer(1, bedLen, context.sampleRate);
        var bedData = bedBuffer.getChannelData(0);
        for (var b = 0; b < bedLen; b++) bedData[b] = random() * 2 - 1;
        var bedSource = context.createBufferSource();
        bedSource.buffer = bedBuffer;
        var bedFilter = context.createBiquadFilter();
        bedFilter.type = 'lowpass';
        bedFilter.frequency.setValueAtTime(big ? 260 : 380, t0);
        bedFilter.frequency.linearRampToValueAtTime(big ? 120 : 180, t0 + durationSec);
        var bedGain = context.createGain();
        bedGain.gain.setValueAtTime(0, t0);
        bedGain.gain.linearRampToValueAtTime(peakGain * 0.8, t0 + 0.02);
        bedGain.gain.linearRampToValueAtTime(0, t0 + durationSec);
        bedSource.connect(bedFilter);
        bedFilter.connect(bedGain);
        bedGain.connect(shaper);
        bedSource.start(t0);
        bedSource.stop(t0 + durationSec + 0.02);

        // Decaying tail — filtered noise, quiet, length scales with intensity.
        var tailStart = t0 + durationSec * 0.5;
        var tailBufLen = Math.max(1, Math.floor(context.sampleRate * tailLen));
        var tailBuffer = context.createBuffer(1, tailBufLen, context.sampleRate);
        var tailData = tailBuffer.getChannelData(0);
        for (var tI = 0; tI < tailBufLen; tI++) tailData[tI] = random() * 2 - 1;
        var tailSource = context.createBufferSource();
        tailSource.buffer = tailBuffer;
        var tailFilter = context.createBiquadFilter();
        tailFilter.type = 'lowpass';
        tailFilter.frequency.value = big ? 200 : 260;
        var tailGain = context.createGain();
        tailGain.gain.setValueAtTime(peakGain * 0.35, tailStart);
        tailGain.gain.linearRampToValueAtTime(0, tailStart + tailLen);
        tailSource.connect(tailFilter);
        tailFilter.connect(tailGain);
        tailGain.connect(shaper);
        tailSource.start(tailStart);
        tailSource.stop(tailStart + tailLen + 0.02);

        var nodes = [local, compressor, shaper, clickSource, clickGain, osc, oscGain, bedSource, bedFilter, bedGain, tailSource, tailFilter, tailGain];
        var cleanup = scheduleCleanup(nodes, totalDur * 1000);
        entry.cancel = cleanup.finish;
        return new Promise(function (resolve) { setTimeoutFn(resolve, totalDur * 1000 + 30); });
      } catch (err) {
        dbg('playWarImpact failed —', err && err.message);
        releaseVoice(entry);
        return Promise.resolve();
      }
    }

    /**
     * Short automatic-fire-like burst: 4-6 irregular filtered-noise
     * impulses, always quieter than an impact. Gated by intensity UNLESS
     * opts.force is set — media-lab's manual "PLAY AUTOMATIC FIRE BURST"
     * button sets force so auditioning it doesn't depend on having a live
     * escalating scenario; the real in-game hook never sets it, so in
     * actual play its presence really does track intensity, mostly absent
     * early and only common in the medium/high phases, per spec.
     */
    function playAutomaticFireBurst(opts) {
      opts = opts || {};
      if (!running) return Promise.resolve();
      var context = getContext();
      var destination = bus;
      if (!context || !destination) return Promise.resolve();

      if (!opts.force) {
        var chance = Math.max(0, Math.min(0.8, intensity * 1.15 - 0.1));
        if (random() >= chance) return Promise.resolve();
      }

      var entry = {};
      if (!allocateVoice(entry)) return Promise.resolve();

      try {
        var t0 = context.currentTime;
        var impulseCount = 4 + Math.floor(random() * 3); // 4..6
        var cursor = t0;
        var nodes = [];
        var local = context.createGain();
        local.gain.value = Math.min(0.32, 0.18 + intensity * 0.1);
        local.connect(destination);
        nodes.push(local);

        for (var i = 0; i < impulseCount; i++) {
          var startAt = cursor;
          var impulseLen = Math.max(1, Math.floor(context.sampleRate * 0.02));
          var buffer = context.createBuffer(1, impulseLen, context.sampleRate);
          var data = buffer.getChannelData(0);
          for (var s = 0; s < impulseLen; s++) data[s] = random() * 2 - 1;
          var source = context.createBufferSource();
          source.buffer = buffer;
          var filter = context.createBiquadFilter();
          filter.type = 'bandpass';
          filter.frequency.value = 900 + random() * 500;
          filter.Q.value = 4;
          var gain = context.createGain();
          gain.gain.setValueAtTime(0.7 + random() * 0.3, startAt);
          gain.gain.linearRampToValueAtTime(0, startAt + 0.02);
          source.connect(filter);
          filter.connect(gain);
          gain.connect(local);
          source.start(startAt);
          source.stop(startAt + 0.03);
          nodes.push(source, filter, gain);
          // Irregular spacing — never a steady drum-machine pulse.
          cursor = startAt + 0.045 + random() * 0.05;
        }

        var totalMs = (cursor - t0) * 1000;
        var cleanup = scheduleCleanup(nodes, totalMs);
        entry.cancel = cleanup.finish;
        return new Promise(function (resolve) { setTimeoutFn(resolve, totalMs + 30); });
      } catch (err) {
        dbg('playAutomaticFireBurst failed —', err && err.message);
        releaseVoice(entry);
        return Promise.resolve();
      }
    }

    /**
     * Stops and releases every in-flight voice and the ambient bed, and
     * marks the soundscape not-running (so any late/stray play*() call
     * after this point is already a guaranteed no-op — see each method's
     * `if (!running) return` guard). Idempotent: safe to call when nothing
     * is running.
     */
    function stop() {
      running = false;
      var voices = activeVoices.slice();
      voices.forEach(function (v) { try { v.cancel(); } catch (err) { /* no-op */ } });
      activeVoices.length = 0;
      activeVoiceCount = 0;
      if (ambient) {
        try { ambient.source.stop(); } catch (err) { /* no-op */ }
        try { ambient.source.disconnect(); } catch (err) { /* no-op */ }
        try { ambient.filter.disconnect(); } catch (err) { /* no-op */ }
        try { ambient.gain.disconnect(); } catch (err) { /* no-op */ }
        ambient = null;
      }
      if (bus) {
        try { bus.disconnect(); } catch (err) { /* no-op */ }
        bus = null;
      }
      intensity = 0;
      lastAudibleImpactAt = -Infinity;
      dbg('warSoundscape stopped');
    }

    function getDebugState() {
      return {
        running: running,
        intensity: intensity,
        activeVoices: activeVoiceCount,
        maxVoices: MAX_VOICES
      };
    }

    return {
      start: start,
      setIntensity: setIntensity,
      playMissileLaunch: playMissileLaunch,
      playMissileFlight: playMissileFlight,
      playWarImpact: playWarImpact,
      playAutomaticFireBurst: playAutomaticFireBurst,
      stop: stop,
      getDebugState: getDebugState,
      _internal: {
        MAX_VOICES: MAX_VOICES,
        minImpactIntervalSec: minImpactIntervalSec
      }
    };
  }

  return { createWarSoundscape: createWarSoundscape };
});
