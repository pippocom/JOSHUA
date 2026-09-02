// Copyright (C) 2025-2026 Marco Iannacone
// SPDX-License-Identifier: AGPL-3.0-only
/**
 * JoshuaAudioManager — single-session Web Audio controller for the
 * single-document standalone build. Owns exactly one AudioContext for the
 * whole page lifetime, created and unlocked directly inside the BOOT click
 * (no cross-document navigation, so the unlock is reliable everywhere,
 * including Safari).
 *
 * Two synthesized effects, no external files, no network:
 *  - playBootNoise(): ~5s retro mainframe initialization noise.
 *  - playTicTacToeCrash(): ~4.5s glitchy overload/crash sound for the
 *    TIC-TAC-TOE ZERO-players ending, fully synthesized (no audio files).
 *
 * Signal chain: each effect's own gain -> masterGain -> DynamicsCompressorNode
 * -> destination. setMuted()/volume act on masterGain only.
 *
 * speechSynthesis (see speech.js) is a completely separate browser API and is
 * NOT owned by this module — it has no AudioContext, no gain nodes, nothing
 * in common with Web Audio. Callers that want "mute everything" call both
 * audioManager.setMuted(true) and JoshuaSpeech.cancelSpeech() themselves;
 * this module does not pretend the two are the same thing.
 *
 * Diagnostics: pass `?audioDebug=1` in the page URL (browser default instance
 * only) to log non-sensitive status messages — click received, context
 * created, state before/after resume, unlock tick, effect scheduled/started/
 * ended, mute, cleanup. No logging without that flag. Every log call happens
 * at function entry, before any await/Promise boundary.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./warSoundscape.js'));
  } else {
    root.JoshuaAudioManager = factory(root.JoshuaWarSoundscape);
  }
})(typeof self !== 'undefined' ? self : this, function (WarSoundscape) {
  'use strict';

  // Single source of truth for the boot noise's default duration, so
  // game.js and the tests never hardcode a competing value. Since every
  // element inside playBootNoise() is timed as a fraction of durationSec
  // (not an absolute offset), changing this one constant extends the whole
  // effect proportionally.
  var BOOT_NOISE_DEFAULT_DURATION_MS = 5000;

  function createAudioManager(env) {
    env = env || {};
    var win = env.window || (typeof window !== 'undefined' ? window : undefined);
    var AudioContextCtor = env.AudioContextCtor || (win && (win.AudioContext || win.webkitAudioContext));
    // Every "randomized" DSP detail (noise buffers, click timing/frequency,
    // pulse jitter, ...) draws from this single injected source instead of
    // calling Math.random() directly, so tests can pin down a deterministic
    // sequence without ever touching the global Math.random.
    var random = typeof env.random === 'function' ? env.random : Math.random;

    var debugEnabled = typeof env.debugEnabled === 'boolean'
      ? env.debugEnabled
      : !!(win && win.location && /(?:^|[?&])audioDebug=1(?:&|$)/.test(win.location.search || ''));
    var logger = env.logger || ((win && win.console && win.console.log) ? function () { win.console.log.apply(win.console, arguments); } : function () {});

    function dbg() {
      if (!debugEnabled) return;
      try { logger.apply(null, ['[JoshuaAudio]'].concat(Array.prototype.slice.call(arguments))); } catch (err) { /* no-op */ }
    }

    var ctx = null;
    var masterGain = null;
    var compressor = null;
    var contextConfirmedRunning = false;
    var muted = false;
    var masterVolume = typeof env.initialVolume === 'number' ? env.initialVolume : 0.85;
    var activeBoot = null; // { finish, cancel }
    var activeCrash = null;

    // The GLOBAL THERMONUCLEAR WAR soundscape lives in its own module
    // (src/audio/warSoundscape.js) — this is the one place that wires it
    // into the session: same AudioContext (lazy, via getContext below),
    // same masterGain bus (so MUTE/UNMUTE and volume already apply to it
    // for free), same injected `random`. audioManager.js still owns
    // start/stop lifecycle and mutual exclusion with boot/crash below.
    var warSoundscape = WarSoundscape ? WarSoundscape.createWarSoundscape({
      getContext: getContext,
      getDestination: function () { buildGraphIfNeeded(); return masterGain || (ctx && ctx.destination) || null; },
      random: random,
      dbg: dbg
    }) : null;

    function buildGraphIfNeeded() {
      if (masterGain || !ctx) return;
      compressor = ctx.createDynamicsCompressor();
      masterGain = ctx.createGain();
      masterGain.gain.value = muted ? 0 : masterVolume;
      masterGain.connect(compressor);
      compressor.connect(ctx.destination);
    }

    // AudioContext is created lazily, on first real use — never at load time.
    // A single instance is kept for the whole session (reset() is the only
    // way to discard it).
    function getContext() {
      if (ctx) return ctx;
      if (!AudioContextCtor) { dbg('AudioContext unavailable (no constructor)'); return null; }
      try {
        ctx = new AudioContextCtor();
        dbg('AudioContext created, initial state =', ctx.state);
        buildGraphIfNeeded();
      } catch (err) {
        dbg('AudioContext construction failed —', err && err.message);
        ctx = null;
      }
      return ctx;
    }

    // Real-timer safety net — see speech.js/bootSequence.js for the same
    // pattern. Never depends on AudioContext.currentTime, so it survives a
    // context that never leaves "suspended".
    function withRealTimeout(promiseFactory, ms, fallbackValue) {
      return new Promise(function (resolve) {
        var settled = false;
        function finish(value) { if (settled) return; settled = true; resolve(value); }
        var timer = setTimeout(function () { finish(fallbackValue); }, ms);
        var p;
        try { p = promiseFactory(); } catch (err) { clearTimeout(timer); finish(fallbackValue); return; }
        Promise.resolve(p).then(
          function (value) { clearTimeout(timer); finish(value); },
          function () { clearTimeout(timer); finish(fallbackValue); }
        );
      });
    }

    function resumeAndVerify(timeoutMs) {
      var context = getContext();
      if (!context) return Promise.resolve(false);
      if (context.state === 'running') {
        contextConfirmedRunning = true;
        return Promise.resolve(true);
      }
      return withRealTimeout(function () { return context.resume(); }, timeoutMs || 300, undefined).then(function () {
        // Verify the ACTUAL state, not just that resume() didn't throw.
        contextConfirmedRunning = context.state === 'running';
        dbg('state after resume attempt =', context.state, '(confirmedRunning =', contextConfirmedRunning, ')');
        return contextConfirmedRunning;
      });
    }

    // A silent, single-sample buffer started synchronously, inside the same
    // gesture as resume(). This is the standard additional unlock step —
    // resume() alone is not always sufficient. Nothing is left behind: a
    // 1-sample buffer finishes essentially instantly.
    function silentUnlockTick() {
      var context = getContext();
      if (!context) return false;
      try {
        var buffer = context.createBuffer(1, 1, context.sampleRate || 44100);
        var source = context.createBufferSource();
        source.buffer = buffer;
        source.connect(context.destination);
        source.start(0);
        return true;
      } catch (err) {
        dbg('silent unlock tick failed —', err && err.message);
        return false;
      }
    }

    // Call synchronously inside the BOOT click handler, before any await.
    function unlockFromGesture() {
      dbg('unlockFromGesture invoked (BOOT click)');
      var context = getContext();
      if (!context) { dbg('no AudioContext available, text/TTS sequence will still proceed'); return; }
      var stateBefore = context.state;
      var tickStarted = silentUnlockTick();
      dbg('unlockFromGesture: stateBefore =', stateBefore, 'silent unlock tick started =', tickStarted);
      resumeAndVerify();
    }

    // Call synchronously inside the ZERO-confirm keydown handler, before any
    // await and before startZeroPlayerMode(). Re-asserts the unlock using
    // this second real user gesture.
    function ensureRunningFromGesture() {
      dbg('ensureRunningFromGesture invoked (ZERO confirmation)');
      var context = getContext();
      if (!context) { dbg('no AudioContext available, crash will use silent timeout fallback'); return; }
      silentUnlockTick();
      resumeAndVerify();
    }

    // ---- boot noise: synthesized ~5s serious/technical/unsettling boot signal ----
    // Deliberately avoids anything rhythmic, melodic or consonant:
    //  - a grave "electric hum" drone: two closely detuned low oscillators
    //    beating against each other (not a clean interval — an unsettling wobble);
    //  - dark filtered noise bed, cutoff rising slowly (mounting tension);
    //  - a slow LFO subtly wobbling the drone's filter cutoff ("mechanical
    //    vibration", not a rhythmic pulse — too slow and irregular to read as a beat);
    //  - short relay-like transients (bandpassed noise clicks) at
    //    non-rhythmic, randomized intervals ("apparati che si attivano");
    //  - a short, non-melodic sweep near the end (filtered noise, not a tonal
    //    oscillator glissando, so it never reads as a musical phrase);
    //  - a short fade in/out.
    // Energy is kept in the low-to-mid range (roughly 70-700Hz for the drone/
    // noise bed, 800-1500Hz for the transients) so it stays audible on small
    // laptop speakers, not just subwoofers.
    function playBootNoise(opts) {
      opts = opts || {};
      var durationMs = opts.durationMs || BOOT_NOISE_DEFAULT_DURATION_MS;

      // Same "exactly one in flight" guard as the crash effect.
      if (activeBoot) stopBootNoise();
      // Boot noise, the crash effect and the war soundscape are mutually
      // exclusive — never mixed on top of each other.
      stopWarSoundscape();

      var context = getContext();
      if (!context) return Promise.resolve();

      return resumeAndVerify().then(function () {
        return new Promise(function (resolve) {
          var settled = false;
          var nodes = [];
          var safety = null;

          function finish() {
            if (settled) return;
            settled = true;
            if (safety) clearTimeout(safety);
            nodes.forEach(function (n) {
              try { n.stop && n.stop(); } catch (err) { /* no-op */ }
              try { n.disconnect && n.disconnect(); } catch (err) { /* no-op */ }
            });
            if (activeBoot && activeBoot.finish === finish) activeBoot = null;
            dbg('boot effect ended');
            resolve();
          }

          dbg('boot effect scheduled, durationMs =', durationMs);
          try {
            buildGraphIfNeeded();
            var durationSec = durationMs / 1000;
            var t0 = context.currentTime;
            var volume = opts.volume != null ? opts.volume : 0.2;
            var destination = masterGain || context.destination;

            var master = context.createGain();
            master.gain.setValueAtTime(0, t0);
            master.gain.linearRampToValueAtTime(volume, t0 + 0.08); // short fade-in
            master.gain.setValueAtTime(volume, t0 + Math.max(0.08, durationSec - 0.18));
            master.gain.linearRampToValueAtTime(0, t0 + durationSec); // short fade-out
            master.connect(destination);
            nodes.push(master);

            // Dark filtered noise bed. Cutoff rises slowly across the whole
            // duration — "crescita controllata della tensione" — never fast
            // enough to read as a sweep or a rhythmic event.
            var bufferSize = Math.max(1, Math.floor(context.sampleRate * durationSec));
            var noiseBuffer = context.createBuffer(1, bufferSize, context.sampleRate);
            var data = noiseBuffer.getChannelData(0);
            for (var i = 0; i < bufferSize; i++) data[i] = (random() * 2 - 1) * 0.5;
            var noiseSource = context.createBufferSource();
            noiseSource.buffer = noiseBuffer;
            var noiseFilter = context.createBiquadFilter();
            noiseFilter.type = 'lowpass';
            noiseFilter.frequency.setValueAtTime(220, t0);
            noiseFilter.frequency.linearRampToValueAtTime(650, t0 + durationSec * 0.85);
            noiseFilter.Q.value = 0.7;
            var noiseGain = context.createGain();
            noiseGain.gain.value = 0.32;
            noiseSource.connect(noiseFilter);
            noiseFilter.connect(noiseGain);
            noiseGain.connect(master);
            noiseSource.start(t0);
            noiseSource.stop(t0 + durationSec);
            nodes.push(noiseSource, noiseFilter, noiseGain);

            // Grave electric hum: two closely detuned low oscillators beating
            // against each other — an unsettling wobble, not a musical interval.
            var droneFilter = context.createBiquadFilter();
            droneFilter.type = 'lowpass';
            droneFilter.frequency.value = 380;
            droneFilter.Q.value = 0.9;
            droneFilter.connect(master);
            nodes.push(droneFilter);
            [[72, 0.22], [76.5, 0.16]].forEach(function (pair) {
              var osc = context.createOscillator();
              osc.type = 'sawtooth';
              osc.frequency.setValueAtTime(pair[0], t0);
              var oscGain = context.createGain();
              oscGain.gain.setValueAtTime(0, t0);
              oscGain.gain.linearRampToValueAtTime(pair[1], t0 + 0.15);
              oscGain.gain.setValueAtTime(pair[1], t0 + Math.max(0.15, durationSec - 0.18));
              oscGain.gain.linearRampToValueAtTime(0, t0 + durationSec);
              osc.connect(oscGain);
              oscGain.connect(droneFilter);
              osc.start(t0);
              osc.stop(t0 + durationSec);
              nodes.push(osc, oscGain);
            });

            // Mechanical vibration: a slow LFO subtly wobbling the drone
            // filter's cutoff — far too slow (~5-6Hz) and irregular-sounding
            // to read as a rhythmic pulse.
            var lfo = context.createOscillator();
            lfo.type = 'sine';
            lfo.frequency.value = 5.5;
            var lfoDepth = context.createGain();
            lfoDepth.gain.value = 40; // +/-40Hz wobble on the filter cutoff
            lfo.connect(lfoDepth);
            lfoDepth.connect(droneFilter.frequency);
            lfo.start(t0);
            lfo.stop(t0 + durationSec);
            nodes.push(lfo, lfoDepth);

            // Short relay-like transients at irregular (non-rhythmic)
            // intervals — "apparati che si attivano", not a beat.
            var cursor = 0.25;
            while (cursor < durationSec - 0.3) {
              cursor += 0.35 + random() * 0.65;
              if (cursor >= durationSec - 0.3) break;
              (function (startAt) {
                var clickLen = Math.max(1, Math.floor(context.sampleRate * 0.03));
                var clickBuffer = context.createBuffer(1, clickLen, context.sampleRate);
                var cdata = clickBuffer.getChannelData(0);
                for (var k = 0; k < cdata.length; k++) cdata[k] = random() * 2 - 1;
                var clickSource = context.createBufferSource();
                clickSource.buffer = clickBuffer;
                var clickFilter = context.createBiquadFilter();
                clickFilter.type = 'bandpass';
                clickFilter.frequency.value = 800 + random() * 700;
                clickFilter.Q.value = 3;
                var clickGain = context.createGain();
                clickGain.gain.setValueAtTime(0, startAt);
                clickGain.gain.linearRampToValueAtTime(0.28 + random() * 0.14, startAt + 0.002);
                clickGain.gain.linearRampToValueAtTime(0, startAt + 0.02 + random() * 0.02);
                clickSource.connect(clickFilter);
                clickFilter.connect(clickGain);
                clickGain.connect(master);
                clickSource.start(startAt);
                clickSource.stop(startAt + 0.05);
                nodes.push(clickSource, clickFilter, clickGain);
              })(t0 + cursor);
            }

            // Non-melodic sweep near the end: filtered NOISE (not a tonal
            // oscillator glissando), so it never reads as a musical phrase.
            var sweepStart = t0 + Math.max(0, durationSec - 0.7);
            var sweepLen = Math.max(1, Math.floor(context.sampleRate * 0.7));
            var sweepBuffer = context.createBuffer(1, sweepLen, context.sampleRate);
            var sdata = sweepBuffer.getChannelData(0);
            for (var s = 0; s < sdata.length; s++) sdata[s] = random() * 2 - 1;
            var sweepSource = context.createBufferSource();
            sweepSource.buffer = sweepBuffer;
            var sweepFilter = context.createBiquadFilter();
            sweepFilter.type = 'bandpass';
            sweepFilter.frequency.setValueAtTime(200, sweepStart);
            sweepFilter.frequency.linearRampToValueAtTime(1200, sweepStart + 0.65);
            sweepFilter.Q.value = 2.2;
            var sweepGain = context.createGain();
            sweepGain.gain.setValueAtTime(0, sweepStart);
            sweepGain.gain.linearRampToValueAtTime(0.26, sweepStart + 0.1);
            sweepGain.gain.linearRampToValueAtTime(0, sweepStart + 0.7);
            sweepSource.connect(sweepFilter);
            sweepFilter.connect(sweepGain);
            sweepGain.connect(master);
            sweepSource.start(sweepStart);
            sweepSource.stop(sweepStart + 0.72);
            nodes.push(sweepSource, sweepFilter, sweepGain);
          } catch (err) {
            dbg('boot effect setup failed —', err && err.message);
            finish();
            return;
          }

          safety = setTimeout(finish, durationMs + 250);
          activeBoot = { finish: finish, cancel: function () { finish(); } };
          dbg('boot effect started');
        });
      }).catch(function () { /* never propagate — boot noise is best-effort */ });
    }

    // Bounded [-1, 1] soft-clip curve for WaveShaperNode — "controlled
    // distortion" without ever reaching true digital clipping.
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

    // ---- TIC-TAC-TOE ZERO overload crash: synthesized ~4-4.5s industrial alarm ----
    // Reads as an intermittent industrial/emergency alarm:
    //  1) a brief digital collapse — a rapidly gated harsh noise burst;
    //  2) a grave, distorted (soft-clipped) noise bed underneath everything,
    //     with a slight downward filter drift for "instability";
    //  3-7) 5-7 irregular alarm pulses, each a pair of slightly dissonant low
    //     oscillators (~90-140Hz fundamental, detuned ~4.5% apart — not a
    //     clean musical interval) with a downward drift across pulses;
    //  7) each pulse also gets a quiet ~3x-frequency harmonic layer
    //     (~270-420Hz) so the alarm stays audible on small laptop speakers;
    //  8) a dedicated DynamicsCompressorNode for this effect specifically
    //     (in addition to the session-level one), then a sharp/short fade.
    // No sirens, no arcade beeps, no musical sequence, no clipping.
    function playTicTacToeCrash(opts) {
      opts = opts || {};
      var durationMs = opts.durationMs || 4500;

      // The crash must play exactly once: cancel any previous crash before
      // starting a new one, so at most one is ever in flight.
      if (activeCrash) stopCrash();
      // Boot noise, the crash effect and the war soundscape are mutually
      // exclusive — never mixed on top of each other.
      stopWarSoundscape();
      // Any residual tic-tac-toe mark beeps (from the ZERO-player run that
      // just triggered this crash) must not keep sounding underneath it.
      stopTicTacToeMarks();

      var context = getContext();
      if (!context) return Promise.resolve();

      return resumeAndVerify().then(function () {
        return new Promise(function (resolve) {
          var settled = false;
          var nodes = [];
          var safety = null;

          function finish() {
            if (settled) return;
            settled = true;
            if (safety) clearTimeout(safety);
            nodes.forEach(function (n) {
              try { n.stop && n.stop(); } catch (err) { /* no-op */ }
              try { n.disconnect && n.disconnect(); } catch (err) { /* no-op */ }
            });
            if (activeCrash && activeCrash.finish === finish) activeCrash = null;
            dbg('crash effect ended');
            resolve();
          }

          dbg('crash effect scheduled, durationMs =', durationMs);
          try {
            buildGraphIfNeeded();
            var durationSec = durationMs / 1000;
            var t0 = context.currentTime;
            var volume = opts.volume != null ? opts.volume : 0.24;
            var destination = masterGain || context.destination;
            var fadeStart = t0 + Math.max(0.2, durationSec - 0.1);

            var master = context.createGain();
            master.gain.setValueAtTime(0, t0);
            master.gain.linearRampToValueAtTime(volume, t0 + 0.03); // sharp attack
            master.gain.setValueAtTime(volume, fadeStart);
            master.gain.linearRampToValueAtTime(0, t0 + durationSec); // short, sharp fade
            nodes.push(master);

            // Local compressor for this effect specifically, feeding into the
            // session bus (masterGain -> its own compressor) for extra
            // insurance against summed peaks from several gated oscillators.
            var localCompressor = context.createDynamicsCompressor();
            master.connect(localCompressor);
            localCompressor.connect(destination);
            nodes.push(localCompressor);

            // 1) Brief digital collapse: rapidly gated harsh noise burst (~180ms).
            var collapseDur = 0.18;
            var collapseLen = Math.max(1, Math.floor(context.sampleRate * collapseDur));
            var collapseBuffer = context.createBuffer(1, collapseLen, context.sampleRate);
            var collapseData = collapseBuffer.getChannelData(0);
            for (var ci = 0; ci < collapseData.length; ci++) collapseData[ci] = random() * 2 - 1;
            var collapseSource = context.createBufferSource();
            collapseSource.buffer = collapseBuffer;
            var collapseShaper = context.createWaveShaper();
            collapseShaper.curve = makeSoftClipCurve(0.9);
            var collapseGain = context.createGain();
            var gateSteps = 6;
            for (var g = 0; g < gateSteps; g++) {
              var gStart = t0 + (g / gateSteps) * collapseDur;
              collapseGain.gain.setValueAtTime(g % 2 === 0 ? 0.5 : 0, gStart);
            }
            collapseGain.gain.setValueAtTime(0, t0 + collapseDur);
            collapseSource.connect(collapseShaper);
            collapseShaper.connect(collapseGain);
            collapseGain.connect(master);
            collapseSource.start(t0);
            collapseSource.stop(t0 + collapseDur + 0.02);
            nodes.push(collapseSource, collapseShaper, collapseGain);

            // 2) Grave, distorted noise bed underneath everything, with a
            // slight downward filter drift ("instability").
            var bufferSize = Math.max(1, Math.floor(context.sampleRate * durationSec));
            var noiseBuffer = context.createBuffer(1, bufferSize, context.sampleRate);
            var data = noiseBuffer.getChannelData(0);
            for (var i = 0; i < bufferSize; i++) data[i] = random() * 2 - 1;
            var noiseSource = context.createBufferSource();
            noiseSource.buffer = noiseBuffer;
            var noiseFilter = context.createBiquadFilter();
            noiseFilter.type = 'lowpass';
            noiseFilter.frequency.setValueAtTime(260, t0);
            noiseFilter.frequency.linearRampToValueAtTime(150, t0 + durationSec);
            var noiseShaper = context.createWaveShaper();
            noiseShaper.curve = makeSoftClipCurve(0.55);
            var noiseGain = context.createGain();
            noiseGain.gain.value = 0.2;
            noiseSource.connect(noiseFilter);
            noiseFilter.connect(noiseShaper);
            noiseShaper.connect(noiseGain);
            noiseGain.connect(master);
            noiseSource.start(t0 + collapseDur * 0.5);
            noiseSource.stop(t0 + durationSec);
            nodes.push(noiseSource, noiseFilter, noiseShaper, noiseGain);

            // 3-7) Intermittent low alarm: 5-7 irregular pulses. Each pulse is
            // a dissonant low pair (fundamental + ~4.5% detuned partner) plus
            // a quiet 3x-frequency harmonic layer for small-speaker audibility.
            // Frequencies drift slightly downward pulse-to-pulse (instability).
            // 5..7 pulses: one extra grave pulse, continuing the same downward
            // frequency drift — available/pulseDur/gapBase below are derived
            // from pulseCount,
            // so the extra pulse is absorbed into the existing timing budget
            // rather than appended as a separate, out-of-budget sound.
            var pulseCount = 5 + Math.floor(random() * 3); // 5..7
            var alarmStart = t0 + collapseDur + 0.15;
            var available = Math.max(0.4, durationSec - (alarmStart - t0) - 0.25);
            var pulseDur = Math.min(0.55, (available / pulseCount) * 0.6);
            var gapBase = Math.max(0.15, (available / pulseCount) * 0.4);
            var cursor = alarmStart;
            var freqDrift = 0;
            for (var p = 0; p < pulseCount; p++) {
              var startAt = cursor;
              var thisPulseDur = pulseDur * (0.85 + random() * 0.3);
              // Per-pulse jitter is capped at 3Hz (not more) so it can never
              // exceed freqDrift's own guaranteed minimum increment (also 3,
              // see below) — this is what makes "each pulse's base frequency
              // is <= the previous one" an actual guarantee for any random()
              // in [0,1), not just a usual-case outcome.
              var baseFreq = 128 - freqDrift - random() * 3;
              var detuned = baseFreq * (1.045 + random() * 0.02); // slightly dissonant, not a clean interval
              var harmonic = baseFreq * 3; // lands ~270-420Hz — audible on small speakers

              (function (freq, type, gainPeak) {
                var osc = context.createOscillator();
                osc.type = type;
                osc.frequency.setValueAtTime(freq, startAt);
                var oGain = context.createGain();
                oGain.gain.setValueAtTime(0, startAt);
                oGain.gain.linearRampToValueAtTime(gainPeak, startAt + 0.02);
                oGain.gain.setValueAtTime(gainPeak, startAt + thisPulseDur - 0.04);
                oGain.gain.linearRampToValueAtTime(0, startAt + thisPulseDur);
                osc.connect(oGain);
                oGain.connect(master);
                osc.start(startAt);
                osc.stop(startAt + thisPulseDur + 0.02);
                nodes.push(osc, oGain);
              })(baseFreq, 'sawtooth', 0.3);
              (function (freq, type, gainPeak) {
                var osc = context.createOscillator();
                osc.type = type;
                osc.frequency.setValueAtTime(freq, startAt);
                var oGain = context.createGain();
                oGain.gain.setValueAtTime(0, startAt);
                oGain.gain.linearRampToValueAtTime(gainPeak, startAt + 0.02);
                oGain.gain.setValueAtTime(gainPeak, startAt + thisPulseDur - 0.04);
                oGain.gain.linearRampToValueAtTime(0, startAt + thisPulseDur);
                osc.connect(oGain);
                oGain.connect(master);
                osc.start(startAt);
                osc.stop(startAt + thisPulseDur + 0.02);
                nodes.push(osc, oGain);
              })(detuned, 'square', 0.16);
              (function (freq, type, gainPeak) {
                var osc = context.createOscillator();
                osc.type = type;
                osc.frequency.setValueAtTime(freq, startAt);
                var oGain = context.createGain();
                oGain.gain.setValueAtTime(0, startAt);
                oGain.gain.linearRampToValueAtTime(gainPeak, startAt + 0.02);
                oGain.gain.setValueAtTime(gainPeak, startAt + thisPulseDur - 0.04);
                oGain.gain.linearRampToValueAtTime(0, startAt + thisPulseDur);
                osc.connect(oGain);
                oGain.connect(master);
                osc.start(startAt);
                osc.stop(startAt + thisPulseDur + 0.02);
                nodes.push(osc, oGain);
              })(harmonic, 'triangle', 0.08);

              freqDrift += 3 + random() * 3;
              // Explicit attenuation/silence gap between pulses — the alarm
              // must never sound continuous.
              cursor = startAt + thisPulseDur + gapBase * (0.7 + random() * 0.6);
            }
          } catch (err) {
            dbg('crash effect setup failed —', err && err.message);
            finish();
            return;
          }

          safety = setTimeout(finish, durationMs + 300);
          activeCrash = { finish: finish, cancel: function () { finish(); } };
          dbg('crash effect started');
        });
      }).catch(function () { /* never propagate — crash sound is best-effort */ });
    }

    // ---- TIC-TAC-TOE mark beep: short retro confirmation tone ----
    // X and O get slightly different frequencies (X higher, O lower) so the
    // two are distinguishable without looking at the board, but this is a
    // UI confirmation blip, not a musical note or an arcade sound. ZERO-
    // player mode can place a mark roughly every 95-310ms, so — same
    // reasoning as warSoundscape.js's voice budget — a small concurrent-
    // voice cap plus guaranteed per-node cleanup keeps rapid calls from
    // ever accumulating oscillators.
    var TIC_MARK_FREQ = { X: 580, O: 400 };
    var TIC_MARK_MAX_VOICES = 6;
    var activeTicMarkVoices = []; // [{ finish() }]

    function stopTicTacToeMarks() {
      activeTicMarkVoices.slice().forEach(function (v) { try { v.finish(); } catch (err) { /* no-op */ } });
      activeTicMarkVoices.length = 0;
    }

    function playTicTacToeMark(mark) {
      if (muted) return Promise.resolve();
      if (activeTicMarkVoices.length >= TIC_MARK_MAX_VOICES) return Promise.resolve();

      var context = getContext();
      if (!context) return Promise.resolve();
      buildGraphIfNeeded();
      var destination = masterGain;
      if (!destination) return Promise.resolve();

      try {
        var freq = TIC_MARK_FREQ[mark] || TIC_MARK_FREQ.X;
        var t0 = context.currentTime;
        var durationSec = 0.09; // ~90ms — inside the 60-120ms target range

        var osc = context.createOscillator();
        osc.type = 'square';
        osc.frequency.value = freq;
        var filter = context.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = freq * 2.2; // tames the square wave's harsher upper harmonics
        filter.Q.value = 0.7;
        var gain = context.createGain();
        gain.gain.setValueAtTime(0, t0);
        gain.gain.linearRampToValueAtTime(0.22, t0 + 0.005); // near-immediate attack
        gain.gain.linearRampToValueAtTime(0, t0 + durationSec); // fast, complete decay — no clipping, no tail
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(destination);
        osc.start(t0);
        osc.stop(t0 + durationSec + 0.02);

        var settled = false;
        var entry = {};
        var timer = null;
        function finish() {
          if (settled) return;
          settled = true;
          if (timer) clearTimeout(timer);
          try { osc.stop(); } catch (err) { /* no-op */ }
          try { osc.disconnect(); } catch (err) { /* no-op */ }
          try { filter.disconnect(); } catch (err) { /* no-op */ }
          try { gain.disconnect(); } catch (err) { /* no-op */ }
          var idx = activeTicMarkVoices.indexOf(entry);
          if (idx !== -1) activeTicMarkVoices.splice(idx, 1);
        }
        entry.finish = finish;
        activeTicMarkVoices.push(entry);
        timer = setTimeout(finish, durationSec * 1000 + 60);
        return new Promise(function (resolve) { setTimeout(resolve, durationSec * 1000 + 60); });
      } catch (err) {
        dbg('playTicTacToeMark failed —', err && err.message);
        return Promise.resolve();
      }
    }

    function stopBootNoise() { if (activeBoot) activeBoot.cancel(); }
    function stopCrash() { if (activeCrash) activeCrash.cancel(); }

    // ---- GLOBAL THERMONUCLEAR WAR soundscape: thin lifecycle wiring ----
    // All DSP/voice-limiting/throttling lives in warSoundscape.js; this is
    // only the delegation + "never throw synchronously" contract every
    // caller in game.js's animation loops relies on (see that module's
    // header comment for why).
    function startWarSoundscape(opts) {
      dbg('startWarSoundscape invoked');
      stopEffects(); // mutually exclusive with boot noise/crash — see those functions' guards for the reverse direction
      try { if (warSoundscape) warSoundscape.start(opts); } catch (err) { dbg('startWarSoundscape failed —', err && err.message); }
    }
    function setWarIntensity(level) {
      try { if (warSoundscape) warSoundscape.setIntensity(level); } catch (err) { /* no-op */ }
    }
    // While muted, these skip scheduling entirely instead of relying only
    // on masterGain being silent — mute must stop *new* emissions outright,
    // not just make them inaudible, so a long muted stretch of the
    // simulation never spends voice-budget/throttle state on sound nobody
    // will ever hear.
    function playMissileLaunch(opts) {
      if (muted) return Promise.resolve();
      try { return warSoundscape ? warSoundscape.playMissileLaunch(opts) : Promise.resolve(); } catch (err) { return Promise.resolve(); }
    }
    function playMissileFlight(opts) {
      if (muted) return Promise.resolve();
      try { return warSoundscape ? warSoundscape.playMissileFlight(opts) : Promise.resolve(); } catch (err) { return Promise.resolve(); }
    }
    function playWarImpact(opts) {
      if (muted) return Promise.resolve();
      try { return warSoundscape ? warSoundscape.playWarImpact(opts) : Promise.resolve(); } catch (err) { return Promise.resolve(); }
    }
    function playAutomaticFireBurst(opts) {
      if (muted) return Promise.resolve();
      try { return warSoundscape ? warSoundscape.playAutomaticFireBurst(opts) : Promise.resolve(); } catch (err) { return Promise.resolve(); }
    }
    function stopWarSoundscape() {
      try { if (warSoundscape) warSoundscape.stop(); } catch (err) { /* no-op */ }
    }
    function getWarSoundscapeDebugState() {
      return warSoundscape ? warSoundscape.getDebugState() : { running: false, intensity: 0, activeVoices: 0, maxVoices: 0 };
    }

    function stopEffects() {
      dbg('stopEffects invoked');
      stopBootNoise();
      stopCrash();
      stopWarSoundscape();
      stopTicTacToeMarks();
    }

    function setMuted(value) {
      muted = !!value;
      dbg('setMuted(', muted, ')');
      if (!masterGain) return;
      var target = muted ? 0 : masterVolume;
      // Setting .value directly is the reliable, immediate way to change a
      // gain with no pending automation curve — scheduling a *new* automation
      // event via setValueAtTime(target, ctx.currentTime) is not guaranteed
      // to be honored if it lands exactly "now" from the audio thread's
      // point of view, so treat the direct assignment as the source of
      // truth and the scheduled call below as a best-effort complement (it
      // also cancels any leftover automation curve from an effect's own fade).
      masterGain.gain.value = target;
      if (ctx) {
        try {
          masterGain.gain.cancelScheduledValues(ctx.currentTime);
          masterGain.gain.setValueAtTime(target, ctx.currentTime);
        } catch (err) { /* .value assignment above already took effect */ }
      }
    }
    function isMuted() { return muted; }

    function setVolume(value) {
      if (typeof value !== 'number' || !isFinite(value)) return;
      masterVolume = Math.max(0, Math.min(1, value));
      if (masterGain && ctx && !muted) {
        try {
          masterGain.gain.cancelScheduledValues(ctx.currentTime);
          masterGain.gain.setValueAtTime(masterVolume, ctx.currentTime);
        } catch (err) {
          masterGain.gain.value = masterVolume;
        }
      }
    }

    // Full teardown: stops effects, closes the AudioContext, clears all
    // state. Used when leaving the game entirely (return to splash) or in
    // tests; a later unlockFromGesture() call creates a fresh context.
    function reset() {
      dbg('reset invoked');
      stopEffects();
      if (ctx) {
        try { ctx.close(); } catch (err) { /* no-op */ }
      }
      ctx = null;
      masterGain = null;
      compressor = null;
      contextConfirmedRunning = false;
    }

    function getDebugState() {
      return {
        hasContext: !!ctx,
        state: ctx ? ctx.state : null,
        confirmedRunning: contextConfirmedRunning,
        muted: muted,
        volume: masterVolume
      };
    }

    return {
      unlockFromGesture: unlockFromGesture,
      ensureRunningFromGesture: ensureRunningFromGesture,
      playBootNoise: playBootNoise,
      playTicTacToeCrash: playTicTacToeCrash,
      playTicTacToeMark: playTicTacToeMark,
      stopTicTacToeMarks: stopTicTacToeMarks,
      stopEffects: stopEffects,
      startWarSoundscape: startWarSoundscape,
      setWarIntensity: setWarIntensity,
      playMissileLaunch: playMissileLaunch,
      playMissileFlight: playMissileFlight,
      playWarImpact: playWarImpact,
      playAutomaticFireBurst: playAutomaticFireBurst,
      stopWarSoundscape: stopWarSoundscape,
      getWarSoundscapeDebugState: getWarSoundscapeDebugState,
      setMuted: setMuted,
      isMuted: isMuted,
      setVolume: setVolume,
      reset: reset,
      getDebugState: getDebugState,
      BOOT_NOISE_DEFAULT_DURATION_MS: BOOT_NOISE_DEFAULT_DURATION_MS,
      _internal: {
        getContext: getContext,
        isContextConfirmedRunning: function () { return contextConfirmedRunning; },
        getMasterGain: function () { return masterGain; }
      }
    };
  }

  var defaultInstance = createAudioManager();
  var api = { createAudioManager: createAudioManager };
  Object.keys(defaultInstance).forEach(function (key) { api[key] = defaultInstance[key]; });
  return api;
});
