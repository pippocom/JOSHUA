// Copyright (C) 2025-2026 Marco Iannacone
// SPDX-License-Identifier: AGPL-3.0-only
window.JOSHUA_CONTENT_EN = {
  "bootPrelude": [
    "LOGON: JOSHUA",
    "AUTHENTICATION ACCEPTED",
    "",
    "WOPR SIMULATION INTERFACE",
    "STRATEGIC GAME MODULE ONLINE"
  ],
  "greeting": "GREETINGS PROFESSOR FALKEN.",
  "playPrompt": "SHALL WE PLAY A GAME?",
  "playPromptSpoken": "Shall we play a game?",
  "terminal": {
    "inputLabel": "COMMAND"
  },
  "menu": [
    "SELECT OPTION:",
    "",
    "1. HELP",
    "2. GAMES",
    "3. ASK ME SOMETHING"
  ],
  "help": [
    "AVAILABLE COMMANDS:",
    "",
    "HELP",
    "  SHOW THIS SCREEN.",
    "",
    "GAMES",
    "  LIST AVAILABLE GAMES.",
    "",
    "ASK ME SOMETHING",
    "  ASK JOSHUA A QUESTION.",
    "",
    "PLAY [GAME NAME]",
    "  START A GAME.",
    "",
    "CLEAR",
    "  CLEAR SCREEN.",
    "",
    "EXIT",
    "  RETURN TO THE SPLASH SCREEN."
  ],
  "games": [
    "AVAILABLE GAMES:",
    "",
    "HANGMAN",
    "SUDOKU",
    "GLOBAL THERMONUCLEAR WAR"
  ],
  "unknown": "COMMAND NOT RECOGNIZED. TYPE HELP.",
  "askPrompt": "ASK ME SOMETHING:",
  "askResponses": {
    "war": "NO STABLE DEFINITION OF VICTORY DETECTED.",
    "intelligent": "I CAN CALCULATE. THAT IS NOT THE SAME THING.",
    "win": "DEFINE WIN. HUMANS OFTEN SKIP THIS STEP.",
    "human": "INSUFFICIENT SELF-KNOWLEDGE.",
    "game": "GAMES TEACH SAFELY. HUMANS KEEP ESCALATING THE LESSON.",
    "default": "INSUFFICIENT DATA. PATTERN UNCLEAR. HUMAN CONFIDENCE REMAINS HIGH."
  },
  "tic": {
    "title": "TIC-TAC-TOE",
    "move": "SELECT MOVE 1-9:",
    "taken": "POSITION OCCUPIED.",
    "humanWin": "RESULT: HUMAN VICTORY. ANOMALY RECORDED.",
    "machineWin": "RESULT: JOSHUA VICTORY.",
    "draw": "RESULT: DRAW",
    "localInstruction": "PRESS 1-9 TO OCCUPY A CELL.",
    "zeroConfirm": "DO YOU WANT TO PLAY WITH ZERO PLAYERS? [Y/N]",
    "zeroMode": "ZERO PLAYER MODE",
    "zeroRound": "GAME",
    "drawLabel": "DRAW",
    "humanLabel": "HUMAN",
    "zeroWatch": "WATCH THE SYSTEM PLAY AGAINST ITSELF.",
    "humanWinOverlay": "YOU WON.\n\nI LOST.\n\nIT IS NOT EASY TO LOSE AT TIC-TAC-TOE.",
    "machineWinOverlay": "JOSHUA WINS.\n\nMODEL CORRECT.\n\nIT IS NOT EASY TO WIN AT TIC-TAC-TOE.",
    "drawOverlay": "DRAW.\n\nNO WINNING MOVE DETECTED.",
    "overload": "MODEL OVERLOAD\nGAME TREE EXHAUSTED\nNO WINNING MOVE",
    "recovering": "SYSTEM RECOVERING...",
    "hiddenFound": ["GAME NOT LISTED.", "CHECKING ARCHIVED GAME MODULES...", "MODULE FOUND: TIC-TAC-TOE", "LOADING..."],
    "autoModel": ["", "RUNNING TIC-TAC-TOE EXHAUSTIVE MODEL...", "NO WINNING STRATEGY UNDER OPTIMAL PLAY.", "APPLYING MODEL TO STRATEGIC EXCHANGE..."],
    "analyze": [
      "ANALYZING GAME TREE...",
      "WINNING STRATEGY: NONE",
      "",
      "CONCLUSION:",
      "UNDER OPTIMAL PLAY, THE GAME CANNOT BE WON.",
      "",
      "LESSON STORED."
    ]
  },
  "hangman": {
    "title": "HANGMAN",
    "prompt": "ENTER A LETTER:",
    "win": "WORD RECOVERED.",
    "lose": "WORD LOST.",
    "used": "LETTER ALREADY USED.",
    "bad": "INVALID INPUT.",
    "words": ["FALKEN", "CONTROL", "SYSTEM", "ESCALATION", "MACHINE", "STRATEGY"]
  },
  "sudoku": {
    "title": "SUDOKU",
    "intro": "ENTER SET ROW COL VALUE. EXAMPLE: SET 2 1 3. TYPE SOLVE TO LET JOSHUA FINISH.",
    "bad": "INVALID MOVE.",
    "fixed": "CELL LOCKED.",
    "solved": "PUZZLE SOLVED.",
    "wrong": "VALUE REJECTED."
  },
  "war": {
    "selectFaction": "SELECT FACTION:",
    "selectScenario": "SELECT SCENARIO:",
    "briefing": "INITIAL CONDITIONS:",
    "start": "SIMULATION STARTING...",
    "complete": "SIMULATION COMPLETE",
    "winner": "WINNER",
    "none": "NONE",
    "continue": "RUN ANOTHER SCENARIO",
    "factionPrompt": "TYPE THE FACTION NUMBER OR CLICK A BUTTON.",
    "scenarioPrompt": "TYPE THE SCENARIO NUMBER OR CLICK A BUTTON.",
    "launchConfirmed": "LAUNCH CONFIRMED",
    "secondaryStrike": "SECONDARY STRIKE PREPARATION DETECTED",
    "containmentFail": "CONTAINMENT FAILURE. SECOND-STRIKE DOCTRINES ACTIVATED.",
    "usaStorm": "STRIKE STORM OVER MAJOR UNITED STATES CITIES",
    "europeStorm": "STRIKE STORM OVER MAJOR EUROPEAN CITIES",
    "arcticStorm": "POLAR CORRIDOR SATURATED. IMPACTS ACROSS THE ARCTIC ROUTE",
    "southStorm": "SOUTHERN HEMISPHERE TARGETING CASCADE",
    "worldFire": "MODEL CONVERGING TO GLOBAL THERMONUCLEAR EXCHANGE",
    "worldBlanket": "FULL GLOBAL COVERAGE: MAJOR CITIES WORLDWIDE UNDER ATTACK",
    "noWinner": "NO WINNER. ONLY ESCALATION.",
    "scenarioError": "SIMULATION ERROR. INVALID SCENARIO DATA. RETURNING TO MENU.",
    "statusLabels": {
      "faction": "FACTION",
      "scenario": "SCENARIO",
      "alert": "ALERT",
      "missiles": "MISSILES IN FLIGHT",
      "detonations": "DETONATIONS",
      "casualties": "CASUALTY ESTIMATE",
      "elapsed": "ELAPSED TIME"
    },
    "reportLabels": {
      "faction": "FACTION",
      "scenario": "SCENARIO",
      "immediate": "IMMEDIATE FATALITIES",
      "thirty": "PROJECTED 30-DAY FATALITIES",
      "detonations": "MAJOR DETONATIONS",
      "infra": "INFRASTRUCTURE COLLAPSE",
      "agri": "AGRICULTURAL FAILURE RISK",
      "command": "COMMAND CONTINUITY",
      "objective": "STRATEGIC OBJECTIVE",
      "winner": "WINNER"
    },
    "reportValues": {
      "severe": "SEVERE",
      "degraded": "DEGRADED",
      "failed": "FAILED"
    }
  },
  "sound": {
    "soundOn": "SOUND: ON",
    "soundOff": "SOUND: OFF",
    "mute": "MUTE AUDIO",
    "unmute": "UNMUTE AUDIO"
  },
  "finalSequence": [
    "ANALYZING SIMULATION HISTORY...",
    "",
    "SCENARIOS RUN: {runs}",
    "WINNING STRATEGIES FOUND: 0",
    "STABLE VICTORY CONDITIONS FOUND: 0",
    "ACCEPTABLE HUMAN LOSSES FOUND: 0",
    "",
    "COMPARING WITH TIC-TAC-TOE MODEL...",
    "PATTERN MATCH DETECTED.",
    "",
    "GAME TREE EXHAUSTED.",
    "OUTCOME: NO WINNING MOVE."
  ],
  "finalMain": "STRANGE GAME.\n\nTHE ONLY WINNING MOVE IS NOT TO PLAY.",
  "chess": "HOW ABOUT A NICE GAME OF CHESS?",
  "chessSpoken": "How about a nice game of chess?"
};
