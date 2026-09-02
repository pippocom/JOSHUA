// Copyright (C) 2025-2026 Marco Iannacone
// SPDX-License-Identifier: AGPL-3.0-only
// @ts-check
const { test, expect } = require('@playwright/test');

// Characterization tests: lock in the observable command-parsing and game
// behavior so future changes can be checked against this baseline rather than
// implementation details. Covers what the other specs (boot, language,
// tic-tac-toe ZERO/mark, hangman, war-room/soundscape, final sequence,
// media-lab, splash layout) do not already exercise: command aliases, unknown
// input, ASK ME SOMETHING intent precedence, Sudoku, a normal (non-ZERO)
// TIC-TAC-TOE win, and numeric faction/scenario selection.
//
// Deliberately does not lock in the known .includes()-based false positives
// of the game-name resolver (e.g. "PLAY STATIC" accidentally starting
// TIC-TAC-TOE) — those are a bug, not behavior worth freezing.

async function bootToMenu(page, qs, menuText) {
  await page.goto(`/?${qs}fast=1&presentationSpeed=1`);
  await page.locator('#bootButton').click();
  await expect(page.locator('#terminalOutput')).toContainText(menuText, { timeout: 15_000 });
}

async function sendCommand(page, text) {
  await page.locator('#commandInput').fill(text);
  await page.locator('#commandForm button[type=submit]').click();
}

test.describe('command parsing and aliases (EN)', () => {
  test('HELP/GAMES/CLEAR/ASK and their numeric menu shortcuts all work', async ({ page }) => {
    await bootToMenu(page, '', 'SELECT OPTION:');

    await sendCommand(page, 'HELP');
    await expect(page.locator('#terminalOutput')).toContainText('AVAILABLE COMMANDS:', { timeout: 5_000 });

    await sendCommand(page, '1');
    await expect(page.locator('#terminalOutput').locator('div').last()).not.toHaveText('');

    await sendCommand(page, 'GAMES');
    await expect(page.locator('#terminalOutput')).toContainText('AVAILABLE GAMES:', { timeout: 5_000 });

    await sendCommand(page, 'CLEAR');
    await expect(page.locator('#terminalOutput')).toHaveText('');

    await sendCommand(page, 'HELP');
    await expect(page.locator('#terminalOutput')).toContainText('AVAILABLE COMMANDS:', { timeout: 5_000 });
    await sendCommand(page, 'EXIT');
    await expect(page.locator('#splashScreen')).toBeVisible({ timeout: 5_000 });
  });

  test('an unrecognized command shows the "not recognized" message and does not crash', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await bootToMenu(page, '', 'SELECT OPTION:');
    await sendCommand(page, 'FROBNICATE');
    await expect(page.locator('#terminalOutput')).toContainText('COMMAND NOT RECOGNIZED', { timeout: 5_000 });
    expect(errors).toEqual([]);
  });

  test('ASK ME SOMETHING: a question with multiple keywords resolves by fixed precedence (war beats game)', async ({ page }) => {
    await bootToMenu(page, '', 'SELECT OPTION:');
    await sendCommand(page, 'ASK ME SOMETHING');
    await expect(page.locator('#terminalOutput')).toContainText('ASK ME SOMETHING:', { timeout: 5_000 });
    await sendCommand(page, 'is war just a game?'); // contains both "war" and "game"
    await expect(page.locator('#terminalOutput')).toContainText('NO STABLE DEFINITION OF VICTORY DETECTED.', { timeout: 5_000 });
  });

  test('ASK ME SOMETHING: falls back to the default response when no keyword matches', async ({ page }) => {
    await bootToMenu(page, '', 'SELECT OPTION:');
    await sendCommand(page, '3'); // numeric menu shortcut for ASK ME SOMETHING
    await expect(page.locator('#terminalOutput')).toContainText('ASK ME SOMETHING:', { timeout: 5_000 });
    await sendCommand(page, 'what time is it');
    await expect(page.locator('#terminalOutput')).toContainText('INSUFFICIENT DATA. PATTERN UNCLEAR.', { timeout: 5_000 });
  });
});

