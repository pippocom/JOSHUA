// Copyright (C) 2025-2026 Marco Iannacone
// SPDX-License-Identifier: AGPL-3.0-only
'use strict';

// Unit tests for the pure hangman engine (src/games/hangmanEngine.js). No
// DOM, no audio, no language, no knowledge of the EN/IT word lists — state
// and guesses in, state out.

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const Engine = require(path.join('..', '..', 'src', 'games', 'hangmanEngine.js'));

test('createState() uppercases the word and starts with no guesses and no misses', () => {
  const s = Engine.createState('falken');
  assert.equal(s.word, 'FALKEN');
  assert.deepEqual(s.guesses, []);
  assert.equal(s.wrongCount, 0);
});

test('normalizeLetter() accepts a correct letter (case-insensitive)', () => {
  assert.equal(Engine.normalizeLetter('f'), 'F');
  assert.equal(Engine.normalizeLetter('F'), 'F');
});

test('normalizeLetter() rejects non-alphabetic input', () => {
  assert.equal(Engine.normalizeLetter('5'), null);
  assert.equal(Engine.normalizeLetter('!'), null);
  assert.equal(Engine.normalizeLetter(''), null);
});

test('normalizeLetter() on multi-character input takes the first letter found', () => {
  assert.equal(Engine.normalizeLetter('fa'), 'F');
  assert.equal(Engine.normalizeLetter('123q'), 'Q');
});

test('hasGuessed() reports already-used letters', () => {
  let s = Engine.createState('FALKEN');
  assert.equal(Engine.hasGuessed(s, 'F'), false);
  s = Engine.applyGuess(s, 'F');
  assert.equal(Engine.hasGuessed(s, 'F'), true);
});

test('applyGuess() with a correct letter does not increase wrongCount, and never mutates the input state', () => {
  const s = Engine.createState('FALKEN');
  const next = Engine.applyGuess(s, 'F');
  assert.equal(next.wrongCount, 0);
  assert.deepEqual(next.guesses, ['F']);
  assert.deepEqual(s.guesses, [], 'the input state must be untouched');
  assert.notEqual(next, s, 'must return a different object');
});

test('applyGuess() with a wrong letter increases wrongCount', () => {
  const s = Engine.createState('FALKEN');
  const next = Engine.applyGuess(s, 'Q');
  assert.equal(next.wrongCount, 1);
});

test('applyGuess() throws on an already-guessed letter', () => {
  let s = Engine.createState('FALKEN');
  s = Engine.applyGuess(s, 'F');
  assert.throws(() => Engine.applyGuess(s, 'F'));
});

test('applyGuess() throws on invalid (non single-letter) input', () => {
  const s = Engine.createState('FALKEN');
  assert.throws(() => Engine.applyGuess(s, '5'));
  assert.throws(() => Engine.applyGuess(s, 'FA'));
  assert.throws(() => Engine.applyGuess(s, ''));
});

test('missingLetters() lists the word\'s letters not yet guessed, in order, de-duplicated', () => {
  let s = Engine.createState('FALKEN');
  assert.deepEqual(Engine.missingLetters(s), ['F', 'A', 'L', 'K', 'E', 'N']);
  s = Engine.applyGuess(s, 'F');
  s = Engine.applyGuess(s, 'A');
  assert.deepEqual(Engine.missingLetters(s), ['L', 'K', 'E', 'N']);
});

test('missingLetters() does not double-count a repeated letter once it has been guessed', () => {
  let s = Engine.createState('ALLERTA'); // repeated A and L
  s = Engine.applyGuess(s, 'A');
  s = Engine.applyGuess(s, 'L');
  assert.deepEqual(Engine.missingLetters(s), ['E', 'R', 'T']);
});

test('remainingAttempts() counts down from MAX_WRONG_GUESSES as wrong letters are guessed', () => {
  let s = Engine.createState('FALKEN');
  assert.equal(Engine.remainingAttempts(s), Engine.MAX_WRONG_GUESSES);
  s = Engine.applyGuess(s, 'Q');
  assert.equal(Engine.remainingAttempts(s), Engine.MAX_WRONG_GUESSES - 1);
});

test('isWon() becomes true once every letter of the word has been guessed', () => {
  let s = Engine.createState('CAT');
  assert.equal(Engine.isWon(s), false);
  s = Engine.applyGuess(s, 'C');
  s = Engine.applyGuess(s, 'A');
  assert.equal(Engine.isWon(s), false);
  s = Engine.applyGuess(s, 'T');
  assert.equal(Engine.isWon(s), true);
  assert.equal(Engine.isOver(s), true);
});

test('isLost() becomes true once wrongCount reaches MAX_WRONG_GUESSES', () => {
  let s = Engine.createState('CAT');
  const wrongLetters = ['Q', 'W', 'X', 'Z', 'J', 'V'];
  for (let i = 0; i < wrongLetters.length - 1; i++) {
    s = Engine.applyGuess(s, wrongLetters[i]);
    assert.equal(Engine.isLost(s), false);
  }
  s = Engine.applyGuess(s, wrongLetters[wrongLetters.length - 1]);
  assert.equal(Engine.isLost(s), true);
  assert.equal(Engine.isOver(s), true);
});

test('an unfinished game is neither won nor lost', () => {
  let s = Engine.createState('FALKEN');
  s = Engine.applyGuess(s, 'F');
  s = Engine.applyGuess(s, 'Q');
  assert.equal(Engine.isWon(s), false);
  assert.equal(Engine.isLost(s), false);
  assert.equal(Engine.isOver(s), false);
});

test('revealedWord() shows guessed letters and null for hidden ones, one entry per letter of the word', () => {
  let s = Engine.createState('CAT');
  assert.deepEqual(Engine.revealedWord(s), [null, null, null]);
  s = Engine.applyGuess(s, 'A');
  assert.deepEqual(Engine.revealedWord(s), [null, 'A', null]);
});

test('final reveal: revealedWord() shows every letter once the word has been fully guessed', () => {
  let s = Engine.createState('CAT');
  s = Engine.applyGuess(s, 'C');
  s = Engine.applyGuess(s, 'A');
  s = Engine.applyGuess(s, 'T');
  assert.deepEqual(Engine.revealedWord(s), ['C', 'A', 'T']);
});

test('no function mutates the state object it receives (spot-check across a full game)', () => {
  let s = Engine.createState('CAT');
  const states = [s];
  for (const letter of ['C', 'Q', 'A', 'W', 'T']) {
    const before = JSON.parse(JSON.stringify(s));
    if (Engine.normalizeLetter(letter) && !Engine.hasGuessed(s, letter)) {
      s = Engine.applyGuess(s, letter);
    }
    assert.deepEqual(states[states.length - 1], before, 'a prior state object must never change after being used');
    states.push(s);
  }
});
