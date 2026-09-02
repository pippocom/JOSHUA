// Copyright (C) 2025-2026 Marco Iannacone
// SPDX-License-Identifier: AGPL-3.0-only
// @ts-check
const { test, expect } = require('@playwright/test');

// Verifies runScenario()'s error boundary end-to-end, in a real browser, by serving a deliberately corrupted src/data/warRoutes.js for
// this test only (nothing on disk is touched) — a node id that does not
// exist in nodes.js. warMap.js performs an explicit checked lookup for arc
// endpoints, so this reproduces the exact class of bug
// tests/unit/warGeoValidation.test.js is meant to catch before it ever
// reaches a player. The simulation must degrade gracefully instead of
// hanging or leaving audio running.

test('a corrupted geographic id degrades gracefully: error message shown, audio stopped, back at the menu, no false report', async ({ page }) => {
  await page.route('**/data/warRoutes.js', async (route) => {
    await route.fulfill({
      contentType: 'application/javascript',
      body: "window.JOSHUA_GLOBAL_WORLD_PAIRS = [['this-node-id-does-not-exist','also-missing']];"
    });
  });

  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));

  await page.goto('/?fast=1&presentationSpeed=1');
  await page.locator('#bootButton').click();
  await expect(page.locator('#terminalOutput')).toContainText('SELECT OPTION:', { timeout: 15_000 });

  // "WAR" alone is deliberately rejected (the full title is required, see
  // warTitleResolver.spec.js) — the full title is needed here.
  await page.locator('#commandInput').fill('GLOBAL THERMONUCLEAR WAR');
  await page.locator('#commandForm button[type=submit]').click();
  await page.locator('#terminalOutput .choice-grid').first().locator('.choice-button').first().click();
  await page.locator('#terminalOutput .choice-grid').last().locator('.choice-button').first().click();
  await expect(page.locator('#warRoom')).toBeVisible({ timeout: 5_000 });

  // The bad ids are only reached near the very end of the scenario
  // (the final animatePairs(GLOBAL_WORLD_PAIRS...) call) — generous timeout.
  await expect(page.locator('#terminalOutput')).toContainText('SIMULATION ERROR', { timeout: 40_000 });
  await expect(page.locator('#terminalOutput')).toContainText('SELECT OPTION:', { timeout: 5_000 });
  await expect(page.locator('#reportPanel')).toBeHidden();

  const state = await page.evaluate(() => window.JoshuaAudioManager.getWarSoundscapeDebugState());
  expect(state.running).toBe(false);
  expect(state.activeVoices).toBe(0);

  // The failure is caught internally (try/catch in runScenario()) — it
  // must never surface as an uncaught page error.
  expect(errors, `unexpected uncaught page errors: ${errors.join('\n')}`).toEqual([]);
});