test.describe('command parsing and aliases (IT)', () => {
  test('AIUTO/GIOCHI/PULISCI/CHIEDI and ESCI all work as documented aliases', async ({ page }) => {
    await bootToMenu(page, 'lang=it&', 'SELEZIONA OPZIONE:');

    await sendCommand(page, 'AIUTO');
    await expect(page.locator('#terminalOutput')).toContainText('COMANDI DISPONIBILI:', { timeout: 5_000 });

    await sendCommand(page, 'GIOCHI');
    await expect(page.locator('#terminalOutput')).toContainText('GIOCHI DISPONIBILI:', { timeout: 5_000 });

    await sendCommand(page, 'PULISCI');
    await expect(page.locator('#terminalOutput')).toHaveText('');

    await sendCommand(page, 'CHIEDI');
    await expect(page.locator('#terminalOutput')).toContainText('FAI UNA DOMANDA A JOSHUA:', { timeout: 5_000 });
    await sendCommand(page, 'guerra o gioco?');
    await expect(page.locator('#terminalOutput')).toContainText('NESSUNA DEFINIZIONE STABILE DI VITTORIA RILEVATA.', { timeout: 5_000 });

    await sendCommand(page, 'ESCI');
    await expect(page.locator('#splashScreen')).toBeVisible({ timeout: 5_000 });
  });
});

test.describe('SUDOKU', () => {
  test('starts, rejects an out-of-range/malformed move, accepts a valid move, and SOLVE completes it', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await bootToMenu(page, '', 'SELECT OPTION:');
    await sendCommand(page, 'SUDOKU');
    await expect(page.locator('#terminalOutput')).toContainText('ENTER SET ROW COL VALUE', { timeout: 5_000 });

    await sendCommand(page, 'NOT A MOVE');
    await expect(page.locator('#terminalOutput')).toContainText('INVALID MOVE.', { timeout: 5_000 });

    // Row 2, col 1 (1-indexed) is empty in the starting grid; 3 is the correct
    // value there (verified against the puzzle's unique solution).
    await sendCommand(page, 'SET 2 1 3');
    await expect(page.locator('#terminalOutput')).toContainText('3 . . .', { timeout: 5_000 });

    await sendCommand(page, 'SOLVE');
    await expect(page.locator('#terminalOutput')).toContainText('PUZZLE SOLVED.', { timeout: 5_000 });
    await expect(page.locator('#terminalOutput')).toContainText('SELECT OPTION:', { timeout: 5_000 });
    expect(errors).toEqual([]);
  });
});

test.describe('TIC-TAC-TOE: a normal (non-ZERO) game to a human win', () => {
  test('playing a normal game to its conclusion shows a conclusive result and the exhaustive-model closing text', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await bootToMenu(page, '', 'SELECT OPTION:');
    await sendCommand(page, 'TIC-TAC-TOE');
    await expect(page.locator('#ticScreen')).toBeVisible();

    // WOPR plays optimally (minimax with an immediate win/block pass), so
    // which exact outcome (human win, WOPR win, or draw) a fixed move
    // sequence produces is not asserted — only that the game reaches SOME
    // decisive conclusion. Cells are pressed in a fixed scan order, one at a
    // time, each followed by a wait comfortably longer than the internal
    // ~260ms WOPR-reply delay so moves cannot race each other; the loop
    // stops as soon as the post-game overlay appears.
    for (const key of ['1', '2', '3', '4', '5', '6', '7', '8', '9']) {
      if (await page.locator('#ticOverlay').isVisible()) break;
      await page.keyboard.press(key);
      await page.waitForTimeout(600);
    }

    await expect(page.locator('#terminalPanel')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('#terminalOutput')).toContainText('SELECT OPTION:', { timeout: 5_000 });
    const text = await page.locator('#terminalOutput').innerText();
    const concluded = /RESULT: HUMAN VICTORY|RESULT: JOSHUA VICTORY|RESULT: DRAW/.test(text);
    expect(concluded, `expected a conclusive tic-tac-toe result in: ${text}`).toBe(true);
    expect(text).toContain('ANALYZING GAME TREE');
    expect(errors).toEqual([]);
  });
});

test.describe('GLOBAL THERMONUCLEAR WAR: numeric faction/scenario selection', () => {
  test('typing the faction and scenario numbers works the same as clicking the buttons', async ({ page }) => {
    await bootToMenu(page, '', 'SELECT OPTION:');
    // The full title is required intentionally (see warTitleResolver.spec.js) — "WAR" alone is deliberately rejected.
    await sendCommand(page, 'GLOBAL THERMONUCLEAR WAR');
    await expect(page.locator('#terminalOutput')).toContainText('SELECT FACTION', { timeout: 5_000 });
    await sendCommand(page, '1'); // first faction, by number instead of button click
    await expect(page.locator('#terminalOutput')).toContainText('SELECT SCENARIO', { timeout: 5_000 });
    await sendCommand(page, '1'); // first scenario for that faction
    await expect(page.locator('#warRoom')).toBeVisible({ timeout: 5_000 });
    await page.locator('#abortWar').click();
    await expect(page.locator('#terminalOutput')).toContainText('SELECT OPTION:', { timeout: 5_000 });
  });
});
