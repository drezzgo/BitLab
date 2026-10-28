import { describe, expect, it } from 'vitest';
import {
  decodeLz77,
  encodeLz77Detailed,
  resolveLz77Options,
} from '../../src/core/codecs/lz77';

describe('LZ77 parameter search', () => {
  it('mantiene round-trip con diferentes perfiles', () => {
    const source = new TextEncoder().encode(
      'UNIVERSIDAD-DISTRITAL|INGENIERIA-TELEMATICA|'.repeat(500),
    );

    const profiles = [
      { windowSize: 4096, minMatchLength: 4, maxChain: 24 },
      { windowSize: 16384, minMatchLength: 4, maxChain: 48 },
      { windowSize: 32768, minMatchLength: 5, maxChain: 64 },
      { windowSize: 65535, minMatchLength: 4, maxChain: 96 },
    ];

    for (const profile of profiles) {
      const encoded = encodeLz77Detailed(source, profile);
      const restored = decodeLz77(encoded.bytes, source.length);

      expect(restored).toEqual(source);
      expect(encoded.options).toEqual(profile);
    }
  });

  it('una ventana mayor puede capturar una repetición lejana', () => {
    const prefix = new TextEncoder().encode(
      'BLOQUE-TELEMATICO-QUE-DEBE-REPETIRSE-1234567890|'.repeat(20),
    );
    const gap = new Uint8Array(6000);
    for (let index = 0; index < gap.length; index += 1) {
      gap[index] = (index * 73 + 19) & 0xff;
    }

    const source = new Uint8Array(prefix.length + gap.length + prefix.length);
    source.set(prefix, 0);
    source.set(gap, prefix.length);
    source.set(prefix, prefix.length + gap.length);

    const small = encodeLz77Detailed(source, {
      windowSize: 4096,
      minMatchLength: 4,
      maxChain: 64,
    });
    const large = encodeLz77Detailed(source, {
      windowSize: 16384,
      minMatchLength: 4,
      maxChain: 64,
    });

    expect(decodeLz77(small.bytes, source.length)).toEqual(source);
    expect(decodeLz77(large.bytes, source.length)).toEqual(source);
    expect(large.bytes.length).toBeLessThan(small.bytes.length);
  });

  it('valida el presupuesto de parámetros', () => {
    expect(() => resolveLz77Options({ windowSize: 70000 })).toThrow();
    expect(() => resolveLz77Options({ minMatchLength: 3 })).toThrow();
    expect(() => resolveLz77Options({ maxChain: 0 })).toThrow();
  });
});
