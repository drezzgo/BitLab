import { describe, expect, it } from 'vitest';
import {
  BITLAB_FIXED_HEADER_BYTES,
  encodeRawContainer,
  parseBitLabContainer,
  restoreRawContainer,
  BitLabCodecId,
} from '../../src/core/container';

describe('BitLab container v1', () => {
  it.each([2, 13, 2048])('preserva exactamente un payload binario con palabra de %i bits', (wordSizeBits) => {
    const original = Uint8Array.from([0x00, 0xff, 0x10, 0x80, 0x7f, 0x55, 0xaa, 0xde, 0xad, 0xbe, 0xef]);

    const container = encodeRawContainer({
      originalName: 'muestra.bin',
      mimeType: 'application/octet-stream',
      wordSizeBits,
      originalBytes: original,
    });

    const restored = restoreRawContainer(container);
    expect(restored.fileName).toBe('muestra.bin');
    expect(restored.mimeType).toBe('application/octet-stream');
    expect(Array.from(restored.bytes)).toEqual(Array.from(original));
  });

  it('preserva nombre UTF-8, MIME y metadata del header', () => {
    const bytes = Uint8Array.from([1, 2, 3, 4]);
    const container = encodeRawContainer({
      originalName: 'imagen-áé.png',
      mimeType: 'image/png',
      wordSizeBits: 13,
      originalBytes: bytes,
    });
    const parsed = parseBitLabContainer(container);

    expect(parsed.header.originalName).toBe('imagen-áé.png');
    expect(parsed.header.mimeType).toBe('image/png');
    expect(parsed.header.codecId).toBe(BitLabCodecId.Raw);
    expect(parsed.header.wordSizeBits).toBe(13);
    expect(parsed.header.paddingBits).toBe(7);
    expect(parsed.header.originalSizeBytes).toBe(4n);
    expect(parsed.header.payloadSizeBytes).toBe(4n);
    expect(container.length).toBeGreaterThan(BITLAB_FIXED_HEADER_BYTES + bytes.length);
  });

  it('rechaza una firma que no sea BTLB', () => {
    const container = encodeRawContainer({
      originalName: 'x.bin',
      mimeType: 'application/octet-stream',
      wordSizeBits: 8,
      originalBytes: Uint8Array.from([1, 2, 3]),
    });
    container[0] = 0x00;

    expect(() => parseBitLabContainer(container)).toThrow(/firma BitLab/i);
  });

  it('rechaza un contenedor truncado', () => {
    const container = encodeRawContainer({
      originalName: 'x.bin',
      mimeType: 'application/octet-stream',
      wordSizeBits: 8,
      originalBytes: Uint8Array.from([1, 2, 3]),
    });

    expect(() => parseBitLabContainer(container.slice(0, -1))).toThrow(/longitud del contenedor/i);
  });
});
