// Copyright (C) 2025-2026 Marco Iannacone
// SPDX-License-Identifier: AGPL-3.0-only
// @ts-check
const { test, expect } = require('@playwright/test');

// SPLASH/BOOT. Runs against whichever project (chromium/webkit)
// Playwright was invoked with. WebKit here is Playwright's WebKit engine —
// it is NOT a substitute for testing real Safari on macOS.

test.describe('splash and boot', () => {
  test('opens to splash only, terminal hidden, no navigation on BOOT, sequence completes', async ({ page }) => {
    const consoleErrors = [];
    page.on('pageerror', (err) => consoleErrors.push(String(err)));
    page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

    await page.goto('/?fast=1&presentationSpeed=1');

    await expect(page.locator('#splashScreen')).toBeVisible();
    await expect(page.locator('#crt')).toBeHidden();
    await expect(page.locator('#bootButton')).toBeVisible();

    // No AudioContext should exist before the click.
    const beforeClick = await page.evaluate(() => window.JoshuaAudioManager.getDebugState());
    expect(beforeClick.hasContext).toBe(false);

    const urlBefore = page.url();
    await page.locator('#bootButton').click();
    expect(page.url()).toBe(urlBefore); // no navigation

    await expect(page.locator('#splashScreen')).toBeHidden();
    await expect(page.locator('#crt')).toBeVisible();
    await expect(page.locator('#terminalPanel')).toBeVisible();

    // Either the context is confirmed running, or the fallback path is
    // explicitly detectable via the debug state — either is an acceptable,
    // observable outcome; silent ambiguity is not.
    const afterClick = await page.evaluate(() => window.JoshuaAudioManager.getDebugState());
    expect(afterClick.hasContext).toBe(true);
    expect(typeof afterClick.confirmedRunning).toBe('boolean');

    // Full boot sequence: prelude -> greeting -> playPrompt -> menu, with no
    // pending Promise ever blocking the visible outcome.
    await expect(page.locator('#terminalOutput')).toContainText('STRATEGIC GAME MODULE ONLINE', { timeout: 10_000 });
    await expect(page.locator('#terminalOutput')).toContainText('GREETINGS PROFESSOR FALKEN.', { timeout: 10_000 });
    await expect(page.locator('#terminalOutput')).toContainText('SHALL WE PLAY A GAME?', { timeout: 10_000 });
    await expect(page.locator('#terminalOutput')).toContainText('SELECT OPTION:', { timeout: 10_000 });

    expect(consoleErrors, `unexpected console/page errors: ${consoleErrors.join('\n')}`).toEqual([]);
  });

  test('Italian boot sequence completes with Italian text', async ({ page }) => {
    await page.goto('/?lang=it&fast=1');
    await page.locator('#bootButton').click();
    await expect(page.locator('#terminalOutput')).toContainText('MODULO GIOCHI STRATEGICI ONLINE', { timeout: 10_000 });
    await expect(page.locator('#terminalOutput')).toContainText('SALVE PROFESSOR FALKEN.', { timeout: 10_000 });
    await expect(page.locator('#terminalOutput')).toContainText('VOGLIAMO FARE UNA PARTITA?', { timeout: 10_000 });
    await expect(page.locator('#terminalOutput')).toContainText('SELEZIONA OPZIONE:', { timeout: 10_000 });
  });
});
