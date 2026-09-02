// Copyright (C) 2025-2026 Marco Iannacone
// SPDX-License-Identifier: AGPL-3.0-only
/**
 * JoshuaSudokuEngine — pure Sudoku parsing, state, and rules. No DOM,
 * language, audio, timers, or rendering.
 *
 * State changes are immutable: createState(), applyMove(), and solve() never
 * mutate an existing state or either of the canonical grids.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.JoshuaSudokuEngine = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var GRID_SIZE = 4;
  var MIN_VALUE = 1;
  var MAX_VALUE = 4;

  // A 4x4 Sudoku uses only the values 1-4. This puzzle is valid and has a
  // unique solution equal to SOLUTION below.
  var INITIAL_PUZZLE = freezeGrid([
    [1, 2, 0, 4],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 3, 2, 0]
  ]);

  // The unique solution of INITIAL_PUZZLE, shown by the SOLVE command.
  var SOLUTION = freezeGrid([
    [1, 2, 3, 4],
    [3, 4, 1, 2],
    [2, 1, 4, 3],
    [4, 3, 2, 1]
  ]);

  function cloneGrid(grid) {
    return grid.map(function (row) { return row.slice(); });
  }

  function freezeGrid(grid) {
    grid.forEach(function (row) { Object.freeze(row); });
    return Object.freeze(grid);
  }

  function createState() {
    return {
      grid: cloneGrid(INITIAL_PUZZLE),
      fixed: INITIAL_PUZZLE.map(function (row) {
        return row.map(Boolean);
      })
    };
  }

  // Command syntax: SET is optional, row/column/value are one digit from 1
  // to 4, and the expression is deliberately not anchored. Coordinates in
  // the returned move are zero-based for direct array access.
  function parseMove(input) {
    var match = String(input == null ? '' : input).toUpperCase()
      .match(/(?:SET\s+)?([1-4])\s+([1-4])\s+([1-4])/);
    if (!match) return null;
    return {
      row: Number(match[1]) - 1,
      column: Number(match[2]) - 1,
      value: Number(match[3])
    };
  }

  function isCoordinateInBounds(row, column) {
    return Number.isInteger(row) && Number.isInteger(column) &&
      row >= 0 && row < GRID_SIZE && column >= 0 && column < GRID_SIZE;
  }

  function isValueInBounds(value) {
    return Number.isInteger(value) && value >= MIN_VALUE && value <= MAX_VALUE;
  }

  function isMoveInBounds(move) {
    return !!move && isCoordinateInBounds(move.row, move.column) &&
      isValueInBounds(move.value);
  }

  function isFixedCell(state, row, column) {
    return isCoordinateInBounds(row, column) && !!state.fixed[row][column];
  }

  function isFull(grid) {
    return grid.every(function (row) {
      return row.every(function (v) {
        return Number.isInteger(v) && v >= MIN_VALUE && v <= MAX_VALUE;
      });
    });
  }

  // A unit (row, column, or 2x2 block) is valid when it holds four distinct
  // values within 1..4 — i.e. each value appears exactly once.
  function unitIsValid(cells) {
    var seen = {};
    for (var i = 0; i < cells.length; i++) {
      var v = cells[i];
      if (!Number.isInteger(v) || v < MIN_VALUE || v > MAX_VALUE || seen[v]) return false;
      seen[v] = true;
    }
    return true;
  }

  // A genuinely solved 4x4 Sudoku: every row, column, and 2x2 block is valid.
  function isValidSolution(grid) {
    var r, c, i, j;
    for (r = 0; r < GRID_SIZE; r++) {
      if (!unitIsValid(grid[r])) return false;
    }
    for (c = 0; c < GRID_SIZE; c++) {
      var col = [];
      for (r = 0; r < GRID_SIZE; r++) col.push(grid[r][c]);
      if (!unitIsValid(col)) return false;
    }
    for (r = 0; r < 2; r++) {
      for (c = 0; c < 2; c++) {
        var block = [];
        for (i = 0; i < 2; i++) {
          for (j = 0; j < 2; j++) {
            block.push(grid[r * 2 + i][c * 2 + j]);
          }
        }
        if (!unitIsValid(block)) return false;
      }
    }
    return true;
  }

  // Rejects a value already present in its row, column, or 2x2 block. The
  // target cell is included in those scans, so re-entering an already-filled
  // mutable cell is also rejected.
  function isValidPlacement(state, move) {
    if (!isMoveInBounds(move)) return false;
    var row = move.row;
    var column = move.column;
    var value = move.value;
    var i;
    var j;

    for (i = 0; i < GRID_SIZE; i++) {
      if (state.grid[row][i] === value || state.grid[i][column] === value) {
        return false;
      }
    }

    var blockRow = Math.floor(row / 2) * 2;
    var blockColumn = Math.floor(column / 2) * 2;
    for (i = 0; i < 2; i++) {
      for (j = 0; j < 2; j++) {
        if (state.grid[blockRow + i][blockColumn + j] === value) return false;
      }
    }
    return true;
  }

  function isValidMove(state, move) {
    return isMoveInBounds(move) &&
      !isFixedCell(state, move.row, move.column) &&
      isValidPlacement(state, move);
  }

  function applyMove(state, move) {
    if (!isValidMove(state, move)) {
      throw new Error('invalid sudoku move');
    }
    var nextGrid = cloneGrid(state.grid);
    nextGrid[move.row][move.column] = move.value;
    return {
      grid: nextGrid,
      fixed: cloneGrid(state.fixed)
    };
  }

  function isComplete(state) {
    // A filled board is not enough: it must also be a genuine solution.
    // (Every production move is validated by isValidPlacement, so a board
    // built through applyMove() is always valid when full; this check makes
    // completion robust against any invalid-but-filled state.)
    return isFull(state.grid) && isValidSolution(state.grid);
  }

  function solve(state) {
    return {
      grid: cloneGrid(SOLUTION),
      fixed: cloneGrid(state.fixed)
    };
  }

  return {
    GRID_SIZE: GRID_SIZE,
    MIN_VALUE: MIN_VALUE,
    MAX_VALUE: MAX_VALUE,
    INITIAL_PUZZLE: INITIAL_PUZZLE,
    SOLUTION: SOLUTION,
    createState: createState,
    parseMove: parseMove,
    isCoordinateInBounds: isCoordinateInBounds,
    isValueInBounds: isValueInBounds,
    isMoveInBounds: isMoveInBounds,
    isFixedCell: isFixedCell,
    isValidPlacement: isValidPlacement,
    isValidSolution: isValidSolution,
    isValidMove: isValidMove,
    applyMove: applyMove,
    isComplete: isComplete,
    solve: solve
  };
});
