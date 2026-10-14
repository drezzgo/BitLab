import { describe, expect, it } from 'vitest';
import {
  BitLabCodecId,
  encodeHuffmanContainerDetailed,
  encodeRawContainer,
  parseBitLabContainer,
  restoreBitLabContainer,
  restoreRawContainer,
} from '../../src/core/container';

const CHALLENGE_SIZES = [2048, 4096, 8192, 16384, 32768];

describe('límite de palabra del contenedor BitLab v1', () => {
  it.each(CHALLENGE_SIZES)('preserva RAW con N = %i', (wordSizeBits) => {
    const original = new Uint8Array(12 * 1024);
    for (let index = 0; index < original.length; index += 1) {
      original[index] = (index * 13) & 0xff;
    }

    const container = encodeRawContainer({
      originalName: 'reto.bin',
      mimeType: 'application/octet-stream',
      wordSizeBits,
      originalBytes: original,
    });

    const parsed = parseBitLabContainer(container);
    const restored = restoreRawContainer(container);

    expect(parsed.header.wordSizeBits).toBe(wordSizeBits);
    expect(restored.bytes).toEqual(original);
  });

  it('preserva exactamente N = 65.535 en el header uint16', () => {
    const original = new Uint8Array(20 * 1024);
    original.fill(0x5a);

    const result = encodeHuffmanContainerDetailed({
      originalName: 'limite.bin',
      mimeType: 'application/octet-stream',
      wordSizeBits: 65535,
      originalBytes: original,
    });

    const parsed = parseBitLabContainer(result.container);
    const restored = restoreBitLabContainer(result.container);

    expect(parsed.header.codecId).toBe(BitLabCodecId.Huffman);
    expect(parsed.header.wordSizeBits).toBe(65535);
    expect(parsed.header.paddingBits).toBeLessThan(65535);
    expect(restored.bytes).toEqual(original);
  });

  it('rechaza 65.536 porque requeriría cambiar el formato v1', () => {
    expect(() => encodeRawContainer({
      originalName: 'fuera-de-v1.bin',
      mimeType: 'application/octet-stream',
      wordSizeBits: 65536,
      originalBytes: Uint8Array.from([1, 2, 3]),
    })).toThrow();
  });
});
