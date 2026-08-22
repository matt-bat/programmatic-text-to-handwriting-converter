import { getStrokeGlyph, measureStrokeGlyph, strokeScale } from './stroke-font.js';

export const PROFILE_VERSION = 4;
export const DOCUMENT_PAGE_WIDTH = 1100;
export const DOCUMENT_PAGE_HEIGHT = 1424;
export const DOCUMENT_PAGE_MARGIN = 84;

export const DEFAULT_PROFILE = Object.freeze({
  name: 'Studio default',
  readability: 65,
  instrument: 'pen',
  penKind: 'ballpoint',
  writingStyle: 'cursive',
  construction: 'simplex',
  paper: 'notebook',
  inkColor: '#233d4d',
  size: 34,
  lineHeight: 1.62,
  speed: 54,
  shakiness: 24,
  wristSupport: true,
  pressure: 58,
  pressureVariation: 36,
  grip: 44,
  wristAngle: -5,
  slant: 7,
  connection: 38,
  spacing: 3,
  reservoir: 88,
  paperTexture: 'fine',
  seed: 43182,
});

const LIMITS = Object.freeze({
  readability: [0, 100],
  size: [22, 52],
  lineHeight: [1.25, 2.1],
  speed: [0, 100],
  shakiness: [0, 100],
  pressure: [0, 100],
  pressureVariation: [0, 100],
  grip: [0, 100],
  wristAngle: [-25, 25],
  slant: [-18, 24],
  connection: [0, 100],
  spacing: [-2, 14],
  reservoir: [8, 100],
  seed: [1, 999999],
});

const INSTRUMENTS = new Set(['pen', 'pencil', 'marker']);
const PEN_KINDS = new Set(['ballpoint', 'fountain']);
const WRITING_STYLES = new Set(['cursive', 'print']);
const CONSTRUCTIONS = new Set(['simplex', 'complex']);
const PAPERS = new Set(['notebook', 'ivory', 'bright', 'recycled']);

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function numberWithin(value, key) {
  const [min, max] = LIMITS[key];
  const parsed = Number(value);
  return clamp(Number.isFinite(parsed) ? parsed : DEFAULT_PROFILE[key], min, max);
}

export function normalizeProfile(input = {}) {
  const profile = { ...DEFAULT_PROFILE, ...input };
  for (const key of Object.keys(LIMITS)) profile[key] = numberWithin(profile[key], key);
  profile.seed = Math.round(profile.seed);
  profile.wristSupport = Boolean(profile.wristSupport);
  profile.instrument = INSTRUMENTS.has(profile.instrument) ? profile.instrument : DEFAULT_PROFILE.instrument;
  profile.penKind = PEN_KINDS.has(profile.penKind) ? profile.penKind : DEFAULT_PROFILE.penKind;
  profile.writingStyle = WRITING_STYLES.has(profile.writingStyle) ? profile.writingStyle : DEFAULT_PROFILE.writingStyle;
  profile.construction = CONSTRUCTIONS.has(profile.construction) ? profile.construction : DEFAULT_PROFILE.construction;
  profile.paper = PAPERS.has(profile.paper) ? profile.paper : DEFAULT_PROFILE.paper;
  profile.paperTexture = ['fine', 'none'].includes(profile.paperTexture) ? profile.paperTexture : DEFAULT_PROFILE.paperTexture;
  profile.inkColor = /^#[0-9a-f]{6}$/i.test(profile.inkColor) ? profile.inkColor : DEFAULT_PROFILE.inkColor;
  profile.name = String(profile.name || DEFAULT_PROFILE.name).slice(0, 48);
  return profile;
}

export function hashSeed(value) {
  const text = String(value);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0 || 1;
}

