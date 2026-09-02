// Copyright (C) 2025-2026 Marco Iannacone
// SPDX-License-Identifier: AGPL-3.0-only
// @ts-check
const { test, expect } = require('@playwright/test');

// SEO / semantic metadata smoke tests: verify the generated pippo.com builds
// carry correct localized title/description/canonical/hreflang/Open Graph and
// CSP-compatible inline JSON-LD, and that the standalone build stays
// canonical-free. Run via `npx playwright test --config=playwright.build.config.js`
// (after `make build`). These assert on the delivered HTML artifact, not the
// runtime DOM.

const EN = 'http://127.0.0.1:4176/human-systems/interactive-fiction/joshua';
const IT = 'http://127.0.0.1:4176/it/human-systems/interactive-fiction/joshua';
const STANDALONE = 'http://127.0.0.1:4175';

const EN_URL = 'https://www.pippo.com/human-systems/interactive-fiction/joshua/';
const IT_URL = 'https://www.pippo.com/it/human-systems/interactive-fiction/joshua/';

async function htmlOf(page, url) {
  const res = await page.request.get(url);
  expect(res.ok(), `${url} should load`).toBe(true);
  return res.text();
}

function extractJsonLd(html) {
  const m = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  expect(m, 'inline JSON-LD block should be present').toBeTruthy();
  return JSON.parse(m[1]);
}

test('EN pippo build has localized title, description, canonical, hreflang, and Open Graph', async ({ page }) => {
  const html = await htmlOf(page, `${EN}/index.html`);

  expect(html).toContain('<title>JOSHUA — An Interactive WarGames Tribute by Marco Iannacone</title>');
  expect(html).toContain('name="description" content="JOSHUA is an open-source interactive web application by Marco Iannacone');
  expect(html).toContain(`<link rel="canonical" href="${EN_URL}">`);
  expect(html).toContain(`<link rel="alternate" hreflang="en" href="${EN_URL}">`);
  expect(html).toContain(`<link rel="alternate" hreflang="it" href="${IT_URL}">`);
  expect(html).toContain(`<link rel="alternate" hreflang="x-default" href="${EN_URL}">`);
  expect(html).toContain('<meta property="og:type" content="website">');
  expect(html).toContain('<meta property="og:title" content="JOSHUA — An Interactive WarGames Tribute by Marco Iannacone">');
  expect(html).toContain('<meta property="og:site_name" content="pippo.com">');
  expect(html).toContain(`<meta property="og:url" content="${EN_URL}">`);
  expect(html).toContain('<html lang="en">');
});

test('IT pippo build has localized Italian metadata and reciprocal hreflang', async ({ page }) => {
  const html = await htmlOf(page, `${IT}/index.html`);

  expect(html).toContain('<title>JOSHUA — Un tributo interattivo a WarGames di Marco Iannacone</title>');
  expect(html).toContain('name="description" content="JOSHUA è una web app interattiva open source realizzata da Marco Iannacone');
  expect(html).toContain(`<link rel="canonical" href="${IT_URL}">`);
  expect(html).toContain(`<link rel="alternate" hreflang="en" href="${EN_URL}">`);
  expect(html).toContain(`<link rel="alternate" hreflang="it" href="${IT_URL}">`);
  expect(html).toContain(`<link rel="alternate" hreflang="x-default" href="${EN_URL}">`);
  expect(html).toContain('<meta property="og:title" content="JOSHUA — Un tributo interattivo a WarGames di Marco Iannacone">');
  expect(html).toContain(`<meta property="og:url" content="${IT_URL}">`);
  expect(html).toContain('<html lang="it">');
});

test('standalone build stays canonical-free (no pippo.com canonical/hreflang/OG/JSON-LD)', async ({ page }) => {
  const html = await htmlOf(page, `${STANDALONE}/index.html`);

  expect(html).toContain('<title>JOSHUA — An Interactive WarGames Tribute by Marco Iannacone</title>');
  expect(html).not.toContain('rel="canonical"');
  expect(html).not.toContain('rel="alternate" hreflang=');
  expect(html).not.toContain('property="og:');
  expect(html).not.toContain('application/ld+json');
  expect(html).not.toContain('https://www.pippo.com');
});

test('EN JSON-LD is inline, parses, and describes JOSHUA as an open-source SoftwareApplication', async ({ page }) => {
  const html = await htmlOf(page, `${EN}/index.html`);
  expect(html).not.toContain('src="structured-data.json"');
  const json = extractJsonLd(html);

  expect(json['@context']).toBe('https://schema.org');
  expect(json['@type']).toBe('SoftwareApplication');
  expect(json.name).toBe('JOSHUA');
  expect(json.author).toEqual({ '@type': 'Person', 'name': 'Marco Iannacone' });
  expect(json.inLanguage).toBe('en');
  expect(json.softwareVersion).toBe('0.69.0');
  expect(json.url).toBe(EN_URL);
  expect(json.license).toContain('agpl');
  expect(json.isAccessibleForFree).toBe(true);
  expect(json.description).toContain('tribute');
  expect(JSON.stringify(json)).not.toMatch(/official|endorsed|licensed by MGM|United Artists/i);
});

test('IT JSON-LD is inline, localized, and uses the IT URL', async ({ page }) => {
  const html = await htmlOf(page, `${IT}/index.html`);
  const json = extractJsonLd(html);

  expect(json['@type']).toBe('SoftwareApplication');
  expect(json.inLanguage).toBe('it');
  expect(json.url).toBe(IT_URL);
  expect(json.softwareVersion).toBe('0.69.0');
  expect(json.description).toContain('tributo');
  expect(JSON.stringify(json)).not.toMatch(/official|endorsed|licensed by MGM|United Artists/i);
});

test('the structured-data.json artifact is not generated', async ({ page }) => {
  const enRes = await page.request.get(`${EN}/structured-data.json`);
  expect(enRes.status()).toBe(404);
  const itRes = await page.request.get(`${IT}/structured-data.json`);
  expect(itRes.status()).toBe(404);
});

test('CSP remains strict (default-src self, no unsafe-inline)', async ({ page }) => {
  const html = await htmlOf(page, `${EN}/index.html`);
  expect(html).toContain('default-src \'self\'');
  expect(html).not.toContain('unsafe-inline');
});

test('inline JSON-LD loads in-browser without CSP/page errors and stays in the DOM', async ({ page }) => {
  const violations = [];
  page.on('console', (m) => { if (/Content Security Policy|Refused to|violat/i.test(m.text())) violations.push(m.text()); });
  page.on('pageerror', (e) => violations.push('PAGEERROR: ' + e));
  await page.goto(`${EN}/index.html`);
  await page.waitForTimeout(300);
  const ld = await page.locator('script[type="application/ld+json"]').textContent();
  expect(ld).toContain('SoftwareApplication');
  expect(violations, `CSP/page errors: ${violations.join('; ')}`).toEqual([]);
});
