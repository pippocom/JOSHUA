// Copyright (C) 2025-2026 Marco Iannacone
// SPDX-License-Identifier: AGPL-3.0-only
// @ts-check
const { test, expect } = require('@playwright/test');

// FINALE. Completes all three scenarios (?fast=1 accelerates the
// war animations only — the closing narration keeps its own pacing) and
// verifies the closing beat, then the return to splash with no navigation.

// "RUN ANOTHER SCENARIO" (continueWar) goes straight back to faction
// selection, not the main menu — so only the very first call needs to type
// the GLOBAL THERMONUCLEAR WAR command; the 2nd/3rd calls are already
// sitting at the faction picker.
async function completeOneScenario(page, { fromMenu } = { fromMenu: false }) {
  if (fromMenu) {
    await page.locator('#commandInput').fill('GLOBAL THERMONUCLEAR WAR');
    await page.locator('#commandForm button[type=submit]').click();
  }
  await page.locator('#terminalOutput .choice-grid').first().locator('.choice-button').first().click(); // faction
  await page.locator('#terminalOutput .choice-grid').last().locator('.choice-button').first().click(); // scenario
  await expect(page.locator('#reportPanel')).toBeVisible({ timeout: 30_000 });
  await page.locator('#continueWar').click();
}

test.describe('final sequence (three scenarios)', () => {
  test('STRANGE GAME, chess line, and return to splash with no navigation', async ({ page }) => {
    test.setTimeout(120_000);
    const consoleErrors = [];
    page.on('pageerror', (err) => consoleErrors.push(String(err)));
    page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

    await page.goto('/?fast=1&presentationSpeed=1');
    await page.locator('#bootButton').click();
    await expect(page.locator('#terminalOutput')).toContainText('SELECT OPTION:', { timeout: 15_000 });

    await completeOneScenario(page, { fromMenu: true });
    await expect(page.locator('#terminalOutput .choice-grid').first()).toBeVisible({ timeout: 10_000 }); // back at faction picker
    await completeOneScenario(page);
    await expect(page.locator('#terminalOutput .choice-grid').first()).toBeVisible({ timeout: 10_000 });
    await completeOneScenario(page); // third completion triggers finalSequence()

    await expect(page.locator('#finalScreen')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('#finalText')).toContainText('STRANGE GAME', { timeout: 15_000 });
    await expect(page.locator('#finalText')).toContainText('THE ONLY WINNING MOVE', { timeout: 20_000 });
    await expect(page.locator('#finalText')).toContainText('HOW ABOUT A NICE GAME OF CHESS', { timeout: 20_000 });

    const urlBeforeReturn = page.url();
    await expect(page.locator('#returnConsole')).toBeVisible({ timeout: 5_000 });
    await page.locator('#returnConsole').click();

    await expect(page.locator('#splashScreen')).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('#crt')).toBeHidden();
    // The whole point of the standalone return button: it must NOT navigate
    // anywhere (not to pippo.com, not to a fresh "/") — the URL after
    // clicking it must be byte-identical to the URL right before the click.
    expect(page.url()).toBe(urlBeforeReturn);
    expect(page.url()).not.toMatch(/pippo\.com/);

    expect(consoleErrors, `unexpected console/page errors: ${consoleErrors.join('\n')}`).toEqual([]);
  });

  // The chess question is localized — verify the Italian display text actually
  // reaches the final screen.
  test('IT: final sequence displays the new Italian chess question', async ({ page }) => {
    test.setTimeout(120_000);
    const consoleErrors = [];
    page.on('pageerror', (err) => consoleErrors.push(String(err)));
    page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

    await page.goto('/?lang=it&fast=1&presentationSpeed=1');
    await page.locator('#bootButton').click();
    await expect(page.locator('#terminalOutput')).toContainText('SELEZIONA OPZIONE:', { timeout: 15_000 });

    await completeOneScenario(page, { fromMenu: true });
    await expect(page.locator('#terminalOutput .choice-grid').first()).toBeVisible({ timeout: 10_000 });
    await completeOneScenario(page);
    await expect(page.locator('#terminalOutput .choice-grid').first()).toBeVisible({ timeout: 10_000 });
    await completeOneScenario(page);

    await expect(page.locator('#finalScreen')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('#finalText')).toContainText('CHE NE PENSI DI UNA BELLA PARTITA A SCACCHI', { timeout: 20_000 });

    expect(consoleErrors, `unexpected console/page errors: ${consoleErrors.join('\n')}`).toEqual([]);
  });

  // The war report's outcome values (SEVERO/DEGRADATO/FALLITO) are localized;
  // they must render in Italian and never fall back to English literals.
  test('IT: war report renders Italian outcome values', async ({ page }) => {
    test.setTimeout(60_000);
    const consoleErrors = [];
    page.on('pageerror', (err) => consoleErrors.push(String(err)));
    page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

    await page.goto('/?lang=it&fast=1&presentationSpeed=1');
    await page.locator('#bootButton').click();
    await expect(page.locator('#terminalOutput')).toContainText('SELEZIONA OPZIONE:', { timeout: 15_000 });

    await page.locator('#commandInput').fill('GLOBAL THERMONUCLEAR WAR');
    await page.locator('#commandForm button[type=submit]').click();
    await page.locator('#terminalOutput .choice-grid').first().locator('.choice-button').first().click(); // faction
    await page.locator('#terminalOutput .choice-grid').last().locator('.choice-button').first().click(); // scenario
    await expect(page.locator('#reportPanel')).toBeVisible({ timeout: 30_000 });

    await expect(page.locator('#reportPanel')).toContainText('SEVERO');
    await expect(page.locator('#reportPanel')).toContainText('DEGRADATO');
    await expect(page.locator('#reportPanel')).toContainText('FALLITO');
    await expect(page.locator('#reportPanel')).not.toContainText('SEVERE');
    await expect(page.locator('#reportPanel')).not.toContainText('DEGRADED');
    await expect(page.locator('#reportPanel')).not.toContainText('FAILED');

    expect(consoleErrors, `unexpected console/page errors: ${consoleErrors.join('\n')}`).toEqual([]);
  });
});
