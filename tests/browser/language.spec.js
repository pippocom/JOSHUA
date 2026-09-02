// Copyright (C) 2025-2026 Marco Iannacone
// SPDX-License-Identifier: AGPL-3.0-only
// @ts-check
const { test, expect } = require('@playwright/test');

// Section F — LANGUAGE. EN, IT, and a relative language switch that returns
// to the splash and requires a fresh BOOT click (a fresh user gesture).

test.describe('language switch', () => {
  test('EN splash shows EN copy and links to a relative ?lang=it URL', async ({ page }) => {
    await page.goto('/?lang=en');
    await expect(page.locator('#bootButton')).toHaveText('BOOT JOSHUA TERMINAL');
    const href = await page.locator('#langSwitchLink').getAttribute('href');
    expect(href).toMatch(/^\/(index\.html)?\?.*lang=it/);
    expect(href).not.toMatch(/pippo\.com|human-systems/);
  });

  test('IT splash shows IT copy and links to a relative ?lang=en URL', async ({ page }) => {
    await page.goto('/?lang=it');
    await expect(page.locator('#bootButton')).toHaveText('AVVIA JOSHUA TERMINAL');
    const href = await page.locator('#langSwitchLink').getAttribute('href');
    expect(href).toMatch(/^\/(index\.html)?\?.*lang=en/);
    expect(href).not.toMatch(/pippo\.com|human-systems/);
  });

  test('clicking the language link returns to splash in the new language and requires a fresh BOOT click', async ({ page }) => {
    await page.goto('/?lang=en');
    await page.locator('#langSwitchLink').click();
    await expect(page).toHaveURL(/lang=it/);
    await expect(page.locator('#splashScreen')).toBeVisible();
    await expect(page.locator('#crt')).toBeHidden();
    await expect(page.locator('#bootButton')).toHaveText('AVVIA JOSHUA TERMINAL');

    // No AudioContext should exist yet — the language switch is a fresh
    // navigation, so a new BOOT click (a new user gesture) is required.
    const state = await page.evaluate(() => window.JoshuaAudioManager.getDebugState());
    expect(state.hasContext).toBe(false);

    await page.locator('#bootButton').click();
    await expect(page.locator('#terminalOutput')).toContainText('SELEZIONA OPZIONE:', { timeout: 20_000 });
  });
});
