import { getStrokeGlyph, measureStrokeGlyph, strokeScale } from './stroke-font.js';

export const PROFILE_VERSION = 5;
export const DOCUMENT_PAGE_WIDTH = 1100;
export const DOCUMENT_PAGE_HEIGHT = 1424;
export const DOCUMENT_PAGE_MARGIN = 84;

export const PAGE_SIZES = Object.freeze({
  letter: Object.freeze({ label: 'US Letter', width: 1100, height: 1424, printWidth: '8.5in', printHeight: '11in' }),
  a4: Object.freeze({ label: 'A4', width: 1100, height: 1556, printWidth: '210mm', printHeight: '297mm' }),
  legal: Object.freeze({ label: 'US Legal', width: 1100, height: 1812, printWidth: '8.5in', printHeight: '14in' }),
  cardstock: Object.freeze({ label: '5 × 7 card', width: 1100, height: 1540, printWidth: '5in', printHeight: '7in' }),
  business: Object.freeze({ label: 'Business card', width: 1100, height: 629, printWidth: '3.5in', printHeight: '2in' }),
  square: Object.freeze({ label: 'Square', width: 1100, height: 1100, printWidth: '6in', printHeight: '6in' }),
});

export const DEFAULT_PROFILE = Object.freeze({
  name: 'Studio default',
  readability: 65,
  instrument: 'pen',
  penKind: 'ballpoint',
  writingStyle: 'cursive',
  construction: 'simplex',
  paper: 'notebook',
  paperColor: '#dce6ef',
  pageSize: 'letter',
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
  lineConsistency: 82,
  paperTexture: 'fine',
  paperWear: 0,
  wearCrumple: true,
  wearCreases: true,
  wearStains: true,
  wearFire: false,
  wearSeed: 43182,
  scanMode: false,
  scanQuality: 78,
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
  lineConsistency: [0, 100],
  paperWear: [0, 100],
  wearSeed: [1, 4294967295],
  scanQuality: [0, 100],
  seed: [1, 999999],
});

