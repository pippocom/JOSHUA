// Copyright (C) 2025-2026 Marco Iannacone
// SPDX-License-Identifier: AGPL-3.0-only
// @ts-check
const { test, expect } = require('@playwright/test');

// TIC-TAC-TOE mark beep — browser coverage. Does NOT attempt to judge the
// timbre perceptually (impossible with Playwright); it only checks that the
// media-lab controls work, that the API is invoked exactly where a mark is
// genuinely placed (and nowhere else), and that MUTE/crash lifecycle don't
// break anything.

test.describe('media-lab: TIC-TAC-TOE mark buttons', () => {
  test('PLAY X MARK / PLAY O MARK are present and invocable with no console errors', async ({ page }) => {
    const consoleErrors = [];
    page.on('pageerror', (err) => consoleErrors.push(String(err)));
    page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

    await page.goto('/dev/media-lab.html');
    await expect(page.locator('#playXMarkButton')).toBeVisible();
    await expect(page.locator('#playOMarkButton')).toBeVisible();

    await page.locator('#enableAudioButton').click();
    await page.locator('#playXMarkButton').click();
    await page.locator('#playOMarkButton').click();

    expect(consoleErrors, `unexpected console/page errors: ${consoleErrors.join('\n')}`).toEqual([]);
  });
});

test.describe('GLOBAL TIC-TAC-TOE: mark beep integration', () => {
  async function instrumentMarkCalls(page) {
    await page.evaluate(() => {
      window.__markCalls = [];
      const orig = window.JoshuaAudioManager.playTicTacToeMark;
      window.JoshuaAudioManager.playTicTacToeMark = function (mark) {
        window.__markCalls.push(mark);
        return orig.apply(window.JoshuaAudioManager, arguments);
      };
    });
  }

  test('a valid player move invokes the API exactly once for X, and WOPR\'s reply invokes it once for O', async ({ page }) => {
    const consoleErrors = [];
    page.on('pageerror', (err) => consoleErrors.push(String(err)));
    page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

    await page.goto('/?fast=1&presentationSpeed=1');
    await page.locator('#bootButton').click();
    await expect(page.locator('#terminalOutput')).toContainText('SELECT OPTION:', { timeout: 15_000 });

    await page.locator('#commandInput').fill('TIC-TAC-TOE');
    await page.locator('#commandForm button[type=submit]').click();
    await expect(page.locator('#ticScreen')).toBeVisible();

    await instrumentMarkCalls(page);

    // Center cell (5) — a valid first move.
    await page.keyboard.press('5');
    await expect.poll(() => page.evaluate(() => window.__markCalls.length), { timeout: 5_000 }).toBeGreaterThanOrEqual(1);
    // Give WOPR's delayed reply time to land.
    await page.waitForTimeout(400);
    const calls = await page.evaluate(() => window.__markCalls);
    assert_(calls[0] === 'X', 'first call must be for the player\'s X');
    assert_(calls.includes('O'), 'WOPR\'s automatic reply must have produced an O beep');
    assert_(calls.length === 2, `expected exactly 2 calls (X then O), got ${calls.length}: ${calls}`);

    // Re-pressing the SAME cell (now occupied) must not produce another call.
    await page.keyboard.press('5');
    await page.waitForTimeout(100);
    const callsAfterRepeat = await page.evaluate(() => window.__markCalls.length);
    expect(callsAfterRepeat, 'pressing an already-occupied cell must not produce another beep').toBe(2);

    expect(consoleErrors, `unexpected console/page errors: ${consoleErrors.join('\n')}`).toEqual([]);

    function assert_(cond, msg) { if (!cond) throw new Error(msg); }
  });

  test('the ZERO-player automated sequence produces both X and O beeps, and the crash still fires exactly once', async ({ page }) => {
    const consoleErrors = [];
    page.on('pageerror', (err) => consoleErrors.push(String(err)));
    page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

    await page.goto('/?fast=1&presentationSpeed=1');
    await page.locator('#bootButton').click();
    await expect(page.locator('#terminalOutput')).toContainText('SELECT OPTION:', { timeout: 15_000 });

    await page.locator('#commandInput').fill('TIC-TAC-TOE');
    await page.locator('#commandForm button[type=submit]').click();
    await expect(page.locator('#ticScreen')).toBeVisible();

    await instrumentMarkCalls(page);
    await page.evaluate(() => {
      window.__crashCalls = 0;
      const orig = window.JoshuaAudioManager.playTicTacToeCrash;
      window.JoshuaAudioManager.playTicTacToeCrash = function (...args) {
        window.__crashCalls++;
        return orig.apply(window.JoshuaAudioManager, args);
      };
    });

    for (const key of ['Z', 'E', 'R', 'O']) await page.keyboard.press(key);
    await expect(page.locator('#ticStatus')).toContainText('ZERO', { timeout: 5_000 });
    await page.keyboard.press('Y');

    await expect(page.locator('#ticScreen')).toHaveClass(/tic-overheat/, { timeout: 15_000 });

    const calls = await page.evaluate(() => window.__markCalls);
    expect(calls.filter((m) => m === 'X').length).toBeGreaterThan(0);
    expect(calls.filter((m) => m === 'O').length).toBeGreaterThan(0);

    await expect(page.locator('#ticScreen')).not.toHaveClass(/tic-overheat/, { timeout: 20_000 });
    await expect(page.locator('#terminalOutput')).toContainText('SELECT OPTION:', { timeout: 15_000 });

    const crashCalls = await page.evaluate(() => window.__crashCalls);
    expect(crashCalls).toBe(1);

    expect(consoleErrors, `unexpected console/page errors: ${consoleErrors.join('\n')}`).toEqual([]);
  });

  test('MUTE does not break the game or the mark API call sequence', async ({ page }) => {
    await page.goto('/?fast=1&presentationSpeed=1');
    await page.locator('#bootButton').click();
    await expect(page.locator('#terminalOutput')).toContainText('SELECT OPTION:', { timeout: 15_000 });

    await page.locator('#muteButton').click();
    const state = await page.evaluate(() => window.JoshuaAudioManager.getDebugState());
    expect(state.muted).toBe(true);

    await page.locator('#commandInput').fill('TIC-TAC-TOE');
    await page.locator('#commandForm button[type=submit]').click();
    await expect(page.locator('#ticScreen')).toBeVisible();

    await instrumentMarkCalls(page);
    await page.keyboard.press('1');
    await page.waitForTimeout(400);
    // The API is still invoked while muted (game logic doesn't know about
    // mute) — audibility itself (no oscillator scheduled) is covered by the
    // Node unit tests; here we only confirm muting never breaks the move.
    const calls = await page.evaluate(() => window.__markCalls);
    expect(calls.length).toBeGreaterThanOrEqual(1);
    await expect(page.locator('.tic-cell').first()).not.toHaveText('');
  });
});

test.describe('regression: splash and war soundscape are unaffected by this change', () => {
  test('splash layout controls and war soundscape API are unchanged', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#langSwitchLink')).toBeVisible();
    await expect(page.locator('#splashVersion')).toHaveText('v. 0.69.1');
    await expect(page.locator('#bootButton')).toHaveText('BOOT JOSHUA TERMINAL');

    await page.locator('#bootButton').click();
    const hasWarSoundscapeApi = await page.evaluate(() => (
      typeof window.JoshuaAudioManager.startWarSoundscape === 'function' &&
      typeof window.JoshuaAudioManager.stopWarSoundscape === 'function'
    ));
    expect(hasWarSoundscapeApi).toBe(true);
  });
});
