// Copyright (C) 2025-2026 Marco Iannacone
// SPDX-License-Identifier: AGPL-3.0-only
'use strict';

// Regression guard for the src/ standalone tree: no pippo.com deploy
// coupling, no reboot.mp3 dependency, and the Event Log / map geometry
// constraints that must remain intact.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const SRC_DIR = path.join(__dirname, '..', '..', 'src');
const CSS_PATH = path.join(SRC_DIR, 'styles', 'joshua.css');
const GAME_JS_PATH = path.join(SRC_DIR, 'app', 'game.js');
const INDEX_HTML_PATH = path.join(SRC_DIR, 'index.html');

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

test('src/ contains no pippo.com deploy paths (human-systems, interactive-fiction, /it/, pippo.com)', () => {
  // The standalone tree is fully decoupled: content.*.js carry no pippo.com
  // langHref/returnHref/returnLabel fields, so this check covers the whole
  // src/ tree uniformly (data/ included).
  const files = walk(SRC_DIR)
    .filter((f) => /\.(js|html|css)$/.test(f));
  const offenders = [];
  for (const f of files) {
    const text = fs.readFileSync(f, 'utf8');
    if (/pippo\.com|human-systems|interactive-fiction/.test(text)) {
      // Only fail if it looks like a live path/URL, not an explanatory code
      // comment about the pippo.com multi-document build (those mention
      // "pippo.com" in prose while explaining why a field is unused).
      const liveMatches = text.split('\n').filter((line) =>
        /(href|src|location\.href)\s*=?.*(pippo\.com|human-systems|interactive-fiction)/i.test(line)
      );
      if (liveMatches.length) offenders.push({ file: path.relative(SRC_DIR, f), lines: liveMatches });
    }
  }
  assert.deepEqual(offenders, [], 'no live pippo.com-style href/src/navigation found in src/');
});

test('content modules carry no pippo.com-specific navigation fields (fully standalone)', () => {
  const en = fs.readFileSync(path.join(SRC_DIR, 'data', 'content.en.js'), 'utf8');
  const it = fs.readFileSync(path.join(SRC_DIR, 'data', 'content.it.js'), 'utf8');
  assert.ok(!/langHref/.test(en) && !/returnHref/.test(en) && !/returnLabel/.test(en), 'EN content must not carry pippo.com navigation fields');
  assert.ok(!/langHref/.test(it) && !/returnHref/.test(it) && !/returnLabel/.test(it), 'IT content must not carry pippo.com navigation fields');
});

test('standalone HELP text describes EXIT as returning to the splash screen, not pippo.com', () => {
  // Content modules carry no pippo.com navigation fields; only the
  // exact standalone EXIT line is checked here.
  const en = fs.readFileSync(path.join(SRC_DIR, 'data', 'content.en.js'), 'utf8');
  const it = fs.readFileSync(path.join(SRC_DIR, 'data', 'content.it.js'), 'utf8');
  assert.ok(!/RETURN TO PIPPO\.COM\./i.test(en), 'EN help must not claim EXIT returns to pippo.com');
  assert.ok(!/TORNA A PIPPO\.COM\./i.test(it), 'IT help must not claim EXIT returns to pippo.com');
  assert.match(en, /RETURN TO THE SPLASH SCREEN\./);
  assert.match(it, /TORNA ALLA SCHERMATA INIZIALE\./);
});

