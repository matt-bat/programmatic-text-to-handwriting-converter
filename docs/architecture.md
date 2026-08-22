# Architecture

## System shape

Scribble Lab is a static, single-page application. `app.js` maps controls into a normalized profile, coordinates paginated Canvas previews, and handles local file import, profiles, and exports. The document importer, renderer, stroke-font adapter, bundled coordinate data, and profile store remain separate ES modules so deterministic behavior can be tested without a browser.

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
9. Instrument models apply different layer counts, spread, blur, grain, and opacity. Reservoir level adds deterministic thinning and segment dropout.
10. The paper model draws stock color, low-opacity fibers, and optional notebook rules.

The source editor and local `.txt`/`.md` import path accept up to 50,000 grapheme characters. A separate 200,000 UTF-16 code-unit ceiling rejects or truncates pathological combining sequences before they can consume excessive memory. Common Markdown syntax is converted into readable plain-text conventions before rendering: headings lose hash markers, bullet and numbered lists retain visible prefixes, links retain their labels and targets, quotes keep a quote prefix, and fenced code keeps its content.

The document model lays out the full source once, then divides it into fixed 1,100 × 1,424-pixel Letter-proportioned pages. Only the selected page is painted into the live preview, which keeps long documents responsive and bounded. Previous and next controls move through the page model. Fitted and 100 percent modes change only the presentation size.

PDF export takes one stable document snapshot, paints every page into an isolated print document, and then opens the browser print dialog. Editing the source while preparation is underway cannot mix document versions. Print CSS maps each Canvas to one Letter page with explicit page breaks. Prepared canvases are released after printing. This retains the existing stroke-generation method while avoiding unreliable single-canvas dimensions for large documents.

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

## Compatibility

Canvas 2D, ES modules, `Intl.Segmenter`, dialogs, and local storage are supported in current evergreen browsers. A code-point fallback is used if `Intl.Segmenter` is unavailable. A restrictive Content Security Policy allows only same-origin scripts, styles, fonts, and images while blocking runtime connections, frames, workers, media, and objects. The complete browser workflow suite runs against Chromium, Firefox, and WebKit. Runtime network-request tests ensure no remote dependency is introduced.
