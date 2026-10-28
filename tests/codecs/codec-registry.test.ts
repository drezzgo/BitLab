import { describe, expect, it } from 'vitest';
import {
  encodeWithRegisteredCodec,
  getRegisteredCodecById,
  getRegisteredCodecByKey,
  listRegisteredCodecs,
  restoreWithRegisteredCodec,
} from '../../src/core/codecs/registry';
import { BitLabCodecId, parseBitLabContainer } from '../../src/core/container';
import { equalBytes, sha256Bytes } from '../../src/core/integrity';

const source = new TextEncoder().encode(
  'UNIVERSIDAD-DISTRITAL|AAAAAA|INGENIERIA-TELEMATICA|'.repeat(256),
);

describe('codec registry', () => {
  it('registra las cuatro estrategias con ids únicos', () => {
    const codecs = listRegisteredCodecs();

    expect(codecs.map((codec) => codec.key)).toEqual([
      'raw',
      'huffman',
      'rle-huffman',
      'lz77-huffman',
    ]);
    expect(codecs.map((codec) => codec.id)).toEqual([
      BitLabCodecId.Raw,
      BitLabCodecId.Huffman,
      BitLabCodecId.RleHuffman,
      BitLabCodecId.Lz77Huffman,
    ]);

    expect(getRegisteredCodecById(BitLabCodecId.Lz77Huffman).key)
      .toBe('lz77-huffman');
  });

  it.each(['raw', 'huffman', 'rle-huffman', 'lz77-huffman'] as const)(
    'codifica y restaura exactamente mediante el registry: %s',
    async (key) => {
      const digest = await sha256Bytes(source);
      const encoded = encodeWithRegisteredCodec(key, {
        originalName: 'registry.txt',
        mimeType: 'text/plain',
        wordSizeBits: 8,
        originalBytes: source,
      }, digest);

      const parsed = parseBitLabContainer(encoded.container);
      const restored = restoreWithRegisteredCodec(
        parsed.header.codecId,
        encoded.container,
      );

      expect(parsed.header.codecId).toBe(getRegisteredCodecByKey(key).id);
      expect(equalBytes(restored.bytes, source)).toBe(true);
    },
  );
});
