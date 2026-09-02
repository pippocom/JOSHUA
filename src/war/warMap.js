// Copyright (C) 2025-2026 Marco Iannacone
// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Geographic SVG renderer for GLOBAL THERMONUCLEAR WAR.
 *
 * Projection and geometry helpers are pure. createWarMap() receives its DOM,
 * timer, node lookup, and visual-event hooks explicitly; it knows nothing
 * about menus, language, reports, run progression, TTS, or audio managers.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.JoshuaWarMap = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var VIEWBOX_WIDTH = 1600;
  var VIEWBOX_HEIGHT = 800;
  var SVG_NS = 'http://www.w3.org/2000/svg';

  // Impact rings are transient: they animate outward for RING_LIFETIME_MS and
  // are then removed, so the "flash" stays bounded even though arcs and impact
  // markers accumulate for the whole run (see the war-map SVG lifecycle note
  // in runScenario()). This is the only self-cleaning transient node type.
  var RING_LIFETIME_MS = 1700;

  // Plain equirectangular projection into the 1600x800 viewBox: longitude
  // -180..180 maps linearly to x 0..1600, latitude 80..-60 (the map's useful
  // range) maps linearly to y 0..800. Out-of-range coordinates still project
  // linearly (never clamped) so every node stays on-canvas.
  function project(lon, lat) {
    return {
      x: (lon + 180) / 360 * VIEWBOX_WIDTH,
      y: (80 - lat) / 140 * VIEWBOX_HEIGHT
    };
  }

  // Quadratic Bézier arc between two projected points. The control point sits
  // at the midpoint and is lifted upward (negative y) by an amount that grows
  // with horizontal distance, capped at 260 units — so long-range ICBM arcs
  // curve prominently without leaving the viewBox. Cosmetic only: the returned
  // path is what the trajectory CSS and the launch hook attach to.
  function quadraticPath(a, b) {
    var dx = b.x - a.x;
    var mx = (a.x + b.x) / 2;
    var my = (a.y + b.y) / 2 - Math.min(260, Math.abs(dx) * 0.24 + 70);
    return 'M ' + a.x + ' ' + a.y + ' Q ' + mx + ' ' + my + ' ' + b.x + ' ' + b.y;
  }

  function createWarMap(options) {
    var documentRef = options.document;
    var overlay = options.overlay;
    var viewport = options.viewport;
    var nodesById = options.nodesById;
    var schedule = options.setTimeout || setTimeout;
    var onLaunch = options.onLaunch || function () {};
    var onImpact = options.onImpact || function () {};

    function svgElement(name) {
      return documentRef.createElementNS(SVG_NS, name);
    }

    function requireNode(id) {
      var node = nodesById[id];
      if (!node) throw new Error('Unknown war-map node: ' + id);
      return node;
    }

    function clear() {
      overlay.innerHTML = '';
    }

    function drawNodes(ids, impacts) {
      var impactIds = impacts || [];
      ids.forEach(function (id) {
        var node = nodesById[id];
        if (!node) return;
        var point = project(node.lon, node.lat);
        var isImpact = impactIds.indexOf(id) !== -1;
        var circle = svgElement('circle');
        circle.setAttribute('cx', point.x);
        circle.setAttribute('cy', point.y);
        circle.setAttribute('r', isImpact ? 7 : 5);
        circle.setAttribute('class', 'node ' + (isImpact ? 'impact' : node.type));
        overlay.appendChild(circle);
        var text = svgElement('text');
        text.setAttribute('x', point.x + 10);
        text.setAttribute('y', point.y - 8);
        text.setAttribute('class', 'node-label');
        text.textContent = node.label;
        overlay.appendChild(text);
      });
    }

    function drawArcCoordinates(a, b, color) {
      var path = svgElement('path');
      path.setAttribute('d', quadraticPath(a, b));
      path.setAttribute('class', 'trajectory ' + (color || ''));
      overlay.appendChild(path);
      onLaunch();
      return path;
    }

    function drawArc(from, to, color) {
      var fromNode = requireNode(from);
      var toNode = requireNode(to);
      return drawArcCoordinates(
        project(fromNode.lon, fromNode.lat),
        project(toNode.lon, toNode.lat),
        color
      );
    }

    function impactCoordinates(lon, lat, big) {
      var isBig = !!big;
      var point = project(lon, lat);
      var flash = svgElement('circle');
      flash.setAttribute('cx', point.x);
      flash.setAttribute('cy', point.y);
      flash.setAttribute('r', isBig ? 16 : 11);
      flash.setAttribute('class', 'flash' + (isBig ? ' big' : ''));
      overlay.appendChild(flash);
      for (var i = 0; i < (isBig ? 4 : 3); i++) {
        (function (delay) {
          schedule(function () {
            var ring = svgElement('circle');
            ring.setAttribute('cx', point.x);
            ring.setAttribute('cy', point.y);
            ring.setAttribute('r', isBig ? 7 : 4);
            ring.setAttribute('class', 'impact-ring' + (isBig ? ' big' : ''));
            overlay.appendChild(ring);
            schedule(function () { ring.remove(); }, RING_LIFETIME_MS);
          }, delay);
        })(i * (isBig ? 180 : 250));
      }
      onImpact({ big: isBig });
      return flash;
    }

    function impact(id, big) {
      var node = nodesById[id];
      if (!node) return null;
      return impactCoordinates(node.lon, node.lat, big);
    }

    // Centers the map on view.x/view.y (in 1600x800 space) and scales by
    // view.s. The translate percentage moves the viewBox center onto the
    // viewport center, so the point appears mid-screen after scaling.
    function zoom(view) {
      if (!view) {
        viewport.style.transform = '';
        return;
      }
      var dx = ((VIEWBOX_WIDTH / 2 - view.x) / VIEWBOX_WIDTH) * 100;
      var dy = ((VIEWBOX_HEIGHT / 2 - view.y) / VIEWBOX_HEIGHT) * 100;
      viewport.style.transform = 'translate(' + dx + '%, ' + dy + '%) scale(' + view.s + ')';
    }

    return {
      clear: clear,
      drawNodes: drawNodes,
      drawArcCoordinates: drawArcCoordinates,
      drawArc: drawArc,
      impactCoordinates: impactCoordinates,
      impact: impact,
      zoom: zoom
    };
  }

  return {
    VIEWBOX_WIDTH: VIEWBOX_WIDTH,
    VIEWBOX_HEIGHT: VIEWBOX_HEIGHT,
    project: project,
    quadraticPath: quadraticPath,
    createWarMap: createWarMap
  };
});
