// Copyright (C) 2025-2026 Marco Iannacone
// SPDX-License-Identifier: AGPL-3.0-only
'use strict';

// Unit tests for audioManager.js's playTicTacToeMark(mark) — the short
// retro confirmation beep played whenever a mark actually lands on the
// TIC-TAC-TOE board. Fully deterministic: this effect uses fixed
// frequencies/envelope and no randomness at all, so there is no RNG to
// inject here and no flake risk to reintroduce (see warSoundscape.js/
// audioDesign.test.js for where the RNG-injection pattern actually applies).

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { createAudioManager } = require(path.join('..', '..', 'src', 'audio', 'audioManager.js'));

function makeFakeNode(extra) {
  return Object.assign({ connect() {}, disconnect() { this._disconnected = true; } }, extra);
}
function makeFakeAudioParam(initial) {
  const events = [];
  const param = {
    value: initial != null ? initial : 1,
    setValueAtTime(v, t) { this.value = v; events.push({ type: 'set', v, t }); return param; },
    linearRampToValueAtTime(v, t) { this.value = v; events.push({ type: 'lin', v, t }); return param; },
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
    this._oscillators = [];
  }
  resume() { this.state = 'running'; return Promise.resolve(); }
  close() { return Promise.resolve(); }
  createGain() { return makeFakeNode({ gain: makeFakeAudioParam(1) }); }
  createDynamicsCompressor() { return makeFakeNode({ threshold: {}, knee: {}, ratio: {}, attack: {}, release: {} }); }
  createBiquadFilter() { return makeFakeNode({ type: '', frequency: makeFakeAudioParam(0), Q: { value: 1 } }); }
  createOscillator() {
    const o = makeFakeNode({ type: '', frequency: makeFakeAudioParam(0), _started: false, _stopped: false, start() { this._started = true; }, stop() { this._stopped = true; } });
    this._oscillators.push(o);
    return o;
  }
}

async function tick(ms = 0) { return new Promise((r) => setTimeout(r, ms)); }

test('playTicTacToeMark is part of the public API', () => {
  const am = createAudioManager({ AudioContextCtor: FakeAudioContext });
  assert.equal(typeof am.playTicTacToeMark, 'function');
  assert.equal(typeof am.stopTicTacToeMarks, 'function');
});

test('X produces a higher frequency than O, both within the retro-beep character (square wave)', async () => {
  const am = createAudioManager({ AudioContextCtor: FakeAudioContext });
  am.unlockFromGesture();
  await tick(5);
  const ctx = am._internal.getContext();
  await am.playTicTacToeMark('X');
  await am.playTicTacToeMark('O');
  assert.equal(ctx._oscillators.length, 2);
  const [x, o] = ctx._oscillators;
  assert.equal(x.type, 'square');
  assert.equal(o.type, 'square');
  assert.ok(x.frequency.value > o.frequency.value, `X (${x.frequency.value}Hz) should be higher than O (${o.frequency.value}Hz)`);
  // Perceptible but not caricatured: a clearly audible gap, not an octave-plus jump.
  const ratio = x.frequency.value / o.frequency.value;
  assert.ok(ratio > 1.1 && ratio < 2, `expected a moderate frequency ratio, got ${ratio.toFixed(2)}`);
});

test('duration is short and within the 60-120ms target range, with a near-immediate attack and a full decay to 0', async () => {
  const am = createAudioManager({ AudioContextCtor: FakeAudioContext });
  am.unlockFromGesture();
  await tick(5);
  const ctx = am._internal.getContext();
  let capturedGain = null;
  const originalCreateGain = ctx.createGain.bind(ctx);
  ctx.createGain = function () { capturedGain = originalCreateGain(); return capturedGain; };
  await am.playTicTacToeMark('X');

  const events = capturedGain.gain._events;
  assert.ok(events.length >= 2, 'expected at least an attack and a decay event');
  const t0 = events[0].t;
  const attack = events[1];
  const decay = events[events.length - 1];
  assert.ok(attack.t - t0 <= 0.01, `attack should be near-immediate, got ${(attack.t - t0) * 1000}ms`);
  const totalDurationMs = (decay.t - t0) * 1000;
  assert.ok(totalDurationMs >= 60 && totalDurationMs <= 120, `expected 60-120ms total duration, got ${totalDurationMs}ms`);
  assert.equal(decay.v, 0, 'must decay all the way to silence, no lingering tail');
});

