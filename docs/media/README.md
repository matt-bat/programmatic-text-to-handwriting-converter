# Project media

The social preview and animated demo use the real project logo, interface, and renderer output. No AI image generator was used.

To rebuild both assets, install the Playwright Chromium browser and make sure Python has Pillow available:

```bash
npx playwright install chromium
npm run capture:media
```

The capture script starts a temporary local server, renders several deterministic app states, captures the social-preview SVG in Chromium, and combines the UI frames into a GIF. Temporary frames are removed when the script finishes. After a rendering or interface change, also retain reviewed desktop, materials/damage, scanned-document, high-readability cursive, multi-page, and mobile screenshots under `docs/screenshots/`.

Rebuild the canonical verification screenshots separately with:

```bash
npm run capture:ui
```

`capture:ui` accepts an optional project root and output directory. That makes it possible to capture a clean archived revision beside the working tree without cloning or modifying either copy.

- `social-preview.svg` is the editable 1280 by 640 source layout.
- `social-preview.png` is the social sharing image used by the app metadata.
- `programmatic-handwriting-demo.gif` is the README demo.

Keep example text generic and free of personal information.
