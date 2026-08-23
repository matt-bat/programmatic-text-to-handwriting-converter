# Rendering changes

The renderer is deterministic. The same text, seed, profile, and engine version should produce the same geometry on supported browsers.

## Before changing the engine

Read [architecture.md](../architecture.md) and the tests in `tests/handwriting-engine.test.js` and `tests/stroke-font.test.js`.

Keep these project rules in mind:

- Output stays identity-free.
- The app does not accept handwriting, signature, image, or font samples.
- Generation stays local and does not add an AI model or remote service.
- Repeated characters should vary without becoming unrecognizable.
- Neighboring characters should retain gradual motion and pressure continuity.
- Unsupported input must fail safely or use the documented fallback.

## Choosing the right layer

- Change `stroke-font.js` for glyph lookup, variants, accents, or measurements.
- Change `handwriting-engine.js` for layout, writer state, deformation, connectors, instruments, paper, or pagination.
- Change `readability-control.js` when one readability level should coordinate several existing parameters.
- Change `app.js` only when the interface or export workflow needs different engine input.

## Verification

For an engine change, check all of the following:

1. One seed is stable across repeated renders.
2. Different seeds create a visible difference.
3. Repeated letters are not exact copies.
4. Cursive and print remain visibly distinct.
5. Long text still paginates without truncation.
6. Maximum readability keeps some seeded character while improving clarity.
7. The browser workflow passes in Chromium, Firefox, and WebKit.

If a change intentionally alters seeded output, describe why in the pull request and update the engine or profile version when compatibility requires it.

Do not replace a focused unit test with a screenshot alone. Screenshots are useful for review, but deterministic assertions protect the rendering contract.
