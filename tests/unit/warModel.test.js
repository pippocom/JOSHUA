// Copyright (C) 2025-2026 Marco Iannacone
// SPDX-License-Identifier: AGPL-3.0-only
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const WarModel = require('../../src/war/warModel.js');

function sequence(values) {
  let index = 0;
  return () => values[index++];
}

test('createStats returns the initial statistical state', () => {
  assert.deepEqual(WarModel.createStats(), {
    missiles: 0, detonations: 0, casualties: 0, alert: 'DEFCON 3', elapsed: '00:00', seconds: 0
  });
});

test('randomInteger preserves the rounded uniform range and accepts an injected RNG', () => {
  assert.equal(WarModel.randomInteger([10, 20], () => 0), 10);
  assert.equal(WarModel.randomInteger([10, 20], () => 0.49), 15);
  assert.equal(WarModel.randomInteger([10, 20], () => 1), 20);
});

test('applyToll updates totals, alert and elapsed without mutating either input', () => {
  const state = WarModel.createStats();
  const toll = { missiles: 12, detonations: 3, casualties: 4500, seconds: 65, alert: 'DEFCON 2' };
  const stateBefore = structuredClone(state);
  const tollBefore = structuredClone(toll);
  const next = WarModel.applyToll(state, toll);

  assert.deepEqual(next, {
    missiles: 12, detonations: 3, casualties: 4500, alert: 'DEFCON 2', elapsed: '01:05', seconds: 65
  });
  assert.deepEqual(state, stateBefore);
  assert.deepEqual(toll, tollBefore);
  assert.notEqual(next, state);
});

test('applyToll preserves the provisional world-population casualty cap and existing alert', () => {
  const state = { ...WarModel.createStats(), casualties: 8299999990, alert: 'DEFCON 1' };
  const next = WarModel.applyToll(state, {
    missiles: 0, detonations: 0, casualties: 100, seconds: 0
  });
  assert.equal(next.casualties, WarModel.WORLD_POPULATION_MODEL_CAP);
  assert.equal(next.alert, 'DEFCON 1');
});

test('applyRandomToll consumes one RNG value per range, in order', () => {
  const next = WarModel.applyRandomToll(WarModel.createStats(), {
    missiles: [10, 20], detonations: [30, 40], casualties: [50, 60], elapsed: [1, 3], alert: 'DEFCON 1'
  }, sequence([0, 0.5, 1, 0.5]));
  assert.deepEqual(next, {
    missiles: 10, detonations: 35, casualties: 60, alert: 'DEFCON 1', elapsed: '00:02', seconds: 2
  });
});

test('intensity is the phase floor or normalized detonation total, capped at one', () => {
  assert.equal(WarModel.intensityForPhase(null, 0.28), 0.28);
  assert.equal(WarModel.intensityForPhase({ detonations: 1000 }, 0.28), 0.5);
  assert.equal(WarModel.intensityForPhase({ detonations: 4000 }, 0.28), 1);
});

test('createReport is deterministic, keeps casualty meanings/bounds and does not mutate state', () => {
  const state = { ...WarModel.createStats(), casualties: 8000000000, detonations: 9000 };
  const before = structuredClone(state);
  const report = WarModel.createReport(state, sequence([0, 0, 0, 0, 0]));

  assert.deepEqual(report, {
    imm: 4640000000,
    thirty: 5240000000,
    det: 9000,
    infra: 96
  });
  assert.ok(report.imm <= WarModel.IMMEDIATE_FATALITY_CAP);
  assert.ok(report.thirty <= WarModel.THIRTY_DAY_FATALITY_CAP);
  assert.ok(report.thirty >= report.imm);
  assert.deepEqual(state, before);
});

test('run progression changes only when the orchestrator explicitly completes a scenario', () => {
  assert.equal(WarModel.completeRun(0), 1);
  assert.equal(WarModel.completeRun(2), 3);
  assert.equal(WarModel.hasCompletedRuns(2, 3), false);
  assert.equal(WarModel.hasCompletedRuns(3, 3), true);
});

test('REQUIRED_WAR_RUNS is the single shared threshold used by hasCompletedRuns', () => {
  assert.equal(WarModel.REQUIRED_WAR_RUNS, 3);
  assert.equal(WarModel.hasCompletedRuns(WarModel.REQUIRED_WAR_RUNS - 1, WarModel.REQUIRED_WAR_RUNS), false);
  assert.equal(WarModel.hasCompletedRuns(WarModel.REQUIRED_WAR_RUNS, WarModel.REQUIRED_WAR_RUNS), true);
});
