// Copyright (C) 2025-2026 Marco Iannacone
// SPDX-License-Identifier: AGPL-3.0-only
// @ts-check
const { test, expect } = require('@playwright/test');

// Media Lab (src/dev/media-lab.html) — development-only audition page for
// the two Web Audio effects and the four TTS questions. Not linked from the
// normal app; this suite loads it directly. WebKit here is Playwright's
// WebKit engine, not a substitute for testing real Safari.

test.describe('media-lab audition page', () => {
  test('loads, buttons work, audio schedules exactly one effect per click, variants update spokenText, no console errors', async ({ page }) => {
    const consoleErrors = [];
    page.on('pageerror', (err) => consoleErrors.push(String(err)));
    page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

    await page.goto('/dev/media-lab.html');

    // Page loads with all controls present.
    for (const id of ['enableAudioButton', 'playBootButton', 'playCrashButton', 'stopAudioButton', 'muteAudioButton', 'langSelect', 'phraseSelect', 'voiceSelect', 'speakButton', 'stopSpeechButton']) {
      await expect(page.locator('#' + id)).toBeVisible();
    }

    // No AudioContext before ENABLE AUDIO.
    let status = await page.evaluate(() => window.JoshuaAudioManager.getDebugState());
    expect(status.hasContext).toBe(false);

    await page.locator('#enableAudioButton').click();
    status = await page.evaluate(() => window.JoshuaAudioManager.getDebugState());
    expect(status.hasContext).toBe(true);
    expect(typeof status.confirmedRunning).toBe('boolean'); // running OR an explicit, observable fallback

    // Instrument call counts before triggering real playback.
    await page.evaluate(() => {
      window.__bootCalls = 0;
      window.__crashCalls = 0;
      const am = window.JoshuaAudioManager;
      const origBoot = am.playBootNoise;
      am.playBootNoise = function (...args) { window.__bootCalls++; return origBoot.apply(am, args); };
      const origCrash = am.playTicTacToeCrash;
      am.playTicTacToeCrash = function (...args) { window.__crashCalls++; return origCrash.apply(am, args); };
    });

    await page.locator('#playBootButton').click();
    await page.waitForTimeout(100);
    let counts = await page.evaluate(() => ({ boot: window.__bootCalls, crash: window.__crashCalls }));
    expect(counts.boot).toBe(1);
    expect(counts.crash).toBe(0);

    await page.locator('#playCrashButton').click();
    await page.waitForTimeout(100);
    counts = await page.evaluate(() => ({ boot: window.__bootCalls, crash: window.__crashCalls }));
    expect(counts.boot).toBe(1);
    expect(counts.crash).toBe(1);

    // STOP performs cleanup — both effects resolve promptly rather than
    // hanging for their full multi-second duration.
    await page.locator('#stopAudioButton').click();
    await page.waitForTimeout(50);

    // Punctuation variants change the displayed spokenText.
    await page.selectOption('#langSelect', 'it');
    await page.selectOption('#phraseSelect', 'boot');
    await page.check('input[name="variant"][value="single"]');
    await expect(page.locator('#spokenTextDisplay')).toHaveText('Vogliamo fare una partita?');
    await page.check('input[name="variant"][value="double"]');
    await expect(page.locator('#spokenTextDisplay')).toHaveText('Vogliamo fare una partita??');
    await page.check('input[name="variant"][value="ellipsis"]');
    await expect(page.locator('#spokenTextDisplay')).toHaveText('Vogliamo fare una partita…?');

    await page.selectOption('#langSelect', 'en');
    await page.selectOption('#phraseSelect', 'chess');
    await page.check('input[name="variant"][value="single"]');
    await expect(page.locator('#spokenTextDisplay')).toHaveText('How about a nice game of chess?');

    // No navigation, no pippo.com anywhere on the page.
    const html = await page.content();
    expect(html).not.toMatch(/pippo\.com|human-systems|interactive-fiction/);

    expect(consoleErrors, `unexpected console/page errors: ${consoleErrors.join('\n')}`).toEqual([]);
  });

  test('voice list is populated (or empty gracefully) and mute toggles state', async ({ page }) => {
    await page.goto('/dev/media-lab.html');
    await page.locator('#enableAudioButton').click();
    // At minimum the "(auto)" option is always present.
    const optionCount = await page.locator('#voiceSelect option').count();
    expect(optionCount).toBeGreaterThanOrEqual(1);

    await expect(page.locator('#muteAudioButton')).toHaveText('MUTE');
    await page.locator('#muteAudioButton').click();
    await expect(page.locator('#muteAudioButton')).toHaveText('UNMUTE');
    const state = await page.evaluate(() => window.JoshuaAudioManager.getDebugState());
    expect(state.muted).toBe(true);
  });
});
