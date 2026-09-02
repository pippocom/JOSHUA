// Copyright (C) 2025-2026 Marco Iannacone
// SPDX-License-Identifier: AGPL-3.0-only
// @ts-check
const { test, expect } = require('@playwright/test');

// HANGMAN — regression coverage for a content-key mismatch bug found while
// preparing characterization tests: game.js referenced C.hang.* while both
// content.en.js and content.it.js define the key as "hangman", so starting
// HANGMAN threw a TypeError and silently broke (no visible error, no game).
// Fixed by correcting game.js's references to C.hangman.* — the content
// files were already correct and were not touched.
//
// Math.random() is forced to always return 0 via an init script so the word
// picked (index 0 of the six-word list) is deterministic: "FALKEN" in
// English, "SISTEMA" in Italian — neither contains Q/W/X/Z/J/V, giving a
// reliable set of "wrong letter" guesses for the loss-path test.

async function forceFirstWord(page) {
  await page.addInitScript(() => { Math.random = () => 0; });
}

async function bootAndReachMenu(page, langQuery, expectedMenuText) {
  await page.goto(`/?${langQuery}fast=1&presentationSpeed=1`);
  await page.locator('#bootButton').click();
  await expect(page.locator('#terminalOutput')).toContainText(expectedMenuText, { timeout: 15_000 });
}

test.describe('HANGMAN (EN)', () => {
  test('starts with the HANGMAN command, no page errors, correct initial display', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await forceFirstWord(page);
    await bootAndReachMenu(page, '', 'SELECT OPTION:');

    await page.locator('#commandInput').fill('HANGMAN');
    await page.locator('#commandForm button[type=submit]').click();

    await expect(page.locator('#terminalOutput')).toContainText('ENTER A LETTER:', { timeout: 5_000 });
    await expect(page.locator('#terminalOutput')).toContainText('WORD: _ _ _ _ _ _', { timeout: 5_000 });
    await expect(page.locator('#terminalOutput')).toContainText('MISSES: 0/6', { timeout: 5_000 });
    expect(errors, `unexpected page errors: ${errors.join('\n')}`).toEqual([]);
  });

  test('starts with the PLAY HANGMAN command as well, no page errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await forceFirstWord(page);
    await bootAndReachMenu(page, '', 'SELECT OPTION:');

    await page.locator('#commandInput').fill('PLAY HANGMAN');
    await page.locator('#commandForm button[type=submit]').click();

    await expect(page.locator('#terminalOutput')).toContainText('ENTER A LETTER:', { timeout: 5_000 });
    expect(errors, `unexpected page errors: ${errors.join('\n')}`).toEqual([]);
  });

  test('a correct letter reveals it; a wrong letter increases the miss count; losing reveals the word', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await forceFirstWord(page);
    await bootAndReachMenu(page, '', 'SELECT OPTION:');
    await page.locator('#commandInput').fill('HANGMAN');
    await page.locator('#commandForm button[type=submit]').click();
    await expect(page.locator('#terminalOutput')).toContainText('ENTER A LETTER:', { timeout: 5_000 });

    async function guess(letter) {
      await page.locator('#commandInput').fill(letter);
      await page.locator('#commandForm button[type=submit]').click();
    }

    // FALKEN contains F — a correct guess.
    await guess('F');
    await expect(page.locator('#terminalOutput')).toContainText('WORD: F _ _ _ _ _', { timeout: 5_000 });
    await expect(page.locator('#terminalOutput')).toContainText('MISSES: 0/6', { timeout: 5_000 });

    // Q is absent from FALKEN — a wrong guess.
    await guess('Q');
    await expect(page.locator('#terminalOutput')).toContainText('MISSES: 1/6', { timeout: 5_000 });
    await expect(page.locator('#terminalOutput')).toContainText('USED: F Q', { timeout: 5_000 });

    // Five more wrong letters (none present in FALKEN) end the game in a loss.
    for (const letter of ['W', 'X', 'Z', 'J', 'V']) await guess(letter);

    await expect(page.locator('#terminalOutput')).toContainText('WORD LOST.', { timeout: 5_000 });
    await expect(page.locator('#terminalOutput')).toContainText('WORD: FALKEN', { timeout: 5_000 });
    await expect(page.locator('#terminalOutput')).toContainText('SELECT OPTION:', { timeout: 5_000 }); // returned to menu
    expect(errors, `unexpected page errors: ${errors.join('\n')}`).toEqual([]);
  });
});

test.describe('HANGMAN (IT)', () => {
  test('starts with HANGMAN or PLAY HANGMAN in Italian, no page errors, correct initial display', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await forceFirstWord(page);
    await bootAndReachMenu(page, 'lang=it&', 'SELEZIONA OPZIONE:');

    await page.locator('#commandInput').fill('HANGMAN');
    await page.locator('#commandForm button[type=submit]').click();
    await expect(page.locator('#terminalOutput')).toContainText('INSERISCI UNA LETTERA:', { timeout: 5_000 });
    await expect(page.locator('#terminalOutput')).toContainText('WORD: _ _ _ _ _ _ _', { timeout: 5_000 }); // SISTEMA, 7 letters

    expect(errors, `unexpected page errors: ${errors.join('\n')}`).toEqual([]);
  });

  test('a correct letter, a wrong letter, and a loss all behave correctly in Italian', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await forceFirstWord(page);
    await bootAndReachMenu(page, 'lang=it&', 'SELEZIONA OPZIONE:');
    await page.locator('#commandInput').fill('PLAY HANGMAN');
    await page.locator('#commandForm button[type=submit]').click();
    await expect(page.locator('#terminalOutput')).toContainText('INSERISCI UNA LETTERA:', { timeout: 5_000 });

    async function guess(letter) {
      await page.locator('#commandInput').fill(letter);
      await page.locator('#commandForm button[type=submit]').click();
    }

    // SISTEMA contains S — a correct guess.
    await guess('S');
    await expect(page.locator('#terminalOutput')).toContainText('MISSES: 0/6', { timeout: 5_000 });

    // Q is absent from SISTEMA — a wrong guess.
    await guess('Q');
    await expect(page.locator('#terminalOutput')).toContainText('MISSES: 1/6', { timeout: 5_000 });

    for (const letter of ['W', 'X', 'Z', 'J', 'V']) await guess(letter);

    await expect(page.locator('#terminalOutput')).toContainText('PAROLA PERDUTA.', { timeout: 5_000 });
    await expect(page.locator('#terminalOutput')).toContainText('WORD: SISTEMA', { timeout: 5_000 });
    await expect(page.locator('#terminalOutput')).toContainText('SELEZIONA OPZIONE:', { timeout: 5_000 });
    expect(errors, `unexpected page errors: ${errors.join('\n')}`).toEqual([]);
  });
});