const INSTRUMENTS = new Set(['pen', 'pencil', 'marker']);
const PEN_KINDS = new Set(['ballpoint', 'fountain']);
const WRITING_STYLES = new Set(['cursive', 'print']);
const CONSTRUCTIONS = new Set(['simplex', 'complex']);
const PAPERS = new Set(['notebook', 'grid', 'printer', 'colored', 'ivory', 'bright', 'recycled']);
const PAGE_SIZE_IDS = new Set(Object.keys(PAGE_SIZES));
const GRAPHEME_SEGMENTER = typeof Intl !== 'undefined' && Intl.Segmenter
  ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
  : null;

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
  profile.wearSeed = Math.round(profile.wearSeed);
  profile.wristSupport = Boolean(profile.wristSupport);
  profile.wearCrumple = Boolean(profile.wearCrumple);
  profile.wearCreases = Boolean(profile.wearCreases);
  profile.wearStains = Boolean(profile.wearStains);
  profile.wearFire = Boolean(profile.wearFire);
  profile.scanMode = Boolean(profile.scanMode);
  profile.instrument = INSTRUMENTS.has(profile.instrument) ? profile.instrument : DEFAULT_PROFILE.instrument;
  profile.penKind = PEN_KINDS.has(profile.penKind) ? profile.penKind : DEFAULT_PROFILE.penKind;
  profile.writingStyle = WRITING_STYLES.has(profile.writingStyle) ? profile.writingStyle : DEFAULT_PROFILE.writingStyle;
  profile.construction = CONSTRUCTIONS.has(profile.construction) ? profile.construction : DEFAULT_PROFILE.construction;
  profile.paper = PAPERS.has(profile.paper) ? profile.paper : DEFAULT_PROFILE.paper;
  profile.pageSize = PAGE_SIZE_IDS.has(profile.pageSize) ? profile.pageSize : DEFAULT_PROFILE.pageSize;
  profile.paperTexture = ['fine', 'none'].includes(profile.paperTexture) ? profile.paperTexture : DEFAULT_PROFILE.paperTexture;
  profile.inkColor = /^#[0-9a-f]{6}$/i.test(profile.inkColor) ? profile.inkColor : DEFAULT_PROFILE.inkColor;
  profile.paperColor = /^#[0-9a-f]{6}$/i.test(profile.paperColor) ? profile.paperColor : DEFAULT_PROFILE.paperColor;
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
  const maximumCursiveClarity = profile.writingStyle === 'cursive'
    ? clamp((profile.readability - 88) / 12, 0, 1)
    : 0;
  const widthScale = 0.82 + rng() * 0.36;
  const heightScale = 0.92 + rng() * 0.18;
  const shearOffset = (rng() * 2 - 1) * 0.13;
  const rotation = (rng() * 2 - 1) * 0.04;
  return {
    widthScale: widthScale * (1 - maximumCursiveClarity * 0.55) + maximumCursiveClarity * 0.55,
    heightScale: heightScale * (1 - maximumCursiveClarity * 0.45) + maximumCursiveClarity * 0.45,
    shearOffset: shearOffset * (1 - maximumCursiveClarity * 0.72),
    rotation: rotation * (1 - maximumCursiveClarity * 0.72),
    shapeVariation: 0.9 + rng() * 0.6,
    letterVariation: (0.8 + rng() * 0.5) * (1 - maximumCursiveClarity * 0.22),
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
  const maximumClarity = clamp((profile.readability - 72) / 28, 0, 1);
  return {
    jitter: (0.3 + shake * 2.9 + gripDistance * 0.72) * support * surface * instrument,
    drift: (0.4 + (1 - speed) * 1.45) * support,
    trackingNoise: 0.18 + shake * 0.72 + speed * 0.2,
    pressureFloor: 0.34 + (profile.pressure / 100) * 0.44,
    pressureSwing: (profile.pressureVariation / 100) * 0.32,
    shear: Math.tan(((profile.slant + profile.wristAngle * 0.28) * Math.PI) / 180),
    rotation: (profile.wristAngle * 0.018 + (speed - 0.5) * 0.3) * (Math.PI / 180),
    shapeVariation: (1.15 + shake * 2.2 + gripDistance * 0.5 + (1 - speed) * 0.35)
      * (profile.writingStyle === 'cursive' ? 1 - maximumClarity * 0.62 : 1 - maximumClarity * 0.38),
    instanceVariation: 1 - maximumClarity * (profile.writingStyle === 'cursive' ? 0.64 : 0.45),
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
  if (GRAPHEME_SEGMENTER) {
    const graphemes = [];
    const segments = GRAPHEME_SEGMENTER.segment(text);
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

function paperPalette(paper, paperColor) {
  return {
    notebook: { base: '#f5f0df', fleck: '#a9a08d', rule: '#b8ced4' },
    grid: { base: '#f7f3e8', fleck: '#aaa28e', rule: '#b5c9cf', grid: true },
    printer: { base: '#f7f4e9', fleck: '#b8b1a1', rule: null },
    colored: { base: paperColor, fleck: '#77736d', rule: null },
    ivory: { base: '#f4ead3', fleck: '#aa9270', rule: null },
    bright: { base: '#fbfaf5', fleck: '#b8b5aa', rule: null },
    recycled: { base: '#dfd1ad', fleck: '#7d765f', rule: null },
  }[paper];
}

function drawCrumpleWear(ctx, width, height, amount, rng) {
  const paths = Math.round(2 + amount * 8);
  for (let pathIndex = 0; pathIndex < paths; pathIndex += 1) {
    let x = rng() * width;
    let y = rng() * height;
    ctx.beginPath();
    ctx.moveTo(x, y);
    const segments = 3 + Math.floor(rng() * 5);
    for (let segment = 0; segment < segments; segment += 1) {
      x = clamp(x + (rng() - 0.5) * width * 0.34, 0, width);
      y = clamp(y + (rng() - 0.5) * height * 0.28, 0, height);
      ctx.lineTo(x, y);
    }
    ctx.strokeStyle = rng() > 0.48 ? '#6f6656' : '#ffffff';
    ctx.globalAlpha = 0.018 + amount * (0.035 + rng() * 0.05);
    ctx.lineWidth = 0.8 + amount * 2.4;
    ctx.stroke();
  }
}

function drawFoldWear(ctx, width, height, amount, rng) {
  const folds = 1 + Math.floor(amount * 3);
  for (let index = 0; index < folds; index += 1) {
    const vertical = rng() > 0.48;
    const position = (vertical ? width : height) * (0.22 + rng() * 0.56);
    const gradient = vertical
      ? ctx.createLinearGradient(position - 20, 0, position + 20, 0)
      : ctx.createLinearGradient(0, position - 20, 0, position + 20);
    gradient.addColorStop(0, 'rgba(72, 60, 45, 0)');
    gradient.addColorStop(0.46, `rgba(72, 60, 45, ${0.035 + amount * 0.11})`);
    gradient.addColorStop(0.54, `rgba(255, 255, 255, ${0.045 + amount * 0.09})`);
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.globalAlpha = 1;
    if (vertical) ctx.fillRect(position - 20, 0, 40, height);
    else ctx.fillRect(0, position - 20, width, 40);
  }
}

function stainGeometry(width, height, amount, rng) {
  return Array.from({ length: 1 + Math.floor(amount * 4) }, () => ({
    x: width * (0.08 + rng() * 0.84),
    y: height * (0.08 + rng() * 0.84),
    rx: width * (0.035 + rng() * 0.13) * (0.55 + amount),
    ry: height * (0.025 + rng() * 0.09) * (0.55 + amount),
    coffee: rng() > 0.46,
    rotation: rng() * Math.PI,
  }));
}

function drawStains(ctx, width, height, amount, rng, foreground = false) {
  for (const stain of stainGeometry(width, height, amount, rng)) {
    ctx.save();
    ctx.translate(stain.x, stain.y);
    ctx.rotate(stain.rotation);
    if (stain.coffee) {
      ctx.strokeStyle = '#6e3e20';
      ctx.lineWidth = Math.max(2, stain.rx * (0.025 + rng() * 0.035));
      ctx.globalAlpha = foreground ? 0.05 + amount * 0.2 : 0.045 + amount * 0.11;
      ctx.beginPath();
      ctx.ellipse(0, 0, stain.rx, stain.ry, 0, 0, Math.PI * 2);
      ctx.stroke();
      if (!foreground) {
        ctx.fillStyle = '#8d5a32';
        ctx.globalAlpha = 0.025 + amount * 0.08;
        ctx.fill();
      }
    } else {
      const bloom = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(stain.rx, stain.ry));
      const opacity = foreground ? 0.12 + amount * 0.35 : 0.04 + amount * 0.1;
      bloom.addColorStop(0, `rgba(235, 226, 196, ${opacity})`);
      bloom.addColorStop(0.68, `rgba(190, 162, 119, ${opacity * 0.58})`);
      bloom.addColorStop(1, 'rgba(134, 105, 70, 0)');
      ctx.fillStyle = bloom;
      ctx.globalAlpha = 1;
      ctx.scale(1, stain.ry / stain.rx);
      ctx.beginPath();
      ctx.arc(0, 0, stain.rx, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

function drawFireDamage(ctx, width, height, amount, rng, foreground = false) {
  ctx.save();
  const edgeDepth = Math.max(18, Math.min(width, height) * (0.025 + amount * 0.12));
  const edge = ctx.createRadialGradient(width * 0.5, height * 0.5, Math.max(width, height) * 0.28, width * 0.5, height * 0.5, Math.max(width, height) * 0.72);
  edge.addColorStop(0, 'rgba(64, 48, 33, 0)');
  edge.addColorStop(0.72, `rgba(115, 76, 42, ${0.025 + amount * 0.1})`);
  edge.addColorStop(0.91, `rgba(56, 43, 33, ${0.07 + amount * 0.2})`);
  edge.addColorStop(1, `rgba(24, 24, 23, ${0.1 + amount * 0.38})`);
  ctx.fillStyle = edge;
  ctx.fillRect(0, 0, width, height);

  const sootPatches = 2 + Math.floor(amount * 7);
  for (let index = 0; index < sootPatches; index += 1) {
    const side = Math.floor(rng() * 4);
    const x = side === 0 ? rng() * edgeDepth : side === 1 ? width - rng() * edgeDepth : rng() * width;
    const y = side === 2 ? rng() * edgeDepth : side === 3 ? height - rng() * edgeDepth : rng() * height;
    const radius = 20 + rng() * Math.min(width, height) * (0.05 + amount * 0.1);
    const soot = ctx.createRadialGradient(x, y, 0, x, y, radius);
    soot.addColorStop(0, `rgba(28, 29, 28, ${foreground ? 0.06 + amount * 0.2 : 0.03 + amount * 0.12})`);
    soot.addColorStop(1, 'rgba(28, 29, 28, 0)');
    ctx.fillStyle = soot;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }

  if (foreground && amount > 0.48) {
    const holes = 1 + Math.floor((amount - 0.48) * 5);
    for (let index = 0; index < holes; index += 1) {
      const side = Math.floor(rng() * 4);
      const radius = 8 + rng() * edgeDepth * 0.42 * amount;
      const x = side === 0 ? rng() * edgeDepth * 0.6 : side === 1 ? width - rng() * edgeDepth * 0.6 : rng() * width;
      const y = side === 2 ? rng() * edgeDepth * 0.6 : side === 3 ? height - rng() * edgeDepth * 0.6 : rng() * height;
      ctx.fillStyle = '#252321';
      ctx.globalAlpha = 0.36 + amount * 0.5;
      ctx.beginPath();
      const points = 10;
      for (let point = 0; point < points; point += 1) {
        const angle = (point / points) * Math.PI * 2;
        const jaggedRadius = radius * (0.68 + rng() * 0.5);
        const px = x + Math.cos(angle) * jaggedRadius;
        const py = y + Math.sin(angle) * jaggedRadius;
        if (point === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.restore();
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
  const palette = paperPalette(profile.paper, profile.paperColor);
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
    if (palette.grid) {
      const gridStep = profile.size * profile.lineHeight;
      for (let x = 70; x < width; x += gridStep) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
    } else {
      ctx.strokeStyle = '#cf8d8d';
      ctx.globalAlpha = 0.36;
      ctx.beginPath();
      ctx.moveTo(70, 0);
      ctx.lineTo(70, height);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  const wear = profile.paperWear / 100;
  if (wear > 0) {
    if (profile.wearCrumple) drawCrumpleWear(ctx, width, height, wear, rng);
    if (profile.wearCreases) drawFoldWear(ctx, width, height, wear, rng);
    if (profile.wearStains) drawStains(ctx, width, height, wear, rng, false);
    if (profile.wearFire) drawFireDamage(ctx, width, height, wear, rng, false);
  }
  ctx.globalAlpha = 1;
}

function applyForegroundDamage(ctx, width, height, profile, pageIndex) {
  const wear = profile.paperWear / 100;
  if (wear <= 0 || (!profile.wearStains && !profile.wearFire)) return;
  const rng = createRng(`foreground-wear:${profile.wearSeed}:page:${pageIndex}`);
  if (profile.wearStains) drawStains(ctx, width, height, wear, rng, true);
  if (profile.wearFire) drawFireDamage(ctx, width, height, wear, rng, true);
  ctx.globalAlpha = 1;
}

function applyScannedDocument(ctx, width, height, profile, pageIndex) {
  if (!profile.scanMode) return;
  const image = ctx.getImageData(0, 0, width, height);
  const data = image.data;
  const qualityLoss = 1 - profile.scanQuality / 100;
  const rng = createRng(`scan:${profile.seed}:${profile.wearSeed}:page:${pageIndex}`);
  const contrast = 1.18 + qualityLoss * 1.15;
  const noise = 2 + qualityLoss * 28;
  for (let index = 0; index < data.length; index += 4) {
    const luminance = data[index] * 0.2126 + data[index + 1] * 0.7152 + data[index + 2] * 0.0722;
    const shifted = (luminance - 128) * contrast + 128 + (rng() - 0.5) * noise;
    const grayscale = clamp(Math.round(shifted), 0, 255);
    data[index] = grayscale;
    data[index + 1] = grayscale;
    data[index + 2] = grayscale;
  }
  ctx.putImageData(image, 0, 0);
  ctx.save();
  ctx.globalAlpha = 0.025 + qualityLoss * 0.09;
  ctx.fillStyle = '#111111';
  const streaks = 1 + Math.floor(qualityLoss * 7);
  for (let index = 0; index < streaks; index += 1) {
    ctx.fillRect(Math.floor(rng() * width), 0, 1 + Math.floor(rng() * 2), height);
  }
  ctx.restore();
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
  const glyphVariant = profile.writingStyle === 'cursive' && profile.readability >= 92 ? 0 : instanceSeed;
  const glyph = getStrokeGlyph(item.glyph, profile.construction, profile.writingStyle, glyphVariant);
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
  const inconsistency = 1 - profile.lineConsistency / 100;

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
        const dropout = (reservoir < 0.44 && rng() > reservoir + 0.48)
          || (inconsistency > 0.08 && rng() < inconsistency * 0.085);
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
        const transfer = 1 - inconsistency * rng() * 0.48;
        ctx.globalAlpha = style.alpha * layerAlpha * grainAlpha * (0.7 + reservoir * 0.3) * transfer;
        ctx.lineWidth = style.width * (0.52 + pressure * 0.78) * nibFactor * (profile.size / 34)
          * (1 + (rng() - 0.5) * inconsistency * 0.34);
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
  const targetScaleX = writer.widthScale * (1 + (rng() - 0.5) * 0.24 * writer.letterVariation * dynamics.instanceVariation);
  const targetScaleY = writer.heightScale * (1 + (rng() - 0.5) * 0.16 * writer.letterVariation * dynamics.instanceVariation);
  return {
    x: previous.x * 0.62 + (rng() - 0.5) * (dynamics.jitter + dynamics.trackingNoise) * writer.motionScale,
    y: previous.y * 0.72 + ((rng() - 0.5) * dynamics.jitter + (rng() - 0.5) * dynamics.drift) * writer.motionScale,
    rotation: previous.rotation * 0.52 + (rng() - 0.5) * (0.045 + dynamics.jitter * 0.008)
      * writer.letterVariation * dynamics.instanceVariation,
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
  const pageSize = PAGE_SIZES[profile.pageSize];
  const pageWidth = pageSize.width;
  const pageHeight = pageSize.height;
  const pageMargin = profile.pageSize === 'business' ? 66 : DOCUMENT_PAGE_MARGIN;
  const writer = deriveWriterStyle(profile);
  const source = String(text || ' ');
  const measuredGlyphWidths = new Map();
  let layoutIndex = 0;
  const layout = layoutText(source, (glyph) => {
    let glyphSize = measuredGlyphWidths.get(glyph);
    if (glyphSize === undefined) {
      glyphSize = measureStrokeGlyph(glyph, profile.size, profile.construction, profile.writingStyle, layoutIndex);
      measuredGlyphWidths.set(glyph, glyphSize);
    }
    layoutIndex += 1;
    return glyphSize * writer.widthScale;
  }, {
    width: pageWidth,
    margin: pageMargin,
    fontSize: profile.size,
    lineHeight: profile.lineHeight,
    spacing: profile.spacing,
  });
  const lineStep = profile.size * profile.lineHeight;
  const firstBaseline = pageMargin + profile.size;
  const lastBaseline = pageHeight - pageMargin - profile.size * 0.55;
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
    width: pageWidth,
    height: pageHeight,
    pageSize: profile.pageSize,
    pageSizeLabel: pageSize.label,
    printWidth: pageSize.printWidth,
    printHeight: pageSize.printHeight,
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
    renderPage(canvas, requestedPageIndex = 0, options = {}) {
      if (!canvas?.getContext || !canvas.ownerDocument) throw new TypeError('A browser canvas is required.');
      const pageIndex = clamp(Math.round(Number(requestedPageIndex) || 0), 0, pageCount - 1);
      const renderScale = clamp(Number(options.scale) || 1, 0.2, 1);
      const ctx = canvas.getContext('2d');
      canvas.width = Math.round(pageWidth * renderScale);
      canvas.height = Math.round(pageHeight * renderScale);
      ctx.setTransform(renderScale, 0, 0, renderScale, 0, 0);

      const paperRng = createRng(`paper:${profile.seed}:${profile.wearSeed}:${source}:page:${pageIndex}`);
      const rng = createRng(`strokes:${profile.seed}:${profile.writingStyle}:${source}:page:${pageIndex}`);
      drawPaper(ctx, pageWidth, pageHeight, profile, paperRng);
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

      applyForegroundDamage(ctx, pageWidth, pageHeight, profile, pageIndex);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      applyScannedDocument(ctx, canvas.width, canvas.height, profile, pageIndex);

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

export function createExportManifest(text, renderResult, provenance = {
  schema: 'scribble-lab.commercial-provenance.v1',
  status: 'not-issued',
  note: 'This export has no commercial provenance certificate.',
}) {
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
    provenance,
  };
}
