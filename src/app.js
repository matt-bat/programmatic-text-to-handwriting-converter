import {
  DEFAULT_PROFILE,
  createHandwritingDocument,
  createExportManifest,
  normalizeProfile,
  segmentGraphemes,
} from './handwriting-engine.js';
import {
  MAX_SOURCE_CHARACTERS,
  MAX_SOURCE_CODE_UNITS,
  MAX_SOURCE_FILE_BYTES,
  formatMarkdownForHandwriting,
  sourceKindFromFile,
} from './document-import.js';
import {
  createStarterProfiles,
  readProfiles,
  removeProfile,
  upsertProfile,
  writeProfiles,
} from './profile-store.js';
import {
  deriveReadabilityAdjustments,
  readabilityLabel,
} from './readability-control.js';
import { COMMERCIAL_PROVENANCE } from './commercial-provenance.js';
import { createBuildProvenance } from './provenance.js';

const PARAMETER_IDS = [
  'readability', 'seed', 'size', 'lineHeight', 'spacing', 'speed', 'shakiness', 'pressure',
  'pressureVariation', 'lineConsistency', 'grip', 'wristAngle', 'slant', 'connection', 'reservoir', 'wristSupport',
  'penKind', 'writingStyle', 'construction', 'paper', 'pageSize', 'paperColor', 'inkColor', 'paperTexture',
  'paperWear', 'wearCrumple', 'wearCreases', 'wearStains', 'wearFire', 'scanMode', 'scanQuality',
];

const elements = Object.fromEntries(
  [
    ...PARAMETER_IDS,
    'sourceText', 'sourceFile', 'outputCanvas', 'characterCount', 'lineCount', 'pageCount', 'pagePosition', 'renderTime',
    'previewSubtitle', 'engineStatus', 'systemMessage', 'instrumentControl', 'styleControl', 'newSeedButton',
    'clearButton', 'importButton', 'pdfButton', 'metadataButton', 'metadataDialog', 'metadataPreview',
    'downloadMetadataButton', 'profileForm', 'profileName', 'profileList', 'colorCode', 'paperColorCode',
    'materialReadout', 'paperTextureToggle', 'previousPageButton', 'nextPageButton', 'printDocument',
    'sourcePane', 'previewPane', 'previewPages', 'canvasStage', 'jumpToPreviewButton', 'returnToSourceButton',
    'metadataPrivacySummary', 'metadataOutputSummary', 'metadataStyleSummary', 'metadataSeedSummary',
  ].map((id) => [id, document.getElementById(id)]),
);

let instrument = DEFAULT_PROFILE.instrument;
let profiles = readProfiles();
if (!profiles.length) profiles = createStarterProfiles();
let lastResult = null;
let currentDocument = null;
let currentPageIndex = 0;
let renderTimer = null;
let paperWearSeed = randomUint32();
let previewObserver = null;

function randomUint32() {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return values[0] || 1;
}

function formatOutput(id, value) {
  if (id === 'readability') return `${readabilityLabel(value)} · ${value}%`;
  if (id === 'paperWear') return `${Number(value) === 0 ? 'Clean' : Number(value) < 35 ? 'Handled' : Number(value) < 70 ? 'Aged' : 'Damaged'} · ${value}%`;
  if (id === 'size' || id === 'spacing') return `${value} px`;
  if (id === 'lineHeight') return `${Number(value).toFixed(2)}×`;
  if (['wristAngle', 'slant'].includes(id)) return `${Number(value) < 0 ? '−' : ''}${Math.abs(Number(value))}°`;
  if (id === 'seed') return String(value);
  return `${value}%`;
}

function updateOutput(id) {
  const output = document.querySelector(`[data-output="${id}"]`);
  if (output) output.textContent = formatOutput(id, elements[id].value);
}

function syncWritingStyleUI(writingStyle) {
  document.querySelectorAll('#styleControl .segment').forEach((button) => {
    const active = button.dataset.value === writingStyle;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });
}

function activateWritingStyle(writingStyle) {
  elements.writingStyle.value = writingStyle;
  applyReadabilityPreset({ announce: false });
  setSystemMessage(`${writingStyle === 'print' ? 'Print' : 'Cursive'} writing active`);
}

