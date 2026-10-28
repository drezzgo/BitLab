import { describe, expect, it } from 'vitest';
import {
  BitLabCodecId,
  encodeHuffmanContainerDetailed,
  encodeLz77HuffmanContainerDetailed,
  parseBitLabContainer,
  restoreBitLabContainer,
} from '../../src/core/container';
import { equalBytes, sha256Bytes } from '../../src/core/integrity';

describe('LZ77 + Huffman container', () => {
  it('hace round-trip exacto con integridad', async () => {
    const original = new TextEncoder().encode(
      'SENSOR=BOGOTA;STATE=ACTIVE;VALUE=42|'.repeat(1024),
    );
    const digest = await sha256Bytes(original);

    const encoded = encodeLz77HuffmanContainerDetailed({
      originalName: 'telemetria.txt',
      mimeType: 'text/plain',
      wordSizeBits: 8,
      originalBytes: original,
    }, digest);

    const parsed = parseBitLabContainer(encoded.container);
    const restored = restoreBitLabContainer(encoded.container);

    expect(parsed.header.codecId).toBe(BitLabCodecId.Lz77Huffman);
    expect(parsed.header.wordSizeBits).toBe(8);
    expect(restored.codecId).toBe(BitLabCodecId.Lz77Huffman);
    expect(equalBytes(restored.bytes, original)).toBe(true);
  });

  it('supera Huffman en secuencias repetidas que no son runs simples', () => {
    const original = new TextEncoder().encode(
      'UNIVERSIDAD-DISTRITAL|INGENIERIA-TELEMATICA|REDES-Y-SISTEMAS|'.repeat(1024),
    );

    const huffman = encodeHuffmanContainerDetailed({
      originalName: 'estructura.txt',
      mimeType: 'text/plain',
      wordSizeBits: 8,
      originalBytes: original,
    });

    const improved = encodeLz77HuffmanContainerDetailed({
      originalName: 'estructura.txt',
      mimeType: 'text/plain',
      wordSizeBits: 8,
      originalBytes: original,
    });

    expect(improved.metrics.matchBlocks).toBeGreaterThan(0);
    expect(improved.metrics.lz77Bytes).toBeLessThan(original.length);
    expect(improved.container.length).toBeLessThan(huffman.container.length);
  });

  it('rechaza N distinto de 8', () => {
    expect(() => encodeLz77HuffmanContainerDetailed({
      originalName: 'x.bin',
      mimeType: 'application/octet-stream',
      wordSizeBits: 16,
      originalBytes: Uint8Array.from([1, 2, 3, 1, 2, 3]),
    })).toThrow(/8 bits|N = 8|byte-oriented/i);
  });
});
