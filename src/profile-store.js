import { DEFAULT_PROFILE, normalizeProfile } from './handwriting-engine.js';

export const PROFILE_STORAGE_KEY = 'scribble-lab.profiles.v1';

export function readProfiles(storage = globalThis.localStorage) {
  if (!storage) return [];
  try {
    const parsed = JSON.parse(storage.getItem(PROFILE_STORAGE_KEY) || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((profile) => profile && typeof profile === 'object')
      .slice(0, 12)
      .map(normalizeProfile);
  } catch {
    return [];
  }
}

export function writeProfiles(profiles, storage = globalThis.localStorage) {
  if (!storage) return false;
  const normalized = profiles.slice(0, 12).map(normalizeProfile);
  try {
    storage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(normalized));
    return true;
  } catch {
    return false;
  }
}

export function upsertProfile(profiles, candidate) {
  const profile = normalizeProfile(candidate);
  const key = profile.name.trim().toLocaleLowerCase();
  const next = profiles.filter((item) => item.name.trim().toLocaleLowerCase() !== key);
  return [profile, ...next].slice(0, 12);
}

export function removeProfile(profiles, name) {
  const key = String(name).trim().toLocaleLowerCase();
  return profiles.filter((profile) => profile.name.trim().toLocaleLowerCase() !== key);
}

export function createStarterProfiles() {
  return [
    normalizeProfile(DEFAULT_PROFILE),
    normalizeProfile({ ...DEFAULT_PROFILE, name: 'Quick field notes', readability: 40, instrument: 'pen', penKind: 'ballpoint', speed: 76, shakiness: 37, wristSupport: false, pressure: 48, slant: 12, seed: 78214 }),
    normalizeProfile({ ...DEFAULT_PROFILE, name: 'Soft graphite', readability: 55, instrument: 'pencil', construction: 'complex', paper: 'ivory', inkColor: '#4b5058', speed: 34, pressure: 42, pressureVariation: 52, reservoir: 100, seed: 21803 }),
  ];
}
