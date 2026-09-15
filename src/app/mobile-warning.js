// Copyright (C) 2025-2026 Marco Iannacone
// SPDX-License-Identifier: AGPL-3.0-only
/*
 * Pippo.com Mobile Warning (JOSHUA adaptation)
 * Version: 20260915b
 * Date: 2026-09-15
 * Author: Marco Iannacone
 *
 * Non-invasive mobile/tablet warning for a deliberately desktop-first
 * terminal-style website. No dependencies. No alert(). No mercy.
 *
 * Mounted only on the JOSHUA splash screen: this script is loaded by
 * index.html (the single splash/terminal document) and shows the warning at
 * most once per session, before the terminal boots. It never reappears once
 * dismissed (sessionStorage) and never touches the game, the routing, the
 * state machine, or the command parser.
 *
 * NOTE: this adaptation ships no inline <style>. The overlay styles live in
 * src/styles/joshua.css because JOSHUA ships a strict Content-Security-Policy
 * (default-src 'self') that forbids inline styles.
 */
(function () {
  'use strict';

  const STORAGE_KEY = 'pippo_mobile_warning_dismissed_v1';
  const OVERLAY_ID = 'pippo-mobile-warning';

  // Element that had focus before the overlay grabbed it (usually the BOOT
  // button). Restored on dismissal so keyboard controls keep working.
  let previouslyFocused = null;

  function safeSessionGet(key) {
    try {
      return window.sessionStorage && window.sessionStorage.getItem(key);
    } catch (_) {
      return null;
    }
  }

  function safeSessionSet(key, value) {
    try {
      if (window.sessionStorage) window.sessionStorage.setItem(key, value);
    } catch (_) {
      // Private browsing, locked-down browsers, cosmic spite.
    }
  }

  function isItalian() {
    const params = new URLSearchParams(window.location.search || '');
    const lang = String(params.get('lang') || '').toLowerCase();
    const htmlLang = String(document.documentElement.getAttribute('lang') || '').toLowerCase();
    const path = String(window.location.pathname || '').toLowerCase();

    const browserLanguages = [
      ...(Array.isArray(navigator.languages) ? navigator.languages : []),
      navigator.language
    ]
      .filter(Boolean)
      .map(value => String(value).toLowerCase());

    return lang === 'it' ||
      lang === 'ita' ||
      htmlLang.startsWith('it') ||
      path === '/it' ||
      path.startsWith('/it/') ||
      browserLanguages.some(value => value === 'it' || value.startsWith('it-'));
  }

  function getViewportWidth() {
    const values = [
      window.innerWidth,
      document.documentElement && document.documentElement.clientWidth,
      window.screen && window.screen.width
    ].map(Number).filter(Number.isFinite);

    return values.length ? Math.min.apply(null, values) : 9999;
  }

  function getViewportHeight() {
    const values = [
      window.innerHeight,
      document.documentElement && document.documentElement.clientHeight,
      window.screen && window.screen.height
    ].map(Number).filter(Number.isFinite);

    return values.length ? Math.min.apply(null, values) : 9999;
  }

  function isMobileLike() {
    const nav = window.navigator || {};
    const ua = String(nav.userAgent || '');
    const platform = String(nav.platform || '');
    const maxTouchPoints = Number(nav.maxTouchPoints || 0);

    const explicitMobileUA = /Android|iPhone|iPad|iPod|Windows Phone|Mobile|Silk|Kindle|Opera Mini|IEMobile/i.test(ua);
    const ipadDesktopUA = platform === 'MacIntel' && maxTouchPoints > 1;

    const coarsePointer = Boolean(
      window.matchMedia &&
      window.matchMedia('(hover: none) and (pointer: coarse)').matches
    );

    const touchCapable = maxTouchPoints > 0 || 'ontouchstart' in window;
    const width = getViewportWidth();
    const height = getViewportHeight();
    const smallOrFoldableViewport = Math.min(width, height) <= 920 && Math.max(width, height) <= 1400;

    return explicitMobileUA || ipadDesktopUA || (coarsePointer && touchCapable && smallOrFoldableViewport);
  }

  function getCopy() {
    if (isItalian()) {
      return {
        title: 'AVVISO MOBILE',
        lines: [
          'pippo.com è pensato per desktop: PC, Mac o Linux, preferibilmente con una tastiera vera.',
          'Nel 1983 i cellulari non navigavano il web. E forse era meglio così.',
          'Da mobile, Android o iOS, alcune parti del sito, incluso JOSHUA, possono funzionare male.'
        ],
        button: 'continua comunque'
      };
    }

    return {
      title: 'MOBILE WARNING',
      lines: [
        'pippo.com is designed for desktop use: PC, Mac or Linux, preferably with a real keyboard.',
        'In 1983, mobile phones did not browse the web. And maybe that was for the best.',
        'On mobile, Android or iOS, parts of the site, including JOSHUA, may behave poorly.'
      ],
      button: 'continue anyway'
    };
  }

  function dismiss(overlay) {
    safeSessionSet(STORAGE_KEY, '1');
    document.removeEventListener('keydown', onEscape);
    overlay.remove();
    // Restore focus so keyboard controls keep working. The element that held
    // focus before the overlay grabbed it is preferred, but WebKit can still
    // report <body> at DOMContentLoaded (autofocus timing), so fall back to
    // the splash's primary control.
    const restoreTo = (
      previouslyFocused &&
      previouslyFocused !== document.body &&
      previouslyFocused !== document.documentElement &&
      document.contains(previouslyFocused)
    ) ? previouslyFocused : (document.getElementById('bootButton') || null);
    if (restoreTo && typeof restoreTo.focus === 'function') {
      restoreTo.focus({ preventScroll: true });
    }
  }

  function onEscape(event) {
    if (event.key !== 'Escape') return;
    const overlay = document.getElementById(OVERLAY_ID);
    if (overlay) dismiss(overlay);
  }

  function showWarning() {
    if (document.getElementById(OVERLAY_ID)) return;

    const copy = getCopy();
    const overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'pippo-mobile-warning-title');

    overlay.innerHTML = `
      <div class="pippo-mobile-warning-panel" role="document">
        <div class="pippo-mobile-warning-bar" aria-hidden="true">
          <span class="pippo-mobile-warning-dot"></span>
          <span class="pippo-mobile-warning-dot"></span>
          <span class="pippo-mobile-warning-dot"></span>
          <span>guest session · pippo.com/JOSHUA</span>
        </div>
        <div class="pippo-mobile-warning-body">
          <h2 id="pippo-mobile-warning-title">${escapeHtml(copy.title)}</h2>
          ${copy.lines.map(line => `<p>${escapeHtml(line)}</p>`).join('')}
          <button type="button">${escapeHtml(copy.button)}</button>
        </div>
      </div>
    `;

    const button = overlay.querySelector('button');
    button.addEventListener('click', function () {
      dismiss(overlay);
    });

    document.addEventListener('keydown', onEscape);
    previouslyFocused = document.activeElement;
    document.body.appendChild(overlay);
    button.focus({ preventScroll: true });
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (char) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
      }[char];
    });
  }

  function boot() {
    if (safeSessionGet(STORAGE_KEY) === '1') return;
    if (!isMobileLike()) return;
    showWarning();
  }

  if (window.__PIPPO_MOBILE_WARNING_TEST__) {
    window.__PIPPO_MOBILE_WARNING_API__ = {
      isItalian,
      isMobileLike,
      getCopy,
      storageKey: STORAGE_KEY
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
