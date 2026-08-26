export const PROVENANCE_SCHEMA = 'scribble-lab.commercial-provenance.v1';

const MAX_FIELD_LENGTH = 240;
const CERTIFICATE_FIELDS = Object.freeze([
  'buildId',
  'issuedAt',
  'licenseeId',
  'licenseId',
  'permittedUse',
]);

function validText(value) {
  return typeof value === 'string' && value.length > 0 && value.length <= MAX_FIELD_LENGTH;
}

export function normalizeCommercialProvenance(input = {}) {
  const { certificate, signature, publicKey } = input;
  if (certificate === null && signature === null && publicKey === null) return null;
  if (!certificate || typeof certificate !== 'object' || Array.isArray(certificate)) return null;
  if (!validText(signature) || !publicKey || typeof publicKey !== 'object') return null;
  if (publicKey.algorithm !== 'Ed25519' || !validText(publicKey.keyId) || !validText(publicKey.spki)) return null;
  if (certificate.schema !== PROVENANCE_SCHEMA || !CERTIFICATE_FIELDS.every((field) => validText(certificate[field]))) return null;
  return {
    certificate: Object.fromEntries([
      ['schema', certificate.schema],
      ...CERTIFICATE_FIELDS.map((field) => [field, certificate[field]]),
    ]),
    signature,
    publicKey: {
      algorithm: publicKey.algorithm,
      keyId: publicKey.keyId,
      spki: publicKey.spki,
    },
  };
}

export function createBuildProvenance(input) {
  const commercial = normalizeCommercialProvenance(input);
  if (!commercial) {
    return {
      schema: PROVENANCE_SCHEMA,
      status: 'not-issued',
      note: 'This public build has no commercial provenance certificate.',
    };
  }
  return {
    schema: PROVENANCE_SCHEMA,
    status: 'commercial-certificate',
    ...commercial,
  };
}