function collectProfile(overrides = {}) {
  return normalizeProfile({
    ...Object.fromEntries(PARAMETER_IDS.map((id) => [id, elements[id].type === 'checkbox' ? elements[id].checked : elements[id].value])),
    instrument,
    wearSeed: paperWearSeed,
    ...overrides,
  });
}

function setSystemMessage(message) {
  elements.systemMessage.textContent = message;
}

function truncateUtf16Safely(text, limit) {
  let end = limit;
  const lastCodeUnit = text.charCodeAt(end - 1);
  if (lastCodeUnit >= 0xd800 && lastCodeUnit <= 0xdbff) end -= 1;
  return text.slice(0, end);
}

function applyReadabilityPreset({ announce = true, renderDelay = 0, immediate = false } = {}) {
  const level = Number(elements.readability.value);
  const adjustments = deriveReadabilityAdjustments(level, elements.seed.value, elements.writingStyle.value);
  for (const [id, value] of Object.entries(adjustments)) {
    if (elements[id].type === 'checkbox') elements[id].checked = value;
    else elements[id].value = value;
    updateOutput(id);
  }
  updateOutput('readability');
  updateMaterialReadout(collectProfile());
  if (announce) setSystemMessage(`${readabilityLabel(level)} readability target applied`);
  if (immediate) render();
  else requestRender(renderDelay);
}

function updateMaterialReadout(profile) {
  const instrumentLabel = profile.instrument === 'pen'
    ? (profile.penKind === 'fountain' ? 'Fountain nib' : 'Ballpoint')
    : profile.instrument[0].toUpperCase() + profile.instrument.slice(1);
  const paperLabel = {
    notebook: 'ruled paper', grid: 'grid paper', printer: 'off-white paper', colored: 'colored stock',
    ivory: 'warm ivory', bright: 'bright stock', recycled: 'rough recycled',
  }[profile.paper];
  const writingLabel = profile.writingStyle === 'print' ? 'simplex print' : `${profile.construction} cursive`;
  elements.materialReadout.querySelector('strong').textContent = `${instrumentLabel} · ${writingLabel} · ${paperLabel}`;
  elements.penKind.disabled = profile.instrument !== 'pen';
  elements.construction.disabled = profile.writingStyle === 'print';
  elements.connection.disabled = profile.writingStyle === 'print';
  elements.paperColor.disabled = profile.paper !== 'colored';
  elements.scanQuality.disabled = !profile.scanMode;
  elements.construction.title = profile.writingStyle === 'print' ? 'Cursive detail applies only to cursive writing' : '';
  elements.connection.title = profile.writingStyle === 'print' ? 'Printed letters are not joined' : '';
  elements.colorCode.textContent = profile.inkColor.toUpperCase();
  elements.paperColorCode.textContent = profile.paperColor.toUpperCase();
  syncWritingStyleUI(profile.writingStyle);
}

function updatePageNavigation() {
  const pageCount = currentDocument?.pageCount ?? 1;
  elements.pagePosition.textContent = `${currentPageIndex + 1} / ${pageCount}`;
  elements.pageCount.textContent = pageCount.toLocaleString();
  elements.pageCount.parentElement.lastChild.textContent = pageCount === 1 ? ' page' : ' pages';
  elements.previousPageButton.disabled = currentPageIndex === 0;
  elements.nextPageButton.disabled = currentPageIndex >= pageCount - 1;
}

