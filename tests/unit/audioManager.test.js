// Copyright (C) 2025-2026 Marco Iannacone
// SPDX-License-Identifier: AGPL-3.0-only
'use strict';

// Unit tests for src/audio/audioManager.js — the single-document standalone
// audio controller. Where the spec asks to verify a generated
// signal is "non-silent", this suite reads back the actual sample data
// written into the fake AudioContext's buffers (real Float32Array values
// produced by the production code's own fill loop) and computes RMS/peak on
// them — not just asserting that a function was called.

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { createAudioManager } = require(path.join('..', '..', 'src', 'audio', 'audioManager.js'));

function makeFakeNode(extra) {
  return Object.assign({ connect() {}, disconnect() {} }, extra);
}
function makeFakeAudioParam(initial) {
  const events = [];
  return {
    value: initial != null ? initial : 1,
    setValueAtTime(v, t) { this.value = v; events.push(['set', v, t]); },
    linearRampToValueAtTime(v, t) { this.value = v; events.push(['lin', v, t]); },
    exponentialRampToValueAtTime(v, t) { this.value = v; events.push(['exp', v, t]); },
    cancelScheduledValues() { events.push(['cancel']); },
    _events: events
  };
}

class FakeAudioContext {
  constructor(opts = {}) {
    this.state = opts.initialState || 'suspended';
    this.sampleRate = 44100;
    this.currentTime = 0;
    this.destination = makeFakeNode();
    this._resumeCalls = 0;
    this._closedCalls = 0;
    this._buffersCreated = [];
    this._sourcesStarted = [];
    this._sourcesStopped = 0;
    this._nodesDisconnected = 0;
  }
  resume() {
    this._resumeCalls++;
    this.state = 'running';
    return Promise.resolve();
  }
  close() { this._closedCalls++; this.state = 'closed'; return Promise.resolve(); }
  createGain() { return makeFakeNode({ gain: makeFakeAudioParam(1) }); }
  createDynamicsCompressor() { return makeFakeNode({ threshold: {}, knee: {}, ratio: {}, attack: {}, release: {} }); }
  createBiquadFilter() { return makeFakeNode({ type: '', frequency: makeFakeAudioParam(0), Q: { value: 1 } }); }
  createWaveShaper() { return makeFakeNode({ curve: null, oversample: '' }); }
  createBuffer(channels, length) {
    const data = new Float32Array(length);
    const buf = { length, sampleRate: this.sampleRate, getChannelData: () => data };
    this._buffersCreated.push(buf);
    return buf;
  }
  createBufferSource() {
    const self = this;
    const source = makeFakeNode({
      buffer: null,
      start(t) { self._sourcesStarted.push({ source: this, t }); },
      stop() { self._sourcesStopped++; }
    });
    const origDisconnect = source.disconnect;
    source.disconnect = function () { self._nodesDisconnected++; return origDisconnect.call(this); };
    return source;
  }
  createOscillator() {
    return makeFakeNode({ type: '', frequency: makeFakeAudioParam(440), start() {}, stop() {} });
  }
}

function rms(arr) {
  let sum = 0;
  for (let i = 0; i < arr.length; i++) sum += arr[i] * arr[i];
  return Math.sqrt(sum / arr.length);
}
function peak(arr) {
  let m = 0;
  for (let i = 0; i < arr.length; i++) m = Math.max(m, Math.abs(arr[i]));
  return m;
}

async function tick(ms = 0) { return new Promise((r) => setTimeout(r, ms)); }

// --- 1) no AudioContext before BOOT click ---

test('1) no AudioContext exists until an unlock/effect call is made', () => {
  const am = createAudioManager({ AudioContextCtor: FakeAudioContext });
  assert.equal(am._internal.getContext.toString().length > 0, true); // sanity: function exists
  // Nothing has been called yet — internal ctx must still be null.
  assert.equal(am.getDebugState().hasContext, false);
});

// --- 2) unlock called synchronously from the click (behavioral contract, not just call presence) ---

test('2) unlockFromGesture() creates the context and attempts resume synchronously (no await needed by the caller)', () => {
  const am = createAudioManager({ AudioContextCtor: FakeAudioContext });
  am.unlockFromGesture();
  // Context must exist immediately after the synchronous call returns.
  assert.equal(am.getDebugState().hasContext, true);
});

// --- 3) state running after the gesture ---

test('3) state is confirmed "running" shortly after unlockFromGesture()', async () => {
  const am = createAudioManager({ AudioContextCtor: FakeAudioContext });
  am.unlockFromGesture();
  await tick(10);
  assert.equal(am.getDebugState().confirmedRunning, true);
  assert.equal(am.getDebugState().state, 'running');
});

