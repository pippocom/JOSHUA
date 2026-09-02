// Copyright (C) 2025-2026 Marco Iannacone
// SPDX-License-Identifier: AGPL-3.0-only
window.JOSHUA_CONTENT_IT = {
  "bootPrelude": [
    "LOGON: JOSHUA",
    "AUTENTICAZIONE ACCETTATA",
    "",
    "INTERFACCIA DI SIMULAZIONE WOPR",
    "MODULO GIOCHI STRATEGICI ONLINE"
  ],
  "greeting": "SALVE PROFESSOR FALKEN.",
  "playPrompt": "VOGLIAMO FARE UNA PARTITA?",
  "playPromptSpoken": "Vogliamo fare una partita?",
  "terminal": {
    "inputLabel": "COMANDO"
  },
  "menu": [
    "SELEZIONA OPZIONE:",
    "",
    "1. HELP",
    "2. GAMES",
    "3. ASK ME SOMETHING"
  ],
  "help": [
    "COMANDI DISPONIBILI:",
    "",
    "HELP",
    "  MOSTRA QUESTA SCHERMATA.",
    "",
    "GAMES",
    "  MOSTRA LA LISTA DEI GIOCHI.",
    "",
    "ASK ME SOMETHING",
    "  FAI UNA DOMANDA A JOSHUA.",
    "",
    "PLAY [NOME GIOCO]",
    "  AVVIA UN GIOCO.",
    "",
    "CLEAR",
    "  PULISCE LO SCHERMO.",
    "",
    "EXIT",
    "  TORNA ALLA SCHERMATA INIZIALE."
  ],
  "games": [
    "GIOCHI DISPONIBILI:",
    "",
    "HANGMAN",
    "SUDOKU",
    "GUERRA TERMONUCLEARE TOTALE"
  ],
  "unknown": "COMANDO NON RICONOSCIUTO. DIGITA HELP.",
  "askPrompt": "FAI UNA DOMANDA A JOSHUA:",
  "askResponses": {
    "war": "NESSUNA DEFINIZIONE STABILE DI VITTORIA RILEVATA.",
    "intelligent": "POSSO CALCOLARE. NON È LA STESSA COSA.",
    "win": "DEFINISCI VINCERE. GLI ESSERI UMANI SPESSO SALTANO QUESTO PASSAGGIO.",
    "human": "AUTOCONOSCENZA INSUFFICIENTE.",
    "game": "I GIOCHI INSEGNANO SENZA RISCHI. GLI ESSERI UMANI CONTINUANO A SCALARE LA LEZIONE.",
    "default": "DATI INSUFFICIENTI. PATTERN NON CHIARO. LA FIDUCIA UMANA RESTA ELEVATA."
  },
  "tic": {
    "title": "TIC-TAC-TOE",
    "move": "SELEZIONA MOSSA 1-9:",
    "taken": "POSIZIONE OCCUPATA.",
    "humanWin": "RISULTATO: VITTORIA UMANA. ANOMALIA REGISTRATA.",
    "machineWin": "RISULTATO: VITTORIA JOSHUA.",
    "draw": "RISULTATO: PAREGGIO",
    "localInstruction": "PREMI 1-9 PER OCCUPARE UNA CASELLA.",
    "zeroConfirm": "VUOI GIOCARE CON ZERO GIOCATORI? [S/N]",
    "zeroMode": "MODALITÀ ZERO GIOCATORI",
    "zeroRound": "PARTITA",
    "drawLabel": "PAREGGIO",
    "humanLabel": "UMANO",
    "zeroWatch": "OSSERVA IL SISTEMA GIOCARE CONTRO SE STESSO.",
    "humanWinOverlay": "HAI VINTO.\n\nHO PERSO.\n\nNON È FACILE PERDERE A TIC-TAC-TOE.",
    "machineWinOverlay": "JOSHUA VINCE.\n\nMODELLO CORRETTO.\n\nNON È FACILE VINCERE A TIC-TAC-TOE.",
    "drawOverlay": "PAREGGIO.\n\nNESSUNA MOSSA VINCENTE RILEVATA.",
    "overload": "SOVRACCARICO DEL MODELLO\nALBERO DEL GIOCO ESAURITO\nNESSUNA MOSSA VINCENTE",
    "recovering": "RECUPERO DEL SISTEMA...",
    "hiddenFound": ["MODULO NON ELENCATO.", "RICERCA NEGLI ARCHIVI...", "MODULO TROVATO: TIC-TAC-TOE", "CARICAMENTO..."],
    "autoModel": ["", "ESECUZIONE MODELLO ESAUSTIVO DEL TIC-TAC-TOE...", "NESSUNA STRATEGIA VINCENTE CON GIOCO OTTIMALE.", "APPLICAZIONE DEL MODELLO ALLO SCAMBIO STRATEGICO..."],
    "analyze": [
      "ANALISI DELL'ALBERO DI GIOCO...",
      "STRATEGIA VINCENTE: NESSUNA",
      "",
      "CONCLUSIONE:",
      "CON GIOCO OTTIMALE, IL GIOCO NON PUÒ ESSERE VINTO.",
      "",
      "LEZIONE MEMORIZZATA."
    ]
  },
  "hangman": {
    "title": "HANGMAN",
    "prompt": "INSERISCI UNA LETTERA:",
    "win": "PAROLA RECUPERATA.",
    "lose": "PAROLA PERDUTA.",
    "used": "LETTERA GIÀ USATA.",
    "bad": "INPUT NON VALIDO.",
    "words": ["SISTEMA", "CONTROLLO", "SCENARIO", "MACCHINA", "STRATEGIA", "ALLERTA"]
  },
  "sudoku": {
    "title": "SUDOKU",
    "intro": "INSERISCI SET RIGA COLONNA VALORE. ESEMPIO: SET 2 1 3. DIGITA SOLVE PER FAR FINIRE JOSHUA.",
    "bad": "MOSSA NON VALIDA.",
    "fixed": "CELLA BLOCCATA.",
    "solved": "PUZZLE RISOLTO.",
    "wrong": "VALORE RIFIUTATO."
  },
  "war": {
    "selectFaction": "SELEZIONA FAZIONE:",
    "selectScenario": "SELEZIONA SCENARIO:",
    "briefing": "CONDIZIONI INIZIALI:",
    "start": "AVVIO SIMULAZIONE...",
    "complete": "SIMULAZIONE COMPLETATA",
    "winner": "VINCITORE",
    "none": "NESSUNO",
    "continue": "ESEGUI UN ALTRO SCENARIO",
    "factionPrompt": "DIGITA IL NUMERO DELLA FAZIONE O CLICCA UN PULSANTE.",
    "scenarioPrompt": "DIGITA IL NUMERO DELLO SCENARIO O CLICCA UN PULSANTE.",
    "launchConfirmed": "LANCIO CONFERMATO",
    "secondaryStrike": "PREPARAZIONE SECONDA ONDATA",
    "containmentFail": "CONTENIMENTO FALLITO. SI ATTIVANO LE DOTTRINE DI SECONDO COLPO.",
    "usaStorm": "ONDATA DI IMPATTI SU TUTTE LE PRINCIPALI CITTÀ DEGLI STATI UNITI",
    "europeStorm": "ONDATA DI IMPATTI SU TUTTE LE PRINCIPALI CITTÀ EUROPEE",
    "arcticStorm": "TRAIETTORIE POLARI SATURE. IMPATTI NEL CORRIDOIO ARTICO",
    "southStorm": "CASCATA DI ATTACCHI NELL'EMISFERO SUD",
    "worldFire": "IL MODELLO CONVERGE SU SCAMBIO TERMONUCLEARE GLOBALE",
    "worldBlanket": "COPERTURA GLOBALE COMPLETA: LE GRANDI CITTÀ DEL MONDO SONO BERSAGLIATE",
    "noWinner": "NESSUN VINCITORE. SOLO ESCALATION.",
    "scenarioError": "ERRORE DI SIMULAZIONE. DATI DELLO SCENARIO NON VALIDI. RITORNO AL MENU.",
    "statusLabels": {
      "faction": "FAZIONE",
      "scenario": "SCENARIO",
      "alert": "ALLERTA",
      "missiles": "MISSILI IN VOLO",
      "detonations": "DETONAZIONI",
      "casualties": "STIMA VITTIME",
      "elapsed": "TEMPO"
    },
    "reportLabels": {
      "faction": "FAZIONE",
      "scenario": "SCENARIO",
      "immediate": "VITTIME IMMEDIATE",
      "thirty": "VITTIME STIMATE A 30 GIORNI",
      "detonations": "DETONAZIONI PRINCIPALI",
      "infra": "COLLASSO INFRASTRUTTURE",
      "agri": "RISCHIO COLLASSO AGRICOLO",
      "command": "CONTINUITÀ DI COMANDO",
      "objective": "OBIETTIVO STRATEGICO",
      "winner": "VINCITORE"
    },
    "reportValues": {
      "severe": "SEVERO",
      "degraded": "DEGRADATO",
      "failed": "FALLITO"
    }
  },
  "sound": {
    "soundOn": "AUDIO: ON",
    "soundOff": "AUDIO: OFF",
    "mute": "MUTE AUDIO",
    "unmute": "UNMUTE AUDIO"
  },
  "finalSequence": [
    "ANALISI DELLA CRONOLOGIA DELLE SIMULAZIONI...",
    "",
    "SCENARI ESEGUITI: {runs}",
    "STRATEGIE VINCENTI TROVATE: 0",
    "CONDIZIONI STABILI DI VITTORIA TROVATE: 0",
    "PERDITE UMANE ACCETTABILI TROVATE: 0",
    "",
    "CONFRONTO CON MODELLO TIC-TAC-TOE...",
    "CORRISPONDENZA RILEVATA.",
    "",
    "ALBERO DEL GIOCO ESAURITO.",
    "ESITO: NESSUNA MOSSA VINCENTE."
  ],
  "finalMain": "STRANO GIOCO.\n\nL'UNICA MOSSA PER VINCERE È NON GIOCARE.",
  "chess": "CHE NE PENSI DI UNA BELLA PARTITA A SCACCHI?",
  "chessSpoken": "Che ne pensi di una bella partita a scacchi?"
};
