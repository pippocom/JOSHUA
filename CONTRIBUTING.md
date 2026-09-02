# Contributing to JOSHUA Terminal

Thanks for considering a contribution. This document explains how the project is organized, how to run the tests and builds, and what new code should preserve.

## Issues and pull requests

- Open an issue for bugs, questions, or proposals before starting significant work, so the approach can be discussed first.
- Pull requests are welcome directly. If your change is small and self-contained (a fix, a small localization correction, a test), feel free to open the PR without a preceding issue.
- Contributions are naturally most useful when made against this upstream repository, so fixes and improvements can benefit everyone using it — but nothing in the license requires you to contribute back to a fork you maintain independently.

## Local setup

The app has no runtime dependencies and no build step to run it. You need Node.js (for the tests and build tooling, currently Node 20+) and a way to serve static files over HTTP.

```sh
npm install          # installs Playwright, the only dev dependency
make serve           # serves src/ at http://localhost:4173
```

Then open `http://localhost:4173/index.html`.

## Running the tests and builds

```sh
make test            # unit/regression tests (fast, Node's built-in runner)
make check           # unit + Chromium + WebKit browser suites
make build           # dist/standalone/ + dist/pippo.com/ + dist/build-info.json
make package         # dist/joshua-<version>.tar.gz
```

Focused browser runs:

```sh
npx playwright test --project=chromium            # Chromium only
npx playwright test --project=webkit              # WebKit only
npx playwright test tests/browser/accessibility.spec.js
npx playwright test --config=playwright.build.config.js   # build smoke tests (after make build)
```

Please run `make check` before submitting a change that touches the UI, audio, timing, or accessibility — behavior (especially around autoplay policy and speech synthesis) can differ between engines, and WebKit here is Playwright's own WebKit build, used as a reasonable proxy for Safari-like behavior rather than a guarantee of identical results on real Safari.

## Project structure

See [ARCHITECTURE.md](ARCHITECTURE.md) for a full description. In brief:

- `src/app/` — entrypoint (`game.js`), boot/final sequences, presentation, version.
- `src/data/` — shared localized content and war/scenario data.
- `src/games/`, `src/war/`, `src/audio/` — pure game/war/audio modules.
- `src/dev/` — development-only `media-lab.html` (never linked from the app).
- `tests/unit/`, `tests/browser/`, `tests/build/` — unit, source browser, and build smoke tests.
- `tools/build.js`, `Makefile`, `playwright*.config.js`, `.github/workflows/ci.yml`.

## Things new code must preserve

- **WarGames fidelity.** Preserve the intended interaction and presentation of JOSHUA unless deliberately improving behavior.
- **EN/IT content parity.** User-facing strings live in `src/data/content.en.js` / `content.it.js` and must exist in both languages with matching shape (`tests/unit/contentParity.test.js` enforces this). `SPLASH_TEXT` in `game.js` is standalone-shell-only. If you add text, add both languages.
- **displayText vs. spokenText.** On-screen text is retro uppercase; spoken text (Web Speech API) is normal sentence case, because some voices misread all-caps. Keep them separate.
- **Optional APIs degrade silently.** Web Audio and Web Speech can be unavailable, restricted, or slow to populate (`speechSynthesis.getVoices()`). Code that uses them must never block the app waiting on them.
- **Accessibility.** Keep the terminal/event log out of `aria-live`; announce only meaningful state changes through the `role="status"` live region. Keep the war-map SVG decorative (`aria-hidden`), keyboard/focus behavior sane, and `prefers-reduced-motion` respected.
- **CSP.** The app ships `Content-Security-Policy: default-src 'self'`. Don't add external origins or inline scripts/styles.
- **No secrets, no deployment.** Never add credentials, server paths, or deployment steps to code or docs.

## Content boundaries

This project is an anti-war tribute told through a game, not a military simulation. Please don't submit changes that add real-world operational military data, realistic targeting information, or anything that would turn the tribute into something that could be read as an operational tool. Fictional, narrative content in the spirit of the existing scenarios is welcome.

## Code style

- Plain client-side JavaScript; no framework, no bundler, no runtime dependencies. If a change seems to need a framework or build step, discuss it in an issue first.
- No generic dumping-ground `utils.js`; extract a helper only when it has one clear responsibility and real ownership benefit.
- Comment *why* and document invariants, not what the syntax already says.

## Contributions especially welcome

- Interface and usability improvements
- Accessibility improvements
- Support for a wider range of devices and screen sizes
- New localizations, or corrections to the existing ones
- Tests, including edge cases not yet covered
- Code-quality improvements that increase readability without changing behavior
- Narrative or technical ideas that stay consistent with the project's anti-war intent

## Commits and pull requests

- Keep commits focused; a PR that does one thing is easier to review than one that does five.
- Write commit messages and PR descriptions that explain *why*, not just *what*.
- Make sure `make check` passes before opening a PR (or note clearly in the PR if something can't be run in your environment and why).
- By submitting a contribution, you agree to license it under the project's license, **AGPL-3.0-only**.