// --- 4) non-blocking fallback if it stays suspended ---

test('4) if resume() never actually reaches "running", playBootNoise() still resolves (non-blocking fallback)', async () => {
  class StuckContext extends FakeAudioContext {
    resume() { this._resumeCalls++; return Promise.resolve(); /* state stays suspended */ }
  }
  const am = createAudioManager({ AudioContextCtor: StuckContext });
  am.unlockFromGesture();
  await tick(10);
  assert.equal(am.getDebugState().confirmedRunning, false);
  await assert.doesNotReject(am.playBootNoise({ durationMs: 60 }));
});

// --- 5) exactly one AudioContext per session ---

test('5) only one AudioContext is created across multiple unlock/effect calls', async () => {
  let constructCount = 0;
  class CountingContext extends FakeAudioContext {
    constructor(opts) { super(opts); constructCount++; }
  }
  const am = createAudioManager({ AudioContextCtor: CountingContext });
  am.unlockFromGesture();
  am.ensureRunningFromGesture();
  await am.playBootNoise({ durationMs: 30 });
  await am.playTicTacToeCrash({ durationMs: 30 });
  assert.equal(constructCount, 1);
});

// --- 6) silent unlock tick created ---

test('6) unlockFromGesture() creates and starts a real (1-sample) silent buffer source', () => {
  const am = createAudioManager({ AudioContextCtor: FakeAudioContext });
  am.unlockFromGesture();
  const ctx = am._internal.getContext();
  const tickBuffer = ctx._buffersCreated.find((b) => b.length === 1);
  assert.ok(tickBuffer, 'a 1-sample buffer was created for the unlock tick');
  assert.ok(ctx._sourcesStarted.length >= 1, 'a buffer source was started');
});

// --- 7) boot sound generates a non-silent signal ---

test('7) playBootNoise() writes non-zero, non-silent sample data into its noise buffer', async () => {
  const am = createAudioManager({ AudioContextCtor: FakeAudioContext });
  am.unlockFromGesture();
  await tick(5);
  const ctx = am._internal.getContext();
  await am.playBootNoise({ durationMs: 40 });
  const noiseBuffers = ctx._buffersCreated.filter((b) => b.length > 1);
  assert.ok(noiseBuffers.length >= 1, 'a noise bed buffer was created');
  const data = noiseBuffers[noiseBuffers.length - 1].getChannelData(0);
  assert.ok(rms(data) > 0, 'boot noise RMS must be greater than zero');
  assert.ok(peak(data) > 0, 'boot noise peak must be greater than zero');
});

// --- 8) crash sound generates a non-silent signal ---

test('8) playTicTacToeCrash() writes non-zero, non-silent sample data into its noise buffer', async () => {
  const am = createAudioManager({ AudioContextCtor: FakeAudioContext });
  am.unlockFromGesture();
  await tick(5);
  const ctx = am._internal.getContext();
  await am.playTicTacToeCrash({ durationMs: 40 });
  const noiseBuffers = ctx._buffersCreated.filter((b) => b.length > 1);
  assert.ok(noiseBuffers.length >= 1, 'a crash noise buffer was created');
  const data = noiseBuffers[noiseBuffers.length - 1].getChannelData(0);
  assert.ok(rms(data) > 0, 'crash RMS must be greater than zero');
  assert.ok(peak(data) > 0, 'crash peak must be greater than zero');
});

// --- 9) RMS and peak greater than zero (both effects, explicit numeric check) ---

test('9) both effects: RMS and peak are strictly greater than zero', async () => {
  const am = createAudioManager({ AudioContextCtor: FakeAudioContext });
  am.unlockFromGesture();
  await tick(5);
  const ctx = am._internal.getContext();

  await am.playBootNoise({ durationMs: 30 });
  const bootData = ctx._buffersCreated[ctx._buffersCreated.length - 1].getChannelData(0);
  assert.ok(rms(bootData) > 0 && peak(bootData) > 0);

  await am.playTicTacToeCrash({ durationMs: 30 });
  const crashData = ctx._buffersCreated[ctx._buffersCreated.length - 1].getChannelData(0);
  assert.ok(rms(crashData) > 0 && peak(crashData) > 0);
});

// --- 10) peak stays within a safe bound (never true clipping) ---

