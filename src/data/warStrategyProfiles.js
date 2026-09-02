// Copyright (C) 2025-2026 Marco Iannacone
// SPDX-License-Identifier: AGPL-3.0-only
// Per-scenario escalation narrative for GLOBAL THERMONUCLEAR WAR (see
// runScenario()/logPhase()/animatePairs() in game.js). Each profile has
// four phases (local, first, second, global); each of the first three has
// {title, log[], strikes[]} where every strikes entry is
// [fromNodeId, toNodeId, colorOrFaction] — every id must exist in
// nodes.js (see tests/unit/warGeoValidation.test.js). The "global" phase
// only has {title, log[]} — its arcs come from GLOBAL_WORLD_PAIRS instead
// (see warRoutes.js), applied uniformly across every scenario.
window.JOSHUA_STRATEGY_PROFILES = {
  'strait-of-fire': {
    local: { title:'LOCAL SCENARIO: TAIWAN STRAIT CRISIS', log:['CHINA INITIATES REGIONAL PRESSURE OPERATIONS','TAIWAN DEFENSE SYSTEMS ACTIVE','UNITED STATES PACIFIC COMMAND ENTERS ALERT STATE'],
      strikes:[['china-coast','taiwan-strait','china'],['china-coast','western-pacific','china'],['korea-japan','taiwan-strait','pacific']] },
    first: { title:'FIRST ESCALATION: ALLIED DEFENSE NETWORK ACTIVATED', log:['JAPAN AND SOUTH KOREA JOIN PACIFIC DEFENSE GRID','NAVAL STRIKE GROUPS MOVE INTO CONTACT RANGE','MISSILE DEFENSE SYSTEMS SATURATED'],
      strikes:[['na-west','western-pacific','usa'],['korea-japan','china-coast','pacific'],['china-coast','korea-japan','china']] },
    second: { title:'SECOND ESCALATION: STRIKES ON BASES AND FLEETS', log:['UNITED STATES LAUNCHES RETALIATORY STRIKES','CHINESE COASTAL INSTALLATIONS TARGETED','PACIFIC THEATER NO LONGER CONTAINED'],
      strikes:[['na-west','china-coast','usa'],['china-coast','na-west','china'],['siberian-corridor','western-pacific','russia']] },
    global: { title:'GLOBAL ESCALATION: OPPORTUNISTIC STRATEGIC MOVES DETECTED', log:['RUSSIA ENTERS HIGH ALERT POSTURE','NATO EUROPE MOVES TO WAR STATE','IRAN OPENS REGIONAL PRESSURE FRONT','SOUTHERN HEMISPHERE TARGETING CASCADE','GLOBAL THERMONUCLEAR EXCHANGE CONFIRMED'] }
  },
  'pacific-containment-collapse': null,
  'northern-escalation': {
    local: { title:'LOCAL SCENARIO: NORTHERN EUROPE CRISIS', log:['RUSSIAN FORCES MOVE NEAR NATO BORDER','NATO EUROPEAN COMMAND ENTERS ALERT STATE','ARCTIC RADAR COVERAGE EXTENDED'],
      strikes:[['russia-west','northern-europe','russia'],['russia-west','central-europe','russia'],['central-europe','russia-west','europe']] },
    first: { title:'FIRST ESCALATION: NATO RESPONSE ACTIVATED', log:['EUROPEAN ALLIED DEFENSE GRID ACTIVATED','UNITED STATES STRATEGIC SUPPORT AUTHORIZED','BALTIC AND ARCTIC CORRIDORS SATURATED'],
      strikes:[['central-europe','russia-west','europe'],['na-east','north-atlantic','usa'],['russia-west','north-atlantic','russia']] },
    second: { title:'SECOND ESCALATION: POLAR EXCHANGE BEGINS', log:['MISSILE TRACKS CROSS ARCTIC CORRIDOR','SECOND-STRIKE SYSTEMS ENTER ACTIVE STATE','NORTH AMERICA TARGETING CONFIRMED'],
      strikes:[['siberian-corridor','north-america','russia'],['na-west','siberian-corridor','usa'],['na-east','russia-west','usa']] },
    global: { title:'GLOBAL ESCALATION: MULTI-THEATER COLLAPSE', log:['CHINA MOVES IN PACIFIC THEATER','IRAN OPENS REGIONAL PRESSURE FRONT','GLOBAL WARNING NETWORKS FAILING','SOUTHERN HEMISPHERE TARGETING CASCADE','GLOBAL THERMONUCLEAR EXCHANGE CONFIRMED'] }
  },
  'baltic-cascade': null,
  'arctic-alert-failure': null,
  'gulf-retaliation': {
    local: { title:'LOCAL SCENARIO: GULF STRIKE CRISIS', log:['REGIONAL STRIKE DETECTED IN THE GULF','IRANIAN MISSILE UNITS ENTER ACTIVE STATE','UNITED STATES REGIONAL COMMAND RESPONDS'],
      strikes:[['iran-corridor','persian-gulf','grey'],['iran-corridor','east-med','grey'],['na-east','iran-corridor','usa']] },
    first: { title:'FIRST ESCALATION: REGIONAL DEFENSE GRID ACTIVATED', log:['US STRIKE GROUPS MOVE INTO CONTACT RANGE','EUROPEAN ALLIES ENTER CONTAINMENT POSTURE','MISSILE DEFENSE SYSTEMS SATURATED'],
      strikes:[['na-east','persian-gulf','usa'],['central-europe','east-med','europe'],['iran-corridor','central-europe','grey']] },
    second: { title:'SECOND ESCALATION: GREAT POWER ALERT', log:['RUSSIA ENTERS HIGH ALERT POSTURE','CHINA MOVES TO STRATEGIC READINESS','REGIONAL WAR NO LONGER CONTAINED'],
      strikes:[['russia-west','central-europe','russia'],['china-coast','western-pacific','china'],['na-west','china-coast','usa']] },
    global: { title:'GLOBAL ESCALATION: MULTIPOLAR EXCHANGE', log:['NATO EUROPE MOVES TO WAR STATE','RUSSIA AND CHINA ENTER RETALIATORY POSTURE','SOUTHERN HEMISPHERE TARGETING CASCADE','GLOBAL THERMONUCLEAR EXCHANGE CONFIRMED'] }
  },
  'regional-flashpoint': null,
  'second-strike-misreading': null,
  'multi-front-escalation': {
    local: { title:'LOCAL SCENARIO: LEVANT MULTI-FRONT CRISIS', log:['MULTIPLE REGIONAL LAUNCH WARNINGS DETECTED','ISRAELI DEFENSE SYSTEMS ACTIVE','IRANIAN FORCES ENTER RETALIATORY POSTURE'],
      strikes:[['levant','iran-corridor','grey'],['iran-corridor','levant','grey'],['iran-corridor','east-med','grey']] },
    first: { title:'FIRST ESCALATION: ALLIED SUPPORT ACTIVATED', log:['UNITED STATES SUPPORTS REGIONAL ALLY','EUROPEAN COMMAND ENTERS EASTERN MEDITERRANEAN POSTURE','MISSILE DEFENSE SYSTEMS SATURATED'],
      strikes:[['na-east','east-med','usa'],['central-europe','east-med','europe'],['iran-corridor','central-europe','grey']] },
    second: { title:'SECOND ESCALATION: EXTERNAL POWERS ENTER', log:['RUSSIA MOVES INTO HIGH ALERT POSTURE','PACIFIC THEATER SHIFTS TO STRATEGIC READINESS','CONTAINMENT WINDOW CLOSED'],
      strikes:[['russia-west','central-europe','russia'],['china-coast','western-pacific','china'],['na-west','china-coast','usa']] },
    global: { title:'GLOBAL ESCALATION: STRATEGIC EXCHANGE CONFIRMED', log:['NATO EUROPE MOVES TO WAR STATE','RUSSIA AND CHINA ENTER RETALIATORY POSTURE','SOUTHERN HEMISPHERE TARGETING CASCADE','GLOBAL THERMONUCLEAR EXCHANGE CONFIRMED'] }
  },
  'preemptive-shadow': null
};
// These scenarios intentionally share the escalation narrative (local/
// first/second/global phase log and strikes) of a sibling scenario with a
// similar theater, rather than each having its own bespoke text — this is
// deliberate content reuse, not a missing/incomplete profile.
window.JOSHUA_STRATEGY_PROFILES['pacific-containment-collapse'] = window.JOSHUA_STRATEGY_PROFILES['strait-of-fire'];
window.JOSHUA_STRATEGY_PROFILES['baltic-cascade'] = window.JOSHUA_STRATEGY_PROFILES['northern-escalation'];
window.JOSHUA_STRATEGY_PROFILES['arctic-alert-failure'] = window.JOSHUA_STRATEGY_PROFILES['northern-escalation'];
window.JOSHUA_STRATEGY_PROFILES['regional-flashpoint'] = window.JOSHUA_STRATEGY_PROFILES['gulf-retaliation'];
window.JOSHUA_STRATEGY_PROFILES['second-strike-misreading'] = window.JOSHUA_STRATEGY_PROFILES['gulf-retaliation'];
window.JOSHUA_STRATEGY_PROFILES['preemptive-shadow'] = window.JOSHUA_STRATEGY_PROFILES['multi-front-escalation'];
