// Copyright (C) 2025-2026 Marco Iannacone
// SPDX-License-Identifier: AGPL-3.0-only
'use strict';

// Structural/regression coverage for how the TIC-TAC-TOE mark beep is wired
// into src/app/game.js: placeTicTacToeMark() must be the single point marks
// are registered, called only where a move is genuinely valid (not for
// invalid input, an occupied cell, the ZERO/0 command itself, the Y/S/N
// confirmation, or a board reset), and identically regardless of language.
// True end-to-end behavior (a click actually producing exactly one API
// call) is covered by tests/browser/ticTacToeMark.spec.js — this file only
// guards the source-level integration.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const GAME_JS_PATH = path.join(__dirname, '..', '..', 'src', 'app', 'game.js');
const gameJs = fs.readFileSync(GAME_JS_PATH, 'utf8');

test('placeTicTacToeMark() is the one function that both writes to ticBoard[] and plays the mark beep', () => {
  const helperBody = gameJs.match(/function placeTicTacToeMark\(index, ?mark\)\{[^}]*\}/)[0];
  assert.match(helperBody, /ticBoard\[index\]\s*=\s*mark/);
  assert.match(helperBody, /renderTic\(\)/);
  assert.match(helperBody, /JoshuaAudioManager\.playTicTacToeMark\(mark\)/);
});

test('playTicTacToeMark is called nowhere in game.js except inside placeTicTacToeMark()', () => {
  const calls = gameJs.match(/JoshuaAudioManager\.playTicTacToeMark\([^)]*\)/g) || [];
  assert.equal(calls.length, 1, `expected exactly one playTicTacToeMark(...) call site in the whole file, found ${calls.length}`);
});

test('handleTicMove() places X only after the taken-cell/wrong-phase guards, and O only when there is no winner yet', () => {
  const body = gameJs.match(/async function handleTicMove\(move\)\{[\s\S]*?\n {2}\}/)[0];
  const phaseGuardIdx = body.indexOf("if(ticPhase!=='player') return;");
  const takenGuardIdx = body.indexOf('ticStatus.textContent=C.tic.taken; return;');
  const placeXIdx = body.indexOf("placeTicTacToeMark(i,'X')");
  const placeOIdx = body.indexOf("placeTicTacToeMark(mv,'O')");
  assert.ok(phaseGuardIdx !== -1 && takenGuardIdx !== -1 && placeXIdx !== -1 && placeOIdx !== -1);
  assert.ok(phaseGuardIdx < placeXIdx, 'the player-phase guard must run before X is placed');
  assert.ok(takenGuardIdx < placeXIdx, 'the occupied-cell guard must run before X is placed');
  // O is only placed inside the `if(!w){ ... }` branch taken when the
  // player's move did not already end the game.
  const afterX = body.slice(placeXIdx);
  assert.match(afterX, /if\(!w\)\{[\s\S]*placeTicTacToeMark\(mv,'O'\)/);
});

test('the ZERO/0 command path and the Y/S/N confirmation never place a mark or reset via placeTicTacToeMark', () => {
  const pushBufferBody = gameJs.match(/function pushTicBuffer\(ch\)\{[^}]*\}/)[0];
  assert.ok(!/placeTicTacToeMark/.test(pushBufferBody), 'typing "ZERO" must not itself place a mark');

  const keydownBody = gameJs.match(/document\.addEventListener\('keydown'[\s\S]*?\n {2}\}\);/)[0];
  const zeroKeyBranch = keydownBody.match(/if\(key==='0'\)\{[^}]*\}/)[0];
  assert.ok(!/placeTicTacToeMark/.test(zeroKeyBranch), 'pressing 0 to ask about zero-player mode must not place a mark');
  const confirmBranch = keydownBody.slice(keydownBody.indexOf("ticPhase==='confirm-zero'"));
  assert.ok(!/placeTicTacToeMark/.test(confirmBranch.split('});')[0]), 'the Y/S/N confirmation itself must not place a mark');
});

test('board resets (startTic, per-round reset in ZERO mode) assign ticBoard directly, bypassing placeTicTacToeMark (no beep on reset)', () => {
  const startTicBody = gameJs.match(/function startTic\(hidden=false\)\{[^}]*\}/)[0];
  assert.match(startTicBody, /ticBoard=Array\(9\)\.fill\(''\)/);
  assert.ok(!/placeTicTacToeMark/.test(startTicBody));

  const zeroBody = gameJs.match(/async function startZeroPlayerMode\(\)\{[\s\S]*?\n {2}\}/)[0];
  assert.match(zeroBody, /ticBoard=Array\(9\)\.fill\(''\); renderTic\(\);/, 'each round resets the board directly, not through placeTicTacToeMark');
});

test('every move inside ZERO-player mode\'s own sequence goes through placeTicTacToeMark, alternating X/O', () => {
  const zeroBody = gameJs.match(/async function startZeroPlayerMode\(\)\{[\s\S]*?\n {2}\}/)[0];
  assert.match(zeroBody, /placeTicTacToeMark\(seq\[step\], ?player\)/);
  assert.match(zeroBody, /const player ?= ?step ?% ?2 ?=== ?0 ?\? ?'X' ?: ?'O'/);
});

test('mark placement has no language-conditional branching (EN/IT behave identically)', () => {
  const helperBody = gameJs.match(/function placeTicTacToeMark\(index, ?mark\)\{[^}]*\}/)[0];
  assert.ok(!/lang/.test(helperBody), 'placeTicTacToeMark must not branch on lang');
});

test('the beep call is never awaited by the game logic (fire-and-forget, cannot delay a move)', () => {
  const helperBody = gameJs.match(/function placeTicTacToeMark\(index, ?mark\)\{[^}]*\}/)[0];
  assert.ok(!/await\s+JoshuaAudioManager\.playTicTacToeMark/.test(helperBody));
});
