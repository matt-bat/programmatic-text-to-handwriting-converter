import { createPublicKey, verify } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const [manifestPath] = process.argv.slice(2);
if (!manifestPath) throw new Error('Usage: node scripts/verify-provenance-certificate.mjs <metadata.json>');

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const provenance = manifest.provenance;
if (!provenance || provenance.status !== 'commercial-certificate') {
  throw new Error('No commercial provenance certificate is present.');
}
const publicKey = createPublicKey({
  key: Buffer.from(provenance.publicKey.spki, 'base64url'),
  format: 'der',
  type: 'spki',
});
const valid = verify(null, Buffer.from(canonicalJson(provenance.certificate)), publicKey, Buffer.from(provenance.signature, 'base64url'));
if (!valid) throw new Error('Commercial provenance certificate signature is invalid.');
console.log(`Valid commercial provenance certificate for ${provenance.certificate.licenseeId} (${provenance.certificate.licenseId}).`);
