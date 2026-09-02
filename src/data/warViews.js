// Copyright (C) 2025-2026 Marco Iannacone
// SPDX-License-Identifier: AGPL-3.0-only
// Camera/zoom presets for the GLOBAL THERMONUCLEAR WAR map (see game.js's
// zoom()). Every {x,y,s} is in the SAME coordinate space as the map SVG's
// own viewBox ("0 0 1600 800", see src/index.html / project() in game.js):
// x/y are a point in that 1600x800 space to center the view on, and s is
// the zoom scale multiplier applied around that point. These values were
// tuned by hand for each scenario/region and carry no other meaning.
//
// SCENARIO_VIEWS: per-scenario camera framing for the "local" and
// "regional" escalation phases, keyed by scenario id (see scenarios.js).
// Scenarios that reuse another scenario's STRATEGY_PROFILES narrative (see
// warStrategyProfiles.js) still get their own SCENARIO_VIEWS entry, because
// the camera framing depends on the scenario's own geography, not on which
// narrative text it borrows.
window.JOSHUA_SCENARIO_VIEWS = {
  'northern-escalation': { local:{x:805,y:170,s:1.95}, regional:{x:725,y:215,s:1.58} },
  'gulf-retaliation': { local:{x:965,y:315,s:1.95}, regional:{x:885,y:280,s:1.62} },
  'baltic-cascade': { local:{x:790,y:185,s:2.0}, regional:{x:725,y:215,s:1.60} },
  'arctic-alert-failure': { local:{x:790,y:115,s:1.95}, regional:{x:730,y:165,s:1.58} },
  'strait-of-fire': { local:{x:1290,y:325,s:2.2}, regional:{x:1180,y:285,s:1.68} },
  'pacific-containment-collapse': { local:{x:1275,y:305,s:2.0}, regional:{x:1205,y:255,s:1.6} },
  'regional-flashpoint': { local:{x:975,y:320,s:2.0}, regional:{x:900,y:285,s:1.62} },
  'second-strike-misreading': { local:{x:940,y:280,s:1.92}, regional:{x:855,y:245,s:1.58} },
  'multi-front-escalation': { local:{x:915,y:300,s:2.05}, regional:{x:860,y:260,s:1.65} },
  'preemptive-shadow': { local:{x:930,y:295,s:2.0}, regional:{x:870,y:255,s:1.63} }
};

// WORLD_VIEWS: the wide, phase-scoped camera positions used once a scenario
// escalates past its local/regional origin into the "storm" phases
// (strikeStorm over usa/europe/arctic, then the world-wide view for
// globalBlanket). Not per-scenario — the same four apply to every scenario.
window.JOSHUA_WORLD_VIEWS = {
  usa: { x: 330, y: 265, s: 2.55 },
  europe: { x: 790, y: 215, s: 3.0 },
  arctic: { x: 825, y: 95, s: 2.25 },
  world: { x: 800, y: 395, s: 1.08 }
};
