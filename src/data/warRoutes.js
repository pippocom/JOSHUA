// Copyright (C) 2025-2026 Marco Iannacone
// SPDX-License-Identifier: AGPL-3.0-only
// Launch/target node-id pairs (see nodes.js for the id -> {lon,lat,type}
// definitions) animated during globalBlanket()'s opening wave, in game.js.
// Each pair is [fromNodeId, toNodeId]; every id here must exist in
// nodes.js — see tests/unit/warGeoValidation.test.js for the automated
// check.
window.JOSHUA_GLOBAL_WORLD_PAIRS = [
  ['russia-west','na-east'],['siberian-corridor','na-west'],['na-east','central-europe'],['na-west','western-pacific'],
  ['china-coast','na-west'],['iran-corridor','central-europe'],['na-east','persian-gulf'],['russia-west','korea-japan'],
  ['siberian-corridor','western-pacific'],['china-coast','north-america'],['na-west','china-coast'],['na-east','russia-west'],
  ['russia-west','north-atlantic'],['na-west','pacific-routes']
];
