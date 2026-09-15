// Copyright (C) 2025-2026 Marco Iannacone
// SPDX-License-Identifier: AGPL-3.0-only
// @ts-check
const { test, expect } = require('@playwright/test');

// GLOBAL THERMONUCLEAR WAR soundscape — browser coverage. This does NOT try
// to validate the audio perceptually (impossible with Playwright); it only
// checks that the media-lab controls exist and work, that a real war
// simulation completes normally with audio enabled, and that the
// soundscape's lifecycle (start/stop/abort/exit/scenario-change) behaves —
// same spirit as the existing splash/boot/tic-tac-toe/war-room specs.

test.describe('media-lab: war soundscape controls', () => {
  test('war soundscape section is present, START/STOP/MUTE/play buttons work with no console errors', async ({ page }) => {
    const consoleErrors = [];
    page.on('pageerror', (err) => consoleErrors.push(String(err)));
    page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

    await page.goto('/dev/media-lab.html');

    for (const id of [
      'startWarSoundscapeButton', 'stopWarSoundscapeButton', 'warIntensitySlider',
      'playMissileLaunchButton', 'playMissileFlightButton', 'playNormalImpactButton',
      'playLargeImpactButton', 'playFireBurstButton', 'demoEscalationButton'
    ]) {
      await expect(page.locator('#' + id)).toBeVisible();
    }

    await page.locator('#enableAudioButton').click();
    await page.locator('#startWarSoundscapeButton').click();
    let state = await page.evaluate(() => window.JoshuaAudioManager.getWarSoundscapeDebugState());
    expect(state.running).toBe(true);

    await page.locator('#playMissileLaunchButton').click();
    await page.locator('#playNormalImpactButton').click();
    await page.locator('#playLargeImpactButton').click();
    await page.locator('#playFireBurstButton').click();
    await page.locator('#playMissileFlightButton').click();

    await page.locator('#warIntensitySlider').fill('75');
    state = await page.evaluate(() => window.JoshuaAudioManager.getWarSoundscapeDebugState());
    expect(state.intensity).toBeCloseTo(0.75, 1);

    await page.locator('#muteAudioButton').click(); // MUTE must not error while the soundscape is running
    await page.locator('#stopWarSoundscapeButton').click();
    state = await page.evaluate(() => window.JoshuaAudioManager.getWarSoundscapeDebugState());
    expect(state.running).toBe(false);
    expect(state.activeVoices).toBe(0);

    expect(consoleErrors, `unexpected console/page errors: ${consoleErrors.join('\n')}`).toEqual([]);
  });

  test('DEMO ESCALATION runs briefly and always stops on its own or via STOP', async ({ page }) => {
    await page.goto('/dev/media-lab.html');
    await page.locator('#enableAudioButton').click();
    await page.locator('#demoEscalationButton').click();
    let state = await page.evaluate(() => window.JoshuaAudioManager.getWarSoundscapeDebugState());
    expect(state.running).toBe(true);

    // Interrupting it early must stop it immediately, not just eventually.
    await page.locator('#stopWarSoundscapeButton').click();
    state = await page.evaluate(() => window.JoshuaAudioManager.getWarSoundscapeDebugState());
    expect(state.running).toBe(false);

    // Run it again and let it finish on its own (it self-stops).
    await page.locator('#demoEscalationButton').click();
    await expect.poll(
      () => page.evaluate(() => window.JoshuaAudioManager.getWarSoundscapeDebugState().running),
      { timeout: 10_000 }
    ).toBe(false);
  });
});

