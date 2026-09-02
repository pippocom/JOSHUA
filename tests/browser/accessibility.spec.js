// Copyright (C) 2025-2026 Marco Iannacone
// SPDX-License-Identifier: AGPL-3.0-only
// @ts-check
const { test, expect } = require('@playwright/test');

// Accessibility coverage: keyboard/focus, accessible names and
// states, the single live-region announcement strategy, reduced-motion, and a
// narrow-viewport smoke check. These assert real DOM/semantics and behavior,
// not a full screen-reader simulation.

async function bootToMenu(page, qs = '', menuText = 'SELECT OPTION:') {
  await page.goto(`/?${qs}fast=1&presentationSpeed=2`);
  await page.locator('#bootButton').click();
  await expect(page.locator('#terminalOutput')).toContainText(menuText, { timeout: 15_000 });
}

async function sendCommand(page, text) {
  await page.locator('#commandInput').fill(text);
  await page.locator('#commandForm button[type=submit]').click();
}

test('the app is not a giant live region; a dedicated role="status" region exists', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#app')).not.toHaveAttribute('aria-live');
  const status = page.locator('#liveStatus');
  await expect(status).toHaveAttribute('role', 'status');
  // Visually hidden via clipping, NOT display:none, so screen readers still
  // announce it (display:none would remove it from the accessibility tree).
  const display = await status.evaluate((el) => getComputedStyle(el).display);
  expect(display).not.toBe('none');
});

test('the boot button receives focus on load so keyboard users can start immediately', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(120);
  const focusedId = await page.evaluate(() => document.activeElement && document.activeElement.id);
  expect(focusedId).toBe('bootButton');
});

test('after boot the command input is focused and has an accessible name', async ({ page }) => {
  await bootToMenu(page);
  await page.waitForTimeout(120);
  const active = await page.evaluate(() => document.activeElement && document.activeElement.id);
  expect(active).toBe('commandInput');
  await expect(page.locator('#commandInput')).toHaveAttribute('aria-label', 'COMMAND');
});

test('the menu transition is announced through the live region', async ({ page }) => {
  await bootToMenu(page);
  await expect(page.locator('#liveStatus')).toHaveText('SELECT OPTION:');
});

test('a completed game is announced through the live region (not the whole terminal)', async ({ page }) => {
  await bootToMenu(page);
  await sendCommand(page, 'SUDOKU');
  await sendCommand(page, 'SOLVE');
  await expect(page.locator('#liveStatus')).toHaveText('PUZZLE SOLVED.');
});

test('the war event log does not populate the live region line-by-line', async ({ page }) => {
  await bootToMenu(page);
  await sendCommand(page, 'GLOBAL THERMONUCLEAR WAR');
  await sendCommand(page, '1'); // faction
  await sendCommand(page, '1'); // scenario
  await expect(page.locator('#warRoom')).toBeVisible({ timeout: 5_000 });
  // The event log fills with many entries, but the live region should hold a
  // single short status (empty during the run, then the report message).
  const statusText = await page.locator('#liveStatus').textContent();
  expect((statusText || '').length).toBeLessThan(120);
});

test('MUTE is a button that toggles aria-pressed and remains keyboard-operable', async ({ page }) => {
  await bootToMenu(page);
  const mute = page.locator('#muteButton');
  await expect(mute).toHaveAttribute('aria-pressed', 'false');
  await mute.focus();
  await page.keyboard.press('Enter');
  await expect(mute).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Enter');
  await expect(mute).toHaveAttribute('aria-pressed', 'false');
});

test('reduced motion is recognized and disables trajectory/overheat animation', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto('/?fast=1&presentationSpeed=2');
  await expect(page.locator('#bootButton')).toBeVisible();
  const matches = await page.evaluate(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  expect(matches).toBe(true);

  await page.locator('#bootButton').click();
  await expect(page.locator('#terminalOutput')).toContainText('SELECT OPTION:', { timeout: 15_000 });
  await sendCommand(page, 'GLOBAL THERMONUCLEAR WAR');
  await sendCommand(page, '1');
  await sendCommand(page, '1');
  await expect(page.locator('#warRoom')).toBeVisible({ timeout: 5_000 });
  await expect(page.locator('#warOverlay path.trajectory').first()).toBeVisible({ timeout: 10_000 });
  const animationName = await page.evaluate(() => getComputedStyle(document.querySelector('#warOverlay path.trajectory')).animationName);
  expect(animationName).toBe('none');

  // Logical flow still completes: abort back to the menu.
  await page.locator('#abortWar').click();
  await expect(page.locator('#terminalOutput')).toContainText('SELECT OPTION:', { timeout: 5_000 });
  await context.close();
});

test('narrow viewport keeps primary controls reachable and the input usable', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await bootToMenu(page);
  await expect(page.locator('#muteButton')).toBeVisible();
  await expect(page.locator('#commandInput')).toBeVisible();
  await sendCommand(page, 'HELP');
  await expect(page.locator('#terminalOutput')).toContainText('AVAILABLE COMMANDS:', { timeout: 5_000 });
});
