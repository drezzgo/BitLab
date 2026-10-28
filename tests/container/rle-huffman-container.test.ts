import { describe, expect, it } from 'vitest';
import {
  BitLabCodecId,
  encodeHuffmanContainerDetailed,
  encodeRleHuffmanContainerDetailed,
  parseBitLabContainer,
  restoreBitLabContainer,
} from '../../src/core/container';
import { equalBytes, sha256Bytes } from '../../src/core/integrity';

describe('RLE + Huffman container', () => {
  it('hace round-trip exacto con integridad', async () => {
    const original = new TextEncoder().encode(
      'AAAAAAAABBBBBBBBCCCCCCCC|BITLAB|'.repeat(512),
    );
    const digest = await sha256Bytes(original);

    const encoded = encodeRleHuffmanContainerDetailed({
      originalName: 'runs.txt',
      mimeType: 'text/plain',
      wordSizeBits: 8,
      originalBytes: original,
    }, digest);

    const parsed = parseBitLabContainer(encoded.container);
    const restored = restoreBitLabContainer(encoded.container);

    expect(parsed.header.codecId).toBe(BitLabCodecId.RleHuffman);
    expect(parsed.header.wordSizeBits).toBe(8);
    expect(restored.codecId).toBe(BitLabCodecId.RleHuffman);
    expect(equalBytes(restored.bytes, original)).toBe(true);
  });

  it('supera Huffman baseline en una fuente dominada por un run largo', () => {
    const original = new Uint8Array(8192);
    original.fill(0x2a);

    const huffman = encodeHuffmanContainerDetailed({
      originalName: 'repetitivo.bin',
      mimeType: 'application/octet-stream',
      wordSizeBits: 8,
      originalBytes: original,
    });

    const improved = encodeRleHuffmanContainerDetailed({
      originalName: 'repetitivo.bin',
      mimeType: 'application/octet-stream',
      wordSizeBits: 8,
      originalBytes: original,
    });

    expect(improved.metrics.rleBytes).toBeLessThan(original.length);
    expect(improved.container.length).toBeLessThan(huffman.container.length);
  });

  it('rechaza N distinto de 8 porque el codec es byte-oriented', () => {
    expect(() => encodeRleHuffmanContainerDetailed({
      originalName: 'x.bin',
      mimeType: 'application/octet-stream',
      wordSizeBits: 16,
      originalBytes: Uint8Array.from([1, 1, 1]),
    })).toThrow(/8 bits|N = 8|byte-oriented/i);
  });
});
