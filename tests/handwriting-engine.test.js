import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEFAULT_PROFILE,
  DOCUMENT_PAGE_HEIGHT,
  DOCUMENT_PAGE_WIDTH,
  createHandwritingDocument,
  createExportManifest,
  createRng,
  deriveDynamics,
  deriveWriterStyle,
  layoutText,
  normalizeProfile,
  segmentGraphemes,
  varyStrokePaths,
  varyStrokePathsKinematic,
} from '../src/handwriting-engine.js';

test('seeded generator is stable and separates different seeds', () => {
  const first = createRng('sample-42');
  const second = createRng('sample-42');
  const other = createRng('sample-43');
  const a = Array.from({ length: 8 }, first);
  const b = Array.from({ length: 8 }, second);
  const c = Array.from({ length: 8 }, other);
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, c);
  assert.ok(a.every((value) => value >= 0 && value < 1));
});

test('sample seeds create reproducible but materially different writer styles', () => {
  const first = deriveWriterStyle({ ...DEFAULT_PROFILE, writingStyle: 'print', seed: 2 });
  const replay = deriveWriterStyle({ ...DEFAULT_PROFILE, writingStyle: 'print', seed: 2 });
  const other = deriveWriterStyle({ ...DEFAULT_PROFILE, writingStyle: 'print', seed: 999999 });

  assert.deepEqual(first, replay);
  assert.notDeepEqual(first, other);
  assert.ok(Math.abs(first.widthScale - other.widthScale) > 0.2);
  assert.ok(first.shapeVariation >= 0.9 && first.shapeVariation <= 1.5);
  assert.ok(other.shapeVariation >= 0.9 && other.shapeVariation <= 1.5);
});

test('profile normalization clamps unsafe or invalid values', () => {
  const profile = normalizeProfile({
    instrument: 'quill',
    penKind: 'identity-pen',
    writingStyle: 'typed',
    construction: 'copied-signature',
    paper: 'unknown',
    inkColor: 'red',
    readability: 400,
    size: 200,
    wristAngle: -90,
    reservoir: 0,
    connection: 500,
    name: 'x'.repeat(100),
  });
  assert.equal(profile.instrument, DEFAULT_PROFILE.instrument);
  assert.equal(profile.penKind, DEFAULT_PROFILE.penKind);
  assert.equal(profile.writingStyle, DEFAULT_PROFILE.writingStyle);
  assert.equal(profile.construction, DEFAULT_PROFILE.construction);
  assert.equal(profile.paper, DEFAULT_PROFILE.paper);
  assert.equal(profile.inkColor, DEFAULT_PROFILE.inkColor);
  assert.equal(profile.readability, 100);
  assert.equal(profile.size, 52);
  assert.equal(profile.wristAngle, -25);
  assert.equal(profile.reservoir, 8);
  assert.equal(profile.connection, 100);
  assert.equal(profile.name.length, 48);
});

test('default profile provides a finite reservoir level', () => {
  const profile = normalizeProfile();
  assert.equal(profile.reservoir, 88);
  assert.ok(Number.isFinite(profile.reservoir));
});

test('stroke variation is reproducible, changes each instance, and preserves source geometry', () => {
  const paths = [[[0, 0], [5, 8], [10, 0]], [[2, 3], [8, 3]]];
  const source = structuredClone(paths);
  const firstRng = createRng(317);
  const first = varyStrokePaths(paths, 1.2, firstRng);
  const second = varyStrokePaths(paths, 1.2, firstRng);
  const replay = varyStrokePaths(paths, 1.2, createRng(317));

  assert.deepEqual(first, replay);
  assert.notDeepEqual(first, second);
  assert.notDeepEqual(first, paths);
  assert.deepEqual(paths, source);
});

test('wrist support reduces synthetic motion drift and jitter', () => {
  const supported = deriveDynamics({ ...DEFAULT_PROFILE, wristSupport: true });
  const unsupported = deriveDynamics({ ...DEFAULT_PROFILE, wristSupport: false });
  assert.ok(supported.jitter < unsupported.jitter);
  assert.ok(supported.drift < unsupported.drift);
});

