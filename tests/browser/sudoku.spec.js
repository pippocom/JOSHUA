// Copyright (C) 2025-2026 Marco Iannacone
// SPDX-License-Identifier: AGPL-3.0-only
// @ts-check
const { test, expect } = require('@playwright/test');

// SUDOKU — end-to-end coverage for the standalone interaction. The engine
// uses a 4x4 puzzle (values 1..4) with a unique solution, and completion
// requires a real solved grid. See tests/unit/sudokuEngine.test.js for the
// false-completion guard (an invalid-but-full board must not count as solved).

async function bootToMenu(page, qs = '', menuText = 'SELECT OPTION:') {
  await page.goto(`/?${qs}fast=1&presentationSpeed=1`);
  await page.locator('#bootButton').click();
  await expect(page.locator('#terminalOutput')).toContainText(menuText, { timeout: 15_000 });
}

async function sendCommand(page, text) {
  await page.locator('#commandInput').fill(text);
  await page.locator('#commandForm button[type=submit]').click();
}

test('SUDOKU starts, renders the grid, accepts a valid move, and rejects invalid ones', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await bootToMenu(page);

  await sendCommand(page, 'SUDOKU');
  await expect(page.locator('#terminalOutput')).toContainText('ENTER SET ROW COL VALUE', { timeout: 5_000 });
  // Initial 4x4 grid: top row 1 2 . 4, bottom row . 3 2 .
  await expect(page.locator('#terminalOutput')).toContainText('1 2 . 4', { timeout: 5_000 });
  await expect(page.locator('#terminalOutput')).toContainText('. 3 2 .', { timeout: 5_000 });

  // A valid move places a 3 in row 2, column 1.
  await sendCommand(page, 'SET 2 1 3');
  await expect(page.locator('#terminalOutput')).toContainText('3 . . .', { timeout: 5_000 });

  // An out-of-range value is rejected.
  await sendCommand(page, 'SET 1 3 7');
  await expect(page.locator('#terminalOutput')).toContainText('INVALID MOVE.', { timeout: 5_000 });

  // A given (fixed) cell cannot be overwritten.
  await sendCommand(page, 'SET 1 1 2');
  await expect(page.locator('#terminalOutput')).toContainText('CELL LOCKED.', { timeout: 5_000 });

  expect(errors, `unexpected page errors: ${errors.join('\n')}`).toEqual([]);
});

test('SUDOKU completes only when the board is genuinely solved, then returns to the menu', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await bootToMenu(page);

  await sendCommand(page, 'SUDOKU');
  await expect(page.locator('#terminalOutput')).toContainText('ENTER SET ROW COL VALUE', { timeout: 5_000 });

  // Fill every empty cell with its correct value, in reading order.
  const solutionMoves = [
    'SET 1 3 3',
    'SET 2 1 3', 'SET 2 2 4', 'SET 2 3 1', 'SET 2 4 2',
    'SET 3 1 2', 'SET 3 2 1', 'SET 3 3 4', 'SET 3 4 3',
    'SET 4 1 4', 'SET 4 4 1'
  ];
  for (const move of solutionMoves) {
    await sendCommand(page, move);
  }

  await expect(page.locator('#terminalOutput')).toContainText('PUZZLE SOLVED.', { timeout: 5_000 });
  await expect(page.locator('#terminalOutput')).toContainText('SELECT OPTION:', { timeout: 5_000 });
  expect(errors, `unexpected page errors: ${errors.join('\n')}`).toEqual([]);
});

test('SUDOKU SOLVE command reveals the solution and completes', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await bootToMenu(page);

  await sendCommand(page, 'SUDOKU');
  await expect(page.locator('#terminalOutput')).toContainText('ENTER SET ROW COL VALUE', { timeout: 5_000 });

  await sendCommand(page, 'SOLVE');
  await expect(page.locator('#terminalOutput')).toContainText('PUZZLE SOLVED.', { timeout: 5_000 });
  // The solved 4x4 grid is actually rendered (the initial top row was "1 2 . 4").
  await expect(page.locator('#terminalOutput')).toContainText('1 2 3 4', { timeout: 5_000 });
  await expect(page.locator('#terminalOutput')).toContainText('4 3 2 1', { timeout: 5_000 });
  await expect(page.locator('#terminalOutput')).toContainText('SELECT OPTION:', { timeout: 5_000 });
  expect(errors, `unexpected page errors: ${errors.join('\n')}`).toEqual([]);
});

test('SUDOKU (IT) starts with Italian instructions', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await bootToMenu(page, 'lang=it&', 'SELEZIONA OPZIONE:');

  await sendCommand(page, 'SUDOKU');
  await expect(page.locator('#terminalOutput')).toContainText('INSERISCI SET RIGA COLONNA VALORE', { timeout: 5_000 });
  await expect(page.locator('#terminalOutput')).toContainText('1 2 . 4', { timeout: 5_000 });
  expect(errors, `unexpected page errors: ${errors.join('\n')}`).toEqual([]);
});