test('src/ does not depend on reboot.mp3 (no file, no reference as a live asset path)', () => {
  const files = walk(SRC_DIR);
  assert.ok(!files.some((f) => f.endsWith('.mp3')), 'no .mp3 file should exist under src/');
  const jsAndHtml = files.filter((f) => /\.(js|html)$/.test(f));
  for (const f of jsAndHtml) {
    const text = fs.readFileSync(f, 'utf8');
    const liveRefs = text.split('\n').filter((line) => /reboot\.mp3/.test(line) && /(src|href|=)\s*['"`]/.test(line));
    assert.deepEqual(liveRefs, [], `${path.relative(SRC_DIR, f)} must not reference reboot.mp3 as a live asset path`);
  }
});

test('index.html loads audioManager.js and never loads soundEffects.js', () => {
  const html = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  assert.match(html, /src="audio\/audioManager\.js"/);
  assert.ok(!/soundEffects\.js/.test(html));
  assert.ok(!/media-lab/.test(html), 'the normal app must not link to the dev-only media-lab page');
});

test('no hard-coded 8-event cap in game.js, no 8-row CSS max-height', () => {
  const gameJs = fs.readFileSync(GAME_JS_PATH, 'utf8');
  const css = fs.readFileSync(CSS_PATH, 'utf8');
  assert.ok(!/children\.length\s*>\s*8/.test(gameJs));
  assert.ok(!/removeChild\(eventLog\.firstChild\)/.test(gameJs));
  assert.ok(!/max-height:calc\(8 \*/.test(css));
});

test('war-grid geometry: explicit height + grid-template-rows + min-height:0 items', () => {
  // Whitespace-tolerant: joshua.css is formatted for readability (one
  // declaration per line, "prop: value") — these regexes check the actual
  // fix is present regardless of that surface layout, not an exact minified
  // byte sequence.
  const css = fs.readFileSync(CSS_PATH, 'utf8');
  const rules = css.match(/\.war-grid\s*\{[^}]*\}/g) || [];
  const desktopRule = rules.find((r) => r.includes('minmax(0,1fr) 320px'));
  assert.ok(desktopRule && /height:\s*calc\(100vh - 120px\)/.test(desktopRule));
  assert.ok(desktopRule && /grid-template-rows:\s*minmax\(0,1fr\)/.test(desktopRule));
  assert.ok(/\.status-panel,\s*\.event-panel,\s*\.map-stage\s*\{\s*min-height:\s*0;?\s*\}/.test(css));
});

test('boot timing constants preserved: 1000ms post-prelude pause, 500ms greeting/playPrompt TTS delay', () => {
  const bootSequenceJs = fs.readFileSync(path.join(SRC_DIR, 'app', 'bootSequence.js'), 'utf8');
  assert.match(bootSequenceJs, /POST_PRELUDE_PAUSE_MS\s*=\s*1000/);
  assert.match(bootSequenceJs, /GREETING_SPEECH_START_DELAY_MS\s*=\s*500/);
  assert.match(bootSequenceJs, /PLAY_PROMPT_SPEECH_START_DELAY_MS\s*=\s*500/);
});

test('final sequence: STRANGE GAME 0ms, THE ONLY WINNING MOVE 1000ms, chess question 1000ms', () => {
  const finalSequenceJs = fs.readFileSync(path.join(SRC_DIR, 'app', 'finalSequence.js'), 'utf8');
  assert.match(finalSequenceJs, /STRANGE_GAME_SPEECH_START_DELAY_MS\s*=\s*0/);
  assert.match(finalSequenceJs, /WINNING_MOVE_SPEECH_START_DELAY_MS\s*=\s*1000/);
  assert.match(finalSequenceJs, /CHESS_SPEECH_START_DELAY_MS\s*=\s*1000/);
});

test('presentationSpeed default and override machinery preserved', () => {
  const presentationJs = fs.readFileSync(path.join(SRC_DIR, 'app', 'presentation.js'), 'utf8');
  assert.match(presentationJs, /DEFAULT_SPEED\s*=\s*0\.5/);
});

test('game.js parses lang/fast/presentationSpeed from the query string (no separate launcher document needed)', () => {
  const gameJs = fs.readFileSync(GAME_JS_PATH, 'utf8');
  assert.match(gameJs, /URLSearchParams\(location\.search\)/);
  assert.match(gameJs, /params\.get\('lang'\)/);
  assert.match(gameJs, /params\.get\('fast'\)/);
  assert.match(gameJs, /JoshuaPresentation\.resolveSpeed\(params\.get\('presentationSpeed'\)\)/);
});

test('BOOT click handler unlocks audio synchronously before boot() (no await in between, no navigation)', () => {
  const gameJs = fs.readFileSync(GAME_JS_PATH, 'utf8');
  const fn = gameJs.match(/function handleBootClick\(\)\s*\{[\s\S]*?\n\s*\}/);
  assert.ok(fn, 'handleBootClick found');
  const body = fn[0];
  assert.ok(!/location\.href/.test(body), 'no navigation inside the BOOT handler');
  assert.ok(!/window\.open/.test(body), 'no popup/new tab');
  const unlockIdx = body.indexOf('JoshuaAudioManager.unlockFromGesture()');
  const bootIdx = body.indexOf('boot()');
  assert.ok(unlockIdx > -1 && bootIdx > -1 && unlockIdx < bootIdx);
});

test('EXIT and the final return button both return to the same-document splash, no navigation', () => {
  const gameJs = fs.readFileSync(GAME_JS_PATH, 'utf8');
  assert.match(gameJs, /if\(cmd==='EXIT' \|\| cmd==='ESCI'\)\{ returnToSplash\(\); return; \}/);
  assert.match(gameJs, /returnConsole\.addEventListener\('click', ?returnToSplash\)/);
  assert.ok(!/returnConsole\.href/.test(gameJs), 'returnConsole must not be given an href (it is a <button>, not a link)');
});

test('game.js must not silently fall back to another scenario\'s strategy profile', () => {
  const gameJs = fs.readFileSync(GAME_JS_PATH, 'utf8');
  assert.ok(!/STRATEGY_PROFILES\[s\.id\]\s*\|\|/.test(gameJs), 'game.js must not substitute a fallback strategy profile');
  assert.ok(!/STRATEGY_PROFILES\['northern-escalation'\]/.test(gameJs), 'game.js must not hardcode a fallback profile');
});

test('game.js carries no large hardcoded EN/IT block (strings live in content modules)', () => {
  // Localized wording lives in data/content.*.js; guard against reintroducing
  // a hardcoded TEXT block in game.js. EN/IT parity is checked by
  // tests/unit/contentParity.test.js.
  const gameJs = fs.readFileSync(GAME_JS_PATH, 'utf8');
  assert.ok(!/const TEXT\s*=/.test(gameJs), 'game.js must not reintroduce a hardcoded TEXT block');
});

test('game.js reads war report outcomes and the tic human token from content (no hardcoded English)', () => {
  const gameJs = fs.readFileSync(GAME_JS_PATH, 'utf8');
  assert.match(gameJs, /C\.war\.reportValues\.severe/);
  assert.match(gameJs, /C\.war\.reportValues\.degraded/);
  assert.match(gameJs, /C\.war\.reportValues\.failed/);
  assert.match(gameJs, /C\.tic\.humanLabel/);
  assert.ok(!/report-val">SEVERE</.test(gameJs), 'game.js must not hardcode "SEVERE"');
  assert.ok(!/report-val">DEGRADED</.test(gameJs), 'game.js must not hardcode "DEGRADED"');
  assert.ok(!/report-val">FAILED</.test(gameJs), 'game.js must not hardcode "FAILED"');
});

test('the completed-war-run threshold is a single shared constant (no duplicated "3")', () => {
  const gameJs = fs.readFileSync(GAME_JS_PATH, 'utf8');
  const warModelJs = fs.readFileSync(path.join(SRC_DIR, 'war', 'warModel.js'), 'utf8');
  const en = fs.readFileSync(path.join(SRC_DIR, 'data', 'content.en.js'), 'utf8');
  const it = fs.readFileSync(path.join(SRC_DIR, 'data', 'content.it.js'), 'utf8');

  // The completion check uses the shared constant, not a magic number.
  assert.match(gameJs, /hasCompletedRuns\(warRuns,\s*WarModel\.REQUIRED_WAR_RUNS\)/);
  // The constant is defined and exported by the war model.
  assert.match(warModelJs, /REQUIRED_WAR_RUNS\s*=\s*3/);
  assert.match(warModelJs, /REQUIRED_WAR_RUNS:\s*REQUIRED_WAR_RUNS/);
  // The display line is generated from the constant via a placeholder, not a
  // hardcoded run count.
  assert.match(en, /SCENARIOS RUN: \{runs\}/);
  assert.match(it, /SCENARI ESEGUITI: \{runs\}/);
  assert.ok(!/SCENARIOS RUN: \d/.test(en), 'EN must not hardcode the run count');
  assert.ok(!/SCENARI ESEGUITI: \d/.test(it), 'IT must not hardcode the run count');
});
