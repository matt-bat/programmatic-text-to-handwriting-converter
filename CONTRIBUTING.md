# Contributing to Scribble Lab

Thanks for taking the time to help. Useful contributions improve rendering, accessibility, reliability, documentation, privacy, or the identity-free safety boundary.

The focused guides cover the details:

- [Local development](docs/contributing/development.md)
- [Rendering changes](docs/contributing/rendering-changes.md)
- [Documentation changes](docs/contributing/documentation.md)
- [Current roadmap](ROADMAP.md)

## Before opening an issue

1. Search existing issues for the same behavior.
2. Confirm the problem on the latest `main` branch.
3. Do not include private documents, signatures, or handwriting samples.
4. Use private vulnerability reporting for sensitive security concerns.

## Local setup

```bash
npm ci
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
- Exercise affected paper, damage, scan, page-format, writing-style, and readability combinations; compare screenshots with the prior generation when renderer output changes.
- Keep runtime generation local and self-contained.
- Update canonical documentation when behavior changes.
- Do not commit generated PDFs, local profiles, credentials, or test artifacts.

## Features outside project scope

The official project will not accept handwriting uploads, signature generation, writer identification, reference-image conditioning, style extraction from a person, or controls intended to imitate identifiable writing.

By contributing, you agree that your contribution is licensed under the PolyForm Noncommercial License 1.0.0 and that you have the right to submit it. Contributions may be used, modified, and redistributed only for purposes permitted by that license.

If you are unsure whether an idea fits the project, start a GitHub Discussion before writing code. A short conversation can save both you and the maintainers time.
