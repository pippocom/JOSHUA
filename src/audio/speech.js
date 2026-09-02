// Copyright (C) 2025-2026 Marco Iannacone
// SPDX-License-Identifier: AGPL-3.0-only
/**
 * JoshuaSpeech — minimal text-to-speech coordinator for the terminal typewriter effect.
 *
 * Responsibility: synchronize a progressive "typewriter" text reveal with
 * Web Speech API narration, when available. Nothing else (no Web Audio, no
 * sound effects, no UI). Works as a plain <script> global (window.JoshuaSpeech)
 * and as a CommonJS module for tests.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.JoshuaSpeech = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var LANG_MAP = { en: 'en-US', it: 'it-IT' };

  function sleep(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  function normalizeLang(lang) {
    if (!lang) return undefined;
    if (lang.length === 2) return LANG_MAP[lang.toLowerCase()] || lang;
    return lang;
  }

  function getSynth() {
    try {
      return (typeof window !== 'undefined' && window.speechSynthesis) || null;
    } catch (err) {
      return null;
    }
  }

  function getUtteranceCtor() {
    try {
      return typeof SpeechSynthesisUtterance !== 'undefined' ? SpeechSynthesisUtterance : null;
    } catch (err) {
      return null;
    }
  }

  // Voice lists load asynchronously in several browsers. Wait briefly for
  // `voiceschanged`, but never block the sequence on it.
  function loadVoices(timeoutMs) {
    var synth = getSynth();
    if (!synth) return Promise.resolve([]);

    return new Promise(function (resolve) {
      var settled = false;
      function finish(voices) {
        if (settled) return;
        settled = true;
        resolve(voices || []);
      }

      var existing;
      try {
        existing = synth.getVoices();
      } catch (err) {
        finish([]);
        return;
      }
      if (existing && existing.length) {
        finish(existing);
        return;
      }

      function onVoicesChanged() {
        var voices;
        try { voices = synth.getVoices(); } catch (err) { voices = []; }
        finish(voices);
      }

      try {
        synth.addEventListener('voiceschanged', onVoicesChanged, { once: true });
      } catch (err) {
        try { synth.onvoiceschanged = onVoicesChanged; } catch (err2) { /* no-op */ }
      }

      setTimeout(function () {
        var voices;
        try { voices = synth.getVoices(); } catch (err) { voices = []; }
        finish(voices);
      }, timeoutMs);
    });
  }

  // Preferred voice *names* per language (Alice = it-IT, Daniel = en-GB, but
  // the preference applies to any en-* request). Matched case-insensitively
  // against voice.name, never hardcoding a full voice object or assuming
  // these exist — always just the first, cheapest choice in a fallback chain
  // that ends in "let the browser decide".
  var PREFERRED_VOICE_NAME_BY_LANG = { it: 'alice', en: 'daniel' };

  // Voice selection, in order:
  //  1) a voice whose name matches the language's preferred name (Alice for
  //     it*, Daniel for en*), case-insensitive, restricted to a voice whose
  //     own lang actually matches the requested language;
  //  2) a voice with an exact locale match (e.g. requested "it-IT");
  //  3) a voice with the same base language (e.g. any "it-*");
  //  4) null — the browser's own default voice takes over; never blocks.
  function pickVoice(voices, lang) {
    if (!voices || !voices.length || !lang) return null;
    var wanted = lang.toLowerCase();
    var short = wanted.split('-')[0];
    var i;

    var preferredName = PREFERRED_VOICE_NAME_BY_LANG[short];
    if (preferredName) {
      for (i = 0; i < voices.length; i++) {
        var v = voices[i];
        if (v.name && v.lang && v.name.toLowerCase() === preferredName && v.lang.toLowerCase().indexOf(short) === 0) return v;
      }
    }

    for (i = 0; i < voices.length; i++) {
      if (voices[i].lang && voices[i].lang.toLowerCase() === wanted) return voices[i];
    }
    for (i = 0; i < voices.length; i++) {
      if (voices[i].lang && voices[i].lang.toLowerCase().indexOf(short) === 0) return voices[i];
    }
    return null;
  }

  var activeCancel = null;

  /**
   * Speak `text` if the Web Speech API is available and usable.
   * Always resolves — never rejects, never hangs indefinitely (safety timeout).
   *
   * `opts.speechStartDelayMs` delays only the actual `synth.speak()` call
   * (default 0 = immediate, unchanged behavior). It never delays the
   * typewriter reveal, which runs independently in `typeSpeak()`. The delay
   * is itself cancellable: `cancelSpeech()` can abort it before it fires.
   *
   * `opts.muted` (default false) skips speech entirely — typing still runs
   * normally. This is the coordination point a session-level mute control
   * (see audioManager.js) uses to silence future narration; speech.js still
   * has no idea Web Audio exists, and vice versa.
   *
   * `opts.spokenText`, if given, is what's actually sent to
   * SpeechSynthesisUtterance instead of `text` — the display text (kept in
   * retro uppercase) and the spoken text (normal sentence case, because some
   * voices misread all-caps sentences) are deliberately separate. `text` is
   * still used to size the default speechTimeoutMs when spokenText is absent.
   *
   * `opts.voice`, if given, is used directly instead of the automatic
   * lang-based pickVoice() selection — this is how a caller (e.g. the
   * media-lab audition page) can let a user pick any installed voice
   * explicitly. Normal runtime code should not set this.
   */
  function speak(text, opts) {
    opts = opts || {};
    var synth = getSynth();
    var Utterance = getUtteranceCtor();
    var spokenText = String((opts.spokenText != null ? opts.spokenText : text) || '').replace(/\s+/g, ' ').trim();

    if (!synth || !Utterance || !spokenText || opts.muted) {
      return Promise.resolve();
    }

    var timeoutMs = opts.speechTimeoutMs || Math.min(20000, Math.max(4000, spokenText.length * 90));
    var startDelayMs = (typeof opts.speechStartDelayMs === 'number' && isFinite(opts.speechStartDelayMs) && opts.speechStartDelayMs > 0)
      ? opts.speechStartDelayMs
      : 0;

    return loadVoices(300).then(function (voices) {
      return new Promise(function (resolve) {
        var settled = false;
        var safety = null;
        var delayTimer = null;

        function finish() {
          if (settled) return;
          settled = true;
          if (safety) clearTimeout(safety);
          if (delayTimer) { clearTimeout(delayTimer); delayTimer = null; }
          if (activeCancel === cancelPending || activeCancel === cancelSpeaking) activeCancel = null;
          resolve();
        }

        // Cancels the scheduled-but-not-yet-started speak() call.
        function cancelPending() {
          finish();
        }

        // Cancels an already-started utterance.
        function cancelSpeaking() {
          try { synth.cancel(); } catch (err) { /* no-op */ }
          finish();
        }

        function startSpeaking() {
          delayTimer = null;

          var utterance;
          try {
            utterance = new Utterance(spokenText);
          } catch (err) {
            finish();
            return;
          }

          var lang = normalizeLang(opts.lang);
          var voice = opts.voice || pickVoice(voices, lang);
          if (voice) utterance.voice = voice;
          if (lang) utterance.lang = lang;
          if (typeof opts.rate === 'number') utterance.rate = opts.rate;
          if (typeof opts.pitch === 'number') utterance.pitch = opts.pitch;
          if (typeof opts.volume === 'number') utterance.volume = opts.volume;

          utterance.onend = finish;
          utterance.onerror = finish;

          activeCancel = cancelSpeaking;
          safety = setTimeout(finish, timeoutMs);

          try {
            synth.speak(utterance);
          } catch (err) {
            finish();
          }
        }

        if (startDelayMs > 0) {
          activeCancel = cancelPending;
          delayTimer = setTimeout(startSpeaking, startDelayMs);
        } else {
          startSpeaking();
        }
      });
    }).catch(function () { /* never propagate — speech is best-effort */ });
  }

  // Reveals `text` one character at a time inside `target.textContent`.
  // `append` (default false) preserves any existing content instead of
  // clearing it first — used to compose two independently-timed typeSpeak()
  // calls into what still reads as a single continuous typed block.
  function typeText(target, text, delay, append) {
    var str = String(text == null ? '' : text);
    if (!target) return sleep(str.length * delay);
    if (!append) target.textContent = '';
    var i = 0;
    return new Promise(function (resolve) {
      (function step() {
        if (i >= str.length) { resolve(); return; }
        target.textContent += str[i];
        i++;
        setTimeout(step, delay);
      })();
    });
  }

  /**
   * Type `text` into `target` and speak it (best-effort), resolving only
   * once both the typewriter reveal and the narration (if any) are done.
   *
   * @param {string} text
   * @param {Element|{textContent:string}} target
   * @param {number} [typingDelay=60] ms per character
   * @param {{lang?:string, rate?:number, pitch?:number, volume?:number, speechTimeoutMs?:number, speechStartDelayMs?:number, append?:boolean, spokenText?:string, voice?:SpeechSynthesisVoice}} [options]
   * @returns {Promise<void>}
   */
  function typeSpeak(text, target, typingDelay, options) {
    var delay = typeof typingDelay === 'number' ? typingDelay : 60;
    var opts = options || {};
    var typing = typeText(target, text, delay, !!opts.append);
    var speaking = speak(text, opts);
    return Promise.all([typing, speaking]).then(function () { return undefined; });
  }

  // Stops any in-progress narration (e.g. sequence aborted or restarted).
  // Safe to call even if nothing is speaking or the API is unavailable.
  function cancelSpeech() {
    var synth = getSynth();
    if (synth) {
      try { synth.cancel(); } catch (err) { /* no-op */ }
    }
    if (activeCancel) {
      var cancel = activeCancel;
      activeCancel = null;
      cancel();
    }
  }

  return {
    typeSpeak: typeSpeak,
    cancelSpeech: cancelSpeech,
    _internal: { pickVoice: pickVoice, loadVoices: loadVoices, normalizeLang: normalizeLang }
  };
});
