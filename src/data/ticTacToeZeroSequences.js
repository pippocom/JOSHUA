// Copyright (C) 2025-2026 Marco Iannacone
// SPDX-License-Identifier: AGPL-3.0-only
// Precomputed TIC-TAC-TOE move sequences for ZERO-player mode (see
// startZeroPlayerMode() in game.js). Each entry is one full game: 9 cell
// indices (0-8, left-to-right/top-to-bottom on the 3x3 board), played
// alternately as X (even steps) then O (odd steps). All ten sequences were
// hand-picked so the game always plays out to a draw — the point of ZERO
// mode is to show the system reaching the "no winning move" conclusion
// against itself, not to show either side winning.
window.JOSHUA_ZERO_SEQUENCES = [
  [8,5,3,4,1,0,7,6,2], [5,1,0,6,7,4,2,8,3], [8,2,1,4,0,7,6,3,5],
  [1,7,8,2,4,0,6,5,3], [5,8,0,4,6,1,2,3,7], [8,7,3,5,6,0,2,4,1],
  [1,4,7,8,0,3,5,2,6], [8,6,3,5,2,7,1,0,4], [8,7,6,2,3,4,5,0,1],
  [8,7,6,3,1,2,0,4,5]
];
