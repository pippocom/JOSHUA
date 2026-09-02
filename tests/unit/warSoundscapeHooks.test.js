// Copyright (C) 2025-2026 Marco Iannacone
// SPDX-License-Identifier: AGPL-3.0-only
'use strict';

// Structural/regression coverage for how the war soundscape is wired through
// src/war/warMap.js and src/app/game.js: the exact hook points, unchanged
// visual timing/geometry, lifecycle calls where the spec requires them, and
// that no external audio asset or new runtime dependency was introduced.
// This file does not exercise the DSP itself (see tests/unit/warSoundscape.test.js) —
// it only guards the integration.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const SRC_DIR = path.join(__dirname, '..', '..', 'src');
const GAME_JS_PATH = path.join(SRC_DIR, 'app', 'game.js');
const WAR_MAP_JS_PATH = path.join(SRC_DIR, 'war', 'warMap.js');
const WAR_MODEL_JS_PATH = path.join(SRC_DIR, 'war', 'warModel.js');
const INDEX_HTML_PATH = path.join(SRC_DIR, 'index.html');
const PACKAGE_JSON_PATH = path.join(__dirname, '..', '..', 'package.json');
const gameJs = fs.readFileSync(GAME_JS_PATH, 'utf8');
const warMapJs = fs.readFileSync(WAR_MAP_JS_PATH, 'utf8');
const warModelJs = fs.readFileSync(WAR_MODEL_JS_PATH, 'utf8');

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

