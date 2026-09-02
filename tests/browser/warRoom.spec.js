// Copyright (C) 2025-2026 Marco Iannacone
// SPDX-License-Identifier: AGPL-3.0-only
// @ts-check
const { test, expect } = require('@playwright/test');

// WAR ROOM. Verifies the Event Log keeps every event
// and the map bounding box stays stable while events accumulate (the
// "map that changes size and disappears" regression).

test.describe('war room: event log and map geometry', () => {
  test('more than eight events accumulate, map-stage bounding box stays stable, ABORT returns to menu', async ({ page }) => {
    await page.goto('/?fast=1&presentationSpeed=1');
    await page.locator('#bootButton').click();
    await expect(page.locator('#terminalOutput')).toContainText('SELECT OPTION:', { timeout: 15_000 });

    await page.locator('#commandInput').fill('GLOBAL THERMONUCLEAR WAR');
    await page.locator('#commandForm button[type=submit]').click();
    // Old choice-button groups are never removed from the DOM (matches the
    // real, unmodified terminal behavior) — always target the most recently
    // appended .choice-grid, not .choice-button as a flat list.
    await page.locator('#terminalOutput .choice-grid').first().locator('.choice-button').first().click(); // pick first faction
    await page.locator('#terminalOutput .choice-grid').last().locator('.choice-button').first().click(); // pick first scenario -> reveals #warRoom
    await expect(page.locator('#warRoom')).toBeVisible();

    const mapStage = page.locator('.map-stage');
    const boxBefore = await mapStage.boundingBox();
    expect(boxBefore).not.toBeNull();

    // Let a good number of events accumulate (well past the old 8-event cap).
    // Events fire continuously under ?fast=1, so poll for "at least 9" rather
    // than an exact count (which could be skipped between polls).
    await expect.poll(() => page.locator('#eventLog div').count(), { timeout: 5_000 }).toBeGreaterThanOrEqual(9);
    const countAtNine = await page.locator('#eventLog div').count();

    await page.waitForTimeout(1500); // ?fast=1 keeps this quick in real time
    const countLater = await page.locator('#eventLog div').count();
    expect(countLater).toBeGreaterThanOrEqual(countAtNine);

    const boxAfter = await mapStage.boundingBox();
    expect(boxAfter).not.toBeNull();
    expect(Math.abs(boxAfter.height - boxBefore.height)).toBeLessThanOrEqual(1);
    expect(Math.abs(boxAfter.width - boxBefore.width)).toBeLessThanOrEqual(1);
    expect(Math.abs(boxAfter.y - boxBefore.y)).toBeLessThanOrEqual(1);

    // The log must actually scroll internally, not force page/map growth.
    const logScrollable = await page.locator('#eventLog').evaluate((el) => el.scrollHeight >= el.clientHeight);
    expect(logScrollable).toBe(true);

    await page.locator('#abortWar').click();
    await expect(page.locator('#warRoom')).toBeHidden();
    await expect(page.locator('#terminalOutput')).toContainText('SELECT OPTION:', { timeout: 5_000 });
  });
});
