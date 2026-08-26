# Roadmap

This roadmap lists useful directions for the project. It is not a promise that every item will ship on a fixed date.

## Current priorities

- Keep deterministic rendering stable across Chromium, Firefox, and WebKit.
- Improve documentation for embedding and testing the rendering modules.
- Add repeatable performance measurements for long documents.
- Expand safe character coverage without relying on system fonts.
- Keep Letter, A4, Legal, card, business-card, and square pagination predictable across browsers.
- Evaluate opt-in ground-truth, image export, degradation masks, and batch-generation workflows for synthetic OCR datasets without weakening the privacy boundary.
- Continue accessibility work for keyboard, screen reader, contrast, and reduced-motion users.
- Make it easier for developers to share generic profiles and reproducible seeds without storing source text.

## OCR dataset readiness audit

The current renderer can create deterministic paginated handwriting with paper, pigment-transfer, physical-damage, and scan variation. A review of the complete workflow identified the following high-value gaps for serious synthetic OCR dataset production. These are candidates, not features in the current release.

1. **Ground truth and spatial labels:** opt-in source retention for a dataset run, plus page/line/word/glyph boxes, baselines, reading order, and explicit masks for ink, stains, soot, folds, and genuinely occluded text. Consider hOCR, ALTO XML, PAGE XML, and a compact JSON format before choosing an interchange contract.
2. **Lossless image export:** per-page PNG and TIFF output with declared DPI, color mode, and exact pixel geometry. PDF remains useful for documents but is not enough for most OCR pipelines.
3. **Batch and split generation:** a local CLI or worker-based batch runner with parameter ranges, manifest files, reproducible seed allocation, progress/cancellation, and leakage-resistant train/validation/test splits.
4. **Capture degradation:** adjustable skew, perspective, crop, rotation, defocus and motion blur, resampling, compression, thresholding, uneven illumination, shadows, bleed-through, scanner bands, and partial page edges. Each transformation should be recorded in ground truth.
5. **Document structure:** multi-column notes, forms, tables, labels, marginalia, strike-throughs, corrections, checkboxes, stamps, and mixed printed/handwritten regions with reliable reading-order labels.
6. **Coverage reporting:** explicit supported-character reports, deterministic fallback flags, broader public-domain glyph sources, and script/language validation before claiming multilingual dataset support.

Any dataset workflow should preserve the identity-free boundary: no handwriting uploads, signature generation, writer matching, or conditioning on a real person's writing.

## Good contribution areas

- Tests for edge cases in grapheme segmentation, Markdown import, pagination, damage composition, and scan simulation
- Benchmarks and performance tooling
- Clear technical documentation and small examples
- Additional public-domain glyph coverage with documented provenance
- Accessibility fixes with reproducible steps
- Browser compatibility fixes

## Outside the project scope

The official project will not add handwriting or signature uploads, writer matching, style extraction from a person, signature generation, tracing, or identity-conditioned output. It will not add remote generation or a trained handwriting model.

If you want to suggest a roadmap item, start an Ideas discussion. Explain the problem, who it helps, and how it stays within the safety boundary.