export function createRng(seed) {
  let state = hashSeed(seed);
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let result = Math.imul(state ^ (state >>> 15), 1 | state);
    result = (result + Math.imul(result ^ (result >>> 7), 61 | result)) ^ result;
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

export function deriveWriterStyle(input) {
  const profile = normalizeProfile(input);
  const rng = createRng(`writer:${profile.seed}:${profile.writingStyle}`);
  return {
    widthScale: 0.82 + rng() * 0.36,
    heightScale: 0.92 + rng() * 0.18,
    shearOffset: (rng() * 2 - 1) * 0.13,
    rotation: (rng() * 2 - 1) * 0.04,
    shapeVariation: 0.9 + rng() * 0.6,
    letterVariation: 0.8 + rng() * 0.5,
    motionScale: 0.75 + rng() * 0.55,
    pressureOffset: (rng() * 2 - 1) * 0.08,
  };
}

export function deriveDynamics(input) {
  const profile = normalizeProfile(input);
  const speed = profile.speed / 100;
  const shake = profile.shakiness / 100;
  const gripDistance = Math.abs(profile.grip - 48) / 52;
  const support = profile.wristSupport ? 0.58 : 1;
  const surface = profile.paper === 'recycled' ? 1.32 : profile.paper === 'ivory' ? 1.1 : 1;
  const instrument = profile.instrument === 'marker' ? 0.72 : profile.instrument === 'pencil' ? 1.14 : 1;
  return {
    jitter: (0.3 + shake * 2.9 + gripDistance * 0.72) * support * surface * instrument,
    drift: (0.4 + (1 - speed) * 1.45) * support,
    trackingNoise: 0.18 + shake * 0.72 + speed * 0.2,
    pressureFloor: 0.34 + (profile.pressure / 100) * 0.44,
    pressureSwing: (profile.pressureVariation / 100) * 0.32,
    shear: Math.tan(((profile.slant + profile.wristAngle * 0.28) * Math.PI) / 180),
    rotation: (profile.wristAngle * 0.018 + (speed - 0.5) * 0.3) * (Math.PI / 180),
    shapeVariation: 1.15 + shake * 2.2 + gripDistance * 0.5 + (1 - speed) * 0.35,
  };
}

export function varyStrokePathsKinematic(paths, amount, rng, instanceSeed = 0) {
  const strength = clamp(Number(amount) || 0.8, 0.2, 4);
  const instRng = createRng(`warp:${instanceSeed}`);

  const scaleX = 0.94 + instRng() * 0.12;
  const scaleY = 0.94 + instRng() * 0.12;
  const phaseShift = instRng() * Math.PI * 2;
  const freqX = 1 + instRng() * 1.5;
  const freqY = 1 + instRng() * 1.5;

  return paths.map((path) => {
    const bendX = (instRng() - 0.5) * strength * 2.2;
    const bendY = (instRng() - 0.5) * strength * 1.8;
    const pathShiftX = (instRng() - 0.5) * strength * 1.4;
    const pathShiftY = (instRng() - 0.5) * strength * 1.4;

    let cumDx = 0;
    let cumDy = 0;

    return path.map((point, index) => {
      const progress = index / Math.max(1, path.length - 1);
      const wave = Math.sin(progress * Math.PI * freqX + phaseShift);
      const waveY = Math.cos(progress * Math.PI * freqY + phaseShift);

      cumDx = cumDx * 0.65 + (rng() - 0.5) * strength * 0.8;
      cumDy = cumDy * 0.65 + (rng() - 0.5) * strength * 0.8;

      const arc = Math.sin(progress * Math.PI);

      const px = point[0] * scaleX + pathShiftX + bendX * arc + wave * strength * 0.9 + cumDx;
      const py = point[1] * scaleY + pathShiftY + bendY * arc + waveY * strength * 0.7 + cumDy;
      return [px, py];
    });
  });
}

export function varyStrokePaths(paths, amount, rng) {
  return varyStrokePathsKinematic(paths, amount, rng, 0);
}

export function segmentGraphemes(text) {
  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    const graphemes = [];
    const segments = new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text);
    for (const part of segments) graphemes.push(part.segment);
    return graphemes;
  }
  return Array.from(text);
}

