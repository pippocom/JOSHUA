# Playing JOSHUA Terminal

This is a short guide to the controls. It deliberately does not describe how the experience ends — that part is meant to be discovered by playing.

## Starting up

You'll land on a credits splash screen with the JOSHUA TERMINAL title, a short description, and a **BOOT JOSHUA TERMINAL** button (the label is translated in Italian). Click it to start — this also unlocks audio in your browser, so sound and narration can play. You can also press Enter if the button already has focus.

You can switch between English and Italian from the small language link on the splash screen before booting.

## Typing commands

Once booted, you get a terminal prompt (`JOSHUA>`). Type a command and press Enter (or the SEND button). Commands are not case-sensitive.

- **HELP** — lists the available commands.
- **GAMES** — lists the available games.
- **ASK ME SOMETHING** — asks JOSHUA a question; type your question at the following prompt (try asking about "war", "human", "game", or whether it's "intelligent").
- **CLEAR** — clears the screen.
- **EXIT** — returns to the splash screen.

From the main menu you can also just type `1`, `2`, or `3` instead of the full command names.

## Choosing a game

Type `PLAY` followed by a game name, for example `PLAY GLOBAL THERMONUCLEAR WAR`. Games can also be started by typing their name directly.

### TIC-TAC-TOE

It is a hidden game, as in the movie. Start it with `PLAY TIC-TAC-TOE` (or `TIC TAC TOE`, `TRIS`). Press keys **1–9** to occupy a cell; the board maps left-to-right, top-to-bottom.

You can play a normal game against the system. Or, type **ZERO** or press **0** to ask whether you'd rather let the system play against itself — confirm with Y (or S in Italian) to watch, or N to keep playing yourself.

### HANGMAN

Listed in the GAMES menu. Type **HANGMAN** (or **IMPICCATO** in Italian) to start, then guess one letter at a time. A wrong guess is counted against you; six wrong guesses lose the game and reveal the word.

### SUDOKU

Listed in the GAMES menu. Type **SUDOKU** to start. Enter moves as `SET <row> <column> <value>` with values 1–4 (for example `SET 2 1 3`); `SET` is optional. Type **SOLVE** to let JOSHUA finish the puzzle.

### GLOBAL THERMONUCLEAR WAR

JOSHUA is not a modern search engine, and the WOPR was not designed to guess what its users meant. To start the simulation, type its complete name exactly as shown in the game list:

`GLOBAL THERMONUCLEAR WAR`

The general command form `PLAY GLOBAL THERMONUCLEAR WAR` also works. Abbreviations such as `WAR` are deliberately not recognized — old computers expected precise commands.

You'll be asked to pick a faction, then a scenario for that faction — either by typing the number shown or by clicking one of the buttons. The simulation runs on a world map with a live event log alongside it.

After a scenario finishes, you can continue on to another scenario, or let the terminal move forward on its own. **ABORT** (visible during the simulation) returns you to the main menu at any time.

## Sound

Use the **SOUND** (or **AUDIO** in Italian) button in the top bar to mute or unmute both narration and sound effects. It's a toggle — click again to bring sound back.

## Accessibility

- The whole app is keyboard-operable: the boot button and command input receive focus automatically at the right moments, buttons respond to Enter, and Tic-Tac-Toe is played entirely with the number keys.
- The app announces meaningful state changes to screen readers through a single status region; the terminal and event log are not read aloud line by line.
- If your operating system or browser is set to reduce motion, the flashing and looping visual effects (the Tic-Tac-Toe overload flicker, the war-trajectory dash, the map pan/zoom) are toned down or disabled.

## Developer-only speed options

The app supports a couple of URL query parameters meant for development and testing, not for normal play:

- `?fast=1` — speeds up some of the app's own pacing (not the typing/speech rate) so that long sequences are quicker to test manually.
- `?presentationSpeed=<number>` — adjusts the overall typing/narration pace.

You don't need either of these to play normally.

## One more thing

The meaning of all this, and how it resolves, is something you're meant to find out by playing rather than by reading about it here.
