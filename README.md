# JOSHUA Terminal

**Version 0.69.0** · [Leggi questo documento in italiano](README.it.md)

A retro computer terminal you play in your browser — a tribute to *WarGames* (1983). It runs entirely client-side: no backend, no server-side state, and no build step required to run it.

## What this is

JOSHUA Terminal recreates the feel of the WOPR terminal from the film: a green-on-black prompt, a stern AI, a game of tic-tac-toe, and — if you push far enough — a simulated game of Global Thermonuclear War.

The arsenals of the world have changed since 1983. The outcome of a global thermonuclear war has not. That's the whole idea, dressed up as a game you can actually play.

This project began as an Easter egg hidden inside [pippo.com](https://pippo.com/), a personal website with its own terminal-style "operating system". **This public repository is a standalone application.** It does not include pippo.com's general-purpose terminal, its other Easter eggs, or the `joshua` shell command used to reach this game from within that terminal. What you get here is JOSHUA Terminal on its own, starting from its own credits splash screen.

JOSHUA preserves the recognizable *WarGames* behavior, wording, and presentation. See [TRIBUTE.md](TRIBUTE.md) for the film tribute and [ARCHITECTURE.md](ARCHITECTURE.md) for how the software is put together.

## Features

- Retro terminal interface, keyboard-driven, in the browser
- A short menu of games, reached by typing commands
- TIC-TAC-TOE (including a "zero players" mode), HANGMAN, and SUDOKU
- GLOBAL THERMONUCLEAR WAR: a narrative, visual simulation with a world map and a scrolling event log
- English and Italian, switchable from the splash screen
- Spoken narration via the Web Speech API (best-effort; silent gracefully if unavailable)
- Sound effects synthesized live with the Web Audio API — no audio files to download
- Accessibility: keyboard navigation, a focused live region for screen readers, visible focus, and `prefers-reduced-motion` support
- Runs entirely in the browser: open one HTML file (served over HTTP) and everything else loads from the same origin

## Try JOSHUA online
You can run JOSHUA directly in your browser at:

https://pippo.com/human-systems/interactive-fiction/joshua/

And yes, you read that correctly: pippo.com is not a placeholder. It is, in fact, a real domain and the personal website of Marco Iannacone.

## Quick test - local

You need to serve the app over HTTP — either from a local development server or from a public web server — because the app loads its JavaScript and data modules through relative paths. Opening `index.html` directly with `file://` will not work in most browsers.

```sh
cd src
python3 -m http.server 4173
```

Then open:

```
http://localhost:4173/index.html
```

There's also a development-only audition page for tuning sound and voice selection, at `src/dev/media-lab.html` (e.g. `http://localhost:4173/dev/media-lab.html`). It is **not** linked from the app and is not part of the normal play experience — it exists purely for local, manual testing of the audio and speech-synthesis code.

## Building and packaging

The app runs directly from `src/` with no build step. An optional `Makefile` builds distributable artifacts (see [ARCHITECTURE.md](ARCHITECTURE.md) for the full layout):

```sh
make test          # unit/regression tests (fast)
make check         # unit + Chromium + WebKit browser suites
make serve         # serve src/ at http://localhost:4173
make build         # dist/standalone/ + dist/pippo.com/ (EN + IT) + dist/build-info.json
make package       # dist/joshua-0.69.0.tar.gz (standalone release archive)
make clean         # remove dist/ only
```

`make build` is deterministic (except for the build timestamp and Git metadata) and performs no deployment.

## Browser support

This app depends on two optional browser APIs and degrades gracefully when they're missing or restricted:

- **Web Audio API** — used for synthesized sound effects. Most browsers require a user gesture (like the BOOT button) before audio can play; the app unlocks audio inside that click.
- **Web Speech API (`speechSynthesis`)** — used for spoken narration. Voice availability, quality, and language coverage vary a lot by browser and OS. If no speech synthesis is available, the app continues silently — text still appears normally.

Recent versions of Chromium-based browsers, Firefox, and Safari should all run the terminal and the games. Voice narration is generally more complete on Safari/macOS and Chrome; treat it as a bonus, not a requirement.

## Accessibility

The app is keyboard-operable, labels its controls, announces meaningful state changes through a single screen-reader live region (rather than streaming the whole terminal), and honors the operating system's reduced-motion preference. It has not yet been validated with real assistive technology, and no WCAG conformance level is claimed. See [ARCHITECTURE.md](ARCHITECTURE.md#accessibility-architecture).

## More documentation

- [PLAYING.md](PLAYING.md) — how to play, without spoiling the ending
- [ARCHITECTURE.md](ARCHITECTURE.md) — how the software is organized
- [CONTRIBUTING.md](CONTRIBUTING.md) — how to contribute
- [TRIBUTE.md](TRIBUTE.md) — about the tribute to *WarGames*
- [CREDITS.md](CREDITS.md) — credits and technology used
- [CHANGELOG.md](CHANGELOG.md) — version history
- [NOTICE](NOTICE) — copyright and licensing notice

## Companion article

A companion article about the ideas behind JOSHUA and why this project was released as open source is published on Codemotion.

https://www.codemotion.com/magazine/it/dev-life-it/joshua-e-ora-open-source-gli-arsenali-sono-cambiati-dal-1983-lesito-no/

## A note on realism

The scenarios, factions, and event logs in the war simulation are fictional and written for narrative effect. Nothing here is operational military information, real targeting data, or a claim about actual capabilities or doctrine. The simulation exists to make a point, not to be accurate.

## License

Licensed under the **GNU Affero General Public License v3.0** (`AGPL-3.0-only`). See [LICENSE](LICENSE) for the full text and [NOTICE](NOTICE) for the copyright notice.

Original concept and development by Marco Iannacone, originally published on [pippo.com](https://pippo.com/).

## Status

This is version **0.69.0**, the first public open-source release. The application is playable end to end, with EN/IT localization, automated unit and browser tests, accessibility improvements, and a reproducible build/package workflow.
