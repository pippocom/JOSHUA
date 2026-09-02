// Copyright (C) 2025-2026 Marco Iannacone
// SPDX-License-Identifier: AGPL-3.0-only
// @ts-check
const { test, expect } = require('@playwright/test');

// TIC-TAC-TOE / ZERO / crash / reboot. Uses ?fast=1 to complete
// the ten automated rounds and the ~15s overheat/reboot sequence quickly.

test.describe('tic-tac-toe ZERO overload and crash', () => {
  test('ZERO confirmation triggers exactly one crash effect and returns cleanly to the menu', async ({ page }) => {
    const consoleErrors = [];
    page.on('pageerror', (err) => consoleErrors.push(String(err)));
    page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

    await page.goto('/?fast=1&audioDebug=1&presentationSpeed=1');
    await page.locator('#bootButton').click();
    await expect(page.locator('#terminalOutput')).toContainText('SELECT OPTION:', { timeout: 15_000 });

    // Reveal + enter the hidden tic-tac-toe module.
    await page.locator('#commandInput').fill('TIC-TAC-TOE');
    await page.locator('#commandForm button[type=submit]').click();
    await expect(page.locator('#ticScreen')).toBeVisible();

    // Instrument the crash effect call count now that JoshuaAudioManager
    // exists, before triggering the real user gesture that uses it.
    await page.evaluate(() => {
      window.__crashCalls = 0;
      const orig = window.JoshuaAudioManager.playTicTacToeCrash;
      window.JoshuaAudioManager.playTicTacToeCrash = function (...args) {
        window.__crashCalls++;
        return orig.apply(window.JoshuaAudioManager, args);
      };
    });

    // Type Z-E-R-O via real keydown events, then confirm with Y.
    for (const key of ['Z', 'E', 'R', 'O']) {
      await page.locator('#ticBoard').focus().catch(() => {}); // board isn't focusable; keydown is document-level
      await page.keyboard.press(key);
    }
    await expect(page.locator('#ticStatus')).toContainText('ZERO', { timeout: 5_000 });
    await page.keyboard.press('Y');

    // Ten automated rounds + overload + reboot, accelerated by ?fast=1.
    await expect(page.locator('#ticScreen')).toHaveClass(/tic-overheat/, { timeout: 15_000 });
    await expect(page.locator('#ticScreen')).not.toHaveClass(/tic-overheat/, { timeout: 20_000 });
    await expect(page.locator('#terminalPanel')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('#terminalOutput')).toContainText('SELECT OPTION:', { timeout: 15_000 });

    const crashCalls = await page.evaluate(() => window.__crashCalls);
    expect(crashCalls).toBe(1);

    expect(consoleErrors, `unexpected console/page errors: ${consoleErrors.join('\n')}`).toEqual([]);
  });
});
