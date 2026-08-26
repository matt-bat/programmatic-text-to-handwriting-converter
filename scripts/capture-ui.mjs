import { createServer } from 'node:http';
import { mkdir, readFile } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { chromium } from 'playwright';

const repositoryRoot = resolve(import.meta.dirname, '..');
const projectRoot = resolve(process.argv[2] || repositoryRoot);
const outputDirectory = resolve(process.argv[3] || join(repositoryRoot, 'docs', 'screenshots'));

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

await mkdir(outputDirectory, { recursive: true });

const server = createServer(async (request, response) => {
  try {
    const requestPath = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
    const relativePath = requestPath === '/' ? 'index.html' : requestPath.replace(/^\/+/, '');
    const filePath = resolve(projectRoot, normalize(relativePath));
    if (!filePath.startsWith(`${projectRoot}/`)) throw new Error('Invalid path');
    const body = await readFile(filePath);
    response.writeHead(200, { 'Content-Type': mimeTypes[extname(filePath)] || 'application/octet-stream' });
    response.end(body);
  } catch {
    response.writeHead(404);
    response.end('Not found');
  }
});

await new Promise((resolveListen) => server.listen(0, '127.0.0.1', resolveListen));
const address = server.address();
const browser = await chromium.launch();

async function capture(page, name) {
  await page.locator('main.app-shell').screenshot({ path: join(outputDirectory, name) });
}

async function setInput(page, selector, value) {
  const element = page.locator(selector);
  if (!await element.count()) return;
  await element.evaluate((input, nextValue) => {
    if (input.type === 'checkbox') input.checked = Boolean(nextValue);
    else input.value = String(nextValue);
    input.dispatchEvent(new Event(input.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
    if (input.type === 'checkbox') input.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
  await page.waitForTimeout(180);
}

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1040 }, deviceScaleFactor: 1 });
  await page.goto(`http://127.0.0.1:${address.port}/`, { waitUntil: 'networkidle' });
  await page.locator('#sourceText').fill([
    'Archive transcription sample',
    '',
    'Repeated letters vary while the writer stays consistent.',
    'minimum rhythm balloon coffee committee',
    '',
    'Seeded document: 43182',
  ].join('\n'));
  await page.waitForTimeout(350);
  await capture(page, 'scribble-lab-desktop.png');

  await page.getByRole('tab', { name: /hand motion/i }).click();
  await capture(page, 'scribble-lab-motion-controls.png');

  await page.getByRole('tab', { name: /materials/i }).click();
  if (await page.locator('#pageSize').count()) await page.locator('#pageSize').selectOption('a4');
  if (await page.locator('#paper').count()) {
    const hasPrinterPaper = await page.locator('#paper option[value="printer"]').count();
    await page.locator('#paper').selectOption(hasPrinterPaper ? 'printer' : 'bright');
  }
  await setInput(page, '#paperWear', 72);
  await setInput(page, '#wearFire', true);
  await capture(page, 'scribble-lab-materials.png');

  if (await page.locator('#scanMode').count()) {
    await setInput(page, '#scanMode', true);
    await setInput(page, '#scanQuality', 42);
    await capture(page, 'scribble-lab-scanned-damage.png');
    await setInput(page, '#scanMode', false);

    await page.getByRole('tab', { name: /compose/i }).click();
    await page.locator('#sourceText').fill('Paged archive record. '.repeat(900));
    await page.waitForTimeout(700);
    await capture(page, 'scribble-lab-paged-preview.png');
  }

  await page.locator('#sourceText').fill('Maximum clarity cursive: minimum rhythm, archival transcription, 1947.');
  await setInput(page, '#readability', 100);
  await setInput(page, '#size', 38);
  await setInput(page, '#paperWear', 0);
  await page.getByRole('tab', { name: /materials/i }).click();
  await page.locator('#paper').selectOption('bright');
  await capture(page, 'scribble-lab-max-cursive.png');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('tab', { name: /compose/i }).click();
  await page.locator('#sourceText').fill('A short mobile field note.');
  await page.waitForTimeout(350);
  await capture(page, 'scribble-lab-mobile.png');
} finally {
  await browser.close();
  await new Promise((resolveClose) => server.close(resolveClose));
}
