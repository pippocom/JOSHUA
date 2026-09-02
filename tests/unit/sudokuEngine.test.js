// Copyright (C) 2025-2026 Marco Iannacone
// SPDX-License-Identifier: AGPL-3.0-only
'use strict';

// Unit tests for the pure Sudoku engine (src/games/sudokuEngine.js). No DOM,
// language, audio, timers, or rendering.

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const Engine = require(path.join('..', '..', 'src', 'games', 'sudokuEngine.js'));

test('createState() preserves the initial puzzle and derives its fixed cells', () => {
  const state = Engine.createState();
  assert.deepEqual(state.grid, [
    [1, 2, 0, 4],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 3, 2, 0]
  ]);
  assert.equal(state.fixed[0][0], true);
  assert.equal(state.fixed[1][0], false);
  assert.equal(state.fixed[3][2], true);
});

test('parseMove() accepts the existing SET form and the form without SET', () => {
  assert.deepEqual(Engine.parseMove('SET 2 1 1'), { row: 1, column: 0, value: 1 });
  assert.deepEqual(Engine.parseMove('2 1 1'), { row: 1, column: 0, value: 1 });
});

test('parseMove() rejects malformed syntax', () => {
  assert.equal(Engine.parseMove('NOT A MOVE'), null);
  assert.equal(Engine.parseMove('SET 2,1,1'), null);
  assert.equal(Engine.parseMove(''), null);
});

test('parseMove() rejects a value outside the 1..4 range', () => {
  // Value 7 is outside the accepted 1..4 range.
  assert.equal(Engine.parseMove('SET 1 3 7'), null);
  assert.equal(Engine.parseMove('SET 1 3 5'), null);
  assert.equal(Engine.parseMove('SET 1 3 0'), null);
});

test('coordinate bounds reject cells outside the 4x4 grid', () => {
  assert.equal(Engine.isCoordinateInBounds(0, 0), true);
  assert.equal(Engine.isCoordinateInBounds(-1, 0), false);
  assert.equal(Engine.isCoordinateInBounds(4, 0), false);
  assert.equal(Engine.isCoordinateInBounds(0, 4), false);
});

test('value bounds reject values outside 1..4', () => {
  assert.equal(Engine.isValueInBounds(1), true);
  assert.equal(Engine.isValueInBounds(4), true);
  assert.equal(Engine.isValueInBounds(0), false);
  assert.equal(Engine.isValueInBounds(5), false);
});

test('isMoveInBounds() checks coordinates and value together', () => {
  assert.equal(Engine.isMoveInBounds({ row: 1, column: 0, value: 1 }), true);
  assert.equal(Engine.isMoveInBounds({ row: 4, column: 0, value: 1 }), false);
  assert.equal(Engine.isMoveInBounds({ row: 1, column: 0, value: 5 }), false);
});

test('an initial cell is fixed and cannot be modified', () => {
  const state = Engine.createState();
  const move = { row: 0, column: 0, value: 1 };
  assert.equal(Engine.isFixedCell(state, move.row, move.column), true);
  assert.equal(Engine.isValidMove(state, move), false);
  assert.throws(() => Engine.applyMove(state, move));
});

test('a move conflicting with its row, column, or block is rejected', () => {
  const state = Engine.createState();
  // value 1 at (0,2) collides with the given 1 at (0,0) in the same row.
  const wrong = { row: 0, column: 2, value: 1 };
  assert.equal(Engine.isValidPlacement(state, wrong), false);
  assert.equal(Engine.isValidMove(state, wrong), false);
  assert.throws(() => Engine.applyMove(state, wrong));
});

test('a valid move is accepted and applied', () => {
  const state = Engine.createState();
  const move = Engine.parseMove('SET 2 1 3');
  assert.equal(Engine.isValidPlacement(state, move), true);
  assert.equal(Engine.isValidMove(state, move), true);
  const next = Engine.applyMove(state, move);
  assert.equal(next.grid[1][0], 3);
});

test('the initial and partially filled states are not complete', () => {
  const state = Engine.createState();
  assert.equal(Engine.isComplete(state), false);
  assert.equal(Engine.isComplete(Engine.applyMove(state, { row: 1, column: 0, value: 3 })), false);
});

test('isComplete() detects a genuinely solved grid', () => {
  const state = Engine.createState();
  const fullState = {
    grid: Engine.SOLUTION.map((row) => row.slice()),
    fixed: state.fixed.map((row) => row.slice())
  };
  assert.equal(Engine.isComplete(fullState), true);
});

test('isValidSolution() accepts the canonical solution and rejects invalid grids', () => {
  assert.equal(Engine.isValidSolution(Engine.SOLUTION), true);

  // Full but with duplicate values in every row — not a real solution.
  const dupRows = [
    [1, 2, 3, 4],
    [1, 2, 3, 4],
    [1, 2, 3, 4],
    [1, 2, 3, 4]
  ];
  assert.equal(Engine.isValidSolution(dupRows), false);

  // Rows/columns look fine, but the top-left 2x2 block repeats 1 and 2.
  const badBlock = [
    [1, 2, 3, 4],
    [2, 1, 4, 3],
    [3, 4, 1, 2],
    [4, 3, 2, 1]
  ];
  assert.equal(Engine.isValidSolution(badBlock), false);
});

test('isComplete() rejects an invalid-but-full grid', () => {
  const state = Engine.createState();
  const invalidFull = {
    grid: [
      [1, 2, 3, 4],
      [1, 2, 3, 4],
      [1, 2, 3, 4],
      [1, 2, 3, 4]
    ],
    fixed: state.fixed.map((row) => row.slice())
  };
  assert.equal(Engine.isComplete(invalidFull), false);
});

test('SOLUTION is a valid completion of INITIAL_PUZZLE (given cells agree)', () => {
  const puzzle = Engine.INITIAL_PUZZLE;
  const solution = Engine.SOLUTION;
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (puzzle[r][c] !== 0) {
        assert.equal(solution[r][c], puzzle[r][c], `given cell (${r},${c}) must agree with the solution`);
      }
    }
  }
  assert.equal(Engine.isValidSolution(solution), true);
});

test('solve() returns the exact existing solution and completes the puzzle', () => {
  const state = Engine.createState();
  const solved = Engine.solve(state);
  assert.deepEqual(solved.grid, [
    [1, 2, 3, 4],
    [3, 4, 1, 2],
    [2, 1, 4, 3],
    [4, 3, 2, 1]
  ]);
  assert.equal(Engine.isComplete(solved), true);
});

test('state-changing operations do not cause unexpected mutations', () => {
  const state = Engine.createState();
  const snapshot = JSON.parse(JSON.stringify(state));
  const puzzleSnapshot = Engine.INITIAL_PUZZLE.map((row) => row.slice());
  const solutionSnapshot = Engine.SOLUTION.map((row) => row.slice());

  const moved = Engine.applyMove(state, { row: 1, column: 0, value: 3 });
  const solved = Engine.solve(moved);

  assert.deepEqual(state, snapshot, 'the input state must remain unchanged');
  assert.notEqual(moved, state);
  assert.notEqual(moved.grid, state.grid);
  assert.notEqual(moved.grid[1], state.grid[1]);
  assert.notEqual(solved.grid, moved.grid);
  assert.deepEqual(Engine.INITIAL_PUZZLE, puzzleSnapshot);
  assert.deepEqual(Engine.SOLUTION, solutionSnapshot);
});
