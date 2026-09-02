// Copyright (C) 2025-2026 Marco Iannacone
// SPDX-License-Identifier: AGPL-3.0-only
(function () {
  'use strict';

  // Development-only audition logic. Reuses JoshuaAudioManager (Web Audio)
  // and JoshuaSpeech (Web Speech) as-is — no DSP or TTS coordination logic
  // is duplicated here. Nothing here is persisted or wired into the app.

  var PHRASES = {
    en: {
      boot: { display: 'SHALL WE PLAY A GAME?', spoken: 'Shall we play a game?' },
      chess: { display: 'HOW ABOUT A NICE GAME OF CHESS?', spoken: 'How about a nice game of chess?' }
    },
    it: {
      boot: { display: 'VOGLIAMO FARE UNA PARTITA?', spoken: 'Vogliamo fare una partita?' },
      chess: { display: 'CHE NE PENSI DI UNA BELLA PARTITA A SCACCHI?', spoken: 'Che ne pensi di una bella partita a scacchi?' }
    }
  };

  function applyVariant(spokenBase, variant) {
    var stripped = spokenBase.replace(/[?…]+$/, '');
    if (variant === 'double') return stripped + '??';
    if (variant === 'ellipsis') return stripped + '…?';
    return stripped + '?'; // single, default
  }

  function selectedVariant() {
    var checked = document.querySelector('input[name="variant"]:checked');
    return checked ? checked.value : 'single';
  }

  function currentPhrase() {
    var lang = document.getElementById('langSelect').value;
    var key = document.getElementById('phraseSelect').value;
    return PHRASES[lang][key];
  }

  // ---- Audio section ----

  var statusEl = document.getElementById('status');
  var muted = false;

  function refreshStatus() {
    var s = window.JoshuaAudioManager.getDebugState();
    statusEl.textContent =
      'AudioContext: ' + (s.hasContext ? (s.state + ' (confirmedRunning=' + s.confirmedRunning + ')') : 'not created') +
      ' | muted=' + s.muted + ' | volume=' + s.volume;
  }
  setInterval(refreshStatus, 300);
  refreshStatus();

  document.getElementById('enableAudioButton').addEventListener('click', function () {
    // Unlock happens synchronously here, before any await/Promise boundary.
    window.JoshuaAudioManager.unlockFromGesture();
    refreshStatus();
  });

  document.getElementById('playBootButton').addEventListener('click', function () {
    window.JoshuaAudioManager.ensureRunningFromGesture();
    refreshStatus();
    window.JoshuaAudioManager.playBootNoise().then(refreshStatus);
  });

  document.getElementById('playCrashButton').addEventListener('click', function () {
    window.JoshuaAudioManager.ensureRunningFromGesture();
    refreshStatus();
    window.JoshuaAudioManager.playTicTacToeCrash().then(refreshStatus);
  });

  document.getElementById('playXMarkButton').addEventListener('click', function () {
    window.JoshuaAudioManager.ensureRunningFromGesture();
    window.JoshuaAudioManager.playTicTacToeMark('X').then(refreshStatus);
  });

  document.getElementById('playOMarkButton').addEventListener('click', function () {
    window.JoshuaAudioManager.ensureRunningFromGesture();
    window.JoshuaAudioManager.playTicTacToeMark('O').then(refreshStatus);
  });

  document.getElementById('stopAudioButton').addEventListener('click', function () {
    stopDemoEscalation();
    window.JoshuaAudioManager.stopEffects();
    refreshStatus();
  });

  document.getElementById('muteAudioButton').addEventListener('click', function (e) {
    muted = !muted;
    window.JoshuaAudioManager.setMuted(muted);
    e.target.textContent = muted ? 'UNMUTE' : 'MUTE';
    e.target.setAttribute('aria-pressed', String(muted));
    stopDemoEscalation();
    refreshStatus();
  });

  // ---- War soundscape section ----
  // Every button below calls window.JoshuaAudioManager directly — the exact
  // same functions and DSP the GLOBAL THERMONUCLEAR WAR simulation uses.
  // Nothing here reimplements the sound design.

  var warStatusEl = document.getElementById('warSoundscapeStatus');
  var demoTimers = [];

  function refreshWarStatus() {
    var s = window.JoshuaAudioManager.getWarSoundscapeDebugState();
    warStatusEl.textContent = s.running
      ? ('running | intensity=' + s.intensity.toFixed(2) + ' | voices=' + s.activeVoices + '/' + s.maxVoices)
      : 'not running';
  }
  setInterval(refreshWarStatus, 200);
  refreshWarStatus();

  function stopDemoEscalation() {
    demoTimers.forEach(function (t) { clearTimeout(t); });
    demoTimers = [];
  }

  document.getElementById('startWarSoundscapeButton').addEventListener('click', function () {
    window.JoshuaAudioManager.ensureRunningFromGesture();
    window.JoshuaAudioManager.startWarSoundscape();
    document.getElementById('warIntensitySlider').value = 0;
    document.getElementById('warIntensityValue').textContent = '0%';
    refreshStatus();
    refreshWarStatus();
  });

  document.getElementById('stopWarSoundscapeButton').addEventListener('click', function () {
    stopDemoEscalation();
    window.JoshuaAudioManager.stopWarSoundscape();
    refreshWarStatus();
  });

  document.getElementById('warIntensitySlider').addEventListener('input', function (e) {
    var pct = Number(e.target.value) || 0;
    document.getElementById('warIntensityValue').textContent = pct + '%';
    window.JoshuaAudioManager.setWarIntensity(pct / 100);
  });

  document.getElementById('playMissileLaunchButton').addEventListener('click', function () {
    window.JoshuaAudioManager.ensureRunningFromGesture();
    window.JoshuaAudioManager.playMissileLaunch();
  });
  document.getElementById('playMissileFlightButton').addEventListener('click', function () {
    window.JoshuaAudioManager.ensureRunningFromGesture();
    window.JoshuaAudioManager.playMissileFlight();
  });
  document.getElementById('playNormalImpactButton').addEventListener('click', function () {
    window.JoshuaAudioManager.ensureRunningFromGesture();
    window.JoshuaAudioManager.playWarImpact({ big: false });
  });
  document.getElementById('playLargeImpactButton').addEventListener('click', function () {
    window.JoshuaAudioManager.ensureRunningFromGesture();
    window.JoshuaAudioManager.playWarImpact({ big: true });
  });
  document.getElementById('playFireBurstButton').addEventListener('click', function () {
    window.JoshuaAudioManager.ensureRunningFromGesture();
    // force:true — a manual audition trigger should always be audible,
    // regardless of the current intensity-gated probability the real
    // in-game hook respects (see warSoundscape.js's playAutomaticFireBurst).
    window.JoshuaAudioManager.playAutomaticFireBurst({ force: true });
  });

  // Short, self-stopping escalation demo: ramps intensity 0 -> 1 over a few
  // seconds while sampling launches/impacts/bursts, then stops itself. Only
  // for auditioning the intensity curve; not a substitute for playing the
  // real simulation. Always interruptible via STOP WAR SOUNDSCAPE or MUTE.
  document.getElementById('demoEscalationButton').addEventListener('click', function () {
    window.JoshuaAudioManager.ensureRunningFromGesture();
    stopDemoEscalation();
    window.JoshuaAudioManager.startWarSoundscape();
    var steps = [0, 0.2, 0.4, 0.6, 0.8, 1];
    steps.forEach(function (level, i) {
      demoTimers.push(setTimeout(function () {
        document.getElementById('warIntensitySlider').value = Math.round(level * 100);
        document.getElementById('warIntensityValue').textContent = Math.round(level * 100) + '%';
        window.JoshuaAudioManager.setWarIntensity(level);
        window.JoshuaAudioManager.playMissileLaunch();
        window.JoshuaAudioManager.playWarImpact({ big: i === steps.length - 1 });
        window.JoshuaAudioManager.playAutomaticFireBurst({ force: i >= 3 });
      }, i * 1000));
    });
    demoTimers.push(setTimeout(function () {
      window.JoshuaAudioManager.stopWarSoundscape();
    }, steps.length * 1000 + 400));
  });

  // ---- TTS section ----

  var voiceSelect = document.getElementById('voiceSelect');
  var voiceFallbackNote = document.getElementById('voiceFallbackNote');
  var typedOutput = document.getElementById('typedOutput');
  var spokenTextDisplay = document.getElementById('spokenTextDisplay');

  // Preferred voice names: Alice for Italian, Daniel for English. Only used
  // here to label which voice got preselected and why — the actual selection
  // algorithm (with its full fallback chain)
  // lives once, in speech.js's pickVoice(), and is reused via _internal
  // rather than reimplemented here.
  var PREFERRED_NAME_BY_LANG = { it: 'alice', en: 'daniel' };

  function populateVoices() {
    var synth = window.speechSynthesis;
    if (!synth) return;
    var voices = synth.getVoices() || [];
    var previousValue = voiceSelect.value;
    // Keep the "(auto)" option, replace the rest.
    while (voiceSelect.options.length > 1) voiceSelect.remove(1);
    voices.forEach(function (v, i) {
      var opt = document.createElement('option');
      opt.value = String(i);
      opt.textContent = v.name + ' (' + v.lang + ')';
      voiceSelect.appendChild(opt);
    });
    voiceSelect._voices = voices;
    if (previousValue && Number(previousValue) < voices.length) {
      voiceSelect.value = previousValue;
    } else {
      autoSelectPreferredVoice();
    }
  }
  if (window.speechSynthesis) {
    populateVoices();
    try { window.speechSynthesis.addEventListener('voiceschanged', populateVoices); }
    catch (err) { window.speechSynthesis.onvoiceschanged = populateVoices; }
  }

  // Preselects Alice (it*) / Daniel (en*) using the exact same pickVoice()
  // used by the app at runtime (via JoshuaSpeech._internal) — no duplicated
  // selection logic. Shows which voice actually got picked when the
  // preferred name isn't installed.
  function autoSelectPreferredVoice() {
    var voices = voiceSelect._voices || [];
    var lang = document.getElementById('langSelect').value;
    if (!voices.length) {
      voiceFallbackNote.textContent = 'No voices available yet — browser default will be used.';
      return;
    }
    var normalizedLang = window.JoshuaSpeech._internal.normalizeLang(lang);
    var picked = window.JoshuaSpeech._internal.pickVoice(voices, normalizedLang);
    if (!picked) {
      voiceSelect.value = '';
      voiceFallbackNote.textContent = 'No compatible voice found for "' + normalizedLang + '" — browser default will be used.';
      return;
    }
    var idx = voices.indexOf(picked);
    voiceSelect.value = String(idx);
    var preferredName = PREFERRED_NAME_BY_LANG[lang.split('-')[0]];
    var gotPreferred = preferredName && picked.name && picked.name.toLowerCase() === preferredName;
    voiceFallbackNote.textContent = gotPreferred
      ? 'Preferred voice selected: ' + picked.name + ' (' + picked.lang + ').'
      : 'Preferred voice ("' + (preferredName || '?') + '") not installed — fallback selected: ' + picked.name + ' (' + picked.lang + ').';
  }

  function updatePreview() {
    var phrase = currentPhrase();
    var variant = selectedVariant();
    typedOutput.textContent = phrase.display;
    spokenTextDisplay.textContent = applyVariant(phrase.spoken, variant);
  }
  document.getElementById('langSelect').addEventListener('change', function () {
    updatePreview();
    autoSelectPreferredVoice();
  });
  document.getElementById('phraseSelect').addEventListener('change', updatePreview);
  Array.prototype.forEach.call(document.querySelectorAll('input[name="variant"]'), function (el) {
    el.addEventListener('change', updatePreview);
  });
  updatePreview();

  document.getElementById('speakButton').addEventListener('click', function () {
    var lang = document.getElementById('langSelect').value;
    var phrase = currentPhrase();
    var spokenText = applyVariant(phrase.spoken, selectedVariant());
    var voiceIdx = voiceSelect.value;
    var voice = (voiceIdx !== '' && voiceSelect._voices) ? voiceSelect._voices[Number(voiceIdx)] : undefined;

    typedOutput.textContent = '';
    spokenTextDisplay.textContent = spokenText;

    window.JoshuaSpeech.typeSpeak(phrase.display, typedOutput, 30, {
      lang: lang,
      spokenText: spokenText,
      voice: voice,
      rate: 0.85,
      pitch: 0.45
    });
  });

  document.getElementById('stopSpeechButton').addEventListener('click', function () {
    window.JoshuaSpeech.cancelSpeech();
  });
})();
