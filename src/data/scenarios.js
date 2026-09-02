// Copyright (C) 2025-2026 Marco Iannacone
// SPDX-License-Identifier: AGPL-3.0-only
// Faction and scenario catalog for GLOBAL THERMONUCLEAR WAR.
//
// Each scenario carries only the metadata the runtime actually reads:
// game.js consumes id/faction/title/briefing. The per-scenario escalation
// narrative and strike routes live in warStrategyProfiles.js / warRoutes.js,
// and the camera framing lives in warViews.js — one source of truth per
// concern. (An older revision kept a duplicate `escalation` structure here;
// it was unused by game.js and diverged from the live data, so it was
// removed rather than left to drift.)
window.JOSHUA_SCENARIOS = {
  "factions": ["USA","RUSSIA","CHINA","IRAN","ISRAEL"],
  "scenarios": [
    {
      "id": "northern-escalation", "faction": "USA", "title": "NORTHERN ESCALATION",
      "briefing": ["REGIONAL CRISIS IN NORTHERN EUROPE","ALLIANCE MOBILIZATION IN PROGRESS","EARLY WARNING SYSTEMS ON HIGH ALERT","DIPLOMATIC CHANNELS DEGRADED"]
    },
    {
      "id": "gulf-retaliation", "faction": "USA", "title": "GULF RETALIATION",
      "briefing": ["REGIONAL STRIKE IN THE GULF","MISSILE DEFENSE NETWORKS ACTIVE","SECONDARY THEATERS ENTER ALERT STATE","ESCALATION PATHS MULTIPLYING"]
    },
    {
      "id": "baltic-cascade", "faction": "RUSSIA", "title": "BALTIC CASCADE",
      "briefing": ["REGIONAL INCIDENT IN THE BALTIC","ALLIANCE MOBILIZATION DETECTED","COMMAND AUTHORIZATION CHANNELS ACTIVE","CONTAINMENT WINDOW CLOSING"]
    },
    {
      "id": "arctic-alert-failure", "faction": "RUSSIA", "title": "ARCTIC ALERT FAILURE",
      "briefing": ["FALSE ALARM IN ARCTIC THEATER","SATELLITE TRACKING AMBIGUOUS","RETALIATION LOGIC ENTERS HOLD STATE","AUTOMATED ESCALATION RISK RISING"]
    },
    {
      "id": "strait-of-fire", "faction": "CHINA", "title": "STRAIT OF FIRE",
      "briefing": ["NAVAL BLOCKADE NEAR STRAIT","MISSILE DEFENSE SYSTEMS ON ALERT","REGIONAL ALLIANCES ACTIVATING","SIGNAL INTERPRETATION DEGRADED"]
    },
    {
      "id": "pacific-containment-collapse", "faction": "CHINA", "title": "PACIFIC CONTAINMENT COLLAPSE",
      "briefing": ["DETERRENCE FAILURE IN WESTERN PACIFIC","AIR AND NAVAL ASSETS DISPERSED","REGIONAL COMMANDS ENTER STRIKE POSTURE","LIMITED OPTIONS EXPANDING"]
    },
    {
      "id": "regional-flashpoint", "faction": "IRAN", "title": "REGIONAL FLASHPOINT",
      "briefing": ["REGIONAL STRIKE DETECTED","MISSILE RESPONSE IN PROGRESS","ALLIED SYSTEMS MOVING TO ALERT","ESCALATION CONTAINMENT UNSTABLE"]
    },
    {
      "id": "second-strike-misreading", "faction": "IRAN", "title": "SECOND STRIKE MISREADING",
      "briefing": ["CONVENTIONAL LAUNCH MISCLASSIFIED","STRATEGIC WARNING THRESHOLDS EXCEEDED","COMMAND CONFIDENCE LOW","RETALIATION TIMERS ACTIVE"]
    },
    {
      "id": "multi-front-escalation", "faction": "ISRAEL", "title": "MULTI-FRONT ESCALATION",
      "briefing": ["MULTIPLE FRONTS ACTIVE","PREEMPTIVE OPTIONS UNDER REVIEW","REGIONAL COMMANDS LOSING SIGNAL CLARITY","DE-ESCALATION CHANNELS FAILING"]
    },
    {
      "id": "preemptive-shadow", "faction": "ISRAEL", "title": "PREEMPTIVE SHADOW",
      "briefing": ["PREEMPTIVE ACTION AUTHORIZED","TARGET INTENT ESTIMATES UNSTABLE","REGIONAL RESPONSE CHAINS ACTIVATING","GLOBAL ALERT LAYER ENGAGED"]
    }
  ]
};
