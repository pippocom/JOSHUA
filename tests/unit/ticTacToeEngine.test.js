// Copyright (C) 2025-2026 Marco Iannacone
// SPDX-License-Identifier: AGPL-3.0-only
'use strict';

// Unit tests for the pure tic-tac-toe engine (src/games/ticTacToeEngine.js).
// No DOM, no audio, no language, no timers — board arrays in, board arrays
// (or a move index) out.

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const Engine = require(path.join('..', '..', 'src', 'games', 'ticTacToeEngine.js'));

function boardFrom(map) {
  const b = Engine.createEmptyBoard();
  Object.keys(map).forEach((i) => { b[Number(i)] = map[i]; });
  return b;
}

test('createEmptyBoard() returns 9 empty cells', () => {
  const b = Engine.createEmptyBoard();
  assert.equal(b.length, 9);
  assert.ok(b.every((c) => c === ''));
});

test('isValidMove() accepts an empty cell within range', () => {
  const b = Engine.createEmptyBoard();
  assert.equal(Engine.isValidMove(b, 4), true);
});

test('isValidMove() rejects an out-of-range index', () => {
  const b = Engine.createEmptyBoard();
  assert.equal(Engine.isValidMove(b, -1), false);
  assert.equal(Engine.isValidMove(b, 9), false);
  assert.equal(Engine.isValidMove(b, 1.5), false);
});

test('isValidMove() rejects an occupied cell', () => {
  const b = boardFrom({ 0: 'X' });
  assert.equal(Engine.isValidMove(b, 0), false);
});

test('applyMove() returns a new board with the move applied, and never mutates the input', () => {
  const b = Engine.createEmptyBoard();
  const next = Engine.applyMove(b, 4, 'X');
  assert.equal(next[4], 'X');
  assert.equal(b[4], '', 'the input board must be untouched');
  assert.notEqual(next, b, 'must return a different array instance');
});

test('applyMove() throws on an invalid index or an occupied cell', () => {
  const b = boardFrom({ 0: 'X' });
  assert.throws(() => Engine.applyMove(b, 0, 'O'));
  assert.throws(() => Engine.applyMove(b, 9, 'O'));
});

test('winner() detects an unfinished game as null', () => {
  const b = boardFrom({ 0: 'X', 4: 'O' });
  assert.equal(Engine.winner(b), null);
});

test('winner() detects an X row win', () => {
  const b = boardFrom({ 0: 'X', 1: 'X', 2: 'X', 3: 'O', 4: 'O' });
  assert.equal(Engine.winner(b), 'X');
});

test('winner() detects an O diagonal win', () => {
  const b = boardFrom({ 0: 'O', 4: 'O', 8: 'O', 1: 'X', 2: 'X' });
  assert.equal(Engine.winner(b), 'O');
});

test('winner() detects a draw (full board, no line)', () => {
  // X O X / X O O / O X X — full, no three-in-a-row for either side.
  const b = ['X', 'O', 'X', 'X', 'O', 'O', 'O', 'X', 'X'];
  assert.equal(Engine.winner(b), 'D');
});

test("bestMove() takes an immediate win when available", () => {
  // O to move, two in a row on the top row with the third cell open.
  const b = boardFrom({ 0: 'O', 1: 'O', 3: 'X', 4: 'X' });
  const move = Engine.bestMove(b, 'O');
  assert.equal(move, 2);
});

test('bestMove() blocks the opponent\'s immediate win when it cannot win itself', () => {
  // X has two in a row (0,1); O must block at 2 rather than play elsewhere.
  const b = boardFrom({ 0: 'X', 1: 'X', 4: 'O' });
  const move = Engine.bestMove(b, 'O');
  assert.equal(move, 2);
});

test('bestMove() never mutates the board it is given', () => {
  const b = boardFrom({ 0: 'O', 1: 'O', 3: 'X', 4: 'X' });
  const snapshot = b.slice();
  Engine.bestMove(b, 'O');
  assert.deepEqual(b, snapshot);
});

test('bestMove() always returns an empty cell on an otherwise empty board', () => {
  const b = Engine.createEmptyBoard();
  const move = Engine.bestMove(b, 'O');
  assert.ok(move >= 0 && move < 9);
  assert.equal(b[move], '');
});

test('bestMove() with optimal play from both sides never loses as O (full game simulation)', () => {
  // Simulate a full game where both X and O play via bestMove(); since
  // tic-tac-toe with optimal play cannot be won by either side, the
  // engine playing against itself must always reach a draw.
  let board = Engine.createEmptyBoard();
  let player = 'X';
  while (Engine.winner(board) === null) {
    const move = Engine.bestMove(board, player);
    board = Engine.applyMove(board, move, player);
    player = player === 'X' ? 'O' : 'X';
  }
  assert.equal(Engine.winner(board), 'D');
});
