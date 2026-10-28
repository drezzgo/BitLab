import { describe, expect, it } from 'vitest';
import {
  decodeLz77,
  encodeLz77,
  encodeLz77Detailed,
  LZ77_WINDOW_SIZE,
} from '../../src/core/codecs/lz77';

describe('LZ77 byte codec', () => {
  it('reemplaza secuencias repetidas y reconstruye exactamente', () => {
    const source = new TextEncoder().encode(
      'UNIVERSIDAD-DISTRITAL|INGENIERIA-TELEMATICA|'.repeat(512),
    );

    const encoded = encodeLz77Detailed(source);
    const restored = decodeLz77(encoded.bytes, source.length);

    expect(restored).toEqual(source);
    expect(encoded.matchBlocks).toBeGreaterThan(0);
    expect(encoded.matchedBytes).toBeGreaterThan(source.length / 2);
    expect(encoded.bytes.length).toBeLessThan(source.length);
  });

  it('soporta matches solapados', () => {
    const source = new TextEncoder().encode('ABABABABABABABABABABABABABABABAB');
    const encoded = encodeLz77(source);
    const restored = decodeLz77(encoded, source.length);

    expect(restored).toEqual(source);
    expect(encoded.length).toBeLessThan(source.length);
  });

  it('preserva datos sin coincidencias útiles aunque puedan crecer', () => {
    const source = new Uint8Array(4096);
    let state = 0x12345678;

    for (let index = 0; index < source.length; index += 1) {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      source[index] = state >>> 24;
    }

    const encoded = encodeLz77(source);
    const restored = decodeLz77(encoded, source.length);

    expect(restored).toEqual(source);
  });

  it('respeta la ventana máxima', () => {
    expect(LZ77_WINDOW_SIZE).toBe(32768);
  });

  it('rechaza referencias corruptas', () => {
    // match de longitud 4, distancia 0
    expect(() => decodeLz77(Uint8Array.from([0x80, 0x00, 0x00]), 4))
      .toThrow(/distancia/i);
  });
});