test('gain never exceeds a safe, moderate level (no clipping)', async () => {
  const am = createAudioManager({ AudioContextCtor: FakeAudioContext });
  am.unlockFromGesture();
  await tick(5);
  const ctx = am._internal.getContext();
  const seenGains = [];
  const originalCreateGain = ctx.createGain.bind(ctx);
  ctx.createGain = function () {
    const g = originalCreateGain();
    const originalLin = g.gain.linearRampToValueAtTime.bind(g.gain);
    g.gain.linearRampToValueAtTime = (v, t) => { seenGains.push(v); return originalLin(v, t); };
    return g;
  };
  await am.playTicTacToeMark('X');
  await am.playTicTacToeMark('O');
  assert.ok(seenGains.length > 0);
  seenGains.forEach((v) => assert.ok(v <= 0.3, `gain ${v} should stay moderate (<=0.3), never near clipping`));
});

test('resolves (never throws) with no AudioContext available', async () => {
  const am = createAudioManager({ AudioContextCtor: undefined });
  await assert.doesNotReject(am.playTicTacToeMark('X'));
  await assert.doesNotReject(am.playTicTacToeMark('O'));
});

test('MUTE prevents new mark beeps outright (no oscillator scheduled)', async () => {
  const am = createAudioManager({ AudioContextCtor: FakeAudioContext });
  am.unlockFromGesture();
  await tick(5);
  const ctx = am._internal.getContext();
  am.setMuted(true);
  await am.playTicTacToeMark('X');
  assert.equal(ctx._oscillators.length, 0);
  am.setMuted(false);
  await am.playTicTacToeMark('X');
  assert.equal(ctx._oscillators.length, 1, 'unmuting must allow the next mark beep to sound');
});

test('rapid calls (simulating a fast ZERO-player run) never exceed a small concurrent-voice cap', async () => {
  const am = createAudioManager({ AudioContextCtor: FakeAudioContext });
  am.unlockFromGesture();
  await tick(5);
  const ctx = am._internal.getContext();
  for (let i = 0; i < 40; i++) am.playTicTacToeMark(i % 2 === 0 ? 'X' : 'O');
  // All 40 calls happen before any of their ~90ms real-timer cleanups fire.
  assert.ok(ctx._oscillators.length <= 6, `expected at most 6 concurrent voices, got ${ctx._oscillators.length}`);
});

test('cleanup: the oscillator is stopped and disconnected once the beep naturally ends', async () => {
  const am = createAudioManager({ AudioContextCtor: FakeAudioContext });
  am.unlockFromGesture();
  await tick(5);
  const ctx = am._internal.getContext();
  await am.playTicTacToeMark('X'); // the returned Promise resolves only after cleanup has run
  assert.equal(ctx._oscillators[0]._stopped, true);
  assert.equal(ctx._oscillators[0]._disconnected, true);
});

test('stopTicTacToeMarks() immediately cancels any in-flight beep', async () => {
  const am = createAudioManager({ AudioContextCtor: FakeAudioContext });
  am.unlockFromGesture();
  await tick(5);
  const ctx = am._internal.getContext();
  am.playTicTacToeMark('X'); // not awaited — still "in flight"
  am.stopTicTacToeMarks();
  assert.equal(ctx._oscillators[0]._stopped, true);
});

test('starting the crash effect stops any residual mark beeps', async () => {
  const am = createAudioManager({ AudioContextCtor: FakeAudioContext });
  am.unlockFromGesture();
  await tick(5);
  const ctx = am._internal.getContext();
  am.playTicTacToeMark('X'); // not awaited — still "in flight" when the crash starts
  am.playTicTacToeCrash();
  assert.equal(ctx._oscillators[0]._stopped, true, 'the mark beep must be stopped once the crash effect starts');
});

test('stopEffects() (the existing cancelAll path) also stops any residual mark beeps', async () => {
  const am = createAudioManager({ AudioContextCtor: FakeAudioContext });
  am.unlockFromGesture();
  await tick(5);
  const ctx = am._internal.getContext();
  am.playTicTacToeMark('O');
  am.stopEffects();
  assert.equal(ctx._oscillators[0]._stopped, true);
});
