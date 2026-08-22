import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';
import { MAX_SOURCE_CODE_UNITS } from '../src/document-import.js';

async function canvasFingerprint(page) {
  return page.locator('#outputCanvas').evaluate((canvas) => {
    const context = canvas.getContext('2d');
    const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let hash = 2166136261;
    for (let index = 0; index < data.length; index += 997) {
      hash ^= data[index];
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  });
}

async function rememberInkMask(page, key) {
  return page.locator('#outputCanvas').evaluate((canvas, snapshotKey) => {
    const { data, width, height } = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
    const mask = new Uint8Array(width * height);
    let minX = width;
    let maxX = -1;
    let minY = height;
    let maxY = -1;
    for (let pixel = 0; pixel < mask.length; pixel += 1) {
      const channel = pixel * 4;
      const ink = data[channel] < 100 && data[channel + 1] < 100 && data[channel + 2] < 100;
      if (!ink) continue;
      mask[pixel] = 1;
      const x = pixel % width;
      const y = Math.floor(pixel / width);
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
    window.__inkMasks ||= {};
    window.__inkMasks[snapshotKey] = mask;
    return { width: maxX - minX + 1, height: maxY - minY + 1 };
  }, key);
}

async function inkMaskDisagreement(page, leftKey, rightKey) {
  return page.evaluate(([leftName, rightName]) => {
    const left = window.__inkMasks[leftName];
    const right = window.__inkMasks[rightName];
    let union = 0;
    let disagreement = 0;
    for (let index = 0; index < left.length; index += 1) {
      if (left[index] || right[index]) union += 1;
      if (left[index] !== right[index]) disagreement += 1;
    }
    return disagreement / union;
  }, [leftKey, rightKey]);
}

async function repeatedGlyphMetrics(page) {
  return page.locator('#outputCanvas').evaluate((canvas) => {
    const { data, width, height } = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
    const columns = new Uint16Array(width);
    const bounds = Array.from({ length: width }, () => ({ minY: height, maxY: -1 }));
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const channel = (y * width + x) * 4;
        if (data[channel] >= 100 || data[channel + 1] >= 100 || data[channel + 2] >= 100) continue;
        columns[x] += 1;
        bounds[x].minY = Math.min(bounds[x].minY, y);
        bounds[x].maxY = Math.max(bounds[x].maxY, y);
      }
    }

    const runs = [];
    let start = -1;
    let lastInk = -1;
    for (let x = 0; x <= width; x += 1) {
      if (x < width && columns[x] > 0) {
        if (start < 0) start = x;
        lastInk = x;
      } else if (start >= 0 && (x === width || x - lastInk > 3)) {
        runs.push([start, lastInk]);
        start = -1;
      }
    }

    const glyphs = runs.filter(([left, right]) => right - left >= 4).map(([left, right]) => {
      const minY = Math.min(...bounds.slice(left, right + 1).map((bound) => bound.minY));
      const maxY = Math.max(...bounds.slice(left, right + 1).map((bound) => bound.maxY));
      const projection = Array.from({ length: 12 }, (_, bin) => {
        const from = left + Math.floor(((right - left + 1) * bin) / 12);
        const to = left + Math.floor(((right - left + 1) * (bin + 1)) / 12);
        let total = 0;
        for (let x = from; x < Math.max(from + 1, to); x += 1) total += columns[x];
        return total;
      });
      const sum = projection.reduce((total, value) => total + value, 0) || 1;
      return {
        width: right - left + 1,
        height: maxY - minY + 1,
        projection: projection.map((value) => value / sum),
      };
    });

    const coefficientOfVariation = (values) => {
      const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
      const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
      return Math.sqrt(variance) / mean;
    };
    const distances = [];
    for (let left = 0; left < glyphs.length; left += 1) {
      for (let right = left + 1; right < glyphs.length; right += 1) {
        distances.push(glyphs[left].projection.reduce(
          (sum, value, index) => sum + Math.abs(value - glyphs[right].projection[index]),
          0,
        ));
      }
    }
    return {
      count: glyphs.length,
      widthVariation: coefficientOfVariation(glyphs.map((glyph) => glyph.width)),
      heightVariation: coefficientOfVariation(glyphs.map((glyph) => glyph.height)),
      averageShapeDifference: distances.reduce((sum, value) => sum + value, 0) / distances.length,
      uniqueShapes: new Set(glyphs.map((glyph) => glyph.projection.map((value) => value.toFixed(3)).join(','))).size,
    };
  });
}

