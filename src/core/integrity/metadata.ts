import { SHA256_DIGEST_BYTES } from './sha256';

const textEncoder = new TextEncoder();
const INTEGRITY_MAGIC = textEncoder.encode('BIMD');
const INTEGRITY_METADATA_VERSION = 1;
const SHA256_ALGORITHM_ID = 1;
const FIXED_BYTES = 12;

export interface UnpackedIntegrityMetadata {
  wrapped: boolean;
  sha256Digest: Uint8Array | null;
  codecMetadata: Uint8Array;
}

function hasMagic(metadata: Uint8Array): boolean {
  if (metadata.length < INTEGRITY_MAGIC.length) return false;
  for (let index = 0; index < INTEGRITY_MAGIC.length; index += 1) {
    if (metadata[index] !== INTEGRITY_MAGIC[index]) return false;
  }
  return true;
}

export function packIntegrityMetadata(
  codecMetadata: Uint8Array,
  sha256Digest: Uint8Array,
): Uint8Array {
  if (sha256Digest.length !== SHA256_DIGEST_BYTES) {
    throw new RangeError(`SHA-256 debe ocupar ${SHA256_DIGEST_BYTES} bytes.`);
  }
  if (codecMetadata.length > 0xffffffff) {
    throw new RangeError('La metadata del codec es demasiado grande.');
  }

  const output = new Uint8Array(FIXED_BYTES + sha256Digest.length + codecMetadata.length);
  const view = new DataView(output.buffer);

  output.set(INTEGRITY_MAGIC, 0);
  view.setUint8(4, INTEGRITY_METADATA_VERSION);
  view.setUint8(5, SHA256_ALGORITHM_ID);
  view.setUint16(6, sha256Digest.length, false);
  view.setUint32(8, codecMetadata.length, false);

  output.set(sha256Digest, FIXED_BYTES);
  output.set(codecMetadata, FIXED_BYTES + sha256Digest.length);
  return output;
}

export function unpackIntegrityMetadata(metadata: Uint8Array): UnpackedIntegrityMetadata {
  if (!hasMagic(metadata)) {
    return {
      wrapped: false,
      sha256Digest: null,
      codecMetadata: metadata,
    };
  }

  if (metadata.length < FIXED_BYTES) {
    throw new Error('Metadata de integridad truncada.');
  }

  const view = new DataView(metadata.buffer, metadata.byteOffset, metadata.byteLength);
  const version = view.getUint8(4);
  const algorithmId = view.getUint8(5);
  const digestLength = view.getUint16(6, false);
  const codecMetadataLength = view.getUint32(8, false);

  if (version !== INTEGRITY_METADATA_VERSION) {
    throw new Error(`Versión de metadata de integridad no soportada: ${version}.`);
  }
  if (algorithmId !== SHA256_ALGORITHM_ID) {
    throw new Error(`Algoritmo de integridad no soportado: ${algorithmId}.`);
  }
  if (digestLength !== SHA256_DIGEST_BYTES) {
    throw new Error('La longitud del digest SHA-256 no es válida.');
  }

  const expectedLength = FIXED_BYTES + digestLength + codecMetadataLength;
  if (expectedLength !== metadata.length) {
    throw new Error('La longitud de metadata de integridad no coincide con su contenido.');
  }

  const digestStart = FIXED_BYTES;
  const codecStart = digestStart + digestLength;

  return {
    wrapped: true,
    sha256Digest: metadata.slice(digestStart, codecStart),
    codecMetadata: metadata.slice(codecStart),
  };
}

export const INTEGRITY_ENVELOPE_OVERHEAD_BYTES = FIXED_BYTES + SHA256_DIGEST_BYTES;
