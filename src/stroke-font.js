import {
  HERSHEY_ASCII_START,
  HERSHEY_SCRIPT_COMPLEX,
  HERSHEY_SCRIPT_SIMPLEX,
} from './assets/hershey-script-data.js';
import { HERSHEY_PRINT_SIMPLEX } from './assets/hershey-print-data.js';

const FONT_DATA = Object.freeze({
  cursive: Object.freeze({
    simplex: HERSHEY_SCRIPT_SIMPLEX,
    complex: HERSHEY_SCRIPT_COMPLEX,
  }),
  print: Object.freeze({
    simplex: HERSHEY_PRINT_SIMPLEX,
    complex: HERSHEY_PRINT_SIMPLEX,
  }),
});

const SMART_ASCII = Object.freeze({
  '“': '"',
  '”': '"',
  '„': '"',
  '‘': "'",
  '’': "'",
  '‚': "'",
  '–': '-',
  '—': '-',
  '−': '-',
  '…': '.',
  '•': '*',
  '·': '.',
  ' ': ' ',
});

const ACCENT_PATHS = Object.freeze({
  '\u0300': [[[7, 0], [11, 3]]],
  '\u0301': [[[8, 3], [12, 0]]],
  '\u0302': [[[6, 3], [10, 0], [14, 3]]],
  '\u0303': [[[5, 2], [7, 0], [10, 0], [12, 2], [15, 1]]],
  '\u0304': [[[6, 1], [14, 1]]],
  '\u0306': [[[6, 0], [8, 2], [11, 3], [14, 1]]],
  '\u0307': [[[10, 1], [10.4, 1.4]]],
  '\u0308': [[[7, 1], [7.4, 1.4]], [[13, 1], [13.4, 1.4]]],
  '\u030a': [[[8, 2], [8, 0], [10, -1], [12, 0], [12, 2], [10, 3], [8, 2]]],
  '\u0327': [[[10, 22], [9, 25], [11, 27], [9, 29]]],
});

const parsedCache = new Map();
const MAX_GRAPHEME_CODE_POINTS = 64;
const HIGH_EXIT_CHARACTERS = new Set(['o', 'w', 'v', 'b', 'O', 'W', 'V', 'B', 'ô', 'ö', 'ò', 'ó']);

function parsePathData(pathData) {
  const tokens = pathData.match(/[ML]|-?\d+(?:\.\d+)?/g) || [];
  const paths = [];
  let command = null;
  let currentPath = null;
  for (let index = 0; index < tokens.length;) {
    const token = tokens[index];
    if (token === 'M' || token === 'L') {
      command = token;
      index += 1;
      continue;
    }
    const x = Number(tokens[index]);
    const y = Number(tokens[index + 1]);
    index += 2;
    if (command === 'M' || !currentPath) {
      currentPath = [[x, y]];
      paths.push(currentPath);
      command = 'L';
    } else {
      currentPath.push([x, y]);
    }
  }
  return paths;
}

function resolveCharacter(grapheme) {
  const mapped = SMART_ASCII[grapheme] ?? grapheme;
  if (mapped === ' ' || mapped === '\t') return { base: ' ', marks: [] };
  let base = '?';
  const marks = [];
  let inspected = 0;
  for (const character of mapped.normalize('NFD')) {
    if (inspected >= MAX_GRAPHEME_CODE_POINTS) break;
    inspected += 1;
    const code = character.codePointAt(0);
    if (base === '?' && code >= 33 && code <= 126) base = character;
    if (ACCENT_PATHS[character]) marks.push(character);
  }
  return { base, marks };
}

export function getStrokeGlyph(grapheme, construction = 'simplex', writingStyle = 'cursive', variantIndex = 0) {
  const family = FONT_DATA[writingStyle] ? writingStyle : 'cursive';
  const variant = FONT_DATA[family][construction] ? construction : 'simplex';
  const { base, marks } = resolveCharacter(grapheme);
  if (base === ' ') return { base, advance: 10, paths: [], marks: [], exitType: 'low' };
  const index = base.charCodeAt(0) - HERSHEY_ASCII_START;
  const font = FONT_DATA[family][variant];
  const raw = font[index] ?? font['?'.charCodeAt(0) - HERSHEY_ASCII_START];
  const variantCount = Array.isArray(raw.d) ? raw.d.length : 1;
  const activeIndex = Math.abs(Math.floor(variantIndex)) % variantCount;
  const dString = Array.isArray(raw.d) ? raw.d[activeIndex] : raw.d;
  const cacheKey = `${family}:${variant}:${base}:${activeIndex}`;
  if (!parsedCache.has(cacheKey)) parsedCache.set(cacheKey, parsePathData(dString));
  return {
    base,
    advance: Number(raw.o) * 1.68,
    paths: parsedCache.get(cacheKey),
    marks: marks.flatMap((mark) => ACCENT_PATHS[mark]),
    exitType: HIGH_EXIT_CHARACTERS.has(base) ? 'high' : 'low',
    variantCount,
    variantIndex: activeIndex,
  };
}

export function strokeScale(fontSize) {
  return Number(fontSize) / 27;
}

export function measureStrokeGlyph(grapheme, fontSize, construction = 'simplex', writingStyle = 'cursive', variantIndex = 0) {
  return getStrokeGlyph(grapheme, construction, writingStyle, variantIndex).advance * strokeScale(fontSize);
}