export function layoutText(text, measure, options = {}) {
  const width = options.width ?? 1100;
  const margin = options.margin ?? 84;
  const fontSize = options.fontSize ?? 34;
  const lineHeight = options.lineHeight ?? 1.62;
  const spacing = options.spacing ?? 3;
  const usable = width - margin * 2;
  const glyphs = [];
  let x = margin;
  let y = margin + fontSize;
  let line = 1;

  const nextLine = () => {
    x = margin;
    y += fontSize * lineHeight;
    line += 1;
  };

  const place = (glyph, allowWrap = true) => {
    const glyphWidth = Math.max(1, measure(glyph));
    if (allowWrap && x > margin && x + glyphWidth > margin + usable && glyph.trim()) nextLine();
    glyphs.push({ glyph, x, y, line, width: glyphWidth });
    x += glyphWidth + (glyph.trim() ? spacing : 0);
  };

  const tokens = String(text).replace(/\r\n?/g, '\n').match(/\n|\t| +|[^\s]+/gu) || [];
  for (const token of tokens) {
    if (token === '\n') {
      nextLine();
      continue;
    }
    if (token === '\t') {
      for (let index = 0; index < 4; index += 1) place(' ');
      continue;
    }
    const tokenGlyphs = segmentGraphemes(token);
    const tokenWidth = tokenGlyphs.reduce((total, glyph) => total + Math.max(1, measure(glyph)) + (glyph.trim() ? spacing : 0), 0);
    const isWord = token.trim().length > 0;
    if (isWord && tokenWidth <= usable && x > margin && x + tokenWidth > margin + usable) nextLine();
    for (const glyph of tokenGlyphs) place(glyph, tokenWidth > usable);
  }

  return {
    glyphs,
    lineCount: line,
    contentHeight: Math.ceil(y + margin + fontSize * 0.55),
  };
}

function paperPalette(paper) {
  return {
    notebook: { base: '#f5f0df', fleck: '#a9a08d', rule: '#b8ced4' },
    ivory: { base: '#f4ead3', fleck: '#aa9270', rule: null },
    bright: { base: '#fbfaf5', fleck: '#b8b5aa', rule: null },
    recycled: { base: '#dfd1ad', fleck: '#7d765f', rule: null },
  }[paper];
}