test('10) generated noise sample peak stays within a safe amplitude bound (no clipping)', async () => {
  const am = createAudioManager({ AudioContextCtor: FakeAudioContext });
  am.unlockFromGesture();
  await tick(5);
  const ctx = am._internal.getContext();

  await am.playBootNoise({ durationMs: 30 });
  const bootData = ctx._buffersCreated[ctx._buffersCreated.length - 1].getChannelData(0);
  assert.ok(peak(bootData) <= 1.0, 'boot noise samples must never exceed full scale');

  await am.playTicTacToeCrash({ durationMs: 30 });
  const crashData = ctx._buffersCreated[ctx._buffersCreated.length - 1].getChannelData(0);
  assert.ok(peak(crashData) <= 1.0, 'crash noise samples must never exceed full scale');
});

// --- 11) boot duration ~5s ---

test('11) playBootNoise() default duration is ~5000ms', async () => {
  const am = createAudioManager({ AudioContextCtor: FakeAudioContext });
  am.unlockFromGesture();
  await tick(5);
  const ctx = am._internal.getContext();
  am.playBootNoise(); // no opts — use the real default; don't await full 5s completion
  await tick(20); // let the (async, but quick) buffer-creation step run
  // The redesigned boot effect creates several buffers (noise bed, relay
  // clicks, the closing sweep) — the *longest* one is the full-duration
  // noise bed, which is what "duration ~5s" actually refers to.
  const longestBuffer = ctx._buffersCreated.reduce((a, b) => (b.length > a.length ? b : a));
  const seconds = longestBuffer.length / ctx.sampleRate;
  assert.ok(Math.abs(seconds - 5) < 0.05, `expected ~5s, got ${seconds}s`);
  assert.equal(am.BOOT_NOISE_DEFAULT_DURATION_MS, 5000, 'single source of truth for the default, exposed so callers/tests never hardcode it');
  am.stopEffects(); // cleanup so the effect doesn't keep a timer alive
});

// --- 12) crash duration ~4-5s ---

test('12) playTicTacToeCrash() default duration is within 4-5s', async () => {
  const am = createAudioManager({ AudioContextCtor: FakeAudioContext });
  am.unlockFromGesture();
  await tick(5);
  const ctx = am._internal.getContext();
  am.playTicTacToeCrash(); // no opts — use the real default; don't await full duration
  await tick(20); // let the (async, but quick) buffer-creation step run
  const noiseBuffer = ctx._buffersCreated[ctx._buffersCreated.length - 1];
  const seconds = noiseBuffer.length / ctx.sampleRate;
  assert.ok(seconds >= 4 && seconds <= 5, `expected 4-5s, got ${seconds}s`);
  am.stopEffects(); // cleanup so the effect doesn't keep a timer alive
});

// --- 13) finished nodes are disconnected ---

test('13) once an effect ends, its nodes are stopped and disconnected', async () => {
  const am = createAudioManager({ AudioContextCtor: FakeAudioContext });
  am.unlockFromGesture();
  await tick(5);
  const ctx = am._internal.getContext();
  const stoppedBefore = ctx._sourcesStopped;
  const disconnectedBefore = ctx._nodesDisconnected;
  await am.playBootNoise({ durationMs: 30 });
  assert.ok(ctx._sourcesStopped > stoppedBefore, 'sources were stopped on completion');
  assert.ok(ctx._nodesDisconnected > disconnectedBefore, 'nodes were disconnected on completion');
});

// --- 14/15) mute/unmute affect masterGain ---

test('14) setMuted(true) brings the master gain to zero', () => {
  const am = createAudioManager({ AudioContextCtor: FakeAudioContext });
  am.unlockFromGesture();
  am.setMuted(true);
  const gain = am._internal.getMasterGain();
  assert.equal(gain.gain.value, 0);
});

test('15) setMuted(false) restores the previous master volume', () => {
  const am = createAudioManager({ AudioContextCtor: FakeAudioContext, initialVolume: 0.7 });
  am.unlockFromGesture();
  am.setMuted(true);
  assert.equal(am._internal.getMasterGain().gain.value, 0);
  am.setMuted(false);
  assert.equal(am._internal.getMasterGain().gain.value, 0.7);
});

// --- 16) reset eliminates nodes and timers ---

test('16) reset() closes the AudioContext and clears internal state; a later call creates a fresh one', async () => {
  let constructCount = 0;
  class CountingContext extends FakeAudioContext {
    constructor(opts) { super(opts); constructCount++; }
  }
  const am = createAudioManager({ AudioContextCtor: CountingContext });
  am.unlockFromGesture();
  await tick(5);
  const firstCtx = am._internal.getContext();
  am.reset();
  assert.equal(firstCtx._closedCalls, 1);
  assert.equal(am.getDebugState().hasContext, false);
  am.unlockFromGesture();
  assert.equal(constructCount, 2, 'a fresh AudioContext is created after reset()');
});