async function visibleButtonLayoutIssues(page) {
  return page.evaluate(() => {
    const isVisible = (element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.visibility !== 'hidden' && style.display !== 'none' && rect.width > 0 && rect.height > 0;
    };
    const buttons = [...document.querySelectorAll('button')].filter(isVisible);
    const clipped = buttons.filter((button) => (
      button.scrollWidth > button.clientWidth + 1
      || button.scrollHeight > button.clientHeight + 1
    )).map((button) => button.textContent.trim());
    const overlaps = [];
    for (let left = 0; left < buttons.length; left += 1) {
      const a = buttons[left].getBoundingClientRect();
      for (let right = left + 1; right < buttons.length; right += 1) {
        const b = buttons[right].getBoundingClientRect();
        const overlapWidth = Math.min(a.right, b.right) - Math.max(a.left, b.left);
        const overlapHeight = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        if (overlapWidth > 1 && overlapHeight > 1) {
          overlaps.push([buttons[left].textContent.trim(), buttons[right].textContent.trim()]);
        }
      }
    }
    return {
      clipped,
      overlaps,
      horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'ScribbleLab' })).toBeVisible();
});

test('source text updates the synthetic page immediately', async ({ page }) => {
  const source = page.getByLabel('Source text');
  await source.fill('A short synthetic note.');
  await expect(page.locator('#characterCount')).toHaveText('23');
  await expect(page.locator('#lineCount')).toHaveText('1');
  const canvasSize = await page.locator('#outputCanvas').evaluate((canvas) => ({ width: canvas.width, height: canvas.height }));
  expect(canvasSize.width).toBe(1100);
  expect(canvasSize.height).toBeGreaterThanOrEqual(820);
});

test('expected readability coordinates legibility controls without changing the writer identity', async ({ page }) => {
  const readability = page.locator('#readability');
  const seed = await page.locator('#seed').inputValue();
  const writingStyle = await page.locator('#writingStyle').inputValue();
  const initialFingerprint = await canvasFingerprint(page);
  const captureSettings = () => page.evaluate(() => ({
    size: document.querySelector('#size').value,
    lineHeight: document.querySelector('#lineHeight').value,
    spacing: document.querySelector('#spacing').value,
    speed: document.querySelector('#speed').value,
    shakiness: document.querySelector('#shakiness').value,
    pressure: document.querySelector('#pressure').value,
    pressureVariation: document.querySelector('#pressureVariation').value,
    grip: document.querySelector('#grip').value,
    wristAngle: document.querySelector('#wristAngle').value,
    slant: document.querySelector('#slant').value,
    connection: document.querySelector('#connection').value,
    reservoir: document.querySelector('#reservoir').value,
    wristSupport: document.querySelector('#wristSupport').checked,
    construction: document.querySelector('#construction').value,
  }));

  await readability.fill('15');
  await expect(page.locator('[data-output="readability"]')).toHaveText('Low · 15%');
  await expect.poll(() => canvasFingerprint(page)).not.toBe(initialFingerprint);
  const low = await captureSettings();
  const lowFingerprint = await canvasFingerprint(page);

  await readability.fill('85');
  await expect(page.locator('[data-output="readability"]')).toHaveText('Clear · 85%');
  await expect.poll(() => canvasFingerprint(page)).not.toBe(lowFingerprint);
  const high = await captureSettings();

  expect(Number(high.size)).toBeGreaterThan(Number(low.size));
  expect(Number(high.spacing)).toBeGreaterThan(Number(low.spacing));
  expect(Number(high.shakiness)).toBeLessThan(Number(low.shakiness));
  expect(Number(high.pressureVariation)).toBeLessThan(Number(low.pressureVariation));
  expect(Number(high.reservoir)).toBeGreaterThan(Number(low.reservoir));
  expect(high.wristSupport).toBe(true);
  expect(high.construction).toBe('simplex');
  await expect(page.locator('#seed')).toHaveValue(seed);
  await expect(page.locator('#writingStyle')).toHaveValue(writingStyle);

  await readability.fill('15');
  expect(await captureSettings()).toEqual(low);
  await expect.poll(() => canvasFingerprint(page)).toBe(lowFingerprint);
});

