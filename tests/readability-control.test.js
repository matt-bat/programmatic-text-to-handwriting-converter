import assert from 'node:assert/strict';
import test from 'node:test';

import {
  READABILITY_CONTROLLED_IDS,
  deriveReadabilityAdjustments,
  readabilityLabel,
} from '../src/readability-control.js';

test('readability presets are deterministic per seed while retaining seeded personality', () => {
  const first = deriveReadabilityAdjustments(72, 43182);
  const replay = deriveReadabilityAdjustments(72, 43182);
  const otherWriter = deriveReadabilityAdjustments(72, 90127);

  assert.deepEqual(first, replay);
  assert.notDeepEqual(first, otherWriter);
  assert.deepEqual(Object.keys(first), [...READABILITY_CONTROLLED_IDS]);
});

test('higher readability consistently moves legibility controls toward clearer settings', () => {
  const low = deriveReadabilityAdjustments(10, 43182);
  const high = deriveReadabilityAdjustments(90, 43182);

  assert.ok(high.lineHeight > low.lineHeight);
  assert.ok(high.spacing > low.spacing);
  assert.ok(high.speed < low.speed);
  assert.ok(high.shakiness < low.shakiness);
  assert.ok(high.pressure > low.pressure);
  assert.ok(high.pressureVariation < low.pressureVariation);
  assert.ok(Math.abs(high.grip - 48) < Math.abs(low.grip - 48));
  assert.ok(Math.abs(high.wristAngle) < Math.abs(low.wristAngle));
  assert.ok(Math.abs(high.slant) < Math.abs(low.slant));
  assert.ok(high.connection < low.connection);
  assert.ok(high.reservoir > low.reservoir);
  assert.equal(low.wristSupport, false);
  assert.equal(high.wristSupport, true);
  assert.equal(low.construction, 'complex');
  assert.equal(high.construction, 'simplex');
});

test('readability labels communicate the full slider range', () => {
  assert.equal(readabilityLabel(0), 'Low');
  assert.equal(readabilityLabel(35), 'Expressive');
  assert.equal(readabilityLabel(65), 'Balanced');
  assert.equal(readabilityLabel(82), 'Clear');
  assert.equal(readabilityLabel(100), 'Very clear');
});

test('cursive readability receives a deterministic legibility correction between the endpoints', () => {
  const print = deriveReadabilityAdjustments(65, 43182, 'print');
  const cursive = deriveReadabilityAdjustments(65, 43182, 'cursive');
  const replay = deriveReadabilityAdjustments(65, 43182, 'cursive');

  assert.deepEqual(cursive, replay);
  assert.ok(cursive.lineHeight > print.lineHeight);
  assert.ok(cursive.shakiness < print.shakiness);
  assert.ok(cursive.pressureVariation < print.pressureVariation);
  assert.deepEqual(
    deriveReadabilityAdjustments(0, 43182, 'cursive'),
    deriveReadabilityAdjustments(0, 43182, 'print'),
  );
  assert.deepEqual(
    deriveReadabilityAdjustments(100, 43182, 'cursive'),
    deriveReadabilityAdjustments(100, 43182, 'print'),
  );
});

test('the final ten percent adds maximum clarity without changing the established range', () => {
  const clear = deriveReadabilityAdjustments(90, 43182, 'print');
  const maximum = deriveReadabilityAdjustments(100, 43182, 'print');

  assert.deepEqual(clear, {
    lineHeight: 1.78,
    spacing: 6,
    speed: 76,
    shakiness: 7,
    pressure: 69,
    pressureVariation: 14,
    grip: 53,
    wristAngle: -4,
    slant: 6,
    connection: 13,
    reservoir: 93,
    wristSupport: true,
    construction: 'simplex',
  });
  assert.deepEqual(maximum, {
    lineHeight: 1.96,
    spacing: 10,
    speed: 88,
    shakiness: 0,
    pressure: 72,
    pressureVariation: 2,
    grip: 48,
    wristAngle: 0,
    slant: 2,
    connection: 4,
    reservoir: 100,
    wristSupport: true,
    construction: 'simplex',
  });
  assert.deepEqual(
    deriveReadabilityAdjustments(250, 43182, 'print'),
    maximum,
  );
});
