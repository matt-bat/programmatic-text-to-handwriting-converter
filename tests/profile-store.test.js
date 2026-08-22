import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PROFILE_STORAGE_KEY,
  readProfiles,
  removeProfile,
  upsertProfile,
  writeProfiles,
} from '../src/profile-store.js';

function fakeStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    value: (key) => values.get(key),
  };
}

test('profile store recovers safely from invalid browser data', () => {
  const storage = fakeStorage({ [PROFILE_STORAGE_KEY]: '{not-json' });
  assert.deepEqual(readProfiles(storage), []);
});

test('upsert replaces names case-insensitively and keeps newest first', () => {
  const first = upsertProfile([], { name: 'Field notes', seed: 10 });
  const replaced = upsertProfile(first, { name: 'FIELD NOTES', seed: 99 });
  assert.equal(replaced.length, 1);
  assert.equal(replaced[0].seed, 99);
});

test('write/read round trip normalizes profiles and remove is precise', () => {
  const storage = fakeStorage();
  const profiles = [
    { name: 'One', seed: 11, readability: 82, instrument: 'pencil', writingStyle: 'print' },
    { name: 'Two', seed: 12, instrument: 'marker' },
  ];
  assert.equal(writeProfiles(profiles, storage), true);
  assert.ok(storage.value(PROFILE_STORAGE_KEY));
  const loaded = readProfiles(storage);
  assert.equal(loaded.length, 2);
  assert.equal(loaded[0].instrument, 'pencil');
  assert.equal(loaded[0].readability, 82);
  assert.equal(loaded[0].writingStyle, 'print');
  assert.equal(loaded[1].writingStyle, 'cursive');
  assert.deepEqual(removeProfile(loaded, 'one').map((item) => item.name), ['Two']);
});
