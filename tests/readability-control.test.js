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

  assert.ok(high.size > low.size);
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
