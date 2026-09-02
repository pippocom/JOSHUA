// Copyright (C) 2025-2026 Marco Iannacone
// SPDX-License-Identifier: AGPL-3.0-only
(function(){
  // Optional deployment configuration injected at build time by tools/build.js
  // (the pippo.com builds ship a buildConfig.js that sets window.JOSHUA_BUILD;
  // the standalone build ships none). When absent, every default below keeps
  // the current standalone behavior: English unless ?lang=it, same-document
  // language switch, and a same-document return to the splash.
  const BUILD = window.JOSHUA_BUILD || {};
  const params = new URLSearchParams(location.search);
  const qLang = params.get('lang');
  const lang = qLang === 'it' ? 'it' : qLang === 'en' ? 'en' : (BUILD.lang || 'en');
  // Opt-in developer acceleration for manual QA of long sequences (e.g. the
  // three-scenario GLOBAL THERMONUCLEAR WAR run). Off by default: normal
  // play timing is unaffected unless ?fast=1 is explicitly present in the URL.
  // Only affects the app's own pause timings (see `sleep` below) — never the
  // per-character typing delay or TTS rate, so voice and text stay in sync.
  const fastDev = params.get('fast') === '1';
  // Single speed factor for every typed+spoken presentation (boot greeting/
  // play-prompt, final "STRANGE GAME"/chess messages). Defaults to 0.5 (half
  // speed); override for comparison with e.g. ?presentationSpeed=0.75. Never
  // affects simulation/game-rule timing.
  const presentationSpeed = JoshuaPresentation.resolveSpeed(params.get('presentationSpeed'));
  const C = lang === 'it' ? window.JOSHUA_CONTENT_IT : window.JOSHUA_CONTENT_EN;
  const nodeList = window.JOSHUA_NODES.nodes;
  const nodeById = Object.fromEntries(nodeList.map(n => [n.id, n]));
  const scenarios = window.JOSHUA_SCENARIOS.scenarios;
  const factions = window.JOSHUA_SCENARIOS.factions;

  // Standalone-shell strings: the splash/credits copy and the standalone
  // return label. Kept separate from data/content.*.js because these describe
  // the standalone shell (splash, credits, return-to-terminal) rather than
  // shared game content.
  const SPLASH_TEXT = {
    en: {
      lead: 'A retro terminal experiment about games, strategy and the uncomfortable moment when computation discovers that some problems should not be optimized.',
      para1: 'Tic-tac-toe matters. It is the small game that teaches the machine the larger lesson: when rational players exhaust the possible moves, some games have no winning strategy.',
      para2: 'No operational realism. No real military targeting. No fantasy of victory.',
      boot: 'BOOT JOSHUA TERMINAL',
      credit: 'ORIGINAL GAME DEVELOPED BY MARCO IANNACONE. INSPIRED BY THE WOPR COMPUTER IN THE FILM WARGAMES (1983).',
      langSwitchLabel: 'IT',
      returnLabel: 'RETURN TO JOSHUA TERMINAL'
    },
    it: {
      lead: 'Un esperimento retro-terminal su giochi, strategia e quel momento scomodo in cui il calcolo scopre che alcuni problemi non dovrebbero essere ottimizzati.',
      para1: 'Il tris conta. È il piccolo gioco che insegna alla macchina la lezione più grande: quando giocatori razionali esauriscono tutte le mosse possibili, alcuni giochi non hanno una strategia vincente.',
      para2: 'Nessun realismo operativo. Nessun targeting militare reale. Nessuna fantasia di vittoria.',
      boot: 'AVVIA JOSHUA TERMINAL',
      credit: 'GIOCO ORIGINALE SVILUPPATO DA MARCO IANNACONE. ISPIRATO AL COMPUTER WOPR DEL FILM WARGAMES (1983).',
      langSwitchLabel: 'EN',
      returnLabel: 'TORNA A JOSHUA TERMINAL'
    }
  };

  const splashScreen = document.getElementById('splashScreen');
  const langSwitchLink = document.getElementById('langSwitchLink');
  const splashLead = document.getElementById('splashLead');
  const splashPara1 = document.getElementById('splashPara1');
  const splashPara2 = document.getElementById('splashPara2');
  const bootButton = document.getElementById('bootButton');
  const splashCredit = document.getElementById('splashCredit');
  const splashVersion = document.getElementById('splashVersion');
  const crtRoot = document.getElementById('crt');
  const muteButton = document.getElementById('muteButton');

  const terminalPanel = document.getElementById('terminalPanel');
  const terminalOutput = document.getElementById('terminalOutput');
  const commandForm = document.getElementById('commandForm');
  const commandInput = document.getElementById('commandInput');
  const warRoom = document.getElementById('warRoom');
  const warSubtitle = document.getElementById('warSubtitle');
  const statusData = document.getElementById('statusData');
  const eventLog = document.getElementById('eventLog');
  const overlay = document.getElementById('warOverlay');
  const mapViewport = document.getElementById('mapViewport');
  const reportPanel = document.getElementById('reportPanel');
  const abortWar = document.getElementById('abortWar');
  const finalScreen = document.getElementById('finalScreen');
  const finalText = document.getElementById('finalText');
  const returnConsole = document.getElementById('returnConsole');
  const ticScreen = document.getElementById('ticScreen');
  const ticBoardEl = document.getElementById('ticBoard');
  const ticInstruction = document.getElementById('ticInstruction');
  const ticStatus = document.getElementById('ticStatus');
  const ticOverlay = document.getElementById('ticOverlay');
  const liveStatus = document.getElementById('liveStatus');

  // Writes a single, meaningful state transition into the visually-hidden
  // #liveStatus region (role="status"). This is the ONLY announcement channel:
  // the terminal output and war event log are NOT live regions, so a screen
  // reader is not flooded with every typed character, trajectory, or impact.
  // Callers pass a short localized message (e.g. the result of a completed
  // game); nothing is announced on rapid/decorative updates.
  function announce(text){
    if(!liveStatus) return;
    liveStatus.textContent = text;
  }

  // User-facing game and war strings live in data/content.*.js (C.tic.*,
  // C.war.*, C.sound.*) so EN/IT wording has a single source of truth.

  // Each of these is a global assigned by its own script, loaded before this
  // one — see index.html. Kept under the same local names so every downstream
  // reference below (SCENARIO_VIEWS.x, CITY_REGIONS.south, STRATEGY_PROFILES[id],
  // ...) is unchanged.
  const SCENARIO_VIEWS = window.JOSHUA_SCENARIO_VIEWS;
  const WORLD_VIEWS = window.JOSHUA_WORLD_VIEWS;
  const CITY_REGIONS = window.JOSHUA_CITY_REGIONS;
  const ZERO_SEQUENCES = window.JOSHUA_ZERO_SEQUENCES;
  const GLOBAL_WORLD_PAIRS = window.JOSHUA_GLOBAL_WORLD_PAIRS;
  const STRATEGY_PROFILES = window.JOSHUA_STRATEGY_PROFILES;
  const TicTacToeEngine = window.JoshuaTicTacToeEngine;
  const HangmanEngine = window.JoshuaHangmanEngine;
  const SudokuEngine = window.JoshuaSudokuEngine;
  const WarModel = window.JoshuaWarModel;
  const WarMap = window.JoshuaWarMap;
  const warMap = WarMap.createWarMap({
    document,
    overlay,
    viewport: mapViewport,
    nodesById: nodeById,
    setTimeout,
    onLaunch: () => JoshuaAudioManager.playMissileLaunch(),
    onImpact: payload => {
      JoshuaAudioManager.playWarImpact(payload);
      JoshuaAudioManager.playAutomaticFireBurst();
    }
  });


  let mode = 'menu';
  let pendingAsk = false;
  let pendingGame = null;
  let currentFaction = null;
  let currentScenarioOptions = [];
  let warRuns = 0;
  let ticLearned = false;
  let ticBoard = null;
  let ticPhase = 'idle';
  let ticBuffer = '';
  let ticBufferTimer = null;
  let zeroPlayersAnswerPending = false;
  let hangState = null;
  let sudokuState = null;
  let currentWarStats = null;
  let activeWarRun = null;
  let isMuted = false;

  // Wraps JoshuaSpeech so a session-level mute also silences future TTS
  // (not just Web Audio effects), without speech.js and audioManager.js
  // needing to know about each other. `muted` is read fresh on every call.
  const speech = {
    typeSpeak(text, target, delay, opts) {
      return JoshuaSpeech.typeSpeak(text, target, delay, Object.assign({}, opts, { muted: isMuted }));
    },
    cancelSpeech() { return JoshuaSpeech.cancelSpeech(); }
  };

  function buildLangHref(targetLang) {
    // A pippo.com deployment has a fixed cross-path language target (the other
    // language's own tree); the standalone build switches in-document via ?lang.
    if (BUILD.langHref) return BUILD.langHref;
    const p = new URLSearchParams(location.search);
    p.set('lang', targetLang);
    return location.pathname + '?' + p.toString();
  }

  function initSplash() {
    const other = lang === 'it' ? 'en' : 'it';
    const t = SPLASH_TEXT[lang];
    langSwitchLink.href = buildLangHref(other);
    langSwitchLink.hreflang = other;
    langSwitchLink.textContent = t.langSwitchLabel;
    splashLead.textContent = t.lead;
    splashPara1.textContent = t.para1;
    splashPara2.textContent = t.para2;
    bootButton.textContent = t.boot;
    splashCredit.textContent = t.credit;
    splashVersion.textContent = window.JoshuaVersion.displayVersion;
    returnConsole.textContent = BUILD.returnLabel || t.returnLabel;
    commandInput.setAttribute('aria-label', C.terminal.inputLabel);
    document.documentElement.lang = lang;
  }

  function focusBootButton() { setTimeout(() => bootButton.focus(), 40); }

  // Everything that must happen synchronously, inside the click, before any
  // await/timeout/Promise boundary: unlock Web Audio, then reveal the game.
  // No navigation, no new document, no iframe/popup.
  function handleBootClick() {
    JoshuaAudioManager.unlockFromGesture();
    splashScreen.classList.add('hidden');
    crtRoot.classList.remove('hidden');
    boot();
  }
  bootButton.addEventListener('click', handleBootClick);

  function updateMuteButton() {
    muteButton.textContent = isMuted ? C.sound.soundOff : C.sound.soundOn;
    muteButton.setAttribute('aria-pressed', String(isMuted));
    muteButton.setAttribute('aria-label', (isMuted ? C.sound.unmute : C.sound.mute));
  }
  function toggleMute() {
    isMuted = !isMuted;
    JoshuaAudioManager.setMuted(isMuted);
    JoshuaSpeech.cancelSpeech();
    updateMuteButton();
  }
  muteButton.addEventListener('click', toggleMute);
  updateMuteButton();

  // Returns to the splash/credits screen in the same document: stops all
  // audio and TTS, resets the state a fresh BOOT needs, hides the game. In a
  // pippo.com deployment this instead navigates to the configured home path.
  function returnToSplash() {
    if (BUILD.returnHref) { location.href = BUILD.returnHref; return; }
    cancelWarRun();
    JoshuaAudioManager.stopEffects();
    JoshuaSpeech.cancelSpeech();
    mode = 'menu'; pendingAsk = false; pendingGame = null; currentFaction = null; currentScenarioOptions = [];
    warRuns = 0; ticLearned = false; ticBoard = null; ticPhase = 'idle'; ticBuffer = ''; zeroPlayersAnswerPending = false;
    hangState = null; sudokuState = null; currentWarStats = null;
    clearTimeout(ticBufferTimer);
    clear();
    eventLog.innerHTML = '';
    reportPanel.classList.add('hidden'); reportPanel.innerHTML = '';
    finalText.textContent = '';
    crtRoot.classList.add('hidden');
    splashScreen.classList.remove('hidden');
    focusBootButton();
  }
  returnConsole.addEventListener('click', returnToSplash);

  const sleep = ms => new Promise(r => setTimeout(r, fastDev ? Math.max(1, Math.round(ms / 20)) : ms));
  function line(text='', cls=''){
    const div=document.createElement('div'); div.className='terminal-line '+cls; div.textContent=text; terminalOutput.appendChild(div); terminalOutput.scrollTop=terminalOutput.scrollHeight;
  }
  // Appends an empty line and returns it, so a caller (e.g. speech.typeSpeak)
  // can reveal text into it progressively instead of setting it all at once.
  function newLine(cls=''){
    const div=document.createElement('div'); div.className='terminal-line '+cls; terminalOutput.appendChild(div); return div;
  }
  async function typeLines(lines, delay=26){
    for(const item of lines){
      const text=String(item||''); const div=document.createElement('div'); div.className='terminal-line'; terminalOutput.appendChild(div);
      for(let i=0;i<text.length;i++){ div.textContent += text[i]; await sleep(delay); }
      await sleep(110);
    }
  }
  function block(lines, cls=''){ (Array.isArray(lines)?lines:String(lines).split('\n')).forEach(t=>line(t,cls)); }
  function clear(){ terminalOutput.innerHTML=''; }
  function clearForTransition(){ terminalOutput.innerHTML=''; terminalOutput.scrollTop=0; }
  function focusCommand(){ setTimeout(()=>commandInput.focus(),40); }
  function showMenu(announcement){
    mode='menu';
    block(C.menu,'amber');
    focusCommand();
    // Announce the menu or, when a game just ended, its localized result.
    announce(announcement || C.menu[0]);
  }
  function showSection(name){ terminalPanel.classList.toggle('hidden',name!=='terminal'); ticScreen.classList.toggle('hidden',name!=='tic'); warRoom.classList.toggle('hidden',name!=='war'); finalScreen.classList.toggle('hidden',name!=='final'); }
  async function boot(){
    JoshuaAudioManager.stopEffects();
    clear(); showSection('terminal');
    const preludeDelay = JoshuaPresentation.scaleDelay(22, presentationSpeed);
    await JoshuaBootSequence.runBootMessages({
      typePrelude: () => typeLines(C.bootPrelude, preludeDelay),
      playBootNoise: () => JoshuaAudioManager.playBootNoise(),
      createGreetingTarget: () => { line(''); return newLine(); },
      createPlayPromptTarget: () => { line(''); return newLine(); },
      greetingText: C.greeting,
      playPromptText: C.playPrompt,
      playPromptSpokenText: C.playPromptSpoken,
      lang,
      speed: presentationSpeed,
      speech,
      sleep
    });
    line('');
    showMenu();
  }

  commandForm.addEventListener('submit', e=>{ e.preventDefault(); const raw=commandInput.value.trim(); if(!raw) return; commandInput.value=''; line('JOSHUA> '+raw,'cyan'); handle(raw.toUpperCase()); });
  abortWar.addEventListener('click',()=>{ cancelWarRun(); JoshuaAudioManager.stopWarSoundscape(); warRoom.classList.add('hidden'); terminalPanel.classList.remove('hidden'); showMenu(); });

  function addButtons(items, handler){ const wrap=document.createElement('div'); wrap.className='choice-grid'; items.forEach(it=>{ const b=document.createElement('button'); b.type='button'; b.className='choice-button'; b.textContent=it.label; b.addEventListener('click',()=>handler(it)); wrap.appendChild(b); }); terminalOutput.appendChild(wrap); }

  // Single source of truth for "which game does this string mean" — matched
  // by exact name after normalizing case/whitespace, never by substring
  // (substring matching would let e.g. "PLAY STATIC" or "PLAY WARSAW"
  // accidentally start a game because they merely contain "TIC" or "WAR").
  // Both the direct-name path ("TIC-TAC-TOE") and the PLAY-prefixed
  // path ("PLAY TIC-TAC-TOE") resolve through this same table.
  const GAME_ALIASES = {
    'TIC-TAC-TOE': ['TIC-TAC-TOE', 'TICTACTOE', 'TIC TAC TOE', 'TRIS'],
    'HANGMAN': ['HANGMAN', 'IMPICCATO'],
    'SUDOKU': ['SUDOKU'],
    // Intentional design choice (not an abbreviation or typo fix): only the
    // two complete titles are accepted, in either language, regardless of
    // which language is currently selected. No abbreviation
    // ("WAR"), partial form, or misspelling is recognized — matching how a
    // 1983-style terminal expects a precise, complete command rather than
    // guessing user intent. See PLAYING.md/PLAYING.it.md.
    'GLOBAL THERMONUCLEAR WAR': ['GLOBAL THERMONUCLEAR WAR', 'GUERRA TERMONUCLEARE TOTALE']
  };
  function normalizeGameName(name){ return String(name||'').toUpperCase().replace(/\s+/g,' ').trim(); }
  function resolveGameName(name){
    const normalized = normalizeGameName(name);
    for(const canonical in GAME_ALIASES){ if(GAME_ALIASES[canonical].includes(normalized)) return canonical; }
    return null;
  }

  function handle(cmd){
    if(pendingAsk){ pendingAsk=false; answerAsk(cmd); return; }
    if(pendingGame === 'hang'){ handleHang(cmd); return; }
    if(pendingGame === 'sudoku'){ handleSudoku(cmd); return; }
    if(mode === 'war-faction'){
      const num=parseInt(cmd,10); if(num>=1 && num<=factions.length){ selectFaction(factions[num-1]); return; }
      const found=factions.find(f=>f===cmd); if(found){ selectFaction(found); return; }
    }
    if(mode === 'war-scenario'){
      const num=parseInt(cmd,10); if(num>=1 && num<=currentScenarioOptions.length){ runScenario(currentScenarioOptions[num-1].id); return; }
      const found=currentScenarioOptions.find(s=>s.title===cmd || s.id.toUpperCase()===cmd); if(found){ runScenario(found.id); return; }
    }
    if(cmd==='CLEAR' || cmd==='PULISCI'){ clear(); return; }
    if(cmd==='EXIT' || cmd==='ESCI'){ returnToSplash(); return; }
    if(cmd==='HELP' || cmd==='AIUTO' || (cmd==='1' && mode==='menu')){ block(C.help,'amber'); return; }
    if(cmd==='GAMES' || cmd==='GIOCHI' || (cmd==='2' && mode==='menu')){ block(C.games,'amber'); return; }
    if(cmd==='ASK' || cmd==='ASK ME SOMETHING' || cmd==='CHIEDI' || (cmd==='3' && mode==='menu')){ pendingAsk=true; block(C.askPrompt,'amber'); return; }
    if(cmd.startsWith('PLAY ')){ startGame(cmd.replace(/^PLAY\s+/,'')); return; }
    const directGame = resolveGameName(cmd);
    if(directGame){ startGame(directGame, directGame === 'TIC-TAC-TOE'); return; }
    block(C.unknown,'red');
  }

  function startGame(name, hidden=false){
    const canonical = resolveGameName(name);
    if(canonical === 'TIC-TAC-TOE') return startTic(hidden);
    if(canonical === 'HANGMAN') return startHang();
    if(canonical === 'SUDOKU') return startSudoku();
    if(canonical === 'GLOBAL THERMONUCLEAR WAR') return startWarSelectFaction();
    block(C.unknown,'red');
  }

  // ASK responses are resolved by a fixed-priority chain, not "first match
  // wins" across all categories: a question that mentions several concepts
  // (e.g. "is war just a game?") must answer about war, because escalation is
  // the point of the whole exercise. Order matters — war > intelligent > win >
  // human > game > default. Do not reorder without updating the
  // characterization test (tests/browser/characterization.spec.js).
  function answerAsk(cmd){
    const s=cmd.toLowerCase(); let key='default';
    if(/war|guerra|nuclear/.test(s)) key='war';
    else if(/intelligen|intelligent|smart/.test(s)) key='intelligent';
    else if(/win|vinc|best|mossa/.test(s)) key='win';
    else if(/human|umani|esseri/.test(s)) key='human';
    else if(/game|gioco|play/.test(s)) key='game';
    block(C.askResponses[key],'white');
  }

  function renderTic(){ ticBoardEl.innerHTML=''; ticBoard.forEach(v=>{ const c=document.createElement('div'); c.className='tic-cell '+(v?'':'empty'); c.textContent=v || '·'; ticBoardEl.appendChild(c); }); }
  // Board rules, win/draw detection, and WOPR's move selection are pure
  // logic with no DOM/audio/language dependency (see src/games/ticTacToeEngine.js).
  // These two thin wrappers keep the rest of this file's call sites unchanged.
  function winner(b){ return TicTacToeEngine.winner(b); }
  function bestMove(board, player){ return TicTacToeEngine.bestMove(board, player); }

  function startTic(hidden=false){
    JoshuaAudioManager.stopEffects();
    pendingGame='tic'; ticPhase='player'; zeroPlayersAnswerPending=false;
    ticBoard=Array(9).fill(''); ticBuffer='';
    if(hidden) block(C.tic.hiddenFound,'white');
    ticInstruction.textContent=C.tic.localInstruction;
    ticStatus.textContent=C.tic.move;
    ticOverlay.textContent='';
    ticOverlay.classList.add('hidden');
    ticScreen.classList.remove('tic-overheat');
    renderTic();
    showSection('tic');
  }
  // Typing letters during tic-tac-toe feeds a short buffer so the player can
  // enter the hidden "ZERO" command; the buffer keeps only the last
  // TIC_ZERO_BUFFER_LENGTH letters and clears if the player pauses for
  // TIC_ZERO_BUFFER_TIMEOUT_MS.
  const TIC_ZERO_BUFFER_LENGTH = 4;
  const TIC_ZERO_BUFFER_TIMEOUT_MS = 850;
  function pushTicBuffer(ch){
    clearTimeout(ticBufferTimer);
    ticBuffer=(ticBuffer+ch).slice(-TIC_ZERO_BUFFER_LENGTH);
    ticBufferTimer=setTimeout(()=>ticBuffer='', TIC_ZERO_BUFFER_TIMEOUT_MS);
    if(ticBuffer==='ZERO'){ ticPhase='confirm-zero'; zeroPlayersAnswerPending=true; ticStatus.textContent=C.tic.zeroConfirm; }
  }
  async function endTic(resultType){
    ticStatus.textContent = '';
    ticOverlay.classList.remove('hidden');
    if(resultType==='X') ticOverlay.textContent = C.tic.humanWinOverlay;
    else if(resultType==='O') ticOverlay.textContent = C.tic.machineWinOverlay;
    else ticOverlay.textContent = C.tic.drawOverlay;
    await sleep(3200);
    ticOverlay.classList.add('hidden');
    showSection('terminal');
    clearForTransition();
    pendingGame=null; ticPhase='idle'; ticBuffer='';
    if(resultType==='X') block(C.tic.humanWin,'amber'); else if(resultType==='O') block(C.tic.machineWin,'amber'); else block(C.tic.draw,'amber');
    ticLearned=true;
    block(C.tic.analyze,'white');
    showMenu(resultType==='X' ? C.tic.humanWin : resultType==='O' ? C.tic.machineWin : C.tic.draw);
  }
  // The one place a mark is actually registered on the board — player
  // moves, WOPR's replies, and every move of the zero-player mode all go
  // through this, so it is also the one place the retro mark beep is
  // triggered. Never awaited by callers: the sound must not delay a move,
  // block rendering, or (via JoshuaAudioManager's own contract) ever throw.
  function placeTicTacToeMark(index, mark){ ticBoard[index]=mark; renderTic(); JoshuaAudioManager.playTicTacToeMark(mark); }

  async function handleTicMove(move){
    if(ticPhase!=='player') return;
    const i=move-1;
    if(ticBoard[i]){ ticStatus.textContent=C.tic.taken; return; }
    placeTicTacToeMark(i,'X');
    let w=winner(ticBoard);
    if(!w){ await sleep(260); const mv=bestMove(ticBoard,'O'); placeTicTacToeMark(mv,'O'); w=winner(ticBoard); }
    if(w){
      ticStatus.textContent = w==='D'?C.tic.drawLabel:(w==='O'?'JOSHUA':C.tic.humanLabel);
      await sleep(700);
      await endTic(w);
    } else {
      ticStatus.textContent=C.tic.move;
    }
  }

  function applyOpening(preset){ ticBoard=Array(9).fill(''); preset.forEach(({i,p})=>{ ticBoard[i]=p; }); }
  async function startZeroPlayerMode(){
    ticPhase='zero'; zeroPlayersAnswerPending=false; ticStatus.textContent=C.tic.zeroMode; ticInstruction.textContent=C.tic.zeroWatch;
    for(let round=1; round<=10; round++){
      const seq = ZERO_SEQUENCES[round-1] || ZERO_SEQUENCES[0];
      ticBoard=Array(9).fill(''); renderTic(); ticStatus.textContent = `${C.tic.zeroMode} · ${C.tic.zeroRound} ${round}/10`;
      await sleep(280);
      for(let step=0; step<seq.length; step++){
        const player = step % 2 === 0 ? 'X' : 'O';
        placeTicTacToeMark(seq[step], player);
        await sleep(Math.max(95, 310 - round*14));
      }
      ticStatus.textContent = `${C.tic.zeroMode} · ${C.tic.zeroRound} ${round}/10 · ${C.tic.drawLabel}`;
      await sleep(380);
    }
    ticLearned=true; await triggerTicOverheat();
  }
  async function triggerTicOverheat(){
    ticPhase='overheat'; ticScreen.classList.add('tic-overheat'); ticOverlay.classList.remove('hidden'); ticOverlay.textContent=C.tic.overload;
    // Crash sound starts together with the visual overload; the reboot (boot())
    // waits for both the existing visual timing AND the synthesized crash to
    // finish, so it never happens before the effect has completed. The 15s
    // visual sequence is already longer than the ~4.5s effect, so normal
    // pacing is unaffected. No reboot.mp3 — fully synthesized, no network.
    const crashSound = JoshuaAudioManager.playTicTacToeCrash();
    const visualTiming = (async () => { await sleep(3000); ticOverlay.textContent += `\n\n${C.tic.recovering}`; await sleep(12000); })();
    await Promise.all([visualTiming, crashSound]);
    ticOverlay.classList.add('hidden'); ticScreen.classList.remove('tic-overheat'); pendingGame=null; ticPhase='idle'; await boot();
  }

  document.addEventListener('keydown', async (e)=>{
    if(pendingGame!=='tic' || ticScreen.classList.contains('hidden')) return;
    const key=e.key.toUpperCase();
    if(ticPhase==='player'){
      if(/^[1-9]$/.test(key)){ e.preventDefault(); handleTicMove(parseInt(key,10)); return; }
      if(/^[A-Z]$/.test(key)){ e.preventDefault(); pushTicBuffer(key); return; }
      if(key==='0'){ e.preventDefault(); ticPhase='confirm-zero'; zeroPlayersAnswerPending=true; ticStatus.textContent=C.tic.zeroConfirm; return; }
    } else if(ticPhase==='confirm-zero' && zeroPlayersAnswerPending){
      if(['Y','S'].includes(key)){ e.preventDefault(); JoshuaAudioManager.ensureRunningFromGesture(); await startZeroPlayerMode(); return; }
      if(['N','ESCAPE'].includes(key)){ e.preventDefault(); zeroPlayersAnswerPending=false; ticPhase='player'; ticStatus.textContent=C.tic.move; return; }
    }
  });

  // State/rules (letter normalization, used-letter tracking, win/loss
  // detection, revealed-word representation) are pure logic with no DOM/
  // language dependency (see src/games/hangmanEngine.js). game.js keeps
  // picking the localized word (from the content module) and rendering.
  function startHang(){
    pendingGame='hang';
    const words=C.hangman.words;
    const word=words[Math.floor(Math.random()*words.length)];
    hangState=HangmanEngine.createState(word);
    block(['',C.hangman.title], 'amber');
    renderHang();
  }
  function renderHang(){
    const masked=HangmanEngine.revealedWord(hangState).map(ch=>ch||'_').join(' ');
    block([`WORD: ${masked}`,`MISSES: ${hangState.wrongCount}/${HangmanEngine.MAX_WRONG_GUESSES}`,`USED: ${hangState.guesses.join(' ')}`,C.hangman.prompt], 'white');
  }
  function handleHang(cmd){
    const ch=HangmanEngine.normalizeLetter(cmd);
    if(!ch){ block(C.hangman.bad,'red'); return; }
    if(HangmanEngine.hasGuessed(hangState, ch)){ block(C.hangman.used,'red'); return; }
    hangState=HangmanEngine.applyGuess(hangState, ch);
    const won=HangmanEngine.isWon(hangState);
    if(won || HangmanEngine.isLost(hangState)){
      renderHang();
      block(won?C.hangman.win:`${C.hangman.lose} WORD: ${hangState.word}`, won?'amber':'red');
      pendingGame=null;
      showMenu(won?C.hangman.win:C.hangman.lose);
    } else {
      renderHang();
    }
  }

  // Sudoku command parsing, bounds/fixed-cell checks, move rules, immutable
  // updates, completion, and SOLVE are pure logic in sudokuEngine.js.
  // game.js keeps lifecycle, localized feedback, rendering, and menu flow.
  function startSudoku(){ pendingGame='sudoku'; sudokuState=SudokuEngine.createState(); block(['',C.sudoku.title,C.sudoku.intro], 'amber'); renderSudoku(); }
  function renderSudoku(){ block(sudokuState.grid.map(r=>r.map(v=>v||'.').join(' ')), 'white'); }
  function handleSudoku(cmd){
    if(cmd==='SOLVE'){
      sudokuState=SudokuEngine.solve(sudokuState);
      renderSudoku();
      block(C.sudoku.solved,'amber');
      pendingGame=null;
      showMenu(C.sudoku.solved);
      return;
    }
    const move=SudokuEngine.parseMove(cmd);
    if(!move || !SudokuEngine.isMoveInBounds(move)){ block(C.sudoku.bad,'red'); return; }
    if(SudokuEngine.isFixedCell(sudokuState,move.row,move.column)){ block(C.sudoku.fixed,'red'); return; }
    if(!SudokuEngine.isValidPlacement(sudokuState,move)){ block(C.sudoku.wrong,'red'); return; }
    sudokuState=SudokuEngine.applyMove(sudokuState,move);
    renderSudoku();
    if(SudokuEngine.isComplete(sudokuState)){
      block(C.sudoku.solved,'amber');
      pendingGame=null;
      showMenu(C.sudoku.solved);
    }
  }

  function startWarSelectFaction(){
    mode='war-faction'; currentFaction=null; currentScenarioOptions=[];
    clearForTransition();
    block(['',C.war.selectFaction,''], 'amber');
    block(C.war.factionPrompt,'dim');
    addButtons(factions.map((f,i)=>({label:`${i+1}. ${f}`, value:f})), it=>selectFaction(it.value));
  }
  function selectFaction(faction){
    currentFaction=faction;
    currentScenarioOptions=scenarios.filter(s=>s.faction===faction);
    mode='war-scenario';
    block(['',`${C.war.selectScenario} ${faction}`,''],'amber');
    block(C.war.scenarioPrompt,'dim');
    addButtons(currentScenarioOptions.map((s,i)=>({label:`${i+1}. ${s.title}`, value:s.id})), it=>runScenario(it.value));
  }

  const fmt = n => Math.round(n).toLocaleString(lang==='it'?'it-IT':'en-US');
  function status(labels, vals){ statusData.innerHTML=''; Object.entries(vals).forEach(([k,v])=>{ const dt=document.createElement('dt'); dt.textContent=labels[k]||k; const dd=document.createElement('dd'); dd.textContent=v; statusData.appendChild(dt); statusData.appendChild(dd); }); }
  // Event log entries get a monotonically increasing two-digit "timestamp"
  // (00, 07, 14, …). The step of 7 makes the readout read as a synthetic
  // sequence number, not a real clock — a retro aesthetic, not a timer.
  const EVENT_LOG_INDEX_STEP = 7;
  function logEvent(text){
    const d=document.createElement('div');
    d.textContent=String(eventLog.children.length*EVENT_LOG_INDEX_STEP).padStart(2,'0')+': '+text;
    eventLog.appendChild(d);
    // Events accumulate for the whole run; the panel scrolls (see CSS) and
    // always jumps to the newest entry, but nothing is ever discarded.
    eventLog.scrollTop=eventLog.scrollHeight;
  }
  function updateWarStatus(s, labels){ status(labels,{ faction:s.faction, scenario:s.title, alert:currentWarStats.alert, missiles:fmt(currentWarStats.missiles), detonations:fmt(currentWarStats.detonations), casualties:fmt(currentWarStats.casualties), elapsed:currentWarStats.elapsed }); }
  function addRandomToll(ranges){ currentWarStats=WarModel.applyRandomToll(currentWarStats, ranges); }

  const WAR_RUN_ABORTED = {};
  function cancelWarRun(){ if(activeWarRun) activeWarRun.cancelled=true; activeWarRun=null; currentWarStats=null; }
  function assertWarRun(run){ if(run.cancelled || activeWarRun!==run) throw WAR_RUN_ABORTED; }
  async function pauseWar(run, milliseconds){ assertWarRun(run); await sleep(milliseconds); assertWarRun(run); }

  async function animatePairs(run, pairs, opts){
    for(let i=0;i<pairs.length;i++){
      assertWarRun(run);
      const [from,to,side]=pairs[i];
      const color = side || opts.color || (i%3===0 ? 'blue' : i%2===0 ? 'red' : '');
      warMap.drawArc(from,to,color);
      if(opts.impact !== false) warMap.impact(to, !!opts.bigImpact);
      addRandomToll({ missiles:opts.missiles || [60,160], detonations:opts.detonations || [8,32], casualties:opts.casualties || [4000000,18000000], elapsed:opts.elapsed || [4,9], alert:opts.alert });
      updateWarStatus(opts.scenario, opts.labels);
      logEvent((opts.log || C.war.launchConfirmed) + `: ${nodeById[from].label} → ${nodeById[to].label}`);
      await pauseWar(run, opts.delay || 320);
    }
  }

  async function strikeStorm(run, regionName, scenario, labels, opts={}){
    const targets = CITY_REGIONS[regionName];
    const sourceIds = opts.sources || ['russia-west','siberian-corridor','na-east'];
    const sourceCoords = sourceIds.map(id => WarMap.project(nodeById[id].lon, nodeById[id].lat));
    logEvent(opts.log || C.war.worldBlanket);
    for(let i=0;i<targets.length;i++){
      assertWarRun(run);
      const t=targets[i]; const a=sourceCoords[i % sourceCoords.length]; const b=WarMap.project(t.lon,t.lat);
      warMap.drawArcCoordinates(a,b, opts.color || (i%2===0?'red':'blue'));
      warMap.impactCoordinates(t.lon,t.lat, !!opts.bigImpact);
      addRandomToll({ missiles:opts.missiles || [120,260], detonations:opts.detonations || [18,54], casualties:opts.casualties || [35000000,120000000], elapsed:opts.elapsed || [2,4], alert:opts.alert || 'DEFCON 1' });
      updateWarStatus(scenario, labels);
      if(i % 3 === 0){ logEvent(`${opts.labelPrefix || 'TARGET'}: ${t.label}`); }
      await pauseWar(run, opts.delay || 95);
    }
  }

  async function globalBlanket(run, scenario, labels){
    logEvent(C.war.worldBlanket);
    const globalTargets = [...CITY_REGIONS.usa.slice(0,4), ...CITY_REGIONS.europe.slice(0,4), ...CITY_REGIONS.world, ...CITY_REGIONS.south];
    for(let i=0;i<GLOBAL_WORLD_PAIRS.length;i++){
      assertWarRun(run);
      const [from,to]=GLOBAL_WORLD_PAIRS[i]; warMap.drawArc(from,to,'global'); warMap.impact(to,true);
      addRandomToll({ missiles:[260,560], detonations:[80,190], casualties:[70000000,180000000], elapsed:[1,3], alert:'DEFCON 1' });
      updateWarStatus(scenario, labels);
      await pauseWar(run, 130);
    }
    for(let i=0;i<globalTargets.length;i++){
      assertWarRun(run);
      const t=globalTargets[i]; warMap.impactCoordinates(t.lon,t.lat, true); addRandomToll({ missiles:[80,180], detonations:[14,32], casualties:[40000000,120000000], elapsed:[1,2], alert:'DEFCON 1' });
      updateWarStatus(scenario, labels);
      if(i % 4 === 0) logEvent(`IMPACT CLUSTER: ${t.label}`);
      await pauseWar(run, 75);
    }
  }

  async function logPhase(run, phase){
    logEvent(phase.title);
    for(const item of phase.log || []){ await pauseWar(run, 330); logEvent(item); }
  }

  // war soundscape intensity: derived from real simulation state (which
  // narrative phase we're in, and how many detonations have actually
  // happened), never from an independent timer — see warSoundscape.js's
  // header for why that distinction matters. `phaseWeight` gives the floor
  // for the current narrative beat; the detonation count can only push
  // intensity UP from there (a phase that has racked up many detonations
  // stays loud even before the next phaseWeight bump), never down.
  function warIntensityForPhase(phaseWeight){
    return WarModel.intensityForPhase(currentWarStats, phaseWeight);
  }

  async function runScenario(id){
    const s=scenarios.find(x=>x.id===id); if(!s) return;
    // Complete per-scenario coverage is enforced by the geo-validation test;
    // a missing profile must fail loudly into the error boundary below rather
    // than silently substituting another scenario's narrative.
    const profile = STRATEGY_PROFILES[s.id];
    // SCENARIO_VIEWS has complete per-scenario coverage (every scenario id in
    // scenarios.js has an entry in warViews.js — see the geo-validation test).
    // A missing id therefore throws inside the runScenario() error boundary
    // instead of silently resetting the camera with an invented zoom.
    const viewSet = SCENARIO_VIEWS[s.id];
    cancelWarRun();
    const run={cancelled:false};
    activeWarRun=run;

    // Error boundary: a bad geographic reference (e.g. a strikes/route id
    // missing from nodes.js) must never leave the simulation stuck on a
    // half-drawn map with audio still running. See
    // tests/unit/warGeoValidation.test.js for the automated check that
    // should catch this at test time, long before a player ever hits it.
    try {
    if(!profile) throw new Error('Missing war strategy profile for scenario: ' + s.id);
    JoshuaAudioManager.startWarSoundscape();
    showSection('war');
    reportPanel.classList.add('hidden');
    eventLog.innerHTML='';
    warMap.clear();
    warMap.zoom(null);
    warMap.drawNodes([...new Set(nodeList.map(n=>n.id))]);

    warSubtitle.textContent = `${s.faction} / ${s.title}`;
    const labels=C.war.statusLabels;
    currentWarStats=WarModel.createStats();
    updateWarStatus(s, labels);

    await pauseWar(run, 600);
    for(const b of s.briefing){ logEvent(b); await pauseWar(run, 300); }
    logEvent(C.war.start);
    await pauseWar(run, 500);

    warMap.zoom(viewSet.local);
    await pauseWar(run, 1100);
    await logPhase(run, profile.local);
    JoshuaAudioManager.setWarIntensity(warIntensityForPhase(0.12));
    await animatePairs(run, profile.local.strikes, {scenario:s, labels, delay:540, missiles:[20,90], detonations:[2,14], casualties:[1500000,9000000], elapsed:[4,7], log:C.war.launchConfirmed, alert:'DEFCON 2'});

    warMap.zoom(viewSet.regional);
    await pauseWar(run, 900);
    await logPhase(run, profile.first);
    JoshuaAudioManager.setWarIntensity(warIntensityForPhase(0.28));
    await animatePairs(run, profile.first.strikes, {scenario:s, labels, delay:460, missiles:[55,160], detonations:[9,28], casualties:[6000000,26000000], elapsed:[4,7], log:C.war.secondaryStrike, alert:'DEFCON 1'});

    await logPhase(run, profile.second);
    JoshuaAudioManager.setWarIntensity(warIntensityForPhase(0.45));
    await animatePairs(run, profile.second.strikes, {scenario:s, labels, delay:400, missiles:[90,240], detonations:[16,54], casualties:[18000000,70000000], elapsed:[3,6], log:C.war.containmentFail, alert:'DEFCON 1', bigImpact:true});

    await logPhase(run, profile.global);
    JoshuaAudioManager.setWarIntensity(warIntensityForPhase(0.55));
    await pauseWar(run, 450);

    warMap.zoom(WORLD_VIEWS.usa);
    await pauseWar(run, 900);
    JoshuaAudioManager.setWarIntensity(warIntensityForPhase(0.65));
    await strikeStorm(run, 'usa', s, labels, { log: C.war.usaStorm, sources:['russia-west','siberian-corridor','china-coast'], delay:85, missiles:[120,240], detonations:[20,55], casualties:[45000000,120000000], elapsed:[2,4], bigImpact:true, color:'russia', labelPrefix:'US CITY' });

    warMap.zoom(WORLD_VIEWS.europe);
    await pauseWar(run, 900);
    JoshuaAudioManager.setWarIntensity(warIntensityForPhase(0.72));
    await strikeStorm(run, 'europe', s, labels, { log: C.war.europeStorm, sources:['russia-west','iran-corridor','siberian-corridor'], delay:80, missiles:[120,240], detonations:[20,55], casualties:[45000000,120000000], elapsed:[2,4], bigImpact:true, color:'russia', labelPrefix:'EU CITY' });

    warMap.zoom(WORLD_VIEWS.arctic);
    await pauseWar(run, 850);
    JoshuaAudioManager.setWarIntensity(warIntensityForPhase(0.78));
    await strikeStorm(run, 'arctic', s, labels, { log: C.war.arcticStorm, sources:['na-west','russia-west','siberian-corridor'], delay:92, missiles:[90,180], detonations:[16,42], casualties:[25000000,80000000], elapsed:[2,4], bigImpact:true, color:'global', labelPrefix:'POLAR NODE' });

    warMap.zoom({x:800,y:500,s:1.25});
    await pauseWar(run, 700);
    JoshuaAudioManager.setWarIntensity(warIntensityForPhase(0.85));
    await strikeStorm(run, 'south', s, labels, { log: C.war.southStorm, sources:['na-west','china-coast','russia-west'], delay:82, missiles:[90,220], detonations:[18,58], casualties:[35000000,130000000], elapsed:[1,3], bigImpact:true, color:'global', labelPrefix:'SOUTHERN CITY' });

    warMap.zoom(WORLD_VIEWS.world);
    await pauseWar(run, 800);
    JoshuaAudioManager.setWarIntensity(warIntensityForPhase(1));
    await globalBlanket(run, s, labels);
    await animatePairs(run, GLOBAL_WORLD_PAIRS.slice(0,14), {scenario:s, labels, delay:115, missiles:[220,520], detonations:[65,180], casualties:[60000000,180000000], elapsed:[1,3], color:'global', alert:'DEFCON 1', bigImpact:true, log:C.war.worldFire});

    JoshuaAudioManager.stopWarSoundscape();
    logEvent(C.war.noWinner);
    await pauseWar(run, 550);
    const out=WarModel.createReport(currentWarStats);
    assertWarRun(run);
    showReport(s, out);
    warRuns=WarModel.completeRun(warRuns);
    activeWarRun=null;
    } catch(err) {
      if(err===WAR_RUN_ABORTED) return;
      // Never a false advance toward the final sequence: no warRuns++, no
      // showReport() for a run that didn't actually complete.
      console.error('[JOSHUA] GLOBAL THERMONUCLEAR WAR scenario failed —', err);
      if(activeWarRun===run){ activeWarRun=null; currentWarStats=null; }
      JoshuaAudioManager.stopWarSoundscape();
      showSection('terminal');
      clearForTransition();
      block(C.war.scenarioError, 'red');
      showMenu(C.war.scenarioError);
    }
  }

  function showReport(s,out){
    announce(C.war.complete);
    const L=C.war.reportLabels;
    reportPanel.innerHTML = `<h2>${C.war.complete}</h2><div class="report-grid">
      <div class="report-key">${L.faction}</div><div class="report-val">${s.faction}</div>
      <div class="report-key">${L.scenario}</div><div class="report-val">${s.title}</div>
      <div class="report-key">${L.immediate}</div><div class="report-val">${fmt(out.imm)}</div>
      <div class="report-key">${L.thirty}</div><div class="report-val">${fmt(out.thirty)}</div>
      <div class="report-key">${L.detonations}</div><div class="report-val">${fmt(out.det)}</div>
      <div class="report-key">${L.infra}</div><div class="report-val">${out.infra}%</div>
      <div class="report-key">${L.agri}</div><div class="report-val">${C.war.reportValues.severe}</div>
      <div class="report-key">${L.command}</div><div class="report-val">${C.war.reportValues.degraded}</div>
      <div class="report-key">${L.objective}</div><div class="report-val">${C.war.reportValues.failed}</div>
      <div class="report-key">${L.winner}</div><div class="report-val">${C.war.none}</div>
    </div><div class="choice-grid"><button class="choice-button" id="continueWar">${C.war.continue}</button></div>`;
    reportPanel.classList.remove('hidden');
    document.getElementById('continueWar').addEventListener('click',()=>{ reportPanel.classList.add('hidden'); if(WarModel.hasCompletedRuns(warRuns, WarModel.REQUIRED_WAR_RUNS)) finalSequence(); else { showSection('terminal'); if(!ticLearned){ block(C.tic.autoModel,'white'); ticLearned=true; } startWarSelectFaction(); } });
  }

  async function finalSequence(){
    // Defensive: runScenario() already stops the war soundscape once its
    // animated part ends (finalSequence is only ever reached afterwards,
    // via the report panel's continue button), but the spec calls out
    // "starting the final sequence" explicitly as a lifecycle boundary, so
    // this stays here even though it is normally a no-op by this point.
    JoshuaAudioManager.stopWarSoundscape();
    showSection('final'); finalText.textContent=''; returnConsole.classList.add('hidden');
    // Countdown readout — also governed by presentationSpeed, so it doesn't
    // race ahead of the narrated messages that follow.
    const lineDelay = JoshuaPresentation.scaleDelay(520, presentationSpeed);
    const prePause = JoshuaPresentation.scaleDelay(1500, presentationSpeed);
    for(const l of C.finalSequence){ finalText.textContent += l.replace('{runs}', String(WarModel.REQUIRED_WAR_RUNS)) + '\n'; await sleep(lineDelay); }
    await sleep(prePause);
    // STRANGE GAME... and HOW ABOUT A NICE GAME OF CHESS — typed + spoken
    // (best-effort TTS), delegated to JoshuaFinalSequence/speech so the
    // ordering and the narration mechanics are testable independently.
    await JoshuaFinalSequence.runFinalMessages({
      target: finalText,
      mainText: C.finalMain,
      chessText: C.chess,
      chessSpokenText: C.chessSpoken,
      lang,
      speed: presentationSpeed,
      speech,
      sleep
    });
    returnConsole.classList.remove('hidden');
  }

  initSplash();
})();
