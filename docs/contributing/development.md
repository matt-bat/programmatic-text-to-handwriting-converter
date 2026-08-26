# Local development

## Setup

You need Node.js 20 or newer, npm, Python 3.10 or newer, and a current browser.

```bash
git clone https://github.com/matt-bat/programmatic-text-to-handwriting-converter.git
cd programmatic-text-to-handwriting-converter
npm ci
npm start
```

Open `http://127.0.0.1:4173`.

The Python process only serves static files. There is no build step or backend service. The application uses browser ES modules and Canvas 2D.

## Main modules

- `src/app.js` connects the interface to the document model and export flow.
- `src/document-import.js` validates and normalizes text and Markdown.
- `src/handwriting-engine.js` handles profiles, layout, seeded variation, page geometry, paper damage, scan simulation, pagination, and drawing.
- `src/stroke-font.js` reads the bundled vector glyph data.
- `src/profile-store.js` stores bounded parameter profiles in the browser.
- `src/readability-control.js` maps the readability control to physical settings.

Read [architecture.md](../architecture.md) before changing module boundaries or the rendering model.

## Tests

Run the fast checks while you work:

```bash
npm run check
```

Install Playwright browsers once, then run the full browser suite:

```bash
npx playwright install chromium firefox webkit
npm run test:browser
```

Add a focused test for changed behavior. A rendering change should normally include a deterministic unit test and a browser test when the user workflow changes.

## Preparing a pull request

1. Keep the branch focused on one problem.
2. Run `npm run check` and the relevant browser tests.
3. Review the app at desktop and narrow mobile widths when the interface changes.
4. Update the canonical documentation for behavior that changed.
5. Explain the result, the tests you ran, and any compatibility concern in the pull request.

Do not commit generated PDFs, local profiles, browser test artifacts, credentials, or private source documents.
