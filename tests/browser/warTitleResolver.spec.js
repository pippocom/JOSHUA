// Copyright (C) 2025-2026 Marco Iannacone
// SPDX-License-Identifier: AGPL-3.0-only
// @ts-check
const { test, expect } = require('@playwright/test');

// The war simulation only accepts its two complete titles — English and
// Italian — regardless of which UI language is currently selected.
// Abbreviations, partial forms, and misspellings are deliberately rejected;
// this is an intentional design decision, not a typo fix. See PLAYING.md /
// PLAYING.it.md.
//
// Performance note: rejected commands leave the terminal in menu mode and
// accepted commands re-enter faction selection (both without a re-boot), so
// each language boots once per accepted/rejected group instead of once per
// command. presentationSpeed=2 (the maximum) further halves the boot
// animation.

const ACCEPTED = [
  'GLOBAL THERMONUCLEAR WAR',
  'GUERRA TERMONUCLEARE TOTALE',
  'PLAY GLOBAL THERMONUCLEAR WAR',
  'PLAY GUERRA TERMONUCLEARE TOTALE',
];

const REJECTED = [
  'WAR',
  'THERMONUCLEAR WAR',
  'TERMONUCLEAR WAR',
  'GLOBAL TERMONUCLEAR WAR',
  'GUERRA TERMONUCLEARE',
  'GUERRA TOTALE',
  'PLAY WAR',
  'PLAY THERMONUCLEAR WAR',
  'PLAY TERMONUCLEAR WAR',
  'PLAY GLOBAL TERMONUCLEAR WAR',
  'PLAY GUERRA TERMONUCLEARE',
  'PLAY GUERRA TOTALE',
];

async function bootToMenu(page, qs, menuText) {
  await page.goto(`/?${qs}fast=1&presentationSpeed=2`);
  await page.locator('#bootButton').click();
  await expect(page.locator('#terminalOutput')).toContainText(menuText, { timeout: 15_000 });
}

async function sendCommand(page, text) {
  await page.locator('#commandInput').fill(text);
  await page.locator('#commandForm button[type=submit]').click();
}

for (const [langLabel, qs, menuText, notRecognized, selectFaction] of [
  ['EN', '', 'SELECT OPTION:', 'COMMAND NOT RECOGNIZED', 'SELECT FACTION'],
  ['IT', 'lang=it&', 'SELEZIONA OPZIONE:', 'COMANDO NON RICONOSCIUTO', 'SELEZIONA FAZIONE'],
]) {
  test.describe(`war title resolver (${langLabel} UI)`, () => {
    test('every accepted full title starts the simulation and reaches faction selection', async ({ page }) => {
      const errors = [];
      let currentCmd = '';
      page.on('pageerror', (e) => errors.push(`${currentCmd}: ${String(e)}`));
      await bootToMenu(page, qs, menuText);

      // Each accepted command re-enters faction selection (the resolver path
      // clears and re-renders "SELECT FACTION"), so all four can be exercised
      // from a single boot.
      for (const cmd of ACCEPTED) {
        currentCmd = cmd;
        await sendCommand(page, cmd);
        await expect(
          page.locator('#terminalOutput'),
          `Expected "${cmd}" to start the simulation`
        ).toContainText(selectFaction, { timeout: 5_000 });
      }
      expect(errors, `unexpected page errors: ${errors.join('\n')}`).toEqual([]);
    });

    test('every rejected partial/abbreviated form leaves the user at the terminal', async ({ page }) => {
      const errors = [];
      let currentCmd = '';
      page.on('pageerror', (e) => errors.push(`${currentCmd}: ${String(e)}`));
      await bootToMenu(page, qs, menuText);

      // A rejected command stays in menu mode, so all twelve can be exercised
      // from a single boot. The terminal output accumulates, so each command
      // is asserted against its own last-appended line rather than the whole
      // (already-populated) output.
      for (const cmd of REJECTED) {
        currentCmd = cmd;
        await sendCommand(page, cmd);
        await expect(
          page.locator('#terminalOutput .terminal-line').last(),
          `Expected "${cmd}" to be rejected`
        ).toContainText(notRecognized, { timeout: 5_000 });
      }
      await expect(page.locator('#warRoom')).toBeHidden();
      await expect(page.locator('#terminalPanel')).toBeVisible();
      expect(errors, `unexpected page errors: ${errors.join('\n')}`).toEqual([]);
    });

    test('other games still work without regression', async ({ page }) => {
      const errors = [];
      page.on('pageerror', (e) => errors.push(String(e)));

      await bootToMenu(page, qs, menuText);
      await sendCommand(page, 'TIC-TAC-TOE');
      await expect(page.locator('#ticScreen')).toBeVisible({ timeout: 5_000 });

      await bootToMenu(page, qs, menuText);
      await sendCommand(page, langLabel === 'IT' ? 'IMPICCATO' : 'HANGMAN');
      await expect(page.locator('#terminalOutput')).toContainText(
        langLabel === 'IT' ? 'INSERISCI UNA LETTERA:' : 'ENTER A LETTER:',
        { timeout: 5_000 }
      );

      await bootToMenu(page, qs, menuText);
      await sendCommand(page, 'SUDOKU');
      await expect(page.locator('#terminalOutput')).toContainText(
        langLabel === 'IT' ? 'INSERISCI SET RIGA COLONNA VALORE' : 'ENTER SET ROW COL VALUE',
        { timeout: 5_000 }
      );

      expect(errors, `unexpected page errors: ${errors.join('\n')}`).toEqual([]);
    });
  });
}