test('layout wraps, preserves explicit line breaks, and caps no content', () => {
  const layout = layoutText('abcd\nefghij', () => 10, {
    width: 45,
    margin: 5,
    fontSize: 10,
    lineHeight: 1.5,
    spacing: 0,
  });
  assert.equal(layout.lineCount, 4);
  assert.equal(layout.glyphs.length, 10);
  assert.ok(layout.contentHeight > 0);
});

test('layout keeps normal words intact when moving them to a new line', () => {
  const layout = layoutText('alpha beta', () => 5, {
    width: 48,
    margin: 5,
    fontSize: 10,
    lineHeight: 1.5,
    spacing: 0,
  });
  const beta = layout.glyphs.filter((item) => item.glyph.trim()).slice(-4);
  assert.equal(new Set(beta.map((item) => item.line)).size, 1);
  assert.equal(beta[0].line, 2);
});

test('grapheme segmentation counts combined characters as one visual unit', () => {
  assert.equal(segmentGraphemes('A👩🏽‍🔬é').length, 3);
});

test('grapheme segmentation reuses its Unicode segmenter across document work', async () => {
  const NativeSegmenter = Intl.Segmenter;
  let constructions = 0;
  Intl.Segmenter = class CountingSegmenter {
    constructor(...args) {
      constructions += 1;
      this.segmenter = new NativeSegmenter(...args);
    }

    segment(value) {
      return this.segmenter.segment(value);
    }
  };

  try {
    const optimizedEngine = await import('../src/handwriting-engine.js?segmenter-reuse-test');
    optimizedEngine.segmentGraphemes('first 👩🏽‍🔬 sample');
    optimizedEngine.segmentGraphemes('second é sample');
    optimizedEngine.createHandwritingDocument('repeated words '.repeat(200), DEFAULT_PROFILE);
    assert.equal(constructions, 1);
  } finally {
    Intl.Segmenter = NativeSegmenter;
  }
});

test('large documents paginate without truncating their full glyph and line model', () => {
  const text = 'human writing '.repeat(3_850).slice(0, 50_000);
  const documentModel = createHandwritingDocument(text, DEFAULT_PROFILE);
  assert.equal(segmentGraphemes(text).length, 50_000);
  assert.equal(documentModel.width, DOCUMENT_PAGE_WIDTH);
  assert.equal(documentModel.height, DOCUMENT_PAGE_HEIGHT);
  assert.ok(documentModel.pageCount > 20);
  assert.ok(documentModel.lineCount > documentModel.linesPerPage);
  assert.equal(documentModel.glyphCount, text.replace(/\s/g, '').length);
});

test('export manifest omits source text and declares identity-free generation', () => {
  const result = {
    width: 1100,
    height: 820,
    pageCount: 3,
    lineCount: 2,
    glyphCount: 12,
    seed: 42,
    profile: normalizeProfile({ seed: 42 }),
    engine: 'Scribble Dynamics v1',
    strokeModel: 'Hershey simplex script · public domain',
  };
  const manifest = createExportManifest('private source phrase', result);
  const serialized = JSON.stringify(manifest);
  assert.equal(manifest.source.characterCount, 21);
  assert.equal(manifest.source.retainedByApp, false);
  assert.equal(manifest.output.pageCount, 3);
  assert.equal(manifest.generator.identityConditioned, false);
  assert.equal(manifest.generator.externalHandwritingSamples, false);
  assert.match(manifest.generator.strokeModel, /public domain/);
  assert.equal(serialized.includes('private source phrase'), false);
});

test('kinematic stroke warping generates distinct point paths across letter instances', () => {
  const samplePath = [[[0, 0], [10, 10], [20, 0]]];
  const rng1 = createRng('seed-1');
  const rng2 = createRng('seed-2');
  const instance1 = varyStrokePathsKinematic(samplePath, 1.5, rng1, 100);
  const instance2 = varyStrokePathsKinematic(samplePath, 1.5, rng2, 200);

  assert.notDeepEqual(instance1, instance2);
  assert.ok(Math.abs(instance1[0][1][0] - instance2[0][1][0]) > 0.1);
});
