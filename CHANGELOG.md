# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.69.1] - 2026-09-15

Mobile warning on the initial splash screen.

- Show a warning on the initial splash screen for Android/iOS/mobile/touch devices
- The warning supports Italian locale detection

## [0.69.0] - 2026-08-29

First public open-source release of JOSHUA Terminal.

- Standalone single-document application (splash screen and game in one page) preserving the recognizable *WarGames* behavior, wording, and presentation
- English and Italian localization, switchable from the splash screen
- Retro terminal interface with a small command set (HELP, GAMES, ASK ME SOMETHING, PLAY, CLEAR, EXIT)
- TIC-TAC-TOE (including a "zero players" mode), HANGMAN, and SUDOKU
- GLOBAL THERMONUCLEAR WAR simulation, with faction/scenario selection, a world-map visualization, and a scrolling event log
- Spoken narration via the Web Speech API, with graceful fallback when unavailable
- Procedurally synthesized sound effects and a synchronized war soundscape via the Web Audio API (no audio files)
- Mute/unmute controls for narration and sound effects
- Accessibility improvements: keyboard navigation and focus management, accessible control labels, a restrained screen-reader live region, and `prefers-reduced-motion` support
- Reproducible build and packaging workflow (Makefile) producing a standalone build and pippo.com deployment trees
- Automated unit/regression tests, Chromium and WebKit browser suites, and build smoke tests, plus a GitHub Actions CI workflow
