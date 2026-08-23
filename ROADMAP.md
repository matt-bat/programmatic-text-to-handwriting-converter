# Roadmap

This roadmap lists useful directions for the project. It is not a promise that every item will ship on a fixed date.

## Current priorities

- Keep deterministic rendering stable across Chromium, Firefox, and WebKit.
- Improve documentation for embedding and testing the rendering modules.
- Add repeatable performance measurements for long documents.
- Expand safe character coverage without relying on system fonts.
- Improve page format support while keeping pagination predictable.
- Continue accessibility work for keyboard, screen reader, contrast, and reduced-motion users.
- Make it easier for developers to share generic profiles and reproducible seeds without storing source text.

## Good contribution areas

- Tests for edge cases in grapheme segmentation, Markdown import, and pagination
- Benchmarks and performance tooling
- Clear technical documentation and small examples
- Additional public-domain glyph coverage with documented provenance
- Accessibility fixes with reproducible steps
- Browser compatibility fixes

## Outside the project scope

The official project will not add handwriting or signature uploads, writer matching, style extraction from a person, signature generation, tracing, or identity-conditioned output. It will not add remote generation or a trained handwriting model.

If you want to suggest a roadmap item, start an Ideas discussion. Explain the problem, who it helps, and how it stays within the safety boundary.
