import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getStrokeGlyph,
  measureStrokeGlyph,
  strokeScale,
} from '../src/stroke-font.js';

test('bundled script glyphs expose deterministic physical stroke paths', () => {
  const first = getStrokeGlyph('A', 'simplex');
  const second = getStrokeGlyph('A', 'simplex');
  assert.equal(first.paths, second.paths);
  assert.ok(first.paths.length > 0);
  assert.ok(first.paths.every((path) => path.length >= 2));
  assert.ok(first.advance > 0);
});

test('simplex and complex construction use distinct public-domain geometry', () => {
  const simplex = getStrokeGlyph('g', 'simplex');
  const complex = getStrokeGlyph('g', 'complex');
  assert.notDeepEqual(simplex.paths, complex.paths);
  assert.ok(complex.paths.flat().length >= simplex.paths.flat().length);
});

test('print style uses non-cursive geometry distinct from both script constructions', () => {
  const print = getStrokeGlyph('g', 'simplex', 'print');
  const simpleCursive = getStrokeGlyph('g', 'simplex', 'cursive');
  const detailedCursive = getStrokeGlyph('g', 'complex', 'cursive');

  assert.notDeepEqual(print.paths, simpleCursive.paths);
  assert.notDeepEqual(print.paths, detailedCursive.paths);
  assert.deepEqual(print.paths, getStrokeGlyph('g', 'complex', 'print').paths);
});

test('common Latin diacritics keep the base glyph and add accent strokes', () => {
  const plain = getStrokeGlyph('e', 'simplex');
  const accented = getStrokeGlyph('é', 'simplex');
  assert.equal(accented.base, 'e');
  assert.deepEqual(accented.paths, plain.paths);
  assert.ok(accented.marks.length > 0);
});

test('pathological combining sequences have bounded accent work', () => {
  const glyph = getStrokeGlyph(`a${'\u0301'.repeat(10_000)}`, 'simplex');
  assert.equal(glyph.base, 'a');
  assert.ok(glyph.marks.length > 0);
  assert.ok(glyph.marks.length <= 63);
});

test('smart punctuation and unknown symbols receive safe deterministic fallbacks', () => {
  assert.deepEqual(getStrokeGlyph('—').paths, getStrokeGlyph('-').paths);
  assert.deepEqual(getStrokeGlyph('🧪').paths, getStrokeGlyph('?').paths);
});

test('stroke measurement scales linearly without platform font metrics', () => {
  const small = measureStrokeGlyph('m', 24, 'simplex');
  const large = measureStrokeGlyph('m', 48, 'simplex');
  assert.equal(large, small * 2);
  assert.equal(strokeScale(54), 2);
  assert.notEqual(
    measureStrokeGlyph('m', 24, 'simplex', 'print'),
    measureStrokeGlyph('m', 24, 'simplex', 'cursive'),
  );
});

test('variant selection returns distinct allographs and identifies exit anchors', () => {
  const var0 = getStrokeGlyph('o', 'simplex', 'cursive', 0);
  const var1 = getStrokeGlyph('o', 'simplex', 'cursive', 1);
  assert.ok(var0.variantCount > 1);
  assert.notDeepEqual(var0.paths, var1.paths);
  assert.equal(var0.exitType, 'high');

  const lowExit = getStrokeGlyph('a', 'simplex', 'cursive', 0);
  assert.equal(lowExit.exitType, 'low');
});