function renderCurrentPage() {
  if (!currentDocument) return;
  const selected = elements.previewPages.querySelector(`[data-preview-page="${currentPageIndex}"]`);
  if (selected && !selected.querySelector('canvas')) {
    renderPreviewPage(selected, currentPageIndex, currentDocument, previewScaleFor(currentDocument));
    previewObserver?.unobserve(selected);
  }
  elements.previewPages.querySelectorAll('.page-shadow').forEach((page) => page.classList.toggle('is-selected', page === selected));
  selected?.scrollIntoView({ block: 'nearest', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  updatePageNavigation();
}

function previewScaleFor(documentModel) {
  return documentModel.pageCount > 12 ? 0.32 : documentModel.pageCount > 5 ? 0.42 : 0.55;
}

function renderPreviewPage(page, pageIndex, documentModel, scale) {
  if (page.querySelector('canvas')) return;
  const canvas = document.createElement('canvas');
  if (pageIndex === 0) canvas.id = 'outputCanvas';
  canvas.setAttribute('aria-label', `Generated synthetic handwriting preview, page ${pageIndex + 1} of ${documentModel.pageCount}`);
  documentModel.renderPage(canvas, pageIndex, { scale });
  page.append(canvas);
}

function renderPreviewPages() {
  const startedAt = performance.now();
  const fragment = document.createDocumentFragment();
  const previewDocument = currentDocument;
  const secondaryScale = previewScaleFor(previewDocument);
  previewObserver?.disconnect();
  for (let pageIndex = 0; pageIndex < previewDocument.pageCount; pageIndex += 1) {
    const page = document.createElement('section');
    page.className = `page-shadow${pageIndex === currentPageIndex ? ' is-selected' : ''}`;
    page.dataset.previewPage = String(pageIndex);
    page.style.setProperty('--page-pixel-width', `${previewDocument.width}px`);
    page.style.aspectRatio = `${previewDocument.width} / ${previewDocument.height}`;
    const label = document.createElement('span');
    label.className = 'page-label';
    label.textContent = `Page ${pageIndex + 1}`;
    page.append(label);
    if (pageIndex === 0 || pageIndex === currentPageIndex) {
      renderPreviewPage(page, pageIndex, previewDocument, pageIndex === 0 ? 1 : secondaryScale);
    }
    fragment.append(page);
  }
  elements.previewPages.replaceChildren(fragment);
  elements.outputCanvas = document.getElementById('outputCanvas');
  previewObserver = new IntersectionObserver((entries, observer) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const page = entry.target;
      renderPreviewPage(page, Number(page.dataset.previewPage), previewDocument, secondaryScale);
      observer.unobserve(page);
    }
  }, { root: elements.canvasStage, rootMargin: '600px 0px' });
  elements.previewPages.querySelectorAll('.page-shadow:not(:has(canvas))').forEach((page) => previewObserver.observe(page));
  elements.renderTime.textContent = `Render ${Math.max(1, Math.round(performance.now() - startedAt))} ms`;
  updatePageNavigation();
}

function render() {
  const text = elements.sourceText.value;
  const profile = collectProfile();
  elements.engineStatus.textContent = 'Rendering';
  currentDocument = createHandwritingDocument(text, profile);
  lastResult = currentDocument;
  currentPageIndex = Math.min(currentPageIndex, currentDocument.pageCount - 1);
  renderPreviewPages();
  elements.characterCount.textContent = segmentGraphemes(text).length.toLocaleString();
  elements.lineCount.textContent = currentDocument.lineCount.toLocaleString();
  elements.previewSubtitle.textContent = `${profile.instrument[0].toUpperCase() + profile.instrument.slice(1)} · ${profile.writingStyle} · seed ${profile.seed}`;
  elements.engineStatus.textContent = 'Ready';
  updateMaterialReadout(profile);
}

function requestRender(delay = 45) {
  window.clearTimeout(renderTimer);
  renderTimer = window.setTimeout(render, delay);
}

