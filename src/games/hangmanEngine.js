// Copyright (C) 2025-2026 Marco Iannacone
// SPDX-License-Identifier: AGPL-3.0-only
/**
 * JoshuaHangmanEngine — pure hangman state/rules. No DOM, no language, no
 * audio, no rendering, and no knowledge of the EN/IT word lists — game.js
 * owns picking the word (from the content module) and everything about how
 * the state is shown to the player.
 *
 * Immutable: every state-changing function returns a NEW state object and
 * never mutates the one it was given.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.JoshuaHangmanEngine = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Six wrong guesses lose the game.
  var MAX_WRONG_GUESSES = 6;

  function createState(word) {
    return {
      word: String(word || '').toUpperCase(),
      guesses: [],
      wrongCount: 0
    };
  }

  // Takes the first A-Z character found anywhere in the (case-insensitive)
  // input, ignoring any other characters in a multi-character input. Returns
  // null for input with no letter at all (e.g. a digit, punctuation, or an
  // empty string).
  function normalizeLetter(input) {
    var match = String(input == null ? '' : input).toUpperCase().match(/[A-Z]/);
    return match ? match[0] : null;
  }

  function hasGuessed(state, letter) {
    return state.guesses.indexOf(letter) !== -1;
  }

  // Returns a NEW state with the guess applied. Throws if the letter is
  // not a valid single A-Z character (callers must use normalizeLetter()
  // first) or has already been guessed — callers that need to distinguish
  // "rejected" from "applied" should check normalizeLetter()/hasGuessed()
  // themselves before calling this, exactly as game.js's handleHang() does.
  function applyGuess(state, letter) {
    if (!/^[A-Z]$/.test(letter)) {
      throw new Error('invalid hangman guess: ' + letter);
    }
    if (hasGuessed(state, letter)) {
      throw new Error('letter already guessed: ' + letter);
    }
    var guesses = state.guesses.concat([letter]);
    var wrongCount = state.word.indexOf(letter) === -1 ? state.wrongCount + 1 : state.wrongCount;
    return { word: state.word, guesses: guesses, wrongCount: wrongCount };
  }

  // Letters of the word not yet correctly guessed (order of first
  // appearance in the word, de-duplicated).
  function missingLetters(state) {
    var seen = {};
    var missing = [];
    for (var i = 0; i < state.word.length; i++) {
      var ch = state.word[i];
      if (!seen[ch] && !hasGuessed(state, ch)) {
        seen[ch] = true;
        missing.push(ch);
      }
    }
    return missing;
  }

  function remainingAttempts(state) {
    return Math.max(0, MAX_WRONG_GUESSES - state.wrongCount);
  }

  function isWon(state) {
    return missingLetters(state).length === 0;
  }

  function isLost(state) {
    return state.wrongCount >= MAX_WRONG_GUESSES;
  }

  function isOver(state) {
    return isWon(state) || isLost(state);
  }

  // Logical representation of the revealed word: one entry per letter of
  // the word, either the letter itself (already guessed) or null
  // (still hidden). Rendering the placeholder character (e.g. "_") is
  // game.js's concern.
  function revealedWord(state) {
    return state.word.split('').map(function (ch) {
      return hasGuessed(state, ch) ? ch : null;
    });
  }

  return {
    MAX_WRONG_GUESSES: MAX_WRONG_GUESSES,
    createState: createState,
    normalizeLetter: normalizeLetter,
    hasGuessed: hasGuessed,
    applyGuess: applyGuess,
    missingLetters: missingLetters,
    remainingAttempts: remainingAttempts,
    isWon: isWon,
    isLost: isLost,
    isOver: isOver,
    revealedWord: revealedWord
  };
});
