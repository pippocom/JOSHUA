// Copyright (C) 2025-2026 Marco Iannacone
// SPDX-License-Identifier: AGPL-3.0-only
'use strict';

// Automated validation that every geographic id referenced by the
// war simulation's data (src/data/warRoutes.js, warStrategyProfiles.js)
// actually exists in src/data/nodes.js. These files are plain
// `window.X = {...}` globals (same convention as content.en.js/nodes.js),
// so they're loaded here the same way the app's own srcCanonical-style
// tests load nodes.js/scenarios.js: assign a fake `window` and require()
// them directly (they only ever write to window, never read it).

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

function loadDataGlobals() {
  const win = {};
  global.window = win;
  delete require.cache[require.resolve(path.join('..', '..', 'src', 'data', 'nodes.js'))];
  delete require.cache[require.resolve(path.join('..', '..', 'src', 'data', 'warRoutes.js'))];
  delete require.cache[require.resolve(path.join('..', '..', 'src', 'data', 'warStrategyProfiles.js'))];
  delete require.cache[require.resolve(path.join('..', '..', 'src', 'data', 'warCityRegions.js'))];
  require(path.join('..', '..', 'src', 'data', 'nodes.js'));
  require(path.join('..', '..', 'src', 'data', 'warRoutes.js'));
  require(path.join('..', '..', 'src', 'data', 'warStrategyProfiles.js'));
  require(path.join('..', '..', 'src', 'data', 'warCityRegions.js'));
  return win;
}

test('every node id referenced by GLOBAL_WORLD_PAIRS exists in nodes.js', () => {
  const win = loadDataGlobals();
  const nodeIds = new Set(win.JOSHUA_NODES.nodes.map((n) => n.id));
  const orphans = [];
  for (const [from, to] of win.JOSHUA_GLOBAL_WORLD_PAIRS) {
    if (!nodeIds.has(from)) orphans.push(from);
    if (!nodeIds.has(to)) orphans.push(to);
  }
  assert.deepEqual(orphans, [], `orphaned node id(s) referenced by GLOBAL_WORLD_PAIRS: ${orphans.join(', ')}`);
});

test('every node id referenced by STRATEGY_PROFILES[*].{local,first,second}.strikes exists in nodes.js', () => {
  const win = loadDataGlobals();
  const nodeIds = new Set(win.JOSHUA_NODES.nodes.map((n) => n.id));
  const orphans = [];
  const seenProfiles = new Set(); // profiles are aliased (shared by reference) — check each object once
  for (const scenarioId of Object.keys(win.JOSHUA_STRATEGY_PROFILES)) {
    const profile = win.JOSHUA_STRATEGY_PROFILES[scenarioId];
    if (!profile || seenProfiles.has(profile)) continue;
    seenProfiles.add(profile);
    for (const phaseName of ['local', 'first', 'second']) {
      const phase = profile[phaseName];
      if (!phase || !Array.isArray(phase.strikes)) continue;
      for (const [from, to] of phase.strikes) {
        if (!nodeIds.has(from)) orphans.push(`${scenarioId}.${phaseName}: ${from}`);
        if (!nodeIds.has(to)) orphans.push(`${scenarioId}.${phaseName}: ${to}`);
      }
    }
  }
  assert.deepEqual(orphans, [], `orphaned node id(s) referenced by STRATEGY_PROFILES: ${orphans.join(', ')}`);
});

test('nodes.js "type" field only uses the values game.js\'s drawNodes() actually understands', () => {
  const win = loadDataGlobals();
  // drawNodes() in game.js sets the SVG node's CSS class to `impacts.includes(id)
  // ? 'impact' : n.type` — so any type other than these three renders with
  // whatever CSS class its name happens to be, silently, with no visual
  // feedback that it's a typo. This test exists so a future bad value fails
  // loudly here instead of just "looking a bit off" on the map.
  const ALLOWED_TYPES = new Set(['launch', 'target', 'city']);
  const badTypes = win.JOSHUA_NODES.nodes.filter((n) => !ALLOWED_TYPES.has(n.type)).map((n) => `${n.id}: ${n.type}`);
  assert.deepEqual(badTypes, [], `node(s) with an unrecognized "type": ${badTypes.join(', ')}`);
});

