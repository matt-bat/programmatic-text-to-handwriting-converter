# Changelog

Notable changes to Scribble Lab are recorded here.

## Unreleased

### Changed

- Increased maximum readability while retaining the existing 0 to 100 control range and its established behavior through 90 percent
- Reused Unicode segmentation and glyph measurements to reduce long-document style-switch latency
- Relicensed this revised version under PolyForm Noncommercial 1.0.0, with required credit and no licensed commercial or profit-seeking paywalled use
- Clarified that handwriting is generated programmatically from bundled vectors without AI, model inference, or handwriting training data
- Added plain-language warranty, responsibility, and liability guidance that points to the controlling license terms

### Security

- Added a restrictive browser Content Security Policy and removed the remaining HTML injection sink
- Bounded pathological raw text, combining-mark, and saved-profile processing
- Pinned CI actions to immutable revisions and disabled persisted checkout credentials
- Disabled dependency install scripts in CI and added advisory auditing
- Expanded secret-file ignore rules and repository security automation

## 1.0.0, 2026-08-22

Initial public release.

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

### Release hardening

- Kept PDF export bound to one document snapshot during editing
- Preserved intraword underscores during Markdown conversion
- Aligned the editor limit with grapheme-aware character counting
- Kept 50,000-character segmentation memory-bounded on Node.js 20
- Released the project under GNU AGPL version 3 only
