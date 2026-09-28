import { describe, expect, it } from 'vitest';
import {
  BitLabCodecId,
  encodeHuffmanContainerDetailed,
  parseBitLabContainer,
  restoreBitLabContainer,
} from '../../src/core/container';

describe('BitLab Huffman container', () => {
  it.each([2, 13, 2048])('round-trip completo con palabra de %i bits', (wordSizeBits) => {
    const original = new Uint8Array(777);
    for (let index = 0; index < original.length; index += 1) {
      original[index] = index % 11 === 0 ? 0xff : index % 7;
    }

    const result = encodeHuffmanContainerDetailed({
      originalName: 'muestra.bin',
      mimeType: 'application/octet-stream',
      wordSizeBits,
      originalBytes: original,
    });
    const parsed = parseBitLabContainer(result.container);
    const restored = restoreBitLabContainer(result.container);

    expect(parsed.header.codecId).toBe(BitLabCodecId.Huffman);
    expect(parsed.header.wordSizeBits).toBe(wordSizeBits);
    expect(restored.codecId).toBe(BitLabCodecId.Huffman);
    expect(restored.fileName).toBe('muestra.bin');
    expect(Array.from(restored.bytes)).toEqual(Array.from(original));
  });

  it('distingue ahorro del payload de tamaño final', () => {
    const original = new Uint8Array(2048);
    original.fill(0x2a);
    const result = encodeHuffmanContainerDetailed({
      originalName: 'repetitivo.bin',
      mimeType: 'application/octet-stream',
      wordSizeBits: 8,
      originalBytes: original,
    });

    expect(result.metrics.payloadSavingsPercent).toBeGreaterThan(80);
    expect(result.metrics.encodedBitLength).toBe(2048);
    expect(result.metrics.containerBytes).toBe(result.container.length);
  });

  it('rechaza metadata Huffman alterada', () => {
    const original = Uint8Array.from([1, 1, 1, 2, 2, 3]);
    const result = encodeHuffmanContainerDetailed({
      originalName: 'x.bin',
      mimeType: 'application/octet-stream',
      wordSizeBits: 8,
      originalBytes: original,
    });
    const parsed = parseBitLabContainer(result.container);

    // El primer byte de metadata es su versión. La alteramos conservando el resto del contenedor.
    const metadataOffset = result.container.length - parsed.payload.length - parsed.metadata.length;
    result.container[metadataOffset] = 0xff;

    expect(() => restoreBitLabContainer(result.container)).toThrow(/metadata Huffman no soportada/i);
  });
});
