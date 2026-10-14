import { describe, expect, it } from 'vitest';
import {
  calculateSegmentation,
  reassembleBytes,
  segmentBytes,
  validateWordSizeBits,
} from '../../src/core/bits';

const REPRESENTATIVE_WORD_SIZES = [
  2, 3, 7, 8, 13, 31, 64, 127, 256, 511, 1024, 2048,
  4096, 8192, 16384, 32768, 65535,
];

describe('Bit Engine', () => {
  it('acepta enteros entre 2 y 65.535 bits', () => {
    expect(() => validateWordSizeBits(2)).not.toThrow();
    expect(() => validateWordSizeBits(65535)).not.toThrow();
    expect(() => validateWordSizeBits(1)).toThrow();
    expect(() => validateWordSizeBits(65536)).toThrow();
    expect(() => validateWordSizeBits(8.5)).toThrow();
  });

  it.each(REPRESENTATIVE_WORD_SIZES)(
    'reconstruye exactamente con palabras de %i bits',
    (wordSizeBits) => {
      const original = Uint8Array.from([
        0x00, 0xff, 0x01, 0x80, 0x7f, 0x55, 0xaa, 0x13, 0x37, 0xc0, 0xde,
      ]);
      const segmented = segmentBytes(original, wordSizeBits);
      const reconstructed = reassembleBytes(segmented);
      expect(Array.from(reconstructed)).toEqual(Array.from(original));
    },
  );

  it('reconstruye varios símbolos en el límite v1', () => {
    const original = new Uint8Array(20 * 1024);
    for (let index = 0; index < original.length; index += 1) {
      original[index] = (index * 37 + 11) & 0xff;
    }

    const segmented = segmentBytes(original, 65535);
    expect(segmented.symbols.length).toBeGreaterThan(1);
    expect(reassembleBytes(segmented)).toEqual(original);
  });

  it('calcula padding correcto para 16 bits segmentados en palabras de 13 bits', () => {
    expect(calculateSegmentation(2, 13)).toEqual({
      originalBitLength: 16,
      symbolCount: 2,
      paddingBits: 10,
    });
  });

  it('maneja entrada vacía', () => {
    const segmented = segmentBytes(new Uint8Array(), 65535);
    expect(segmented.symbols).toHaveLength(0);
    expect(segmented.paddingBits).toBe(0);
    expect(Array.from(reassembleBytes(segmented))).toEqual([]);
  });
});
