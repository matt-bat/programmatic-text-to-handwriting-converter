# Architecture

## System shape

Scribble Lab is a static, single-page application. `app.js` maps controls into a normalized profile, coordinates paginated Canvas previews, and handles local file import, profiles, and exports. The document importer, renderer, stroke-font adapter, bundled coordinate data, and profile store remain separate ES modules so deterministic behavior can be tested without a browser.

Generation is entirely programmatic. The runtime contains no artificial-intelligence model, machine-learning library, training pipeline, inference call, prompt service, or handwriting dataset. JavaScript combines bundled vector coordinates with seeded mathematical transformations and Canvas 2D drawing commands.

## Synthetic handwriting model

The engine starts from bundled public-domain Hershey Simplex Script, Complex Script, or Simplex Sans vectors and changes their stroke shapes, placement, and material appearance procedurally. The script faces provide cursive writing. The sans face provides non-cursive print writing.

1. A seeded pseudo-random generator makes a sample reproducible.
2. Grapheme-aware, word-preserving layout wraps text and preserves explicit line breaks. Only genuinely overlong tokens fall back to character wrapping.
3. Each glyph instance receives a seeded, correlated deformation of its individual stroke points and curves. Repeated letters therefore retain the same recognizable construction without repeating identical geometry.
4. A correlated writer state carries baseline position, rotation, width, height, and pressure phase from one glyph to the next. This creates muscle-like continuity instead of unrelated per-letter noise.
5. Speed, shakiness, grip tension, wrist support, paper roughness, and instrument type alter jitter and drift coefficients.
6. Wrist angle and natural slant produce controlled rotation and shear.
7. In cursive mode, a speed-sensitive connection probability can add curved joining strokes between adjacent letters and numbers. Print mode deliberately suppresses those connectors.
8. Every vector path is traversed as physical pen segments. Pressure, line width, density, directional fountain-nib response, and micro-motion are recalculated along those segments.
9. Instrument models apply different layer counts, spread, blur, grain, and opacity. Reservoir level and line consistency add deterministic thinning, uneven transfer, and segment dropout.
10. The paper model draws ruled, grid, printer, colored, ivory, bright, or recycled stock. Independently selectable seeded layers model crumpling, fold creases, water and coffee stains, soot, heat discoloration, and edge burn-through. Foreground damage may occlude ink at higher wear settings.
11. Optional scan simulation converts the composed page to monochrome with quality-dependent contrast, noise, and scanner streaks.

The source editor and local `.txt`/`.md` import path accept up to 50,000 grapheme characters. A separate 200,000 UTF-16 code-unit ceiling rejects or truncates pathological combining sequences before they can consume excessive memory. Common Markdown syntax is converted into readable plain-text conventions before rendering. Primary headings receive handwritten underlines, bullet and numbered lists retain visible prefixes, links retain their labels and targets, quotations receive paired quotation marks, and fenced code keeps its content.

The Expected Readability control retains its 0 to 100 range while letter size remains independent. The final clarity range increases line height, spacing, stroke stability, and ink continuity while reducing slant, wrist offset, pressure variation, cursive connections, and high-frequency cursive deformation. Seeded writer proportions and bounded per-instance letter variation remain active at the maximum.

The document model lays out the full source once, then divides it into the selected Letter, A4, Legal, 5 × 7 card, business-card, or square geometry. A shared Unicode segmenter and document-local glyph-width cache avoid repeated setup and measurement work when long documents are rebuilt after a style change. The live preview presents the same page stack used for export; secondary pages use a bounded preview scale for long documents. Previous and next controls scroll through that stack. Fitted and 100 percent modes change only the presentation size.

PDF export takes one stable document snapshot, paints every page into an isolated print document, and then opens the browser print dialog. Editing the source while preparation is underway cannot mix document versions. Print CSS maps each Canvas to the selected physical page dimensions with explicit page breaks. Prepared canvases are released after printing. This retains the existing stroke-generation method while avoiding unreliable single-canvas dimensions for large documents.

The renderer never calls a system font. Printable ASCII paths are bundled directly. Smart punctuation maps to equivalent strokes, common decomposed Latin diacritics add procedural accent paths, and unsupported symbols use a deterministic question-mark fallback. Accent processing is bounded per grapheme so malformed combining sequences cannot create unbounded stroke work. This keeps geometry reproducible across operating systems and browser engines.

## Non-identification boundary

The application deliberately has no route for conditioning the generator on an individual:

- no handwriting, image, or font uploads because local file import accepts text and Markdown only
- no signature mode
- no author or identity labels
- no similarity score, matching, tracing, or style extraction
- no remote API or model call

Saved profiles contain only generic physical parameters, writing style, stroke construction, and a seed. JSON metadata contains only the source character count, page count, output dimensions, engine/stroke model settings, and explicit false values for identity conditioning and external sample use. It never contains the source string.

## Persistence and privacy

Only saved profiles use `localStorage`, under `scribble-lab.profiles.v1`, with a maximum of 12 normalized entries and a 64,000 code-unit storage ceiling. Source text remains in the current page's memory. Export is initiated by the user and stays within normal browser download handling.

## Commercial build provenance

The public build exports a companion JSON record with a `not-issued` provenance status. A commercial distribution can replace `src/commercial-provenance.js` with a certificate module generated by `scripts/issue-provenance-certificate.mjs`. The issuer signs a small build certificate using an offline Ed25519 private key. The generated module contains only the certificate, signature, and public verification key. The application adds that record to the companion JSON export without retaining source text or making a network request.

`scripts/verify-provenance-certificate.mjs` checks a retained JSON record offline. The certificate proves that its included build claims were signed by the matching private key; it does not prevent removal, prove that an unrelated file was produced by the app, or trace browser-generated PDFs after metadata is separated.

## Compatibility

Canvas 2D, ES modules, `Intl.Segmenter`, dialogs, and local storage are supported in current evergreen browsers. A code-point fallback is used if `Intl.Segmenter` is unavailable. A restrictive Content Security Policy allows only same-origin scripts, styles, fonts, and images while blocking runtime connections, frames, workers, media, and objects. The complete browser workflow suite runs against Chromium, Firefox, and WebKit. Runtime network-request tests ensure no remote dependency is introduced.
