// Copyright (C) 2025-2026 Marco Iannacone
// SPDX-License-Identifier: AGPL-3.0-only
// @ts-check
const { test, expect } = require('@playwright/test');

// Splash screen layout: regression coverage for the panel/title/language-
// selector layout. The h1 uses `justify-content:space-between` with a
// viewport-scaled `gap` to stretch
// "JOSHUA"/"TERMINAL" edge-to-edge, which at intermediate desktop widths
// overflowed past the card's own padding-right — visually reading as "the
// border ends too close to TERMINAL". The language switch also lived
// outside the panel entirely (`.launch-title-row`, a sibling flex row).
//
// These tests check containment, padding symmetry, absence of horizontal
// overflow, and correct panel/selector nesting — not exact pixel positions,
// which would be fragile across Chromium/WebKit font metrics.

const DESKTOP = { width: 1324, height: 725 };

const ALL_VIEWPORTS = [
  { width: 1324, height: 725 },
  { width: 1024, height: 768 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 },
  { width: 320, height: 568 }
];

async function splashGeometry(page) {
  return page.evaluate(() => {
    const card = document.querySelector('.joshua-launch-card');
    const meta = document.querySelector('.launch-meta');
    const kicker = document.querySelector('.launch-kicker');
    const lang = document.getElementById('langSwitchLink');
    const h1 = document.querySelector('.joshua-launch-card h1');
    const credit = document.getElementById('splashCredit');
    const cardRect = card.getBoundingClientRect();
    const langRect = lang.getBoundingClientRect();
    const kickerRect = kicker.getBoundingClientRect();
    const h1Rect = h1.getBoundingClientRect();
    const creditRect = credit.getBoundingClientRect();
    const cardStyle = getComputedStyle(card);
    const h1Style = getComputedStyle(h1);
    return {
      card: { left: cardRect.left, right: cardRect.right, top: cardRect.top, bottom: cardRect.bottom },
      lang: { left: langRect.left, right: langRect.right, top: langRect.top, bottom: langRect.bottom, width: langRect.width, height: langRect.height },
      kicker: { left: kickerRect.left, right: kickerRect.right, top: kickerRect.top, bottom: kickerRect.bottom },
      h1: { left: h1Rect.left, right: h1Rect.right, top: h1Rect.top },
      credit: { top: creditRect.top, bottom: creditRect.bottom },
      paddingLeft: parseFloat(cardStyle.paddingLeft),
      paddingRight: parseFloat(cardStyle.paddingRight),
      cardOverflow: cardStyle.overflow,
      h1Overflow: h1Style.overflow,
      langIsDescendantOfCard: card.contains(lang),
      creditIsDescendantOfCard: card.contains(credit),
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth
    };
  });
}

