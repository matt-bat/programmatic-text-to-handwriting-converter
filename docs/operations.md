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

The browser suite runs the same workflows in Chromium, Firefox, and WebKit. It covers live conversion, Markdown and text file import, grapheme-aware pagination through 50,000 characters, paged preview and stable multi-page PDF preparation, paper geometry, randomized stain and fire damage, monochrome scan output, bitmap and construction variation, style-aware readability presets and their maximum-clarity endpoint, parameter and seed changes, repeated-letter consistency, profile persistence, JSON download, approachable metadata summaries, metadata privacy, preview zoom, mobile editor and preview shortcuts, responsive control layout, keyboard tab navigation, self-contained runtime requests, and automated WCAG A and AA checks across every tab and the metadata dialog. Failure traces and screenshots are written below `test-results/` and are ignored by version control.

Reviewed desktop, motion-control, materials/damage, scanned-document, paginated-preview, maximum-readability cursive, and mobile screenshots are retained in `docs/screenshots/` and linked from the README. The live preview renders its first, selected, and nearby pages on demand so long documents remain bounded; PDF preparation still renders every export page at full resolution from one stable snapshot.

## Browser prerequisite

If Playwright reports that its executable does not exist, install the pinned Chromium runtime:

```bash
./node_modules/.bin/playwright install chromium firefox webkit
```

## Recovery

The app has no server-side state. To reset saved profiles, clear site data for `127.0.0.1:4173` in the browser. Reinstalling dependencies is recoverable by deleting `node_modules` and running `npm install`. Source files are unaffected.

## Release boundary

This repository contains a static browser application and automated validation. It has no deployment workflow, analytics, backend service, or remote storage integration.
