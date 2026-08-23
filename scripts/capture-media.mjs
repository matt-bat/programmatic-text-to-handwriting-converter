import { createServer } from 'node:http';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const projectRoot = resolve(import.meta.dirname, '..');
const mediaDirectory = join(projectRoot, 'docs', 'media');
const frameDirectory = await mkdtemp(join(tmpdir(), 'scribble-lab-media-'));

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

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

async function setInput(page, selector, value) {
  await page.locator(selector).evaluate((element, nextValue) => {
    element.value = String(nextValue);
    element.dispatchEvent(new Event('input', { bubbles: true }));
  }, value);
  await page.waitForTimeout(250);
}

async function captureFrame(page, number) {
  await page.locator('main.app-shell').screenshot({ path: join(frameDirectory, `${number}.png`) });
}

try {
  const previewPage = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  await previewPage.goto(`http://127.0.0.1:${address.port}/`, { waitUntil: 'networkidle' });
  await previewPage.locator('#sourceText').fill([
    'Programmatic handwriting',
    '',
    'Repeated letters vary while the writer stays consistent.',
    'minimum rhythm balloon coffee committee',
    '',
    'No AI model or handwriting training data.',
  ].join('\n'));
  await previewPage.locator('#sourceText').dispatchEvent('input');
  await previewPage.waitForTimeout(350);
  await captureFrame(previewPage, 1);

  await setInput(previewPage, '#seed', 77731);
  await captureFrame(previewPage, 2);

  await previewPage.locator('#styleControl [data-value="print"]').click();
  await setInput(previewPage, '#seed', 28491);
  await captureFrame(previewPage, 3);

  await previewPage.locator('#styleControl [data-value="cursive"]').click();
  await previewPage.locator('#instrumentControl [data-value="pencil"]').click();
  await setInput(previewPage, '#readability', 90);
  await captureFrame(previewPage, 4);

  const socialPage = await browser.newPage({ viewport: { width: 1280, height: 640 }, deviceScaleFactor: 1 });
  await socialPage.goto(pathToFileURL(join(mediaDirectory, 'social-preview.svg')).href, { waitUntil: 'load' });
  await socialPage.waitForTimeout(250);
  await socialPage.screenshot({ path: join(mediaDirectory, 'social-preview.png') });

  await new Promise((resolveProcess, rejectProcess) => {
    const process = spawn('python3', [
      join(projectRoot, 'scripts', 'make-demo-gif.py'),
      frameDirectory,
      join(mediaDirectory, 'programmatic-handwriting-demo.gif'),
    ], { stdio: 'inherit' });
    process.on('error', rejectProcess);
    process.on('exit', (code) => code === 0 ? resolveProcess() : rejectProcess(new Error(`GIF builder exited with ${code}`)));
  });
} finally {
  await browser.close();
  await new Promise((resolveClose) => server.close(resolveClose));
  await rm(frameDirectory, { recursive: true, force: true });
}