test('quick writing style segmented control toggles cursive and print live', async ({ page }) => {
  const cursivePrint = await canvasFingerprint(page);
  await page.getByRole('button', { name: 'Print', exact: true }).click();
  await expect(page.locator('#previewSubtitle')).toContainText('print');
  await expect(page.locator('#materialReadout')).toContainText('simplex print');
  await expect(page.getByLabel('Writing style')).toHaveValue('print');
  await expect(page.getByRole('button', { name: 'Print', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#connection')).toBeDisabled();
  const printFingerprint = await canvasFingerprint(page);
  expect(printFingerprint).not.toBe(cursivePrint);

  await page.getByRole('button', { name: 'Cursive' }).click();
  await expect(page.locator('#previewSubtitle')).toContainText('cursive');
  await expect(page.locator('#materialReadout')).toContainText('cursive');
  await expect(page.getByLabel('Writing style')).toHaveValue('cursive');
  await expect(page.getByRole('button', { name: 'Cursive' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#connection')).toBeEnabled();
  await expect.poll(() => canvasFingerprint(page)).toBe(cursivePrint);
});

test('writing styles and fixed sample seeds are visibly distinct', async ({ page }) => {
  await page.getByLabel('Source text').fill('minimum minimum mmmmm');
  await page.getByRole('tab', { name: /materials/i }).click();
  await page.getByLabel('Paper stock').selectOption('bright');
  await page.locator('#inkColor').fill('#111111');

  await page.getByLabel('Writing style').selectOption('cursive');
  await expect(page.locator('#systemMessage')).toHaveText('Cursive writing active');
  await expect(page.locator('#previewSubtitle')).toContainText('cursive');
  await rememberInkMask(page, 'cursive');

  await page.getByLabel('Writing style').selectOption('print');
  await expect(page.locator('#systemMessage')).toHaveText('Print writing active');
  await expect(page.locator('#previewSubtitle')).toContainText('print');
  await rememberInkMask(page, 'print');
  expect(await inkMaskDisagreement(page, 'cursive', 'print')).toBeGreaterThan(0.8);

  const setSeed = async (seed) => {
    await page.locator('#seed').evaluate((input, value) => {
      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }, String(seed));
    await expect(page.locator('#previewSubtitle')).toContainText(`seed ${seed}`);
  };

  await setSeed(2);
  const wide = await rememberInkMask(page, 'wide');
  await setSeed(999999);
  const narrow = await rememberInkMask(page, 'narrow');
  expect(Math.abs(wide.width - narrow.width)).toBeGreaterThan(70);
  expect(await inkMaskDisagreement(page, 'wide', 'narrow')).toBeGreaterThan(0.8);
});

test('saved profiles persist and can be loaded', async ({ page }) => {
  await page.getByRole('tab', { name: /profiles/i }).click();
  await page.getByLabel('Save current setup').fill('Browser test');
  await page.getByRole('button', { name: 'Save profile' }).click();
  await expect(page.getByRole('button', { name: 'Load Browser test profile' })).toBeVisible();
  await page.reload();
  await page.getByRole('tab', { name: /profiles/i }).click();
  await expect(page.getByRole('button', { name: 'Load Browser test profile' })).toBeVisible();
});

test('metadata export contract excludes source content', async ({ page }) => {
  await page.getByLabel('Source text').fill('Do not copy this sentence.');
  await page.getByRole('button', { name: 'Metadata' }).click();
  const metadata = page.locator('#metadataPreview');
  await expect(metadata).toContainText('"identityConditioned": false');
  await expect(metadata).toContainText('"retainedByApp": false');
  await expect(metadata).not.toContainText('Do not copy this sentence.');

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download JSON' }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/^scribble-lab-\d+\.json$/);
  const downloadedPath = await download.path();
  const exported = JSON.parse(await readFile(downloadedPath, 'utf8'));
  expect(exported.source).toEqual({ characterCount: 26, retainedByApp: false });
  expect(JSON.stringify(exported)).not.toContain('Do not copy this sentence.');
});

test('Markdown and text files import locally with human-readable formatting', async ({ page }) => {
  await page.locator('#sourceFile').setInputFiles({
    name: 'field-notes.md',
    mimeType: 'text/markdown',
    buffer: Buffer.from('# Field notes\n\n- **First** point\n- Second point\n\nRead [source](https://example.com).'),
  });
  await expect(page.getByLabel('Source text')).toHaveValue('Field notes\n\n- First point\n- Second point\n\nRead source (https://example.com).');
  await expect(page.locator('#systemMessage')).toContainText('field-notes.md imported');
  await expect(page.locator('#characterCount')).toHaveText('77');
});

test('file import rejects pathological raw character sequences before rendering', async ({ page }) => {
  const previousSource = await page.getByLabel('Source text').inputValue();
  await page.locator('#sourceFile').setInputFiles({
    name: 'pathological.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from(`a${'\u0301'.repeat(MAX_SOURCE_CODE_UNITS)}`),
  });
  await expect(page.locator('#systemMessage')).toHaveText('File contains unusually long character data');
  await expect(page.getByLabel('Source text')).toHaveValue(previousSource);
  await expect(page.locator('#engineStatus')).toHaveText('Ready');
});

test('Export PDF prepares every document page and opens a print-only document', async ({ page }) => {
  await page.evaluate(() => {
    window.__printCalls = 0;
    window.print = () => { window.__printCalls += 1; };
  });
  await page.getByLabel('Source text').fill('ink '.repeat(1_000));
  await expect(page.locator('#pageCount')).not.toHaveText('1');
  const pageCount = Number(await page.locator('#pageCount').textContent());
  expect(pageCount).toBeGreaterThan(1);
  await page.getByRole('button', { name: 'Export PDF' }).click();
  await expect(page.locator('#systemMessage')).toHaveText('Print dialog opened. Choose “Save as PDF”');
  expect(await page.evaluate(() => window.__printCalls)).toBe(1);
  await expect(page.locator('.print-page')).toHaveCount(pageCount);

  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.app-shell')).toBeHidden();
  await expect(page.locator('.print-document')).toBeVisible();
  await expect(page.locator('.print-page canvas').first()).toBeVisible();
});

test('PDF export keeps one document snapshot while the editor changes', async ({ page }) => {
  await page.evaluate(() => {
    window.__printCalls = 0;
    window.print = () => { window.__printCalls += 1; };
  });
  await page.getByLabel('Source text').fill('ink '.repeat(1_500));
  await expect(page.locator('#pageCount')).not.toHaveText('1');
  const exportPageCount = Number(await page.locator('#pageCount').textContent());
  expect(exportPageCount).toBeGreaterThan(2);
  await page.evaluate(() => {
    document.querySelector('#pdfButton').click();
    requestAnimationFrame(() => {
      const source = document.querySelector('#sourceText');
      source.value = 'A newly edited document.';
      source.dispatchEvent(new Event('input', { bubbles: true }));
    });
  });
  await expect(page.locator('#systemMessage')).toHaveText('Print dialog opened. Choose “Save as PDF”');
  await expect(page.locator('.print-page')).toHaveCount(exportPageCount);
  expect(await page.evaluate(() => window.__printCalls)).toBe(1);
});

test('tabs support arrow-key navigation', async ({ page }) => {
  const compose = page.getByRole('tab', { name: /compose/i });
  await compose.focus();
  await compose.press('ArrowRight');
  await expect(page.getByRole('tab', { name: /hand motion/i })).toBeFocused();
  await expect(page.getByRole('tab', { name: /hand motion/i })).toHaveAttribute('aria-selected', 'true');
});

test('preview zoom supports inspection and mobile tabs stay in view', async ({ page }) => {
  await page.getByRole('button', { name: '100%' }).click();
  await expect(page.getByRole('button', { name: '100%' })).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => page.locator('.page-shadow').evaluate((element) => Math.round(Number.parseFloat(getComputedStyle(element).width)))).toBe(1100);

  await page.setViewportSize({ width: 390, height: 844 });
  const tabBounds = await page.getByRole('tab').evaluateAll((tabs) => tabs.map((tab) => {
    const rect = tab.getBoundingClientRect();
    return { left: rect.left, right: rect.right };
  }));
  expect(tabBounds.every((rect) => rect.left >= 0 && rect.right <= 390)).toBe(true);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
});

test('buttons remain unclipped and non-overlapping across responsive layouts', async ({ page }) => {
  test.setTimeout(60_000);
  for (const viewport of [
    { width: 820, height: 900 },
    { width: 390, height: 844 },
    { width: 320, height: 800 },
  ]) {
    await page.setViewportSize(viewport);
    for (const tab of ['compose', 'motion', 'materials', 'profiles']) {
      await page.locator(`[data-tab="${tab}"]`).click();
      expect(await visibleButtonLayoutIssues(page), `${viewport.width}px ${tab}`).toEqual({
        clipped: [],
        overlaps: [],
        horizontalOverflow: 0,
      });
    }
  }
});

test('visible workflows have no automated WCAG A or AA violations', async ({ page }) => {
  test.setTimeout(60_000);
  const scan = async () => new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();

  const compose = await scan();
  expect(compose.violations).toEqual([]);

  await page.getByRole('tab', { name: /hand motion/i }).click();
  const motion = await scan();
  expect(motion.violations).toEqual([]);

  await page.getByRole('tab', { name: /materials/i }).click();
  const materials = await scan();
  expect(materials.violations).toEqual([]);

  await page.getByRole('tab', { name: /profiles/i }).click();
  const profiles = await scan();
  expect(profiles.violations).toEqual([]);

  await page.getByRole('button', { name: 'Metadata' }).click();
  const dialog = await scan();
  expect(dialog.violations).toEqual([]);
});

test('runtime is self-contained with no external requests', async ({ page }) => {
  const externalRequests = [];
  const failedResponses = [];
  const pageErrors = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.origin !== 'http://127.0.0.1:4173') externalRequests.push(request.url());
  });
  page.on('response', (response) => {
    if (response.status() >= 400) failedResponses.push(`${response.status()} ${response.url()}`);
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.reload();
  await expect(page.locator('#engineStatus')).toHaveText('Ready');
  await expect(page.locator('#characterCount')).not.toHaveText('0');
  expect(externalRequests).toEqual([]);
  expect(failedResponses).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test('maximum-length document paginates completely and keeps live preview bounded', async ({ page }) => {
  test.setTimeout(30_000);
  const content = 'ink '.repeat(12_500);
  const startedAt = Date.now();
  await page.getByLabel('Source text').fill(content);
  await expect(page.locator('#characterCount')).toHaveText('50,000', { timeout: 20_000 });
  expect(Date.now() - startedAt).toBeLessThan(20_000);
  const dimensions = await page.locator('#outputCanvas').evaluate((canvas) => ({ width: canvas.width, height: canvas.height }));
  expect(dimensions.width).toBe(1100);
  expect(dimensions.height).toBe(1424);
  await expect(page.locator('#pageCount')).not.toHaveText('1');
  await expect(page.getByRole('button', { name: 'Next page' })).toBeEnabled();
});

test('source limit counts graphemes instead of UTF-16 code units', async ({ page }) => {
  const source = page.getByLabel('Source text');
  await expect(source).not.toHaveAttribute('maxlength');
  await source.fill('😀'.repeat(25_001));
  await expect(page.locator('#characterCount')).toHaveText('25,001');
  await source.fill('a'.repeat(50_001));
  await expect(source).toHaveValue('a'.repeat(50_000));
  await expect(page.locator('#systemMessage')).toHaveText('Source limited to 50,000 characters');
});

test('pathological graphemes stay within the raw processing bound', async ({ page }) => {
  const source = page.getByLabel('Source text');
  await source.evaluate((element, limit) => {
    element.value = `a${'\u0301'.repeat(limit)}`;
    element.dispatchEvent(new Event('input', { bubbles: true }));
  }, MAX_SOURCE_CODE_UNITS);
  await expect.poll(() => source.evaluate((element) => element.value.length)).toBe(MAX_SOURCE_CODE_UNITS);
  await expect(page.locator('#systemMessage')).toHaveText('Source limited to a safe processing size');
  await expect(page.locator('#characterCount')).toHaveText('1');
});

test('untrusted text and profile names remain inert under the page security policy', async ({ page }) => {
  const payload = '<img src=x onerror=window.__scribbleXss=1>';
  await page.getByLabel('Source text').fill(payload);
  await page.getByRole('tab', { name: /profiles/i }).click();
  await page.locator('#profileName').fill(payload);
  await page.getByRole('button', { name: 'Save profile' }).click();

  await expect(page.locator('#profileList img')).toHaveCount(0);
  expect(await page.evaluate(() => window.__scribbleXss)).toBeUndefined();
  const policy = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');
  expect(policy).toContain("script-src 'self'");
  expect(policy).toContain("connect-src 'none'");
  expect(policy).toContain("require-trusted-types-for 'script'");
});

test('meaningful parameter changes produce visibly distinct handwriting', async ({ page }) => {
  test.setTimeout(60_000);
  await page.getByLabel('Source text').fill('minimum rhythm minimum rhythm\nminimum rhythm minimum rhythm');
  await expect(page.locator('#previewSubtitle')).toContainText('seed 43182');

  const setValue = async (id, value) => {
    const before = await canvasFingerprint(page);
    await page.locator(`#${id}`).evaluate((element, nextValue) => {
      element.value = String(nextValue);
      const eventName = element.tagName === 'SELECT' ? 'change' : 'input';
      element.dispatchEvent(new Event(eventName, { bubbles: true }));
    }, value);
    await expect.poll(() => canvasFingerprint(page)).not.toBe(before);
  };

  await setValue('paper', 'bright');
  await setValue('inkColor', '#111111');

  for (const [id, low, high, defaultValue, minimumDifference] of [
    ['slant', -18, 24, 7, 0.65],
    ['shakiness', 0, 100, 24, 0.60],
    ['pressure', 0, 100, 58, 0.25],
    ['speed', 0, 100, 54, 0.50],
    ['connection', 0, 100, 38, 0.45],
    ['wristAngle', -25, 25, -5, 0.55],
    ['spacing', -2, 14, 3, 0.75],
    ['size', 22, 52, 34, 0.85],
  ]) {
    await setValue(id, low);
    await rememberInkMask(page, `${id}-low`);
    await setValue(id, high);
    await rememberInkMask(page, `${id}-high`);
    expect(await inkMaskDisagreement(page, `${id}-low`, `${id}-high`), id).toBeGreaterThan(minimumDifference);
    await setValue(id, defaultValue);
  }
});

test('repeated letters vary naturally within consistent writer proportions', async ({ page }) => {
  await page.getByRole('tab', { name: /materials/i }).click();
  await page.getByLabel('Paper stock').selectOption('bright');
  await page.locator('#inkColor').fill('#111111');
  await page.getByRole('tab', { name: /hand motion/i }).click();
  await page.locator('label[for="paperTextureToggle"]').click();
  await expect(page.locator('#paperTextureToggle')).not.toBeChecked();
  await page.getByRole('tab', { name: /compose/i }).click();
  await page.getByLabel('Source text').fill('o o o o o o o o');
  await expect(page.locator('#characterCount')).toHaveText('15');
  await page.getByRole('button', { name: 'Print', exact: true }).click();
  await expect(page.locator('#previewSubtitle')).toContainText('print');
  const printRepeated = await repeatedGlyphMetrics(page);
  await page.getByRole('button', { name: 'Cursive' }).click();
  await expect(page.locator('#previewSubtitle')).toContainText('cursive');
  const cursiveRepeated = await repeatedGlyphMetrics(page);

  for (const metrics of [printRepeated, cursiveRepeated]) {
    expect(metrics.count).toBe(8);
    expect(metrics.uniqueShapes).toBeGreaterThanOrEqual(7);
    expect(metrics.widthVariation).toBeGreaterThan(0.04);
    expect(metrics.widthVariation).toBeLessThan(0.22);
    expect(metrics.heightVariation).toBeGreaterThan(0.04);
    expect(metrics.heightVariation).toBeLessThan(0.28);
    expect(metrics.averageShapeDifference).toBeGreaterThan(0.18);
    expect(metrics.averageShapeDifference).toBeLessThan(0.72);
  }
});
