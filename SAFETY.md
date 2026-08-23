# Safety policy

## Purpose

Scribble Lab creates synthetic handwriting from text through generic procedural controls. It is intended for document design, education, accessibility work, and privacy-conscious optical character recognition development and testing.

The official application is designed to create varied synthetic writing without learning, copying, identifying, or reconstructing the writing of a real person.

## Programmatic generation without AI

Scribble Lab uses deterministic JavaScript, bundled public-domain vector strokes, seeded pseudo-random values, and Canvas drawing commands. It does not use artificial intelligence, machine learning, a trained model, prompt-based generation, remote inference, or a handwriting dataset. No part of the output is learned from an uploaded or existing person's handwriting.

## Identity-free boundary

The official project does not include:

- handwriting, signature, image, or font uploads
- reference-image conditioning
- signature generation or tracing
- writer identification or similarity scoring
- author labels or identity profiles
- personal style extraction
- remote processing of source text or generated pages

Saved profiles contain only generic generator parameters. They do not contain source text, handwriting examples, biometric templates, or identity labels.

## Responsible use

Use Scribble Lab only where synthetic writing is appropriate. Do not use it to impersonate another person, reproduce a signature, misrepresent authorship, falsify records, bypass identity checks, or create deceptive evidence.

The project does not claim that generated material is suitable as the sole data source for a production recognition benchmark. Synthetic output should be evaluated alongside appropriately collected and licensed material.

## User responsibility and disclaimer

The software and generated output are provided as is. No guarantee is made that output is accurate, readable, legally suitable, authentic, fit for a particular purpose, or accepted by another person or system. Users are responsible for their input text, generated files, legal and policy compliance, and any claims or representations they make using the output.

To the fullest extent permitted by law, Matthew Bateman and project contributors are not liable for damages, losses, claims, costs, or consequences caused by use, misuse, modification, redistribution, inability to use the software, or generated output. The [PolyForm Noncommercial License 1.0.0](LICENSE) contains the controlling warranty and liability terms. Enforceability may vary by jurisdiction.

## Contribution boundary

Issues and pull requests that add identity conditioning, signature workflows, writer matching, tracing, or personal style extraction will be declined. Security research and safeguards that strengthen this boundary are welcome.

The PolyForm Noncommercial License permits forks and modifications for noncommercial purposes. This policy defines the intent and acceptance criteria of the official Scribble Lab project. It is not a technical guarantee that third parties cannot alter or misuse publicly available source code.
