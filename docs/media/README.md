# Project media

The social preview and animated demo use the real project logo, interface, and renderer output. No AI image generator was used.

To rebuild both assets, install the Playwright Chromium browser and make sure Python has Pillow available:

```bash
npx playwright install chromium
npm run capture:media
```

The capture script starts a temporary local server, renders several deterministic app states, captures the social-preview SVG in Chromium, and combines the UI frames into a GIF. Temporary frames are removed when the script finishes.

- `social-preview.svg` is the editable 1280 by 640 source layout.
- `social-preview.png` is the social sharing image used by the app metadata.
- `programmatic-handwriting-demo.gif` is the README demo.

Keep example text generic and free of personal information.
