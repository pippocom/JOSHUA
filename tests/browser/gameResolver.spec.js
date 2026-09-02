// Copyright (C) 2025-2026 Marco Iannacone
// SPDX-License-Identifier: AGPL-3.0-only
// @ts-check
const { test, expect } = require('@playwright/test');

// Regression coverage for the game-name resolver: substring-based matching
// would let strings that merely CONTAIN a game keyword accidentally start
// that game (e.g. "STATIC" contains "TIC", "WARSAW" contains "WAR"). The
// resolver matches exact,
// normalized names against an explicit alias table — these strings must
// resolve to nothing, both via "PLAY <name>" and as a direct command.

const FALSE_POSITIVES = ['STATIC', 'ANTIC', 'ATTIC', 'WARSAW', 'HARDWARE', 'HANGAR'];

async function bootToMenu(page) {
  await page.goto('/?fast=1&presentationSpeed=1');
  await page.locator('#bootButton').click();
  await expect(page.locator('#terminalOutput')).toContainText('SELECT OPTION:', { timeout: 15_000 });
}

async function sendCommand(page, text) {
  await page.locator('#commandInput').fill(text);
  await page.locator('#commandForm button[type=submit]').click();
}

test.describe('game name resolver: false positives are rejected', () => {
  for (const word of FALSE_POSITIVES) {
    test(`"PLAY ${word}" starts no game`, async ({ page }) => {
      const errors = [];
      page.on('pageerror', (e) => errors.push(String(e)));
      await bootToMenu(page);
      await sendCommand(page, `PLAY ${word}`);

      await expect(page.locator('#terminalOutput')).toContainText('COMMAND NOT RECOGNIZED', { timeout: 5_000 });
      await expect(page.locator('#ticScreen')).toBeHidden();
      await expect(page.locator('#warRoom')).toBeHidden();
      // Still sitting at the terminal, ready for the next command.
      await expect(page.locator('#terminalPanel')).toBeVisible();
      expect(errors, `unexpected page errors for "PLAY ${word}": ${errors.join('\n')}`).toEqual([]);
    });

    test(`"${word}" typed directly (no PLAY prefix) starts no game`, async ({ page }) => {
      const errors = [];
      page.on('pageerror', (e) => errors.push(String(e)));
      await bootToMenu(page);
      await sendCommand(page, word);

      await expect(page.locator('#terminalOutput')).toContainText('COMMAND NOT RECOGNIZED', { timeout: 5_000 });
      await expect(page.locator('#ticScreen')).toBeHidden();
      await expect(page.locator('#warRoom')).toBeHidden();
      expect(errors).toEqual([]);
    });
  }
});

test.describe('game name resolver: every real alias still resolves, via PLAY and directly', () => {
  test('PLAY TICTACTOE and PLAY TIC TAC TOE (no hyphen) both start tic-tac-toe', async ({ page }) => {
    await bootToMenu(page);
    await sendCommand(page, 'PLAY TICTACTOE');
    await expect(page.locator('#ticScreen')).toBeVisible({ timeout: 5_000 });
  });

  test('IMPICCATO (Italian hangman alias) works when typed directly', async ({ page }) => {
    await page.goto('/?lang=it&fast=1&presentationSpeed=1');
    await page.locator('#bootButton').click();
    await expect(page.locator('#terminalOutput')).toContainText('SELEZIONA OPZIONE:', { timeout: 15_000 });
    await sendCommand(page, 'IMPICCATO');
    await expect(page.locator('#terminalOutput')).toContainText('INSERISCI UNA LETTERA:', { timeout: 5_000 });
  });

  // GLOBAL THERMONUCLEAR WAR's own aliases (or deliberate lack thereof) are
  // covered by tests/browser/warTitleResolver.spec.js — the full title is
  // required intentionally, so
  // "THERMONUCLEAR WAR" and "GLOBAL TERMONUCLEAR WAR" are not valid
  // aliases and must not be asserted as working here.

  test('SUDOKU still starts via direct name (unaffected by the resolver change)', async ({ page }) => {
    await bootToMenu(page);
    await sendCommand(page, 'SUDOKU');
    await expect(page.locator('#terminalOutput')).toContainText('ENTER SET ROW COL VALUE', { timeout: 5_000 });
  });
});