test('16) reset() resolves any in-flight effect promptly instead of leaving it pending', async () => {
  const am = createAudioManager({ AudioContextCtor: FakeAudioContext });
  am.unlockFromGesture();
  await tick(5);
  const p = am.playTicTacToeCrash({ durationMs: 10000 });
  await tick(10);
  const start = Date.now();
  am.reset();
  await p;
  assert.ok(Date.now() - start < 200);
});

// --- 17) ZERO calls ensureRunningFromGesture before startZeroPlayerMode (static source check) ---

test('17) game.js calls ensureRunningFromGesture() synchronously, before the await, in the ZERO Y/S branch', () => {
  const fs = require('node:fs');
  const gameJsPath = path.join(__dirname, '..', '..', 'src', 'app', 'game.js');
  const source = fs.readFileSync(gameJsPath, 'utf8');
  const m = source.match(/if\(\['Y','S'\]\.includes\(key\)\)\{[^}]*\}/);
  assert.ok(m, 'ZERO-confirm Y/S branch found');
  const branch = m[0];
  const unlockIdx = branch.indexOf('JoshuaAudioManager.ensureRunningFromGesture(');
  const awaitIdx = branch.indexOf('await startZeroPlayerMode()');
  assert.ok(unlockIdx > -1, 'ensureRunningFromGesture() call present');
  assert.ok(awaitIdx > -1, 'await startZeroPlayerMode() present');
  assert.ok(unlockIdx < awaitIdx, 'ensureRunningFromGesture() must run before the await');
});

// --- 18) crash starts exactly once ---

test('18) starting a second crash while one is active does not layer a duplicate — only one is ever in flight', async () => {
  const am = createAudioManager({ AudioContextCtor: FakeAudioContext });
  am.unlockFromGesture();
  await tick(5);
  const ctx = am._internal.getContext();

  const first = am.playTicTacToeCrash({ durationMs: 5000 });
  await tick(10);
  const noiseBuffersAfterFirst = ctx._buffersCreated.filter((b) => b.length > 1).length;
  const second = am.playTicTacToeCrash({ durationMs: 30 });
  await Promise.all([first, second]);
  const noiseBuffersAfterSecond = ctx._buffersCreated.filter((b) => b.length > 1).length;
  // Starting a new crash cancels/replaces the previous one (same pattern as
  // the multi-document reboot player); it must not still be "active" after.
  // The redesigned crash creates 2 buffers per invocation (the digital-
  // collapse burst + the main noise bed) — a fresh invocation always adds
  // exactly one more full set, never layering with a still-active previous one.
  assert.equal(noiseBuffersAfterSecond, noiseBuffersAfterFirst + 2);
});

// --- 19) total audio failure does not block the reboot ---

test('19) no AudioContext at all: playTicTacToeCrash() still resolves quickly, never blocking the caller', async () => {
  const am = createAudioManager({ AudioContextCtor: undefined });
  const start = Date.now();
  await assert.doesNotReject(am.playTicTacToeCrash({ durationMs: 30 }));
  assert.ok(Date.now() - start < 500);
});

test('19) a context construction failure does not throw from unlockFromGesture() or ensureRunningFromGesture()', () => {
  class ThrowingContext { constructor() { throw new Error('boom'); } }
  const am = createAudioManager({ AudioContextCtor: ThrowingContext });
  assert.doesNotThrow(() => am.unlockFromGesture());
  assert.doesNotThrow(() => am.ensureRunningFromGesture());
});

// --- 20) return to splash stops effects (TTS coordination is game.js's job; verified there) ---

test('20) stopEffects() stops both an active boot noise and an active crash', async () => {
  const am = createAudioManager({ AudioContextCtor: FakeAudioContext });
  am.unlockFromGesture();
  await tick(5);
  const bootP = am.playBootNoise({ durationMs: 5000 });
  const crashP = am.playTicTacToeCrash({ durationMs: 5000 });
  await tick(10);
  const start = Date.now();
  am.stopEffects();
  await Promise.all([bootP, crashP]);
  assert.ok(Date.now() - start < 200);
});

test('20) reset() also stops effects (used by return-to-splash for full teardown)', async () => {
  const am = createAudioManager({ AudioContextCtor: FakeAudioContext });
  am.unlockFromGesture();
  await tick(5);
  const p = am.playBootNoise({ durationMs: 5000 });
  await tick(10);
  am.reset();
  await p;
  assert.equal(am.getDebugState().hasContext, false);
});
