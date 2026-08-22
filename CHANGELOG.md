# Changelog

Notable changes to Scribble Lab are recorded here.

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
- Released the project under GNU AGPL version 3 only
