import { createRng } from './handwriting-engine.js';

export const READABILITY_CONTROLLED_IDS = Object.freeze([
  'lineHeight',
  'spacing',
  'speed',
  'shakiness',
  'pressure',
  'pressureVariation',
  'grip',
  'wristAngle',
  'slant',
  'connection',
  'reservoir',
  'wristSupport',
  'construction',
]);

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function mix(low, high, amount) {
  return low + (high - low) * amount;
}

export function readabilityLabel(value) {
  const level = clamp(Math.round(Number(value) || 0), 0, 100);
  if (level < 25) return 'Low';
  if (level < 50) return 'Expressive';
  if (level < 75) return 'Balanced';
  if (level < 90) return 'Clear';
  return 'Very clear';
}

export function deriveReadabilityAdjustments(value, seed, writingStyle = 'print') {
  const level = clamp(Math.round(Number(value) || 0), 0, 100);
  const baseClarity = level / 100;
  const cursiveBoost = writingStyle === 'cursive'
    ? 22 * (1 - Math.abs(2 * baseClarity - 1))
    : 0;
  const clarity = clamp((level + cursiveBoost) / 100, 0, 1);
  const rng = createRng(`readability:${seed}`);
  const bias = (amount) => (rng() * 2 - 1) * amount;
  const slantDirection = rng() < 0.18 ? -1 : 1;
  const wristDirection = rng() < 0.5 ? -1 : 1;
  // Keep the seeded draw sequence stable after letter size became independently controlled.
  bias(1.2);

  const adjustments = {
    lineHeight: Number(clamp(mix(1.38, 1.84, clarity) + bias(0.035), 1.25, 2.1).toFixed(2)),
    spacing: Math.round(clamp(mix(-1, 7, clarity) + bias(0.8), -2, 14)),
    speed: Math.round(clamp(mix(96, 72, clarity) + bias(3), 0, 100)),
    shakiness: Math.round(clamp(mix(78, 2, clarity) + bias(3), 0, 100)),
    pressure: Math.round(clamp(mix(44, 68, clarity) + bias(3), 0, 100)),
    pressureVariation: Math.round(clamp(mix(72, 8, clarity) + bias(3), 0, 100)),
    grip: Math.round(clamp(48 + slantDirection * mix(31, 2, clarity) + bias(2.5), 0, 100)),
    wristAngle: Math.round(clamp(wristDirection * mix(19, 2, clarity) + bias(1.5), -25, 25)),
    slant: Math.round(clamp(slantDirection * mix(16, 4, clarity) + bias(1.5), -18, 24)),
    connection: Math.round(clamp(mix(82, 8, clarity) + bias(3), 0, 100)),
    reservoir: Math.round(clamp(mix(58, 98, clarity) + bias(2), 8, 100)),
    wristSupport: clarity >= 0.45,
    construction: clarity >= 0.42 ? 'simplex' : 'complex',
  };

  const maximumClarity = clamp((baseClarity - 0.9) / 0.1, 0, 1) ** 2;
  if (maximumClarity === 0) return adjustments;

  return {
    lineHeight: Number(mix(adjustments.lineHeight, 1.96, maximumClarity).toFixed(2)),
    spacing: Math.round(mix(adjustments.spacing, 10, maximumClarity)),
    speed: Math.round(mix(adjustments.speed, 88, maximumClarity)),
    shakiness: Math.round(mix(adjustments.shakiness, 0, maximumClarity)),
    pressure: Math.round(mix(adjustments.pressure, 72, maximumClarity)),
    pressureVariation: Math.round(mix(adjustments.pressureVariation, 2, maximumClarity)),
    grip: Math.round(mix(adjustments.grip, 48, maximumClarity)),
    wristAngle: Math.round(mix(adjustments.wristAngle, 0, maximumClarity)) || 0,
    slant: Math.round(mix(adjustments.slant, 2, maximumClarity)),
    connection: Math.round(mix(adjustments.connection, 4, maximumClarity)),
    reservoir: Math.round(mix(adjustments.reservoir, 100, maximumClarity)),
    wristSupport: true,
    construction: 'simplex',
  };
}
