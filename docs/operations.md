# Operations

## Local start

```bash
npm ci --ignore-scripts
npm start
```

The start command serves the project at `http://127.0.0.1:4173`. There are no environment variables or external services.

## Verification order

Run syntax checks and deterministic unit tests first:

```bash
npm run check
```

Verify the locked dependency advisory report and registry signatures:

```bash
npm audit --audit-level=high
npm audit signatures
```

Run the browser-visible workflow tests second:

```bash
npm run test:browser
```

The browser suite runs the same workflows in Chromium, Firefox, and WebKit. It covers live conversion, Markdown and text file import, grapheme-aware pagination through 50,000 characters, stable multi-page PDF preparation, bitmap and construction variation, readability presets, parameter and seed changes, repeated-letter consistency, profile persistence, JSON download, metadata privacy, preview zoom, responsive control layout, keyboard tab navigation, self-contained runtime requests, and automated WCAG A and AA checks across every tab and the metadata dialog. Failure traces and screenshots are written below `test-results/` and are ignored by version control.

Reviewed desktop, motion-control, and mobile screenshots are retained in `docs/screenshots/` and linked from the README.

## Browser prerequisite

If Playwright reports that its executable does not exist, install the pinned Chromium runtime:

```bash
./node_modules/.bin/playwright install chromium firefox webkit
```

## Recovery

The app has no server-side state. To reset saved profiles, clear site data for `127.0.0.1:4173` in the browser. Reinstalling dependencies is recoverable by deleting `node_modules` and running `npm install`. Source files are unaffected.

## Release boundary

This repository contains a static browser application and automated validation. It has no deployment workflow, analytics, backend service, or remote storage integration.