test.describe('GLOBAL THERMONUCLEAR WAR: soundscape lifecycle inside the real app', () => {
  test('a war scenario runs to a visible report with audio enabled, and ABORT stops the soundscape', async ({ page }) => {
    const consoleErrors = [];
    page.on('pageerror', (err) => consoleErrors.push(String(err)));
    page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

    await page.goto('/?fast=1&presentationSpeed=1');
    await page.locator('#bootButton').click();
    await expect(page.locator('#terminalOutput')).toContainText('SELECT OPTION:', { timeout: 15_000 });

    await page.locator('#commandInput').fill('GLOBAL THERMONUCLEAR WAR');
    await page.locator('#commandForm button[type=submit]').click();
    await page.locator('#terminalOutput .choice-grid').first().locator('.choice-button').first().click();
    await page.locator('#terminalOutput .choice-grid').last().locator('.choice-button').first().click();
    await expect(page.locator('#warRoom')).toBeVisible();

    // The soundscape should be running while the simulation is animating.
    await expect.poll(
      () => page.evaluate(() => window.JoshuaAudioManager.getWarSoundscapeDebugState().running),
      { timeout: 5_000 }
    ).toBe(true);

    // ABORT stops it immediately, before the scenario's own natural end.
    await page.locator('#abortWar').click();
    await expect(page.locator('#warRoom')).toBeHidden();
    const stateAfterAbort = await page.evaluate(() => window.JoshuaAudioManager.getWarSoundscapeDebugState());
    expect(stateAfterAbort.running).toBe(false);
    expect(stateAfterAbort.activeVoices).toBe(0);

    expect(consoleErrors, `unexpected console/page errors: ${consoleErrors.join('\n')}`).toEqual([]);
  });

  test('starting a second scenario after ABORT does not leave two soundscapes running', async ({ page }) => {
    await page.goto('/?fast=1&presentationSpeed=1');
    await page.locator('#bootButton').click();
    await expect(page.locator('#terminalOutput')).toContainText('SELECT OPTION:', { timeout: 15_000 });

    await page.locator('#commandInput').fill('GLOBAL THERMONUCLEAR WAR');
    await page.locator('#commandForm button[type=submit]').click();
    await page.locator('#terminalOutput .choice-grid').first().locator('.choice-button').first().click();
    await page.locator('#terminalOutput .choice-grid').last().locator('.choice-button').first().click();
    await expect(page.locator('#warRoom')).toBeVisible();
    await page.locator('#abortWar').click();
    await expect(page.locator('#terminalOutput')).toContainText('SELECT OPTION:', { timeout: 5_000 });

    await page.locator('#commandInput').fill('GLOBAL THERMONUCLEAR WAR');
    await page.locator('#commandForm button[type=submit]').click();
    await page.locator('#terminalOutput .choice-grid').first().locator('.choice-button').first().click();
    await page.locator('#terminalOutput .choice-grid').last().locator('.choice-button').first().click();
    await expect(page.locator('#warRoom')).toBeVisible();

    await expect.poll(
      () => page.evaluate(() => window.JoshuaAudioManager.getWarSoundscapeDebugState().running),
      { timeout: 5_000 }
    ).toBe(true);
    // A single, bounded voice budget is still respected — no accumulation
    // from the first (aborted) session leaking into the second one.
    const state = await page.evaluate(() => window.JoshuaAudioManager.getWarSoundscapeDebugState());
    expect(state.activeVoices).toBeLessThanOrEqual(state.maxVoices);

    await page.locator('#abortWar').click();
  });

  test('EXIT (return to splash) leaves no war soundscape running', async ({ page }) => {
    await page.goto('/?fast=1&presentationSpeed=1');
    await page.locator('#bootButton').click();
    await expect(page.locator('#terminalOutput')).toContainText('SELECT OPTION:', { timeout: 15_000 });

    await page.locator('#commandInput').fill('GLOBAL THERMONUCLEAR WAR');
    await page.locator('#commandForm button[type=submit]').click();
    await page.locator('#terminalOutput .choice-grid').first().locator('.choice-button').first().click();
    await page.locator('#terminalOutput .choice-grid').last().locator('.choice-button').first().click();
    await expect(page.locator('#warRoom')).toBeVisible();
    await page.locator('#abortWar').click();
    await expect(page.locator('#terminalOutput')).toContainText('SELECT OPTION:', { timeout: 5_000 });

    await page.locator('#commandInput').fill('EXIT');
    await page.locator('#commandForm button[type=submit]').click();
    await expect(page.locator('#splashScreen')).toBeVisible();
    await expect(page.locator('#crt')).toBeHidden();

    const state = await page.evaluate(() => window.JoshuaAudioManager.getWarSoundscapeDebugState());
    expect(state.running).toBe(false);
    expect(state.activeVoices).toBe(0);

    // Splash layout/IT-EN selector must be exactly as the layout fix left
    // them — this task did not touch the splash at all.
    await expect(page.locator('#langSwitchLink')).toBeVisible();
    await expect(page.locator('#splashVersion')).toHaveText('v. 0.69.1');
    const html = await page.content();
    expect(html).not.toMatch(/media-lab/);
  });
});
