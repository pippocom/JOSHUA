# JOSHUA Terminal — build & verification targets.
# The canonical version lives in package.json (src/app/version.js is kept in
# sync with it; see tests/unit/version.test.js). Nothing here deploys, uploads,
# or uses credentials.

SHELL := /bin/bash
.PHONY: test check serve build build-pippo pippo.com package clean

# Fast unit/regression suite (Node's built-in runner). No browser.
test:
	npm test

# Full local verification: unit/regression + Chromium + WebKit.
check:
	npm test
	npx playwright test --config=playwright.config.js

# Serve the development source over HTTP (no build step).
serve:
	@echo "Serving src/ at http://localhost:4173/index.html"
	python3 -m http.server 4173 --directory src

# Full reproducible build: standalone + pippo.com trees + build-info.json.
build:
	node tools/build.js build

# pippo.com deployment trees only (EN + IT).
build-pippo:
	node tools/build.js pippo

# Local-only alias for build-pippo. Produces a pippo.com-ready tree;
# it never uploads, deploys, SCPs, or rsyncs anywhere.
pippo.com: build-pippo

# Archive the standalone release artifact (dist/joshua-<version>.tar.gz).
package: build
	node tools/build.js package

# Remove generated dist/ only (never source or tests).
clean:
	node tools/build.js clean
