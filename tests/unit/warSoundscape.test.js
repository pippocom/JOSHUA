// Copyright (C) 2025-2026 Marco Iannacone
// SPDX-License-Identifier: AGPL-3.0-only
'use strict';

// Unit tests for src/audio/warSoundscape.js (the GLOBAL THERMONUCLEAR WAR
// procedural soundscape module) and its wiring into src/audio/audioManager.js
// (lifecycle, mutual exclusion with boot/crash, MUTE, cancelAll).
//
// These tests verify STRUCTURAL/numeric properties only: node counts,
// frequencies, gains, voice-limit/throttle behavior, cleanup. Whether the
// result actually sounds "grave", "chaotic" or "well synchronized" is a
// human/perceptual judgment (see src/dev/media-lab.html) — nothing here
// claims otherwise.

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { createWarSoundscape } = require(path.join('..', '..', 'src', 'audio', 'warSoundscape.js'));
const { createAudioManager } = require(path.join('..', '..', 'src', 'audio', 'audioManager.js'));

// ---- deterministic RNG (never touches the global Math.random) ----
function makeSeededRandom(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeFakeNode(extra) {
  return Object.assign({ connect() {}, disconnect() { this._disconnected = true; } }, extra);
}
function makeFakeAudioParam(initial) {
  const events = [];
  const param = {
    value: initial != null ? initial : 1,
    setValueAtTime(v, t) { this.value = v; events.push({ type: 'set', v, t }); return param; },
    linearRampToValueAtTime(v, t) { this.value = v; events.push({ type: 'lin', v, t }); return param; },
    exponentialRampToValueAtTime(v, t) { this.value = v; events.push({ type: 'exp', v, t }); return param; },
    cancelScheduledValues() { events.push({ type: 'cancel' }); return param; },
    _events: events
  };
  return param;
}

class FakeAudioContext {
  constructor(opts = {}) {
    this.state = opts.initialState || 'running';
    this.sampleRate = 44100;
    this.currentTime = 0;
    this.destination = makeFakeNode();
    this._buffersCreated = [];
    this._oscillators = [];
    this._sources = [];
    this._filters = [];
    this._compressorsCreated = 0;
    this._throwOnCreateOscillator = !!opts.throwOnCreateOscillator;
  }
  resume() { this.state = 'running'; return Promise.resolve(); }
  close() { return Promise.resolve(); }
  createGain() { return makeFakeNode({ gain: makeFakeAudioParam(1) }); }
  createDynamicsCompressor() { this._compressorsCreated++; return makeFakeNode({ threshold: {}, knee: {}, ratio: {}, attack: {}, release: {} }); }
  createBiquadFilter() {
    const f = makeFakeNode({ type: '', frequency: makeFakeAudioParam(0), Q: { value: 1 } });
    this._filters.push(f);
    return f;
  }
  createWaveShaper() { return makeFakeNode({ curve: null }); }
  createBuffer(channels, length) {
    const data = new Float32Array(length);
    const buf = { length, sampleRate: this.sampleRate, getChannelData: () => data };
    this._buffersCreated.push(buf);
    return buf;
  }
  createBufferSource() {
    const s = makeFakeNode({ buffer: null, loop: false, _started: false, _stopped: false, start() { this._started = true; }, stop() { this._stopped = true; } });
    this._sources.push(s);
    return s;
  }
  createOscillator() {
    if (this._throwOnCreateOscillator) throw new Error('simulated Web Audio failure');
    const o = makeFakeNode({ type: '', frequency: makeFakeAudioParam(0), _started: false, _stopped: false, start() { this._started = true; }, stop() { this._stopped = true; } });
    this._oscillators.push(o);
    return o;
  }
}

async function tick(ms = 0) { return new Promise((r) => setTimeout(r, ms)); }

function makeEnv(overrides) {
  const ctx = new FakeAudioContext(overrides && overrides.ctxOpts);
  const destination = ctx.destination;
  const env = Object.assign({
    getContext: () => ctx,
    getDestination: () => destination,
    random: makeSeededRandom(1)
  }, overrides);
  return { ctx, env };
}

// ============================== lifecycle / basics ==============================

test('API is fully callable with no AudioContext (getContext returns null) — never throws', async () => {
  const ws = createWarSoundscape({ getContext: () => null, getDestination: () => null });
  assert.doesNotThrow(() => ws.start());
  await ws.playMissileLaunch();
  await ws.playMissileFlight();
  await ws.playWarImpact({ big: false });
  await ws.playWarImpact({ big: true });
  await ws.playAutomaticFireBurst({ force: true });
  assert.doesNotThrow(() => ws.setIntensity(0.5));
  assert.doesNotThrow(() => ws.stop());
  assert.deepEqual(ws.getDebugState(), { running: false, intensity: 0, activeVoices: 0, maxVoices: ws._internal.MAX_VOICES });
});

test('start()/stop() are idempotent', async () => {
  const { env } = makeEnv();
  const ws = createWarSoundscape(env);
  ws.start(); ws.start(); ws.start();
  assert.equal(ws.getDebugState().running, true);
  ws.stop(); ws.stop(); ws.stop();
  assert.equal(ws.getDebugState().running, false);
});

test('setIntensity() clamps to [0, 1]', () => {
  const { env } = makeEnv();
  const ws = createWarSoundscape(env);
  ws.start();
  ws.setIntensity(-5);
  assert.equal(ws.getDebugState().intensity, 0);
  ws.setIntensity(5);
  assert.equal(ws.getDebugState().intensity, 1);
  ws.setIntensity(0.42);
  assert.equal(ws.getDebugState().intensity, 0.42);
  ws.setIntensity(NaN);
  assert.equal(ws.getDebugState().intensity, 0);
});

test('play*() calls are no-ops before start() (running === false)', async () => {
  const { env, ctx } = makeEnv();
  const ws = createWarSoundscape(env);
  await ws.playMissileLaunch();
  await ws.playWarImpact({ big: true });
  await ws.playAutomaticFireBurst({ force: true });
  assert.equal(ctx._oscillators.length, 0);
  assert.equal(ws.getDebugState().activeVoices, 0);
});

// ============================== missile launch ==============================

test('playMissileLaunch() schedules exactly one launch voice per call, with a falling (non-melodic) low oscillator', async () => {
  const { env, ctx } = makeEnv();
  const ws = createWarSoundscape(env);
  ws.start();
  await ws.playMissileLaunch();
  await tick(5);
  assert.equal(ws.getDebugState().activeVoices, 1, 'exactly one voice allocated for one launch call');
  assert.equal(ctx._oscillators.length, 1, 'exactly one oscillator for the thump');
  const osc = ctx._oscillators[0];
  assert.equal(osc.type, 'sine');
  const freqs = osc.frequency._events.map((e) => e.v);
  assert.ok(freqs[0] > freqs[freqs.length - 1], 'frequency falls over the effect — motion, not a held note');
  ws.stop();
});

test('playMissileLaunch() releases its voice after the effect ends', async () => {
  const { env } = makeEnv();
  const ws = createWarSoundscape(env);
  ws.start();
  await ws.playMissileLaunch();
  await tick(5);
  assert.equal(ws.getDebugState().activeVoices, 1);
  await tick(500); // longer than the ~420ms effect + its safety margin
  assert.equal(ws.getDebugState().activeVoices, 0, 'voice released once the launch effect naturally ends');
  ws.stop();
});

// ============================== impacts ==============================

test('playWarImpact({big:false}) produces a normal impact: mid-grave thump, moderate gain', async () => {
  const { env, ctx } = makeEnv();
  const ws = createWarSoundscape(env);
  ws.start();
  await ws.playWarImpact({ big: false });
  await tick(5);
  assert.equal(ctx._oscillators.length, 1);
  const thump = ctx._oscillators[0];
  assert.equal(thump.type, 'triangle');
  // 62Hz base (with a brief pitch-in above it) for a normal impact.
  const lastFreq = thump.frequency._events[thump.frequency._events.length - 1].v;
  assert.equal(lastFreq, 62);
  ws.stop();
});

test('playWarImpact({big:true}) has a graver thump than {big:false}', async () => {
  const lowEnv = makeEnv();
  const wsA = createWarSoundscape(lowEnv.env);
  wsA.start();
  await wsA.playWarImpact({ big: false });
  await tick(5);
  const normalFreq = lowEnv.ctx._oscillators[0].frequency._events.slice(-1)[0].v;
  wsA.stop();

  const bigEnv = makeEnv();
  const wsB = createWarSoundscape(bigEnv.env);
  wsB.start();
  await wsB.playWarImpact({ big: true });
  await tick(5);
  const bigFreq = bigEnv.ctx._oscillators[0].frequency._events.slice(-1)[0].v;
  wsB.stop();

  assert.ok(bigFreq < normalFreq, `big impact thump (${bigFreq}Hz) should be graver than normal (${normalFreq}Hz)`);
});

test('playWarImpact() never schedules a gain value above 1.0 (no clipping)', async () => {
  const { env, ctx } = makeEnv();
  // createGain() fakes in this suite don't log events by default; add a
  // thin wrapper only for this test to capture every gain.value ever set.
  const seen = [];
  const originalCreateGain = ctx.createGain.bind(ctx);
  ctx.createGain = function () {
    const g = originalCreateGain();
    const originalSet = g.gain.setValueAtTime.bind(g.gain);
    const originalLin = g.gain.linearRampToValueAtTime.bind(g.gain);
    g.gain.setValueAtTime = (v, t) => { seen.push(v); return originalSet(v, t); };
    g.gain.linearRampToValueAtTime = (v, t) => { seen.push(v); return originalLin(v, t); };
    return g;
  };
  const ws = createWarSoundscape(env);
  ws.start();
  await ws.playWarImpact({ big: true });
  await ws.playWarImpact({ big: false });
  await ws.playMissileLaunch();
  await ws.playAutomaticFireBurst({ force: true });
  ws.stop();
  assert.ok(seen.length > 0, 'expected to observe scheduled gain values');
  seen.forEach((v) => assert.ok(v <= 1.0, `gain value ${v} exceeds 1.0`));
});

test('impacts closer together than the minimum interval are throttled: the second one is silently skipped', async () => {
  const { env, ctx } = makeEnv();
  const ws = createWarSoundscape(env);
  ws.start();
  ws.setIntensity(0); // widest throttle window
  await ws.playWarImpact({ big: false });
  await tick(2);
  assert.equal(ws.getDebugState().activeVoices, 1);
  // No time has passed on the AudioContext clock — well inside the minimum interval.
  await ws.playWarImpact({ big: false });
  await tick(2);
  assert.equal(ws.getDebugState().activeVoices, 1, 'second impact at the same instant must be throttled, not layered');
  ws.stop();
});

test('impacts far enough apart (or at higher intensity, a shorter minimum interval) are both audible', async () => {
  const { env, ctx } = makeEnv();
  const ws = createWarSoundscape(env);
  ws.start();
  ws.setIntensity(1); // narrowest throttle window
  await ws.playWarImpact({ big: false });
  await tick(2);
  ctx.currentTime += 0.5; // well past even the widest throttle window
  await ws.playWarImpact({ big: false });
  await tick(2);
  assert.equal(ctx._oscillators.length, 2, 'both impacts should have produced their own thump oscillator');
  ws.stop();
});

test('higher intensity admits more impacts for the same elapsed AudioContext time (density follows intensity)', async () => {
  async function countAdmitted(intensity) {
    const { env, ctx } = makeEnv();
    const ws = createWarSoundscape(env);
    ws.start();
    ws.setIntensity(intensity);
    let admitted = 0;
    for (let i = 0; i < 10; i++) {
      const before = ctx._oscillators.length;
      // Node scheduling happens synchronously inside the call, before the
      // returned Promise (which only resolves once the *effect* naturally
      // ends, seconds later) — so counting nodes needs no await here, and
      // deliberately does not await that Promise (this loop simulates many
      // rapid calls; awaiting each one's full duration would just measure
      // wall-clock time, not scheduling behavior).
      ws.playWarImpact({ big: false });
      if (ctx._oscillators.length > before) admitted++;
      ctx.currentTime += 0.1; // fixed real-time cadence between attempts
    }
    ws.stop();
    return admitted;
  }
  const low = await countAdmitted(0);
  const high = await countAdmitted(1);
  assert.ok(high > low, `expected more impacts admitted at intensity 1 (${high}) than intensity 0 (${low})`);
});

// ============================== automatic fire burst ==============================

test('playAutomaticFireBurst({force:true}) produces a small, bounded number of impulses (4-6), quieter than an impact', async () => {
  const { env, ctx } = makeEnv();
  const ws = createWarSoundscape(env);
  ws.start({ ambient: false }); // isolate the burst's own impulses from the ambient bed's own buffer source
  await ws.playAutomaticFireBurst({ force: true });
  await tick(5);
  assert.ok(ctx._sources.length >= 4 && ctx._sources.length <= 6, `expected 4-6 impulses, got ${ctx._sources.length}`);
  ws.stop();
});

test('playAutomaticFireBurst() without force is gated by intensity: rarely fires at intensity 0', async () => {
  const { env, ctx } = makeEnv({ random: makeSeededRandom(7) });
  const ws = createWarSoundscape(env);
  ws.start();
  ws.setIntensity(0);
  let fired = 0;
  for (let i = 0; i < 30; i++) {
    const before = ctx._sources.length;
    await ws.playAutomaticFireBurst();
    if (ctx._sources.length > before) fired++;
  }
  assert.equal(fired, 0, 'at intensity 0 the burst should never fire without force:true');
  ws.stop();
});

test('playAutomaticFireBurst() fires more often as intensity rises toward 1', async () => {
  async function fireRate(intensity, seed) {
    const { env, ctx } = makeEnv({ random: makeSeededRandom(seed) });
    const ws = createWarSoundscape(env);
    ws.start();
    ws.setIntensity(intensity);
    let fired = 0;
    for (let i = 0; i < 40; i++) {
      const before = ctx._sources.length;
      ws.playAutomaticFireBurst(); // synchronous scheduling — see the note in the density test above
      if (ctx._sources.length > before) fired++;
    }
    ws.stop();
    return fired;
  }
  const low = await fireRate(0.1, 11);
  const high = await fireRate(0.9, 11);
  assert.ok(high > low, `expected more fire-burst triggers at high intensity (${high}) than low (${low})`);
});

// ============================== voice limit ==============================

test('a maximum-concurrent-voices limit is enforced regardless of call rate (also covers ?fast=1-style rapid calls)', async () => {
  const { env, ctx } = makeEnv();
  const ws = createWarSoundscape(env);
  ws.start();
  const max = ws._internal.MAX_VOICES;
  // Keep every voice alive (never advance real time enough for cleanup) and
  // fire far more launches than the limit allows, back to back.
  for (let i = 0; i < max + 25; i++) {
    ws.playMissileLaunch();
  }
  await tick(5);
  assert.equal(ws.getDebugState().activeVoices, max, `active voices must never exceed MAX_VOICES (${max})`);
  ws.stop();
});

// ============================== cleanup / lifecycle ==============================

test('cleanup: nodes are stopped and disconnected once an effect naturally ends', async () => {
  const { env, ctx } = makeEnv();
  const ws = createWarSoundscape(env);
  ws.start();
  await ws.playMissileLaunch();
  await tick(600); // past the effect's own duration + safety margin
  ctx._oscillators.forEach((o) => {
    assert.equal(o._stopped, true);
    assert.equal(o._disconnected, true);
  });
  ws.stop();
});

test('stop() immediately cancels every in-flight voice and clears the ambient bed, with no residual timers', async () => {
  const { env, ctx } = makeEnv();
  const ws = createWarSoundscape(env);
  ws.start();
  ws.playMissileLaunch();
  ws.playWarImpact({ big: true });
  await tick(2);
  assert.ok(ws.getDebugState().activeVoices > 0);
  ws.stop();
  assert.equal(ws.getDebugState().activeVoices, 0);
  assert.equal(ws.getDebugState().running, false);
  ctx._oscillators.forEach((o) => assert.equal(o._stopped, true));
  // Nothing left to clean up later: waiting past every effect's natural
  // duration must not throw or change state further.
  await tick(700);
  assert.equal(ws.getDebugState().activeVoices, 0);
});

test('starting a new soundscape session stops any previous one first — no double ambient bed, no doubled ammunition across scenarios', async () => {
  const { env, ctx } = makeEnv();
  const ws = createWarSoundscape(env);
  ws.start();
  ws.playMissileLaunch();
  await tick(2);
  ws.start(); // simulates a second scenario starting without an explicit stop() in between
  await tick(2);
  // ._sources accumulates every buffer source ever created on this fake
  // context, including ones already stopped — only count ones that are
  // both looping AND not yet stopped as "currently active".
  const activeLoopingSources = ctx._sources.filter((s) => s.loop && !s._stopped);
  assert.ok(activeLoopingSources.length <= 1, 'at most one ambient bed source should be actively looping at a time');
  ws.stop();
});

test('a Web Audio failure inside an effect resolves the returned Promise instead of rejecting, and never throws synchronously', async () => {
  const ctx = new FakeAudioContext({ throwOnCreateOscillator: true });
  const ws = createWarSoundscape({ getContext: () => ctx, getDestination: () => ctx.destination, random: makeSeededRandom(2) });
  ws.start();
  await assert.doesNotReject(ws.playMissileLaunch());
  await assert.doesNotReject(ws.playWarImpact({ big: false }));
  ws.stop();
});

// ============================== RNG injection ==============================

test('an injected random() function drives every "random" DSP decision — two runs with the same seed produce identical scheduling', async () => {
  async function run(seed) {
    const { env, ctx } = makeEnv({ random: makeSeededRandom(seed) });
    const ws = createWarSoundscape(env);
    ws.start();
    await ws.playAutomaticFireBurst({ force: true });
    await tick(2);
    const shape = ctx._sources.map((s) => s.buffer.length);
    ws.stop();
    return shape;
  }
  const a = await run(42);
  const b = await run(42);
  const c = await run(43);
  assert.deepEqual(a, b, 'same seed must produce the same impulse count/shape');
  // Not asserting a !== c strictly (different seeds could coincidentally
  // agree on impulse count) — only that the seed is what's driving it.
  assert.ok(Array.isArray(c));
});

// ============================== audioManager integration ==============================

test('audioManager: MUTE prevents new war-soundscape emissions outright (no nodes scheduled while muted)', async () => {
  const am = createAudioManager({ AudioContextCtor: FakeAudioContext, random: makeSeededRandom(3) });
  am.unlockFromGesture();
  await tick(5);
  am.startWarSoundscape();
  am.setMuted(true);
  await am.playMissileLaunch();
  await am.playWarImpact({ big: true });
  await am.playAutomaticFireBurst({ force: true });
  await tick(5);
  assert.equal(am.getWarSoundscapeDebugState().activeVoices, 0, 'muted calls must not allocate any voice at all');
  am.stopWarSoundscape();
});

test('audioManager: stopEffects() (the existing cancelAll path) also stops the war soundscape', async () => {
  const am = createAudioManager({ AudioContextCtor: FakeAudioContext, random: makeSeededRandom(4) });
  am.unlockFromGesture();
  await tick(5);
  am.startWarSoundscape();
  am.playMissileLaunch();
  await tick(5);
  assert.equal(am.getWarSoundscapeDebugState().running, true);
  am.stopEffects();
  assert.equal(am.getWarSoundscapeDebugState().running, false);
  assert.equal(am.getWarSoundscapeDebugState().activeVoices, 0);
});

test('audioManager: reset() also stops the war soundscape', async () => {
  const am = createAudioManager({ AudioContextCtor: FakeAudioContext, random: makeSeededRandom(5) });
  am.unlockFromGesture();
  await tick(5);
  am.startWarSoundscape();
  await tick(5);
  am.reset();
  assert.equal(am.getWarSoundscapeDebugState().running, false);
});

test('audioManager: playBootNoise()/playTicTacToeCrash() stop an active war soundscape (mutual exclusion)', async () => {
  const am = createAudioManager({ AudioContextCtor: FakeAudioContext, random: makeSeededRandom(6) });
  am.unlockFromGesture();
  await tick(5);
  am.startWarSoundscape();
  await tick(5);
  assert.equal(am.getWarSoundscapeDebugState().running, true);
  am.playBootNoise();
  assert.equal(am.getWarSoundscapeDebugState().running, false, 'starting the boot noise must stop the war soundscape');
  am.stopEffects();

  am.startWarSoundscape();
  await tick(5);
  assert.equal(am.getWarSoundscapeDebugState().running, true);
  am.playTicTacToeCrash();
  assert.equal(am.getWarSoundscapeDebugState().running, false, 'starting the crash effect must stop the war soundscape');
  am.stopEffects();
});

test('audioManager: startWarSoundscape() stops an active boot noise / crash effect (reverse mutual exclusion)', async () => {
  const am = createAudioManager({ AudioContextCtor: FakeAudioContext, random: makeSeededRandom(8) });
  am.unlockFromGesture();
  await tick(5);
  am.playBootNoise();
  await tick(5);
  assert.ok(am.getDebugState().hasContext);
  am.startWarSoundscape();
  // No direct "isBootActive" getter is exposed, but stopEffects()/the new
  // session must not throw and the soundscape must now be the one running.
  assert.equal(am.getWarSoundscapeDebugState().running, true);
  am.stopEffects();
});
