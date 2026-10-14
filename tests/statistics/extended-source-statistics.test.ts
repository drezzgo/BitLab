import { describe, expect, it } from 'vitest';
import { analyzeSourceStatistics } from '../../src/core/statistics';

describe('estadística con palabras extendidas', () => {
  it('analiza 32.768 bits sin materializar claves hexadecimales gigantes', () => {
    const input = new Uint8Array(16 * 1024);
    input.fill(0xaa);

    const result = analyzeSourceStatistics(input, 32768);

    expect(result.totalSymbols).toBe(4);
    expect(result.uniqueSymbols).toBe(1);
    expect(result.entropyBitsPerSymbol).toBe(0);
    expect(result.topSymbols[0].key.length).toBe(4096);
    expect(result.topSymbols[0].display.length).toBeLessThan(32);
  });

  it('analiza el límite exacto de 65.535 bits', () => {
    const input = new Uint8Array(20 * 1024);
    for (let index = 0; index < input.length; index += 1) {
      input[index] = index & 0xff;
    }

    const result = analyzeSourceStatistics(input, 65535);

    expect(result.totalSymbols).toBe(3);
    expect(result.wordSizeBits).toBe(65535);
    expect(result.uniqueSymbols).toBeGreaterThan(0);
  });
});
