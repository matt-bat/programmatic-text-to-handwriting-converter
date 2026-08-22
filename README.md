<p align="center">
  <img src="src/assets/scribble-lab-mark.svg" width="88" alt="Scribble Lab mark">
</p>

<h1 align="center">Scribble Lab</h1>

<p align="center">
  Natural synthetic handwriting with tunable human variation, generated entirely in your browser.
</p>

<p align="center">
  <a href="https://github.com/matt-bat/scribble-lab/actions/workflows/ci.yml"><img alt="Continuous integration status" src="https://github.com/matt-bat/scribble-lab/actions/workflows/ci.yml/badge.svg"></a>
  <a href="LICENSE"><img alt="AGPL-3.0-only license" src="https://img.shields.io/badge/license-AGPL--3.0--only-6f5bd3"></a>
  <a href="https://ko-fi.com/matt0bat"><img alt="Support on Ko-fi" src="https://img.shields.io/badge/support-Ko--fi-f28c6f"></a>
</p>

## Intent and safety

Scribble Lab helps people generate natural-looking handwritten documents in cursive and print styles. Its procedural algorithm is designed to introduce the kinds of controlled variation found between repeated instances of the same character. Writer profiles, readability controls, physical parameters, pen models, grip characteristics, and paper styles make it possible to explore distinct synthetic writing systems without reducing the output to a repeated font.

The application is intentionally identity-free. It does not accept handwriting samples, font files, images, signatures, author labels, or other material that could condition the generator on a real person. It does not provide tracing, writer matching, signature generation, or style extraction. Text and Markdown are processed locally in the browser, and saved profiles contain parameters only.

Please use Scribble Lab for synthetic document creation, education, accessibility work, design exploration, and privacy-conscious optical character recognition testing. Do not use it to impersonate a person, reproduce a signature, misrepresent authorship, or create deceptive documents. Read the complete [safety policy](SAFETY.md) before proposing a new input or identity-related feature.

> If Scribble Lab is useful to you, you can [support its continued development on Ko-fi](https://ko-fi.com/matt0bat). Support is optional and helps Matthew Bateman maintain the project.

## What makes it different

- Cursive and non-cursive print use distinct bundled vector constructions.
- Every character instance receives seeded geometric deformation.
- Correlated writer state preserves overall consistency across a sample.
- Repeated letters vary without losing their recognizable construction.
- Expected Readability coordinates several physical parameters through one approachable control.
- Detailed controls model speed, pressure, grip tension, wrist angle, slant, spacing, connection, and reservoir level.
- Ballpoint, fountain pen, pencil, and marker models respond differently along each stroke.
- Parameter profiles can be saved locally without retaining source text.
- Plain text and common Markdown structures can be imported up to 50,000 grapheme characters.
- Long documents paginate into Letter-proportioned pages for PDF export.
- The same seed and parameters reproduce the same synthetic document across supported browsers.

## Preview

| Desktop workspace | Hand motion controls |
|:---:|:---:|
| ![Scribble Lab desktop workspace](docs/screenshots/scribble-lab-desktop.png) | ![Scribble Lab hand motion controls](docs/screenshots/scribble-lab-motion-controls.png) |

![Scribble Lab materials and stroke construction](docs/screenshots/scribble-lab-materials.png)

<p align="center">
  <img src="docs/screenshots/scribble-lab-mobile.png" width="390" alt="Scribble Lab mobile layout">
</p>

## Run locally

You need Node.js 20 or newer, npm, Python 3.10 or newer, and a current browser.

```bash
git clone https://github.com/matt-bat/scribble-lab.git
cd scribble-lab
npm install
npm start
```

Open `http://127.0.0.1:4173`.

The browser runtime has no framework, API, database, account, analytics service, external font request, or required environment variable.

## Create handwriting

1. Type or paste text into the source pane. You can also open a `.txt`, `.md`, or `.markdown` file.
2. Choose Cursive or Print.
3. Move Expected Readability for a coordinated result, or tune the detailed motion and material controls.
4. Select New sample to generate a different seeded writer.
5. Save useful parameter combinations as local profiles.
6. Select Export PDF, then choose Save as PDF in the browser print dialog.

Markdown headings, lists, task markers, links, quotes, tables, emphasis, and fenced code are converted into conventions that a person could naturally write by hand.

## Privacy model

- Source text stays in the current browser page.
- Rendering occurs with local Canvas 2D code.
- Profiles use browser storage and contain generic parameters only.
- Export metadata records counts and generator settings, not source text.
- The runtime makes no external network requests.
- No handwriting or identity reference can be uploaded.

Generated PDF files contain the text you supplied. Store and share those files according to the sensitivity of that text.

## Validate the project

Run the syntax and deterministic unit checks:

```bash
npm run check
```

Run the complete browser workflow suite:

```bash
npx playwright install chromium firefox webkit
npm run test:browser
```

The browser suite covers Chromium, Firefox, and WebKit. It checks writing-style differences, seeded repeatability, repeated-letter variation, parameter sensitivity, Markdown import, 50,000-character pagination, PDF preparation, responsive layout, keyboard navigation, metadata privacy, local-only runtime behavior, and automated WCAG A and AA rules.

## Project map

```text
index.html                   Application shell and accessible controls
src/app.js                   UI state, document preview, profiles, and PDF preparation
src/document-import.js       Text and Markdown validation and readable formatting
src/handwriting-engine.js    Deterministic pagination and physical stroke simulation
src/stroke-font.js           Bundled vector glyph parsing and measurement
src/assets/                  Public-domain stroke data and project graphics
src/profile-store.js         Bounded browser profile persistence
src/styles.css               Responsive Spatial Canvas visual system
tests/                       Unit and cross-browser workflow tests
docs/architecture.md         Rendering, privacy, and compatibility design
docs/operations.md           Local operation and verification details
```

## Contributing

Bug reports, accessibility improvements, tests, documentation, and identity-free rendering improvements are welcome. Features that ingest or imitate a real person’s handwriting or signature are outside the project scope and will not be accepted.

Read [CONTRIBUTING.md](CONTRIBUTING.md), [SAFETY.md](SAFETY.md), and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) before opening a pull request. Report sensitive security concerns through the private reporting instructions in [SECURITY.md](SECURITY.md).

## License and credit

Copyright © 2026 Matthew Bateman.

Scribble Lab is free software licensed under [GNU AGPL version 3 only](LICENSE). You may use, study, share, and modify it under that license. Copyright and license notices must remain intact. Modified network services must offer their corresponding source code to users.

The bundled Hershey coordinate data is public domain and documented separately in [THIRD_PARTY_ASSETS.md](THIRD_PARTY_ASSETS.md). See [NOTICE.md](NOTICE.md) for attribution and project identity details.
