import {
  DEFAULT_PROFILE,
  createHandwritingDocument,
  createExportManifest,
  normalizeProfile,
  segmentGraphemes,
} from './handwriting-engine.js';
import {
  MAX_SOURCE_CHARACTERS,
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

const PARAMETER_IDS = [
  'readability', 'seed', 'size', 'lineHeight', 'spacing', 'speed', 'shakiness', 'pressure',
  'pressureVariation', 'grip', 'wristAngle', 'slant', 'connection', 'reservoir', 'wristSupport',
  'penKind', 'writingStyle', 'construction', 'paper', 'inkColor', 'paperTexture',
];

const elements = Object.fromEntries(
  [
    ...PARAMETER_IDS,
    'sourceText', 'sourceFile', 'outputCanvas', 'characterCount', 'lineCount', 'pageCount', 'pagePosition', 'renderTime',
    'previewSubtitle', 'engineStatus', 'systemMessage', 'instrumentControl', 'styleControl', 'newSeedButton',
    'clearButton', 'importButton', 'pdfButton', 'metadataButton', 'metadataDialog', 'metadataPreview',
    'downloadMetadataButton', 'profileForm', 'profileName', 'profileList', 'colorCode',
    'materialReadout', 'paperTextureToggle', 'previousPageButton', 'nextPageButton', 'printDocument',
  ].map((id) => [id, document.getElementById(id)]),
);

let instrument = DEFAULT_PROFILE.instrument;
let profiles = readProfiles();
if (!profiles.length) profiles = createStarterProfiles();
let lastResult = null;
let currentDocument = null;
let currentPageIndex = 0;
let renderTimer = null;

function formatOutput(id, value) {
  if (id === 'readability') return `${readabilityLabel(value)} · ${value}%`;
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
  const profile = collectProfile();
  updateMaterialReadout(profile);
  setSystemMessage(`${writingStyle === 'print' ? 'Print' : 'Cursive'} writing active`);
  requestRender(0);
}

function collectProfile(overrides = {}) {
  return normalizeProfile({
    ...Object.fromEntries(PARAMETER_IDS.map((id) => [id, elements[id].type === 'checkbox' ? elements[id].checked : elements[id].value])),
    instrument,
    ...overrides,
  });
}

function setSystemMessage(message) {
  elements.systemMessage.textContent = message;
}

function applyReadabilityPreset({ announce = true, renderDelay = 0 } = {}) {
  const level = Number(elements.readability.value);
  const adjustments = deriveReadabilityAdjustments(level, elements.seed.value);
  for (const [id, value] of Object.entries(adjustments)) {
    if (elements[id].type === 'checkbox') elements[id].checked = value;
    else elements[id].value = value;
    updateOutput(id);
  }
  updateOutput('readability');
  updateMaterialReadout(collectProfile());
  if (announce) setSystemMessage(`${readabilityLabel(level)} readability target applied`);
  requestRender(renderDelay);
}

function updateMaterialReadout(profile) {
  const instrumentLabel = profile.instrument === 'pen'
    ? (profile.penKind === 'fountain' ? 'Fountain nib' : 'Ballpoint')
    : profile.instrument[0].toUpperCase() + profile.instrument.slice(1);
  const paperLabel = {
    notebook: 'ruled paper', ivory: 'warm ivory', bright: 'bright stock', recycled: 'rough recycled',
  }[profile.paper];
  const writingLabel = profile.writingStyle === 'print' ? 'simplex print' : `${profile.construction} cursive`;
  elements.materialReadout.querySelector('strong').textContent = `${instrumentLabel} · ${writingLabel} · ${paperLabel}`;
  elements.penKind.disabled = profile.instrument !== 'pen';
  elements.construction.disabled = profile.writingStyle === 'print';
  elements.connection.disabled = profile.writingStyle === 'print';
  elements.construction.title = profile.writingStyle === 'print' ? 'Cursive detail applies only to cursive writing' : '';
  elements.connection.title = profile.writingStyle === 'print' ? 'Printed letters are not joined' : '';
  elements.colorCode.textContent = profile.inkColor.toUpperCase();
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
  const startedAt = performance.now();
  currentDocument.renderPage(elements.outputCanvas, currentPageIndex);
  const elapsed = Math.max(1, Math.round(performance.now() - startedAt));
  elements.renderTime.textContent = `Render ${elapsed} ms`;
  elements.outputCanvas.setAttribute(
    'aria-label',
    `Generated synthetic handwriting preview, page ${currentPageIndex + 1} of ${currentDocument.pageCount}`,
  );
  updatePageNavigation();
}

function render() {
  const text = elements.sourceText.value;
  const profile = collectProfile();
  elements.engineStatus.textContent = 'Rendering';
  currentDocument = createHandwritingDocument(text, profile);
  lastResult = currentDocument;
  currentPageIndex = Math.min(currentPageIndex, currentDocument.pageCount - 1);
  renderCurrentPage();
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
    loadButton.innerHTML = `<strong></strong><small></small>`;
    loadButton.querySelector('strong').textContent = profile.name;
    loadButton.querySelector('small').textContent = `${profile.instrument} · ${profile.writingStyle} · ${profile.seed}`;
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

function currentManifest() {
  return createExportManifest(
    elements.sourceText.value,
    lastResult || createHandwritingDocument(elements.sourceText.value, collectProfile()),
  );
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
    document.querySelector('.page-shadow').classList.toggle('is-actual-size', actualSize);
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
    if (id === 'writingStyle') updateMaterialReadout(collectProfile());
    setSystemMessage(id === 'writingStyle'
      ? `${elements.writingStyle.value === 'print' ? 'Print' : 'Cursive'} writing active`
      : 'Parameters synchronized');
    requestRender();
  });
}

elements.sourceText.addEventListener('input', () => {
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
    const prepared = kind === 'markdown' ? formatMarkdownForHandwriting(raw) : raw;
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
  elements.metadataPreview.textContent = JSON.stringify(currentManifest(), null, 2);
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
render();
