// Copyright (C) 2025-2026 Marco Iannacone
// SPDX-License-Identifier: AGPL-3.0-only
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const WarMap = require('../../src/war/warMap.js');

class FakeElement {
  constructor(name) {
    this.name = name;
    this.attributes = {};
    this.children = [];
    this.style = {};
    this.textContent = '';
  }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  appendChild(child) { this.children.push(child); child.parent = this; return child; }
  remove() {
    if (this.parent) this.parent.children = this.parent.children.filter((child) => child !== this);
  }
  set innerHTML(value) { if (value === '') this.children = []; }
  get innerHTML() { return ''; }
}

function fixture() {
  const overlay = new FakeElement('svg');
  const viewport = new FakeElement('g');
  const timers = [];
  const events = [];
  const nodesById = {
    west: { id: 'west', lon: -180, lat: 80, label: 'WEST', type: 'command' },
    east: { id: 'east', lon: 180, lat: -60, label: 'EAST', type: 'target' }
  };
  const map = WarMap.createWarMap({
    document: { createElementNS: (_ns, name) => new FakeElement(name) },
    overlay,
    viewport,
    nodesById,
    setTimeout: (fn, delay) => { timers.push({ fn, delay }); return timers.length; },
    onLaunch: () => events.push('launch'),
    onImpact: (payload) => events.push(payload)
  });
  return { map, overlay, viewport, timers, events };
}

test('viewBox dimensions and lon/lat projection are unchanged', () => {
  assert.equal(WarMap.VIEWBOX_WIDTH, 1600);
  assert.equal(WarMap.VIEWBOX_HEIGHT, 800);
  assert.deepEqual(WarMap.project(-180, 80), { x: 0, y: 0 });
  assert.deepEqual(WarMap.project(0, 10), { x: 800, y: 400 });
  assert.deepEqual(WarMap.project(180, -60), { x: 1600, y: 800 });
});

test('quadratic trajectory geometry preserves the control-point formula', () => {
  assert.equal(WarMap.quadraticPath({ x: 0, y: 100 }, { x: 1000, y: 300 }), 'M 0 100 Q 500 -60 1000 300');
  assert.equal(WarMap.quadraticPath({ x: 100, y: 200 }, { x: 200, y: 300 }), 'M 100 200 Q 150 156 200 300');
});

test('drawNodes preserves coordinates/classes/labels and ignores unknown optional nodes', () => {
  const { map, overlay } = fixture();
  map.drawNodes(['west', 'missing', 'east'], ['east']);
  assert.equal(overlay.children.length, 4);
  assert.deepEqual(overlay.children.map((el) => el.attributes.class), [
    'node command', 'node-label', 'node impact', 'node-label'
  ]);
  assert.equal(overlay.children[1].textContent, 'WEST');
  assert.equal(overlay.children[3].textContent, 'EAST');
});

test('drawArc uses node lookup, appends one path and emits exactly one launch hook', () => {
  const { map, overlay, events } = fixture();
  const path = map.drawArc('west', 'east', 'global');
  assert.equal(path.attributes.d, 'M 0 0 Q 800 140 1600 800');
  assert.equal(path.attributes.class, 'trajectory global');
  assert.equal(overlay.children.length, 1);
  assert.deepEqual(events, ['launch']);
  assert.throws(() => map.drawArc('missing', 'east'), /Unknown war-map node: missing/);
});

test('impact keeps flash/ring geometry and timing while emitting one impact hook', () => {
  const { map, overlay, timers, events } = fixture();
  const flash = map.impact('east', true);
  assert.equal(flash.attributes.r, '16');
  assert.equal(flash.attributes.class, 'flash big');
  assert.deepEqual(timers.map((timer) => timer.delay), [0, 180, 360, 540]);
  assert.deepEqual(events, [{ big: true }]);

  timers[0].fn();
  const ring = overlay.children.at(-1);
  assert.equal(ring.attributes.r, '7');
  assert.equal(ring.attributes.class, 'impact-ring big');
  assert.equal(timers.at(-1).delay, 1700);
  timers.at(-1).fn();
  assert.ok(!overlay.children.includes(ring));
  assert.equal(map.impact('missing'), null);
});

test('zoom/framing transform and clear behavior are unchanged', () => {
  const { map, overlay, viewport } = fixture();
  map.drawNodes(['west']);
  map.zoom({ x: 400, y: 200, s: 2 });
  assert.equal(viewport.style.transform, 'translate(25%, 25%) scale(2)');
  map.zoom(null);
  assert.equal(viewport.style.transform, '');
  map.clear();
  assert.equal(overlay.children.length, 0);
});
