// Copyright (C) 2025-2026 Marco Iannacone
// SPDX-License-Identifier: AGPL-3.0-only
// @ts-check
const { test, expect } = require('@playwright/test');

// Build smoke tests: verify each generated artifact boots, has the correct
// initial language and language/return targets, and loads no broken resources.
// Run via `npx playwright test --config=playwright.build.config.js` (after
// `make build`). Chromium only — these assert build wiring, not engine parity.

const STANDALONE = 'http://127.0.0.1:4175/index.html';
const PIPPOP = 'http://127.0.0.1:4176';

async function bootApp(page, url, menuText) {
  const failures = [];
  page.on('response', (r) => { if (r.status() >= 400) failures.push(`${r.status()} ${r.url()}`); });
  page.on('requestfailed', (r) => failures.push(`failed ${r.url()}`));
  // presentationSpeed=2 accelerates the boot animation only; it never changes
  // game-rule timing, language, or navigation.
  const sep = url.includes('?') ? '&' : '?';
  await page.goto(`${url}${sep}presentationSpeed=2`);
  await page.locator('#bootButton').click();
  await expect(page.locator('#terminalOutput')).toContainText(menuText, { timeout: 15_000 });
  return failures;
}

async function sendCommand(page, text) {
  await page.locator('#commandInput').fill(text);
  await page.locator('#commandForm button[type=submit]').click();
}

test('standalone build boots, plays, and has standalone navigation', async ({ page }) => {
  const failures = await bootApp(page, STANDALONE, 'SELECT OPTION:');
  await sendCommand(page, 'SUDOKU');
  await sendCommand(page, 'SOLVE');
  await expect(page.locator('#terminalOutput')).toContainText('PUZZLE SOLVED.', { timeout: 5_000 });

  // Standalone ships no build config; the language switch is same-document ?lang=it.
  const build = await page.evaluate(() => window.JOSHUA_BUILD);
  expect(build).toBeUndefined();
  const langHref = await page.locator('#langSwitchLink').getAttribute('href');
  expect(langHref).toContain('lang=it');
  expect(failures, `broken resources: ${failures.join('\n')}`).toEqual([]);
});

test('English pippo build boots in English and targets the Italian tree', async ({ page }) => {
  const failures = await bootApp(page, `${PIPPOP}/human-systems/interactive-fiction/joshua/index.html`, 'SELECT OPTION:');
  const build = await page.evaluate(() => window.JOSHUA_BUILD);
  expect(build.lang).toBe('en');
  expect(build.returnHref).toBe('/');
  expect(await page.locator('#langSwitchLink').getAttribute('href')).toBe('/it/human-systems/interactive-fiction/joshua/index.html');

  await sendCommand(page, 'GLOBAL THERMONUCLEAR WAR');
  await expect(page.locator('#terminalOutput')).toContainText('SELECT FACTION:', { timeout: 5_000 });
  expect(failures, `broken resources: ${failures.join('\n')}`).toEqual([]);
});

test('Italian pippo build boots in Italian and targets the English tree', async ({ page }) => {
  const failures = await bootApp(page, `${PIPPOP}/it/human-systems/interactive-fiction/joshua/index.html`, 'SELEZIONA OPZIONE:');
  const build = await page.evaluate(() => window.JOSHUA_BUILD);
  expect(build.lang).toBe('it');
  expect(build.returnHref).toBe('/it/');
  expect(await page.locator('#langSwitchLink').getAttribute('href')).toBe('/human-systems/interactive-fiction/joshua/index.html');

  await sendCommand(page, 'GUERRA TERMONUCLEARE TOTALE');
  await expect(page.locator('#terminalOutput')).toContainText('SELEZIONA FAZIONE:', { timeout: 5_000 });
  expect(failures, `broken resources: ${failures.join('\n')}`).toEqual([]);
});
