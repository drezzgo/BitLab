import { describe, expect, it } from 'vitest';
import {
  decodeHuffmanPayload,
  encodeHuffmanMetadata,
  encodeHuffmanPayload,
  parseHuffmanMetadata,
} from '../../src/core/codecs/huffman';

const EXTENDED_SIZES = [4096, 8192, 16384, 32768, 65535];

describe('Huffman con palabras extendidas v1', () => {
  it.each(EXTENDED_SIZES)('mantiene round-trip con N = %i', (wordSizeBits) => {
    const original = new Uint8Array(20 * 1024);
    for (let index = 0; index < original.length; index += 1) {
      original[index] = index % 17 < 12 ? 0xaa : (index * 29) & 0xff;
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

    expect(restored).toEqual(original);
  });
});