test('exactly two injected low-level hook points connect map events to the audio manager', () => {
  assert.equal((gameJs.match(/JoshuaAudioManager\.playMissileLaunch\(\)/g) || []).length, 1);
  assert.equal((gameJs.match(/JoshuaAudioManager\.playWarImpact\(payload\)/g) || []).length, 1);
  assert.equal((gameJs.match(/JoshuaAudioManager\.playAutomaticFireBurst\(\)/g) || []).length, 1);
  assert.match(gameJs, /onLaunch:\s*\(\)\s*=>\s*JoshuaAudioManager\.playMissileLaunch\(\)/);
  assert.match(gameJs, /onImpact:\s*payload\s*=>/);
  assert.match(warMapJs, /function drawArcCoordinates\([\s\S]*?onLaunch\(\);/);
  assert.match(warMapJs, /function impactCoordinates\([\s\S]*?onImpact\(\{ big: isBig \}\);/);
  assert.ok(!/JoshuaAudioManager/.test(warMapJs), 'warMap must not know the application audio manager');
});

test('runScenario() starts the soundscape at the top and stops it once the animated part ends, before showReport()', () => {
  const runScenarioBody = gameJs.match(/async function runScenario\(id\)\{[\s\S]*?\n  \}/)[0];
  const startIdx = runScenarioBody.indexOf('JoshuaAudioManager.startWarSoundscape()');
  const stopIdx = runScenarioBody.indexOf('JoshuaAudioManager.stopWarSoundscape()');
  const showReportIdx = runScenarioBody.indexOf('showReport(s,out)') !== -1 ? runScenarioBody.indexOf('showReport(s,out)') : runScenarioBody.indexOf('showReport(s, out)');
  assert.ok(startIdx !== -1, 'expected startWarSoundscape() inside runScenario()');
  assert.ok(stopIdx !== -1, 'expected stopWarSoundscape() inside runScenario()');
  assert.ok(startIdx < stopIdx, 'start must come before stop');
  assert.ok(showReportIdx === -1 || stopIdx < showReportIdx, 'stopWarSoundscape() must run before showReport() is called');
});

test('runScenario() derives intensity from real state (phase weight + detonations), never from an independent timer', () => {
  assert.match(gameJs, /function warIntensityForPhase\(phaseWeight\)\{/);
  const helperBody = gameJs.match(/function warIntensityForPhase\(phaseWeight\)\{[\s\S]*?\n  \}/)[0];
  assert.match(helperBody, /WarModel\.intensityForPhase\(currentWarStats, phaseWeight\)/, 'intensity must read real simulation state, not a timer');
  assert.ok(!/setInterval/.test(helperBody) && !/setTimeout/.test(helperBody), 'no autonomous timer inside the intensity calculation');
  const setIntensityCalls = gameJs.match(/JoshuaAudioManager\.setWarIntensity\(warIntensityForPhase\([\d.]+\)\)/g) || [];
  assert.ok(setIntensityCalls.length >= 6, `expected several phase-driven setWarIntensity() calls, found ${setIntensityCalls.length}`);
});

test('ABORT stops the war soundscape; the final sequence defensively stops it too', () => {
  assert.match(gameJs, /abortWar\.addEventListener\('click',\(\)=>\{\s*cancelWarRun\(\);\s*JoshuaAudioManager\.stopWarSoundscape\(\);/);
  const finalSequenceBody = gameJs.match(/async function finalSequence\(\)\{[\s\S]*?\n {4}JoshuaAudioManager\.stopWarSoundscape\(\);/);
  assert.ok(finalSequenceBody, 'expected stopWarSoundscape() near the top of finalSequence()');
});

test('only a live, completed run can show a report and advance warRuns exactly once', () => {
  const runScenarioBody = gameJs.match(/async function runScenario\(id\)\{[\s\S]*?\n  \}/)[0];
  assert.equal((runScenarioBody.match(/WarModel\.completeRun\(warRuns\)/g) || []).length, 1);
  const finalGuardIdx = runScenarioBody.lastIndexOf('assertWarRun(run)');
  const reportIdx = runScenarioBody.indexOf('showReport(s, out)');
  const completionIdx = runScenarioBody.indexOf('WarModel.completeRun(warRuns)');
  assert.ok(finalGuardIdx < reportIdx && reportIdx < completionIdx, 'live-run guard, report, and single increment must stay ordered');
  assert.match(runScenarioBody, /catch\(err\) \{\s*if\(err===WAR_RUN_ABORTED\) return;/);
});

test('EXIT/return-to-splash already stops everything via the existing stopEffects() path (no change needed there)', () => {
  const returnToSplashBody = gameJs.match(/function returnToSplash\(\)\s*\{[\s\S]*?\n {4}\}/)[0];
  assert.match(returnToSplashBody, /JoshuaAudioManager\.stopEffects\(\)/);
});

test('visual timing inside runScenario() is unchanged: every pause duration is still present, in order', () => {
  const runScenarioBody = gameJs.match(/async function runScenario\(id\)\{[\s\S]*?\n  \}/)[0];
  const delays = [...runScenarioBody.matchAll(/await pauseWar\(run, (\d+)\)/g)].map((m) => Number(m[1]));
  assert.deepEqual(delays, [600, 300, 500, 1100, 900, 450, 900, 900, 850, 700, 800, 550]);
});

test('animatePairs()/strikeStorm() casualty and missile ranges are untouched (spot-check a few call sites)', () => {
  assert.match(gameJs, /delay:540, missiles:\[20,90\], detonations:\[2,14\], casualties:\[1500000,9000000\]/);
  assert.match(gameJs, /delay:115, missiles:\[220,520\], detonations:\[65,180\], casualties:\[60000000,180000000\]/);
  assert.match(warModelJs, /IMMEDIATE_FATALITY_CAP,[\s\S]{0,160}randomInteger\(\[2800000000, 5600000000\], rng\)/);
});

test('no MP3/WAV/remote audio asset was introduced anywhere in src/', () => {
  const files = walk(SRC_DIR);
  assert.ok(!files.some((f) => /\.(mp3|wav|ogg)$/i.test(f)), 'no audio asset files under src/');
  const jsAndHtml = files.filter((f) => /\.(js|html)$/.test(f));
  for (const f of jsAndHtml) {
    const text = fs.readFileSync(f, 'utf8');
    const liveRefs = text.split('\n').filter((line) => /\.(mp3|wav|ogg)\b/i.test(line) && /(src|href|=)\s*['"`]/.test(line));
    assert.deepEqual(liveRefs, [], `${path.relative(SRC_DIR, f)} must not reference an audio file as a live asset path`);
  }
});

test('package.json has no new runtime dependency (only the pre-existing Playwright devDependency)', () => {
  const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf8'));
  assert.equal(pkg.dependencies, undefined, 'no "dependencies" field should exist');
  assert.deepEqual(Object.keys(pkg.devDependencies || {}), ['@playwright/test']);
});

test('index.html loads warSoundscape.js (before audioManager.js) and the splash markup/CSS hooks are untouched', () => {
  const html = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  assert.match(html, /<script src="audio\/warSoundscape\.js"><\/script>/);
  const warIdx = html.indexOf('audio/warSoundscape.js');
  const amIdx = html.indexOf('audio/audioManager.js');
  assert.ok(warIdx < amIdx, 'warSoundscape.js must load before audioManager.js (its factory reads window.JoshuaWarSoundscape at load time)');
  const modelIdx = html.indexOf('war/warModel.js');
  const mapIdx = html.indexOf('war/warMap.js');
  const gameIdx = html.indexOf('app/game.js');
  assert.ok(modelIdx !== -1 && mapIdx !== -1 && modelIdx < gameIdx && mapIdx < gameIdx, 'war modules must load before game.js');

  // Splash-screen elements must still be exactly present.
  assert.match(html, /<div class="launch-meta">/);
  assert.match(html, /<span id="splashVersion" class="launch-version"><\/span>/);
  assert.match(html, /<a id="langSwitchLink" class="launch-lang" href="#" hreflang="it">IT<\/a>/);
  assert.ok(!/media-lab/.test(html), 'the normal app must still have no link to the dev-only media-lab page');
});

test('media-lab.html loads warSoundscape.js before audioManager.js', () => {
  const html = fs.readFileSync(path.join(SRC_DIR, 'dev', 'media-lab.html'), 'utf8');
  const warIdx = html.indexOf('../audio/warSoundscape.js');
  const amIdx = html.indexOf('../audio/audioManager.js');
  assert.ok(warIdx !== -1 && amIdx !== -1 && warIdx < amIdx);
});
