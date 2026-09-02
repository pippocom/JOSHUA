// Copyright (C) 2025-2026 Marco Iannacone
// SPDX-License-Identifier: AGPL-3.0-only
/**
 * JoshuaTicTacToeEngine — pure tic-tac-toe rules and WOPR move selection.
 * No DOM, language, audio, timers, or display-mode dependency: board state
 * in, board state (or a move index) out. game.js keeps orchestration,
 * rendering, input handling, timing, the X/O mark beep, and ZERO-mode
 * presentation.
 *
 * Board representation: a length-9 array of '' (empty), 'X', or 'O',
 * indexed left-to-right, top-to-bottom.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.JoshuaTicTacToeEngine = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var BOARD_SIZE = 9;
  var LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];

  function createEmptyBoard() {
    return new Array(BOARD_SIZE).fill('');
  }

  function isValidIndex(index) {
    return Number.isInteger(index) && index >= 0 && index < BOARD_SIZE;
  }

  // Returns 'X'/'O' on a line win, 'D' on a full board with no winner, or
  // null if the game is still in progress.
  function winner(board) {
    for (var l = 0; l < LINES.length; l++) {
      var line = LINES[l];
      if (board[line[0]] && board[line[0]] === board[line[1]] && board[line[1]] === board[line[2]]) {
        return board[line[0]];
      }
    }
    if (board.every(Boolean)) return 'D';
    return null;
  }

  function isValidMove(board, index) {
    return isValidIndex(index) && !board[index];
  }

  // Returns a NEW board array with the move applied; never mutates the
  // board it was given. Throws on an out-of-range index or an occupied
  // cell — callers that need to distinguish "rejected" from "applied"
  // should check isValidMove() first.
  function applyMove(board, index, mark) {
    if (!isValidMove(board, index)) {
      throw new Error('invalid tic-tac-toe move: index=' + index);
    }
    var next = board.slice();
    next[index] = mark;
    return next;
  }

  // Minimax: mutates the `board` argument as scratch space during recursion
  // but always reverts each cell before returning, so the board is unchanged
  // by the time the top-level call resolves. Only ever called internally by
  // bestMove() against a throwaway copy — never against a caller's live board.
  function minimax(board, player) {
    var w = winner(board);
    if (w === 'O') return { score: 10 };
    if (w === 'X') return { score: -10 };
    if (w === 'D') return { score: 0 };
    var moves = [];
    for (var i = 0; i < BOARD_SIZE; i++) {
      if (!board[i]) {
        board[i] = player;
        var res = minimax(board, player === 'O' ? 'X' : 'O');
        moves.push({ i: i, score: res.score });
        board[i] = '';
      }
    }
    return player === 'O'
      ? moves.reduce(function (a, m) { return m.score > a.score ? m : a; }, { score: -999 })
      : moves.reduce(function (a, m) { return m.score < a.score ? m : a; }, { score: 999 });
  }

  // WOPR's move: never mutates the board it is given (works against
  // throwaway copies throughout). Three-pass strategy: take an immediate win
  // if available, otherwise block the opponent's immediate win, otherwise
  // fall back to full minimax.
  function bestMove(board, player) {
    var empty = [];
    for (var i = 0; i < BOARD_SIZE; i++) if (!board[i]) empty.push(i);
    var other = player === 'O' ? 'X' : 'O';
    var scratch = board.slice();

    for (var a = 0; a < empty.length; a++) {
      var winIdx = empty[a];
      scratch[winIdx] = player;
      if (winner(scratch) === player) { scratch[winIdx] = ''; return winIdx; }
      scratch[winIdx] = '';
    }
    for (var b = 0; b < empty.length; b++) {
      var blockIdx = empty[b];
      scratch[blockIdx] = other;
      if (winner(scratch) === other) { scratch[blockIdx] = ''; return blockIdx; }
      scratch[blockIdx] = '';
    }
    var res = minimax(board.slice(), player);
    if (typeof res.i === 'number') return res.i;
    return empty[0];
  }

  return {
    BOARD_SIZE: BOARD_SIZE,
    createEmptyBoard: createEmptyBoard,
    isValidMove: isValidMove,
    applyMove: applyMove,
    winner: winner,
    bestMove: bestMove
  };
});
