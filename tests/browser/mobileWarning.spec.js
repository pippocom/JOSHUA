// Copyright (C) 2025-2026 Marco Iannacone
// SPDX-License-Identifier: AGPL-3.0-only
// @ts-check
const { test, expect, devices } = require('@playwright/test');

// Mobile warning overlay (src/app/mobile-warning.js): detection, localization,
// single-shot sessionStorage behavior, dismissal, focus restoration, and the
// guarantee that it only ever appears on the initial splash screen.

const OVERLAY = '#pippo-mobile-warning';
const STORAGE_KEY = 'pippo_mobile_warning_dismissed_v1';

const IPHONE = devices['iPhone 13'];
const SAMSUNG_FOLD = {
  userAgent:
    'Mozilla/5.0 (Linux; Android 13; SM-F946B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
  viewport: { width: 884, height: 1344 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true
};

test('desktop: warning does not appear', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(150);
  await expect(page.locator(OVERLAY)).toHaveCount(0);
});

test('desktop: boot button keeps focus on load', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(150);
  const focusedId = await page.evaluate(() => document.activeElement && document.activeElement.id);
  expect(focusedId).toBe('bootButton');
});

test('iPhone Safari-like UA: warning appears with English copy and 1983', async ({ browser }) => {
  const context = await browser.newContext({ ...IPHONE });
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.locator(OVERLAY)).toBeVisible();
  await expect(page.locator('#pippo-mobile-warning-title')).toHaveText('MOBILE WARNING');
  await expect(page.locator(OVERLAY)).toContainText('In 1983, mobile phones did not browse the web.');
  await expect(page.locator(OVERLAY)).not.toContainText('1995');
  await context.close();
});

test('Android Chrome / Samsung Fold-like UA: warning appears', async ({ browser }) => {
  const context = await browser.newContext(SAMSUNG_FOLD);
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.locator(OVERLAY)).toBeVisible();
  await expect(page.locator('#pippo-mobile-warning-title')).toHaveText('MOBILE WARNING');
  await context.close();
});

test('mobile with navigator.language = it-IT: Italian text appears', async ({ browser }) => {
  const context = await browser.newContext({ ...IPHONE, locale: 'it-IT' });
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.locator('#pippo-mobile-warning-title')).toHaveText('AVVISO MOBILE');
  await expect(page.locator(OVERLAY)).toContainText('Nel 1983 i cellulari non navigavano il web.');
  await context.close();
});

test('mobile with ?lang=it: Italian text appears', async ({ browser }) => {
  const context = await browser.newContext({ ...IPHONE });
  const page = await context.newPage();
  await page.goto('/?lang=it');
  await expect(page.locator('#pippo-mobile-warning-title')).toHaveText('AVVISO MOBILE');
  await expect(page.locator(OVERLAY)).toContainText('continua comunque');
  await context.close();
});

test('overlay is an accessible modal dialog', async ({ browser }) => {
  const context = await browser.newContext({ ...IPHONE });
  const page = await context.newPage();
  await page.goto('/');
  const overlay = page.locator(OVERLAY);
  await expect(overlay).toHaveAttribute('role', 'dialog');
  await expect(overlay).toHaveAttribute('aria-modal', 'true');
  await expect(overlay).toHaveAttribute('aria-labelledby', 'pippo-mobile-warning-title');
  await expect(page.locator('#pippo-mobile-warning-title')).toBeVisible();
  await expect(overlay.locator('button')).toBeVisible();
  await context.close();
});

test('dismiss button hides warning and restores focus to the boot button', async ({ browser }) => {
  const context = await browser.newContext({ ...IPHONE });
  const page = await context.newPage();
  await page.goto('/');
  await page.locator(`${OVERLAY} button`).click();
  await expect(page.locator(OVERLAY)).toHaveCount(0);
  const focusedId = await page.evaluate(() => document.activeElement && document.activeElement.id);
  expect(focusedId).toBe('bootButton');
  await context.close();
});

test('Escape hides warning', async ({ browser }) => {
  const context = await browser.newContext({ ...IPHONE });
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.locator(OVERLAY)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator(OVERLAY)).toHaveCount(0);
  await context.close();
});

test('after dismissal, reload in same session does not show warning; clearing storage makes it reappear', async ({ browser }) => {
  const context = await browser.newContext({ ...IPHONE });
  const page = await context.newPage();
  await page.goto('/');
  await page.locator(`${OVERLAY} button`).click();

  await page.reload();
  await page.waitForTimeout(150);
  await expect(page.locator(OVERLAY)).toHaveCount(0);

  await page.evaluate((key) => sessionStorage.removeItem(key), STORAGE_KEY);
  await page.reload();
  await expect(page.locator(OVERLAY)).toBeVisible();
  await context.close();
});

test('navigating beyond the splash screen does not re-show or remount the warning', async ({ browser }) => {
  const context = await browser.newContext({ ...IPHONE });
  const page = await context.newPage();
  await page.goto('/?fast=1&presentationSpeed=1');
  await page.locator(`${OVERLAY} button`).click();
  await expect(page.locator(OVERLAY)).toHaveCount(0);

  await page.locator('#bootButton').click();
  await expect(page.locator('#splashScreen')).toBeHidden();
  await expect(page.locator('#crt')).toBeVisible();
  await expect(page.locator('#terminalOutput')).toContainText('SELECT OPTION:', { timeout: 15_000 });

  await expect(page.locator(OVERLAY)).toHaveCount(0);
  await context.close();
});
