import { describe, expect, it } from 'vitest';
import {
  buildHuffmanModel,
  decodeHuffmanPayload,
  encodeHuffmanPayload,
  parseHuffmanMetadata,
  encodeHuffmanMetadata,
} from '../../src/core/codecs/huffman';

describe('Huffman core', () => {
  it.each([2, 13, 2048])('codifica y decodifica exactamente con palabras de %i bits', (wordSizeBits) => {
    const original = new Uint8Array(521);
    for (let index = 0; index < original.length; index += 1) {
      original[index] = index % 5 === 0 ? 0xaa : index % 3 === 0 ? 0x00 : 0xff;
    }

    const encoded = encodeHuffmanPayload(original, wordSizeBits);
    const metadataBytes = encodeHuffmanMetadata({
      wordSizeBits,
      encodedBitLength: encoded.encodedBitLength,
      totalSymbols: encoded.model.totalSymbols,
      entries: encoded.model.symbols.map((symbol) => ({
        key: symbol.key,
        bytes: symbol.bytes,
        codeLength: symbol.codeLength,
      })),
    });
    const metadata = parseHuffmanMetadata(metadataBytes, wordSizeBits);

    const restored = decodeHuffmanPayload({
      payload: encoded.payload,
      encodedBitLength: metadata.encodedBitLength,
      originalSizeBytes: original.length,
      wordSizeBits,
      codebook: metadata.entries,
    });

    expect(Array.from(restored)).toEqual(Array.from(original));
  });

  it('reduce el payload para una fuente muy repetitiva', () => {
    const original = new Uint8Array(4096);
    original.fill(0x00);
    const encoded = encodeHuffmanPayload(original, 8);

    expect(encoded.model.uniqueSymbols).toBe(1);
    expect(encoded.model.entropyBitsPerSymbol).toBe(0);
    expect(encoded.model.averageCodeLengthBits).toBe(1);
    expect(encoded.encodedBitLength).toBe(4096);
    expect(encoded.payload.length).toBe(512);
  });

  it('produce una longitud media no menor que la entropía', () => {
    const original = Uint8Array.from([
      0, 0, 0, 0, 0, 0, 0, 1,
      0, 0, 0, 1, 0, 1, 2, 3,
    ]);
    const model = buildHuffmanModel(original, 8);

    expect(model.averageCodeLengthBits + 1e-12).toBeGreaterThanOrEqual(model.entropyBitsPerSymbol);
    expect(model.efficiencyPercent).toBeGreaterThan(0);
    expect(model.efficiencyPercent).toBeLessThanOrEqual(100 + 1e-10);
  });

  it('maneja entrada vacía', () => {
    const encoded = encodeHuffmanPayload(new Uint8Array(), 8);
    expect(encoded.payload.length).toBe(0);
    expect(encoded.encodedBitLength).toBe(0);
    expect(encoded.model.totalSymbols).toBe(0);
  });
});
