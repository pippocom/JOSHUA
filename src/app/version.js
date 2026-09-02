// Copyright (C) 2025-2026 Marco Iannacone
// SPDX-License-Identifier: AGPL-3.0-only
/**
 * JoshuaVersion — single canonical source for the app's version number.
 *
 * `semver` is the technical SemVer string (kept in sync with package.json's
 * "version" field by convention, not by code — there is no build step here).
 * `displayVersion` is the short retro-terminal form shown on the splash
 * screen. Nothing else in src/ should hardcode either value.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.JoshuaVersion = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  return {
    semver: '0.69.0',
    displayVersion: 'v. 0.69'
  };
});