function applyProfile(profile) {
  const normalized = normalizeProfile(profile);
  instrument = normalized.instrument;
  paperWearSeed = randomUint32();
  for (const id of PARAMETER_IDS) {
    const element = elements[id];
    if (element.type === 'checkbox') element.checked = normalized[id];
    else element.value = normalized[id];
    updateOutput(id);
  }
  elements.paperTextureToggle.checked = normalized.paperTexture !== 'none';
  document.querySelectorAll('#instrumentControl .segment').forEach((button) => {
    const active = button.dataset.value === instrument;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  elements.profileName.value = normalized.name;
  updateMaterialReadout(normalized);
  requestRender(0);
}

function renderProfileList() {
  elements.profileList.replaceChildren();
  for (const profile of profiles) {
    const card = document.createElement('div');
    card.className = 'profile-card';
    const loadButton = document.createElement('button');
    loadButton.type = 'button';
    const profileName = document.createElement('strong');
    const profileDetails = document.createElement('small');
    profileName.textContent = profile.name;
    profileDetails.textContent = `${profile.instrument} · ${profile.writingStyle} · ${profile.seed}`;
    loadButton.append(profileName, profileDetails);
    loadButton.setAttribute('aria-label', `Load ${profile.name} profile`);
    loadButton.addEventListener('click', () => {
      applyProfile(profile);
      setSystemMessage(`Loaded “${profile.name}”`);
    });
    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'delete-profile';
    deleteButton.textContent = '×';
    deleteButton.setAttribute('aria-label', `Delete ${profile.name} profile`);
    deleteButton.addEventListener('click', () => {
      profiles = removeProfile(profiles, profile.name);
      writeProfiles(profiles);
      renderProfileList();
      setSystemMessage(`Deleted “${profile.name}”`);
    });
    card.append(loadButton, deleteButton);
    elements.profileList.append(card);
  }
}

function activateTab(tabName, focus = false) {
  document.querySelectorAll('[role="tab"]').forEach((tab) => {
    const active = tab.dataset.tab === tabName;
    tab.classList.toggle('is-active', active);
    tab.setAttribute('aria-selected', String(active));
    tab.tabIndex = active ? 0 : -1;
    if (active && focus) tab.focus();
  });
  document.querySelectorAll('[role="tabpanel"]').forEach((panel) => {
    const active = panel.dataset.panel === tabName;
    panel.hidden = !active;
    panel.classList.toggle('is-active', active);
  });
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function setPrintPageSize(documentModel) {
  const pageSize = `${documentModel.printWidth} ${documentModel.printHeight}`;
  for (const stylesheet of document.styleSheets) {
    for (const rule of stylesheet.cssRules) {
      if (rule.constructor?.name === 'CSSPageRule') rule.style.setProperty('size', pageSize);
    }
  }
}

function currentManifest() {
  return createExportManifest(
    elements.sourceText.value,
    lastResult || createHandwritingDocument(elements.sourceText.value, collectProfile()),
    createBuildProvenance(COMMERCIAL_PROVENANCE),
  );
}

function focusPane(pane, message) {
  pane.focus({ preventScroll: true });
  pane.scrollIntoView({
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    block: 'start',
  });
  setSystemMessage(message);
}

document.querySelectorAll('[role="tab"]').forEach((tab) => {
  tab.addEventListener('click', () => activateTab(tab.dataset.tab));
  tab.addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    const tabs = [...document.querySelectorAll('[role="tab"]')];
    const current = tabs.indexOf(tab);
    const next = event.key === 'Home' ? 0
      : event.key === 'End' ? tabs.length - 1
        : (current + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    event.preventDefault();
    activateTab(tabs[next].dataset.tab, true);
  });
});

document.querySelectorAll('.zoom-button').forEach((button) => {
  button.addEventListener('click', () => {
    const actualSize = button.dataset.zoom === 'actual';
    elements.previewPages.classList.toggle('is-actual-size', actualSize);
    document.querySelectorAll('.zoom-button').forEach((candidate) => {
      const active = candidate === button;
      candidate.classList.toggle('is-active', active);
      candidate.setAttribute('aria-pressed', String(active));
    });
    setSystemMessage(actualSize ? 'Preview at 100%. Scroll to inspect' : 'Preview fitted to pane');
  });
});

elements.previousPageButton.addEventListener('click', () => {
  if (currentPageIndex === 0) return;
  currentPageIndex -= 1;
  renderCurrentPage();
  setSystemMessage(`Previewing page ${currentPageIndex + 1}`);
});

elements.nextPageButton.addEventListener('click', () => {
  if (!currentDocument || currentPageIndex >= currentDocument.pageCount - 1) return;
  currentPageIndex += 1;
  renderCurrentPage();
  setSystemMessage(`Previewing page ${currentPageIndex + 1}`);
});

elements.jumpToPreviewButton.addEventListener('click', () => focusPane(elements.previewPane, 'Preview in view'));
elements.returnToSourceButton.addEventListener('click', () => focusPane(elements.sourcePane, 'Source editor in view'));

elements.instrumentControl.addEventListener('click', (event) => {
  const button = event.target.closest('.segment');
  if (!button) return;
  instrument = button.dataset.value;
  document.querySelectorAll('#instrumentControl .segment').forEach((candidate) => {
    const active = candidate === button;
    candidate.classList.toggle('is-active', active);
    candidate.setAttribute('aria-pressed', String(active));
  });
  setSystemMessage(`${instrument[0].toUpperCase() + instrument.slice(1)} model active`);
  requestRender(0);
});

elements.styleControl.addEventListener('click', (event) => {
  const button = event.target.closest('.segment');
  if (!button) return;
  activateWritingStyle(button.dataset.value);
});

elements.paperTextureToggle.addEventListener('change', () => {
  const enabled = elements.paperTextureToggle.checked;
  elements.paperTexture.value = enabled ? 'fine' : 'none';
  requestRender(0);
  setSystemMessage(`Paper texture ${enabled ? 'enabled' : 'disabled'}`);
});

for (const id of PARAMETER_IDS) {
  const element = elements[id];
  const eventName = ['SELECT', 'INPUT'].includes(element.tagName) && ['range', 'number', 'color'].includes(element.type) ? 'input' : 'change';
  element.addEventListener(eventName, () => {
    updateOutput(id);
    if (id === 'readability') {
      applyReadabilityPreset();
      return;
    }
    if (id === 'seed') {
      applyReadabilityPreset({ announce: false });
      setSystemMessage(`Readability profile updated for seed ${elements.seed.value}`);
      return;
    }
    if (id === 'writingStyle') {
      activateWritingStyle(elements.writingStyle.value);
      return;
    }
    if (id === 'paperWear') paperWearSeed = randomUint32();
    if (id === 'paperColor') elements.paperColorCode.textContent = elements.paperColor.value.toUpperCase();
    if (id === 'paper' || id === 'scanMode') updateMaterialReadout(collectProfile());
    setSystemMessage('Parameters synchronized');
    requestRender();
  });
}

elements.sourceText.addEventListener('input', () => {
  if (elements.sourceText.value.length > MAX_SOURCE_CODE_UNITS) {
    elements.sourceText.value = truncateUtf16Safely(elements.sourceText.value, MAX_SOURCE_CODE_UNITS);
    setSystemMessage('Source limited to a safe processing size');
  }
  if (elements.sourceText.value.length > MAX_SOURCE_CHARACTERS) {
    const graphemes = segmentGraphemes(elements.sourceText.value);
    if (graphemes.length > MAX_SOURCE_CHARACTERS) {
      elements.sourceText.value = graphemes.slice(0, MAX_SOURCE_CHARACTERS).join('');
      setSystemMessage(`Source limited to ${MAX_SOURCE_CHARACTERS.toLocaleString()} characters`);
    }
  }
  requestRender();
});
elements.clearButton.addEventListener('click', () => {
  elements.sourceText.value = '';
  elements.sourceText.focus();
  setSystemMessage('Source cleared');
  requestRender(0);
});

elements.importButton.addEventListener('click', () => elements.sourceFile.click());
elements.sourceFile.addEventListener('change', async () => {
  const [file] = elements.sourceFile.files;
  elements.sourceFile.value = '';
  if (!file) return;
  const kind = sourceKindFromFile(file);
  if (!kind) {
    setSystemMessage('Choose a .txt or .md file');
    return;
  }
  if (file.size > MAX_SOURCE_FILE_BYTES) {
    setSystemMessage('File is too large to process safely');
    return;
  }

  elements.engineStatus.textContent = 'Reading file';
  try {
    const raw = (await file.text()).replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
    if (raw.length > MAX_SOURCE_CODE_UNITS) {
      setSystemMessage('File contains unusually long character data');
      elements.engineStatus.textContent = 'Ready';
      return;
    }
    const prepared = kind === 'markdown' ? formatMarkdownForHandwriting(raw) : raw;
    if (prepared.length > MAX_SOURCE_CODE_UNITS) {
      setSystemMessage('File contains unusually long character data');
      elements.engineStatus.textContent = 'Ready';
      return;
    }
    const characterCount = segmentGraphemes(prepared).length;
    if (characterCount > MAX_SOURCE_CHARACTERS) {
      setSystemMessage(`File exceeds the ${MAX_SOURCE_CHARACTERS.toLocaleString()} character limit`);
      elements.engineStatus.textContent = 'Ready';
      return;
    }
    elements.sourceText.value = prepared;
    currentPageIndex = 0;
    render();
    setSystemMessage(`${file.name} imported · ${characterCount.toLocaleString()} characters`);
  } catch {
    elements.engineStatus.textContent = 'Ready';
    setSystemMessage('This file could not be read');
  }
});

elements.newSeedButton.addEventListener('click', () => {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  elements.seed.value = 1 + (values[0] % 999999);
  paperWearSeed = randomUint32();
  updateOutput('seed');
  setSystemMessage(`New sample ${elements.seed.value}`);
  applyReadabilityPreset({ announce: false });
});

elements.pdfButton.addEventListener('click', async () => {
  render();
  const exportDocument = currentDocument;
  elements.pdfButton.disabled = true;
  elements.engineStatus.textContent = 'Preparing PDF';
  setSystemMessage(`Preparing ${exportDocument.pageCount.toLocaleString()} PDF ${exportDocument.pageCount === 1 ? 'page' : 'pages'}`);
  elements.printDocument.replaceChildren();
  elements.printDocument.style.setProperty('--print-page-width', exportDocument.printWidth);
  elements.printDocument.style.setProperty('--print-page-height', exportDocument.printHeight);
  setPrintPageSize(exportDocument);
  for (let pageIndex = 0; pageIndex < exportDocument.pageCount; pageIndex += 1) {
    const page = document.createElement('div');
    page.className = 'print-page';
    const canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    exportDocument.renderPage(canvas, pageIndex);
    page.append(canvas);
    elements.printDocument.append(page);
    if (pageIndex % 2 === 1) await new Promise((resolve) => requestAnimationFrame(resolve));
  }
  setSystemMessage('Print dialog opened. Choose “Save as PDF”');
  elements.engineStatus.textContent = 'Ready';
  elements.pdfButton.disabled = false;
  const releasePrintPages = () => elements.printDocument.replaceChildren();
  window.addEventListener('afterprint', releasePrintPages, { once: true });
  window.print();
  window.setTimeout(releasePrintPages, 60_000);
});

elements.metadataButton.addEventListener('click', () => {
  const manifest = currentManifest();
  const profile = manifest.generator.profile;
  elements.metadataPrivacySummary.textContent = manifest.source.retainedByApp ? 'Source text retained' : 'Source text excluded';
  elements.metadataOutputSummary.textContent = `${manifest.output.pageCount.toLocaleString()} ${manifest.output.pageCount === 1 ? 'page' : 'pages'} · ${manifest.output.glyphCount.toLocaleString()} glyphs`;
  elements.metadataStyleSummary.textContent = `${profile.writingStyle === 'print' ? 'Print' : 'Cursive'} · ${profile.instrument}`;
  elements.metadataSeedSummary.textContent = String(manifest.generator.seed);
  elements.metadataPreview.textContent = JSON.stringify(manifest, null, 2);
  elements.metadataDialog.showModal();
});

elements.downloadMetadataButton.addEventListener('click', () => {
  const manifest = currentManifest();
  downloadBlob(new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' }), `scribble-lab-${manifest.generator.seed}.json`);
  elements.metadataDialog.close();
  setSystemMessage('Metadata export ready');
});

elements.profileForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const name = elements.profileName.value.trim();
  if (!name) return;
  profiles = upsertProfile(profiles, collectProfile({ name }));
  const saved = writeProfiles(profiles);
  renderProfileList();
  setSystemMessage(saved ? `Saved “${name}” locally` : 'Browser storage is unavailable');
});

renderProfileList();
PARAMETER_IDS.forEach(updateOutput);
applyReadabilityPreset({ announce: false, immediate: true });