test('CITY_REGIONS: no city label is duplicated across regions that are ever combined in the same target list', () => {
  // globalBlanket() in game.js builds a single flat target list as
  // [...usa.slice(0,4), ...europe.slice(0,4), ...world, ...south] — any
  // label appearing in more than one of these four regions would be
  // impacted and counted twice in that one pass (see warCityRegions.js's
  // header comment for the JOHANNESBURG/SYDNEY case this caught).
  const win = loadDataGlobals();
  const regions = win.JOSHUA_CITY_REGIONS;
  const combined = [...regions.usa.slice(0, 4), ...regions.europe.slice(0, 4), ...regions.world, ...regions.south];
  const seen = new Set();
  const duplicates = [];
  for (const city of combined) {
    if (seen.has(city.label)) duplicates.push(city.label);
    seen.add(city.label);
  }
  assert.deepEqual(duplicates, [], `city/cities counted more than once in globalBlanket()'s target list: ${duplicates.join(', ')}`);
});

test('CITY_REGIONS.world does not duplicate JOHANNESBURG/SYDNEY from .south (regression guard)', () => {
  const win = loadDataGlobals();
  const worldLabels = win.JOSHUA_CITY_REGIONS.world.map((c) => c.label);
  assert.ok(!worldLabels.includes('JOHANNESBURG'), 'JOHANNESBURG belongs only in .south now');
  assert.ok(!worldLabels.includes('SYDNEY'), 'SYDNEY belongs only in .south now');
  const southLabels = win.JOSHUA_CITY_REGIONS.south.map((c) => c.label);
  assert.ok(southLabels.includes('JOHANNESBURG') && southLabels.includes('SYDNEY'), 'both cities must still be present exactly once, in .south');
});

test('ZERO_SEQUENCES: every sequence is a full 9-cell permutation ending in a draw (winner() reaches "D", never a win before the board fills)', () => {
  // Uses the pure game engine rather than a local reimplementation, so this
  // test tracks the actual win-detection logic game.js runs, not a
  // separately-maintained copy of it.
  const { winner } = require(path.join('..', '..', 'src', 'games', 'ticTacToeEngine.js'));
  const win = loadDataGlobals();
  delete require.cache[require.resolve(path.join('..', '..', 'src', 'data', 'ticTacToeZeroSequences.js'))];
  require(path.join('..', '..', 'src', 'data', 'ticTacToeZeroSequences.js'));
  win.JOSHUA_ZERO_SEQUENCES.forEach((seq, i) => {
    assert.deepEqual([...seq].sort((a, b) => a - b), [0,1,2,3,4,5,6,7,8], `sequence ${i} is not a permutation of 0-8`);
    const board = Array(9).fill('');
    for (let step = 0; step < seq.length; step++) {
      board[seq[step]] = step % 2 === 0 ? 'X' : 'O';
      const result = winner(board);
      if (result && step < 8) assert.fail(`sequence ${i} produces an early win ('${result}') at step ${step}, before the board fills`);
    }
    assert.equal(winner(board), 'D', `sequence ${i} must end in a draw`);
  });
});

test('every scenario id has both a strategy profile and a camera view (and neither set has orphans)', () => {
  // game.js resolves STRATEGY_PROFILES[s.id] and SCENARIO_VIEWS[s.id]
  // directly (no valid fallback), so any scenario missing either map would
  // throw inside runScenario()'s error boundary. Guard the two-way
  // completeness of these data maps against future drift.
  const win = loadDataGlobals();
  delete require.cache[require.resolve(path.join('..', '..', 'src', 'data', 'scenarios.js'))];
  delete require.cache[require.resolve(path.join('..', '..', 'src', 'data', 'warViews.js'))];
  require(path.join('..', '..', 'src', 'data', 'scenarios.js'));
  require(path.join('..', '..', 'src', 'data', 'warViews.js'));

  const scenarioIds = win.JOSHUA_SCENARIOS.scenarios.map((s) => s.id);
  const profileIds = Object.keys(win.JOSHUA_STRATEGY_PROFILES);
  const viewIds = Object.keys(win.JOSHUA_SCENARIO_VIEWS);

  assert.deepEqual(
    scenarioIds.filter((id) => !profileIds.includes(id)),
    [],
    `scenario ids without a strategy profile`
  );
  assert.deepEqual(
    scenarioIds.filter((id) => !viewIds.includes(id)),
    [],
    `scenario ids without a camera view`
  );
  assert.deepEqual(
    profileIds.filter((id) => !scenarioIds.includes(id)),
    [],
    `strategy profiles without a matching scenario`
  );
  assert.deepEqual(
    viewIds.filter((id) => !scenarioIds.includes(id)),
    [],
    `camera views without a matching scenario`
  );
});
