# Changelog

Notable changes to Scribble Lab are recorded here.

## Unreleased

### Added

- Letter, A4, Legal, 5 × 7 card, business-card, and square document formats with matching paged preview and print geometry
- Ruled, grid, off-white printer, colored, ivory, bright, and recycled paper options
- Adjustable document wear with independently selectable crumpling, fold creases, water or coffee stains, and fire or smoke damage
- Line-consistency control for uneven pressure and intermittent pigment transfer
- Optional monochrome scanned-document simulation with adjustable quality
- Offline commercial build-provenance certificate issuance and verification tools
- Corporate licensing contact guidance for organizations that need a more permissive agreement

### Changed

- Letter size now remains independent when Expected Readability or the sample seed changes
- Maximum-readability cursive reduces high-frequency shape and instance variation while preserving seeded writer character
- Live preview now presents the same page stack used for PDF export, with bounded-resolution secondary pages for long documents
- Replaced the previous sage-and-clay interface with a squared print-room visual system using midnight blue, signal orange, registration yellow, and newsprint

### Tests

- Added normalization and geometry coverage for paper, wear, scan, and page-format profiles
- Added browser coverage for randomized damage, fire and smoke, monochrome scan output, line consistency, and paged preview

## 1.0.0, 2026-08-23

First tagged public release.

### Added

- Procedural cursive and non-cursive print writing from bundled vector strokes
- Seeded variation between repeated instances of the same character
- Correlated writer profiles and detailed physical parameter controls
- Expected Readability control for coordinated legibility tuning
- Ballpoint, fountain pen, pencil, marker, and paper material models
- Local parameter profiles without source-text retention
- Plain text and Markdown import up to 50,000 grapheme characters
- Paginated PDF preparation and privacy-safe JSON metadata export
- Responsive keyboard-accessible interface
- Deterministic unit and cross-browser workflow coverage
- Developer contribution guides, roadmap, technical article, and license rationale

### Changed

- Increased maximum readability while retaining the existing 0 to 100 control range and its established behavior through 90 percent
- Reused Unicode segmentation and glyph measurements to reduce long-document style-switch latency
- Relicensed this revised version under PolyForm Noncommercial 1.0.0, with required credit and no licensed commercial or profit-seeking paywalled use
- Clarified that handwriting is generated programmatically from bundled vectors without AI, model inference, or handwriting training data
- Added plain-language warranty, responsibility, and liability guidance that points to the controlling license terms
- Renamed the repository to `programmatic-text-to-handwriting-converter` and clarified its no-AI implementation

### Security

- Added a restrictive browser Content Security Policy and removed the remaining HTML injection sink
- Bounded pathological raw text, combining-mark, and saved-profile processing
- Pinned CI actions to immutable revisions and disabled persisted checkout credentials
- Disabled dependency install scripts in CI and added advisory auditing
- Expanded secret-file ignore rules and repository security automation

### Release hardening

- Kept PDF export bound to one document snapshot during editing
- Preserved intraword underscores during Markdown conversion
- Aligned the editor limit with grapheme-aware character counting
- Kept 50,000-character segmentation memory-bounded on Node.js 20
- Released the current revision under PolyForm Noncommercial 1.0.0
