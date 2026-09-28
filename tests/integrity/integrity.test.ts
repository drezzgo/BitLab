import { describe, expect, it } from 'vitest';
import {
  bytesToHex,
  equalBytes,
  packIntegrityMetadata,
  sha256Bytes,
  unpackIntegrityMetadata,
} from '../../src/core/integrity';

describe('integridad SHA-256', () => {
  it('calcula un digest SHA-256 conocido', async () => {
    const digest = await sha256Bytes(new TextEncoder().encode('abc'));
    expect(bytesToHex(digest)).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });

  it('envuelve y recupera digest + metadata del codec', async () => {
    const source = new TextEncoder().encode('BitLab');
    const digest = await sha256Bytes(source);
    const codecMetadata = Uint8Array.from([1, 2, 3, 4]);

    const packed = packIntegrityMetadata(codecMetadata, digest);
    const unpacked = unpackIntegrityMetadata(packed);

    expect(unpacked.wrapped).toBe(true);
    expect(unpacked.sha256Digest && bytesToHex(unpacked.sha256Digest)).toBe(bytesToHex(digest));
    expect(Array.from(unpacked.codecMetadata)).toEqual([1, 2, 3, 4]);
  });

  it('mantiene compatibilidad con metadata sin envoltura', () => {
    const legacy = Uint8Array.from([9, 8, 7]);
    const unpacked = unpackIntegrityMetadata(legacy);

    expect(unpacked.wrapped).toBe(false);
    expect(unpacked.sha256Digest).toBeNull();
    expect(Array.from(unpacked.codecMetadata)).toEqual([9, 8, 7]);
  });

  it('compara bytes sin depender de strings', () => {
    expect(equalBytes(Uint8Array.from([1, 2]), Uint8Array.from([1, 2]))).toBe(true);
    expect(equalBytes(Uint8Array.from([1, 2]), Uint8Array.from([1, 3]))).toBe(false);
  });
});
