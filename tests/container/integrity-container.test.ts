import { describe, expect, it } from 'vitest';
import {
  encodeHuffmanContainer,
  encodeRawContainer,
  parseBitLabContainer,
  restoreBitLabContainer,
} from '../../src/core/container';
import {
  bytesToHex,
  equalBytes,
  sha256Bytes,
  unpackIntegrityMetadata,
} from '../../src/core/integrity';

const source = new TextEncoder().encode(
  'UD-BITLAB-TEORIA-INFORMACION|'.repeat(120),
);

describe('contenedor con integridad', () => {
  it.each(['raw', 'huffman'] as const)('guarda SHA-256 y restaura exactamente con %s', async (codec) => {
    const digest = await sha256Bytes(source);
    const input = {
      originalName: 'demo.txt',
      mimeType: 'text/plain',
      wordSizeBits: 13,
      originalBytes: source,
    };

    const container = codec === 'raw'
      ? encodeRawContainer(input, digest)
      : encodeHuffmanContainer(input, digest);

    const parsed = parseBitLabContainer(container);
    const integrity = unpackIntegrityMetadata(parsed.metadata);
    const restored = restoreBitLabContainer(container);
    const restoredDigest = await sha256Bytes(restored.bytes);

    expect(integrity.sha256Digest).not.toBeNull();
    expect(bytesToHex(integrity.sha256Digest!)).toBe(bytesToHex(digest));
    expect(equalBytes(restored.bytes, source)).toBe(true);
    expect(equalBytes(restoredDigest, digest)).toBe(true);
  });

  it('permite detectar un payload RAW alterado mediante SHA-256', async () => {
    const digest = await sha256Bytes(source);
    const input = {
      originalName: 'demo.txt',
      mimeType: 'text/plain',
      wordSizeBits: 8,
      originalBytes: source,
    };

    const container = encodeRawContainer(input, digest);
    const tampered = container.slice();
    tampered[tampered.length - 1] ^= 0x01;

    const parsed = parseBitLabContainer(tampered);
    const integrity = unpackIntegrityMetadata(parsed.metadata);
    const restored = restoreBitLabContainer(tampered);
    const restoredDigest = await sha256Bytes(restored.bytes);

    expect(integrity.sha256Digest).not.toBeNull();
    expect(equalBytes(integrity.sha256Digest!, restoredDigest)).toBe(false);
  });

});
