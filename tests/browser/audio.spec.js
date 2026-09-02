// Copyright (C) 2025-2026 Marco Iannacone
// SPDX-License-Identifier: AGPL-3.0-only
// @ts-check
const { test, expect } = require('@playwright/test');

// AUDIO. Instruments the real (browser-native) AudioContext via
// an init script that records every buffer created, so we can assert the
// actual synthesized signal is non-silent — not just that a function ran.

async function installBufferSpy(page) {
  await page.addInitScript(() => {
    window.__joshuaBufferSpy = [];
    const OrigCtor = window.AudioContext || window.webkitAudioContext;
    if (!OrigCtor) return;
    const patchedCtor = function (...args) {
      const ctx = new OrigCtor(...args);
      const origCreateBuffer = ctx.createBuffer.bind(ctx);
      ctx.createBuffer = function (channels, length, sampleRate) {
        const buf = origCreateBuffer(channels, length, sampleRate);
        window.__joshuaBufferSpy.push(buf);
        return buf;
      };
      return ctx;
    };
    window.AudioContext = patchedCtor;
    window.webkitAudioContext = patchedCtor;
  });
}

test.describe('audio (Web Audio synthesis)', () => {
  test('boot effect is scheduled, completes, and produces a non-silent buffer; mute/unmute work; no console errors', async ({ page }) => {
    const consoleErrors = [];
    page.on('pageerror', (err) => consoleErrors.push(String(err)));
    page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

    await installBufferSpy(page);
    await page.goto('/?audioDebug=1&fast=1&presentationSpeed=1');
    await page.locator('#bootButton').click();

    await expect(page.locator('#terminalOutput')).toContainText('SELECT OPTION:', { timeout: 15_000 });

    const rms = await page.evaluate(() => {
      const buffers = window.__joshuaBufferSpy.filter((b) => b.length > 1);
      if (!buffers.length) return null;
      const data = buffers[buffers.length - 1].getChannelData(0);
      let sum = 0;
      for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
      return Math.sqrt(sum / data.length);
    });
    expect(rms, 'boot noise buffer should exist and be non-silent').not.toBeNull();
    expect(rms).toBeGreaterThan(0);

    // Mute / unmute.
    const muteButton = page.locator('#muteButton');
    await expect(muteButton).toHaveAttribute('aria-pressed', 'false');
    await muteButton.click();
    await expect(muteButton).toHaveAttribute('aria-pressed', 'true');
    // AudioParam.value scheduled via setValueAtTime(v, currentTime) is only
    // guaranteed to be reflected after the next audio rendering quantum —
    // reading it in the same tick as the click is a race, not a real bug.
    await page.waitForTimeout(100);
    const mutedGain = await page.evaluate(() => window.JoshuaAudioManager._internal.getMasterGain().gain.value);
    expect(mutedGain).toBe(0);
    await muteButton.click();
    await expect(muteButton).toHaveAttribute('aria-pressed', 'false');
    await page.waitForTimeout(100);
    const unmutedGain = await page.evaluate(() => window.JoshuaAudioManager._internal.getMasterGain().gain.value);
    expect(unmutedGain).toBeGreaterThan(0);

    expect(consoleErrors, `unexpected console/page errors: ${consoleErrors.join('\n')}`).toEqual([]);
  });
});
