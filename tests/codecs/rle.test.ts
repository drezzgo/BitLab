import { describe, expect, it } from 'vitest';
import { decodeRle, encodeRle, encodeRleDetailed } from '../../src/core/codecs/rle';

describe('RLE byte codec', () => {
  it('reduce runs largos y reconstruye exactamente', () => {
    const source = new Uint8Array(2048);
    source.fill(0x2a);

    const encoded = encodeRleDetailed(source);
    const restored = decodeRle(encoded.bytes, source.length);

    expect(encoded.runBlocks).toBeGreaterThan(0);
    expect(encoded.bytes.length).toBeLessThan(source.length / 10);
    expect(restored).toEqual(source);
  });

  it('preserva datos mixtos y runs mayores al máximo de un token', () => {
    const source = Uint8Array.from([
      ...new Array(300).fill(0xaa),
      1, 2, 3, 4, 5, 6,
      ...new Array(140).fill(0x00),
      9, 8, 7,
    ]);

    const encoded = encodeRle(source);
    const restored = decodeRle(encoded, source.length);

    expect(restored).toEqual(source);
  });

  it('preserva una fuente sin runs aunque pueda crecer', () => {
    const source = new Uint8Array(1024);
    for (let index = 0; index < source.length; index += 1) {
      source[index] = index & 0xff;
    }

    const encoded = encodeRle(source);
    const restored = decodeRle(encoded, source.length);

    expect(restored).toEqual(source);
    expect(encoded.length).toBeGreaterThan(source.length);
  });

  it('maneja entrada vacía', () => {
    expect(encodeRle(new Uint8Array())).toEqual(new Uint8Array());
    expect(decodeRle(new Uint8Array(), 0)).toEqual(new Uint8Array());
  });

  it('rechaza un flujo truncado', () => {
    expect(() => decodeRle(Uint8Array.from([0x82]), 5)).toThrow();
    expect(() => decodeRle(Uint8Array.from([0x02, 1]), 3)).toThrow();
  });
});
