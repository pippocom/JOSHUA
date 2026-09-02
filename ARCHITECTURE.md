# Architecture

This document describes how JOSHUA Terminal is built, how it runs, and how its
pieces fit together. It is a developer-oriented overview, not an API reference.

## Overall structure

The application is a single-page, client-side web app with no framework, no
bundler, and no runtime dependencies. All code is plain browser JavaScript
loaded by `<script>` tags in a fixed order from `src/index.html`.

```
src/
  index.html             single-document app: splash screen + game, no navigation
  app/
    game.js              entrypoint: DOM, command handling, game routing, war orchestration
    bootSequence.js      the narrated boot (prelude → greeting → play prompt)
    finalSequence.js     the closing "STRANGE GAME / chess" beat
    presentation.js      the single presentation-speed factor (typing + TTS rate)
    version.js           canonical runtime version (semver + display form)
  data/
    content.en.js/.it.js shared localized runtime content (window.JOSHUA_CONTENT_*)
    nodes.js             named launch/target/city sites for the war map
    scenarios.js         faction/scenario catalog (id, faction, title, briefing)
    warStrategyProfiles.js per-scenario escalation narrative (phases + strikes)
    warRoutes.js         GLOBAL_WORLD_PAIRS launch/target pairs for the final wave
    warViews.js          camera/zoom presets (SCENARIO_VIEWS + WORLD_VIEWS)
    warCityRegions.js    city targets grouped by region for the "storm" phases
    ticTacToeZeroSequences.js precomputed draw sequences for zero-player mode
  games/
    ticTacToeEngine.js   pure tic-tac-toe rules + WOPR move selection
    hangmanEngine.js     pure hangman state/rules
    sudokuEngine.js      pure Sudoku parsing/state/rules
  war/
    warModel.js          pure statistics/casualty model for the simulation
    warMap.js            SVG renderer for the war map (projection, arcs, impacts)
  audio/
    audioManager.js      Web Audio controller (boot noise, crash, mark beeps, mute)
    speech.js            Web Speech (TTS) coordinator + typewriter reveal
    warSoundscape.js     procedural war sound layer (launches, impacts, bursts)
  styles/
    joshua.css           all styling, animations, and accessibility rules
  assets/maps/world.svg  the static world map image
  dev/
    media-lab.html/.js   development-only audio/voice audition page (unlinked)

tests/
  unit/*.test.js         Node's built-in runner; pure logic + source-canonical guards
  browser/*.spec.js      Playwright end-to-end tests against src/
  build/build.spec.js    Playwright smoke tests against generated dist/ builds

tools/build.js           deterministic static-copy build + build-info.json + package
Makefile                 build/verify/package targets (see "Build architecture")
playwright.config.js     source browser suite (serves src/)
playwright.build.config.js build smoke suite (serves dist/)
.github/workflows/ci.yml GitHub Actions CI (unit + browsers + build + smoke)
```

## Runtime flow

1. **Splash / boot.** The page opens on a credits splash screen. Clicking
   **BOOT JOSHUA TERMINAL** synchronously unlocks Web Audio (inside the click,
   before any `await`) and starts the boot sequence: a technical prelude
   (typed, no voice), a synthesized boot-noise effect, then the greeting and
   play-prompt (typed and spoken), then the menu.

2. **Language / content selection.** The active language is chosen from the
   `?lang` query parameter (default English), then used to pick
   `window.JOSHUA_CONTENT_EN` or `window.JOSHUA_CONTENT_IT` as `C`. A
   pippo.com build may instead supply `window.JOSHUA_BUILD` (see below).

3. **Command handling.** `game.js` reads one command at a time and routes it:
   menu commands (`HELP`, `GAMES`, `ASK ME SOMETHING`, `CLEAR`, `EXIT`), the
   numeric menu shortcuts (`1`/`2`/`3`), and game names resolved through
   `GAME_ALIASES` (exact match after case/whitespace normalization — never
   substring).

4. **Game routing.** `startGame()` dispatches to `startTic`, `startHang`,
   `startSudoku`, or `startWarSelectFaction`. Game *rules* live in the pure
   engine modules; `game.js` keeps lifecycle, rendering, and localized feedback.

5. **War simulation.** `runScenario()` orchestrates a narrative escalation: it
   walks the strategy profile's phases, animates strikes on the map, updates the
   casualty/status model, drives the soundscape, then shows a report and (after
   `WarModel.REQUIRED_WAR_RUNS` completed scenarios) the closing sequence.

6. **Presentation / audio / TTS.** The Web Audio effects (boot noise, crash,
   marks, war soundscape) and Web Speech narration are optional APIs wrapped so
   they degrade silently and never block the app. On-screen text is retro
   uppercase; spoken text is sentence case (kept separate because some voices
   misread all-caps).

