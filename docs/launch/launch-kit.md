# Launch kit

These drafts are written for developer communities. Adapt the opening line to the place where you post, answer questions directly, and follow each community's self-promotion rules.

Project: https://github.com/matt-bat/programmatic-text-to-handwriting-converter

Live demo: https://matt-bat.github.io/programmatic-text-to-handwriting-converter/

## Show HN

### Title

Show HN: A no-AI text-to-handwriting converter built with Canvas and seeded vector strokes

### Post

I built a local-first text-to-handwriting converter in vanilla JavaScript. It does not use AI, model inference, or handwriting training data.

The renderer starts with public-domain Hershey vector glyphs, creates a seeded writer profile, deforms each glyph instance, carries motion and pressure state between letters, and draws the result segment by segment with Canvas 2D. The same text, settings, and seed reproduce the same page.

It supports cursive and print, Markdown input, multiple pen and paper models, physical page formats, realistic stain/fold/fire damage, scan simulation, long-document pagination, and PDF export. Everything runs in the browser with no backend or runtime network requests.

I would value feedback on the procedural model, browser compatibility, accessibility, and developer documentation.

Repository: https://github.com/matt-bat/programmatic-text-to-handwriting-converter

Demo: https://matt-bat.github.io/programmatic-text-to-handwriting-converter/

The project is source-available under PolyForm Noncommercial 1.0.0.

## Reddit for JavaScript or web development communities

### Title

I built a deterministic text-to-handwriting renderer with vanilla JavaScript and Canvas 2D

### Post

I have been working on Scribble Lab, a browser-based text-to-handwriting converter that uses no AI or handwriting training data.

The code uses bundled vector glyphs, a seeded pseudo-random number generator, per-character path deformation, and correlated writer state for baseline drift, rotation, scale, and pressure. That gives repeated letters some variation while keeping a consistent writer across the page.

There is no build step or backend. It supports Markdown import, cursive and print, detailed material and document-damage controls, monochrome scan simulation, multi-format pagination, and local PDF export. The test suite covers deterministic output and Chromium, Firefox, and WebKit workflows.

I would appreciate technical feedback, especially around Canvas rendering, deterministic graphics, accessibility, and useful contributor issues.

Repository: https://github.com/matt-bat/programmatic-text-to-handwriting-converter

Live demo: https://matt-bat.github.io/programmatic-text-to-handwriting-converter/

## DEV or Hashnode introduction

### Title

How I built natural handwriting variation without AI

### Summary

Natural-looking handwriting needs more than random jitter. This project combines public-domain vector strokes, a reproducible writer profile, per-glyph deformation, and state that moves gradually between letters. The full renderer runs locally in Canvas 2D with no model or training data.

Use the technical article in `docs/articles/how-programmatic-handwriting-works.md` as the main body. Add the live demo near the beginning and link to the repository at the end.

## Mastodon or Bluesky

I released a local-first text-to-handwriting converter built with vanilla JavaScript and Canvas 2D. It uses seeded vector strokes and correlated procedural variation, not AI or handwriting training data. Cursive, print, document damage, scan simulation, Markdown, and multi-format PDF export are included.

Code: https://github.com/matt-bat/programmatic-text-to-handwriting-converter

Demo: https://matt-bat.github.io/programmatic-text-to-handwriting-converter/

## Directory or newsletter pitch

Programmatic Text-to-Handwriting Converter is a local-first browser project that turns text and Markdown into naturally varied cursive or print pages. It can simulate paper formats, pigment-transfer issues, stains, folds, fire/smoke damage, and monochrome scanning with deterministic JavaScript, public-domain vector strokes, and Canvas 2D. It has no AI model, backend, analytics, or handwriting sample upload. The repository includes cross-browser tests and detailed architecture documentation.

## Posting checklist

1. Confirm the demo and CI are working.
2. Use the real social-preview image or demo animation.
3. State the noncommercial source-available license clearly.
4. Ask for specific technical feedback instead of asking only for stars.
5. Stay available to answer early questions.
6. Record useful feedback as Discussions or issues.
