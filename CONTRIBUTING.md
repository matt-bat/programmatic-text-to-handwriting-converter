# Contributing to Scribble Lab

Thank you for helping improve Scribble Lab. Contributions should strengthen natural synthetic variation, accessibility, reliability, documentation, privacy, or the identity-free safety boundary.

## Before opening an issue

1. Search existing issues for the same behavior.
2. Confirm the problem on the latest `main` branch.
3. Do not include private documents, signatures, or handwriting samples.
4. Use private vulnerability reporting for sensitive security concerns.

## Local setup

```bash
npm install
npm start
```

Open `http://127.0.0.1:4173`.

## Validate a change

```bash
npm run check
npm run test:browser
```

Install browser binaries once when needed:

```bash
npx playwright install chromium firefox webkit
```

## Pull request expectations

- Keep changes focused and explain the user-visible result.
- Add the smallest reliable test for changed behavior.
- Preserve deterministic seeded output unless a documented engine version change requires otherwise.
- Preserve keyboard access, responsive layout, and readable control labels.
- Keep runtime generation local and self-contained.
- Update canonical documentation when behavior changes.
- Do not commit generated PDFs, local profiles, credentials, or test artifacts.

## Features outside project scope

The official project will not accept handwriting uploads, signature generation, writer identification, reference-image conditioning, style extraction from a person, or controls intended to imitate identifiable writing.

By contributing, you agree that your contribution is licensed under GNU AGPL version 3 only and that you have the right to submit it.