7. **Return behavior.** `EXIT` and the final screen's return button call
   `returnToSplash()`, which (in the standalone build) returns to the same
   document's splash; a pippo.com build navigates to its configured home path.

## Content ownership

- `data/content.en.js` / `data/content.it.js` are the **shared localized
  runtime content** (menu, help, game strings, war strings, sound labels).
  They must stay in EN/IT parity (enforced by `tests/unit/contentParity.test.js`).
- **Localization boundary:** user-interface chrome — labels, prompts, controls,
  game statuses, report labels *and* report outcome values — is localized in
  `content.*.js`. Selected in-fiction military-system output (scenario titles
  and briefings, strategy phase/log narrative, and event-log prefixes such as
  `US CITY` / `EU CITY` / `POLAR NODE` / `TARGET`) is deliberately kept in
  English as part of the JOSHUA/WarGames presentation; that untranslated
  in-fiction text is intentional, not localization drift.
- `SPLASH_TEXT` in `game.js` is **standalone-shell-only** content: the splash
  credits copy and the standalone return label. It is deliberately not part of
  the shared content modules.
- A pippo.com build adds a generated `buildConfig.js` that sets
  `window.JOSHUA_BUILD` (default language, cross-path language target, return
  path/label); the standalone build ships no such file.
- The version comes from `package.json` (canonical) and is mirrored in
  `app/version.js` for display; `tests/unit/version.test.js` forbids hardcoding
  it anywhere else under `src/`.

## War architecture

The war simulation splits data from logic from rendering:

- `scenarios.js` — catalog metadata only (`id`, `faction`, `title`, `briefing`).
- `warStrategyProfiles.js` — the per-scenario escalation narrative
  (`local`/`first`/`second`/`global` phases with `log` and `strikes`).
- `warRoutes.js` — `GLOBAL_WORLD_PAIRS` used uniformly for the final wave.
- `warViews.js` — camera framing (`SCENARIO_VIEWS`, `WORLD_VIEWS`).
- `warModel.js` — pure statistics: tolls, casualty caps, report composition,
  and `REQUIRED_WAR_RUNS` (the single source of truth for how many completed
  scenarios trigger the closing sequence).
- `warMap.js` — SVG projection/arcs/impacts; receives DOM, timer, and hooks
  explicitly and knows nothing about language or orchestration.
- `game.js` — orchestration (`runScenario`), which **fails loudly** if a
  scenario id is missing its strategy profile or camera view rather than
  silently substituting another scenario's data.

## Accessibility architecture

- A single visually-hidden `role="status"` live region (`#liveStatus`) is the
  only announcement channel. `game.js` writes meaningful state transitions to it
  (menu ready, game result, war report, error recovery). The terminal output and
  the war event log are deliberately **not** `aria-live`: announcing every typed
  character, trajectory, or impact would flood screen readers.
- The war-map SVG overlay is `aria-hidden="true"` (decorative); the meaningful
  state lives in the STATUS panel, the EVENT LOG text, and the live region.
- Keyboard/focus: the boot button receives focus on load, the command input is
  focused on the menu and has a localized `aria-label`, `:focus-visible` styling
  provides a visible focus ring, and MUTE exposes `aria-pressed`.
- `prefers-reduced-motion: reduce` disables the flashing overheat flicker, the
  trajectory dash animation, and the map pan/zoom transition (logical game and
  simulation timing are unaffected).
- **Limitation:** these improvements have not been validated with a real
  screen reader or other assistive technology, and no WCAG conformance level is
  claimed.

## Error model

- Errors are handled by **local boundaries**: `runScenario()` has a try/catch
  that turns a bad geographic reference or missing configuration into a
  "SIMULATION ERROR" message and returns to the menu; boot/audio/speech use
  real-timer safety nets so an unavailable or stuck optional API can never
  freeze the app.
- There is deliberately **no global fatal-error handler**: a fatal script or
  runtime failure is a build/deployment error that already surfaces in the
  browser console and in the test suite (which asserts zero page errors), and a
  single-document app has no meaningful in-app recovery to offer.

## Build architecture

The build is a deterministic static copy — no bundler, no transpilation:

- `make build` runs `tools/build.js build`, which copies `src/` (minus
  `src/dev/`) to `dist/standalone/`, and to the EN and IT pippo.com trees
  (`dist/pippo.com/human-systems/interactive-fiction/joshua/` and
  `dist/pippo.com/it/human-systems/interactive-fiction/joshua/`), injecting a
  generated `buildConfig.js` into the pippo trees and writing
  `dist/build-info.json` (version, commit, build time, build types, branch).
- `make package` archives `dist/standalone/` as `dist/joshua-<version>.tar.gz`.
- The build performs **no** deployment: it never uploads, SCPs, rsyncs, or
  uses credentials. `make pippo.com` is a local-only alias of `make build-pippo`.
- The standalone build is servable from any static host; all asset references
  are same-origin and the CSP `default-src 'self'` applies unchanged.