test.describe('splash screen layout', () => {
  test('language selector is inside the panel, top-right, aligned with the kicker/version row', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto('/');
    const g = await splashGeometry(page);

    expect(g.langIsDescendantOfCard).toBe(true);

    // Fully inside the card's border box, not spilling past any edge.
    expect(g.lang.left).toBeGreaterThanOrEqual(g.card.left);
    expect(g.lang.right).toBeLessThanOrEqual(g.card.right);
    expect(g.lang.top).toBeGreaterThanOrEqual(g.card.top);
    expect(g.lang.bottom).toBeLessThanOrEqual(g.card.bottom);

    // To the right of the kicker/version text on the same meta row.
    expect(g.lang.left).toBeGreaterThan(g.kicker.right);
    expect(Math.abs(g.lang.top - g.kicker.top)).toBeLessThan(12);

    // In the top-right corner of the panel: separated from the right border
    // by roughly the same padding used on the left (small tolerance for
    // border width / subpixel rounding, not for a different padding value).
    const rightGap = g.card.right - g.lang.right;
    expect(rightGap).toBeGreaterThan(0);
    expect(Math.abs(rightGap - g.paddingRight)).toBeLessThan(10);
  });

  test('splashVersion is visible and shows "v. 0.69", in both languages', async ({ page }) => {
    for (const qs of ['', '?lang=it']) {
      await page.goto('/' + qs);
      const version = page.locator('#splashVersion');
      await expect(version).toBeVisible();
      await expect(version).toHaveText('v. 0.69');
    }
  });

  test('panel left and right padding are equal', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto('/');
    const g = await splashGeometry(page);
    expect(g.paddingLeft).toBeCloseTo(g.paddingRight, 0);
  });

  test('desktop: title stays fully inside the panel content box, with balanced left/right room', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto('/');
    const g = await splashGeometry(page);

    // Never touches or crosses the border.
    expect(g.h1.left).toBeGreaterThanOrEqual(g.card.left);
    expect(g.h1.right).toBeLessThanOrEqual(g.card.right);

    const leftGap = g.h1.left - g.card.left;
    const rightGap = g.card.right - g.h1.right;

    // The remaining margin after the title must not be meaningfully smaller
    // than the panel's own padding — small tolerance for font metrics only.
    expect(rightGap).toBeGreaterThan(g.paddingRight - 8);
    // Left/right visual balance around the title.
    expect(Math.abs(leftGap - rightGap)).toBeLessThan(10);

    // Never achieved by clipping — no overflow:hidden on the card or the title.
    expect(g.cardOverflow).not.toBe('hidden');
    expect(g.h1Overflow).not.toBe('hidden');
  });

  test('no horizontal page overflow and layout stays valid across viewports', async ({ page }) => {
    for (const viewport of ALL_VIEWPORTS) {
      await page.setViewportSize(viewport);
      await page.goto('/');
      const g = await splashGeometry(page);

      expect(g.scrollWidth, `scrollWidth vs clientWidth at ${viewport.width}x${viewport.height}`).toBeLessThanOrEqual(g.clientWidth + 1);
      expect(g.h1.left).toBeGreaterThanOrEqual(g.card.left - 1);
      expect(g.h1.right).toBeLessThanOrEqual(g.card.right + 1);
      expect(g.langIsDescendantOfCard).toBe(true);
      expect(g.lang.right).toBeLessThanOrEqual(g.card.right + 1);
    }
  });

  test('mobile: title is not clipped and produces no horizontal scroll', async ({ page }) => {
    for (const viewport of [{ width: 390, height: 844 }, { width: 320, height: 568 }]) {
      await page.setViewportSize(viewport);
      await page.goto('/');
      const g = await splashGeometry(page);
      expect(g.scrollWidth).toBeLessThanOrEqual(g.clientWidth + 1);
      // The title text must still be present/visible, not hidden by overflow clipping.
      await expect(page.locator('.joshua-launch-card h1')).toBeVisible();
      expect(g.h1.right).toBeLessThanOrEqual(g.card.right + 1);
    }
  });

  test('credit line stays outside and below the panel', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto('/');
    const g = await splashGeometry(page);
    expect(g.creditIsDescendantOfCard).toBe(false);
    expect(g.credit.top).toBeGreaterThanOrEqual(g.card.bottom);
  });

  test('language selector is keyboard-focusable and shows a visible focus style', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto('/');
    const lang = page.locator('#langSwitchLink');
    await lang.focus();
    await expect(lang).toBeFocused();
    const outline = await lang.evaluate((el) => getComputedStyle(el).outlineStyle);
    expect(outline).not.toBe('none');
  });

  test('language selector still switches language from both ?lang=en and ?lang=it, no reload-breaking behavior', async ({ page }) => {
    await page.goto('/?lang=en');
    await expect(page.locator('#langSwitchLink')).toHaveText('IT');
    await page.locator('#langSwitchLink').click();
    await expect(page).toHaveURL(/lang=it/);
    await expect(page.locator('#langSwitchLink')).toHaveText('EN');
    await expect(page.locator('#splashVersion')).toHaveText('v. 0.69');

    await page.locator('#langSwitchLink').click();
    await expect(page).toHaveURL(/lang=en/);
    await expect(page.locator('#langSwitchLink')).toHaveText('IT');
    await expect(page.locator('#splashVersion')).toHaveText('v. 0.69');
  });

  test('after BOOT the splash disappears; after EXIT it reappears with the language selector intact', async ({ page }) => {
    await page.goto('/?fast=1&presentationSpeed=1');
    await expect(page.locator('#splashScreen')).toBeVisible();

    await page.locator('#bootButton').click();
    await expect(page.locator('#splashScreen')).toBeHidden();
    await expect(page.locator('#crt')).toBeVisible();

    await expect(page.locator('#terminalOutput')).toContainText('SELECT OPTION:', { timeout: 15_000 });
    await page.locator('#commandInput').fill('EXIT');
    await page.locator('#commandForm button[type="submit"]').click();

    await expect(page.locator('#splashScreen')).toBeVisible();
    await expect(page.locator('#crt')).toBeHidden();
    const lang = page.locator('#langSwitchLink');
    await expect(lang).toBeVisible();
    await expect(lang).toHaveText('IT');
    const g = await splashGeometry(page);
    expect(g.langIsDescendantOfCard).toBe(true);
  });
});