function generatePaperTexture(ctx, width, height, rng) {
  // Simple fine-grain texture using semi-transparent tiny dots
  const grainCount = Math.min(30_000, Math.round((width * height) / 80));
  ctx.fillStyle = '#000000';
  for (let i = 0; i < grainCount; i++) {
    const x = rng() * width;
    const y = rng() * height;
    const radius = rng() * 0.6 + 0.2; // 0.2 to 0.8 px
    const alpha = rng() * 0.03 + 0.02; // 0.02 to 0.05 opacity
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1; // reset
}

function drawPaper(ctx, width, height, profile, rng) {
  const palette = paperPalette(profile.paper);
  ctx.fillStyle = palette.base;
  ctx.fillRect(0, 0, width, height);

  const fiberCount = Math.min(350, Math.round((width * height) / 4500));
  const fiberColors = [palette.fleck, '#8c8270', '#b5ab98', '#9e917d'];
  ctx.lineWidth = 0.85;
  for (let index = 0; index < fiberCount; index += 1) {
    const fx = rng() * width;
    const fy = rng() * height;
    const len = 4 + rng() * 14;
    const angle = rng() * Math.PI * 2;
    const curvature = (rng() - 0.5) * 0.6;
    ctx.strokeStyle = fiberColors[Math.floor(rng() * fiberColors.length)];
    ctx.globalAlpha = 0.02 + rng() * 0.045;
    ctx.beginPath();
    ctx.moveTo(fx, fy);
    ctx.quadraticCurveTo(
      fx + Math.cos(angle + curvature) * len * 0.5,
      fy + Math.sin(angle + curvature) * len * 0.5,
      fx + Math.cos(angle) * len,
      fy + Math.sin(angle) * len,
    );
    ctx.stroke();
  }

  // Add fine-grain texture overlay if enabled
  if (profile.paperTexture !== 'none') {
    generatePaperTexture(ctx, width, height, rng);
  }

  const flecks = Math.min(12_000, Math.round((width * height) / 140));
  ctx.fillStyle = palette.fleck;
  for (let index = 0; index < flecks; index += 1) {
    ctx.globalAlpha = 0.012 + rng() * 0.035;
    const radius = rng() > 0.92 ? 1.2 : 0.45;
    ctx.fillRect(rng() * width, rng() * height, radius, radius);
  }

  const vignette = ctx.createRadialGradient(
    width * (0.45 + rng() * 0.1),
    height * (0.45 + rng() * 0.1),
    width * 0.2,
    width * 0.5,
    height * 0.5,
    width * 0.75,
  );
  vignette.addColorStop(0, 'rgba(255, 255, 255, 0.03)');
  vignette.addColorStop(1, 'rgba(120, 100, 80, 0.045)');
  ctx.fillStyle = vignette;
  ctx.globalAlpha = 1;
  ctx.fillRect(0, 0, width, height);

  if (palette.rule) {
    ctx.strokeStyle = palette.rule;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 1;
    for (let y = 126; y < height; y += profile.size * profile.lineHeight) {
      ctx.beginPath();
      ctx.moveTo(0, y + 9);
      ctx.lineTo(width, y + 9);
      ctx.stroke();
    }
    ctx.strokeStyle = '#cf8d8d';
    ctx.globalAlpha = 0.36;
    ctx.beginPath();
    ctx.moveTo(70, 0);
    ctx.lineTo(70, height);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

function instrumentStyle(profile) {
  if (profile.instrument === 'pencil') {
    return { alpha: 0.7, width: 0.92, layers: 2, blur: 0, spread: 0.24, grain: 0.2 };
  }
  if (profile.instrument === 'marker') {
    return { alpha: 0.76, width: 3.15, layers: 2, blur: 0.35, spread: 0.48, grain: 0.02 };
  }
  if (profile.penKind === 'fountain') {
    return { alpha: 0.92, width: 1.48, layers: 2, blur: 0, spread: 0.12, grain: 0.02 };
  }
  return { alpha: 0.9, width: 1.24, layers: 1, blur: 0, spread: 0, grain: 0.03 };
}

function drawGlyph(ctx, item, state, profile, dynamics, writer, rng, style, instanceIndex = 0) {
  if (!item.glyph.trim()) return;
  const instanceSeed = hashSeed(`instance:${profile.seed}:${instanceIndex}:${item.glyph}`);
  const glyph = getStrokeGlyph(item.glyph, profile.construction, profile.writingStyle, instanceSeed);
  const paths = varyStrokePathsKinematic(
    [...glyph.paths, ...glyph.marks],
    dynamics.shapeVariation * writer.shapeVariation,
    rng,
    instanceSeed,
  );
  const scale = strokeScale(profile.size);
  const reservoir = profile.instrument === 'pencil' ? 1 : profile.reservoir / 100;
  const rotation = dynamics.rotation + writer.rotation + state.rotation;
  const segmentCount = paths.reduce((count, path) => count + Math.max(0, path.length - 1), 0);
  let segmentIndex = 0;

  ctx.save();
  ctx.translate(item.x + state.x, item.y + state.y);
  ctx.rotate(rotation);
  ctx.scale(state.scaleX, state.scaleY);
  ctx.transform(1, 0, dynamics.shear + writer.shearOffset, 1, 0, 0);
  ctx.filter = style.blur ? `blur(${style.blur}px)` : 'none';
  ctx.strokeStyle = profile.inkColor;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (let layer = 0; layer < style.layers; layer += 1) {
    const layerOffset = (layer - (style.layers - 1) / 2) * style.spread;
    segmentIndex = 0;
    for (const path of paths) {
      for (let index = 1; index < path.length; index += 1) {
        const progress = segmentIndex / Math.max(1, segmentCount - 1);
        const pulse = Math.sin(progress * Math.PI * 2 + state.pressurePhase) * dynamics.pressureSwing;
        const pressure = clamp(
          dynamics.pressureFloor + writer.pressureOffset + pulse + (rng() - 0.5) * dynamics.pressureSwing * 0.42,
          0.14,
          1,
        );
        const dropout = reservoir < 0.44 && rng() > reservoir + 0.48;
        const pencilBreak = profile.instrument === 'pencil' && rng() < style.grain * 0.055;
        segmentIndex += 1;
        if (dropout || pencilBreak) continue;

        const start = path[index - 1];
        const end = path[index];
        const micro = dynamics.jitter * 0.055;
        const startX = (start[0] + (rng() - 0.5) * micro) * scale + layerOffset;
        const startY = (start[1] - 22 + (rng() - 0.5) * micro) * scale + layerOffset * 0.35;
        const endX = (end[0] + (rng() - 0.5) * micro) * scale + layerOffset;
        const endY = (end[1] - 22 + (rng() - 0.5) * micro) * scale + layerOffset * 0.35;
        const angle = Math.atan2(endY - startY, endX - startX);
        const nibFactor = profile.penKind === 'fountain'
          ? 0.72 + Math.abs(Math.sin(angle - (profile.wristAngle * Math.PI) / 180)) * 0.62
          : 1;
        const layerAlpha = style.layers === 1 ? 1 : 0.62;
        const grainAlpha = profile.instrument === 'pencil' ? 0.68 + rng() * 0.3 : 1;
        ctx.globalAlpha = style.alpha * layerAlpha * grainAlpha * (0.7 + reservoir * 0.3);
        ctx.lineWidth = style.width * (0.52 + pressure * 0.78) * nibFactor * (profile.size / 34);
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
      }
    }
  }
  ctx.restore();
}

function nextWriterState(previous, dynamics, writer, rng) {
  const targetScaleX = writer.widthScale * (1 + (rng() - 0.5) * 0.24 * writer.letterVariation);
  const targetScaleY = writer.heightScale * (1 + (rng() - 0.5) * 0.16 * writer.letterVariation);
  return {
    x: previous.x * 0.62 + (rng() - 0.5) * (dynamics.jitter + dynamics.trackingNoise) * writer.motionScale,
    y: previous.y * 0.72 + ((rng() - 0.5) * dynamics.jitter + (rng() - 0.5) * dynamics.drift) * writer.motionScale,
    rotation: previous.rotation * 0.52 + (rng() - 0.5) * (0.045 + dynamics.jitter * 0.008) * writer.letterVariation,
    pressurePhase: previous.pressurePhase + 0.72 + rng() * 0.8,
    scaleX: previous.scaleX * 0.48 + targetScaleX * 0.52,
    scaleY: previous.scaleY * 0.54 + targetScaleY * 0.46,
  };
}

function canConnect(previous, current) {
  return previous
    && previous.line === current.line
    && /^[\p{L}\p{N}]$/u.test(previous.glyph)
    && /^[\p{L}\p{N}]$/u.test(current.glyph);
}

function drawConnector(ctx, previous, current, previousState, state, profile, dynamics, rng, style) {
  const connectionChance = (profile.connection / 100) * (0.38 + (profile.speed / 100) * 0.54);
  if (profile.writingStyle !== 'cursive' || !canConnect(previous, current) || rng() > connectionChance) return;

  const prevGlyphData = getStrokeGlyph(previous.glyph, profile.construction, profile.writingStyle);
  const highExit = prevGlyphData.exitType === 'high';

  const startX = previous.x + previousState.x + previous.width * 0.72;
  const endX = current.x + state.x + Math.min(3, current.width * 0.08);
  const baseline = current.y - profile.size * 0.16;
  const startY = highExit
    ? baseline + previousState.y - profile.size * 0.36
    : baseline + previousState.y;

  const lift = (rng() - 0.5) * dynamics.jitter * 1.8;
  ctx.save();
  ctx.strokeStyle = profile.inkColor;
  ctx.globalAlpha = style.alpha * (0.38 + dynamics.pressureFloor * 0.34) * (0.72 + profile.reservoir / 360);
  ctx.lineWidth = style.width * (profile.instrument === 'marker' ? 0.82 : 0.68) * (profile.size / 34);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.bezierCurveTo(
    startX + (endX - startX) * 0.36,
    startY + lift,
    startX + (endX - startX) * 0.68,
    baseline + state.y - lift,
    endX,
    baseline + state.y,
  );
  ctx.stroke();
  ctx.restore();
}

export function createHandwritingDocument(text, inputProfile = {}) {
  const profile = normalizeProfile(inputProfile);
  const writer = deriveWriterStyle(profile);
  const source = String(text || ' ');
  let layoutIndex = 0;
  const layout = layoutText(source, (glyph) => {
    const glyphSize = measureStrokeGlyph(glyph, profile.size, profile.construction, profile.writingStyle, layoutIndex);
    layoutIndex += 1;
    return glyphSize * writer.widthScale;
  }, {
    width: DOCUMENT_PAGE_WIDTH,
    margin: DOCUMENT_PAGE_MARGIN,
    fontSize: profile.size,
    lineHeight: profile.lineHeight,
    spacing: profile.spacing,
  });
  const lineStep = profile.size * profile.lineHeight;
  const firstBaseline = DOCUMENT_PAGE_MARGIN + profile.size;
  const lastBaseline = DOCUMENT_PAGE_HEIGHT - DOCUMENT_PAGE_MARGIN - profile.size * 0.55;
  const linesPerPage = Math.max(1, Math.floor((lastBaseline - firstBaseline) / lineStep) + 1);
  const pageCount = Math.max(1, Math.ceil(layout.lineCount / linesPerPage));
  const pages = Array.from({ length: pageCount }, () => []);
  layout.glyphs.forEach((item, instanceIndex) => {
    const pageIndex = Math.min(pageCount - 1, Math.floor((item.line - 1) / linesPerPage));
    pages[pageIndex].push({
      ...item,
      y: item.y - pageIndex * linesPerPage * lineStep,
      instanceIndex,
    });
  });

  const result = {
    profile,
    width: DOCUMENT_PAGE_WIDTH,
    height: DOCUMENT_PAGE_HEIGHT,
    pageCount,
    linesPerPage,
    lineCount: layout.lineCount,
    glyphCount: layout.glyphs.filter((item) => item.glyph.trim()).length,
    seed: profile.seed,
    engine: `Scribble Dynamics v${PROFILE_VERSION}`,
    strokeModel: profile.writingStyle === 'print'
      ? 'Hershey simplex print · public domain'
      : `Hershey ${profile.construction} script · public domain`,
  };

  return {
    ...result,
    renderPage(canvas, requestedPageIndex = 0) {
      if (!canvas?.getContext || !canvas.ownerDocument) throw new TypeError('A browser canvas is required.');
      const pageIndex = clamp(Math.round(Number(requestedPageIndex) || 0), 0, pageCount - 1);
      const ctx = canvas.getContext('2d');
      canvas.width = DOCUMENT_PAGE_WIDTH;
      canvas.height = DOCUMENT_PAGE_HEIGHT;

      const paperRng = createRng(`paper:${profile.seed}:${source}:page:${pageIndex}`);
      const rng = createRng(`strokes:${profile.seed}:${profile.writingStyle}:${source}:page:${pageIndex}`);
      drawPaper(ctx, DOCUMENT_PAGE_WIDTH, DOCUMENT_PAGE_HEIGHT, profile, paperRng);
      const style = instrumentStyle(profile);
      const dynamics = deriveDynamics(profile);
      let state = {
        x: 0,
        y: 0,
        rotation: 0,
        pressurePhase: rng() * Math.PI * 2,
        scaleX: writer.widthScale,
        scaleY: writer.heightScale,
      };
      let previousItem = null;
      let previousState = state;
      let previousLine = pages[pageIndex][0]?.line ?? 1;

      for (const item of pages[pageIndex]) {
        if (item.line !== previousLine) {
          state.y *= 0.34;
          state.x *= 0.2;
          previousLine = item.line;
        }
        previousState = state;
        state = nextWriterState(state, dynamics, writer, rng);
        drawConnector(ctx, previousItem, item, previousState, state, profile, dynamics, rng, style);
        drawGlyph(ctx, item, state, profile, dynamics, writer, rng, style, item.instanceIndex);
        previousItem = item.glyph.trim() ? item : null;
      }

      canvas.dataset.page = String(pageIndex + 1);
      return { ...result, pageIndex };
    },
  };
}

export function renderHandwriting(canvas, text, inputProfile = {}) {
  const documentModel = createHandwritingDocument(text, inputProfile);
  documentModel.renderPage(canvas, 0);
  return documentModel;
}

export function createExportManifest(text, renderResult) {
  return {
    schema: 'scribble-lab.synthetic-handwriting.v1',
    createdAt: new Date().toISOString(),
    source: { characterCount: segmentGraphemes(text).length, retainedByApp: false },
    output: {
      width: renderResult.width,
      height: renderResult.height,
      pageCount: renderResult.pageCount ?? 1,
      lineCount: renderResult.lineCount,
      glyphCount: renderResult.glyphCount,
    },
    generator: {
      engine: renderResult.engine,
      strokeModel: renderResult.strokeModel,
      seed: renderResult.seed,
      profile: renderResult.profile,
      identityConditioned: false,
      externalHandwritingSamples: false,
    },
  };
}
